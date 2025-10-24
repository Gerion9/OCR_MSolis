"""
Script de inicialización de la base de datos
Crea las tablas necesarias para DeclarationLetterOnline
"""

import sys
from pathlib import Path

# Añadir el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent))

from backend.database import init_database
from backend.models import Base
import os
from dotenv import load_dotenv

def main():
    """
    Función principal para inicializar la base de datos
    """
    print("\n" + "="*60)
    print("INICIALIZACIÓN DE BASE DE DATOS - DeclarationLetterOnline")
    print("="*60 + "\n")
    
    # Cargar variables de entorno
    load_dotenv()
    
    # Obtener URL de la base de datos
    database_url = os.getenv("DATABASE_URL", "sqlite:///./declaration_letters.db")
    print(f"Base de datos: {database_url}")
    
    try:
        # Inicializar base de datos
        print("\nCreando tablas...")
        db_manager = init_database(database_url)
        
        print("\nBase de datos inicializada exitosamente")
        print("\nTablas creadas:")
        print("  - documents: Almacena información de documentos subidos")
        print("  - processing_logs: Registra el historial de procesamiento")
        
        print("\n" + "="*60)
        print("Listo! Puedes iniciar la aplicacion ahora.")
        print("="*60 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\nError al inicializar la base de datos: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
