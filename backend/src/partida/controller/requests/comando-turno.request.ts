import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { ExceptionMessagesConstants as M } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Datos de concurrencia que lleva todo comando de turno (R03).
 * El cliente envía su intención; el servidor decide el resultado.
 * @class
 */
export class ComandoTurnoRequest {
	@ApiProperty({ description: 'Versión de la partida que conoce el cliente (concurrencia optimista).', minimum: 0 })
	@IsInt({ message: M.VERSION_MUST_BE_A_NON_NEGATIVE_INTEGER_ERROR })
	@Min(0, { message: M.VERSION_MUST_BE_A_NON_NEGATIVE_INTEGER_ERROR })
		version: number;

	@ApiProperty({ description: 'Identificador único del comando (idempotencia), p. ej. un UUID v4.', example: 'c-6f1c2b' })
	@IsString({ message: M.ID_COMANDO_INVALIDO_ERROR })
	@Matches(/^[A-Za-z0-9_-]{1,64}$/, { message: M.ID_COMANDO_INVALIDO_ERROR })
		idComando: string;
}

/**
 * Comando robar.
 * @class
 */
export class RobarRequest extends ComandoTurnoRequest {
	@ApiProperty({ enum: ['MAZO', 'DESCARTE'] })
	@IsIn(['MAZO', 'DESCARTE'])
		origen: 'MAZO' | 'DESCARTE';
}

/**
 * Comando descartar. `grupos` son índices de la mano actual (sin la carta descartada) y
 * definen cómo se liquidaría la mano si otro jugador cierra la ronda (RD-24).
 * @class
 */
export class DescartarRequest extends ComandoTurnoRequest {
	@ApiProperty({ description: 'Índice de la carta que se descarta.', minimum: 0, maximum: 10 })
	@IsInt()
	@Min(0)
	@Max(10)
		carta: number;

	@ApiProperty({ required: false, type: 'array', items: { type: 'array', items: { type: 'integer' } }, example: [[0, 1, 2], [3, 4, 5]] })
	@IsOptional()
	@IsArray()
	@ArrayMaxSize(4)
		grupos?: number[][];
}

/**
 * Comando intentar cierre de ronda.
 * @class
 */
export class CerrarRequest extends ComandoTurnoRequest {
	@ApiProperty({
		required: false,
		enum: ['GANAR_4_3_3', 'TOCAR'],
		default: 'GANAR_4_3_3',
		description: 'TOCAR (solo Apuntado): 3 ternas + 1 sobrante de menos de 5 puntos; abre la ronda extra.',
	})
	@IsOptional()
	@IsIn(['GANAR_4_3_3', 'TOCAR'], { message: M.CIERRE_NO_PERMITIDO })
		tipo?: 'GANAR_4_3_3' | 'TOCAR';

	@ApiProperty({ type: 'array', items: { type: 'array', items: { type: 'integer' } }, example: [[0, 1, 2, 3], [4, 5, 6], [7, 8, 9]] })
	@IsArray()
	@ArrayMaxSize(4)
		grupos: number[][];

	@ApiProperty({ description: 'Índice de la carta que se descarta al cerrar.', minimum: 0, maximum: 10 })
	@IsInt()
	@Min(0)
	@Max(10)
		descarte: number;
}
