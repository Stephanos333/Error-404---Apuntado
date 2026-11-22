# ADR-06. Organizar `backend/src/` en capas transversales con registros de persistencia propios

| Campo | Valor |
|---|---|
| **Estado** | Proposed — enmienda ADR-01 en la forma interna del monolito (el particionamiento por dominio queda como meta) |
| **Fecha** | 2026-11-22 |
| **Autor** | Equipo Error 404 |
| **Revisores** | Santiago Alvarez Muñoz, Sergio Esteban Romero Macariz, Andres Felipe Lemus Victoria, Omar Zambrano |
| **Relacionados** | ADR-01 (enmendado), ADR-03, ADR-04, ADR-05 · FF-01, FF-02, FF-03, FF-05 |

## Contexto

- **Qué decía ADR-01.** Módulos de primer nivel por dominio (`identidad`, `economia`, `sala`, `juego`,
  `reglas`, `puntaje`, `transversal`). Cada uno expone solo su `index.ts` y se organiza por dentro en
  `api/`, `aplicacion/`, `dominio/` e `infraestructura/`.
- **Punto de partida del E3.** El prototipo estaba dividido por entidades (`user`, `game`, `match`,
  `player`, `card`). Cada carpeta mezclaba controlador, servicio, modelo y esquema Mongoose. FF-03
  detectaba un ciclo entre 8 módulos y la línea base de `tests/architecture/linea-base.json` lo
  toleraba en modo trinquete.
- **Fuerzas en la fase 1 del E3:**
  1. Romper el ciclo antes de construir el agregado `partidas` (ADR-04) y el orquestador de turnos
     (ADR-05). Sin eso, el código nuevo heredaba el ciclo.
  2. No reescribir los controladores, los *guards* ni los contratos REST que el frontend ya usaba,
     para no abrir un segundo frente de regresiones con el plazo del semestre.
  3. Dejar el motor de reglas y los plug-ins aislados del framework (FF-02, FF-05).

## Alternativas evaluadas

| Criterio | A. Completar ADR-01 al pie de la letra (módulos de dominio) | **B. Capas transversales, controladores del prototipo intactos** | C. Mantener el prototipo y convivir con la línea base |
|---|---|---|---|
| Elimina el ciclo de 8 módulos | Sí | Sí | No |
| Costo en la fase 1 | Alto: mover y renombrar casi todo `src/`, y también los contratos REST | Medio: extraer `dominio/`, `aplicacion/` y `database/`; los controladores solo cambian sus imports | Nulo |
| Riesgo de regresión en el frontend | Alto | Bajo: las rutas REST y los eventos de socket no cambian | Nulo |
| Alineación con el lenguaje del negocio | Alta | Media: la lógica nueva usa términos de negocio (`partida`, `reglas`), la presentación conserva los nombres de entidad | Baja (*Entity Trap*) |
| Contención de un cambio de regla | Un dominio | `reglas/` + un plug-in | Disperso |

## Decisión

Se adopta **B**. `backend/src/` queda en capas transversales con una dirección de dependencias fija:

| Capa | Carpetas | Puede depender de | Contenido |
|---|---|---|---|
| Raíz de composición | `main.ts`, `app.module.ts`, `reglas-plugins.module.ts` | Todas | Arranque, registro de módulos y único punto que importa `plugins/` |
| Presentación | `user/`, `game/`, `match/`, `partida/`, `player/`, `card-design/`, `security/` | `aplicacion/`, `dominio/`, `shared/`, `security/` | Controladores REST, `GameSocket`, *guards*, *requests* y *responses* |
| Aplicación | `aplicacion/` | `dominio/`, `database/`, `reglas/`, `card/`, `shared/` | Servicios, `TurnOrchestrator`, consultas y *mappers* registro ↔ dominio |
| Dominio | `dominio/`, `card/` | `reglas/`, `shared/` | Agregado `Partida`, comandos puros, vistas, eventos, *value objects* y excepciones |
| Motor de reglas | `reglas/` (contrato, evaluador, registro) | Nada interno | Contrato `ReglaJuegoPlugin`, evaluador de combinaciones y `RegistroReglas` |
| Persistencia | `database/` | Nada interno | Esquemas Mongoose, `PartidaRepository`, `UnidadDeTrabajo` y **registros propios** (`database.records.ts`) |
| Transversal | `shared/` | Nada interno | Excepciones base, filtro global y utilidades |

Los plug-ins (`backend/plugins/clasica`, `backend/plugins/apuntado`) quedan fuera de `src/` y solo
conocen el contrato de `reglas/` (ADR-03).

La pieza que rompe el ciclo es la **inversión de dependencias en la persistencia**. `database/`
define sus propias interfaces de registro (`CardRecord`, `GameRecord`, `PartidaRecord`, ...) en lugar
de importar los tipos del dominio, y `aplicacion/` traduce entre ambos (`partida.mapper.ts`). Así
`database/` no importa ninguna carpeta de `src/` y no puede formar parte de un ciclo.

El particionamiento por dominio de ADR-01 sigue siendo la meta. Este ADR cambia el *cómo* y conserva
el *por qué* de ADR-01: probar el motor sin infraestructura, contener los cambios de regla y eliminar
el ciclo.

## Consecuencias

**Positivas:**

- FF-03 pasa en modo estricto con `linea-base.json` vacío: no queda ningún ciclo entre archivos ni
  entre carpetas.
- El motor de reglas y los plug-ins se prueban sin NestJS ni MongoDB (FF-05). Agregar una variante
  toca `plugins/` y la raíz de composición, nunca el orquestador (Ca de los plug-ins = 1).
- El frontend no cambió de contrato durante la refactorización.
- La dirección de dependencias se puede medir. Las métricas del capítulo 4 (`docs/metricas/`) dan
  D = 0,01 para `aplicacion/partida` y D = 0,09 para el contrato de reglas.

**Negativas / trade-offs aceptados:**

- Es un particionamiento **técnico** en el sentido de Richards & Ford (2025). Una funcionalidad de la sala de
  espera, por ejemplo, toca `game/`, `aplicacion/game/`, `dominio/game/` y `database/game.schema.ts`.
- La presentación conserva los nombres de entidad del prototipo (`user`, `game`, `match`, `player`).
  El *Entity Trap* desaparece de la lógica, pero no de los nombres de carpeta.
- `dominio/` no está libre de framework: usa `@nestjs/swagger` en los DTO y `partida.exceptions.ts`
  importa `@nestjs/common`. Solo `reglas/` y `card/` están verificadas sin framework (FF-05).
- No se puede escalar ni desplegar ninguna capa por separado (un solo *quantum*, igual que en ADR-01).

## Cumplimiento (Compliance)

Fitness functions en `tests/architecture/`, ejecutadas por el job `arquitectura` de
`.github/workflows/ci.yml` en modo trinquete y en modo estricto:

- **FF-01:** la presentación (`controller`, `socket`, `api`) no importa `database/` ni `mongoose`.
- **FF-02:** el núcleo (`dominio`, `aplicacion`, `reglas`, `partida`, `game`) no importa ningún
  plug-in concreto; la única excepción es la raíz de composición.
- **FF-03:** no hay ciclos entre archivos ni entre carpetas de `src/`. Como `aplicacion/` ya depende
  de `dominio/`, cualquier import de `dominio/` hacia `aplicacion/` falla por ciclo.
- **FF-05:** `reglas/` y `card/` no dependen de NestJS, Mongoose, Socket.IO ni RxJS.

**Hueco conocido:** ninguna regla prohíbe que `database/` o `reglas/` importen otras capas mientras
no se forme un ciclo. Hoy no lo hacen (0 imports internos, medido en esta revisión). Si se quiere
blindar, el siguiente paso es una FF-07 que verifique la tabla de dependencias de la sección
Decisión.

## Notas

- La refactorización ocurrió en la fase 1 del E3. Este ADR la registra después de los hechos, como
  pedían el checklist 3.14, el capítulo 1 (§1.4) y el capítulo 5 (§5.2).
- Si el sistema crece hacia el diseño de 100k jugadores (capítulo 5), la migración natural es agrupar
  estas capas por dominio dentro de cada módulo (`partida/{api,aplicacion,dominio,infraestructura}`),
  lo que retoma la forma de ADR-01 sin reabrir los ciclos.
