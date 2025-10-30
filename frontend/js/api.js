/**
 * Módulo de Llamadas a la API
 * DeclarationLetterOnline
 */

import { API_BASE_URL } from './config.js';

/**
 * Sube un archivo al servidor
 */
export async function uploadFile(file) {
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

/**
 * Obtiene los proveedores de IA disponibles
 */
export async function getAvailableProviders() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/providers`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting providers:', error);
        return { success: false, providers: [] };
    }
}

/**
 * Descarga un documento editado
 */
export async function downloadEditedDocument(documentId, type, content) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/download-edited/${documentId}/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: content })
        });
        
        if (response.ok) {
            return await response.blob();
        } else {
            throw new Error('Download failed');
        }
    } catch (error) {
        console.error('Error downloading document:', error);
        throw error;
    }
}