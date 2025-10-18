# Resolver API Implementation - Summary of Changes

## 🎯 Overview

The DotFusion resolver has been redesigned from a **complex event-listening service** to a **simple REST API server**. This makes it much easier to set up, test, and debug!

## ✅ What Changed

### 1. New Resolver API Server
**File**: `packages/hardhat/scripts/resolver-api.ts`

- Simple Express server on port 3001
- Reads private key from `.env`
- **No RPC event listening** - just API endpoints!
- Frontend calls the API after creating swaps

**Endpoints**:
- `GET /status` - Check if resolver is online
- `GET /balance` - Check resolver balances on both chains
- `POST /fulfill-eth-to-dot` - Fulfill ETH→DOT swap
- `POST /fulfill-dot-to-eth` - Fulfill DOT→ETH swap

### 2. Frontend Integration
**File**: `packages/nextjs/app/swap-simple/page.tsx`

The simplified swap UI now:
1. User creates swap on blockchain
2. Frontend immediately calls resolver API
3. Resolver executes the counterparty swap
4. User gets instant feedback

```typescript
// After user creates swap on Ethereum...
await writeEthereumEscrow({ ... });

// Frontend calls resolver API
const response = await fetch("http://localhost:3001/fulfill-eth-to-dot", {
  method: "POST",
  body: JSON.stringify({
    swapId, secretHash, maker, ethAmount, dotAmount
  })
});
```

### 3. Updated Dependencies
**File**: `packages/hardhat/package.json`

Added:
- `express` - Web server framework
- `cors` - Cross-origin requests
- `@types/express` - TypeScript types
- `@types/cors` - TypeScript types

### 4. New Documentation

**Created Files**:
- `RESOLVER_API.md` - Full API documentation
- `START_RESOLVER_API.md` - Quick start guide

**Updated Files**:
- `README.md` - Added resolver API as recommended approach
- `packages/nextjs/app/api/resolver/status/route.ts` - Now proxies to resolver API

## 🚀 How to Use

### Quick Start

1. **Setup Environment** (`packages/hardhat/.env`):
```bash
RESOLVER_ADDRESS=0xYourAddress
RESOLVER_PRIVATE_KEY=your_key
```

2. **Install Dependencies**:
```bash
cd /Users/vincenzo/Documents/GitHub/dot-fusion
yarn install
```

3. **Start Resolver API**:
```bash
cd packages/hardhat
yarn resolver-api
```

4. **Start Frontend**:
```bash
cd packages/nextjs
yarn start
```

5. **Test**: http://localhost:3000/swap-simple

## 🎨 Architecture Comparison

### ❌ Old Way (Event Listening):
```
Resolver Service
  ↓
Monitor RPC endpoints (complex!)
  ↓
Listen for blockchain events
  ↓
Detect swap creation
  ↓
Execute counterparty swap
```

**Problems**:
- Complex RPC management
- Connection failures
- Rate limiting issues
- Hard to debug
- Polling/WebSocket overhead

### ✅ New Way (API):
```
User → Frontend → Resolver API → Execute Swap
```

**Benefits**:
- Simple REST API
- Frontend triggers fulfillment
- Instant feedback
- Easy to debug
- No RPC complexity!

## 📁 File Structure

```
dot-fusion/
├── packages/
│   ├── hardhat/
│   │   ├── scripts/
│   │   │   ├── resolver-api.ts          ← NEW (recommended!)
│   │   │   ├── resolver-cross-chain.ts  (complex - event listening)
│   │   │   └── resolver-service.ts      (legacy - single chain)
│   │   ├── package.json                 ← UPDATED (dependencies)
│   │   └── .env.example
│   │
│   └── nextjs/
│       ├── app/
│       │   ├── swap-simple/page.tsx     ← UPDATED (API calls)
│       │   └── api/resolver/
│       │       └── status/route.ts      ← UPDATED (proxies API)
│
├── RESOLVER_API.md                      ← NEW (full documentation)
├── START_RESOLVER_API.md                ← NEW (quick start)
└── README.md                            ← UPDATED (new sections)
```

## 🔑 Key Configuration

### Exchange Rate
```typescript
EXCHANGE_RATE: 100000  // 1 ETH = 100,000 DOT
```

### Minimum Amounts
```typescript
MIN_ETH_AMOUNT: "0.00001"  // ~$0.03
MIN_DOT_AMOUNT: "1"        // ~$0.00001 ETH
```

### Timelocks
```typescript
ETH_TIMELOCK: 12 * 3600  // 12 hours
DOT_TIMELOCK: 6 * 3600   // 6 hours
```

### Contract Addresses
```typescript
SEPOLIA_ESCROW: "0x4cFC4fb3FF50D344E749a256992CB019De9f2229"
PASEO_ESCROW: "0xc84E1a9A1772251CA228F34d0af5040B94C7083c"
```

## 🧪 Testing

### Check Resolver Status
```bash
curl http://localhost:3001/status
```

### Check Balances
```bash
curl http://localhost:3001/balance
```

### Test ETH→DOT Fulfillment
```bash
curl -X POST http://localhost:3001/fulfill-eth-to-dot \
  -H "Content-Type: application/json" \
  -d '{
    "swapId": "0x...",
    "secretHash": "0x...",
    "maker": "0xUserAddress",
    "ethAmount": "0.00001",
    "dotAmount": "1"
  }'
```

## 🐛 Troubleshooting

### "Internal Error: fastqueue concurrency must be greater than 1"
This is a known yarn cache issue. Try:
```bash
rm -rf node_modules
rm -rf packages/*/node_modules
yarn cache clean
yarn install
```

Or use npm instead:
```bash
npm install
```

### "Resolver may be offline"
Check if the API is running:
```bash
curl http://localhost:3001/status
```

If not, start it:
```bash
cd packages/hardhat
yarn resolver-api
```

### "Insufficient funds"
The resolver wallet needs funds on both chains. Check balances:
```bash
curl http://localhost:3001/balance
```

Get testnet tokens:
- Sepolia: https://sepoliafaucet.com/
- Paseo: https://faucet.polkadot.io/

## 📊 Benefits of This Approach

1. **Simplicity**: No complex RPC management
2. **Reliability**: Direct API calls, no polling
3. **Debugging**: Easy to test with curl
4. **Scalability**: Can add rate limiting, auth, etc.
5. **Monitoring**: Clear logs of all operations
6. **Flexibility**: Easy to add new features

## 🎓 Next Steps

1. **Fund Your Resolver Wallet**
   - Sepolia: 0.01 ETH minimum
   - Paseo: 1000 DOT minimum

2. **Install Dependencies**
   ```bash
   yarn install
   ```

3. **Start the Resolver API**
   ```bash
   cd packages/hardhat
   yarn resolver-api
   ```

4. **Test a Swap**
   - Visit http://localhost:3000/swap-simple
   - Connect wallet
   - Create a small test swap (0.00001 ETH)
   - Watch the resolver logs!

## 📚 Documentation

- **[RESOLVER_API.md](./RESOLVER_API.md)** - Complete API reference
- **[START_RESOLVER_API.md](./START_RESOLVER_API.md)** - Quick start guide
- **[README.md](./README.md)** - Main project documentation

---

## 💡 Implementation Notes

### Why API Instead of Events?

1. **Simplicity**: REST API is universally understood
2. **Immediate**: No need to wait for event detection
3. **Reliable**: No RPC connection issues
4. **Testable**: Easy to test with standard HTTP tools
5. **Debuggable**: Clear request/response cycle

### Security Considerations

For production, add:
- API authentication (API keys, JWT)
- Rate limiting
- HTTPS/TLS
- Input validation
- Monitoring and alerts
- Proper error handling
- Database for swap tracking

### Scaling Considerations

The API can be scaled:
- Load balancer for multiple instances
- Redis for shared state
- Database for swap history
- Monitoring (Prometheus, Grafana)
- Queue system for high volume

---

**Built with ❤️ for the Polkadot Ecosystem**


