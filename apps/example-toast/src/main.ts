import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
===========================================
  @azerothian/toast Example App
===========================================

Available endpoints:

  GET  /demo/plugins   - List registered plugins
  GET  /demo/waterfall - Demo waterfall execution
  GET  /demo/parallel  - Demo parallel execution
  GET  /demo/pipeline  - Demo pipeline with timing
  GET  /demo/race      - Demo race execution
  POST /demo/order     - Full workflow with plugins

Example order request:
  curl -X POST http://localhost:${port}/demo/order \\
    -H "Content-Type: application/json" \\
    -d '{"customerId":"C1","items":[{"name":"Widget","quantity":2,"price":10}]}'

Server running on: http://localhost:${port}
===========================================
  `);
}

bootstrap();
