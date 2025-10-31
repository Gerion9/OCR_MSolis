"""
Groq Provider - Implementación específica para Groq AI
"""

import time
import logging
from typing import Optional, Generator

from backend.providers.base_provider import BaseAIProvider, ProviderConfig

logger = logging.getLogger(__name__)

# Importar Groq
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    logger.warning("Groq SDK no disponible. Instale con: pip install groq")

# Configuraciones específicas de Groq
GROQ_MAX_TOKENS_DECLARATION = 16000
GROQ_MAX_TOKENS_COVER = 8000


class GroqProvider(BaseAIProvider):
    """
    Proveedor de IA usando Groq
    """
    
    def __init__(self, config: ProviderConfig):
        """
        Inicializa el proveedor de Groq
        
        Args:
            config: Configuración del proveedor
        """
        super().__init__(config)
        
        if not GROQ_AVAILABLE:
            raise ImportError("Groq SDK no está instalado. Instale con: pip install groq")
        
        # Inicializar cliente de Groq
        self.client = Groq(api_key=config.api_key)
        
        logger.info(f"Groq Provider inicializado con modelo: {config.model_name}")
    
    def _generate_content(
        self,
        prompt: str,
        use_stream: bool = False,
        max_tokens: int = None
    ):
        """
        Método interno para generar contenido con Groq
        
        Args:
            prompt: Prompt completo
            use_stream: Si usar streaming o no
            max_tokens: Máximo de tokens a generar
        
        Returns/Yields:
            str o Generator de strings
        """
        if max_tokens is None:
            max_tokens = GROQ_MAX_TOKENS_DECLARATION
        
        try:
            logger.debug(f"Generando contenido con Groq (modelo: {self.config.model_name})...")
            start_time = time.time()
            
            if use_stream:
                # Modo streaming
                stream = self.client.chat.completions.create(
                    model=self.config.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=self.config.temperature,
                    max_tokens=max_tokens,
                    stream=True,
                    timeout=self.config.request_timeout
                )
                
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                
                elapsed_time = time.time() - start_time
                logger.debug(f"Generación con streaming completada en {elapsed_time:.2f} segundos")
            else:
                # Modo normal
                completion = self.client.chat.completions.create(
                    model=self.config.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=self.config.temperature,
                    max_tokens=max_tokens,
                    timeout=self.config.request_timeout
                )
                
                elapsed_time = time.time() - start_time
                logger.debug(f"Generación completada en {elapsed_time:.2f} segundos")
                
                return completion.choices[0].message.content
        
        except Exception as e:
            error_msg = str(e)
            if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
                logger.error(f"La generación excedió el tiempo límite de {self.config.request_timeout}s")
            else:
                logger.error(f"Error al generar contenido con Groq: {e}")
            raise Exception(f"Error al generar contenido: {error_msg}")
    
    def generate_declaration_letter(self, questionnaire_text: str) -> Optional[str]:
        """
        Genera una declaration letter basada en el cuestionario
        
        Args:
            questionnaire_text: Texto del cuestionario del afectado
        
        Returns:
            str: Declaration letter en formato Markdown o None si hay error
        """
        full_prompt = self._build_declaration_prompt(questionnaire_text)
        return self._generate_content(
            full_prompt,
            use_stream=False,
            max_tokens=GROQ_MAX_TOKENS_DECLARATION
        )
    
    def generate_declaration_letter_stream(self, questionnaire_text: str) -> Generator[str, None, None]:
        """
        Genera una declaration letter con streaming
        
        Args:
            questionnaire_text: Texto del cuestionario del afectado
        
        Yields:
            str: Chunks de texto generados en tiempo real
        """
        full_prompt = self._build_declaration_prompt(questionnaire_text)
        yield from self._generate_content(
            full_prompt,
            use_stream=True,
            max_tokens=GROQ_MAX_TOKENS_DECLARATION
        )
    
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
        return self._generate_content(
            full_prompt,
            use_stream=False,
            max_tokens=GROQ_MAX_TOKENS_COVER
        )
    
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
        yield from self._generate_content(
            full_prompt,
            use_stream=True,
            max_tokens=GROQ_MAX_TOKENS_COVER
        )

