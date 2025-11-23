#!/usr/bin/env node

/**
 * Data Export and Import Tool
 * 
 * This script helps you:
 * 1. Export data from PostgreSQL (Render) 
 * 2. Import data into MongoDB
 * 
 * Usage:
 *   npm run data:export   - Export from PostgreSQL
 *   npm run data:import   - Import to MongoDB
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration from environment
const POSTGRES_URL = process.env.DATABASE_URL;
const MONGODB_URI = process.env.MONGODB_URI;

const EXPORT_FILE = path.join(__dirname, '..', 'data', 'orders_backup.json');
const CSV_FILE = path.join(__dirname, '..', 'data', 'orders_backup.csv');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Export data from PostgreSQL
 */
async function exportFromPostgres() {
  console.log('🔄 Exporting data from PostgreSQL...\n');

  if (!POSTGRES_URL) {
    console.error('❌ Error: DATABASE_URL environment variable not set');
    console.log('   Set it in your .env file or export it:');
    console.log('   export DATABASE_URL="postgresql://..."');
    process.exit(1);
  }

  try {
    // Check if psql is available
    try {
      execSync('psql --version', { stdio: 'ignore' });
    } catch {
      console.error('❌ Error: psql command not found');
      console.log('   Install PostgreSQL client tools:');
      console.log('   - Windows: https://www.postgresql.org/download/windows/');
      console.log('   - Mac: brew install postgresql');
      console.log('   - Linux: apt-get install postgresql-client\n');
      process.exit(1);
    }

    // Export to JSON
    console.log('📦 Exporting to JSON format...');
    const jsonQuery = `
      COPY (
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT * FROM orders ORDER BY "createdAt" DESC
        ) t
      ) TO STDOUT
    `;
    
    const jsonData = execSync(`psql "${POSTGRES_URL}" -t -c "${jsonQuery.replace(/\n/g, ' ')}"`, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });
    
    fs.writeFileSync(EXPORT_FILE, jsonData.trim());
    console.log(`✅ JSON export saved to: ${EXPORT_FILE}`);

    // Export to CSV as backup
    console.log('\n📦 Exporting to CSV format...');
    const csvQuery = `\\copy orders TO '${CSV_FILE}' WITH (FORMAT CSV, HEADER true)`;
    execSync(`psql "${POSTGRES_URL}" -c "${csvQuery}"`, { stdio: 'inherit' });
    console.log(`✅ CSV export saved to: ${CSV_FILE}`);

    // Show statistics
    console.log('\n📊 Export Statistics:');
    const statsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
        ROUND(SUM("amountNGN")::numeric, 2) as total_volume_ngn
      FROM orders
    `;
    
    const stats = execSync(`psql "${POSTGRES_URL}" -t -c "${statsQuery.replace(/\n/g, ' ')}"`, {
      encoding: 'utf8'
    });
    
    console.log(stats);
    console.log('\n✅ Export completed successfully!\n');

  } catch (error) {
    console.error('❌ Export failed:', error.message);
    process.exit(1);
  }
}

/**
 * Import data to MongoDB
 */
async function importToMongoDB() {
  console.log('🔄 Importing data to MongoDB...\n');

  if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI environment variable not set');
    console.log('   Set it in your .env file or export it:');
    console.log('   export MONGODB_URI="mongodb+srv://..."');
    process.exit(1);
  }

  if (!fs.existsSync(EXPORT_FILE)) {
    console.error(`❌ Error: Export file not found: ${EXPORT_FILE}`);
    console.log('   Run data export first: npm run data:export');
    process.exit(1);
  }

  try {
    // Read the exported JSON data
    console.log('📖 Reading exported data...');
    const jsonData = fs.readFileSync(EXPORT_FILE, 'utf8');
    const orders = JSON.parse(jsonData);

    if (!Array.isArray(orders) || orders.length === 0) {
      console.log('⚠️  No orders found in export file');
      return;
    }

    console.log(`📦 Found ${orders.length} orders to import\n`);

    // Connect to MongoDB and import
    const mongoose = require('mongoose');
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Define schema (same as in the app)
    const orderSchema = new mongoose.Schema({
      orderId: { type: String, required: true, unique: true },
      orderHash: { type: String, required: true },
      recipientAddress: { type: String, required: true, index: true },
      username: String,
      serviceType: String,
      email: { type: String, index: true },
      amountNGN: { type: Number, required: true },
      usdcAmount: { type: String, required: true },
      virtualAccount: { type: Object, required: true },
      status: { type: String, required: true, index: true },
      createdAt: { type: Number, required: true, index: true },
      expiresAt: { type: Number, required: true },
      completedAt: Number,
      createTxHash: String,
      releaseTxHash: String,
      txHash: String,
      errorMessage: String,
      metadata: Object,
    });

    const Order = mongoose.model('Order', orderSchema, 'orders');

    // Transform data: Convert BigInt strings to Numbers
    console.log('🔄 Transforming data...');
    const transformedOrders = orders.map(order => ({
      ...order,
      createdAt: typeof order.createdAt === 'string' ? parseInt(order.createdAt) : Number(order.createdAt),
      expiresAt: typeof order.expiresAt === 'string' ? parseInt(order.expiresAt) : Number(order.expiresAt),
      completedAt: order.completedAt ? (typeof order.completedAt === 'string' ? parseInt(order.completedAt) : Number(order.completedAt)) : undefined,
    }));

    // Import in batches
    console.log('📥 Importing orders to MongoDB...');
    const batchSize = 100;
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < transformedOrders.length; i += batchSize) {
      const batch = transformedOrders.slice(i, i + batchSize);
      
      for (const orderData of batch) {
        try {
          await Order.findOneAndUpdate(
            { orderId: orderData.orderId },
            orderData,
            { upsert: true, new: true }
          );
          imported++;
          process.stdout.write(`\r   Imported: ${imported}/${transformedOrders.length}`);
        } catch (error) {
          skipped++;
          console.error(`\n⚠️  Skipped order ${orderData.orderId}: ${error.message}`);
        }
      }
    }

    console.log('\n\n📊 Import Statistics:');
    console.log(`   ✅ Successfully imported: ${imported}`);
    if (skipped > 0) {
      console.log(`   ⚠️  Skipped (duplicates/errors): ${skipped}`);
    }

    // Verify import
    const totalInDb = await Order.countDocuments();
    console.log(`   📦 Total orders in MongoDB: ${totalInDb}\n`);

    await mongoose.disconnect();
    console.log('✅ Import completed successfully!\n');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Main execution
const command = process.argv[2];

if (command === 'export') {
  exportFromPostgres();
} else if (command === 'import') {
  importToMongoDB();
} else {
  console.log('Usage:');
  console.log('  node scripts/migrate-data.js export   - Export from PostgreSQL');
  console.log('  node scripts/migrate-data.js import   - Import to MongoDB');
  console.log('');
  console.log('Or use npm scripts:');
  console.log('  npm run data:export');
  console.log('  npm run data:import');
}
