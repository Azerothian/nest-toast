import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`
===========================================
  @azerothian/toast-bpmn Example App
===========================================

Available endpoints:

  GET  /bpmn/processes              - List loaded BPMN process definitions
  POST /bpmn/execute/:processName   - Execute a process synchronously
  POST /bpmn/execute-async/:name    - Execute a process asynchronously
  GET  /bpmn/status/:processId      - Get process execution status
  GET  /bpmn/context/:processId     - Get full process context

Example request:
  curl -X POST http://localhost:${port}/bpmn/execute/OrderProcess \\
    -H "Content-Type: application/json" \\
    -d '{"customerName":"Alice","items":[{"name":"Widget","quantity":2,"price":9.99}]}'

Server running on: http://localhost:${port}
===========================================
  `);
}

bootstrap();
