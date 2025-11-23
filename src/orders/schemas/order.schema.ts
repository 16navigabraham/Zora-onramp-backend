import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ collection: 'orders', timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderId: string;

  @Prop({ required: true })
  orderHash: string;

  @Prop({ required: true, index: true })
  recipientAddress: string;

  @Prop()
  username: string;

  @Prop()
  serviceType: string;

  @Prop({ index: true })
  email: string;

  @Prop({ required: true })
  amountNGN: number;

  @Prop({ required: true })
  usdcAmount: string;

  @Prop({ type: Object, required: true })
  virtualAccount: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    amount: number;
    expiresAt: string;
  };

  @Prop({ required: true, index: true })
  status: string;

  @Prop({ required: true, type: Number, index: true })
  createdAt: number;

  @Prop({ required: true, type: Number })
  expiresAt: number;

  @Prop({ type: Number })
  completedAt: number;

  @Prop()
  createTxHash: string;

  @Prop()
  releaseTxHash: string;

  @Prop()
  txHash: string;

  @Prop()
  errorMessage: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Create indexes
OrderSchema.index({ status: 1 });
OrderSchema.index({ email: 1 });
OrderSchema.index({ recipientAddress: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ orderId: 1 }, { unique: true });
