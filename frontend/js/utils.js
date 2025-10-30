/**
 * Funciones Utilitarias
 * DeclarationLetterOnline
 */

/**
 * Formatea el tamaño de archivo en bytes a formato legible
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Convierte contenido Markdown a HTML
 */
export function convertMarkdownToHTML(markdownContent) {
    let html = markdownContent;
    
    // Convertir encabezados
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Convertir negritas e itálicas
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convertir párrafos
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
    
    return processedLines.join('\n');
}

/**
 * Extrae texto limpio de HTML y lo convierte a Markdown
 */
export function extractTextFromHTML(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let markdown = '';
    
    // Procesar cada elemento hijo
    tempDiv.childNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            const textContent = node.textContent.trim();
            
            if (!textContent) {
                markdown += '\n';
                return;
            }
            
            // Convertir encabezados de HTML a markdown
            if (tagName === 'h1') {
                markdown += `# ${textContent}\n\n`;
            } else if (tagName === 'h2') {
                markdown += `## ${textContent}\n\n`;
            } else if (tagName === 'h3') {
                markdown += `### ${textContent}\n\n`;
            } else if (tagName === 'h4') {
                markdown += `#### ${textContent}\n\n`;
            } else if (tagName === 'p') {
                markdown += `${textContent}\n\n`;
            } else if (tagName === 'div') {
                // Para divs, procesar recursivamente
                markdown += extractTextFromHTML(node.innerHTML);
            } else {
                markdown += `${textContent}\n\n`;
            }
        } else if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text) {
                markdown += `${text}\n\n`;
            }
        }
    });
    
    // Limpiar múltiples líneas vacías consecutivas
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    
    return markdown.trim();
}

/**
 * Extrae el nombre del afectado del Declaration Letter
 */
export function extractApplicantName(markdownContent) {
    // Patrón 1: "I, [Nombre Apellido], declare..."
    let match = markdownContent.match(/I,\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,4}),\s+(?:declare|solemnly|state)/i);
    if (match) return cleanApplicantName(match[1].trim());
    
    // Patrón 2: "My name is [Nombre Apellido]"
    match = markdownContent.match(/My name is\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,4})(?:\.|,|\s+and)/i);
    if (match) return cleanApplicantName(match[1].trim());
    
    // Patrón 3: "DECLARATION OF [Nombre Apellido]"
    match = markdownContent.match(/DECLARATION OF\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,4})(?:\s+(?:IN|FOR|TO|ON|REGARDING))?/i);
    if (match) return cleanApplicantName(match[1].trim());
    
    // Patrón 4: "I am [Nombre Apellido]"
    match = markdownContent.match(/I am\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,4})(?:\.|,|\s+and)/i);
    if (match) return cleanApplicantName(match[1].trim());
    
    // Patrón 5: "Re:" o "RE:"
    match = markdownContent.match(/RE?:\s*(?:Application|Petition|Declaration|Case)\s+(?:of|for)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,4})/i);
    if (match) return cleanApplicantName(match[1].trim());
    
    return "Applicant";
}

/**
 * Limpia el nombre del afectado eliminando palabras innecesarias
 */
function cleanApplicantName(name) {
    const unwantedWords = ['IN', 'SUPPORT', 'FOR', 'TO', 'ON', 'REGARDING', 'OF', 'THE', 'A', 'AN'];
    const words = name.split(/\s+/);
    const cleanedWords = words.filter(word => !unwantedWords.includes(word.toUpperCase()));
    return cleanedWords.join(' ').trim();
}

/**
 * Muestra una notificación de éxito
 */
export function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = '✓ ' + message;
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

