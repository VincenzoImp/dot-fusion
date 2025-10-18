# API Keys Setup Guide

This guide will help you configure the necessary API keys for the DotFusion frontend.

## Overview

You're seeing these errors because the project uses placeholder API keys. While the app will work without them, some features may not function properly.

## Required API Keys

### 1. Alchemy API Key (Recommended)

**Purpose**: Used for blockchain RPC requests (reading contract data, sending transactions)

**How to get it:**
1. Go to [https://www.alchemy.com/](https://www.alchemy.com/)
2. Sign up for a free account
3. Create a new app for Ethereum Sepolia
4. Copy your API key

**Where to add it:**
- Location: `packages/nextjs/scaffold.config.ts`
- Find: `alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "your_alchemy_api_key_here"`
- Replace with: Your actual Alchemy API key

**Environment Variable (Alternative):**
```bash
# In packages/nextjs/.env.local
NEXT_PUBLIC_ALCHEMY_API_KEY=your_actual_key_here
```

---

### 2. WalletConnect Project ID (Optional)

**Purpose**: Used for WalletConnect wallet integration

**How to get it:**
1. Go to [https://cloud.walletconnect.com/](https://cloud.walletconnect.com/)
2. Sign up and create a new project
3. Copy your Project ID

**Where to add it:**
- Location: `packages/nextjs/services/web3/wagmiConfig.tsx`
- Find: `projectId: "your_walletconnect_project_id_here"`
- Replace with: Your actual WalletConnect Project ID

**Environment Variable (Alternative):**
```bash
# In packages/nextjs/.env.local
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_actual_project_id_here
```

---

## Quick Setup (Using Local Hardhat Network)

If you're just testing locally with Hardhat, you **don't need** these API keys! The app will work fine with the local network.

### Steps:
1. Make sure Hardhat is running: `yarn chain`
2. Deploy contracts: `yarn deploy`
3. Start the frontend: `yarn start`
4. Connect with MetaMask to `http://localhost:8545` (Chain ID: 31337)

The API key errors won't affect local development functionality.

---

## Optional: Create Environment File

Create a `.env.local` file in `packages/nextjs/`:

```bash
# packages/nextjs/.env.local

# Alchemy API Key (for Sepolia testnet)
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key_here

# WalletConnect Project ID
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

Then restart your development server: `yarn start`

---

## Priority

1. **Critical**: None - the app works without these keys for local development
2. **Recommended**: Alchemy API Key - improves reliability when connecting to testnets
3. **Optional**: WalletConnect Project ID - only needed if you want to use WalletConnect wallets

---

## Testing Without API Keys

You can fully test the DotFusion app without setting up any API keys:

1. Use the local Hardhat network
2. Connect with MetaMask
3. Add the Hardhat network to MetaMask:
   - Network Name: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

That's it! The 401/403 errors in the console are just warnings and won't affect your local development experience.

---

## Need Help?

If you encounter issues:
- Check the browser console for specific errors
- Ensure `yarn chain` is running
- Ensure `yarn deploy` completed successfully
- Try clearing browser cache and reloading

