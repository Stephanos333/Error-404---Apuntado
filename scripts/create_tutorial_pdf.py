"""
Generador de Tutorial.pdf: manual de reglas y guía de juego del Sistema Apuntado.

Sin dependencias externas (PDF 1.4 escrito a mano). Las reglas descritas son las que
aplica el backend, no las del juego tradicional:
  - backend/plugins/clasica/regla-clasica.plugin.ts
  - backend/plugins/apuntado/regla-apuntado.plugin.ts
  - backend/src/reglas/evaluador/evaluador-manos.ts      (combinaciones y puntos por carta)
  - backend/src/dominio/partida/comandos-partida.ts      (turnos, cierre, ronda extra, liquidación)
  - backend/src/aplicacion/partida/parametros-sistema.ts (valores por defecto: 101, 5, 3, -10, -51)
Si cambia una regla, actualice este texto y vuelva a generar el PDF:
  python scripts/create_tutorial_pdf.py
"""
import os
import unicodedata

CODIFICACION = "cp1252"  # coincide con /WinAnsiEncoding: admite tildes, ñ, ¡, ¿ y la viñeta

# Anchos de Helvetica (unidades de 1/1000 de em) para ajustar las líneas al ancho de la página.
ANCHOS = {
    " ": 278, "!": 278, '"': 355, "#": 556, "$": 556, "%": 889, "&": 667, "'": 191, "(": 333, ")": 333,
    "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278, ":": 278, ";": 278, "<": 584, "=": 584,
    ">": 584, "?": 556, "@": 1015, "A": 667, "B": 667, "C": 722, "D": 722, "E": 667, "F": 611, "G": 778,
    "H": 722, "I": 278, "J": 500, "K": 667, "L": 556, "M": 833, "N": 722, "O": 778, "P": 667, "Q": 778,
    "R": 722, "S": 667, "T": 611, "U": 722, "V": 667, "W": 944, "X": 667, "Y": 667, "Z": 611, "[": 278,
    "]": 278, "_": 556, "a": 556, "b": 556, "c": 500, "d": 556, "e": 556, "f": 278, "g": 556, "h": 556,
    "i": 222, "j": 222, "k": 500, "l": 222, "m": 833, "n": 556, "o": 556, "p": 556, "q": 556, "r": 333,
    "s": 500, "t": 278, "u": 556, "v": 500, "w": 722, "x": 500, "y": 500, "z": 500, "¡": 333, "¿": 611,
    "•": 350, "|": 260,
}
for d in "0123456789":
    ANCHOS[d] = 556

ANCHO_PAGINA, ALTO_PAGINA = 612, 792
MARGEN_X = 50
ANCHO_UTIL = ANCHO_PAGINA - 2 * MARGEN_X
LIMITE_INFERIOR = 62
TOP_PRIMERA, TOP_RESTO = 668, 738

VERDE_OSCURO = "0.10 0.30 0.15"
VERDE = "0.15 0.50 0.20"
GRIS = "0.15 0.15 0.15"
GRIS_CLARO = "0.35 0.35 0.35"
AZUL = "0.05 0.25 0.50"
ROJO = "0.70 0.20 0.10"


def ancho_texto(texto, tam, negrita=False):
    total = 0
    for c in texto:
        base = unicodedata.normalize("NFD", c)[0]
        total += ANCHOS.get(base, ANCHOS.get(c, 556))
    return total * tam / 1000 * (1.07 if negrita else 1.0)


def ajustar(texto, tam, ancho_max, negrita=False):
    """Divide el texto en líneas que caben en `ancho_max` puntos."""
    lineas, actual = [], ""
    for palabra in texto.split():
        prueba = palabra if not actual else f"{actual} {palabra}"
        if actual and ancho_texto(prueba, tam, negrita) > ancho_max * 0.98:
            lineas.append(actual)
            actual = palabra
        else:
            actual = prueba
    if actual:
        lineas.append(actual)
    return lineas


def escapar(texto):
    return texto.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


class Documento:
    def __init__(self, titulo):
        self.titulo = titulo
        self.paginas = []
        self.y = 0

    # ---- páginas -------------------------------------------------------------------------
    def nueva_pagina(self):
        pagina = []
        self.paginas.append(pagina)
        if len(self.paginas) == 1:
            pagina.append("q 0.1 0.45 0.25 rg 0 700 612 92 re f Q")
            pagina.append("BT /F2 21 Tf 1 1 1 rg 50 756 Td (APUNTADO · MANUAL DE REGLAS Y GUÍA DE JUEGO) Tj ET")
            pagina.append("BT /F1 11 Tf 0.9 0.95 0.9 rg 50 734 Td (Sistema digital de cartas · Modalidades Clásica 4-3-3 y Apuntado a 101) Tj ET")
            pagina.append("BT /F3 9 Tf 0.85 0.92 0.85 rg 50 714 Td (Reglas tal como las aplica el servidor del juego) Tj ET")
            self.y = TOP_PRIMERA
        else:
            pagina.append("q 0.1 0.45 0.25 rg 0 758 612 34 re f Q")
            pagina.append("BT /F2 11 Tf 1 1 1 rg 50 769 Td (APUNTADO · MANUAL DE REGLAS Y GUÍA DE JUEGO) Tj ET")
            self.y = TOP_RESTO

    @property
    def pagina(self):
        return self.paginas[-1]

    def asegurar(self, alto):
        if self.y - alto < LIMITE_INFERIOR:
            self.nueva_pagina()

    # ---- bloques de texto ----------------------------------------------------------------
    def titulo_seccion(self, texto):
        self.asegurar(60)
        self.y -= 8
        self.pagina.append(f"BT /F2 13.5 Tf {VERDE_OSCURO} rg {MARGEN_X} {self.y:.1f} Td ({escapar(texto)}) Tj ET")
        self.pagina.append(f"q {VERDE} RG {MARGEN_X} {self.y - 5:.1f} m {ANCHO_PAGINA - MARGEN_X} {self.y - 5:.1f} l 1.4 w S Q")
        self.y -= 22

    def subtitulo(self, texto, color=AZUL):
        self.asegurar(40)
        self.pagina.append(f"BT /F2 11 Tf {color} rg {MARGEN_X + 5} {self.y:.1f} Td ({escapar(texto)}) Tj ET")
        self.y -= 16

    def parrafo(self, texto, tam=10, fuente="F1", color=GRIS, sangria=0, separacion=4):
        negrita = fuente == "F2"
        interlineado = tam + 3.2
        lineas = ajustar(texto, tam, ANCHO_UTIL - sangria, negrita)
        self.asegurar(interlineado * len(lineas))
        for linea in lineas:
            self.pagina.append(f"BT /{fuente} {tam} Tf {color} rg {MARGEN_X + sangria} {self.y:.1f} Td ({escapar(linea)}) Tj ET")
            self.y -= interlineado
        self.y -= separacion

    def vineta(self, texto, nivel=0, tam=9.8, color=GRIS):
        sangria = 12 + nivel * 16
        interlineado = tam + 3.2
        lineas = ajustar(texto, tam, ANCHO_UTIL - sangria - 12)
        self.asegurar(interlineado * len(lineas))
        marca = "•" if nivel == 0 else "-"
        self.pagina.append(f"BT /F1 {tam} Tf {VERDE_OSCURO} rg {MARGEN_X + sangria - 11} {self.y:.1f} Td ({marca}) Tj ET")
        for linea in lineas:
            self.pagina.append(f"BT /F1 {tam} Tf {color} rg {MARGEN_X + sangria} {self.y:.1f} Td ({escapar(linea)}) Tj ET")
            self.y -= interlineado
        self.y -= 2

    def espacio(self, puntos=6):
        self.y -= puntos

    def recuadro(self, texto, color_borde=VERDE, tam=9.8):
        """Nota destacada con borde de color."""
        lineas = ajustar(texto, tam, ANCHO_UTIL - 24)
        interlineado = tam + 3.2
        alto = len(lineas) * interlineado + 12
        self.asegurar(alto + 6)
        base = self.y - alto + 4
        self.pagina.append(f"q 0.95 0.98 0.95 rg {color_borde} RG 1 w {MARGEN_X} {base:.1f} {ANCHO_UTIL} {alto:.1f} re B Q")
        yy = self.y - 8
        for linea in lineas:
            self.pagina.append(f"BT /F1 {tam} Tf {GRIS} rg {MARGEN_X + 12} {yy:.1f} Td ({escapar(linea)}) Tj ET")
            yy -= interlineado
        self.y = base - 10

    # ---- escritura del archivo -----------------------------------------------------------
    def guardar(self, ruta):
        total = len(self.paginas)
        for numero, pagina in enumerate(self.paginas, start=1):
            pagina.append(f"q 0.8 0.8 0.8 RG {MARGEN_X} 42 m {ANCHO_PAGINA - MARGEN_X} 42 l S Q")
            pagina.append(f"BT /F1 9 Tf 0.4 0.4 0.4 rg {MARGEN_X} 28 Td (Apuntado Digital · Error 404 · Fundamentos de Arquitectura de Software) Tj ET")
            pagina.append(f"BT /F1 9 Tf 0.4 0.4 0.4 rg 484 28 Td (Página {numero} de {total}) Tj ET")

        buf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = {}

        def objeto(num, cuerpo):
            offsets[num] = len(buf)
            buf.extend(f"{num} 0 obj\n".encode("ascii"))
            buf.extend(cuerpo)
            buf.extend(b"\nendobj\n")

        ids_paginas = [(6 + 2 * i + 1, 6 + 2 * i) for i in range(total)]  # (objeto página, objeto contenido)
        objeto(1, b"<</Type /Catalog /Pages 2 0 R>>")
        kids = " ".join(f"{p} 0 R" for p, _ in ids_paginas)
        objeto(2, f"<</Type /Pages /Kids [{kids}] /Count {total}>>".encode("ascii"))
        for num, nombre in ((3, "Helvetica"), (4, "Helvetica-Bold"), (5, "Helvetica-Oblique")):
            objeto(num, f"<</Type /Font /Subtype /Type1 /BaseFont /{nombre} /Encoding /WinAnsiEncoding>>".encode("ascii"))
        for (id_pagina, id_contenido), comandos in zip(ids_paginas, self.paginas):
            contenido = "\n".join(comandos).encode(CODIFICACION)
            objeto(id_contenido, f"<</Length {len(contenido)}>>\nstream\n".encode("ascii") + contenido + b"\nendstream")
            objeto(
                id_pagina,
                (
                    f"<</Type /Page /Parent 2 0 R /MediaBox [0 0 {ANCHO_PAGINA} {ALTO_PAGINA}] "
                    f"/Resources <</Font <</F1 3 0 R /F2 4 0 R /F3 5 0 R>>>> /Contents {id_contenido} 0 R>>"
                ).encode("ascii"),
            )
        total_objetos = 6 + 2 * total
        objeto(total_objetos, b"<</Title (Apuntado - Manual de reglas y guia de juego) /Producer (scripts/create_tutorial_pdf.py)>>")

        inicio_xref = len(buf)
        buf.extend(f"xref\n0 {total_objetos + 1}\n0000000000 65535 f \n".encode("ascii"))
        for num in range(1, total_objetos + 1):
            buf.extend(f"{offsets[num]:010d} 00000 n \n".encode("ascii"))
        buf.extend(
            f"trailer\n<</Size {total_objetos + 1} /Root 1 0 R /Info {total_objetos} 0 R>>\nstartxref\n{inicio_xref}\n%%EOF\n".encode("ascii")
        )
        os.makedirs(os.path.dirname(ruta), exist_ok=True)
        with open(ruta, "wb") as f:
            f.write(buf)
        print(f"PDF generado: {ruta} ({len(buf)} bytes, {total} páginas)")


def generar():
    doc = Documento("Apuntado")
    doc.nueva_pagina()

    # ---------------------------------------------------------------------------------------
    doc.titulo_seccion("1. Objetivo, jugadores y baraja")
    doc.vineta("De 2 a 6 jugadores. Al iniciar la partida cada jugador pone su apuesta en tokens; el ganador se lleva el pozo completo (la suma de todas las apuestas).")
    doc.vineta("Se juega con baraja francesa de 52 cartas, sin comodines. Desde 4 jugadores se usa doble baraja (104 cartas).")
    doc.vineta("Cada jugador recibe 10 cartas y el que abre la ronda recibe 11. El resto forma el mazo y las cartas descartadas van al pozo de descarte.")
    doc.vineta("El objetivo es formar combinaciones con la mano. Las cartas que no combinan suman puntos en contra, y menos puntos es mejor.")

    doc.titulo_seccion("2. Combinaciones válidas")
    doc.parrafo("Una terna tiene 3 cartas y una cuarta tiene 4. Ambas pueden ser de dos tipos:", sangria=0)
    doc.vineta("Mismo valor: por ejemplo 7-7-7 o K-K-K-K. Con doble baraja se admite repetir la misma carta hasta dos veces (7 de picas, 7 de picas y 7 de corazones).")
    doc.vineta("Escalera: cartas consecutivas del mismo palo, por ejemplo 4-5-6 de tréboles. El As va antes del 2 o después de la K, y la escalera puede pasar por él (Q-K-A o K-A-2).")
    doc.vineta("Un grupo de 2 cartas, o de cartas que no cumplen ninguna de las dos formas, no cuenta como combinación.")

    doc.titulo_seccion("3. Valor de las cartas")
    doc.vineta("El As, el 10, la J, la Q y la K valen 10 puntos cada una. Las cartas del 2 al 9 valen su número.")
    doc.vineta("Al liquidar una ronda se suman los puntos de las cartas que no están en una combinación válida: las sobrantes y las de los grupos inválidos.")
    doc.recuadro("Importante: la liquidación usa la organización de tu mano que enviaste con tu último descarte. Antes de descartar, forma tus grupos con el botón \"Formar grupo\".")

    # ---------------------------------------------------------------------------------------
    doc.titulo_seccion("4. Cómo se juega un turno")
    doc.vineta("El jugador que abre la ronda ya tiene 11 cartas: no roba, y su primer turno es descartar o cerrar.")
    doc.vineta("Los demás roban primero: una carta del mazo (boca abajo) o la carta superior del pozo de descarte. Con 11 cartas organizan su mano.")
    doc.vineta("Después descartan una carta, y el turno pasa al siguiente jugador, o intentan cerrar la ronda.")
    doc.vineta("Si el mazo se acaba, se baraja el pozo de descarte (conservando la última carta) y se sigue robando.")

    # ---------------------------------------------------------------------------------------
    doc.titulo_seccion("5. Modalidad Clásica 4-3-3")
    doc.parrafo("Se juega una sola ronda. Gana quien primero cierre bien.", sangria=0)
    doc.vineta("Cierre válido: 1 cuarta + 2 ternas (10 cartas) y 1 carta de descarte, sin ninguna carta sobrante. Combinaciones como 4-4 o 3-3-3 no cierran.")
    doc.vineta("Si el cierre es válido, la partida termina de inmediato y quien cerró gana el pozo.")
    doc.vineta("Si el cierre es inválido, se rechaza sin castigo. No puedes volver a intentarlo en ese mismo turno: debes descartar.")

    # ---------------------------------------------------------------------------------------
    doc.titulo_seccion("6. Modalidad Apuntado a 101")
    doc.parrafo("Se juegan varias rondas con puntaje acumulado. Los valores de abajo son los predeterminados del juego.", sangria=0)
    doc.subtitulo("Cerrar con 4-3-3", ROJO)
    doc.vineta("Se forma igual que en la Clásica: 1 cuarta + 2 ternas + 1 descarte, sin sobrantes.")
    doc.vineta("Quien cierra resta 10 puntos (bonificación) y cada rival suma los puntos de sus cartas no combinadas. La ronda termina.")
    doc.subtitulo("Tocar", ROJO)
    doc.vineta("Se toca con 3 ternas + 1 carta sobrante que valga menos de 5 puntos (solo sirven el 2, el 3 y el 4) + 1 carta de descarte. El As y las figuras no sirven, y una sobrante de 5 puntos tampoco.")
    doc.vineta("Tocar no termina la ronda: abre una ronda extra. Cada rival, en orden de turno, juega un último turno (roba y descarta, o cierra con 4-3-3 si lo logra). No se puede tocar de nuevo durante la ronda extra.")
    doc.vineta("Al terminar la ronda extra, todos los jugadores, incluido quien tocó, suman los puntos de sus cartas no combinadas. Por eso quien toca también paga su carta sobrante.")
    doc.subtitulo("Cierre inválido", ROJO)
    doc.vineta("Se rechaza y quien lo intentó suma 3 puntos de castigo. No puede volver a intentar cerrar en ese turno: debe descartar.")
    doc.subtitulo("Eliminación y fin de la partida", ROJO)
    doc.vineta("Quien llega a 101 puntos o más queda eliminado.")
    doc.vineta("La partida termina cuando queda un solo jugador o cuando alguien llega a -51 puntos o menos. Esa persona gana el pozo.")
    doc.vineta("Si la partida sigue, se reparte una ronda nueva, que abre el siguiente jugador activo.")

    # ---------------------------------------------------------------------------------------
    doc.titulo_seccion("7. Guía de la interfaz")
    doc.subtitulo("Antes de jugar")
    doc.vineta("Crear partida (Inicio): elige la modalidad (Apuntado a 101 o Clásica 4-3-3), de 2 a 6 jugadores, el valor de la apuesta y si es pública o privada.")
    doc.vineta("Invitar: copia el enlace con el botón de compartir. Los invitados entran con el enlace o escribiendo el ID de la partida.")
    doc.vineta("Sala de espera: el anfitrión inicia la partida. \"Cancelar sala\" (anfitrión) y \"Salir de la sala\" (invitados) liberan tu cuenta.")
    doc.subtitulo("En el tablero")
    doc.vineta("Robar: haz clic en el mazo o en la carta superior del pozo cuando sea tu turno (se resaltan con un borde animado).")
    doc.vineta("Formar un grupo: haz clic en cartas sueltas para seleccionarlas (se levantan) y pulsa \"Formar grupo\". Cada grupo tiene de 1 a 4 cartas y puedes formar hasta 4 grupos. \"Soltar grupo\" lo deshace.")
    doc.vineta("Descartar: selecciona una sola carta suelta y pulsa \"Descartar\". Se envía junto con la organización de tus grupos.")
    doc.vineta("Cerrar: forma tus grupos, deja una sola carta suelta seleccionada como descarte y pulsa el botón de cierre: \"Cerrar con 4-3-3\" (Clásica) o \"Cerrar / Tocar (< 5 pts)\" (Apuntado). El juego deduce el tipo: 1 cuarta + 2 ternas es 4-3-3, y 3 ternas + 1 sobrante es tocar.")
    doc.vineta("Mensajes: si actúas fuera de turno o la ronda ya se cerró, el juego te lo indica y actualiza el tablero.")
    doc.espacio(8)
    doc.parrafo("¡Buen juego!", tam=11, fuente="F3", color="0.1 0.4 0.2")

    ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public", "assets", "documents", "Tutorial.pdf")
    doc.guardar(os.path.normpath(ruta))


if __name__ == "__main__":
    generar()
