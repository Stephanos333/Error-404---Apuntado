"""
Generador de Tutorial.pdf para el Sistema Digital de Juego de Cartas Apuntado.
Genera un documento PDF 1.4 multi-página profesional, estructurado y sin dependencias externas.
"""
import os

class SimplePDF:
    def __init__(self):
        self.pages = []
        self.objects = []

    def add_page(self):
        page = []
        self.pages.append(page)
        return page

    def build_pdf(self, filename):
        # Cada pagina tiene su propio stream de contenido
        page_objs = []
        content_objs = []

        # Estructura del PDF
        # Objeto 1: Catalog
        # Objeto 2: Pages
        # Objeto 3: Font Helvetica
        # Objeto 4: Font Helvetica-Bold
        # Objeto 5: Font Helvetica-Oblique
        font_helv = 3
        font_bold = 4
        font_obli = 5

        next_obj_id = 6

        # Generar streams de contenido para cada pagina
        for i, page_cmds in enumerate(self.pages):
            content_str = "\n".join(page_cmds)
            content_bytes = content_str.encode('latin1')
            content_obj_id = next_obj_id
            next_obj_id += 1
            page_obj_id = next_obj_id
            next_obj_id += 1

            page_objs.append((page_obj_id, content_obj_id))
            content_objs.append((content_obj_id, content_bytes))

        # Escribir el buffer
        buf = bytearray()
        buf.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

        offsets = {}

        def write_obj(obj_id, body_bytes):
            offsets[obj_id] = len(buf)
            buf.extend(f"{obj_id} 0 obj\n".encode('latin1'))
            buf.extend(body_bytes)
            buf.extend(b"\nendobj\n")

        # 1: Catalog
        write_obj(1, b"<</Type /Catalog /Pages 2 0 R>>")

        # 2: Pages
        kids_str = " ".join([f"{p[0]} 0 R" for p in page_objs])
        pages_body = f"<</Type /Pages /Kids [{kids_str}] /Count {len(page_objs)}>>".encode('latin1')
        write_obj(2, pages_body)

        # 3, 4, 5: Fuentes
        write_obj(font_helv, b"<</Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding>>")
        write_obj(font_bold, b"<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding>>")
        write_obj(font_obli, b"<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding>>")

        # Escribir Page objects y Content objects
        for page_id, content_id in page_objs:
            page_body = (
                f"<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                f"/Resources <</Font <</F1 3 0 R /F2 4 0 R /F3 5 0 R>> >> "
                f"/Contents {content_id} 0 R>>"
            ).encode('latin1')
            write_obj(page_id, page_body)

        for content_id, content_bytes in content_objs:
            stream_body = (
                f"<</Length {len(content_bytes)}>>\nstream\n".encode('latin1') +
                content_bytes +
                b"\nendstream"
            )
            write_obj(content_id, stream_body)

        # Xref
        xref_offset = len(buf)
        total_objs = next_obj_id
        buf.extend(f"xref\n0 {total_objs}\n0000000000 65535 f \n".encode('latin1'))
        for i in range(1, total_objs):
            buf.extend(f"{offsets[i]:010d} 00000 n \n".encode('latin1'))

        # Trailer
        trailer = (
            f"trailer\n<</Size {total_objs} /Root 1 0 R>>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        ).encode('latin1')
        buf.extend(trailer)

        os.makedirs(os.path.dirname(filename), exist_ok=True)
        with open(filename, 'wb') as f:
            f.write(buf)
        print(f"PDF generado exitosamente en: {filename} ({len(buf)} bytes, {len(self.pages)} paginas)")

def escape_pdf(text):
    return text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

def generate_tutorial():
    pdf = SimplePDF()

    # ==================== PAGINA 1 ====================
    p1 = pdf.add_page()
    # Encabezado con color de fondo
    p1.append("q 0.1 0.45 0.25 rg 0 710 612 82 re f Q") # Verde tematico
    p1.append("BT /F2 20 Tf 1 1 1 rg 50 755 Td (SISTEMA DIGITAL DE CARTAS: APUNTADO) Tj ET")
    p1.append("BT /F1 11 Tf 0.9 0.95 0.9 rg 50 735 Td (Manual Oficial de Reglas, Mecanica de Juego y Tutorial de Usuario) Tj ET")

    # Pie de pagina
    p1.append("q 0.8 0.8 0.8 RG 50 40 m 562 40 l S Q")
    p1.append("BT /F1 9 Tf 0.4 0.4 0.4 rg 50 25 Td (Apuntado Digital - Error 404 | Fundamentos de Arquitectura de Software) Tj ET")
    p1.append("BT /F1 9 Tf 0.4 0.4 0.4 rg 510 25 Td (Pagina 1 de 2) Tj ET")

    # Cuerpo
    y = 675
    def add_heading(p, text, y_pos):
        p.append(f"BT /F2 14 Tf 0.1 0.3 0.15 rg 50 {y_pos} Td ({escape_pdf(text)}) Tj ET")
        p.append(f"q 0.15 0.5 0.2 RG 50 {y_pos - 4} m 562 {y_pos - 4} l 1.5 w S Q")
        return y_pos - 24

    def add_text(p, text, y_pos, font="/F1", size=10, color="0.15 0.15 0.15 rg", indent=50):
        p.append(f"BT {font} {size} Tf {color} {indent} {y_pos} Td ({escape_pdf(text)}) Tj ET")
        return y_pos - (size + 5)

    y = add_heading(p1, "1. Introduccion y Objetivo del Juego", y)
    y = add_text(p1, "Apuntado es un juego de cartas tradicional que se disputa entre 2 y 4 jugadores con baraja", y)
    y = add_text(p1, "francesa doble (104 cartas con palos: Picas, Corazones, Diamantes y Treboles).", y)
    y = add_text(p1, "El objetivo es combinar las cartas de la mano en grupos validos para minimizar el puntaje de", y)
    y = add_text(p1, "cartas sobrantes o cerrar la partida antes que los contrincantes.", y)
    y -= 10

    y = add_heading(p1, "2. Combinaciones Validas (Melds)", y)
    y = add_text(p1, "Las cartas se combinan bajo dos patrones fundamentales:", y)
    y = add_text(p1, "* Trios o Cuartetos: 3 o 4 cartas del mismo numero pero de diferente palo.", y, "/F2", 10, "0.1 0.2 0.35 rg", 65)
    y = add_text(p1, "   Ejemplo valido: 7 de Picas, 7 de Corazones y 7 de Diamantes.", y, "/F3", 9, "0.3 0.3 0.3 rg", 75)
    y = add_text(p1, "* Escaleras: 3 o mas cartas consecutivas del mismo palo exacto.", y, "/F2", 10, "0.1 0.2 0.35 rg", 65)
    y = add_text(p1, "   Ejemplo valido: 4, 5, 6 y 7 de Treboles. El As puede ser bajo (A-2-3) o alto (Q-K-A).", y, "/F3", 9, "0.3 0.3 0.3 rg", 75)
    y -= 10

    y = add_heading(p1, "3. Dinamica del Turno (Ciclo de Juego)", y)
    y = add_text(p1, "Cada turno de juego se desarrolla de forma secuencial y estricta en 3 fases:", y)
    y = add_text(p1, "Paso 1 - Robar: El jugador debe tomar obligatoriamente 1 carta para iniciar su turno.", y, "/F2", 10, "0 0 0 rg", 65)
    y = add_text(p1, "   Puede robar del Mazo (carta oculta) o del Pozo de Descarte (carta visible arrojada).", y, "/F1", 9, "0.3 0.3 0.3 rg", 75)
    y = add_text(p1, "Paso 2 - Organizar: La mano pasa a tener 11 cartas. El jugador analiza sus combinaciones.", y, "/F2", 10, "0 0 0 rg", 65)
    y = add_text(p1, "Paso 3 - Descartar o Cerrar:", y, "/F2", 10, "0 0 0 rg", 65)
    y = add_text(p1, "   a) Descarte regular: Arroja 1 carta al pozo de descarte y el turno pasa al rival.", y, "/F1", 9, "0.3 0.3 0.3 rg", 75)
    y = add_text(p1, "   b) Declaracion de Cierre: Si cumple las condiciones de la modalidad, ejecuta el cierre.", y, "/F1", 9, "0.3 0.3 0.3 rg", 75)
    y -= 10

    y = add_heading(p1, "4. Valores de las Cartas para el Conteo", y)
    y = add_text(p1, "Las cartas sobrantes (no combinadas) suman puntos de acuerdo con la siguiente escala:", y)
    y = add_text(p1, "* As (A): 1 punto", y, "/F1", 9.5, "0.2 0.2 0.2 rg", 70)
    y = add_text(p1, "* Cartas numericas (2 al 10): Su valor nominal exacto en puntos.", y, "/F1", 9.5, "0.2 0.2 0.2 rg", 70)
    y = add_text(p1, "* Figuras (J, Q, K): 10 puntos cada una.", y, "/F1", 9.5, "0.2 0.2 0.2 rg", 70)

    # ==================== PAGINA 2 ====================
    p2 = pdf.add_page()
    p2.append("q 0.1 0.45 0.25 rg 0 735 612 57 re f Q")
    p2.append("BT /F2 16 Tf 1 1 1 rg 50 755 Td (MODALIDADES DE JUEGO Y CONTROLES DEL SISTEMA) Tj ET")

    # Pie de pagina
    p2.append("q 0.8 0.8 0.8 RG 50 40 m 562 40 l S Q")
    p2.append("BT /F1 9 Tf 0.4 0.4 0.4 rg 50 25 Td (Apuntado Digital - Error 404 | Fundamentos de Arquitectura de Software) Tj ET")
    p2.append("BT /F1 9 Tf 0.4 0.4 0.4 rg 510 25 Td (Pagina 2 de 2) Tj ET")

    y = 700
    y = add_heading(p2, "5. Modalidades Oficiales de Juego", y)

    y = add_text(p2, "A. Variante Clasica (Cierre Perfecto 4-3-3):", y, "/F2", 11, "0.05 0.25 0.5 rg", 55)
    y = add_text(p2, "* Requiere combinar exactamente 10 cartas en tres grupos validos (ejemplo: 4-3-3 o 4-4).", y, "/F1", 9.5, "0.15 0.15 0.15 rg", 65)
    y = add_text(p2, "* Se descarta la carta numero 11 y se debe quedar con 0 cartas sobrantes (cierre limpio).", y, "/F1", 9.5, "0.15 0.15 0.15 rg", 65)
    y = add_text(p2, "* Cierre inmediato: El jugador que cierra gana la ronda y se adjudica el pozo acumulado.", y, "/F1", 9.5, "0.15 0.15 0.15 rg", 65)
    y -= 6

    y = add_text(p2, "B. Variante Apuntado a 101 (Con Mecanica de 'Tocar' y Ronda Extra):", y, "/F2", 11, "0.7 0.2 0.1 rg", 55)
    y = add_text(p2, "* Un jugador puede 'Tocar / Cerrar' si sus cartas sobrantes suman 5 puntos o menos.", y, "/F1", 9.5, "0.15 0.15 0.15 rg", 65)
    y = add_text(p2, "* Ronda Extra de Rival: Al tocar, el juego NO termina inmediatamente; cada uno de los", y, "/F1", 9.5, "0.15 0.15 0.15 rg", 65)
    y = add_text(p2, "  rivales tiene un ultimo turno para robar, acomodar sus cartas y reducir sus puntos.", y, "/F1", 9.5, "0.15 0.15 0.15 rg", 65)
    y = add_text(p2, "* Liquidacion y Caceria:", y, "/F2", 9.5, "0.2 0.2 0.2 rg", 65)
    y = add_text(p2, "  - Si el tocador mantiene el menor puntaje: Se anota 0 puntos y los rivales suman sus puntos.", y, "/F1", 9, "0.3 0.3 0.3 rg", 75)
    y = add_text(p2, "  - Si un rival iguala o supera al tocador ('Caceria'): El rival suma 0 y el tocador es", y, "/F1", 9, "0.3 0.3 0.3 rg", 75)
    y = add_text(p2, "    penalizado cargando el doble de sus puntos sobrantes.", y, "/F1", 9, "0.3 0.3 0.3 rg", 75)
    y = add_text(p2, "* Meta: Quien acumule mas de 101 puntos es eliminado. Gana el sobreviviente final.", y, "/F1", 9.5, "0.15 0.15 0.15 rg", 65)
    y -= 10

    y = add_heading(p2, "6. Guia de la Interfaz y Controles Digitales", y)
    y = add_text(p2, "La aplicacion web cuenta con controles claros y accesibles:", y)
    y = add_text(p2, "1. Crear / Unirse: Desde el Home puedes crear una partida publica o privada, o ingresar con", y, "/F1", 9.5, "0.15 0.15 0.15 rg", 65)
    y = add_text(p2, "   el enlace compartido o el ID de la partida.", y, "/F1", 9.5, "0.15 0.15 0.15 rg", 65)
    y = add_text(p2, "2. Sala de Espera: Permite copiar el enlace con un clic, ver a los contrincantes conectados,", y, "/F1", 9.5, "0.15 0.15 0.15 rg", 65)
    y = add_text(p2, "   iniciar la partida (el anfitrion) o usar 'Cancelar sala' / 'Salir' para liberar la cuenta.", y, "/F1", 9.5, "0.15 0.15 0.15 rg", 65)
    y = add_text(p2, "3. Tablero de Juego:", y, "/F1", 9.5, "0.15 0.15 0.15 rg", 65)
    y = add_text(p2, "   * Clic en el Mazo: Roba la carta superior oculta.", y, "/F1", 9, "0.3 0.3 0.3 rg", 75)
    y = add_text(p2, "   * Clic en el Pozo de Descarte: Roba la carta superior visible.", y, "/F1", 9, "0.3 0.3 0.3 rg", 75)
    y = add_text(p2, "   * Seleccionar carta en mano + 'Descartar': Envia la carta al pozo y cede el turno.", y, "/F1", 9, "0.3 0.3 0.3 rg", 75)
    y = add_text(p2, "   * Boton 'Cerrar / Tocar': Abre el panel de cierre para declarar grupos y finalizar la mano.", y, "/F1", 9, "0.3 0.3 0.3 rg", 75)
    y -= 10

    y = add_heading(p2, "7. Buen Juego", y)
    y = add_text(p2, "Que disfrutes una experiencia estrategica y competitiva en el Sistema Apuntado Digital!", y, "/F3", 10.5, "0.1 0.4 0.2 rg", 65)

    pdf.build_pdf("frontend/public/assets/documents/Tutorial.pdf")

if __name__ == '__main__':
    generate_tutorial()

