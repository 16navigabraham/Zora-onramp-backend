import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { OrdersModule } from "./orders/orders.module";
import { ZoraModule } from "./zora/zora.module";
import { FlutterwaveModule } from "./flutterwave/flutterwave.module";
import { ContractsModule } from "./contracts/contracts.module";
import { WebhookModule } from "./webhooks/webhook.module";
import { HealthController } from "./health/health.controller";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ZoraModule,
    FlutterwaveModule,
    ContractsModule,
    OrdersModule,
    WebhookModule
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}