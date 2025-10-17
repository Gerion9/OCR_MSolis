# CoverLetter - Archivos de Configuración XML

Esta carpeta contiene los archivos XML que configuran el comportamiento del sistema de generación de Cover Letters para peticiones de T-Visa.

## 📄 Archivos

### SystemPrompt.xml

**Propósito**: Define las instrucciones completas para el modelo de IA (Gemini) sobre cómo generar Cover Letters profesionales para peticiones T-Visa.

**Contiene**:
- **Personalidad y rol**: Define que la IA actúa como un asistente experto en redacción de Cover Letters para T-Visa
- **Objetivo**: Preparar Cover Letters profesionales derivados de la Declaration Letter del sobreviviente
- **Tono**: Profesional, respetuoso, neutral y empático
- **Configuración de citas**: 
  - [Decl. ¶ n] para párrafos de la declaración
  - [8 C.F.R. § x] para regulaciones
  - [INA § x; 8 U.S.C. § y] para estatutos
  - [Ex. label at page] para exhibiciones
- **Política de formato**:
  - Encabezados con números romanos I–VI
  - Énfasis narrativo con citas limitadas en línea
  - Lenguaje claro y accesible
- **Restricciones legales**: 
  - No proporcionar asesoría legal
  - No hacer promesas sobre resultados
  - No contradecir la declaración
  - Evitar especulación

**Modificar este archivo si necesitas**:
- Cambiar el tono del Cover Letter
- Ajustar el formato de citas
- Modificar la estructura de secciones
- Personalizar el lenguaje legal

---

### CoverLetterStructure.xml

**Propósito**: Define la estructura completa, contenido y secciones específicas que debe tener cada Cover Letter para T-Visa.

**Contiene**:
- **Secciones requeridas** (estructura romana I-VI):
  - **I. APPLICANT IS A VICTIM OF A SEVERE FORM OF TRAFFICKING IN PERSONS**
    - Demuestra que el aplicante sufrió tráfico severo según INA § 101(a)(15)(T)
    - Mínimo 3 párrafos muy largos
    - 4+ citas multilínea de la declaración
    
  - **II. APPLICANT IS PHYSICALLY PRESENT IN THE U.S. DUE TO TRAFFICKING**
    - Prueba que la presencia está relacionada con el tráfico
    - Cita requerida: [8 C.F.R. § 214.11(g)]
    - Mínimo 2 párrafos muy largos
    
  - **III. APPLICANT HAS COMPLIED WITH REASONABLE REQUESTS FOR ASSISTANCE**
    - Demuestra cooperación con autoridades
    - Cita requerida: [8 C.F.R. § 214.11(h)]
    - Mínimo 2 párrafos muy largos
    
  - **IV. APPLICANT WOULD SUFFER EXTREME HARDSHIP IF REMOVED**
    - Prueba dificultad extrema según factores de 8 C.F.R. § 214.11(i)
    - Mínimo 4 párrafos muy largos
    - Aborda factores: edad, salud, impacto psicológico, riesgo de re-victimización
    
  - **V. APPLICANT IS ELIGIBLE FOR A WAIVER OF INADMISSIBILITY**
    - Solicita waiver según INA § 212(d)(3)(B) y § 212(d)(13)(B)
    - Argumentos de interés público/nacional
    - Mínimo 1 párrafo muy largo
    
  - **VI. CONCLUSION**
    - Resume argumentos y solicita aprobación
    - Incluye información de contacto del abogado
    - Mínimo 1 párrafo muy largo

- **Guías de redacción**: Para cada sección, incluye:
  - Propósito específico
  - Contenido general requerido
  - Ejemplo específico del caso
  - Consejos de redacción
  - Requisitos narrativos
  - Guía de longitud (palabras/párrafos)

- **Estilo de escritura**:
  - Tercera persona neutral ("the applicant", "the declarant", "the victim")
  - Párrafos extremadamente largos (10-14 oraciones por párrafo)
  - Mínimo 2,400 palabras en total
  - Voz formal persuasiva narrativa
  - Usar citas textuales del cliente (mínimo 6 citas multilínea)
  - Evitar guiones largos (em dashes)

- **Formato de encabezado**:
  - Fecha
  - Dirección USCIS (Nebraska Service Center)
  - Línea RE: con nombre del aplicante y derivados
  - Saludo: "Dear T Visa Adjudicator,"

- **Bloque de firma**:
  - "Respectfully submitted,"
  - Nombre del abogado
  - Law Offices of Manuel Solis
  - Dirección, teléfono, email

**Modificar este archivo si necesitas**:
- Cambiar las secciones del Cover Letter
- Ajustar los requisitos de longitud
- Modificar el formato de citas
- Cambiar el estilo narrativo
- Personalizar la estructura de argumentos

---

## 🔧 Cómo Funciona

### Flujo de Generación

1. **Input**: El sistema toma como entrada el Declaration Letter ya generado
2. **Procesamiento**: 
   - Lee SystemPrompt.xml para obtener instrucciones
   - Lee CoverLetterStructure.xml para obtener la estructura
   - Extrae información relevante del Declaration Letter
3. **Generación**: La IA crea el Cover Letter siguiendo:
   - Las secciones I-VI definidas
   - Los requisitos narrativos
   - Las guías de longitud y estilo
   - Las políticas de citación
4. **Output**: Cover Letter en formato Markdown
5. **Conversión**: Se convierte a DOCX para descarga

### Diferencias con Declaration Letter

| Aspecto | Declaration Letter | Cover Letter |
|---------|-------------------|--------------|
| Propósito | Narración personal del sobreviviente | Argumento legal para el adjudicador |
| Voz | Primera persona ("I") | Tercera persona ("the applicant") |
| Estructura | Secciones narrativas cronológicas | Secciones de elegibilidad legal (I-VI) |
| Longitud | Variable según experiencia | Mínimo 2,400 palabras |
| Citas | No incluye citas legales | Incluye citas de regulaciones y estatutos |
| Formato | Párrafos numerados (1. 2. 3.) | Párrafos sin numeración bajo secciones romanas |

---

## 🔧 Cómo Modificar

### Para modificar el formato del Cover Letter:
Edita `SystemPrompt.xml` → sección `<configuration>` y `<output_format>`

### Para cambiar las secciones argumentativas:
Edita `CoverLetterStructure.xml` → sección `<chapter_explanations>`

### Para ajustar el tono y personalidad:
Edita `SystemPrompt.xml` → sección `<persona>`

### Para cambiar requisitos de longitud:
Edita `CoverLetterStructure.xml` → atributos `<length>` en cada capítulo

### Para modificar política de citas:
Edita `SystemPrompt.xml` → sección `<citation_policy>`

---

## ⚠️ Importante

- **Copia de seguridad**: Siempre haz una copia de seguridad antes de modificar estos archivos
- **Sintaxis XML**: Mantén la estructura XML válida (etiquetas abiertas y cerradas correctamente)
- **Pruebas**: Después de modificar, prueba con un Declaration Letter de ejemplo
- **Documentación**: Si haces cambios significativos, documenta los cambios en el CHANGELOG.md
- **Consistencia legal**: Los cambios deben mantener coherencia con los requisitos legales de T-Visa

---

## 📚 Referencias

Para más información sobre cómo estos archivos se utilizan en el sistema, consulta:
- `backend/ai_processor.py` - Código que carga y procesa estos archivos
- `README.md` (raíz del proyecto) - Documentación general del sistema
- `PROJECT_SUMMARY.md` - Resumen técnico de la arquitectura

### Referencias Legales

- **Victims of Trafficking and Violence Protection Act of 2000**
- **INA § 101(a)(15)(T)** - Definición de T Visa
- **8 U.S.C. § 1101(a)(15)(T)** - Código de T Visa
- **8 C.F.R. § 214.11** - Regulaciones de T Visa
- **INA § 212(d)(3)(B) y § 212(d)(13)(B)** - Waivers de inadmisibilidad

---

## 🤝 Soporte

Si tienes problemas con estos archivos o necesitas ayuda para personalizarlos, consulta:
- La documentación principal en `README.md`
- La guía de instalación en `INSTALLATION_GUIDE.md`
- El archivo `START_HERE.md` para guía rápida
- La carpeta `DeclarationLetter/` para comparar con la estructura similar

