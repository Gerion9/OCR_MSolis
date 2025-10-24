"""
Script para actualizar las dependencias del proyecto
Especialmente la biblioteca google-generativeai para soporte de timeout mejorado
"""

import subprocess
import sys

def update_dependencies():
    """Actualiza las dependencias del proyecto"""
    print("="*70)
    print("  Actualizando Dependencias - DeclarationLetterOnline")
    print("="*70)
    print("\nActualizando paquetes...\n")
    
    try:
        # Actualizar pip primero
        print("Actualizando pip...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
        
        # Instalar/actualizar dependencias desde requirements.txt
        print("\nInstalando dependencias desde requirements.txt...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt", "--upgrade"])
        
        print("\n" + "="*70)
        print("Dependencias actualizadas exitosamente")
        print("="*70)
        print("\nAhora puedes ejecutar: python start_server.py\n")
        
    except subprocess.CalledProcessError as e:
        print(f"\nError al actualizar dependencias: {e}")
        print("\nIntenta ejecutar manualmente:")
        print("  pip install -r requirements.txt --upgrade")
        sys.exit(1)
    except Exception as e:
        print(f"\nError inesperado: {e}")
        sys.exit(1)

if __name__ == "__main__":
    update_dependencies()
