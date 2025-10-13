import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { ContractsService } from 'src/contracts/contracts.service';
import { FlutterwaveService } from 'src/flutterwave/flutterwave.service';
import { ZoraService } from 'src/zora/zora.service';
import { TelegramService } from 'src/telegram/telegram.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import * as crypto from 'crypto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private orderRepository: OrdersRepository,
    private contractsService: ContractsService,
    private flutterwaveService: FlutterwaveService,
    private zoraService: ZoraService,
    private telegramService: TelegramService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    try {
      const { username, amountNGN, email } = createOrderDto;

      this.logger.log(`Creating order for ${email}, amount: #${amountNGN}`);

      const recipientAddress =
        await this.zoraService.getAddressFromUsername(username);

      const orderId = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const usdcAmountBigInt = this.contractsService.calculateUSDC(amountNGN);
      const usdcAmountFormatted = (Number(usdcAmountBigInt) / 1e6).toFixed(6);
      const virtualAccount = await this.flutterwaveService.createVirtualAccount(
        email,
        amountNGN,
        orderId,
      );

      const { orderHash, txHash } = await this.contractsService.createOrder(
        orderId,
        recipientAddress,
        usdcAmountBigInt,
      );

      const order: Order = {
        orderId,
        orderHash,
        recipientAddress,
        username,
        amountNGN,
        usdcAmount: usdcAmountFormatted,
        email,
        virtualAccount,
        status: OrderStatus.PENDING,
        createdAt: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1000, // 15mins
        createTxHash: txHash,
      };

      this.orderRepository.save(order);

      // Send Telegram notification for order creation
      await this.telegramService.notifyOrderCreated(orderId, amountNGN, 'NGN');

      this.logger.log(`Order created successfully: ${orderId}`);
      return order;
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`);
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<Order> {
    const order = this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Just return the order without processing payment
    this.logger.log(`Retrieved order ${orderId}, status: ${order.status}`);
    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    return this.orderRepository.findAll();
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    
    order.status = status;
    this.orderRepository.save(order);
    this.logger.log(`Order ${orderId} status updated to ${status}`);
    
    return order;
  }

  async processPayment(orderId: string): Promise<Order> {
    const order = this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PENDING) {
      this.logger.warn(
        `Order ${orderId} is not pending, status: ${order.status}`,
      );
      return order;
    }

    try {
      this.logger.log(`Processing payment for order ${orderId}`);

      order.status = OrderStatus.CONFIRMED;
      this.orderRepository.save(order);

      const releaseTxHash = await this.contractsService.releaseUSDC(
        order.orderHash,
      );

      order.status = OrderStatus.COMPLETED;
      order.releaseTxHash = releaseTxHash;
      order.completedAt = Date.now();
      this.orderRepository.save(order);

      // Send Telegram notification for successful payment
      await this.telegramService.notifyPaymentSuccess(
        orderId,
        order.amountNGN,
        'NGN',
        parseFloat(order.usdcAmount)
      );

      this.logger.log(`Order ${orderId} completed successfully`);

      return order;
    } catch (error) {
      this.logger.error(
        `Failed to process payment for order ${orderId}: ${error.message}`,
      );
      order.status = OrderStatus.FAILED;
      order.errorMessage = error.message;
      this.orderRepository.save(order);

      // Send Telegram notification for payment failure
      await this.telegramService.notifyPaymentFailed(orderId, error.message);

      throw error;
    }
  }


  async verifyPayment(orderId: string): Promise<Order> {
    const order = this.orderRepository.findById(orderId);

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    try {
      const transaction = await this.flutterwaveService.verifyTransaction(
        order.virtualAccount.reference,
      );

      if (
        transaction.status === 'successful' &&
        order.status === OrderStatus.PENDING
      ) {
        return await this.processPayment(orderId);
      }

      return order;
    } catch (error) {
      this.logger.error(`Failed to verify payment: ${error.message}`);
      throw error;
    }
  }
}
