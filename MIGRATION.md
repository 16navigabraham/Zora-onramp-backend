# Migration from PostgreSQL to MongoDB

This guide will help you migrate your data from PostgreSQL (Render) to MongoDB.

## Setup MongoDB

### Option 1: MongoDB Atlas (Recommended - Free Tier Available)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (M0 Free tier)
4. Set up database user credentials
5. Whitelist your IP (or use `0.0.0.0/0` for all IPs)
6. Get your connection string from "Connect" → "Connect your application"

Your connection string will look like:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/zora-onramp?retryWrites=true&w=majority
```

### Option 2: Other MongoDB Providers

- **MongoDB Cloud**: Free tier with 512MB
- **Railway**: $5/month
- **DigitalOcean**: Starting at $15/month

## Environment Variables

Update your `.env` file or Render environment variables:

```env
# Remove this:
# DATABASE_URL=postgresql://...

# Add this:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zora-onramp?retryWrites=true&w=majority
```

## Data Migration

### Step 1: Export Data from PostgreSQL

Connect to your Render PostgreSQL database and export orders:

```bash
# Using psql
psql $DATABASE_URL -c "COPY (SELECT * FROM orders) TO STDOUT WITH CSV HEADER" > orders.csv
```

Or use pgAdmin or DBeaver to export to JSON.

### Step 2: Transform Data (if needed)

The MongoDB schema matches PostgreSQL closely, but you may need to:
- Convert BigInt timestamps to regular numbers
- Ensure JSON fields are properly formatted

### Step 3: Import to MongoDB

Using `mongoimport`:

```bash
mongoimport --uri="mongodb+srv://..." --collection=orders --type=csv --headerline --file=orders.csv
```

Or use MongoDB Compass GUI for easier importing.

### Step 4: Verify Migration

After deploying the new code:

```bash
# Check order count
curl https://your-app.onrender.com/api/orders

# Test creating a new order
curl -X POST https://your-app.onrender.com/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","amountNGN":1670,"walletAddress":"0x..."}'
```

## Deployment Steps

1. **Update Render Environment Variables**
   - Add `MONGODB_URI`
   - Remove `DATABASE_URL` (optional, but cleaner)

2. **Deploy to Render**
   ```bash
   git add .
   git commit -m "Migrate from PostgreSQL to MongoDB"
   git push origin main
   ```

3. **Verify Deployment**
   - Check Render logs for successful MongoDB connection
   - Test API endpoints
   - Verify existing orders are accessible

## Rollback Plan

If you need to rollback:

1. Keep the PostgreSQL database running until migration is confirmed successful
2. Revert code changes: `git revert <commit-hash>`
3. Update environment variables back to `DATABASE_URL`

## Cost Comparison

- **PostgreSQL (Render)**: $7/month minimum
- **MongoDB Atlas Free**: Free up to 512MB
- **MongoDB Atlas M10**: $0.08/hour (~$57/month for production)

## Benefits of MongoDB for This Project

1. ✅ No schema migrations needed
2. ✅ Flexible JSON storage (perfect for virtualAccount and metadata)
3. ✅ Better horizontal scaling
4. ✅ Free tier available
5. ✅ Native JSON query support

## Support

If you encounter issues during migration, check:
- MongoDB connection string format
- Network access whitelist in MongoDB Atlas
- Render environment variables are set correctly
- Application logs for connection errors
