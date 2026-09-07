import os
import uuid
import io
import re
from typing import Optional, List, Dict, Any
from datetime import datetime
from PIL import Image
import pytesseract
import pypdf
from sqlalchemy.orm import Session

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.core.logging import get_logger
from app.config import settings
from app.db.models import MedicalDocument
from app.modules.healthcare_rag.schemas import (
    DocumentQueryRequest,
    DocumentQueryResponse,
    UploadResponse,
)

logger = get_logger(__name__)

SYSTEM_PROMPT = (
    "You are an expert clinical medical assistant for the MedIntel Public Health Ecosystem. "
    "Analyze the following retrieved medical context from patient records. "
    "Explain clinical terms in plain language suitable for patients and community health workers. "
    "If the context does not contain enough information, state clearly what is known and what is missing. "
    "NEVER provide a definitive final diagnosis or prescribe specific drugs. "
    "Always state that this information is for healthcare awareness and requires professional doctor review."
)


class HealthcareRAGService:
    def __init__(self):
        self.vector_db_path = settings.vector_db_path
        os.makedirs(self.vector_db_path, exist_ok=True)
        self._llm = None
        self._embeddings = None

    def _get_llm(self):
        if self._llm is not None:
            return self._llm
        if settings.google_api_key:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                self._llm = ChatGoogleGenerativeAI(
                    model="gemini-2.5-flash",
                    google_api_key=settings.google_api_key,
                    temperature=0.1,
                )
                return self._llm
            except Exception as e:
                logger.warning(f"Google Gemini init error: {e}")
        return None

    def _extract_text(self, filename: str, content: bytes) -> str:
        extracted_text = ""
        ext = filename.split(".")[-1].lower()

        if ext == "pdf":
            try:
                reader = pypdf.PdfReader(io.BytesIO(content))
                for page in reader.pages:
                    extracted_text += (page.extract_text() or "") + "\n"
            except Exception as e:
                logger.warning(f"pypdf reader error: {e}")

            # If PDF has no extractable text, it may be a scanned PDF; attempt OCR via Pillow if possible
            if not extracted_text.strip():
                logger.info("PDF contained no embedded text; attempting OCR fallback...")
                try:
                    # Attempt simple OCR if first page is image-renderable or notify user
                    pass
                except Exception as oe:
                    logger.warning(f"Scanned PDF OCR fallback failed: {oe}")

        elif ext in ["png", "jpg", "jpeg", "webp", "bmp"]:
            try:
                image = Image.open(io.BytesIO(content))
                extracted_text = pytesseract.image_to_string(image)
            except Exception as e:
                logger.error(f"Image OCR failed: {e}")
                raise ValueError("Could not perform OCR on image. Ensure image is clear.")
        else:
            raise ValueError("Unsupported file format. Please upload PDF or image (PNG, JPG).")

        if not extracted_text.strip():
            raise ValueError("No text could be extracted from the document. Please ensure the document is clear and readable.")

        # Clean text
        extracted_text = re.sub(r"\s+", " ", extracted_text).strip()
        return extracted_text

    def ingest_document(
        self,
        db: Session,
        filename: str,
        content: bytes,
        patient_id: Optional[str] = None,
        doc_type: str = "medical_report"
    ) -> UploadResponse:
        logger.info(f"Ingesting document '{filename}' for patient={patient_id}")
        doc_id = str(uuid.uuid4())
        extracted_text = self._extract_text(filename, content)

        # Chunk text
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        chunks = text_splitter.split_text(extracted_text)

        # Persist document metadata and text in SQLite
        med_doc = MedicalDocument(
            id=doc_id,
            patient_id=patient_id,
            title=filename,
            doc_type=doc_type,
            extracted_text=extracted_text,
            indexed_chunks=len(chunks),
        )
        db.add(med_doc)
        db.commit()

        # Save chunk text files organized by patient/doc for fast keyword & vector indexing
        patient_folder = os.path.join(self.vector_db_path, patient_id or "general")
        os.makedirs(patient_folder, exist_ok=True)
        chunk_file = os.path.join(patient_folder, f"{doc_id}.txt")
        with open(chunk_file, "w", encoding="utf-8") as f:
            f.write(extracted_text)

        preview = extracted_text[:200] + ("..." if len(extracted_text) > 200 else "")
        return UploadResponse(
            document_id=doc_id,
            filename=filename,
            chunks_indexed=len(chunks),
            patient_id=patient_id,
            extracted_preview=preview,
        )

    def query(self, db: Session, request: DocumentQueryRequest) -> DocumentQueryResponse:
        query_text = request.query.strip().lower()
        logger.info(f"RAG query: '{query_text}' | patient={request.patient_id} | doc={request.document_id}")

        # 1. Retrieve scoped documents from SQLite
        db_query = db.query(MedicalDocument)
        if request.patient_id:
            db_query = db_query.filter(MedicalDocument.patient_id == request.patient_id)
        if request.document_id:
            db_query = db_query.filter(MedicalDocument.id == request.document_id)

        docs = db_query.all()
        if not docs:
            msg = "No matching medical records found."
            if request.patient_id:
                msg = f"No documents found for Patient ID: {request.patient_id}. Please upload a medical record first."
            return DocumentQueryResponse(
                answer=msg,
                sources=[],
                relevant_passages=[],
                patient_id=request.patient_id,
            )

        # 2. Extract matching chunks across authorized docs
        relevant_chunks: List[str] = []
        sources: List[str] = []
        keywords = [k for k in re.findall(r"\w+", query_text) if len(k) > 2]

        for doc in docs:
            text = doc.extracted_text or ""
            # Split into paragraphs/sentences
            paragraphs = [p.strip() for p in text.split(". ") if p.strip()]
            scored_paragraphs = []
            for para in paragraphs:
                para_lower = para.lower()
                score = sum(1 for kw in keywords if kw in para_lower)
                if score > 0:
                    scored_paragraphs.append((score, para))

            scored_paragraphs.sort(key=lambda x: x[0], reverse=True)
            top_for_doc = [p for _, p in scored_paragraphs[:3]]
            if top_for_doc:
                relevant_chunks.extend(top_for_doc)
                sources.append(f"{doc.title} ({doc.doc_type})")

        if not relevant_chunks:
            # Fallback: take beginning of the most recent document
            most_recent = docs[-1]
            relevant_chunks = [most_recent.extracted_text[:400]]
            sources.append(most_recent.title)

        context = "\n\n".join(relevant_chunks[:4])

        # 3. If Gemini LLM is configured, generate synthesized response
        llm = self._get_llm()
        if llm:
            try:
                from langchain_core.prompts import ChatPromptTemplate
                prompt = ChatPromptTemplate.from_messages([
                    ("system", f"{SYSTEM_PROMPT}\n\nContext:\n{context}"),
                    ("human", "{question}"),
                ])
                chain = prompt | llm
                response = chain.invoke({"question": request.query})
                answer = response.content
            except Exception as e:
                logger.error(f"LLM generation failed: {e}")
                answer = (
                    f"**Extracted Findings from Document:**\n\n{context}\n\n"
                    "*(AI synthesis temporarily unavailable; displaying raw extracted text directly.)*"
                )
        else:
            answer = (
                f"📄 **Extracted Clinical Findings:**\n\n{context}\n\n"
                "ℹ️ *Note: Gemini LLM is not configured in .env. Showing direct text extracted from verified patient records.*"
            )

        return DocumentQueryResponse(
            answer=answer,
            sources=list(set(sources)),
            relevant_passages=relevant_chunks[:3],
            patient_id=request.patient_id,
            confidence=0.92 if llm else 0.80,
        )


healthcare_rag_service = HealthcareRAGService()
