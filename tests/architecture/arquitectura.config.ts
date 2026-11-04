/**
 * Mapa entre la arquitectura documentada (Entregables 1 y 2) y las carpetas del código.
 *
 * Cada fitness function lee este archivo: cuando el equipo refactorice el prototipo
 * hacia la estructura objetivo (ADR-01 y ADR-03) solo se actualizan estas rutas.
 * Las rutas son relativas a `backend/` (donde está su tsconfig.json).
 */
import * as path from 'path';

export const RAIZ_REPO = path.resolve(__dirname, '../..');
export const BACKEND = path.join(RAIZ_REPO, 'backend');
export const BACKEND_SRC = path.join(BACKEND, 'src');
/** tsconfig de análisis para TSArch (ver comentario en el archivo): solo incluye backend/src y backend/plugins. */
export const BACKEND_TSCONFIG = path.join(__dirname, 'tsconfig.backend.json');
export const FIXTURES = path.join(__dirname, 'fixtures');

/** FF-01. Capas: presentación (controladores REST y gateways WebSocket) vs. persistencia. */
export const CAPAS = {
	/** Prototipo: `<módulo>/controller/` y `<módulo>/socket/`. Objetivo (ADR-01): `<dominio>/api/`. */
	presentacion: ['controller', 'socket', 'api'],
	/** Prototipo: `database/` (esquemas Mongoose). Objetivo: `<dominio>/infraestructura/persistencia/`. */
	persistencia: ['database', 'persistencia'],
	/** Paquetes de acceso a datos que la presentación no puede importar directamente. */
	paquetesPersistencia: [/^mongoose$/, /^@nestjs\/mongoose$/, /^mongodb$/],
};

/** FF-02. Microkernel de reglas (ADR-03): núcleo, contrato y plug-ins. */
export const MICROKERNEL = {
	/** Carpeta de plug-ins (paquetes compilados por separado, ADR-03). */
	plugins: 'plugins',
	/** Nombres de los plug-ins que no pueden depender entre sí. */
	nombresPlugins: ['clasica', 'apuntado'],
	/** Módulos del núcleo que solo pueden conocer el contrato, nunca un plug-in concreto. */
	nucleo: ['juego', 'puntaje', 'sala'],
};

/** FF-03. Módulos de primer nivel considerados para detectar ciclos (todos los de `src/`). */
export const RAIZ_MODULOS = BACKEND_SRC;

/** FF-04. Complejidad ciclomática de los evaluadores de combinaciones de cartas. */
export const COMPLEJIDAD = {
	umbral: 10,
	/** Prototipo: tablas en `card/` y validación en `player/player.service.ts`. Objetivo: `reglas/` y plug-ins. */
	evaluadores: ['backend/src/card/**/*.ts', 'backend/src/player/player.service.ts', 'backend/src/reglas/**/*.ts', 'backend/plugins/**/*.ts'],
	/** Umbral general (informativo) para el resto del backend. */
	umbralGeneral: 15,
};

/** FF-05. El motor de reglas no puede depender del framework ni de la infraestructura (ADR-01/ADR-03). */
export const MOTOR_REGLAS = {
	/** Prototipo: `card/`. Objetivo: `reglas/`. */
	carpetas: ['card', 'reglas'],
	paquetesProhibidos: [/^@nestjs\//, /^mongoose$/, /^socket\.io/, /^rxjs$/],
};

/**
 * Modo de ejecución:
 *  - por defecto, "trinquete" (ratchet): se toleran solo las violaciones registradas en
 *    `linea-base.json` (deuda conocida del prototipo); cualquier violación NUEVA falla.
 *  - `ARQ_ESTRICTO=1`: se ignora la línea base; es la meta de la refactorización.
 */
export const ESTRICTO = process.env.ARQ_ESTRICTO === '1';
