# ADR-04. Persistir en MongoDB con la Partida como agregado documental, validadores JSON Schema y transacciones solo entre agregados

| Campo | Valor |
|---|---|
| **Estado** | Proposed — reemplaza, junto con ADR-05, al "ADR-03 complementario" del E1 |
| **Fecha** | 2026-10-26 |
| **Autor** | Santiago Alvarez Muñoz (Arquitecto de aplicaciones) |
| **Revisores** | Andres Felipe Lemus Victoria (datos), Omar Zambrano, Sergio Esteban Romero Macariz |
| **Relacionados** | ADR-01, ADR-03, ADR-05 · Riesgos R02, R03, R13 · FF-01, FF-06 |

## Contexto

- **Qué debe representar el modelo de datos:**
  - Partidas **atómicas** (Clásica) y partidas **multironda acumulativas** (Apuntado, relación 1:N partida–rondas, hasta ≥ 101).
  - Sesiones, salas, jugadores y manos.
  - **Trazabilidad** de descartes, robos y estados de ronda.
  - **Historial de penalizaciones** y marcadores.
- **Situación del prototipo:**
  - Ya usa MongoDB con Mongoose, pero **sin validadores, sin control de versión** y repartiendo una acción entre tres colecciones (de los modelos `Game`, `Match` y `Player`).
  - Cada acción hace leer-modificar-escribir en varias colecciones, sin transacción.
  - La liquidación de perdedores se ejecuta en segundo plano después de responder (`updateLoserPlayers(...).then(...)`), un jugador a la vez. Si el proceso cae a mitad, quedan **penalizaciones parciales** (R02).
- **Características que pesan:** integridad de la puntuación (RNF-14), recuperación ≤ 30 s (RNF-08), validación ≤ 200 ms (RNF-06) y factibilidad (RNF-20).

## Alternativas evaluadas

| Criterio (peso) | A. PostgreSQL relacional (E-R, 3FN) | **B. MongoDB documental (agregado por documento)** | C. SQLite embebida | D. Híbrido: MongoDB (juego) + PostgreSQL (libro de tokens) |
|---|---|---|---|---|
| Ajuste al agregado Partida (25 %) | 3 | 5 | 3 | 5 |
| Consistencia y transacciones (25 %) | 5 | 4 | 4 | 3 |
| Flexibilidad para variantes (20 %) | 2 | 5 | 2 | 5 |
| Factibilidad: equipo, código actual, costo (20 %) | 2 | 5 | 3 | 2 |
| Consultas analíticas y reportes (10 %) | 5 | 3 | 3 | 4 |
| **Total ponderado** | **3,30** | **4,55** | **3,05** | **3,80** |

- **A** es excelente en consistencia, pero reparte la partida en 6 o más tablas: cada comando necesita *joins* y un mapeo ORM. Además obliga a migrar el prototipo.
- **C** no sobrevive a contenedores efímeros ni a réplicas.
- **D** obliga a coordinar transacciones **entre dos motores** para pagar el pozo, lo que rompe la atomicidad del desenlace.

## Decisión

Se adopta **MongoDB Atlas (replica set) con una base lógica** y colecciones con dueño por dominio:

1. **Agregado Partida en un documento** (`partidas`), con sala, configuración congelada, jugadores, pozo, ronda actual (mazo, pozo de descarte, manos, turno) y marcador. Es la **frontera de consistencia**: todo comando de juego es una escritura atómica sobre él.
2. **Bitácora** `jugadas` con el **patrón *bucket*** (un documento por partida y ronda). Da trazabilidad de robos, descartes, castigos, turnos automáticos, eliminaciones y reenganches sin inflar el documento caliente.
3. **Libro de tokens** `asientos_tokens` *append-only*, con `referencia` única para la idempotencia; `usuarios.saldoTokens` es una caché.
4. **Validadores `$jsonSchema` estrictos** (`docs/schemas/*.schema.json`, `validationLevel: strict`). Incluyen reglas de dominio expresables en el esquema: la Clásica no admite reenganche ni −51; una mano tiene 10 u 11 cartas.
5. **Control de concurrencia optimista** con `version`, guardas de estado y turno en el filtro, e **idempotencia** con `idComando`.
6. **Transacciones multi-documento** (`withTransaction`, `snapshot`, `majority`) **solo** cuando un comando cruza agregados: partida + bitácora + libro (cierre, apuestas, reenganche, pago del pozo, aprobación de recargas).
7. **Persistir antes de notificar** (heredado del ADR-03 complementario del E1). La base es la fuente de verdad y las notificaciones son una consecuencia (ADR-05).
8. **Migración del prototipo:** `games` + `matches` + `players` pasan a `partidas`; `card-designs` pasa a `disenos_carta`; los tokens se recalculan a asientos `SALDO_INICIAL`.

## Consecuencias

**Positivas:**

- Una lectura y una escritura por comando.
- El cierre y la liquidación son atómicos: no hay penalizaciones parciales.
- El esquema es flexible para variantes nuevas (Continental cabe sin migrar tablas).
- Se reutiliza la tecnología del prototipo y el plan gratuito de Atlas.

**Negativas / trade-offs aceptados:**

- No hay llaves foráneas: la integridad referencial queda a cargo de la aplicación y los validadores.
- Se denormaliza `nombreUsuario`.
- Las transacciones exigen un *replica set*. En desarrollo local se usa un nodo con `--replSet`.
- Los reportes analíticos requieren *aggregation pipelines*.
- Existe el límite de 16 MB por documento, que se mitiga con el *bucket* de jugadas (R13).

## Cumplimiento (Compliance)

| Verificación | Tipo |
|---|---|
| FF-06: los validadores compilan, aceptan los ejemplos de ambas modalidades y **rechazan** estados inválidos (Clásica con reenganche, mano con más de 11 cartas, contraseña sin argon2id) | Fitness function automatizada (`tests/architecture/ff06-esquemas-datos.spec.ts`) |
| FF-01: la presentación no accede a `database/` ni a `mongoose` | Fitness function automatizada |
| Prueba de integración de concurrencia: dos cierres simultáneos → exactamente uno confirmado, el otro recibe `RONDA_YA_CERRADA` | Prueba automatizada (backend, con *replica set* de prueba) |
| Prueba de caos: matar el proceso a mitad del cierre → la partida queda en el estado anterior o en el siguiente, nunca en uno intermedio | Prueba automatizada |
| Conciliación diaria: `saldo = Σ asientos` y `pozo = Σ apuestas + Σ reenganches` | Job programado con alerta |
| Alerta si un documento de `partidas` supera 1 MB | Métrica operativa |

## Notas

Los esquemas, el script `crear-colecciones.mongodb.js` y los ejemplos están en `docs/schemas/`.
