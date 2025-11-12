import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Order } from './entities/order.entity';

/**
 * OrdersRepository
 * Handles data persistence for orders using PostgreSQL via Prisma ORM
 */
@Injectable()
export class OrdersRepository {
  constructor(private prisma: PrismaService) {}

  async save(order: Order): Promise<Order> {
    const data: any = {
      orderId: order.orderId,
      orderHash: order.orderHash,
      recipientAddress: order.recipientAddress,
      amountNGN: order.amountNGN,
      usdcAmount: order.usdcAmount,
      virtualAccount: order.virtualAccount as any,
      status: order.status,
      createdAt: BigInt(order.createdAt),
      expiresAt: BigInt(order.expiresAt),
      completedAt: order.completedAt ? BigInt(order.completedAt) : null,
    };

    // Add optional fields if they exist
    if (order.email !== undefined) data.email = order.email;
    if (order.username !== undefined) data.username = order.username;
    if (order.serviceType !== undefined) data.serviceType = order.serviceType;
    if (order.createTxHash !== undefined) data.createTxHash = order.createTxHash;
    if (order.releaseTxHash !== undefined) data.releaseTxHash = order.releaseTxHash;
    if (order.errorMessage !== undefined) data.errorMessage = order.errorMessage;
    if (order.metadata !== undefined) data.metadata = order.metadata as any;

    const saved = await this.prisma.order.upsert({
      where: { orderId: order.orderId },
      update: data,
      create: data,
    });

    return this.mapToOrder(saved);
  }

  async findById(orderId: string): Promise<Order | undefined> {
    const order = await this.prisma.order.findUnique({
      where: { orderId },
    });
    return order ? this.mapToOrder(order) : undefined;
  }

  async findByOrderHash(orderHash: string): Promise<Order | undefined> {
    const order = await this.prisma.order.findFirst({
      where: { orderHash },
    });
    return order ? this.mapToOrder(order) : undefined;
  }

  async findAll(): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.mapToOrder(order));
  }

  async findByEmail(email: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.mapToOrder(order));
  }

  async findByStatus(status: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.mapToOrder(order));
  }

  async findByRecipientAddress(address: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        recipientAddress: {
          equals: address,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.mapToOrder(order));
  }

  async update(orderId: string, updates: Partial<Order>): Promise<Order | undefined> {
    try {
      const updateData: any = {};
      
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.createTxHash !== undefined) updateData.createTxHash = updates.createTxHash;
      if (updates.releaseTxHash !== undefined) updateData.releaseTxHash = updates.releaseTxHash;
      if (updates.errorMessage !== undefined) updateData.errorMessage = updates.errorMessage;
      if (updates.completedAt !== undefined) {
        updateData.completedAt = updates.completedAt ? BigInt(updates.completedAt) : null;
      }
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
      if (updates.virtualAccount !== undefined) updateData.virtualAccount = updates.virtualAccount;

      const updated = await this.prisma.order.update({
        where: { orderId },
        data: updateData,
      });

      return this.mapToOrder(updated);
    } catch (error) {
      return undefined;
    }
  }

  async delete(orderId: string): Promise<boolean> {
    try {
      await this.prisma.order.delete({
        where: { orderId },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async count(): Promise<number> {
    return this.prisma.order.count();
  }

  async countByStatus(status: string): Promise<number> {
    return this.prisma.order.count({
      where: { status },
    });
  }

  async findAfterTimestamp(timestamp: number): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gt: BigInt(timestamp),
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.mapToOrder(order));
  }

  async findExpired(): Promise<Order[]> {
    const now = BigInt(Date.now());
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'pending',
        expiresAt: {
          lt: now,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.mapToOrder(order));
  }

  async clear(): Promise<void> {
    await this.prisma.order.deleteMany();
  }

  async getStatistics() {
    const [total, pending, confirmed, completed, failed, orders] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'pending' } }),
      this.prisma.order.count({ where: { status: 'confirmed' } }),
      this.prisma.order.count({ where: { status: 'completed' } }),
      this.prisma.order.count({ where: { status: 'failed' } }),
      this.prisma.order.findMany({ select: { amountNGN: true } }),
    ]);

    return {
      total,
      pending,
      confirmed,
      completed,
      failed,
      totalVolume: orders.reduce((sum, order) => sum + order.amountNGN, 0),
    };
  }

  /**
   * Maps Prisma Order model to application Order entity
   * Converts BigInt timestamps back to numbers
   */
  private mapToOrder(prismaOrder: any): Order {
    return {
      orderId: prismaOrder.orderId,
      orderHash: prismaOrder.orderHash,
      recipientAddress: prismaOrder.recipientAddress,
      amountNGN: prismaOrder.amountNGN,
      usdcAmount: prismaOrder.usdcAmount,
      virtualAccount: prismaOrder.virtualAccount,
      status: prismaOrder.status,
      createdAt: Number(prismaOrder.createdAt),
      expiresAt: Number(prismaOrder.expiresAt),
      completedAt: prismaOrder.completedAt ? Number(prismaOrder.completedAt) : undefined,
      email: prismaOrder.email,
      username: prismaOrder.username,
      serviceType: prismaOrder.serviceType,
      createTxHash: prismaOrder.createTxHash,
      releaseTxHash: prismaOrder.releaseTxHash,
      errorMessage: prismaOrder.errorMessage,
      metadata: prismaOrder.metadata,
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
