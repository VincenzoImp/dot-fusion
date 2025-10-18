# 🌐 Running Resolver Service on Testnets

This guide shows you how to run the DotFusion resolver service on live testnets (Sepolia + Paseo).

## 📋 Prerequisites

Your contracts are already deployed to:
- **Sepolia** (Ethereum testnet)
- **Paseo Asset Hub** (Polkadot testnet)

## 🚀 Setup Steps

### 1. Fund Your Resolver Wallet

Your resolver needs funds on both chains. Get testnet tokens:

#### Sepolia ETH
- Faucet 1: https://sepoliafaucet.com
- Faucet 2: https://www.alchemy.com/faucets/ethereum-sepolia
- Send to your resolver address: `0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab`

#### Paseo DOT
- Faucet: https://faucet.polkadot.io
- Network: Paseo Asset Hub
- Send to your resolver address: `0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab`

**Recommended amounts:**
- At least 0.1 ETH on Sepolia
- At least 1000 DOT on Paseo

### 2. Configure Environment

Your `.env` file in `packages/hardhat/` should have:

```bash
RESOLVER_ADDRESS=0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab
RESOLVER_PRIVATE_KEY=0x... # Your private key
```

### 3. Run Resolver Service

Since you're on testnets, you need to run TWO resolver services (one per chain):

#### Terminal 1: Sepolia Resolver
```bash
cd packages/hardhat
HARDHAT_NETWORK=sepolia yarn resolver-service
```

#### Terminal 2: Paseo Resolver  
```bash
cd packages/hardhat
HARDHAT_NETWORK=paseo yarn resolver-service
```

### 4. Start Frontend

```bash
cd packages/nextjs
yarn start
```

Navigate to: http://localhost:3000/swap-simple

## ⚠️ Important Notes

### Current Limitation

The current implementation expects both escrow contracts to be on the same network. Since your setup has:
- Ethereum Escrow on **Sepolia**
- Polkadot Escrow on **Paseo** (different chain)

You have two options:

### Option A: Single-Chain Testing (Recommended for now)

Deploy both contracts to the same chain for testing:

```bash
# Deploy both to Sepolia
yarn deploy --network sepolia

# Run resolver on Sepolia
cd packages/hardhat
HARDHAT_NETWORK=sepolia yarn resolver-service
```

### Option B: Cross-Chain Setup (Advanced)

For true cross-chain swaps, you need:

1. **Separate Resolver Services** - One per chain
2. **Shared Secret Storage** - Database or message queue
3. **Cross-Chain Communication** - The resolvers need to coordinate

This requires additional infrastructure. I can help implement this if needed.

## 🧪 Testing on Testnet

### Test Swap Flow

1. **Go to** http://localhost:3000/swap-simple

2. **Check Status**
   - Should show "Resolver Online" if service is running
   - Should show correct resolver address

3. **Create Test Swap**
   - Direction: ETH → DOT
   - Amount: 0.001 ETH (minimum)
   - Destination: Your test address
   - Click "Instant Swap"

4. **Monitor Resolver**
   - Watch the resolver terminal for event detection
   - Should see "New ETH->DOT swap detected!"
   - Should see "DOT swap created!"

5. **Wait for Completion**
   - Takes ~2-3 minutes on testnet
   - Check your destination address for received DOT

## 🔍 Debugging

### Check Resolver Balance

```bash
cd packages/hardhat
npx hardhat console --network sepolia

# In console:
const balance = await ethers.provider.getBalance("0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab")
console.log(ethers.formatEther(balance), "ETH")
```

### Check Contract Deployments

```bash
ls packages/hardhat/deployments/sepolia/
ls packages/hardhat/deployments/paseo/
```

### View Transactions

- Sepolia: https://sepolia.etherscan.io/address/0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab
- Paseo: https://assethub-paseo.subscan.io/account/0x62206414DdE41446A0fa8eF6c6e93b9AAd9413ab

## 📊 Monitoring

The resolver service provides real-time logs:

```
👂 Listening to Ethereum Escrow events...
🆕 New ETH->DOT swap detected!
Swap ID: 0x123...
Maker: 0xabc...
ETH Amount: 0.001
DOT Amount: 100.0

🔄 Fulfilling ETH->DOT swap...
✅ DOT swap created! TX: 0xdef...
```

## 🔒 Security Tips

1. **Never commit private keys** - Already in `.gitignore`
2. **Use separate testnet wallet** - Don't use mainnet keys
3. **Monitor balances** - Set up alerts for low funds
4. **Test with small amounts** - Start with minimum amounts

## 🆘 Troubleshooting

### Error: "Cannot connect to the network localhost"

**Solution:** Specify the network:
```bash
HARDHAT_NETWORK=sepolia yarn resolver-service
```

### Error: "Could not find deployed contracts"

**Solution:** Deploy contracts first:
```bash
yarn deploy --network sepolia
```

### Error: "Insufficient funds"

**Solution:** Fund your resolver address from faucets

### Swap not being fulfilled

**Check:**
1. Resolver service is running
2. Resolver has sufficient balance on both chains
3. Amount is above minimum (0.001 ETH or 100 DOT)
4. Transaction confirmed on-chain

## 🎯 Next Steps

Once you've tested on testnet:

1. **Optimize for Production**
   - Add database for state persistence
   - Implement retry logic
   - Add monitoring/alerting

2. **Scale to Mainnet**
   - Use mainnet RPCs
   - Increase liquidity
   - Implement fee structure

3. **Add Advanced Features**
   - Dynamic exchange rates
   - Multiple resolvers
   - Admin dashboard

## 💬 Need Help?

- Check logs in resolver terminal
- Verify transactions on block explorers
- Review contract addresses in deployments folder
- Test with debug transactions first

Happy swapping on testnet! 🚀


