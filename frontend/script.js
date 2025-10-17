/**
 * DeclarationLetterOnline - Frontend JavaScript
 * Maneja la interacción del usuario y comunicación con el backend
 */

// ==========================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ==========================================

const API_BASE_URL = window.location.origin;
let currentDocumentId = null;
let selectedFile = null;

// ==========================================
// ELEMENTOS DEL DOM
// ==========================================

const elements = {
    // Sección de subida
    uploadSection: document.getElementById('uploadSection'),
    uploadBox: document.getElementById('uploadBox'),
    uploadContent: document.getElementById('uploadContent'),
    uploadProgress: document.getElementById('uploadProgress'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    fileInput: document.getElementById('fileInput'),
    selectFileBtn: document.getElementById('selectFileBtn'),
    
    // Archivo seleccionado
    fileSelected: document.getElementById('fileSelected'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    removeFileBtn: document.getElementById('removeFileBtn'),
    generateBtn: document.getElementById('generateBtn'),
    
    // Sección de previsualización
    previewSection: document.getElementById('previewSection'),
    documentPreview: document.getElementById('documentPreview'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    previewContent: document.getElementById('previewContent'),
    actionButtons: document.getElementById('actionButtons'),
    
    // Botones de acción
    downloadBtn: document.getElementById('downloadBtn'),
    regenerateBtn: document.getElementById('regenerateBtn'),
    newDocumentBtn: document.getElementById('newDocumentBtn'),
    generateCoverLetterBtn: document.getElementById('generateCoverLetterBtn'),
    
    // Sección de Cover Letter
    coverLetterSection: document.getElementById('coverLetterSection'),
    coverLetterPreview: document.getElementById('coverLetterPreview'),
    coverLetterLoadingSpinner: document.getElementById('coverLetterLoadingSpinner'),
    coverLetterContent: document.getElementById('coverLetterContent'),
    coverLetterActionButtons: document.getElementById('coverLetterActionButtons'),
    downloadCoverLetterBtn: document.getElementById('downloadCoverLetterBtn'),
    regenerateCoverLetterBtn: document.getElementById('regenerateCoverLetterBtn'),
    
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
    console.log('DeclarationLetterOnline initialized');
});

function initializeEventListeners() {
    // Botón de seleccionar archivo
    elements.selectFileBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Detener propagación del evento
        elements.fileInput.click();
    });
    
    // Input de archivo
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    elements.uploadBox.addEventListener('dragover', handleDragOver);
    elements.uploadBox.addEventListener('dragleave', handleDragLeave);
    elements.uploadBox.addEventListener('drop', handleDrop);
    elements.uploadBox.addEventListener('click', (e) => {
        // Solo abrir el selector si no hay archivo seleccionado y no es el botón
        if (!selectedFile && !e.target.closest('#selectFileBtn') && 
            (e.target === elements.uploadBox || e.target.closest('.upload-content'))) {
            elements.fileInput.click();
        }
    });
    
    // Botón de eliminar archivo
    elements.removeFileBtn.addEventListener('click', resetFileSelection);
    
    // Botón de generar
    elements.generateBtn.addEventListener('click', handleGenerate);
    
    // Botones de acción - Declaration Letter
    elements.downloadBtn.addEventListener('click', handleDownload);
    elements.regenerateBtn.addEventListener('click', handleRegenerate);
    elements.newDocumentBtn.addEventListener('click', handleNewDocument);
    elements.generateCoverLetterBtn.addEventListener('click', handleGenerateCoverLetter);
    
    // Botones de acción - Cover Letter
    elements.downloadCoverLetterBtn.addEventListener('click', handleDownloadCoverLetter);
    elements.regenerateCoverLetterBtn.addEventListener('click', handleRegenerateCoverLetter);
    
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
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    // Validar tipo de archivo
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/pdf',
        'text/plain'
    ];
    
    const validExtensions = ['.docx', '.doc', '.pdf', '.txt'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        showError('Invalid file type. Please upload a DOCX, PDF or TXT file.');
        return;
    }
    
    // Validar tamaño (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showError('The file size is more than 10MB.');
        return;
    }
    
    selectedFile = file;
    displaySelectedFile(file);
}

function displaySelectedFile(file) {
    // Mostrar información del archivo
    elements.fileName.textContent = file.name;
    elements.fileSize.textContent = formatFileSize(file.size);
    
    // Mostrar sección de archivo seleccionado
    elements.uploadContent.classList.add('hidden');
    elements.fileSelected.classList.remove('hidden');
}

function resetFileSelection() {
    selectedFile = null;
    elements.fileInput.value = '';
    elements.uploadContent.classList.remove('hidden');
    elements.fileSelected.classList.add('hidden');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ==========================================
// SUBIDA Y PROCESAMIENTO
// ==========================================

async function handleGenerate() {
    if (!selectedFile) {
        showError('Please select a file first.');
        return;
    }
    
    try {
        // Deshabilitar botón
        elements.generateBtn.disabled = true;
        elements.generateBtn.textContent = 'Uploading...';
        
        // Subir archivo
        const documentId = await uploadFile(selectedFile);
        
        if (!documentId) {
            throw new Error('The file could not be uploaded.');
        }
        
        currentDocumentId = documentId;
        
        // Mostrar sección de previsualización
        showPreviewSection();
        
        // Procesar documento
        await processDocument(documentId);
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Error generating the document.');
        
        // Restablecer completamente el estado del botón
        resetGenerateButton();
    }
}

function resetGenerateButton() {
    elements.generateBtn.disabled = false;
    elements.generateBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3V17M10 17L15 12M10 17L5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Generate Declaration Letter
    `;
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
            let errorMessage = 'Error uploading the file.';
            try {
                const error = await response.json();
                errorMessage = error.detail || errorMessage;
            } catch (jsonError) {
                // Si no se puede parsear el JSON, usar el mensaje por defecto
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        return data.document_id;
        
    } catch (error) {
        // Si es un error de red, proporcionar un mensaje más claro
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error. Please check your connection and try again.');
        }
        throw error;
    }
}

async function processDocument(documentId) {
    try {
        elements.loadingSpinner.classList.remove('hidden');
        elements.previewContent.classList.add('hidden');
        elements.actionButtons.style.display = 'none';
        
        const response = await fetch(`${API_BASE_URL}/api/process/${documentId}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            let errorMessage = 'Error processing the document.';
            try {
                const error = await response.json();
                errorMessage = error.detail || errorMessage;
            } catch (jsonError) {
                // Si no se puede parsear el JSON, usar el mensaje por defecto
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // Validar que el documento tenga contenido
        if (!data.markdown_content) {
            throw new Error('Generated document is empty.');
        }
        
        // Mostrar previsualización
        displayPreview(data.markdown_content);
        
        // Ocultar spinner y mostrar contenido
        elements.loadingSpinner.classList.add('hidden');
        elements.previewContent.classList.remove('hidden');
        elements.actionButtons.style.display = 'flex';
        
    } catch (error) {
        console.error('Error al procesar:', error);
        
        // Proporcionar mensaje de error más descriptivo
        let userMessage = error.message || 'Error processing the document.';
        
        // Si es un error de red
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            userMessage = 'Network error. Please check your connection and try again.';
        }
        
        showError(userMessage);
        hidePreviewSection();
        
        // Restablecer el botón para permitir otro intento
        resetGenerateButton();
    }
}

// ==========================================
// PREVISUALIZACIÓN
// ==========================================

function showPreviewSection() {
    elements.previewSection.classList.remove('hidden');
    elements.previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hidePreviewSection() {
    elements.previewSection.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function displayPreview(markdownContent) {
    // Convertir Markdown a HTML (simplificado)
    let html = markdownContent;
    
    // Convertir encabezados
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Convertir negritas e itálicas
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convertir párrafos (líneas que no son encabezados)
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
    
    elements.previewContent.innerHTML = processedLines.join('\n');
}

// ==========================================
// ACCIONES DEL DOCUMENTO
// ==========================================

async function handleDownload() {
    if (!currentDocumentId) {
        showError('No document to download.');
        return;
    }
    
    try {
        elements.downloadBtn.disabled = true;
        elements.downloadBtn.textContent = 'Downloading...';
        
        window.location.href = `${API_BASE_URL}/api/download/${currentDocumentId}`;
        
        setTimeout(() => {
            elements.downloadBtn.disabled = false;
            elements.downloadBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 3V13M10 13L14 9M10 13L6 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M17 13V15C17 15.5304 16.7893 16.0391 16.4142 16.4142C16.0391 16.7893 15.5304 17 15 17H5C4.46957 17 3.96086 16.7893 3.58579 16.4142C3.21071 16.0391 3 15.5304 3 15V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Download Document
            `;
        }, 2000);
        
    } catch (error) {
        console.error('Error downloading:', error);
        showError('Error downloading the document.');
        elements.downloadBtn.disabled = false;
    }
}

async function handleRegenerate() {
    if (!currentDocumentId) {
        showError('No document to regenerate.');
        return;
    }
    
    try {
        elements.regenerateBtn.disabled = true;
        elements.regenerateBtn.textContent = 'Regenerating...';
        
        await processDocument(currentDocumentId);
        
        elements.regenerateBtn.disabled = false;
        elements.regenerateBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17 10C17 13.866 13.866 17 10 17C6.134 17 3 13.866 3 10C3 6.134 6.134 3 10 3C11.848 3 13.536 3.752 14.778 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M12 5H17V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Regenerar Documento
        `;
        
    } catch (error) {
        console.error('Error regenerating:', error);
        showError('Error regenerating the document.');
        elements.regenerateBtn.disabled = false;
    }
}

function handleNewDocument() {
    // Resetear todo
    currentDocumentId = null;
    resetFileSelection();
    hidePreviewSection();
    hideCoverLetterSection();
    
    // Volver arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showCoverLetterSection() {
    elements.coverLetterSection.classList.remove('hidden');
    elements.coverLetterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideCoverLetterSection() {
    elements.coverLetterSection.classList.add('hidden');
}

function displayCoverLetterPreview(markdownContent) {
    // Convertir Markdown a HTML (simplificado)
    let html = markdownContent;
    
    // Convertir encabezados
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Convertir negritas e itálicas
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convertir párrafos (líneas que no son encabezados)
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
    
    elements.coverLetterContent.innerHTML = processedLines.join('\n');
}

async function handleGenerateCoverLetter() {
    if (!currentDocumentId) {
        showError('No document available to generate Cover Letter.');
        return;
    }
    
    try {
        // Deshabilitar botón durante la generación
        elements.generateCoverLetterBtn.disabled = true;
        elements.generateCoverLetterBtn.textContent = 'Generating Cover Letter...';
        
        // Mostrar la nueva sección de Cover Letter
        showCoverLetterSection();
        
        // Mostrar spinner y ocultar contenido en la sección de Cover Letter
        elements.coverLetterLoadingSpinner.classList.remove('hidden');
        elements.coverLetterContent.classList.add('hidden');
        elements.coverLetterActionButtons.style.display = 'none';
        
        // Generar Cover Letter
        const response = await fetch(`${API_BASE_URL}/api/generate-cover-letter/${currentDocumentId}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            let errorMessage = 'Error generating Cover Letter.';
            try {
                const error = await response.json();
                errorMessage = error.detail || errorMessage;
            } catch (jsonError) {
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // Validar que el Cover Letter tenga contenido
        if (!data.cover_letter_markdown) {
            throw new Error('Generated Cover Letter is empty.');
        }
        
        // Mostrar previsualización del Cover Letter en la nueva sección
        displayCoverLetterPreview(data.cover_letter_markdown);
        
        // Ocultar spinner y mostrar contenido
        elements.coverLetterLoadingSpinner.classList.add('hidden');
        elements.coverLetterContent.classList.remove('hidden');
        elements.coverLetterActionButtons.style.display = 'flex';
        
        // Habilitar botón nuevamente
        elements.generateCoverLetterBtn.disabled = false;
        elements.generateCoverLetterBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 2C9 1.44772 9.44772 1 10 1H14C14.5523 1 15 1.44772 15 2V5H18C18.5523 5 19 5.44772 19 6V18C19 18.5523 18.5523 19 18 19H6C5.44772 19 5 18.5523 5 18V6C5 5.44772 5.44772 5 6 5H9V2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 9H15M9 13H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Generate Cover Letter
        `;
        
    } catch (error) {
        console.error('Error generating Cover Letter:', error);
        
        let userMessage = error.message || 'Error generating Cover Letter.';
        
        // Si es un error de red
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            userMessage = 'Network error. Please check your connection and try again.';
        }
        
        showError(userMessage);
        
        // Ocultar sección de Cover Letter si hay error
        hideCoverLetterSection();
        
        // Restaurar botón
        elements.generateCoverLetterBtn.disabled = false;
        elements.generateCoverLetterBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 2C9 1.44772 9.44772 1 10 1H14C14.5523 1 15 1.44772 15 2V5H18C18.5523 5 19 5.44772 19 6V18C19 18.5523 18.5523 19 18 19H6C5.44772 19 5 18.5523 5 18V6C5 5.44772 5.44772 5 6 5H9V2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 9H15M9 13H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Generate Cover Letter
        `;
    }
}

async function handleDownloadCoverLetter() {
    if (!currentDocumentId) {
        showError('No Cover Letter to download.');
        return;
    }
    
    window.location.href = `${API_BASE_URL}/api/download-cover-letter/${currentDocumentId}`;
}

async function handleRegenerateCoverLetter() {
    if (!currentDocumentId) {
        showError('No Cover Letter to regenerate.');
        return;
    }
    
    try {
        elements.regenerateCoverLetterBtn.disabled = true;
        elements.regenerateCoverLetterBtn.textContent = 'Regenerating...';
        
        // Mostrar spinner y ocultar contenido
        elements.coverLetterLoadingSpinner.classList.remove('hidden');
        elements.coverLetterContent.classList.add('hidden');
        
        // Regenerar Cover Letter
        const response = await fetch(`${API_BASE_URL}/api/generate-cover-letter/${currentDocumentId}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            let errorMessage = 'Error regenerating Cover Letter.';
            try {
                const error = await response.json();
                errorMessage = error.detail || errorMessage;
            } catch (jsonError) {
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // Validar que el Cover Letter tenga contenido
        if (!data.cover_letter_markdown) {
            throw new Error('Generated Cover Letter is empty.');
        }
        
        // Mostrar previsualización del Cover Letter regenerado
        displayCoverLetterPreview(data.cover_letter_markdown);
        
        // Ocultar spinner y mostrar contenido
        elements.coverLetterLoadingSpinner.classList.add('hidden');
        elements.coverLetterContent.classList.remove('hidden');
        
        // Restaurar botón
        elements.regenerateCoverLetterBtn.disabled = false;
        elements.regenerateCoverLetterBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17 10C17 13.866 13.866 17 10 17C6.134 17 3 13.866 3 10C3 6.134 6.134 3 10 3C11.848 3 13.536 3.752 14.778 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M12 5H17V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Regenerate Cover Letter
        `;
        
    } catch (error) {
        console.error('Error regenerating Cover Letter:', error);
        showError('Error regenerating the Cover Letter.');
        
        // Restaurar vista
        elements.coverLetterLoadingSpinner.classList.add('hidden');
        elements.coverLetterContent.classList.remove('hidden');
        elements.regenerateCoverLetterBtn.disabled = false;
    }
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

// ==========================================
// UTILIDADES
// ==========================================

console.log('DeclarationLetterOnline - Script charged');


