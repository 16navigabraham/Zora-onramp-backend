-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderHash" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "username" TEXT,
    "serviceType" TEXT,
    "email" TEXT,
    "amountNGN" DOUBLE PRECISION NOT NULL,
    "usdcAmount" TEXT NOT NULL,
    "virtualAccount" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" BIGINT NOT NULL,
    "expiresAt" BIGINT NOT NULL,
    "completedAt" BIGINT,
    "createTxHash" TEXT,
    "releaseTxHash" TEXT,
    "txHash" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderId_key" ON "orders"("orderId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_email_idx" ON "orders"("email");

-- CreateIndex
CREATE INDEX "orders_recipientAddress_idx" ON "orders"("recipientAddress");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");
