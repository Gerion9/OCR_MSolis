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
    print("\n" + "="*70)
    print("  DeclarationLetterOnline - Sistema de Automatización de Declaraciones")
    print("="*70)
    print("\n📋 Iniciando servidor...\n")
    
    # Cargar variables de entorno SOLO en desarrollo local (no en Render)
    from dotenv import load_dotenv
    is_render = os.getenv("RENDER", "false").lower() == "true"
    if not is_render:
        load_dotenv()
        print("📝 Cargando variables de entorno desde .env (modo local)")
    else:
        print("☁️  Usando variables de entorno de Render")
    
    # Verificar configuración
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key == "tu_api_key_aqui":
        print("⚠️  ADVERTENCIA: API key de Gemini no configurada")
        print("   Edita el archivo .env y agrega tu API key de Gemini")
        print("   Obténla en: https://makersuite.google.com/app/apikey\n")
    
    # Render requires binding to 0.0.0.0 for public access
    # CRITICAL: Always use 0.0.0.0 on Render, ignore HOST env var
    if is_render:
        host = "0.0.0.0"
        debug = False
        print("🚀 Modo producción detectado (Render)")
        print(f"🔧 Forzando binding a 0.0.0.0 para acceso público")
    else:
        host = os.getenv("HOST", "0.0.0.0")
        debug = os.getenv("DEBUG_MODE", "False") == "True"
    
    port = int(os.getenv("PORT", "8000"))
    
    print(f"🌐 Host: {host}")
    print(f"🔌 Puerto: {port}")
    print(f"📚 Documentación API: http://{host}:{port}/docs")
    print(f"🐛 Modo debug: {'Activado' if debug else 'Desactivado'}")
    print("\n💡 Presiona Ctrl+C para detener el servidor\n")
    print("="*70 + "\n")
    
    # DEBUG: Confirm values before starting uvicorn
    print(f"🔍 DEBUG: host='{host}', port={port}, reload={debug}")
    print(f"🔍 DEBUG: RENDER env var = '{os.getenv('RENDER', 'NOT SET')}'")
    print(f"🔍 DEBUG: Starting uvicorn with host={host}\n")
    
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
        print("\n\n👋 Servidor detenido. ¡Hasta luego!")
    except Exception as e:
        print(f"\n❌ Error al iniciar el servidor: {e}")
        sys.exit(1)


