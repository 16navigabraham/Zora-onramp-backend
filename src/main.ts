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

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log('Zora Onramp Server Started');
  // Avoid printing potentially sensitive environment-derived URLs in logs
  logger.log('API prefix: /api');
}

bootstrap();
