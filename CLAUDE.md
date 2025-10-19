# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DotFusion is a cross-chain atomic swap platform enabling trustless ETH ↔ DOT swaps between Ethereum (Sepolia) and Polkadot (Paseo Asset Hub) using Hash Time-Locked Contracts (HTLC). Built on Scaffold-ETH 2 with Next.js 15 and Hardhat.

**Fixed Exchange Rate**: 1 ETH = 100,000 DOT (1 DOT = 0.00001 ETH)

## Development Commands

### Essential Commands
```bash
# Development - Start all services locally
yarn chain          # Start local Hardhat node
yarn deploy         # Deploy contracts locally (auto-generates TypeScript ABIs)
yarn start          # Start Next.js frontend (http://localhost:3000)

# Testing
yarn test           # Run Hardhat smart contract tests
yarn test-xcm       # Test XCM bridge functionality

# Building & Type Checking
yarn compile        # Compile smart contracts
yarn hardhat:check-types    # Type check Hardhat package
yarn next:check-types       # Type check Next.js package

# Code Quality
yarn format         # Format all code (Prettier)
yarn lint           # Lint Next.js and Hardhat code
```

### Resolver Services (Liquidity Providers)
```bash
# Three resolver options available:
yarn resolver-api              # API-based resolver (RECOMMENDED - simple HTTP endpoints)
yarn resolver-cross-chain      # Event-listening cross-chain resolver (complex)
yarn resolver-service          # Legacy single-chain resolver

yarn generate                  # Generate new resolver wallet
```

### Contract Management
```bash
# Deployment
yarn deploy --network sepolia  # Deploy to Sepolia
yarn deploy --network paseo    # Deploy to Paseo Asset Hub

# XCM Bridge Configuration
yarn configure-bridge --network paseo   # Configure XCM bridge
yarn check-bridge --network paseo       # Verify bridge status

# Verification
yarn verify --network sepolia <CONTRACT_ADDRESS>
```

### Account Management
```bash
yarn account                # Show deployer account
yarn account:import         # Import encrypted private key
yarn generate              # Generate new account
```

## Architecture

### Monorepo Structure
This is a Yarn v3 monorepo with two packages:

**packages/hardhat/** - Smart contracts, deployment scripts, tests, resolver services
- `contracts/` - Solidity contracts (EthereumEscrow.sol, PolkadotEscrow.sol, XCMBridge.sol)
- `deploy/00_deploy_all.ts` - Master deployment script (auto-generates TypeScript ABIs)
- `scripts/` - Resolver services, configuration utilities, account management
- `test/` - Contract test suites

**packages/nextjs/** - Next.js 15 frontend (App Router)
- `app/` - Next.js pages (swap, swap-simple, swaps, dashboard, complete/[swapId])
- `app/api/resolver/` - Resolver API endpoints (status, quote)
- `components/` - React components
- `hooks/scaffold-eth/` - Scaffold-ETH 2 hooks for contract interaction
- `contracts/` - Auto-generated contract data (deployedContracts.ts, externalContracts.ts)

### Smart Contract System

**Core Contracts:**

1. **EthereumEscrow.sol** (Sepolia) - Ethereum-side HTLC
   - Handles ETH deposits with 12-hour minimum timelock
   - Creates swaps: `createSwap(swapId, secretHash, taker, ethAmount, dotAmount, exchangeRate, timelock, polkadotSender)`
   - Completes swaps: `completeSwap(swapId, secret)` - taker reveals secret to claim ETH
   - Cancels swaps: `cancelSwap(swapId)` - maker can cancel after timelock expires
   - Located at: `0x4cFC4fb3FF50D344E749a256992CB019De9f2229` (Sepolia testnet)

2. **PolkadotEscrow.sol** (Paseo Asset Hub) - Polkadot-side HTLC
   - Handles native DOT deposits with 6-hour maximum timelock (T_dot < T_eth prevents timing attacks)
   - Creates swaps: `createNativeSwap(swapId, secretHash, maker, timelock)` payable
   - Completes swaps: `completeSwap(swapId, secret)` - maker reveals secret to claim DOT
   - Integrates with XCM Bridge for automatic secret propagation
   - Located at: `0xc84E1a9A1772251CA228F34d0af5040B94C7083c` (Paseo testnet)

3. **XCMBridge.sol** (Paseo Asset Hub) - Cross-chain messaging coordinator
   - Uses Polkadot's XCM Precompile (address: `0x0000000000000000000000000000000000000804`)
   - Propagates secrets between chains: `propagateSecret(swapId, secret)`
   - Configurable XCM fees: `setXCMFee(fee)`
   - Located at: `0x418eE7f4c98c37a408db9426302beACa862D7731` (Paseo testnet)

**HTLC Security Pattern:**
- Ethereum timelock (T_eth) > Polkadot timelock (T_dot) prevents timing attacks
- Maker creates swap on Chain A → Taker creates matching swap on Chain B
- Maker reveals secret on Chain B (claims DOT) → Secret becomes public
- Taker uses revealed secret on Chain A (claims ETH)
- Atomic guarantee: both complete or both revert via refunds

**Contract Deployment Flow:**
The `deploy/00_deploy_all.ts` script deploys in this order:
1. Deploy EthereumEscrow (Sepolia)
2. Deploy PolkadotEscrow (Paseo)
3. Deploy XCMBridge (Paseo)
4. Configure XCM Bridge with escrow addresses
5. Link XCM Bridge to PolkadotEscrow via `setXCMBridge()`
6. Auto-generate TypeScript ABIs to `packages/nextjs/contracts/`

### Frontend Architecture (Scaffold-ETH 2)

**Network Configuration:** (packages/nextjs/scaffold.config.ts)
- `targetNetworks: [chains.sepolia, paseo]` - Dual-chain support
- Custom Paseo chain definition with RPC endpoint
- RainbowKit wallet integration

**Contract Interaction Patterns:**
ALWAYS use Scaffold-ETH 2 hooks - never use raw ethers/viem directly:

```typescript
// Reading contract state
const { data } = useScaffoldReadContract({
  contractName: "DotFusionEthereumEscrow",
  functionName: "swaps",
  args: [swapId],
});

// Writing to contracts
const { writeContractAsync } = useScaffoldWriteContract("DotFusionEthereumEscrow");
await writeContractAsync({
  functionName: "createSwap",
  args: [swapId, secretHash, taker, ethAmount, dotAmount, exchangeRate, timelock, polkadotSender],
  value: parseEther(ethAmount),
});

// Watching events
const { data: events } = useScaffoldEventHistory({
  contractName: "DotFusionPolkadotEscrow",
  eventName: "SwapCreated",
  watch: true,
});
```

**Key Pages:**
- `app/page.tsx` - Landing page with project overview
- `app/swap-simple/page.tsx` - Instant swap UI (uses resolver API)
- `app/swap/page.tsx` - Advanced swap UI (manual counterparty)
- `app/swaps/page.tsx` - User's active swaps dashboard
- `app/complete/[swapId]/page.tsx` - Complete swap by revealing secret
- `app/dashboard/page.tsx` - Platform statistics

**Resolver Integration:**
The frontend can call the resolver API for instant swaps:
- `GET /api/resolver/status` - Check resolver availability and balance
- `POST /api/resolver/quote` - Get swap quote and request fulfillment

### Resolver System

**Three resolver implementations** (all in `packages/hardhat/scripts/`):

1. **resolver-api.ts** (RECOMMENDED)
   - Express HTTP API on port 3001
   - Frontend calls `/api/resolver/quote` to request swaps
   - Resolver detects SwapCreated events and fulfills automatically
   - Simplest to run: `yarn resolver-api`

2. **resolver-cross-chain.ts** (Advanced)
   - Listens to events on both chains simultaneously
   - Automatically creates matching swaps when detecting OPEN swaps
   - More complex setup with dual RPC connections

3. **resolver-service.ts** (Legacy)
   - Single-chain event listener
   - Requires manual configuration per chain

All resolvers require:
- `RESOLVER_PRIVATE_KEY` environment variable
- Sufficient ETH on Sepolia and DOT on Paseo for gas + liquidity

## Key Configuration Files

**hardhat.config.ts:**
- Network definitions (Sepolia, Paseo at chainId 420420422)
- Uses `__RUNTIME_DEPLOYER_PRIVATE_KEY` environment variable
- Task extension: deploy task auto-runs `generateTsAbis()` to create TypeScript types

**scaffold.config.ts:**
- Custom Paseo chain configuration
- RPC endpoint: `https://testnet-passet-hub-eth-rpc.polkadot.io`
- Alchemy API key for Sepolia
- Polling interval: 30 seconds

**Environment Variables:**
- `__RUNTIME_DEPLOYER_PRIVATE_KEY` - Deployer wallet (set at runtime by scripts)
- `ALCHEMY_API_KEY` - Sepolia RPC access
- `RESOLVER_PRIVATE_KEY` - Resolver wallet for automatic swap fulfillment
- `RESOLVER_ADDRESS` - Resolver public address
- `ETHERSCAN_V2_API_KEY` - Contract verification

## Important Development Patterns

### Working with Multi-Chain Swaps

1. **Creating a swap on Ethereum:**
```typescript
// User initiates ETH → DOT swap
const swapId = ethers.keccak256(ethers.toUtf8Bytes(`unique-id-${Date.now()}`));
const secret = ethers.randomBytes(32);
const secretHash = ethers.keccak256(secret);
const timelock = Math.floor(Date.now() / 1000) + 12 * 3600; // 12 hours

await ethereumEscrow.createSwap(
  swapId,
  secretHash,
  takerAddress,
  parseEther("0.001"), // 0.001 ETH
  parseUnits("100", 18), // 100 DOT
  100000, // exchange rate
  timelock,
  addressToBytes32(polkadotAddress)
);
```

2. **Matching swap on Polkadot:**
```typescript
// Taker creates matching DOT swap with shorter timelock
const polkadotTimelock = Math.floor(Date.now() / 1000) + 6 * 3600; // 6 hours

await polkadotEscrow.createNativeSwap(
  swapId, // SAME swapId as Ethereum
  secretHash, // SAME secretHash
  makerAddress,
  polkadotTimelock,
  { value: parseUnits("100", 18) } // 100 DOT
);
```

3. **Completing the swap:**
```typescript
// Maker reveals secret on Polkadot to claim DOT
await polkadotEscrow.completeSwap(swapId, secret);

// Secret is now public, taker uses it on Ethereum to claim ETH
await ethereumEscrow.completeSwap(swapId, secret);
```

### Testing Workflow

**Local Development:**
1. `yarn chain` - Start Hardhat node
2. `yarn deploy` - Deploys contracts + generates TypeScript ABIs
3. `yarn start` - Frontend auto-connects to localhost
4. Use MetaMask to interact with local contracts

**Testnet Testing:**
1. Set `RESOLVER_PRIVATE_KEY` in `packages/hardhat/.env`
2. Fund resolver address with testnet ETH (Sepolia) and DOT (Paseo)
3. `yarn resolver-api` - Start resolver service
4. Frontend points to deployed contracts via `scaffold.config.ts`
5. Create swaps via frontend - resolver auto-fulfills

**Self-Swap Testing:**
- Use "Use my connected wallet" checkbox in swap UI
- Creates both sides of swap with your own addresses
- Useful for testing complete flow without counterparty

### Debugging Contract Interactions

**Check swap state:**
```typescript
const swap = await escrow.swaps(swapId);
console.log("State:", swap.state); // 0=INVALID, 1=OPEN, 2=COMPLETED, 3=CANCELLED
console.log("Secret Hash:", swap.secretHash);
console.log("Unlock Time:", new Date(swap.unlockTime * 1000));
```

**Monitor events:**
```bash
# In resolver logs, watch for:
- "New swap created" - Detected SwapCreated event
- "Creating matching swap" - Resolver fulfilling swap
- "Swap completed" - Secret revealed
```

**Common issues:**
- Timelock validation errors: Ensure T_eth (12h min) > T_dot (6h max)
- Secret mismatch: Verify secretHash matches on both chains
- Insufficient balance: Resolver needs gas + swap amount on both chains
- RPC errors: Check network connectivity and RPC endpoint status

## Scaffold-ETH 2 Components

**Always use these display components:**
- `<Address address={addr} />` - Display Ethereum addresses
- `<AddressInput value={addr} onChange={setAddr} />` - Input addresses
- `<Balance address={addr} />` - Show ETH/token balance
- `<EtherInput value={amount} onChange={setAmount} />` - Input ETH with USD conversion

Components located in `packages/nextjs/components/scaffold-eth/`

## Network Information

**Sepolia (Ethereum):**
- Chain ID: 11155111
- RPC: https://eth-sepolia.g.alchemy.com/v2/[API_KEY]
- Faucet: https://sepoliafaucet.com
- Explorer: https://sepolia.etherscan.io

**Paseo Asset Hub (Polkadot):**
- Chain ID: 420420422
- RPC: https://testnet-passet-hub-eth-rpc.polkadot.io
- Faucet: https://faucet.polkadot.io
- Explorer: https://assethub-paseo.subscan.io

## Additional Documentation

- **START_RESOLVER_API.md** - Quick start guide for API-based resolver
- **RESOLVER_API.md** - Full API resolver documentation
- **SIMPLE_TESTING.md** - Manual testing without resolver
- **CROSS_CHAIN_SETUP.md** - Advanced cross-chain resolver setup
- **QUICKSTART.md** - Original project quick start
