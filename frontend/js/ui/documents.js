/**
 * Módulo de Manejo y Procesamiento de Documentos
 * DeclarationLetterOnline
 */

import { API_BASE_URL, CONFIG, DOCUMENT_TYPES } from '../config.js';
import { appState, buildAPIUrl, findQueueItem, isCancelled } from '../state.js';
import { downloadEditedDocument } from '../api.js';
import { convertMarkdownToHTML, extractTextFromHTML, extractApplicantName } from '../utils.js';
import { updateQueueUI, uploadFileFromQueue } from './upload.js';
import { showError } from './modals.js';

// Referencias a elementos del DOM
let elements = {};
let typingIntervals = {};
let typingIntervalsCover = {};

/**
 * Inicializa el módulo de documentos
 */
export function initializeDocuments(domElements) {
    elements = domElements;
    
    // Event listener para procesar todos
    if (elements.processAllBtn) {
        elements.processAllBtn.addEventListener('click', handleProcessAll);
    }
}

/**
 * Procesa todos los documentos en cola
 */
async function handleProcessAll() {
    const pendingItems = appState.documentsQueue.filter(item => 
        item.status === 'pending' || item.status === 'uploaded'
    );
    
    if (pendingItems.length === 0) {
        return;
    }
    
    elements.processAllBtn.disabled = true;
    elements.processAllBtn.textContent = 'Processing...';
    appState.isProcessing = true;
    
    for (const item of pendingItems) {
        const stillInQueue = findQueueItem(item.id);
        if (!stillInQueue) {
            console.log(`Document ${item.id} was removed from queue, skipping...`);
            continue;
        }
        
        if (item.documentId && isCancelled(item.documentId)) {
            console.log(`Document ${item.documentId} was cancelled, skipping...`);
            continue;
        }
        
        if (item.status === 'pending') {
            try {
                await uploadFileFromQueue(item);
            } catch (error) {
                console.error(`Error uploading ${item.fileName}:`, error);
                continue;
            }
        }
        
        const stillInQueueAfterUpload = findQueueItem(item.id);
        if (!stillInQueueAfterUpload || (item.documentId && isCancelled(item.documentId))) {
            console.log(`Document ${item.id} was removed/cancelled during upload, skipping processing...`);
            continue;
        }
        
        if (item.documentId) {
            try {
                await processDocumentFromQueue(item);
            } catch (error) {
                console.error(`Error processing ${item.fileName}:`, error);
            }
        }
    }
    
    elements.processAllBtn.disabled = false;
    elements.processAllBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3V17M10 17L15 12M10 17L5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Process All Documents
    `;
    appState.isProcessing = false;
}

/**
 * Procesa un documento desde la cola
 */
async function processDocumentFromQueue(item) {
    try {
        if (isCancelled(item.documentId)) {
            console.log(`Document ${item.documentId} was cancelled, aborting processing`);
            throw new Error('Document was cancelled');
        }
        
        const stillInQueue = findQueueItem(item.id);
        if (!stillInQueue) {
            console.log(`Document ${item.id} was removed from queue, aborting processing`);
            throw new Error('Document removed from queue');
        }
        
        item.status = 'processing';
        updateQueueUI();
        
        showPreviewSection();
        createDocumentTab(item.documentId, item.fileName);
        
        await processDocumentStream(item.documentId, item.fileName);
        
        const stillInQueueAfterProcess = findQueueItem(item.id);
        if (!stillInQueueAfterProcess || isCancelled(item.documentId)) {
            console.log(`Document ${item.id} was removed/cancelled after processing, not marking as completed`);
            return;
        }
        
        item.status = 'completed';
        updateQueueUI();
        
    } catch (error) {
        console.error('Error processing document:', error);
        
        const stillInQueue = findQueueItem(item.id);
        if (stillInQueue && !isCancelled(item.documentId)) {
            item.status = 'error';
            updateQueueUI();
            showError(`Error processing ${item.fileName}: ${error.message}`);
        }
    }
}

/**
 * Procesa un documento con streaming
 */
async function processDocumentStream(documentId, fileName) {
    return new Promise((resolve, reject) => {
        const streamUrl = buildAPIUrl(`/api/process/${documentId}/stream`, null);
        const eventSource = new EventSource(streamUrl);
        let fullContent = '';
        let chunkBuffer = '';
        let isFirstChunk = true;
        
        if (!appState.activeStreams[documentId]) {
            appState.activeStreams[documentId] = {};
        }
        appState.activeStreams[documentId].declaration = eventSource;
        
        initializeDocumentPanel(documentId, fileName);
        showLoadingSpinner(documentId);
        disableDocumentButtons(documentId);
        
        eventSource.onmessage = function(event) {
            try {
                if (isCancelled(documentId)) {
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
                    if (isCancelled(documentId)) {
                        eventSource.close();
                        if (appState.activeStreams[documentId]) {
                            delete appState.activeStreams[documentId].declaration;
                        }
                        hideLoadingSpinner(documentId);
                        reject(new Error('Document was cancelled by user'));
                        return;
                    }
                    
                    if (isFirstChunk) {
                        hideLoadingSpinner(documentId);
                        isFirstChunk = false;
                    }
                    
                    fullContent += data.chunk;
                    chunkBuffer += data.chunk;
                    
                    simulateTypingEffect(documentId, 'declaration', chunkBuffer);
                    
                } else if (data.type === 'complete') {
                    if (isCancelled(documentId)) {
                        eventSource.close();
                        if (appState.activeStreams[documentId]) {
                            delete appState.activeStreams[documentId].declaration;
                        }
                        reject(new Error('Document was cancelled by user'));
                        return;
                    }
                    
                    eventSource.close();
                    if (appState.activeStreams[documentId]) {
                        delete appState.activeStreams[documentId].declaration;
                    }
                    
                    updateDocumentContent(documentId, 'declaration', fullContent);
                    
                    const applicantName = extractApplicantName(fullContent);
                    updatePanelTitle(documentId, applicantName);
                    
                    appState.processedDocuments[documentId] = {
                        fileName: fileName,
                        applicantName: applicantName,
                        declarationContent: fullContent,
                        coverLetterContent: null,
                        generatedFilename: data.filename
                    };
                    
                    enableDeclarationButtons(documentId);
                    
                    generateCoverLetterAutomatically(documentId)
                        .then(() => resolve())
                        .catch((coverError) => {
                            console.error('Error generating cover letter:', coverError);
                            resolve();
                        });
                } else if (data.type === 'error' || data.error) {
                    eventSource.close();
                    if (appState.activeStreams[documentId]) {
                        delete appState.activeStreams[documentId].declaration;
                    }
                    hideLoadingSpinner(documentId);
                    enableDeclarationButtons(documentId);
                    reject(new Error(data.error || 'Processing error'));
                }
            } catch (parseError) {
                eventSource.close();
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
            if (appState.activeStreams[documentId]) {
                delete appState.activeStreams[documentId].declaration;
            }
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

/**
 * Genera el Cover Letter automáticamente
 */
async function generateCoverLetterAutomatically(documentId) {
    if (isCancelled(documentId)) {
        console.log(`Document ${documentId} was cancelled, skipping Cover Letter generation`);
        return;
    }
    
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const coverTab = panel.querySelector('.document-type-tab:nth-child(2)');
    const coverContent = panel.querySelector('.cover-content');
    
    switchDocumentType(documentId, 'cover');
    coverTab.disabled = false;
    
    coverContent.innerHTML = '<p style="color: #6b7280; font-style: italic;">Generating Cover Letter automatically...</p>';
    
    try {
        if (isCancelled(documentId)) {
            console.log(`Document ${documentId} was cancelled, aborting Cover Letter generation`);
            return;
        }
        
        await generateCoverLetterStream(documentId);
        
    } catch (error) {
        if (!isCancelled(documentId)) {
            showError(`Error generating Cover Letter: ${error.message}`);
        }
    }
}

/**
 * Genera Cover Letter con streaming
 */
async function generateCoverLetterStream(documentId) {
    return new Promise((resolve, reject) => {
        const streamUrl = buildAPIUrl(`/api/generate-cover-letter/${documentId}/stream`, null);
        const eventSource = new EventSource(streamUrl);
        let fullContent = '';
        let chunkBuffer = '';
        let isFirstChunk = true;
        
        if (!appState.activeStreams[documentId]) {
            appState.activeStreams[documentId] = {};
        }
        appState.activeStreams[documentId].cover = eventSource;
        
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
                if (isCancelled(documentId)) {
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
                    if (isCancelled(documentId)) {
                        eventSource.close();
                        if (appState.activeStreams[documentId]) {
                            delete appState.activeStreams[documentId].cover;
                        }
                        reject(new Error('Document was cancelled by user'));
                        return;
                    }
                    
                    if (isFirstChunk) {
                        if (coverContent) coverContent.innerHTML = '';
                        isFirstChunk = false;
                    }
                    
                    fullContent += data.chunk;
                    chunkBuffer += data.chunk;
                    
                    simulateTypingEffectCover(documentId, chunkBuffer);
                    
                } else if (data.type === 'complete') {
                    if (isCancelled(documentId)) {
                        eventSource.close();
                        if (appState.activeStreams[documentId]) {
                            delete appState.activeStreams[documentId].cover;
                        }
                        reject(new Error('Document was cancelled by user'));
                        return;
                    }
                    
                    eventSource.close();
                    if (appState.activeStreams[documentId]) {
                        delete appState.activeStreams[documentId].cover;
                    }
                    
                    updateDocumentContent(documentId, 'cover', fullContent);
                    
                    if (appState.processedDocuments[documentId]) {
                        appState.processedDocuments[documentId].coverLetterContent = fullContent;
                        appState.processedDocuments[documentId].coverLetterFilename = data.filename;
                    }
                    
                    addDownloadButtonToHeader(documentId, 'cover', 'Download Cover Letter');
                    
                    resolve();
                } else if (data.type === 'error' || data.error) {
                    eventSource.close();
                    if (appState.activeStreams[documentId]) {
                        delete appState.activeStreams[documentId].cover;
                    }
                    reject(new Error(data.error || 'Error generating Cover Letter'));
                }
            } catch (parseError) {
                eventSource.close();
                if (appState.activeStreams[documentId]) {
                    delete appState.activeStreams[documentId].cover;
                }
                reject(parseError);
            }
        };
        
        eventSource.onerror = function(error) {
            eventSource.close();
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

// Efectos de escritura
function simulateTypingEffect(documentId, type, content) {
    if (typingIntervals[documentId]) {
        clearTimeout(typingIntervals[documentId]);
    }
    
    typingIntervals[documentId] = setTimeout(() => {
        updateDocumentContent(documentId, type, content);
        autoScrollToBottom(documentId);
    }, CONFIG.TYPING_EFFECT_DELAY);
}

function simulateTypingEffectCover(documentId, content) {
    if (typingIntervalsCover[documentId]) {
        clearTimeout(typingIntervalsCover[documentId]);
    }
    
    typingIntervalsCover[documentId] = setTimeout(() => {
        updateDocumentContent(documentId, 'cover', content);
        
        const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
        const coverContent = panel?.querySelector('.cover-content');
        if (coverContent) {
            coverContent.scrollTo({
                top: coverContent.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, CONFIG.TYPING_EFFECT_DELAY);
}

function autoScrollToBottom(documentId) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const declarationContent = panel.querySelector('.declaration-content');
    if (!declarationContent) return;
    
    declarationContent.scrollTo({
        top: declarationContent.scrollHeight,
        behavior: 'smooth'
    });
}

// Spinners y UI
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
    
    const loader = declarationContent.querySelector('.streaming-loader');
    if (loader) {
        declarationContent.innerHTML = '';
    }
}

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
    addDownloadButtonToHeader(documentId, 'declaration', 'Download Declaration');
}

function addDownloadButtonToHeader(documentId, documentType, label) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const buttonsContainer = panel.querySelector('.download-buttons-container');
    if (!buttonsContainer) return;
    
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
    
    if (documentType === 'cover') {
        downloadBtn.style.display = 'none';
    }
    
    buttonsContainer.appendChild(downloadBtn);
}

function updatePanelTitle(documentId, applicantName) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const titleElement = panel.querySelector('.document-panel-title');
    if (titleElement) {
        titleElement.textContent = `Cover and Declaration Letter [${applicantName}]`;
    }
    
    const tab = document.querySelector(`.tab-button[data-document-id="${documentId}"]`);
    if (tab) {
        const tabTitle = tab.querySelector('.document-tab-title');
        if (tabTitle) {
            tabTitle.textContent = applicantName;
        }
    }
}

function updateDocumentContent(documentId, type, content) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    const contentEl = panel.querySelector(`.${type}-content`);
    if (!contentEl) return;
    
    contentEl.innerHTML = convertMarkdownToHTML(content);
}

// Tabs y paneles
function showPreviewSection() {
    elements.previewSection.classList.remove('hidden');
    elements.documentsTabs.classList.remove('hidden');
    elements.previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function createDocumentTab(documentId, fileName) {
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button';
    tabButton.dataset.documentId = documentId;
    tabButton.innerHTML = `
        <span class="document-tab-title">Processing...</span>
        <span class="tab-close" onclick="window.closeDocumentTab(${documentId}, event)">✕</span>
    `;
    tabButton.addEventListener('click', () => switchToDocument(documentId));
    
    elements.tabsHeader.appendChild(tabButton);
    switchToDocument(documentId);
}

function switchToDocument(documentId) {
    document.querySelectorAll('.tab-button').forEach(tab => {
        if (tab.dataset.documentId == documentId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.document-panel').forEach(panel => {
        if (panel.dataset.documentId == documentId) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
    
    appState.activeDocumentId = documentId;
    showChatButton();
}

function closeDocumentTab(documentId, event) {
    event.stopPropagation();
    
    console.log(`Closing tab for document ${documentId}`);
    
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
    
    const queueItem = appState.documentsQueue.find(item => item.documentId == documentId);
    if (queueItem) {
        console.log(`Found queue item with status: ${queueItem.status}, resetting to 'uploaded'`);
        queueItem.status = 'uploaded';
        
        const hasProcessingDocs = appState.documentsQueue.some(item => 
            item.status === 'processing' && item.id !== queueItem.id
        );
        
        if (!hasProcessingDocs && appState.isProcessing) {
            console.log('No more documents processing, resetting isProcessing flag');
            appState.isProcessing = false;
            elements.processAllBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 3V17M10 17L15 12M10 17L5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Process All Documents
            `;
        }
        
        updateQueueUI();
    }
    
    const tab = document.querySelector(`.tab-button[data-document-id="${documentId}"]`);
    if (tab) tab.remove();
    
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (panel) panel.remove();
    
    delete appState.processedDocuments[documentId];
    appState.cancelledDocuments.delete(documentId);
    
    if (appState.activeDocumentId == documentId) {
        const remainingTabs = document.querySelectorAll('.tab-button');
        if (remainingTabs.length > 0) {
            const firstTab = remainingTabs[0];
            switchToDocument(firstTab.dataset.documentId);
        } else {
            elements.previewSection.classList.add('hidden');
            elements.documentsTabs.classList.add('hidden');
        }
    }
    
    console.log(`Tab closed successfully.`);
}

export function initializeDocumentPanel(documentId, fileName) {
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
                    <button class="document-type-tab active" onclick="window.switchDocumentType(${documentId}, 'declaration')">
                        Declaration Letter
                    </button>
                    <button class="document-type-tab" onclick="window.switchDocumentType(${documentId}, 'cover')" disabled>
                        Cover Letter
                    </button>
                </div>
                <div class="document-controls-wrapper">
                    <div class="document-download-section">
                        <div class="download-buttons-container">
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
            </div>
        </div>
    `;
    
    elements.documentsViewer.appendChild(panel);
}

function switchDocumentType(documentId, type) {
    const panel = document.querySelector(`.document-panel[data-document-id="${documentId}"]`);
    if (!panel) return;
    
    appState.activeDocumentType = type;
    
    panel.querySelectorAll('.document-type-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const declarationBtn = panel.querySelector('.download-declaration-btn-header');
    const coverBtn = panel.querySelector('.download-cover-btn-header');
    
    if (type === 'declaration') {
        panel.querySelector('.document-type-tab:nth-child(1)').classList.add('active');
        panel.querySelector('.declaration-content').classList.remove('hidden');
        panel.querySelector('.cover-content').classList.add('hidden');
        
        if (declarationBtn) declarationBtn.style.display = 'inline-flex';
        if (coverBtn) coverBtn.style.display = 'none';
    } else {
        panel.querySelector('.document-type-tab:nth-child(2)').classList.add('active');
        panel.querySelector('.declaration-content').classList.add('hidden');
        panel.querySelector('.cover-content').classList.remove('hidden');
        
        if (declarationBtn) declarationBtn.style.display = 'none';
        if (coverBtn) coverBtn.style.display = 'inline-flex';
    }
}

// Descarga de documentos
async function downloadDocument(documentId, type) {
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
    
    const htmlContent = contentEl.innerHTML;
    const textContent = extractTextFromHTML(htmlContent);
    
    let applicantName = "Applicant";
    if (appState.processedDocuments[documentId]) {
        applicantName = appState.processedDocuments[documentId].applicantName || "Applicant";
    }
    
    const documentTypePrefix = type === 'declaration' ? 'DeclarationLetter' : 'CoverLetter';
    const filename = `${documentTypePrefix}[${applicantName}]_draft.docx`;
    
    try {
        const blob = await downloadEditedDocument(documentId, type, textContent);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading document:', error);
        showError('Error downloading document');
    }
}

// Mostrar botón de chat cuando hay documento activo
function showChatButton() {
    if (appState.activeDocumentId && document.getElementById('chatFab')) {
        document.getElementById('chatFab').classList.remove('hidden');
    }
}

// Exportar funciones que necesitan ser expuestas globalmente
export { closeDocumentTab, switchDocumentType, downloadDocument };

