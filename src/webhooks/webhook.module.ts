import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { FlutterwaveModule } from '../flutterwave/flutterwave.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [FlutterwaveModule, OrdersModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhookModule {}
