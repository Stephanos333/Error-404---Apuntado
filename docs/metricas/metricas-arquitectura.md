# Métricas estructurales del backend

Generado por `tests/architecture/metrics.ts` (`npm run metrics`) el 2026-11-26.

Resumen: 29 componentes · D media 0.36 · 20 cerca de la secuencia principal (D ≤ 0.5) · 9 en la zona de dolor · 0 en la zona de inutilidad.

## Complejidad ciclomática

| Alcance | Funciones | Media | Mediana | P90 | Máxima | Umbral | Sobre el umbral |
|---|---:|---:|---:|---:|---:|---:|---:|
| núcleo y plug-ins (FF-04) | 218 | 1.67 | 1 | 3 | 7 | 10 | 0 |
| backend completo | 473 | 1.57 | 1 | 3 | 8 | 15 | 0 |

| Alcance | Ubicación | Función | CC |
|---|---|---|---:|
| núcleo y plug-ins (FF-04) | `backend/src/application/match/turn-orchestrator.service.ts:229` | resolveConflict | 7 |
| núcleo y plug-ins (FF-04) | `backend/src/domain/match/match-commands.ts:164` | validateGroups | 6 |
| núcleo y plug-ins (FF-04) | `backend/src/application/match/turn-orchestrator.service.ts:184` | execute | 5 |
| núcleo y plug-ins (FF-04) | `backend/src/domain/match/match-commands.ts:358` | attemptClose | 5 |
| núcleo y plug-ins (FF-04) | `backend/src/domain/match/match-commands.ts:463` | concludeRound | 5 |
| backend completo | `backend/src/shared/exceptions/app.exception-filter.ts:25` | resolveMessage | 8 |
| backend completo | `backend/src/application/match/turn-orchestrator.service.ts:229` | resolveConflict | 7 |
| backend completo | `backend/src/domain/player/player.ts:253` | changeStatus | 7 |
| backend completo | `backend/src/application/game/game.service.ts:222` | leaveOrCancel | 6 |
| backend completo | `backend/src/domain/match/match-commands.ts:164` | validateGroups | 6 |

## Acoplamiento, inestabilidad, abstracción y distancia

| Componente | Archivos | Ca | Ce | I | Na/(Na+Nc) | A | D | Zona |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `plugins/apuntado` | 2 | 1 | 2 | 0.67 | 1/2 | 0.50 | 0.17 | secuencia principal |
| `plugins/classic` | 2 | 1 | 2 | 0.67 | 0/1 | 0.00 | 0.33 | secuencia principal |
| `src/(root)` | 3 | 0 | 13 | 1.00 | 0/7 | 0.00 | 0.00 | secuencia principal |
| `src/application` | 1 | 7 | 7 | 0.50 | 0/1 | 0.00 | 0.50 | secuencia principal |
| `src/application/card-design` | 2 | 3 | 3 | 0.50 | 1/2 | 0.50 | 0.00 | secuencia principal |
| `src/application/game` | 1 | 3 | 8 | 0.73 | 0/1 | 0.00 | 0.27 | secuencia principal |
| `src/application/match` | 3 | 5 | 8 | 0.62 | 3/8 | 0.38 | 0.01 | secuencia principal |
| `src/application/player` | 2 | 4 | 4 | 0.50 | 1/2 | 0.50 | 0.00 | secuencia principal |
| `src/application/user` | 1 | 6 | 3 | 0.33 | 0/1 | 0.00 | 0.67 | zona de dolor |
| `src/card` | 11 | 6 | 1 | 0.14 | 0/8 | 0.00 | 0.86 | zona de dolor |
| `src/card-design` | 5 | 1 | 7 | 0.88 | 0/5 | 0.00 | 0.13 | secuencia principal |
| `src/database` | 11 | 6 | 0 | 0.00 | 9/13 | 0.69 | 0.31 | secuencia principal |
| `src/domain/card` | 1 | 1 | 1 | 0.50 | 0/1 | 0.00 | 0.50 | secuencia principal |
| `src/domain/card-design` | 4 | 4 | 2 | 0.33 | 0/5 | 0.00 | 0.67 | zona de dolor |
| `src/domain/events` | 3 | 3 | 4 | 0.57 | 0/3 | 0.00 | 0.43 | secuencia principal |
| `src/domain/game` | 14 | 9 | 2 | 0.18 | 0/14 | 0.00 | 0.82 | zona de dolor |
| `src/domain/match` | 7 | 6 | 2 | 0.25 | 25/67 | 0.37 | 0.38 | secuencia principal |
| `src/domain/player` | 8 | 5 | 5 | 0.50 | 0/8 | 0.00 | 0.50 | secuencia principal |
| `src/domain/user` | 17 | 13 | 2 | 0.13 | 0/16 | 0.00 | 0.87 | zona de dolor |
| `src/game` | 16 | 1 | 11 | 0.92 | 3/19 | 0.16 | 0.07 | secuencia principal |
| `src/match` | 3 | 1 | 6 | 0.86 | 0/2 | 0.00 | 0.14 | secuencia principal |
| `src/match-play` | 5 | 1 | 6 | 0.86 | 0/7 | 0.00 | 0.14 | secuencia principal |
| `src/player` | 4 | 1 | 7 | 0.88 | 0/3 | 0.00 | 0.13 | secuencia principal |
| `src/rules/contract` | 1 | 6 | 0 | 0.00 | 10/11 | 0.91 | 0.09 | secuencia principal |
| `src/rules/evaluator` | 1 | 2 | 1 | 0.33 | 1/11 | 0.09 | 0.58 | zona de dolor |
| `src/rules/registry` | 1 | 3 | 1 | 0.25 | 1/6 | 0.17 | 0.58 | zona de dolor |
| `src/security` | 19 | 7 | 6 | 0.46 | 0/16 | 0.00 | 0.54 | zona de dolor |
| `src/shared` | 13 | 15 | 0 | 0.00 | 4/12 | 0.33 | 0.67 | zona de dolor |
| `src/user` | 8 | 1 | 8 | 0.89 | 0/8 | 0.00 | 0.11 | secuencia principal |
