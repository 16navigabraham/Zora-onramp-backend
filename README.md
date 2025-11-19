# Zora Onramp Backend - Clean Codebase

## 🎯 **Project Overview**
A NestJS backend service for Zora onramp functionality with Telegram notifications, Flutterwave payment integration, and smart contract interactions.

## 📁 **Clean Project Structure**

```
src/
├── app.controller.ts          # Root endpoint with server status
├── app.module.ts             # Main application module
├── app.service.ts            # Server status service
├── main.ts                   # Application bootstrap
├── config/
│   └── configuration.ts     # Environment configuration
├── contracts/
│   ├── contracts.module.ts  # Smart contract module
│   └── contracts.service.ts # Contract interaction service
├── flutterwave/
│   ├── flutterwave.module.ts # Payment provider module
│   └── flutterwave.service.ts # Payment processing service
├── health/
│   └── health.controller.ts  # Health check endpoints
├── orders/
│   ├── dto/
│   │   └── create-order.dto.ts # Order creation DTO
│   ├── entities/
│   │   └── order.entity.ts   # Order entity definition
│   ├── order-cleanup.service.ts # Automatic order expiration
│   ├── orders.controller.ts  # Order management endpoints
│   ├── orders.module.ts      # Order module
│   ├── orders.repository.ts  # Order data repository
│   └── orders.service.ts     # Order business logic
├── telegram/
│   ├── telegram.module.ts    # Telegram notification module
│   └── telegram.service.ts   # Telegram bot service
├── webhooks/
│   ├── webhook.module.ts     # Webhook handling module
│   ├── webhooks.controller.ts # Webhook endpoints
│   └── webhooks.service.ts   # Webhook processing service
├── zora/
│   ├── zora.module.ts        # Zora integration module
│   ├── zora.controller.ts    # Zora username endpoints
│   └── zora.service.ts       # Zora blockchain service
└── farcaster/
    ├── farcaster.module.ts   # Farcaster integration module
    ├── farcaster.controller.ts # Farcaster username endpoints
    └── farcaster.service.ts  # Farcaster API service
```

## 🚀 **Available Endpoints**

### **Root**
- `GET /` - Server status and information

### **Health**
- `GET /api/health` - Detailed health check
- `GET /api/health/ping` - Simple ping test

### **Orders**
- `POST /api/orders/create` - Create new order
- `GET /api/orders/:orderId` - Get order details
- `GET /api/orders` - List all orders
- `POST /api/orders/:orderId/verify-payment` - Verify payment

### **Webhooks**
- `POST /api/webhooks/flutterwave` - Flutterwave payment webhook
- `POST /api/webhooks/test` - Test webhook endpoint

### **Zora**
- `GET /api/zora/resolve/:username` - Resolve Zora username to wallet address
- `GET /api/zora/validate/:username` - Validate Zora username or address

### **Farcaster**
- `GET /api/farcaster/resolve/:username` - Resolve Farcaster username to wallet address
- `GET /api/farcaster/validate/:username` - Validate Farcaster username or address

## 🔧 **Features**

### **✅ Telegram Notifications**
- Real-time notifications for order activities
- Payment success/failure alerts
- Server event monitoring
- Beautifully formatted messages with emojis

### **✅ Payment Processing**
- Flutterwave integration
- Virtual account creation
- Payment verification
- Webhook handling

### **✅ Smart Contract Integration**
- USDC calculations
- Order creation on blockchain
- USDC release functionality
- Contract balance monitoring

### **✅ Order Management**
- Complete order lifecycle
- Status tracking (pending, confirmed, completed, failed, expired)
- Automatic order expiration (15 minutes)
- Error handling
- Data persistence

## 🛠 **Environment Variables**

```env
# Server
PORT=3002

# Flutterwave
FLUTTERWAVE_PUBLIC_KEY=your_public_key
FLUTTERWAVE_SECRET_KEY=your_secret_key
FLUTTERWAVE_ENCRYPTION_KEY=your_encryption_key
FLUTTERWAVE_SECRET_HASH=your_secret_hash
FLUTTERWAVE_BVN=your_bvn

# Blockchain
RPC_URL=https://mainnet.base.org
CONTRACT_ADDRESS=your_contract_address
OPERATOR_PRIVATE_KEY=your_private_key
USDC_ADDRESS=your_usdc_address

# Exchange
NGN_TO_USD_RATE=1650
FEE_NGN=70

# Farcaster
NEYNAR_API_KEY=your_neynar_api_key

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# CORS
CORS_ORIGIN=http://localhost:3002
```

## 🏃 **Running the Application**

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the server
npm run start

# Development mode
npm run start:dev
```

## 📱 **Telegram Integration**

The Telegram bot sends notifications for:
- 🆕 **Order Created**: New order with payment amount
- ✅ **Payment Success**: Payment completed, USDC received
- ❌ **Payment Failed**: Payment failed with error details
- ⏰ **Order Cancelled**: Order expired due to timeout
- 🔔 **Server Events**: Security alerts and system events

## 🎉 **Clean & Production Ready**

- ✅ No redundant files or test scripts
- ✅ Clean module structure
- ✅ Proper error handling
- ✅ TypeScript compilation successful
- ✅ All endpoints working
- ✅ Telegram notifications functional
- ✅ No linting errors