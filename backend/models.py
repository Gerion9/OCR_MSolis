"""
Modelos de datos para DeclarationLetterOnline
Define las estructuras de datos utilizadas en la aplicación
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

Base = declarative_base()


# ==================== MODELOS SQLAlchemy (Base de Datos) ====================

class Document(Base):
    """
    Modelo para almacenar información sobre los documentos procesados
    """
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    processed_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="uploaded")  # uploaded, processing, completed, error
    generated_filename = Column(String(255), nullable=True)
    markdown_content = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    file_size = Column(Integer, nullable=True)
    file_type = Column(String(50), nullable=True)
    
    # Campos para Cover Letter
    cover_letter_markdown = Column(Text, nullable=True)
    cover_letter_filename = Column(String(255), nullable=True)
    cover_letter_generated_date = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Document(id={self.id}, filename={self.filename}, status={self.status})>"


class ProcessingLog(Base):
    """
    Modelo para almacenar el historial de procesamiento
    """
    __tablename__ = "processing_logs"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, nullable=False)
    action = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(Text, nullable=True)
    success = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<ProcessingLog(id={self.id}, document_id={self.document_id}, action={self.action})>"


# ==================== MODELOS Pydantic (API) ====================

class DocumentUploadResponse(BaseModel):
    """
    Respuesta al subir un documento
    """
    success: bool
    message: str
    document_id: Optional[int] = None
    filename: Optional[str] = None


class DocumentProcessResponse(BaseModel):
    """
    Respuesta al procesar un documento
    """
    success: bool
    message: str
    document_id: int
    markdown_content: Optional[str] = None
    generated_filename: Optional[str] = None
    download_url: Optional[str] = None


class DocumentStatusResponse(BaseModel):
    """
    Respuesta de estado de un documento
    """
    document_id: int
    status: str
    filename: str
    upload_date: str
    processed_date: Optional[str] = None
    error_message: Optional[str] = None


class RegenerateRequest(BaseModel):
    """
    Solicitud para regenerar un documento
    """
    document_id: int


class HealthCheckResponse(BaseModel):
    """
    Respuesta del health check
    """
    status: str
    timestamp: str
    database: str
    ai_service: str


class CoverLetterGenerateResponse(BaseModel):
    """
    Respuesta al generar un Cover Letter
    """
    success: bool
    message: str
    document_id: int
    cover_letter_markdown: Optional[str] = None
    cover_letter_filename: Optional[str] = None
    download_url: Optional[str] = None


