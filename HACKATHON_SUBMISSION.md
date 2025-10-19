# DotFusion - Trustless Cross-Chain Atomic Swaps

---

## DESCRIPTION OF THE PROJECT
DotFusion is a decentralized cross-chain atomic swap platform enabling trustless ETH ↔ DOT exchanges between Ethereum (Sepolia) and Polkadot (Paseo Asset Hub) using Hash Time-Locked Contracts (HTLC). Built on Scaffold-ETH 2 with native Polkadot XCM Precompile integration for automatic cross-chain secret propagation, featuring instant swap UI with resolver service for seamless user experience.

---

## REPOSITORY WITH THE PROJECT'S CODE
**GitHub Repository:** https://github.com/VincenzoImp/dot-fusion

**License:** MIT (Open Source)

**Setup Instructions:** Complete documentation in README.md including:
- Quick start guide (install → start → use)
- Detailed setup instructions for local development
- Resolver service configuration
- Environment setup guides

---

## Contract Explorers (Live on Testnets)

**Ethereum Sepolia Testnet:**
- **DotFusionEthereumEscrow:** https://sepolia.etherscan.io/address/0x4cFC4fb3FF50D344E749a256992CB019De9f2229

**Polkadot Paseo Asset Hub Testnet:**
- **DotFusionPolkadotEscrow:** https://assethub-paseo.subscan.io/address/0xc84E1a9A1772251CA228F34d0af5040B94C7083c
- **DotFusionXCMBridge:** https://assethub-paseo.subscan.io/address/0x418eE7f4c98c37a408db9426302beACa862D7731

**Note:** Frontend runs locally via `yarn start` (port 3000) and connects to deployed testnet contracts. Resolver service runs via `yarn resolver-api` (port 3001).

---

### **Ethereum Sepolia Testnet (Chain ID: 11155111)**

| Contract Name | Address | Explorer Link |
|--------------|---------|---------------|
| **DotFusionEthereumEscrow** | `0x4cFC4fb3FF50D344E749a256992CB019De9f2229` | [View on Etherscan](https://sepolia.etherscan.io/address/0x4cFC4fb3FF50D344E749a256992CB019De9f2229) |

**Network Details:**
- RPC: `https://eth-sepolia.g.alchemy.com/v2/{API_KEY}`
- Currency: ETH (18 decimals)
- Block Explorer: https://sepolia.etherscan.io
- Faucet: https://sepoliafaucet.com

---

### **Polkadot Paseo Asset Hub Testnet (Chain ID: 420420422)**

| Contract Name | Address | Explorer Link |
|--------------|---------|---------------|
| **DotFusionPolkadotEscrow** | `0xc84E1a9A1772251CA228F34d0af5040B94C7083c` | [View on Subscan](https://assethub-paseo.subscan.io/address/0xc84E1a9A1772251CA228F34d0af5040B94C7083c) |
| **DotFusionXCMBridge** | `0x418eE7f4c98c37a408db9426302beACa862D7731` | [View on Subscan](https://assethub-paseo.subscan.io/address/0x418eE7f4c98c37a408db9426302beACa862D7731) |

**Network Details:**
- RPC: `https://testnet-passet-hub-eth-rpc.polkadot.io`
- Currency: DOT (18 decimals)
- Block Explorer: https://assethub-paseo.subscan.io
- Faucet: https://faucet.polkadot.io

---

## Bounties - Technology Integration & Sponsor Usage

### **🟣 POLKADOT (Main Sponsor - Primary Integration)**

**How We Used Polkadot:**

1. **Native Polkadot Asset Hub Deployment**
   - Deployed production-ready smart contracts on Paseo Asset Hub testnet (Polkadot parachain)
   - Leveraged Polkadot's EVM-compatible environment while accessing native Polkadot features
   - **Contracts deployed:** PolkadotEscrow (`0xc84E1a9A1772251CA228F34d0af5040B94C7083c`) and XCMBridge (`0x418eE7f4c98c37a408db9426302beACa862D7731`)

2. **XCM Precompile Integration** ⭐ **(Unique Polkadot Feature)**
   - Integrated Polkadot's **XCM Precompile** (at address `0x0000000000000000000000000000000000000804`) for cross-chain messaging
   - Used XCM for **automatic secret propagation** between Paseo and Ethereum chains
   - Demonstrates **native cross-chain capabilities** that are unique to Polkadot VM
   - See implementation in [XCMBridge.sol](https://github.com/VincenzoImp/dot-fusion/blob/main/packages/hardhat/contracts/XCMBridge.sol) lines 34, 211-218, 266-273
   - XCM Bridge contract uses the precompile to call `send()` function for cross-parachain message delivery

3. **Cross-Chain Atomic Swaps**
   - Built HTLC-based atomic swaps leveraging Polkadot's fast finality (~6 seconds vs Ethereum's ~12 seconds)
   - **2x faster transaction finality** on Polkadot provides superior user experience
   - **40-50% lower gas costs** compared to Ethereum equivalents
   - Asymmetric timelock design (12h on Ethereum, 6h on Polkadot) prevents timing attacks

4. **Why This Showcases Polkadot:**
   - **Interoperability:** Real-world demonstration of Polkadot's cross-chain vision
   - **XCM Innovation:** Practical use case of XCM in smart contracts (not just parachain-to-parachain)
   - **Developer Experience:** Proves Solidity developers can easily build on Polkadot with added superpowers
   - **Cost Efficiency:** Demonstrates economic advantages of Polkadot ecosystem
   - **Performance:** Faster block times and finality improve UX significantly

**Technical Implementation Details:**
- XCM Bridge contract calls XCM Precompile at `0x0804` with `send(uint32 paraId, bytes xcmMessage, uint64 weight)`
- Encodes Transact instruction to call `completeSwap()` on destination chain
- Automatic secret propagation reduces user coordination overhead
- Seamless integration with existing Ethereum tooling (Hardhat, Scaffold-ETH 2)
- Production-ready deployment scripts for multi-chain environments

---

### **🏗️ BUIDLGUIDL / SCAFFOLD-ETH 2**

**How We Used Scaffold-ETH 2:**

1. **Complete dApp Framework**
   - Built entire frontend using **Scaffold-ETH 2** boilerplate and components
   - Leveraged SE-2's contract interaction hooks (`useScaffoldReadContract`, `useScaffoldWriteContract`, `useScaffoldEventHistory`)
   - Used SE-2's deployment system (`hardhat-deploy`) for efficient contract deployment on both chains

2. **Rapid Development & Deployment**
   - **Smooth deployment:** Used SE-2's Hardhat integration to deploy contracts to Sepolia and Paseo in minutes
   - **Fast iteration:** Hot-reload and TypeScript ABI generation accelerated development
   - **Production-ready UI:** RainbowKit wallet integration, responsive design, professional components out of the box
   - **Multi-chain support:** Adapted SE-2 configuration for dual-chain deployment (Ethereum + Polkadot)

3. **Custom Components Built on SE-2:**
   - `Address`, `AddressInput`, `Balance`, `EtherInput` components for Web3 interactions
   - Custom swap UI components built on top of SE-2 foundation
   - Dashboard with real-time event monitoring using SE-2 hooks
   - Instant Swap UI leveraging SE-2's contract write patterns

4. **Deployment Infrastructure:**
   - SE-2's deployment scripts adapted for dual-chain deployment (Ethereum + Polkadot)
   - Automatic ABI generation and contract address management via `deployedContracts.ts`
   - Development workflow: `yarn chain` → `yarn deploy` → `yarn start`
   - TypeScript type generation for contract ABIs ensures type safety

**Why Scaffold-ETH 2 Was Essential:**
- **Speed:** Built production dApp in hackathon timeframe
- **Quality:** Professional UI/UX without building from scratch
- **Best Practices:** Security patterns and code structure built-in
- **Multi-chain:** Easily adapted for Polkadot network integration
- **Developer Experience:** Hot reload, error handling, and debugging tools accelerated development

---

### **🔷 ENS (Embedded in Address Input)**

**How We Used ENS:**

1. **Address Resolution**
   - Integrated ENS resolution in all address input fields throughout the application
   - Users can enter ENS names (e.g., `vitalik.eth`) instead of hex addresses when:
     - Creating swaps (taker address)
     - Specifying destination addresses
     - Participating in swaps

2. **Implementation:**
   - Used Scaffold-ETH 2's `AddressInput` component which has built-in ENS support
   - Automatic resolution of `.eth` domains to Ethereum addresses
   - Real-time ENS lookup and validation
   - See implementation in swap creation flow: [packages/nextjs/app/swaps/page.tsx](https://github.com/VincenzoImp/dot-fusion/blob/main/packages/nextjs/app/swaps/page.tsx)

3. **User Experience Enhancement:**
   - **Readability:** Users can use human-readable names instead of hex addresses
   - **Trust:** ENS names provide identity verification for counterparties
   - **Convenience:** No need to copy/paste long addresses
   - **Error Prevention:** Reduces mistakes from incorrect addresses

**Where ENS Appears:**
- Swap creation form (taker address field)
- Destination address inputs
- All address input sections across the dApp
- Resolver address configuration

---

### **Additional Technologies Used:**

**🌈 RainbowKit:**
- Multi-wallet support (MetaMask, WalletConnect, Coinbase Wallet, etc.)
- Beautiful wallet connection UI
- Network switching between Sepolia and Paseo
- Custom network configuration for Polkadot Paseo

**⚡ Wagmi v2 & Viem:**
- Type-safe contract interactions
- React hooks for blockchain state
- Real-time event monitoring
- Multi-chain provider management

**🎨 TailwindCSS + DaisyUI:**
- Responsive, modern UI design
- Consistent design system
- Mobile-friendly interface
- Professional component library

**🔧 Hardhat:**
- Smart contract development and testing
- Multi-network deployment
- Contract verification on explorers
- Custom deployment scripts for XCM bridge configuration

**🔐 OpenZeppelin:**
- ReentrancyGuard for security
- Audited contract libraries
- Industry-standard patterns

---

## Project Status

**✅ This is a NEW project created during ETHRome hackathon**

This project was:
- Conceived, designed, and built entirely during the ETHRome hackathon
- NOT started before the hackathon
- Original work created specifically for this event
- All code written fresh for this submission

**Project Timeline:**
- Research & Design: Understanding HTLC and XCM
- Smart Contracts: 3 contracts (EthereumEscrow, PolkadotEscrow, XCMBridge)
- Frontend Development: Full Next.js application with 7+ pages
- Resolver Service: API-based liquidity provider implementation
- Testing & Deployment: Multi-chain testnet deployment
- Documentation: Comprehensive README and developer guides

---

## **Architecture Highlights:**

### **Smart Contracts (Solidity 0.8.23):**
1. **EthereumEscrow.sol** - Source chain HTLC with 12-hour timelock
2. **PolkadotEscrow.sol** - Destination chain HTLC with 6-hour timelock
3. **XCMBridge.sol** - XCM Precompile integration for cross-chain messaging

### **Resolver Service:**
- **Express API** (`yarn resolver-api`) running on port 3001
- Acts as liquidity provider for instant swaps
- Automatically fulfills user swap requests
- Monitors both chains for swap completion
- Uses revealed secrets to claim funds atomically

### **Frontend (Next.js 14):**
- Instant Swap UI for one-click swaps
- Manual Swap UI for peer-to-peer swaps
- Swap Details page for finding and participating
- Real-time Dashboard with statistics
- Complete swap management interface

---

## **Quick Start for Judges:**

```bash
# 1. Clone repository
git clone https://github.com/VincenzoImp/dot-fusion.git
cd dot-fusion

# 2. Install dependencies
yarn install

# 3. Start resolver service (liquidity provider)
# Terminal 1:
yarn resolver-api
# This starts the resolver API on port 3001
# The resolver automatically fulfills swap requests

# 4. Start frontend (connects to deployed testnets)
# Terminal 2:
yarn start
# Frontend runs on http://localhost:3000

# Open http://localhost:3000 and start swapping!
```

**Important:** The resolver service (`yarn resolver-api`) must be running to fulfill instant swap requests. It acts as a liquidity provider that automatically creates counterparty swaps.

**Test with:**
- Get testnet tokens: Sepolia faucet (https://sepoliafaucet.com) & Paseo faucet (https://faucet.polkadot.io)
- Connect wallet to Sepolia or Paseo
- Navigate to "Instant Swap"
- Try a small swap (0.001 ETH → 100 DOT)
- Resolver automatically fulfills your swap
- View in Dashboard and block explorers

---

## **Key Features & Achievements:**

✅ **Production-Ready Contracts** deployed on Sepolia and Paseo Asset Hub
✅ **XCM Precompile Integration** for cross-chain messaging (unique to Polkadot)
✅ **Instant Swap UI** with automatic resolver fulfillment
✅ **Complete HTLC Implementation** with atomic guarantees
✅ **Comprehensive Security** (ReentrancyGuard, CEI pattern, OpenZeppelin)
✅ **Full-Stack dApp** with Next.js 14, TypeScript, TailwindCSS
✅ **Multi-Wallet Support** via RainbowKit
✅ **Real-Time Dashboard** with swap statistics
✅ **Resolver Service** for liquidity provision (Express API)
✅ **Open Source** with MIT license and extensive documentation
✅ **Developer-Friendly** setup with clear instructions

---

## **Innovation & Technical Achievements:**

1. **First HTLC Implementation with XCM Precompile** - Novel integration of atomic swaps with Polkadot's native cross-chain messaging

2. **Multi-Chain Resolver Architecture** - Automatic liquidity provision across Ethereum and Polkadot

3. **Production-Ready Security** - ReentrancyGuard, CEI pattern, comprehensive input validation, asymmetric timelock design

4. **Seamless Developer Experience** - Proved Ethereum tooling (Hardhat, Scaffold-ETH 2) works perfectly with Polkadot

5. **Complete End-to-End Solution** - Not just contracts, but full UX including instant swaps, dashboard, and API

---

**Thank you for considering DotFusion! We're excited to demonstrate truly decentralized cross-chain interoperability powered by Polkadot's XCM.** 🚀
