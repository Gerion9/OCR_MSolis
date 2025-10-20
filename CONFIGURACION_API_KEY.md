# 🔑 CONFIGURACIÓN DE API KEY - Gemini

## ⚠️ ERROR 503: Service Unavailable

Si ves este error al intentar procesar documentos, significa que **no tienes configurada la API key de Gemini**.

---

## 📋 PASOS PARA CONFIGURAR

### 1️⃣ Obtener API Key de Google Gemini

1. Ve a: **https://aistudio.google.com/app/apikey**
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **"Create API Key"**
4. Copia la API key generada (ejemplo: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX`)

---

### 2️⃣ Crear Archivo `.env`

En el directorio `OCR_MSolis`, crea un archivo llamado `.env` (con el punto al inicio):

**Método 1 - Usando Notepad:**
```bash
1. Abrir Notepad
2. Copiar el contenido de abajo
3. Guardar como: .env
4. Tipo: "Todos los archivos (*.*)"
5. Guardar en la carpeta OCR_MSolis
```

**Método 2 - Usando PowerShell:**
```powershell
cd OCR_MSolis
notepad .env
```

**Contenido del archivo `.env`:**
```env
# ==========================================
# CONFIGURACIÓN DE DeclarationLetterOnline
# ==========================================

# API KEY DE GOOGLE GEMINI (REQUERIDO)
# Reemplazar "tu_api_key_aqui" con tu API key real
GEMINI_API_KEY=tu_api_key_aqui

# CONFIGURACIÓN DEL MODELO
GEMINI_MODEL=gemini-1.5-pro
GEMINI_TIMEOUT=300

# CONFIGURACIÓN DEL SERVIDOR
HOST=0.0.0.0
PORT=8000
DEBUG_MODE=False

# BASE DE DATOS
DATABASE_URL=sqlite:///./declaration_letters.db

# LÍMITES
MAX_FILE_SIZE_MB=10

# CARPETAS
UPLOAD_FOLDER=uploads
GENERATED_DOCS_FOLDER=generated_docs
```

---

### 3️⃣ Reemplazar la API Key

En el archivo `.env`, **reemplaza esta línea:**

```env
GEMINI_API_KEY=tu_api_key_aqui
```

**Con tu API key real:**

```env
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX
```

⚠️ **IMPORTANTE:** 
- No dejes espacios alrededor del `=`
- No uses comillas
- La key debe estar en una sola línea

---

### 4️⃣ Verificar Configuración

**Estructura de archivos esperada:**
```
OCR_MSolis/
├── .env                  ← Tu archivo con la API key
├── backend/
│   ├── main.py
│   └── ...
├── frontend/
├── run_server.py
└── ...
```

---

### 5️⃣ Iniciar el Servidor

```bash
cd OCR_MSolis
python run_server.py
```

**Salida esperada:**
```
======================================================================
🚀 DeclarationLetterOnline - Sistema de Automatización
======================================================================
✓ Procesador de IA inicializado correctamente
✓ Archivos XML de Declaration Letter cargados correctamente
✓ Archivos XML de Cover Letter cargados correctamente
✅ Servidor iniciado en: http://0.0.0.0:8000
======================================================================
```

Si ves estos mensajes ✅, la configuración es correcta.

---

## 🐛 TROUBLESHOOTING

### Problema: "API key de Gemini no configurada"

**Causas posibles:**
1. El archivo `.env` no existe
2. El archivo se llama `.env.txt` (incorrecto)
3. La API key está mal escrita
4. Hay espacios en la línea

**Solución:**
1. Verificar que el archivo se llame exactamente `.env`
2. Abrir `.env` y verificar la línea:
   ```env
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
3. No debe haber espacios: ❌ `GEMINI_API_KEY = tu_key`
4. Debe ser: ✅ `GEMINI_API_KEY=tu_key`

---

### Problema: "Invalid API key"

**Causas posibles:**
1. La API key es incorrecta
2. La API key fue revocada
3. Hay espacios extra

**Solución:**
1. Generar nueva API key en https://aistudio.google.com/app/apikey
2. Copiar y pegar cuidadosamente
3. Verificar que no haya espacios al inicio o final

---

### Problema: El archivo `.env` no se ve en Windows

**Causa:**
Windows oculta archivos que empiezan con punto.

**Solución:**
1. Abrir Explorador de archivos
2. Ver → Opciones
3. Ver → Mostrar archivos ocultos
4. Aplicar

O usar PowerShell para verificar:
```powershell
cd OCR_MSolis
ls -Force .env
```

---

### Problema: "Service Unavailable" persiste

**Pasos de diagnóstico:**

1. **Verificar que el archivo `.env` existe:**
   ```powershell
   cd OCR_MSolis
   Test-Path .env
   ```
   Debe retornar: `True`

2. **Ver contenido del archivo:**
   ```powershell
   Get-Content .env
   ```
   Debe mostrar tu configuración

3. **Verificar API key:**
   - Debe empezar con `AIzaSy`
   - Debe tener ~39 caracteres
   - No debe tener espacios

4. **Reiniciar el servidor:**
   - Detener: `Ctrl + C`
   - Iniciar: `python run_server.py`

---

## 📝 EJEMPLO COMPLETO

### Archivo `.env` correcto:
```env
# API KEY DE GOOGLE GEMINI
GEMINI_API_KEY=AIzaSyC4nF3xJp8K5N7qR2sT9vU1wX3yZ6aB5cD

# CONFIGURACIÓN DEL MODELO
GEMINI_MODEL=gemini-1.5-pro
GEMINI_TIMEOUT=300

# CONFIGURACIÓN DEL SERVIDOR
HOST=0.0.0.0
PORT=8000
DEBUG_MODE=False

# BASE DE DATOS
DATABASE_URL=sqlite:///./declaration_letters.db

# LÍMITES
MAX_FILE_SIZE_MB=10

# CARPETAS
UPLOAD_FOLDER=uploads
GENERATED_DOCS_FOLDER=generated_docs
```

---

## 🔒 SEGURIDAD

### ⚠️ IMPORTANTE - Proteger tu API Key:

1. **NO compartir** tu API key públicamente
2. **NO subir** el archivo `.env` a GitHub
3. **NO copiar** la API key en emails o chats
4. **SÍ agregar** `.env` al `.gitignore`

### `.gitignore` debe incluir:
```gitignore
# Variables de entorno
.env
.env.local
.env.*.local

# API keys
*.key
*.secret
```

---

## 💰 CUOTAS Y LÍMITES

### Gemini Free Tier:
- ✅ 60 requests por minuto
- ✅ 1,500 requests por día
- ✅ Gratis hasta cierto límite de tokens

### Monitorear uso:
https://console.cloud.google.com/apis/dashboard

---

## 🆘 AYUDA ADICIONAL

### Si nada funciona:

1. **Verificar logs del servidor:**
   Los mensajes en la consola indican si la API key se cargó:
   ```
   ✓ Procesador de IA inicializado correctamente
   ```

2. **Probar API key manualmente:**
   ```python
   import os
   from dotenv import load_dotenv
   import google.generativeai as genai
   
   load_dotenv()
   api_key = os.getenv("GEMINI_API_KEY")
   print(f"API Key: {api_key[:10]}...{api_key[-5:]}")  # Primeros 10 y últimos 5 chars
   
   genai.configure(api_key=api_key)
   model = genai.GenerativeModel('gemini-1.5-pro')
   response = model.generate_content("Hello")
   print(response.text)
   ```

3. **Contactar soporte:**
   - Google AI Studio: https://aistudio.google.com/
   - Documentación: https://ai.google.dev/docs

---

## ✅ CHECKLIST DE CONFIGURACIÓN

- [ ] API key obtenida de https://aistudio.google.com/app/apikey
- [ ] Archivo `.env` creado en `OCR_MSolis/`
- [ ] API key copiada en la línea `GEMINI_API_KEY=...`
- [ ] Sin espacios alrededor del `=`
- [ ] Sin comillas alrededor de la key
- [ ] Archivo guardado correctamente
- [ ] Servidor reiniciado
- [ ] Mensaje "Procesador de IA inicializado" aparece
- [ ] Error 503 desaparecido
- [ ] Documentos se procesan correctamente

---

## 🎉 ¡LISTO!

Si completaste todos los pasos, deberías poder procesar documentos sin el error 503.

**El sistema está listo para generar Declaration y Cover Letters** 🚀

---

**Última actualización:** Octubre 2024


