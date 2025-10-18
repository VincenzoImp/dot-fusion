# DotFusion Resolver Service

The DotFusion Resolver Service is an automated liquidity provider that monitors swap events on both Ethereum and Polkadot chains and automatically fulfills swap requests.

## 🎯 Overview

The resolver service acts as a trusted market maker that:
- Listens to `SwapCreated` events on both Ethereum and Polkadot
- Automatically creates counterparty swaps using its own liquidity
- Completes swaps by revealing secrets when appropriate
- Provides instant swap fulfillment for users

## 🏗️ Architecture

```
User creates swap on ETH
         ↓
Resolver detects event
         ↓
Resolver creates matching swap on DOT
         ↓
User reveals secret to claim DOT
         ↓
Resolver uses secret to claim ETH
```

## 📋 Prerequisites

Before running the resolver service, you need:

1. **A funded wallet address** with ETH and DOT (or equivalent test tokens)
2. **Private key** for that wallet
3. **Deployed contracts** on both chains
4. **Node.js** v18 or higher

## 🚀 Setup

### Step 1: Deploy Contracts

First, deploy the escrow contracts if you haven't already:

```bash
cd packages/hardhat
yarn deploy
```

### Step 2: Generate Resolver Wallet

Generate a new wallet for the resolver (or use an existing one):

```bash
# Generate a new account
yarn generate-account

# This will output:
# Address: 0x...
# Private Key: 0x...
```

**⚠️ IMPORTANT:** Keep the private key secret! Never commit it to git.

### Step 3: Fund the Resolver

Send ETH and DOT to the resolver address:

```bash
# For local testing, you can use hardhat's test accounts
# For testnet/mainnet, send real funds

# Check balance
yarn hardhat console
> (await ethers.provider.getBalance("RESOLVER_ADDRESS")).toString()
```

Recommended minimum balances:
- **Testnet:** 0.1 ETH, 1000 DOT
- **Mainnet:** 1 ETH, 100,000 DOT (depending on expected volume)

### Step 4: Configure Environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
RESOLVER_ADDRESS=0x1234567890123456789012345678901234567890
RESOLVER_PRIVATE_KEY=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

### Step 5: Configure Frontend

Update the frontend configuration:

```bash
cd ../nextjs
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_RESOLVER_ADDRESS=0x1234567890123456789012345678901234567890
```

## 🎮 Running the Service

### Local Development

Start the local blockchain and deploy contracts:

```bash
# Terminal 1: Start local blockchain
yarn chain

# Terminal 2: Deploy contracts
yarn deploy

# Terminal 3: Start resolver service
yarn resolver-service

# Terminal 4: Start frontend
yarn start
```

### Testnet/Mainnet

```bash
# Make sure contracts are deployed to the target network
yarn deploy --network sepolia

# Start resolver service
HARDHAT_NETWORK=sepolia yarn resolver-service
```

## 📊 Monitoring

The resolver service provides real-time logging:

```
╔═══════════════════════════════════════════════════════════════╗
║             🔄 DotFusion Resolver Service 🔄                  ║
╚═══════════════════════════════════════════════════════════════╝

📋 Configuration:
   Resolver Address: 0x1234...
   Exchange Rate: 1 ETH = 100,000 DOT
   Min ETH Amount: 0.001 ETH
   Min DOT Amount: 100 DOT
   ETH Timelock: 12 hours
   DOT Timelock: 6 hours

📝 Contract Addresses:
   Ethereum Escrow: 0xabcd...
   Polkadot Escrow: 0xef12...

💰 Resolver Balances:
   ETH Balance: 1.5 ETH

🚀 Starting event listeners...

👂 Listening to Ethereum Escrow events...
👂 Listening to Polkadot Escrow events...
✅ Resolver service is running!
```

When a swap is detected:

```
🆕 New ETH->DOT swap detected!
Swap ID: 0x123...
Maker: 0xabc...
ETH Amount: 0.1
DOT Amount: 10000.0

🔄 Fulfilling ETH->DOT swap...
✅ DOT swap created! TX: 0xdef...
```

## ⚙️ Configuration

The resolver service can be configured by editing `resolver-service.ts`:

```typescript
const CONFIG = {
  // Exchange rate
  EXCHANGE_RATE: 100000, // 1 ETH = 100,000 DOT
  
  // Minimum amounts
  MIN_ETH_AMOUNT: "0.001",
  MIN_DOT_AMOUNT: "100",
  
  // Timelocks
  ETH_TIMELOCK: 12 * 3600, // 12 hours
  DOT_TIMELOCK: 6 * 3600,  // 6 hours
  
  // Polling interval
  POLL_INTERVAL: 5000, // 5 seconds
};
```

## 🔒 Security Considerations

1. **Private Key Security**
   - Never commit private keys to git
   - Use environment variables
   - Consider using a hardware wallet for mainnet
   - Rotate keys regularly

2. **Liquidity Management**
   - Monitor balances regularly
   - Set up alerts for low balances
   - Implement automatic rebalancing if needed

3. **Rate Limiting**
   - The service has minimum amount checks to prevent dust attacks
   - Consider adding rate limiting for additional protection

4. **Error Handling**
   - The service logs all errors but continues running
   - Monitor logs for failed transactions
   - Implement alerting for critical errors

## 📱 Using the Simplified UI

Once the resolver service is running, users can use the simplified swap interface:

1. Navigate to `/swap-simple` in the frontend
2. Choose swap direction (ETH→DOT or DOT→ETH)
3. Enter destination address
4. Enter amount
5. Click "Swap"

The resolver service will automatically:
- Detect the swap creation
- Create the counterparty swap
- Complete the swap when the secret is revealed

## 🐛 Troubleshooting

### Resolver not fulfilling swaps

Check:
- Resolver service is running
- Resolver has sufficient balance
- Swap amount is above minimum thresholds
- Resolver address matches in both .env files

### Transaction failures

Check:
- Gas prices are sufficient
- Timelock constraints are met (ETH: 12h+, DOT: <6h)
- Contract addresses are correct

### Cannot find deployed contracts

Run:
```bash
yarn deploy
```

Make sure deployments are in `packages/hardhat/deployments/`

## 🔄 Exchange Rate Updates

To update the exchange rate:

1. Edit `CONFIG.EXCHANGE_RATE` in `resolver-service.ts`
2. Update `FIXED_EXCHANGE_RATE` in `swap-simple/page.tsx`
3. Restart the resolver service
4. Redeploy the frontend

## 📈 Production Recommendations

For production deployment:

1. **Infrastructure**
   - Use a VPS or cloud instance (AWS, GCP, Digital Ocean)
   - Set up systemd service for auto-restart
   - Use PM2 or similar process manager

2. **Monitoring**
   - Set up log aggregation (ELK, Datadog, etc.)
   - Monitor balance alerts
   - Track transaction success rates

3. **Backup**
   - Backup private keys securely (offline)
   - Document recovery procedures
   - Test disaster recovery

4. **Scaling**
   - Start with conservative limits
   - Gradually increase liquidity
   - Monitor profitability vs. gas costs

## 📞 Support

For issues or questions:
- GitHub Issues: [Your Repo]
- Discord: [Your Discord]
- Email: security@dotfusion.io

## 📄 License

MIT License - see LICENSE file for details


