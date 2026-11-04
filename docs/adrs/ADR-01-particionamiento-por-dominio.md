# ADR-01. Particionar el sistema por dominio dentro de un monolito modular

| Campo | Valor |
|---|---|
| **Estado** | Proposed (pasa a Accepted cuando lo firmen los revisores) |
| **Fecha** | 2026-09-28 |
| **Autor** | Santiago Alvarez Muñoz (Arquitecto de aplicaciones) |
| **Revisores** | Sergio Esteban Romero Macariz, Andres Felipe Lemus Victoria, Omar Zambrano |
| **Relacionados** | ADR-02, ADR-03, ADR-05 |

## Contexto

**Fuerzas en juego:**

1. Dos modalidades y un conjunto de reglas personalizables que seguirán evolucionando (Top 1: extensibilidad).
2. El motor de reglas debe poder probarse de forma aislada (Top 2: testabilidad).
3. Los turnos ocurren en tiempo real y necesitan baja latencia (Top 3: *responsiveness*).
4. El equipo es de 4 personas y tiene un semestre de plazo (factibilidad).
5. El prototipo está dividido por **entidades** (`user`, `game`, `match`, `player`, `card`) y cae en *Entity Trap*: `PlayerService` concentra reparto, turnos, validación y puntuación. Las fitness functions confirman un ciclo entre 8 módulos.

## Alternativas evaluadas

| Criterio (peso) | A. Técnico por capas | **B. Dominio, monolito modular** | C. Microservicios |
|---|---|---|---|
| Extensibilidad de reglas (30 %) | 2 | 5 | 5 |
| Testabilidad del motor (25 %) | 3 | 5 | 4 |
| Factibilidad costo/tiempo (20 %) | 4 | 4 | 1 |
| Responsiveness (15 %) | 4 | 5 | 2 |
| Operación y despliegue (10 %) | 3 | 3 | 1 |
| **Total ponderado** | **3,05** | **4,60** | **3,10** |

## Decisión

Particionamiento de primer nivel **por dominio**, en un **monolito modular**. Los módulos de primer nivel son `identidad`, `economia`, `sala`, `juego`, `reglas`, `puntaje` y `transversal`. Cada módulo:

- Expone solo su `index.ts` como API pública.
- Organiza su interior en `api/`, `aplicacion/`, `dominio/` e `infraestructura/`.

Un cambio de regla, que es el cambio más frecuente, queda contenido en un solo dominio. Las llamadas siguen siendo en memoria y hay un único artefacto de despliegue.

## Consecuencias

**Positivas:**

- Alinea el código con el lenguaje del negocio.
- Elimina el *Entity Trap*.
- Permite probar el motor de reglas sin infraestructura.
- Deja preparada una extracción futura a servicios.

**Negativas / trade-offs aceptados:**

- Hay que refactorizar el prototipo.
- Puede duplicarse código técnico entre dominios; se mitiga con `transversal`.
- No se puede escalar cada dominio por separado.

## Cumplimiento (Compliance)

Fitness functions en `tests/architecture/`:

- **FF-01:** la presentación no accede a la persistencia.
- **FF-03:** no hay ciclos entre archivos ni entre módulos (modo trinquete sobre la línea base del prototipo).
- **FF-05:** el motor de reglas no depende de NestJS, Mongoose ni Socket.IO.

Se ejecutan en el pipeline (`.github/workflows/architecture-fitness.yml`). Además, en la revisión de cada PR se verifica que todo componente nuevo tenga su declaración de responsabilidad.

## Notas

Decisión tomada en el Entregable 1 (§5.1). En el Entregable 2 se refina con ADR-03, que agrega el núcleo microkernel y los plug-ins de reglas.
