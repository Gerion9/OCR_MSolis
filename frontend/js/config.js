/**
 * Configuración y Constantes Globales
 * DeclarationLetterOnline
 */

// URL base de la API
export const API_BASE_URL = window.location.origin;

// Límites y restricciones
export const CONFIG = {
    MAX_DOCUMENTS: 5,
    MAX_FILE_SIZE_MB: 10,
    MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
    VALID_EXTENSIONS: ['.docx', '.doc', '.pdf', '.txt'],
    TYPING_EFFECT_DELAY: 30, // ms entre actualizaciones de contenido
    PDF_PREVIEW_MAX_PAGES: 2,
    TEXT_PREVIEW_MAX_CHARS: 5000,
    SETTINGS_PASSWORD: '4767'
};

// IDs de elementos del DOM
export const DOM_IDS = {
    // Sección de subida
    uploadBox: 'uploadBox',
    fileInput: 'fileInput',
    selectFileBtn: 'selectFileBtn',
    
    // Cola de documentos
    documentsQueue: 'documentsQueue',
    queueList: 'queueList',
    queueCount: 'queueCount',
    processAllBtn: 'processAllBtn',
    
    // Sección de previsualización
    previewSection: 'previewSection',
    documentsTabs: 'documentsTabs',
    tabsHeader: 'tabsHeader',
    documentsViewer: 'documentsViewer',
    
    // Modales
    errorModal: 'errorModal',
    errorMessage: 'errorMessage',
    closeModalBtn: 'closeModalBtn',
    closeErrorBtn: 'closeErrorBtn',
    settingsBtn: 'settingsBtn',
    settingsModal: 'settingsModal',
    closeSettingsBtn: 'closeSettingsBtn',
    aiModelSelect: 'aiModelSelect',
    settingsPassword: 'settingsPassword',
    changeAiModelBtn: 'changeAiModelBtn',
    settingsErrorMessage: 'settingsErrorMessage',
    documentPreviewModal: 'documentPreviewModal',
    closePreviewModalBtn: 'closePreviewModalBtn',
    previewModalTitle: 'previewModalTitle',
    documentPreviewContainer: 'documentPreviewContainer',
    
    // Chat
    chatFab: 'chatFab',
    chatModal: 'chatModal',
    closeChatBtn: 'closeChatBtn',
    chatMessages: 'chatMessages',
    chatInput: 'chatInput',
    sendChatBtn: 'sendChatBtn'
};

// Textos de estado
export const STATUS_TEXTS = {
    pending: 'Pending',
    uploading: 'Uploading...',
    uploaded: 'Ready',
    processing: 'Processing...',
    completed: '✓ Completed',
    error: 'Error'
};

// Proveedores de IA disponibles
export const AI_PROVIDERS = {
    GOOGLE_GEMINI: 'google_gemini',
    GROQ_AI: 'groq_ai'
};

// Tipos de documentos
export const DOCUMENT_TYPES = {
    DECLARATION: 'declaration',
    COVER: 'cover'
};

