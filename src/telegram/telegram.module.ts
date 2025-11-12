import { Module, Global } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { ContractsModule } from '../contracts/contracts.module';
import { BalanceCheckService } from '../maintenance/balance-check.service';

@Global()
@Module({
  imports: [ContractsModule],
  controllers: [TelegramController],
  providers: [TelegramService, BalanceCheckService],
  exports: [TelegramService],
})
export class TelegramModule {}
