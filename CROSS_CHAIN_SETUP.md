# 🌐 Cross-Chain Resolver Setup

This guide shows how to run the **true cross-chain resolver** that listens to BOTH Sepolia and Paseo simultaneously.

## 🎯 What It Does

The cross-chain resolver:
- ✅ Listens to **Sepolia** (Ethereum) for ETH→DOT swaps
- ✅ Listens to **Paseo** (Polkadot) for DOT→ETH swaps  
- ✅ Automatically creates counterparty swaps on the opposite chain
- ✅ Completes atomic swaps when secrets are revealed
- ✅ Runs in a **single process** managing both chains

## 🏗️ Architecture

```
User creates swap on Sepolia (ETH→DOT)
              ↓
  Resolver detects event on Sepolia
              ↓
  Resolver creates swap on Paseo (locks DOT)
              ↓
  User reveals secret on Paseo (claims DOT)
              ↓
  Resolver uses secret on Sepolia (claims ETH)
              ↓
         Swap Complete!
```

## 📋 Prerequisites

### 1. Funded Resolver Wallet

Your resolver needs funds on **BOTH** chains:

**Address:** `0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab`

#### Get Sepolia ETH
- https://sepoliafaucet.com
- https://www.alchemy.com/faucets/ethereum-sepolia
- **Recommended:** At least 0.1 ETH

#### Get Paseo DOT
- https://faucet.polkadot.io
- Select "Paseo Asset Hub"
- **Recommended:** At least 1000 DOT

### 2. Contract Addresses

Make sure you have contracts deployed:
- **Sepolia:** `0x4cFC4fb3FF50D344E749a256992CB019De9f2229`
- **Paseo:** `0xc84E1a9A1772251CA228F34d0af5040B94C7083c`

## ⚙️ Configuration

### 1. Create .env File

```bash
cd packages/hardhat
cp resolver.env.example .env
```

### 2. Edit .env

```bash
# Resolver wallet
RESOLVER_ADDRESS=0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab
RESOLVER_PRIVATE_KEY=0x... # Your private key

# RPC endpoints
SEPOLIA_RPC=https://rpc.sepolia.org
PASEO_RPC=https://paseo-asset-hub-rpc.polkadot.io

# Optional: Use faster RPCs
# SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
# PASEO_RPC=https://sys.ibp.network/paseo-asset-hub
```

## 🚀 Running the Service

### Start Cross-Chain Resolver

```bash
cd packages/hardhat
yarn resolver-cross-chain
```

You should see:

```
╔═══════════════════════════════════════════════════════════════╗
║          🌐 DotFusion Cross-Chain Resolver 🌐                 ║
╚═══════════════════════════════════════════════════════════════╝

📋 Configuration:
   Resolver Address: 0x6220...
   Exchange Rate: 1 ETH = 100,000 DOT

🌐 Networks:
   Sepolia RPC: https://rpc.sepolia.org
   Paseo RPC: https://paseo-asset-hub-rpc.polkadot.io

📝 Contract Addresses:
   Sepolia Escrow: 0x4cFC...
   Paseo Escrow: 0xc84E...

💰 Resolver Balances:
   Sepolia: 0.15 ETH
   Paseo: 2000.0 DOT

🚀 Starting cross-chain event listeners...

👂 Listening to Sepolia (Ethereum) events...
👂 Listening to Paseo (Polkadot) events...
✅ Cross-chain resolver is running!
   Listening to Sepolia AND Paseo simultaneously
   Press Ctrl+C to stop
```

### Start Frontend

In another terminal:

```bash
cd packages/nextjs
yarn start
```

Navigate to: **http://localhost:3000/swap-simple**

## 🧪 Testing Cross-Chain Swaps

### Test 1: ETH → DOT

1. Go to http://localhost:3000/swap-simple
2. Select "ETH → DOT"
3. Enter 0.00001 ETH (or any amount above minimum)
4. Enter your DOT destination address
5. Click "Instant Swap"

**What happens:**
- Transaction sent to Sepolia (locks 0.00001 ETH)
- Resolver detects event on Sepolia
- Resolver creates swap on Paseo (locks 1 DOT)
- User can claim DOT on Paseo
- Resolver claims ETH on Sepolia
- **Atomic swap complete!**

### Test 2: DOT → ETH

1. Same page, click arrows to reverse
2. Select "DOT → ETH"
3. Enter 1 DOT (or any amount above minimum)
4. Enter your ETH destination address
5. Click "Instant Swap"

**What happens:**
- Transaction sent to Paseo (locks 1 DOT)
- Resolver detects event on Paseo
- Resolver creates swap on Sepolia (locks 0.00001 ETH)
- User can claim ETH on Sepolia
- Resolver claims DOT on Paseo
- **Atomic swap complete!**

## 📊 Monitoring

Watch the resolver terminal for real-time activity:

### ETH → DOT Swap
```
🆕 New ETH→DOT swap on Sepolia!
Swap ID: 0x123abc...
Maker: 0xuser...
ETH Amount: 0.00001
DOT Amount: 1.0

🔄 Creating counterparty swap on Paseo...
✅ Paseo swap created! TX: 0xdef456...

✅ Swap completed on Paseo: 0x123abc...
Secret revealed: 0x789...

🔑 Completing Sepolia side with revealed secret...
✅ Sepolia swap completed! TX: 0x321cba...
🎉 ETH→DOT swap fully completed!
```

### DOT → ETH Swap
```
🆕 New DOT→ETH swap on Paseo!
Swap ID: 0x456def...
Taker: 0xuser...
DOT Amount: 1.0

🔄 Creating counterparty swap on Sepolia...
ETH Amount: 0.00001
✅ Sepolia swap created! TX: 0xabc123...

✅ Swap completed on Sepolia: 0x456def...
Secret revealed: 0x999...
🎉 DOT→ETH swap fully completed!
```

## 🔍 Verification

### Check Transactions

**Sepolia:**
https://sepolia.etherscan.io/address/0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab

**Paseo:**
https://assethub-paseo.subscan.io/account/0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab

### Check Balances

```bash
cd packages/hardhat

# Check Sepolia
npx hardhat console --network sepolia
> await ethers.provider.getBalance("0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab")

# Check Paseo  
npx hardhat console --network paseo
> await ethers.provider.getBalance("0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab")
```

## 🐛 Troubleshooting

### Error: "Low balance warning"

**Solution:** Fund your resolver on both chains using faucets

### Error: "Connection refused" or RPC errors

**Solution:** 
1. Check your RPC URLs in `.env`
2. Try alternative RPCs:
   ```bash
   # Sepolia alternatives
   SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
   
   # Paseo alternatives
   PASEO_RPC=https://sys.ibp.network/paseo-asset-hub
   PASEO_RPC=https://paseo-asset-hub-rpc.polkadot.io
   ```

### Swap not being fulfilled

**Check:**
1. Resolver service is running
2. Resolver has sufficient balance on BOTH chains
3. Amount is above minimums (0.00001 ETH or 1 DOT)
4. Check resolver terminal for error messages

### "Resolver Offline" in frontend

**Solutions:**
1. Make sure resolver service is running: `yarn resolver-cross-chain`
2. Check API endpoint is accessible
3. Frontend should show "Resolver Online" when working

## 📈 Production Considerations

### Recommended Setup

1. **VPS/Cloud Server**
   - AWS EC2, DigitalOcean Droplet, etc.
   - Minimum: 2GB RAM, 2 CPU cores
   - Ubuntu 22.04 LTS recommended

2. **Process Management**
   - Use PM2 to keep resolver running:
   ```bash
   npm install -g pm2
   cd packages/hardhat
   pm2 start "yarn resolver-cross-chain" --name dotfusion-resolver
   pm2 save
   pm2 startup
   ```

3. **Monitoring**
   - Set up log aggregation (Datadog, ELK stack)
   - Monitor balance alerts
   - Track success/failure rates

4. **Security**
   - Use hardware wallet for production
   - Implement rate limiting
   - Set up firewall rules
   - Regular security audits

### Scaling

For higher volumes:
- Increase resolver liquidity
- Use multiple resolver instances
- Implement load balancing
- Add caching layer

## 🎯 Key Differences from Single-Chain

| Feature | Single-Chain | Cross-Chain |
|---------|-------------|-------------|
| Processes | 2 (one per chain) | 1 (handles both) |
| Coordination | Manual | Automatic |
| Event Detection | Single chain | Both chains |
| Liquidity | Per chain | Shared pool |
| Complexity | Lower | Higher |
| Speed | Slower | Faster |

## 💡 Tips

1. **Start Small** - Test with minimum amounts first
2. **Monitor Logs** - Keep an eye on the terminal
3. **Check Balances** - Set up alerts for low funds
4. **Use Fast RPCs** - Alchemy/Infura for better performance
5. **Test Failure Cases** - Try timeouts, insufficient funds, etc.

## 📞 Need Help?

- Check resolver terminal for detailed error messages
- Verify transactions on block explorers
- Review contract addresses in deployments
- Make sure both chains are funded

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Resolver shows "Listening to Sepolia AND Paseo"
- ✅ Frontend shows "Resolver Online"
- ✅ Test swaps complete in ~2-3 minutes
- ✅ Balances update on both chains
- ✅ Events appear in resolver terminal

Happy cross-chain swapping! 🚀

