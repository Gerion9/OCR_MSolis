"""
Providers package - Modular AI provider implementations
Contiene implementaciones específicas para cada proveedor de IA
"""

from backend.providers.base_provider import BaseAIProvider, ProviderConfig
from backend.providers.gemini_provider import GeminiProvider
from backend.providers.groq_provider import GroqProvider

__all__ = [
    'BaseAIProvider',
    'ProviderConfig',
    'GeminiProvider',
    'GroqProvider',
]

