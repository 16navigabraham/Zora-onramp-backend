# 🔄 Data Migration & Recovery Guide

## ⚠️ IMPORTANT: Data Preservation

Your PostgreSQL data **will NOT be lost** automatically. Here's the situation:

### Current Status:
- ✅ New MongoDB code is ready
- ⚠️ PostgreSQL database still active on Render until **Dec 12, 2025**
- ✅ You have **19 days** to migrate data safely

### What Happens Next:
1. **Code is updated** (MongoDB ready) but **PostgreSQL still works**
2. **Data sits in PostgreSQL** until you export it
3. **After Dec 12**: Render will suspend the free PostgreSQL database
4. **After grace period**: Data will be permanently deleted

---

## 🎯 Quick Start - Save Your Data NOW

### Option 1: Export Data Immediately (Recommended)

```bash
# 1. Set your PostgreSQL connection (from Render dashboard)
export DATABASE_URL="postgresql://..."

# 2. Export all data
npm run data:export
```

This creates two backup files:
- `data/orders_backup.json` - Full data in JSON format
- `data/orders_backup.csv` - CSV format for Excel/spreadsheet

### Option 2: Use Render Dashboard

1. Go to Render Dashboard → Your PostgreSQL database
2. Click "Connect" → Copy connection string
3. Use any PostgreSQL client (pgAdmin, DBeaver, TablePlus)
4. Export the `orders` table

---

## 📋 Complete Migration Steps

### Step 1: Export Data from PostgreSQL (Do This First!)

```bash
# Install dependencies
npm install

# Set environment variable (get from Render dashboard)
export DATABASE_URL="postgresql://postgres:xxx@dpg-xxx.oregon-postgres.render.com/zora_onramp_db_xxx"

# Export data
npm run data:export
```

**Expected Output:**
```
🔄 Exporting data from PostgreSQL...
📦 Exporting to JSON format...
✅ JSON export saved to: data/orders_backup.json
📦 Exporting to CSV format...
✅ CSV export saved to: data/orders_backup.csv

📊 Export Statistics:
   Total Orders: 42
   Pending: 5
   Completed: 30
   Failed: 3
   Expired: 4
   Total Volume: ₦70,140

✅ Export completed successfully!
```

### Step 2: Set Up MongoDB

**MongoDB Atlas (Free Tier - Recommended):**

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up / Log in
3. Create New Cluster:
   - Choose: **M0 Free** (512MB)
   - Region: Closest to your users
   - Cluster Name: `zora-onramp`

4. Create Database User:
   - Database Access → Add New User
   - Username: `zoraonramp`
   - Password: (save this securely!)
   - Role: Atlas Admin

5. Network Access:
   - Add IP: `0.0.0.0/0` (allow from anywhere)
   - This is needed for Render to connect

6. Get Connection String:
   - Click "Connect"
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your actual password

**Your connection string:**
```
mongodb+srv://zoraonramp:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/zora-onramp?retryWrites=true&w=majority
```

### Step 3: Import Data to MongoDB

```bash
# Set MongoDB connection string
export MONGODB_URI="mongodb+srv://zoraonramp:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/zora-onramp"

# Import data
npm run data:import
```

**Expected Output:**
```
🔄 Importing data to MongoDB...
📖 Reading exported data...
📦 Found 42 orders to import

🔌 Connecting to MongoDB...
✅ Connected to MongoDB

🔄 Transforming data...
📥 Importing orders to MongoDB...
   Imported: 42/42

📊 Import Statistics:
   ✅ Successfully imported: 42
   📦 Total orders in MongoDB: 42

✅ Import completed successfully!
```

### Step 4: Update Render Environment Variables

1. Go to Render Dashboard → Your Web Service
2. Go to "Environment" tab
3. **Add new variable:**
   ```
   MONGODB_URI=mongodb+srv://zoraonramp:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/zora-onramp
   ```
4. **Optional:** Keep `DATABASE_URL` until you verify migration works
5. Click "Save Changes"

Render will automatically redeploy with MongoDB.

### Step 5: Verify Migration

```bash
# Check if API is working
curl https://zora-onramp-backend.onrender.com/api/health

# Check orders endpoint
curl https://zora-onramp-backend.onrender.com/api/orders

# Test creating new order
curl -X POST https://zora-onramp-backend.onrender.com/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "amountNGN": 1670,
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

**Check Render Logs:**
- Should see: `✅ Database connected successfully`
- Should see: `MongoDB connected to: zora-onramp`

---

## 🆘 Troubleshooting

### If npm run data:export fails:

**Error: "psql command not found"**
```bash
# Windows (use Chocolatey or official installer)
choco install postgresql

# Mac
brew install postgresql

# Or download from: https://www.postgresql.org/download/
```

**Error: "Cannot connect to database"**
- Check `DATABASE_URL` is correct (get from Render dashboard)
- Ensure database is still active (not suspended)

### If npm run data:import fails:

**Error: "Cannot connect to MongoDB"**
- Check `MONGODB_URI` format is correct
- Verify MongoDB Atlas whitelist includes `0.0.0.0/0`
- Check username/password are correct

**Error: "Export file not found"**
- Run `npm run data:export` first
- Check `data/orders_backup.json` exists

---

## 🔐 Data Backup Best Practices

### Keep Multiple Backups:

1. **Local Backup**: `data/orders_backup.json` (from export)
2. **Cloud Storage**: Upload to Google Drive / Dropbox
3. **MongoDB**: Your live database
4. **PostgreSQL**: Keep until confirmed working (Dec 12)

### Backup Files Location:
```
project/
├── data/
│   ├── orders_backup.json  ← Primary backup (importable)
│   └── orders_backup.csv   ← Spreadsheet backup
└── scripts/
    ├── migrate-data.js     ← Migration tool
    └── export-postgresql-data.sql
```

---

## 📊 What Data is Preserved

All order data including:
- ✅ Order IDs and hashes
- ✅ Recipient addresses
- ✅ Email addresses
- ✅ Amounts (NGN and USDC)
- ✅ Virtual account details
- ✅ Order status (pending, completed, failed, expired)
- ✅ Timestamps (created, expires, completed)
- ✅ Transaction hashes
- ✅ Metadata

---

## ⏰ Timeline

- **Now**: Export data, set up MongoDB
- **Dec 12, 2025**: PostgreSQL database suspended
- **After grace period**: PostgreSQL data deleted permanently

**Action Required**: Export your data **before Dec 12** to ensure no loss.

---

## 🚨 Emergency Data Recovery

If you forgot to export and PostgreSQL is suspended:

1. **Contact Render Support** immediately
2. Request access to backup or extension
3. They may provide temporary access or backup file

**Prevention**: Export data TODAY - don't wait!

---

## ✅ Verification Checklist

- [ ] Exported data from PostgreSQL (`npm run data:export`)
- [ ] Created MongoDB Atlas cluster
- [ ] Imported data to MongoDB (`npm run data:import`)
- [ ] Updated Render environment variable (`MONGODB_URI`)
- [ ] Verified API works with MongoDB
- [ ] Backed up `data/orders_backup.json` to cloud storage
- [ ] Can delete PostgreSQL database (after confirming all works)

---

## 💡 Benefits After Migration

1. **No More Expiry Warnings** - MongoDB Atlas free tier doesn't expire
2. **Cost Savings** - Free vs $7/month
3. **Better Performance** - Native JSON support
4. **More Storage** - 512MB (vs Render's limits)
5. **Easier Scaling** - Can upgrade when needed

---

## 📞 Need Help?

If you encounter issues:

1. Check the export/import tool output for specific errors
2. Verify connection strings are correct
3. Check MongoDB Atlas network access whitelist
4. Review Render deployment logs

**Your data is safe as long as you export before Dec 12!** 🔒
