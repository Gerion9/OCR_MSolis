"""
Gemini Provider - Implementación específica para Google Gemini
"""

import time
import logging
from typing import Optional, Generator
import google.generativeai as genai

from backend.providers.base_provider import BaseAIProvider, ProviderConfig

logger = logging.getLogger(__name__)


# Configuraciones específicas de Gemini
GEMINI_DEFAULT_GENERATION_CONFIG = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8000,
}

GEMINI_COVER_LETTER_GENERATION_CONFIG = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 12000,
    "candidate_count": 1,
}

GEMINI_SAFETY_SETTINGS = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_NONE"
    },
]


class GeminiProvider(BaseAIProvider):
    """
    Proveedor de IA usando Google Gemini
    """
    
    def __init__(self, config: ProviderConfig):
        """
        Inicializa el proveedor de Gemini
        
        Args:
            config: Configuración del proveedor
        """
        super().__init__(config)
        
        # Configurar Gemini
        genai.configure(api_key=config.api_key)
        
        # Configurar generación
        self.generation_config = GEMINI_DEFAULT_GENERATION_CONFIG.copy()
        self.cover_letter_generation_config = GEMINI_COVER_LETTER_GENERATION_CONFIG.copy()
        self.safety_settings = GEMINI_SAFETY_SETTINGS.copy()
        
        # Inicializar modelos
        self.model = genai.GenerativeModel(
            model_name=config.model_name,
            generation_config=self.generation_config,
            safety_settings=self.safety_settings
        )
        
        self.cover_letter_model = genai.GenerativeModel(
            model_name=config.model_name,
            generation_config=self.cover_letter_generation_config,
            safety_settings=self.safety_settings
        )
        
        logger.info(f"Gemini Provider inicializado con modelo: {config.model_name}")
    
    def _generate_content(
        self,
        prompt: str,
        model: genai.GenerativeModel,
        doc_type: str = "documento",
        use_stream: bool = False
    ):
        """
        Método interno para generar contenido con Gemini
        
        Args:
            prompt: Prompt completo
            model: Modelo de Gemini a usar
            doc_type: Tipo de documento para logging
            use_stream: Si usar streaming o no
        
        Returns/Yields:
            str o Generator de strings
        """
        try:
            logger.debug(f"Generando {doc_type} con Gemini...")
            logger.debug(f"Usando timeout de {self.config.request_timeout} segundos...")
            
            start_time = time.time()
            
            if use_stream:
                # Modo streaming
                response = model.generate_content(prompt, stream=True)
                
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
                
                elapsed_time = time.time() - start_time
                logger.debug(f"Generación con streaming de {doc_type} completada en {elapsed_time:.2f} segundos")
            else:
                # Modo normal
                response = model.generate_content(prompt)
                
                elapsed_time = time.time() - start_time
                logger.debug(f"Generación de {doc_type} completada en {elapsed_time:.2f} segundos")
                
                return response.text if response and response.text else None
        
        except Exception as e:
            error_msg = str(e)
            if "timeout" in error_msg.lower() or "timed out" in error_msg.lower() or "ReadTimeout" in str(type(e).__name__):
                logger.error(f"La generación de {doc_type} excedió el tiempo límite de {self.config.request_timeout}s")
                logger.debug("Sugerencia: El documento es muy largo o el servidor está ocupado. Intente nuevamente.")
            else:
                logger.error(f"Error al generar {doc_type}: {e}")
            raise Exception(f"Error al generar {doc_type}: {error_msg}")
    
    def generate_declaration_letter(self, questionnaire_text: str) -> Optional[str]:
        """
        Genera una declaration letter basada en el cuestionario
        
        Args:
            questionnaire_text: Texto del cuestionario del afectado
        
        Returns:
            str: Declaration letter en formato Markdown o None si hay error
        """
        full_prompt = self._build_declaration_prompt(questionnaire_text)
        return self._generate_content(full_prompt, self.model, "Declaration Letter", use_stream=False)
    
    def generate_declaration_letter_stream(self, questionnaire_text: str) -> Generator[str, None, None]:
        """
        Genera una declaration letter con streaming
        
        Args:
            questionnaire_text: Texto del cuestionario del afectado
        
        Yields:
            str: Chunks de texto generados en tiempo real
        """
        full_prompt = self._build_declaration_prompt(questionnaire_text)
        yield from self._generate_content(full_prompt, self.model, "Declaration Letter", use_stream=True)
    
    def generate_cover_letter(self, declaration_letter_content: str) -> Optional[str]:
        """
        Genera un Cover Letter basado en el Declaration Letter
        
        Args:
            declaration_letter_content: Contenido completo del Declaration Letter
        
        Returns:
            str: Cover Letter en formato Markdown o None si hay error
        """
        if not self.cover_letter_system_prompt or not self.cover_letter_structure:
            logger.error("Archivos XML de Cover Letter no cargados")
            return None
        
        full_prompt = self._build_cover_letter_prompt(declaration_letter_content)
        return self._generate_content(full_prompt, self.cover_letter_model, "Cover Letter", use_stream=False)
    
    def generate_cover_letter_stream(self, declaration_letter_content: str) -> Generator[str, None, None]:
        """
        Genera un Cover Letter con streaming
        
        Args:
            declaration_letter_content: Contenido completo del Declaration Letter
        
        Yields:
            str: Chunks de texto generados en tiempo real
        """
        if not self.cover_letter_system_prompt or not self.cover_letter_structure:
            logger.error("Archivos XML de Cover Letter no cargados")
            raise Exception("Cover Letter XML files not loaded")
        
        full_prompt = self._build_cover_letter_prompt(declaration_letter_content)
        yield from self._generate_content(full_prompt, self.cover_letter_model, "Cover Letter", use_stream=True)
    
    def validate_api_key(self) -> bool:
        """
        Valida que la API key funcione correctamente
        
        Returns:
            bool: True si la API key es válida
        """
        try:
            test_model = genai.GenerativeModel(model_name=self.config.model_name)
            response = test_model.generate_content("Hello")
            logger.debug("API key de Gemini validada exitosamente")
            return response is not None
        except Exception as e:
            logger.error(f"Error al validar API key de Gemini: {e}")
            return False

