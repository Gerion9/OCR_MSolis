/**
 * Módulo de Manejo de Subida de Archivos
 * DeclarationLetterOnline
 */

import { CONFIG, STATUS_TEXTS } from '../config.js';
import { appState, findQueueItem, removeFromState } from '../state.js';
import { uploadFile } from '../api.js';
import { formatFileSize } from '../utils.js';
import { showError } from './modals.js';

// Referencias a elementos del DOM
let elements = {};

/**
 * Inicializa el módulo de upload
 */
export function initializeUpload(domElements) {
    elements = domElements;
    
    // Event listeners
    if (elements.selectFileBtn) {
        elements.selectFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.fileInput.click();
        });
    }
    
    if (elements.fileInput) {
        elements.fileInput.addEventListener('change', handleFilesSelect);
    }
    
    if (elements.uploadBox) {
        elements.uploadBox.addEventListener('dragover', handleDragOver);
        elements.uploadBox.addEventListener('dragleave', handleDragLeave);
        elements.uploadBox.addEventListener('drop', handleDrop);
    }
}

/**
 * Manejo de drag over
 */
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadBox.classList.add('dragover');
}

/**
 * Manejo de drag leave
 */
function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadBox.classList.remove('dragover');
}

/**
 * Manejo de drop
 */
function handleDrop(e) {
    e.preventDefault();
    elements.uploadBox.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    handleMultipleFiles(files);
}

/**
 * Manejo de selección de archivos
 */
function handleFilesSelect(e) {
    const files = Array.from(e.target.files);
    handleMultipleFiles(files);
    e.target.value = '';
}

/**
 * Maneja múltiples archivos
 */
function handleMultipleFiles(files) {
    let validFiles = [];
    
    // Validar límite de documentos
    if (appState.documentsQueue.length >= CONFIG.MAX_DOCUMENTS) {
        showError(`Maximum limit reached: You can only upload up to ${CONFIG.MAX_DOCUMENTS} documents at a time.`);
        return;
    }
    
    for (const file of files) {
        // Validar límite incluyendo los que ya están en cola
        if (appState.documentsQueue.length + validFiles.length >= CONFIG.MAX_DOCUMENTS) {
            showError(`Maximum limit reached: You can only upload up to ${CONFIG.MAX_DOCUMENTS} documents. ${CONFIG.MAX_DOCUMENTS - appState.documentsQueue.length} more allowed.`);
            break;
        }
        
        // Validar duplicados por nombre
        const isDuplicate = appState.documentsQueue.some(item => item.fileName === file.name);
        if (isDuplicate) {
            showError(`File "${file.name}" is already in the queue.`);
            continue;
        }
        
        // Validar tipo de archivo
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!CONFIG.VALID_EXTENSIONS.includes(fileExtension)) {
            showError(`Invalid file type: ${file.name}. Please upload DOCX, PDF or TXT files.`);
            continue;
        }
        
        // Validar tamaño
        if (file.size > CONFIG.MAX_FILE_SIZE_BYTES) {
            showError(`File ${file.name} exceeds ${CONFIG.MAX_FILE_SIZE_MB}MB limit.`);
            continue;
        }
        
        validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
        addFilesToQueue(validFiles);
    }
}

/**
 * Agrega archivos a la cola
 */
function addFilesToQueue(files) {
    for (const file of files) {
        const queueItem = {
            id: Date.now() + Math.random(),
            file: file,
            fileName: file.name,
            fileSize: formatFileSize(file.size),
            status: 'pending',
            documentId: null,
            uploadProgress: 0,
            previewExpanded: false,
            previewRendered: false,
            previewHTML: ''
        };
        
        appState.documentsQueue.push(queueItem);
    }
    
    updateQueueUI();
}

/**
 * Actualiza la UI de la cola
 */
export function updateQueueUI() {
    if (appState.documentsQueue.length === 0) {
        elements.documentsQueue.classList.add('hidden');
        return;
    }
    
    elements.documentsQueue.classList.remove('hidden');
    elements.queueCount.textContent = `${appState.documentsQueue.length} file${appState.documentsQueue.length !== 1 ? 's' : ''}`;
    
    // Renderizar lista
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

/**
 * Crea el elemento HTML de un item en la cola
 */
function createQueueItemElement(item) {
    const div = document.createElement('div');
    div.className = 'queue-item';
    div.dataset.id = item.id;
    
    const fileExtension = item.fileName.substring(item.fileName.lastIndexOf('.') + 1).toUpperCase();
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
                    <button class="btn-icon btn-toggle-preview" onclick="window.toggleDocumentPreview('${item.id}')" title="${item.previewExpanded ? 'Hide Preview' : 'Show Preview'}" type="button">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="chevron-icon ${item.previewExpanded ? 'expanded' : ''}">
                            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                ` : ''}
                <div class="queue-item-status ${item.status}">
                    ${STATUS_TEXTS[item.status] || item.status}
                </div>
                ${item.status !== 'completed' ? `<button class="btn-icon" onclick="window.removeFromQueue('${item.id}')" title="Remove" type="button">
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

/**
 * Elimina un documento de la cola
 */
export function removeFromQueue(itemId) {
    const queueItem = findQueueItem(itemId);
    
    if (queueItem && queueItem.documentId) {
        // Marcar como cancelado y limpiar streams
        const documentId = queueItem.documentId;
        appState.cancelledDocuments.add(documentId);
        
        if (appState.activeStreams[documentId]) {
            if (appState.activeStreams[documentId].declaration) {
                appState.activeStreams[documentId].declaration.close();
                delete appState.activeStreams[documentId].declaration;
            }
            if (appState.activeStreams[documentId].cover) {
                appState.activeStreams[documentId].cover.close();
                delete appState.activeStreams[documentId].cover;
            }
            if (Object.keys(appState.activeStreams[documentId]).length === 0) {
                delete appState.activeStreams[documentId];
            }
        }
        
        // Cerrar tab si existe
        if (window.closeDocumentTab) {
            window.closeDocumentTab(documentId, { stopPropagation: () => {} });
        }
        
        // Limpiar del estado
        if (appState.processedDocuments[documentId]) {
            delete appState.processedDocuments[documentId];
        }
    }
    
    // Eliminar de la cola
    removeFromState(itemId);
    updateQueueUI();
    
    console.log(`Removed document ${itemId} from queue`);
}

/**
 * Sube un archivo desde la cola
 */
export async function uploadFileFromQueue(item) {
    try {
        const stillInQueue = findQueueItem(item.id);
        if (!stillInQueue) {
            throw new Error('Document removed from queue');
        }
        
        item.status = 'uploading';
        updateQueueUI();
        
        const documentId = await uploadFile(item.file);
        
        const stillInQueueAfterUpload = findQueueItem(item.id);
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
        const stillInQueue = findQueueItem(item.id);
        if (stillInQueue) {
            item.status = 'error';
            updateQueueUI();
        }
        return false;
    }
}

