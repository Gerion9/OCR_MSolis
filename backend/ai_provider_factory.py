"""
Factory para crear procesadores de IA según el proveedor seleccionado
Soporta múltiples proveedores: Gemini, Groq, etc.
"""

import os
import logging
from typing import Optional, Dict, Any
from pathlib import Path
from enum import Enum

logger = logging.getLogger(__name__)


class AIProvider(Enum):
    """Enum de proveedores de IA soportados"""
    GEMINI = "google_gemini"
    GROQ = "groq_ai"


class BaseAIProvider:
    """
    Clase base para todos los proveedores de IA
    Define la interfaz común que todos deben implementar
    """
    
    def __init__(self, api_key: str, model_name: str, request_timeout: int = 300):
        self.api_key = api_key
        self.model_name = model_name
        self.request_timeout = request_timeout
        self.system_prompt = ""
        self.declaration_guide = ""
        self.cover_letter_system_prompt = ""
        self.cover_letter_structure = ""
    
    def generate_content(self, prompt: str, stream: bool = False):
        """Genera contenido. Debe ser implementado por cada proveedor"""
        raise NotImplementedError("Subclass must implement generate_content")
    
    def extract_text_from_file(self, file_path: str) -> Optional[str]:
        """Extrae texto de un archivo"""
        raise NotImplementedError("Subclass must implement extract_text_from_file")
    
    def load_xml_files(self, system_prompt_path: str, declaration_path: str) -> bool:
        """Carga archivos XML de Declaration Letter"""
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
        """Carga archivos XML de Cover Letter"""
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


class AIProviderFactory:
    """
    Factory para crear instancias de procesadores de IA
    según el proveedor seleccionado
    """
    
    @staticmethod
    def get_provider_config(provider: str) -> Dict[str, Any]:
        """
        Obtiene la configuración del proveedor desde variables de entorno
        
        Args:
            provider: Nombre del proveedor (google_gemini, groq_ai, etc.)
        
        Returns:
            Diccionario con la configuración del proveedor
        """
        provider = provider.lower()
        
        if provider == AIProvider.GEMINI.value:
            return {
                "api_key": os.getenv("GEMINI_API_KEY", ""),
                "model_name": os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
                "timeout": int(os.getenv("GEMINI_TIMEOUT", "300")),
                "provider_type": AIProvider.GEMINI
            }
        elif provider == AIProvider.GROQ.value:
            return {
                "api_key": os.getenv("GROQ_API_KEY", ""),
                "model_name": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                "timeout": int(os.getenv("GROQ_TIMEOUT", "300")),
                "provider_type": AIProvider.GROQ
            }
        else:
            logger.error(f"Proveedor desconocido: {provider}")
            return None
    
    @staticmethod
    def create_processor(provider: str):
        """
        Crea un procesador de IA según el proveedor especificado
        
        Args:
            provider: Nombre del proveedor (google_gemini, groq_ai)
        
        Returns:
            Instancia del procesador de IA o None si hay error
        """
        config = AIProviderFactory.get_provider_config(provider)
        
        if not config:
            logger.error(f"No se pudo obtener configuración para: {provider}")
            return None
        
        # Validar API key
        if not config["api_key"] or config["api_key"] == "tu_api_key_aqui":
            logger.error(f"API key no configurada para {provider}")
            return None
        
        # Importar y crear el procesador específico
        try:
            if config["provider_type"] == AIProvider.GEMINI:
                from backend.ai_processor import GeminiAIProcessor
                processor = GeminiAIProcessor(
                    api_key=config["api_key"],
                    model_name=config["model_name"],
                    request_timeout=config["timeout"]
                )
            
            elif config["provider_type"] == AIProvider.GROQ:
                from backend.ai_processor import GroqAIProcessor
                processor = GroqAIProcessor(
                    api_key=config["api_key"],
                    model_name=config["model_name"],
                    request_timeout=config["timeout"]
                )
            
            else:
                logger.error(f"Tipo de proveedor no implementado: {config['provider_type']}")
                return None
            
            # Cargar archivos XML
            base_path = Path(__file__).parent.parent
            
            # Declaration Letter XMLs
            system_prompt_path = base_path / "DeclarationLetter" / "SystemPrompt.xml"
            declaration_path = base_path / "DeclarationLetter" / "Declaration.xml"
            
            if not processor.load_xml_files(str(system_prompt_path), str(declaration_path)):
                logger.error("No se pudieron cargar los archivos XML de Declaration Letter")
                return None
            
            # Cover Letter XMLs
            cover_letter_system_prompt_path = base_path / "CoverLetter" / "SystemPrompt.xml"
            cover_letter_structure_path = base_path / "CoverLetter" / "CoverLetterStructure.xml"
            
            if not processor.load_cover_letter_xml_files(
                str(cover_letter_system_prompt_path), 
                str(cover_letter_structure_path)
            ):
                logger.warning("No se pudieron cargar archivos XML de Cover Letter")
            
            logger.info(f"Procesador de IA creado exitosamente: {provider} ({config['model_name']})")
            return processor
            
        except Exception as e:
            logger.error(f"Error al crear procesador de IA para {provider}: {e}")
            return None
    
    @staticmethod
    def validate_provider(provider: str) -> bool:
        """
        Valida si un proveedor está disponible y configurado
        
        Args:
            provider: Nombre del proveedor
        
        Returns:
            True si el proveedor está disponible
        """
        config = AIProviderFactory.get_provider_config(provider)
        if not config:
            return False
        
        # Verificar API key
        if not config["api_key"] or config["api_key"] == "tu_api_key_aqui":
            return False
        
        return True
    
    @staticmethod
    def get_available_providers() -> list:
        """
        Obtiene lista de proveedores disponibles y configurados
        
        Returns:
            Lista de nombres de proveedores disponibles
        """
        available = []
        
        for provider in AIProvider:
            if AIProviderFactory.validate_provider(provider.value):
                available.append(provider.value)
        
        return available

