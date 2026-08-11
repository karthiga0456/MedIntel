import os
import uuid
import io
from PIL import Image
import pytesseract
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document

from app.core.logging import get_logger
from app.config import settings
from app.modules.healthcare_rag.schemas import (
    DocumentQueryRequest,
    DocumentQueryResponse,
    UploadResponse,
)

logger = get_logger(__name__)

system_prompt = (
    "You are an expert medical assistant for the MedIntel platform. "
    "Use the following pieces of retrieved context to answer the user's question about their medical report. "
    "Explain the medical terms in simple, plain language that a patient or village health worker can understand. "
    "If the context does not contain the answer, say 'I cannot find this information in the uploaded document.' "
    "Do NOT provide a definitive diagnosis or prescribe medication, but do explain what the findings generally mean. "
    "\n\n"
    "Context: {context}"
)

class HealthcareRAGService:
    def __init__(self):
        self.vector_db_path = settings.vector_db_path
        self.embeddings = None
        self.llm = None
        
    def _init_models(self):
        if self.embeddings is None:
            if settings.google_api_key:
                try:
                    self.embeddings = GoogleGenerativeAIEmbeddings(
                        model="models/embedding-001",
                        google_api_key=settings.google_api_key
                    )
                    self.llm = ChatGoogleGenerativeAI(
                        model="gemini-2.5-flash",
                        google_api_key=settings.google_api_key,
                        temperature=0
                    )
                except Exception as e:
                    logger.warning(f"Google AI failed: {e}. Falling back to Ollama.")
                    self._init_ollama_fallback()
            else:
                self._init_ollama_fallback()

    def _init_ollama_fallback(self):
        from langchain_community.embeddings import OllamaEmbeddings
        from langchain_community.chat_models import ChatOllama
        self.embeddings = OllamaEmbeddings(model="llama3")
        self.llm = ChatOllama(model="llama3")
            
    def _get_faiss_index(self):
        self._init_models()
        if os.path.exists(os.path.join(self.vector_db_path, "index.faiss")):
            return FAISS.load_local(self.vector_db_path, self.embeddings, allow_dangerous_deserialization=True)
        return None

    def ingest_document(self, filename: str, content: bytes) -> UploadResponse:
        logger.info(f"Ingesting document: {filename}")
        self._init_models()
        doc_id = str(uuid.uuid4())
        extracted_text = ""
        
        ext = filename.split('.')[-1].lower()
        if ext == 'pdf':
            temp_path = f"./data/{doc_id}.pdf"
            with open(temp_path, "wb") as f:
                f.write(content)
            
            try:
                loader = PyPDFLoader(temp_path)
                pages = loader.load()
                extracted_text = " ".join([page.page_content for page in pages])
                
                if not extracted_text.strip():
                    logger.info("PyPDFLoader found no text, attempting PyMuPDF OCR fallback...")
                    import fitz
                    doc = fitz.open(temp_path)
                    for page in doc:
                        pix = page.get_pixmap()
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        extracted_text += pytesseract.image_to_string(img) + " "
            except Exception as e:
                logger.error(f"PDF extraction failed: {e}")
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
        
        elif ext in ['png', 'jpg', 'jpeg']:
            try:
                image = Image.open(io.BytesIO(content))
                extracted_text = pytesseract.image_to_string(image)
            except Exception as e:
                logger.error(f"OCR failed: {e}")
                raise ValueError("Failed to extract text from image. Tesseract OCR may not be installed or configured correctly.")
        else:
            raise ValueError("Unsupported file format. Please upload PDF or image.")
            
        if not extracted_text.strip():
            raise ValueError("No text could be extracted from the document.")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.split_text(extracted_text)
        documents = [Document(page_content=chunk, metadata={"source": filename, "doc_id": doc_id}) for chunk in chunks]
        
        db = self._get_faiss_index()
        if db is None:
            db = FAISS.from_documents(documents, self.embeddings)
        else:
            db.add_documents(documents)
            
        db.save_local(self.vector_db_path)
        
        return UploadResponse(document_id=doc_id, filename=filename, chunks_indexed=len(chunks))

    def query(self, request: DocumentQueryRequest) -> DocumentQueryResponse:
        logger.info(f"RAG query: {request.query}")
        db = self._get_faiss_index()
        if db is None:
            return DocumentQueryResponse(answer="No documents have been indexed yet.", sources=[])
            
        retriever = db.as_retriever(search_kwargs={"k": 4})
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])
        
        question_answer_chain = create_stuff_documents_chain(self.llm, prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)
        
        response = rag_chain.invoke({"input": request.query})
        
        sources = list(set([doc.metadata.get("source", "Unknown") for doc in response["context"]]))
        
        return DocumentQueryResponse(
            answer=response["answer"],
            sources=sources
        )

healthcare_rag_service = HealthcareRAGService()
