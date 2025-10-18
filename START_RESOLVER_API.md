# 🚀 Quick Start: Resolver API

The **simplest** way to test DotFusion with automatic swap fulfillment!

## What You Need

1. ✅ A wallet with funds on **both** Sepolia and Paseo testnets
2. ✅ 2 terminal windows
3. ✅ 5 minutes of your time

## Step-by-Step

### 1. Get Testnet Funds

Your resolver wallet needs funds on both chains:

**Sepolia (Ethereum)**:
- 🔗 https://sepoliafaucet.com/
- Need: **0.01 ETH** minimum

**Paseo Asset Hub (Polkadot)**:
- 🔗 https://faucet.polkadot.io/
- Need: **1000 DOT** minimum

### 2. Setup Environment

Create `packages/hardhat/.env`:

```bash
RESOLVER_ADDRESS=0xYourResolverAddress
RESOLVER_PRIVATE_KEY=your_private_key_here
```

That's it! No RPC configuration needed (uses public endpoints).

### 3. Start the Resolver API

**Terminal 1:**
```bash
cd packages/hardhat
yarn resolver-api
```

✅ You should see:
```
🚀 DotFusion Resolver API 🚀
✅ Server running on: http://localhost:3001
📡 Ready to receive swap requests!
```

### 4. Start the Frontend

**Terminal 2:**
```bash
cd packages/nextjs
yarn start
```

### 5. Test a Swap!

1. Open http://localhost:3000/swap-simple
2. Connect your wallet
3. Enter destination address
4. Enter amount (as low as 0.00001 ETH!)
5. Click **"Instant Swap"**

The resolver will automatically:
- ✅ Detect your swap
- ✅ Create the counterparty swap
- ✅ Fulfill both sides

**That's it! No manual secrets, no RPC complexity!**

## How It Works

```
User                  Frontend              Resolver API           Blockchains
 │                       │                        │                    │
 │──Create ETH Swap─────>│                        │                    │
 │                       │────Transaction────────>│──────────>Sepolia  │
 │                       │                        │                    │
 │                       │──Call API──────────────>│                   │
 │                       │ /fulfill-eth-to-dot    │                   │
 │                       │                        │                    │
 │                       │                        │────Transaction────>Paseo
 │                       │                        │                    │
 │                       │<────Success────────────│                   │
 │<──Swap Complete!──────│                        │                    │
```

## Why This Approach?

### ❌ Old Way (Event Listening):
- Complex RPC management
- Connection issues
- Rate limiting
- Polling/websockets
- Hard to debug

### ✅ New Way (API Calls):
- Simple REST API
- Frontend triggers fulfillment
- Instant feedback
- Easy to debug
- No RPC complexity!

## Troubleshooting

### "Resolver may be offline"
```bash
# Check if API is running
curl http://localhost:3001/status
```

If it's not running, start it:
```bash
cd packages/hardhat
yarn resolver-api
```

### "Insufficient funds"
```bash
# Check balances
curl http://localhost:3001/balance
```

Get more testnet tokens from faucets (see step 1).

### "Transaction failed"
Check the resolver API logs in Terminal 1. You'll see detailed error messages.

## Testing Tips

1. **Start Small**: Try 0.00001 ETH first
2. **Check Status**: Visit `/status` endpoint to verify resolver is ready
3. **Monitor Logs**: Watch Terminal 1 for real-time swap events
4. **Check Balances**: Visit `/balance` endpoint to see resolver funds
5. **Try Both Directions**: Test ETH→DOT and DOT→ETH

## What's Next?

- 📖 Read [RESOLVER_API.md](./RESOLVER_API.md) for full API documentation
- 🔧 Customize exchange rate and timelocks in `resolver-api.ts`
- 🚀 Deploy to production (add auth, monitoring, etc.)

---

**Need help?** Check [README.md](./README.md) or open an issue!


