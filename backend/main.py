"""
DeclarationLetterOnline - Aplicación Web Principal
Backend con FastAPI para automatizar la redacción de Declaration Letters
"""

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from io import BytesIO

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
    DocumentProcessResponse,
    DocumentStatusResponse,
    RegenerateRequest,
    HealthCheckResponse,
    CoverLetterGenerateResponse,
    ChatMessage,
    ChatResponse
)
from backend.database import DatabaseManager, DocumentRepository, LogRepository
from backend.ai_processor import create_ai_processor, AIProcessor
from backend.document_converter import convert_md_text_to_docx_binary
from backend.chat_memory import ChatMemorySystem

# Cargar variables de entorno
from dotenv import load_dotenv
load_dotenv()


# ==================== CONFIGURACIÓN ====================

# Configuración de directorios
BASE_DIR = Path(__file__).parent.parent
UPLOAD_FOLDER = BASE_DIR / os.getenv("UPLOAD_FOLDER", "uploads")
FRONTEND_FOLDER = BASE_DIR / "frontend"

# Crear directorios si no existen
UPLOAD_FOLDER.mkdir(exist_ok=True)

# Configuración de la aplicación
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Configuración de la API de Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
GEMINI_TIMEOUT = int(os.getenv("GEMINI_TIMEOUT", "300"))  # 5 minutos por defecto

# Configuración de mem0 para chat
MEM0_API_KEY = os.getenv("MEM0_API_KEY", "")


# ==================== INICIALIZACIÓN ====================

# Inicializar FastAPI
app = FastAPI(
    title="DeclarationLetterOnline",
    description="Sistema para automatizar la redacción de Declaration Letters",
    version="1.0.0"
)

# Configurar CORS
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

# Inicializar procesador de IA
ai_processor: Optional[AIProcessor] = None

if GEMINI_API_KEY and GEMINI_API_KEY != "tu_api_key_aqui":
    ai_processor = create_ai_processor(GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TIMEOUT)
    if ai_processor:
        print("✓ Procesador de IA inicializado correctamente")
        print(f"✓ Timeout configurado: {GEMINI_TIMEOUT} segundos")
    else:
        print("✗ Error al inicializar procesador de IA")
else:
    print("⚠ Advertencia: API key de Gemini no configurada")

# Inicializar sistema de chat con memoria
chat_system: Optional[ChatMemorySystem] = None

if GEMINI_API_KEY and MEM0_API_KEY:
    try:
        chat_system = ChatMemorySystem(
            mem0_api_key=MEM0_API_KEY,
            google_api_key=GEMINI_API_KEY
        )
        print("✓ Sistema de chat con memoria inicializado correctamente")
    except Exception as e:
        print(f"✗ Error al inicializar sistema de chat: {e}")
else:
    print("⚠ Advertencia: API keys no configuradas para el sistema de chat")


# Montar archivos estáticos
app.mount("/frontend", StaticFiles(directory=str(FRONTEND_FOLDER)), name="frontend")


# ==================== DEPENDENCIAS ====================

def get_db():
    """Obtiene una sesión de base de datos"""
    db = db_manager.get_session()
    try:
        yield db
    finally:
        db.close()


def get_ai_processor():
    """Obtiene el procesador de IA"""
    if not ai_processor:
        raise HTTPException(
            status_code=503,
            detail="Servicio de IA no disponible. Configure la API key de Gemini."
        )
    return ai_processor


# ==================== RUTAS ====================

@app.get("/")
async def root():
    """Redirige a la página principal"""
    return FileResponse(str(FRONTEND_FOLDER / "index.html"))


@app.get("/health", response_model=HealthCheckResponse)
async def health_check(db: Session = Depends(get_db)):
    """
    Verifica el estado de salud del sistema
    """
    db_status = "ok"
    ai_status = "ok" if ai_processor else "not_configured"
    
    return HealthCheckResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        database=db_status,
        ai_service=ai_status
    )


@app.post("/api/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Sube un archivo de cuestionario
    
    Args:
        file: Archivo a subir
        db: Sesión de base de datos
    
    Returns:
        DocumentUploadResponse con información del documento subido
    """
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


@app.post("/api/process/{document_id}", response_model=DocumentProcessResponse)
async def process_document(
    document_id: int,
    db: Session = Depends(get_db),
    ai: AIProcessor = Depends(get_ai_processor)
):
    """
    Procesa un documento y genera la declaration letter
    
    Args:
        document_id: ID del documento a procesar
        db: Sesión de base de datos
        ai: Procesador de IA
    
    Returns:
        DocumentProcessResponse con el documento generado
    """
    doc_repo = DocumentRepository(db)
    log_repo = LogRepository(db)
    
    try:
        # Obtener documento de la base de datos
        document = doc_repo.get_document(document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Documento no encontrado")
        
        # Actualizar estado a procesando
        doc_repo.update_document_status(document_id, "processing")
        
        # Crear log
        log_repo.create_log(
            document_id=document_id,
            action="process_start",
            details="Iniciando procesamiento del documento"
        )
        
        # Extraer texto del archivo
        file_path = UPLOAD_FOLDER / document.filename
        
        if not file_path.exists():
            error_msg = "Archivo fuente no encontrado"
            doc_repo.update_document_status(document_id, "error", error_msg)
            log_repo.create_log(document_id, "error", error_msg)
            raise HTTPException(status_code=404, detail=error_msg)
        
        questionnaire_text = ai.extract_text_from_file(str(file_path))
        
        if not questionnaire_text or len(questionnaire_text.strip()) == 0:
            error_msg = "No se pudo extraer texto del archivo o el archivo está vacío"
            doc_repo.update_document_status(document_id, "error", error_msg)
            log_repo.create_log(document_id, "error", error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Generar declaration letter
        try:
            markdown_content = ai.generate_declaration_letter(questionnaire_text)
        except Exception as ai_error:
            error_msg = f"Error en la API de IA: {str(ai_error)}"
            doc_repo.update_document_status(document_id, "error", error_msg)
            log_repo.create_log(document_id, "error", error_msg)
            
            # Verificar si es un error de timeout
            if "timeout" in str(ai_error).lower() or "timed out" in str(ai_error).lower():
                raise HTTPException(
                    status_code=504, 
                    detail=f"La generación del Declaration Letter excedió el tiempo límite de {GEMINI_TIMEOUT} segundos. El documento es muy extenso o el servidor está muy ocupado. Por favor, intente nuevamente en unos momentos."
                )
            else:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Error al comunicarse con el servicio de IA: {str(ai_error)}. Por favor, intente nuevamente."
                )
        
        if not markdown_content or len(markdown_content.strip()) == 0:
            error_msg = "La IA generó un documento vacío"
            doc_repo.update_document_status(document_id, "error", error_msg)
            log_repo.create_log(document_id, "error", error_msg)
            raise HTTPException(
                status_code=500, 
                detail="Error al generar la declaration letter. El contenido generado está vacío."
            )
        
        # Generar nombre de archivo (solo para referencia, no se guarda físicamente)
        generated_filename = f"declaration_letter_{document_id}_{uuid.uuid4().hex[:8]}.docx"
        
        # Actualizar base de datos
        doc_repo.update_document_content(
            document_id,
            markdown_content,
            generated_filename
        )
        
        # Crear log
        log_repo.create_log(
            document_id=document_id,
            action="process_complete",
            details=f"Documento generado: {generated_filename}"
        )
        
        return DocumentProcessResponse(
            success=True,
            message="Declaration letter generada exitosamente",
            document_id=document_id,
            markdown_content=markdown_content,
            generated_filename=generated_filename,
            download_url=f"/api/download/{document_id}"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        # Capturar cualquier otro error no manejado
        error_msg = f"Error inesperado: {str(e)}"
        try:
            doc_repo.update_document_status(document_id, "error", error_msg)
            log_repo.create_log(document_id, "error", error_msg)
        except:
            pass  # Si falla el log, al menos lanzar el error al cliente
        
        raise HTTPException(
            status_code=500, 
            detail=f"Error al procesar documento. Por favor, intente nuevamente."
        )


@app.post("/api/regenerate", response_model=DocumentProcessResponse)
async def regenerate_document(
    request: RegenerateRequest,
    db: Session = Depends(get_db),
    ai: AIProcessor = Depends(get_ai_processor)
):
    """
    Regenera una declaration letter existente
    
    Args:
        request: Solicitud con el ID del documento
        db: Sesión de base de datos
        ai: Procesador de IA
    
    Returns:
        DocumentProcessResponse con el nuevo documento generado
    """
    # Simplemente llama a process_document nuevamente
    return await process_document(request.document_id, db, ai)


@app.get("/api/process/{document_id}/stream")
async def process_document_stream(
    document_id: int,
    db: Session = Depends(get_db),
    ai: AIProcessor = Depends(get_ai_processor)
):
    """
    Procesa un documento y genera la declaration letter con streaming (SSE)
    
    Args:
        document_id: ID del documento a procesar
        db: Sesión de base de datos
        ai: Procesador de IA
    
    Returns:
        StreamingResponse con Server-Sent Events
    """
    async def event_generator():
        doc_repo = DocumentRepository(db)
        log_repo = LogRepository(db)
        
        try:
            # Obtener documento de la base de datos
            document = doc_repo.get_document(document_id)
            
            if not document:
                yield f"data: {json.dumps({'type': 'error', 'error': 'Documento no encontrado'})}\n\n"
                return
            
            # Actualizar estado a procesando
            doc_repo.update_document_status(document_id, "processing")
            
            # Crear log
            log_repo.create_log(
                document_id=document_id,
                action="process_start",
                details="Iniciando procesamiento del documento (streaming)"
            )
            
            # Extraer texto del archivo
            file_path = UPLOAD_FOLDER / document.filename
            
            if not file_path.exists():
                error_msg = "Archivo fuente no encontrado"
                doc_repo.update_document_status(document_id, "error", error_msg)
                log_repo.create_log(document_id, "error", error_msg)
                yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
                return
            
            questionnaire_text = ai.extract_text_from_file(str(file_path))
            
            if not questionnaire_text or len(questionnaire_text.strip()) == 0:
                error_msg = "No se pudo extraer texto del archivo o el archivo está vacío"
                doc_repo.update_document_status(document_id, "error", error_msg)
                log_repo.create_log(document_id, "error", error_msg)
                yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
                return
            
            # Generar declaration letter con streaming
            full_content = ""
            try:
                for chunk in ai.generate_declaration_letter_stream(questionnaire_text):
                    full_content += chunk
                    # Enviar chunk al cliente
                    yield f"data: {json.dumps({'type': 'content', 'chunk': chunk})}\n\n"
                    await asyncio.sleep(0)  # Permitir que otros tasks se ejecuten
                
            except Exception as ai_error:
                error_msg = f"Error en la API de IA: {str(ai_error)}"
                doc_repo.update_document_status(document_id, "error", error_msg)
                log_repo.create_log(document_id, "error", error_msg)
                yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
                return
            
            if not full_content or len(full_content.strip()) == 0:
                error_msg = "La IA generó un documento vacío"
                doc_repo.update_document_status(document_id, "error", error_msg)
                log_repo.create_log(document_id, "error", error_msg)
                yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
                return
            
            # Generar nombre de archivo (solo para referencia, no se guarda físicamente)
            generated_filename = f"declaration_letter_{document_id}_{uuid.uuid4().hex[:8]}.docx"
            
            # Actualizar base de datos
            doc_repo.update_document_content(
                document_id,
                full_content,
                generated_filename
            )
            
            # Crear log
            log_repo.create_log(
                document_id=document_id,
                action="process_complete",
                details=f"Documento generado: {generated_filename}"
            )
            
            # Enviar evento de completado
            yield f"data: {json.dumps({'type': 'complete', 'filename': generated_filename})}\n\n"
            
        except Exception as e:
            error_msg = f"Error inesperado: {str(e)}"
            try:
                doc_repo.update_document_status(document_id, "error", error_msg)
                log_repo.create_log(document_id, "error", error_msg)
            except:
                pass
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/generate-cover-letter/{document_id}/stream")
async def generate_cover_letter_stream(
    document_id: int,
    db: Session = Depends(get_db),
    ai: AIProcessor = Depends(get_ai_processor)
):
    """
    Genera un Cover Letter con streaming (SSE)
    
    Args:
        document_id: ID del documento con el Declaration Letter
        db: Sesión de base de datos
        ai: Procesador de IA
    
    Returns:
        StreamingResponse con Server-Sent Events
    """
    async def event_generator():
        doc_repo = DocumentRepository(db)
        log_repo = LogRepository(db)
        
        try:
            # Obtener documento de la base de datos
            document = doc_repo.get_document(document_id)
            
            if not document:
                yield f"data: {json.dumps({'type': 'error', 'error': 'Documento no encontrado'})}\n\n"
                return
            
            # Verificar que el Declaration Letter ya haya sido generado
            if not document.markdown_content:
                yield f"data: {json.dumps({'type': 'error', 'error': 'El Declaration Letter debe ser generado primero'})}\n\n"
                return
            
            # Crear log
            log_repo.create_log(
                document_id=document_id,
                action="cover_letter_start",
                details="Iniciando generación de Cover Letter (streaming)"
            )
            
            # Generar Cover Letter con streaming
            full_content = ""
            try:
                for chunk in ai.generate_cover_letter_stream(document.markdown_content):
                    full_content += chunk
                    # Enviar chunk al cliente
                    yield f"data: {json.dumps({'type': 'content', 'chunk': chunk})}\n\n"
                    await asyncio.sleep(0)  # Permitir que otros tasks se ejecuten
                
            except Exception as ai_error:
                error_msg = f"Error en la API de IA: {str(ai_error)}"
                log_repo.create_log(document_id, "cover_letter_error", error_msg)
                yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
                return
            
            if not full_content or len(full_content.strip()) == 0:
                error_msg = "La IA generó un Cover Letter vacío"
                log_repo.create_log(document_id, "cover_letter_error", error_msg)
                yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
                return
            
            # Generar nombre de archivo (solo para referencia, no se guarda físicamente)
            cover_letter_filename = f"cover_letter_{document_id}_{uuid.uuid4().hex[:8]}.docx"
            
            # Actualizar base de datos con el Cover Letter
            doc_repo.update_cover_letter_content(
                document_id,
                full_content,
                cover_letter_filename
            )
            
            # Crear log
            log_repo.create_log(
                document_id=document_id,
                action="cover_letter_complete",
                details=f"Cover Letter generado: {cover_letter_filename}"
            )
            
            # Enviar evento de completado
            yield f"data: {json.dumps({'type': 'complete', 'filename': cover_letter_filename})}\n\n"
            
        except Exception as e:
            error_msg = f"Error inesperado: {str(e)}"
            try:
                log_repo.create_log(document_id, "cover_letter_error", error_msg)
            except:
                pass
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
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
    document = doc_repo.get_document(document_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
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
    """
    Descarga el documento generado (generado on-the-fly en memoria)
    
    Args:
        document_id: ID del documento
        db: Sesión de base de datos
    
    Returns:
        Response con el archivo DOCX generado en memoria
    """
    doc_repo = DocumentRepository(db)
    document = doc_repo.get_document(document_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    if not document.markdown_content:
        raise HTTPException(status_code=400, detail="Documento no procesado aún")
    
    # Generar DOCX en memoria
    try:
        docx_binary = convert_md_text_to_docx_binary(document.markdown_content)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error al generar archivo DOCX: {str(e)}"
        )
    
    return Response(
        content=docx_binary,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename=declaration_letter.docx"
        }
    )


@app.get("/api/preview/{document_id}")
async def preview_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtiene la vista previa del documento (contenido Markdown)
    
    Args:
        document_id: ID del documento
        db: Sesión de base de datos
    
    Returns:
        JSON con el contenido Markdown
    """
    doc_repo = DocumentRepository(db)
    document = doc_repo.get_document(document_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    if not document.markdown_content:
        raise HTTPException(status_code=400, detail="Documento no procesado aún")
    
    return JSONResponse(content={
        "success": True,
        "document_id": document_id,
        "markdown_content": document.markdown_content,
        "generated_filename": document.generated_filename
    })


@app.post("/api/generate-cover-letter/{document_id}", response_model=CoverLetterGenerateResponse)
async def generate_cover_letter(
    document_id: int,
    db: Session = Depends(get_db),
    ai: AIProcessor = Depends(get_ai_processor)
):
    """
    Genera un Cover Letter basado en el Declaration Letter existente
    
    Args:
        document_id: ID del documento con el Declaration Letter
        db: Sesión de base de datos
        ai: Procesador de IA
    
    Returns:
        CoverLetterGenerateResponse con el Cover Letter generado
    """
    doc_repo = DocumentRepository(db)
    log_repo = LogRepository(db)
    
    try:
        # Obtener documento de la base de datos
        document = doc_repo.get_document(document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Documento no encontrado")
        
        # Verificar que el Declaration Letter ya haya sido generado
        if not document.markdown_content:
            raise HTTPException(
                status_code=400, 
                detail="El Declaration Letter debe ser generado primero"
            )
        
        # Crear log
        log_repo.create_log(
            document_id=document_id,
            action="cover_letter_start",
            details="Iniciando generación de Cover Letter"
        )
        
        # Generar Cover Letter usando el Declaration Letter como base
        try:
            cover_letter_markdown = ai.generate_cover_letter(document.markdown_content)
        except Exception as ai_error:
            error_msg = f"Error en la API de IA: {str(ai_error)}"
            log_repo.create_log(document_id, "cover_letter_error", error_msg)
            
            # Verificar si es un error de timeout
            if "timeout" in str(ai_error).lower() or "timed out" in str(ai_error).lower():
                raise HTTPException(
                    status_code=504, 
                    detail=f"La generación del Cover Letter excedió el tiempo límite de {GEMINI_TIMEOUT} segundos. El documento es muy extenso o el servidor está muy ocupado. Por favor, intente nuevamente en unos momentos."
                )
            else:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Error al comunicarse con el servicio de IA: {str(ai_error)}. Por favor, intente nuevamente."
                )
        
        if not cover_letter_markdown or len(cover_letter_markdown.strip()) == 0:
            error_msg = "La IA generó un Cover Letter vacío"
            log_repo.create_log(document_id, "cover_letter_error", error_msg)
            raise HTTPException(
                status_code=500, 
                detail="Error al generar el Cover Letter. El contenido generado está vacío."
            )
        
        # Generar nombre de archivo (solo para referencia, no se guarda físicamente)
        cover_letter_filename = f"cover_letter_{document_id}_{uuid.uuid4().hex[:8]}.docx"
        
        # Actualizar base de datos con el Cover Letter
        doc_repo.update_cover_letter_content(
            document_id,
            cover_letter_markdown,
            cover_letter_filename
        )
        
        # Crear log
        log_repo.create_log(
            document_id=document_id,
            action="cover_letter_complete",
            details=f"Cover Letter generado: {cover_letter_filename}"
        )
        
        return CoverLetterGenerateResponse(
            success=True,
            message="Cover Letter generado exitosamente",
            document_id=document_id,
            cover_letter_markdown=cover_letter_markdown,
            cover_letter_filename=cover_letter_filename,
            download_url=f"/api/download-cover-letter/{document_id}"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        # Capturar cualquier otro error no manejado
        error_msg = f"Error inesperado: {str(e)}"
        try:
            log_repo.create_log(document_id, "cover_letter_error", error_msg)
        except:
            pass
        
        raise HTTPException(
            status_code=500, 
            detail=f"Error al generar Cover Letter. Por favor, intente nuevamente."
        )


@app.get("/api/download-cover-letter/{document_id}")
async def download_cover_letter(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Descarga el Cover Letter generado (generado on-the-fly en memoria)
    
    Args:
        document_id: ID del documento
        db: Sesión de base de datos
    
    Returns:
        Response con el archivo DOCX del Cover Letter generado en memoria
    """
    doc_repo = DocumentRepository(db)
    document = doc_repo.get_document(document_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    if not document.cover_letter_markdown:
        raise HTTPException(status_code=400, detail="Cover Letter no generado aún")
    
    # Generar DOCX en memoria
    try:
        docx_binary = convert_md_text_to_docx_binary(document.cover_letter_markdown)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error al generar archivo DOCX del Cover Letter: {str(e)}"
        )
    
    return Response(
        content=docx_binary,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename=cover_letter.docx"
        }
    )


@app.post("/api/download-edited/{document_id}/{document_type}")
async def download_edited_document(
    document_id: int,
    document_type: str,
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Descarga un documento con contenido editado por el usuario
    
    Args:
        document_id: ID del documento
        document_type: Tipo de documento ('declaration' o 'cover')
        request: Diccionario con el contenido editado
        db: Sesión de base de datos
    
    Returns:
        Response con el archivo DOCX generado con el contenido editado
    """
    # Obtener contenido editado del request
    edited_content = request.get('content')
    
    if not edited_content:
        raise HTTPException(status_code=400, detail="Contenido editado no proporcionado")
    
    # Generar DOCX en memoria con el contenido editado
    try:
        docx_binary = convert_md_text_to_docx_binary(edited_content)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error al generar archivo DOCX editado: {str(e)}"
        )
    
    # Determinar nombre de archivo
    filename = f"{document_type}_{document_id}_edited.docx"
    
    return Response(
        content=docx_binary,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@app.get("/api/preview-cover-letter/{document_id}")
async def preview_cover_letter(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtiene la vista previa del Cover Letter (contenido Markdown)
    
    Args:
        document_id: ID del documento
        db: Sesión de base de datos
    
    Returns:
        JSON con el contenido Markdown del Cover Letter
    """
    doc_repo = DocumentRepository(db)
    document = doc_repo.get_document(document_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    if not document.cover_letter_markdown:
        raise HTTPException(status_code=400, detail="Cover Letter no generado aún")
    
    return JSONResponse(content={
        "success": True,
        "document_id": document_id,
        "cover_letter_markdown": document.cover_letter_markdown,
        "cover_letter_filename": document.cover_letter_filename
    })


# ==================== CHAT CON MEMORIA ====================

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_ai(
    chat_message: ChatMessage,
    db: Session = Depends(get_db)
):
    """
    Endpoint de chat con IA y memoria para modificar documentos
    
    Args:
        chat_message: Mensaje del usuario con contexto del documento
        db: Sesión de base de datos
    
    Returns:
        Respuesta del chat con posibles modificaciones
    """
    if not chat_system:
        raise HTTPException(
            status_code=503, 
            detail="Sistema de chat no disponible. Verifique las API keys."
        )
    
    try:
        # Obtener el documento
        doc_repo = DocumentRepository(db)
        document = doc_repo.get_document(chat_message.document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Documento no encontrado")
        
        # Obtener el contenido del documento según el tipo
        if chat_message.document_type == "declaration":
            document_content = document.markdown_content
        elif chat_message.document_type == "cover":
            document_content = document.cover_letter_markdown
        else:
            raise HTTPException(status_code=400, detail="Tipo de documento inválido")
        
        if not document_content:
            raise HTTPException(
                status_code=400, 
                detail=f"{chat_message.document_type.title()} Letter no generado aún"
            )
        
        # Generar ID de usuario único (puede ser una sesión o user ID real)
        user_id = chat_message.user_id or f"user_{chat_message.document_id}"
        
        # Generar respuesta del chat
        response = chat_system.chat(
            user_message=chat_message.message,
            user_id=user_id,
            document_content=document_content,
            document_type=chat_message.document_type,
            save_to_memory=True
        )
        
        # Verificar si la respuesta contiene texto modificado
        has_modification = "MODIFIED_TEXT:" in response
        modified_text = None
        
        if has_modification:
            # Extraer el texto modificado
            parts = response.split("MODIFIED_TEXT:", 1)  # Solo dividir en la primera ocurrencia
            if len(parts) > 1:
                # Tomar el texto después de "MODIFIED_TEXT:"
                modified_text = parts[1].strip()
                
                # Limpiar bloques de código markdown si los hay
                if modified_text.startswith("```"):
                    # Quitar bloques de código markdown
                    lines = modified_text.split("\n")
                    # Remover primera línea (```)
                    if lines[0].strip().startswith("```"):
                        lines = lines[1:]
                    # Remover última línea si es ```
                    if lines and lines[-1].strip() == "```":
                        lines = lines[:-1]
                    modified_text = "\n".join(lines)
                
                # Limpiar espacios en blanco al inicio/final pero preservar estructura interna
                modified_text = modified_text.strip()
        
        return ChatResponse(
            success=True,
            message="Respuesta generada exitosamente",
            response=response,
            has_modification=has_modification,
            modified_text=modified_text
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error en chat: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error al procesar el mensaje: {str(e)}"
        )


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
            # Obtener el documento
            doc_repo = DocumentRepository(db)
            document = doc_repo.get_document(chat_message.document_id)
            
            if not document:
                yield f"data: {json.dumps({'type': 'error', 'error': 'Documento no encontrado'})}\n\n"
                return
            
            # Obtener el contenido del documento según el tipo
            if chat_message.document_type == "declaration":
                document_content = document.markdown_content
            elif chat_message.document_type == "cover":
                document_content = document.cover_letter_markdown
            else:
                yield f"data: {json.dumps({'type': 'error', 'error': 'Tipo de documento inválido'})}\n\n"
                return
            
            if not document_content:
                yield f"data: {json.dumps({'type': 'error', 'error': f'{chat_message.document_type.title()} Letter no generado aún'})}\n\n"
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
            
            # Verificar si la respuesta contiene texto modificado
            has_modification = "MODIFIED_TEXT:" in full_response
            modified_text = None
            
            if has_modification:
                # Extraer el texto modificado
                parts = full_response.split("MODIFIED_TEXT:", 1)
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
            
            # Guardar en memoria después de completar
            chat_system.save_conversation(user_id, chat_message.message, full_response)
            
            # Enviar evento de completado con información de modificación
            yield f"data: {json.dumps({'type': 'complete', 'has_modification': has_modification, 'modified_text': modified_text})}\n\n"
            
        except Exception as e:
            error_msg = f"Error inesperado: {str(e)}"
            print(f"Error en chat stream: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
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
        print(f"Error limpiando memoria: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al limpiar memoria: {str(e)}"
        )


# ==================== INICIO DE LA APLICACIÓN ====================

if __name__ == "__main__":
    import uvicorn
    
    # Use 0.0.0.0 for production compatibility
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    print("\n" + "="*60)
    print("DeclarationLetterOnline - Sistema de Automatización")
    print("="*60)
    print(f"Servidor: http://{host}:{port}")
    print(f"Documentación API: http://{host}:{port}/docs")
    print("="*60 + "\n")
    
    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=os.getenv("DEBUG_MODE", "False") == "True"
    )
