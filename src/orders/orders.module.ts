import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrderService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { OrderCleanupService } from './order-cleanup.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { ZoraModule } from '../zora/zora.module';
import { FarcasterModule } from '../farcaster/farcaster.module';
import { FlutterwaveModule } from '../flutterwave/flutterwave.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    ZoraModule,
    FarcasterModule,
    FlutterwaveModule,
    ContractsModule,
  ],
  controllers: [OrdersController],
  providers: [OrderService, OrdersRepository, OrderCleanupService],
  exports: [OrderService],
})
export class OrdersModule {}
