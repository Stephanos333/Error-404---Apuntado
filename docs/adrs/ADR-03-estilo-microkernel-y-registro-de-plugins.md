# ADR-03. Adoptar el estilo Microkernel dentro de un monolito modular, con plug-ins de reglas cargados por un registro declarativo

| Campo | Valor |
|---|---|
| **Estado** | Proposed — enmienda ADR-02 en el mecanismo de carga |
| **Fecha** | 2026-10-26 |
| **Autor** | Santiago Alvarez Muñoz (Arquitecto de aplicaciones) |
| **Revisores** | Sergio Esteban Romero Macariz, Andres Felipe Lemus Victoria, Omar Zambrano |
| **Relacionados** | ADR-01, ADR-02 (enmendado), ADR-05 · Riesgos R01, R05 · FF-02, FF-04, FF-05 |

## Contexto

- **Problema de este entregable.** Deben convivir dos modalidades con estructuras de reglas y penalizaciones muy distintas:
  - La **Clásica** es una partida **atómica de una ronda** (1 cuarta + 2 ternas + 1 descarte) y no guarda historial de penalizaciones.
  - El **Apuntado** es una partida **multironda y acumulativa** (4-3-3 o 3 ternas + sobrante < 5, con conteo hasta ≥ 101).
- **Requisito.** Se deben poder incorporar o modificar variantes **sin alterar el núcleo de orquestación de turnos ni la persistencia**.
- **Drivers del E1.** Extensibilidad, testabilidad y *responsiveness*; factibilidad como característica implícita.
- **Comparación de estilos (§1.1).** Capas 3,05 · Monolito Modular 3,90 · **Microkernel 4,75** · Service-Based 3,40.
- **Limitación de ADR-02.** En su versión original, los plug-ins se compilaban con el backend. Agregar una variante como *Continental* o *Póker* obligaba a recompilar y redesplegar el núcleo completo. Además, el desarrollador de la variante quedaba expuesto a tocar código del núcleo (riesgo R05).
- **Restricciones.** Stack TypeScript/NestJS, un solo quantum (ADR-01) y un equipo de 4 personas.

## Alternativas evaluadas (mecanismo de extensibilidad)

| Criterio (peso) | A. Strategy con `switch` en el orquestador | B. Microkernel con plug-ins compilados con el núcleo (ADR-02 original) | **C. Microkernel con plug-ins como paquetes independientes registrados en un manifiesto** | D. *Hot-reload* de plug-ins en caliente | E. Motor declarativo / DSL de reglas |
|---|---|---|---|---|---|
| Extensibilidad sin recompilar ni tocar el núcleo (30 %) | 2 | 3 | 5 | 5 | 4 |
| Testabilidad (25 %) | 4 | 5 | 5 | 3 | 2 |
| Factibilidad (20 %) | 5 | 4 | 4 | 2 | 2 |
| Seguridad y control del código cargado (15 %) | 5 | 5 | 4 | 2 | 4 |
| Desempeño ≤ 200 ms (10 %) | 5 | 5 | 5 | 4 | 3 |
| **Total ponderado** | **3,85** | **4,20** | **4,65** | **3,35** | **3,00** |

- **A** obliga a editar el orquestador por cada variante, que es justo lo que se quiere evitar.
- **D** permite cambiar reglas a mitad de una partida, lo que rompe RD-36 (configuración congelada). Además exige aislar memoria y versiones en caliente.
- **E** no expresa bien reglas algorítmicas (escaleras con vuelta, comodín, reparto de *Continental*) y deja sin tipos estáticos al código más delicado.

## Decisión

Se adopta el estilo **Microkernel, desplegado como Monolito Modular** (un quantum), con estos elementos:

1. **Core System.** Lo forman los módulos `sala`, `juego`, `puntaje`, `identidad`, `economia` y `transversal`:
   - Mazo: construir, barajar con un generador criptográficamente seguro y reabastecer.
   - Turnos: máquina de estados y ronda extra.
   - Temporizadores con plazos persistidos.
   - Ciclo de vida de la partida, persistencia, tiempo real y libro de tokens.
   - El núcleo **no conoce** los números 101, −51 ni 5. Aplica las decisiones que le devuelve el plug-in.
2. **Contrato** `@apuntado/contrato-reglas` (v1, semver).
   - Es la interfaz `ReglaJuegoPlugin`: `descriptor`, `configuracionReparto`, `cierresPermitidos`, `validarCierre`, `efectoCierre`, `liquidarRonda`, `evaluarDesenlace` y `politicaReenganche`.
   - Todas sus operaciones son **puras** y no tiene dependencias de framework.
3. **Plug-ins**, cada uno como paquete independiente en `backend/plugins/<id>/` con su propio `package.json`:
   - `@apuntado/plugin-clasica` (`ReglaClasicaCuartaTerna`): una ronda, solo 4-3-3, sin marcador.
   - `@apuntado/plugin-apuntado` (`ReglaApuntado101`): 4-3-3 y tocar, ronda extra, conteo, ≥ 101, ≤ −51 y reenganche.
4. **Librería compartida** `@apuntado/evaluador-manos`: `IHandEvaluator`, `PoliticaEscalera` (con o sin vuelta) y `ReglaComodin`. Las subvariantes de PP se resuelven con el patrón **Strategy**.
5. **Registro** (`PluginRegistry`).
   - Al arrancar lee `config/reglas.plugins.json`, una lista blanca **local**: `[{id, modulo, versionContrato, habilitado}]`.
   - Importa cada módulo con `import()` y **valida** la compatibilidad semver del contrato y la forma de la interfaz.
   - Ejecuta una prueba de humo del contrato y registra la fábrica.
   - Si un plug-in es incompatible, **aborta el arranque** (*fail fast*).
6. **Congelamiento.** Al crear la partida se guarda `plugin: {id, version}` junto con PP y PS. La partida siempre se juega con esa regla.

**Procedimiento para una variante nueva** (*Continental*): crear el paquete, compilarlo **solo a él**, pasar la suite de contrato, agregar una línea al manifiesto y reiniciar. **No se recompila ni se modifica el orquestador.**

## Consecuencias

**Positivas:**

- La variabilidad de las dos modalidades (una ronda vs. multironda) queda fuera del núcleo.
- Una variante nueva es un paquete aislado que cumple RNF-02.
- Todas las variantes se verifican con la misma suite de contrato.
- Los plug-ins tienen inestabilidad I = 1 y el contrato I = 0, la forma que pide el principio de dependencias estables (E1 §4.5).
- El núcleo se puede entregar y probar sin los plug-ins, usando *stubs* del contrato.

**Negativas / trade-offs aceptados:**

- Hay más piezas: contrato versionado, registro, manifiesto y empaquetado.
- Un cambio **incompatible** del contrato (v2) obliga a migrar todos los plug-ins.
- Agregar un plug-in exige **reiniciar** el servicio. No hay carga en caliente, a propósito (RD-36).
- El código cargado dinámicamente se limita a la carpeta local `plugins/` declarada en el manifiesto. Nunca se carga desde la red.

## Cumplimiento (Compliance)

| Verificación | Tipo | Dónde |
|---|---|---|
| FF-02: los plug-ins no dependen entre sí; el núcleo (`juego`, `puntaje`, `sala`) no importa plug-ins concretos; cada plug-in solo depende del contrato y del evaluador; sin ciclos | Fitness function automatizada (TSArch) | `tests/architecture/ff02-independencia-plugins.spec.ts` |
| FF-05: el contrato, el evaluador y los plug-ins no importan NestJS, Mongoose, Socket.IO ni RxJS | Fitness function automatizada | `ff05-motor-reglas-sin-framework.spec.ts` |
| FF-04: ningún método evaluador de combinaciones supera CC 10 | Fitness function automatizada (ESLint) | `ff04-complejidad-ciclomatica.spec.ts` |
| Suite de contrato parametrizada: la misma batería de casos (4-3-3, tocar, escaleras con y sin vuelta, comodín, umbrales) se ejecuta contra **cada** entrada del manifiesto | Prueba automatizada (pendiente de implementar con el refactor) | `backend/plugins/**/contrato.spec.ts` |
| Arranque con un plug-in de contrato incompatible → el servicio no inicia | Prueba de integración | `reglas/registro` |
| Revisión del PR de una variante: solo toca `backend/plugins/<id>/` y el manifiesto | Manual | Plantilla de PR |

## Notas

Reemplaza la parte de "plug-ins compilados con el núcleo" de ADR-02. Las clases mantienen los nombres del E1 (`ReglaClasicaCuartaTerna` ≡ *ReglaClasicaPlugin*; `ReglaApuntado101` ≡ *ReglaApuntadoPlugin*) para no romper la trazabilidad.
