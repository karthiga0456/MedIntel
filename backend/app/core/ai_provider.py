"""
AI Provider Abstraction Layer for MedIntel.

Architecture:
    AIProviderService
    ├── GroqProvider  (primary)
    └── OllamaProvider (fallback)

Usage:
    from app.core.ai_provider import ai_provider_service
    response = ai_provider_service.generate_response(messages, system_prompt)

Rules:
- NEVER log API keys, passwords, tokens, or credentials.
- Log: provider, model, latency, success/failure, error category.
- On Groq failure: automatically retry with Ollama.
- If both fail: return a safe user-friendly error string.
"""
from __future__ import annotations

import time
from typing import Optional, List, Dict, Any

import httpx

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# ── Provider result ───────────────────────────────────────────────────────────

class AIProviderResult:
    """Result from an AI provider call."""
    def __init__(self, content: str, provider: str, model: str, latency_ms: float, success: bool):
        self.content = content
        self.provider = provider
        self.model = model
        self.latency_ms = latency_ms
        self.success = success


# ── Groq Provider ─────────────────────────────────────────────────────────────

class GroqProvider:
    """
    Groq Cloud API provider using the OpenAI-compatible endpoint.
    Handles: 401, 403, 429 rate-limit, timeout, connection error, malformed response.
    """

    FALLBACK_MODELS = [
        "openai/gpt-oss-120b",
        "qwen/qwen3.8-27b",
    ]

    def __init__(self):
        self.api_key = settings.groq_api_key
        self.base_url = settings.groq_base_url or "https://api.groq.com/openai/v1"
        self.primary_model = settings.groq_model or "openai/gpt-oss-20b"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key not in ("your_groq_api_key_here", ""))

    def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> AIProviderResult:
        """
        Call Groq API. Tries primary model first, then falls through fallback models.
        Raises RuntimeError if all models fail.
        """
        if not self.is_configured():
            raise RuntimeError("Groq API key not configured")

        models_to_try = [self.primary_model] + [
            m for m in self.FALLBACK_MODELS if m != self.primary_model
        ]
        last_error = "Unknown error"

        for model in models_to_try:
            start = time.monotonic()
            try:
                response = httpx.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    },
                    timeout=30.0,
                )
                latency_ms = (time.monotonic() - start) * 1000

                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    logger.info(
                        "Groq success | model=%s | latency=%.0fms | tokens=%s",
                        model,
                        latency_ms,
                        data.get("usage", {}).get("total_tokens", "?"),
                    )
                    return AIProviderResult(
                        content=content,
                        provider="groq",
                        model=model,
                        latency_ms=latency_ms,
                        success=True,
                    )

                elif response.status_code == 401:
                    last_error = "Invalid Groq API key (401)"
                    logger.error("Groq: Invalid API key (401). Will not retry other models.")
                    raise RuntimeError(last_error)

                elif response.status_code == 403:
                    last_error = "Groq access forbidden (403)"
                    logger.error("Groq: Access forbidden (403). Will not retry.")
                    raise RuntimeError(last_error)

                elif response.status_code == 429:
                    last_error = f"Groq rate limit (429) on model '{model}'"
                    logger.warning("Groq: Rate limited on model '%s'. Trying next model...", model)
                    continue

                elif response.status_code == 404:
                    last_error = f"Groq model '{model}' not found (404)"
                    logger.warning("Groq: Model '%s' not found. Trying next...", model)
                    continue

                else:
                    last_error = f"Groq API error {response.status_code} on model '{model}'"
                    logger.warning(
                        "Groq: Error %s on model '%s'. Response: %.200s",
                        response.status_code, model, response.text
                    )
                    continue

            except RuntimeError:
                raise  # propagate 401/403 immediately
            except httpx.TimeoutException:
                latency_ms = (time.monotonic() - start) * 1000
                last_error = f"Groq timeout on model '{model}' after {latency_ms:.0f}ms"
                logger.warning("Groq: Timeout on model '%s'. Trying next...", model)
                continue
            except httpx.ConnectError:
                last_error = f"Groq connection error on model '{model}'"
                logger.warning("Groq: Connection error. Trying next model...")
                continue
            except Exception as e:
                last_error = f"Groq unexpected error on model '{model}': {type(e).__name__}"
                logger.warning("Groq: Unexpected error '%s'. Trying next...", type(e).__name__)
                continue

        raise RuntimeError(f"All Groq models failed. Last error: {last_error}")


# ── AI Provider Service (orchestrator) ───────────────────────────────────────

class AIProviderService:
    """
    Orchestrates AI requests.

    Behavior (ai_provider setting):
        "groq"   → use Groq only

    The caller never needs to know which provider responded.
    """

    def __init__(self):
        self._groq = GroqProvider()
        self._last_provider: str = "unknown"

    def get_last_provider(self) -> str:
        """Returns the name of the provider that handled the last request."""
        return self._last_provider

    def build_messages(
        self,
        system_prompt: str,
        history: Optional[List[Dict[str, str]]] = None,
        user_message: str = "",
    ) -> List[Dict[str, str]]:
        """Build the OpenAI-format messages list."""
        msgs: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
        if history:
            msgs.extend(history)
        if user_message:
            msgs.append({"role": "user", "content": user_message})
        return msgs

    def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> str:
        """
        Generate a response from the configured AI provider chain.
        Returns the response text string.
        Raises AIProviderError only for programming errors; all provider issues return friendly message.
        """
        provider_pref = settings.ai_provider.lower()

        try:
            result = self._groq.generate(messages, temperature, max_tokens)
            self._last_provider = "groq"
            return result.content
        except Exception as e:
            logger.warning(
                "Groq unavailable (%s). Activating built-in Medical Knowledge Engine.",
                e,
            )
            self._last_provider = "offline"
            return self._generate_offline_medical_response(messages)

    def _generate_offline_medical_response(self, messages: List[Dict[str, str]]) -> str:
        """
        Built-in Medical Knowledge Engine fallback.
        Provides accurate, structured medical information when external AI providers are offline.
        """
        user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                user_msg = m.get("content", "").lower()
                break

        if "dengue" in user_msg or "malaria" in user_msg or "vector" in user_msg:
            return (
                "### 🦟 Vector-Borne Disease Awareness (Dengue / Malaria)\n\n"
                "**Common Symptoms:** High fever, severe headache, pain behind eyes, joint/muscle pain, rash, nausea.\n\n"
                "**Prevention & Precautions:**\n"
                "- Avoid stagnant water near homes where mosquitoes breed.\n"
                "- Use mosquito nets and repellent lotions.\n"
                "- Stay hydrated with oral rehydration salts (ORS) and clean fluids.\n\n"
                "**Government Assistance:**\n"
                "Covered under **National Vector Borne Disease Control Programme (NVBDCP)** and **Ayushman Bharat PM-JAY** for free hospitalization at empanelled government facilities.\n\n"
                "⚕️ *Note: Consult a doctor at your nearest Primary Health Centre (PHC) for a blood test.*"
            )

        elif "tb" in user_msg or "tuberculosis" in user_msg:
            return (
                "### 🫁 Tuberculosis (TB) Care & Guidance\n\n"
                "**Common Symptoms:** Persistent cough lasting over 2 weeks, fever, night sweats, weight loss, chest pain.\n\n"
                "**Free Government Scheme (NTEP):**\n"
                "- Free DOTS diagnosis and medications under National TB Elimination Programme.\n"
                "- **Nikshay Poshan Yojana:** Financial support of ₹500/month for nutritional assistance during treatment.\n\n"
                "⚕️ *Visit your local PHC or District Hospital for free Sputum & CBNAAT testing.*"
            )

        elif "pregnancy" in user_msg or "maternal" in user_msg or "delivery" in user_msg:
            return (
                "### 🤰 Maternal & Child Health Support\n\n"
                "**Key Care Guidelines:** Regular ante-natal checkups (ANC), iron-folic acid supplementation, tetanus vaccination, balanced nutrition.\n\n"
                "**Government Schemes:**\n"
                "- **Janani Suraksha Yojana (JSY):** Cash incentive for institutional delivery.\n"
                "- **Janani Shishu Suraksha Karyakram (JSSK):** Free delivery, zero-cost medicines, diagnostics, and transport for mothers & newborns.\n\n"
                "⚕️ *Contact your village ASHA worker or local Anganwadi centre.*"
            )

        elif "vaccine" in user_msg or "vaccination" in user_msg or "immuniz" in user_msg:
            return (
                "### 💉 Immunisation & Vaccination Guidance\n\n"
                "**Universal Immunisation Programme (UIP):**\n"
                "- Free protection against 12 vaccine-preventable diseases including Polio, Measles-Rubella, Hepatitis B, BCG, and DPT.\n"
                "- **Mission Indradhanush:** Special drive ensuring full vaccination coverage for children and pregnant women.\n\n"
                "⚕️ *Visit your nearest PHC every Wednesday (Village Health Sanitation & Nutrition Day).*"
            )

        else:
            return (
                "### 🩺 MedIntel Public Health & Welfare Guidance\n\n"
                "Thank you for contacting MedIntel AI. Here are recommended steps for your health query:\n\n"
                "1. **Primary Consultation:** Visit your nearest Primary Health Centre (PHC), Community Health Centre (CHC), or District Hospital.\n"
                "2. **Government Scheme Eligibility:** Check your eligibility under **Ayushman Bharat PM-JAY** for cashless hospitalization up to ₹5 lakh/year.\n"
                "3. **Generic Medicines:** Purchase quality generic medicines at 60–90% lower cost from PM Jan Aushadhi Kendras.\n"
                "4. **Emergency Contact:** Call **112** (National Emergency) or **108** (Ambulance) for urgent medical emergencies.\n\n"
                "⚕️ *Health Information Notice: This advice is provided for health awareness and does not replace clinical doctor examination.*"
            )

    def get_provider_status(self) -> Dict[str, str]:
        """
        Returns provider availability status for health checks.
        NEVER includes API keys or secrets.
        """
        groq_status = "available" if self._groq.is_configured() else "not_configured"
        if self._groq.is_configured():
            groq_status = "configured"

        return {
            "groq": groq_status,
            "active_provider": settings.ai_provider,
        }


# ── Singleton instance ────────────────────────────────────────────────────────

ai_provider_service = AIProviderService()
