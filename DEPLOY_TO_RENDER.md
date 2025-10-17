# 🚀 Guía Rápida: Deploy a Render

**Estado**: ✅ Código listo para producción  
**Última actualización**: 2025-01-17

---

## ⚡ Pasos Rápidos (5 minutos)

### 1. Commit y Push los Cambios

```bash
git add .
git commit -m "Fix: Force 0.0.0.0 binding on Render + production mode"
git push origin main
```

### 2. Crear Servicio en Render

1. Ve a [render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Conecta tu repositorio GitHub/GitLab
4. Render detectará automáticamente `render.yaml`
5. Click **"Apply"** o **"Create Web Service"**

### 3. Configurar Variable de Entorno CRÍTICA

En el dashboard de Render:

1. Ve a **Environment** tab
2. Click **"Add Environment Variable"**
3. Añade:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Tu API key de [Google AI Studio](https://makersuite.google.com/app/apikey)
4. Click **"Save Changes"**

### 4. Deploy Automático

Render automáticamente:
- ✅ Instalará Python 3.11.11
- ✅ Instalará dependencias de `requirements.txt`
- ✅ Ejecutará `python start_server.py`
- ✅ Asignará el puerto automáticamente
- ✅ Creará la URL pública

**Tiempo estimado**: 3-5 minutos

### 5. Verificar Deployment

Una vez que veas "Your service is live", verifica:

```bash
# Instalar requests
pip install requests

# Ejecutar script de verificación
python verify_deployment.py
```

O manualmente:
- Visita: `https://tu-app.onrender.com/health`
- Debería responder: `{"status": "healthy", ...}`

---

## 📋 Checklist Completo

- [ ] **Commit y push** los cambios al repositorio
- [ ] **Crear servicio** en Render conectado a tu repo
- [ ] **Configurar `GEMINI_API_KEY`** en Environment Variables
- [ ] **Esperar deployment** (3-5 minutos)
- [ ] **Verificar** que `/health` responde
- [ ] **Probar** el frontend en `/`
- [ ] **Revisar** la documentación API en `/docs`
- [ ] **Subir un archivo** de prueba
- [ ] **Generar** una declaration letter
- [ ] **Descargar** el archivo generado

---

## ⚙️ Configuración Aplicada Automáticamente

Gracias a `render.yaml`, se configura automáticamente:

| Configuración | Valor | Descripción |
|---------------|-------|-------------|
| **Python** | 3.11.11 | Versión específica |
| **Host** | 0.0.0.0 | Forzado en código |
| **Port** | Auto (10000) | Render lo asigna |
| **Debug** | False | Forzado en producción |
| **Disk** | 1 GB | Persistente para DB y archivos |
| **Region** | Oregon | Puedes cambiar en render.yaml |
| **Plan** | Free | Puedes upgrade a Starter ($7/mo) |

---

## 🔍 Lo Que Verás en los Logs (Correcto)

```
☁️  Usando variables de entorno de Render
🚀 Modo producción detectado (Render)
🔧 Forzando binding a 0.0.0.0 para acceso público
🌐 Host: 0.0.0.0
🔌 Puerto: 10000
🐛 Modo debug: Desactivado
🔍 DEBUG: host='0.0.0.0', port=10000, reload=False
🔍 DEBUG: RENDER env var = 'true'
INFO: Uvicorn running on http://0.0.0.0:10000
INFO: Application startup complete.
✓ Procesador de IA inicializado correctamente
==> Your service is live at https://tu-app.onrender.com
```

**Nota**: Puede decir `http://0.0.0.0:10000` internamente, pero Render lo mapea a `https://tu-app.onrender.com` públicamente.

---

## ❌ Lo Que NO Deberías Ver

```
INFO: Will watch for changes           ← Modo debug activo (MAL)
INFO: Started reloader process          ← Reload activo (MAL)
Uvicorn running on http://localhost     ← Binding incorrecto (MAL)
==> No open ports detected on 0.0.0.0   ← Error de binding (MAL)
```

Si ves alguno de estos, revisa los logs completos y contacta.

---

## 🎯 URLs de Tu Aplicación

Una vez deployado, tendrás:

| Endpoint | URL | Descripción |
|----------|-----|-------------|
| **Frontend** | `https://tu-app.onrender.com/` | Interfaz web principal |
| **Health Check** | `https://tu-app.onrender.com/health` | Verificación de estado |
| **API Docs** | `https://tu-app.onrender.com/docs` | Swagger UI interactivo |
| **Upload** | `https://tu-app.onrender.com/api/upload` | POST para subir archivos |
| **Process** | `https://tu-app.onrender.com/api/process/{id}` | POST para generar letters |
| **Download** | `https://tu-app.onrender.com/api/download/{id}` | GET para descargar DOCX |

---

## 🐛 Troubleshooting Rápido

### Problema: "Build failed" con error de pydantic
**Solución**: Ya está resuelto con las dependencias actualizadas.

### Problema: "No open ports detected"
**Solución**: Ya está resuelto con el binding forzado a 0.0.0.0.

### Problema: "Service Unavailable" o 503
**Causa**: `GEMINI_API_KEY` no configurada o inválida.
**Solución**: Verificar en Render Dashboard → Environment → `GEMINI_API_KEY`.

### Problema: Cold start muy lento (>30 segundos en primera carga)
**Causa**: Free tier de Render duerme el servicio tras 15 min de inactividad.
**Solución**: Es normal en free tier. Para servicio 24/7, upgrade a Starter ($7/mo).

### Problema: "Disk full" o errores de escritura
**Causa**: El disco persistente de 1GB está lleno.
**Solución**: 
```bash
# Limpiar archivos viejos en el dashboard de Render
# O aumentar tamaño de disco en configuración
```

---

## 📊 Métricas de Performance Esperadas

| Métrica | Free Tier | Starter Tier |
|---------|-----------|--------------|
| **Cold start** | ~30-60 segundos | ~10-15 segundos |
| **Warm request** | <2 segundos | <1 segundo |
| **Upload 5MB** | ~5 segundos | ~3 segundos |
| **Generate letter** | ~10-30 segundos | ~10-25 segundos |
| **Download DOCX** | <1 segundo | <500ms |
| **Uptime** | 95% (duerme tras 15min) | 99.9% (24/7) |

---

## 🎉 ¡Éxito!

Si llegaste aquí y todo funciona:

1. ✅ Tu aplicación está en producción
2. ✅ Accesible desde cualquier lugar del mundo
3. ✅ Con HTTPS automático (Render lo maneja)
4. ✅ Con persistencia de datos (SQLite en disco)
5. ✅ Con generación de AI (Gemini)

**Comparte tu URL**: `https://tu-app.onrender.com` 🚀

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisa logs**: Render Dashboard → Logs tab
2. **Verifica variables**: Render Dashboard → Environment tab
3. **Prueba endpoints**: Usa `verify_deployment.py`
4. **Revisa documentación completa**: `RENDER_DEPLOYMENT_FIXES.md`

---

**Fecha de creación**: 2025-01-17  
**Versión**: 1.0  
**Compatibilidad**: Render.com Free/Starter tiers


