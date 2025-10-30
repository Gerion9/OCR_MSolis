/**
 * DeclarationLetterOnline - Frontend JavaScript (Multi-Document Version)
 * Maneja la interacción del usuario y comunicación con el backend
 */

// CONFIGURACIÓN Y ESTADO GLOBAL
const API_BASE_URL = window.location.origin;

// Estado de la aplicación
const appState = {
    documentsQueue: [],  // Cola de archivos listos para procesar
    processedDocuments: {},  // Documentos ya procesados {documentId: {data}}
    activeDocumentId: null,  // ID del documento actualmente visible
    activeDocumentType: 'declaration',  // 'declaration' o 'cover'
    activeStreams: {},  // EventSource activos por documentId {documentId: {declaration: EventSource, cover: EventSource}}
    cancelledDocuments: new Set(),  // IDs de documentos cancelados manualmente
    isProcessing: false,  // Flag para indicar si hay procesamiento activo
    selectedAIProvider: localStorage.getItem('selectedAIProvider') || 'google_gemini'  // Proveedor de IA seleccionado
};

// FUNCIONES DE CONFIGURACIÓN DE AI
function getSelectedAIProvider() {
    return appState.selectedAIProvider || 'google_gemini';
}

function setSelectedAIProvider(provider) {
    appState.selectedAIProvider = provider;
    localStorage.setItem('selectedAIProvider', provider);
    console.log(`AI Provider cambiado a: ${provider}`);
}

function buildAPIUrl(endpoint, documentId, additionalParams = {}) {
    const provider = getSelectedAIProvider();
    const params = new URLSearchParams({
        ai_provider: provider,
        ...additionalParams
    });
    
    let url = `${API_BASE_URL}${endpoint}`;
    if (documentId) {
        url = url.replace('{documentId}', documentId);
    }
    
    return `${url}?${params.toString()}`;
}

// ELEMENTOS DEL DOM
const elements = {
    // Sección de subida
    uploadBox: document.getElementById('uploadBox'),
    fileInput: document.getElementById('fileInput'),
    selectFileBtn: document.getElementById('selectFileBtn'),
    
    // Cola de documentos
    documentsQueue: document.getElementById('documentsQueue'),
    queueList: document.getElementById('queueList'),
    queueCount: document.getElementById('queueCount'),
    processAllBtn: document.getElementById('processAllBtn'),
    
    // Sección de previsualización
    previewSection: document.getElementById('previewSection'),
    documentsTabs: document.getElementById('documentsTabs'),
    tabsHeader: document.getElementById('tabsHeader'),
    documentsViewer: document.getElementById('documentsViewer'),
    
    // Modal de error
    errorModal: document.getElementById('errorModal'),
    errorMessage: document.getElementById('errorMessage'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    closeErrorBtn: document.getElementById('closeErrorBtn'),
    
    // Modal de ajustes
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    aiModelSelect: document.getElementById('aiModelSelect'),
    settingsPassword: document.getElementById('settingsPassword'),
    changeAiModelBtn: document.getElementById('changeAiModelBtn'),
    settingsErrorMessage: document.getElementById('settingsErrorMessage'),
    
    // Modal de vista previa de documento
    documentPreviewModal: document.getElementById('documentPreviewModal'),
    closePreviewModalBtn: document.getElementById('closePreviewModalBtn'),
    previewModalTitle: document.getElementById('previewModalTitle'),
    documentPreviewContainer: document.getElementById('documentPreviewContainer')
};

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadSavedSettings();
    
    // Verificar que las librerías de preview estén cargadas
    console.log('Checking preview libraries...');
    console.log('PDF.js loaded:', typeof pdfjsLib !== 'undefined');
    console.log('Mammoth.js loaded:', typeof mammoth !== 'undefined');
    
    if (typeof mammoth === 'undefined') {
        console.warn('Mammoth.js library not loaded. DOCX preview will not be available.');
    }
    
    if (typeof pdfjsLib === 'undefined') {
        console.warn('PDF.js library not loaded. PDF preview will not be available.');
    }
    
    console.log('DeclarationLetterOnline (Multi-Document) initialized');
});

function loadSavedSettings() {
    // Cargar el proveedor de IA guardado
    const savedProvider = getSelectedAIProvider();
    if (elements.aiModelSelect) {
        elements.aiModelSelect.value = savedProvider;
    }
    console.log(`Loaded saved AI Provider: ${savedProvider}`);
}

function initializeEventListeners() {
    // Botón de seleccionar archivo
    elements.selectFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.fileInput.click();
    });
    
    // Input de archivo (ahora acepta múltiples)
    elements.fileInput.addEventListener('change', handleFilesSelect);
    
    // Drag and drop
    elements.uploadBox.addEventListener('dragover', handleDragOver);
    elements.uploadBox.addEventListener('dragleave', handleDragLeave);
    elements.uploadBox.addEventListener('drop', handleDrop);
    
    // Procesar todos los documentos
    elements.processAllBtn.addEventListener('click', handleProcessAll);
    
    // Modal de error
    elements.closeModalBtn.addEventListener('click', closeErrorModal);
    elements.closeErrorBtn.addEventListener('click', closeErrorModal);
    elements.errorModal.addEventListener('click', (e) => {
        if (e.target === elements.errorModal) {
            closeErrorModal();
        }
    });
    
    // Modal de ajustes
    elements.settingsBtn.addEventListener('click', openSettingsModal);
    elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);
    elements.changeAiModelBtn.addEventListener('click', handleChangeAiModel);
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            closeSettingsModal();
        }
    });
    
    // Permitir enviar con Enter en el campo de contraseña de ajustes
    elements.settingsPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleChangeAiModel();
        }
    });
    
    // Modal de vista previa de documento
    elements.closePreviewModalBtn.addEventListener('click', closeDocumentPreviewModal);
    elements.documentPreviewModal.addEventListener('click', (e) => {
        if (e.target === elements.documentPreviewModal) {
            closeDocumentPreviewModal();
        }
    });
}

// MANEJO DE ARCHIVOS
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadBox.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadBox.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadBox.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    handleMultipleFiles(files);
}

function handleFilesSelect(e) {
    const files = Array.from(e.target.files);
    handleMultipleFiles(files);
    // Limpiar input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = '';
}

function handleMultipleFiles(files) {
    let validFiles = [];
    const MAX_DOCUMENTS = 5;
    
    // Validar límite de documentos
    if (appState.documentsQueue.length >= MAX_DOCUMENTS) {
        showError(`Maximum limit reached: You can only upload up to ${MAX_DOCUMENTS} documents at a time.`);
        return;
    }
    
    for (const file of files) {
        // Validar límite incluyendo los que ya están en cola
        if (appState.documentsQueue.length + validFiles.length >= MAX_DOCUMENTS) {
            showError(`Maximum limit reached: You can only upload up to ${MAX_DOCUMENTS} documents. ${MAX_DOCUMENTS - appState.documentsQueue.length} more allowed.`);
            break;
        }
        
        // Validar duplicados por nombre de archivo
        const isDuplicate = appState.documentsQueue.some(item => item.fileName === file.name);
        if (isDuplicate) {
            showError(`File "${file.name}" is already in the queue.`);
            continue;
        }
        
    // Validar tipo de archivo
    const validExtensions = ['.docx', '.doc', '.pdf', '.txt'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
        if (!validExtensions.includes(fileExtension)) {
            showError(`Invalid file type: ${file.name}. Please upload DOCX, PDF or TXT files.`);
            continue;
    }
    
    // Validar tamaño (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
            showError(`File ${file.name} exceeds 10MB limit.`);
            continue;
        }
        
        validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
        addFilesToQueue(validFiles);
    }
}

function addFilesToQueue(files) {
    for (const file of files) {
        const queueItem = {
            id: Date.now() + Math.random(),  // ID único temporal
            file: file,
            fileName: file.name,
            fileSize: formatFileSize(file.size),
            status: 'pending',  // pending, uploading, uploaded, processing, completed, error
            documentId: null,  // Se asignará después del upload
            uploadProgress: 0,
            previewExpanded: false,  // Estado del acordeón de vista previa
            previewRendered: false,  // Si ya se renderizó la vista previa
            previewHTML: ''  // HTML de la vista previa renderizada
        };
        
        appState.documentsQueue.push(queueItem);
    }
    
    updateQueueUI();
}

function updateQueueUI() {
    if (appState.documentsQueue.length === 0) {
        elements.documentsQueue.classList.add('hidden');
        return;
    }
    
    elements.documentsQueue.classList.remove('hidden');
    elements.queueCount.textContent = `${appState.documentsQueue.length} file${appState.documentsQueue.length !== 1 ? 's' : ''}`;
    
    // Renderizar lista de documentos
    elements.queueList.innerHTML = '';
    
    for (const item of appState.documentsQueue) {
        const queueItemEl = createQueueItemElement(item);
        elements.queueList.appendChild(queueItemEl);
    }
    
    // Habilitar/deshabilitar botón de procesar
    const hasPendingFiles = appState.documentsQueue.some(item => 
        item.status === 'pending' || item.status === 'uploaded'
    );
    elements.processAllBtn.disabled = !hasPendingFiles;
}

function createQueueItemElement(item) {
    const div = document.createElement('div');
    div.className = 'queue-item';
    div.dataset.id = item.id;
    
    const fileExtension = item.fileName.substring(item.fileName.lastIndexOf('.') + 1).toUpperCase();
    
    // Mostrar botón de vista previa siempre que tengamos el archivo y no esté completado
    const showPreviewButton = item.file && item.status !== 'completed' && item.status !== 'processing';
    
    div.innerHTML = `
        <div class="queue-item-header">
            <div class="queue-item-info">
                <div class="queue-item-icon">${fileExtension}</div>
                <div class="queue-item-details">
                    <h4>${item.fileName}</h4>
                    <p>${item.fileSize}</p>
                </div>
            </div>
            <div class="queue-item-actions">
                ${showPreviewButton ? `
                    <button class="btn-icon btn-toggle-preview" onclick="toggleDocumentPreview('${item.id}')" title="${item.previewExpanded ? 'Hide Preview' : 'Show Preview'}" type="button">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="chevron-icon ${item.previewExpanded ? 'expanded' : ''}">
                            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                ` : ''}
                <div class="queue-item-status ${item.status}">
                    ${getStatusText(item.status)}
                </div>
                ${item.status !== 'completed' ? `<button class="btn-icon" onclick="removeFromQueue('${item.id}')" title="Remove" type="button">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>` : ''}
            </div>
        </div>
        ${item.previewExpanded ? `
            <div class="queue-item-preview-container">
                <div id="preview-content-${item.id}" class="queue-preview-content">
                    ${item.previewRendered ? item.previewHTML : '<div class="preview-loading">Loading preview...</div>'}
                </div>
            </div>
        ` : ''}
    `;
    
    return div;
}

function getStatusText(status) {
    const statusTexts = {
        pending: 'Pending',
        uploading: 'Uploading...',
        uploaded: 'Ready',
        processing: 'Processing...',
        completed: '✓ Completed',
        error: 'Error'
    };
    return statusTexts[status] || status;
}

function removeFromQueue(itemId) {
    // Encontrar el documento en la cola
    const queueItem = appState.documentsQueue.find(item => item.id == itemId);
    
    if (queueItem) {
        // Si el documento tiene un documentId (ya fue procesado o está en proceso)
        const documentId = queueItem.documentId;
        
        if (documentId) {
            // Marcar como cancelado para detener cualquier procesamiento en curso
            appState.cancelledDocuments.add(documentId);
            console.log(`Marked document ${documentId} as cancelled`);
            
            // Cancelar streams activos si existen
            if (appState.activeStreams[documentId]) {
                // Cerrar Declaration Letter stream
                if (appState.activeStreams[documentId].declaration) {
                    appState.activeStreams[documentId].declaration.close();
                    delete appState.activeStreams[documentId].declaration;
                    console.log(`Cancelled Declaration Letter stream for document ${documentId}`);
                }
                
                // Cerrar Cover Letter stream
                if (appState.activeStreams[documentId].cover) {
                    appState.activeStreams[documentId].cover.close();
                    delete appState.activeStreams[documentId].cover;
                    console.log(`Cancelled Cover Letter stream for document ${documentId}`);
                }
                
                // Limpiar objeto de streams si está vacío
                if (Object.keys(appState.activeStreams[documentId]).length === 0) {
                    delete appState.activeStreams[documentId];
                }
            }
            
            // Cerrar el panel del documento si existe
            closeDocumentTab(documentId, { stopPropagation: () => {} });
            
            // Limpiar del estado procesado
            if (appState.processedDocuments[documentId]) {
                delete appState.processedDocuments[documentId];
            }
        }
    }
    
    // Eliminar de la cola
    appState.documentsQueue = appState.documentsQueue.filter(item => item.id != itemId);
    updateQueueUI();
    
    console.log(`Removed document ${itemId} from queue`);
}

// Hacer función global para poder llamarla desde HTML
window.removeFromQueue = removeFromQueue;

// Función para alternar el acordeón de vista previa
async function toggleDocumentPreview(itemId) {
    console.log('toggleDocumentPreview called with itemId:', itemId);
    
    const queueItem = appState.documentsQueue.find(item => item.id == itemId);
    
    if (!queueItem) {
        showError('Document not found in queue');
        return;
    }
    
    if (!queueItem.file) {
        showError('Document file not available. Please re-upload the file.');
        return;
    }
    
    // Alternar estado expandido
    queueItem.previewExpanded = !queueItem.previewExpanded;
    
    // Si se está expandiendo y no se ha renderizado aún, renderizar
    if (queueItem.previewExpanded && !queueItem.previewRendered) {
        // Actualizar UI primero para mostrar el loading
        updateQueueUI();
        
        // Renderizar la vista previa
        await renderPreviewInQueue(queueItem);
    } else {
        // Solo actualizar UI
        updateQueueUI();
    }
}

// Renderizar vista previa dentro del queue item
async function renderPreviewInQueue(queueItem) {
    console.log('Rendering preview for:', queueItem.fileName);
    
    const fileExtension = queueItem.fileName.substring(queueItem.fileName.lastIndexOf('.')).toLowerCase();
    
    try {
        let previewHTML = '';
        
        if (fileExtension === '.pdf') {
            console.log('Rendering PDF preview...');
            previewHTML = await renderPDFPreviewToHTML(queueItem.file);
        } else if (fileExtension === '.docx' || fileExtension === '.doc') {
            console.log('Rendering DOCX preview...');
            previewHTML = await renderDOCXPreviewToHTML(queueItem.file);
        } else if (fileExtension === '.txt') {
            console.log('Rendering TXT preview...');
            previewHTML = await renderTextPreviewToHTML(queueItem.file);
        } else {
            console.warn('Unsupported file format:', fileExtension);
            previewHTML = '<div class="preview-error">Unsupported file format for preview. Supported formats: PDF, DOCX, TXT</div>';
        }
        
        queueItem.previewHTML = previewHTML;
        queueItem.previewRendered = true;
        
        // Actualizar UI para mostrar el preview renderizado
        updateQueueUI();
        
    } catch (error) {
        console.error('Error rendering preview:', error);
        queueItem.previewHTML = `<div class="preview-error">Error loading preview: ${error.message}</div>`;
        queueItem.previewRendered = true;
        updateQueueUI();
    }
}

// Hacer función global
window.toggleDocumentPreview = toggleDocumentPreview;

// Renderizar PDF y retornar HTML
async function renderPDFPreviewToHTML(file) {
    try {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js library not loaded. Please refresh the page.');
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        const container = document.createElement('div');
        container.className = 'pdf-preview-wrapper';
        
        // Renderizar primeras 2 páginas (para no sobrecargar)
        const numPages = Math.min(pdf.numPages, 2);
        
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.2 });
            
            // Crear canvas temporal
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Renderizar página en canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Convertir canvas a imagen base64
            const imageDataUrl = canvas.toDataURL('image/png');
            
            // Crear elemento img con el base64
            const img = document.createElement('img');
            img.className = 'pdf-page-image';
            img.src = imageDataUrl;
            img.alt = `Page ${pageNum}`;
            
            container.appendChild(img);
        }
        
        if (pdf.numPages > 2) {
            const morePages = document.createElement('div');
            morePages.className = 'more-pages-indicator';
            morePages.textContent = `+ ${pdf.numPages - 2} more pages...`;
            container.appendChild(morePages);
        }
        
        return container.outerHTML;
    } catch (error) {
        throw new Error('Failed to render PDF: ' + error.message);
    }
}

// Renderizar DOCX y retornar HTML
async function renderDOCXPreviewToHTML(file) {
    try {
        if (typeof mammoth === 'undefined') {
            throw new Error('DOCX preview library (Mammoth.js) not loaded. Please refresh the page.');
        }
        
        const arrayBuffer = await file.arrayBuffer();
        
        console.log('Converting DOCX to HTML...');
        
        // Convertir DOCX a HTML usando mammoth.js
        const result = await mammoth.convertToHtml({arrayBuffer: arrayBuffer});
        
        console.log('Mammoth conversion complete');
        
        // Crear contenedor para el DOCX
        const docxContainer = document.createElement('div');
        docxContainer.className = 'docx-preview-wrapper';
        
        const docxContent = document.createElement('div');
        docxContent.className = 'docx-preview-content';
        docxContent.innerHTML = result.value;
        
        docxContainer.appendChild(docxContent);
        
        // Mostrar advertencias si las hay
        if (result.messages.length > 0) {
            console.warn('Conversion warnings:', result.messages);
        }
        
        return docxContainer.outerHTML;
    } catch (error) {
        console.error('DOCX render error:', error);
        throw new Error('Failed to render DOCX: ' + error.message);
    }
}

// Renderizar texto y retornar HTML
async function renderTextPreviewToHTML(file) {
    try {
        const text = await file.text();
        
        // Limitar a primeros 5000 caracteres para no sobrecargar
        const limitedText = text.length > 5000 ? text.substring(0, 5000) + '\n\n... (text truncated)' : text;
        
        const pre = document.createElement('pre');
        pre.className = 'text-preview-content';
        pre.textContent = limitedText;
        
        return pre.outerHTML;
    } catch (error) {
        throw new Error('Failed to render text file: ' + error.message);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// PROCESAMIENTO DE DOCUMENTOS
async function handleProcessAll() {
    const pendingItems = appState.documentsQueue.filter(item => 
        item.status === 'pending' || item.status === 'uploaded'
    );
    
    if (pendingItems.length === 0) {
        return;
    }
    
    // Deshabilitar botón
    elements.processAllBtn.disabled = true;
    elements.processAllBtn.textContent = 'Processing...';
    appState.isProcessing = true;
    
    // Procesar cada archivo
    for (const item of pendingItems) {
        // Verificar si el documento todavía existe en la cola (no fue eliminado)
        const stillInQueue = appState.documentsQueue.find(q => q.id === item.id);
        if (!stillInQueue) {
            console.log(`Document ${item.id} was removed from queue, skipping...`);
            continue;
        }
        
        // Verificar si el documento fue cancelado
        if (item.documentId && appState.cancelledDocuments.has(item.documentId)) {
            console.log(`Document ${item.documentId} was cancelled, skipping...`);
            continue;
        }
        
        if (item.status === 'pending') {
            // Subir archivo primero
            try {
                await uploadFileFromQueue(item);
            } catch (error) {
                console.error(`Error uploading ${item.fileName}:`, error);
                continue; // Saltar al siguiente documento
            }
        }
        
        // Verificar nuevamente después del upload
        const stillInQueueAfterUpload = appState.documentsQueue.find(q => q.id === item.id);
        if (!stillInQueueAfterUpload || (item.documentId && appState.cancelledDocuments.has(item.documentId))) {
            console.log(`Document ${item.id} was removed/cancelled during upload, skipping processing...`);
            continue;
        }
        
        if (item.documentId) {
            // Procesar documento
            try {
                await processDocumentFromQueue(item);
            } catch (error) {
                console.error(`Error processing ${item.fileName}:`, error);
                // Continuar con el siguiente documento
            }
        }
    }
    
    // Restaurar botón
    elements.processAllBtn.disabled = false;
    elements.processAllBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3V17M10 17L15 12M10 17L5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Process All Documents
    `;
    appState.isProcessing = false;
}

async function uploadFileFromQueue(item) {
    try {
        // Verificar si el item todavía existe en la cola
        const stillInQueue = appState.documentsQueue.find(q => q.id === item.id);
        if (!stillInQueue) {
            throw new Error('Document removed from queue');
        }
        
        // Actualizar estado a uploading
        item.status = 'uploading';
        updateQueueUI();
        
        // Subir archivo
        const documentId = await uploadFile(item.file);
        
        // Verificar nuevamente después del upload
        const stillInQueueAfterUpload = appState.documentsQueue.find(q => q.id === item.id);
        if (!stillInQueueAfterUpload) {
            throw new Error('Document removed from queue during upload');
        }
        
        if (documentId) {
            item.documentId = documentId;
            item.status = 'uploaded';
            updateQueueUI();
            return true;
        } else {
            item.status = 'error';
            updateQueueUI();
            return false;
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        // Solo actualizar estado si el item todavía está en la cola
        const stillInQueue = appState.documentsQueue.find(q => q.id === item.id);
        if (stillInQueue) {
            item.status = 'error';
            updateQueueUI();
        }
        return false;
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const data = await response.json();
        return data.document_id;
        
    } catch (error) {
        console.error('Upload error:', error);
        return null;
    }
}

// FUNCIONES AUXILIARES
// Función para extraer el nombre del afectado del Declaration Letter
function extractApplicantName(markdownContent) {
    // Buscar patrones comunes para extraer el nombre (solo 2-5 palabras)
    
    // Patrón 1: "I, [Nombre Apellido], declare..." o "I, [Nombre Apellido Apellido], declare..."
    let match = markdownContent.match(/I,\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,4}),\s+(?:declare|solemnly|state)/i);
    if (match) return cleanApplicantName(match[1].trim());
    
    // Patrón 2: "My name is [Nombre Apellido]"
    match = markdownContent.match(/My name is\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,4})(?:\.|,|\s+and)/i);
    if (match) return cleanApplicantName(match[1].trim());
    
    // Patrón 3: Buscar en el encabezado "DECLARATION OF [Nombre Apellido]" (antes de palabras como IN SUPPORT, FOR, etc.)
    match = markdownContent.match(/DECLARATION OF\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,4})(?:\s+(?:IN|FOR|TO|ON|REGARDING))?/i);
    if (match) return cleanApplicantName(match[1].trim());
    
    // Patrón 4: "I am [Nombre Apellido]"
    match = markdownContent.match(/I am\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,4})(?:\.|,|\s+and)/i);
    if (match) return cleanApplicantName(match[1].trim());
    
    // Patrón 5: Buscar nombre después de "Re:" o "RE:"
    match = markdownContent.match(/RE?:\s*(?:Application|Petition|Declaration|Case)\s+(?:of|for)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,4})/i);
    if (match) return cleanApplicantName(match[1].trim());
    
    // Si no se encuentra, retornar "Applicant"
    return "Applicant";
}

// Función auxiliar para limpiar el nombre del afectado
function cleanApplicantName(name) {
    // Eliminar palabras comunes que no son parte del nombre
    const unwantedWords = ['IN', 'SUPPORT', 'FOR', 'TO', 'ON', 'REGARDING', 'OF', 'THE', 'A', 'AN'];
    
    // Dividir el nombre en palabras
    const words = name.split(/\s+/);
    
    // Filtrar palabras no deseadas y reconstruir el nombre
    const cleanedWords = words.filter(word => !unwantedWords.includes(word.toUpperCase()));
    
    return cleanedWords.join(' ').trim();
}

// Función para actualizar el título del panel con el nombre del afectado
function updatePanelTitle(documentId, applicantName) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const titleElement = panel.querySelector('.document-panel-title');
    if (titleElement) {
        titleElement.textContent = `Cover and Declaration Letter [${applicantName}]`;
    }
    
    // También actualizar el tab con SOLO el nombre del afectado
    const tab = document.querySelector(`.tab-button[data-document-id="${documentId}"]`);
    if (tab) {
        const tabTitle = tab.querySelector('.document-tab-title');
        if (tabTitle) {
            tabTitle.textContent = applicantName;
        }
    }
}

// Función para agregar botones de descarga a la sección de descarga
function addDownloadButtonToHeader(documentId, documentType, label) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const buttonsContainer = panel.querySelector('.download-buttons-container');
    if (!buttonsContainer) return;
    
    // Verificar si el botón ya existe
    const existingBtn = buttonsContainer.querySelector(`.download-${documentType}-btn-header`);
    if (existingBtn) return;
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = `btn btn-primary btn-sm download-${documentType}-btn-header`;
    downloadBtn.onclick = () => downloadDocument(documentId, documentType);
    downloadBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3V13M10 13L14 9M10 13L6 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        ${label}
    `;
    
    // Si es el botón de Cover Letter, ocultarlo inicialmente (se muestra solo cuando se activa su pestaña)
    if (documentType === 'cover') {
        downloadBtn.style.display = 'none';
    }
    
    buttonsContainer.appendChild(downloadBtn);
}

// FUNCIONES DE PROCESAMIENTO
async function processDocumentFromQueue(item) {
    try {
        // Verificar si el documento fue cancelado
        if (appState.cancelledDocuments.has(item.documentId)) {
            console.log(`Document ${item.documentId} was cancelled, aborting processing`);
            throw new Error('Document was cancelled');
        }
        
        // Verificar si todavía está en la cola
        const stillInQueue = appState.documentsQueue.find(q => q.id === item.id);
        if (!stillInQueue) {
            console.log(`Document ${item.id} was removed from queue, aborting processing`);
            throw new Error('Document removed from queue');
        }
        
        // Actualizar estado
        item.status = 'processing';
        updateQueueUI();
        
        // Mostrar sección de preview y crear tab
        showPreviewSection();
        createDocumentTab(item.documentId, item.fileName);
        
        // Procesar con streaming
        await processDocumentStream(item.documentId, item.fileName);
        
        // Verificar nuevamente después del procesamiento
        const stillInQueueAfterProcess = appState.documentsQueue.find(q => q.id === item.id);
        if (!stillInQueueAfterProcess || appState.cancelledDocuments.has(item.documentId)) {
            console.log(`Document ${item.id} was removed/cancelled after processing, not marking as completed`);
            return;
        }
        
        // Actualizar estado
        item.status = 'completed';
        updateQueueUI();
        
    } catch (error) {
        console.error('Error processing document:', error);
        
        // Solo actualizar si el documento todavía está en la cola y no fue cancelado
        const stillInQueue = appState.documentsQueue.find(q => q.id === item.id);
        if (stillInQueue && !appState.cancelledDocuments.has(item.documentId)) {
            item.status = 'error';
            updateQueueUI();
            showError(`Error processing ${item.fileName}: ${error.message}`);
        }
    }
}

async function processDocumentStream(documentId, fileName) {
    return new Promise((resolve, reject) => {
        const streamUrl = buildAPIUrl(`/api/process/${documentId}/stream`, null);
        const eventSource = new EventSource(streamUrl);
        let fullContent = '';
        let chunkBuffer = '';
        let isFirstChunk = true;
        
        // Guardar referencia al EventSource para poder cancelarlo
        if (!appState.activeStreams[documentId]) {
            appState.activeStreams[documentId] = {};
        }
        appState.activeStreams[documentId].declaration = eventSource;
        
        // Inicializar panel del documento
        initializeDocumentPanel(documentId, fileName);
        
        // Mostrar spinner de carga
        showLoadingSpinner(documentId);
        
        // Bloquear botones mientras genera
        disableDocumentButtons(documentId);
        
        eventSource.onmessage = function(event) {
            try {
                // Verificar si el documento fue cancelado
                if (appState.cancelledDocuments.has(documentId)) {
                    console.log(`Document ${documentId} was cancelled, closing stream`);
                    eventSource.close();
                    if (appState.activeStreams[documentId]) {
                        delete appState.activeStreams[documentId].declaration;
                    }
                    hideLoadingSpinner(documentId);
                    reject(new Error('Document was cancelled by user'));
                    return;
                }
                
                const data = JSON.parse(event.data);
                
                if (data.type === 'content' && data.chunk) {
                    // Verificar cancelación antes de procesar chunk
                    if (appState.cancelledDocuments.has(documentId)) {
                        eventSource.close();
                        if (appState.activeStreams[documentId]) {
                            delete appState.activeStreams[documentId].declaration;
                        }
                        hideLoadingSpinner(documentId);
                        reject(new Error('Document was cancelled by user'));
                        return;
                    }
                    
                    // Si es el primer chunk, ocultar spinner
                    if (isFirstChunk) {
                        hideLoadingSpinner(documentId);
                        isFirstChunk = false;
                    }
                    
                    fullContent += data.chunk;
                    chunkBuffer += data.chunk;
                    
                    // Simular velocidad de escritura (como ChatGPT)
                    simulateTypingEffect(documentId, 'declaration', chunkBuffer);
                    
                } else if (data.type === 'complete') {
                    // Verificar una última vez antes de completar
                    if (appState.cancelledDocuments.has(documentId)) {
                        eventSource.close();
                        if (appState.activeStreams[documentId]) {
                            delete appState.activeStreams[documentId].declaration;
                        }
                        reject(new Error('Document was cancelled by user'));
                        return;
                    }
                    
                    eventSource.close();
                    // Limpiar referencia al stream
                    if (appState.activeStreams[documentId]) {
                        delete appState.activeStreams[documentId].declaration;
                    }
                    
                    // Asegurar que todo el contenido se muestre
                    updateDocumentContent(documentId, 'declaration', fullContent);
                    
                    // Extraer nombre del afectado y actualizar título del panel
                    const applicantName = extractApplicantName(fullContent);
                    updatePanelTitle(documentId, applicantName);
                    
                    // Guardar en estado
                    appState.processedDocuments[documentId] = {
                        fileName: fileName,
                        applicantName: applicantName,
                        declarationContent: fullContent,
                        coverLetterContent: null,
                        generatedFilename: data.filename
                    };
                    
                    // Habilitar botones de Declaration (Download)
                    enableDeclarationButtons(documentId);
                    
                    // Generar Cover Letter automáticamente después de completar Declaration Letter
                    // Esperamos a que se complete el Cover Letter antes de resolver
                    generateCoverLetterAutomatically(documentId)
                        .then(() => {
                            resolve();
                        })
                        .catch((coverError) => {
                            console.error('Error generating cover letter:', coverError);
                            // Aún así resolvemos para no bloquear el procesamiento de otros documentos
                            resolve();
                        });
                } else if (data.type === 'error' || data.error) {
                    eventSource.close();
                    // Limpiar referencia al stream
                    if (appState.activeStreams[documentId]) {
                        delete appState.activeStreams[documentId].declaration;
                    }
                    hideLoadingSpinner(documentId);
                    enableDeclarationButtons(documentId); // Habilitar para permitir reintentos
                    reject(new Error(data.error || 'Processing error'));
                }
            } catch (parseError) {
                eventSource.close();
                // Limpiar referencia al stream
                if (appState.activeStreams[documentId]) {
                    delete appState.activeStreams[documentId].declaration;
                }
                hideLoadingSpinner(documentId);
                enableDeclarationButtons(documentId);
                reject(parseError);
            }
        };
        
        eventSource.onerror = function(error) {
            eventSource.close();
            // Limpiar referencia al stream
            if (appState.activeStreams[documentId]) {
                delete appState.activeStreams[documentId].declaration;
            }
            hideLoadingSpinner(documentId);
            enableDeclarationButtons(documentId);
            if (!fullContent) {
                reject(new Error('Connection lost'));
            } else {
                resolve();  // Si ya hay contenido, considerar exitoso
            }
        };
    });
}

// Simular efecto de escritura gradual
let typingIntervals = {};

function simulateTypingEffect(documentId, type, content) {
    // Limpiar intervalo anterior si existe
    if (typingIntervals[documentId]) {
        clearTimeout(typingIntervals[documentId]);
    }
    
    // Actualizar inmediatamente pero con un pequeño delay para suavizar
    typingIntervals[documentId] = setTimeout(() => {
        updateDocumentContent(documentId, type, content);
        autoScrollToBottom(documentId);
    }, 30); // 30ms de delay entre actualizaciones para efecto más natural
}

function showLoadingSpinner(documentId) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const declarationContent = panel.querySelector('.declaration-content');
    if (!declarationContent) return;
    
    declarationContent.innerHTML = `
        <div class="streaming-loader">
            <div class="spinner-typing"></div>
            <p style="color: #6b7280; font-style: italic; margin-top: 1rem;">Generating document...</p>
        </div>
    `;
}

function hideLoadingSpinner(documentId) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const declarationContent = panel.querySelector('.declaration-content');
    if (!declarationContent) return;
    
    // Limpiar solo si hay spinner
    const loader = declarationContent.querySelector('.streaming-loader');
    if (loader) {
        declarationContent.innerHTML = '';
    }
}

// GESTIÓN DE ESTADO DE BOTONES
function disableDocumentButtons(documentId) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const downloadBtn = panel.querySelector('.download-declaration-btn');
    
    if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.5';
        downloadBtn.style.cursor = 'not-allowed';
    }
}

function enableDeclarationButtons(documentId) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    // Agregar botón de descarga al header superior derecho
    addDownloadButtonToHeader(documentId, 'declaration', 'Download Declaration');
    

}

// UI DE TABS Y PANELES
function showPreviewSection() {
    elements.previewSection.classList.remove('hidden');
    elements.documentsTabs.classList.remove('hidden');
    elements.previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function createDocumentTab(documentId, fileName) {
    // Crear botón de tab
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button';
    tabButton.dataset.documentId = documentId;
    tabButton.innerHTML = `
        <span class="document-tab-title">Processing...</span>
        <span class="tab-close" onclick="closeDocumentTab(${documentId}, event)">✕</span>
    `;
    tabButton.addEventListener('click', () => switchToDocument(documentId));
    
    elements.tabsHeader.appendChild(tabButton);
    
    // Activar este tab
    switchToDocument(documentId);
}

function switchToDocument(documentId) {
    // Actualizar tabs activos
    document.querySelectorAll('.tab-button').forEach(tab => {
        if (tab.dataset.documentId == documentId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Actualizar paneles activos
    document.querySelectorAll('.document-panel').forEach(panel => {
        if (panel.dataset.documentId == documentId) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
    
    appState.activeDocumentId = documentId;
    
    // Mostrar botón de chat cuando hay un documento activo
    showChatButton();
}

function closeDocumentTab(documentId, event) {
    event.stopPropagation();
    
    // Marcar como cancelado y cerrar streams si están activos
    if (appState.activeStreams[documentId]) {
        if (appState.activeStreams[documentId].declaration) {
            appState.activeStreams[documentId].declaration.close();
            delete appState.activeStreams[documentId].declaration;
        }
        if (appState.activeStreams[documentId].cover) {
            appState.activeStreams[documentId].cover.close();
            delete appState.activeStreams[documentId].cover;
        }
        delete appState.activeStreams[documentId];
    }
    
    // Eliminar tab
    const tab = document.querySelector(`.tab-button[data-document-id="${documentId}"]`);
    if (tab) tab.remove();
    
    // Eliminar panel
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (panel) panel.remove();
    
    // Eliminar de estado
    delete appState.processedDocuments[documentId];
    
    // Limpiar del Set de cancelados (liberar memoria)
    appState.cancelledDocuments.delete(documentId);
    
    // Si era el activo, activar otro
    if (appState.activeDocumentId == documentId) {
        const remainingTabs = document.querySelectorAll('.tab-button');
        if (remainingTabs.length > 0) {
            const firstTab = remainingTabs[0];
            switchToDocument(firstTab.dataset.documentId);
        } else {
            // No quedan documentos, ocultar sección
            elements.previewSection.classList.add('hidden');
            elements.documentsTabs.classList.add('hidden');
        }
    }
}

window.closeDocumentTab = closeDocumentTab;

function initializeDocumentPanel(documentId, fileName) {
    // Crear panel del documento
    const panel = document.createElement('div');
    panel.className = 'document-panel active';
    panel.dataset.documentId = documentId;
    
    panel.innerHTML = `
        <div class="document-panel-header">
            <div class="document-panel-header-left">
                <div class="document-panel-title">Cover and Declaration Letter [Processing...]</div>
                <div class="document-panel-subtitle">Generated documents</div>
            </div>
            <div class="document-panel-header-right">
                <div class="document-type-tabs">
                    <button class="document-type-tab active" onclick="switchDocumentType(${documentId}, 'declaration')">
                        Declaration Letter
                    </button>
                    <button class="document-type-tab" onclick="switchDocumentType(${documentId}, 'cover')" disabled>
                        Cover Letter
                    </button>
                </div>
                <div class="document-controls-wrapper">
                    <div class="document-download-section">
                        <div class="download-buttons-container">
                            <!-- Botones de descarga se agregarán aquí dinámicamente -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="document-panel-body">
            <div class="document-content declaration-content" contenteditable="true" style="max-height: 600px; overflow-y: auto;">
                <p style="color: #6b7280; font-style: italic;">Generating document in real-time...</p>
            </div>
            <div class="document-content cover-content hidden" contenteditable="true" style="max-height: 600px; overflow-y: auto;">
                <!-- Cover Letter content -->
            </div>
        </div>

    `;
    
    elements.documentsViewer.appendChild(panel);
}

function updateDocumentContent(documentId, type, content) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const contentEl = panel.querySelector(`.${type}-content`);
    if (!contentEl) return;
    
    contentEl.innerHTML = convertMarkdownToHTML(content);
}

// Auto-scroll suave mientras se genera contenido
function autoScrollToBottom(documentId) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const declarationContent = panel.querySelector('.declaration-content');
    if (!declarationContent) return;
    
    // Scroll suave hacia el final
    declarationContent.scrollTo({
        top: declarationContent.scrollHeight,
        behavior: 'smooth'
    });
}

function convertMarkdownToHTML(markdownContent) {
    let html = markdownContent;
    
    // Convertir encabezados
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Convertir negritas e itálicas
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convertir párrafos
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
        if (line.trim() === '') {
            return '<br>';
        } else if (line.startsWith('<h1>') || line.startsWith('<h2>')) {
            return line;
        } else {
            return `<p>${line}</p>`;
        }
    });
    
    return processedLines.join('\n');
}

// Función para generar Cover Letter automáticamente (sin intervención del usuario)
async function generateCoverLetterAutomatically(documentId) {
    // Verificar si el documento fue cancelado antes de iniciar
    if (appState.cancelledDocuments.has(documentId)) {
        console.log(`Document ${documentId} was cancelled, skipping Cover Letter generation`);
        return;
    }
    
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const coverTab = panel.querySelector('.document-type-tab:nth-child(2)');
    const coverContent = panel.querySelector('.cover-content');
    
    // Cambiar a tab de Cover Letter
    switchDocumentType(documentId, 'cover');
    coverTab.disabled = false;
    
    // Mostrar mensaje de generación
    coverContent.innerHTML = '<p style="color: #6b7280; font-style: italic;">Generating Cover Letter automatically...</p>';
    
    try {
        // Verificar nuevamente antes de generar
        if (appState.cancelledDocuments.has(documentId)) {
            console.log(`Document ${documentId} was cancelled, aborting Cover Letter generation`);
            return;
        }
        
        // Generar con streaming
        await generateCoverLetterStream(documentId);
        
    } catch (error) {
        // Solo mostrar error si el documento no fue cancelado
        if (!appState.cancelledDocuments.has(documentId)) {
            showError(`Error generating Cover Letter: ${error.message}`);
        }
    }
}

function switchDocumentType(documentId, type) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    // Actualizar estado global del tipo de documento activo
    appState.activeDocumentType = type;
    
    // Actualizar tabs de tipo
    panel.querySelectorAll('.document-type-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Obtener botones de descarga
    const declarationBtn = panel.querySelector('.download-declaration-btn-header');
    const coverBtn = panel.querySelector('.download-cover-btn-header');
    
    if (type === 'declaration') {
        panel.querySelector('.document-type-tab:nth-child(1)').classList.add('active');
        panel.querySelector('.declaration-content').classList.remove('hidden');
        panel.querySelector('.cover-content').classList.add('hidden');
        
        // Mostrar solo el botón de Declaration
        if (declarationBtn) declarationBtn.style.display = 'inline-flex';
        if (coverBtn) coverBtn.style.display = 'none';
    } else {
        panel.querySelector('.document-type-tab:nth-child(2)').classList.add('active');
        panel.querySelector('.declaration-content').classList.add('hidden');
        panel.querySelector('.cover-content').classList.remove('hidden');
        
        // Mostrar solo el botón de Cover Letter
        if (declarationBtn) declarationBtn.style.display = 'none';
        if (coverBtn) coverBtn.style.display = 'inline-flex';
    }
}

window.switchDocumentType = switchDocumentType;

// ACCIONES DE DOCUMENTOS
async function downloadDocument(documentId, type) {
    // Obtener el contenido actual del DOM (puede haber sido editado por el usuario)
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) {
        showError('Document panel not found');
        return;
    }
    
    const contentEl = panel.querySelector(`.${type}-content`);
    if (!contentEl) {
        showError('Document content not found');
        return;
    }
    
    // Extraer el texto del HTML (incluyendo cualquier edición)
    const htmlContent = contentEl.innerHTML;
    const textContent = extractTextFromHTML(htmlContent);
    
    // Obtener el nombre del afectado para el filename
    let applicantName = "Applicant";
    if (appState.processedDocuments[documentId]) {
        applicantName = appState.processedDocuments[documentId].applicantName || "Applicant";
    }
    
    // Crear el nombre del archivo según la estructura solicitada
    const documentTypePrefix = type === 'declaration' ? 'DeclarationLetter' : 'CoverLetter';
    const filename = `${documentTypePrefix}[${applicantName}]_draft.docx`;
    
    try {
        // Enviar el contenido actual al backend para convertirlo a DOCX
        const response = await fetch(`${API_BASE_URL}/api/download-edited/${documentId}/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: textContent })
        });
        
        if (response.ok) {
            // Descargar el archivo
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            showError('Error downloading document');
        }
    } catch (error) {
        console.error('Error downloading document:', error);
        showError('Error downloading document');
    }
}

window.downloadDocument = downloadDocument;

async function generateCoverLetterStream(documentId) {
    return new Promise((resolve, reject) => {
        const streamUrl = buildAPIUrl(`/api/generate-cover-letter/${documentId}/stream`, null);
        const eventSource = new EventSource(streamUrl);
        let fullContent = '';
        let chunkBuffer = '';
        let isFirstChunk = true;
        
        // Guardar referencia al EventSource para poder cancelarlo
        if (!appState.activeStreams[documentId]) {
            appState.activeStreams[documentId] = {};
        }
        appState.activeStreams[documentId].cover = eventSource;
        
        // Mostrar spinner para Cover Letter
        const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
        const coverContent = panel?.querySelector('.cover-content');
        if (coverContent) {
            coverContent.innerHTML = `
                <div class="streaming-loader">
                    <div class="spinner-typing"></div>
                    <p style="color: #6b7280; font-style: italic; margin-top: 1rem;">Generating Cover Letter...</p>
                </div>
            `;
        }
        
        eventSource.onmessage = function(event) {
            try {
                // Verificar si el documento fue cancelado
                if (appState.cancelledDocuments.has(documentId)) {
                    console.log(`Document ${documentId} was cancelled, closing Cover Letter stream`);
                    eventSource.close();
                    if (appState.activeStreams[documentId]) {
                        delete appState.activeStreams[documentId].cover;
                    }
                    reject(new Error('Document was cancelled by user'));
                    return;
                }
                
                const data = JSON.parse(event.data);
                
                if (data.type === 'content' && data.chunk) {
                    // Verificar cancelación antes de procesar chunk
                    if (appState.cancelledDocuments.has(documentId)) {
                        eventSource.close();
                        if (appState.activeStreams[documentId]) {
                            delete appState.activeStreams[documentId].cover;
                        }
                        reject(new Error('Document was cancelled by user'));
                        return;
                    }
                    
                    // Si es el primer chunk, limpiar spinner
                    if (isFirstChunk) {
                        if (coverContent) coverContent.innerHTML = '';
                        isFirstChunk = false;
                    }
                    
                    fullContent += data.chunk;
                    chunkBuffer += data.chunk;
                    
                    // Efecto de escritura gradual para Cover Letter
                    simulateTypingEffectCover(documentId, chunkBuffer);
                    
                } else if (data.type === 'complete') {
                    // Verificar una última vez antes de completar
                    if (appState.cancelledDocuments.has(documentId)) {
                        eventSource.close();
                        if (appState.activeStreams[documentId]) {
                            delete appState.activeStreams[documentId].cover;
                        }
                        reject(new Error('Document was cancelled by user'));
                        return;
                    }
                    
                    eventSource.close();
                    // Limpiar referencia al stream
                    if (appState.activeStreams[documentId]) {
                        delete appState.activeStreams[documentId].cover;
                    }
                    
                    // Asegurar que todo el contenido se muestre
                    updateDocumentContent(documentId, 'cover', fullContent);
                    
                    // Guardar en estado
                    if (appState.processedDocuments[documentId]) {
                        appState.processedDocuments[documentId].coverLetterContent = fullContent;
                        appState.processedDocuments[documentId].coverLetterFilename = data.filename;
                    }
                    
                    // Agregar botón de descarga del Cover Letter al header
                    addDownloadButtonToHeader(documentId, 'cover', 'Download Cover Letter');
                    
                    resolve();
                } else if (data.type === 'error' || data.error) {
                    eventSource.close();
                    // Limpiar referencia al stream
                    if (appState.activeStreams[documentId]) {
                        delete appState.activeStreams[documentId].cover;
                    }
                    reject(new Error(data.error || 'Error generating Cover Letter'));
                }
            } catch (parseError) {
                eventSource.close();
                // Limpiar referencia al stream
                if (appState.activeStreams[documentId]) {
                    delete appState.activeStreams[documentId].cover;
                }
                reject(parseError);
            }
        };
        
        eventSource.onerror = function(error) {
            eventSource.close();
            // Limpiar referencia al stream
            if (appState.activeStreams[documentId]) {
                delete appState.activeStreams[documentId].cover;
            }
            if (!fullContent) {
                reject(new Error('Connection lost'));
            } else {
                resolve();
            }
        };
    });
}

// Typing effect para Cover Letter con auto-scroll
let typingIntervalsCover = {};

function simulateTypingEffectCover(documentId, content) {
    if (typingIntervalsCover[documentId]) {
        clearTimeout(typingIntervalsCover[documentId]);
    }
    
    typingIntervalsCover[documentId] = setTimeout(() => {
        updateDocumentContent(documentId, 'cover', content);
        
        // Auto-scroll para Cover Letter
        const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
        const coverContent = panel?.querySelector('.cover-content');
        if (coverContent) {
            coverContent.scrollTo({
                top: coverContent.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, 30);
}

// Función auxiliar para extraer texto limpio del HTML y reconstruir markdown
function extractTextFromHTML(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let markdown = '';
    
    // Procesar cada elemento hijo
    tempDiv.childNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            const textContent = node.textContent.trim();
            
            if (!textContent) {
                markdown += '\n';
                return;
            }
            
            // Convertir encabezados de HTML a markdown
            if (tagName === 'h1') {
                markdown += `# ${textContent}\n\n`;
            } else if (tagName === 'h2') {
                markdown += `## ${textContent}\n\n`;
            } else if (tagName === 'h3') {
                markdown += `### ${textContent}\n\n`;
            } else if (tagName === 'h4') {
                markdown += `#### ${textContent}\n\n`;
            } else if (tagName === 'p') {
                markdown += `${textContent}\n\n`;
            } else if (tagName === 'div') {
                // Para divs, procesar recursivamente
                markdown += extractTextFromHTML(node.innerHTML);
            } else {
                markdown += `${textContent}\n\n`;
            }
        } else if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text) {
                markdown += `${text}\n\n`;
            }
        }
    });
    
    // Limpiar múltiples líneas vacías consecutivas
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    
    return markdown.trim();
}

// MANEJO DE ERRORES
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorModal.classList.remove('hidden');
}

function closeErrorModal() {
    elements.errorModal.classList.add('hidden');
}

// MODAL DE AJUSTES
function openSettingsModal() {
    elements.settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
    elements.settingsModal.classList.add('hidden');
    // Limpiar campos y mensajes de error
    elements.settingsPassword.value = '';
    hideSettingsError();
}

function showSettingsError(message) {
    if (elements.settingsErrorMessage) {
        elements.settingsErrorMessage.textContent = message;
        elements.settingsErrorMessage.classList.remove('hidden');
    }
}

function hideSettingsError() {
    if (elements.settingsErrorMessage) {
        elements.settingsErrorMessage.classList.add('hidden');
        elements.settingsErrorMessage.textContent = '';
    }
}

async function handleChangeAiModel() {
    const selectedModel = elements.aiModelSelect.value;
    const password = elements.settingsPassword.value;
    
    // Limpiar error anterior
    hideSettingsError();
    
    // Validar contraseña
    if (password !== '4767') {
        showSettingsError('Incorrect password. Please try again.');
        return;
    }
    
    try {
        // Verificar que el proveedor esté disponible
        const response = await fetch(`${API_BASE_URL}/api/providers`);
        const data = await response.json();
        
        if (!data.success || !data.providers.includes(selectedModel)) {
            showSettingsError(`Provider '${selectedModel}' is not available. Please configure the API keys.`);
            return;
        }
        
        // Cambiar el proveedor usando la función del estado global
        setSelectedAIProvider(selectedModel);
        
        // Mostrar mensaje de éxito
        const modelName = selectedModel === 'google_gemini' ? 'Google Gemini' : 'Groq AI';
        
        // Cerrar modal
        closeSettingsModal();
        
        // Mostrar notificación de éxito
        showSuccessNotification(`AI Model changed to ${modelName} successfully!`);
        
        console.log(`AI Model changed to: ${selectedModel}`);
        
    } catch (error) {
        console.error('Error changing AI provider:', error);
        showSettingsError('Error verifying provider availability');
    }
}

function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = '✓ ' + message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// SISTEMA DE CHAT CON MEMORIA
const chatElements = {
    fab: document.getElementById('chatFab'),
    modal: document.getElementById('chatModal'),
    closeBtn: document.getElementById('closeChatBtn'),
    messages: document.getElementById('chatMessages'),
    input: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendChatBtn')
};

let chatHistory = [];

// Mostrar el botón de chat cuando hay un documento activo
function showChatButton() {
    if (appState.activeDocumentId && chatElements.fab) {
        chatElements.fab.classList.remove('hidden');
    }
}

// Ocultar el botón de chat
function hideChatButton() {
    if (chatElements.fab) {
        chatElements.fab.classList.add('hidden');
    }
}

// Abrir modal de chat
function openChatModal() {
    if (chatElements.modal) {
        chatElements.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Limpiar el mensaje de bienvenida si hay historial
        if (chatHistory.length > 0) {
            const welcome = chatElements.messages.querySelector('.chat-welcome');
            if (welcome) {
                welcome.remove();
            }
        }
        
        // Focus en el input
        setTimeout(() => {
            if (chatElements.input) {
                chatElements.input.focus();
            }
        }, 300);
    }
}

// Cerrar modal de chat
function closeChatModal() {
    if (chatElements.modal) {
        chatElements.modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Agregar mensaje al chat
function addChatMessage(content, isUser = false, hasApplyButton = false, modifiedText = null) {
    // Remover mensaje de bienvenida si existe
    const welcome = chatElements.messages.querySelector('.chat-welcome');
    if (welcome) {
        welcome.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`;
    
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`;
    
    // Formatear el contenido
    let formattedContent;
    if (isUser) {
        // Mensajes del usuario: formateo simple
        formattedContent = content
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    } else {
        // Mensajes del asistente: usar el mismo renderizado que document-preview
        formattedContent = convertMarkdownToHTML(content);
    }
    
    bubble.innerHTML = formattedContent;
    
    // Agregar botón de aplicar si es necesario
    if (hasApplyButton && modifiedText) {
        const applyBtn = document.createElement('button');
        applyBtn.className = 'chat-apply-btn';
        applyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Apply to Document
        `;
        applyBtn.onclick = () => applyModification(modifiedText);
        bubble.appendChild(applyBtn);
    }
    
    messageDiv.appendChild(bubble);
    chatElements.messages.appendChild(messageDiv);
    
    // Scroll al final
    chatElements.messages.scrollTop = chatElements.messages.scrollHeight;
    
    // Guardar en historial
    chatHistory.push({
        content: content,
        isUser: isUser,
        timestamp: new Date()
    });
}

// Mostrar indicador de "escribiendo"
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message chat-message-assistant';
    typingDiv.id = 'typingIndicator';
    
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble chat-bubble-assistant chat-typing';
    typingBubble.innerHTML = `
        <div class="chat-typing-dot"></div>
        <div class="chat-typing-dot"></div>
        <div class="chat-typing-dot"></div>
    `;
    
    typingDiv.appendChild(typingBubble);
    chatElements.messages.appendChild(typingDiv);
    chatElements.messages.scrollTop = chatElements.messages.scrollHeight;
}

// Ocultar indicador de "escribiendo"
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Enviar mensaje al chat con streaming
async function sendChatMessage() {
    const message = chatElements.input.value.trim();
    
    if (!message) return;
    
    if (!appState.activeDocumentId) {
        showError('No document selected. Please select a document first.');
        return;
    }
    
    // Agregar mensaje del usuario
    addChatMessage(message, true);
    
    // Limpiar input
    chatElements.input.value = '';
    chatElements.input.style.height = 'auto';
    
    // Deshabilitar input y botón
    chatElements.input.disabled = true;
    chatElements.sendBtn.disabled = true;
    
    // Crear placeholder para la respuesta del asistente
    const responsePlaceholder = createChatMessagePlaceholder();
    
    try {
        // Construir la URL con el cuerpo del mensaje como parámetros POST
        const requestBody = {
            message: message,
            document_id: appState.activeDocumentId,
            document_type: appState.activeDocumentType,
            user_id: `user_${appState.activeDocumentId}`
        };
        
        // Crear conexión SSE usando fetch + ReadableStream
        const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error('Chat stream request failed');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';
        let hasModification = false;
        let modifiedText = null;
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            // Decodificar el chunk
            buffer += decoder.decode(value, { stream: true });
            
            // Procesar líneas completas
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Guardar línea incompleta
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'content' && data.chunk) {
                            fullResponse += data.chunk;
                            updateChatMessagePlaceholder(responsePlaceholder, fullResponse);
                            
                        } else if (data.type === 'complete') {
                            hasModification = data.has_modification || false;
                            modifiedText = data.modified_text || null;
                            
                        } else if (data.type === 'error') {
                            removeChatMessagePlaceholder(responsePlaceholder);
                            showError(data.error || 'Error in chat response');
                            return;
                        }
                    } catch (parseError) {
                        console.error('Error parsing SSE data:', parseError);
                    }
                }
            }
        }
        
        // Finalizar el mensaje con el botón de aplicar si hay modificación
        finalizeChatMessage(responsePlaceholder, fullResponse, hasModification, modifiedText);
        
    } catch (error) {
        console.error('Chat streaming error:', error);
        removeChatMessagePlaceholder(responsePlaceholder);
        showError('Failed to communicate with AI assistant');
    } finally {
        // Rehabilitar input y botón
        chatElements.input.disabled = false;
        chatElements.sendBtn.disabled = false;
        chatElements.input.focus();
    }
}

// Crear placeholder para mensaje del asistente
function createChatMessagePlaceholder() {
    // Remover mensaje de bienvenida si existe
    const welcome = chatElements.messages.querySelector('.chat-welcome');
    if (welcome) {
        welcome.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message chat-message-assistant';
    messageDiv.dataset.placeholder = 'true';
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble-assistant';
    bubble.innerHTML = '<span class="chat-cursor">▊</span>';
    
    messageDiv.appendChild(bubble);
    chatElements.messages.appendChild(messageDiv);
    
    // Scroll al final
    chatElements.messages.scrollTop = chatElements.messages.scrollHeight;
    
    return messageDiv;
}

// Actualizar el placeholder con el contenido acumulado
function updateChatMessagePlaceholder(placeholder, content) {
    const bubble = placeholder.querySelector('.chat-bubble');
    if (!bubble) return;
    
    // Formatear el contenido usando el mismo renderizado que document-preview
    let formattedContent = convertMarkdownToHTML(content);
    
    // Agregar cursor parpadeante al final
    bubble.innerHTML = formattedContent + '<span class="chat-cursor">▊</span>';
    
    // Scroll al final
    chatElements.messages.scrollTop = chatElements.messages.scrollHeight;
}

// Finalizar el mensaje (quitar cursor y agregar botón si es necesario)
function finalizeChatMessage(placeholder, content, hasModification, modifiedText) {
    const bubble = placeholder.querySelector('.chat-bubble');
    if (!bubble) return;
    
    // Remover el atributo de placeholder
    placeholder.removeAttribute('data-placeholder');
    
    // Formatear el contenido usando el mismo renderizado que document-preview
    let formattedContent = convertMarkdownToHTML(content);
    
    bubble.innerHTML = formattedContent;
    
    // Agregar botón de aplicar si es necesario
    if (hasModification && modifiedText) {
        const applyBtn = document.createElement('button');
        applyBtn.className = 'chat-apply-btn';
        applyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Apply to Document
        `;
        applyBtn.onclick = () => applyModification(modifiedText);
        bubble.appendChild(applyBtn);
    }
    
    // Scroll al final
    chatElements.messages.scrollTop = chatElements.messages.scrollHeight;
}

// Remover el placeholder en caso de error
function removeChatMessagePlaceholder(placeholder) {
    if (placeholder && placeholder.parentNode) {
        placeholder.remove();
    }
}

// Aplicar modificación al documento
function applyModification(modifiedText) {
    if (!modifiedText) {
        showError('No modified text provided');
        return;
    }
    
    const panel = document.querySelector(`.document-panel[data-document-id="${appState.activeDocumentId}"]`);
    if (!panel) {
        showError('Document panel not found');
        return;
    }
    
    const contentEl = panel.querySelector(`.${appState.activeDocumentType}-content`);
    if (!contentEl) {
        showError('Document content not found');
        return;
    }
    
    // Validar que el texto modificado no sea demasiado corto (posible fragmento)
    const currentContent = extractTextFromHTML(contentEl.innerHTML);
    const modifiedTextLength = modifiedText.length;
    const currentContentLength = currentContent.length;
    
    // Si el texto modificado es menos del 30% del contenido actual, advertir
    if (modifiedTextLength < currentContentLength * 0.3 && currentContentLength > 500) {
        const confirmApply = confirm(
            'Warning: The modified text appears to be shorter than expected.\n\n' +
            'This might indicate that only a fragment was provided instead of the complete document.\n\n' +
            'Do you want to apply these changes anyway?\n\n' +
            `Current document: ${currentContentLength} characters\n` +
            `Modified text: ${modifiedTextLength} characters`
        );
        
        if (!confirmApply) {
            return;
        }
    }
    
    // Convertir el texto modificado a HTML (markdown básico)
    // IMPORTANTE: modifiedText debe contener el DOCUMENTO COMPLETO con las modificaciones integradas
    const htmlContent = convertMarkdownToHTML(modifiedText);
    
    // Reemplazar TODO el contenido con el documento modificado completo
    contentEl.innerHTML = htmlContent;
    
    // Actualizar el contenido en el estado de la aplicación
    if (appState.processedDocuments[appState.activeDocumentId]) {
        if (appState.activeDocumentType === 'declaration') {
            appState.processedDocuments[appState.activeDocumentId].declarationContent = modifiedText;
        } else if (appState.activeDocumentType === 'cover') {
            appState.processedDocuments[appState.activeDocumentId].coverLetterContent = modifiedText;
        }
    }
    
    // Cerrar modal y mostrar notificación
    closeChatModal();
    
    // Crear notificación de éxito
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = '✓ Changes applied to document!';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Event Listeners
if (chatElements.fab) {
    chatElements.fab.addEventListener('click', openChatModal);
}

if (chatElements.closeBtn) {
    chatElements.closeBtn.addEventListener('click', closeChatModal);
}

if (chatElements.modal) {
    chatElements.modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('chat-modal-overlay')) {
            closeChatModal();
        }
    });
}

if (chatElements.sendBtn) {
    chatElements.sendBtn.addEventListener('click', sendChatMessage);
}

if (chatElements.input) {
    // Auto-resize textarea
    chatElements.input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Enviar con Enter (Shift+Enter para nueva línea)
    chatElements.input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

console.log('DeclarationLetterOnline (Multi-Document) - Script loaded');
