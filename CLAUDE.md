# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DotFusion is a cross-chain atomic swap protocol enabling secure, trustless token exchanges between Ethereum and Polkadot. Built on Scaffold-ETH 2 as a yarn monorepo with two main packages:
- `packages/hardhat`: Smart contracts, deployment scripts, and blockchain tooling
- `packages/nextjs`: Frontend UI built with Next.js 15 (App Router)

## Development Commands

### Initial Setup
```bash
yarn install              # Install all dependencies
yarn chain                # Start local Hardhat network
yarn deploy               # Deploy contracts to local network
yarn start                # Start Next.js frontend (port 3000)
```

### Smart Contract Development
```bash
yarn compile              # Compile Solidity contracts
yarn test                 # Run Hardhat tests
yarn hardhat:test         # Same as above

# Single test execution (in packages/hardhat)
cd packages/hardhat
npx hardhat test --grep "test name pattern"
```

### Account Management
```bash
yarn account:import       # Import existing private key
yarn account:generate     # Generate new wallet
yarn account              # View account information
yarn account:reveal-pk    # Reveal private key (use with caution)
```

### Deployment to Testnets
```bash
# Deploy to Ethereum Sepolia
yarn deploy --network sepolia --tags EthereumEscrow

# Deploy to Polkadot Paseo (Asset Hub)
yarn deploy --network paseo --tags PolkadotEscrow
yarn deploy --network paseo --tags XCMBridge

# Verify contracts on Etherscan
yarn verify --network sepolia <CONTRACT_ADDRESS> <RESCUE_DELAY> <ACCESS_TOKEN>
```

### Code Quality
```bash
yarn format               # Format all code (Solidity + TypeScript)
yarn lint                 # Lint frontend and contracts
yarn next:check-types     # TypeScript type checking
yarn hardhat:check-types  # Hardhat TypeScript type checking
```

## Architecture Overview

### Smart Contracts

The protocol uses three core contracts deployed across two chains:

**Ethereum Side (Sepolia Testnet)**
- `DotFusionEthereumEscrow` (`contracts/EthereumEscrow.sol`): Source escrow that locks ETH when swaps are initiated. Manages multi-swap state with unique swapIds, implements HTLC (Hash Time Locked Contracts) pattern, and includes a 7-day rescue delay security mechanism.

**Polkadot Side (Paseo Testnet - Asset Hub)**
- `DotFusionPolkadotEscrow` (`contracts/PolkadotEscrow.sol`): Destination escrow for completing swaps and releasing DOT tokens
- `DotFusionXCMBridge` (`contracts/XCMBridge.sol`): Coordinates cross-chain messaging using XCM Precompile for Polkadot Asset Hub compatibility

Key contract features:
- Multi-swap support with unique swap IDs
- Access token requirements (optional)
- Comprehensive event logging for all state changes
- Owner rescue functions with time delays for emergency recovery

### Deployment Configuration

Network configurations in `packages/hardhat/hardhat.config.ts`:
- **Ethereum Sepolia**: Chain ID 11155111, RPC via Alchemy
- **Polkadot Paseo (Asset Hub)**: Chain ID 420420422, RPC at `https://testnet-passet-hub-eth-rpc.polkadot.io`

Deployment scripts use `hardhat-deploy` with tags for selective deployment:
- Tags: `All`, `EthereumEscrow`, `PolkadotEscrow`, `XCMBridge`
- Master script: `packages/hardhat/deploy/00_deploy_all.ts`
- Configuration: 7-day rescue delay, no access token by default

### Frontend Architecture

Built on Scaffold-ETH 2 with Next.js 15 App Router:

**Key Pages**
- `/` - Home page
- `/swap` - Single swap interface
- `/swaps` - Swap history/list
- `/debug` - Contract debugging UI (auto-generated from ABIs)
- `/blockexplorer` - Block explorer with transaction/address search

**Contract Interaction Pattern**
Always use Scaffold-ETH hooks for contract interactions (located in `packages/nextjs/hooks/scaffold-eth/`):

```typescript
// Reading contract data
const { data } = useScaffoldReadContract({
  contractName: "DotFusionEthereumEscrow",
  functionName: "swaps",
  args: [swapId],
});

// Writing to contract
const { writeContractAsync } = useScaffoldWriteContract({
  contractName: "DotFusionEthereumEscrow"
});
await writeContractAsync({
  functionName: "initiateSwap",
  args: [secretHash, taker, dotAmount, exchangeRate, unlockTime],
  value: parseEther("1.0"),
});

// Watching events
const { data: events } = useScaffoldEventHistory({
  contractName: "DotFusionEthereumEscrow",
  eventName: "SwapInitiated",
  watch: true,
});
```

**Display Components**
Always use Scaffold-ETH components (in `packages/nextjs/components/scaffold-eth/`):
- `<Address>` - Display Ethereum addresses with formatting
- `<AddressInput>` - User input for Ethereum addresses
- `<Balance>` - Display ETH/token balances
- `<EtherInput>` - Input with ETH/USD conversion

**Contract Data Location**
- Deployed contract ABIs and addresses: `packages/nextjs/contracts/deployedContracts.ts`
- External contracts: `packages/nextjs/contracts/externalContracts.ts`

### Atomic Swap Flow

1. **Initiation** (Ethereum): User creates swap with secret hash → ETH locked in escrow → Event emitted
2. **Cross-Chain Communication**: XCM Bridge transmits swap details → Polkadot escrow prepared
3. **Completion** (Polkadot): Taker reveals secret → DOT released → Secret propagated back
4. **Settlement** (Ethereum): Swap completed with revealed secret → ETH distributed → Swap marked complete

Security mechanisms: HTLC pattern, timelock for cancellation, rescue functions with delays, optional access control via tokens.

## Important Development Notes

### Scaffold-ETH 2 Conventions
- This is a yarn 3.2.3 monorepo
- Frontend uses Next.js App Router (not Pages Router)
- Never use `viem` or `wagmi` hooks directly - always use the Scaffold-ETH wrapper hooks
- Contract ABIs are auto-generated and stored in `deployedContracts.ts` after deployment

### Private Key Management
- Private keys stored in `packages/hardhat/.env` as `__RUNTIME_DEPLOYER_PRIVATE_KEY`
- Never commit private keys or `.env` files
- Use `yarn account:import` to securely import keys with encryption

### Testing Strategy
- All contract tests go in `packages/hardhat/test/`
- Use Hardhat's Chai matchers for assertions
- Run with gas reporting: `REPORT_GAS=true yarn test`

### Cross-Chain Considerations
- Ethereum contracts work with standard EVM tooling
- Polkadot contracts deployed to Asset Hub (EVM-compatible parachain)
- XCM messaging requires specific precompile integration on Polkadot side
- Both chains use the same EVM bytecode format

### Frontend Development Workflow
1. Update/deploy contracts: `yarn deploy`
2. ABIs automatically sync to `deployedContracts.ts`
3. Use debug page (`/debug`) to test contract interactions
4. Build custom UI with Scaffold-ETH hooks and components
5. Configure target networks in `scaffold.config.ts` (if it exists)

## Critical Security Considerations

- **Rescue Delay**: 7-day delay before owner can rescue funds - hardcoded in deployment
- **Access Tokens**: Optional ERC20 token requirement for swap participation
- **HTLC Pattern**: Ensures atomicity - swap either completes fully or can be cancelled
- **Event Logging**: All state changes emit events for audit trail
- **Timelock Mechanisms**: Users can cancel swaps after timeout period
- **Reentrancy Protection**: OpenZeppelin ReentrancyGuard on all fund transfers (✅ IMPLEMENTED)
- **CEI Pattern**: Checks-Effects-Interactions followed in all state-changing functions (✅ IMPLEMENTED)

### Recent Security Improvements (2025)

**Critical Fixes Applied:**
1. **Reentrancy Guards**: Added `nonReentrant` modifier to `completeSwap()`, `cancelSwap()`, `publicCancelSwap()`, and `rescueFunds()`
2. **State Management**: Fixed `rescueFunds()` to update swap state and prevent double-rescue attacks
3. **Memory Caching**: Implemented CEI pattern with memory caching to prevent reentrancy and reduce gas costs

**Test Coverage:**
- 24/24 tests passing for EthereumEscrow
- Full coverage of swap lifecycle, error conditions, and access control
- Gas analysis: completeSwap ~44k gas, createSwap ~250k gas

**Known Issues to Address:**
- XCM Bridge `sendToEthereum()` function is incomplete (stub implementation)
- Polkadot escrow lacks native DOT support (only ERC20 tokens)
- No test coverage yet for PolkadotEscrow and XCMBridge contracts
- Front-running risk on Polkadot side (anyone with secret can complete swap)

See `SECURITY_AUDIT.md` for detailed security analysis and `TECHNICAL_IMPROVEMENTS.md` for roadmap.

## Testnet Resources

**Ethereum Sepolia**
- Explorer: https://sepolia.etherscan.io/
- Faucet: https://sepoliafaucet.com/

**Polkadot Paseo (Asset Hub)**
- Explorer: https://blockscout-passet-hub.parity-testnet.parity.io/
- Faucet: https://faucet.polkadot.io/
