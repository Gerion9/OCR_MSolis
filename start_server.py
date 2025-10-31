"""
Script de inicio rápido para DeclarationLetterOnline
Ejecuta el servidor FastAPI
"""

import os
import sys
from pathlib import Path

# Añadir el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent))

def main():
    """
    Inicia el servidor FastAPI
    """
    print("Automation System for Declaration Letters and Cover Letters")
    print("\nStarting server...\n")
    
    # Cargar variables de entorno SOLO en desarrollo local (no en Render)
    from dotenv import load_dotenv
    is_render = os.getenv("RENDER", "false").lower() == "true"
    if not is_render:
        load_dotenv()
    
    # Verificar configuración
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        print("ADVERTENCIA: API key de Gemini no configurada")
    
    # Render requires binding to 0.0.0.0 for public access
    # Reference: https://render.com/docs/web-services#port-binding
    # CRITICAL: Always use 0.0.0.0 on Render, ignore HOST env var
    if is_render:
        host = "0.0.0.0"
        debug = False
        print("Modo produccion detectado (Render)")
        print(f"Forzando binding a 0.0.0.0 para acceso publico")
    else:
        host = os.getenv("HOST", "0.0.0.0")
        debug = os.getenv("DEBUG_MODE", "False") == "True"
    
    # Render sets PORT automatically (default: 10000)
    # We fallback to 8000 for local development
    port = int(os.getenv("PORT", "8000"))
    
    # Iniciar servidor
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=debug,
        timeout_keep_alive=300,  # 5 minutos para mantener conexiones vivas
        limit_concurrency=100,
        backlog=100
    )

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nServidor detenido.")
    except Exception as e:
        print(f"\nError al iniciar el servidor: {e}")
        sys.exit(1)
