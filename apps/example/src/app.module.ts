import { Module } from '@nestjs/common';
import { ToastModule } from '@azerothian/toast';
import { DemoController } from './controllers/demo.controller';
import { LoggerPlugin } from './plugins/logger.plugin';
import { ValidatorPlugin } from './plugins/validator.plugin';
import { TransformerPlugin } from './plugins/transformer.plugin';
import { OrderProcessingWorkflow } from './workflows/order-processing.workflow';

@Module({
  imports: [
    ToastModule.forRoot({
      enableDiscovery: true,
      validateCompatibility: true,
      executionTracking: {
        enabled: true,
      },
    }),
  ],
  controllers: [DemoController],
  providers: [
    LoggerPlugin,
    ValidatorPlugin,
    TransformerPlugin,
    OrderProcessingWorkflow,
  ],
})
export class AppModule {}
