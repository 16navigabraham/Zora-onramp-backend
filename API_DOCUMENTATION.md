# Zora Onramp Backend API Documentation

## 🎯 Overview
A NestJS backend service for Zora onramp functionality with support for multiple service types (Zora, BaseApp, Wallet), payment processing, and smart contract interactions.

**Base URL:** `https://zora-onramp-backend.onrender.com//api`

---

## 📋 Core API Endpoints

### **Create Order - `POST /api/orders/create`**

**Purpose:** Create a new order for USDC purchase

**Request Body:**
```json
{
  "username": "john.zora",           // Optional: For Zora users
  "walletAddress": "0x123...",       // Optional: For direct wallet address  
  "serviceType": "zora",             // Required: "zora", "baseapp", or "wallet"
  "amountNGN": 1000,                 // Required: 200-1600 NGN
  "email": "user@example.com"        // Required: Valid email
}
```

**Validation Rules:**
- Either `username` OR `walletAddress` must be provided
- `serviceType` must be one of: "zora", "baseapp", "wallet"
- `amountNGN` must be between 200-1600
- `email` must be valid email format

**Examples:**

#### Zora User Order:
```json
POST /api/orders/create
Content-Type: application/json

{
  "username": "john.zora",
  "serviceType": "zora",
  "amountNGN": 1000,
  "email": "john@example.com"
}
```

#### BaseApp Order:
```json
POST /api/orders/create
Content-Type: application/json

{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D46b85E0D5C4CCfe",
  "serviceType": "baseapp",
  "amountNGN": 1500,
  "email": "user@baseapp.com"
}
```

#### Direct Wallet Order:
```json
POST /api/orders/create
Content-Type: application/json

{
  "walletAddress": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  "serviceType": "wallet",
  "amountNGN": 800,
  "email": "wallet@example.com"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "order": {
    "orderId": "ORD-1699123456-ABCD",
    "orderHash": "0x1a2b3c4d5e6f...",
    "virtualAccount": {
      "accountNumber": "1234567890",
      "accountName": "User Name",
      "bankName": "Providus Bank",
      "amount": 1000
    },
    "usdcAmount": "0.606061",
    "expiresAt": "2025-11-03T15:15:00.000Z",
    "expiresIn": "15:00"
  }
}
```

**Error Response (400):**
```json
{
  "statusCode": 400,
  "message": [
    "Either username (for Zora) or walletAddress (for other services) must be provided"
  ],
  "error": "Bad Request"
}
```

---

### **Verify Payment - `POST /api/orders/:orderId/verify-payment`**

**Purpose:** Check payment status and trigger USDC release, works for manual verification

**Example:**
```bash
POST /api/orders/ORD-1699123456-ABCD/verify-payment
Content-Type: application/json
```

**Success Response (200):**
```json
{
  "success": true,
  "order": {
    "orderId": "ORD-1699123456-ABCD",
    "status": "completed",
    "releaseTxHash": "0xdef456789..."
  }
}
```

**Pending Payment Response (200):**
```json
{
  "success": true,
  "order": {
    "orderId": "ORD-1699123456-ABCD",
    "status": "pending"
  }
}
```

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "Order ORD-1699123456-ABCD not found",
  "error": "Not Found"
}
```

---

## 📊 Order Status Flow

| Status | Description |
|--------|-------------|
| `pending` | Order created, waiting for payment |
| `confirmed` | Payment received, processing USDC release |
| `completed` | USDC sent to recipient |
| `failed` | Error occurred during processing |
| `expired` | Order expired (15 minutes timeout) |

---

## 🏷️ Service Types

| Service Type | Description | Required Field |
|--------------|-------------|----------------|
| `zora` | Zora platform users | `username` |
| `baseapp` | BaseApp integration | `walletAddress` |
| `wallet` | Direct wallet transactions | `walletAddress` |

---

## 🚨 Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description or validation errors array",
  "error": "Bad Request"
}
```

### Common Error Codes:
- `400` - Bad Request (validation errors)
- `404` - Not Found (order not found)
- `500` - Internal Server Error

---

## 🔗 JavaScript Integration Example

```javascript
class ZoraOnrampAPI {
  constructor(baseURL = 'http://localhost:3002/api') {
    this.baseURL = baseURL;
  }

  async createOrder(orderData) {
    try {
      const response = await fetch(`${this.baseURL}/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Order creation failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  }

  async verifyPayment(orderId) {
    const response = await fetch(`${this.baseURL}/orders/${orderId}/verify-payment`, {
      method: 'POST'
    });
    return await response.json();
  }
}

// Usage Examples
const api = new ZoraOnrampAPI();

// Create order for Zora user
const zoraOrder = await api.createOrder({
  username: "john.zora",
  serviceType: "zora",
  amountNGN: 1000,
  email: "john@example.com"
});

// Create order for BaseApp
const baseappOrder = await api.createOrder({
  walletAddress: "0x742d35Cc6634C0532925a3b8D46b85E0D5C4CCfe",
  serviceType: "baseapp",
  amountNGN: 1000,
  email: "user@example.com"
});

// Verify payment
const verificationResult = await api.verifyPayment("ORD-1699123456-ABCD");
```