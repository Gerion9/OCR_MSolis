# 🚀 Guía de Inicio Rápido - DeclarationLetterOnline

## ⚡ Configuración en 5 Pasos

### 1. Instalar Python
- Descargar de [python.org](https://python.org) (versión 3.8 o superior)
- ✅ Marcar "Add Python to PATH" durante instalación

### 2. Instalar Dependencias
```bash
pip install -r requirements.txt
```

### 3. Configurar API de Gemini
1. Obtener API key en: [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Copiar `env.example` a `.env`
3. Editar `.env` y pegar tu API key:
   ```
   GEMINI_API_KEY=tu_api_key_aqui
   ```

### 4. Inicializar Base de Datos
```bash
python init_db.py
```

### 5. Iniciar Servidor
```bash
python start_server.py
```

## 📱 Usar la Aplicación

1. Abrir navegador en: [http://localhost:8000](http://localhost:8000)
2. Arrastrar archivo del cuestionario (DOCX, PDF o TXT)
3. Hacer clic en "Generar Declaration Letter"
4. Esperar generación (30-60 segundos)
5. Descargar documento generado

## 🆘 Problemas Comunes

### Error: "ModuleNotFoundError"
**Solución**: Instalar dependencias
```bash
pip install -r requirements.txt
```

### Error: "API key no configurada"
**Solución**: Configurar API key en archivo `.env`

### Error: "Puerto en uso"
**Solución**: Cambiar puerto en `.env`:
```
PORT=8001
```

## 📚 Documentación Completa

Ver `README.md` para documentación detallada.

## 🎯 Características Principales

✅ Interfaz web intuitiva  
✅ Subida de archivos drag & drop  
✅ Procesamiento con IA (Google Gemini)  
✅ Vista previa en tiempo real  
✅ Descarga en formato DOCX  
✅ Opción de regenerar  
✅ Funcionamiento local/offline  

## 📞 Ayuda

- **Documentación API**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Manual completo**: Ver `README.md`

---

¡Todo listo! Ahora puedes empezar a generar Declaration Letters automáticamente. 🎉


