"""
Convertidor de documentos Markdown a DOCX
Adaptado del script Convert_md_to_docx.py para uso en la aplicación web
"""

import re
import zipfile
import base64
from io import BytesIO
import xml.etree.ElementTree as ET
from typing import List, Tuple


# ==================== VARIABLES DE CONFIGURACIÓN ====================

FUENTE = "Century Schoolbook"
TAMAÑO_TITULO = 28          # 14pt
TAMAÑO_SUBTITULO = 24       # 12pt
TAMAÑO_TEXTO_NORMAL = 24    # 12pt
COLOR_TITULO = "000000"
COLOR_SUBTITULO = "000000"
COLOR_TEXTO_NORMAL = "000000"
SUBTITULO_NEGRITA = True
SUBTITULO_SUBRAYADO = True
JUSTIFICAR_TEXTO = True


# ==================== CLASE PRINCIPAL ====================

class DocxCreator:
    """Clase para crear documentos DOCX desde cero usando solo librerías estándar"""
    
    def __init__(self):
        self.paragraphs = []
        self.namespaces = {
            'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
            'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
            'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
        }
        
        # Registrar namespaces
        for prefix, uri in self.namespaces.items():
            ET.register_namespace(prefix, uri)
    
    def add_paragraph(self, runs: List[Tuple], alignment: str = 'left', 
                     is_title: bool = False, is_subtitle: bool = False):
        """
        Añade un párrafo con formato
        
        Args:
            runs: Lista de tuplas (texto, negrita, cursiva, subrayado, tamaño, color)
            alignment: 'left', 'center', 'right', 'justify'
            is_title: Si es un título
            is_subtitle: Si es un subtítulo
        """
        self.paragraphs.append({
            'runs': runs,
            'alignment': alignment,
            'is_title': is_title,
            'is_subtitle': is_subtitle
        })
    
    def _create_run_xml(self, text: str, bold: bool = False, italic: bool = False, 
                       underline: bool = False, size: int = 24, color: str = "000000"):
        """Crea el XML para un fragmento de texto (run)"""
        w = self.namespaces['w']
        
        run = ET.Element(f'{{{w}}}r')
        rPr = ET.SubElement(run, f'{{{w}}}rPr')
        
        # Fuente
        rFonts = ET.SubElement(rPr, f'{{{w}}}rFonts')
        rFonts.set(f'{{{w}}}ascii', FUENTE)
        rFonts.set(f'{{{w}}}hAnsi', FUENTE)
        
        # Tamaño (en half-points)
        sz = ET.SubElement(rPr, f'{{{w}}}sz')
        sz.set(f'{{{w}}}val', str(size))
        szCs = ET.SubElement(rPr, f'{{{w}}}szCs')
        szCs.set(f'{{{w}}}val', str(size))
        
        # Color
        color_elem = ET.SubElement(rPr, f'{{{w}}}color')
        color_elem.set(f'{{{w}}}val', color)
        
        # Negrita
        if bold:
            ET.SubElement(rPr, f'{{{w}}}b')
            ET.SubElement(rPr, f'{{{w}}}bCs')
        
        # Cursiva
        if italic:
            ET.SubElement(rPr, f'{{{w}}}i')
            ET.SubElement(rPr, f'{{{w}}}iCs')
        
        # Subrayado
        if underline:
            u = ET.SubElement(rPr, f'{{{w}}}u')
            u.set(f'{{{w}}}val', 'single')
        
        # Texto
        t = ET.SubElement(run, f'{{{w}}}t')
        t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        t.text = text
        
        return run
    
    def _create_paragraph_xml(self, paragraph_data: dict):
        """Crea el XML para un párrafo"""
        w = self.namespaces['w']
        
        p = ET.Element(f'{{{w}}}p')
        pPr = ET.SubElement(p, f'{{{w}}}pPr')
        
        # Alineación
        alignment_map = {
            'left': 'left',
            'center': 'center',
            'right': 'right',
            'justify': 'both'
        }
        jc = ET.SubElement(pPr, f'{{{w}}}jc')
        jc.set(f'{{{w}}}val', alignment_map[paragraph_data['alignment']])
        
        # Añadir runs
        for run_data in paragraph_data['runs']:
            text, bold, italic, underline, size, color = run_data
            run = self._create_run_xml(text, bold, italic, underline, size, color)
            p.append(run)
        
        return p
    
    def _create_document_xml(self) -> str:
        """Crea el document.xml principal"""
        w = self.namespaces['w']
        
        document = ET.Element(f'{{{w}}}document')
        body = ET.SubElement(document, f'{{{w}}}body')
        
        # Añadir todos los párrafos
        for para_data in self.paragraphs:
            p = self._create_paragraph_xml(para_data)
            body.append(p)
        
        return ET.tostring(document, encoding='unicode', method='xml')
    
    def _create_content_types_xml(self) -> str:
        """Crea [Content_Types].xml"""
        types = ET.Element('Types', xmlns='http://schemas.openxmlformats.org/package/2006/content-types')
        
        ET.SubElement(types, 'Default', Extension='rels', 
                     ContentType='application/vnd.openxmlformats-package.relationships+xml')
        ET.SubElement(types, 'Default', Extension='xml', ContentType='application/xml')
        ET.SubElement(types, 'Override', PartName='/word/document.xml', 
                     ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml')
        
        return ET.tostring(types, encoding='unicode', method='xml')
    
    def _create_rels_xml(self) -> str:
        """Crea _rels/.rels"""
        rels = ET.Element('Relationships', xmlns='http://schemas.openxmlformats.org/package/2006/relationships')
        
        ET.SubElement(rels, 'Relationship', 
                     Id='rId1',
                     Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
                     Target='word/document.xml')
        
        return ET.tostring(rels, encoding='unicode', method='xml')
    
    def _create_document_rels_xml(self) -> str:
        """Crea word/_rels/document.xml.rels"""
        rels = ET.Element('Relationships', xmlns='http://schemas.openxmlformats.org/package/2006/relationships')
        return ET.tostring(rels, encoding='unicode', method='xml')
    
    def save_to_bytes(self) -> bytes:
        """Guarda el documento como bytes en memoria"""
        bytes_io = BytesIO()
        
        with zipfile.ZipFile(bytes_io, 'w', zipfile.ZIP_DEFLATED) as docx:
            # [Content_Types].xml
            docx.writestr('[Content_Types].xml', 
                         '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + 
                         self._create_content_types_xml())
            
            # _rels/.rels
            docx.writestr('_rels/.rels',
                         '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + 
                         self._create_rels_xml())
            
            # word/document.xml
            docx.writestr('word/document.xml',
                         '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + 
                         self._create_document_xml())
            
            # word/_rels/document.xml.rels
            docx.writestr('word/_rels/document.xml.rels',
                         '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + 
                         self._create_document_rels_xml())
        
        bytes_io.seek(0)
        return bytes_io.read()


# ==================== FUNCIONES DE PARSING ====================

def parse_inline_formatting(text: str) -> List[Tuple[str, bool, bool]]:
    """
    Parsea formato inline (negritas, cursivas) en el texto
    
    Args:
        text: Texto con formato Markdown
    
    Returns:
        Lista de tuplas (texto, es_negrita, es_cursiva)
    """
    result = []
    
    # Patrón para encontrar **negrita**, *cursiva*, ***ambos***
    pattern = r'(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|[^*]+|\*)'
    
    matches = re.finditer(pattern, text)
    
    for match in matches:
        full_match = match.group(0)
        
        if match.group(2):  # ***texto***
            result.append((match.group(2), True, True))
        elif match.group(3):  # **texto**
            result.append((match.group(3), True, False))
        elif match.group(4):  # *texto*
            result.append((match.group(4), False, True))
        elif full_match and full_match != '*':
            result.append((full_match, False, False))
    
    return result


def parse_markdown_line(line: str) -> Tuple[str, List[Tuple[str, bool, bool]]]:
    """
    Parsea una línea de Markdown y extrae su tipo y contenido con formato
    
    Args:
        line: Línea de texto en formato Markdown
    
    Returns:
        (tipo, contenido_parseado)
        tipo: 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'empty'
    """
    line = line.rstrip()
    
    # Línea vacía
    if not line.strip():
        return 'empty', []
    
    # Encabezados
    h_match = re.match(r'^(#{1,6})\s+(.+)$', line)
    if h_match:
        level = len(h_match.group(1))
        content = h_match.group(2)
        return f'h{level}', parse_inline_formatting(content)
    
    # Párrafo normal
    return 'p', parse_inline_formatting(line)


# ==================== FUNCIÓN PRINCIPAL ====================

def convert_md_text_to_docx_binary(markdown_text: str) -> bytes:
    """
    Convierte texto Markdown a formato DOCX en binario
    
    Args:
        markdown_text: Texto en formato Markdown
    
    Returns:
        bytes: Contenido binario del archivo DOCX
    """
    lines = markdown_text.split('\n')
    
    # Crear documento
    doc = DocxCreator()
    
    # Procesar cada línea
    for line in lines:
        tipo, contenido = parse_markdown_line(line)
        
        if tipo == 'empty':
            # Añadir línea vacía
            doc.add_paragraph([], alignment='left')
            continue
        
        # Determinar formato según tipo
        if tipo == 'h1':
            # Título principal
            runs = []
            for texto, es_negrita, es_cursiva in contenido:
                runs.append((texto, es_negrita, es_cursiva, False, 
                           TAMAÑO_TITULO, COLOR_TITULO))
            doc.add_paragraph(runs, alignment='left', is_title=True)
            
        elif tipo in ['h2', 'h3', 'h4', 'h5', 'h6']:
            # Subtítulos
            runs = []
            for texto, es_negrita, es_cursiva in contenido:
                runs.append((texto, 
                           SUBTITULO_NEGRITA or es_negrita, 
                           es_cursiva, 
                           SUBTITULO_SUBRAYADO, 
                           TAMAÑO_SUBTITULO, 
                           COLOR_SUBTITULO))
            doc.add_paragraph(runs, alignment='left', is_subtitle=True)
            
        elif tipo == 'p':
            # Párrafo normal
            runs = []
            for texto, es_negrita, es_cursiva in contenido:
                runs.append((texto, es_negrita, es_cursiva, False, 
                           TAMAÑO_TEXTO_NORMAL, COLOR_TEXTO_NORMAL))
            
            alignment = 'justify' if JUSTIFICAR_TEXTO else 'left'
            doc.add_paragraph(runs, alignment=alignment)
    
    # Generar el DOCX en memoria y retornar los bytes
    return doc.save_to_bytes()


def save_docx_to_file(markdown_text: str, output_path: str) -> bool:
    """
    Convierte Markdown a DOCX y guarda en archivo
    
    Args:
        markdown_text: Texto en formato Markdown
        output_path: Ruta del archivo de salida
    
    Returns:
        bool: True si se guardó correctamente
    """
    try:
        docx_binary = convert_md_text_to_docx_binary(markdown_text)
        with open(output_path, 'wb') as f:
            f.write(docx_binary)
        return True
    except Exception as e:
        print(f"Error al guardar DOCX: {e}")
        return False
