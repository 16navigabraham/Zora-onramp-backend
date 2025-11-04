import { VirtualAccount } from '../../flutterwave/flutterwave.service';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum ServiceType {
  ZORA = 'zora',
  BASEAPP = 'baseapp',
  WALLET = 'wallet',
}

export interface Order {
  orderId: string; // Unique order ID (e.g., ORD-1234567890-ABCD)
  orderHash: string; // Hash from smart contract

  recipientAddress: string; // Ethereum address (Zora wallet or direct wallet)
  username: string; // Zora username or wallet address input
  serviceType?: ServiceType; // "zora", "baseapp", "wallet" - identifies the service type
  email: string; // User email

  amountNGN: number; // Amount in Nigerian Naira
  usdcAmount: string; // Amount in USDC (formatted as string for precision)

  virtualAccount: VirtualAccount; // Flutterwave virtual account details

  status: OrderStatus;
  createdAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (usually 15 minutes after creation)
  completedAt?: number; // Unix timestamp (when USDC was sent)

  createTxHash?: string; // Transaction hash for createOrder on smart contract
  releaseTxHash?: string; // Transaction hash for releaseUSDC on smart contract

  errorMessage?: string; // Error message if order failed

  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    [key: string]: any;
  };
}

export interface CreateOrderInput {
  username?: string; // Zora username (optional)
  walletAddress?: string; // Direct wallet address (optional)
  serviceType?: ServiceType; // Service type identifier
  amountNGN: number;
  email: string;
}

export interface OrderResponse {
  orderId: string;
  orderHash: string;
  status: OrderStatus;
  amountNGN: number;
  usdcAmount: string;
  recipientAddress: string;
  virtualAccount: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    amount: number;
  };
  expiresAt: string;
  expiresIn: string;
  createdAt: string;
  createTxHash?: string;
  releaseTxHash?: string;
}
