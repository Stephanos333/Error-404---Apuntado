import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { AppExceptionFilter } from './shared/exceptions/app.exception-filter';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import * as process from 'process';

/**
 * Starts the Apuntado backend.\
 * It defines:
 * - The global prefix of the application.
 * - The request validation pipe.
 * - The CORS settings of the application.
 * - The global exception filter.
 *
 * @function
 * @async
 */
async function bootstrap(): Promise<void> {
	const app: INestApplication = await NestFactory.create(AppModule);
	app.setGlobalPrefix(process.env.APP_GLOBAL_PREFIX, { exclude: ['/'] });
	app.useGlobalPipes(new ValidationPipe());
	app.useGlobalFilters(new AppExceptionFilter());
	app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
	app.enableCors();

	// Answer the Render load balancer probes and visits to the root with 200 OK
	const httpAdapter = app.getHttpAdapter();
	httpAdapter.get('/', (_req, res) => {
		res.json({
			name: 'Apuntado Digital System - Backend API',
			status: 'UP',
			docs: `/${process.env.APP_DOCS_URI || 'docs'}`,
			api: `/${process.env.APP_GLOBAL_PREFIX || 'api'}`,
		});
	});
	httpAdapter.head('/', (_req, res) => {
		res.status(200).end();
	});

	const config = new DocumentBuilder()
		.setTitle('Apuntado API')
		.setDescription('Apuntado application services')
		.setVersion('v1')
		.addBearerAuth()
		.build();
	const document: OpenAPIObject = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup(process.env.APP_DOCS_URI, app, document);
	await app.listen(Number(process.env.APP_PORT));
}

bootstrap()
	.then(() => {
		const logger: Logger = new Logger();
		logger.log(`Server running on :: ${process.env.APP_URL}`);
		logger.log(`Swagger running on :: ${process.env.APP_URL}/${process.env.APP_DOCS_URI}`);
	});
