# Prueba funcional del equipo con 5 cuentas (26/11/2026)

Prueba ejecutada por el equipo en el entorno local (`docker compose`, MongoDB `rs0`) con el protocolo de la sección 3.1 del informe. **No es la sesión con usuarios externos**: las 5 cuentas son de prueba y sus turnos los operó el equipo. Por eso aquí no hay tiempos por turno de personas ni encuesta SUS; esos datos salen de la sesión con usuarios (`docs/validacion/protocolo-sesion-usuarios.md`).

## Cómo se ejecutó

- **Cuentas:** `pruebaana` se registró y cambió su avatar desde la interfaz. `PruebaBeto`, `PruebaCaro`, `PruebaDani` y `PruebaEli` se crearon con `POST /api/user` y cambiaron su avatar con `PATCH /api/user/icon`.
- **Mesa Apuntado:** la creó `pruebaana` desde la interfaz: privada, 5 jugadores y apuesta de 5 fichas. Los otros 4 entraron con `PATCH /api/game/join`. La partida la inició el anfitrión desde la interfaz.
- **Primer turno de `pruebaana`:** se jugó desde la interfaz. Robó del mazo, armó 3 grupos que no combinan, intentó tocar, confirmó el diálogo de advertencia y descartó.
- **Resto de los turnos:** los ejecutó un script del equipo con los mismos comandos REST que envía el tablero (`draw`, `discard` y `close`, con `version` y `commandId`). El script cierra con 4-3-3 o toca cuando la mano lo permite y, si no, descarta la carta menos útil y envía sus mejores grupos.
- **Mesa Clásica:** la creó `PruebaBeto` desde la interfaz (pública, 3 jugadores). `PruebaDani` y `PruebaEli` entraron por la API.
- **Latencia:** se midió en el cliente, de extremo a extremo por cada comando HTTP, en la misma máquina que los contenedores.

## Resultados por cuenta

| Cuenta | Modalidad probada | ¿Cerró una ronda válida? | Errores e incidencias | Turnos jugados |
|---|---|---|---|---|
| pruebaana | Apuntado | No. Hizo 1 cierre inválido deliberado: `CLOSE_FAILED`, +3 y el turno siguió | Eliminada en la ronda 2 con 121 pts. Su tablero mantuvo la mano anterior hasta recargar (INC-06) | 8 |
| PruebaBeto | Apuntado y Clásica | No | Eliminado en la ronda 6 con 163 pts | 36 + 5 |
| PruebaCaro | Apuntado | Sí: 2 cierres 4-3-3 y 4 toques | Ganó la partida con 96 pts y cobró el pozo de 25 fichas una sola vez | 60 |
| PruebaDani | Apuntado y Clásica | Sí: 1 cierre 4-3-3 (ronda 2) | Eliminado en la ronda 4 con 148 pts | 26 + 4 |
| PruebaEli | Apuntado y Clásica | Sí: 2 toques en Apuntado y 1 cierre 4-3-3 en Clásica, con el que ganó 15 fichas | En Apuntado terminó con 103 pts en la ronda 9. La pantalla de resultados de Clásica decía «Se jugaron 0 rondas» (INC-07) | 59 + 5 |

## Marcador de la partida de Apuntado (puntos acumulados)

| Ronda | Cierre | pruebaana | PruebaBeto | PruebaCaro | PruebaDani | PruebaEli |
|---|---|---:|---:|---:|---:|---:|
| 1 | Toque de PruebaEli | 63 (incluye +3) | 10 | 23 | 68 | 3 |
| 2 | 4-3-3 de PruebaDani (−10) | **121, eliminada** | 32 | 72 | 58 | 33 |
| 3 | Toque de PruebaCaro | — | 48 | 74 | 68 | 38 |
| 4 | 4-3-3 de PruebaCaro (−10) | — | 68 | 64 | **148, eliminado** | 54 |
| 5 | 4-3-3 de PruebaCaro (−10) | — | 87 | 54 | — | 64 |
| 6 | Toque de PruebaEli | — | **163, eliminado** | 86 | — | 68 |
| 7 | Toque de PruebaCaro | — | — | 90 | — | 79 |
| 8 | Toque de PruebaCaro | — | — | 94 | — | 91 |
| 9 | Toque de PruebaCaro | — | — | **96, gana** | — | 103 |

**Fichas al terminar:** PruebaCaro 120, PruebaEli 105, pruebaana 95, PruebaBeto 90 y PruebaDani 90. Suman 500, que son las 5 × 100 fichas iniciales: ninguna se creó ni se perdió, y cada pozo se pagó una sola vez.

## Métricas del sistema

| Indicador | Apuntado (5 cuentas, 9 rondas) | Clásica (3 cuentas, 1 ronda) |
|---|---|---|
| Comandos ejecutados | 388: 189 `draw`, 189 `discard` y 10 `close`, de ellos 3 desde la interfaz | 29: 14 `draw`, 14 `discard` y 1 `close` |
| Respuestas con error (4xx/5xx) en comandos | 0 | 0 |
| Cierres válidos / inválidos | 9 / 1 (el deliberado) | 1 / 0 |
| Latencia por comando (cliente, local) | media 9,4 ms · p50 9 ms · p95 12 ms · máx. 19 ms | media 9,9 ms · p50 9 ms · p95 11 ms · máx. 14 ms |
| Notificaciones (`notifyMatch`) | 389: versión 0 al iniciar y una por comando, hasta la 388 | 30: versión 0 al iniciar y una por comando, hasta la 29 |

En el registro de Nginx (`sesion-prueba-logs-frontend-nginx.log`) los 417 comandos (`draw`, `discard` y `close`) de las dos partidas respondieron 200. Los únicos errores de la API en la sesión fueron estos:

- un 404 al iniciar sesión con «PruebaAna», porque la interfaz guarda el nombre en minúsculas (`pruebaana`);
- cuatro 403 `USER_IS_NOT_PART_OF_A_GAME_ERROR` al consultar `/api/matches/current` después de terminar cada partida, que es lo esperado.

**Observación de rendimiento (R09):** los guardias de autorización consultan la base en cada petición. El backend registró 2.684 llamadas a `GameService.getById`, 2.676 a `PlayerService.getActiveByUserId` y 2.676 a `GameService.getNotFinishedByPlayer`: unas 6 por petición, sobre las 1.390 peticiones a `/api` del registro de Nginx. Es el costo que la sección 5.3 propone llevar a una caché.

## Hallazgos y ajustes

| ID | Severidad | Hallazgo | Ajuste | Evidencia |
|---|---|---|---|---|
| INC-06 | Media | Al quedar eliminado, el tablero mantenía la mano de la ronda anterior hasta recargar: el servidor ya no la reparte (`hand: null`) y no envía un mensaje privado | `handAfterPublicUpdate` descarta la mano al llegar la vista pública con el jugador `ELIMINATED`; prueba en `match.utils.test.ts` | Capturas 14 y 15 (antes), 19 (después) |
| INC-07 | Baja | En Clásica la pantalla de resultados decía «Se jugaron 0 rondas»: la modalidad no lleva marcador | La pantalla dice quién cerró con 4-3-3 | Captura 18 (antes), 20 (después) |

## Archivos

- **Capturas:** `sesion-prueba-01` a `sesion-prueba-20` (`.jpg`).
- **Logs del backend:** `sesion-prueba-logs-backend.log`. Es la copia literal de `docker compose logs backend` desde las 13:20 UTC, sin los códigos de color.
- **Logs de Nginx:** `sesion-prueba-logs-frontend-nginx.log`, con las peticiones HTTP y sus códigos de respuesta.
