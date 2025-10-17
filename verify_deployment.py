#!/usr/bin/env python3
"""
Script de verificación de deployment en Render
Ejecuta después del deployment para verificar que todo funciona correctamente
"""

import sys
import json
try:
    import requests
except ImportError:
    print("⚠️  Instala requests: pip install requests")
    sys.exit(1)

def test_endpoint(url, description, expected_status=200):
    """Prueba un endpoint y reporta el resultado"""
    try:
        print(f"🔍 Probando: {description}")
        print(f"   URL: {url}")
        
        response = requests.get(url, timeout=30)
        
        if response.status_code == expected_status:
            print(f"   ✅ OK - Status {response.status_code}")
            return True
        else:
            print(f"   ❌ ERROR - Status {response.status_code}")
            print(f"   Respuesta: {response.text[:200]}")
            return False
    except requests.exceptions.Timeout:
        print(f"   ❌ TIMEOUT - El servidor no respondió en 30 segundos")
        return False
    except requests.exceptions.ConnectionError:
        print(f"   ❌ CONNECTION ERROR - No se pudo conectar al servidor")
        return False
    except Exception as e:
        print(f"   ❌ ERROR - {e}")
        return False

def main():
    """Función principal"""
    print("\n" + "="*70)
    print("  VERIFICACIÓN DE DEPLOYMENT EN RENDER")
    print("="*70 + "\n")
    
    # Solicitar URL base
    base_url = input("Ingresa la URL de tu app en Render (ej: https://tu-app.onrender.com): ").strip()
    
    if not base_url.startswith("http"):
        base_url = f"https://{base_url}"
    
    base_url = base_url.rstrip("/")
    
    print(f"\n📍 URL base: {base_url}\n")
    print("-" * 70 + "\n")
    
    # Lista de pruebas
    tests = [
        (f"{base_url}/health", "Health Check (backend activo)", 200),
        (f"{base_url}/", "Frontend (index.html)", 200),
        (f"{base_url}/docs", "API Documentation (Swagger UI)", 200),
    ]
    
    results = []
    for url, description, status in tests:
        result = test_endpoint(url, description, status)
        results.append(result)
        print()
    
    # Resumen
    print("-" * 70)
    print("\n📊 RESUMEN:")
    total = len(results)
    passed = sum(results)
    failed = total - passed
    
    print(f"   Total: {total} pruebas")
    print(f"   ✅ Exitosas: {passed}")
    print(f"   ❌ Fallidas: {failed}\n")
    
    if passed == total:
        print("🎉 ¡ÉXITO! Tu aplicación está funcionando correctamente en Render.")
        print(f"\n🌐 Accede a tu aplicación en: {base_url}")
        print(f"📚 Documentación API: {base_url}/docs\n")
        return 0
    else:
        print("⚠️  Algunas pruebas fallaron. Revisa los logs en Render Dashboard.")
        print("\n🔧 Pasos de troubleshooting:")
        print("   1. Ve a Render Dashboard → Logs")
        print("   2. Busca errores con 'ERROR' o 'FAILED'")
        print("   3. Verifica que GEMINI_API_KEY esté configurada")
        print("   4. Verifica que el disco persistente esté montado\n")
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n👋 Verificación cancelada.")
        sys.exit(1)


