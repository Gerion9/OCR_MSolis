/**
 * Módulo de Sistema de Chat con Memoria
 * DeclarationLetterOnline
 */

import { API_BASE_URL } from '../config.js';
import { appState } from '../state.js';
import { convertMarkdownToHTML, extractTextFromHTML } from '../utils.js';
import { showError } from './modals.js';

// Referencias a elementos del DOM
let chatElements = {};
let chatHistory = [];

/**
 * Inicializa el módulo de chat
 */
export function initializeChat(domElements) {
    chatElements = domElements;
    
    console.log('📞 Inicializando módulo de chat...');
    console.log('  - chatFab:', chatElements.chatFab ? '✓' : '✗');
    console.log('  - chatModal:', chatElements.chatModal ? '✓' : '✗');
    console.log('  - closeChatBtn:', chatElements.closeChatBtn ? '✓' : '✗');
    
    // Event listeners
    if (chatElements.chatFab) {
        chatElements.chatFab.addEventListener('click', openChatModal);
        console.log('  ✓ Event listener agregado al botón FAB');
    } else {
        console.error('  ✗ No se encontró el botón FAB del chat');
    }
    
    if (chatElements.closeChatBtn) {
        chatElements.closeChatBtn.addEventListener('click', closeChatModal);
    }
    
    if (chatElements.chatModal) {
        chatElements.chatModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('chat-modal-overlay')) {
                closeChatModal();
            }
        });
    }
    
    if (chatElements.sendChatBtn) {
        chatElements.sendChatBtn.addEventListener('click', sendChatMessage);
    }
    
    if (chatElements.chatInput) {
        // Auto-resize textarea
        chatElements.chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        
        // Enviar con Enter (Shift+Enter para nueva línea)
        chatElements.chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
}

/**
 * Abre el modal de chat
 */
function openChatModal() {
    console.log('🚀 openChatModal llamado');
    if (chatElements.chatModal) {
        console.log('  ✓ Modal encontrado, removiendo clase hidden');
        chatElements.chatModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        if (chatHistory.length > 0) {
            const welcome = chatElements.chatMessages.querySelector('.chat-welcome');
            if (welcome) {
                welcome.remove();
            }
        }
        
        setTimeout(() => {
            if (chatElements.chatInput) {
                chatElements.chatInput.focus();
            }
        }, 300);
    }
}

/**
 * Cierra el modal de chat
 */
function closeChatModal() {
    if (chatElements.chatModal) {
        chatElements.chatModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Agrega un mensaje al chat
 */
function addChatMessage(content, isUser = false, hasApplyButton = false, modifiedText = null) {
    const welcome = chatElements.chatMessages.querySelector('.chat-welcome');
    if (welcome) {
        welcome.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`;
    
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`;
    
    let formattedContent;
    if (isUser) {
        formattedContent = content
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    } else {
        formattedContent = convertMarkdownToHTML(content);
    }
    
    bubble.innerHTML = formattedContent;
    
    if (hasApplyButton && modifiedText) {
        const applyBtn = document.createElement('button');
        applyBtn.className = 'chat-apply-btn';
        applyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Apply to Document
        `;
        applyBtn.onclick = () => applyModification(modifiedText);
        bubble.appendChild(applyBtn);
    }
    
    messageDiv.appendChild(bubble);
    chatElements.chatMessages.appendChild(messageDiv);
    
    chatElements.chatMessages.scrollTop = chatElements.chatMessages.scrollHeight;
    
    chatHistory.push({
        content: content,
        isUser: isUser,
        timestamp: new Date()
    });
}

/**
 * Envía un mensaje al chat con streaming
 */
async function sendChatMessage() {
    const message = chatElements.chatInput.value.trim();
    
    if (!message) return;
    
    if (!appState.activeDocumentId) {
        showError('No document selected. Please select a document first.');
        return;
    }
    
    addChatMessage(message, true);
    
    chatElements.chatInput.value = '';
    chatElements.chatInput.style.height = 'auto';
    
    chatElements.chatInput.disabled = true;
    chatElements.sendChatBtn.disabled = true;
    
    const responsePlaceholder = createChatMessagePlaceholder();
    
    try {
        const requestBody = {
            message: message,
            document_id: appState.activeDocumentId,
            document_type: appState.activeDocumentType,
            user_id: `user_${appState.activeDocumentId}`
        };
        
        const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error('Chat stream request failed');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';
        let hasModification = false;
        let modifiedText = null;
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'content' && data.chunk) {
                            fullResponse += data.chunk;
                            updateChatMessagePlaceholder(responsePlaceholder, fullResponse);
                            
                        } else if (data.type === 'complete') {
                            hasModification = data.has_modification || false;
                            modifiedText = data.modified_text || null;
                            
                        } else if (data.type === 'error') {
                            removeChatMessagePlaceholder(responsePlaceholder);
                            showError(data.error || 'Error in chat response');
                            return;
                        }
                    } catch (parseError) {
                        console.error('Error parsing SSE data:', parseError);
                    }
                }
            }
        }
        
        finalizeChatMessage(responsePlaceholder, fullResponse, hasModification, modifiedText);
        
    } catch (error) {
        console.error('Chat streaming error:', error);
        removeChatMessagePlaceholder(responsePlaceholder);
        showError('Failed to communicate with AI assistant');
    } finally {
        chatElements.chatInput.disabled = false;
        chatElements.sendChatBtn.disabled = false;
        chatElements.chatInput.focus();
    }
}

/**
 * Crea un placeholder para el mensaje del asistente
 */
function createChatMessagePlaceholder() {
    const welcome = chatElements.chatMessages.querySelector('.chat-welcome');
    if (welcome) {
        welcome.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message chat-message-assistant';
    messageDiv.dataset.placeholder = 'true';
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble-assistant';
    bubble.innerHTML = '<span class="chat-cursor">▊</span>';
    
    messageDiv.appendChild(bubble);
    chatElements.chatMessages.appendChild(messageDiv);
    
    chatElements.chatMessages.scrollTop = chatElements.chatMessages.scrollHeight;
    
    return messageDiv;
}

/**
 * Actualiza el placeholder con el contenido acumulado
 */
function updateChatMessagePlaceholder(placeholder, content) {
    const bubble = placeholder.querySelector('.chat-bubble');
    if (!bubble) return;
    
    let formattedContent = convertMarkdownToHTML(content);
    
    bubble.innerHTML = formattedContent + '<span class="chat-cursor">▊</span>';
    
    chatElements.chatMessages.scrollTop = chatElements.chatMessages.scrollHeight;
}

/**
 * Finaliza el mensaje (quitar cursor y agregar botón si es necesario)
 */
function finalizeChatMessage(placeholder, content, hasModification, modifiedText) {
    const bubble = placeholder.querySelector('.chat-bubble');
    if (!bubble) return;
    
    placeholder.removeAttribute('data-placeholder');
    
    let formattedContent = convertMarkdownToHTML(content);
    
    bubble.innerHTML = formattedContent;
    
    if (hasModification && modifiedText) {
        const applyBtn = document.createElement('button');
        applyBtn.className = 'chat-apply-btn';
        applyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Apply to Document
        `;
        applyBtn.onclick = () => applyModification(modifiedText);
        bubble.appendChild(applyBtn);
    }
    
    chatElements.chatMessages.scrollTop = chatElements.chatMessages.scrollHeight;
}

/**
 * Remueve el placeholder en caso de error
 */
function removeChatMessagePlaceholder(placeholder) {
    if (placeholder && placeholder.parentNode) {
        placeholder.remove();
    }
}

/**
 * Aplica la modificación al documento
 */
function applyModification(modifiedText) {
    if (!modifiedText) {
        showError('No modified text provided');
        return;
    }
    
    const panel = document.querySelector(`.document-panel[data-document-id="${appState.activeDocumentId}"]`);
    if (!panel) {
        showError('Document panel not found');
        return;
    }
    
    const contentEl = panel.querySelector(`.${appState.activeDocumentType}-content`);
    if (!contentEl) {
        showError('Document content not found');
        return;
    }
    
    const currentContent = extractTextFromHTML(contentEl.innerHTML);
    const modifiedTextLength = modifiedText.length;
    const currentContentLength = currentContent.length;
    
    if (modifiedTextLength < currentContentLength * 0.3 && currentContentLength > 500) {
        const confirmApply = confirm(
            'Warning: The modified text appears to be shorter than expected.\n\n' +
            'This might indicate that only a fragment was provided instead of the complete document.\n\n' +
            'Do you want to apply these changes anyway?\n\n' +
            `Current document: ${currentContentLength} characters\n` +
            `Modified text: ${modifiedTextLength} characters`
        );
        
        if (!confirmApply) {
            return;
        }
    }
    
    const htmlContent = convertMarkdownToHTML(modifiedText);
    
    contentEl.innerHTML = htmlContent;
    
    if (appState.processedDocuments[appState.activeDocumentId]) {
        if (appState.activeDocumentType === 'declaration') {
            appState.processedDocuments[appState.activeDocumentId].declarationContent = modifiedText;
        } else if (appState.activeDocumentType === 'cover') {
            appState.processedDocuments[appState.activeDocumentId].coverLetterContent = modifiedText;
        }
    }
    
    closeChatModal();
    
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = '✓ Changes applied to document!';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

