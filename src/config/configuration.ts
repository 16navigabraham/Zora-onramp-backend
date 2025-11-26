export default () => ({
    port: parseInt(process.env.PORT || '3002', 10),

    database: {
        url: process.env.DATABASE_URL,
    },

    flutterwave: {
        publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
        secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
        encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY,
        webhookHash: process.env.FLUTTERWAVE_SECRET_HASH,
        bvn: process.env.FLUTTERWAVE_BVN,
    }, 

    blockchain: {
        rpcUrl: process.env.RPC_URL || 'https://mainnet.base.org',
        contractAddress: process.env.CONTRACT_ADDRESS,
        operatorPrivateKey: process.env.OPERATOR_PRIVATE_KEY,
        usdcAddress: process.env.USDC_ADDRESS,
    },

    exchange: {
        usdcToNgnRate: parseFloat(process.env.USDC_TO_NGN_RATE || '1600'),
        feePercentage: 0.1, // 10% fee
    },

    cors: {
        origin: process.env.CORS_ORIGIN ? 
            process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
            ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3002'],
        credentials: true,
    },

    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
    },
    
    farcaster: {
        apiKey: process.env.NEYNAR_API_KEY,
    },
    maintenance: {
        balanceCheck: {
            // Threshold in USDC (default 1 USDC)
            lowThresholdUsdc: parseFloat(process.env.BALANCE_LOW_THRESHOLD_USDC || '1'),
            // Cron expression or interval minutes. Default: every 10 minutes
            checkIntervalMinutes: parseInt(process.env.BALANCE_CHECK_INTERVAL_MINUTES || '10', 10),
            // Cooldown in minutes between repeated alerts. Default: 360 (6 hours)
            alertCooldownMinutes: parseInt(process.env.BALANCE_ALERT_COOLDOWN_MINUTES || '360', 10),
            // Hysteresis margin in USDC to avoid flapping
            hysteresisUsdc: parseFloat(process.env.BALANCE_HYSTERESIS_USDC || '5'),
        }
    },
});