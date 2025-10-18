# DotFusion Swap Flow - Visual Guide

## 🔄 Complete ETH → DOT Swap Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INITIATES SWAP                          │
│                                                                     │
│  Fast Swap Page                                                     │
│  ├─ Selects: ETH → DOT                                             │
│  ├─ Amount: 0.01 ETH                                               │
│  ├─ Calculates: 1,000 DOT (rate: 1 ETH = 100,000 DOT)            │
│  ├─ Destination: 0xabcd... (user's DOT address)                   │
│  └─ Clicks: "Fast Swap ETH → DOT"                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    STAGE 1: SWAP INITIATED 🔵                       │
│                                                                     │
│  Ethereum (Sepolia)                                                 │
│  ├─ Contract: DotFusionEthereumEscrow                              │
│  ├─ Function: createSwap()                                         │
│  ├─ Locks: 0.01 ETH                                                │
│  ├─ Secret Hash: 0x1a2b3c... (from generated secret)              │
│  ├─ Taker: Resolver Address                                        │
│  ├─ Timelock: 12 hours                                             │
│  └─ TX Hash: 0x1234...5678 ✅                                      │
│                                                                     │
│  Frontend Action:                                                   │
│  ├─ Saves swap to tracking system                                  │
│  ├─ Displays transaction card:                                     │
│  │   "🔵 Initiated - Swap created, waiting for resolver"          │
│  ├─ Shows TX hash: 0x1234...5678                                   │
│  ├─ Links to: https://sepolia.etherscan.io/tx/0x1234...5678       │
│  └─ Displays secret: 0x9a8b7c... (SAVE THIS!)                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                STAGE 2: RESOLVER MATCHED 🟡                         │
│                                                                     │
│  Resolver API                                                       │
│  ├─ Receives: POST /fulfill-eth-to-dot                             │
│  ├─ Validates: Swap details                                        │
│  ├─ Connects: Polkadot (Paseo Asset Hub)                          │
│  └─ Calls: createNativeSwap()                                      │
│                                                                     │
│  Polkadot (Paseo Asset Hub)                                        │
│  ├─ Contract: DotFusionPolkadotEscrow                              │
│  ├─ Function: createNativeSwap()                                   │
│  ├─ Locks: 1,000 DOT                                               │
│  ├─ Secret Hash: 0x1a2b3c... (same hash!)                         │
│  ├─ Maker: User's DOT address (0xabcd...)                         │
│  ├─ Timelock: 6 hours                                              │
│  └─ TX Hash: 0xabcd...ef01 ✅                                      │
│                                                                     │
│  Frontend Action:                                                   │
│  ├─ Receives TX hash from resolver API                             │
│  ├─ Updates swap status to RESOLVER_MATCHED                        │
│  ├─ Displays transaction card:                                     │
│  │   "🟡 Matched - Resolver locked matching funds"                │
│  ├─ Shows TX hash: 0xabcd...ef01                                   │
│  ├─ Links to: https://assethub-paseo.subscan.io/tx/0xabcd...ef01  │
│  └─ Shows notification: "🎯 Ready to claim your DOT!"             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   USER GOES TO SWAP DETAILS                         │
│                                                                     │
│  Swap Details Page                                                  │
│  ├─ Shows current status: "Ready to Claim Your Funds!" ✨         │
│  ├─ Displays all swap information                                  │
│  ├─ Shows transaction history:                                     │
│  │   ├─ TX 1: Initiated on Ethereum (0x1234...5678)               │
│  │   └─ TX 2: Matched on Polkadot (0xabcd...ef01)                │
│  ├─ Pre-fills secret (if saved): 0x9a8b7c...                      │
│  └─ Shows "Claim My DOT" button (primary, large)                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  STAGE 3: USER CLAIMED ✅                           │
│                                                                     │
│  User Action                                                        │
│  ├─ Enters/verifies secret: 0x9a8b7c...                           │
│  ├─ Clicks: "Claim My DOT"                                         │
│  └─ Confirms transaction in MetaMask                                │
│                                                                     │
│  Polkadot (Paseo Asset Hub)                                        │
│  ├─ Contract: DotFusionPolkadotEscrow                              │
│  ├─ Function: completeSwap()                                       │
│  ├─ Validates: Secret hash matches                                 │
│  ├─ Releases: 1,000 DOT to user (0xabcd...)                       │
│  ├─ Stores: Secret on-chain (now public)                           │
│  └─ TX Hash: 0x5678...9abc ✅                                      │
│                                                                     │
│  Frontend Action:                                                   │
│  ├─ Updates swap status to USER_CLAIMED                            │
│  ├─ Displays transaction card:                                     │
│  │   "✅ Claimed - You claimed your funds successfully"            │
│  ├─ Shows TX hash: 0x5678...9abc                                   │
│  ├─ Links to: https://assethub-paseo.subscan.io/tx/0x5678...9abc  │
│  └─ Shows notification: "✅ Funds claimed successfully!"           │
│                                                                     │
│  User Wallet                                                        │
│  └─ Receives: 1,000 DOT 💰                                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                 STAGE 4: RESOLVER CLAIMS 🎉                         │
│                                                                     │
│  Resolver (Automatic)                                               │
│  ├─ Detects: Secret revealed on-chain                              │
│  ├─ Reads: Secret from Polkadot transaction                        │
│  ├─ Connects: Ethereum (Sepolia)                                   │
│  └─ Calls: completeSwap() with revealed secret                     │
│                                                                     │
│  Ethereum (Sepolia)                                                 │
│  ├─ Contract: DotFusionEthereumEscrow                              │
│  ├─ Function: completeSwap()                                       │
│  ├─ Validates: Secret hash matches                                 │
│  ├─ Releases: 0.01 ETH to resolver                                 │
│  └─ TX Hash: 0xdef0...1234 ✅                                      │
│                                                                     │
│  Frontend Action:                                                   │
│  ├─ Detects completion (via event listener or manual check)        │
│  ├─ Updates swap status to COMPLETED                               │
│  ├─ Displays transaction card:                                     │
│  │   "🎉 Completed - Swap completed successfully!"                 │
│  ├─ Shows TX hash: 0xdef0...1234                                   │
│  ├─ Links to: https://sepolia.etherscan.io/tx/0xdef0...1234        │
│  └─ Shows celebration notification: "🎉 Swap complete!"            │
│                                                                     │
│  Resolver Wallet                                                    │
│  └─ Receives: 0.01 ETH 💰                                          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       SWAP COMPLETED! 🎊                            │
│                                                                     │
│  Final Status                                                       │
│  ├─ Stage: COMPLETED 🎉                                            │
│  ├─ Total Transactions: 4                                          │
│  ├─ Total Time: ~2-3 minutes                                       │
│  └─ All parties received their funds ✅                            │
│                                                                     │
│  My Swaps Page Shows:                                               │
│  ├─ Status Badge: "🎉 Completed"                                   │
│  ├─ Amounts: 0.01 ETH ↔ 1,000 DOT                                 │
│  ├─ All 4 transaction hashes with explorer links                   │
│  ├─ Creation time: 2025-10-18 14:23:45                            │
│  └─ Completion time: 2025-10-18 14:26:12                          │
│                                                                     │
│  User Can:                                                          │
│  ├─ View complete transaction history                              │
│  ├─ Verify all 4 transactions on block explorers                   │
│  ├─ See swap moved to "Completed" filter                           │
│  └─ Create another swap! 🚀                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete DOT → ETH Swap Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INITIATES SWAP                          │
│  ├─ Selects: DOT → ETH                                             │
│  ├─ Amount: 1,000 DOT                                              │
│  ├─ Calculates: 0.01 ETH                                           │
│  └─ Destination: 0x1234... (user's ETH address)                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│            STAGE 1: SWAP INITIATED 🔵 (on Polkadot)                │
│  Polkadot TX: 0xaaaa...bbbb ✅                                     │
│  Lock: 1,000 DOT                                                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│           STAGE 2: RESOLVER MATCHED 🟡 (on Ethereum)               │
│  Ethereum TX: 0xcccc...dddd ✅                                     │
│  Lock: 0.01 ETH                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│           STAGE 3: USER CLAIMED ✅ (claims ETH on Ethereum)        │
│  Ethereum TX: 0xeeee...ffff ✅                                     │
│  User receives: 0.01 ETH 💰                                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│          STAGE 4: RESOLVER CLAIMS 🎉 (claims DOT on Polkadot)     │
│  Polkadot TX: 0x1111...2222 ✅                                     │
│  Resolver receives: 1,000 DOT 💰                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Page Navigation Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                            HOME PAGE                                 │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Statistics (when connected):                              │    │
│  │  ├─ Total Swaps: 5                                         │    │
│  │  ├─ Completed: 3                                           │    │
│  │  └─ Your Swaps: 2                                          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Quick Actions:                                                      │
│  ├─ [Fast Swap] ──────────────────────► Fast Swap Page             │
│  ├─ [Advanced Swap] ──────────────────► Advanced Swap Page         │
│  └─ [My Swaps] ───────────────────────► My Swaps Page              │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                         FAST SWAP PAGE                               │
│                                                                      │
│  ┌─ Resolver Status: 🟢 Online                                      │
│  ├─ Direction: [ETH] ⇄ [DOT]                                        │
│  ├─ Amount: [0.01 ETH]                                              │
│  ├─ Receive: 1,000 DOT (calculated)                                 │
│  ├─ Destination: [0xabcd...]                                        │
│  └─ [Fast Swap ETH → DOT] ────────► Creates Swap                    │
│                                                                      │
│  After Creation:                                                     │
│  ├─ Shows transaction tracking cards                                │
│  ├─ Displays secret (SAVE THIS!)                                    │
│  └─ [View Swap Details] ──────────► Swap Details Page               │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                         MY SWAPS PAGE                                │
│                                                                      │
│  Statistics:                                                         │
│  ├─ Total: 5 │ Active: 1 │ Completed: 3 │ Failed: 1                │
│                                                                      │
│  Filters:                                                            │
│  ├─ [All] [Active] [Completed] [Failed]                             │
│                                                                      │
│  Swap List:                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🟡 Matched │ ETH→DOT │ 0.01 ETH ↔ 1,000 DOT                 │   │
│  │ [Claim Now] ──────────────────► Swap Details Page           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🎉 Completed │ DOT→ETH │ 1,000 DOT ↔ 0.01 ETH              │   │
│  │ [View Details] ───────────────► Swap Details Page           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      SWAP DETAILS PAGE                               │
│                                                                      │
│  [← Back to My Swaps]                                                │
│                                                                      │
│  Current Status:                                                     │
│  ┌─ 🟡 Matched ─────────────────────────────────────────────────┐  │
│  │  Resolver locked matching funds                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Swap Overview:                                                      │
│  ├─ You Send: 0.01 ETH                                              │
│  ├─ You Receive: 1,000 DOT                                          │
│  ├─ Your Address: 0x1234...                                         │
│  └─ Destination: 0xabcd...                                          │
│                                                                      │
│  Transaction History:                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🔵 Initiated                                                 │   │
│  │ ethereum | 0x1234...5678 [View ↗]                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🟡 Matched                                                   │   │
│  │ polkadot | 0xabcd...ef01 [View ↗]                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ✨ Ready to Claim Your Funds!                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Your Secret: 0x9a8b7c...                                     │   │
│  │ [Claim My DOT] ──────────► Claims funds                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   USER'S     │         │  DOTFUSION   │         │  RESOLVER    │
│   BROWSER    │         │   FRONTEND   │         │     API      │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                        │
       │  1. Connect Wallet     │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │  2. Create Swap Form   │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │                        │  3. Generate Secret    │
       │                        │  (client-side)         │
       │                        │                        │
       │  4. Sign TX (MetaMask) │                        │
       │<───────────────────────│                        │
       │───────────────────────>│                        │
       │                        │                        │
       │                        │  5. Save to Tracking   │
       │                        │  (localStorage)        │
       │                        │                        │
       │                        │  6. Call Resolver API  │
       │                        │───────────────────────>│
       │                        │                        │
       │                        │  7. Resolver Creates   │
       │                        │     Matching Swap      │
       │                        │<───────────────────────│
       │                        │     (TX Hash returned) │
       │                        │                        │
       │                        │  8. Update Tracking    │
       │                        │  (add resolver TX)     │
       │                        │                        │
       │  9. Show Notification  │                        │
       │<───────────────────────│                        │
       │  "Ready to claim!"     │                        │
       │                        │                        │
       │ 10. Navigate to Details│                        │
       │───────────────────────>│                        │
       │                        │                        │
       │ 11. Click Claim        │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │ 12. Sign TX (MetaMask) │                        │
       │<───────────────────────│                        │
       │───────────────────────>│                        │
       │                        │                        │
       │                        │  13. Update Tracking   │
       │                        │  (add claim TX)        │
       │                        │                        │
       │ 14. Show Success       │                        │
       │<───────────────────────│                        │
       │  "Claimed successfully"│                        │
       │                        │                        │
       │                        │  15. Resolver Detects  │
       │                        │      Revealed Secret   │
       │                        │                        │
       │                        │  16. Resolver Claims   │
       │                        │      (automatic)       │
       │                        │                        │
       │ 17. Swap Complete      │                        │
       │<───────────────────────│                        │
       │  Status: COMPLETED 🎉  │                        │
```

---

## 🔗 Smart Contract Interaction

```
┌────────────────────────────────────────────────────────────────────┐
│                    ETHEREUM SIDE (Sepolia)                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  DotFusionEthereumEscrow Contract                                  │
│                                                                    │
│  1. createSwap()                                                   │
│     ├─ Caller: User                                                │
│     ├─ Inputs: swapId, secretHash, taker, amounts, timelock       │
│     ├─ Effect: Locks ETH in escrow                                 │
│     ├─ Event: SwapCreated(swapId, maker, taker, amounts...)       │
│     └─ Returns: Transaction hash                                   │
│                                                                    │
│  2. completeSwap()                                                 │
│     ├─ Caller: Resolver                                            │
│     ├─ Inputs: swapId, secret                                      │
│     ├─ Validates: keccak256(secret) == secretHash                  │
│     ├─ Effect: Releases ETH to resolver                            │
│     ├─ Event: SwapCompleted(swapId, secret)                        │
│     └─ Returns: Transaction hash                                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│              POLKADOT SIDE (Paseo Asset Hub)                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  DotFusionPolkadotEscrow Contract                                  │
│                                                                    │
│  1. createNativeSwap()                                             │
│     ├─ Caller: Resolver                                            │
│     ├─ Inputs: swapId, secretHash, maker, timelock                │
│     ├─ Effect: Locks DOT in escrow                                 │
│     ├─ Event: SwapCreated(swapId, taker, maker, amount...)        │
│     └─ Returns: Transaction hash                                   │
│                                                                    │
│  2. completeSwap()                                                 │
│     ├─ Caller: User                                                │
│     ├─ Inputs: swapId, secret, recipient                           │
│     ├─ Validates: keccak256(secret) == secretHash                  │
│     ├─ Effect: Releases DOT to user                                │
│     ├─ Event: SwapCompleted(swapId, secret)                        │
│     └─ Returns: Transaction hash                                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 💾 Data Storage

```
┌────────────────────────────────────────────────────────────────────┐
│                  BROWSER LOCAL STORAGE                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Key: "dotfusion_swaps"                                            │
│                                                                    │
│  Value: Array of SwapTrackingData                                  │
│  [                                                                 │
│    {                                                               │
│      swapId: "0x1a2b3c...",                                        │
│      secretHash: "0x4d5e6f...",                                    │
│      secret: "0x7a8b9c...",                                        │
│      direction: "ETH_TO_DOT",                                      │
│      userAddress: "0x1234...",                                     │
│      destinationAddress: "0xabcd...",                              │
│      sendAmount: "0.01",                                           │
│      receiveAmount: "1000",                                        │
│      currentStage: "RESOLVER_MATCHED",                             │
│      createdAt: 1729266225000,                                     │
│      transactions: [                                               │
│        {                                                           │
│          txHash: "0x1234...5678",                                  │
│          chain: "ethereum",                                        │
│          stage: "INITIATED",                                       │
│          timestamp: 1729266225000,                                 │
│          explorerUrl: "https://sepolia.etherscan.io/tx/..."       │
│        },                                                          │
│        {                                                           │
│          txHash: "0xabcd...ef01",                                  │
│          chain: "polkadot",                                        │
│          stage: "RESOLVER_MATCHED",                                │
│          timestamp: 1729266255000,                                 │
│          explorerUrl: "https://assethub-paseo.subscan.io/tx/..."  │
│        }                                                           │
│      ],                                                            │
│      role: "MAKER"                                                 │
│    },                                                              │
│    // ... more swaps                                              │
│  ]                                                                 │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Summary

This visual guide shows:
1. **Complete swap flow** with all 4 transaction stages
2. **Page navigation** between different parts of the app
3. **Data flow** between user, frontend, and resolver
4. **Smart contract interactions** on both chains
5. **Data storage** structure in local storage

Every transaction is tracked, every hash is captured, and every step is verifiable on blockchain explorers! 🎉

