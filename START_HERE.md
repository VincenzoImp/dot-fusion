# 🚀 DotFusion - Quick Start Guide

Welcome! Choose your path:

## 🎯 Choose Your Testing Method

### Option 1: Simple Manual Testing (RECOMMENDED)
**No backend, no RPC, just the frontend!**
- ✅ Easy to set up (1 command)
- ✅ No configuration needed
- ✅ Perfect for learning and testing
- 👉 See: **SIMPLE_TESTING.md**

### Option 2: Automated Resolver Service (Advanced)
**Requires backend service with RPC connections**
- ⚠️ Complex setup
- ⚠️ Needs RPC configuration
- ⚠️ Private key management
- 👉 Continue reading below

---

# Option 2: Automated Resolver Setup

This guide will get your cross-chain atomic swap resolver running in minutes.

## ✅ What You Have

- ✅ Smart contracts deployed on **Sepolia** and **Paseo**
- ✅ Beautiful instant swap frontend
- ✅ Cross-chain resolver service ready to run
- ✅ Complete documentation

## 🎯 What You Need

1. **Funded Resolver Wallet**
   - Address: `0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab`
   - Needs ETH on Sepolia
   - Needs DOT on Paseo

2. **Private Key in .env**
   - Location: `packages/hardhat/.env`
   - Must have `RESOLVER_ADDRESS` and `RESOLVER_PRIVATE_KEY`

## 🏃 Quick Start (3 Steps)

### Step 1: Get Testnet Tokens

#### Sepolia ETH
- Go to: https://sepoliafaucet.com
- Enter: `0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab`
- Get at least **0.1 ETH**

#### Paseo DOT
- Go to: https://faucet.polkadot.io
- Network: **Paseo Asset Hub**
- Enter: `0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab`
- Get at least **1000 DOT**

### Step 2: Configure Environment

```bash
cd packages/hardhat

# Copy example file
cp resolver.env.example .env

# Edit with your values
nano .env
```

Add:
```bash
RESOLVER_ADDRESS=0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab
RESOLVER_PRIVATE_KEY=your_private_key_here

SEPOLIA_RPC=https://rpc.sepolia.org
PASEO_RPC=https://paseo-asset-hub-rpc.polkadot.io
```

### Step 3: Run Everything

**Terminal 1 - Cross-Chain Resolver:**
```bash
cd packages/hardhat
yarn resolver-cross-chain
```

**Terminal 2 - Frontend:**
```bash
cd packages/nextjs
yarn start
```

**Browser:**
Open: http://localhost:3000/swap-simple

## ✨ Features

### Instant Swap UI
- Simple 3-field form
- Auto-calculates exchange rate
- Shows resolver status
- Beautiful modern design
- Real-time feedback

### Cross-Chain Resolver
- Listens to **both** Sepolia and Paseo
- Automatically fulfills swaps
- Completes atomic swaps
- Real-time logging
- Error handling

## 📊 What to Expect

When running properly, you'll see:

### Resolver Terminal
```
╔═══════════════════════════════════════════════════════════════╗
║          🌐 DotFusion Cross-Chain Resolver 🌐                 ║
╚═══════════════════════════════════════════════════════════════╝

🌐 Network: Cross-Chain
📋 Configuration:
   Resolver Address: 0x6220...
   Exchange Rate: 1 ETH = 100,000 DOT

💰 Resolver Balances:
   Sepolia: 0.15 ETH
   Paseo: 2000.0 DOT

👂 Listening to Sepolia (Ethereum) events...
👂 Listening to Paseo (Polkadot) events...
✅ Cross-chain resolver is running!
```

### Frontend
- Green badge: **"Resolver Online"**
- Exchange rate displayed
- All fields enabled
- Ready to swap!

## 🧪 Test Your Setup

1. Go to http://localhost:3000/swap-simple
2. Select **ETH → DOT**
3. Enter **0.00001 ETH** (very small for testing!)
4. Enter your DOT address
5. Click **"Instant Swap"**

**Watch the resolver terminal for:**
```
🆕 New ETH→DOT swap on Sepolia!
🔄 Creating counterparty swap on Paseo...
✅ Paseo swap created!
✅ Swap completed!
🎉 ETH→DOT swap fully completed!
```

## 📚 Documentation

- **CROSS_CHAIN_SETUP.md** - Detailed cross-chain guide
- **QUICKSTART.md** - Local development guide
- **RESOLVER_SERVICE.md** - Resolver documentation
- **README.md** - Project overview

## 🐛 Troubleshooting

### "Resolver Offline" in frontend
- Check resolver terminal is running
- Make sure you ran `yarn resolver-cross-chain`
- Check for error messages in terminal

### "Low balance" warnings
- Fund your resolver on both chains
- Check balances with block explorers

### TypeScript errors
- Already fixed! Just run `yarn resolver-cross-chain`

### Connection errors
- Check your RPC URLs in `.env`
- Try alternative RPCs if needed

## 🎯 Contract Addresses

### Sepolia (Ethereum)
- **Ethereum Escrow:** `0x4cFC4fb3FF50D344E749a256992CB019De9f2229`
- **Explorer:** https://sepolia.etherscan.io

### Paseo (Polkadot)  
- **Polkadot Escrow:** `0xc84E1a9A1772251CA228F34d0af5040B94C7083c`
- **Explorer:** https://assethub-paseo.subscan.io

## 💡 Key Points

1. **One Resolver Process** - Handles both chains simultaneously
2. **Automatic Fulfillment** - No manual intervention needed
3. **Fixed Rate** - 1 ETH = 100,000 DOT
4. **Minimums** - 0.00001 ETH or 1 DOT (very low for testing!)
5. **Trustless** - Atomic swaps with HTLC contracts

## 🎉 Success Checklist

- [ ] Resolver wallet funded on both chains
- [ ] `.env` file configured with private key
- [ ] Resolver running without errors
- [ ] Frontend shows "Resolver Online"
- [ ] Test swap completed successfully

## 📞 Need Help?

Check the documentation:
- Detailed setup: **CROSS_CHAIN_SETUP.md**
- Local testing: **QUICKSTART.md**
- Service details: **RESOLVER_SERVICE.md**

## 🚀 You're Ready!

Once everything is running:
1. ✅ Resolver terminal shows "Listening to both chains"
2. ✅ Frontend shows "Resolver Online"
3. ✅ Balances funded on both chains

**You're ready to enable cross-chain swaps!** 🎉

---

**Quick Command Reference:**
```bash
# Start resolver
cd packages/hardhat && yarn resolver-cross-chain

# Start frontend  
cd packages/nextjs && yarn start

# Check balances
cd packages/hardhat && npx hardhat console --network sepolia
> await ethers.provider.getBalance("YOUR_ADDRESS")
```

Happy swapping! 🌉

