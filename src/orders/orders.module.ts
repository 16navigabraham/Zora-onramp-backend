import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrderService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { ZoraModule } from '../zora/zora.module';
import { FlutterwaveModule } from '../flutterwave/flutterwave.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [ZoraModule, FlutterwaveModule, ContractsModule],
  controllers: [OrdersController],
  providers: [OrderService, OrdersRepository],
  exports: [OrderService],
})
export class OrdersModule {}
