"""
Configuración y gestión de la base de datos SQLite
Maneja la conexión, creación de tablas y operaciones CRUD
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from backend.models import Base, Document, ProcessingLog
from datetime import datetime
from typing import Optional, List
import os


# ==================== CONFIGURACIÓN DE LA BASE DE DATOS ====================

class DatabaseManager:
    """
    Gestor de la base de datos SQLite
    """
    
    def __init__(self, database_url: str = "sqlite:///./declaration_letters.db"):
        """
        Inicializa el gestor de base de datos
        
        Args:
            database_url: URL de conexión a la base de datos
        """
        self.database_url = database_url
        
        # Configuración especial para SQLite
        self.engine = create_engine(
            database_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=False  # Cambiar a True para depuración
        )
        
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )
    
    def create_tables(self):
        """
        Crea todas las tablas en la base de datos
        """
        Base.metadata.create_all(bind=self.engine)
        print("✓ Tablas de base de datos creadas exitosamente")
    
    def get_session(self) -> Session:
        """
        Obtiene una nueva sesión de base de datos
        
        Returns:
            Session: Sesión de SQLAlchemy
        """
        return self.SessionLocal()
    
    def close(self):
        """
        Cierra la conexión a la base de datos
        """
        self.engine.dispose()


# ==================== OPERACIONES CRUD ====================

class DocumentRepository:
    """
    Repositorio para operaciones CRUD de documentos
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_document(
        self,
        filename: str,
        original_filename: str,
        file_size: int,
        file_type: str
    ) -> Document:
        """
        Crea un nuevo registro de documento
        
        Args:
            filename: Nombre del archivo guardado
            original_filename: Nombre original del archivo
            file_size: Tamaño del archivo en bytes
            file_type: Tipo MIME del archivo
        
        Returns:
            Document: Documento creado
        """
        document = Document(
            filename=filename,
            original_filename=original_filename,
            file_size=file_size,
            file_type=file_type,
            status="uploaded",
            upload_date=datetime.utcnow()
        )
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document
    
    def get_document(self, document_id: int) -> Optional[Document]:
        """
        Obtiene un documento por su ID
        
        Args:
            document_id: ID del documento
        
        Returns:
            Document o None si no existe
        """
        return self.db.query(Document).filter(Document.id == document_id).first()
    
    def update_document_status(
        self,
        document_id: int,
        status: str,
        error_message: Optional[str] = None
    ) -> bool:
        """
        Actualiza el estado de un documento
        
        Args:
            document_id: ID del documento
            status: Nuevo estado
            error_message: Mensaje de error (opcional)
        
        Returns:
            bool: True si se actualizó correctamente
        """
        document = self.get_document(document_id)
        if document:
            document.status = status
            if error_message:
                document.error_message = error_message
            if status == "completed":
                document.processed_date = datetime.utcnow()
            self.db.commit()
            return True
        return False
    
    def update_document_content(
        self,
        document_id: int,
        markdown_content: str,
        generated_filename: str
    ) -> bool:
        """
        Actualiza el contenido generado de un documento
        
        Args:
            document_id: ID del documento
            markdown_content: Contenido en Markdown
            generated_filename: Nombre del archivo generado
        
        Returns:
            bool: True si se actualizó correctamente
        """
        document = self.get_document(document_id)
        if document:
            document.markdown_content = markdown_content
            document.generated_filename = generated_filename
            document.status = "completed"
            document.processed_date = datetime.utcnow()
            self.db.commit()
            return True
        return False
    
    def update_cover_letter_content(
        self,
        document_id: int,
        cover_letter_markdown: str,
        cover_letter_filename: str
    ) -> bool:
        """
        Actualiza el contenido del Cover Letter de un documento
        
        Args:
            document_id: ID del documento
            cover_letter_markdown: Contenido del Cover Letter en Markdown
            cover_letter_filename: Nombre del archivo del Cover Letter generado
        
        Returns:
            bool: True si se actualizó correctamente
        """
        document = self.get_document(document_id)
        if document:
            document.cover_letter_markdown = cover_letter_markdown
            document.cover_letter_filename = cover_letter_filename
            document.cover_letter_generated_date = datetime.utcnow()
            self.db.commit()
            return True
        return False
    
    def get_all_documents(self, limit: int = 100) -> List[Document]:
        """
        Obtiene todos los documentos
        
        Args:
            limit: Límite de resultados
        
        Returns:
            List[Document]: Lista de documentos
        """
        return self.db.query(Document).order_by(
            Document.upload_date.desc()
        ).limit(limit).all()
    
    def delete_document(self, document_id: int) -> bool:
        """
        Elimina un documento
        
        Args:
            document_id: ID del documento
        
        Returns:
            bool: True si se eliminó correctamente
        """
        document = self.get_document(document_id)
        if document:
            self.db.delete(document)
            self.db.commit()
            return True
        return False


class LogRepository:
    """
    Repositorio para operaciones de logs
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_log(
        self,
        document_id: int,
        action: str,
        details: Optional[str] = None,
        success: bool = True
    ) -> ProcessingLog:
        """
        Crea un nuevo registro de log
        
        Args:
            document_id: ID del documento
            action: Acción realizada
            details: Detalles adicionales
            success: Si la acción fue exitosa
        
        Returns:
            ProcessingLog: Log creado
        """
        log = ProcessingLog(
            document_id=document_id,
            action=action,
            details=details,
            success=success,
            timestamp=datetime.utcnow()
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log
    
    def get_logs_by_document(self, document_id: int) -> List[ProcessingLog]:
        """
        Obtiene todos los logs de un documento
        
        Args:
            document_id: ID del documento
        
        Returns:
            List[ProcessingLog]: Lista de logs
        """
        return self.db.query(ProcessingLog).filter(
            ProcessingLog.document_id == document_id
        ).order_by(ProcessingLog.timestamp.desc()).all()


# ==================== FUNCIONES DE UTILIDAD ====================

def init_database(database_url: str = "sqlite:///./declaration_letters.db"):
    """
    Inicializa la base de datos
    
    Args:
        database_url: URL de conexión a la base de datos
    
    Returns:
        DatabaseManager: Instancia del gestor de base de datos
    """
    db_manager = DatabaseManager(database_url)
    db_manager.create_tables()
    return db_manager


