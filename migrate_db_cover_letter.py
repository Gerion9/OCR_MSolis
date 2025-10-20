"""
Script de migración de base de datos para agregar campos de Cover Letter
Ejecutar este script para actualizar la base de datos existente
"""

import sqlite3
from pathlib import Path

def migrate_database():
    """Agrega columnas de Cover Letter a la tabla documents"""
    
    # Ruta a la base de datos
    db_path = Path(__file__).parent / "declaration_letters.db"
    
    if not db_path.exists():
        print("❌ Base de datos no encontrada. El sistema creará una nueva automáticamente.")
        return False
    
    try:
        # Conectar a la base de datos
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Verificar si las columnas ya existen
        cursor.execute("PRAGMA table_info(documents)")
        columns = [column[1] for column in cursor.fetchall()]
        
        changes_made = False
        
        # Agregar columna cover_letter_markdown si no existe
        if 'cover_letter_markdown' not in columns:
            print("Agregando columna cover_letter_markdown...")
            cursor.execute("ALTER TABLE documents ADD COLUMN cover_letter_markdown TEXT")
            changes_made = True
        else:
            print("✓ Columna cover_letter_markdown ya existe")
        
        # Agregar columna cover_letter_filename si no existe
        if 'cover_letter_filename' not in columns:
            print("Agregando columna cover_letter_filename...")
            cursor.execute("ALTER TABLE documents ADD COLUMN cover_letter_filename VARCHAR(255)")
            changes_made = True
        else:
            print("✓ Columna cover_letter_filename ya existe")
        
        # Agregar columna cover_letter_generated_date si no existe
        if 'cover_letter_generated_date' not in columns:
            print("Agregando columna cover_letter_generated_date...")
            cursor.execute("ALTER TABLE documents ADD COLUMN cover_letter_generated_date DATETIME")
            changes_made = True
        else:
            print("✓ Columna cover_letter_generated_date ya existe")
        
        # Confirmar cambios
        if changes_made:
            conn.commit()
            print("\n✅ Migración completada exitosamente")
            print("La base de datos ha sido actualizada con soporte para Cover Letters")
        else:
            print("\n✅ La base de datos ya está actualizada")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")
        return False

if __name__ == "__main__":
    print("="*60)
    print("MIGRACIÓN DE BASE DE DATOS - COVER LETTER SUPPORT")
    print("="*60)
    print()
    
    success = migrate_database()
    
    if success:
        print("\n✅ Puede continuar usando el sistema normalmente")
        print("Los Cover Letters ahora pueden ser generados y almacenados")
    else:
        print("\n⚠ Si la base de datos no existe, será creada automáticamente al iniciar el servidor")
    
    print("="*60)