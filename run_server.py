#!/usr/bin/env python
"""
Script de inicio para DeclarationLetterOnline
Ejecutar desde el directorio raíz del proyecto: python run_server.py
"""

import sys
import os
from pathlib import Path

# Agregar el directorio actual al path de Python
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Cargar variables de entorno
from dotenv import load_dotenv
load_dotenv()

# Ahora podemos importar y ejecutar la aplicación
if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    print("\n" + "="*70)
    print("🚀 DeclarationLetterOnline - Sistema de Automatización")
    print("="*70)
    print(f"✅ Servidor iniciado en: http://{host}:{port}")
    print(f"📚 Documentación API: http://{host}:{port}/docs")
    print(f"🌐 Interfaz Web: http://localhost:{port}")
    print("="*70)
    print("💡 Presiona Ctrl+C para detener el servidor")
    print("="*70 + "\n")
    
    try:
        uvicorn.run(
            "backend.main:app",
            host=host,
            port=port,
            reload=os.getenv("DEBUG_MODE", "False") == "True",
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n\n👋 Servidor detenido. ¡Hasta luego!")


