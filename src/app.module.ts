import { Module } from "@nestjs/common";
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { OrdersModule } from "./orders/orders.module";
import { ZoraModule } from "./zora/zora.module";
import { FlutterwaveModule } from "./flutterwave/flutterwave.module";
import { ContractsModule } from "./contracts/contracts.module";
import { WebhookModule } from "./webhooks/webhook.module";
import { TelegramModule } from "./telegram/telegram.module";
import { HealthController } from "./health/health.controller";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { BalanceCheckService } from './maintenance/balance-check.service';
import { BalanceConfigController } from './maintenance/balance-config.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    ZoraModule,
    FlutterwaveModule,
    ContractsModule,
    OrdersModule,
    WebhookModule,
    TelegramModule
  ],
  controllers: [AppController, HealthController, BalanceConfigController],
  providers: [AppService, BalanceCheckService],
})
export class AppModule {}