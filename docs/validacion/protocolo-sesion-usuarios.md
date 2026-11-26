# Protocolo de la sesión con usuarios (sección 3 del Entregable 3)

Este es el material para la sesión con personas ajenas al equipo que pide la guía: 3 a 5 participantes con evidencias. La prueba funcional del equipo con 5 cuentas (`docs/evidencias/sesion-prueba-metricas.md`) ya verificó que el flujo completo funciona. Esta sesión mide otra cosa: cómo lo vive una persona que no lo construyó.

## Antes de empezar

- **Participantes:** 3 a 5 personas que no hayan trabajado en el proyecto (compañeros de otros grupos, familiares o amigos). Lo ideal es que unas conozcan los naipes y otras no.
- **Entorno:** el despliegue de Render (`https://error-404-apuntado.onrender.com`) o el local (`start.bat`). Hay que abrirlo 2 minutos antes, porque Render tarda en despertar.
- **Consentimiento:** explicar que se prueba el sistema y no a la persona, pedir permiso para grabar la pantalla y no registrar nombres. Cada persona se identifica como U01, U02…, y solo se anota su rango de edad, su formación y si conoce el juego.
- **Roles:** una persona del equipo dirige la sesión y lee las tareas, y otra anota y cronometra. Ninguna de las dos explica la interfaz, salvo que el participante lleve más de 2 minutos bloqueado; en ese caso se anota como error.
- **Grabación:** grabar la pantalla de cada participante (OBS o la grabadora de Windows con Win + Alt + R) y guardar los videos en una carpeta compartida.

## Guion de tareas (unos 30 minutos)

Para cada tarea, el facilitador la lee en voz alta y pide al participante que piense en voz alta.

1. **T1. Registro y personalización:** «Crea tu cuenta, entra y cambia tu avatar».
2. **T2. Sala:** uno de los participantes crea una mesa de **Apuntado a 101** para todos y comparte el enlace; los demás entran con el enlace.
3. **T3. Turnos:** jugar al menos 5 turnos cada uno: robar, organizar grupos y descartar.
4. **T4. Cierre:** intentar cerrar una ronda válida (4-3-3 o tocar con un sobrante de menos de 5 puntos).
5. **Cierre inválido deliberado:** el facilitador pide a un participante que intente cerrar con un grupo que no combina, para ver si entiende la advertencia y el castigo de +3.
6. **Acumulación hasta 101:** seguir jugando rondas hasta que alguien pase de 101 y sea eliminado. Si no da el tiempo, anotar hasta qué ronda se llegó.
7. **Clásica (opcional):** una mesa de 4-3-3 entre 2 o 3 participantes.
8. **Cuestionario SUS:** cada participante lo responde al terminar.

## Qué anotar y cómo medirlo (tabla 13 del informe)

| Columna | Cómo se mide |
|---|---|
| ID Usuario | U01, U02… en el orden de la sesión |
| Modalidad probada | Apuntado, Clásica o ambas |
| ¿Logró cerrar ronda válida? | «Sí» si el marcador muestra una ronda cerrada por esa persona (4-3-3 o toque aceptado). Cuántos intentos le tomó |
| Errores / confusiones detectadas | Lo que anota el observador: no encontrar un botón, intentar una acción fuera de su fase, cierres rechazados (aviso «Tu declaración no cierra») o preguntas al facilitador. Anotar cada uno con la hora aproximada |
| Tiempo promedio por turno | Desde que su tablero dice «Tu turno» hasta que descarta. Medir 5 turnos con cronómetro o desde la grabación y promediar. Si me pasan los videos o la hora de inicio y fin de cada turno, hago el cálculo |
| Satisfacción (SUS 0–100) | Fórmula de abajo |

La hoja `registro-sesion-usuarios.csv` tiene estas columnas, más una para cada respuesta SUS.

**Logs:** al terminar, exportar los logs del backend del mismo intervalo (`docker compose logs --timestamps --since <hora> backend` en local, o la pestaña *Logs* de Render) y guardarlos en `docs/evidencias/`.

## Cuestionario SUS (Brooke, 1996)

Escala del 1 (totalmente en desacuerdo) al 5 (totalmente de acuerdo):

1. Creo que me gustaría usar este sistema con frecuencia.
2. Encontré el sistema innecesariamente complejo.
3. Pensé que el sistema era fácil de usar.
4. Creo que necesitaría ayuda de una persona técnica para poder usar este sistema.
5. Encontré que las funciones del sistema estaban bien integradas.
6. Pensé que había demasiada inconsistencia en el sistema.
7. Imagino que la mayoría de las personas aprendería a usar este sistema muy rápido.
8. Encontré el sistema muy engorroso de usar.
9. Me sentí seguro/a usando el sistema.
10. Necesité aprender muchas cosas antes de poder usar este sistema.

**Puntaje:** en los ítems impares, el aporte es la respuesta − 1; en los pares, es 5 − la respuesta. SUS = 2,5 × la suma de los 10 aportes (de 0 a 100). El promedio de la industria es 68.

## Después de la sesión

Con la hoja llena, los videos y los logs, se completan las tablas 11 a 13 del informe, se agregan 2 o 3 capturas de la sesión a `docs/evidencias/` y se revisa si los errores observados piden un nuevo ajuste (sección 3.4).
