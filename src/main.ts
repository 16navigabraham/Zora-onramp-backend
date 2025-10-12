import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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

  console.log('');
  console.log('=============================================');
  console.log(' Zora Onramp Server Started');
  console.log('=============================================');
  console.log('');
  console.log(`Server: http://localhost:${port}`);
  console.log(`API: http://localhost:${port}/api`);
  console.log(`Health: http://localhost:${port}/api/health`);
  console.log('');
  console.log('Endpoints:');
  console.log(' POST /api/orders/create');
  console.log(' GET /api/orders/:orderId');
  console.log(' POST /api/zora/validate-username');
  console.log(' POST /api/webhooks/flutterwave');
  console.log('');
}

bootstrap();
