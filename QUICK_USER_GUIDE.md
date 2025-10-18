# DotFusion Quick User Guide

## 🚀 Getting Started

### Prerequisites
- MetaMask or compatible Web3 wallet
- Test ETH on Sepolia (from faucet)
- Test DOT on Paseo Asset Hub (from faucet)

### Starting the Platform
```bash
# 1. Start blockchain
yarn chain

# 2. Deploy contracts  
yarn deploy

# 3. Start resolver (IMPORTANT!)
cd packages/hardhat
yarn resolver-api

# 4. Start frontend
cd packages/nextjs
yarn start
```

**⚠️ IMPORTANT**: The resolver API must be running for automatic swaps!

---

## 📱 Navigation

Your navbar now has:
1. **Home** - Platform overview and statistics
2. **Fast Swap** - Quick automated swaps (RECOMMENDED)
3. **Advanced Swap** - Manual swap creation
4. **My Swaps** - Track all your swaps
5. **Debug** - Contract interaction tools

---

## ⚡ Fast Swap (Recommended)

### Step-by-Step Process

#### 1. Create Swap
1. Go to **Fast Swap** page
2. Check resolver status is "Online" (green badge)
3. Select direction (ETH→DOT or DOT→ETH)
4. Enter amount to send
5. See calculated amount you'll receive
6. Enter your destination address
7. Click "Fast Swap" button

#### 2. Track Progress
After clicking "Fast Swap", you'll see:

**Stage 1: Initiated** 🔵
- Your transaction on source chain
- Transaction hash displayed
- Link to block explorer
- Status: "Swap created, waiting for resolver"

**Stage 2: Matched** 🟡
- Resolver's matching transaction
- Transaction hash displayed  
- Link to block explorer
- Status: "Resolver locked matching funds"

#### 3. Claim Your Funds
When matched, you'll see:
- Notification: "🎯 Ready to claim!"
- Your secret displayed (SAVE THIS!)
- "View Swap Details" button (primary)

Click "View Swap Details" to:
1. See complete swap information
2. Verify all transaction hashes
3. Click "Claim My [ETH/DOT]"
4. Confirm transaction in MetaMask
5. Receive your swapped tokens!

#### 4. Completion
- Final transaction hash displayed
- All 4 transactions visible (2 locks + 2 claims)
- Swap marked as COMPLETED 🎉
- Funds in your wallet!

---

## 👀 My Swaps Page

### Features
- **Statistics Dashboard**: Total, Active, Completed, Failed swaps
- **Filter Tabs**: All / Active / Completed / Failed
- **Swap Cards**: Each showing:
  - Current status with icon
  - Direction (ETH→DOT or DOT→ETH)
  - Amounts (send and receive)
  - Addresses (yours and destination)
  - Transaction count with quick links
  - Creation/completion timestamps
  - Action button (View Details or Claim Now)

### Quick Actions
- **View Details**: See complete swap information
- **Claim Now**: Directly claim ready swaps (shown in primary button)
- **Refresh**: Update swap list (circular arrow button)

---

## 🔍 Swap Details Page

### What You'll See
1. **Current Status Banner**
   - Large status badge with icon
   - Stage description
   - Current progress indicator

2. **Swap Overview**
   - Amounts: What you sent vs what you'll receive
   - Addresses: Your address, destination, resolver
   - Direction: ETH→DOT or DOT→ETH
   - Role: MAKER or TAKER

3. **Transaction History**
   - Chronological list of all transactions
   - Each shows:
     - Stage name and icon
     - Description
     - Chain (ethereum/polkadot)
     - Transaction hash
     - Timestamp
     - "View" button → Block explorer

4. **Claim Interface** (when ready)
   - Your secret (pre-filled if saved)
   - Secret input field
   - "Claim My [ETH/DOT]" button
   - Instructions and warnings

5. **Technical Details**
   - Swap ID (unique identifier)
   - Secret Hash (for verification)
   - Creation time
   - Completion time (if done)

---

## 💡 Transaction Tracking

### What Gets Tracked?

Every atomic swap has **4 transactions**:

#### ETH → DOT Example:
```
1. 🔵 You lock ETH on Ethereum
   → TX: 0x1234...
   → View on Etherscan
   
2. 🟡 Resolver locks DOT on Polkadot
   → TX: 0xabcd...
   → View on Subscan
   
3. ✅ You claim DOT on Polkadot
   → TX: 0x5678...
   → View on Subscan
   
4. 🎉 Resolver claims ETH on Ethereum
   → TX: 0xef01...
   → View on Etherscan

✅ COMPLETED!
```

### Explorer Links
- **Ethereum (Sepolia)**: https://sepolia.etherscan.io
- **Polkadot (Paseo)**: https://assethub-paseo.subscan.io

Click any transaction hash to verify on the blockchain!

---

## 🔐 Secret Management

### What is the Secret?
- A randomly generated 32-byte value
- Used to claim funds in atomic swap
- Cryptographically secure (client-side generation)

### Important Rules
1. **SAVE YOUR SECRET!** 
   - Displayed after swap creation
   - You'll need it to claim funds
   - If lost, you cannot claim (but can refund after timeout)

2. **Keep it Private!**
   - Don't share with anyone
   - Only reveal when claiming
   - Revealing it allows anyone to claim

3. **Where to Find It**
   - Swap Details page (if saved in tracking)
   - Original success screen (copy/save immediately)
   - Browser local storage (if not cleared)

### Secret Format
```
0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b
```
- Always starts with `0x`
- 66 characters total (0x + 64 hex chars)
- Case-insensitive

---

## 📊 Swap Stages Guide

| Stage | What It Means | Your Action |
|-------|---------------|-------------|
| 🔵 **INITIATED** | Swap created on source chain | ⏳ Wait for resolver (~30s) |
| 🟡 **RESOLVER_MATCHED** | Resolver locked matching funds | 🎯 **CLAIM YOUR FUNDS NOW!** |
| ⏳ **USER_CLAIMING** | Your claim transaction processing | ⏳ Wait for confirmation |
| ✅ **USER_CLAIMED** | You successfully claimed | ⏳ Wait for resolver to claim |
| ⏳ **RESOLVER_CLAIMING** | Resolver claiming their funds | ⏳ Wait for confirmation |
| 🎉 **COMPLETED** | Swap fully complete! | ✅ Done! Check your wallet |
| ❌ **FAILED** | Something went wrong | ℹ️ Check details, may need refund |
| ↩️ **REFUNDED** | Timeout occurred, funds returned | ✅ Check your wallet for refund |

---

## ⚠️ Common Issues & Solutions

### Resolver Offline
**Problem**: "Resolver Service Offline" warning
**Solution**: 
1. Check resolver API is running: `yarn resolver-api`
2. Check resolver has funds on both chains
3. Check resolver private key in `.env`

### Swap Not Showing
**Problem**: Created swap not in "My Swaps"
**Solution**:
1. Ensure using same wallet address
2. Click refresh button on My Swaps
3. Check browser local storage is enabled
4. Wait a few seconds and refresh

### Can't Claim Funds
**Problem**: Claim button disabled or not showing
**Solution**:
1. Check swap is in "RESOLVER_MATCHED" stage
2. Verify you have the secret
3. Check you have gas for the transaction
4. Ensure you're on correct network

### Transaction Hash Not Showing
**Problem**: TX hash missing after transaction
**Solution**:
1. Wait 10-15 seconds for confirmation
2. Check MetaMask for pending transactions
3. Verify network connection
4. Refresh the page

### Lost Secret
**Problem**: Can't find secret to claim
**Solution**:
1. Check Swap Details page (may be saved)
2. Check original swap creation screen (if still open)
3. Wait for timelock to expire, then refund swap

---

## 🎓 Best Practices

### Before Swapping
1. ✅ Check resolver is online (green badge)
2. ✅ Verify exchange rate is acceptable
3. ✅ Ensure you have enough gas on both chains
4. ✅ Double-check destination address
5. ✅ Start with small test amount first

### During Swap
1. ✅ SAVE YOUR SECRET immediately
2. ✅ Don't close browser until you see success
3. ✅ Take screenshot of swap details
4. ✅ Note down Swap ID for reference
5. ✅ Keep transaction hashes for verification

### After Swap Creation
1. ✅ Wait for resolver to match (~30 seconds)
2. ✅ Go to Swap Details when notified
3. ✅ Verify all transaction hashes
4. ✅ Claim funds promptly
5. ✅ Check your wallet balance

### Security
1. ✅ Never share your secret
2. ✅ Only use official DotFusion interface
3. ✅ Verify transaction details before signing
4. ✅ Use hardware wallet for large amounts
5. ✅ Keep private keys secure

---

## 📞 Getting Help

### Check First
1. Swap Details page - full transaction history
2. Block explorers - verify on-chain
3. My Swaps page - see all your swaps
4. This guide - troubleshooting section

### Debug Information
When asking for help, provide:
- Swap ID (from Swap Details)
- Current stage/status
- Transaction hashes (all of them)
- Network (Sepolia/Paseo)
- Error messages (screenshots helpful)
- Resolver API logs (if applicable)

### Logs Location
- **Frontend**: Browser console (F12)
- **Resolver**: Terminal where `yarn resolver-api` is running
- **Blockchain**: Block explorer transaction details

---

## 🎯 Quick Tips

### Speed Tips
- ⚡ Use "Fast Swap" for automatic experience
- ⚡ Keep resolver running in background
- ⚡ Have gas ready on both chains
- ⚡ Claim funds promptly after matching

### Money Saving Tips
- 💰 Use lower gas prices for non-urgent swaps
- 💰 Batch multiple small swaps
- 💰 Wait for lower network congestion
- 💰 Test with minimal amounts first

### Safety Tips
- 🔐 Save secret in password manager
- 🔐 Verify addresses carefully
- 🔐 Check transaction details before signing
- 🔐 Use testnets first
- 🔐 Start with small amounts

---

## ✅ Success Checklist

### I successfully completed a swap when:
- ✅ I can see 4 transactions in Swap Details
- ✅ All transaction hashes link to block explorer
- ✅ Status shows "COMPLETED" 🎉
- ✅ I received expected amount in my wallet
- ✅ I can verify all transactions on explorers

### My setup is correct when:
- ✅ Resolver shows "Online" (green badge)
- ✅ My wallet is connected
- ✅ I have gas on both chains
- ✅ Exchange rate is displayed correctly
- ✅ All buttons are enabled (not grayed out)

---

## 🎉 You're Ready!

Now you can:
1. Create fast atomic swaps between ETH and DOT
2. Track every transaction with hashes and explorer links
3. See real-time progress through all stages
4. Claim your swapped funds securely
5. Verify everything on blockchain explorers

**Happy Swapping! 🚀**

---

## 📚 Additional Resources

- **DotFusion Docs**: See project README files
- **Smart Contracts**: `packages/hardhat/contracts/`
- **Resolver API**: `packages/hardhat/scripts/resolver-api.ts`
- **Frontend Code**: `packages/nextjs/app/`

For detailed technical information, see `FRONTEND_IMPROVEMENTS_SUMMARY.md`

