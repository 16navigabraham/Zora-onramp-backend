import { Injectable } from '@nestjs/common';
import { Order } from './entities/order.entity';

/**
 * OrdersRepository
 * Handles data persistence for orders
 * Currently using in-memory Map - replace with database in production (e.g., TypeORM, Prisma)
 */
@Injectable()
export class OrdersRepository {
  // In-memory storage (replace with database in production)
  private orders = new Map<string, Order>();

  save(order: Order): Order {
    this.orders.set(order.orderId, order);
    return order;
  }

  findById(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  findByOrderHash(orderHash: string): Order | undefined {
    return Array.from(this.orders.values()).find(
      (order) => order.orderHash === orderHash,
    );
  }

  findAll(): Order[] {
    return Array.from(this.orders.values());
  }

  findByEmail(email: string): Order[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.email === email,
    );
  }

  findByStatus(status: string): Order[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.status === status,
    );
  }

  findByRecipientAddress(address: string): Order[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.recipientAddress.toLowerCase() === address.toLowerCase(),
    );
  }

  update(orderId: string, updates: Partial<Order>): Order | undefined {
    const order = this.orders.get(orderId);
    if (!order) return undefined;

    const updatedOrder = { ...order, ...updates };
    this.orders.set(orderId, updatedOrder);
    return updatedOrder;
  }

  delete(orderId: string): boolean {
    return this.orders.delete(orderId);
  }

  count(): number {
    return this.orders.size;
  }

  countByStatus(status: string): number {
    return this.findByStatus(status).length;
  }

  findAfterTimestamp(timestamp: number): Order[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.createdAt > timestamp,
    );
  }

  findExpired(): Order[] {
    const now = Date.now();
    return Array.from(this.orders.values()).filter(
      (order) => {
        // Handle both Unix timestamp and ISO string formats
        const expiresAt = typeof order.expiresAt === 'string' 
          ? new Date(order.expiresAt).getTime() 
          : order.expiresAt;
        return expiresAt < now && order.status === 'pending';
      }
    );
  }

  clear(): void {
    this.orders.clear();
  }

  getStatistics() {
    const orders = this.findAll();

    return {
      total: orders.length,
      pending: this.countByStatus('pending'),
      confirmed: this.countByStatus('confirmed'),
      completed: this.countByStatus('completed'),
      failed: this.countByStatus('failed'),
      totalVolume: orders.reduce((sum, order) => sum + order.amountNGN, 0),
    };
  }
}

/**
 * TODO: For production, replace this with a proper database
 *
 * Example with TypeORM:
 *
 * import { Repository } from 'typeorm';
 * import { InjectRepository } from '@nestjs/typeorm';
 *
 * @Injectable()
 * export class OrdersRepository {
 *   constructor(
 *     @InjectRepository(OrderEntity)
 *     private repository: Repository<OrderEntity>,
 *   ) {}
 *
 *   async save(order: Order): Promise<Order> {
 *     return this.repository.save(order);
 *   }
 *
 *   async findById(orderId: string): Promise<Order | null> {
 *     return this.repository.findOne({ where: { orderId } });
 *   }
 *
 *   // ... etc
 * }
 *
 * Example with Prisma:
 *
 * import { PrismaService } from '../prisma/prisma.service';
 *
 * @Injectable()
 * export class OrdersRepository {
 *   constructor(private prisma: PrismaService) {}
 *
 *   async save(order: Order): Promise<Order> {
 *     return this.prisma.order.create({ data: order });
 *   }
 *
 *   async findById(orderId: string): Promise<Order | null> {
 *     return this.prisma.order.findUnique({ where: { orderId } });
 *   }
 *
 *   // ... etc
 * }
 */
