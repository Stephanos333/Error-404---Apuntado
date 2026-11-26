# Guion de la demostración en vivo (sustentación del Entregable 3)

Duración objetivo: **15 minutos** (13 de demostración y 2 de preguntas). Hay una versión de 10 minutos al
final. Ambiente: producción en Render, **https://error-404-apuntado.onrender.com**.

---

## 1. Roles

| Expositor | Rol en la demo | Pantalla que controla |
|---|---|---|
| **E1** | **U1, anfitrión.** Crea la sala, inicia la partida y juega. | Navegador A (Chrome, ventana normal), mitad izquierda del proyector |
| **E2** | **U2, invitado.** Se une por enlace y juega. | Navegador B (Firefox o ventana privada), mitad derecha del proyector, con DevTools abiertas |
| **E3** | **Narrador de arquitectura.** Conduce el hilo y explica cada decisión. | Diapositivas con los diagramas de `diagramas/entregable-3/` |
| **E4** | **Evidencias y plan B.** Swagger, GitHub Actions, métricas y video de respaldo. | Pestañas preparadas (lista de la sección 2) |

Si el equipo expone con tres personas, E3 asume también el papel de E4.

---

## 2. Preparación (30 minutos antes)

| ✔ | Tarea | Por qué |
|---|---|---|
| ☐ | Abrir la URL del frontend y `https://error-404-apuntado-backend.onrender.com/docs` y esperar a que respondan | Los servicios de Render pueden "dormirse" por inactividad y tardar cerca de un minuto en despertar |
| ☐ | Tener **cuatro cuentas creadas** (U1 y U2 para Apuntado; U3 y U4 para Clásica) con al menos 20 tokens cada una y la sesión iniciada en cuatro navegadores o perfiles | El registro no aporta nada arquitectónico y consume tiempo; un usuario solo puede estar en una partida a la vez |
| ☐ | Comprobar que ninguna de las dos cuentas tiene una sala pendiente (no debe aparecer el *banner* de "partida en curso" en el inicio) | Si quedó una, usar "Cancelar sala" antes de empezar (INC-01) |
| ☐ | En el navegador B: DevTools → **Network → WS**, con el filtro de mensajes listo | Para mostrar las salas pública y privada (R04) |
| ☐ | Pestaña de **Swagger** (`/docs`) y, en un bloc de notas, los tokens de **U1 y U2** (DevTools → Application → Local Storage → `KEY_ACCESS_TOKEN`) | Para enviar un comando fuera de turno con el token de quien no tiene el turno |
| ☐ | Pestaña de **GitHub Actions** con la última ejecución de `CI/CD` abierta en el resumen del job `arquitectura` | Evidencia de las puertas de calidad y las métricas |
| ☐ | Captura o terminal con la salida de `npm run test:e2e` (8/8) y de `npm run test:strict` (28/28) | Respaldo si no hay red para mostrar el pipeline |
| ☐ | **Video de respaldo (60 a 90 s) en dos clips:** (1) Apuntado: un *tocar* válido, la ronda extra y la liquidación con el inicio de la ronda 2; (2) Clásica: un 4-3-3 válido, la pantalla del ganador y el saldo actualizado | Ver la advertencia de abajo. Una partida de Apuntado solo termina cuando alguien llega a 101 o a -51, lo que toma muchas rondas; la Clásica termina con el primer 4-3-3 |
| ☐ | Diapositivas con los diagramas 01 (despliegue), 02 (secuencia del cierre) y 04 (escalabilidad) | Apoyo visual de E3 |

> **Advertencia importante.** El mazo se baraja con un generador criptográficamente seguro
> (`BarajadorSeguro`, `crypto.randomInt`): **no se puede preparar una mano** para tocar en vivo, y
> hacerlo sería una trampa que la propia arquitectura impide. Lo determinista en vivo es el flujo de
> la sala, los turnos, la sincronización, el rechazo de un cierre inválido y el rechazo fuera de turno.
> *Tocar* con menos de 5 puntos, la ronda extra y la liquidación se muestran en vivo **solo si la mano
> lo permite**; si no, se usa el video. Grábenlo antes: jueguen una partida de Apuntado de 2 jugadores
> hasta que ocurra un toque válido.

### Ajustes para cumplir la pauta oficial de la sustentación

La pauta pide **jugar una ronda en Clásica y una en Apuntado** y **terminar comprobando el pipeline
CI/CD en ejecución**. Para cubrirla:

1. **Pipeline en ejecución.** Al empezar la demo (minuto 0), E4 pulsa **"Re-run all jobs"** en la
   última ejecución de `CI/CD` del PR hacia `main`. El pipeline tarda varios minutos, y en el bloque
   de evidencias (11:30) se muestra terminado en verde. Antes de la sustentación, comprueben que ya
   hubo al menos una ejecución completa en verde.
2. **Clásica en vivo.** Un usuario solo puede estar en una partida a la vez, así que la mesa
   Clásica la juegan **E3 y E4 con dos cuentas adicionales (U3 y U4)** en otros dos navegadores.
   La crean y la inician durante el bloque de turnos de la mesa de Apuntado, y en el bloque de
   cierre (08:00) muestran un turno y un 4-3-3 inválido que se rechaza **sin castigo**. La
   diferencia con el +3 de Apuntado la decide el plug-in, no el núcleo. Esto suma unos 2 minutos:
   recorten la apertura y las preguntas.
3. **Rondas completas.** Si ninguna mano permite cerrar en vivo, los dos clips del video muestran
   una ronda completa de cada modalidad. Explíquenlo antes de reproducirlos, con la frase de la
   sección 4: el barajado seguro impide preparar las manos.

---

## 3. Guion cronológico

### 00:00 – 01:30 · Apertura y contexto (E3)

- **Pantalla:** diagrama 01 de despliegue.
- **Qué decir:** "El MVP corre en producción: una SPA React servida por Nginx, un backend NestJS con
  REST y WebSockets, y MongoDB como *replica set*. Las tres características que guiaron la
  arquitectura son extensibilidad de reglas, testabilidad del motor y respuesta en tiempo real."
- **Aspecto arquitectural:** estilo *microkernel* dentro de un monolito modular (ADR-03). El núcleo
  orquesta los turnos y dos plug-ins, Clásica y Apuntado, deciden las reglas.

### 01:30 – 02:30 · Inicio de sesión y pantalla principal (E1 y E2)

| Paso | Quién | Acción | Resultado esperado |
|---|---|---|---|
| 1 | E1 | Muestra el inicio de U1: saldo de tokens, ícono y el botón del tutorial | Saldo visible (anótenlo para compararlo al final) |
| 2 | E1 | Abre el **PDF de reglas** unos segundos y lo cierra | Manual con las reglas reales de las dos modalidades |
| 3 | E2 | Muestra el inicio de U2 | Mismo estado, otra cuenta |

- **Aspecto arquitectural (E3):** autenticación sin estado con JWT. El servidor no guarda sesiones en
  memoria, y por eso se puede replicar (§5.4 del capítulo 5).

### 02:30 – 04:30 · Crear la sala e invitar (E1 → E2)

| Paso | Quién | Acción | Resultado esperado |
|---|---|---|---|
| 4 | E1 | "Crear partida": modalidad **Apuntado a 101**, **2 jugadores**, apuesta **10**, **privada** | Entra a la sala de espera como anfitrión |
| 5 | E1 | Pulsa "Compartir" y pega el enlace en el chat del equipo | Enlace absoluto con `#/game/join?...` (corrección INC-03) |
| 6 | E2 | Abre el enlace | U2 aparece **una sola vez** en la sala de ambos navegadores, sin recargar |
| 7 | E1 | Pulsa "Iniciar" | Los dos navegadores pasan al tablero al mismo tiempo |

- **Aspectos arquitecturales (E3):**
  - La sala se sincroniza por WebSocket. La duplicación de jugadores que encontró la validación con
    usuarios (INC-02) se corrigió con un filtro `isActive` y la limpieza de *listeners* (capítulo 3).
  - Al iniciar, las apuestas se cobran **en una transacción** junto con la creación de la partida. Un
    doble clic en "Iniciar" no cobra dos veces: lo prueba un e2e.
  - La modalidad queda **congelada** en la partida (`configuracion.plugin.id`). Las reglas no pueden
    cambiar a mitad del juego.

### 04:30 – 08:00 · Dinámica de turnos en tiempo real (E1, E2 y E4)

El orden de los jugadores **se sortea al iniciar**: puede abrir U1 o U2. En esta tabla, **A** es quien
abre y **B** el otro. El panel superior del tablero dice a quién le toca.

| Paso | Quién | Acción | Resultado esperado | Qué destacar |
|---|---|---|---|---|
| 8 | E4 | En Swagger, con el token de **B**, ejecuta `POST /api/matches/current/commands/draw` con `{"origen": "MAZO", "version": 0, "idComando": "demo-fuera-de-turno"}` | **409** con `TURNO_NO_CORRESPONDE` | El servidor es la única autoridad: la interfaz deshabilita los botones, pero quien decide es el backend |
| 9 | A | Señala el estado: "Tu turno: organiza tus grupos y descarta". Tiene 11 cartas y no roba | — | La fase del turno la decide el servidor |
| 10 | A | Selecciona 3 cartas → **"Formar grupo"**; luego selecciona una carta suelta → **"Descartar"** | En ambos navegadores: cambia el turno, se ve el tope del pozo y A queda con 10 cartas | Un comando = una escritura condicional por versión |
| 11 | E2 | En **DevTools → WS** del navegador B, abre el último mensaje `SHIFT_CHANGED_LISTENER` | Trae la vista pública: tope del pozo, turno y solo **cuántas** cartas tiene cada jugador (`cartasEnMano`), nunca cuáles | **R04:** la sala pública `partida:{gameId}` no recibe cartas |
| 12 | B | Roba del **mazo** (clic en el mazo) | B tiene 11 cartas; el otro navegador solo ve que B tiene 11 | En DevTools de B aparece `PRIVATE_HAND_LISTENER` con **su** mano: llega por la sala privada `usuario:{userId}` |
| 13 | B | Pulsa **F5** en medio del turno | El tablero vuelve exactamente al mismo estado | **R07:** `GET /api/matches/current` + versión; el cliente nunca retrocede |
| 14 | B | Forma un grupo y descarta | Vuelve el turno de A | — |

Si B es U1, el paso 11 se mira en las DevTools del navegador A; conviene abrirlas en los dos.

**Plan B del paso 8:** si Swagger falla, mostrar la captura de la prueba e2e "una versión
desactualizada se rechaza sin escribir".

### 08:00 – 10:00 · Intento de cierre y decisión del plug-in (A)

Este paso **siempre** se puede hacer en vivo, porque demuestra un rechazo.

| Paso | Quién | Acción | Resultado esperado |
|---|---|---|---|
| 15 | A | En su turno, después de robar, forma **3 grupos de 3 cartas** cualesquiera (que no sean combinaciones válidas), deja **una carta suelta de 2, 3 o 4**, selecciona otra suelta como descarte y pulsa **"Cerrar / Tocar (< 5 pts)"** | Aviso "Tu declaración no cierra: se aplicó el castigo de la modalidad" y **+3 puntos** en la lista de jugadores; el botón de cierre queda deshabilitado en ese turno |
| 16 | A | Descarta normalmente | El turno pasa a B |

- **Aspectos arquitecturales (E3), con el diagrama 02 de secuencia:**
  - La interfaz solo comprobó la **forma** (3 ternas + 1 sobrante). Las ternas **inválidas** las
    rechazó el plug-in `ReglaApuntadoPlugin` en el servidor.
  - El núcleo no conoce el número 3: aplica el `EfectoCierre` que devuelve el plug-in.
  - "Si mañana agregamos Continental, este flujo no cambia: se agrega un paquete en
    `backend/plugins/`." (FF-02 lo vigila en cada PR.)
- **Si la mano de alguno permite un cierre real** (3 ternas válidas + sobrante de 2, 3 o 4, o un
  4-3-3), háganlo en vivo y salten al bloque siguiente sin video.

### 10:00 – 11:30 · Tocar, ronda extra, liquidación y pozo (video o en vivo; narra E3)

Reproducir el video de respaldo, o seguir en vivo si se dio el caso:

| Momento | Qué se ve | Qué destacar |
|---|---|---|
| **Tocar** | El jugador forma 3 ternas válidas, deja una sobrante de menos de 5 puntos y pulsa "Cerrar / Tocar" | El servidor valida con el evaluador algorítmico (oráculo de 260 ternas y 299 cuartas) |
| **Ronda extra** | Mensaje "Un jugador tocó: te queda un último turno"; el panel muestra "Ronda extra: X tocó. Falta: Y" | La ronda pasa a `RONDA_EXTRA` con la lista de pendientes en orden de turno |
| **Último turno del rival** | El rival roba y descarta | Ese descarte **liquida** la ronda: todos, incluido quien tocó, suman sus cartas no combinadas |
| **Liquidación** | Los puntajes cambian en la lista de jugadores; empieza una ronda nueva (o termina la partida) | La liquidación, el marcador y el reparto de la ronda nueva se calculan en memoria y se guardan en **una sola escritura** |
| **Fin y pozo** (clip de Clásica) | Un 4-3-3 válido termina la partida: pantalla del ganador con el pozo y, al volver al inicio, el saldo del ganador aumentó | El pago del pozo va en la **misma transacción** que la escritura final; la referencia única `PREMIO_POZO:{partidaId}` impide pagar dos veces |

### 11:30 – 13:00 · Evidencias de calidad (E4)

| Paso | Pantalla | Qué mostrar | Qué decir |
|---|---|---|---|
| 17 | GitHub Actions | Los 5 jobs del workflow `CI/CD` | "Nada llega a `main` sin pasar arquitectura, backend, frontend y contenedores; el despliegue solo se dispara después." |
| 18 | Resumen del job `arquitectura` | Tabla de métricas | "El contrato tiene distancia 0,09 a la secuencia principal y los plug-ins solo los conoce la raíz de composición. La función más compleja del núcleo tiene CC 7, con un umbral de 10." |
| 19 | Captura o terminal | `test:e2e` 8/8 | "Dos jugadores cierran a la vez: exactamente uno gana y el pozo se paga una vez; el otro recibe 409 `RONDA_YA_CERRADA`." |
| 20 | Captura o terminal | `test:strict` 28/28 | "Las 28 fitness functions pasan en modo estricto, con la línea base de deuda vacía." |

### 13:00 – 15:00 · Cierre, escalabilidad y preguntas (E3)

- **Pantalla:** diagrama 04 de escalabilidad.
- **Qué decir:**
  - "Para llegar a 100.000 jugadores agregamos un adaptador de Redis para Socket.IO, caché,
    *sharding* de MongoDB por partida y autoescalado en Kubernetes. El dominio y los plug-ins no
    cambian."
  - Mencionar con transparencia los riesgos abiertos: **contraseñas con SHA-256 (R12)** y **sin
    temporizador de abandono (R08)**. Están documentados en el capítulo 5 con su plan de mitigación.
- Abrir preguntas.

---

## 4. Preguntas probables y respuestas cortas

| Pregunta | Respuesta (con evidencia) |
|---|---|
| ¿Por qué microkernel y no microservicios? | Un equipo de 4 en un semestre, latencia en memoria y un solo despliegue. El microkernel da la extensibilidad sin el costo operativo (ADR-01: 4,60 frente a 3,10; ADR-03). |
| ¿Qué pasa si dos jugadores cierran al mismo tiempo? | Escritura condicional por `version`: uno gana; el otro recibe 409 `RONDA_YA_CERRADA`. Probado con un *replica set* real (e2e 8/8). |
| ¿Cómo evitan que un jugador vea las cartas del otro? | Salas separadas y vistas filtradas; una prueba revisa en profundidad cada mensaje público. Además, el comando se valida en el servidor. |
| ¿Por qué los comandos van por REST y no por el socket? | Semántica clara de errores (409), idempotencia por `idComando` y pruebas sencillas. El socket solo notifica estados ya confirmados (ADR-05). |
| ¿Qué pasa si se cae el servidor después de guardar y antes de notificar? | El evento se pierde, pero el estado está guardado: el cliente detecta el salto de versión o se reconecta y relee `GET /api/matches/current`. Es un *trade-off* aceptado en ADR-05. |
| ¿Cómo agregarían una modalidad nueva? | Un paquete en `backend/plugins/<id>/` que implemente `ReglaJuegoPlugin` y una línea en `ReglasPluginsModule`. El registro valida el contrato al arrancar. |
| ¿Por qué no se demostró *tocar* en vivo? | Porque el barajado es criptográficamente seguro: no se puede preparar una mano. Es la misma propiedad que evita las trampas. |
| ¿Qué falta para producción real? | Migrar contraseñas a argon2id (R12), temporizadores de abandono (R08) y una prueba de carga (R09). Capítulo 5, §5.3. |

---

## 5. Versión corta (10 minutos)

| Tiempo | Bloque |
|---|---|
| 00:00 – 01:00 | Apertura (diagrama 01) |
| 01:00 – 03:00 | Crear la sala, invitar e iniciar (pasos 4 a 7) |
| 03:00 – 05:30 | Turnos: descarte, mensajes WS (R04) y F5 (R07); pasos 10 a 13 |
| 05:30 – 07:00 | Cierre inválido con castigo (paso 15) |
| 07:00 – 08:30 | Video: tocar, ronda extra, liquidación y pozo |
| 08:30 – 10:00 | GitHub Actions + e2e de concurrencia + preguntas |

---

## 6. Si algo falla en vivo

| Falla | Acción inmediata |
|---|---|
| Render tarda en despertar | E3 sigue con el diagrama 01 mientras E1 recarga; por eso se calienta 30 minutos antes |
| Una cuenta quedó en una sala anterior | "Cancelar sala" desde el *banner* del inicio (INC-01) y volver a crear |
| El invitado no aparece en la sala | Esperar 2 s (sondeo de respaldo) o recargar; si persiste, salir y volver a entrar con el enlace |
| Se cae la red del auditorio | Pasar al video completo y a las capturas de las pruebas |
| El tablero se desincroniza | F5: el cliente relee el estado (es una demostración de R07, no un error) |
