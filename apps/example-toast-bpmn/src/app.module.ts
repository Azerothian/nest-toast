import { Module } from '@nestjs/common';
import { join } from 'path';
import { ToastModule } from '@azerothian/toast';
import { ToastBpmnModule } from '@azerothian/toast-bpmn';
import { BpmnDemoController } from './controllers/bpmn-demo.controller';
import { OrderProcessHandler } from './handlers/order-process.handler';

@Module({
  imports: [
    ToastModule.forRoot({
      enableDiscovery: true,
    }),
    ToastBpmnModule.forRoot({
      bpmnPath: join(__dirname, '..', 'bpmn'),
    }),
  ],
  controllers: [BpmnDemoController],
  providers: [OrderProcessHandler],
})
export class AppModule {}
