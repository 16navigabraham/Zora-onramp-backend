import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get('cors.origin'),
    credentials: configService.get('cors.credentials'),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  const port = configService.get('port');

  // Wait for ContractsService to signal readiness before starting the server.
  // Use a bounded timeout so startup doesn't hang indefinitely in prod.
  try {
    const contractsService = app.get('ContractsService');
    if (contractsService && typeof contractsService.ready === 'function') {
      const readyPromise = contractsService.ready();
      const timeout = new Promise((resolve) => setTimeout(resolve, 30000)); // 30s
      const race = await Promise.race([readyPromise.then(() => 'ready'), timeout.then(() => 'timeout')]);
      if (race === 'timeout') {
        const logger = new Logger('Bootstrap');
        logger.warn('ContractsService readiness timed out after 30s; starting server anyway.');
      }
    }
  } catch (err) {
    const logger = new Logger('Bootstrap');
    logger.error(`Error while awaiting ContractsService readiness: ${err?.message || err}`);
  }

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log('Zora Onramp Server Started');
  // Avoid printing potentially sensitive environment-derived URLs in logs
  logger.log('API prefix: /api');
}

bootstrap();
