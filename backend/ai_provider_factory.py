"""
Factory para crear procesadores de IA según el proveedor seleccionado
Soporta múltiples proveedores: Gemini, Groq, etc.
"""

import os
import logging
from typing import Optional, Dict, Any
from pathlib import Path
from enum import Enum

from backend.providers.base_provider import BaseAIProvider, ProviderConfig
from backend.providers.gemini_provider import GeminiProvider
from backend.providers.groq_provider import GroqProvider

logger = logging.getLogger(__name__)


class AIProvider(Enum):
    """Enum de proveedores de IA soportados"""
    GEMINI = "google_gemini"
    GROQ = "groq_ai"


class AIProviderFactory:
    """
    Factory para crear instancias de procesadores de IA
    según el proveedor seleccionado
    
    Este es el ÚNICO punto de entrada para crear proveedores configurados
    """
    
    @staticmethod
    def _load_xml_prompts(processor: BaseAIProvider) -> bool:
        """
        Carga los archivos XML de prompts en el procesador
        
        CENTRALIZADO: Esta es la única función que carga XMLs
        
        Args:
            processor: Instancia del procesador a configurar
        
        Returns:
            bool: True si se cargaron correctamente
        """
        try:
            base_path = Path(__file__).parent.parent
            
            # Declaration Letter XMLs
            system_prompt_path = base_path / "DeclarationLetter" / "SystemPrompt.xml"
            declaration_path = base_path / "DeclarationLetter" / "Declaration.xml"
            
            if not processor.load_xml_files(str(system_prompt_path), str(declaration_path)):
                logger.error("No se pudieron cargar los archivos XML de Declaration Letter")
                return False
            
            # Cover Letter XMLs
            cover_letter_system_prompt_path = base_path / "CoverLetter" / "SystemPrompt.xml"
            cover_letter_structure_path = base_path / "CoverLetter" / "CoverLetterStructure.xml"
            
            if not processor.load_cover_letter_xml_files(
                str(cover_letter_system_prompt_path), 
                str(cover_letter_structure_path)
            ):
                logger.warning("No se pudieron cargar archivos XML de Cover Letter")
                # No es crítico, continuar
            
            return True
            
        except Exception as e:
            logger.error(f"Error al cargar archivos XML: {e}")
            return False
    
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
                "model_name": os.getenv("GEMINI_MODEL", ""),
                "timeout": int(os.getenv("GEMINI_TIMEOUT", "300")),
                "provider_type": AIProvider.GEMINI
            }
        elif provider == AIProvider.GROQ.value:
            return {
                "api_key": os.getenv("GROQ_API_KEY", ""),
                "model_name": os.getenv("GROQ_MODEL", ""),
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
        
        # Crear configuración del proveedor
        provider_config = ProviderConfig(
            api_key=config["api_key"],
            model_name=config["model_name"],
            request_timeout=config["timeout"]
        )
        
        # Crear el procesador específico
        try:
            if config["provider_type"] == AIProvider.GEMINI:
                processor = GeminiProvider(provider_config)
            
            elif config["provider_type"] == AIProvider.GROQ:
                processor = GroqProvider(provider_config)
            
            else:
                logger.error(f"Tipo de proveedor no implementado: {config['provider_type']}")
                return None
            
            # Cargar archivos XML (CENTRALIZADO aquí)
            if not AIProviderFactory._load_xml_prompts(processor):
                logger.error("No se pudieron cargar los prompts XML")
                return None
            
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