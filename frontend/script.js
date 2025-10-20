/**
 * DeclarationLetterOnline - Frontend JavaScript (Multi-Document Version)
 * Maneja la interacción del usuario y comunicación con el backend
 */

// ==========================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ==========================================

const API_BASE_URL = window.location.origin;

// Estado de la aplicación
const appState = {
    documentsQueue: [],  // Cola de archivos listos para procesar
    processedDocuments: {},  // Documentos ya procesados {documentId: {data}}
    activeDocumentId: null,  // ID del documento actualmente visible
    activeDocumentType: 'declaration'  // 'declaration' o 'cover'
};

// ==========================================
// ELEMENTOS DEL DOM
// ==========================================

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
    closeErrorBtn: document.getElementById('closeErrorBtn')
};

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    console.log('DeclarationLetterOnline (Multi-Document) initialized');
});

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
    
    // Modal
    elements.closeModalBtn.addEventListener('click', closeErrorModal);
    elements.closeErrorBtn.addEventListener('click', closeErrorModal);
    elements.errorModal.addEventListener('click', (e) => {
        if (e.target === elements.errorModal) {
            closeErrorModal();
        }
    });
}

// ==========================================
// MANEJO DE ARCHIVOS
// ==========================================

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
            uploadProgress: 0
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
    
    div.innerHTML = `
        <div class="queue-item-info">
            <div class="queue-item-icon">${fileExtension}</div>
            <div class="queue-item-details">
                <h4>${item.fileName}</h4>
                <p>${item.fileSize}</p>
            </div>
        </div>
        <div class="queue-item-status ${item.status}">
            ${getStatusText(item.status)}
        </div>
        ${item.status === 'pending' ? `<button class="btn-icon" onclick="removeFromQueue('${item.id}')" title="Remove">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2"/>
            </svg>
        </button>` : ''}
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
    appState.documentsQueue = appState.documentsQueue.filter(item => item.id != itemId);
    updateQueueUI();
}

// Hacer función global para poder llamarla desde HTML
window.removeFromQueue = removeFromQueue;

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ==========================================
// PROCESAMIENTO DE DOCUMENTOS
// ==========================================

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
    
    // Procesar cada archivo
    for (const item of pendingItems) {
        if (item.status === 'pending') {
            // Subir archivo primero
            await uploadFileFromQueue(item);
        }
        
        if (item.documentId) {
        // Procesar documento
            await processDocumentFromQueue(item);
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
}

async function uploadFileFromQueue(item) {
    try {
        // Actualizar estado a uploading
        item.status = 'uploading';
        updateQueueUI();
        
        // Subir archivo
        const documentId = await uploadFile(item.file);
        
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
        item.status = 'error';
        updateQueueUI();
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

async function processDocumentFromQueue(item) {
    try {
        // Actualizar estado
        item.status = 'processing';
        updateQueueUI();
        
        // Mostrar sección de preview y crear tab
        showPreviewSection();
        createDocumentTab(item.documentId, item.fileName);
        
        // Procesar con streaming
        await processDocumentStream(item.documentId, item.fileName);
        
        // Actualizar estado
        item.status = 'completed';
        updateQueueUI();
        
    } catch (error) {
        console.error('Error processing document:', error);
        item.status = 'error';
        updateQueueUI();
        showError(`Error processing ${item.fileName}: ${error.message}`);
    }
}

async function processDocumentStream(documentId, fileName) {
    return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${API_BASE_URL}/api/process/${documentId}/stream`);
        let fullContent = '';
        let chunkBuffer = '';
        let isFirstChunk = true;
        
        // Inicializar panel del documento
        initializeDocumentPanel(documentId, fileName);
        
        // Mostrar spinner de carga
        showLoadingSpinner(documentId);
        
        // Bloquear botones mientras genera
        disableDocumentButtons(documentId);
        
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'content' && data.chunk) {
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
                    eventSource.close();
                    
                    // Asegurar que todo el contenido se muestre
                    updateDocumentContent(documentId, 'declaration', fullContent);
                    
                    // Guardar en estado
                    appState.processedDocuments[documentId] = {
                        fileName: fileName,
                        declarationContent: fullContent,
                        coverLetterContent: null,
                        generatedFilename: data.filename
                    };
                    
                    // Habilitar botones de Declaration (Download y Regenerate)
                    enableDeclarationButtons(documentId);
                    
                    // Habilitar botón de Cover Letter
                    enableCoverLetterButton(documentId);
                    
                    resolve();
                } else if (data.type === 'error' || data.error) {
                    eventSource.close();
                    hideLoadingSpinner(documentId);
                    enableDeclarationButtons(documentId); // Habilitar para permitir reintentos
                    reject(new Error(data.error || 'Processing error'));
                }
            } catch (parseError) {
                eventSource.close();
                hideLoadingSpinner(documentId);
                enableDeclarationButtons(documentId);
                reject(parseError);
            }
        };
        
        eventSource.onerror = function(error) {
            eventSource.close();
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

// ==========================================
// GESTIÓN DE ESTADO DE BOTONES
// ==========================================

function disableDocumentButtons(documentId) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const downloadBtn = panel.querySelector('.download-declaration-btn');
    const regenerateBtn = panel.querySelector('.regenerate-btn');
    
    if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.5';
        downloadBtn.style.cursor = 'not-allowed';
    }
    if (regenerateBtn) {
        regenerateBtn.disabled = true;
        regenerateBtn.style.opacity = '0.5';
        regenerateBtn.style.cursor = 'not-allowed';
    }
}

function enableDeclarationButtons(documentId) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const downloadBtn = panel.querySelector('.download-declaration-btn');
    const regenerateBtn = panel.querySelector('.regenerate-btn');
    
    if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.style.opacity = '1';
        downloadBtn.style.cursor = 'pointer';
    }
    if (regenerateBtn) {
        regenerateBtn.disabled = false;
        regenerateBtn.style.opacity = '1';
        regenerateBtn.style.cursor = 'pointer';
    }
}

// ==========================================
// UI DE TABS Y PANELES
// ==========================================

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
        ${fileName}
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
}

function closeDocumentTab(documentId, event) {
    event.stopPropagation();
    
    // Eliminar tab
    const tab = document.querySelector(`.tab-button[data-document-id="${documentId}"]`);
    if (tab) tab.remove();
    
    // Eliminar panel
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (panel) panel.remove();
    
    // Eliminar de estado
    delete appState.processedDocuments[documentId];
    
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
            <div>
                <div class="document-panel-title">${fileName}</div>
                <div class="document-panel-subtitle">Generated documents</div>
            </div>
            <div class="document-type-tabs">
                <button class="document-type-tab active" onclick="switchDocumentType(${documentId}, 'declaration')">
                    Declaration Letter
                </button>
                <button class="document-type-tab" onclick="switchDocumentType(${documentId}, 'cover')" disabled>
                    Cover Letter
                </button>
            </div>
        </div>
        <div class="document-panel-body">
            <div class="document-content declaration-content" style="max-height: 600px; overflow-y: auto;">
                <p style="color: #6b7280; font-style: italic;">Generating document in real-time...</p>
            </div>
            <div class="document-content cover-content hidden" style="max-height: 600px; overflow-y: auto;">
                <!-- Cover Letter content -->
            </div>
        </div>
        <div class="document-panel-footer">
            <div class="action-buttons">
                <button class="btn btn-primary download-declaration-btn" onclick="downloadDocument(${documentId}, 'declaration')" disabled>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 3V13M10 13L14 9M10 13L6 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Download Declaration
                </button>
                <button class="btn btn-secondary regenerate-btn" onclick="regenerateDocument(${documentId})" disabled>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17 10C17 13.866 13.866 17 10 17C6.134 17 3 13.866 3 10C3 6.134 6.134 3 10 3C11.848 3 13.536 3.752 14.778 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
                    Regenerate
                </button>
                <button class="btn btn-success generate-cover-btn" onclick="generateCoverLetter(${documentId})" disabled>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M9 2C9 1.44772 9.44772 1 10 1H14C14.5523 1 15 1.44772 15 2V5H18C18.5523 5 19 5.44772 19 6V18C19 18.5523 18.5523 19 18 19H6C5.44772 19 5 18.5523 5 18V6C5 5.44772 5.44772 5 6 5H9V2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
                    Generate Cover Letter
                </button>
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

function enableCoverLetterButton(documentId) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const coverTab = panel.querySelector('.document-type-tab:nth-child(2)');
    const coverBtn = panel.querySelector('.generate-cover-btn');
    
    if (coverBtn) coverBtn.disabled = false;
}

function switchDocumentType(documentId, type) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    // Actualizar tabs de tipo
    panel.querySelectorAll('.document-type-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    if (type === 'declaration') {
        panel.querySelector('.document-type-tab:nth-child(1)').classList.add('active');
        panel.querySelector('.declaration-content').classList.remove('hidden');
        panel.querySelector('.cover-content').classList.add('hidden');
    } else {
        panel.querySelector('.document-type-tab:nth-child(2)').classList.add('active');
        panel.querySelector('.declaration-content').classList.add('hidden');
        panel.querySelector('.cover-content').classList.remove('hidden');
    }
}

window.switchDocumentType = switchDocumentType;

// ==========================================
// ACCIONES DE DOCUMENTOS
// ==========================================

function downloadDocument(documentId, type) {
    if (type === 'declaration') {
        window.location.href = `${API_BASE_URL}/api/download/${documentId}`;
    } else {
        window.location.href = `${API_BASE_URL}/api/download-cover-letter/${documentId}`;
    }
}

window.downloadDocument = downloadDocument;

async function regenerateDocument(documentId) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const declarationContent = panel.querySelector('.declaration-content');
    const regenerateBtn = panel.querySelector('.btn-secondary');
    
    // Deshabilitar botón
    if (regenerateBtn) {
        regenerateBtn.disabled = true;
        regenerateBtn.textContent = 'Regenerating...';
    }
    
    // Mostrar mensaje de regeneración
    declarationContent.innerHTML = '<p style="color: #6b7280; font-style: italic;">Regenerating document in real-time...</p>';
    
    try {
        // Regenerar con streaming (sin crear nuevo panel)
        await regenerateDocumentStream(documentId);
        
        // Restaurar botón
        if (regenerateBtn) {
            regenerateBtn.disabled = false;
            regenerateBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M17 10C17 13.866 13.866 17 10 17C6.134 17 3 13.866 3 10C3 6.134 6.134 3 10 3C11.848 3 13.536 3.752 14.778 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
                Regenerate
        `;
        }
    } catch (error) {
        showError(`Error regenerating document: ${error.message}`);
        if (regenerateBtn) {
            regenerateBtn.disabled = false;
            regenerateBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M17 10C17 13.866 13.866 17 10 17C6.134 17 3 13.866 3 10C3 6.134 6.134 3 10 3C11.848 3 13.536 3.752 14.778 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
                Regenerate
            `;
        }
    }
}

async function regenerateDocumentStream(documentId) {
    return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${API_BASE_URL}/api/process/${documentId}/stream`);
        let fullContent = '';
        let chunkBuffer = '';
        let isFirstChunk = true;
        
        // Mostrar spinner
        showLoadingSpinner(documentId);
        
        // Bloquear botones mientras regenera
        disableDocumentButtons(documentId);
        
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'content' && data.chunk) {
                    // Si es el primer chunk, ocultar spinner
                    if (isFirstChunk) {
                        hideLoadingSpinner(documentId);
                        isFirstChunk = false;
                    }
                    
                    fullContent += data.chunk;
                    chunkBuffer += data.chunk;
                    
                    // Efecto de escritura gradual
                    simulateTypingEffect(documentId, 'declaration', chunkBuffer);
                    
                } else if (data.type === 'complete') {
                    eventSource.close();
                    
                    // Asegurar que todo el contenido se muestre
                    updateDocumentContent(documentId, 'declaration', fullContent);
                    
                    // Actualizar en estado
                    if (appState.processedDocuments[documentId]) {
                        appState.processedDocuments[documentId].declarationContent = fullContent;
                        appState.processedDocuments[documentId].generatedFilename = data.filename;
                    }
                    
                    // Habilitar botones cuando termine
                    enableDeclarationButtons(documentId);
                    
                    resolve();
                } else if (data.type === 'error' || data.error) {
                    eventSource.close();
                    hideLoadingSpinner(documentId);
                    enableDeclarationButtons(documentId);
                    reject(new Error(data.error || 'Processing error'));
                }
            } catch (parseError) {
                eventSource.close();
                hideLoadingSpinner(documentId);
                enableDeclarationButtons(documentId);
                reject(parseError);
            }
        };
        
        eventSource.onerror = function(error) {
            eventSource.close();
            hideLoadingSpinner(documentId);
            enableDeclarationButtons(documentId);
            if (!fullContent) {
                reject(new Error('Connection lost'));
            } else {
                resolve();
            }
        };
    });
}

window.regenerateDocument = regenerateDocument;

async function generateCoverLetter(documentId) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const coverTab = panel.querySelector('.document-type-tab:nth-child(2)');
    const coverContent = panel.querySelector('.cover-content');
    const generateBtn = panel.querySelector('.generate-cover-btn');
    
    // Deshabilitar botón
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    
    // Cambiar a tab de Cover Letter
    switchDocumentType(documentId, 'cover');
    coverTab.disabled = false;
    
    // Mostrar mensaje de generación
    coverContent.innerHTML = '<p style="color: #6b7280; font-style: italic;">Generating Cover Letter in real-time...</p>';
    
    try {
        // Generar con streaming
        await generateCoverLetterStream(documentId);
        
        // Restaurar botón
        generateBtn.disabled = false;
        generateBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 2C9 1.44772 9.44772 1 10 1H14C14.5523 1 15 1.44772 15 2V5H18C18.5523 5 19 5.44772 19 6V18C19 18.5523 18.5523 19 18 19H6C5.44772 19 5 18.5523 5 18V6C5 5.44772 5.44772 5 6 5H9V2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Generate Cover Letter
        `;
        
        // Agregar botón de descarga de Cover Letter
        addCoverLetterDownloadButton(documentId);
        
    } catch (error) {
        showError(`Error generating Cover Letter: ${error.message}`);
        generateBtn.disabled = false;
    }
}

window.generateCoverLetter = generateCoverLetter;

async function generateCoverLetterStream(documentId) {
    return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${API_BASE_URL}/api/generate-cover-letter/${documentId}/stream`);
        let fullContent = '';
        let chunkBuffer = '';
        let isFirstChunk = true;
        
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
                const data = JSON.parse(event.data);
                
                if (data.type === 'content' && data.chunk) {
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
                    eventSource.close();
                    
                    // Asegurar que todo el contenido se muestre
                    updateDocumentContent(documentId, 'cover', fullContent);
                    
                    // Guardar en estado
                    if (appState.processedDocuments[documentId]) {
                        appState.processedDocuments[documentId].coverLetterContent = fullContent;
                    }
                    
                    resolve();
                } else if (data.type === 'error' || data.error) {
                    eventSource.close();
                    reject(new Error(data.error || 'Error generating Cover Letter'));
                }
            } catch (parseError) {
                eventSource.close();
                reject(parseError);
            }
        };
        
        eventSource.onerror = function(error) {
            eventSource.close();
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

function addCoverLetterDownloadButton(documentId) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const footer = panel.querySelector('.document-panel-footer .action-buttons');
    
    // Verificar si ya existe el botón
    if (footer.querySelector('.download-cover-btn')) return;
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-primary download-cover-btn';
    downloadBtn.onclick = () => downloadDocument(documentId, 'cover');
    downloadBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3V13M10 13L14 9M10 13L6 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        Download Cover Letter
    `;
    
    footer.insertBefore(downloadBtn, footer.firstChild.nextSibling);
}

// ==========================================
// MANEJO DE ERRORES
// ==========================================

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorModal.classList.remove('hidden');
}

function closeErrorModal() {
    elements.errorModal.classList.add('hidden');
}

console.log('DeclarationLetterOnline (Multi-Document) - Script loaded');
