""" Automation System for Declaration and Cover Letters - Main Backend
Backend with FastAPI to automate the writing of Declaration Letters and Cover Letters """

import os
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json
import asyncio

# Importaciones locales
from backend.models import (
    DocumentUploadResponse, 
    DocumentStatusResponse,
    HealthCheckResponse,
    ChatMessage,
    AIProvidersResponse
)
from backend.database import DatabaseManager, DocumentRepository, LogRepository
from backend.providers.base_provider import BaseAIProvider
from backend.ai_provider_factory import AIProviderFactory
from backend.document_converter import convert_md_text_to_docx_binary
from backend.chat_memory import ChatMemorySystem

# Cargar variables de entorno
from dotenv import load_dotenv
load_dotenv()

''' Configuración de logging '''
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log', encoding='utf-8')  # Guardar en archivo
    ]
)

logger = logging.getLogger(__name__)

''' Configuración de las constantes de entorno '''
# Directorios
BASE_DIR = Path(__file__).parent.parent
UPLOAD_FOLDER = BASE_DIR / os.getenv("UPLOAD_FOLDER", "uploads")
FRONTEND_FOLDER = BASE_DIR / "frontend"
UPLOAD_FOLDER.mkdir(exist_ok=True) # Crear directorios si no existen

MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

''' Configuración de Proveedores de IA y Chat '''
# Las configuraciones de Gemini/Groq (API keys, modelos, timeouts) se manejan en ai_provider_factory.py
DEFAULT_AI_PROVIDER = os.getenv("DEFAULT_AI_PROVIDER", "google_gemini")

# API Keys para el sistema de chat (solo se usan aquí)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")  # Necesario para ChatMemorySystem
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")  # Necesario para ChatMemorySystem
MEM0_API_KEY = os.getenv("MEM0_API_KEY", "")

''' Inicialización de la aplicación web con FastAPI '''
app = FastAPI(
    title="Online Declaration and Cover Letters",
    description="Automation System for Declaration and Cover Letters",
)

''' Permite que el frontend (que puede estar en otro dominio) se comunique con el backend.'''
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar base de datos
db_manager = DatabaseManager(os.getenv("DATABASE_URL", "sqlite:///./declaration_letters.db"))
db_manager.create_tables()

ai_processors_cache: Dict[str, BaseAIProvider] = {} # Caché de procesadores de IA por proveedor

AVAILABLE_PROVIDERS = AIProviderFactory.get_available_providers() # Obtener proveedores disponibles al inicio (cachear)
logger.info(f"Proveedores de IA disponibles: {AVAILABLE_PROVIDERS if AVAILABLE_PROVIDERS else 'Ninguno'}")

chat_system: Optional[ChatMemorySystem] = None # Inicializar sistema de chat con memoria

if GEMINI_API_KEY and MEM0_API_KEY:
    try:
        chat_system = ChatMemorySystem(
            mem0_api_key=MEM0_API_KEY,
            google_api_key=GEMINI_API_KEY,
            model_name=GEMINI_MODEL
        )
    except Exception as e:
        logger.error(f"Error al inicializar sistema de chat: {e}")
else:
    logger.warning("API keys no configuradas para el sistema de chat")

app.mount("/frontend", StaticFiles(directory=str(FRONTEND_FOLDER)), name="frontend") # Montar archivos estáticos

# CONSTANTES
STREAMING_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
}

DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

# FUNCIONES HELPER
def _get_document_or_404(doc_repo: DocumentRepository, document_id: int):
    """
    Obtiene un documento o lanza un error 404
    
    Args:
        doc_repo: Repositorio de documentos
        document_id: ID del documento
    
    Returns:
        Document: El documento encontrado
    
    Raises:
        HTTPException: Si el documento no existe
    """
    document = doc_repo.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return document

def _get_document_content(document, document_type: str) -> str:
    """
    Obtiene el contenido de un documento según su tipo
    
    Args:
        document: El documento
        document_type: Tipo de documento ('declaration' o 'cover')
    
    Returns:
        str: Contenido del documento
    
    Raises:
        HTTPException: Si el tipo es inválido o el contenido no existe
    """
    if document_type == "declaration":
        content = document.markdown_content
    elif document_type == "cover":
        content = document.cover_letter_markdown
    else:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")
    
    if not content:
        raise HTTPException(
            status_code=400,
            detail=f"{document_type.title()} Letter no generado aún"
        )
    
    return content

def _extract_modified_text(response: str) -> tuple[bool, Optional[str]]:
    """
    Extrae el texto modificado de la respuesta del chat
    
    Args:
        response: Respuesta completa del chat
    
    Returns:
        tuple: (tiene_modificacion, texto_modificado)
    """
    has_modification = "MODIFIED_TEXT:" in response
    modified_text = None
    
    if has_modification:
        parts = response.split("MODIFIED_TEXT:", 1)
        if len(parts) > 1:
            modified_text = parts[1].strip()
            
            # Limpiar bloques de código markdown si los hay
            if modified_text.startswith("```"):
                lines = modified_text.split("\n")
                if lines[0].strip().startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                modified_text = "\n".join(lines)
            
            modified_text = modified_text.strip()
    
    return has_modification, modified_text

def _create_docx_response(markdown_content: str, filename: str) -> Response:
    """ Crea una respuesta con un archivo DOCX generado desde contenido Markdown """
    try:
        docx_binary = convert_md_text_to_docx_binary(markdown_content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar archivo DOCX: {str(e)}"
        )
    
    return Response(
        content=docx_binary,
        media_type=DOCX_MEDIA_TYPE,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

def _create_preview_response(document, document_id: int, document_type: str) -> JSONResponse:
    """
    Crea una respuesta JSON con el preview de un documento
    
    Args:
        document: El documento de la base de datos
        document_id: ID del documento
        document_type: Tipo de documento ('declaration' o 'cover')
    
    Returns:
        JSONResponse con el contenido Markdown
    
    Raises:
        HTTPException: Si el contenido no existe
    """
    if document_type == "declaration":
        content = document.markdown_content
        filename = document.generated_filename
        content_key = "markdown_content"
        filename_key = "generated_filename"
        error_msg = "Documento no procesado aún"
    elif document_type == "cover":
        content = document.cover_letter_markdown
        filename = document.cover_letter_filename
        content_key = "cover_letter_markdown"
        filename_key = "cover_letter_filename"
        error_msg = "Cover Letter no generado aún"
    else:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")
    
    if not content:
        raise HTTPException(status_code=400, detail=error_msg)
    
    return JSONResponse(content={
        "success": True,
        "document_id": document_id,
        content_key: content,
        filename_key: filename
    })

# DEPENDENCIAS
def get_db():
    """Obtiene una sesión de base de datos"""
    db = db_manager.get_session()
    try:
        yield db
    finally:
        db.close()

def get_ai_processor(provider: str = None) -> BaseAIProvider:
    if not provider:
        provider = DEFAULT_AI_PROVIDER
    
    # Verificar si ya existe en caché
    if provider in ai_processors_cache:
        return ai_processors_cache[provider]
    
    # Crear nuevo procesador
    try:
        processor = AIProviderFactory.create_processor(provider)
        
        if not processor:
            raise HTTPException(
                status_code=503,
                detail=f"Proveedor de IA '{provider}' no disponible. Verifique las API keys."
            )
            
        ai_processors_cache[provider] = processor # Agregar a caché
        logger.info(f"Procesador de IA creado y cacheado: {provider}")
        
        return processor
        
    except Exception as e:
        logger.error(f"Error al crear procesador de IA para {provider}: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Error al inicializar proveedor de IA '{provider}': {str(e)}"
        )

# RUTAS
@app.get("/")
async def root():
    """ Redirige a la página principal """
    return FileResponse(str(FRONTEND_FOLDER / "index.html"))

@app.get("/health", response_model=HealthCheckResponse)
async def health_check(db: Session = Depends(get_db)):
    """ Verifica el estado de salud del sistema """
    db_status = "ok"
    ai_status = "ok" if AVAILABLE_PROVIDERS else "not_configured" # Usar caché de proveedores 
    
    return HealthCheckResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        database=db_status,
        ai_service=ai_status
    )

@app.get("/api/providers", response_model=AIProvidersResponse)
async def get_available_providers():
    """ Obtiene la lista de proveedores de IA disponibles y configurados """
    try:
        # Usar caché de proveedores 
        return AIProvidersResponse(
            success=True,
            providers=AVAILABLE_PROVIDERS,
            default_provider=DEFAULT_AI_PROVIDER
        )
    except Exception as e:
        logger.error(f"Error al obtener proveedores: {e}")
        return AIProvidersResponse(
            success=False,
            providers=[],
            default_provider=DEFAULT_AI_PROVIDER
        )

@app.post("/api/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """ Sube un archivo de cuestionario """
    try:
        # Validar tamaño del archivo
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"El archivo excede el tamaño máximo de {MAX_FILE_SIZE_MB}MB"
            )
        
        # Generar nombre único para el archivo
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_FOLDER / unique_filename
        
        # Guardar archivo
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Crear registro en base de datos
        doc_repo = DocumentRepository(db)
        document = doc_repo.create_document(
            filename=unique_filename,
            original_filename=file.filename,
            file_size=file_size,
            file_type=file.content_type
        )
        
        # Crear log
        log_repo = LogRepository(db)
        log_repo.create_log(
            document_id=document.id,
            action="upload",
            details=f"Archivo subido: {file.filename}"
        )
        
        return DocumentUploadResponse(
            success=True,
            message="Archivo subido exitosamente",
            document_id=document.id,
            filename=unique_filename
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir archivo: {str(e)}")

async def _generate_document_stream(
    document_id: int,
    ai_processor: BaseAIProvider,
    db: Session,
    document_type: str
):
    """ Función principal para generar documentos con streaming """
    doc_repo = DocumentRepository(db)
    log_repo = LogRepository(db)
    
    # Configuración según tipo de documento
    config = {
        'declaration': {
            'action_start': 'process_start',
            'action_complete': 'process_complete',
            'action_error': 'error',
            'details_start': 'Iniciando procesamiento del documento (streaming)',
            'error_prefix': 'Documento',
            'filename_prefix': 'declaration_letter',
            'requires_file': True,
            'update_status': True,
            'update_method': lambda doc_id, content, filename: doc_repo.update_document_content(
                doc_id, content, filename
            ),
            'generate_method': lambda ai, text: ai.generate_declaration_letter_stream(text)
        },
        'cover': {
            'action_start': 'cover_letter_start',
            'action_complete': 'cover_letter_complete',
            'action_error': 'cover_letter_error',
            'details_start': 'Iniciando generación de Cover Letter (streaming)',
            'error_prefix': 'Cover Letter',
            'filename_prefix': 'cover_letter',
            'requires_file': False,
            'update_status': False,
            'update_method': lambda doc_id, content, filename: doc_repo.update_cover_letter_content(
                doc_id, content, filename
            ),
            'generate_method': lambda ai, text: ai.generate_cover_letter_stream(text)
        }
    }
    
    if document_type not in config:
        yield f"data: {json.dumps({'type': 'error', 'error': 'Tipo de documento inválido'})}\n\n"
        return
    
    cfg = config[document_type]
    
    try:
        # Obtener documento de la base de datos
        document = doc_repo.get_document(document_id)
        
        if not document:
            yield f"data: {json.dumps({'type': 'error', 'error': 'Documento no encontrado'})}\n\n"
            return
        
        # Validaciones específicas según tipo
        if cfg['requires_file']:
            # Declaration Letter: necesita procesar archivo
            if cfg['update_status']:
                doc_repo.update_document_status(document_id, "processing")
            
            # Crear log inicial
            log_repo.create_log(
                document_id=document_id,
                action=cfg['action_start'],
                details=cfg['details_start']
            )
            
            # Extraer texto del archivo
            file_path = UPLOAD_FOLDER / document.filename
            
            if not file_path.exists():
                error_msg = "Archivo fuente no encontrado"
                doc_repo.update_document_status(document_id, "error", error_msg)
                log_repo.create_log(document_id, cfg['action_error'], error_msg)
                yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
                return
            
            source_text = ai_processor.extract_text_from_file(str(file_path))
            
            if not source_text or len(source_text.strip()) == 0:
                error_msg = "No se pudo extraer texto del archivo o el archivo está vacío"
                doc_repo.update_document_status(document_id, "error", error_msg)
                log_repo.create_log(document_id, cfg['action_error'], error_msg)
                yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
                return
        else:
            # Cover Letter: usa Declaration Letter existente
            if not document.markdown_content:
                yield f"data: {json.dumps({'type': 'error', 'error': 'El Declaration Letter debe ser generado primero'})}\n\n"
                return
            
            # Crear log inicial
            log_repo.create_log(
                document_id=document_id,
                action=cfg['action_start'],
                details=cfg['details_start']
            )
            
            source_text = document.markdown_content
        
        # Generar contenido con streaming
        full_content = ""
        try:
            for chunk in cfg['generate_method'](ai_processor, source_text):
                full_content += chunk
                # Enviar chunk al cliente
                yield f"data: {json.dumps({'type': 'content', 'chunk': chunk})}\n\n"
                await asyncio.sleep(0)  # Permitir que otros tasks se ejecuten
            
        except Exception as ai_error:
            error_msg = f"Error en la API de IA: {str(ai_error)}"
            if cfg['update_status']:
                doc_repo.update_document_status(document_id, "error", error_msg)
            log_repo.create_log(document_id, cfg['action_error'], error_msg)
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
            return
        
        if not full_content or len(full_content.strip()) == 0:
            error_msg = f"La IA generó un {cfg['error_prefix']} vacío"
            if cfg['update_status']:
                doc_repo.update_document_status(document_id, "error", error_msg)
            log_repo.create_log(document_id, cfg['action_error'], error_msg)
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
            return
        
        # Generar nombre de archivo
        generated_filename = f"{cfg['filename_prefix']}_{document_id}_{uuid.uuid4().hex[:8]}.docx"
        
        # Actualizar base de datos
        cfg['update_method'](document_id, full_content, generated_filename)
        
        # Crear log de finalización
        log_repo.create_log(
            document_id=document_id,
            action=cfg['action_complete'],
            details=f"{cfg['error_prefix']} generado: {generated_filename}"
        )
        
        # Enviar evento de completado
        yield f"data: {json.dumps({'type': 'complete', 'filename': generated_filename})}\n\n"
        
    except Exception as e:
        error_msg = f"Error inesperado: {str(e)}"
        try:
            if cfg['update_status']:
                doc_repo.update_document_status(document_id, "error", error_msg)
            log_repo.create_log(document_id, cfg['action_error'], error_msg)
        except:
            pass
        yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"

@app.get("/api/process/{document_id}/stream")
async def process_document_stream(
    document_id: int,
    ai_provider: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """ Procesa un documento y genera la Declaration Letter con streaming (SSE) """
    ai = get_ai_processor(ai_provider)
    
    return StreamingResponse(
        _generate_document_stream(document_id, ai, db, 'declaration'),
        media_type="text/event-stream",
        headers=STREAMING_HEADERS
    )

@app.get("/api/generate-cover-letter/{document_id}/stream")
async def generate_cover_letter_stream(
    document_id: int,
    ai_provider: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """ Genera un Cover Letter con streaming (SSE) """
    ai = get_ai_processor(ai_provider)
    
    return StreamingResponse(
        _generate_document_stream(document_id, ai, db, 'cover'),
        media_type="text/event-stream",
        headers=STREAMING_HEADERS
    )

@app.get("/api/status/{document_id}", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtiene el estado de un documento
    
    Args:
        document_id: ID del documento
        db: Sesión de base de datos
    
    Returns:
        DocumentStatusResponse con el estado del documento
    """
    doc_repo = DocumentRepository(db)
    document = _get_document_or_404(doc_repo, document_id)
    
    return DocumentStatusResponse(
        document_id=document.id,
        status=document.status,
        filename=document.original_filename,
        upload_date=document.upload_date.isoformat(),
        processed_date=document.processed_date.isoformat() if document.processed_date else None,
        error_message=document.error_message
    )

@app.get("/api/download/{document_id}")
async def download_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """ Descarga el Declaration Letter generado (on-the-fly en memoria) """
    doc_repo = DocumentRepository(db)
    document = _get_document_or_404(doc_repo, document_id)
    
    if not document.markdown_content:
        raise HTTPException(status_code=400, detail="Documento no procesado aún")
    
    return _create_docx_response(document.markdown_content, "declaration_letter.docx")

@app.get("/api/preview/{document_id}")
async def preview_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """ Obtiene la vista previa del Declaration Letter (contenido Markdown) """
    doc_repo = DocumentRepository(db)
    document = _get_document_or_404(doc_repo, document_id)
    return _create_preview_response(document, document_id, "declaration")

@app.get("/api/download-cover-letter/{document_id}")
async def download_cover_letter(
    document_id: int,
    db: Session = Depends(get_db)
):
    """ Descarga el Cover Letter generado (on-the-fly en memoria) """
    doc_repo = DocumentRepository(db)
    document = _get_document_or_404(doc_repo, document_id)
    
    if not document.cover_letter_markdown:
        raise HTTPException(status_code=400, detail="Cover Letter no generado aún")
    
    return _create_docx_response(document.cover_letter_markdown, "cover_letter.docx")

@app.post("/api/download-edited/{document_id}/{document_type}")
async def download_edited_document(
    document_id: int,
    document_type: str,
    request: dict,
    db: Session = Depends(get_db)
):
    """ Descarga un documento con contenido editado por el usuario """
    edited_content = request.get('content')
    
    if not edited_content:
        raise HTTPException(status_code=400, detail="Contenido editado no proporcionado")
    
    filename = f"{document_type}_{document_id}_edited.docx"
    return _create_docx_response(edited_content, filename)

@app.get("/api/preview-cover-letter/{document_id}")
async def preview_cover_letter(
    document_id: int,
    db: Session = Depends(get_db)
):
    """ Obtiene la vista previa del Cover Letter (contenido Markdown) """
    doc_repo = DocumentRepository(db)
    document = _get_document_or_404(doc_repo, document_id)
    return _create_preview_response(document, document_id, "cover")

# CHAT CON MEMORIA (STREAMING)
@app.post("/api/chat/stream")
async def chat_with_ai_stream(
    chat_message: ChatMessage,
    db: Session = Depends(get_db)
):
    """
    Endpoint de chat con IA usando streaming (SSE) para respuestas en tiempo real
    
    Args:
        chat_message: Mensaje del usuario con contexto del documento
        db: Sesión de base de datos
    
    Returns:
        StreamingResponse con Server-Sent Events
    """
    if not chat_system:
        raise HTTPException(
            status_code=503, 
            detail="Sistema de chat no disponible. Verifique las API keys."
        )
    
    async def event_generator():
        try:
            # Obtener el documento y su contenido
            doc_repo = DocumentRepository(db)
            
            try:
                document = _get_document_or_404(doc_repo, chat_message.document_id)
                document_content = _get_document_content(document, chat_message.document_type)
            except HTTPException as he:
                yield f"data: {json.dumps({'type': 'error', 'error': he.detail})}\n\n"
                return
            
            # Generar ID de usuario único
            user_id = chat_message.user_id or f"user_{chat_message.document_id}"
            
            # Generar respuesta con streaming
            full_response = ""
            try:
                for chunk in chat_system.generate_response_stream(
                    user_message=chat_message.message,
                    user_id=user_id,
                    document_content=document_content,
                    document_type=chat_message.document_type
                ):
                    full_response += chunk
                    # Enviar chunk al cliente
                    yield f"data: {json.dumps({'type': 'content', 'chunk': chunk})}\n\n"
                    await asyncio.sleep(0)  # Permitir que otros tasks se ejecuten
                
            except Exception as stream_error:
                error_msg = f"Error en streaming: {str(stream_error)}"
                yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
                return
            
            # Extraer texto modificado si existe
            has_modification, modified_text = _extract_modified_text(full_response)
            
            # Guardar en memoria después de completar
            chat_system.save_conversation(user_id, chat_message.message, full_response)
            
            # Enviar evento de completado con información de modificación
            yield f"data: {json.dumps({'type': 'complete', 'has_modification': has_modification, 'modified_text': modified_text})}\n\n"
            
        except Exception as e:
            error_msg = f"Error inesperado: {str(e)}"
            logger.error(f"Error en chat stream: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=STREAMING_HEADERS
    )

@app.delete("/api/chat/memory/{user_id}")
async def clear_chat_memory(user_id: str):
    """
    Limpia la memoria de chat de un usuario
    
    Args:
        user_id: ID del usuario
    
    Returns:
        Confirmación de limpieza
    """
    if not chat_system:
        raise HTTPException(
            status_code=503, 
            detail="Sistema de chat no disponible"
        )
    
    try:
        chat_system.clear_user_memories(user_id)
        return JSONResponse(content={
            "success": True,
            "message": f"Memoria limpiada para usuario {user_id}"
        })
    except Exception as e:
        logger.error(f"Error limpiando memoria: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al limpiar memoria: {str(e)}"
        )

''' Hilo principal de la aplicación '''
if __name__ == "__main__":
    import uvicorn
    
    # Use 0.0.0.0 for production compatibility
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    logger.info("Automation System for Declaration Letters and Cover Letters")
    logger.info(f"Servidor: http://{host}:{port}")
    logger.info(f"Documentación API: http://{host}:{port}/docs")
    
    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=os.getenv("DEBUG_MODE", "False") == "True"
    )