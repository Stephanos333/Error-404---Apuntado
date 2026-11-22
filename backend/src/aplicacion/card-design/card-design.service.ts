import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Model, PipelineStage } from 'mongoose';
import { CardDesignDocument } from '../../database/card-design.schema';
import { CardDesign, CardDesignDTO } from '../../dominio/card-design/card-design';
import { DefaultCardDesignNotFoundException } from '../../dominio/card-design/exceptions/default-card-design-not-found.exception';
import { DatabaseConstants } from '../../database/database.constants';
import { CardDesignId } from '../../card/card-design-id';
import { CardDesignNotFoundException } from '../../dominio/card-design/exceptions/card-design-not-found.exception';
import { CardDesignQueries } from './card-design.queries';

/**
 * Clase que contiene los servicios para interactuar con los
 * diseños de cartas del sistema.
 * @class
 */
@Injectable()
export class CardDesignService implements OnApplicationBootstrap {

	private readonly logger: Logger = new Logger(CardDesignService.name);

	/**
	 * @param {Model<CardDesignDocument>} model Modelo para interactuar con
	 * la base de datos de los diseños de cartas.
	 */
	constructor(
		@Inject(DatabaseConstants.CARD_DESIGN_PROVIDER) private readonly model: Model<CardDesignDocument>,
	) {
	}

	/**
	 * Si la base de datos es nueva y no tiene catálogo de diseños, se siembran
	 * automáticamente los 5 diseños iniciales requeridos por el sistema.
	 */
	async onApplicationBootstrap(): Promise<void> {
		try {
			const count = await this.model.countDocuments();
			if (count === 0) {
				this.logger.log('Colección card-designs vacía. Inicializando catálogo por defecto...');
				const ahora = new Date();
				const disenos = [
					{ cardDesignId: '5f0c6c2e-0a8e-4b3e-9a51-2f1d3c4b5a60', name: 'DEFAULT', isDefault: true, isFree: true, isActive: true, createdAt: ahora, updatedAt: ahora },
					{ cardDesignId: '7a1d2e3f-4b5c-4d6e-8f70-81a2b3c4d5e6', name: 'BLUE', isDefault: false, isFree: true, isActive: true, createdAt: ahora, updatedAt: ahora },
					{ cardDesignId: '8b2e3f40-5c6d-4e7f-9a81-92b3c4d5e6f7', name: 'RED', isDefault: false, isFree: true, isActive: true, createdAt: ahora, updatedAt: ahora },
					{ cardDesignId: '9c3f4051-6d7e-4f80-8b92-a3c4d5e6f708', name: 'RETRO', isDefault: false, isFree: false, isActive: true, price: 50, createdAt: ahora, updatedAt: ahora },
					{ cardDesignId: 'ad405162-7e8f-4091-9ca3-b4d5e6f70819', name: 'NIGHT_VISION', isDefault: false, isFree: false, isActive: true, price: 100, createdAt: ahora, updatedAt: ahora },
				];
				await this.model.insertMany(disenos);
				this.logger.log('Catálogo de diseños de carta inicializado exitosamente.');
			}
		} catch (error) {
			this.logger.warn(`No se pudo verificar o sembrar card-designs: ${error?.message || error}`);
		}
	}

	/**
	 * Función que permite buscar todos los diseños de cartas disponibles y si
	 * son seleccionables o no.
	 * @param {Set<string>} userCardDesigns Los diseños de cartas del usuario.
	 * @returns {Promise<Array<{ cardDesign: CardDesign, canSelect: boolean }>>} Los
	 * diseños encontrados.
	 */
	async getAvailable(userCardDesigns: Set<string>): Promise<Array<{ cardDesign: CardDesign, canSelect: boolean }>> {
		this.logger.log(`[${this.getAvailable.name}] INIT ::`);
		const query: Array<PipelineStage> = CardDesignQueries.getCardDesignsAvailable(userCardDesigns);
		const aggregateResponse: Array<CardDesignDTO & { canSelect: boolean }> = await this.model.aggregate(query);
		const mapped: Array<{
			cardDesign: CardDesign,
			canSelect: boolean
		}> = await Promise.all(aggregateResponse.map(async (cd) => {
			return {
				cardDesign: CardDesign.fromDTO(cd),
				canSelect: cd.canSelect,
			};
		}));
		this.logger.log(`[${this.getAvailable.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Función que permite buscar un diseño de carta activo por ID.
	 * @param {CardDesignId} cardDesignId El diseño de carta que se solicita.
	 * @param {boolean} [throwExceptionIfNotFound=true] Bandera para determinar si se debe lanzar
	 * una excepción cuando el usuario solicitado no existe.
	 * @returns {CardDesign | undefined} Se retorna el diseño solicitado,
	 * si la bandera throwExceptionIfNotFound=false y el usuario solicitado no existe se retorna undefined.
	 * @throws {CardDesignNotFoundException} Se lanza cuando no se encuentra el diseño
	 * de carta solicitado.
	 */
	async getActiveById(cardDesignId: CardDesignId, throwExceptionIfNotFound: boolean = true): Promise<CardDesign | undefined> {
		this.logger.log(`[${this.getActiveById.name}] INIT :: cardDesignId: ${cardDesignId.toString()}`);
		const found: CardDesignDTO = await this.model.findOne({
			isActive: true,
			cardDesignId: cardDesignId.toString(),
		});
		const mapped: CardDesign = found ? CardDesign.fromDTO(found) : undefined;
		if (throwExceptionIfNotFound && !mapped) throw new CardDesignNotFoundException();
		this.logger.log(`[${this.getActiveById.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Función que permite buscar el diseño de carta por defecto del sistema.
	 * @returns {Promise<CardDesign>} Se retorna el diseño solicitado.
	 * @throws {DefaultCardDesignNotFoundException} Se lanza cuando no se encuentra
	 * el diseño de carta solicitado.
	 */
	async getDefault(): Promise<CardDesign> {
		this.logger.log(`[${this.getDefault.name}] INIT ::`);
		const found: CardDesignDTO = await this.model.findOne({ isDefault: true, isActive: true });
		const mapped: CardDesign = found ? CardDesign.fromDTO(found) : undefined;
		if (!mapped) throw new DefaultCardDesignNotFoundException();
		this.logger.log(`[${this.getDefault.name}] FINISH ::`);
		return mapped;
	}
}