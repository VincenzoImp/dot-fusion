# 🚀 DotFusion Cross-Chain Atomic Swap Deployment Guide

This guide will help you deploy the DotFusion cross-chain atomic swap system on both Ethereum and Polkadot networks.

## 📋 Prerequisites

### 1. Environment Setup
Create a `.env` file in the project root:

```bash
# Ethereum deployment
__RUNTIME_DEPLOYER_PRIVATE_KEY=your_private_key_here
ALCHEMY_API_KEY=your_alchemy_api_key
ETHERSCAN_V2_API_KEY=your_etherscan_api_key
```

### 2. Get Testnet Tokens
- **Sepolia ETH**: [Sepolia Faucet](https://sepoliafaucet.com/)
- **Paseo DOT**: [Paseo Faucet](https://faucet.polkadot.io/)

## 🔧 Deployment Options

### Option 1: Deploy All Contracts (Recommended)
```bash
cd packages/hardhat
yarn deploy
```

### Option 2: Deploy Individual Contracts
```bash
# Deploy Ethereum escrow to Sepolia
yarn deploy --network sepolia --tags EthereumEscrow

# Deploy Polkadot escrow to Paseo
yarn deploy --network paseo --tags PolkadotEscrow

# Deploy XCM bridge to Paseo
yarn deploy --network paseo --tags XCMBridge
```

## 📝 Post-Deployment Steps

### 1. Verify Contracts
```bash
# Verify Ethereum contract on Etherscan
yarn verify --network sepolia <CONTRACT_ADDRESS> <RESCUE_DELAY> <ACCESS_TOKEN>

# Polkadot contracts can be verified on Polkadot explorer
```

### 2. Update Frontend Configuration
Update contract addresses in:
- `packages/nextjs/contracts/deployedContracts.ts`

### 3. Configure XCM Bridge
Set the escrow address in the XCM bridge contract:
```bash
# Connect to the deployed XCM bridge and call:
# setEscrow("<POLKADOT_ESCROW_ADDRESS>")
```

## 🔍 Contract Verification

### Ethereum (Sepolia)
- **Explorer**: [Sepolia Etherscan](https://sepolia.etherscan.io/)
- **Verification**: Automatic via hardhat-verify plugin

### Polkadot (Paseo)
- **Explorer**: [Polkadot Explorer](https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Ftestnet-passet-hub-eth-rpc.polkadot.io)
- **Verification**: Manual verification on explorer

## 🧪 Testing

### Test Cross-Chain Swap
1. Create a swap on Ethereum (ETH → DOT)
2. Complete the swap on Polkadot (DOT → ETH)
3. Verify atomic completion

### Test Commands
```bash
# Run tests
yarn test --network sepolia
yarn test --network paseo

# Check account balance
yarn account
```

## 🚨 Troubleshooting

### Common Issues
1. **Insufficient funds**: Ensure you have testnet tokens
2. **Network issues**: Check RPC endpoints in hardhat.config.ts
3. **Contract verification fails**: Check constructor parameters

### Support
- Check deployment logs for detailed error messages
- Verify network connectivity
- Ensure all prerequisites are met

## 📊 Contract Architecture

```
Ethereum Sepolia          Polkadot Paseo
┌─────────────────┐      ┌─────────────────┐
│ Ethereum Escrow │◄────►│ Polkadot Escrow │
│ (ETH-DOT swaps) │      │ (DOT-ETH swaps) │
└─────────────────┘      └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   XCM Bridge    │
                        │ (Cross-chain    │
                        │  messaging)     │
                        └─────────────────┘
```

## 🎯 Next Steps

1. **Test thoroughly** on testnets
2. **Deploy to mainnet** when ready
3. **Monitor** cross-chain transactions
4. **Scale** as needed

---

**Happy Deploying! 🚀**