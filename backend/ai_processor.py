"""
Procesador de IA para generar Declaration Letters
Integración con Google Gemini API
"""

import os
import time
import xml.etree.ElementTree as ET
from typing import Optional, Dict
import google.generativeai as genai
from pathlib import Path


class AIProcessor:
    """
    Procesador de IA para generar declaration letters usando Gemini
    """
    
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-pro", request_timeout: int = 300):
        """
        Inicializa el procesador de IA
        
        Args:
            api_key: API key de Google Gemini
            model_name: Nombre del modelo a usar
            request_timeout: Timeout en segundos para las solicitudes (default: 300s = 5 minutos)
        """
        self.api_key = api_key
        self.model_name = model_name
        self.request_timeout = request_timeout
        self.system_prompt = ""
        self.declaration_guide = ""
        self.cover_letter_system_prompt = ""
        self.cover_letter_structure = ""
        
        # Configurar Gemini
        genai.configure(api_key=api_key)
        
        # Configuración de generación estándar
        self.generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8000,
        }
        
        # Configuración optimizada para Cover Letter (documentos más largos)
        self.cover_letter_generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 12000,  # Más tokens para Cover Letter
            "candidate_count": 1,  # Solo una respuesta para ser más rápido
        }
        
        # Configuración de seguridad
        self.safety_settings = [
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
        
        # Inicializar el modelo
        self.model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=self.generation_config,
            safety_settings=self.safety_settings
        )
        
        # Modelo optimizado para Cover Letter
        self.cover_letter_model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=self.cover_letter_generation_config,
            safety_settings=self.safety_settings
        )
        
        print(f"✓ Procesador de IA inicializado con modelo: {model_name}")
        print(f"✓ Timeout configurado: {request_timeout} segundos")
    
    def load_xml_files(self, system_prompt_path: str, declaration_path: str) -> bool:
        """
        Carga los archivos XML con las instrucciones y estructura
        
        Args:
            system_prompt_path: Ruta al archivo SystemPrompt.xml
            declaration_path: Ruta al archivo Declaration.xml
        
        Returns:
            bool: True si se cargaron correctamente
        """
        try:
            # Leer SystemPrompt.xml
            with open(system_prompt_path, 'r', encoding='utf-8') as f:
                self.system_prompt = f.read()
            
            # Leer Declaration.xml
            with open(declaration_path, 'r', encoding='utf-8') as f:
                self.declaration_guide = f.read()
            
            print("✓ Archivos XML de Declaration Letter cargados correctamente")
            return True
        
        except Exception as e:
            print(f"✗ Error al cargar archivos XML de Declaration Letter: {e}")
            return False
    
    def load_cover_letter_xml_files(self, system_prompt_path: str, structure_path: str) -> bool:
        """
        Carga los archivos XML para Cover Letter
        
        Args:
            system_prompt_path: Ruta al archivo SystemPrompt.xml de Cover Letter
            structure_path: Ruta al archivo CoverLetterStructure.xml
        
        Returns:
            bool: True si se cargaron correctamente
        """
        try:
            # Leer SystemPrompt.xml de Cover Letter
            with open(system_prompt_path, 'r', encoding='utf-8') as f:
                self.cover_letter_system_prompt = f.read()
            
            # Leer CoverLetterStructure.xml
            with open(structure_path, 'r', encoding='utf-8') as f:
                self.cover_letter_structure = f.read()
            
            print("✓ Archivos XML de Cover Letter cargados correctamente")
            return True
        
        except Exception as e:
            print(f"✗ Error al cargar archivos XML de Cover Letter: {e}")
            return False
    
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
                    # Si python-docx no está disponible, intentar lectura básica
                    print("Advertencia: python-docx no disponible, usando lectura básica")
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
                    print("Advertencia: PyPDF2 no disponible")
                    return None
            
            else:
                print(f"Tipo de archivo no soportado: {file_extension}")
                return None
        
        except Exception as e:
            print(f"Error al extraer texto: {e}")
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
                
                # Extraer todo el texto
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
            print(f"Error en extracción básica de DOCX: {e}")
            return None
    
    def generate_declaration_letter(self, questionnaire_text: str) -> Optional[str]:
        """
        Genera una declaration letter basada en el cuestionario
        
        Args:
            questionnaire_text: Texto del cuestionario del afectado
        
        Returns:
            str: Declaration letter en formato Markdown o None si hay error
        """
        try:
            # Construir el prompt completo
            full_prompt = self._build_prompt(questionnaire_text)
            
            print("Generando declaration letter con IA...")
            print(f"Usando timeout de {self.request_timeout} segundos...")
            
            # Generar respuesta (el timeout está configurado en el cliente HTTP)
            start_time = time.time()
            
            response = self.model.generate_content(full_prompt)
            
            elapsed_time = time.time() - start_time
            print(f"✓ Generación completada en {elapsed_time:.2f} segundos")
            
            if response and response.text:
                print("✓ Declaration letter generada exitosamente")
                return response.text
            else:
                print("✗ No se pudo generar contenido")
                return None
        
        except Exception as e:
            error_msg = str(e)
            if "timeout" in error_msg.lower() or "timed out" in error_msg.lower() or "ReadTimeout" in str(type(e).__name__):
                print(f"✗ Error: La generación excedió el tiempo límite de {self.request_timeout}s")
                print("Sugerencia: El documento es muy largo o el servidor está ocupado. Intente nuevamente.")
            else:
                print(f"✗ Error al generar declaration letter: {e}")
            raise Exception(f"Error al generar declaration letter: {error_msg}")
    
    def _build_prompt(self, questionnaire_text: str) -> str:
        """
        Construye el prompt completo para la IA
        
        Args:
            questionnaire_text: Texto del cuestionario
        
        Returns:
            str: Prompt completo
        """
        prompt = f"""
{self.system_prompt}

{self.declaration_guide}

---

CUESTIONARIO DEL AFECTADO:
{questionnaire_text}

---

INSTRUCCIONES FINALES:
Basándote en el System Prompt, la Declaration Guide y el cuestionario proporcionado, genera una Declaration Letter completa en formato Markdown. 

IMPORTANTE:
1. Usa EXACTAMENTE el formato Markdown especificado (## para secciones, numeración consecutiva de párrafos)
2. NO incluyas texto introductorio de tu parte como asistente
3. NO incluyas disclaimers o notas del AI
4. Genera SOLAMENTE el contenido de la declaration letter
5. Sigue TODAS las reglas del System Prompt, especialmente:
   - Formato de título en dos líneas con ##
   - Numeración consecutiva de párrafos (1. 2. 3. etc.)
   - Secciones en el orden especificado
   - Lenguaje accesible sin jerga legal
   - Párrafos largos y detallados

Genera la declaration letter ahora:
"""
        return prompt
    
    def generate_cover_letter(self, declaration_letter_content: str) -> Optional[str]:
        """
        Genera un Cover Letter basado en el Declaration Letter
        
        Args:
            declaration_letter_content: Contenido completo del Declaration Letter
        
        Returns:
            str: Cover Letter en formato Markdown o None si hay error
        """
        try:
            # Validar que se hayan cargado los archivos XML de Cover Letter
            if not self.cover_letter_system_prompt or not self.cover_letter_structure:
                print("✗ Archivos XML de Cover Letter no cargados")
                return None
            
            # Construir el prompt para el Cover Letter
            full_prompt = self._build_cover_letter_prompt(declaration_letter_content)
            
            print("Generando Cover Letter con IA...")
            print(f"Usando timeout de {self.request_timeout} segundos...")
            
            # Generar respuesta usando el modelo optimizado para Cover Letter
            # (el timeout está configurado en el cliente HTTP)
            start_time = time.time()
            
            response = self.cover_letter_model.generate_content(full_prompt)
            
            elapsed_time = time.time() - start_time
            print(f"✓ Generación completada en {elapsed_time:.2f} segundos")
            
            if response and response.text:
                print("✓ Cover Letter generado exitosamente")
                return response.text
            else:
                print("✗ No se pudo generar contenido para el Cover Letter")
                return None
        
        except Exception as e:
            error_msg = str(e)
            if "timeout" in error_msg.lower() or "timed out" in error_msg.lower() or "ReadTimeout" in str(type(e).__name__):
                print(f"✗ Error: La generación excedió el tiempo límite de {self.request_timeout}s")
                print("Sugerencia: El documento es muy largo o el servidor está ocupado. Intente nuevamente.")
            else:
                print(f"✗ Error al generar Cover Letter: {e}")
            raise Exception(f"Error al generar Cover Letter: {error_msg}")
    
    def _build_cover_letter_prompt(self, declaration_letter_content: str) -> str:
        """
        Construye el prompt completo para generar el Cover Letter
        
        Args:
            declaration_letter_content: Contenido del Declaration Letter
        
        Returns:
            str: Prompt completo
        """
        prompt = f"""
{self.cover_letter_system_prompt}

{self.cover_letter_structure}

---

DECLARATION LETTER DEL SOBREVIVIENTE:
{declaration_letter_content}

---

INSTRUCCIONES FINALES:
Basándote en el System Prompt de Cover Letter, la estructura de Cover Letter y el Declaration Letter proporcionado, genera un Cover Letter completo y profesional para la petición de T-Visa.

IMPORTANTE:
1. Usa EXACTAMENTE la estructura de secciones I-VI especificada
2. Escribe en tercera persona neutral ("the applicant", "the declarant", "the victim")
3. Extrae información relevante del Declaration Letter y mapéala a los elementos de elegibilidad
4. Incluye citas del Declaration Letter usando el formato [Decl. ¶ n]
5. Incluye citas de regulaciones cuando sean requeridas (8 C.F.R., INA)
6. Usa párrafos extremadamente largos (10-14 oraciones por párrafo)
7. Incluye mínimo 6 citas textuales multilínea del Declaration Letter
8. NO incluyas texto introductorio de tu parte como asistente
9. NO incluyas disclaimers o notas del AI
10. Genera SOLAMENTE el contenido del Cover Letter
11. Mínimo 2,400 palabras en total
12. Sigue el estilo formal persuasivo narrativo especificado
13. Evita usar guiones largos (em dashes)

El Cover Letter debe incluir:
- Fecha y dirección USCIS
- RE: línea con nombre del aplicante
- Sección I: APPLICANT IS A VICTIM OF A SEVERE FORM OF TRAFFICKING IN PERSONS
- Sección II: APPLICANT IS PHYSICALLY PRESENT IN THE U.S. DUE TO TRAFFICKING
- Sección III: APPLICANT HAS COMPLIED WITH REASONABLE REQUESTS FOR ASSISTANCE
- Sección IV: APPLICANT WOULD SUFFER EXTREME HARDSHIP IF REMOVED FROM THE U.S.
- Sección V: APPLICANT IS ELIGIBLE FOR A WAIVER OF INADMISSIBILITY
- Sección VI: CONCLUSION
- Bloque de firma profesional

Genera el Cover Letter ahora:
"""
        return prompt
    
    def validate_api_key(self) -> bool:
        """
        Valida que la API key funcione correctamente
        
        Returns:
            bool: True si la API key es válida
        """
        try:
            # Intenta generar un texto simple para validar
            test_model = genai.GenerativeModel(model_name=self.model_name)
            response = test_model.generate_content("Hello")
            return response is not None
        except Exception as e:
            print(f"✗ Error al validar API key: {e}")
            return False


# ==================== FUNCIONES DE UTILIDAD ====================

def create_ai_processor(api_key: str, model_name: str = "gemini-1.5-pro", request_timeout: int = 300) -> Optional[AIProcessor]:
    """
    Crea y configura un procesador de IA
    
    Args:
        api_key: API key de Google Gemini
        model_name: Nombre del modelo
        request_timeout: Timeout en segundos para las solicitudes (default: 300s = 5 minutos)
    
    Returns:
        AIProcessor o None si hay error
    """
    try:
        processor = AIProcessor(api_key, model_name, request_timeout)
        
        # Obtener rutas de archivos XML
        base_path = Path(__file__).parent.parent
        
        # Archivos XML de Declaration Letter
        system_prompt_path = base_path / "DeclarationLetter" / "SystemPrompt.xml"
        declaration_path = base_path / "DeclarationLetter" / "Declaration.xml"
        
        # Archivos XML de Cover Letter
        cover_letter_system_prompt_path = base_path / "CoverLetter" / "SystemPrompt.xml"
        cover_letter_structure_path = base_path / "CoverLetter" / "CoverLetterStructure.xml"
        
        # Cargar archivos XML de Declaration Letter
        if not processor.load_xml_files(str(system_prompt_path), str(declaration_path)):
            return None
        
        # Cargar archivos XML de Cover Letter
        if not processor.load_cover_letter_xml_files(str(cover_letter_system_prompt_path), str(cover_letter_structure_path)):
            print("⚠ Advertencia: No se pudieron cargar archivos XML de Cover Letter")
            # No falla la creación del procesador, solo advierte
        
        return processor
    
    except Exception as e:
        print(f"✗ Error al crear procesador de IA: {e}")
        return None


