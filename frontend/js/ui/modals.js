/**
 * Módulo de Manejo de Modales
 * DeclarationLetterOnline
 */

import { CONFIG } from '../config.js';
import { setSelectedAIProvider } from '../state.js';
import { getAvailableProviders } from '../api.js';
import { showSuccessNotification } from '../utils.js';

// Referencias a elementos del DOM
let elements = {};

/**
 * Inicializa el módulo de modales
 */
export function initializeModals(domElements) {
    elements = domElements;
    
    // Event listeners para modales
    if (elements.closeModalBtn) {
        elements.closeModalBtn.addEventListener('click', closeErrorModal);
    }
    
    if (elements.closeErrorBtn) {
        elements.closeErrorBtn.addEventListener('click', closeErrorModal);
    }
    
    if (elements.errorModal) {
        elements.errorModal.addEventListener('click', (e) => {
            if (e.target === elements.errorModal) {
                closeErrorModal();
            }
        });
    }
    
    // Modal de ajustes
    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', openSettingsModal);
    }
    
    if (elements.closeSettingsBtn) {
        elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);
    }
    
    if (elements.changeAiModelBtn) {
        elements.changeAiModelBtn.addEventListener('click', handleChangeAiModel);
    }
    
    if (elements.settingsModal) {
        elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === elements.settingsModal) {
                closeSettingsModal();
            }
        });
    }
    
    // Enter key en password de ajustes
    if (elements.settingsPassword) {
        elements.settingsPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleChangeAiModel();
            }
        });
    }
    
    // Modal de vista previa
    if (elements.closePreviewModalBtn) {
        elements.closePreviewModalBtn.addEventListener('click', closeDocumentPreviewModal);
    }
    
    if (elements.documentPreviewModal) {
        elements.documentPreviewModal.addEventListener('click', (e) => {
            if (e.target === elements.documentPreviewModal) {
                closeDocumentPreviewModal();
            }
        });
    }
}

/**
 * Muestra un mensaje de error
 */
export function showError(message) {
    if (elements.errorMessage && elements.errorModal) {
        elements.errorMessage.textContent = message;
        elements.errorModal.classList.remove('hidden');
    }
}

/**
 * Cierra el modal de error
 */
function closeErrorModal() {
    if (elements.errorModal) {
        elements.errorModal.classList.add('hidden');
    }
}

/**
 * Abre el modal de ajustes
 */
function openSettingsModal() {
    if (elements.settingsModal) {
        elements.settingsModal.classList.remove('hidden');
    }
}

/**
 * Cierra el modal de ajustes
 */
function closeSettingsModal() {
    if (elements.settingsModal) {
        elements.settingsModal.classList.add('hidden');
        if (elements.settingsPassword) {
            elements.settingsPassword.value = '';
        }
        hideSettingsError();
    }
}

/**
 * Muestra un error en el modal de ajustes
 */
function showSettingsError(message) {
    if (elements.settingsErrorMessage) {
        elements.settingsErrorMessage.textContent = message;
        elements.settingsErrorMessage.classList.remove('hidden');
    }
}

/**
 * Oculta el error del modal de ajustes
 */
function hideSettingsError() {
    if (elements.settingsErrorMessage) {
        elements.settingsErrorMessage.classList.add('hidden');
        elements.settingsErrorMessage.textContent = '';
    }
}

/**
 * Maneja el cambio de modelo de IA
 */
async function handleChangeAiModel() {
    const selectedModel = elements.aiModelSelect?.value;
    const password = elements.settingsPassword?.value;
    
    hideSettingsError();
    
    // Validar contraseña
    if (password !== CONFIG.SETTINGS_PASSWORD) {
        showSettingsError('Incorrect password. Please try again.');
        return;
    }
    
    try {
        // Verificar que el proveedor esté disponible
        const data = await getAvailableProviders();
        
        if (!data.success || !data.providers.includes(selectedModel)) {
            showSettingsError(`Provider '${selectedModel}' is not available. Please configure the API keys.`);
            return;
        }
        
        // Cambiar el proveedor
        setSelectedAIProvider(selectedModel);
        
        // Nombre del modelo
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

/**
 * Cierra el modal de vista previa de documento
 */
function closeDocumentPreviewModal() {
    if (elements.documentPreviewModal) {
        elements.documentPreviewModal.classList.add('hidden');
    }
}

/**
 * Carga los ajustes guardados
 */
export function loadSavedSettings() {
    const savedProvider = localStorage.getItem('selectedAIProvider') || 'google_gemini';
    if (elements.aiModelSelect) {
        elements.aiModelSelect.value = savedProvider;
    }
    console.log(`Loaded saved AI Provider: ${savedProvider}`);
}

