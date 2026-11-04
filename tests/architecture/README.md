# Fitness functions arquitectónicas: Sistema Apuntado

Pruebas automatizadas que verifican la **estructura** del código, no su funcionalidad
(Richards & Ford, cap. 6). Si una regla se rompe, el pipeline falla.
Este es el entregable de la sección 5 del Entregable 2.

| ID | Regla de gobernanza | Herramienta | Archivo |
|---|---|---|---|
| FF-01 | La presentación (controladores y gateways WebSocket) no accede a la persistencia (`database/`, `mongoose`) | TSArch + análisis de imports | `ff01-aislamiento-capas.spec.ts` |
| FF-02 | Los plug-ins de reglas (Clásica, Apuntado) no dependen entre sí; el núcleo solo conoce el contrato; sin ciclos | TSArch | `ff02-independencia-plugins.spec.ts` |
| FF-03 | No hay ciclos de dependencias entre archivos ni entre módulos `src/<módulo>` | Grafo de imports + Tarjan | `ff03-sin-ciclos.spec.ts` |
| FF-04 | Ningún método evaluador de combinaciones supera complejidad ciclomática 10 | ESLint `complexity` | `ff04-complejidad-ciclomatica.spec.ts` |
| FF-05 | El motor de reglas no importa NestJS, Mongoose, Socket.IO ni RxJS | Análisis de imports | `ff05-motor-reglas-sin-framework.spec.ts` |
| FF-06 | Los validadores `$jsonSchema` de `docs/schemas` compilan, aceptan los ejemplos y rechazan estados inválidos | Ajv | `ff06-esquemas-datos.spec.ts` |

## Ejecutar

```bash
cd tests/architecture
npm ci
npm test               # modo trinquete: falla solo ante violaciones NUEVAS
npm run test:estricto  # meta de la refactorización: falla ante cualquier violación
```

Las pruebas analizan `../../backend/src` y `../../docs/schemas` sin compilar ni ejecutar el
backend, así que no necesitan `backend/node_modules` ni base de datos.

## Modo trinquete (*ratchet*) y línea base

El prototipo actual tiene deuda estructural: un ciclo entre 8 módulos y el motor de cartas
acoplado a NestJS. Esa deuda está registrada en `linea-base.json`.

- En el modo por defecto, las pruebas **toleran** esa deuda, pero **fallan ante cualquier
  violación nueva**. La arquitectura no puede empeorar.
- Cuando una deuda se corrige, la prueba lo informa para retirarla de la línea base. La lista
  solo puede **reducirse**.
- `npm run linea-base` regenera el archivo. Úselo solo con un ADR aprobado.

## Meta-pruebas (`fixtures/`)

Cada regla se prueba también contra código de ejemplo que la **cumple** y que la **viola**.
Eso demuestra que la regla detecta lo que dice detectar y que no pasa "en vacío". Por
ejemplo, FF-02 se valida con `fixtures/microkernel-con-violaciones/` mientras el backend
real no tenga `backend/plugins/`. Sobre el backend real se activa sola cuando esa carpeta
exista (ADR-03).

## Adaptar a la estructura objetivo

Todas las rutas están en `arquitectura.config.ts`. Al refactorizar hacia los módulos de
dominio (ADR-01) y los plug-ins (ADR-03), solo se actualiza ese archivo.
