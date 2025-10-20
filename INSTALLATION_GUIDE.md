# 📋 Guía de Instalación Detallada - DeclarationLetterOnline

## 🎯 Antes de Comenzar

Esta guía te llevará paso a paso a través de la instalación y configuración completa del sistema. No necesitas experiencia técnica avanzada, solo sigue las instrucciones cuidadosamente.

**Tiempo estimado**: 15-20 minutos

---

## 📦 PASO 1: Instalar Python

### Windows

1. **Descargar Python**
   - Ir a: [https://www.python.org/downloads/](https://www.python.org/downloads/)
   - Hacer clic en el botón amarillo "Download Python 3.x.x"
   - Guardar el instalador

2. **Instalar Python**
   - Ejecutar el archivo descargado
   - ⚠️ **MUY IMPORTANTE**: Marcar la casilla "Add Python to PATH"
   - Hacer clic en "Install Now"
   - Esperar a que termine la instalación
   - Hacer clic en "Close"

3. **Verificar Instalación**
   - Abrir "Símbolo del sistema" (CMD)
     - Presionar `Windows + R`
     - Escribir `cmd`
     - Presionar Enter
   - Escribir: `python --version`
   - Deberías ver algo como: `Python 3.11.5`

### macOS

1. **Descargar Python**
   - Ir a: [https://www.python.org/downloads/](https://www.python.org/downloads/)
   - Descargar el instalador para macOS

2. **Instalar Python**
   - Abrir el archivo .pkg descargado
   - Seguir el asistente de instalación
   - Completar la instalación

3. **Verificar Instalación**
   - Abrir "Terminal"
   - Escribir: `python3 --version`

### Linux (Ubuntu/Debian)

```bash
# Actualizar sistema
sudo apt update

# Instalar Python 3
sudo apt install python3 python3-pip

# Verificar instalación
python3 --version
```

---

## 📂 PASO 2: Preparar el Proyecto

### Opción A: Si ya tienes la carpeta del proyecto

El proyecto ya está ubicado en:
```
C:\Users\Usuario general\OneDrive - Abogados Manuel Solis\NOVA\WebPage_DeclarationLetter
```

Solo necesitas navegar a esa carpeta.

### Opción B: Si necesitas copiar el proyecto

1. Copiar la carpeta completa del proyecto a una ubicación accesible
2. Asegurarse de que todos los archivos están presentes

---

## 💻 PASO 3: Abrir la Terminal en el Proyecto

### Windows

**Método 1 (Recomendado)**:
1. Abrir el Explorador de Windows
2. Navegar a la carpeta del proyecto
3. Hacer clic en la barra de direcciones
4. Escribir `cmd` y presionar Enter
5. Se abrirá el Símbolo del sistema en esa ubicación

**Método 2**:
1. Presionar `Windows + R`
2. Escribir: `cmd`
3. Presionar Enter
4. Escribir:
   ```bash
   cd "C:\Users\Usuario general\OneDrive - Abogados Manuel Solis\NOVA\WebPage_DeclarationLetter"
   ```

### macOS/Linux

1. Abrir Terminal
2. Escribir:
   ```bash
   cd /ruta/a/WebPage_DeclarationLetter
   ```

---

## 🔧 PASO 4: Crear Entorno Virtual (Opcional pero Recomendado)

Un entorno virtual mantiene las dependencias del proyecto organizadas y separadas.

### Windows

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
venv\Scripts\activate
```

Verás `(venv)` al inicio de la línea cuando esté activado.

### macOS/Linux

```bash
# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate
```

---

## 📥 PASO 5: Instalar Dependencias

Con la terminal abierta en la carpeta del proyecto:

```bash
pip install -r requirements.txt
```

**Esto instalará**:
- FastAPI (framework web)
- Uvicorn (servidor)
- SQLAlchemy (base de datos)
- Google Gemini AI (inteligencia artificial)
- Y otras 10 dependencias más

**Tiempo estimado**: 2-5 minutos (dependiendo de tu conexión a Internet)

### Si hay errores

Si ves errores relacionados con "pip", intenta:

```bash
# Windows
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# macOS/Linux
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
```

---

## 🔑 PASO 6: Obtener API Key de Google Gemini

### 6.1 Crear/Acceder a Cuenta de Google

1. Necesitas una cuenta de Google (Gmail)
2. Si no tienes una, créala en [accounts.google.com](https://accounts.google.com)

### 6.2 Obtener API Key

1. **Ir a Google AI Studio**
   - Abrir: [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
   
2. **Iniciar Sesión**
   - Usar tu cuenta de Google
   
3. **Crear API Key**
   - Hacer clic en "Create API Key"
   - Seleccionar un proyecto existente o crear uno nuevo
   - Hacer clic en "Create API key in new project" (si es nuevo)
   
4. **Copiar la API Key**
   - Verás algo como: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX`
   - Hacer clic en el botón de copiar
   - **⚠️ IMPORTANTE**: Guardar esta clave en un lugar seguro

### 6.3 Notas sobre la API

- **Gratis**: Google Gemini ofrece un nivel gratuito generoso
- **Límites**: ~60 solicitudes por minuto (más que suficiente)
- **Privacidad**: Tus datos se procesan según las políticas de Google

---

## ⚙️ PASO 7: Configurar Variables de Entorno

### 7.1 Crear Archivo .env

#### Windows

```bash
# En el Símbolo del sistema, en la carpeta del proyecto:
copy env.example .env
```

#### macOS/Linux

```bash
cp env.example .env
```

### 7.2 Editar Archivo .env

1. **Abrir el archivo .env** con un editor de texto:
   - Notepad (Windows)
   - TextEdit (macOS)
   - nano (Linux): `nano .env`

2. **Encontrar esta línea**:
   ```
   GEMINI_API_KEY=tu_api_key_aqui
   ```

3. **Reemplazar** `tu_api_key_aqui` con tu API key real:
   ```
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

4. **Guardar el archivo**:
   - Notepad: Archivo → Guardar
   - nano: `Ctrl + O`, Enter, `Ctrl + X`

### 7.3 Otras Configuraciones (Opcional)

Puedes modificar otras variables si lo deseas:

```env
# Cambiar puerto si 8000 está ocupado
PORT=8001

# Aumentar límite de tamaño de archivo
MAX_FILE_SIZE_MB=20

# Cambiar modelo de IA (si hay uno nuevo)
GEMINI_MODEL=gemini-1.5-pro
```

---

## 🗄️ PASO 8: Inicializar Base de Datos

Con la terminal abierta en la carpeta del proyecto:

```bash
python init_db.py
```

**Deberías ver**:
```
============================================================
INICIALIZACIÓN DE BASE DE DATOS - DeclarationLetterOnline
============================================================

📦 Base de datos: sqlite:///./declaration_letters.db

🔧 Creando tablas...

✓ Base de datos inicializada exitosamente

Tablas creadas:
  - documents: Almacena información de documentos subidos
  - processing_logs: Registra el historial de procesamiento

============================================================
¡Listo! Puedes iniciar la aplicación ahora.
============================================================
```

### Si hay errores

- Verificar que tienes permisos de escritura en la carpeta
- Intentar ejecutar el comando como administrador (Windows) o con `sudo` (macOS/Linux)

---

## 🚀 PASO 9: Iniciar el Servidor

### Método Simple

```bash
python start_server.py
```

**Deberías ver**:
```
======================================================================
  DeclarationLetterOnline - Sistema de Automatización de Declaraciones
======================================================================

📋 Iniciando servidor...

🌐 Servidor: http://localhost:8000
📚 Documentación API: http://localhost:8000/docs
🔧 Modo debug: Activado

💡 Presiona Ctrl+C para detener el servidor

======================================================================

INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://localhost:8000 (Press CTRL+C to quit)
```

### Método Alternativo

```bash
python -m uvicorn backend.main:app --reload --host localhost --port 8000
```

### Verificar que Funciona

1. El servidor debe estar corriendo (no cierres la terminal)
2. Deberías ver mensajes de inicio sin errores
3. La última línea debe decir algo como "Uvicorn running on..."

---

## 🌐 PASO 10: Acceder a la Aplicación

### 10.1 Abrir Navegador

1. Abrir tu navegador favorito (Chrome, Firefox, Edge, Safari)
2. Ir a: [http://localhost:8000](http://localhost:8000)

### 10.2 Verificar la Interfaz

Deberías ver:
- ✅ Encabezado azul con logo
- ✅ Caja de advertencia amarilla
- ✅ Área para subir archivos
- ✅ Diseño limpio y profesional

### 10.3 Probar Funcionalidad Básica

1. **Verificar Health Check**
   - Ir a: [http://localhost:8000/health](http://localhost:8000/health)
   - Deberías ver un JSON con `"status": "healthy"`

2. **Ver Documentación API**
   - Ir a: [http://localhost:8000/docs](http://localhost:8000/docs)
   - Deberías ver la interfaz Swagger con todos los endpoints

---

## 🧪 PASO 11: Probar el Sistema

### 11.1 Preparar un Archivo de Prueba

Necesitas un archivo de cuestionario para probar. Puede ser:
- Un documento DOCX con texto
- Un archivo PDF con texto
- Un archivo TXT simple

### 11.2 Subir y Generar

1. **Arrastrar el archivo** al área designada
   - O hacer clic en "Seleccionar Archivo"

2. **Hacer clic en** "Generar Declaration Letter"

3. **Esperar** (30-60 segundos)
   - Verás un spinner de carga

4. **Ver el resultado**
   - Aparecerá la vista previa del documento
   - Tres botones: Descargar, Regenerar, Nuevo Documento

5. **Descargar el documento**
   - Hacer clic en "Descargar Documento"
   - Se descargará un archivo .docx

### 11.3 Verificar el Documento

1. Abrir el archivo .docx descargado
2. Verificar que tenga:
   - Título en formato correcto
   - Secciones numeradas
   - Contenido coherente
   - Formato Century Schoolbook

---

## ✅ PASO 12: Verificación Final

### Checklist de Instalación

- [ ] Python instalado y verificado
- [ ] Dependencias instaladas (`requirements.txt`)
- [ ] API key de Gemini obtenida
- [ ] Archivo `.env` configurado con API key
- [ ] Base de datos inicializada
- [ ] Servidor inicia sin errores
- [ ] Interfaz web accesible en navegador
- [ ] Health check responde correctamente
- [ ] Subida de archivos funciona
- [ ] Generación de documentos funciona
- [ ] Descarga de documentos funciona

Si todos los ítems están marcados: **¡Felicitaciones! La instalación está completa.** 🎉

---

## 🔧 Solución de Problemas Comunes

### Problema 1: "Python no reconocido"

**Error**: `'python' is not recognized as an internal or external command`

**Solución**:
1. Python no está en PATH
2. Reinstalar Python marcando "Add Python to PATH"
3. O usar la ruta completa: `C:\Python3x\python.exe`

### Problema 2: "pip install falla"

**Error**: Errores al instalar paquetes

**Solución**:
```bash
# Actualizar pip primero
python -m pip install --upgrade pip

# Intentar de nuevo
pip install -r requirements.txt

# Si sigue fallando, instalar uno por uno
pip install fastapi
pip install uvicorn
# etc.
```

### Problema 3: "API key no configurada"

**Error**: Advertencia sobre API key al iniciar

**Solución**:
1. Verificar que el archivo `.env` existe (no `env.example`)
2. Abrir `.env` y verificar que la API key esté correcta
3. No debe tener espacios extra
4. Guardar el archivo
5. Reiniciar el servidor

### Problema 4: "Puerto 8000 en uso"

**Error**: `Address already in use`

**Solución**:
```bash
# Usar otro puerto
python -m uvicorn backend.main:app --port 8001
```

O editar `.env`:
```
PORT=8001
```

### Problema 5: "Archivo no se procesa"

**Error**: Error al generar documento

**Solución**:
1. Verificar que la API key de Gemini es válida
2. Verificar conexión a Internet
3. Intentar con un archivo más pequeño
4. Ver los logs del servidor en la terminal

### Problema 6: "Base de datos bloqueada"

**Error**: `database is locked`

**Solución**:
```bash
# Cerrar el servidor (Ctrl+C)
# Eliminar el archivo de BD
del declaration_letters.db  # Windows
rm declaration_letters.db   # macOS/Linux

# Reinicializar
python init_db.py

# Iniciar de nuevo
python start_server.py
```

---

## 📞 Obtener Más Ayuda

### Recursos Disponibles

1. **README.md** - Manual completo del programador
2. **QUICK_START.md** - Guía de inicio rápido
3. **PROJECT_SUMMARY.md** - Resumen del proyecto

### Logs y Depuración

Para ver más detalles de lo que sucede:

```bash
# Iniciar con logs detallados
python -m uvicorn backend.main:app --log-level debug
```

Los errores aparecerán en la terminal donde se ejecuta el servidor.

---

## 🎯 Próximos Pasos

Después de la instalación exitosa:

1. **Personalizar la Interfaz**
   - Editar `frontend/index.html` para cambiar textos
   - Agregar el logo de tu firma
   - Actualizar información del encabezado

2. **Ajustar Configuración de IA**
   - Modificar `DeclarationLetter/SystemPrompt.xml` según necesidades
   - Ajustar `DeclarationLetter/Declaration.xml` para tu caso de uso

3. **Capacitar al Personal**
   - Mostrar cómo subir archivos
   - Explicar cómo descargar documentos
   - Enfatizar revisión manual de documentos

4. **Establecer Flujo de Trabajo**
   - Definir quién sube los cuestionarios
   - Establecer proceso de revisión
   - Configurar backup de documentos

---

## 🎉 ¡Instalación Completa!

Si llegaste hasta aquí sin problemas, el sistema está completamente funcional y listo para usar.

**Recuerda**:
- El servidor debe estar corriendo para usar la aplicación
- Los documentos generados son borradores que requieren revisión
- Hacer backups periódicos de la base de datos

**¡Disfruta automatizando la redacción de Declaration Letters!** 🚀

---

**Última actualización**: Octubre 2025  
**Versión de esta guía**: 1.0.0


