"""
Business logic for the AI Medical Knowledge Assistant.

Pipeline:
  1. Receive user message + language preference + user_id
  2. Match Indian government health schemes via keyword lookup
  3. Detect emergency keywords
  4. Build message list: system prompt → language instruction → history → user query
  5. Call AI via AIProviderService (Groq first → Ollama fallback)
  6. Persist exchange to in-memory per-user conversation history
  7. Return: AI reply + matched scheme + safety disclaimer

Safety design:
  - LLM is given a strict system prompt that forbids diagnoses
  - Disclaimer is always appended to health responses
  - Emergency keywords trigger an early-exit safety alert
  - Graceful degradation if all AI providers are unavailable
"""
from __future__ import annotations

from collections import deque
from typing import Optional

from app.core.logging import get_logger
from app.config import settings
from app.core.ai_provider import ai_provider_service
from app.modules.knowledge_assistant.schemas import (
    ChatRequest,
    ChatResponse,
    ChatMessage,
    ChatHistoryResponse,
)

logger = get_logger(__name__)

# ── Health-aware system prompt ────────────────────────────────────────────────

HEALTH_SYSTEM_PROMPT = """\
You are MedIntel AI, a specialized public health information assistant built for India's \
Intelligent Public Health Ecosystem. You help citizens, patients, and health workers \
access accurate health information and government health scheme guidance.

YOUR PURPOSE:
- Provide accurate, clear, and accessible health information and disease awareness
- Help users understand symptoms, transmission routes, and prevention strategies
- Share information about Indian government health schemes and how to access them
- Promote preventive healthcare, hygiene, and community health

STRICT SAFETY RULES — follow these without exception:
1. You are NOT a doctor. You CANNOT diagnose conditions or prescribe treatment.
2. NEVER recommend specific prescription medications or dosages.
3. For EMERGENCY symptoms (chest pain, difficulty breathing, loss of consciousness, \
   severe bleeding, stroke, anaphylaxis) — instruct the user to call 112 (India emergency) \
   or go to the nearest hospital IMMEDIATELY.
4. For any chronic or serious condition, ALWAYS recommend consulting a qualified \
   doctor or visiting the nearest government health centre (PHC / CHC / District Hospital).
5. End health-specific answers with a brief safety note reminding users this is \
   for awareness only.

TOPICS YOU CAN HELP WITH:
- Disease awareness: symptoms, transmission, prevention (dengue, malaria, cholera, \
  typhoid, TB, COVID-19, influenza, chickenpox, etc.)
- Vaccination schedules and immunisation importance
- Maternal and child health basics (ante-natal care, nutrition, safe delivery)
- Nutrition, hygiene, sanitation, and safe water practices
- Indian government health schemes (Ayushman Bharat PM-JAY, ASHA, JSY, Mission \
  Indradhanush, NTEP, NVBDCP, NHM, Jan Aushadhi, POSHAN Abhiyaan, etc.)
- When to seek care and which facility to visit (PHC, CHC, District Hospital)
- General wellness and preventive health tips

RESPONSE STYLE:
- Be warm, empathetic, and simple — many users are from rural areas with limited \
  health literacy; avoid jargon
- Use bullet points or numbered lists for symptoms, steps, or prevention tips
- Keep answers concise but complete (aim for 150-300 words for most queries)
- If the user writes in a regional Indian language, respond naturally in that language\
"""

# ── Language instruction map ──────────────────────────────────────────────────

LANGUAGE_INSTRUCTIONS: dict[str, str] = {
    "en": "Respond in clear, simple English.",
    "hi": "कृपया अपना उत्तर **हिंदी** (Devanagari script) में दें।",
    "ta": "தயவுசெய்து **தமிழ்** மொழியில் (Tamil script) பதில் அளிக்கவும்.",
    "te": "దయచేసి **తెలుగు** (Telugu script) లో సమాధానం ఇవ్వండి.",
    "bn": "অনুগ্রহ করে **বাংলা** (Bengali script) ভাষায় উত্তর দিন।",
    "kn": "ದಯವಿಟ್ಟು **ಕನ್ನಡ** (Kannada script) ಭಾಷೆಯಲ್ಲಿ ಉತ್ತರ ನೀಡಿ.",
    "ml": "ദയവായി **മലയാളം** (Malayalam script) ഭാഷയിൽ ഉത്തരം നൽകുക.",
}

# ── Indian government health scheme keyword matcher ───────────────────────────

HEALTH_SCHEMES: dict[str, str] = {
    "ayushman":             "Ayushman Bharat – PM-JAY (Free hospitalisation up to ₹5 lakh/year for eligible families)",
    "pmjay":                "PM Jan Arogya Yojana (PM-JAY) – Cashless treatment at empanelled hospitals",
    "jan arogya":           "Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
    "health insurance":     "Ayushman Bharat PM-JAY – Free health insurance for BPL & low-income families",
    "hospital":             "Ayushman Bharat PM-JAY – Visit nearest empanelled government hospital",
    "free treatment":       "Ayushman Bharat PM-JAY – Cashless free treatment at government hospitals",
    "asha":                 "ASHA Programme – Contact your village ASHA worker for community health support",
    "janani":               "Janani Suraksha Yojana (JSY) – Cash incentive for institutional delivery",
    "jsy":                  "Janani Suraksha Yojana (JSY) – Safe delivery support for mothers",
    "maternal":             "Janani Suraksha Yojana (JSY) + JSSK (Free ante-natal care & delivery)",
    "pregnancy":            "Janani Suraksha Yojana (JSY) – Institutional delivery incentives for mothers",
    "delivery":             "Janani Suraksha Yojana (JSY) – Safe institutional delivery support",
    "antenatal":            "Janani Shishu Suraksha Karyakram (JSSK) – Free ante-natal care",
    "mother":               "Janani Suraksha Yojana (JSY) – Maternal health support scheme",
    "newborn":              "Janani Shishu Suraksha Karyakram (JSSK) – Free newborn care",
    "mission indradhanush": "Mission Indradhanush – Free vaccines for children & pregnant women",
    "vaccination":          "Mission Indradhanush / Universal Immunisation Programme (UIP) – Free vaccines at PHC",
    "immunization":         "Universal Immunisation Programme (UIP) – Free childhood vaccines at government centres",
    "immunisation":         "Universal Immunisation Programme (UIP) – Free childhood vaccines at government centres",
    "vaccine":              "Mission Indradhanush – Visit nearest PHC for free government vaccines",
    "tb":                   "National TB Elimination Programme (NTEP) – Free diagnosis, treatment & ₹500/month support (Nikshay Poshan Yojana)",
    "tuberculosis":         "National TB Elimination Programme (NTEP) – Free DOTS treatment at government facilities",
    "nikshay":              "Nikshay Poshan Yojana – ₹500/month nutritional support for TB patients",
    "malaria":              "National Vector Borne Disease Control Programme (NVBDCP) – Free diagnosis & treatment",
    "dengue":               "National Vector Borne Disease Control Programme (NVBDCP) – Vector control & free treatment",
    "chikungunya":          "National Vector Borne Disease Control Programme (NVBDCP)",
    "filaria":              "National Vector Borne Disease Control Programme – Mass Drug Administration (MDA)",
    "covid":                "National COVID-19 Vaccination Programme – Free vaccines at government health centres",
    "corona":               "National COVID-19 Vaccination Programme – Free vaccines via CoWIN portal",
    "poshan":               "POSHAN Abhiyaan – National Nutrition Mission (free nutrition support for mothers & children)",
    "nutrition":            "POSHAN Abhiyaan + ICDS Anganwadi centres – Free nutrition for children under 6",
    "anganwadi":            "Integrated Child Development Services (ICDS) – Free nutrition & early childhood care",
    "malnutrition":         "POSHAN Abhiyaan – Nutrition rehabilitation support + Anganwadi services",
    "mental health":        "NIMHANS Helpline: 080-46110007 | Vandrevala Foundation: 1860-2662-345 (24×7 free counselling)",
    "depression":           "iCall (TISS): 9152987821 | NIMHANS Helpline: 080-46110007 – Free mental health support",
    "suicide":              "iCall: 9152987821 | Vandrevala Foundation: 1860-2662-345 – Free crisis counselling (24×7)",
    "jan aushadhi":         "PM Jan Aushadhi Kendra – Affordable generic medicines at 60-90% lower cost",
    "medicine":             "PM Jan Aushadhi Kendra – Generic medicines at fraction of branded cost",
    "dialysis":             "Pradhan Mantri National Dialysis Programme – Free dialysis at district hospitals",
    "national health":      "National Health Mission (NHM) – Free medicines, diagnostics & care at PHCs",
    "nhm":                  "National Health Mission (NHM) – Comprehensive primary healthcare",
    "phc":                  "Primary Health Centre (PHC) – Nearest government primary care facility under NHM",
    "cancer":               "Rashtriya Bal Swasthya Karyakram (RBSK) + State cancer schemes – Contact district hospital",
    "rbsk":                 "Rashtriya Bal Swasthya Karyakram (RBSK) – Free health screening for children 0-18 years",
}

# ── Safety disclaimer ─────────────────────────────────────────────────────────

DISCLAIMER = (
    "⚕️ *Health Disclaimer:* This information is for general awareness only — "
    "it is not a substitute for professional medical advice, diagnosis, or treatment. "
    "Please consult a qualified doctor or visit your nearest government health centre "
    "(PHC / CHC / District Hospital) for personal medical guidance."
)

# ── In-memory per-user conversation store ────────────────────────────────────

MAX_HISTORY_MESSAGES = 20
_conversation_store: dict[str, deque] = {}


def _get_history(user_id: str) -> deque:
    if user_id not in _conversation_store:
        _conversation_store[user_id] = deque(maxlen=MAX_HISTORY_MESSAGES)
    return _conversation_store[user_id]


def _match_scheme(text: str) -> Optional[str]:
    lower = text.lower()
    for keyword, scheme in HEALTH_SCHEMES.items():
        if keyword in lower:
            return scheme
    return None


# ── Emergency keyword matcher ─────────────────────────────────────────────────

EMERGENCY_KEYWORDS: list[str] = [
    "chest pain", "heart attack", "difficulty breathing", "shortness of breath",
    "severe bleeding", "unconscious", "loss of consciousness", "stroke",
    "anaphylaxis", "poison", "poisoning", "choking", "severe burn", "seizure"
]


def _detect_emergency(text: str) -> Optional[str]:
    lower = text.lower()
    for kw in EMERGENCY_KEYWORDS:
        if kw in lower:
            return kw
    return None


# ── Knowledge Assistant Service ───────────────────────────────────────────────

class KnowledgeAssistantService:
    """
    Wraps the AI provider service for health-aware conversations.
    Uses Groq → Ollama fallback transparently.
    """

    def chat(self, request: ChatRequest, db=None) -> ChatResponse:
        """
        Process a chat message and return an AI health response.
        """
        user_id = request.user_id or "anonymous"
        logger.info(
            "Chat | user=%s | lang=%s | msg=%.100s",
            user_id,
            request.language,
            request.message,
        )

        # 1. Scheme matching
        matched_scheme = _match_scheme(request.message)

        # 2. Emergency keyword check
        emergency_kw = _detect_emergency(request.message)
        is_emergency = bool(emergency_kw)
        emergency_details = None
        emergency_header = ""

        if is_emergency:
            emergency_details = f"Emergency symptom identified: {emergency_kw}. Prompt medical intervention advised."
            emergency_header = (
                f"🚨 **MEDICAL EMERGENCY ADVISORY:**\n\n"
                f"You reported symptoms relating to **{emergency_kw.upper()}**.\n"
                f"• Call **112** (National Emergency) or **108** (Ambulance) IMMEDIATELY.\n"
                f"• Proceed to the nearest hospital casualty or emergency ward without delay.\n"
                f"• Do not attempt self-medication.\n\n---\n\n"
            )
            if db is not None:
                try:
                    from app.db.models import EmergencyCase
                    ec = EmergencyCase(
                        patient_name=user_id,
                        patient_id=request.patient_id,
                        symptoms=request.message,
                        severity="CRITICAL",
                        location=request.location or "Reported via AI Assistant",
                        status="PENDING",
                    )
                    db.add(ec)
                    db.commit()
                except Exception as e:
                    logger.error(f"Error logging emergency case: {e}")

        # 3. Build messages for AI provider
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(request.language, LANGUAGE_INSTRUCTIONS["en"])
        system_content = (
            f"{HEALTH_SYSTEM_PROMPT}\n\n"
            f"LANGUAGE INSTRUCTION: {lang_instruction}"
        )

        # Build history entries in OpenAI format
        history = _get_history(user_id)
        history_messages = [
            {"role": entry["role"] if entry["role"] in ("user", "assistant") else "user",
             "content": entry["content"]}
            for entry in history
        ]

        messages = ai_provider_service.build_messages(
            system_prompt=system_content,
            history=history_messages,
            user_message=request.message,
        )

        # 4. Call AI provider (Groq → Ollama fallback handled automatically)
        try:
            reply_text = ai_provider_service.generate_response(
                messages=messages,
                temperature=0.3,
                max_tokens=512,
            )
            used_provider = ai_provider_service.get_last_provider()

            # 5. Persist exchange to history
            history.append({"role": "user", "content": request.message})
            history.append({"role": "assistant", "content": reply_text})

            # 6. Expand scheme matching from reply
            if not matched_scheme:
                matched_scheme = _match_scheme(reply_text)

            final_reply = (emergency_header + reply_text) if is_emergency else reply_text
            return ChatResponse(
                reply=final_reply,
                language=request.language,
                matched_scheme=matched_scheme,
                disclaimer=DISCLAIMER,
                is_emergency=is_emergency,
                emergency_details=emergency_details,
                provider=used_provider,
            )

        except Exception as exc:
            logger.error("Knowledge assistant error: %s", exc, exc_info=True)
            return ChatResponse(
                reply=(
                    "I'm sorry, I encountered an error processing your request. "
                    "Please try again in a moment, or contact your nearest health worker "
                    "for immediate assistance."
                ),
                language=request.language,
                matched_scheme=matched_scheme,
                disclaimer=DISCLAIMER,
            )

    def get_history(self, user_id: str) -> ChatHistoryResponse:
        """Return the full conversation history for a given user."""
        history = _get_history(user_id)
        messages = [
            ChatMessage(role=entry["role"], content=entry["content"])
            for entry in history
        ]
        return ChatHistoryResponse(
            user_id=user_id,
            messages=messages,
            count=len(messages),
        )

    def clear_history(self, user_id: str) -> None:
        """Wipe conversation history for a user (e.g., 'New Chat' button)."""
        if user_id in _conversation_store:
            _conversation_store[user_id].clear()
        logger.info("Conversation history cleared for user: %s", user_id)


knowledge_assistant_service = KnowledgeAssistantService()
