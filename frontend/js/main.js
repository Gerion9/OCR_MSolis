/**
 * Punto de Entrada Principal
 * DeclarationLetterOnline - Modular Version
 */

import { DOM_IDS } from './config.js';
import { initializeModals, loadSavedSettings } from './ui/modals.js';
import { initializeUpload, removeFromQueue } from './ui/upload.js';
import { initializeDocuments, closeDocumentTab, switchDocumentType, downloadDocument } from './ui/documents.js';
import { initializeChat } from './ui/chat.js';
import { toggleDocumentPreview } from './ui/preview.js';

// Recolectar referencias a elementos del DOM
function collectDOMElements() {
    const elements = {};
    
    for (const [key, id] of Object.entries(DOM_IDS)) {
        elements[key] = document.getElementById(id);
    }
    
    return elements;
}

/**
 * Inicialización al cargar el DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DeclarationLetterOnline (Multi-Document - Modular) initializing...');
    
    // Verificar librerías de preview
    console.log('Checking preview libraries...');
    console.log('PDF.js loaded:', typeof pdfjsLib !== 'undefined');
    console.log('Mammoth.js loaded:', typeof mammoth !== 'undefined');
    
    if (typeof mammoth === 'undefined') {
        console.warn('Mammoth.js library not loaded. DOCX preview will not be available.');
    }
    
    if (typeof pdfjsLib === 'undefined') {
        console.warn('PDF.js library not loaded. PDF preview will not be available.');
    }
    
    // Recolectar elementos del DOM
    const elements = collectDOMElements();
    
    // Inicializar módulos
    initializeModals(elements);
    initializeUpload(elements);
    initializeDocuments(elements);
    initializeChat(elements);
    
    // Cargar configuraciones guardadas
    loadSavedSettings();
    
    // Exponer funciones globalmente para eventos onclick en HTML
    window.removeFromQueue = removeFromQueue;
    window.toggleDocumentPreview = toggleDocumentPreview;
    window.closeDocumentTab = closeDocumentTab;
    window.switchDocumentType = switchDocumentType;
    window.downloadDocument = downloadDocument;
    
    console.log('DeclarationLetterOnline (Multi-Document - Modular) initialized successfully!');
});