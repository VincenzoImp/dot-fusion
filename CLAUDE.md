# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DotFusion is a cross-chain atomic swap platform enabling trustless ETH ↔ DOT exchanges between Ethereum (Sepolia) and Polkadot (Paseo Asset Hub) using Hash Time-Locked Contracts (HTLC). Built on Scaffold-ETH 2, featuring XCM Precompile integration for cross-chain messaging.

**Tech Stack:**
- Monorepo: Yarn workspaces with `packages/hardhat` and `packages/nextjs`
- Smart Contracts: Solidity 0.8.23, Hardhat, OpenZeppelin, XCM Precompile
- Frontend: Next.js 14 (App Router), TypeScript, RainbowKit, Wagmi v2, Viem, TailwindCSS
- Networks: Ethereum Sepolia testnet, Polkadot Paseo Asset Hub testnet

## Common Commands

### Development Workflow
```bash
# Start local development (3 terminals)
yarn chain          # Terminal 1: Local Hardhat node
yarn deploy         # Terminal 2: Deploy contracts
yarn start          # Terminal 3: Next.js dev server (port 3000)

# Or use deployed testnets
yarn start          # Frontend points to deployed Sepolia/Paseo contracts
```

### Contract Development
```bash
yarn compile        # Compile Solidity contracts
yarn deploy         # Deploy to network (uses hardhat-deploy)
yarn test           # Run contract tests (if any in packages/hardhat/test/)
yarn verify --network sepolia <ADDRESS>  # Verify on Etherscan
```

### Code Quality
```bash
yarn format         # Format all code (Prettier for .ts and .sol)
yarn lint           # Lint Next.js and Hardhat packages
yarn next:check-types   # TypeScript check for frontend
yarn hardhat:check-types # TypeScript check for hardhat
```

### Resolver Services (Liquidity Provider)
```bash
# Recommended: API-based resolver (simple)
yarn resolver-api   # Start Express API on port 3001

# Advanced: Event-listening resolver (complex)
yarn resolver-cross-chain  # Monitors both chains via RPC

# Legacy: Single-chain resolver
yarn resolver-service      # Original implementation
```

### Account Management
```bash
yarn account        # Show deployer account address
yarn generate       # Generate new account (encrypted)
yarn account:import # Import existing private key
yarn account:reveal-pk  # Reveal deployer private key
```

### XCM Bridge Management
```bash
yarn configure-bridge --network paseo  # Configure XCM bridge
yarn check-bridge --network paseo      # Verify bridge status
yarn test-xcm --network paseo          # Test XCM functionality
```

## Architecture

### Monorepo Structure
- `packages/hardhat/`: Smart contracts, deployment scripts, resolver services
- `packages/nextjs/`: Next.js frontend application
- Root-level scripts delegated to workspace packages

### Smart Contracts (`packages/hardhat/contracts/`)

**Core Contracts:**
1. **EthereumEscrow.sol** - Source chain HTLC (deployed on Sepolia)
   - Handles ETH → DOT swaps
   - 12-hour timelock minimum
   - Maker creates swap, locks ETH, taker completes with secret

2. **PolkadotEscrow.sol** - Destination chain HTLC (deployed on Paseo)
   - Handles DOT → ETH swaps
   - 6-hour timelock maximum (to prevent timing attacks)
   - XCM Bridge integration for automatic secret propagation

3. **XCMBridge.sol** - Cross-chain messaging bridge (Paseo only)
   - Uses Polkadot XCM Precompile for secret propagation
   - Links PolkadotEscrow to EthereumEscrow via XCM messages
   - Must be configured with `yarn configure-bridge`

**Key Contract Patterns:**
- ReentrancyGuard on all state-changing functions
- CEI (Checks-Effects-Interactions) pattern
- Immutable configuration (owner, rescue delay, access token)
- Event-driven architecture for swap lifecycle
- Secret hashing via SHA-256 (keccak256 in Solidity)

### Frontend Architecture (`packages/nextjs/`)

**App Routes:**
- `/` - Landing page with overview
- `/swap-simple/` - Instant swap UI (resolver-based, recommended)
- `/swaps/` - Manual swap creation (3-step process)
- `/swap-details/` - Browse and participate in swaps
- `/complete/[swapId]/` - Complete swap by revealing secret
- `/dashboard/` - Statistics and monitoring
- `/debug/` - Scaffold-ETH debug contracts UI
- `/api/resolver/` - Resolver API endpoints (status, quote)

**Key Components:**
- `Header.tsx` - Navigation (updated to remove advanced swap link)
- `SwapParticipant.tsx` - Find and participate in swaps
- `SwapCompletion.tsx` - Complete swap flow
- `XCMBridgeStatus.tsx` - XCM bridge status display
- `NetworkStatus.tsx` - Chain connection status

**Scaffold-ETH 2 Integration:**
- Contract interactions via `useScaffoldReadContract` and `useScaffoldWriteContract`
- Event monitoring via `useScaffoldEventHistory`
- Components: `Address`, `AddressInput`, `Balance`, `EtherInput` from `components/scaffold-eth/`
- Contract data stored in `contracts/deployedContracts.ts` and `externalContracts.ts`

### Resolver Service Architecture

The resolver acts as a liquidity provider, automatically fulfilling user swaps:

**resolver-api.ts** (Recommended - Simple):
- Express API server on port 3001
- Frontend calls `/api/resolver/quote` and `/api/resolver/status`
- No event listening, just direct API calls
- Uses resolver's private key to create counterparty swaps
- Environment: `RESOLVER_ADDRESS`, `RESOLVER_PRIVATE_KEY`, `SEPOLIA_RPC`, `PASEO_RPC`

**Flow:**
1. User creates swap on Chain A via frontend
2. Frontend calls resolver API with swap details
3. Resolver creates matching swap on Chain B
4. User completes swap, reveals secret
5. Resolver uses revealed secret to claim on Chain A

### Deployment Flow (`packages/hardhat/deploy/00_deploy_all.ts`)

1. Deploy EthereumEscrow on Sepolia (or current network)
2. Deploy PolkadotEscrow on Paseo (or current network)
3. Deploy XCMBridge on Paseo
4. Configure XCMBridge with escrow addresses
5. Link XCMBridge to PolkadotEscrow
6. Generate TypeScript ABIs automatically (via hardhat task hook)

**Important:** Deployment uses `scripts/runHardhatDeployWithPK.ts` wrapper to inject private key from environment.

### Network Configuration

**Sepolia (Ethereum):**
- Chain ID: 11155111
- RPC: Alchemy endpoint (configurable via `ALCHEMY_API_KEY`)
- Deployed: EthereumEscrow at `0x4cFC4fb3FF50D344E749a256992CB019De9f2229`

**Paseo Asset Hub (Polkadot):**
- Chain ID: 420420422
- RPC: `https://testnet-passet-hub-eth-rpc.polkadot.io`
- Deployed: PolkadotEscrow at `0xc84E1a9A1772251CA228F34d0af5040B94C7083c`
- Deployed: XCMBridge at `0x418eE7f4c98c37a408db9426302beACa862D7731`
- Custom network config in `scaffold.config.ts`

### Swap Flow (HTLC Process)

**Creating Swap (Maker):**
1. Generate secret: `const secret = ethers.randomBytes(32)`
2. Hash secret: `const secretHash = keccak256(secret)`
3. Call `createSwap(swapId, secretHash, taker, ethAmount, dotAmount, rate, timelock, polkadotSender)`
4. Lock funds on source chain

**Participating (Taker):**
1. Find swap via events or frontend
2. Create matching swap on destination chain with same `secretHash`
3. Use shorter timelock (T_dot < T_eth) for safety
4. Lock counterparty funds

**Completing Swap:**
1. Maker reveals secret to claim on destination chain: `completeSwap(swapId, secret)`
2. Secret becomes public on-chain
3. Taker uses revealed secret to claim on source chain
4. Atomic swap complete

**Cancellation/Refund:**
- If timelock expires, either party can call `cancelSwap(swapId)`
- Funds automatically refunded to original depositor

## Key Technical Details

### Exchange Rate
- Fixed: 1 ETH = 100,000 DOT (1 DOT = 0.00001 ETH)
- Hardcoded in contracts and frontend
- Represented as `100000 * 1e18` in Solidity (DOT per ETH scaled by 1e18)

### Timelock Requirements
- Ethereum → Polkadot: 12 hours minimum (43200 seconds)
- Polkadot → Ethereum: 6 hours maximum (21600 seconds)
- Safety buffer prevents timing attacks (taker has time to claim after maker reveals)

### Secret Management
- 32-byte random values (ethers.randomBytes(32))
- Hashed with keccak256 before on-chain storage
- Revealed during completion to unlock funds atomically

### XCM Precompile
- Address: `0x0000000000000000000000000000000000000804` (on Paseo)
- Used in XCMBridge.sol for cross-chain messaging
- Propagates secrets between Paseo and Ethereum automatically (optional feature)
- Requires configuration: `yarn configure-bridge --network paseo`

## Development Guidelines

### Working with Contracts

1. **Editing Contracts:** Modify `.sol` files in `packages/hardhat/contracts/`
2. **Testing Changes:** Run `yarn compile` then `yarn deploy` to local chain
3. **Contract Interactions:** Always use Scaffold-ETH hooks:
   - Reading: `useScaffoldReadContract({ contractName, functionName, args })`
   - Writing: `useScaffoldWriteContract({ contractName })` → `writeContractAsync({ functionName, args, value })`
   - Events: `useScaffoldEventHistory({ contractName, eventName, watch })`

### Working with Frontend

1. **Next.js App Router:** All pages in `packages/nextjs/app/`
2. **Components:** Reusable components in `packages/nextjs/components/`
3. **Hooks:** Custom hooks in `packages/nextjs/hooks/`
4. **Styling:** TailwindCSS + DaisyUI classes
5. **State:** React hooks (useState, useEffect) + Zustand for global state
6. **Contract Config:** Update `deployedContracts.ts` after deployment

### Environment Variables

**Hardhat (`packages/hardhat/.env`):**
```bash
ALCHEMY_API_KEY=<your-key>
ETHERSCAN_V2_API_KEY=<your-key>
__RUNTIME_DEPLOYER_PRIVATE_KEY=<deployer-private-key>
```

**Resolver (`packages/hardhat/resolver.env`):**
```bash
RESOLVER_ADDRESS=<resolver-wallet-address>
RESOLVER_PRIVATE_KEY=<resolver-private-key>
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/<key>
PASEO_RPC=https://testnet-passet-hub-eth-rpc.polkadot.io
```

### Common Pitfalls

1. **RPC Endpoint Consistency:** Resolver and frontend must use identical RPC URLs for Paseo (testnet-passet-hub-eth-rpc.polkadot.io)
2. **Network Detection:** Paseo requires staticNetwork: true in ethers.JsonRpcProvider
3. **Contract Addresses:** Hardcoded in resolver-api.ts - update after redeployment
4. **Private Key Format:** Must include `0x` prefix
5. **Timelock Validation:** T_eth > T_dot to prevent timing attacks
6. **Secret Size:** Exactly 32 bytes (use ethers.randomBytes(32))

### Testing Swaps

**Self-Swap (Testing):**
1. Use same wallet for maker and taker
2. Create swap on Chain A with your address
3. Switch network in MetaMask
4. Create matching swap on Chain B
5. Complete swap by revealing secret
6. Verify funds transferred on both chains

**With Resolver:**
1. Start resolver: `yarn resolver-api`
2. Use "Instant Swap" UI at `/swap-simple/`
3. Resolver automatically fulfills swap
4. Monitor resolver logs for debugging

## Important Notes

- **Scaffold-ETH 2 Base:** This project extends SE-2 with cross-chain functionality
- **Yarn Workspaces:** Always run commands from repo root (yarn delegates to packages)
- **Node Version:** Requires Node.js >= 20.18.3 (see package.json engines)
- **Deployment Tags:** Hardhat-deploy supports selective deployment via tags
- **Contract Verification:** Sepolia uses Etherscan, Paseo uses Subscan
- **Git Hooks:** Husky + lint-staged runs on pre-commit

## Troubleshooting

**"Cannot find module" errors:** Run `yarn install` from root
**Contract not deployed:** Check `deployments/` folder or deploy logs
**Wrong network:** Verify scaffold.config.ts targetNetworks and RPC URLs
**Resolver not working:** Check environment variables and contract addresses
**XCM Bridge issues:** Run `yarn check-bridge --network paseo`
**Type errors after contract changes:** Run `yarn compile` to regenerate ABIs
