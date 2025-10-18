# DotFusion Deployment Guide

This guide explains how to deploy the DotFusion cross-chain atomic swap contracts to Ethereum Sepolia and Polkadot Paseo testnets.

## Prerequisites

1. **Set up your private key** (if not already done):
   ```bash
   cd packages/hardhat
   yarn account:import
   # or generate a new one
   yarn generate
   ```

2. **Get testnet tokens**:
   - **Ethereum Sepolia**: Get ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
   - **Polkadot Paseo**: Get DOT from [Paseo Faucet](https://faucet.polkadot.io/)

3. **Check your balances**:
   ```bash
   yarn account
   ```

## Deployment Commands

### 1. Deploy Ethereum Escrow to Sepolia

```bash
cd packages/hardhat
yarn deploy --network sepolia --tags EthereumEscrow
```

This will deploy `DotFusionEthereumEscrow` with:
- **Rescue Delay**: 7 days (604,800 seconds)
- **Access Token**: None required (address(0))

**Example Successful Deployment:**
- Contract Address: `0x43bD6B0FDAB99a9eC9eF76C3ABB23ABa125dB154`
- Transaction Hash: `0xc53bd741a069c6fddfdd66db616f5460198d495ffb8f7122ca564e470a84f444`
- Gas Used: 1,045,626

### 2. Deploy Polkadot Escrow to Paseo

```bash
cd packages/hardhat
yarn deploy --network paseo --tags PolkadotEscrow
```

This will deploy `DotFusionPolkadotEscrow` with:
- **Rescue Delay**: 7 days (604,800 seconds)
- **Access Token**: None required (address(0))

**Note**: The deployment may take longer on Paseo due to network conditions. The script will show detailed progress information.

### 3. Deploy XCM Bridge to Paseo

```bash
cd packages/hardhat
yarn deploy --network paseo --tags XCMBridge
```

This will deploy `DotFusionXCMBridge` for cross-chain messaging.

### 4. Deploy All Contracts

```bash
# Deploy all contracts to their respective networks
yarn deploy --network sepolia --tags Ethereum
yarn deploy --network paseo --tags Polkadot
```

## Contract Verification

### Ethereum Sepolia
```bash
yarn verify --network sepolia <CONTRACT_ADDRESS> <RESCUE_DELAY> <ACCESS_TOKEN>
```

**Example for the deployed contract:**
```bash
yarn verify --network sepolia 0x43bD6B0FDAB99a9eC9eF76C3ABB23ABa125dB154 604800 0x0000000000000000000000000000000000000000
```

### Polkadot Paseo
Verification on Polkadot networks typically requires manual submission to the explorer at https://blockscout-passet-hub.parity-testnet.parity.io/

## Post-Deployment Setup

### 1. Configure XCM Bridge
After deploying both Polkadot contracts, you need to link them:

```javascript
// Connect to the deployed XCM Bridge
const xcmBridge = await ethers.getContract("DotFusionXCMBridge", deployer);
await xcmBridge.setEscrow("<POLKADOT_ESCROW_ADDRESS>");
```

### 2. Update Frontend Configuration
Update your frontend configuration files with the deployed contract addresses:

- `packages/nextjs/contracts/deployedContracts.ts`
- `packages/nextjs/contracts/externalContracts.ts`

### 3. Test Cross-Chain Functionality
1. Create a swap on Ethereum Sepolia
2. Complete the swap on Polkadot Paseo
3. Verify XCM messaging works correctly

## Network Configuration

### Ethereum Sepolia
- **Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **RPC URL**: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
- **Explorer**: https://sepolia.etherscan.io/

### Polkadot Paseo
- **Network**: Paseo Testnet (Asset Hub)
- **Chain ID**: 420420422
- **RPC URL**: `https://testnet-passet-hub-eth-rpc.polkadot.io`
- **Explorer**: https://blockscout-passet-hub.parity-testnet.parity.io/

## Troubleshooting

### Common Issues

1. **Insufficient Balance**: Ensure you have enough testnet tokens for gas fees
2. **Network Connection**: Verify RPC endpoints are accessible
3. **Contract Verification**: Check constructor arguments match deployment parameters
4. **Paseo RPC Issues**: If you encounter "Method not found" errors, ensure you're using the correct RPC endpoint: `https://testnet-passet-hub-eth-rpc.polkadot.io`
5. **Chain ID Mismatch**: Paseo uses Chain ID `420420422`, not `161`

### Getting Help

- Check contract deployment logs for detailed error messages
- Verify network configuration in `hardhat.config.ts`
- Ensure all dependencies are installed: `yarn install`

## Security Notes

- These are testnet deployments - never use real funds
- Keep your private keys secure and never commit them to version control
- Test thoroughly before considering mainnet deployment
- Review all contract parameters before deployment

## Next Steps

After successful deployment:
1. **Verify contracts** on their respective explorers
2. **Test all contract functions** using the debug interface at `http://localhost:3000/debug`
3. **Update frontend configuration** with deployed contract addresses
4. **Implement frontend integration** using Scaffold-ETH hooks
5. **Set up monitoring and alerting**
6. **Plan mainnet deployment strategy**

## Successfully Deployed Contracts

### Ethereum Sepolia
- **DotFusionEthereumEscrow**: `0x43bD6B0FDAB99a9eC9eF76C3ABB23ABa125dB154`
- **Explorer**: https://sepolia.etherscan.io/address/0x43bD6B0FDAB99a9eC9eF76C3ABB23ABa125dB154

### Polkadot Paseo
- **DotFusionPolkadotEscrow**: [Check deployment output for address]
- **DotFusionXCMBridge**: [Deploy after PolkadotEscrow completes]
- **Explorer**: https://blockscout-passet-hub.parity-testnet.parity.io/
