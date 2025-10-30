/**
 * Módulo de Vista Previa de Documentos
 * DeclarationLetterOnline
 */

import { CONFIG } from '../config.js';
import { findQueueItem } from '../state.js';
import { updateQueueUI } from './upload.js';
import { showError } from './modals.js';

/**
 * Alterna la vista previa de un documento en la cola
 */
export async function toggleDocumentPreview(itemId) {
    console.log('toggleDocumentPreview called with itemId:', itemId);
    
    const queueItem = findQueueItem(itemId);
    
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
    
    // Si se está expandiendo y no se ha renderizado, renderizar
    if (queueItem.previewExpanded && !queueItem.previewRendered) {
        // Actualizar UI primero para mostrar loading
        updateQueueUI();
        
        // Renderizar la vista previa
        await renderPreviewInQueue(queueItem);
    } else {
        // Solo actualizar UI
        updateQueueUI();
    }
}

/**
 * Renderiza la vista previa dentro del queue item
 */
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
        
        updateQueueUI();
        
    } catch (error) {
        console.error('Error rendering preview:', error);
        queueItem.previewHTML = `<div class="preview-error">Error loading preview: ${error.message}</div>`;
        queueItem.previewRendered = true;
        updateQueueUI();
    }
}

/**
 * Renderiza PDF y retorna HTML
 */
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
        
        const numPages = Math.min(pdf.numPages, CONFIG.PDF_PREVIEW_MAX_PAGES);
        
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.2 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            const imageDataUrl = canvas.toDataURL('image/png');
            
            const img = document.createElement('img');
            img.className = 'pdf-page-image';
            img.src = imageDataUrl;
            img.alt = `Page ${pageNum}`;
            
            container.appendChild(img);
        }
        
        if (pdf.numPages > CONFIG.PDF_PREVIEW_MAX_PAGES) {
            const morePages = document.createElement('div');
            morePages.className = 'more-pages-indicator';
            morePages.textContent = `+ ${pdf.numPages - CONFIG.PDF_PREVIEW_MAX_PAGES} more pages...`;
            container.appendChild(morePages);
        }
        
        return container.outerHTML;
    } catch (error) {
        throw new Error('Failed to render PDF: ' + error.message);
    }
}

/**
 * Renderiza DOCX y retorna HTML
 */
async function renderDOCXPreviewToHTML(file) {
    try {
        if (typeof mammoth === 'undefined') {
            throw new Error('DOCX preview library (Mammoth.js) not loaded. Please refresh the page.');
        }
        
        const arrayBuffer = await file.arrayBuffer();
        
        console.log('Converting DOCX to HTML...');
        
        const result = await mammoth.convertToHtml({arrayBuffer: arrayBuffer});
        
        console.log('Mammoth conversion complete');
        
        const docxContainer = document.createElement('div');
        docxContainer.className = 'docx-preview-wrapper';
        
        const docxContent = document.createElement('div');
        docxContent.className = 'docx-preview-content';
        docxContent.innerHTML = result.value;
        
        docxContainer.appendChild(docxContent);
        
        if (result.messages.length > 0) {
            console.warn('Conversion warnings:', result.messages);
        }
        
        return docxContainer.outerHTML;
    } catch (error) {
        console.error('DOCX render error:', error);
        throw new Error('Failed to render DOCX: ' + error.message);
    }
}

/**
 * Renderiza texto y retorna HTML
 */
async function renderTextPreviewToHTML(file) {
    try {
        const text = await file.text();
        
        const limitedText = text.length > CONFIG.TEXT_PREVIEW_MAX_CHARS 
            ? text.substring(0, CONFIG.TEXT_PREVIEW_MAX_CHARS) + '\n\n... (text truncated)' 
            : text;
        
        const pre = document.createElement('pre');
        pre.className = 'text-preview-content';
        pre.textContent = limitedText;
        
        return pre.outerHTML;
    } catch (error) {
        throw new Error('Failed to render text file: ' + error.message);
    }
}

