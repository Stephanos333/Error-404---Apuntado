# Registro de decisiones arquitectónicas (ADRs)

Formato de Michael Nygard ampliado por Richards & Ford (cap. 21): Título, Estado, Contexto, Decisión, Consecuencias, Cumplimiento y Notas.

| ADR | Título | Estado | Entregable |
|---|---|---|---|
| [ADR-01](ADR-01-particionamiento-por-dominio.md) | Particionar el sistema por dominio dentro de un monolito modular | Proposed | E1 |
| [ADR-02](ADR-02-reglas-como-plugins-strategy.md) | Encapsular las reglas de victoria como plug-ins de un microkernel lógico con Strategy | Proposed — enmendado por ADR-03 | E1 |
| [ADR-03](ADR-03-estilo-microkernel-y-registro-de-plugins.md) | Estilo Microkernel en monolito modular con plug-ins cargados por un registro declarativo | Proposed | E2 |
| [ADR-04](ADR-04-persistencia-documental-mongodb.md) | Persistencia documental en MongoDB con la Partida como agregado y JSON Schema | Proposed | E2 |
| [ADR-05](ADR-05-comunicacion-sincrona-y-eventos-locales.md) | Comando síncrono en memoria + eventos de dominio locales después del *commit* | Proposed | E2 |

> El "ADR-03 complementario" del Entregable 1 (servidor autoritativo y persistir antes de notificar) quedó **reemplazado** por ADR-04 (consistencia y persistencia) y ADR-05 (sincronización y comunicación).
