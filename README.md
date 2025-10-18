# DotFusion 🔗

**Cross-Chain Atomic Swap Protocol for Ethereum and Polkadot**

DotFusion is a decentralized cross-chain atomic swap protocol that enables secure, trustless token exchanges between Ethereum and Polkadot ecosystems. Built on Scaffold-ETH 2, it provides a seamless bridge for users to swap assets across different blockchain networks without relying on centralized intermediaries.

## 🌟 Features

- **🔒 Trustless Atomic Swaps**: Secure cross-chain exchanges without intermediaries
- **⚡ Fast Execution**: Optimized smart contracts for efficient swap completion
- **🌐 Multi-Chain Support**: Ethereum Sepolia and Polkadot Paseo testnet integration
- **🛡️ Security First**: Built with OpenZeppelin standards and comprehensive security measures
- **📱 Modern UI**: Beautiful, responsive interface built with Next.js and Tailwind CSS
- **🔧 Developer Friendly**: Complete development toolkit with deployment scripts and testing utilities

## 🏗️ Architecture

### Smart Contracts

#### Ethereum Side (Sepolia Testnet)
- **`DotFusionEthereumEscrow`**: Source escrow contract that locks tokens and manages swap initiation
- **Features**: 
  - Multi-swap support with unique swap IDs
  - 7-day rescue delay for security
  - Access token requirements (optional)
  - Comprehensive event logging

#### Polkadot Side (Paseo Testnet)
- **`DotFusionPolkadotEscrow`**: Destination escrow contract for completing swaps
- **`DotFusionXCMBridge`**: Cross-chain messaging coordinator using XCM Precompile
- **Features**:
  - XCM integration for cross-chain communication
  - Asset Hub compatibility
  - Secure message passing between chains

### Frontend
- **Next.js 15** with App Router
- **RainbowKit** for wallet connection
- **Wagmi** for Ethereum interactions
- **Tailwind CSS** for styling
- **TypeScript** for type safety

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.18.3
- **Yarn** 3.2.3
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/VincenzoImp/dot-fusion.git
   cd dot-fusion
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up your private key**
   ```bash
   cd packages/hardhat
   yarn account:import
   # or generate a new one
   yarn generate
   ```

4. **Start local development**
   ```bash
   # Start local blockchain
   yarn chain
   
   # Deploy contracts locally
   yarn deploy
   
   # Start frontend
   yarn start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Debug Interface: http://localhost:3000/debug

## 📋 Available Scripts

### Development
```bash
yarn start          # Start frontend development server
yarn chain          # Start local Hardhat network
yarn deploy         # Deploy contracts to local network
yarn compile        # Compile smart contracts
yarn test           # Run contract tests
```

### Account Management
```bash
yarn account:import     # Import existing private key
yarn account:generate   # Generate new wallet
yarn account           # View account information
yarn account:reveal-pk # Reveal private key (use with caution)
```

### Deployment
```bash
# Deploy to Ethereum Sepolia
yarn deploy --network sepolia --tags EthereumEscrow

# Deploy to Polkadot Paseo
yarn deploy --network paseo --tags PolkadotEscrow
yarn deploy --network paseo --tags XCMBridge

# Deploy all contracts
yarn deploy --network sepolia --tags Ethereum
yarn deploy --network paseo --tags Polkadot
```

### Verification
```bash
yarn verify --network sepolia <CONTRACT_ADDRESS> <RESCUE_DELAY> <ACCESS_TOKEN>
```

## 🌐 Network Configuration

### Ethereum Sepolia
- **Chain ID**: 11155111
- **RPC URL**: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
- **Explorer**: https://sepolia.etherscan.io/
- **Faucet**: https://sepoliafaucet.com/

### Polkadot Paseo (Asset Hub)
- **Chain ID**: 420420422
- **RPC URL**: `https://testnet-passet-hub-eth-rpc.polkadot.io`
- **Explorer**: https://blockscout-passet-hub.parity-testnet.parity.io/
- **Faucet**: https://faucet.polkadot.io/

## 📖 How It Works

### Atomic Swap Process

1. **Swap Initiation** (Ethereum)
   - User creates a swap with a secret hash
   - Tokens are locked in the Ethereum escrow contract
   - Swap details are broadcasted to the network

2. **Cross-Chain Communication**
   - XCM Bridge coordinates message passing
   - Swap information is transmitted to Polkadot
   - Destination escrow is prepared

3. **Swap Completion** (Polkadot)
   - Taker reveals the secret on Polkadot
   - Tokens are released from the destination escrow
   - Secret is propagated back to Ethereum

4. **Final Settlement**
   - Original swap is completed on Ethereum
   - All funds are distributed to participants
   - Swap is marked as completed

### Security Features

- **Hash Time Locked Contracts (HTLC)**: Ensures atomicity of swaps
- **Timelock Mechanisms**: Allows cancellation after timeout
- **Rescue Functions**: Owner can recover funds after extended delays
- **Access Control**: Optional token requirements for participation
- **Event Logging**: Comprehensive audit trail for all operations

## 🔧 Development

### Project Structure

```
dot-fusion/
├── packages/
│   ├── hardhat/                 # Smart contracts and deployment
│   │   ├── contracts/           # Solidity contracts
│   │   ├── deploy/             # Deployment scripts
│   │   ├── scripts/            # Utility scripts
│   │   └── test/               # Contract tests
│   └── nextjs/                 # Frontend application
│       ├── app/                # Next.js app directory
│       ├── components/         # React components
│       ├── hooks/              # Custom hooks
│       └── contracts/          # Contract ABIs and addresses
├── DEPLOYMENT_GUIDE.md         # Detailed deployment instructions
└── README.md                   # This file
```

### Smart Contract Development

1. **Write contracts** in `packages/hardhat/contracts/`
2. **Create tests** in `packages/hardhat/test/`
3. **Add deployment scripts** in `packages/hardhat/deploy/`
4. **Compile and test**:
   ```bash
   yarn compile
   yarn test
   ```

### Frontend Development

1. **Add components** in `packages/nextjs/components/`
2. **Create hooks** in `packages/nextjs/hooks/`
3. **Update contracts** in `packages/nextjs/contracts/`
4. **Start development server**:
   ```bash
   yarn start
   ```

## 🚀 Deployment

### Testnet Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Mainnet Considerations

- **Security Audits**: Conduct comprehensive security audits before mainnet deployment
- **Gradual Rollout**: Start with small amounts and gradually increase limits
- **Monitoring**: Implement comprehensive monitoring and alerting systems
- **Governance**: Consider implementing governance mechanisms for protocol upgrades

## 🧪 Testing

### Contract Testing
```bash
yarn test                    # Run all tests
yarn test --grep "Escrow"   # Run specific test suite
```

### Frontend Testing
```bash
yarn next:check-types       # Type checking
yarn lint                   # Linting
```

## 🔒 Security

### Best Practices

- **Private Key Management**: Use encrypted private keys and secure storage
- **Access Control**: Implement proper access controls and multi-signature requirements
- **Code Review**: All code changes should undergo thorough review
- **Testing**: Comprehensive test coverage for all critical functions
- **Monitoring**: Real-time monitoring of contract interactions and events

### Known Limitations

- **Testnet Only**: Current deployment is on testnets only
- **Limited Token Support**: Currently supports ERC20 tokens
- **Network Dependencies**: Relies on network stability and XCM functionality

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions
- **Issues**: Report bugs and request features via [GitHub Issues](https://github.com/VincenzoImp/dot-fusion/issues)
- **Discussions**: Join the conversation in [GitHub Discussions](https://github.com/VincenzoImp/dot-fusion/discussions)

## 🙏 Acknowledgments

- **Scaffold-ETH 2**: Built on the excellent Scaffold-ETH 2 framework
- **OpenZeppelin**: Security-first smart contract library
- **Polkadot**: Cross-chain infrastructure and XCM protocol
- **Ethereum**: Foundation for decentralized applications

## 📊 Project Status

- ✅ **Smart Contracts**: Implemented and tested
- ✅ **Deployment Scripts**: Ready for testnet deployment
- ✅ **Frontend Framework**: Scaffold-ETH 2 integration complete
- 🔄 **UI Implementation**: In progress
- 🔄 **Testing**: Comprehensive test suite in development
- 📋 **Security Audit**: Planned for mainnet deployment

---

**Built with ❤️ for the decentralized future**

*DotFusion - Bridging Ethereum and Polkadot, one swap at a time.*