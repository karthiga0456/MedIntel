import PyPDF2
from io import BytesIO
from fastapi import UploadFile
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate

from app.config import settings
from app.core.logging import get_logger
from app.modules.insurance_parser.schemas import InsuranceClaimResponse

logger = get_logger(__name__)

class InsuranceParserService:
    def __init__(self):
        if settings.google_api_key:
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-2.5-flash",
                    google_api_key=settings.google_api_key,
                    temperature=0.1
                )
            except Exception:
                self._init_ollama()
        else:
            self._init_ollama()

    def _init_ollama(self):
        from langchain_community.chat_models import ChatOllama
        self.llm = ChatOllama(model="llama3", temperature=0.1)
        self.prompt = PromptTemplate(
            input_variables=["bill_text", "policy_text"],
            template="""
You are an expert AI Insurance Adjuster. You will be provided with the text of a medical bill and the text of a health insurance policy.
Your goal is to parse the bill, cross-reference the policy, and calculate the final claim breakdown.

Medical Bill:
{bill_text}

Insurance Policy:
{policy_text}

Calculate the following integer values (round to nearest whole number if needed):
1. totalBilled: The total amount billed by the hospital.
2. coveredAmount: The total amount covered by insurance (after applying rules, limits, excluded items).
3. outOfPocket: The amount the patient has to pay.
4. deductibleApplied: Any deductible amount subtracted from coverage.
5. coPayApplied: Any co-pay amount applied.

Also provide a brief string 'notes' explaining the reasoning (max 2 sentences).

You MUST return ONLY a raw JSON object with the keys exactly matching the schema. No markdown formatting, no backticks.
Schema:
{{
  "totalBilled": 5000,
  "coveredAmount": 4000,
  "outOfPocket": 1000,
  "deductibleApplied": 200,
  "coPayApplied": 0,
  "notes": "Policy covers 80%..."
}}
"""
        )

    def extract_text_from_pdf(self, file: UploadFile) -> str:
        try:
            reader = PyPDF2.PdfReader(file.file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            logger.error(f"Error parsing PDF: {e}")
            return "Could not parse PDF."

    async def parse_claim(self, bill_file: UploadFile, policy_file: UploadFile) -> InsuranceClaimResponse:
        bill_text = self.extract_text_from_pdf(bill_file)
        policy_text = self.extract_text_from_pdf(policy_file)
        
        # If texts are empty or parsing failed, we provide a fallback dummy response to avoid crashing the demo
        if not bill_text.strip() or not policy_text.strip():
             return InsuranceClaimResponse(
                status="success (fallback)",
                totalBilled=5000,
                coveredAmount=4000,
                outOfPocket=1000,
                deductibleApplied=200,
                coPayApplied=0,
                notes="Could not extract text from one or both PDFs. Proceeding with dummy calculation."
            )
             
        try:
            chain = self.prompt | self.llm
            response_text = chain.invoke({"bill_text": bill_text, "policy_text": policy_text}).content
            
            # Clean up the output in case Gemini added markdown
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            result = json.loads(clean_text)
            
            return InsuranceClaimResponse(
                status="success",
                totalBilled=result.get("totalBilled", 0),
                coveredAmount=result.get("coveredAmount", 0),
                outOfPocket=result.get("outOfPocket", 0),
                deductibleApplied=result.get("deductibleApplied", 0),
                coPayApplied=result.get("coPayApplied", 0),
                notes=result.get("notes", "Calculation completed.")
            )
        except Exception as e:
            logger.error(f"LLM Parsing error: {e}")
            return InsuranceClaimResponse(
                status="error",
                totalBilled=0,
                coveredAmount=0,
                outOfPocket=0,
                deductibleApplied=0,
                coPayApplied=0,
                notes=f"Error parsing claim: {str(e)}"
            )

insurance_parser_service = InsuranceParserService()
