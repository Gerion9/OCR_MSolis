# Frontend Modular - DeclarationLetterOnline

## 📁 Estructura del Proyecto

```
frontend/js/
├── config.js           # Configuración y constantes globales
├── state.js            # Manejo de estado de la aplicación
├── api.js              # Funciones de llamadas a la API
├── utils.js            # Funciones utilitarias
├── main.js             # Punto de entrada principal
└── ui/                 # Módulos de interfaz de usuario
    ├── modals.js       # Manejo de modales (error, ajustes, preview)
    ├── upload.js       # Subida y gestión de archivos
    ├── preview.js      # Vista previa de documentos (PDF, DOCX, TXT)
    ├── documents.js    # Procesamiento y gestión de documentos
    └── chat.js         # Sistema de chat con IA
```

## 🚀 Módulos

### config.js
**Propósito**: Centralizar todas las constantes y configuraciones.

**Exports**:
- `API_BASE_URL` - URL base de la API
- `CONFIG` - Objeto con configuraciones (límites, timeouts, etc.)
- `DOM_IDS` - IDs de elementos del DOM
- `STATUS_TEXTS` - Textos de estado
- `AI_PROVIDERS` - Proveedores de IA disponibles
- `DOCUMENT_TYPES` - Tipos de documentos

### state.js
**Propósito**: Gestionar el estado global de la aplicación.

**Exports**:
- `appState` - Objeto de estado global
- `getSelectedAIProvider()` - Obtiene el proveedor de IA seleccionado
- `setSelectedAIProvider(provider)` - Establece el proveedor de IA
- `buildAPIUrl(endpoint, documentId, params)` - Construye URLs de API
- Funciones de gestión de cola y estado

### api.js
**Propósito**: Encapsular todas las llamadas a la API del backend.

**Exports**:
- `uploadFile(file)` - Sube un archivo al servidor
- `getAvailableProviders()` - Obtiene proveedores de IA disponibles
- `downloadEditedDocument(documentId, type, content)` - Descarga documento editado

### utils.js
**Propósito**: Funciones utilitarias reutilizables.

**Exports**:
- `formatFileSize(bytes)` - Formatea tamaño de archivo
- `convertMarkdownToHTML(markdown)` - Convierte Markdown a HTML
- `extractTextFromHTML(html)` - Extrae texto de HTML
- `extractApplicantName(content)` - Extrae nombre del documento
- `showSuccessNotification(message)` - Muestra notificaciones

### ui/modals.js
**Propósito**: Gestionar todos los modales de la aplicación.

**Exports**:
- `initializeModals(elements)` - Inicializa módulo de modales
- `showError(message)` - Muestra modal de error
- `loadSavedSettings()` - Carga configuraciones guardadas

### ui/upload.js
**Propósito**: Gestionar la subida y cola de archivos.

**Exports**:
- `initializeUpload(elements)` - Inicializa módulo de upload
- `updateQueueUI()` - Actualiza la UI de la cola
- `removeFromQueue(itemId)` - Elimina archivo de la cola
- `uploadFileFromQueue(item)` - Sube archivo desde la cola

### ui/preview.js
**Propósito**: Vista previa de documentos en la cola.

**Exports**:
- `toggleDocumentPreview(itemId)` - Alterna vista previa
- Funciones de renderizado para PDF, DOCX y TXT

### ui/documents.js
**Propósito**: Procesamiento y gestión de documentos generados.

**Exports**:
- `initializeDocuments(elements)` - Inicializa módulo de documentos
- `switchToDocument(documentId)` - Cambia entre documentos
- `closeDocumentTab(documentId, event)` - Cierra tab de documento
- `switchDocumentType(documentId, type)` - Cambia entre Declaration/Cover
- `downloadDocument(documentId, type)` - Descarga documento
- Funciones de procesamiento con streaming

### ui/chat.js
**Propósito**: Sistema de chat con IA y memoria.

**Exports**:
- `initializeChat(elements)` - Inicializa módulo de chat
- Funciones de gestión de mensajes
- Funciones de aplicación de modificaciones

### main.js
**Propósito**: Punto de entrada que inicializa todos los módulos.

**Funcionalidad**:
1. Recolecta referencias a elementos del DOM
2. Verifica librerías externas (PDF.js, Mammoth.js)
3. Inicializa todos los módulos en orden
4. Carga configuraciones guardadas

## 🔄 Flujo de Inicialización

```javascript
DOMContentLoaded
    ↓
main.js: collectDOMElements()
    ↓
main.js: initializeModals(elements)
    ↓
main.js: initializeUpload(elements)
    ↓
main.js: initializeDocuments(elements)
    ↓
main.js: initializeChat(elements)
    ↓
main.js: loadSavedSettings()
    ↓
✅ Aplicación lista
```

## 📦 Importación de Módulos (ES6)

Los módulos utilizan importaciones ES6:

```javascript
import { CONFIG, DOM_IDS } from './config.js';
import { appState, getSelectedAIProvider } from './state.js';
import { uploadFile } from './api.js';
import { formatFileSize, convertMarkdownToHTML } from './utils.js';
```

## 🌐 Funciones Globales

Algunas funciones son expuestas globalmente para compatibilidad con eventos `onclick` en HTML:

```javascript
// En upload.js
window.removeFromQueue = removeFromQueue;

// En preview.js
window.toggleDocumentPreview = toggleDocumentPreview;

// En documents.js
window.closeDocumentTab = closeDocumentTab;
window.switchDocumentType = switchDocumentType;
window.downloadDocument = downloadDocument;
```

## ✨ Beneficios de la Modularización

### Antes (script.js monolítico)
- ❌ 2208 líneas en un solo archivo
- ❌ Difícil de mantener y debuggear
- ❌ No reutilizable
- ❌ Carga innecesariamente larga
- ❌ Acoplamiento alto entre componentes

### Ahora (estructura modular)
- ✅ Archivos pequeños y enfocados (100-500 líneas)
- ✅ Fácil de mantener y testear
- ✅ Componentes reutilizables
- ✅ Carga eficiente (módulos ES6)
- ✅ Bajo acoplamiento, alta cohesión
- ✅ Mejor organización del código

## 🔧 Desarrollo

### Agregar nueva funcionalidad

1. Identifica el módulo apropiado (o crea uno nuevo)
2. Implementa la función
3. Exporta la función si se necesita en otros módulos
4. Importa en los módulos que la necesiten
5. Si es necesario para HTML onclick, expón globalmente con `window.`

### Debugging

Cada módulo tiene su propio namespace, facilitando el debugging:

```javascript
console.log('Config:', CONFIG);
console.log('State:', appState);
console.log('Provider:', getSelectedAIProvider());
```

## 📝 Migración desde script.js

El archivo original `script.js` ha sido respaldado como `script.js.backup`.

Para revertir a la versión anterior:
1. Restaura `script.js.backup` a `script.js`
2. Actualiza `index.html` para cargar `script.js` en lugar de `main.js`

## 🎯 Próximas Mejoras

- [ ] Agregar tests unitarios para cada módulo
- [ ] Implementar lazy loading de módulos pesados
- [ ] Separar constantes de configuración en archivo .env
- [ ] Crear módulo de analytics
- [ ] Implementar service worker para offline support

