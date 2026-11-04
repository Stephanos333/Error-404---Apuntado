# ADR-05. Comunicar componentes con llamadas síncronas en memoria dentro del comando y eventos de dominio locales después del *commit*; sincronizar clientes por WebSocket con versión

| Campo | Valor |
|---|---|
| **Estado** | Proposed — reemplaza, junto con ADR-04, al "ADR-03 complementario" del E1 |
| **Fecha** | 2026-10-26 |
| **Autor** | Santiago Alvarez Muñoz (Arquitecto de aplicaciones) |
| **Revisores** | Omar Zambrano (tecnología), Andres Felipe Lemus Victoria, Sergio Esteban Romero Macariz |
| **Relacionados** | ADR-03, ADR-04 · Riesgos R03, R04, R06, R07 · FF-01, FF-03 |

## Contexto

- **Qué notificar.** El descarte de cartas, el cambio de turno, el cierre, la liquidación y las eliminaciones deben llegar a todos los jugadores en ≤ 500 ms (RNF-09). El jugador que actúa necesita respuesta en ≤ 300 ms (RNF-07).
- **Qué debe ser atómico.** La validación del cierre, la liquidación y el desenlace forman parte de la **misma unidad de consistencia** (§2.4, ADR-04).
- **Situación del prototipo:**
  - Usa el `EventBus` de `@nestjs/cqrs`, pero publica `MatchWonEvent` **antes** de liquidar a los perdedores y lanza esa liquidación de forma asíncrona sin esperarla.
  - Los eventos llevan DTO completos: `SHIFT_CHANGED` envía a toda la sala la **mano del siguiente jugador** y `MATCH_STARTED` envía el **mazo completo** (R04).
- **Pregunta de la guía.** ¿Comunicación síncrona en memoria (llamadas directas con interfaces) o desacoplada por eventos locales?

## Alternativas evaluadas

| Criterio (peso) | A. Todo síncrono (el orquestador llama al notificador, la bitácora y los temporizadores) | B. Todo por eventos locales asíncronos (incluso validación y liquidación) | **C. Híbrido: comando síncrono + eventos locales después del *commit*** | D. Broker externo (Redis Pub/Sub o Kafka) |
|---|---|---|---|---|
| Consistencia del comando (30 %) | 5 | 2 | 5 | 3 |
| Desacoplamiento de efectos secundarios (25 %) | 1 | 5 | 4 | 5 |
| Responsiveness (20 %) | 4 | 4 | 5 | 3 |
| Simplicidad y factibilidad (15 %) | 4 | 3 | 4 | 1 |
| Trazabilidad y depuración (10 %) | 4 | 2 | 4 | 3 |
| **Total ponderado** | **3,55** | **3,30** | **4,50** | **3,20** |

## Decisión

Se adopta **C**:

1. **Ruta del comando, síncrona y en memoria por interfaces:** `GameApiGateway → ITurnCommands → IRuleRegistry / ReglaJuegoPlugin → IRoundScoring → ISettlement → IGameStateStore`. Todo ocurre dentro de una **unidad de trabajo** y, cuando cruza agregados, de una transacción (ADR-04). La **bitácora** (`jugadas`) se escribe **dentro** de esa transacción, no por evento, porque la trazabilidad no puede perderse.
2. **Efectos secundarios, por eventos de dominio locales** en el `EventBus` en proceso, publicados **solo después del *commit***: `CartaRobada`, `CartaDescartada`, `TurnoCambiado`, `CierreFallido`, `JugadorTocó`, `RondaCerrada`, `RondaLiquidada`, `JugadorEliminado`, `JugadorReenganchado` y `PartidaFinalizada`. Los suscriptores son:
   - `RealtimeNotification`: sala `partida:{id}` con la **vista pública** y sala `usuario:{id}` con la **vista privada** (solo su mano).
   - `PresenceMonitor`: temporizadores.
   - Métricas.
3. **Sincronización de turnos con los clientes.**
   - El servidor es la **única autoridad**: el cliente envía intenciones, nunca resultados.
   - Cada evento lleva `{partidaId, version}`. El cliente los aplica en orden; si detecta un salto o se reconecta, pide `GET /partidas/{id}/estado` (RF-14).
   - Al reconectarse vuelve a unirse a sus salas de WebSocket.
4. **Sin broker externo.** Hay un solo quantum y una sola instancia de Socket.IO. Si algún día se necesita escalar horizontalmente, se agrega el adaptador Redis de Socket.IO sin cambiar el dominio.
5. **Despliegue en un host con WebSockets persistentes**, no *serverless* (R06).

## Consecuencias

**Positivas:**

- El comando es consistente y nunca notifica algo que no ocurrió.
- Las notificaciones están desacopladas del dominio: el orquestador no conoce Socket.IO.
- La latencia es mínima, porque todo ocurre en memoria.
- Se eliminan las fugas de información gracias a las vistas filtradas.

**Negativas / trade-offs aceptados:**

- Si el proceso cae **entre** el *commit* y el despacho de un evento, ese evento se pierde. Es aceptable porque el estado persistido es la fuente de verdad: el cliente lo recupera al detectar el salto de versión o al reconectarse. Se descarta un *outbox* transaccional por costo.
- La cadena síncrona acopla al orquestador con varias interfaces, lo que se mitiga con los contratos y FF-03.
- Ningún suscriptor puede alterar el resultado del comando.

## Cumplimiento (Compliance)

| Verificación | Tipo |
|---|---|
| Prueba de contrato de mensajes: ningún evento enviado a `partida:{id}` contiene `manos`, `mazo`, `cardsMap` ni cartas de otro jugador | Prueba automatizada (backend) |
| Prueba unitaria: si `guardar()` falla, **no** se publica ningún evento | Prueba automatizada |
| FF-01 (la presentación y el gateway no acceden a persistencia) y FF-03 (sin ciclos: los eventos evitan dependencias `puntaje ↔ juego`) | Fitness functions automatizadas |
| Latencia: p95 de acuse ≤ 300 ms y propagación ≤ 500 ms con 50 partidas | Prueba de carga (k6 / Artillery) |

## Notas

Este ADR integra el "servidor autoritativo" y el "persistir antes de notificar" del ADR-03 complementario del E1.
