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
    
    # Cargar variables de entorno
    from dotenv import load_dotenv
    load_dotenv()
    
    # Verificar configuración
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key == "tu_api_key_aqui":
        print("⚠️  ADVERTENCIA: API key de Gemini no configurada")
        print("   Edita el archivo .env y agrega tu API key de Gemini")
        print("   Obténla en: https://makersuite.google.com/app/apikey\n")
    
    host = os.getenv("HOST", "localhost")
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG_MODE", "True") == "True"
    
    print(f"🌐 Servidor: http://{host}:{port}")
    print(f"📚 Documentación API: http://{host}:{port}/docs")
    print(f"🔧 Modo debug: {'Activado' if debug else 'Desactivado'}")
    print("\n💡 Presiona Ctrl+C para detener el servidor\n")
    print("="*70 + "\n")
    
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


