import {describe, expect, it} from 'vitest';
import {CartaPartida, PaloCarta, ValorCarta} from '../../types/partida.type.ts';
import {
    IntencionInvalidaError,
    compararVersion,
    cuerpoCerrar,
    cuerpoDescartar,
    cuerpoRobar,
    debeRefrescar,
    formaDelCierre,
    generarIdComando,
    imagenDe,
    puntos,
    reconciliarGrupos,
    sobrantesDe,
} from './partida.utils.ts';

const c = (valor: ValorCarta, palo: PaloCarta, baraja = 1): CartaPartida => ({valor, palo, baraja});

/** Mano de 11 cartas: cuarta de sietes, terna de reyes, escalera de corazones y 1 suelta. */
const CUARTA = [c('SIETE', 'PICAS'), c('SIETE', 'CORAZONES'), c('SIETE', 'TREBOLES'), c('SIETE', 'DIAMANTES')];
const TERNA = [c('K', 'PICAS'), c('K', 'CORAZONES'), c('K', 'TREBOLES')];
const ESCALERA = [c('DOS', 'CORAZONES'), c('TRES', 'CORAZONES'), c('CUATRO', 'CORAZONES')];
const DESCARTE = c('NUEVE', 'DIAMANTES');
const MANO = [DESCARTE, ...ESCALERA, ...CUARTA, ...TERNA];

describe('generarIdComando', () => {
    it('genera UUID v4 distintos', () => {
        const a = generarIdComando();
        expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(generarIdComando()).not.toBe(a);
    });
});

describe('traducción de intenciones al contrato del backend', () => {
    it('robar: POZO_DESCARTE se envía como DESCARTE', () => {
        expect(cuerpoRobar({fuente: 'POZO_DESCARTE'}, 7, 'id')).toEqual({origen: 'DESCARTE', version: 7, idComando: 'id'});
        expect(cuerpoRobar({fuente: 'MAZO'}, 7, 'id').origen).toBe('MAZO');
    });

    it('descartar: cartas y grupos pasan a índices de la mano', () => {
        const cuerpo = cuerpoDescartar(MANO, {carta: DESCARTE, grupos: [TERNA]}, 3, 'id');
        expect(cuerpo).toEqual({carta: 0, grupos: [[8, 9, 10]], version: 3, idComando: 'id'});
    });

    it('descartar: distingue cartas iguales de barajas distintas', () => {
        const mano = [c('AS', 'PICAS', 1), c('AS', 'PICAS', 2)];
        expect(cuerpoDescartar(mano, {carta: c('AS', 'PICAS', 2)}, 1, 'id').carta).toBe(1);
    });

    it('descartar: rechaza una carta que no está en la mano o que está en un grupo', () => {
        expect(() => cuerpoDescartar(MANO, {carta: c('Q', 'PICAS')}, 1, 'id')).toThrow(IntencionInvalidaError);
        expect(() => cuerpoDescartar(MANO, {carta: TERNA[0], grupos: [TERNA]}, 1, 'id')).toThrow('GRUPOS_INVALIDOS');
    });

    it('cerrar 4-3-3: arma el cuerpo con tipo, grupos y descarte', () => {
        const cuerpo = cuerpoCerrar(MANO, {
            tipoCierre: 'GANAR_4_3_3',
            declaracion: {grupos: [CUARTA, TERNA, ESCALERA], descarte: DESCARTE, cartasSobrantes: []},
        }, 5, 'id');
        expect(cuerpo).toEqual({tipo: 'GANAR_4_3_3', grupos: [[4, 5, 6, 7], [8, 9, 10], [1, 2, 3]], descarte: 0, version: 5, idComando: 'id'});
    });

    it('cerrar: la declaración debe cubrir exactamente la mano', () => {
        const incompleta = {grupos: [CUARTA, TERNA], descarte: DESCARTE, cartasSobrantes: []};
        expect(() => cuerpoCerrar(MANO, {tipoCierre: 'GANAR_4_3_3', declaracion: incompleta}, 1, 'id')).toThrow('GRUPOS_INVALIDOS');
        const repetida = {grupos: [CUARTA, TERNA, ESCALERA], descarte: DESCARTE, cartasSobrantes: [DESCARTE]};
        expect(() => cuerpoCerrar(MANO, {tipoCierre: 'TOCAR', declaracion: repetida}, 1, 'id')).toThrow('GRUPOS_INVALIDOS');
    });
});

describe('forma del cierre según la organización', () => {
    it('1 cuarta + 2 ternas sin sobrantes es 4-3-3', () => {
        expect(formaDelCierre([TERNA, CUARTA, ESCALERA], [])).toBe('GANAR_4_3_3');
    });

    it('3 ternas + 1 sobrante es tocar', () => {
        expect(formaDelCierre([TERNA, ESCALERA, CUARTA.slice(0, 3)], [CUARTA[3]])).toBe('TOCAR');
    });

    it('otra organización no es un cierre', () => {
        expect(formaDelCierre([TERNA, ESCALERA], CUARTA)).toBeNull();
        expect(formaDelCierre([TERNA, CUARTA, ESCALERA], [DESCARTE])).toBeNull();
    });

    it('sobrantes y puntos', () => {
        const sueltas = sobrantesDe(MANO, [CUARTA, TERNA], DESCARTE);
        expect(sueltas).toEqual(ESCALERA);
        expect(puntos(sueltas)).toBe(9);
        expect(puntos([c('AS', 'PICAS'), c('J', 'PICAS')])).toBe(20);
    });
});

describe('organización local de la mano', () => {
    it('sin organización local usa la del servidor', () => {
        expect(reconciliarGrupos(null, MANO, [[8, 9, 10]])).toEqual([TERNA]);
    });

    it('conserva la local y quita las cartas que ya no están', () => {
        const sinUnRey = MANO.filter((x) => x !== TERNA[0]);
        expect(reconciliarGrupos([TERNA, [DESCARTE]], sinUnRey, [])).toEqual([TERNA.slice(1), [DESCARTE]]);
        expect(reconciliarGrupos([[TERNA[0]]], sinUnRey, [])).toEqual([]);
    });
});

describe('versiones y relectura', () => {
    it('nunca retrocede y relee ante un salto', () => {
        expect(compararVersion(undefined, 4)).toBe('APLICAR');
        expect(compararVersion(4, 4)).toBe('APLICAR');
        expect(compararVersion(4, 5)).toBe('APLICAR');
        expect(compararVersion(4, 3)).toBe('IGNORAR');
        expect(compararVersion(4, 7)).toBe('REFRESCAR');
    });

    it('relee tras los errores de concurrencia y de turno', () => {
        ['VERSION_DESACTUALIZADA', 'RONDA_YA_CERRADA', 'TURNO_NO_CORRESPONDE', 'FASE_DE_TURNO_INVALIDA']
            .forEach((codigo) => expect(debeRefrescar(codigo)).toBe(true));
        expect(debeRefrescar('GRUPOS_INVALIDOS')).toBe(false);
    });
});

describe('imagen de la carta', () => {
    it('traduce valor y palo a los nombres de archivo', () => {
        expect(imagenDe(c('AS', 'TREBOLES'))).toEqual({suit: 'CLUB', type: 'A'});
        expect(imagenDe(c('DIEZ', 'CORAZONES'))).toEqual({suit: 'HEART', type: 'C10'});
    });
});
