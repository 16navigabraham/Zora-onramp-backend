import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order as OrderEntity } from './entities/order.entity';
import { Order, OrderDocument } from './schemas/order.schema';

/**
 * OrdersRepository
 * Handles data persistence for orders using MongoDB via Mongoose
 */
@Injectable()
export class OrdersRepository {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async save(order: OrderEntity): Promise<OrderEntity> {
    const data = {
      orderId: order.orderId,
      orderHash: order.orderHash,
      recipientAddress: order.recipientAddress,
      amountNGN: order.amountNGN,
      usdcAmount: order.usdcAmount,
      virtualAccount: order.virtualAccount,
      status: order.status,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      completedAt: order.completedAt,
      email: order.email,
      username: order.username,
      serviceType: order.serviceType,
      createTxHash: order.createTxHash,
      releaseTxHash: order.releaseTxHash,
      errorMessage: order.errorMessage,
      metadata: order.metadata,
    };

    const saved = await this.orderModel.findOneAndUpdate(
      { orderId: order.orderId },
      data,
      { upsert: true, new: true },
    );

    return this.mapToOrder(saved);
  }

  async findById(orderId: string): Promise<OrderEntity | undefined> {
    const order = await this.orderModel.findOne({ orderId }).exec();
    return order ? this.mapToOrder(order) : undefined;
  }

  async findByOrderHash(orderHash: string): Promise<OrderEntity | undefined> {
    const order = await this.orderModel.findOne({ orderHash }).exec();
    return order ? this.mapToOrder(order) : undefined;
  }

  async findAll(): Promise<OrderEntity[]> {
    const orders = await this.orderModel.find().sort({ createdAt: -1 }).exec();
    return orders.map((order) => this.mapToOrder(order));
  }

  async findByEmail(email: string): Promise<OrderEntity[]> {
    const orders = await this.orderModel.find({ email }).sort({ createdAt: -1 }).exec();
    return orders.map((order) => this.mapToOrder(order));
  }

  async findByStatus(status: string): Promise<OrderEntity[]> {
    const orders = await this.orderModel.find({ status }).sort({ createdAt: -1 }).exec();
    return orders.map((order) => this.mapToOrder(order));
  }

  async findByRecipientAddress(address: string): Promise<OrderEntity[]> {
    const orders = await this.orderModel
      .find({ recipientAddress: new RegExp(`^${address}$`, 'i') })
      .sort({ createdAt: -1 })
      .exec();
    return orders.map((order) => this.mapToOrder(order));
  }

  async update(orderId: string, updates: Partial<OrderEntity>): Promise<OrderEntity | undefined> {
    try {
      const updated = await this.orderModel
        .findOneAndUpdate({ orderId }, updates, { new: true })
        .exec();

      return updated ? this.mapToOrder(updated) : undefined;
    } catch (error) {
      return undefined;
    }
  }

  async delete(orderId: string): Promise<boolean> {
    try {
      const result = await this.orderModel.deleteOne({ orderId }).exec();
      return result.deletedCount > 0;
    } catch (error) {
      return false;
    }
  }

  async count(): Promise<number> {
    return this.orderModel.countDocuments().exec();
  }

  async countByStatus(status: string): Promise<number> {
    return this.orderModel.countDocuments({ status }).exec();
  }

  async findAfterTimestamp(timestamp: number): Promise<OrderEntity[]> {
    const orders = await this.orderModel
      .find({ createdAt: { $gt: timestamp } })
      .sort({ createdAt: -1 })
      .exec();
    return orders.map((order) => this.mapToOrder(order));
  }

  async findExpired(): Promise<OrderEntity[]> {
    const now = Date.now();
    const orders = await this.orderModel
      .find({
        status: 'pending',
        expiresAt: { $lt: now },
      })
      .sort({ createdAt: -1 })
      .exec();
    return orders.map((order) => this.mapToOrder(order));
  }

  async clear(): Promise<void> {
    await this.orderModel.deleteMany({}).exec();
  }

  async getStatistics() {
    const [total, pending, confirmed, completed, failed, orders] = await Promise.all([
      this.orderModel.countDocuments().exec(),
      this.orderModel.countDocuments({ status: 'pending' }).exec(),
      this.orderModel.countDocuments({ status: 'confirmed' }).exec(),
      this.orderModel.countDocuments({ status: 'completed' }).exec(),
      this.orderModel.countDocuments({ status: 'failed' }).exec(),
      this.orderModel.find().select('amountNGN').exec(),
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
   * Maps MongoDB document to application Order entity
   */
  private mapToOrder(doc: OrderDocument): OrderEntity {
    return {
      orderId: doc.orderId,
      orderHash: doc.orderHash,
      recipientAddress: doc.recipientAddress,
      amountNGN: doc.amountNGN,
      usdcAmount: doc.usdcAmount,
      virtualAccount: doc.virtualAccount as any,
      status: doc.status as any,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
      completedAt: doc.completedAt,
      email: doc.email,
      username: doc.username,
      serviceType: doc.serviceType as any,
      createTxHash: doc.createTxHash,
      releaseTxHash: doc.releaseTxHash,
      errorMessage: doc.errorMessage,
      metadata: doc.metadata,
    };
  }
}
