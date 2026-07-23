import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  // No CORS here — this service is only ever called server-to-server from
  // the gateway (enforced at the network layer in infra/terraform's
  // security-groups.tf), never directly from a browser.
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
