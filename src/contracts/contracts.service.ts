import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

const CONTRACT_ABI = [
  'function createOrder(string memory orderId, address recipient, uint256 usdcAmount) external returns (bytes32)',
  'function releaseUSDC(bytes32 orderHash) external',
  'function getOrder(bytes32 orderHash) external view returns (address recipient, uint256 usdcAmount, string orderId, bool fulfilled, uint256 timestamp)',
  'function getBalance() external view returns (uint256)',
  'event OrderCreated(bytes32 indexed orderHash, string orderId, address recipient, uint256 usdcAmount)',
  'event OrderFulfilled(bytes32 indexed orderHash, string orderId, address recipient, uint256 usdcAmount)',
];

@Injectable()
export class ContractsService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name);
  // readiness promise allows other services to wait until contract is initialized
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (err: any) => void;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor(private configService: ConfigService) {
    // initialize the readiness promise
    this.readyPromise = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
  }

  /**
   * Returns a promise that resolves when the contract client is initialized.
   */
  ready(): Promise<void> {
    return this.readyPromise || Promise.resolve();
  }

  onModuleInit() {
    this.initializeContract();
  }

  private initializeContract() {
    try {
      const rpcUrl = this.configService.get<string>('blockchain.rpcUrl');
      const contractAddress = this.configService.get<string>(
        'blockchain.contractAddress',
      );
      const operatorPrivateKey = this.configService.get<string>(
        'blockchain.operatorPrivateKey',
      );

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(
        operatorPrivateKey as string,
        this.provider,
      );
      this.contract = new ethers.Contract(
        contractAddress as string,
        CONTRACT_ABI,
        this.wallet,
      );

      this.logger.log(`Contract initialized: ${contractAddress}`);
      // Avoid logging full operator address in logs. Mask middle portion.
      const addr = this.wallet.address || '';
      const masked = addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'unknown';
      this.logger.log(`Operator address: ${masked}`);

      // mark ready
      try {
        this.readyResolve && this.readyResolve();
      } catch {}
    } catch (err) {
      this.logger.error(`Failed to initialize contract client: ${err?.message || err}`);
      try {
        this.readyReject && this.readyReject(err);
      } catch {}
      // rethrow so other lifecycle handlers can see errors if needed
      throw err;
    }
  }

  async createOrder(
    orderId: string,
    recipientAddress: string,
    usdcAmount: bigint,
  ): Promise<{ orderHash: string; txHash: string }> {
    try {
      this.logger.log(`Creating order ${orderId} for ${recipientAddress}`);

      const tx = await this.contract.createOrder(
        orderId,
        recipientAddress,
        usdcAmount,
      );
      const receipt = await tx.wait();

      const orderCreatedEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed && parsed.name === 'OrderCreated';
        } catch {
          return false;
        }
      });

      if (!orderCreatedEvent) {
        throw new Error('OrderCreated event not found in transaction receipt');
      }

      const parsedEvent = this.contract.interface.parseLog(orderCreatedEvent);
      const orderHash = parsedEvent?.args[0];

      this.logger.log(`Order created successfully: ${orderHash}`);

      return {
        orderHash,
        txHash: tx.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`);
      throw error;
    }
  }

  async releaseUSDC(orderHash: string): Promise<string> {
    try {
      this.logger.log(`Releasing USDC for order ${orderHash}`);

      const tx = await this.contract.releaseUSDC(orderHash);
      await tx.wait();

      this.logger.log(`USDC released successfully. Tx: ${tx.hash}`);

      return tx.hash;
    } catch (error) {
      this.logger.error(`Failed to release USDC: ${error.message}`);
      throw error;
    }
  }

  async getOrder(orderHash: string): Promise<{
    recipient: string;
    usdcAmount: bigint;
    orderId: string;
    fulfilled: boolean;
    timestamp: bigint;
  }> {
    try {
      const [recipient, usdcAmount, orderId, fulfilled, timestamp] =
        await this.contract.getOrder(orderHash);

      return {
        recipient,
        usdcAmount,
        orderId,
        fulfilled,
        timestamp,
      };
    } catch (error) {
      this.logger.error(`Failed to get order: ${error.message}`);
      throw error;
    }
  }

  async getContractBalance(): Promise<string> {
    try {
      const balance = await this.contract.getBalance();
      return ethers.formatUnits(balance, 6);
    } catch (error) {
      this.logger.error(`Failed to get balance: ${error.message}`);
      throw error;
    }
  }

  async getNetworkInfo() {
    const network = await this.provider.getNetwork();
    return {
      name: network.name,
      chainId: Number(network.chainId),
    };
  }

  calculateUSDC(ngnAmount: number): bigint {
    const feeNGN = this.configService.get<number>('exchange.feeNGN') || 70;
    const rate = this.configService.get<number>('exchange.ngnToUsdRate');
    if (!rate) {
      throw new Error('NGN to USD exchange rate not configured');
    }
    
    // Deduct fee before converting to USDC
    const amountAfterFee = ngnAmount - feeNGN;
    
    if (amountAfterFee <= 0) {
      throw new Error(`Amount after fee must be positive (received ${ngnAmount} NGN, fee is ${feeNGN} NGN)`);
    }
    
    const usdAmount = amountAfterFee / rate;
    return ethers.parseUnits(usdAmount.toFixed(6), 6);
  }
}
