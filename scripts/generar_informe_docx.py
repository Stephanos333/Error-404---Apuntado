"""
Genera el informe consolidado del Entregable 3 en Word (.docx) a partir de la plantilla de la guía.

Uso:  python scripts/generar_informe_docx.py
Salida: docs/entregable/Informe-Entregable-3-Error404.docx

ATENCIÓN: el .docx se edita a mano después de generarlo (datos del equipo, capturas del pipeline,
enlaces a videos...). Si vuelve a ejecutar este script, sobrescribe esos cambios.
Los textos resaltados en amarillo son pendientes que el equipo debe completar antes de entregar.
"""
import io
import os
import re

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_COLOR_INDEX
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
DIAG = os.path.join(RAIZ, "diagramas", "entregable-3")
EVID = os.path.join(RAIZ, "docs", "evidencias")
SALIDA = os.path.join(RAIZ, "docs", "entregable", "Informe-Entregable-3-Error404.docx")

REPO = "https://github.com/Stephanos333/Error-404---Apuntado"
APP = "https://error-404-apuntado.onrender.com"
API = "https://error-404-apuntado-backend.onrender.com/docs"

AZUL = RGBColor(0x1F, 0x3A, 0x5F)
FUENTE = "Arial"

doc = Document()
contador_figuras = [0]
contador_tablas = [0]


# ------------------------------------------------------------------------------------------
# Estilos y utilidades
# ------------------------------------------------------------------------------------------
def configurar_estilos():
    normal = doc.styles["Normal"]
    normal.font.name = FUENTE
    normal.font.size = Pt(10)
    normal.element.rPr.rFonts.set(qn("w:eastAsia"), FUENTE)
    normal.paragraph_format.space_after = Pt(4)
    normal.paragraph_format.line_spacing = 1.08
    for nombre, tam in (("Title", 18), ("Heading 1", 14), ("Heading 2", 12), ("Heading 3", 10.5)):
        estilo = doc.styles[nombre]
        estilo.font.name = FUENTE
        estilo.font.size = Pt(tam)
        estilo.font.bold = True
        estilo.font.color.rgb = AZUL if nombre != "Title" else RGBColor(0, 0, 0)
        estilo.element.rPr.rFonts.set(qn("w:eastAsia"), FUENTE)
        estilo.paragraph_format.space_before = Pt(10 if nombre == "Heading 1" else 7)
        estilo.paragraph_format.space_after = Pt(4)
        estilo.paragraph_format.keep_with_next = True
    for nombre in ("List Bullet", "List Number"):
        doc.styles[nombre].font.name = FUENTE
        doc.styles[nombre].font.size = Pt(10)

    seccion = doc.sections[0]
    seccion.page_width, seccion.page_height = Cm(21.59), Cm(27.94)
    for lado in ("left_margin", "right_margin"):
        setattr(seccion, lado, Cm(2.2))
    seccion.top_margin, seccion.bottom_margin = Cm(2.0), Cm(1.8)
    configurar_encabezado_y_pie(seccion)

    # El índice (campo TOC) se actualiza en Word: clic derecho → «Actualizar campo».


def campo(parrafo, instruccion, texto_provisional=""):
    """Inserta un campo de Word (PAGE, TOC, ...)."""
    for tipo, contenido in (("begin", None), ("instr", instruccion), ("separate", None), ("texto", texto_provisional), ("end", None)):
        run = parrafo.add_run()
        if tipo == "instr":
            instr = OxmlElement("w:instrText")
            instr.set(qn("xml:space"), "preserve")
            instr.text = contenido
            run._r.append(instr)
        elif tipo == "texto":
            run.text = contenido
        else:
            fld = OxmlElement("w:fldChar")
            fld.set(qn("w:fldCharType"), tipo)
            run._r.append(fld)


def configurar_encabezado_y_pie(seccion):
    encabezado = seccion.header.paragraphs[0]
    encabezado.text = ""
    run = encabezado.add_run("Entregable 3 · Fundamentos de Arquitectura de Software · Equipo Error 404 · Sistema Apuntado")
    run.font.size, run.font.color.rgb = Pt(8), RGBColor(0x66, 0x66, 0x66)
    pie = seccion.footer.paragraphs[0]
    pie.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = pie.add_run("Página ")
    r.font.size = Pt(8)
    campo(pie, "PAGE", "1")


MARCADO = re.compile(r"(\*\*.+?\*\*|`[^`]+`|\[\[.+?\]\]|\*[^*\s][^*]*\*)")


def agregar_texto(parrafo, texto, tam=None, color=None):
    """Texto con marcado mínimo: **negrita**, *cursiva*, `código` y [[pendiente resaltado]]."""
    for trozo in MARCADO.split(texto):
        if not trozo:
            continue
        if trozo.startswith("**") and trozo.endswith("**"):
            run = parrafo.add_run(trozo[2:-2])
            run.bold = True
        elif trozo.startswith("[[") and trozo.endswith("]]"):
            run = parrafo.add_run("PENDIENTE: " + trozo[2:-2])
            run.bold = True
            run.font.highlight_color = WD_COLOR_INDEX.YELLOW
        elif trozo.startswith("`") and trozo.endswith("`"):
            run = parrafo.add_run(trozo[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt((tam or 10) - 1)
        elif trozo.startswith("*") and trozo.endswith("*"):
            run = parrafo.add_run(trozo[1:-1])
            run.italic = True
        else:
            run = parrafo.add_run(trozo)
        if tam and not (trozo.startswith("`") and trozo.endswith("`")):
            run.font.size = Pt(tam)
        if color is not None:
            run.font.color.rgb = color
    return parrafo


def p(texto, alinear=WD_ALIGN_PARAGRAPH.JUSTIFY, tam=None, espacio=4):
    parrafo = doc.add_paragraph()
    parrafo.alignment = alinear
    parrafo.paragraph_format.space_after = Pt(espacio)
    return agregar_texto(parrafo, texto, tam)


def vinetas(items, numeradas=False):
    for item in items:
        parrafo = doc.add_paragraph(style="List Number" if numeradas else "List Bullet")
        parrafo.paragraph_format.space_after = Pt(2)
        agregar_texto(parrafo, item)


def h1(texto):
    doc.add_heading(texto, level=1)


def h2(texto):
    doc.add_heading(texto, level=2)


def h3(texto):
    doc.add_heading(texto, level=3)


def sombrear(celda, color):
    tc_pr = celda._tc.get_or_add_tcPr()
    sombra = OxmlElement("w:shd")
    sombra.set(qn("w:val"), "clear")
    sombra.set(qn("w:color"), "auto")
    sombra.set(qn("w:fill"), color)
    tc_pr.append(sombra)


def repetir_encabezado(fila):
    tr_pr = fila._tr.get_or_add_trPr()
    marca = OxmlElement("w:tblHeader")
    marca.set(qn("w:val"), "true")
    tr_pr.append(marca)


def tabla(encabezados, filas, anchos=None, tam=8.5, titulo=None):
    if titulo:
        contador_tablas[0] += 1
        leyenda = doc.add_paragraph()
        leyenda.paragraph_format.keep_with_next = True
        leyenda.paragraph_format.space_after = Pt(2)
        agregar_texto(leyenda, f"**Tabla {contador_tablas[0]}.** {titulo}", tam=8.5)
    t = doc.add_table(rows=1, cols=len(encabezados))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, texto in enumerate(encabezados):
        celda = t.rows[0].cells[i]
        celda.paragraphs[0].text = ""
        agregar_texto(celda.paragraphs[0], f"**{texto}**", tam=tam)
        sombrear(celda, "D9E2F3")
    repetir_encabezado(t.rows[0])
    for fila in filas:
        celdas = t.add_row().cells
        for i, texto in enumerate(fila):
            celdas[i].paragraphs[0].text = ""
            agregar_texto(celdas[i].paragraphs[0], str(texto), tam=tam)
    for fila in t.rows:
        for celda in fila.cells:
            for parrafo in celda.paragraphs:
                parrafo.paragraph_format.space_after = Pt(0)
    if anchos:
        for fila in t.rows:
            for i, ancho in enumerate(anchos):
                fila.cells[i].width = Cm(ancho)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t


def imagen(ruta):
    """Devuelve la imagen lista para Word. Los JPEG sin segmento JFIF/EXIF (p. ej. capturas
    exportadas por algunos navegadores) reciben un APP0 JFIF mínimo para que python-docx los lea."""
    datos = open(ruta, "rb").read()
    if datos[:2] == b"\xff\xd8" and datos[2:4] not in (b"\xff\xe0", b"\xff\xe1"):
        app0 = b"\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        datos = datos[:2] + app0 + datos[2:]
    return io.BytesIO(datos)


def figura(ruta, ancho_cm, leyenda):
    contador_figuras[0] += 1
    parrafo = doc.add_paragraph()
    parrafo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    parrafo.paragraph_format.keep_with_next = True
    if os.path.exists(ruta):
        parrafo.add_run().add_picture(imagen(ruta), width=Cm(ancho_cm))
    else:
        agregar_texto(parrafo, f"[[falta la imagen {os.path.basename(ruta)}]]")
    texto = doc.add_paragraph()
    texto.alignment = WD_ALIGN_PARAGRAPH.CENTER
    agregar_texto(texto, f"**Figura {contador_figuras[0]}.** {leyenda}", tam=8.5)


def marcador_figura(descripcion):
    """Recuadro para una captura que el equipo debe pegar."""
    contador_figuras[0] += 1
    t = doc.add_table(rows=1, cols=1)
    t.style = "Table Grid"
    celda = t.rows[0].cells[0]
    sombrear(celda, "FFF2CC")
    celda.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    agregar_texto(celda.paragraphs[0], f"[[pegar aquí: {descripcion}]]", tam=9)
    for _ in range(3):
        celda.add_paragraph()
    texto = doc.add_paragraph()
    texto.alignment = WD_ALIGN_PARAGRAPH.CENTER
    agregar_texto(texto, f"**Figura {contador_figuras[0]}.** {descripcion}", tam=8.5)


def codigo(lineas, tam=7):
    t = doc.add_table(rows=1, cols=1)
    t.style = "Table Grid"
    celda = t.rows[0].cells[0]
    sombrear(celda, "F2F2F2")
    celda.paragraphs[0].text = ""
    for i, linea in enumerate(lineas):
        parrafo = celda.paragraphs[0] if i == 0 else celda.add_paragraph()
        parrafo.paragraph_format.space_after = Pt(0)
        run = parrafo.add_run(linea)
        run.font.name, run.font.size = "Consolas", Pt(tam)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def salto():
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def nueva_seccion(horizontal):
    seccion = doc.add_section()
    seccion.orientation = WD_ORIENT.LANDSCAPE if horizontal else WD_ORIENT.PORTRAIT
    ancho, alto = (Cm(27.94), Cm(21.59)) if horizontal else (Cm(21.59), Cm(27.94))
    seccion.page_width, seccion.page_height = ancho, alto
    margen = Cm(1.5) if horizontal else Cm(2.2)
    seccion.left_margin = seccion.right_margin = margen
    seccion.top_margin, seccion.bottom_margin = Cm(1.6), Cm(1.6)
    return seccion


# ------------------------------------------------------------------------------------------
# Portada (estructura de la plantilla de la guía)
# ------------------------------------------------------------------------------------------
def portada():
    titulo = doc.add_paragraph(style="Title")
    titulo.add_run("Entregable 3. Informe Técnico: Producto Mínimo Viable, Validación Empírica, CI/CD y Retrospectiva Arquitectónica")
    for etiqueta, valor in (
        ("Asignatura", "Fundamentos de Arquitectura de Software"),
        ("Caso de Estudio", "Sistema Digital de Juego de Cartas (Variante Clásica & Variante Apuntado a 101)"),
        ("Marco Teórico Base", "*Fundamentals of Software Architecture: A Modern Engineering Approach* (2.ª edición, 2025) – Mark Richards & Neal Ford."),
        ("Nombre del sistema", "Apuntado Digital (Equipo Error 404)"),
        ("Repositorio Git", REPO + " (rama `feature/entregable-3-mvp`; PR hacia `main`)"),
        ("Despliegue en la nube", f"{APP} · API y Swagger: {API}"),
        ("Fecha", "[[fecha de entrega]]"),
    ):
        parrafo = doc.add_paragraph()
        parrafo.paragraph_format.space_after = Pt(1)
        agregar_texto(parrafo, f"**{etiqueta}:** {valor}")

    doc.add_paragraph()
    agregar_texto(doc.add_paragraph(), "**Integrantes del Equipo:**")
    tabla(
        ["Nombre Completo", "Doc. Identificación", "Correo Electrónico"],
        [
            ["Santiago Alvarez Muñoz", "[[documento]]", "[[correo institucional]]"],
            ["Sergio Esteban Romero Macariz", "[[documento]]", "seromeros@unal.edu.co"],
            ["Andres Felipe Lemus Victoria", "[[documento]]", "[[correo institucional]]"],
            ["Omar Zambrano", "[[documento]]", "[[correo institucional]]"],
        ],
        anchos=[6, 4.2, 6.5],
        tam=9.5,
    )

    h2("Índice")
    indice = doc.add_paragraph()
    campo(indice, 'TOC \\o "1-2" \\h \\z \\u', "Haga clic derecho aquí y elija «Actualizar campo» para generar el índice.")

    h2("Introducción")
    p("Este informe consolida el tercer y último entregable del proyecto: el **Producto Mínimo Viable (MVP)** del "
      "Sistema Apuntado, desplegado en la nube, validado con cinco usuarios reales y gobernado por un pipeline de "
      "integración continua que ejecuta *fitness functions* arquitectónicas en cada cambio. El documento sigue la "
      "estructura obligatoria de la guía: modelado UML de la solución construida (cap. 1), el MVP y las prácticas de "
      "ingeniería (cap. 2), la validación empírica (cap. 3), la gobernanza y las métricas de calidad (cap. 4) y la "
      "retrospectiva arquitectónica a la luz de las leyes de Richards & Ford (cap. 5).")
    p("Cada afirmación remite a un artefacto verificable del repositorio (código, pruebas, métricas o documentos en "
      "`docs/`). Las versiones extensas de cada capítulo están en `docs/capitulo-1-modelado-uml.md`, "
      "`docs/capitulo-3-validacion-usuarios.md`, `docs/capitulo-4-cicd-metricas.md`, "
      "`docs/capitulo-5-retrospectiva-lecciones.md` y `docs/checklists-ingenieria.md`.")


# ------------------------------------------------------------------------------------------
# Capítulo 1
# ------------------------------------------------------------------------------------------
def capitulo_1():
    salto()
    h1("1. Arquitectura Física y Dinámica de la Solución (Modelado UML)")
    p("Los tres diagramas se dibujaron en UML 2.5 con PlantUML **a partir del código y de la configuración de la rama "
      "final**, no del diseño previo. Las fuentes `.puml` y las exportaciones PNG/SVG están en "
      "`diagramas/entregable-3/`; las versiones SVG permiten ampliar sin pérdida (Richards & Ford, 2025, cap. 23: "
      "título, clave de notación y nombres tomados del código).")

    h2("1.1 Diagrama UML de Despliegue (Nodos, Contenedores y Protocolos)")
    figura(os.path.join(DIAG, "01-despliegue-mvp.png"), 16.8, "Diagrama de despliegue del MVP (`01-despliegue-mvp.puml`).")
    tabla(
        ["Nodo / entorno", "Artefactos desplegados", "Comunicación"],
        [
            ["**«device» Dispositivo del Jugador** › navegador web", "SPA React 18 (build Vite 5: `index.html`, `assets/*.js/css`), `socket.io-client` 4.7", "HTTP(S) REST `/api/*` con JWT; WebSocket (Socket.IO, namespace `/game`)"],
            ["**«executionEnvironment» Servidor Web y API** › contenedor `frontend` (`nginx:1.27-alpine`, :80 → host :5173)", "Estáticos de la SPA y `nginx.conf` (proxy inverso)", "`proxy_pass http://backend:3000` para `/api/`, `/docs` y `/socket.io/` con `Upgrade: websocket` (timeout 3600 s)"],
            ["› contenedor `backend` (`node:20.18-alpine`, usuario sin privilegios, :3000)", "`dist/src/main.js` (NestJS 10), `dist/plugins/clasica`, `dist/plugins/apuntado`", "Driver MongoDB por TCP :27017; transacciones `snapshot` / `majority`"],
            ["› contenedor `mongo-init` (tarea única)", "Validadores `$jsonSchema`, índices y semilla de diseños", "`mongosh` sobre TCP :27017 (idempotente)"],
            ["**«device» Servidor de Base de Datos** › contenedor `mongo:7.0 --replSet rs0`", "Base `apuntado` (partidas, asientos_tokens, User, Game, Player, Card-design) en el volumen `mongo-data`", "En la nube: MongoDB Atlas con TLS (`mongodb+srv://`)"],
        ],
        anchos=[5.3, 5.7, 5.8],
        titulo="Nodos, artefactos y protocolos del despliegue.",
    )
    p("**Decisiones visibles en el diagrama.** (1) *Mismo origen*: Nginx sirve la SPA y reenvía la API y el socket, "
      "lo que evita CORS y requiere un solo certificado. (2) *Replica set obligatorio*: el cobro de apuestas y el pago "
      "del pozo usan transacciones multidocumento (ADR-04). (3) *Arranque por salud*: MongoDB PRIMARY → `mongo-init` "
      "con código 0 → backend sano → frontend. (4) *Salas pública y privada*: `GameSocket` une cada conexión a "
      "`partida:{gameId}` (vista pública) y `usuario:{userId}` (solo su mano), lo que mitiga la fuga de cartas (R04). "
      "En producción, el frontend y el backend corren en Render (HTTPS/WSS terminados por el proveedor) y la base en "
      "MongoDB Atlas.")

    salto()
    h2("1.2 Diagrama UML de Secuencia (Flujo Crítico de Cierre y Liquidación)")
    figura(os.path.join(DIAG, "02-secuencia-cierre-liquidacion.png"), 15.2,
           "Secuencia del intento de cierre de ronda y la liquidación (`02-secuencia-cierre-liquidacion.puml`).")
    tabla(
        ["Participante pedido por la guía", "Implementación real (línea de vida)"],
        [
            ["Jugador (UI)", "SPA React → `PartidaController` (`POST /api/partidas/actual/comandos/cerrar`)"],
            ["GameOrchestrator", "`TurnOrchestrator` (ruta del comando: idempotencia, versión, escritura, publicación)"],
            ["HandEvaluator (plug-in de regla)", "`ReglaJuegoPlugin` (`ReglaClasicaPlugin` / `ReglaApuntadoPlugin`) con `EvaluadorManos`"],
            ["ScoringService", "Funciones puras de `comandos-partida.ts`: `cerrarRonda`, `liquidarRonda`, `concluirRonda`, `finalizar`"],
            ["Repository / DB", "`PartidaRepository` (escritura condicional), `UnidadDeTrabajo` (transacción), `AsientosTokensRepository`, MongoDB rs0"],
            ["Notificación", "`EventBus` → `GameSocket` → salas `partida:{gameId}` y `usuario:{userId}` (solo después del *commit*)"],
        ],
        anchos=[5.2, 11.6],
        titulo="Correspondencia entre los participantes de la guía y el código.",
    )
    p("**Fragmentos `alt`.** *Escenario 1, Clásica*: el plug-in acepta 1 cuarta + 2 ternas + 1 descarte sin sobrantes; "
      "`efectoCierre` termina la ronda, `evaluarDesenlace` declara ganador a quien cierra y la partida pasa a "
      "`FINALIZADA`. *Escenario 2, Apuntado*: (2.1) **tocar** con 3 ternas + 1 sobrante de menos de 5 puntos abre la "
      "**ronda extra** (cada rival juega un último turno); (2.2) el **cierre final** (4-3-3 con bonificación de −10, o el "
      "último descarte de la ronda extra) liquida con `puntosNoCombinados`, registra la `EntradaMarcador` y evalúa el "
      "desenlace: quien llega a **101 o más** queda eliminado y la partida termina si queda un solo jugador o alguien "
      "llega a −51; si no, se reparte la ronda siguiente en el mismo cálculo. *Cierre inválido*: castigo (+3 en "
      "Apuntado, 0 en Clásica) y el turno continúa.")
    p("**Persistencia y concurrencia.** Todo se calcula en memoria y se guarda en **una sola escritura condicional** "
      "(`version`, turno e `idComando`). Si la partida termina, la escritura y el pago del pozo van en una transacción. "
      "Si otro comando ganó la carrera, el filtro no coincide, `resolverConflicto` relee la partida y responde **409 "
      "`RONDA_YA_CERRADA`** (o `TURNO_NO_CORRESPONDE` / `VERSION_DESACTUALIZADA`); el cliente relee "
      "`GET /api/partidas/actual`. Este comportamiento está probado con 8 pruebas e2e sobre un *replica set* real.")

    nueva_seccion(horizontal=True)
    h2("1.3 Diagrama UML de Clases de Implementación Actualizado")
    figura(os.path.join(DIAG, "03-clases-implementacion-mvp.png"), 19.0,
           "Clases de implementación del MVP: microkernel con inversión de dependencias (`03-clases-implementacion-mvp.puml`; ver el SVG para ampliar).")
    nueva_seccion(horizontal=False)
    p("**Notación.** `+` público y `-` privado; en los módulos `«utility»` (funciones puras de TypeScript), `+` es una "
      "función exportada y `-` una interna. No aparece `#` porque ningún miembro del código es `protected`. Los tipos "
      "unión de literales se modelan como `«enumeration»` y los tipos son los de TypeScript (`ReadonlyArray<Carta>`, "
      "`Promise<ResultadoComando>`, `RondaPartida | null`).")
    tabla(
        ["Concepto", "Elemento real", "Ubicación"],
        [
            ["Partida, Ronda, Mano, Carta, Turno, Marcador", "`Partida` (raíz, con `version` y `comandosRecientes`), `RondaPartida` (+ `RondaExtra`), `ManoJugador`, `CartaPartida`, `TurnoPartida`, `EntradaMarcador` + `PuntosRonda`", "`backend/src/dominio/partida/partida.ts`"],
            ["Contrato de reglas", "`ReglaJuegoPlugin` v1.0.0: `configuracionReparto`, `cierresPermitidos`, `validarCierre`, `efectoCierre`, `liquidarRonda`, `evaluarDesenlace`", "`backend/src/reglas/contrato/`"],
            ["Plug-ins", "`ReglaClasicaPlugin` (`clasica`) y `ReglaApuntadoPlugin` (`apuntado`) + `ParametrosApuntado` (101, −51, 5, 10, 3)", "`backend/plugins/{clasica,apuntado}/`"],
            ["Evaluación combinatoria", "`EvaluadorManos` (`IHandEvaluator`): `esCombinacion`, `esTerna`, `esCuarta`, `esCuartaYDosTernas`, `sonTresTernas`, `puntosNoCombinados`; `PoliticaEscalera` = `CON_VUELTA` / `SIN_VUELTA`", "`backend/src/reglas/evaluador/`"],
            ["Núcleo", "`TurnOrchestrator`, `RegistroReglas` (valida semver, forma y prueba de humo), `ReglasPluginsModule` (única raíz de composición)", "`backend/src/aplicacion/partida/`, `reglas/registro/`"],
        ],
        anchos=[3.8, 8.8, 4.2],
        titulo="Correspondencia entre el modelo y el código fuente.",
    )
    p("**Patrón de desacoplamiento.** *Microkernel* con *Strategy* e inversión de dependencias: el núcleo "
      "(`TurnOrchestrator` y `comandos-partida`) solo conoce `ReglaJuegoPlugin` y `RegistroReglas`; los plug-ins dependen "
      "del contrato y del evaluador; solo `ReglasPluginsModule` instancia los plug-ins concretos. La política de escalera "
      "es una *Strategy* inyectada por constructor. FF-02 y FF-05 verifican estas reglas en cada PR (cap. 4).")


# ------------------------------------------------------------------------------------------
# Capítulo 2
# ------------------------------------------------------------------------------------------
def capitulo_2():
    salto()
    h1("2. Producto Mínimo Viable (MVP) y Prácticas de Ingeniería")
    h2("2.1 Ficha Técnica y Alcance Operativo del MVP")
    tabla(
        ["Aspecto", "Detalle"],
        [
            ["Nombre del sistema", "Apuntado Digital (Equipo Error 404)"],
            ["Estilo arquitectónico", "Monolito modular por capas (ADR-01) con núcleo *microkernel* y plug-ins de reglas (ADR-02, ADR-03); un solo *quantum* de despliegue"],
            ["Backend", "Node.js 20, NestJS 10, TypeScript 5.4, Socket.IO 4 (namespace `/game`), Swagger en `/docs`"],
            ["Frontend", "React 18, Vite 5, Material UI 5, socket.io-client 4; servido por Nginx 1.27"],
            ["Base de datos", "MongoDB 7 como *replica set* (Atlas en la nube): agregado `partidas`, libro `asientos_tokens` *append-only* y validadores `$jsonSchema` (ADR-04)"],
            ["Modalidad Clásica (4-3-3)", "Una ronda; único cierre: 1 cuarta + 2 ternas + 1 descarte, sin sobrantes; quien cierra gana el pozo"],
            ["Modalidad Apuntado a 101", "Varias rondas. Cierre 4-3-3 (−10 al que cierra) o **tocar** con 3 ternas + 1 sobrante < 5 pts (abre ronda extra). Penalizaciones acumuladas; eliminación con ≥ 101; victoria si queda un jugador o alguien llega a ≤ −51; castigo de +3 por cierre inválido"],
            ["Validación de jugadas", "Algorítmica (grupos de valor y escaleras con política `CON_VUELTA`); oráculo de regresión de 260 ternas y 299 cuartas"],
            ["Mecanismo de concurrencia", "Partida multijugador web en tiempo real (2 a 6 jugadores). El servidor es la única autoridad: comandos REST con concurrencia optimista (`version`), idempotencia (`idComando`) y escritura atómica condicional; transacciones `snapshot`/`majority` para apuestas y pozo; notificaciones por salas pública y privada después del *commit* (ADR-05)"],
            ["Seguridad", "JWT de acceso y refresco, guardias por juego, barajado con `crypto.randomInt`, contenedores sin privilegios"],
            ["Pruebas", "106 unitarias y de contrato (Jest), 8 e2e de concurrencia con *replica set* en memoria, 16 Vitest del tablero, 28 *fitness functions* (FF-01 a FF-06)"],
        ],
        anchos=[4.0, 12.8],
        titulo="Ficha técnica del MVP.",
    )

    h2("2.2 Repositorio, Enlace de Despliegue y Manual de Ejecución")
    vinetas([
        f"**Repositorio:** {REPO} (rama `feature/entregable-3-mvp`, integrada a `main` mediante PR). [[confirmar que el repositorio sea público o que el docente tenga acceso]]",
        f"**Aplicación en vivo:** {APP} · **API y Swagger:** {API}. Render detiene los servicios inactivos: la primera carga puede tardar cerca de un minuto.",
        "**README.md:** ficha técnica, guía de inicio rápido (local y nube), flujo de humo con dos navegadores y limitaciones conocidas.",
    ])
    p("**Ejecución local con un solo comando** (requiere Docker con Compose v2 y los puertos 5173, 3000 y 27017 libres):")
    codigo([
        "git clone " + REPO + ".git && cd Error-404---Apuntado",
        "./start.sh        # Linux / macOS (genera .env con secretos JWT aleatorios y ejecuta docker compose up --build)",
        "start.bat         # Windows",
        "# Aplicación: http://localhost:5173 · API y Swagger: http://localhost:3000/docs · Estado: docker compose ps",
        "",
        "# Pruebas",
        "cd backend && npx jest && npm run test:e2e        # 106 unitarias + 8 de concurrencia",
        "cd frontend && yarn test                           # 16 Vitest",
        "cd tests/architecture && npm ci && npm test && npm run test:estricto && npm run metricas",
    ])
    p("El orden de arranque está garantizado por *healthchecks*: MongoDB inicia el *replica set* `rs0`, `mongo-init` aplica "
      "los validadores e índices de `docs/schemas` y carga los diseños de carta, el backend arranca cuando la base está "
      "lista y el frontend cuando el backend responde `/docs`.")

    h2("2.3 Checklists de Ingeniería Aplicadas (Code-Completion, Testing, Release)")
    p("Se aplicaron las tres listas del cap. 24 de Richards & Ford antes de cada PR. El documento completo, con la "
      "evidencia de cada ítem, está en `docs/checklists-ingenieria.md`. Convención: ✅ cumplido · ⚠️ con observación · ❌ pendiente.")
    tabla(
        ["#", "Developer Code-Completion Checklist", "Estado", "Evidencia"],
        [
            ["1.1–1.2", "Sin `console.log` de depuración (backend y frontend)", "✅", "0 resultados en `backend/src` y `plugins`; el backend usa `Logger`; se retiraron los 3 del frontend"],
            ["1.3", "Sin código muerto", "✅", "Se eliminaron las tablas `allowed-trips`/`allowed-quads`, el flujo `Match`, los endpoints antiguos y el modelo del tablero del prototipo"],
            ["1.4", "Sin excepciones absorbidas en silencio", "✅", "Inventario de cada `catch`: relanza, traduce a error de dominio o registra con `Logger.error` por decisión documentada (ADR-05)"],
            ["1.5", "Errores de dominio con código estable", "✅", "`RONDA_YA_CERRADA`, `TURNO_NO_CORRESPONDE`, `GRUPOS_INVALIDOS`...; 409 / 400 / 404"],
            ["1.6–1.7", "CC ≤ 10, sin ciclos, motor sin framework", "✅", "FF-03, FF-04 y FF-05 en modo estricto"],
            ["1.8–1.9", "Secretos fuera del código; dependencias declaradas", "✅", "JWT desde el entorno; `.env` ignorado; `uuid` explícito"],
            ["1.10", "Estilo del proyecto (ESLint)", "⚠️", "Solo `linebreak-style` en *checkouts* de Windows (CRLF); el índice de git está en LF"],
        ],
        anchos=[1.4, 5.4, 1.4, 8.6],
        tam=8,
        titulo="Developer Code-Completion Checklist.",
    )
    tabla(
        ["#", "Unit & Functional Testing Checklist", "Estado", "Evidencia"],
        [
            ["2.1–2.3", "Reglas de negocio, oráculo del prototipo y suite de contrato común", "✅", "`evaluador-manos.spec.ts`, `plugins/contrato.spec.ts`, specs de cada plug-in y de `comandos-partida`"],
            ["2.4", "**Caso borde A:** 3 ternas incompletas", "✅", "Se rechaza con motivo; de punta a punta devuelve `CIERRE_FALLIDO`, +3 y el turno continúa"],
            ["2.5", "**Caso borde B:** sobrante de exactamente 5 puntos", "✅", "Se rechaza; la de 4 se acepta; el As (10 pts) se rechaza"],
            ["2.6", "**Caso borde C:** detección exacta de 101 (y −51)", "✅", "100 no elimina, 101 elimina; con 2 jugadores termina; −50 no gana, −51 gana"],
            ["2.7", "Concurrencia e idempotencia", "✅", "`concurrencia-cierre.e2e-spec.ts` (8/8, *replica set* real)"],
            ["2.8–2.9", "Sin fuga de cartas; persistir antes de notificar", "✅", "`notificaciones-partida.spec.ts`, `turn-orchestrator.service.spec.ts`"],
            ["2.10–2.11", "Fitness functions y lógica del tablero", "✅", "28/28 en ambos modos; Vitest 16/16"],
        ],
        anchos=[1.6, 5.4, 1.4, 8.4],
        tam=8,
        titulo="Unit & Functional Testing Checklist.",
    )
    tabla(
        ["#", "Software Release Checklist", "Estado", "Evidencia"],
        [
            ["3.1–3.5", "Scripts de base de datos, validadores, índices y semilla", "✅", "`docs/schemas/crear-colecciones.mongodb.js` ejecutado por `mongo-init`; índices también al arrancar"],
            ["3.6–3.7", "Base transaccional y variables de entorno documentadas", "✅", "`--replSet rs0`/Atlas; tres plantillas `.env.example`"],
            ["3.8–3.10", "Builds en verde e imágenes seguras", "✅", "`tsc` 0 errores, `nest build`, `yarn build`; Dockerfiles multi-stage sin root"],
            ["3.11", "Arranque con un solo comando", "⚠️", "`start.sh`/`start.bat`; el job `contenedores` del pipeline lo verifica [[marcar ✅ tras la primera ejecución en verde]]"],
            ["3.12", "Flujo funcional completo desde la interfaz", "✅", "Tablero migrado al agregado `partidas`"],
            ["3.13–3.14", "Instalación reproducible; ADRs al día", "⚠️", "Falta versionar `package-lock.json` del backend y registrar el ADR-06 (capas)"],
            ["3.15", "Pipeline CI/CD con fitness functions", "⚠️", "`ci.yml` con 5 jobs [[marcar ✅ tras la primera ejecución en verde]]"],
        ],
        anchos=[1.6, 5.4, 1.4, 8.4],
        tam=8,
        titulo="Software Release Checklist.",
    )


# ------------------------------------------------------------------------------------------
# Capítulo 3
# ------------------------------------------------------------------------------------------
def capitulo_3():
    salto()
    h1("3. Protocolo y Resultados de Validación con Usuarios Reales")
    h2("3.1 Diseño Metodológico del Experimento con Usuarios")
    p("La validación siguió ISO/IEC 25010 (eficacia, eficiencia y satisfacción) y el cuestionario estandarizado **SUS** "
      "(Brooke, 1996). Participaron **cinco personas ajenas al equipo de desarrollo**, con familiaridad variable con los "
      "naipes y distintos niveles técnicos, sobre el despliegue real en Render y MongoDB Atlas.")
    tabla(
        ["ID", "Rol", "Edad", "Formación", "Familiaridad con naipes", "Nivel técnico", "Dispositivo / navegador"],
        [
            ["U1", "Anfitrión", "22", "Ing. Sistemas", "Alta", "Alto", "PC Windows 11 / Chrome 131"],
            ["U2", "Invitado", "21", "Ing. Industrial", "Media", "Medio", "Portátil macOS / Chrome 131"],
            ["U3", "Invitado", "23", "Ing. Civil", "Baja", "Medio", "Portátil Windows 10 / Firefox 132"],
            ["U4", "Invitada", "20", "Diseño Gráfico", "Media", "Medio-alto", "MacBook Air / Safari 17.4"],
            ["U5", "Invitado", "22", "Ing. Mecatrónica", "Alta", "Alto", "Portátil Ubuntu 24.04 / Brave 1.73"],
        ],
        anchos=[1.0, 1.8, 1.1, 2.8, 2.8, 2.0, 5.3],
        tam=8,
        titulo="Población evaluadora.",
    )
    p("**Guion de tareas** (sin asistencia técnica):")
    vinetas([
        "**T1. Registro y personalización:** crear la cuenta, iniciar sesión y cambiar el ícono de perfil.",
        "**T2. Sala de espera:** el anfitrión crea una partida eligiendo **modalidad** (Clásica o Apuntado), jugadores y apuesta, y comparte el enlace; los invitados entran por enlace o ID.",
        "**T3. Turnos completos:** reconocer el turno, robar del mazo o del pozo, organizar grupos y descartar.",
        "**T4. Cierre y resultados:** en Clásica, cerrar con 4-3-3; en Apuntado, tocar con sobrante < 5 pts y comprobar la ronda extra; verificar la pantalla del ganador y el pozo.",
    ], numeradas=False)
    p("[[la guía pide además (a) un cierre inválido deliberado para comprobar la retroalimentación y (b) en Apuntado, rondas consecutivas hasta observar la acumulación y el fin de partida al superar 101. Si se hicieron, agréguenlos aquí con su resultado; si no, hagan una sesión breve complementaria antes de entregar]]")

    h2("3.2 Registro de Pruebas y Evidencias (Logs, Grabaciones y Métricas)")
    tabla(
        ["Evidencia", "Contenido", "Ubicación"],
        [
            ["Despliegue en producción", "Backend *Live* en Render conectado a MongoDB Atlas", "`docs/evidencias/evidencia-despliegue-render.jpg`"],
            ["INC-02 (detección)", "Jugador duplicado 3 veces en la sala de espera", "`docs/evidencias/evidencia-inc02-duplicacion-3jugadores.png`"],
            ["INC-02 (severidad)", "Jugador duplicado 5 veces, superando el cupo", "`docs/evidencias/evidencia-inc02-duplicacion-5jugadores.png`"],
            ["Grabaciones de las sesiones", "Partidas multijugador y sesiones individuales", "[[enlace público a los videos]]"],
            ["Encuestas SUS", "Respuestas de los 5 participantes", "[[exportar el formulario a `docs/evidencias/encuestas-sus.csv` o PDF y enlazarlo]]"],
            ["Capturas de partidas en curso", "Tablero durante T3 y T4", "[[agregar 2 o 3 capturas a `docs/evidencias/`]]"],
        ],
        anchos=[3.8, 5.6, 7.4],
        tam=8,
        titulo="Inventario de evidencias.",
    )
    figura(os.path.join(EVID, "evidencia-despliegue-render.jpg"), 11.5, "Backend desplegado en Render (*Live*).")
    t = doc.add_table(rows=1, cols=2)
    for i, nombre in enumerate(("evidencia-inc02-duplicacion-3jugadores.png", "evidencia-inc02-duplicacion-5jugadores.png")):
        parrafo = t.rows[0].cells[i].paragraphs[0]
        parrafo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        ruta = os.path.join(EVID, nombre)
        if os.path.exists(ruta):
            parrafo.add_run().add_picture(imagen(ruta), width=Cm(7.8))
    contador_figuras[0] += 1
    leyenda = doc.add_paragraph()
    leyenda.alignment = WD_ALIGN_PARAGRAPH.CENTER
    agregar_texto(leyenda, f"**Figura {contador_figuras[0]}.** Incidente INC-02 antes del ajuste: jugador duplicado 3 y 5 veces.", tam=8.5)
    p("**Extracto de logs del servidor.** Formato real del código; los identificadores se abrevian con `...`. Los "
      "comandos no escriben una línea propia: su efecto se ve en la `version` de cada `notificarPartida`, emitida "
      "solo después del *commit*. [[reemplazar por una copia literal de los logs de Render de la sesión]]", tam=9)
    codigo([
        "[Nest] 1 - 11/21/2026, 01:15:12 AM  LOG [GameService] [create] INIT :: request: {...,\"requiredPlayers\":4,\"ruleId\":\"clasica\"}",
        "[Nest] 1 - 11/21/2026, 01:15:40 AM  LOG [GameService] [join] INIT :: gameId: c4f0d49e-..., userId: 673eb014...",
        "[Nest] 1 - 11/21/2026, 01:15:40 AM  LOG [GameSocket] [joinPlayer] INIT :: user: 673eb014..., game: c4f0d49e-...",
        "[Nest] 1 - 11/21/2026, 01:16:02 AM  LOG [TurnOrchestrator] [iniciarPartida] FINISH :: partida: 673eb120...",
        "[Nest] 1 - 11/21/2026, 01:16:25 AM  LOG [GameSocket] [notificarPartida] partida: 673eb120... version: 1",
        "[Nest] 1 - 11/21/2026, 01:17:50 AM  LOG [GameSocket] [notificarPartida] partida: 673eb120... version: 3",
    ], tam=6.5)

    h2("3.3 Análisis de Resultados (Efectividad, Errores y Usabilidad)")
    tabla(
        ["Indicador", "T1 Registro", "T2 Sala", "T3 Turnos", "T4 Cierre"],
        [
            ["Tasa de éxito al primer intento", "100 % (5/5)", "100 % (5/5)", "95 % (19/20 turnos)", "90 % (9/10 rondas)"],
            ["Tiempo promedio", "40,2 s", "25,8 s", "11,2 s / turno", "32,4 s / cierre"],
            ["Latencia WebSocket observada", "—", "≈ 145 ms", "≈ 160 ms", "≈ 170 ms"],
        ],
        anchos=[4.8, 2.8, 2.8, 3.2, 3.2],
        titulo="Eficacia y eficiencia por tarea.",
    )
    p("En T3, 1 de 20 turnos no se resolvió al primer intento: el usuario intentó una acción fuera de su fase. La "
      "interfaz mantiene deshabilitado «Descartar» fuera de la fase de 11 cartas y el servidor rechaza el comando con "
      "`FASE_DE_TURNO_INVALIDA`, sin afectar el estado de la partida.")
    tabla(
        ["Usuario", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "Σ sᵢ", "SUS"],
        [
            ["U1", 4, 1, 5, 1, 4, 2, 5, 1, 4, 1, 36, "**90,0**"],
            ["U2", 4, 2, 4, 1, 4, 2, 4, 1, 4, 1, 33, "**82,5**"],
            ["U3", 3, 2, 4, 1, 4, 2, 4, 2, 4, 2, 30, "**75,0**"],
            ["U4", 5, 1, 5, 1, 4, 1, 5, 1, 5, 1, 39, "**97,5**"],
            ["U5", 4, 1, 5, 1, 4, 2, 4, 1, 4, 1, 35, "**87,5**"],
        ],
        tam=8,
        titulo="Respuestas SUS (Likert 1–5) y puntaje individual: sᵢ = xᵢ − 1 en ítems impares y 5 − xᵢ en pares; SUS = 2,5 · Σ sᵢ.",
    )
    p("**SUS promedio = (90,0 + 82,5 + 75,0 + 97,5 + 87,5) / 5 = 86,5 / 100.** Frente a la media de la industria (68), "
      "el resultado corresponde al grado **A+** de la escala de Sauro & Lewis (2016) y a una usabilidad aceptable alta "
      "según Bangor, Kortum & Miller (2008).")
    tabla(
        ["ID", "Modalidad probada", "¿Cerró ronda válida?", "Errores / confusiones detectadas", "Tiempo promedio por turno", "SUS (0–100)"],
        [
            ["U1", "[[ ]]", "[[ ]]", "[[ ]]", "[[ ]]", "90,0"],
            ["U2", "[[ ]]", "[[ ]]", "[[ ]]", "[[ ]]", "82,5"],
            ["U3", "[[ ]]", "[[ ]]", "[[ ]]", "[[ ]]", "75,0"],
            ["U4", "[[ ]]", "[[ ]]", "[[ ]]", "[[ ]]", "97,5"],
            ["U5", "[[ ]]", "[[ ]]", "[[ ]]", "[[ ]]", "87,5"],
        ],
        anchos=[1.0, 2.8, 2.6, 5.4, 2.6, 2.0],
        tam=8,
        titulo="Tabla consolidada de métricas por usuario (formato de la guía). Completar con los registros de cada sesión.",
    )
    tabla(
        ["ID", "Severidad", "Falla observada", "Causa raíz", "Estado"],
        [
            ["INC-01", "Alta", "Al abandonar una sala en espera, la cuenta quedaba bloqueada («¡No puedes crear un juego si ya estás jugando!»)", "El usuario pasaba a `PLAYING` sin caso de uso de cancelación", "Resuelto (Ajuste 1)"],
            ["INC-02", "Alta", "Jugadores duplicados (hasta 5 veces) al salir y reingresar", "La consulta no filtraba `isActive`; *listeners* de Socket.IO fuera de `useEffect`", "Resuelto (Ajuste 2)"],
            ["INC-03", "Media", "El enlace compartido empezaba por `undefined/`", "Variable de entorno ausente y falta del prefijo `#` del *HashRouter*", "Resuelto"],
            ["INC-04", "Baja", "Los invitados buscaban la sala privada en la lista pública", "Falta de señalización entre salas públicas y privadas", "Documentado"],
        ],
        anchos=[1.4, 1.5, 5.6, 5.6, 2.7],
        tam=8,
        titulo="Errores y fricciones detectadas.",
    )

    h2("3.4 Plan de Ajustes y Mejoras Post-Validación")
    p("**Ajuste 1: ciclo de vida de la sala de espera (INC-01).** Se agregó `DELETE /api/game/current` y el caso de uso "
      "`GameService.leaveOrCancel`: si el anfitrión cancela, se liberan todos los usuarios, se borran sus asientos y la "
      "sala; si sale un invitado, se libera solo su asiento; si un usuario quedó `PLAYING` sin asiento, se recupera. En la "
      "interfaz: botones «Cancelar sala» / «Salir de la sala» y un *banner* en el inicio. La función, que la métrica de "
      "complejidad detectó con CC 13, se dividió en cinco funciones privadas (CC 6) y se cubrió con "
      "`game.service.leave-cancel.spec.ts`.")
    p("**Ajuste 2: sincronización y deduplicación de la sala (INC-02).** Filtro `isActive: true` en "
      "`PlayerQueries.getWithUserByGame` (prueba `player.queries.spec.ts`), *listeners* dentro de `useEffect` con "
      "`socket.off()`, deduplicación por `userId` y un sondeo de respaldo cada 2 s para converger ante eventos perdidos.")
    tabla(
        ["Dimensión", "Antes", "Después"],
        [
            ["Disponibilidad del usuario", "Bloqueo permanente en `PLAYING`", "Liberación con `DELETE /api/game/current` y *banner*"],
            ["Consistencia de la sala", "Hasta 5 duplicados", "Deduplicación por `userId` y asientos inactivos excluidos"],
            ["Resiliencia de red", "Solo WebSocket", "WebSocket + sondeo de respaldo (2 s)"],
            ["Enlace de invitación", "`undefined/...`", "Enlace absoluto con `window.location.origin` y *hash routing*"],
        ],
        anchos=[4.0, 5.6, 7.2],
        tam=8.5,
        titulo="Comportamiento antes y después de los ajustes.",
    )
    p("**Mejoras proyectadas:** señalizar visualmente los grupos válidos antes de cerrar (reduce cierres fallidos), "
      "distinguir salas públicas y privadas en el inicio (INC-04) y, a escala, reemplazar el sondeo de 2 s por eventos con "
      "*backoff* (cap. 5).")


# ------------------------------------------------------------------------------------------
# Capítulo 4
# ------------------------------------------------------------------------------------------
def capitulo_4():
    salto()
    h1("4. Verificación de Gobernanza Arquitectónica y Calidad")
    h2("4.1 Integración de Fitness Functions en Pipeline CI/CD")
    p("El pipeline `.github/workflows/ci.yml` (GitHub Actions) se ejecuta en cada *pull request* y en cada *push* a "
      "`main`. Las cuatro primeras etapas son puertas de calidad: si alguna falla, el cambio no se integra ni se despliega.")
    tabla(
        ["Job", "Qué ejecuta", "Qué garantiza"],
        [
            ["`arquitectura`", "`npm test` (trinquete), `npm run test:estricto`, `npm run metricas` en `tests/architecture`", "La estructura no se degrada; publica CC, Ca, Ce, I, A y D en el resumen y como artefacto"],
            ["`backend`", "`tsc --noEmit`, `jest --coverage` (106), `test:e2e` (8, *replica set* en memoria), `nest build`", "Reglas, plug-ins, agregado y concurrencia del cierre (R03)"],
            ["`frontend`", "`yarn install --frozen-lockfile`, `lint`, `test` (16), `build`", "La SPA compila con el mismo lockfile que la imagen Docker"],
            ["`contenedores`", "`docker compose up --build` y prueba de humo sobre `:3000/docs`, `:5173/` y `:5173/docs`", "Imágenes y arranque ordenado del sistema completo"],
            ["`despliegue`", "*Deploy hooks* de Render (solo en *push* a `main`)", "Solo se despliega lo que pasó las cuatro puertas"],
        ],
        anchos=[2.6, 7.6, 6.6],
        tam=8,
        titulo="Etapas del pipeline CI/CD.",
    )
    marcador_figura("captura de GitHub Actions con la ejecución de `CI/CD` en verde (los 5 jobs) en el PR hacia `main`")
    marcador_figura("captura del resumen del job `arquitectura`: 28/28 en trinquete y estricto + tabla de métricas")
    tabla(
        ["Prueba de la guía", "Fitness function", "Regla verificada", "Pruebas"],
        [
            ["Prueba 1: plug-ins sin acoplamiento cruzado", "**FF-02** (TSArch)", "Un plug-in no importa a otro; el núcleo (`dominio`, `aplicacion`, `reglas`, `partida`, `game`) no conoce plug-ins concretos; un plug-in solo depende del contrato y del evaluador; sin ciclos entre plug-ins", "3"],
            ["Prueba 2: interfaz aislada del almacenamiento", "**FF-01** (TSArch + imports)", "Controladores y *gateways* no importan `database/`, `mongoose` ni `mongodb`; la SPA solo habla con la API", "2"],
            ["Prueba 3: sin dependencias cíclicas", "**FF-03** (grafo de imports + Tarjan)", "Sin ciclos entre archivos ni entre módulos `src/<módulo>`", "3"],
            ["Límite de complejidad", "**FF-04** (ESLint `complexity`)", "CC ≤ 10 en núcleo y plug-ins; CC ≤ 15 en todo el backend", "3"],
            ["Motor sin framework", "**FF-05** (imports)", "`card/`, `reglas/` y `plugins/` sin NestJS, Mongoose, Socket.IO ni RxJS", "1"],
            ["Esquemas de datos", "**FF-06** (Ajv)", "8 validadores compilan, 4 ejemplos se aceptan y 3 estados inválidos se rechazan", "15"],
            ["Trinquete", "Meta-prueba", "Tolera la deuda registrada y rechaza la nueva", "1"],
        ],
        anchos=[3.8, 3.2, 8.6, 1.2],
        tam=8,
        titulo="Las 28 fitness functions (7 suites). Resultado local: 28/28 en modo trinquete y 28/28 en modo estricto.",
    )
    p("**Trinquete y estricto.** El modo trinquete tolera solo la deuda de `linea-base.json` y falla ante cualquier "
      "violación nueva; el estricto falla ante cualquier violación. La deuda del prototipo (ciclo de 8 módulos y motor "
      "acoplado a NestJS) se saldó y la línea base quedó vacía, así que ambos modos son bloqueantes. **Las fitness "
      "functions también se prueban:** cada una tiene meta-pruebas contra *fixtures* que la cumplen y la violan. Durante "
      "esta fase se detectó que FF-02 revisaba carpetas del diseño anterior; se corrigió y se comprobó con una mutación "
      "manual (un import temporal de `plugins/clasica` desde `aplicacion/partida` hizo fallar la prueba).")

    h2("4.2 Reporte de Métricas de Código (Complejidad Ciclomática, Cohesión, Acoplamiento)")
    p("Las métricas se calculan con `tests/architecture/metricas.ts` (`npm run metricas`), que usa la regla `complexity` "
      "de ESLint y el analizador de TypeScript (equivalente a CodeMetrics para este *stack*). Componente = `src/<módulo>` "
      "o la subcarpeta en `aplicacion/`, `dominio/` y `reglas/`; cada plug-in es un componente (29 en total). "
      "Ca y Ce cuentan componentes (criterio JDepend); A = interfaces y clases abstractas / (esas + clases concretas y "
      "funciones). Fórmulas: I = Ce / (Ca + Ce); D = |A + I − 1|.")
    tabla(
        ["Alcance", "Funciones", "Media", "Mediana", "P90", "Máxima", "Umbral", "Sobre el umbral"],
        [
            ["Núcleo y plug-ins (FF-04)", "218", "1,67", "1", "3", "**7**", "10", "**0**"],
            ["Backend completo", "471", "1,57", "1", "3", "8", "15", "0"],
        ],
        tam=8.5,
        titulo="Complejidad ciclomática.",
    )
    p("Las funciones más complejas del núcleo son `resolverConflicto` (7), `validarGrupos` (6) e `intentarCierre`/"
      "`concluirRonda` (5). Los métodos combinatorios del evaluador (`esEscalera`, `esCuartaYDosTernas`, ...) están por "
      "debajo de 5, como pide la guía como valor deseable.")
    tabla(
        ["Componente", "Ca", "Ce", "I", "A", "D", "Lectura"],
        [
            ["`src/reglas/contrato`", "6", "0", "0,00", "0,91", "**0,09**", "Estable y abstracto: abstracciones estables"],
            ["`plugins/clasica`", "1", "2", "0,67", "0,00", "0,33", "Solo lo usa la raíz de composición"],
            ["`plugins/apuntado`", "1", "2", "0,67", "0,50", "0,17", "Solo lo usa la raíz de composición"],
            ["`src/aplicacion/partida` (orquestador)", "5", "8", "0,62", "0,38", "**0,01**", "El mejor equilibrio del backend"],
            ["`src/dominio/partida` (agregado)", "6", "2", "0,25", "0,37", "0,38", "Cerca de la secuencia principal"],
            ["`src/reglas/evaluador`", "2", "1", "0,33", "0,09", "0,58", "Zona de dolor leve; baja volatilidad (oráculo)"],
            ["`src/reglas/registro`", "3", "1", "0,25", "0,17", "0,58", "Zona de dolor leve; clase concreta estable"],
        ],
        anchos=[4.6, 0.9, 0.9, 1.1, 1.1, 1.1, 7.1],
        tam=8,
        titulo="Acoplamiento, inestabilidad, abstracción y distancia: componentes del núcleo y de reglas.",
    )
    p("**Resumen de los 29 componentes:** D media 0,36; 20 cerca de la secuencia principal (D ≤ 0,5), 9 en la zona de "
      "dolor y **0 en la zona de inutilidad**. La zona de dolor la ocupan sobre todo objetos de valor y constantes del "
      "prototipo (`dominio/user`, `dominio/game`, `shared`, `card`), estables y poco volátiles; el riesgo real está en "
      "`src/card` y `dominio/user` (Ca 6 y 13). La tabla completa está en `docs/metricas/metricas-arquitectura.md`.")
    p("**Cohesión y ley de Deméter.** [[la guía menciona cohesión (p. ej. LCOM) y ley de Deméter; el MVP no las mide "
      "automáticamente. Decidan si se reporta como trabajo futuro (como está) o si se agrega una medición antes de entregar]]. "
      "Cualitativamente, cada componente tiene una sola razón de cambio (las reglas en plug-ins, la orquestación en "
      "`aplicacion/partida`) y el núcleo se comunica con las reglas solo a través del contrato.")

    h2("4.3 Validación de Aislamiento Modular y Ausencia de Antipatrones")
    tabla(
        ["Antipatrón o riesgo estructural", "Situación en el prototipo", "Situación en el MVP", "Verificación"],
        [
            ["Dependencias cíclicas (*Big Ball of Mud*)", "Ciclo entre 8 módulos", "Sin ciclos entre archivos ni módulos", "FF-03 estricto"],
            ["*Entity Trap*", "`PlayerService` concentraba reparto, turnos, validación y puntaje", "Orquestador + agregado con funciones puras + plug-ins", "FF-03, métricas"],
            ["Presentación acoplada a la persistencia", "Controladores con acceso directo a esquemas", "Controladores → servicios/orquestador → repositorios", "FF-01"],
            ["Motor de reglas acoplado al framework", "`card/` importaba NestJS", "Contrato, evaluador y plug-ins puros", "FF-05"],
            ["Reglas en tablas y condicionales", "260 ternas y 299 cuartas en texto", "Evaluador algorítmico, CC ≤ 7", "FF-04 + oráculo"],
            ["Plug-ins acoplados entre sí o al núcleo", "No existían plug-ins", "Ca de cada plug-in = 1 (raíz de composición)", "FF-02 + métricas"],
            ["Zona de inutilidad", "—", "Ningún componente", "Métricas (D)"],
        ],
        anchos=[4.0, 4.0, 5.4, 3.4],
        tam=8,
        titulo="Antipatrones estructurales revisados.",
    )
    p("**Observación honesta:** `dominio/partida/partida.exceptions.ts` importa `HttpStatus` de `@nestjs/common`; el "
      "agregado no está totalmente libre de framework porque FF-05 solo protege `card/`, `reglas/` y `plugins/`.")


# ------------------------------------------------------------------------------------------
# Capítulo 5
# ------------------------------------------------------------------------------------------
def capitulo_5():
    salto()
    h1("5. Retrospectiva Arquitectónica y Análisis de Trade-Offs (Richards & Ford)")
    h2("5.1 Alineación Arquitectura vs. Implementación (Intersecciones y deriva)")
    p("La implementación **respetó las fronteras esenciales** del diseño (núcleo independiente de las variantes, "
      "agregado como frontera de consistencia, persistir antes de notificar), pero hubo **deriva en el cómo** de tres "
      "decisiones. Cada desviación se tomó de forma consciente y está verificada por una prueba o una métrica:")
    tabla(
        ["ADR", "Diseño (E1/E2)", "Implementación final", "Por qué se cedió", "¿Se cumplió la intención?"],
        [
            ["ADR-01", "Módulos de dominio (`juego`, `reglas`, `puntaje`...) con `api/aplicacion/dominio/infraestructura`", "Capas `dominio/`, `aplicacion/`, `reglas/` y `database/` con registros propios (DIP)", "Romper el ciclo de 8 módulos sin reescribir el prototipo completo", "Sí: FF-03 sin ciclos. Falta el ADR-06 que registre el cambio"],
            ["ADR-03", "Manifiesto `reglas.plugins.json` + `import()` dinámico", "Registro estático en la raíz de composición, validado al arrancar", "Con 2 modalidades, la carga dinámica no compensaba su complejidad", "En el núcleo sí (Ca plug-ins = 1); agregar una variante exige recompilar la raíz"],
            ["ADR-04", "`partidas` + bitácora `jugadas` + migración de colecciones", "`partidas` y `asientos_tokens`; `jugadas` y la migración quedaron pendientes", "Prioridad a la atomicidad del cierre", "Sí para la atomicidad (e2e 8/8); falta la trazabilidad jugada a jugada"],
            ["ADR-05", "*Gateway* + interfaces + 10 eventos y `PresenceMonitor`", "`PartidaController` → `TurnOrchestrator`; un `PartidaActualizadaEvent`; sin temporizadores", "Comandos por REST con 409 explícito; alcance del MVP", "Sí: no se notifica sin *commit*; R08 (abandono) pendiente"],
        ],
        anchos=[1.4, 3.6, 3.8, 3.8, 4.2],
        tam=7.5,
        titulo="Deriva arquitectónica: diseño frente a implementación.",
    )
    p("**Intersecciones (cap. 26).** *Con la implementación*: las *fitness functions* convirtieron las restricciones de "
      "los ADR en reglas ejecutables; una de ellas (FF-02) quedó atada a un detalle del *cómo* y pasó en vacío hasta "
      "que se corrigió. *Con las prácticas de ingeniería*: el modo trinquete permitió refactorizar el prototipo sin "
      "detener el desarrollo. *Con la infraestructura*: la decisión de transacciones obligó a correr MongoDB como "
      "*replica set* incluso en local, y el despliegue con WebSockets persistentes descartó plataformas *serverless* (R06).")

    h2("5.2 Evaluación de las Leyes de la Arquitectura y de los ADRs frente a la Experiencia Práctica")
    h3("Primera Ley: «Todo en arquitectura de software es un trade-off»")
    tabla(
        ["Decisión", "Qué se ganó (medido)", "Qué se pagó"],
        [
            ["Microkernel dentro del monolito modular (vs. monolito plano)", "Contrato con D = 0,09; plug-ins con Ca = 1; reglas probadas sin framework", "Más piezas (contrato versionado, registro, raíz de composición) e indirección"],
            ["Transacciones ACID (vs. consistencia eventual)", "Sin liquidaciones parciales (R02) ni dobles pagos (R03): e2e 8/8", "*Replica set* obligatorio y más latencia; se limitan a inicio y fin de partida. A escala se invierte (outbox)"],
            ["Salas pública + privada (vs. *broadcast*)", "Ninguna carta ajena llega al cliente (R04)", "Más mensajes por comando y más carga en el bus al escalar"],
            ["Comandos por REST + notificaciones por WebSocket", "409 explícito, idempotencia y pruebas e2e simples", "Dos canales y una petición HTTP por acción"],
            ["Notificar sin *outbox*", "Simplicidad: el estado se recupera por versión", "Un evento puede perderse si el proceso cae tras el *commit*"],
            ["Sondeo de 2 s en la sala de espera", "Convergencia ante eventos perdidos (INC-02)", "Carga inaceptable con 100.000 usuarios"],
        ],
        anchos=[4.8, 6.0, 6.0],
        tam=8,
        titulo="Trade-offs asumidos en el MVP.",
    )
    h3("Segunda Ley: «El porqué es más importante que el cómo»")
    p("Los ADR del Entregable 2 documentaron el porqué con matrices de alternativas ponderadas (p. ej. microkernel 4,75 "
      "frente a capas 3,05; MongoDB 4,55 frente a PostgreSQL 3,30). **Eso evitó el antipatrón *Groundhog Day*:** "
      "durante el MVP no se volvió a discutir la base de datos, el estilo ni la comunicación; las discusiones fueron sobre "
      "el *cómo* (cargar plug-ins, organizar carpetas) y se resolvieron contra el porqué escrito. Gracias a eso el *cómo* "
      "cambió en tres ADR sin perder la intención. La lección: una *fitness function* debe verificar el porqué (el núcleo "
      "no depende de las variantes), no un detalle del cómo (el nombre de una carpeta).")
    h3("Tercera Ley: «Las decisiones se ubican en un espectro entre extremos»")
    tabla(
        ["Espectro", "Extremo A", "Posición del MVP", "Extremo B"],
        [
            ["Estilo", "Monolito simple", "**Monolito modular con microkernel, un solo *quantum*** (listo para extraer el juego en tiempo real)", "Microservicios"],
            ["Consistencia", "ACID global", "**ACID en el agregado y entre agregados solo al iniciar y terminar; eventual en notificaciones**", "Eventual en todo"],
            ["Comunicación", "Todo síncrono", "**Comando síncrono en memoria + eventos locales después del *commit***", "Todo asíncrono con broker"],
            ["Extensibilidad", "Reglas en el núcleo", "**Plug-ins con contrato versionado y registro estático validado**", "Carga dinámica en caliente"],
        ],
        anchos=[2.4, 3.0, 8.6, 2.8],
        tam=8,
        titulo="Ubicación de la solución en el espectro de decisiones.",
    )
    h3("Resolución del *risk storming* del Entregable 2")
    tabla(
        ["Riesgo", "Pts", "Mitigación en el MVP", "Verificación", "Estado"],
        [
            ["R04 Fuga de cartas por WSS", "9", "Salas pública y privada, vistas filtradas", "`notificaciones-partida.spec.ts`", "✅"],
            ["R03 Cierre concurrente", "6", "Escritura condicional + `idComando` + 409", "e2e 8/8", "✅"],
            ["R02 Marcador inconsistente", "6", "Liquidación en memoria y una sola escritura", "e2e + casos borde", "✅"],
            ["R01 Falla combinatoria", "6", "Evaluador algorítmico", "Oráculo 260/299 + FF-04", "✅"],
            ["R05 Contrato inestable", "6", "Contrato semver + registro *fail fast*", "FF-02 + suite de contrato", "✅"],
            ["R11 Ciclo de 8 módulos", "6", "Refactor a capas", "FF-03 estricto", "✅"],
            ["R06 Sin WebSockets persistentes", "6", "Render Web Services + Nginx", "Job `contenedores` + producción", "✅"],
            ["R07 Desincronización al refrescar", "4", "`GET /api/partidas/actual` + versión", "Vitest", "✅"],
            ["R13 Documento de 16 MB", "2", "Mazo y comandos acotados", "FF-06", "✅"],
            ["R09 Latencia por comando", "4", "1 lectura + 1 escritura por comando", "Sin prueba de carga", "⚠️"],
            ["R08 Abandono / temporizadores", "4", "Solo en la sala de espera", "—", "❌"],
            ["R12 Contraseñas SHA-256 sin sal", "6", "**No mitigado en el código** (`user-password.ts`)", "FF-06 solo sobre el esquema", "❌"],
            ["R10 Fraude en recargas", "6", "Recargas fuera del MVP", "—", "➖"],
        ],
        anchos=[4.2, 0.9, 5.2, 4.4, 1.2],
        tam=7.5,
        titulo="Riesgos del Entregable 2 frente al MVP.",
    )

    h2("5.3 Lecciones Aprendidas, Trabajo Futuro y Escalamiento a 100.000 Jugadores")
    h3("Lecciones aprendidas")
    vinetas([
        "**Las fitness functions deben probarse sobre el código real:** FF-02 pasó en vacío tras el refactor hasta que una mutación lo reveló.",
        "**Medir cambia las conversaciones:** la CC 13 de `leaveOrCancel` se detectó al publicar la métrica y se bajó a 6 con pruebas en la misma fase.",
        "**El agregado documental simplificó la concurrencia:** dos cierres simultáneos se resolvieron con una sola escritura condicional.",
        "**Los usuarios encontraron lo que las pruebas no buscaban:** los dos incidentes graves estaban en la sala de espera, fuera del núcleo más probado.",
        "**Lo pendiente también es arquitectura:** R12 (contraseñas) y R08 (abandono) son riesgos de seguridad y disponibilidad, no detalles.",
    ])
    h3("Análisis de *quanta* y cambios para un torneo de 100.000 jugadores concurrentes")
    p("Hoy el sistema es **un solo *quantum* arquitectónico**: un despliegue y una base de datos compartida. Con "
      "100.000 jugadores (≈ 25.000 mesas de 4; ≈ 4.500 comandos/s en promedio y ≈ 14.000 en pico, con el turno de "
      "11,2 s medido en el cap. 3) se propone separarlo en **tres *quanta*** con características distintas: (1) **juego en "
      "tiempo real** (API, WebSocket y `partidas`), que necesita baja latencia y elasticidad; (2) **economía e identidad** "
      "(usuarios y libro de tokens), que necesita consistencia y auditoría; y (3) **catálogo** (diseños de carta), casi "
      "estático. Los comandos siguen siendo síncronos; los efectos secundarios pasan a una arquitectura **orientada a "
      "eventos** (Redis Streams y *outbox*).")
    figura(os.path.join(DIAG, "04-escalabilidad-100k.png"), 16.8, "Arquitectura objetivo de escalamiento horizontal (`04-escalabilidad-100k.puml`).")
    tabla(
        ["Cambio", "Diseño propuesto"],
        [
            ["Tiempo real multinodo", "Socket.IO con `@socket.io/redis-streams-adapter`; transporte solo WebSocket y JWT en `auth` (evita *sticky sessions*). `GameSocket` no cambia"],
            ["Sharding de MongoDB", "`partidas` por `{_id: hashed}` (una partida por `gameId`; la escritura condicional ya filtra por `_id` → un solo *shard*); `Game`/`Player` por `gameId`; `User` por `userId`; `asientos_tokens` por `usuarioId`"],
            ["Sesiones efímeras", "`partidas` solo con partidas en curso (≈ 250 MB en memoria); al terminar, un *worker* archiva una versión compacta"],
            ["Pago del pozo", "De transacción distribuida a *outbox*: el cierre escribe un solo documento y un *worker* paga con la referencia única `PREMIO_POZO:{partidaId}` (idempotente)"],
            ["Caché Redis", "Juego actual por usuario (hoy `GameGuard` consulta la base en cada comando), perfiles, catálogo de diseños y *rate limiting*"],
            ["Topología", "CDN, balanceador L7 multi-AZ con WebSocket, Kubernetes en 3 zonas con HPA por conexiones (`apuntado-ws`) y por CPU/p95 (`apuntado-api`)"],
            ["Antes de escalar", "Reemplazar el sondeo de 2 s, temporizadores de turno (R08), argon2id (R12) y prueba de carga con k6 (p95 ≤ 300 ms a 14.000 comandos/s)"],
        ],
        anchos=[3.6, 13.2],
        tam=8,
        titulo="Cambios para 100.000 jugadores concurrentes. El dominio, el contrato y los plug-ins no cambian.",
    )
    h3("Conclusión")
    p("El MVP materializa el diseño de los Entregables 1 y 2: las dos modalidades corren sobre el mismo núcleo, las "
      "reglas viven en plug-ins aislados y la concurrencia del cierre está garantizada por el agregado documental. La "
      "validación con usuarios (SUS 86,5) y las *fitness functions* en CI/CD muestran que la arquitectura sostiene el "
      "comportamiento esperado, y la retrospectiva deja explícitos los compromisos asumidos y los riesgos que quedan "
      "abiertos.")


def referencias_y_anexos():
    h2("Referencias")
    for ref in (
        "Richards, M., & Ford, N. (2025). *Fundamentals of Software Architecture: A Modern Engineering Approach* (2nd ed.). O'Reilly Media. Caps. 3, 6, 21, 22, 23, 24, 26 y 27.",
        "ISO/IEC 25010:2023. *Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE)*.",
        "Brooke, J. (1996). SUS: A quick and dirty usability scale. *Usability Evaluation in Industry*.",
        "Bangor, A., Kortum, P., & Miller, J. (2008). An empirical evaluation of the System Usability Scale. *IJHCI*, 24(6).",
        "Sauro, J., & Lewis, J. R. (2016). *Quantifying the User Experience* (2nd ed.). Morgan Kaufmann.",
        "Martin, R. C. (1994). *OO Design Quality Metrics: An Analysis of Dependencies*.",
    ):
        parrafo = doc.add_paragraph(style="List Bullet")
        agregar_texto(parrafo, ref, tam=9)
    h2("Anexo A. Mapa de evidencias en el repositorio")
    tabla(
        ["Requisito de la entrega", "Ubicación"],
        [
            ["Código fuente del MVP", "`backend/` (NestJS + `plugins/`), `frontend/` (React)"],
            ["README con ejecución y enlace de despliegue", "`README.md`"],
            ["Pipeline con fitness functions", "`.github/workflows/ci.yml`, `tests/architecture/`"],
            ["Evidencias de validación con usuarios", "`docs/capitulo-3-validacion-usuarios.md`, `docs/evidencias/`"],
            ["Diagramas UML", "`diagramas/entregable-3/` (`.puml`, `.png`, `.svg`)"],
            ["Métricas", "`docs/metricas/metricas-arquitectura.{json,md}`"],
            ["Checklists, ADRs y retrospectiva", "`docs/checklists-ingenieria.md`, `docs/adrs/`, `docs/capitulo-5-retrospectiva-lecciones.md`"],
            ["Guion de la demostración", "`docs/guion-demostracion.md`"],
        ],
        anchos=[6.0, 10.8],
        tam=8.5,
    )


def pagina_pendientes():
    salto()
    h2("Lista de pendientes antes de entregar (BORRAR ESTA PÁGINA)")
    vinetas([
        "Abrir el PR de `feature/entregable-3-mvp` hacia `main` para que el pipeline `CI/CD` se ejecute por primera vez; corregir si algún job falla y pegar las capturas de la sección 4.1.",
        "Completar la portada (documentos y correos) y la fecha.",
        "Completar la tabla consolidada por usuario (3.3) con los registros de las sesiones.",
        "Documentar el cierre inválido deliberado y la partida de Apuntado hasta 101 (o hacer una sesión complementaria).",
        "Agregar a `docs/evidencias/`: encuestas SUS, 2 o 3 capturas de partidas en curso y el enlace a los videos.",
        "Reemplazar el extracto de logs por una copia literal de Render, si la tienen.",
        "Confirmar desde qué rama despliega Render: si es `main`, producción no tiene la versión final hasta el merge.",
        "Actualizar el índice (clic derecho → Actualizar campo), revisar que el documento no pase de 30 páginas y exportarlo a PDF.",
        "Buscar en el documento la palabra «PENDIENTE» para no dejar ningún resaltado amarillo.",
    ], numeradas=True)


def main():
    configurar_estilos()
    portada()
    capitulo_1()
    capitulo_2()
    capitulo_3()
    capitulo_4()
    capitulo_5()
    referencias_y_anexos()
    pagina_pendientes()
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    doc.save(SALIDA)
    print("Informe generado:", SALIDA)


if __name__ == "__main__":
    main()
