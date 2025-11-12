# Deployment Guide - Render with PostgreSQL

This guide will help you deploy the Zora Onramp Backend to Render with PostgreSQL database.

## Prerequisites

- GitHub repository connected to Render
- Render account with access to the service dashboard

## Step-by-Step Deployment

### 1. Commit and Push Database Changes

```bash
git add .
git commit -m "feat: Add PostgreSQL database with Prisma ORM for order persistence"
git push origin AbNAVIG
```

### 2. Add PostgreSQL Database in Render

1. **Navigate to Render Dashboard**: https://dashboard.render.com
2. **Create New PostgreSQL Database**:
   - Click "New +" button
   - Select "PostgreSQL"
   - Configure database:
     - **Name**: `zora-onramp-db` (or your preferred name)
     - **Database**: `zora_onramp` (default)
     - **User**: `zora_onramp` (default)
     - **Region**: Same as your web service (for low latency)
     - **PostgreSQL Version**: 16 (latest)
     - **Plan**: Free or Starter (based on your needs)
   - Click "Create Database"

3. **Copy Database Connection Details**:
   - After creation, go to database "Info" tab
   - Copy the "Internal Database URL" (starts with `postgresql://`)
   - This will be used in the next step

### 3. Configure Environment Variables in Web Service

1. **Navigate to Your Web Service**:
   - Go to your `zora-onramp-backend` web service
   - Click "Environment" tab

2. **Add DATABASE_URL**:
   - Click "Add Environment Variable"
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the Internal Database URL from Step 2
   - Click "Save Changes"

### 4. Update Build & Deploy Configuration

1. **In Render Dashboard**, go to your web service settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start` (or `node dist/main`)

2. **Important**: The `start` script has been updated to run in production mode (`node dist/main`) instead of development mode to avoid memory issues.

3. **Prisma Client Generation**:
   - Prisma client is automatically generated via the `postbuild` script after `npm run build`
   - No additional configuration needed

### 5. Deploy the Application

The deployment will start automatically when you pushed to GitHub. If not:

1. Go to your web service dashboard
2. Click "Manual Deploy" → "Deploy latest commit"
3. Monitor the deployment logs for:
   - ✅ `npm install` completing
   - ✅ `npm run build` completing
   - ✅ `prisma generate` running (via postbuild script)
   - ✅ Server starting successfully
   - ✅ "✅ Database connected successfully" log message

### 6. Run Database Migrations (One-Time Setup)

Since this is the first deployment with the database, you need to create the tables:

**Option A: Via Render Shell** (Recommended)
1. In Render dashboard, go to your web service
2. Click "Shell" tab
3. Run the migration command:
   ```bash
   npx prisma migrate deploy
   ```

**Option B: Via Local Machine** (if you have access to production DB)
1. Temporarily set DATABASE_URL in your local .env to the Render PostgreSQL URL
2. Run:
   ```bash
   npx prisma migrate deploy
   ```
3. Revert your local .env back

**Option C: Create migration file and let Prisma auto-apply**
1. Locally, run:
   ```bash
   npx prisma migrate dev --name init
   ```
2. Commit and push the `prisma/migrations` folder
3. Add this to package.json scripts: `"deploy": "prisma migrate deploy"`
4. Update Render Build Command to: `npm install && npm run build && npm run deploy`

### 7. Verify Deployment

1. **Check Database Connection**:
   - View deployment logs in Render
   - Look for: `✅ Database connected successfully`

2. **Test Order Creation**:
   ```bash
   curl -X POST https://zora-onramp-backend.onrender.com/api/orders \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "amountNGN": 10000,
       "email": "test@example.com"
     }'
   ```

3. **Verify Persistence** (Test that data survives restart):
   - Create an order using the API
   - Note the `orderId` returned
   - In Render dashboard, manually restart the service
   - After restart, check if order still exists:
   ```bash
   curl https://zora-onramp-backend.onrender.com/api/orders/{orderId}
   ```
   - Should return the order (not 404) ✅

4. **Test Reconciliation**:
   ```bash
   curl -X POST https://zora-onramp-backend.onrender.com/api/orders/reconcile
   ```
   - Should now return orders if any exist (not `{"totalChecked":0}`)

## Environment Variables Checklist

Ensure all these are set in Render Environment tab:

### Required for Database
- ✅ `DATABASE_URL` - PostgreSQL connection string from Render database

### Required for Payment Processing
- ✅ `FLUTTERWAVE_PUBLIC_KEY`
- ✅ `FLUTTERWAVE_SECRET_KEY`
- ✅ `FLUTTERWAVE_ENCRYPTION_KEY`
- ✅ `FLUTTERWAVE_SECRET_HASH`
- ✅ `FLUTTERWAVE_BVN`

### Required for Blockchain
- ✅ `RPC_URL` - Base mainnet RPC (default: https://mainnet.base.org)
- ✅ `CONTRACT_ADDRESS` - Your smart contract address
- ✅ `OPERATOR_PRIVATE_KEY` - Private key for operator wallet
- ✅ `USDC_ADDRESS` - USDC contract address on Base

### Required for Telegram Notifications
- ✅ `TELEGRAM_BOT_TOKEN`
- ✅ `TELEGRAM_CHAT_ID`

### Optional
- `PORT` - Auto-set by Render (usually 10000)
- `NODE_ENV` - Set to `production`
- `NGN_TO_USD_RATE` - Default: 1650
- `CORS_ORIGIN` - Comma-separated allowed origins

## Post-Deployment Tasks

### Configure Flutterwave Webhook

Now that your backend has persistent storage, configure the webhook for instant payment processing:

1. **Login to Flutterwave Dashboard**: https://dashboard.flutterwave.com
2. **Navigate to Settings** → **Webhooks**
3. **Add Webhook URL**:
   ```
   https://zora-onramp-backend.onrender.com/api/webhooks/flutterwave
   ```
4. **Copy the Secret Hash** (if different from current one)
5. **Update FLUTTERWAVE_SECRET_HASH** in Render if needed
6. **Test webhook** by creating a test payment

### Monitor Initial Orders

1. Watch Telegram notifications channel
2. Monitor Render logs for any errors
3. Check that reconciliation finds and processes stuck payments

## Troubleshooting

### Database Connection Issues
- **Error**: `Can't reach database server`
  - **Fix**: Verify DATABASE_URL is set correctly in Render environment variables
  - **Fix**: Ensure web service and database are in the same region

### Migration Issues
- **Error**: `Database schema is not up to date`
  - **Fix**: Run `npx prisma migrate deploy` in Render Shell

### Build Issues
- **Error**: `Prisma Client not generated`
  - **Fix**: Ensure `postbuild` script in package.json runs `prisma generate`
  - **Fix**: Check that `prisma` is in `dependencies` (not `devDependencies`)

- **Error**: `JavaScript heap out of memory` during startup
  - **Fix**: Ensure Start Command is `npm run start` (not `nest start`)
  - **Fix**: The `start` script should run `node dist/main` (production mode)
  - **Fix**: If still occurring, check Render plan - free tier has 512MB RAM limit

### Runtime Issues
- **Error**: `No DATABASE_URL environment variable`
  - **Fix**: Add DATABASE_URL to Render environment variables
  - **Fix**: Restart the web service after adding environment variables

## Success Indicators

✅ Build logs show: `✔ Generated Prisma Client`  
✅ Deployment logs show: `✅ Database connected successfully`  
✅ Order creation returns valid order with `orderId`  
✅ Reconciliation endpoint returns orders (not empty)  
✅ Service restart doesn't lose order data  
✅ Flutterwave webhook triggers payment processing instantly  

## Next Steps After Deployment

1. ✅ Test end-to-end payment flow with small amount
2. ✅ Verify webhook processes payments in 2-5 seconds
3. ✅ Test reconciliation endpoint manually
4. ✅ Monitor Telegram notifications
5. ✅ Set up database backups in Render (if on paid plan)
6. ✅ Monitor database usage and upgrade plan if needed

## Database Backup (Important!)

**For Free Tier**: Render doesn't auto-backup free PostgreSQL databases
**For Paid Tier**: Enable automatic backups in database settings

**Manual Backup** (Recommended):
```bash
# From Render Shell or locally with production DATABASE_URL
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

Store backups securely off-platform!

---

## Support

If you encounter issues during deployment:
1. Check Render deployment logs
2. Check database connection logs
3. Verify all environment variables are set
4. Test database connection using Render Shell: `psql $DATABASE_URL`
