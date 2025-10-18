# 🚀 DotFusion Quick Start Guide

This guide will help you set up and run the DotFusion resolver service for automatic cross-chain swaps between Ethereum and Polkadot.

## 📋 Prerequisites

Before you begin, make sure you have:

- [Node.js](https://nodejs.org/) v18 or higher
- [Yarn](https://yarnpkg.com/) package manager
- A wallet with ETH and DOT for testing (or equivalent test tokens)

## ⚡ Quick Setup (5 minutes)

### 1️⃣ Install Dependencies

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/your-org/dot-fusion.git
cd dot-fusion

# Install all dependencies
yarn install
```

### 2️⃣ Start Local Blockchain

Open a new terminal and start the local Hardhat network:

```bash
yarn chain
```

Keep this terminal open. You should see output like:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

### 3️⃣ Deploy Contracts

Open another terminal and deploy the smart contracts:

```bash
yarn deploy
```

You should see:
```
✅ DotFusionEthereumEscrow deployed at: 0x...
✅ DotFusionPolkadotEscrow deployed at: 0x...
```

### 4️⃣ Generate Resolver Wallet

Generate a new wallet for the resolver service:

```bash
cd packages/hardhat
yarn generate
```

This will create a new account and show you:
```
Public address: 0x1234567890123456789012345678901234567890
Private key: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

**⚠️ IMPORTANT:** Save these values! You'll need them in the next step.

### 5️⃣ Configure Resolver Service

Create a `.env` file in `packages/hardhat/`:

```bash
# Copy the example file
cp resolver.env.example .env

# Edit the file and add your resolver address and private key
nano .env
```

Add your values:
```bash
RESOLVER_ADDRESS=0x1234567890123456789012345678901234567890
RESOLVER_PRIVATE_KEY=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

### 6️⃣ Fund the Resolver

The resolver needs funds to fulfill swaps. For local testing, you can use Hardhat's test accounts:

```bash
# Run this in packages/hardhat directory
yarn hardhat console

# In the console, run:
const [signer] = await ethers.getSigners();
await signer.sendTransaction({
  to: "YOUR_RESOLVER_ADDRESS",
  value: ethers.parseEther("10.0")
});

# Check balance
await ethers.provider.getBalance("YOUR_RESOLVER_ADDRESS");
# Should show: 10000000000000000000n (10 ETH)

# Exit console
.exit
```

### 7️⃣ Configure Frontend

Create a `.env.local` file in `packages/nextjs/`:

```bash
cd ../nextjs
cp resolver.env.local.example .env.local
nano .env.local
```

Add your resolver address:
```bash
NEXT_PUBLIC_RESOLVER_ADDRESS=0x1234567890123456789012345678901234567890
```

### 8️⃣ Start the Resolver Service

Open a new terminal and start the resolver service:

```bash
cd packages/hardhat
yarn resolver-service
```

You should see:
```
╔═══════════════════════════════════════════════════════════════╗
║             🔄 DotFusion Resolver Service 🔄                  ║
╚═══════════════════════════════════════════════════════════════╝

📋 Configuration:
   Resolver Address: 0x1234...
   Exchange Rate: 1 ETH = 100,000 DOT
   ...

✅ Resolver service is running!
```

### 9️⃣ Start the Frontend

Open another terminal and start the Next.js frontend:

```bash
cd packages/nextjs
yarn start
```

The frontend will be available at: **http://localhost:3000**

### 🎉 You're Ready!

Now you have:
- ✅ Local blockchain running
- ✅ Smart contracts deployed
- ✅ Resolver service monitoring for swaps
- ✅ Frontend UI ready to use

## 🎮 Using the Simplified Swap UI

1. Open your browser to **http://localhost:3000**
2. Click "Connect Wallet" and connect MetaMask
3. Click "Instant Swap" button
4. Choose your swap direction (ETH→DOT or DOT→ETH)
5. Enter the amount to swap
6. Enter your destination address
7. Click "Swap"

The resolver service will automatically:
- Detect your swap creation
- Create the counterparty swap
- Complete the atomic swap

## 📊 What's Happening Behind the Scenes

```
┌─────────────┐                  ┌─────────────────┐
│    User     │                  │    Resolver     │
│             │                  │    Service      │
└──────┬──────┘                  └────────┬────────┘
       │                                  │
       │ 1. Create Swap (0.1 ETH)        │
       ├─────────────────────────────────>│
       │                                  │
       │                                  │ 2. Detect Event
       │                                  │
       │                                  │ 3. Create Counterparty
       │                                  │    Swap (10,000 DOT)
       │                                  │
       │<─────────────────────────────────┤
       │                                  │
       │ 4. Reveal Secret                │
       │    & Claim DOT                  │
       ├─────────────────────────────────>│
       │                                  │
       │                                  │ 5. Use Secret to
       │                                  │    Claim ETH
       │                                  │
       └──────────────────────────────────┘
```

## 🔍 Monitoring

Watch the resolver service terminal to see real-time activity:

```bash
🆕 New ETH->DOT swap detected!
Swap ID: 0x123abc...
Maker: 0xabc123...
ETH Amount: 0.1
DOT Amount: 10000.0

🔄 Fulfilling ETH->DOT swap...
✅ DOT swap created! TX: 0xdef456...

✅ Swap completed on Polkadot: 0x123abc...
Secret revealed: 0x789...

🔑 Completing ETH side with revealed secret...
✅ ETH swap completed! TX: 0x321cba...

🎉 ETH->DOT swap fully completed!
```

## 🧪 Testing Scenarios

### Test 1: ETH to DOT Swap

1. Go to **http://localhost:3000/swap-simple**
2. Select "ETH → DOT" direction
3. Enter amount: `0.1` ETH
4. Enter destination: Your test address
5. Click "Swap ETH → DOT"
6. Watch the resolver terminal - it should automatically fulfill!

### Test 2: DOT to ETH Swap

1. Same page, click the arrows to reverse direction
2. Select "DOT → ETH" 
3. Enter amount: `10000` DOT
4. Enter destination: Your test address
5. Click "Swap DOT → ETH"
6. Watch the resolver terminal - automatic fulfillment!

### Test 3: Check API

Test the resolver API endpoints:

```bash
# Get resolver status
curl http://localhost:3000/api/resolver/status

# Get a quote
curl "http://localhost:3000/api/resolver/quote?from=ETH&amount=0.1"
```

## 🛠️ Troubleshooting

### Resolver service won't start

**Error:** `RESOLVER_ADDRESS and RESOLVER_PRIVATE_KEY must be set`

**Solution:** Make sure you created `.env` file in `packages/hardhat/` with your resolver credentials.

### Low balance warning

**Warning:** `⚠️ WARNING: Low ETH balance`

**Solution:** Fund the resolver address using the Hardhat console (see step 6).

### Swap not being fulfilled

**Check:**
1. Resolver service is running (see terminal)
2. Resolver has sufficient balance
3. Swap amount is above minimum thresholds
4. Resolver address in both `.env` files matches

### Frontend shows wrong resolver address

**Solution:** Make sure `NEXT_PUBLIC_RESOLVER_ADDRESS` in `packages/nextjs/.env.local` matches the address in `packages/hardhat/.env`

## 📚 Next Steps

- **Read the full documentation:** See [RESOLVER_SERVICE.md](./RESOLVER_SERVICE.md)
- **Deploy to testnet:** Follow the testnet deployment guide
- **Customize exchange rate:** Edit the `CONFIG` in `resolver-service.ts`
- **Set up monitoring:** Add logging and alerting for production

## 🤝 Need Help?

- 📖 [Full Documentation](./RESOLVER_SERVICE.md)
- 💬 [Discord Community](https://discord.gg/dotfusion)
- 🐛 [Report Issues](https://github.com/your-org/dot-fusion/issues)
- 📧 Email: support@dotfusion.io

## 🎓 Advanced Topics

### Running on Testnet

To run on Sepolia testnet:

1. Get test ETH from a faucet: https://sepoliafaucet.com/
2. Deploy contracts: `yarn deploy --network sepolia`
3. Update `.env` with your funded address
4. Start resolver: `HARDHAT_NETWORK=sepolia yarn resolver-service`

### Customizing Exchange Rate

Edit `packages/hardhat/scripts/resolver-service.ts`:

```typescript
const CONFIG = {
  EXCHANGE_RATE: 100000, // Change this value
  // ...
};
```

Also update `packages/nextjs/app/swap-simple/page.tsx`:

```typescript
const FIXED_EXCHANGE_RATE = 100000; // Match the value above
```

### Setting Up Production

For production deployment:

1. Use a secure server (AWS, GCP, Digital Ocean)
2. Set up systemd service or PM2 for auto-restart
3. Configure monitoring and alerting
4. Use a hardware wallet for the resolver
5. Set up proper logging
6. Implement rate limiting
7. Add health checks

See [RESOLVER_SERVICE.md](./RESOLVER_SERVICE.md) for production recommendations.

---

🎉 **Congratulations!** You now have a fully functional cross-chain atomic swap protocol with automatic fulfillment!


