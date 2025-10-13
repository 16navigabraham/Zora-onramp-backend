import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersRepository } from '../orders/orders.repository';
import { TelegramService } from '../telegram/telegram.service';
import { OrderStatus } from '../orders/entities/order.entity';

@Injectable()
export class OrderCleanupService {
  private readonly logger = new Logger(OrderCleanupService.name);

  constructor(
    private orderRepository: OrdersRepository,
    private telegramService: TelegramService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
    try {
      const expiredOrders = this.orderRepository.findExpired();
      
      if (expiredOrders.length === 0) {
        return;
      }

      this.logger.log(`Found ${expiredOrders.length} expired orders`);

      for (const order of expiredOrders) {
        // Mark order as expired
        order.status = OrderStatus.EXPIRED;
        this.orderRepository.save(order);

        // Send Telegram notification for order cancellation
        await this.telegramService.notifyOrderCancelled(
          order.orderId,
          order.amountNGN,
          'NGN'
        );

        this.logger.log(`Order ${order.orderId} marked as expired`);
      }
    } catch (error) {
      this.logger.error(`Failed to process expired orders: ${error.message}`);
    }
  }
}
