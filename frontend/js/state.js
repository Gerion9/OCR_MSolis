/**
 * Manejo de Estado Global de la Aplicación
 * DeclarationLetterOnline
 */

import { AI_PROVIDERS } from './config.js';

// Estado global de la aplicación
export const appState = {
    documentsQueue: [],  // Cola de archivos listos para procesar
    processedDocuments: {},  // Documentos ya procesados {documentId: {data}}
    activeDocumentId: null,  // ID del documento actualmente visible
    activeDocumentType: 'declaration',  // 'declaration' o 'cover'
    activeStreams: {},  // EventSource activos por documentId
    cancelledDocuments: new Set(),  // IDs de documentos cancelados manualmente
    isProcessing: false,  // Flag para indicar si hay procesamiento activo
    selectedAIProvider: localStorage.getItem('selectedAIProvider') || AI_PROVIDERS.GOOGLE_GEMINI
};

/**
 * Obtiene el proveedor de IA seleccionado
 */
export function getSelectedAIProvider() {
    return appState.selectedAIProvider || AI_PROVIDERS.GOOGLE_GEMINI;
}

/**
 * Establece el proveedor de IA seleccionado
 */
export function setSelectedAIProvider(provider) {
    appState.selectedAIProvider = provider;
    localStorage.setItem('selectedAIProvider', provider);
    console.log(`AI Provider cambiado a: ${provider}`);
}

/**
 * Construye una URL de API con el proveedor de IA actual
 */
export function buildAPIUrl(endpoint, documentId, additionalParams = {}) {
    const provider = getSelectedAIProvider();
    const params = new URLSearchParams({
        ai_provider: provider,
        ...additionalParams
    });
    
    let url = endpoint;
    if (documentId) {
        url = url.replace('{documentId}', documentId);
    }
    
    return `${url}?${params.toString()}`;
}

/**
 * Actualiza el estado del documento en la cola
 */
export function updateDocumentStatus(itemId, status) {
    const item = appState.documentsQueue.find(doc => doc.id == itemId);
    if (item) {
        item.status = status;
    }
}

/**
 * Encuentra un documento en la cola por ID
 */
export function findQueueItem(itemId) {
    return appState.documentsQueue.find(doc => doc.id == itemId);
}

/**
 * Elimina un documento de la cola
 */
export function removeFromState(itemId) {
    appState.documentsQueue = appState.documentsQueue.filter(item => item.id != itemId);
}

/**
 * Marca un documento como cancelado
 */
export function markAsCancelled(documentId) {
    appState.cancelledDocuments.add(documentId);
}

/**
 * Verifica si un documento fue cancelado
 */
export function isCancelled(documentId) {
    return appState.cancelledDocuments.has(documentId);
}

/**
 * Limpia el estado de cancelación de un documento
 */
export function clearCancelled(documentId) {
    appState.cancelledDocuments.delete(documentId);
}

