import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // No public API surface beyond /health — this service is driven entirely
  // by Redis pub/sub events from other services, not HTTP requests.
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
