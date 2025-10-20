# DeclarationLetterOnline - Manual del Programador

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Requisitos del Sistema](#requisitos-del-sistema)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Instalación y Configuración](#instalación-y-configuración)
5. [Estructura del Proyecto](#estructura-del-proyecto)
6. [Configuración de la API de Gemini](#configuración-de-la-api-de-gemini)
7. [Ejecutar la Aplicación](#ejecutar-la-aplicación)
8. [Uso de la Aplicación](#uso-de-la-aplicación)
9. [API Endpoints](#api-endpoints)
10. [Base de Datos](#base-de-datos)
11. [Procesamiento de IA](#procesamiento-de-ia)
12. [Personalización](#personalización)
13. [Solución de Problemas](#solución-de-problemas)
14. [Mantenimiento](#mantenimiento)
15. [Glosario Técnico](#glosario-técnico)

---

## 📖 Descripción General

**DeclarationLetterOnline** es una aplicación web desarrollada para automatizar la redacción de Declaration Letters para peticiones de visa T (T-Visa). El sistema utiliza Inteligencia Artificial (Google Gemini) para procesar cuestionarios de afectados y generar documentos legales profesionales en formato DOCX.

### Características Principales

- ✅ Interfaz web intuitiva de una sola página
- ✅ Subida de archivos mediante drag & drop
- ✅ Procesamiento de documentos DOCX, PDF y TXT
- ✅ Generación automática de **Declaration Letters** usando IA (Google Gemini)
- ✅ Generación automática de **Cover Letters** basados en Declaration Letters
- ✅ Vista previa de ambos documentos generados
- ✅ Alternancia entre Declaration Letter y Cover Letter
- ✅ Descarga en formato DOCX
- ✅ Opción de regenerar documentos múltiples veces
- ✅ Base de datos SQLite para almacenamiento local
- ✅ Funcionamiento offline (una vez configurado)

### Tecnologías Utilizadas

- **Backend**: Python 3.8+, FastAPI, SQLAlchemy
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **IA**: Google Gemini API
- **Base de Datos**: SQLite
- **Conversión de Documentos**: Librerías estándar de Python

---

## 💻 Requisitos del Sistema

### Requisitos de Software

- **Python**: 3.8 o superior
- **pip**: Gestor de paquetes de Python
- **Navegador Web**: Chrome, Firefox, Edge o Safari (versión reciente)
- **Sistema Operativo**: Windows 10/11, macOS 10.14+, o Linux

### Requisitos de Hardware

- **RAM**: Mínimo 4GB (recomendado 8GB)
- **Espacio en Disco**: 500MB libres
- **Conexión a Internet**: Requerida para usar la API de Gemini

### APIs Externas

- **Google Gemini API**: Necesaria para el procesamiento de IA
  - Obtener API key en: [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

---

## 🏗️ Arquitectura del Sistema

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIO (Navegador)                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP/REST
                     │
┌────────────────────▼────────────────────────────────────┐
│               FRONTEND (HTML/CSS/JS)                     │
│  - index.html: Interfaz de usuario                      │
│  - styles.css: Diseño y estilos                         │
│  - script.js: Lógica del cliente                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ API REST
                     │
┌────────────────────▼────────────────────────────────────┐
│                 BACKEND (FastAPI)                        │
│  - main.py: Servidor y endpoints                        │
│  - models.py: Modelos de datos                          │
│  - database.py: Gestión de BD                           │
└──────┬─────────────┬─────────────┬─────────────────────┘
       │             │             │
       │             │             │
┌──────▼──────┐ ┌───▼────────┐ ┌─▼────────────────────┐
│  SQLite DB  │ │ AI Processor│ │ Document Converter   │
│  (Local)    │ │ (Gemini)    │ │ (MD → DOCX)          │
└─────────────┘ └─────────────┘ └──────────────────────┘
```

### Flujo de Datos

1. Usuario sube cuestionario → Frontend
2. Frontend envía archivo → Backend (API `/api/upload`)
3. Backend guarda archivo → Disco y registra en BD
4. Backend extrae texto → AI Processor
5. AI Processor consulta → Google Gemini API
6. Gemini genera markdown → AI Processor
7. Document Converter convierte MD → DOCX
8. Backend guarda DOCX → Disco
9. Frontend muestra vista previa y opción de descarga

---

## 🔧 Instalación y Configuración

### Paso 1: Clonar o Descargar el Proyecto

El proyecto ya está en:
```
C:\Users\Usuario general\OneDrive - Abogados Manuel Solis\NOVA\WebPage_DeclarationLetter
```

### Paso 2: Instalar Python

1. Descargar Python desde [python.org](https://www.python.org/downloads/)
2. Durante la instalación, marcar "Add Python to PATH"
3. Verificar instalación:
   ```bash
   python --version
   ```

### Paso 3: Crear Entorno Virtual (Recomendado)

```bash
# Navegar al directorio del proyecto
cd "C:\Users\Usuario general\OneDrive - Abogados Manuel Solis\NOVA\WebPage_DeclarationLetter"

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En macOS/Linux:
source venv/bin/activate
```

### Paso 4: Instalar Dependencias

```bash
pip install -r requirements.txt
```

### Paso 5: Configurar Variables de Entorno

1. Renombrar `env.example` a `.env`:
   ```bash
   # Windows
   copy env.example .env
   
   # macOS/Linux
   cp env.example .env
   ```

2. Editar `.env` y configurar:
   ```env
   GEMINI_API_KEY=tu_api_key_real_aqui
   DATABASE_URL=sqlite:///./declaration_letters.db
   HOST=localhost
   PORT=8000
   ```

### Paso 6: Inicializar Base de Datos

```bash
python init_db.py
```

---

## 📁 Estructura del Proyecto

```
WebPage_DeclarationLetter/
│
├── backend/                      # Código del servidor
│   ├── __init__.py              # Inicialización del paquete
│   ├── main.py                  # Aplicación FastAPI principal
│   ├── models.py                # Modelos de datos (Pydantic y SQLAlchemy)
│   ├── database.py              # Gestión de base de datos
│   ├── ai_processor.py          # Procesamiento con IA (Gemini)
│   └── document_converter.py   # Conversión MD → DOCX
│
├── frontend/                     # Interfaz de usuario
│   ├── index.html               # Página principal
│   ├── styles.css               # Estilos CSS
│   └── script.js                # Lógica JavaScript
│
├── uploads/                      # Archivos subidos (creado automáticamente)
├── generated_docs/               # Documentos generados (creado automáticamente)
│
├── DeclarationLetter/            # Archivos XML para Declaration Letters
│   ├── SystemPrompt.xml         # Instrucciones para la IA
│   ├── Declaration.xml          # Estructura del documento
│   └── README.md                # Documentación de configuración
│
├── CoverLetter/                  # Archivos XML para Cover Letters
│   ├── SystemPrompt.xml         # Instrucciones para la IA
│   ├── CoverLetterStructure.xml # Estructura y guías de redacción
│   └── README.md                # Documentación de configuración
│
├── Convert_md_to_docx.py        # Script original de conversión
│
├── .env                         # Variables de entorno (crear desde env.example)
├── env.example                  # Plantilla de variables de entorno
├── requirements.txt             # Dependencias de Python
├── init_db.py                   # Script de inicialización de BD
├── README.md                    # Este manual
│
└── declaration_letters.db       # Base de datos SQLite (se crea automáticamente)
```

---

## 🔑 Configuración de la API de Gemini

### Obtener API Key

1. Visitar [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Iniciar sesión con cuenta de Google
3. Hacer clic en "Create API Key"
4. Copiar la API key generada

### Configurar en la Aplicación

1. Abrir archivo `.env`
2. Reemplazar `tu_api_key_aqui` con tu API key real:
   ```env
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
3. Guardar el archivo

### Verificar Configuración

El sistema verificará automáticamente la API key al iniciar. Si hay problemas, verás un mensaje de advertencia en la consola.

---

## 🚀 Ejecutar la Aplicación

### Método 1: Ejecución Directa

```bash
# Activar entorno virtual (si usas uno)
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Ejecutar servidor
python -m uvicorn backend.main:app --reload --host localhost --port 8000
```

### Método 2: Script Python

```bash
python backend/main.py
```

### Acceder a la Aplicación

Una vez iniciado el servidor, abrir navegador en:
- **Aplicación**: [http://localhost:8000](http://localhost:8000)
- **Documentación API**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Detener el Servidor

Presionar `Ctrl + C` en la terminal

---

## 👤 Uso de la Aplicación

### Para Usuarios Finales

#### 1. Cargar Cuestionario

- Arrastrar archivo al área designada, o
- Hacer clic en "Seleccionar Archivo"
- Formatos soportados: DOCX, PDF, TXT
- Tamaño máximo: 10MB

#### 2. Generar Declaration Letter

- Hacer clic en "Generar Declaration Letter"
- Esperar mientras la IA procesa (30-60 segundos)
- Ver vista previa del documento

#### 3. Descargar o Regenerar

- **Descargar**: Obtener archivo DOCX
- **Regenerar**: Crear nueva versión
- **Nuevo Documento**: Comenzar de nuevo

### Consejos de Uso

- ✅ Asegurar que el cuestionario esté completo
- ✅ Archivos DOCX funcionan mejor que PDF
- ✅ Revisar el documento generado antes de usarlo
- ✅ Los documentos son borradores que requieren revisión legal

---

## 🔌 API Endpoints

### 1. Health Check

**Endpoint**: `GET /health`

**Descripción**: Verifica el estado del sistema

**Respuesta**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-15T14:30:00",
  "database": "ok",
  "ai_service": "ok"
}
```

### 2. Subir Documento

**Endpoint**: `POST /api/upload`

**Descripción**: Sube un archivo de cuestionario

**Parámetros**:
- `file` (FormData): Archivo a subir

**Respuesta**:
```json
{
  "success": true,
  "message": "Archivo subido exitosamente",
  "document_id": 1,
  "filename": "uuid-filename.docx"
}
```

### 3. Procesar Documento

**Endpoint**: `POST /api/process/{document_id}`

**Descripción**: Procesa un documento y genera la declaration letter

**Parámetros**:
- `document_id` (path): ID del documento

**Respuesta**:
```json
{
  "success": true,
  "message": "Declaration letter generada exitosamente",
  "document_id": 1,
  "markdown_content": "## DECLARATION OF...",
  "generated_filename": "declaration_letter_1_abc123.docx",
  "download_url": "/api/download/1"
}
```

### 4. Obtener Estado

**Endpoint**: `GET /api/status/{document_id}`

**Descripción**: Obtiene el estado de procesamiento

**Respuesta**:
```json
{
  "document_id": 1,
  "status": "completed",
  "filename": "cuestionario.docx",
  "upload_date": "2025-10-15T14:30:00",
  "processed_date": "2025-10-15T14:31:00",
  "error_message": null
}
```

### 5. Descargar Documento

**Endpoint**: `GET /api/download/{document_id}`

**Descripción**: Descarga el documento generado

**Respuesta**: Archivo DOCX

### 6. Vista Previa

**Endpoint**: `GET /api/preview/{document_id}`

**Descripción**: Obtiene el contenido en Markdown

**Respuesta**:
```json
{
  "success": true,
  "document_id": 1,
  "markdown_content": "## DECLARATION OF...",
  "generated_filename": "declaration_letter_1.docx"
}
```

### 7. Regenerar

**Endpoint**: `POST /api/regenerate`

**Body**:
```json
{
  "document_id": 1
}
```

**Respuesta**: Igual que `/api/process/{document_id}`

---

## 🗄️ Base de Datos

### Esquema de Tablas

#### Tabla: `documents`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | Primary key, autoincremental |
| filename | VARCHAR(255) | Nombre del archivo guardado (UUID) |
| original_filename | VARCHAR(255) | Nombre original del archivo |
| upload_date | DATETIME | Fecha y hora de subida |
| processed_date | DATETIME | Fecha y hora de procesamiento |
| status | VARCHAR(50) | Estado: uploaded, processing, completed, error |
| generated_filename | VARCHAR(255) | Nombre del archivo generado |
| markdown_content | TEXT | Contenido en Markdown |
| error_message | TEXT | Mensaje de error (si aplica) |
| file_size | INTEGER | Tamaño en bytes |
| file_type | VARCHAR(50) | Tipo MIME del archivo |

#### Tabla: `processing_logs`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | Primary key, autoincremental |
| document_id | INTEGER | ID del documento relacionado |
| action | VARCHAR(100) | Acción realizada |
| timestamp | DATETIME | Fecha y hora de la acción |
| details | TEXT | Detalles adicionales |
| success | BOOLEAN | Si la acción fue exitosa |

### Consultas Útiles

```sql
-- Ver todos los documentos
SELECT * FROM documents ORDER BY upload_date DESC;

-- Ver documentos completados
SELECT * FROM documents WHERE status = 'completed';

-- Ver logs de un documento
SELECT * FROM processing_logs WHERE document_id = 1;

-- Contar documentos por estado
SELECT status, COUNT(*) as count FROM documents GROUP BY status;
```

---

## 🤖 Procesamiento de IA

### Sistema de Prompts

El sistema utiliza dos archivos XML para configurar la IA:

#### DeclarationLetter/SystemPrompt.xml

Contiene:
- Personalidad y tono de la IA
- Reglas de formato (Markdown, numeración)
- Restricciones legales
- Directrices de escritura

#### DeclarationLetter/Declaration.xml

Contiene:
- Estructura del documento
- Secciones requeridas
- Preguntas guía para cada sección
- Plantillas de texto

### Proceso de Generación

1. **Extracción de Texto**: El sistema lee el cuestionario
2. **Construcción del Prompt**: Combina SystemPrompt + Declaration + Cuestionario
3. **Llamada a Gemini**: Envía prompt a la API
4. **Validación**: Verifica que la respuesta sea válida
5. **Conversión**: Transforma Markdown a DOCX
6. **Almacenamiento**: Guarda en base de datos y disco

### Configuración del Modelo

En `.env`:
```env
GEMINI_MODEL=gemini-1.5-pro
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=8000
```

**Parámetros**:
- `temperature`: Creatividad (0.0-1.0). Menor = más conservador
- `max_tokens`: Longitud máxima de respuesta
- `model`: Versión del modelo (gemini-1.5-pro recomendado)

---

## 🎨 Personalización

### Cambiar Colores de la Interfaz

Editar `frontend/styles.css`:

```css
:root {
    --primary-color: #2563eb;  /* Azul principal */
    --secondary-color: #10b981; /* Verde secundario */
    /* ... más colores ... */
}
```

### Modificar Formato del Documento

Editar `backend/document_converter.py`:

```python
# Variables de configuración
FUENTE = "Century Schoolbook"
TAMAÑO_TITULO = 28
TAMAÑO_TEXTO_NORMAL = 24
JUSTIFICAR_TEXTO = True
```

### Personalizar Header

Editar `frontend/index.html` sección del header para agregar logo y texto de la firma.

### Ajustar Límite de Tamaño de Archivo

En `.env`:
```env
MAX_FILE_SIZE_MB=20  # Cambiar de 10MB a 20MB
```

### Modificar Comportamiento de la IA

Editar `DeclarationLetter/SystemPrompt.xml` y `DeclarationLetter/Declaration.xml` para cambiar:
- Tono del documento
- Secciones incluidas
- Formato de salida
- Reglas específicas

---

## 🔧 Solución de Problemas

### Problema: "API key de Gemini no configurada"

**Solución**:
1. Verificar que el archivo `.env` existe
2. Confirmar que `GEMINI_API_KEY` tiene un valor válido
3. Reiniciar el servidor

### Problema: Error al subir archivo

**Causas posibles**:
- Archivo demasiado grande (>10MB)
- Formato no soportado
- Permisos de escritura

**Solución**:
1. Verificar tamaño del archivo
2. Confirmar formato (DOCX, PDF, TXT)
3. Comprobar permisos de carpeta `uploads/`

### Problema: Error al generar documento

**Causas posibles**:
- API key inválida
- Límite de API alcanzado
- Contenido del cuestionario problemático

**Solución**:
1. Verificar logs del servidor
2. Comprobar cuota de API de Gemini
3. Intentar con otro cuestionario de prueba

### Problema: Base de datos bloqueada

**Solución**:
```bash
# Cerrar todas las conexiones y reiniciar
python init_db.py
```

### Problema: Puerto 8000 en uso

**Solución**:
```bash
# Usar otro puerto
python -m uvicorn backend.main:app --port 8001
```

O editar `.env`:
```env
PORT=8001
```

### Ver Logs Detallados

```bash
# Ejecutar con logs detallados
python -m uvicorn backend.main:app --log-level debug
```

---

## 🔄 Mantenimiento

### Respaldo de la Base de Datos

```bash
# Copiar archivo de base de datos
copy declaration_letters.db declaration_letters_backup_2025-10-15.db
```

### Limpiar Archivos Antiguos

```python
# Script de limpieza (crear como clean_old_files.py)
import os
from datetime import datetime, timedelta

def clean_old_files(folder, days=30):
    """Elimina archivos más antiguos que X días"""
    cutoff = datetime.now() - timedelta(days=days)
    
    for filename in os.listdir(folder):
        filepath = os.path.join(folder, filename)
        if os.path.isfile(filepath):
            file_time = datetime.fromtimestamp(os.path.getmtime(filepath))
            if file_time < cutoff:
                os.remove(filepath)
                print(f"Eliminado: {filename}")

# Limpiar uploads y generated_docs
clean_old_files('uploads', 30)
clean_old_files('generated_docs', 30)
```

### Actualizar Dependencias

```bash
# Ver paquetes desactualizados
pip list --outdated

# Actualizar todos los paquetes
pip install --upgrade -r requirements.txt

# O actualizar uno específico
pip install --upgrade fastapi
```

### Monitoreo de Uso de API

Crear script `check_api_usage.py`:

```python
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Consultar uso de API en Google Cloud Console
# https://console.cloud.google.com/apis/dashboard
```

---

## 📚 Glosario Técnico

### Términos Generales

- **API (Application Programming Interface)**: Interfaz para comunicación entre aplicaciones
- **Backend**: Servidor que procesa la lógica de negocio
- **Frontend**: Interfaz de usuario en el navegador
- **Endpoint**: URL específica de una API

### Términos de Python

- **FastAPI**: Framework web moderno para Python
- **SQLAlchemy**: ORM para manejo de bases de datos
- **Pydantic**: Librería para validación de datos
- **Uvicorn**: Servidor ASGI para ejecutar FastAPI

### Términos de IA

- **Prompt**: Instrucciones enviadas a la IA
- **Token**: Unidad básica de texto procesado
- **Temperature**: Nivel de aleatoriedad en respuestas
- **Model**: Versión específica del sistema de IA

### Términos de Base de Datos

- **SQLite**: Base de datos ligera en archivo
- **ORM (Object-Relational Mapping)**: Mapeo objeto-relacional
- **Migration**: Cambio en estructura de BD
- **CRUD**: Create, Read, Update, Delete

---

## 📞 Soporte y Contacto

### Recursos Adicionales

- **FastAPI Docs**: [https://fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- **Google Gemini API**: [https://ai.google.dev](https://ai.google.dev)
- **SQLAlchemy Docs**: [https://www.sqlalchemy.org](https://www.sqlalchemy.org)

### Reportar Problemas

Al reportar problemas, incluir:
1. Descripción del error
2. Pasos para reproducir
3. Logs del servidor
4. Versión de Python
5. Sistema operativo

---

## 📄 Licencia

Este software es propiedad de la firma de abogados y está destinado únicamente para uso interno.

---

## 🎉 ¡Felicitaciones!

Has completado la configuración de **DeclarationLetterOnline**. El sistema está listo para automatizar la generación de Declaration Letters.

**Última actualización**: Octubre 2025  
**Versión**: 1.0.0


