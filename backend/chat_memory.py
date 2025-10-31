"""
Sistema de Chat con Memoria usando mem0
Permite a los usuarios modificar documentos mediante conversación con IA
ACTUALIZADO: Ahora soporta múltiples proveedores de IA
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from mem0 import MemoryClient

from backend.providers.base_provider import BaseAIProvider, ProviderConfig
from backend.providers.gemini_provider import GeminiProvider


class ChatMemorySystem:
    """
    Sistema de chat con memoria a largo plazo usando mem0
    Ahora agnóstico del proveedor de IA
    """
    
    def __init__(self, mem0_api_key: str, google_api_key: str, model_name: str, ai_provider: Optional[BaseAIProvider] = None):
        """
        Inicializa el sistema de chat con memoria
        
        Args:
            mem0_api_key: API key de mem0
            google_api_key: API key del proveedor de IA (para compatibilidad backwards)
            model_name: Nombre del modelo a usar (para compatibilidad backwards)
            ai_provider: Instancia de un proveedor de IA (opcional, si no se provee usa Gemini)
        """
        self.mem0_api_key = mem0_api_key
        
        # Inicializar mem0
        self.memory_client = MemoryClient(api_key=mem0_api_key)
        
        # Configurar proveedor de IA
        if ai_provider:
            # Usar proveedor personalizado
            self.ai_provider = ai_provider
        else:
            # Compatibilidad backwards: usar Gemini por defecto
            config = ProviderConfig(
                api_key=google_api_key,
                model_name=model_name,
                request_timeout=300,
                temperature=0.7,
                top_p=0.95,
                top_k=40
            )
            self.ai_provider = GeminiProvider(config)
        
        # Para compatibilidad con código existente
        self.model_name = model_name
        
        # Prompt del sistema
        self.system_prompt = """You are an intelligent assistant helping users edit and improve their Declaration Letters and Cover Letters for T-Visa petitions.

Your capabilities:
1. Answer questions about the document content
2. Suggest improvements to the text
3. Help rewrite specific sections
4. Provide legal writing advice for immigration documents
5. Remember previous conversations and user preferences

CRITICAL INSTRUCTION FOR MODIFICATIONS:
When the user asks to modify or rewrite anything, you MUST:
1. Explain the changes briefly FIRST (1-2 sentences)
2. Add a line with ONLY: "MODIFIED_TEXT:"
3. After that line, OUTPUT THE COMPLETE DOCUMENT FROM START TO FINISH with modifications integrated

DO NOT output only the modified section. DO NOT summarize. DO NOT truncate.
The system will replace the entire document with what you provide after "MODIFIED_TEXT:"

If the document is long, still output ALL of it. Users need the FULL document with changes integrated.

Format requirements:
- Keep the formal tone appropriate for legal documents
- Maintain ALL sections of the original document
- Preserve the original markdown formatting (## headers, paragraphs, etc.)
- Include everything from the beginning to the end of the document

Current document context will be provided with each query.
DO NOT answer requests that are not related to your capabilities."""

    def get_user_memories(self, user_id: str, query: Optional[str] = None, days: int = 30) -> List[Dict]:
        """
        Recupera memorias relevantes del usuario
        
        Args:
            user_id: ID del usuario
            query: Query opcional para buscar memorias específicas
            days: Días de antigüedad máxima de las memorias (default: 30)
            
        Returns:
            Lista de memorias relevantes y recientes
        """
        try:
            # Buscar memorias relevantes
            if query:
                all_memories = self.memory_client.search(query, user_id=user_id)
            else:
                all_memories = self.memory_client.get_all(user_id=user_id)
            
            # Filtrar por fecha
            fresh_memories = []
            cutoff_date = datetime.now() - timedelta(days=days)
            
            for memory in all_memories:
                mem_time_str = memory.get("timestamp") or memory.get("created_at")
                if mem_time_str:
                    try:
                        # Parsear timestamp
                        mem_time = datetime.fromisoformat(mem_time_str.replace("Z", "+00:00"))
                        if mem_time.replace(tzinfo=None) > cutoff_date:
                            fresh_memories.append(memory)
                    except Exception as e:
                        print(f"Timestamp parse error: {e}")
                        # Incluir memoria si no podemos parsear la fecha
                        fresh_memories.append(memory)
            
            return fresh_memories
            
        except Exception as e:
            print(f"Error retrieving memories: {e}")
            return []
    
    def save_conversation(self, user_id: str, user_message: str, assistant_message: str):
        """
        Guarda una conversación en la memoria
        
        Args:
            user_id: ID del usuario
            user_message: Mensaje del usuario
            assistant_message: Respuesta del asistente
        """
        try:
            conversation = [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": assistant_message}
            ]
            
            # Solo guardar si la respuesta tiene contenido significativo
            if len(assistant_message) > 20:
                self.memory_client.add(
                    messages=conversation,
                    user_id=user_id
                )
                print(f"Memory saved for user {user_id}")
            
        except Exception as e:
            print(f"Error saving memory: {e}")
    
    def generate_response(
        self, 
        user_message: str, 
        user_id: str,
        document_content: Optional[str] = None,
        document_type: str = "declaration"
    ) -> str:
        """
        Genera una respuesta usando Gemini con contexto de memoria y documento
        
        Args:
            user_message: Mensaje del usuario
            user_id: ID del usuario
            document_content: Contenido del documento actual (opcional)
            document_type: Tipo de documento ('declaration' o 'cover')
            
        Returns:
            Respuesta generada por la IA
        """
        try:
            # Construir prompt completo
            full_prompt = self._build_prompt(user_message, user_id, document_content, document_type)
            
            # Generar respuesta usando el proveedor de IA
            response = self._generate_with_provider(full_prompt)
            
            if response:
                return response
            else:
                return "I apologize, but I couldn't generate a response. Please try rephrasing your question."
                
        except Exception as e:
            print(f"Error generating response: {e}")
            return f"I encountered an error while processing your request. Please try again."
    
    def generate_response_stream(
        self, 
        user_message: str, 
        user_id: str,
        document_content: Optional[str] = None,
        document_type: str = "declaration"
    ):
        """
        Genera una respuesta usando Gemini con streaming (para respuestas en tiempo real)
        
        Args:
            user_message: Mensaje del usuario
            user_id: ID del usuario
            document_content: Contenido del documento actual (opcional)
            document_type: Tipo de documento ('declaration' o 'cover')
            
        Yields:
            str: Chunks de texto generados en tiempo real
        """
        try:
            # Construir prompt completo
            full_prompt = self._build_prompt(user_message, user_id, document_content, document_type)
            
            # Generar respuesta con streaming usando el proveedor de IA
            for chunk in self._generate_with_provider_stream(full_prompt):
                if chunk:
                    yield chunk
                    
        except Exception as e:
            print(f"Error generating response stream: {e}")
            yield f"I encountered an error while processing your request. Please try again."
    
    def _build_prompt(
        self,
        user_message: str,
        user_id: str,
        document_content: Optional[str] = None,
        document_type: str = "declaration"
    ) -> str:
        """
        Construye el prompt completo para el modelo
        
        Args:
            user_message: Mensaje del usuario
            user_id: ID del usuario
            document_content: Contenido del documento actual
            document_type: Tipo de documento
            
        Returns:
            Prompt completo formateado
        """
        # Obtener memorias relevantes
        memories = self.get_user_memories(user_id, query=user_message)
        
        # Construir contexto de memoria
        memory_context = ""
        if memories:
            memory_texts = [m.get("memory", "") for m in memories if m.get("memory")]
            if memory_texts:
                memory_context = "Previous conversation context:\n" + "\n".join(memory_texts[:5])
        
        # Construir contexto del documento
        document_context = ""
        if document_content:
            # Proporcionar el documento completo sin truncar
            # El modelo tiene suficiente contexto para procesarlo
            document_context = f"""
Current {document_type.title()} Letter content:
---
{document_content}
---
"""

        full_prompt = f"""{self.system_prompt}

{memory_context}

{document_context}

Current Time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

User Question: {user_message}

Response Instructions:

For questions/advice: Answer normally without "MODIFIED_TEXT:"

For modification requests: You MUST follow this EXACT format:
1. Brief explanation (1-2 sentences)
2. New line with ONLY the text: MODIFIED_TEXT:
3. THE COMPLETE DOCUMENT from beginning to end with changes integrated

CRITICAL RULES:
- Output the ENTIRE document after "MODIFIED_TEXT:" (not a summary, not a fragment, not just the changed part)
- If the document has 50 paragraphs, output all 50 paragraphs (with the requested changes)
- DO NOT truncate or shorten the document
- DO NOT say "rest remains the same" - actually output everything
- Include ALL sections: beginning, middle, and end
- You have sufficient tokens available - use them for complete output"""

        return full_prompt
    
    def _generate_with_provider(self, prompt: str) -> Optional[str]:
        """
        Genera respuesta usando el proveedor de IA configurado
        
        Args:
            prompt: Prompt completo
        
        Returns:
            Respuesta generada
        """
        try:
            # Si el proveedor es Gemini, usar su método directo
            if isinstance(self.ai_provider, GeminiProvider):
                response = self.ai_provider.model.generate_content(prompt)
                return response.text if response and response.text else None
            else:
                # Para otros proveedores, usar método genérico
                # (esto requerirá implementar un método genérico en BaseAIProvider)
                return self.ai_provider._generate_content(prompt, use_stream=False)
        except Exception as e:
            print(f"Error generating response: {e}")
            return None
    
    def _generate_with_provider_stream(self, prompt: str):
        """
        Genera respuesta con streaming usando el proveedor de IA configurado
        
        Args:
            prompt: Prompt completo
        
        Yields:
            Chunks de texto
        """
        try:
            # Si el proveedor es Gemini, usar su método directo
            if isinstance(self.ai_provider, GeminiProvider):
                response = self.ai_provider.model.generate_content(prompt, stream=True)
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
            else:
                # Para otros proveedores, usar método genérico
                yield from self.ai_provider._generate_content(prompt, use_stream=True)
        except Exception as e:
            print(f"Error generating response stream: {e}")
            yield f"Error: {str(e)}"
    
    def chat(
        self, 
        user_message: str, 
        user_id: str,
        document_content: Optional[str] = None,
        document_type: str = "declaration",
        save_to_memory: bool = True
    ) -> str:
        """
        Procesa un mensaje de chat completo (genera respuesta y guarda en memoria)
        
        Args:
            user_message: Mensaje del usuario
            user_id: ID del usuario
            document_content: Contenido del documento actual
            document_type: Tipo de documento
            save_to_memory: Si guardar la conversación en memoria
            
        Returns:
            Respuesta del asistente
        """
        # Generar respuesta
        response = self.generate_response(
            user_message=user_message,
            user_id=user_id,
            document_content=document_content,
            document_type=document_type
        )
        
        # Guardar en memoria
        if save_to_memory:
            self.save_conversation(user_id, user_message, response)
        
        return response
    
    def clear_user_memories(self, user_id: str):
        """
        Limpia todas las memorias de un usuario
        
        Args:
            user_id: ID del usuario
        """
        try:
            all_memories = self.memory_client.get_all(user_id=user_id)
            for memory in all_memories:
                if "id" in memory:
                    self.memory_client.delete(memory["id"])
            print(f"Cleared all memories for user {user_id}")
        except Exception as e:
            print(f"Error clearing memories: {e}")