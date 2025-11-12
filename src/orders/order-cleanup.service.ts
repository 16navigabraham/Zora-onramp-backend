import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { TelegramService } from '../telegram/telegram.service';
import { OrderStatus } from './entities/order.entity';

@Injectable()
export class OrderCleanupService implements OnModuleInit {
  private readonly logger = new Logger(OrderCleanupService.name);
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private orderRepository: OrdersRepository,
    private telegramService: TelegramService,
  ) {}

  onModuleInit() {
    this.logger.log('OrderCleanupService initialized - starting cleanup interval');
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.handleExpiredOrders();
    }, 60000); // 60 seconds
  }

  async handleExpiredOrders() {
    try {
      const expiredOrders = this.orderRepository.findExpired();
      
      if (expiredOrders.length === 0) {
        return;
      }

      this.logger.log(`Processing ${expiredOrders.length} expired orders`);

      for (const order of expiredOrders) {
        // Mark order as expired
        order.status = OrderStatus.EXPIRED;
        this.orderRepository.save(order);

        // Send Telegram notification for order cancellation with details
        await this.telegramService.notifyOrderCancelled(
          order.orderId,
          order.amountNGN,
          'NGN',
          order.recipientAddress,
          order.username
        );

        this.logger.log(`Order ${order.orderId} marked as expired`);
      }
    } catch (error) {
      this.logger.error(`Failed to process expired orders: ${error.message}`);
    }
  }

  // Manual trigger method for testing
  async manualCleanup(): Promise<void> {
    this.logger.log('Manual cleanup triggered');
    await this.handleExpiredOrders();
  }
}