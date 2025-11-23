-- PostgreSQL Data Export Script
-- Run this BEFORE switching to MongoDB to preserve your data

-- Export all orders to JSON format
COPY (
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT 
      "orderId",
      "orderHash",
      "recipientAddress",
      username,
      "serviceType",
      email,
      "amountNGN",
      "usdcAmount",
      "virtualAccount",
      status,
      "createdAt",
      "expiresAt",
      "completedAt",
      "createTxHash",
      "releaseTxHash",
      "txHash",
      "errorMessage",
      metadata
    FROM orders
    ORDER BY "createdAt" DESC
  ) t
) TO '/tmp/orders_export.json';

-- Alternative: Export to CSV format
COPY orders TO '/tmp/orders_export.csv' WITH (FORMAT CSV, HEADER true);

-- Get statistics before export
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_orders,
  SUM("amountNGN") as total_volume_ngn,
  MIN("createdAt") as oldest_order,
  MAX("createdAt") as newest_order
FROM orders;
