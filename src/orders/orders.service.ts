import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { ContractsService } from '../contracts/contracts.service';
import { FlutterwaveService } from '../flutterwave/flutterwave.service';
import { ZoraService } from '../zora/zora.service';
import { FarcasterService } from '../farcaster/farcaster.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus, ServiceType } from './entities/order.entity';
import { isAddress } from 'ethers';
import * as crypto from 'crypto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private orderRepository: OrdersRepository,
    private contractsService: ContractsService,
    private flutterwaveService: FlutterwaveService,
    private zoraService: ZoraService,
    private farcasterService: FarcasterService,
    private telegramService: TelegramService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    try {
      const { username, walletAddress, amountNGN, email, serviceType } = createOrderDto;

      this.logger.log(`Creating order for ${email}, amount: #${amountNGN}`);

      const orderId = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      let recipientAddress: string;
      let recipientIdentifier: string;
      let determinedServiceType: ServiceType;

      // Determine if this is a Zora, Farcaster, Base App, or wallet address order
      if (username) {
        // Username provided - determine service type
        if (serviceType === ServiceType.FARCASTER || serviceType === ServiceType.BASEAPP) {
          // Farcaster or Base App (both use Farcaster API)
          // Base App usernames are like: abrahamnavig.farcaster.eth
          recipientAddress = await this.farcasterService.getAddressFromUsername(username);
          recipientIdentifier = username;
          determinedServiceType = serviceType;
        } else {
          // Default to Zora for backward compatibility or when serviceType is ZORA
          recipientAddress = await this.zoraService.getAddressFromUsername(username);
          recipientIdentifier = username;
          determinedServiceType = serviceType || ServiceType.ZORA;
        }
      } else {
        // Direct wallet address provided (walletAddress is guaranteed to exist due to DTO validation)
        if (!this.isValidEthereumAddress(walletAddress!)) {
          throw new Error('Invalid Ethereum wallet address format');
        }
        recipientAddress = walletAddress!;
        recipientIdentifier = walletAddress!;
        // Default to 'wallet' for direct wallet addresses, or use specified serviceType
        determinedServiceType = serviceType || ServiceType.WALLET;
      }

      // Continue with existing parallel operations
      const [
        virtualAccount,
        usdcAmountBigInt
      ] = await Promise.all([
        this.flutterwaveService.createVirtualAccount(email, amountNGN, orderId),
        Promise.resolve(this.contractsService.calculateUSDC(amountNGN))
      ]);

      const usdcAmountFormatted = (Number(usdcAmountBigInt) / 1e6).toFixed(6);

      // Create smart contract order
      const { orderHash, txHash } = await this.contractsService.createOrder(
        orderId,
        recipientAddress,
        usdcAmountBigInt,
      );

      const order: Order = {
        orderId,
        orderHash,
        recipientAddress,
        username: recipientIdentifier, // Store either username or wallet address
        serviceType: determinedServiceType, // Store the service type
        amountNGN,
        usdcAmount: usdcAmountFormatted,
        email,
        virtualAccount,
        status: OrderStatus.PENDING,
        createdAt: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1000, // 15mins
        createTxHash: txHash,
      };

      await this.orderRepository.save(order);

      this.logger.log(`Order created successfully: ${orderId} for ${determinedServiceType}`);
      return order;
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`);
      throw error;
    }
  }

  private isValidEthereumAddress(address: string): boolean {
    // Use ethers.js isAddress() which validates both format and EIP-55 checksum
    // This prevents addresses with typos and ensures proper checksum validation
    return isAddress(address);
  }

  async getOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Just return the order without processing payment
    this.logger.log(`Retrieved order ${orderId}, status: ${order.status}`);
    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    return await this.orderRepository.findAll();
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    
    order.status = status;
    await this.orderRepository.save(order);
    this.logger.log(`Order ${orderId} status updated to ${status}`);
    
    return order;
  }

  async processPayment(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
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
      await this.orderRepository.save(order);

      const releaseTxHash = await this.contractsService.releaseUSDC(
        order.orderHash,
      );

      order.status = OrderStatus.COMPLETED;
      order.releaseTxHash = releaseTxHash;
      order.completedAt = Date.now();
      await this.orderRepository.save(order);

      // Send Telegram notification for successful payment with rich details
      await this.telegramService.notifyPaymentSuccess(
        orderId,
        order.amountNGN,
        'NGN',
        parseFloat(order.usdcAmount),
        order.recipientAddress,
        releaseTxHash,
        order.username
      );

      this.logger.log(`Order ${orderId} completed successfully`);

      return order;
    } catch (error) {
      this.logger.error(
        `Failed to process payment for order ${orderId}: ${error.message}`,
      );
      order.status = OrderStatus.FAILED;
      order.errorMessage = error.message;
      await this.orderRepository.save(order);

      // Send Telegram notification for payment failure with details
      await this.telegramService.notifyPaymentFailed(
        orderId, 
        error.message,
        order.amountNGN,
        'NGN',
        order.recipientAddress
      );

      throw error;
    }
  }


  async verifyPayment(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);

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

  async reconcileAllPending(): Promise<{
    checked: number;
    processed: number;
    failed: number;
    results: Array<{ orderId: string; status: string; message: string }>;
  }> {
    this.logger.log('Starting manual reconciliation of pending/expired orders');

    // Check both PENDING and EXPIRED orders (user may have paid but order timed out)
    const pendingOrders = await this.orderRepository.findByStatus(OrderStatus.PENDING);
    const expiredOrders = await this.orderRepository.findByStatus(OrderStatus.EXPIRED);
    const ordersToCheck = [...pendingOrders, ...expiredOrders];

    const results: Array<{ orderId: string; status: string; message: string }> = [];
    let processed = 0;
    let failed = 0;

    for (const order of ordersToCheck) {
      try {
        this.logger.log(`Checking order ${order.orderId} with Flutterwave`);

        const transaction = await this.flutterwaveService.verifyTransaction(
          order.virtualAccount.reference,
        );

        if (transaction.status === 'successful') {
          this.logger.log(`Payment found for order ${order.orderId}, processing...`);
          
          // Reset status to PENDING if it was EXPIRED, so processPayment can handle it
          if (order.status === OrderStatus.EXPIRED) {
            order.status = OrderStatus.PENDING;
            await this.orderRepository.save(order);
          }
          
          await this.processPayment(order.orderId);
          processed++;
          results.push({
            orderId: order.orderId,
            status: 'processed',
            message: 'Payment verified and processed successfully',
          });
        } else {
          results.push({
            orderId: order.orderId,
            status: 'pending',
            message: `Transaction status: ${transaction.status}`,
          });
        }
      } catch (error) {
        failed++;
        this.logger.error(`Failed to reconcile order ${order.orderId}: ${error.message}`);
        results.push({
          orderId: order.orderId,
          status: 'error',
          message: error.message,
        });
      }
    }

    this.logger.log(
      `Reconciliation complete: ${ordersToCheck.length} checked, ${processed} processed, ${failed} failed`,
    );

    return {
      checked: ordersToCheck.length,
      processed,
      failed,
      results,
    };
  }
}
