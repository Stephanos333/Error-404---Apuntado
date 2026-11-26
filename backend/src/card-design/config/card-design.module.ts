import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { CardDesignController } from '../controller/card-design.controller';
/**
 * Module of the card designs and their
 * configuration.
 * It configures:
 * - The card design controllers.
 * The services are provided by the application module.
 */
@Module({
	imports: [ApplicationModule],
	controllers: [CardDesignController],
})
export class CardDesignModule {
}
