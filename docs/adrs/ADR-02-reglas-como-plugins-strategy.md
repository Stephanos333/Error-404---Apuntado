# ADR-02. Encapsular las reglas de victoria como plug-ins de un microkernel lógico, implementados con Strategy

| Campo | Valor |
|---|---|
| **Estado** | Proposed — **enmendado por ADR-03** (mecanismo de carga de los plug-ins) |
| **Fecha** | 2026-09-28 (enmienda: 2026-10-26) |
| **Autor** | Santiago Alvarez Muñoz (Arquitecto de aplicaciones) |
| **Revisores** | Sergio Esteban Romero Macariz, Andres Felipe Lemus Victoria, Omar Zambrano |
| **Relacionados** | ADR-01, ADR-03 |

## Contexto

Hay que desacoplar la **Modalidad Clásica 4-3-3** de la **Modalidad Apuntado a 101**, que además agrega "tocar" con ronda extra. También hay que soportar subvariantes por partida (escalera con o sin vuelta, comodín), parámetros numéricos (PS) y variantes futuras.

En el prototipo, las combinaciones válidas están en tablas de texto (`AllowedTrips` y `AllowedQuads`, con más de 300 entradas). Los castigos y la bonificación se leen de `process.env` dentro del servicio.

## Alternativas evaluadas

| Criterio (peso) | A. Condicionales/tablas | B. Strategy simple | **C. Microkernel lógico** | D. Plug-ins dinámicos | E. Motor declarativo |
|---|---|---|---|---|---|
| Extensibilidad (30 %) | 1 | 3 | 5 | 5 | 4 |
| Testabilidad (25 %) | 2 | 4 | 5 | 3 | 2 |
| Factibilidad (20 %) | 3 | 5 | 4 | 1 | 2 |
| Desempeño ≤ 200 ms (15 %) | 1 | 4 | 4 | 3 | 3 |
| Aislamiento del núcleo (10 %) | 1 | 2 | 4 | 5 | 4 |
| **Total ponderado** | **1,65** | **3,70** | **4,55** | **3,40** | **2,95** |

## Decisión

Se adopta un **microkernel lógico con Strategy**:

- El núcleo (orquestador de turnos y puntaje) define el contrato `ReglaJuego`.
- Un registro resuelve el plug-in según la configuración congelada de la partida.
- Los plug-ins `ReglaClasicaCuartaTerna` y `ReglaApuntado101` implementan el contrato.
- Las subvariantes son estrategias inyectadas: `PoliticaEscalera` y `ReglaComodin`.
- La validación es **algorítmica**, no por tablas.

## Consecuencias

**Positivas:**

- Una nueva variante equivale a un plug-in nuevo.
- Hay una suite de contrato común para todas las variantes.
- El núcleo no cambia cuando se agrega una variante.

**Negativas:**

- Hay más tipos e indirección.
- El *Template Method* de la clase base debe mantenerse estable.

## Cumplimiento (Compliance)

- Suite de contrato parametrizada.
- Pruebas de arquitectura: FF-02 (independencia de plug-ins) y FF-05 (motor sin framework).
- Pruebas basadas en propiedades sobre el evaluador.
- Oráculo de regresión con las tablas del prototipo.
- *Benchmark* de validación ≤ 200 ms p95.
- Cobertura ≥ 90 %.

## Notas

**Enmienda (2026-10-26, ADR-03).** En la versión original, los plug-ins se compilaban junto con el backend. ADR-03 los convierte en **paquetes independientes declarados en un manifiesto** y cargados por el `PluginRegistry` al arrancar. Así, agregar una variante (p. ej. Continental) ya no exige recompilar ni modificar el núcleo. Lo demás de este ADR sigue vigente.

Además, por el cambio C1 del Entregable 2, la Clásica es de **una sola ronda**. Por eso el conteo a 101 pasa a ser responsabilidad del plug-in Apuntado.
