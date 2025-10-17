#!/usr/bin/env python3
"""
Script para convertir texto Markdown a DOCX binario para n8n
Recibe el markdown de n8n y devuelve el DOCX en formato binario
SIN DEPENDENCIAS EXTERNAS - Solo usa librerías estándar de Python
"""

import re
import zipfile
import base64
from io import BytesIO
import xml.etree.ElementTree as ET


# ==================== VARIABLES DE CONFIGURACIÓN ====================
# Estas variables controlan el formato del documento generado
# Puedes modificarlas según tus necesidades

# Fuente para todo el documento
FUENTE = "Century Schoolbook"

# Tamaños de fuente (en half-points, ej: 14pt = 28)
TAMAÑO_TITULO = 28          # Para títulos (# en Markdown, h1) = 14pt
TAMAÑO_SUBTITULO = 24       # Para subtítulos (## en Markdown, h2, h3, etc.) = 12pt
TAMAÑO_TEXTO_NORMAL = 24    # Para texto normal y párrafos = 12pt

# Colores (en formato hexadecimal)
COLOR_TITULO = "000000"        # Negro para títulos
COLOR_SUBTITULO = "000000"     # Negro para subtítulos
COLOR_TEXTO_NORMAL = "000000"  # Negro para texto normal

# Formato de subtítulos
SUBTITULO_NEGRITA = True     # Aplicar negrita a subtítulos
SUBTITULO_SUBRAYADO = True   # Aplicar subrayado a subtítulos

# Alineación del texto
JUSTIFICAR_TEXTO = True      # Justificar el cuerpo del texto (párrafos normales)

# ====================================================================


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
    
    def add_paragraph(self, runs, alignment='left', is_title=False, is_subtitle=False):
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
    
    def _create_run_xml(self, text, bold=False, italic=False, underline=False, size=24, color="000000"):
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
    
    def _create_paragraph_xml(self, paragraph_data):
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
    
    def _create_document_xml(self):
        """Crea el document.xml principal"""
        w = self.namespaces['w']
        
        document = ET.Element(f'{{{w}}}document')
        body = ET.SubElement(document, f'{{{w}}}body')
        
        # Añadir todos los párrafos
        for para_data in self.paragraphs:
            p = self._create_paragraph_xml(para_data)
            body.append(p)
        
        return ET.tostring(document, encoding='unicode', method='xml')
    
    def _create_content_types_xml(self):
        """Crea [Content_Types].xml"""
        types = ET.Element('Types', xmlns='http://schemas.openxmlformats.org/package/2006/content-types')
        
        ET.SubElement(types, 'Default', Extension='rels', ContentType='application/vnd.openxmlformats-package.relationships+xml')
        ET.SubElement(types, 'Default', Extension='xml', ContentType='application/xml')
        ET.SubElement(types, 'Override', PartName='/word/document.xml', ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml')
        
        return ET.tostring(types, encoding='unicode', method='xml')
    
    def _create_rels_xml(self):
        """Crea _rels/.rels"""
        rels = ET.Element('Relationships', xmlns='http://schemas.openxmlformats.org/package/2006/relationships')
        
        ET.SubElement(rels, 'Relationship', 
                     Id='rId1',
                     Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
                     Target='word/document.xml')
        
        return ET.tostring(rels, encoding='unicode', method='xml')
    
    def _create_document_rels_xml(self):
        """Crea word/_rels/document.xml.rels"""
        rels = ET.Element('Relationships', xmlns='http://schemas.openxmlformats.org/package/2006/relationships')
        return ET.tostring(rels, encoding='unicode', method='xml')
    
    def save_to_bytes(self):
        """Guarda el documento como bytes en memoria"""
        bytes_io = BytesIO()
        
        with zipfile.ZipFile(bytes_io, 'w', zipfile.ZIP_DEFLATED) as docx:
            # [Content_Types].xml
            docx.writestr('[Content_Types].xml', 
                         '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + self._create_content_types_xml())
            
            # _rels/.rels
            docx.writestr('_rels/.rels',
                         '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + self._create_rels_xml())
            
            # word/document.xml
            docx.writestr('word/document.xml',
                         '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + self._create_document_xml())
            
            # word/_rels/document.xml.rels
            docx.writestr('word/_rels/document.xml.rels',
                         '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + self._create_document_rels_xml())
        
        # Obtener el contenido del BytesIO
        bytes_io.seek(0)
        return bytes_io.read()


def parse_inline_formatting(text):
    """
    Parsea formato inline (negritas, cursivas) en el texto
    
    Args:
        text (str): Texto con formato Markdown
    
    Returns:
        Lista de tuplas (texto, es_negrita, es_cursiva)
    """
    result = []
    
    # Patrón para encontrar **negrita**, *cursiva*, ***ambos***
    # Procesamos en orden: ***texto***, **texto**, *texto*
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


def parse_markdown_line(line):
    """
    Parsea una línea de Markdown y extrae su tipo y contenido con formato
    
    Args:
        line (str): Línea de texto en formato Markdown
    
    Returns:
        (tipo, contenido_parseado)
        tipo: 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'empty'
        contenido_parseado: lista de tuplas (texto, es_negrita, es_cursiva)
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


def convert_md_text_to_docx_binary(markdown_text):
    """
    Convierte texto Markdown a formato DOCX en binario
    
    Args:
        markdown_text (str): Texto en formato Markdown
    
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
                runs.append((texto, es_negrita, es_cursiva, False, TAMAÑO_TITULO, COLOR_TITULO))
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
                runs.append((texto, es_negrita, es_cursiva, False, TAMAÑO_TEXTO_NORMAL, COLOR_TEXTO_NORMAL))
            
            alignment = 'justify' if JUSTIFICAR_TEXTO else 'left'
            doc.add_paragraph(runs, alignment=alignment)
    
    # Generar el DOCX en memoria y retornar los bytes
    return doc.save_to_bytes()


# ==================== CÓDIGO PARA N8N ====================
# Obtener el texto Markdown del input de n8n
# Ajusta "output" según el nombre de tu campo de entrada
# Ejemplos comunes:
#   markdown_text = _input.first().json.output
#   markdown_text = _input.first().json.text
#   markdown_text = _input.first().json.markdown
#   markdown_text = _input.first().json.content
markdown_text = _input.first().json.output

# Convertir a DOCX binario
docx_binary = convert_md_text_to_docx_binary(markdown_text)

# Codificar en base64 para transmitir
docx_base64 = base64.b64encode(docx_binary).decode('utf-8')

# Retornar en el formato que n8n espera
# El campo "data" contiene el binario en base64
# El campo "mimeType" indica que es un documento Word
# El campo "fileName" es el nombre sugerido para el archivo
return [{
    "json": {
        "success": True,
        "fileName": "documento.docx",
        "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    },
    "binary": {
        "data": {
            "data": docx_base64,
            "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "fileName": "documento.docx"
        }
    }
}]