# DeclarationLetter - Archivos de Configuración XML

Esta carpeta contiene los archivos XML que configuran el comportamiento del sistema de generación de cartas de declaración.

## 📄 Archivos

### SystemPrompt.xml

**Propósito**: Define las instrucciones completas para el modelo de IA (Gemini) sobre cómo generar las Declaration Letters.

**Contiene**:
- **Personalidad y rol**: Define que la IA actúa como un asistente legal experto
- **Tono**: Profesional, respetuoso, neutral y empático
- **Reglas de formato**: 
  - Formato Markdown con ## para secciones
  - Numeración consecutiva de párrafos (1. 2. 3. etc.)
  - Estructura específica del título
- **Restricciones legales**: 
  - No proporcionar asesoría legal
  - Incluir disclaimers apropiados
  - Enfoque en trauma-informed approach
- **Directrices de escritura**:
  - Lenguaje accesible sin jerga legal
  - Párrafos largos y detallados
  - Uso de primera persona ("I")
  - Evitar especulaciones

**Modificar este archivo si necesitas**:
- Cambiar el tono de los documentos generados
- Ajustar las reglas de formato
- Modificar las restricciones o directrices
- Personalizar para casos específicos

---

### Declaration.xml

**Propósito**: Define la estructura y contenido específico que debe tener cada carta de declaración.

**Contiene**:
- **Secciones requeridas**: 
  - BACKGROUND
  - COMING TO THE UNITED STATES
  - TRAFFICKING EXPERIENCE
  - ESCAPING FROM TRAFFICKING
  - LIFE AFTER TRAFFICKING
  - REPORTING TO LAW ENFORCEMENT
  - FBI RECORDS
  - HARDSHIP I WOULD SUFFER OUTSIDE THE UNITED STATES
  
- **Preguntas guía**: Para cada sección, incluye las preguntas específicas que ayudan a obtener la información necesaria

- **Plantillas y ejemplos**: Ejemplos de texto y formato para diferentes situaciones

- **Instrucciones detalladas**: Guías sobre qué información debe incluirse en cada sección

**Modificar este archivo si necesitas**:
- Agregar o eliminar secciones
- Cambiar las preguntas guía
- Ajustar ejemplos o plantillas
- Modificar la estructura del documento

---

## 🔧 Cómo Modificar

### Para modificar el formato del documento:
Edita `SystemPrompt.xml` → sección `<rules_and_constraints>`

### Para cambiar las secciones del documento:
Edita `Declaration.xml` → sección `<declaration_structure>`

### Para ajustar el tono y personalidad:
Edita `SystemPrompt.xml` → sección `<persona>`

### Para cambiar preguntas del cuestionario:
Edita `Declaration.xml` → sección `<declaration_questionnaire>`

---

## ⚠️ Importante

- **Copia de seguridad**: Siempre haz una copia de seguridad antes de modificar estos archivos
- **Sintaxis XML**: Mantén la estructura XML válida (etiquetas abiertas y cerradas correctamente)
- **Pruebas**: Después de modificar, prueba con un documento de ejemplo
- **Documentación**: Si haces cambios significativos, documenta los cambios en el CHANGELOG.md del proyecto

---

## 📚 Referencias

Para más información sobre cómo estos archivos se utilizan en el sistema, consulta:
- `backend/ai_processor.py` - Código que carga y procesa estos archivos
- `README.md` (raíz del proyecto) - Documentación general del sistema
- `PROJECT_SUMMARY.md` - Resumen técnico de la arquitectura

---

## 🤝 Soporte

Si tienes problemas con estos archivos o necesitas ayuda para personalizarlos, consulta:
- La documentación principal en `README.md`
- La guía de instalación en `INSTALLATION_GUIDE.md`
- El archivo `START_HERE.md` para guía rápida

