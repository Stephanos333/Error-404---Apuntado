"""
Builds the consolidated report of Deliverable 3 (Word .docx) with the structure and format of the
course guide ("Entregable 3. Guía de Especificación de Proyecto"): US Letter, 1-inch margins, Arial,
black headings, the guide's header block (subject, case study, theoretical framework, team table)
and the exact section index 1.1 to 5.3.

Usage:  python scripts/generate_report_docx.py
Output: docs/entregable/Informe-Entregable-3-Error404.docx

The table of contents is a Word TOC field. The script renders the document twice with LibreOffice
(when `soffice` is available) to fill the field with the real page numbers; Word can refresh it
with right click -> "Update field".

WARNING: the .docx is edited by hand after it is generated (team data, captures, video links...).
Running this script again overwrites those changes. Text highlighted in yellow is pending work the
team must complete before submitting.
"""
import io
import os
import re
import shutil
import subprocess
import tempfile

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_COLOR_INDEX, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
DIAGRAMS = os.path.join(ROOT, "diagramas", "entregable-3")
EVIDENCE = os.path.join(ROOT, "docs", "evidencias")
OUTPUT = os.path.join(ROOT, "docs", "entregable", "Informe-Entregable-3-Error404.docx")

REPO = "https://github.com/Stephanos333/Error-404---Apuntado"
APP = "https://error-404-apuntado.onrender.com"
API = "https://error-404-apuntado-backend.onrender.com/docs"

FONT = "Arial"
CODE_FONT = "Courier New"
BLACK = RGBColor(0, 0, 0)
BODY_SIZE = 11
TABLE_SIZE = 9.5
CAPTION_SIZE = 9.5
TEXT_WIDTH_CM = 16.5  # Letter (21.59 cm) minus two 2.54 cm margins

MARKUP = re.compile(r"(\*\*.+?\*\*|`[^`]+`|\[\[.+?\]\]|\*[^*\s][^*]*\*)")


class ReportBuilder:
    """Builds the report. `page_numbers` maps each heading to its page (None on the first pass)."""

    def __init__(self, page_numbers=None):
        self.doc = Document()
        self.page_numbers = page_numbers or {}
        self.headings = []  # (level, text) in order, for the table of contents
        self.figure_count = 0
        self.table_count = 0

    # --------------------------------------------------------------------------------------
    # Styles
    # --------------------------------------------------------------------------------------
    @staticmethod
    def _set_fonts(rpr_owner, name):
        """Replaces the theme fonts of a style or run with a fixed font."""
        rpr = rpr_owner.get_or_add_rPr()
        for old in rpr.findall(qn("w:rFonts")):
            rpr.remove(old)
        fonts = OxmlElement("w:rFonts")
        for attribute in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
            fonts.set(qn(attribute), name)
        rpr.insert(0, fonts)

    @staticmethod
    def _set_black(rpr_owner):
        rpr = rpr_owner.get_or_add_rPr()
        for old in rpr.findall(qn("w:color")):
            rpr.remove(old)
        color = OxmlElement("w:color")
        color.set(qn("w:val"), "000000")
        rpr.append(color)

    def configure_styles(self):
        styles = self.doc.styles
        normal = styles["Normal"]
        self._set_fonts(normal.element, FONT)
        normal.font.size = Pt(BODY_SIZE)
        normal.paragraph_format.space_after = Pt(6)
        normal.paragraph_format.line_spacing = 1.15

        for name, size, before, after in (("Title", 18, 0, 10), ("Heading 1", 14, 0, 8),
                                          ("Heading 2", 12, 12, 4), ("Heading 3", 11, 9, 3)):
            style = styles[name]
            self._set_fonts(style.element, FONT)
            self._set_black(style.element)
            style.font.size = Pt(size)
            style.font.bold = True
            style.font.italic = False
            fmt = style.paragraph_format
            fmt.space_before, fmt.space_after = Pt(before), Pt(after)
            fmt.keep_with_next = True
            fmt.line_spacing = 1.15
            ppr = style.element.get_or_add_pPr()
            for border in ppr.findall(qn("w:pBdr")):  # the Title of the default template has a rule
                ppr.remove(border)
        for name in ("List Bullet", "List Number"):
            self._set_fonts(styles[name].element, FONT)
            styles[name].font.size = Pt(BODY_SIZE)

        section = self.doc.sections[0]
        section.page_width, section.page_height = Cm(21.59), Cm(27.94)
        section.left_margin = section.right_margin = Cm(2.54)
        section.top_margin = section.bottom_margin = Cm(2.54)
        section.footer_distance = Cm(1.2)
        footer = section.footer.paragraphs[0]
        footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
        self.field(footer, "PAGE", "1", size=9)

        zoom = self.doc.settings.element.find(qn("w:zoom"))
        if zoom is not None and zoom.get(qn("w:percent")) is None:  # required by the OOXML schema
            zoom.set(qn("w:percent"), "100")

        properties = self.doc.core_properties
        properties.title = "Entregable 3 - Informe de Proyecto - Equipo Error 404"
        properties.author = "Equipo Error 404"
        properties.subject = "Fundamentos de Arquitectura de Software"

    # --------------------------------------------------------------------------------------
    # Building blocks
    # --------------------------------------------------------------------------------------
    @staticmethod
    def _field_char(paragraph, kind):
        run = paragraph.add_run()
        char = OxmlElement("w:fldChar")
        char.set(qn("w:fldCharType"), kind)
        run._r.append(char)
        return run

    def field(self, paragraph, instruction, placeholder="", size=None):
        """Inserts a simple Word field (PAGE...) in a paragraph."""
        self._field_char(paragraph, "begin")
        run = paragraph.add_run()
        instr = OxmlElement("w:instrText")
        instr.set(qn("xml:space"), "preserve")
        instr.text = f" {instruction} "
        run._r.append(instr)
        self._field_char(paragraph, "separate")
        result = paragraph.add_run(placeholder)
        if size:
            result.font.size = Pt(size)
        self._field_char(paragraph, "end")

    def rich(self, paragraph, text, size=None, bold=False):
        """Adds text with a tiny markup: **bold**, *italic*, `code` and [[pending (highlighted)]]."""
        for chunk in MARKUP.split(text):
            if not chunk:
                continue
            if chunk.startswith("**") and chunk.endswith("**"):
                run = paragraph.add_run(chunk[2:-2])
                run.bold = True
            elif chunk.startswith("[[") and chunk.endswith("]]"):
                run = paragraph.add_run("PENDIENTE: " + chunk[2:-2])
                run.bold = True
                run.font.highlight_color = WD_COLOR_INDEX.YELLOW
            elif chunk.startswith("`") and chunk.endswith("`"):
                run = paragraph.add_run(chunk[1:-1])
                run.font.name = CODE_FONT
                run.font.size = Pt((size or BODY_SIZE) - 1)
            elif chunk.startswith("*") and chunk.endswith("*"):
                run = paragraph.add_run(chunk[1:-1])
                run.italic = True
            else:
                run = paragraph.add_run(chunk)
            if bold:
                run.bold = True
            if size and not (chunk.startswith("`") and chunk.endswith("`")):
                run.font.size = Pt(size)
        return paragraph

    def p(self, text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, size=None, after=6, keep_next=False):
        paragraph = self.doc.add_paragraph()
        paragraph.alignment = align
        paragraph.paragraph_format.space_after = Pt(after)
        paragraph.paragraph_format.keep_with_next = keep_next
        return self.rich(paragraph, text, size)

    def bullets(self, items, numbered=False, size=None):
        for item in items:
            paragraph = self.doc.add_paragraph(style="List Number" if numbered else "List Bullet")
            paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            paragraph.paragraph_format.space_after = Pt(3)
            self.rich(paragraph, item, size)

    def heading(self, text, level, toc=True, page_break=False):
        paragraph = self.doc.add_heading("", level=level)
        if page_break:
            paragraph.paragraph_format.page_break_before = True
        self.rich(paragraph, text)
        if toc:
            self.headings.append((level, re.sub(r"[*`]", "", text)))
        return paragraph

    def h1(self, text):
        return self.heading(text, 1, page_break=True)

    def h2(self, text):
        return self.heading(text, 2)

    def h3(self, text):
        return self.heading(text, 3, toc=False)

    @staticmethod
    def _repeat_header(row):
        tr_pr = row._tr.get_or_add_trPr()
        mark = OxmlElement("w:tblHeader")
        mark.set(qn("w:val"), "true")
        tr_pr.append(mark)

    @staticmethod
    def _cant_split(row):
        tr_pr = row._tr.get_or_add_trPr()
        mark = OxmlElement("w:cantSplit")
        mark.set(qn("w:val"), "true")
        tr_pr.append(mark)

    @staticmethod
    def _shade(cell, fill):
        tc_pr = cell._tc.get_or_add_tcPr()
        shade = OxmlElement("w:shd")
        shade.set(qn("w:val"), "clear")
        shade.set(qn("w:color"), "auto")
        shade.set(qn("w:fill"), fill)
        tc_pr.append(shade)

    def caption(self, label, text, above):
        paragraph = self.doc.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT if above else WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.space_before = Pt(4 if above else 2)
        paragraph.paragraph_format.space_after = Pt(3 if above else 8)
        paragraph.paragraph_format.keep_with_next = above
        self.rich(paragraph, f"**{label}.** {text}", size=CAPTION_SIZE)

    def table(self, headers, rows, widths, size=TABLE_SIZE, title=None):
        """Black-bordered table like the guide's: bold header without fill, repeated on each page."""
        assert abs(sum(widths) - TEXT_WIDTH_CM) < 0.05 or sum(widths) < TEXT_WIDTH_CM, widths
        if title:
            self.table_count += 1
            self.caption(f"Tabla {self.table_count}", title, above=True)
        table = self.doc.add_table(rows=1, cols=len(headers))
        table.style = "Table Grid"
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        for i, text in enumerate(headers):
            cell = table.rows[0].cells[i]
            self.rich(cell.paragraphs[0], text, size=size, bold=True)
        self._repeat_header(table.rows[0])
        for row in rows:
            cells = table.add_row().cells
            for i, text in enumerate(row):
                self.rich(cells[i].paragraphs[0], str(text), size=size)
        for row in table.rows:
            self._cant_split(row)
            for i, width in enumerate(widths):
                row.cells[i].width = Cm(width)
                for paragraph in row.cells[i].paragraphs:
                    paragraph.paragraph_format.space_after = Pt(0)
                    paragraph.paragraph_format.line_spacing = 1.0
        for i, width in enumerate(widths):
            table.columns[i].width = Cm(width)
        spacer = self.doc.add_paragraph()
        spacer.paragraph_format.space_after = Pt(2)
        spacer.paragraph_format.line_spacing = 0.8
        return table

    @staticmethod
    def image_stream(path, max_width_px=None):
        """Image ready for Word. JPEGs without a JFIF/EXIF segment get a minimal APP0 so python-docx
        can read them; large images are scaled down to keep the .docx light."""
        data = open(path, "rb").read()
        if max_width_px:
            from PIL import Image
            image = Image.open(io.BytesIO(data))
            if image.width > max_width_px:
                image = image.resize((max_width_px, round(image.height * max_width_px / image.width)), Image.LANCZOS)
                buffer = io.BytesIO()
                image.save(buffer, format="PNG", optimize=True)
                return io.BytesIO(buffer.getvalue())
        if data[:2] == b"\xff\xd8" and data[2:4] not in (b"\xff\xe0", b"\xff\xe1"):
            app0 = b"\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
            data = data[:2] + app0 + data[2:]
        return io.BytesIO(data)

    def figure(self, path, width_cm, text, height_cm=None, max_width_px=None):
        self.figure_count += 1
        paragraph = self.doc.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.keep_with_next = True
        paragraph.paragraph_format.space_after = Pt(0)
        if os.path.exists(path):
            run = paragraph.add_run()
            if height_cm:
                run.add_picture(self.image_stream(path, max_width_px), height=Cm(height_cm))
            else:
                run.add_picture(self.image_stream(path, max_width_px), width=Cm(width_cm))
        else:
            self.rich(paragraph, f"[[falta la imagen {os.path.basename(path)}]]")
        self.caption(f"Figura {self.figure_count}", text, above=False)

    def figure_placeholder(self, text):
        """Box for a capture the team has to paste."""
        self.figure_count += 1
        table = self.doc.add_table(rows=1, cols=1)
        table.style = "Table Grid"
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.rows[0].cells[0]
        cell.width = Cm(TEXT_WIDTH_CM)
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        self.rich(cell.paragraphs[0], f"[[pegar aquí: {text}]]", size=9.5)
        cell.add_paragraph()
        self.caption(f"Figura {self.figure_count}", text, above=False)

    def code(self, lines, size=8.5):
        table = self.doc.add_table(rows=1, cols=1)
        table.style = "Table Grid"
        self._cant_split(table.rows[0])  # keep the block on one page
        cell = table.rows[0].cells[0]
        cell.width = Cm(TEXT_WIDTH_CM)
        self._shade(cell, "F2F2F2")
        for i, line in enumerate(lines):
            paragraph = cell.paragraphs[0] if i == 0 else cell.add_paragraph()
            paragraph.paragraph_format.space_after = Pt(0)
            paragraph.paragraph_format.line_spacing = 1.0
            run = paragraph.add_run(line)
            run.font.name, run.font.size = CODE_FONT, Pt(size)
        spacer = self.doc.add_paragraph()
        spacer.paragraph_format.space_after = Pt(2)

    def page_break(self):
        self.doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    # --------------------------------------------------------------------------------------
    # Table of contents (TOC field whose cached result has the computed page numbers)
    # --------------------------------------------------------------------------------------
    def toc_entries(self):
        """The headings of the report, in order (a first pass collects them)."""
        return TOC_ENTRIES

    def table_of_contents(self):
        title = self.doc.add_paragraph()
        title.paragraph_format.space_before = Pt(12)
        title.paragraph_format.space_after = Pt(6)
        title.paragraph_format.keep_with_next = True
        run = title.add_run("Índice")
        run.bold, run.font.size = True, Pt(14)
        entries = self.toc_entries()
        tab_position = Cm(TEXT_WIDTH_CM)
        for index, (level, text) in enumerate(entries):
            paragraph = self.doc.add_paragraph()
            fmt = paragraph.paragraph_format
            fmt.space_after = Pt(1)
            fmt.space_before = Pt(0 if level == 2 else 3)
            fmt.line_spacing = 1.05
            fmt.left_indent = Cm(0 if level == 1 else 0.6)
            fmt.tab_stops.add_tab_stop(tab_position, WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
            if index == 0:
                self._field_char(paragraph, "begin")
                instr_run = paragraph.add_run()
                instr = OxmlElement("w:instrText")
                instr.set(qn("xml:space"), "preserve")
                instr.text = ' TOC \\o "1-2" \\h \\z \\u '
                instr_run._r.append(instr)
                self._field_char(paragraph, "separate")
            entry = paragraph.add_run(f"{text}\t{self.page_numbers.get(text, '0')}")
            entry.font.size = Pt(10.5)
            entry.bold = level == 1
            if index == len(entries) - 1:
                self._field_char(paragraph, "end")

    # --------------------------------------------------------------------------------------
    # Content
    # --------------------------------------------------------------------------------------
    def header_block(self):
        """Opening block with the same fields as the guide's template."""
        title = self.doc.add_paragraph(style="Title")
        title.add_run("Entregable 3. Informe de Proyecto: Sistema Apuntado (Equipo Error 404)")
        for label, value in (
            ("Asignatura", "Fundamentos de Arquitectura de Software"),
            ("Caso de Estudio", "Sistema Digital de Juego de Cartas (Variante Clásica & Variante Apuntado a 101)"),
            ("Marco Teórico Base", "*Fundamentals of Software Architecture: A Modern Engineering Approach* "
                                   "(2.ª edición, 2025) – Mark Richards & Neal Ford."),
        ):
            paragraph = self.doc.add_paragraph()
            paragraph.paragraph_format.space_after = Pt(2)
            self.rich(paragraph, f"**{label}:** {value}")
        label = self.doc.add_paragraph()
        label.paragraph_format.space_before = Pt(12)
        label.paragraph_format.space_after = Pt(4)
        label.paragraph_format.keep_with_next = True
        self.rich(label, "**Integrantes del Equipo:**")
        self.table(
            ["Nombre Completo", "Doc. Identificación", "Correo Electrónico"],
            [
                ["Santiago Alvarez Muñoz", "[[documento]]", "[[correo institucional]]"],
                ["Sergio Esteban Romero Macariz", "[[documento]]", "seromerom@unal.edu.co"],
                ["Andres Felipe Lemus Victoria", "[[documento]]", "[[correo institucional]]"],
                ["Omar Zambrano", "[[documento]]", "[[correo institucional]]"],
            ],
            [6.2, 4.3, 6.0],
            size=10.5,
        )
        self.table_of_contents()

    def section_1(self):
        self.h1("1. Arquitectura Física y Dinámica de la Solución (Modelado UML)")
        self.p("Los diagramas se dibujaron en UML 2.5 con PlantUML **a partir del código y la configuración de la rama "
               "`main`**, no del diseño previo. Desde el 26/11/2026 todo el código, los contratos de datos, la API y los "
               "eventos usan identificadores en inglés (los textos de la interfaz siguen en español), así que los "
               "diagramas usan esos nombres. Las fuentes `.puml` y las exportaciones PNG y SVG están en "
               "`diagramas/entregable-3/`; el SVG permite ampliar sin pérdida (Richards & Ford, 2025, cap. 23: título, "
               "clave de notación y nombres tomados del código).")

        self.h2("1.1 Diagrama UML de Despliegue (Nodos, Contenedores y Protocolos)")
        self.figure(os.path.join(DIAGRAMS, "01-despliegue-mvp.png"), TEXT_WIDTH_CM,
                    "Diagrama de despliegue del MVP (`01-despliegue-mvp.puml`).", max_width_px=3000)
        self.table(
            ["Nodo / entorno", "Artefactos desplegados", "Comunicación"],
            [
                ["**«device» Dispositivo del Jugador** › navegador web",
                 "SPA React 18 (build Vite 5: `index.html`, `assets/*.js/css`), `socket.io-client` 4.7",
                 "HTTP(S) REST `/api/*` con JWT; WebSocket (Socket.IO, namespace `/game`)"],
                ["**«executionEnvironment» Servidor Web y API** › contenedor `frontend` (`nginx:1.27-alpine`, :80 → host :5173)",
                 "Estáticos de la SPA y `nginx.conf` (proxy inverso)",
                 "`proxy_pass http://backend:3000` para `/api/`, `/docs` y `/socket.io/` con `Upgrade: websocket` (timeout 3600 s)"],
                ["› contenedor `backend` (`node:20.18-alpine`, usuario sin privilegios, :3000)",
                 "`dist/src/main.js` (NestJS 10), `dist/plugins/classic`, `dist/plugins/apuntado`",
                 "Driver MongoDB por TCP :27017; transacciones `snapshot` / `majority`"],
                ["› contenedor `mongo-init` (tarea única)",
                 "`init.sh`: migración `migrate-english-contracts.js`, validadores e índices (`create-collections.mongodb.js`) y semilla de diseños",
                 "`mongosh` sobre TCP :27017 (idempotente)"],
                ["**«device» Servidor de Base de Datos** › contenedor `mongo:7.0 --replSet rs0`",
                 "Base `apuntado`: `matches`, `token_ledger`, `users`, `games`, `players` y `card-designs`, en el volumen `mongo-data`",
                 "En la nube: MongoDB Atlas con TLS (`mongodb+srv://`)"],
            ],
            [5.3, 5.6, 5.6],
            title="Nodos, artefactos y protocolos del despliegue.",
        )
        self.p("**Decisiones visibles en el diagrama.** (1) *Mismo origen*: Nginx sirve la SPA y reenvía la API y el socket, "
               "lo que evita CORS y requiere un solo certificado. (2) *Replica set obligatorio*: el cobro de apuestas y el pago "
               "del pozo usan transacciones multidocumento (ADR-04). (3) *Arranque por salud*: MongoDB PRIMARY → `mongo-init` "
               "con código 0 → backend sano → frontend. (4) *Salas pública y privada*: `GameSocket` une cada conexión a "
               "`match:{gameId}` (vista pública) y `user:{userId}` (solo su mano), lo que mitiga la fuga de cartas (R04). "
               "(5) *Migración de contratos*: antes de aplicar los validadores, `mongo-init` cierra las partidas que vivían en "
               "las colecciones en español, libera a sus jugadores y elimina esas colecciones. En producción, el frontend y el "
               "backend corren en Render (HTTPS y WSS terminados por el proveedor) y la base en MongoDB Atlas.")

        self.h2("1.2 Diagrama UML de Secuencia (Flujo Crítico de Cierre y Liquidación)")
        self.table(
            ["Participante pedido por la guía", "Implementación real (línea de vida)"],
            [
                ["Jugador (UI)", "SPA React → `MatchPlayController` (`POST /api/matches/current/commands/close`)"],
                ["GameOrchestrator", "`TurnOrchestrator` (ruta del comando: idempotencia, versión, escritura y publicación)"],
                ["HandEvaluator (plug-in de regla)", "`GameRulePlugin` (`ClassicRulePlugin` / `ApuntadoRulePlugin`) con `HandEvaluator`"],
                ["ScoringService", "Funciones puras de `match-commands.ts`: `closeRound`, `concludeRound`, `scoreboardEntry` y `finish`, con `settleRound` y `evaluateOutcome` del plug-in"],
                ["Repository / DB", "`MatchRepository` (escritura condicional), `UnitOfWork` (transacción), `TokenLedgerRepository` y MongoDB rs0"],
                ["Notificación", "`EventBus` → `GameSocket` → salas `match:{gameId}` y `user:{userId}` (solo después del *commit*)"],
            ],
            [5.0, 11.5],
            title="Correspondencia entre los participantes de la guía y el código.",
        )
        self.p("**Fragmentos `alt`.** *Escenario 1, Clásica*: el plug-in acepta 1 cuarta + 2 ternas + 1 descarte sin "
               "sobrantes; `closeEffect` termina la ronda, `evaluateOutcome` declara ganador a quien cierra y la partida pasa a "
               "`FINISHED`. *Escenario 2, Apuntado*: (2.1) **tocar** (`KNOCK`) con 3 ternas + 1 sobrante de menos de 5 puntos "
               "abre la **ronda extra** (cada rival juega un último turno); (2.2) el **cierre final** (4-3-3 con bonificación de "
               "−10, o el último descarte de la ronda extra) liquida con `unmatchedPoints`, registra la `ScoreboardEntry` y "
               "evalúa el desenlace: quien llega a **101 o más** queda eliminado y la partida termina si queda un solo jugador o "
               "alguien llega a −51; si no, se reparte la ronda siguiente en el mismo cálculo. *Cierre inválido*: castigo (+3 en "
               "Apuntado, 0 en Clásica), evento `CLOSE_FAILED` y el turno continúa.")
        self.p("**Persistencia y concurrencia.** Todo se calcula en memoria y se guarda en **una sola escritura condicional** "
               "(`version`, turno y `commandId`). Si la partida termina, la escritura y el pago del pozo van en una transacción. "
               "Si otro comando ganó la carrera, el filtro no coincide, `resolveConflict` relee la partida y responde **409 "
               "`ROUND_ALREADY_CLOSED`** (o `NOT_YOUR_TURN` / `STALE_VERSION`); el cliente relee `GET /api/matches/current`. "
               "Este comportamiento está probado con 8 pruebas e2e sobre un *replica set* real.")

        self.figure(os.path.join(DIAGRAMS, "02-secuencia-cierre-liquidacion.png"), None,
                    "Secuencia del intento de cierre de ronda y la liquidación (`02-secuencia-cierre-liquidacion.puml`).",
                    height_cm=21.0, max_width_px=2400)
        self.h2("1.3 Diagrama UML de Clases de Implementación Actualizado")
        self.figure(os.path.join(DIAGRAMS, "03-clases-implementacion-mvp.png"), TEXT_WIDTH_CM,
                    "Clases de implementación del MVP: microkernel con inversión de dependencias "
                    "(`03-clases-implementacion-mvp.puml`; el SVG permite ampliar).", max_width_px=3600)
        self.p("**Notación.** `+` público y `-` privado; en los módulos `«utility»` (funciones puras de TypeScript), `+` es una "
               "función exportada y `-` una interna. No aparece `#` porque ningún miembro del código es `protected`. Los tipos "
               "unión de literales se modelan como `«enumeration»` y los tipos son los de TypeScript (`ReadonlyArray<ContractCard>`, "
               "`Promise<CommandResult>`, `MatchRound | null`).")
        self.table(
            ["Concepto", "Elemento real", "Ubicación"],
            [
                ["Partida, ronda, mano, carta, turno y marcador",
                 "`Match` (raíz, con `version` y `recentCommands`), `MatchRound` (+ `ExtraRound`), `PlayerHand`, `MatchCard`, `MatchTurn`, `ScoreboardEntry` + `RoundPoints`",
                 "`backend/src/domain/match/match.ts`"],
                ["Contrato de reglas",
                 "`GameRulePlugin` v1.0.0: `dealSettings`, `allowedCloses`, `validateClose`, `closeEffect`, `settleRound`, `evaluateOutcome`",
                 "`backend/src/rules/contract/`"],
                ["Plug-ins",
                 "`ClassicRulePlugin` (`classic`) y `ApuntadoRulePlugin` (`apuntado`) + `ApuntadoParameters` (101, −51, 5, 10, 3)",
                 "`backend/plugins/{classic,apuntado}/`"],
                ["Evaluación combinatoria",
                 "`HandEvaluator` (`IHandEvaluator`): `isMeld`, `isThree`, `isFour`, `isFourAndTwoThrees`, `areThreeThrees`, `unmatchedPoints`; `RunPolicy` = `WITH_WRAP` / `WITHOUT_WRAP`",
                 "`backend/src/rules/evaluator/`"],
                ["Núcleo",
                 "`TurnOrchestrator`, `RuleRegistry` (valida semver, forma y prueba de humo) y `RulePluginsModule` (única raíz de composición)",
                 "`backend/src/application/match/`, `rules/registry/`"],
            ],
            [3.6, 8.7, 4.2],
            size=9,
            title="Correspondencia entre el modelo y el código fuente.",
        )
        self.p("**Patrón de desacoplamiento.** *Microkernel* con *Strategy* e inversión de dependencias: el núcleo "
               "(`TurnOrchestrator` y `match-commands`) solo conoce `GameRulePlugin` y `RuleRegistry`; los plug-ins dependen del "
               "contrato y del evaluador, y solo `RulePluginsModule` instancia los plug-ins concretos. La política de escalera es "
               "una *Strategy* inyectada por constructor. FF-02 y FF-05 verifican estas reglas en cada cambio (sección 4).")

    def section_2(self):
        self.h1("2. Producto Mínimo Viable (MVP) y Prácticas de Ingeniería")
        self.h2("2.1 Ficha Técnica y Alcance Operativo del MVP")
        self.table(
            ["Aspecto", "Detalle"],
            [
                ["Nombre del sistema", "Apuntado Digital (Equipo Error 404)"],
                ["Estilo arquitectónico", "Monolito modular por capas (ADR-01, ADR-06) con núcleo *microkernel* y plug-ins de reglas (ADR-02, ADR-03); un solo *quantum* de despliegue"],
                ["Backend", "Node.js 20, NestJS 10, TypeScript 5.4, Socket.IO 4 (namespace `/game`) y Swagger en `/docs`"],
                ["Frontend", "React 18, Vite 5, Material UI 5 y socket.io-client 4, servidos por Nginx 1.27. Interfaz rediseñada: página de inicio, página de reglas y tablero guiado (sección 3.4)"],
                ["Base de datos", "MongoDB 7 como *replica set* (Atlas en la nube): agregado `matches`, libro `token_ledger` *append-only* y validadores `$jsonSchema` (ADR-04)"],
                ["Convenciones", "Código, contratos de datos, API, eventos y valores de enumeración en inglés; textos de la interfaz en español"],
                ["Modalidad Clásica (4-3-3)", "Una ronda; único cierre: 1 cuarta + 2 ternas + 1 descarte, sin sobrantes; quien cierra gana el pozo"],
                ["Modalidad Apuntado a 101", "Varias rondas. Cierre 4-3-3 (−10 al que cierra) o **tocar** con 3 ternas + 1 sobrante < 5 pts (abre la ronda extra). Penalizaciones acumuladas; eliminación con ≥ 101; victoria si queda un jugador o alguien llega a ≤ −51; castigo de +3 por cierre inválido"],
                ["Validación de jugadas", "Algorítmica (grupos de valor y escaleras con la política `WITH_WRAP`); oráculo de regresión de 260 ternas y 299 cuartas"],
                ["Mecanismo de concurrencia", "Partida multijugador web en tiempo real (2 a 6 jugadores). El servidor es la única autoridad: comandos REST con concurrencia optimista (`version`), idempotencia (`commandId`) y escritura atómica condicional; transacciones `snapshot`/`majority` para apuestas y pozo; notificaciones por salas pública y privada después del *commit* (ADR-05)"],
                ["Seguridad", "JWT de acceso y refresco, guardias por juego, barajado con `crypto.randomInt` y contenedores sin privilegios"],
                ["Pruebas", "106 unitarias y de contrato (Jest), 8 e2e de concurrencia con *replica set* en memoria, 20 de la lógica del tablero (Vitest) y 28 *fitness functions* (FF-01 a FF-06)"],
            ],
            [4.0, 12.5],
            title="Ficha técnica del MVP.",
        )

        self.h2("2.2 Repositorio, Enlace de Despliegue y Manual de Ejecución")
        self.bullets([
            f"**Repositorio:** {REPO} (rama `main`; el PR #1 integró el MVP y el *pipeline* lo verificó en verde). "
            "[[confirmar que el repositorio es público o que el docente tiene acceso]]",
            f"**Aplicación en vivo:** {APP} · **API y Swagger:** {API}. Render detiene los servicios inactivos, así que la "
            "primera carga puede tardar cerca de un minuto.",
            "**README.md:** ficha técnica, guía de inicio rápido (local y nube), flujo de humo con dos navegadores y "
            "limitaciones conocidas.",
        ])
        self.p("**Ejecución local con un solo comando** (requiere Docker con Compose v2 y los puertos 5173, 3000 y 27017 libres):",
               keep_next=True)
        self.code([
            "git clone " + REPO + ".git",
            "cd Error-404---Apuntado",
            "./start.sh    # Linux / macOS (start.bat en Windows): crea .env y ejecuta docker compose",
            "# Aplicación: http://localhost:5173 · API y Swagger: http://localhost:3000/docs",
            "",
            "# Pruebas",
            "cd backend && npm ci && npx jest && npm run test:e2e   # 106 + 8 pruebas",
            "cd frontend && yarn install && yarn test               # 20 pruebas Vitest",
            "cd tests/architecture && npm ci && npm test            # 28 fitness functions",
            "npm run test:strict && npm run metrics                 # modo estricto y métricas",
        ])
        self.p("El orden de arranque está garantizado por *healthchecks*: MongoDB inicia el *replica set* `rs0`, `mongo-init` "
               "migra los contratos, aplica los validadores e índices de `docs/schemas` y carga los diseños de carta, el backend "
               "arranca cuando la base está lista y el frontend cuando el backend responde `/docs`.")
        self.table(
            ["Requisito de la entrega (guía, sección 7)", "Ubicación en el repositorio"],
            [
                ["Código fuente completo del MVP", "`backend/` (NestJS + `plugins/`) y `frontend/` (React)"],
                ["README con instrucciones y enlace al despliegue", "`README.md`"],
                ["Pipeline CI/CD con las fitness functions", "`.github/workflows/ci.yml` y `tests/architecture/`"],
                ["Evidencias de validación con usuarios", "`docs/capitulo-3-validacion-usuarios.md` y `docs/evidencias/`"],
                ["Diagramas UML, métricas, checklists y ADRs", "`diagramas/entregable-3/`, `docs/metricas/`, `docs/checklists-ingenieria.md` y `docs/adrs/`"],
                ["Guion de la demostración en vivo", "`docs/guion-demostracion.md`"],
            ],
            [6.5, 10.0],
            title="Contenido del repositorio exigido por la guía.",
        )

        self.h2("2.3 Checklists de Ingeniería Aplicadas (Code-Completion, Testing, Release)")
        self.p("Se aplicaron las tres listas del cap. 24 de Richards & Ford antes de integrar cada cambio a `main`. El documento "
               "completo, con la evidencia de cada ítem, está en `docs/checklists-ingenieria.md`. Convención: ✅ cumplido · "
               "⚠️ con observación · ❌ pendiente.")
        widths = [1.6, 5.0, 1.6, 8.3]
        self.table(
            ["#", "Developer Code-Completion Checklist", "Estado", "Evidencia"],
            [
                ["1.1–1.2", "Sin `console.log` de depuración (backend y frontend)", "✅", "0 resultados en `backend/src`, `backend/plugins` y `frontend/src`; el backend usa `Logger`"],
                ["1.3", "Sin código muerto", "✅", "Se eliminaron las tablas `allowed-trips`/`allowed-quads`, el flujo `Match` del prototipo, los *endpoints* antiguos y el modelo del tablero anterior"],
                ["1.4", "Sin excepciones absorbidas en silencio", "✅", "Inventario de cada `catch`: relanza, traduce a error de dominio o registra con `Logger.error` por decisión documentada (ADR-05)"],
                ["1.5", "Errores de dominio con código estable", "✅", "`ROUND_ALREADY_CLOSED`, `NOT_YOUR_TURN`, `INVALID_GROUPS`, `CLOSE_NOT_ALLOWED`...; respuestas 409, 400 y 404"],
                ["1.6–1.7", "CC ≤ 10, sin ciclos y motor sin framework", "✅", "FF-03, FF-04 y FF-05 en modo estricto"],
                ["1.8–1.9", "Secretos fuera del código; dependencias declaradas", "✅", "JWT desde el entorno, `.env` ignorado y `uuid` explícito"],
                ["1.10", "Estilo del proyecto y nombres", "✅", "ESLint en verde; identificadores, contratos y API en inglés y textos en español (refactor del 26/11/2026)"],
            ],
            widths, size=9, title="Developer Code-Completion Checklist.",
        )
        self.table(
            ["#", "Unit & Functional Testing Checklist", "Estado", "Evidencia"],
            [
                ["2.1–2.3", "Reglas de negocio, oráculo del prototipo y suite de contrato común", "✅", "`hand-evaluator.spec.ts`, `plugins/contract.spec.ts`, pruebas de cada plug-in y `match-commands.spec.ts`"],
                ["2.4", "**Caso borde A:** 3 ternas incompletas", "✅", "Se rechaza con motivo; de punta a punta devuelve `CLOSE_FAILED`, suma +3 y el turno continúa (`edge-cases.spec.ts`)"],
                ["2.5", "**Caso borde B:** sobrante de exactamente 5 puntos", "✅", "Se rechaza; el de 4 se acepta y el As (10 pts) se rechaza"],
                ["2.6", "**Caso borde C:** detección exacta de 101 (y −51)", "✅", "100 no elimina y 101 sí; con 2 jugadores termina; −50 no gana y −51 sí"],
                ["2.7", "Concurrencia e idempotencia", "✅", "`close-concurrency.e2e-spec.ts` (8/8 sobre un *replica set* real)"],
                ["2.8–2.9", "Sin fuga de cartas; persistir antes de notificar", "✅", "`match-notifications.spec.ts` y `turn-orchestrator.service.spec.ts`"],
                ["2.10–2.11", "Fitness functions y lógica del tablero", "✅", "28/28 en ambos modos; Vitest 20/20 (`match.utils.test.ts`)"],
            ],
            widths, size=9, title="Unit & Functional Testing Checklist.",
        )
        self.table(
            ["#", "Software Release Checklist", "Estado", "Evidencia"],
            [
                ["3.1–3.5", "Scripts de base de datos, validadores, índices y semilla", "✅", "`docs/schemas/create-collections.mongodb.js` y `docker/mongo/seed-card-designs.js`, ejecutados por `mongo-init`"],
                ["3.6–3.7", "Base transaccional y variables de entorno documentadas", "✅", "`--replSet rs0` / Atlas; tres plantillas `.env.example`"],
                ["3.8–3.10", "Builds en verde e imágenes seguras", "✅", "`tsc` sin errores, `nest build` y `yarn build`; Dockerfiles *multi-stage* sin root"],
                ["3.11", "Arranque con un solo comando", "✅", "`start.sh` / `start.bat`; el job `containers` lo verifica (en verde en el PR #1)"],
                ["3.12", "Flujo funcional completo desde la interfaz", "✅", "Tablero sobre `/api/matches/current`; partida real de dos jugadores verificada tras el rediseño"],
                ["3.13–3.14", "Instalación reproducible; ADRs al día", "✅", "`package-lock.json` del backend versionado (`npm ci`); ADR-06 registra la organización por capas"],
                ["3.15", "Pipeline CI/CD con fitness functions", "✅", "`ci.yml` con 5 jobs; 4 puertas en verde en el PR #1 (Figura 4)"],
                ["3.16", "Migración de los contratos en inglés", "⚠️", "Automática en Docker (`mongo-init`). [[ejecutar `migrate-english-contracts.js` y `create-collections.mongodb.js` con `mongosh` contra Atlas antes de desplegar esta versión en Render]]"],
            ],
            widths, size=9, title="Software Release Checklist.",
        )

    def section_3(self):
        self.h1("3. Protocolo y Resultados de Validación con Usuarios Reales")
        self.h2("3.1 Diseño Metodológico del Experimento con Usuarios")
        self.p("La validación siguió ISO/IEC 25010 (eficacia, eficiencia y satisfacción) y el cuestionario estandarizado **SUS** "
               "(Brooke, 1996). Participaron **cinco personas ajenas al equipo de desarrollo**, con familiaridad variable con los "
               "naipes y distintos niveles técnicos, sobre el despliegue real en Render y MongoDB Atlas.")
        self.table(
            ["ID", "Rol", "Edad", "Formación", "Familiaridad con naipes", "Nivel técnico", "Dispositivo / navegador"],
            [
                ["U1", "Anfitrión", "22", "Ing. Sistemas", "Alta", "Alto", "PC Windows 11 / Chrome 131"],
                ["U2", "Invitado", "21", "Ing. Industrial", "Media", "Medio", "Portátil macOS / Chrome 131"],
                ["U3", "Invitado", "23", "Ing. Civil", "Baja", "Medio", "Portátil Windows 10 / Firefox 132"],
                ["U4", "Invitada", "20", "Diseño Gráfico", "Media", "Medio-alto", "MacBook Air / Safari 17.4"],
                ["U5", "Invitado", "22", "Ing. Mecatrónica", "Alta", "Alto", "Portátil Ubuntu 24.04 / Brave 1.73"],
            ],
            [1.0, 1.9, 1.3, 2.8, 2.6, 2.1, 4.8],
            size=9, title="Población evaluadora.",
        )
        self.p("**Guion de tareas** (sin asistencia técnica):", keep_next=True, after=3)
        self.bullets([
            "**T1. Registro y personalización:** crear la cuenta, iniciar sesión y cambiar el ícono de perfil.",
            "**T2. Sala de espera:** el anfitrión crea una partida eligiendo **modalidad** (Clásica o Apuntado), jugadores y "
            "apuesta, y comparte el enlace; los invitados entran por enlace o ID.",
            "**T3. Turnos completos:** reconocer el turno, robar del mazo o del pozo, organizar grupos y descartar.",
            "**T4. Cierre y resultados:** en Clásica, cerrar con 4-3-3; en Apuntado, tocar con sobrante < 5 pts y comprobar "
            "la ronda extra; verificar la pantalla del ganador y el pozo.",
        ])
        self.p("[[la guía pide además (a) un cierre inválido deliberado para comprobar la retroalimentación y (b) en Apuntado, "
               "rondas consecutivas hasta observar la acumulación y el fin de partida al superar 101. Si se hicieron, "
               "agréguenlos aquí con su resultado; si no, hagan una sesión breve complementaria antes de entregar]]")

        self.h2("3.2 Registro de Pruebas y Evidencias (Logs, Grabaciones y Métricas)")
        self.table(
            ["Evidencia", "Contenido", "Ubicación"],
            [
                ["Despliegue en producción", "Backend *Live* en Render conectado a MongoDB Atlas", "`docs/evidencias/evidencia-despliegue-render.jpg`"],
                ["INC-02 (detección)", "Jugador duplicado 3 veces en la sala de espera", "`docs/evidencias/evidencia-inc02-duplicacion-3jugadores.png`"],
                ["INC-02 (severidad)", "Jugador duplicado 5 veces, por encima del cupo", "`docs/evidencias/evidencia-inc02-duplicacion-5jugadores.png`"],
                ["Grabaciones de las sesiones", "Partidas multijugador y sesiones individuales", "[[enlace público a los videos]]"],
                ["Encuestas SUS", "Respuestas de los 5 participantes", "[[exportar el formulario a `docs/evidencias/encuestas-sus.csv` o PDF y enlazarlo]]"],
                ["Capturas de partidas en curso", "Tablero durante T3 y T4", "[[agregar 2 o 3 capturas a `docs/evidencias/`]]"],
            ],
            [3.8, 5.4, 7.3],
            size=9, title="Inventario de evidencias.",
        )
        self.figure(os.path.join(EVIDENCE, "evidencia-despliegue-render.jpg"), 11.0, "Backend desplegado en Render (*Live*).")
        pair = self.doc.add_table(rows=1, cols=2)
        pair.alignment = WD_TABLE_ALIGNMENT.CENTER
        for i, name in enumerate(("evidencia-inc02-duplicacion-3jugadores.png", "evidencia-inc02-duplicacion-5jugadores.png")):
            paragraph = pair.rows[0].cells[i].paragraphs[0]
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            path = os.path.join(EVIDENCE, name)
            if os.path.exists(path):
                paragraph.add_run().add_picture(self.image_stream(path), width=Cm(7.6))
        self.figure_count += 1
        self.caption(f"Figura {self.figure_count}", "Incidente INC-02 antes del ajuste: jugador duplicado 3 y 5 veces.", above=False)
        self.p("**Extracto de logs del servidor.** Formato de los logs del código actual (desde el refactor a inglés los métodos "
               "se llaman `startMatch`, `notifyMatch`...); los identificadores se abrevian con `...`. Los comandos no escriben una "
               "línea propia: su efecto se ve en la `version` de cada `notifyMatch`, emitida solo después del *commit*. "
               "[[reemplazar por una copia literal de los logs de Render de la sesión]]", size=10, keep_next=True)
        self.code([
            "[Nest] 1 - 11/21/2026, 01:15:12 AM  LOG [GameService] [create] INIT :: request: {...,\"ruleId\":\"classic\"}",
            "[Nest] 1 - 11/21/2026, 01:15:40 AM  LOG [GameSocket] [joinPlayer] INIT :: user: 673eb014..., game: c4f0d49e...",
            "[Nest] 1 - 11/21/2026, 01:15:41 AM  LOG [GameSocket] [gameConnection] INIT :: user: 673eb014..., game: c4f0...",
            "[Nest] 1 - 11/21/2026, 01:16:02 AM  LOG [TurnOrchestrator] [startMatch] FINISH :: match: 673eb120...",
            "[Nest] 1 - 11/21/2026, 01:16:25 AM  LOG [GameSocket] [notifyMatch] match: 673eb120... version: 1",
            "[Nest] 1 - 11/21/2026, 01:17:50 AM  LOG [GameSocket] [notifyMatch] match: 673eb120... version: 3",
        ], size=7)

        self.h2("3.3 Análisis de Resultados (Efectividad, Errores y Usabilidad)")
        self.table(
            ["Indicador", "T1 Registro", "T2 Sala", "T3 Turnos", "T4 Cierre"],
            [
                ["Tasa de éxito al primer intento", "100 % (5/5)", "100 % (5/5)", "95 % (19/20 turnos)", "90 % (9/10 rondas)"],
                ["Tiempo promedio", "40,2 s", "25,8 s", "11,2 s / turno", "32,4 s / cierre"],
                ["Latencia WebSocket observada", "—", "≈ 145 ms", "≈ 160 ms", "≈ 170 ms"],
            ],
            [4.9, 2.7, 2.7, 3.1, 3.1],
            title="Eficacia y eficiencia por tarea.",
        )
        self.p("En T3, 1 de 20 turnos no se resolvió al primer intento: el usuario intentó una acción fuera de su fase. La "
               "interfaz mantiene deshabilitado «Descartar» fuera de la fase de 11 cartas y el servidor rechaza el comando con "
               "`INVALID_TURN_PHASE`, sin afectar el estado de la partida.")
        self.table(
            ["Usuario", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "Σ sᵢ", "SUS"],
            [
                ["U1", 4, 1, 5, 1, 4, 2, 5, 1, 4, 1, 36, "**90,0**"],
                ["U2", 4, 2, 4, 1, 4, 2, 4, 1, 4, 1, 33, "**82,5**"],
                ["U3", 3, 2, 4, 1, 4, 2, 4, 2, 4, 2, 30, "**75,0**"],
                ["U4", 5, 1, 5, 1, 4, 1, 5, 1, 5, 1, 39, "**97,5**"],
                ["U5", 4, 1, 5, 1, 4, 2, 4, 1, 4, 1, 35, "**87,5**"],
            ],
            [1.8] + [1.0] * 10 + [1.5, 3.2],
            size=9,
            title="Respuestas SUS (Likert 1–5) y puntaje individual: sᵢ = xᵢ − 1 en ítems impares y 5 − xᵢ en pares; SUS = 2,5 · Σ sᵢ.",
        )
        self.p("**SUS promedio = (90,0 + 82,5 + 75,0 + 97,5 + 87,5) / 5 = 86,5 / 100.** Frente a la media de la industria (68), "
               "el resultado corresponde al grado **A+** de la escala de Sauro & Lewis (2016) y a una usabilidad aceptable alta "
               "según Bangor, Kortum & Miller (2008).")
        self.table(
            ["ID Usuario", "Modalidad probada", "¿Logró cerrar ronda válida?", "Errores / confusiones detectadas",
             "Tiempo promedio por turno", "Satisfacción (SUS 0–100)"],
            [
                ["U01", "[[ ]]", "[[ ]]", "[[ ]]", "[[ ]]", "90,0"],
                ["U02", "[[ ]]", "[[ ]]", "[[ ]]", "[[ ]]", "82,5"],
                ["U03", "[[ ]]", "[[ ]]", "[[ ]]", "[[ ]]", "75,0"],
                ["U04", "[[ ]]", "[[ ]]", "[[ ]]", "[[ ]]", "97,5"],
                ["U05", "[[ ]]", "[[ ]]", "[[ ]]", "[[ ]]", "87,5"],
            ],
            [1.7, 2.6, 2.6, 4.9, 2.4, 2.3],
            size=9,
            title="Tabla consolidada de métricas por usuario (formato de la guía). Completar con los registros de cada sesión.",
        )
        self.table(
            ["ID", "Severidad", "Falla observada", "Causa raíz", "Estado"],
            [
                ["INC-01", "Alta", "Al abandonar una sala en espera, la cuenta quedaba bloqueada («¡No puedes crear un juego si ya estás jugando!»)", "El usuario pasaba a `PLAYING` sin un caso de uso de cancelación", "Resuelto (Ajuste 1)"],
                ["INC-02", "Alta", "Jugadores duplicados (hasta 5 veces) al salir y reingresar", "La consulta no filtraba `isActive`; *listeners* de Socket.IO fuera de `useEffect`", "Resuelto (Ajuste 2)"],
                ["INC-03", "Media", "El enlace compartido empezaba por `undefined/`", "Variable de entorno ausente y falta del prefijo `#` del *HashRouter*", "Resuelto"],
                ["INC-04", "Baja", "Los invitados buscaban la sala privada en la lista pública", "Falta de señalización entre salas públicas y privadas", "Mitigado (Ajuste 3)"],
                ["INC-05", "Media", "Cierres fallidos por grupos que el jugador creía válidos (1 de 10 rondas en T4)", "El tablero no indicaba qué grupos combinaban antes de cerrar", "Mitigado (Ajuste 3)"],
            ],
            [1.4, 1.9, 5.3, 5.0, 2.9],
            size=9, title="Errores y fricciones detectadas.",
        )

        self.h2("3.4 Plan de Ajustes y Mejoras Post-Validación")
        self.p("**Ajuste 1: ciclo de vida de la sala de espera (INC-01).** Se agregó `DELETE /api/game/current` y el caso de uso "
               "`GameService.leaveOrCancel`: si el anfitrión cancela, se liberan todos los usuarios y se borran sus asientos y la "
               "sala; si sale un invitado, se libera solo su asiento; si un usuario quedó `PLAYING` sin asiento, se recupera. En "
               "la interfaz hay botones «Cancelar sala» y «Salir de la sala» y un aviso en el inicio. La función, que la métrica "
               "de complejidad detectó con CC 13, se dividió en funciones privadas (hoy CC 6) y se cubrió con "
               "`game.service.leave-cancel.spec.ts`.")
        self.p("**Ajuste 2: sincronización y deduplicación de la sala (INC-02).** Filtro `isActive: true` en "
               "`PlayerQueries.getWithUserByGame` (prueba `player.queries.spec.ts`), *listeners* dentro de `useEffect` con "
               "`socket.off()`, deduplicación por `userId` y un sondeo de respaldo cada 2 s para converger ante eventos perdidos.")
        self.p("**Ajuste 3: rediseño de la interfaz y señalización del cierre (INC-04, INC-05).** Es la mejora que la guía pone "
               "como ejemplo. El tablero etiqueta cada grupo mientras el jugador organiza la mano («Terna», «Cuarta», «Escalera», "
               "«No combina» o «2 de 3 cartas»). Muestra los pasos del turno («Roba» → «Descarta o cierra») y resalta la carta "
               "recién robada. El botón de cierre cambia según la forma de la mano («Cerrar 4-3-3» o «Tocar»). Antes de un cierre "
               "que probablemente fallará, un diálogo explica la causa (un grupo no combina o el sobrante vale 5 puntos o más) y "
               "advierte el castigo de +3 en Apuntado. También permite ordenar las cartas sueltas por número o palo y muestra "
               "quién tocó y quién falta en la ronda extra. Se agregaron la página de inicio, la página de reglas y la indicación "
               "«Pública / Privada» al crear la mesa y en la sala. Las etiquetas son solo retroalimentación: el servidor sigue "
               "siendo la única autoridad sobre las reglas, así que el ajuste no tocó el núcleo ni los plug-ins. "
               "[[revalidar el Ajuste 3 con al menos 2 de los participantes y registrar si bajan los cierres fallidos]]")
        self.table(
            ["Dimensión", "Antes", "Después"],
            [
                ["Disponibilidad del usuario", "Bloqueo permanente en `PLAYING`", "Liberación con `DELETE /api/game/current` y aviso en el inicio"],
                ["Consistencia de la sala", "Hasta 5 duplicados", "Deduplicación por `userId` y asientos inactivos excluidos"],
                ["Resiliencia de red", "Solo WebSocket", "WebSocket + sondeo de respaldo (2 s)"],
                ["Enlace de invitación", "`undefined/...`", "Enlace absoluto con `window.location.origin` y *hash routing*"],
                ["Retroalimentación del cierre", "Solo el error del servidor después de intentar (con castigo)", "Etiqueta por grupo y confirmación previa con la causa"],
                ["Salas públicas y privadas", "Sin distinción visible", "Selector al crear y etiqueta «Mesa» en la sala"],
            ],
            [4.2, 5.4, 6.9],
            title="Comportamiento antes y después de los ajustes.",
        )
        self.p("**Mejoras proyectadas:** temporizadores de turno y manejo del abandono durante la partida (R08) y, a escala, "
               "reemplazar el sondeo de 2 s por eventos con *backoff* (sección 5.3).")

    def section_4(self):
        self.h1("4. Verificación de Gobernanza Arquitectónica y Calidad")
        self.h2("4.1 Integración de Fitness Functions en Pipeline CI/CD")
        self.p("El pipeline `.github/workflows/ci.yml` (GitHub Actions) se ejecuta en cada *pull request* y en cada *push* a "
               "`main`. Las cuatro primeras etapas son puertas de calidad: si alguna falla, el cambio no se integra ni se despliega.")
        self.table(
            ["Job", "Qué ejecuta", "Qué garantiza"],
            [
                ["`architecture`", "`npm test` (trinquete), `npm run test:strict` y `npm run metrics` en `tests/architecture`", "La estructura no se degrada; publica CC, Ca, Ce, I, A y D en el resumen y como artefacto"],
                ["`backend`", "`tsc --noEmit`, `jest --coverage` (106), `test:e2e` (8, *replica set* en memoria) y `nest build`", "Reglas, plug-ins, agregado y concurrencia del cierre (R03)"],
                ["`frontend`", "`yarn install --frozen-lockfile`, `lint`, `test` (20) y `build`", "La SPA compila con el mismo lockfile que la imagen Docker"],
                ["`containers`", "`docker compose up --build` y prueba de humo sobre `:3000/docs`, `:5173/` y `:5173/docs`", "Imágenes y arranque ordenado del sistema completo"],
                ["`deploy`", "*Deploy hooks* de Render (solo en *push* a `main`)", "Solo se despliega lo que pasó las cuatro puertas"],
            ],
            [2.6, 7.4, 6.5],
            size=9, title="Etapas del pipeline CI/CD.",
        )
        self.figure(os.path.join(EVIDENCE, "evidencia-pipeline-github-actions.jpg"), 14.0,
                    "Ejecución automática del pipeline en el PR #1 hacia `main`: las cuatro puertas en verde (arquitectura 48 s, "
                    "backend 57 s, contenedores 1 min y frontend 1 min) y el despliegue omitido, porque solo corre en *push* a "
                    "`main`. Desde el refactor del 26/11/2026 los jobs se llaman `architecture`, `containers` y `deploy`.")
        self.figure_placeholder("resumen del job `architecture` en la última ejecución sobre `main`: 28/28 en modo trinquete y "
                                "estricto, y la tabla de métricas")
        self.table(
            ["Prueba de la guía", "Fitness function", "Regla verificada", "Pruebas"],
            [
                ["Prueba 1: plug-ins sin acoplamiento cruzado", "**FF-02** (TSArch)", "Un plug-in no importa a otro; el núcleo (`domain`, `application`, `rules`, `match`, `match-play`, `game`) no conoce plug-ins concretos; un plug-in solo depende del contrato y del evaluador; sin ciclos entre plug-ins", "3"],
                ["Prueba 2: interfaz aislada del almacenamiento", "**FF-01** (TSArch + imports)", "Controladores y *gateways* no importan `database/`, `mongoose` ni `mongodb`; la SPA solo habla con la API", "2"],
                ["Prueba 3: sin dependencias cíclicas", "**FF-03** (grafo de imports + Tarjan)", "Sin ciclos entre archivos ni entre módulos `src/<module>`", "3"],
                ["Límite de complejidad", "**FF-04** (ESLint `complexity`)", "CC ≤ 10 en el núcleo y los plug-ins; CC ≤ 15 en todo el backend", "3"],
                ["Motor sin framework", "**FF-05** (imports)", "`card/`, `rules/` y `plugins/` sin NestJS, Mongoose, Socket.IO ni RxJS", "1"],
                ["Esquemas de datos", "**FF-06** (Ajv)", "8 validadores compilan, 4 ejemplos se aceptan y 3 estados inválidos se rechazan", "15"],
                ["Trinquete", "Meta-prueba", "Tolera la deuda registrada en `baseline.json` y rechaza la nueva", "1"],
            ],
            [3.6, 3.1, 8.2, 1.6],
            size=9, title="Las 28 fitness functions (7 suites). Resultado: 28/28 en modo trinquete y 28/28 en modo estricto.",
        )
        self.p("**Trinquete y estricto.** El modo trinquete tolera solo la deuda registrada en `baseline.json` y falla ante "
               "cualquier violación nueva; el estricto falla ante cualquier violación. La deuda del prototipo (ciclo de 8 módulos "
               "y motor acoplado a NestJS) se saldó y la línea base quedó vacía, así que ambos modos son bloqueantes. **Las fitness "
               "functions también se prueban:** cada una tiene meta-pruebas contra *fixtures* que la cumplen y la violan. Durante "
               "esta fase se detectó que FF-02 revisaba carpetas del diseño anterior; se corrigió y se comprobó con una mutación "
               "manual (un import temporal de `plugins/classic` desde `application/match` hizo fallar la prueba). El refactor de "
               "nombres a inglés tocó 348 archivos (66 renombrados) y la suite siguió en 28/28 sin cambiar ninguna regla, solo las rutas "
               "configuradas en `architecture.config.ts`.")

        self.h2("4.2 Reporte de Métricas de Código (Complejidad Ciclomática, Cohesión, Acoplamiento)")
        self.p("Las métricas se calculan con `tests/architecture/metrics.ts` (`npm run metrics`), que usa la regla `complexity` "
               "de ESLint y el analizador de TypeScript (equivalente a CodeMetrics para este *stack*). Componente = `src/<module>` "
               "o la subcarpeta en `application/`, `domain/` y `rules/`; cada plug-in es un componente (29 en total). Ca y Ce "
               "cuentan componentes (criterio JDepend); A = interfaces y clases abstractas / (esas + clases concretas y funciones). "
               "Fórmulas: I = Ce / (Ca + Ce); D = |A + I − 1|.")
        self.table(
            ["Alcance", "Funciones", "Media", "Mediana", "P90", "Máxima", "Umbral", "Sobre el umbral"],
            [
                ["Núcleo y plug-ins (FF-04)", "218", "1,67", "1", "3", "**7**", "10", "**0**"],
                ["Backend completo", "473", "1,57", "1", "3", "8", "15", "0"],
            ],
            [4.1, 2.1, 1.5, 1.7, 1.3, 1.7, 1.6, 2.5],
            title="Complejidad ciclomática.",
        )
        self.p("Las funciones más complejas del núcleo son `resolveConflict` (7), `validateGroups` (6) y `execute`, "
               "`attemptClose` y `concludeRound` (5). Los métodos combinatorios del evaluador (`isRun`, `isFourAndTwoThrees`, "
               "`areThreeThrees`...) están por debajo de 5, el valor deseable que pide la guía.")
        self.table(
            ["Componente", "Ca", "Ce", "I", "A", "D", "Lectura"],
            [
                ["`src/rules/contract`", "6", "0", "0,00", "0,91", "**0,09**", "Estable y abstracto: abstracciones estables"],
                ["`plugins/classic`", "1", "2", "0,67", "0,00", "0,33", "Solo lo usa la raíz de composición"],
                ["`plugins/apuntado`", "1", "2", "0,67", "0,50", "0,17", "Solo lo usa la raíz de composición"],
                ["`src/application/match` (orquestador)", "5", "8", "0,62", "0,38", "**0,01**", "El mejor equilibrio del backend"],
                ["`src/domain/match` (agregado)", "6", "2", "0,25", "0,37", "0,38", "Cerca de la secuencia principal"],
                ["`src/rules/evaluator`", "2", "1", "0,33", "0,09", "0,58", "Zona de dolor leve; baja volatilidad (oráculo)"],
                ["`src/rules/registry`", "3", "1", "0,25", "0,17", "0,58", "Zona de dolor leve; clase concreta estable"],
            ],
            [4.9, 0.9, 0.9, 1.1, 1.1, 1.2, 6.4],
            size=9, title="Acoplamiento, inestabilidad, abstracción y distancia: componentes del núcleo y de reglas.",
        )
        self.p("**Resumen de los 29 componentes:** D media 0,36; 20 cerca de la secuencia principal (D ≤ 0,5), 9 en la zona de "
               "dolor y **0 en la zona de inutilidad**. La zona de dolor la ocupan sobre todo objetos de valor y constantes del "
               "prototipo (`domain/user`, `domain/game`, `shared`, `card`), estables y poco volátiles; el riesgo real está en "
               "`src/card` y `domain/user` (Ca 6 y 13). La tabla completa está en `docs/metricas/metricas-arquitectura.md`.")
        self.p("**Cohesión y ley de Deméter.** [[la guía menciona cohesión (p. ej. LCOM) y ley de Deméter; el MVP no las mide "
               "automáticamente. Decidan si se reportan como trabajo futuro (como está) o si se agrega una medición antes de "
               "entregar]]. Cualitativamente, cada componente tiene una sola razón de cambio (las reglas en los plug-ins y la "
               "orquestación en `application/match`) y el núcleo se comunica con las reglas solo a través del contrato.")

        self.h2("4.3 Validación de Aislamiento Modular y Ausencia de Antipatrones")
        self.table(
            ["Antipatrón o riesgo estructural", "Situación en el prototipo", "Situación en el MVP", "Verificación"],
            [
                ["Dependencias cíclicas (*Big Ball of Mud*)", "Ciclo entre 8 módulos", "Sin ciclos entre archivos ni módulos", "FF-03 estricto"],
                ["*Entity Trap*", "`PlayerService` concentraba reparto, turnos, validación y puntaje", "Orquestador + agregado con funciones puras + plug-ins", "FF-03 y métricas"],
                ["Presentación acoplada a la persistencia", "Controladores con acceso directo a esquemas", "Controladores → servicios u orquestador → repositorios", "FF-01"],
                ["Motor de reglas acoplado al framework", "`card/` importaba NestJS", "Contrato, evaluador y plug-ins puros", "FF-05"],
                ["Reglas en tablas y condicionales", "260 ternas y 299 cuartas en texto", "Evaluador algorítmico, CC ≤ 7", "FF-04 + oráculo"],
                ["Plug-ins acoplados entre sí o al núcleo", "No existían plug-ins", "Ca de cada plug-in = 1 (raíz de composición)", "FF-02 + métricas"],
                ["Zona de inutilidad", "—", "Ningún componente", "Métricas (D)"],
            ],
            [4.1, 4.0, 5.1, 3.3],
            size=9, title="Antipatrones estructurales revisados.",
        )
        self.p("**Observación:** `domain/match/match.exceptions.ts` importa `HttpStatus` de `@nestjs/common`, así que el "
               "agregado no está totalmente libre de framework: FF-05 solo protege `card/`, `rules/` y `plugins/`.")

    def section_5(self):
        self.h1("5. Retrospectiva Arquitectónica y Análisis de Trade-Offs (Richards & Ford)")
        self.h2("5.1 Alineación Arquitectura vs. Implementación (Intersecciones)")
        self.p("La implementación **respetó las fronteras esenciales** del diseño (núcleo independiente de las variantes, "
               "agregado como frontera de consistencia, persistir antes de notificar), pero hubo **deriva en el cómo** de cuatro "
               "decisiones. Cada desviación se tomó de forma consciente y está verificada por una prueba o una métrica:")
        self.table(
            ["ADR", "Diseño (E1/E2)", "Implementación final", "Por qué se cedió", "¿Se cumplió la intención?"],
            [
                ["ADR-01", "Módulos de dominio (`juego`, `reglas`, `puntaje`...) con `api/`, `aplicacion/`, `dominio/` e `infraestructura/`", "Capas `domain/`, `application/`, `rules/` y `database/` con registros propios (DIP)", "Romper el ciclo de 8 módulos sin reescribir el prototipo completo", "Sí: FF-03 sin ciclos; ADR-06 registra el cambio"],
                ["ADR-03", "Manifiesto de plug-ins + `import()` dinámico", "Registro estático en la raíz de composición, validado al arrancar", "Con 2 modalidades, la carga dinámica no compensaba su complejidad", "En el núcleo sí (Ca de los plug-ins = 1); una variante nueva exige recompilar la raíz"],
                ["ADR-04", "Agregado de partidas + bitácora de jugadas + migración de colecciones", "`matches` y `token_ledger`; la bitácora `plays` quedó solo como esquema", "Prioridad a la atomicidad del cierre", "Sí para la atomicidad (e2e 8/8); falta la trazabilidad jugada a jugada"],
                ["ADR-05", "*Gateway* + interfaces + 10 eventos y `PresenceMonitor`", "`MatchPlayController` → `TurnOrchestrator`; un `MatchUpdatedEvent`; sin temporizadores", "Comandos por REST con 409 explícito; alcance del MVP", "Sí: no se notifica sin *commit*; R08 (abandono) pendiente"],
            ],
            [1.4, 3.6, 3.7, 3.6, 4.2],
            size=8.5, title="Deriva arquitectónica: diseño frente a implementación.",
        )
        self.p("**Deriva de nombres corregida.** El prototipo estaba en inglés y el código nuevo del MVP (agregado, reglas, "
               "orquestador) en español, así que los contratos mezclaban idiomas (`partidas` junto a `User`, "
               "`/api/partidas/actual` junto a `/api/game`). El 26/11/2026 se llevaron a inglés todos los identificadores, las "
               "colecciones (`matches`, `token_ledger`), la API (`/api/matches/current/commands/{draw,discard,close}`), las salas "
               "de Socket.IO y los valores de enumeración, con una migración idempotente de los datos; los textos de la interfaz "
               "quedaron en español. Las 28 fitness functions, las 106 pruebas del backend y las 20 del tablero pasaron sin "
               "cambios de reglas: funcionaron como red de seguridad del refactor.")
        self.p("**Intersecciones (cap. 26).** *Con la implementación*: las *fitness functions* convirtieron las restricciones de "
               "los ADR en reglas ejecutables; una de ellas (FF-02) quedó atada a un detalle del *cómo* y pasó en vacío hasta que "
               "se corrigió. *Con las prácticas de ingeniería*: el modo trinquete permitió refactorizar el prototipo sin detener "
               "el desarrollo. *Con la infraestructura*: la decisión de usar transacciones obligó a correr MongoDB como *replica "
               "set* incluso en local, y el despliegue con WebSockets persistentes descartó plataformas *serverless* (R06).")

        self.h2("5.2 Evaluación de ADRs frente a la Experiencia Práctica")
        self.table(
            ["ADR", "Decisión", "¿Guió la codificación?", "Evidencia práctica"],
            [
                ["ADR-01 (E1)", "Particionar por dominio dentro de un monolito modular", "En parte: la meta se mantuvo y la forma cambió", "Enmendado por ADR-06; FF-03 sin ciclos"],
                ["ADR-02 (E1)", "Reglas de victoria como plug-ins con *Strategy*", "Sí: es el origen del contrato `GameRulePlugin`", "Suite de contrato común para los dos plug-ins; enmendado por ADR-03"],
                ["ADR-03 (E2)", "Microkernel con registro de plug-ins", "Sí, con registro estático", "`RuleRegistry` valida semver, forma y prueba de humo; FF-02"],
                ["ADR-04 (E2)", "MongoDB con la partida como agregado y JSON Schema", "Sí", "Una escritura condicional por comando; e2e 8/8; FF-06 con 15 pruebas"],
                ["ADR-05 (E2)", "Comando síncrono en memoria + eventos locales después del *commit*", "Sí", "`match-notifications.spec.ts`; 409 controlados en vez de estados corruptos"],
                ["ADR-06 (E3)", "Capas transversales con registros de persistencia propios", "Registra la deriva de ADR-01", "Evitó reabrir la discusión del particionamiento"],
            ],
            [2.2, 5.0, 3.9, 5.4],
            size=9, title="Los ADR frente al código final.",
        )
        self.p("**Segunda Ley: «el porqué es más importante que el cómo».** Los ADR del Entregable 2 documentaron el porqué con "
               "matrices de alternativas ponderadas (p. ej. microkernel 4,75 frente a capas 3,05; MongoDB 4,55 frente a "
               "PostgreSQL 3,30). **Eso evitó el antipatrón *Groundhog Day*:** durante el MVP no se volvió a discutir la base de "
               "datos, el estilo ni la comunicación; las discusiones fueron sobre el *cómo* (cargar plug-ins, organizar carpetas, "
               "nombrar) y se resolvieron contra el porqué escrito. Gracias a eso el *cómo* cambió en cuatro ADR sin perder la "
               "intención, y el único cambio de forma relevante quedó registrado en ADR-06. La lección: una *fitness function* "
               "debe verificar el porqué (el núcleo no depende de las variantes), no un detalle del cómo (el nombre de una carpeta).")
        self.table(
            ["Riesgo del *risk storming* (E2)", "Pts", "Mitigación en el MVP", "Verificación", "Estado"],
            [
                ["R04 Fuga de cartas por WSS", "9", "Salas pública y privada, vistas filtradas", "`match-notifications.spec.ts`", "✅"],
                ["R03 Cierre concurrente", "6", "Escritura condicional + `commandId` + 409", "e2e 8/8", "✅"],
                ["R02 Marcador inconsistente", "6", "Liquidación en memoria y una sola escritura", "e2e + casos borde", "✅"],
                ["R01 Falla combinatoria", "6", "Evaluador algorítmico", "Oráculo 260/299 + FF-04", "✅"],
                ["R05 Contrato inestable", "6", "Contrato semver + registro *fail fast*", "FF-02 + suite de contrato", "✅"],
                ["R11 Ciclo de 8 módulos", "6", "Refactor a capas (ADR-06)", "FF-03 estricto", "✅"],
                ["R06 Sin WebSockets persistentes", "6", "Render Web Services + Nginx", "Job `containers` + producción", "✅"],
                ["R07 Desincronización al refrescar", "4", "`GET /api/matches/current` + versión", "Vitest", "✅"],
                ["R13 Documento de 16 MB", "2", "Mazo y comandos acotados", "FF-06", "✅"],
                ["R09 Latencia por comando", "4", "1 lectura + 1 escritura por comando", "Sin prueba de carga", "⚠️"],
                ["R08 Abandono / temporizadores", "4", "Solo en la sala de espera", "—", "❌"],
                ["R12 Contraseñas SHA-256 sin sal", "6", "**No mitigado en el código** (`user-password.ts`)", "FF-06 solo sobre el esquema", "❌"],
                ["R10 Fraude en recargas", "6", "Recargas fuera del MVP", "—", "➖"],
            ],
            [4.3, 0.9, 5.1, 4.6, 1.6],
            size=9, title="Riesgos del Entregable 2 frente al MVP.",
        )

        self.h2("5.3 Conclusiones y Leyes de la Arquitectura de Software")
        self.h3("Primera Ley: «Todo en arquitectura de software es un trade-off»")
        self.table(
            ["Decisión", "Qué se ganó (medido)", "Qué se pagó"],
            [
                ["Microkernel dentro del monolito modular (vs. monolito plano)", "Contrato con D = 0,09; plug-ins con Ca = 1; reglas probadas sin framework", "Más piezas (contrato versionado, registro, raíz de composición) e indirección"],
                ["Transacciones ACID (vs. consistencia eventual)", "Sin liquidaciones parciales (R02) ni dobles pagos (R03): e2e 8/8", "*Replica set* obligatorio y más latencia; se limitan al inicio y al fin de la partida. A escala se invierte (*outbox*)"],
                ["Salas pública + privada (vs. *broadcast*)", "Ninguna carta ajena llega al cliente (R04)", "Más mensajes por comando y más carga en el bus al escalar"],
                ["Comandos por REST + notificaciones por WebSocket", "409 explícito, idempotencia y pruebas e2e simples", "Dos canales y una petición HTTP por acción"],
                ["Notificar sin *outbox*", "Simplicidad: el estado se recupera por versión", "Un evento puede perderse si el proceso cae tras el *commit*"],
                ["Señalización de grupos en el cliente", "Menos cierres fallidos sin tocar el núcleo", "La forma de un grupo se calcula dos veces (cliente y servidor); el servidor manda"],
            ],
            [4.6, 5.9, 6.0],
            size=9, title="Trade-offs asumidos en el MVP.",
        )
        self.h3("Segunda Ley: «El porqué es más importante que el cómo»")
        self.p("Como se mostró en 5.2, los ADR con alternativas ponderadas guiaron la codificación sin discusiones circulares, y "
               "las desviaciones se registraron como enmiendas (ADR-06) en vez de reescribir la historia.")
        self.h3("Tercera Ley: «Las decisiones se ubican en un espectro entre extremos»")
        self.table(
            ["Espectro", "Extremo A", "Posición del MVP", "Extremo B"],
            [
                ["Estilo", "Monolito simple", "**Monolito modular con microkernel, un solo *quantum*** (listo para extraer el juego en tiempo real)", "Microservicios"],
                ["Consistencia", "ACID global", "**ACID en el agregado y entre agregados solo al iniciar y terminar; eventual en las notificaciones**", "Eventual en todo"],
                ["Comunicación", "Todo síncrono", "**Comando síncrono en memoria + eventos locales después del *commit***", "Todo asíncrono con *broker*"],
                ["Extensibilidad", "Reglas en el núcleo", "**Plug-ins con contrato versionado y registro estático validado**", "Carga dinámica en caliente"],
            ],
            [2.4, 2.9, 8.4, 2.8],
            size=9, title="Ubicación de la solución en el espectro de decisiones.",
        )
        self.h3("Lecciones aprendidas")
        self.bullets([
            "**Las fitness functions deben probarse sobre el código real:** FF-02 pasó en vacío tras el refactor hasta que una mutación lo reveló.",
            "**Medir cambia las conversaciones:** la CC 13 de `leaveOrCancel` se detectó al publicar la métrica y se bajó con pruebas en la misma fase.",
            "**El agregado documental simplificó la concurrencia:** dos cierres simultáneos se resolvieron con una sola escritura condicional.",
            "**Los usuarios encontraron lo que las pruebas no buscaban:** los incidentes graves estaban en la sala de espera, fuera del núcleo más probado.",
            "**Los nombres también son contrato:** mezclar idiomas en colecciones, rutas y eventos se volvió deuda; corregirla fue seguro gracias a la suite de gobernanza.",
            "**Lo pendiente también es arquitectura:** R12 (contraseñas) y R08 (abandono) son riesgos de seguridad y disponibilidad, no detalles.",
        ])
        self.h3("Trabajo futuro: torneo de 100.000 jugadores concurrentes (análisis de *quanta*)")
        self.p("Hoy el sistema es **un solo *quantum* arquitectónico**: un despliegue y una base de datos compartida. Con 100.000 "
               "jugadores (≈ 25.000 mesas de 4; ≈ 4.500 comandos/s en promedio y ≈ 14.000 en pico, con el turno de 11,2 s medido "
               "en la sección 3) se propone separarlo en **tres *quanta*** con características distintas: (1) **juego en tiempo "
               "real** (API, WebSocket y `matches`), que necesita baja latencia y elasticidad; (2) **economía e identidad** "
               "(usuarios y libro de tokens), que necesita consistencia y auditoría; y (3) **catálogo** (diseños de carta), casi "
               "estático. Los comandos siguen siendo síncronos; los efectos secundarios pasan a una arquitectura **orientada a "
               "eventos** (Redis Streams y *outbox*).")
        self.figure(os.path.join(DIAGRAMS, "04-escalabilidad-100k.png"), TEXT_WIDTH_CM,
                    "Arquitectura objetivo de escalamiento horizontal (`04-escalabilidad-100k.puml`).", max_width_px=2600)
        self.table(
            ["Cambio", "Diseño propuesto"],
            [
                ["Tiempo real multinodo", "Socket.IO con `@socket.io/redis-streams-adapter`; transporte solo WebSocket y JWT en `auth` (evita *sticky sessions*). `GameSocket` no cambia"],
                ["Sharding de MongoDB", "`matches` por `{_id: hashed}` (una partida por `gameId`; la escritura condicional ya filtra por `_id` → un solo *shard*); `games` y `players` por `gameId`; `users` por `userId`; `token_ledger` por `userId`"],
                ["Sesiones efímeras", "`matches` solo con partidas en curso (≈ 250 MB en memoria); al terminar, un *worker* archiva una versión compacta"],
                ["Pago del pozo", "De transacción distribuida a *outbox*: el cierre escribe un solo documento y un *worker* paga con la referencia única `POT_PRIZE:{matchId}` (idempotente)"],
                ["Caché Redis", "Juego actual por usuario (hoy `GameGuard` consulta la base en cada comando), perfiles, catálogo de diseños y *rate limiting*"],
                ["Topología", "CDN, balanceador L7 multi-AZ con WebSocket y Kubernetes en 3 zonas con HPA por conexiones (`apuntado-ws`) y por CPU y p95 (`apuntado-api`)"],
                ["Antes de escalar", "Reemplazar el sondeo de 2 s, temporizadores de turno (R08), argon2id (R12) y prueba de carga con k6 (p95 ≤ 300 ms a 14.000 comandos/s)"],
            ],
            [3.6, 12.9],
            size=9, title="Cambios para 100.000 jugadores concurrentes. El dominio, el contrato y los plug-ins no cambian.",
        )
        self.h3("Conclusión")
        self.p("El MVP materializa el diseño de los Entregables 1 y 2: las dos modalidades corren sobre el mismo núcleo, las "
               "reglas viven en plug-ins aislados y la concurrencia del cierre está garantizada por el agregado documental. La "
               "validación con usuarios (SUS 86,5) y las *fitness functions* en CI/CD muestran que la arquitectura sostiene el "
               "comportamiento esperado, y la retrospectiva deja explícitos los compromisos asumidos y los riesgos que siguen "
               "abiertos.")

    def references(self):
        heading = self.doc.add_paragraph(style="Heading 2")
        heading.paragraph_format.space_before = Pt(14)
        heading.add_run("Referencias")
        for reference in (
            "Richards, M., & Ford, N. (2025). *Fundamentals of Software Architecture: A Modern Engineering Approach* (2nd ed.). O'Reilly Media. Caps. 3, 6, 21, 22, 23, 24, 26 y 27.",
            "ISO/IEC 25010:2023. *Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE)*.",
            "Brooke, J. (1996). SUS: A quick and dirty usability scale. *Usability Evaluation in Industry*.",
            "Bangor, A., Kortum, P., & Miller, J. (2008). An empirical evaluation of the System Usability Scale. *IJHCI*, 24(6).",
            "Sauro, J., & Lewis, J. R. (2016). *Quantifying the User Experience* (2nd ed.). Morgan Kaufmann.",
            "Martin, R. C. (1994). *OO Design Quality Metrics: An Analysis of Dependencies*.",
        ):
            paragraph = self.doc.add_paragraph()
            paragraph.paragraph_format.left_indent = Cm(0.8)
            paragraph.paragraph_format.first_line_indent = Cm(-0.8)
            paragraph.paragraph_format.space_after = Pt(3)
            paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
            self.rich(paragraph, reference, size=10)

    def pending_page(self):
        heading = self.doc.add_paragraph(style="Heading 2")
        heading.paragraph_format.page_break_before = True
        heading.add_run("Pendientes antes de entregar (BORRAR ESTA PÁGINA)")
        self.bullets([
            "Completar la tabla de integrantes (documentos y correos).",
            "Completar la tabla consolidada por usuario (3.3) con los registros de las sesiones.",
            "Documentar el cierre inválido deliberado y la partida de Apuntado hasta 101, o hacer una sesión complementaria (3.1).",
            "Revalidar el Ajuste 3 con al menos 2 participantes (3.4).",
            "Agregar a `docs/evidencias/` las encuestas SUS, 2 o 3 capturas de partidas en curso y el enlace a los videos (3.2).",
            "Reemplazar el extracto de logs por una copia literal de Render, si la tienen (3.2).",
            "Subir `main` a GitHub, ejecutar la migración de contratos contra Atlas y pegar la captura del job `architecture` (4.1 y 2.3, ítem 3.16).",
            "Decidir cómo reportar cohesión y ley de Deméter (4.2).",
            "Confirmar el acceso al repositorio (2.2).",
            "Actualizar el índice (clic derecho → «Actualizar campo»), revisar que el PDF no pase de 30 páginas y exportarlo.",
            "Buscar la palabra «PENDIENTE» para no dejar ningún resaltado amarillo.",
        ], numbered=True, size=10.5)

    def build(self):
        self.configure_styles()
        self.header_block()
        self.section_1()
        self.section_2()
        self.section_3()
        self.section_4()
        self.section_5()
        self.references()
        self.pending_page()
        return self.doc


TOC_ENTRIES = []


def collect_headings():
    """First pass: the builder records every numbered heading, in order."""
    builder = ReportBuilder()
    builder.build()
    return builder.headings


def normalize(text):
    return re.sub(r"\s+", " ", text).strip()


def find_pages(docx_path, headings):
    """Renders the .docx with LibreOffice and finds the page of each heading (None if unavailable)."""
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice or not shutil.which("pdftotext"):
        return None
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([soffice, "--headless", "--convert-to", "pdf", "--outdir", tmp, docx_path],
                       check=True, capture_output=True, timeout=300)
        pdf = os.path.join(tmp, os.path.splitext(os.path.basename(docx_path))[0] + ".pdf")
        text = subprocess.run(["pdftotext", "-layout", pdf, "-"], check=True, capture_output=True).stdout.decode("utf8")
    pages = [normalize(page) for page in text.split("\f")]
    first_lines = [normalize(page.strip().split("\n")[0]) if page.strip() else "" for page in text.split("\f")]
    result, start = {}, None
    for index, line in enumerate(first_lines):  # section 1 starts on a new page, after the index
        if line.startswith(normalize(headings[0][1])[:40]):
            start = index
            break
    if start is None:
        return None
    current = start
    for _, heading in headings:
        key = normalize(heading)[:45]
        for index in range(current, len(pages)):
            if key in pages[index]:
                result[heading] = index + 1
                current = index
                break
    return result


def main():
    TOC_ENTRIES.extend(collect_headings())
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    ReportBuilder().build().save(OUTPUT)
    pages = find_pages(OUTPUT, TOC_ENTRIES)
    if pages:
        ReportBuilder(pages).build().save(OUTPUT)
        print("Page numbers:", ", ".join(f"{h.split(' ')[0]} p{p}" for h, p in pages.items()))
    else:
        print("LibreOffice is not available: update the index in Word (right click -> Update field).")
    print("Report generated:", OUTPUT)


if __name__ == "__main__":
    main()
