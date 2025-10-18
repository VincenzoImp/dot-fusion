# DotFusion Resolver API

The **Resolver API** is a simple Express server that acts as a liquidity provider for cross-chain swaps. Instead of listening to blockchain events (which requires complex RPC management), the resolver exposes REST API endpoints that the frontend calls.

## 🎯 How It Works

1. **User** creates a swap on one chain (ETH or DOT)
2. **Frontend** calls the Resolver API with swap details
3. **Resolver API** uses its private key to create the counterparty swap
4. Swap is fulfilled automatically!

**No event listening. No RPC complexity. Just simple API calls!**

## 🚀 Quick Start

### 1. Setup Environment

Create `.env` in `packages/hardhat/`:

```bash
# Resolver wallet (MUST have funds on both Sepolia and Paseo!)
RESOLVER_ADDRESS=0xYourResolverAddress
RESOLVER_PRIVATE_KEY=your_private_key_here

# Optional: Custom RPC endpoints
SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
PASEO_RPC=https://sys.ibp.network/paseo-asset-hub

# Optional: Custom port
RESOLVER_API_PORT=3001
```

### 2. Fund Your Resolver Wallet

The resolver needs funds on **both chains** to fulfill swaps:

#### Sepolia (Ethereum testnet):
- Get testnet ETH from: https://sepoliafaucet.com/
- Need at least: **0.01 ETH** for testing

#### Paseo Asset Hub (Polkadot testnet):
- Get testnet DOT from: https://faucet.polkadot.io/
- Need at least: **1000 DOT** for testing

### 3. Start the Resolver API

```bash
cd packages/hardhat
yarn resolver-api
```

You should see:
```
╔═══════════════════════════════════════════════════════════════╗
║              🚀 DotFusion Resolver API 🚀                     ║
╚═══════════════════════════════════════════════════════════════╝

✅ Server running on: http://localhost:3001

📋 Configuration:
   Resolver Address: 0xYourAddress
   Exchange Rate: 1 ETH = 100,000 DOT

🌐 Endpoints:
   GET  /status              - Check if resolver is online
   GET  /balance             - Check resolver balances
   POST /fulfill-eth-to-dot  - Fulfill ETH→DOT swap
   POST /fulfill-dot-to-eth  - Fulfill DOT→ETH swap

🔑 Using private key from .env
📡 Ready to receive swap requests!
```

### 4. Start the Frontend

In another terminal:
```bash
cd packages/nextjs
yarn start
```

Then visit: http://localhost:3000/swap-simple

## 📡 API Endpoints

### GET /status
Check if resolver is online and get configuration.

**Response:**
```json
{
  "status": "online",
  "resolverAddress": "0x...",
  "exchangeRate": {
    "ethToDot": 100000,
    "dotToEth": 0.00001,
    "description": "1 ETH = 100,000 DOT"
  },
  "minimumAmounts": {
    "eth": "0.00001",
    "dot": "1"
  },
  "timelocks": {
    "ethSide": "12 hours",
    "dotSide": "6 hours"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /balance
Check resolver wallet balances on both chains.

**Response:**
```json
{
  "resolverAddress": "0x...",
  "balances": {
    "sepolia": {
      "wei": "1000000000000000000",
      "eth": "1.0"
    },
    "paseo": {
      "wei": "100000000000000000000000",
      "dot": "100000.0"
    }
  }
}
```

### POST /fulfill-eth-to-dot
User created an ETH→DOT swap, resolver fulfills with DOT.

**Request Body:**
```json
{
  "swapId": "0x1234...",
  "secretHash": "0xabcd...",
  "maker": "0xUserAddress",
  "ethAmount": "0.001",
  "dotAmount": "100"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 12345,
  "message": "DOT swap created on Paseo"
}
```

### POST /fulfill-dot-to-eth
User created a DOT→ETH swap, resolver fulfills with ETH.

**Request Body:**
```json
{
  "swapId": "0x1234...",
  "secretHash": "0xabcd...",
  "taker": "0xUserAddress",
  "dotAmount": "100"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 12345,
  "ethAmount": "0.001",
  "message": "ETH swap created on Sepolia"
}
```

## 🧪 Testing the API

### Test Status Endpoint
```bash
curl http://localhost:3001/status
```

### Test Balance Endpoint
```bash
curl http://localhost:3001/balance
```

### Test ETH→DOT Fulfillment
```bash
curl -X POST http://localhost:3001/fulfill-eth-to-dot \
  -H "Content-Type: application/json" \
  -d '{
    "swapId": "0x1234...",
    "secretHash": "0xabcd...",
    "maker": "0xUserAddress",
    "ethAmount": "0.001",
    "dotAmount": "100"
  }'
```

## ⚙️ Configuration

### Exchange Rate
Currently fixed at: **1 ETH = 100,000 DOT**

To change, edit `CONFIG.EXCHANGE_RATE` in `resolver-api.ts`.

### Minimum Amounts
- **ETH**: 0.00001 ETH (~$0.03)
- **DOT**: 1 DOT (~$0.00001 ETH)

To change, edit `CONFIG.MIN_ETH_AMOUNT` and `CONFIG.MIN_DOT_AMOUNT`.

### Timelocks
- **ETH side**: 12 hours
- **DOT side**: 6 hours

To change, edit `CONFIG.ETH_TIMELOCK` and `CONFIG.DOT_TIMELOCK`.

### Port
Default: **3001**

To change, set `RESOLVER_API_PORT` in `.env`.

## 🔐 Security Notes

1. **Private Key Security**
   - Never commit `.env` to git
   - Use a dedicated wallet for the resolver
   - Only fund with testnet tokens for testing

2. **Production Considerations**
   - Add authentication/API keys
   - Add rate limiting
   - Add monitoring and logging
   - Use proper error handling
   - Deploy to a secure server

3. **Network Configuration**
   - For production, use reliable RPC providers
   - Consider load balancing
   - Monitor RPC health

## 🐛 Troubleshooting

### Resolver API won't start
```
⚠️  WARNING: RESOLVER_ADDRESS and RESOLVER_PRIVATE_KEY not set in .env!
```
**Solution**: Create `.env` with proper values (see step 1).

### "Failed to fulfill swap"
**Possible causes:**
1. Resolver wallet has insufficient balance
2. RPC endpoint is down
3. Gas price too low
4. Swap ID already exists

**Solution**: 
- Check balances with `/balance` endpoint
- Check RPC connectivity
- View logs for detailed error message

### Frontend shows "Resolver may be offline"
**Possible causes:**
1. Resolver API not running
2. Wrong port (should be 3001)
3. CORS issues

**Solution**:
- Make sure `yarn resolver-api` is running
- Check http://localhost:3001/status
- Look for errors in resolver logs

## 📊 Monitoring

### Check if Resolver is Running
```bash
curl http://localhost:3001/status
```

### Monitor Balances
```bash
# Check every 60 seconds
watch -n 60 'curl -s http://localhost:3001/balance | jq'
```

### View Logs
The resolver API logs all operations to console:
```
🔄 Fulfilling ETH→DOT swap:
Swap ID: 0x1234...
Maker: 0xUserAddress
ETH: 0.001, DOT: 100
✅ Transaction sent: 0xabcd...
✅ Confirmed in block: 12345
```

## 🎓 Next Steps

1. **Test with small amounts** first
2. **Monitor the logs** to understand the flow
3. **Try both directions**: ETH→DOT and DOT→ETH
4. **Check balances** before and after swaps
5. **Experiment** with different amounts

## 📚 Related Documentation

- [START_HERE.md](./START_HERE.md) - Choose your testing approach
- [SIMPLE_TESTING.md](./SIMPLE_TESTING.md) - Test without running resolver
- [TESTNET_SETUP.md](./TESTNET_SETUP.md) - Deploy contracts to testnets
- [README.md](./README.md) - Main project documentation

---

**Need help?** Open an issue on GitHub!


