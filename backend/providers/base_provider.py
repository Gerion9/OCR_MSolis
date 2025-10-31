"""
Base Provider - Clase base para todos los proveedores de IA
Define la interfaz común y configuración compartida
"""

import logging
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional, Dict, Generator
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ProviderConfig:
    """Configuración común para todos los proveedores"""
    api_key: str
    model_name: str
    request_timeout: int = 300
    temperature: float = 0.7
    top_p: float = 0.95
    top_k: int = 40


class BaseAIProvider:
    """
    Clase base abstracta para todos los proveedores de IA
    Define la interfaz común que todos deben implementar
    """
    
    def __init__(self, config: ProviderConfig):
        """
        Inicializa el proveedor base
        
        Args:
            config: Configuración del proveedor
        """
        self.config = config
        self.system_prompt = ""
        self.declaration_guide = ""
        self.cover_letter_system_prompt = ""
        self.cover_letter_structure = ""
        
        logger.debug(f"Inicializando {self.__class__.__name__} con modelo: {config.model_name}")
    
    # ==================== MÉTODOS DE CARGA DE XML ====================
    
    def load_xml_files(self, system_prompt_path: str, declaration_path: str) -> bool:
        """
        Carga archivos XML de Declaration Letter
        
        Args:
            system_prompt_path: Ruta al archivo SystemPrompt.xml
            declaration_path: Ruta al archivo Declaration.xml
        
        Returns:
            bool: True si se cargaron correctamente
        """
        try:
            with open(system_prompt_path, 'r', encoding='utf-8') as f:
                self.system_prompt = f.read()
            
            with open(declaration_path, 'r', encoding='utf-8') as f:
                self.declaration_guide = f.read()
            
            logger.debug("Declaration Letter XML files loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Error loading Declaration Letter XML files: {e}")
            return False
    
    def load_cover_letter_xml_files(self, system_prompt_path: str, structure_path: str) -> bool:
        """
        Carga archivos XML de Cover Letter
        
        Args:
            system_prompt_path: Ruta al archivo SystemPrompt.xml de Cover Letter
            structure_path: Ruta al archivo CoverLetterStructure.xml
        
        Returns:
            bool: True si se cargaron correctamente
        """
        try:
            with open(system_prompt_path, 'r', encoding='utf-8') as f:
                self.cover_letter_system_prompt = f.read()
            
            with open(structure_path, 'r', encoding='utf-8') as f:
                self.cover_letter_structure = f.read()
            
            logger.debug("Cover Letter XML files loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Error loading Cover Letter XML files: {e}")
            return False
    
    # ==================== MÉTODOS DE CONSTRUCCIÓN DE PROMPTS ====================
    
    def _build_declaration_prompt(self, questionnaire_text: str) -> str:
        """
        Construye el prompt completo para Declaration Letter
        
        Args:
            questionnaire_text: Texto del cuestionario
        
        Returns:
            str: Prompt completo
        """
        return f"""
{self.system_prompt}

{self.declaration_guide}

---

CUESTIONARIO DEL AFECTADO:
{questionnaire_text}

---
"""
    
    def _build_cover_letter_prompt(self, declaration_letter_content: str) -> str:
        """
        Construye el prompt completo para Cover Letter
        
        Args:
            declaration_letter_content: Contenido del Declaration Letter
        
        Returns:
            str: Prompt completo
        """
        return f"""
{self.cover_letter_system_prompt}

{self.cover_letter_structure}

---

DECLARATION LETTER DEL SOBREVIVIENTE:
{declaration_letter_content}

---
"""
    
    # ==================== MÉTODOS DE EXTRACCIÓN DE TEXTO ====================
    
    def extract_text_from_file(self, file_path: str) -> Optional[str]:
        """
        Extrae texto de un archivo
        
        Args:
            file_path: Ruta al archivo
        
        Returns:
            str: Texto extraído o None si hay error
        """
        try:
            file_extension = Path(file_path).suffix.lower()
            
            # Para archivos de texto plano
            if file_extension in ['.txt', '.md']:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            
            # Para archivos DOCX
            elif file_extension == '.docx':
                try:
                    import docx
                    doc = docx.Document(file_path)
                    text = []
                    for paragraph in doc.paragraphs:
                        text.append(paragraph.text)
                    return '\n'.join(text)
                except ImportError:
                    logger.warning("python-docx no disponible, usando lectura básica")
                    return self._extract_text_from_docx_basic(file_path)
            
            # Para archivos PDF
            elif file_extension == '.pdf':
                try:
                    import PyPDF2
                    with open(file_path, 'rb') as f:
                        pdf_reader = PyPDF2.PdfReader(f)
                        text = []
                        for page in pdf_reader.pages:
                            text.append(page.extract_text())
                        return '\n'.join(text)
                except ImportError:
                    logger.warning("PyPDF2 no disponible")
                    return None
            
            else:
                logger.error(f"Tipo de archivo no soportado: {file_extension}")
                return None
        
        except Exception as e:
            logger.error(f"Error al extraer texto: {e}")
            return None
    
    def _extract_text_from_docx_basic(self, file_path: str) -> Optional[str]:
        """
        Extrae texto de un DOCX usando solo librerías estándar
        
        Args:
            file_path: Ruta al archivo DOCX
        
        Returns:
            str: Texto extraído
        """
        try:
            import zipfile
            
            with zipfile.ZipFile(file_path, 'r') as docx:
                xml_content = docx.read('word/document.xml')
                tree = ET.fromstring(xml_content)
                
                namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                paragraphs = tree.findall('.//w:p', namespaces)
                
                text = []
                for paragraph in paragraphs:
                    texts = paragraph.findall('.//w:t', namespaces)
                    paragraph_text = ''.join([t.text for t in texts if t.text])
                    if paragraph_text:
                        text.append(paragraph_text)
                
                return '\n'.join(text)
        
        except Exception as e:
            logger.error(f"Error en extracción básica de DOCX: {e}")
            return None
    
    # ==================== MÉTODOS ABSTRACTOS (deben ser implementados por subclases) ====================
    
    def generate_declaration_letter(self, questionnaire_text: str) -> Optional[str]:
        """Genera una declaration letter (debe ser implementado por subclases)"""
        raise NotImplementedError("Subclass must implement generate_declaration_letter")
    
    def generate_declaration_letter_stream(self, questionnaire_text: str) -> Generator[str, None, None]:
        """Genera una declaration letter con streaming (debe ser implementado por subclases)"""
        raise NotImplementedError("Subclass must implement generate_declaration_letter_stream")
    
    def generate_cover_letter(self, declaration_letter_content: str) -> Optional[str]:
        """Genera un cover letter (debe ser implementado por subclases)"""
        raise NotImplementedError("Subclass must implement generate_cover_letter")
    
    def generate_cover_letter_stream(self, declaration_letter_content: str) -> Generator[str, None, None]:
        """Genera un cover letter con streaming (debe ser implementado por subclases)"""
        raise NotImplementedError("Subclass must implement generate_cover_letter_stream")

