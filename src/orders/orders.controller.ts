import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrderService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.orderService.createOrder(createOrderDto);

    return {
      success: true,
      order: {
        orderId: order.orderId,
        orderHash: order.orderHash,
        virtualAccount: {
          accountNumber: order.virtualAccount.accountNumber,
          accountName: order.virtualAccount.accountName,
          bankName: order.virtualAccount.bankName,
          amount: order.amountNGN,
        },
        usdcAmount: order.usdcAmount,
        expiresAt: new Date(order.expiresAt).toISOString(),
        expiresIn: '15:00',
      },
    };
  }

  @Get(':orderId')
  async getOrder(@Param('orderId') orderId: string) {
    const order = await this.orderService.getOrder(orderId);
    return {
      success: true,
      order: {
        orderId: order.orderId,
        status: order.status,
        amountNGN: order.amountNGN,
        usdcAmount: order.usdcAmount,
        recipientAddress: order.recipientAddress,
        virtualAccount: order.virtualAccount,
        createdAt: new Date(order.createdAt).toISOString(),
        expiresAt: new Date(order.expiresAt).toISOString(),
        createTxHash: order.createTxHash,
        releaseTxHash: order.releaseTxHash,
      },
    };
  }

  @Get()
  async getAllOrders() {
    const orders = await this.orderService.getAllOrders();

    return {
      success: true,
      orders: orders.map((order) => ({
        orderId: order.orderId,
        status: order.status,
        amountNGN: order.amountNGN,
        usdcAmount: order.usdcAmount,
        username: order.username,
        email: order.email,
        createdAt: new Date(order.createdAt).toISOString(),
      })),
      totalOrders: orders.length,
    };
  }

  @Post(':orderId/verify-payment')
  async verifyPayment(@Param('orderId') orderId: string) {
    const order = await this.orderService.verifyPayment(orderId);

    return {
      success: true,
      order: {
        orderId: order.orderId,
        status: order.status,
        releaseTxHash: order.releaseTxHash,
      },
    };
  }
}
