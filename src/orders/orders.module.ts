import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrderService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { OrderCleanupService } from './order-cleanup.service';
import { ZoraModule } from '../zora/zora.module';
import { FarcasterModule } from '../farcaster/farcaster.module';
import { FlutterwaveModule } from '../flutterwave/flutterwave.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [ZoraModule, FarcasterModule, FlutterwaveModule, ContractsModule],
  controllers: [OrdersController],
  providers: [OrderService, OrdersRepository, OrderCleanupService],
  exports: [OrderService],
})
export class OrdersModule {}
