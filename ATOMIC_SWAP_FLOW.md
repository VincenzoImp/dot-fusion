# DotFusion Atomic Swap Flow - Complete Guide

## Overview

DotFusion implements a **Hash Time-Locked Contract (HTLC)** atomic swap protocol enabling trustless exchanges between Ethereum (ETH) and Polkadot (DOT). This document provides a detailed walkthrough of the complete swap lifecycle.

## Architecture Components

### Smart Contracts

1. **EthereumEscrow** (Sepolia Testnet)
   - Locks ETH on the Ethereum side
   - Minimum timelock: 12 hours
   - Hash function: `keccak256`

2. **PolkadotEscrow** (Paseo Asset Hub)
   - Locks DOT (native) or ERC20 tokens on Polkadot side
   - Maximum timelock: 6 hours
   - Hash function: `keccak256`

3. **XCMBridge** (Paseo Asset Hub)
   - Coordinates cross-chain messaging using XCM Precompile
   - Propagates revealed secrets between chains

### Key Security Features

✅ **Front-Running Protection**: Only the maker (original initiator) can claim on Polkadot
✅ **Reentrancy Guards**: All fund transfers protected with OpenZeppelin ReentrancyGuard
✅ **CEI Pattern**: Checks-Effects-Interactions pattern enforced
✅ **Timelock Ordering**: `T_eth (12h) > T_dot (6h)` ensures safe swap completion
✅ **Emergency Rescue**: 7-day delay before owner can rescue stuck funds

---

## Complete Atomic Swap Flow

### Step 0: Prerequisites

**Client A (Ethereum Initiator)**
- Has ETH on Ethereum Sepolia
- Generates a random 32-byte secret `s`
- Computes hash `h = keccak256(s)`
- Controls two addresses:
  - Ethereum address (for ETH swap)
  - Polkadot address (to receive DOT)

**Client B (Polkadot Responder)**
- Has DOT on Polkadot Paseo Asset Hub
- Observes Ethereum blockchain for swap creation
- Controls two addresses:
  - Polkadot address (for DOT swap)
  - Ethereum address (to receive ETH)

---

### Step 1: A Creates Swap on Ethereum

**Transaction:** `EthereumEscrow.createSwap()`

```solidity
createSwap(
  swapId: 0xabc123...,              // Unique identifier
  secretHash: h,                     // keccak256(secret)
  taker: B_ethereum_address,         // B's Ethereum address
  ethAmount: 1.0 ETH,                // Amount to lock
  dotAmount: 100 DOT,                // Expected DOT in return
  exchangeRate: 100,                 // 100 DOT per ETH
  timelock: 43200,                   // 12 hours in seconds
  polkadotSender: B_polkadot_address // B's Polkadot address
)
{ value: 1.0 ETH }
```

**State After Step 1:**
- ✅ 1.0 ETH locked in Ethereum escrow
- ✅ Swap state: `OPEN`
- ✅ Unlock time: `block.timestamp + 12 hours`
- ✅ Event emitted: `SwapCreated(...)`

**Validation:**
- ❌ Fails if `timelock < 12 hours` (MIN_TIMELOCK)
- ❌ Fails if `msg.value != ethAmount`
- ❌ Fails if `secretHash == 0x0`

---

### Step 2: B Observes Ethereum and Locks DOT

**B's Actions:**
1. Monitors Ethereum for `SwapCreated` event with matching parameters
2. Verifies swap parameters (amounts, exchange rate, unlock time)
3. Extracts `secretHash (h)` from the event

**Transaction:** `PolkadotEscrow.createNativeSwap()`

```solidity
createNativeSwap(
  swapId: 0xabc123...,              // SAME swapId as Ethereum
  secretHash: h,                     // SAME hash from Ethereum
  maker: A_polkadot_address,         // A's Polkadot address
  timelock: 21600                    // 6 hours in seconds
)
{ value: 100 DOT }
```

**State After Step 2:**
- ✅ 100 DOT locked in Polkadot escrow
- ✅ Swap state: `OPEN`
- ✅ Unlock time: `block.timestamp + 6 hours`
- ✅ Swap marked as `isNative: true`
- ✅ Event emitted: `SwapCreated(...)`

**Validation:**
- ❌ Fails if `timelock > 6 hours` (MAX_TIMELOCK)
- ❌ Fails if `msg.value == 0`
- ❌ Fails if `secretHash == 0x0`

**Critical:** `T_eth (12h) > T_dot (6h)` ensures A has enough time to claim DOT before Ethereum swap expires.

---

### Step 3: A Claims DOT by Revealing Secret

**Transaction:** `PolkadotEscrow.completeSwap()`

```solidity
completeSwap(
  swapId: 0xabc123...,
  secret: s,                         // Reveals the 32-byte secret!
  target: A_polkadot_address         // Where to send DOT
)
```

**Validation:**
- ✅ Verifies `keccak256(secret) == secretHash`
- ✅ Verifies `msg.sender == maker` (only A can claim - prevents front-running!)
- ✅ Verifies swap state is `OPEN`

**State After Step 3:**
- ✅ 100 DOT transferred to A's Polkadot address
- ✅ Swap state: `COMPLETED`
- ✅ Secret `s` is now **publicly visible** on Polkadot blockchain
- ✅ Event emitted: `SwapCompleted(swapId, secret)`

---

### Step 4: B Retrieves Secret from Polkadot

**B's Actions:**
1. Monitors Polkadot for `SwapCompleted` event
2. Extracts revealed secret `s` from transaction calldata or event logs
3. Verifies `keccak256(s) == h` (sanity check)

**How to Retrieve Secret:**

```javascript
// Using ethers.js or web3.js
const filter = polkadotEscrow.filters.SwapCompleted(swapId);
const events = await polkadotEscrow.queryFilter(filter);
const secret = events[0].args.secret;

// OR from transaction input data
const tx = await provider.getTransaction(txHash);
const decoded = polkadotEscrow.interface.parseTransaction({ data: tx.data });
const secret = decoded.args.secret;
```

---

### Step 5: B Claims ETH Using Revealed Secret

**Transaction:** `EthereumEscrow.completeSwap()`

```solidity
completeSwap(
  swapId: 0xabc123...,
  secret: s                          // Same secret A revealed on Polkadot!
)
```

**Validation:**
- ✅ Verifies `keccak256(secret) == secretHash`
- ✅ Verifies `msg.sender == taker` (only B can claim)
- ✅ Verifies swap state is `OPEN`

**State After Step 5:**
- ✅ 1.0 ETH transferred to B's Ethereum address
- ✅ Swap state: `COMPLETED`
- ✅ Event emitted: `SwapCompleted(swapId, secret)`

---

### ✅ Swap Complete!

**Final Result:**
- A started with: 1.0 ETH → Ended with: 100 DOT
- B started with: 100 DOT → Ended with: 1.0 ETH
- **Atomic guarantee:** Either both swaps complete or both can be refunded

---

## Refund Scenarios

### Scenario 1: B Never Locks DOT (Step 2 Skipped)

**What Happens:**
- ETH remains locked on Ethereum
- After 12 hours, `unlockTime` expires
- A can call `EthereumEscrow.cancelSwap(swapId)`
- ETH is refunded to A

**Transaction:**
```solidity
// After 12 hours have passed
cancelSwap(swapId)
```

**Result:** A gets their 1.0 ETH back, no loss.

---

### Scenario 2: A Never Claims DOT (Step 3 Skipped)

**What Happens:**
- DOT remains locked on Polkadot
- After 6 hours, `unlockTime` expires
- B can call `PolkadotEscrow.cancelSwap(swapId)`
- DOT is refunded to B

**Transaction:**
```solidity
// After 6 hours have passed (on Polkadot)
cancelSwap(swapId)
```

**Result:** B gets their 100 DOT back, no loss.

---

### Scenario 3: A Claims DOT but B Doesn't Act in Time

**What Happens:**
- A reveals secret on Polkadot and gets 100 DOT
- B has from Step 3 until Step 1's 12-hour deadline to claim ETH
- If B doesn't act: After 12 hours + 7 days, owner can rescue ETH

**Critical:** B must monitor Polkadot and act quickly! The time window is:
```
Available time for B = T_eth - (time since Step 1)
```

If A claims DOT at 11th hour, B has only 1 hour remaining to claim ETH.

**Best Practice:** B should monitor continuously and claim as soon as secret is revealed.

---

## Emergency Rescue Mechanism

### Owner Rescue (Last Resort)

If funds get stuck due to bugs or lost keys:

**Conditions:**
- Swap must be `OPEN` or `CANCELLED` (not `COMPLETED`)
- Must wait: `unlockTime + 7 days (rescueDelay)`
- Only contract owner can call

**Transaction:**
```solidity
// After unlockTime + 7 days
owner.rescueFunds(swapId)
```

**Result:** Funds transferred to contract owner for manual resolution.

---

## Timelock Guidelines

### Why T_eth > T_dot?

| Aspect | Ethereum (12h) | Polkadot (6h) | Reasoning |
|--------|---------------|--------------|-----------|
| **Initiator** | A locks ETH | B locks DOT | A takes initial risk |
| **First Claim** | - | A claims DOT (reveals secret) | A must act before DOT expires |
| **Second Claim** | B claims ETH | - | B has time after secret reveal |
| **Safety Margin** | 2x longer | Base timeout | Allows for network delays |

**Timeline Example:**
```
T=0h:   A locks 1 ETH (expires at T=12h)
T=1h:   B locks 100 DOT (expires at T=7h)
T=5h:   A claims DOT, reveals secret
T=5.5h: B sees secret, claims ETH
T=6h:   ✅ Swap complete (both sides succeeded)
```

---

## Hash Function Compatibility

Both chains use **keccak256** with the same encoding:

```solidity
// Ethereum & Polkadot (identical)
secretHash = keccak256(abi.encodePacked(secret))
```

This ensures cross-chain hash verification works correctly.

---

## Integration with XCM Bridge (IMPLEMENTED)

The `XCMBridge` contract provides automatic secret propagation between chains:

### Implemented Flow:
1. A claims DOT on Polkadot via `PolkadotEscrow.completeSwap()`
2. Secret is automatically propagated via `XCMBridge.propagateSecret()`
3. XCM message sent to Ethereum parachain using XCM Precompile
4. Ethereum receives message and auto-completes swap for B

**Current Status:** ✅ Fully implemented with comprehensive functionality:
- ✅ Automatic secret propagation on swap completion
- ✅ Manual secret propagation fallback
- ✅ Message tracking and state management
- ✅ Configurable XCM fees
- ✅ Error handling and recovery mechanisms
- ✅ Fee withdrawal and management

---

## Security Considerations

### ✅ Protections Implemented

1. **Front-Running Prevention:** Only maker can claim on Polkadot side
2. **Reentrancy Guards:** All fund transfers protected
3. **Timelock Ordering:** Enforced via `MIN_TIMELOCK` and `MAX_TIMELOCK` constants
4. **Secret Validation:** Hash verification on both chains
5. **State Machine:** Prevents double-spend and invalid state transitions

### ⚠️ User Responsibilities

1. **Monitor Both Chains:** Use event listeners or indexers
2. **Act Promptly:** Don't wait until last minute to claim
3. **Verify Parameters:** Check amounts, addresses, timelocks before locking funds
4. **Secure Secret:** A must keep secret safe until ready to claim DOT
5. **Gas Reserves:** Keep enough gas on both chains for transactions

---

## Code Examples

### Creating a Swap (Client A - Ethereum)

```typescript
import { ethers } from "ethers";

// Generate secret
const secret = ethers.randomBytes(32);
const secretHash = ethers.keccak256(secret);
const swapId = ethers.keccak256(ethers.toUtf8Bytes("swap_" + Date.now()));

// Create swap
const tx = await ethereumEscrow.createSwap(
  swapId,
  secretHash,
  takerEthereumAddress,
  ethers.parseEther("1.0"),     // 1 ETH
  ethers.parseEther("100"),     // 100 DOT expected
  ethers.parseEther("100"),     // Exchange rate
  43200,                        // 12 hours
  takerPolkadotAddress,
  { value: ethers.parseEther("1.0") }
);

await tx.wait();
console.log("Swap created! SwapId:", swapId);
console.log("Secret (keep safe!):", ethers.hexlify(secret));
```

### Responding to Swap (Client B - Polkadot)

```typescript
// Monitor for SwapCreated event
ethereumEscrow.on("SwapCreated", async (swapId, secretHash, maker, taker, ...) => {
  if (taker === myEthereumAddress) {
    // Verify parameters match expectations
    const swap = await ethereumEscrow.getSwap(swapId);

    // Lock DOT on Polkadot
    const tx = await polkadotEscrow.createNativeSwap(
      swapId,
      secretHash,
      makerPolkadotAddress,
      21600,  // 6 hours
      { value: ethers.parseEther("100") }
    );

    await tx.wait();
    console.log("DOT locked! Waiting for secret reveal...");
  }
});
```

### Claiming DOT (Client A - Polkadot)

```typescript
// A reveals secret to claim DOT
const tx = await polkadotEscrow.completeSwap(
  swapId,
  secret,  // The original 32-byte secret!
  myPolkadotAddress
);

await tx.wait();
console.log("DOT claimed! Secret is now public.");
```

### Claiming ETH (Client B - Ethereum)

```typescript
// Monitor Polkadot for secret reveal
polkadotEscrow.on("SwapCompleted", async (swapId, revealedSecret) => {
  // Verify this is our swap
  const swap = await ethereumEscrow.getSwap(swapId);

  if (swap.taker === myEthereumAddress) {
    // Claim ETH using the revealed secret
    const tx = await ethereumEscrow.completeSwap(swapId, revealedSecret);
    await tx.wait();
    console.log("ETH claimed! Swap complete! 🎉");
  }
});
```

---

## Testing

Run comprehensive tests:

```bash
# Test all contracts
yarn hardhat:test

# Test specific contract
npx hardhat test --grep "PolkadotEscrow"
npx hardhat test --grep "EthereumEscrow"
npx hardhat test --grep "XCMBridge"
```

---

## Deployment Addresses

### Testnet (Current)

**Ethereum Sepolia:**
- EthereumEscrow: `[Deploy with yarn deploy --network sepolia]`

**Polkadot Paseo (Asset Hub):**
- PolkadotEscrow: `[Deploy with yarn deploy --network paseo]`
- XCMBridge: `[Deploy with yarn deploy --network paseo]`

---

## Support

For issues or questions:
- **Documentation:** [CLAUDE.md](./CLAUDE.md)
- **Security:** [SECURITY_AUDIT.md](./packages/hardhat/docs/SECURITY_AUDIT.md)
- **GitHub Issues:** [Report an issue](https://github.com/your-repo/issues)

---

## Summary

DotFusion implements a **trustless, atomic** cross-chain swap protocol with:

✅ No trusted intermediaries
✅ No wrapped tokens
✅ No centralized bridges
✅ Cryptographic guarantees via HTLC
✅ Battle-tested security patterns

The swap either completes fully on both chains, or funds are safely refunded. This is the power of **atomic swaps**! 🚀
