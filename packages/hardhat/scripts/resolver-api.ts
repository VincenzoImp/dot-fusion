/**
 * DotFusion Resolver API Server
 *
 * Simple Express API that acts as a resolver service.
 * Frontend calls this API, and it fulfills swaps using the resolver's private key.
 *
 * No event listening, no RPC complexity - just simple API calls!
 *
 * Usage:
 * yarn resolver-api
 */

import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Fix BigInt serialization for JSON responses
// @ts-expect-error - Extending BigInt prototype for JSON serialization
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const app = express();
const PORT = process.env.RESOLVER_API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const CONFIG = {
  EXCHANGE_RATE: 100000, // 1 ETH = 100,000 DOT
  MIN_ETH_AMOUNT: "0.00001",
  MIN_DOT_AMOUNT: "1",
  ETH_TIMELOCK: 12 * 3600,
  DOT_TIMELOCK: 6 * 3600,

  RESOLVER_ADDRESS: process.env.RESOLVER_ADDRESS || "",
  RESOLVER_PRIVATE_KEY: process.env.RESOLVER_PRIVATE_KEY || "",

  // Use the SAME RPC endpoints as the frontend!
  SEPOLIA_RPC: process.env.SEPOLIA_RPC || "https://eth-sepolia.g.alchemy.com/v2/oKxs-03sij-U_N0iOlrSsZFr29-IqbuF",
  // Paseo RPC - use the same endpoint as hardhat config
  PASEO_RPC: process.env.PASEO_RPC || "https://testnet-passet-hub-eth-rpc.polkadot.io",

  SEPOLIA_ESCROW: "0x4cFC4fb3FF50D344E749a256992CB019De9f2229",
  PASEO_ESCROW: "0xc84E1a9A1772251CA228F34d0af5040B94C7083c",
};

// Helper to create provider with static network (skips detection)
function createProvider(rpc: string, chainId?: number): ethers.JsonRpcProvider {
  // For Paseo, create a custom network
  if (chainId) {
    const network = ethers.Network.from({
      name: "paseo",
      chainId: chainId,
    });
    return new ethers.JsonRpcProvider(rpc, network, { staticNetwork: true });
  }

  // For other networks, use default configuration
  return new ethers.JsonRpcProvider(rpc, undefined, { staticNetwork: true });
}

// Contract ABI (minimal)
const ESCROW_ABI = [
  "function createSwap(bytes32 swapId, bytes32 secretHash, address payable taker, uint256 ethAmount, uint256 dotAmount, uint256 exchangeRate, uint256 timelock, bytes32 polkadotSender) external payable",
  "function createNativeSwap(bytes32 swapId, bytes32 secretHash, address payable maker, uint256 timelock) external payable",
  "function completeSwap(bytes32 swapId, bytes32 secret) external",
  "function completeSwap(bytes32 swapId, bytes32 secret, address target) external",
  "event SwapCompleted(bytes32 indexed swapId, bytes32 secret)",
  "function getSwap(bytes32 swapId) external view returns (tuple(bytes32 secretHash, address maker, address taker, uint256 ethAmount, uint256 dotAmount, uint256 exchangeRate, uint256 unlockTime, uint8 state, bytes32 swapId, bytes32 polkadotSender))",
];

// Helper function
function addressToBytes32(address: string): string {
  if (!address || address === "0x") {
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  }
  return `0x${address.slice(2).padStart(64, "0")}`;
}

/**
 * GET /status
 * Check if resolver is online and get basic info
 */
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    resolverAddress: CONFIG.RESOLVER_ADDRESS,
    exchangeRate: {
      ethToDot: CONFIG.EXCHANGE_RATE,
      dotToEth: 1 / CONFIG.EXCHANGE_RATE,
      description: `1 ETH = ${CONFIG.EXCHANGE_RATE.toLocaleString()} DOT`,
    },
    minimumAmounts: {
      eth: CONFIG.MIN_ETH_AMOUNT,
      dot: CONFIG.MIN_DOT_AMOUNT,
    },
    timelocks: {
      ethSide: "12 hours",
      dotSide: "6 hours",
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /fulfill-eth-to-dot
 * User created ETH swap, resolver fulfills with DOT
 *
 * Body:
 * {
 *   swapId: string,
 *   secretHash: string,
 *   maker: string,
 *   ethAmount: string,
 *   dotAmount: string
 * }
 */
app.post("/fulfill-eth-to-dot", async (req, res) => {
  let swapId: string = "";
  try {
    const { swapId: requestSwapId, secretHash, maker, ethAmount, dotAmount } = req.body;
    swapId = requestSwapId;

    // Validate input
    if (!swapId || !secretHash || !maker || !ethAmount || !dotAmount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate amounts
    const ethAmountFloat = parseFloat(ethAmount);
    if (ethAmountFloat < parseFloat(CONFIG.MIN_ETH_AMOUNT)) {
      return res.status(400).json({ error: "ETH amount below minimum" });
    }

    console.log(`\n🔄 Fulfilling ETH→DOT swap:`);
    console.log(`Swap ID: ${swapId}`);
    console.log(`Maker: ${maker}`);
    console.log(`ETH: ${ethAmount}, DOT: ${dotAmount}`);

    // Connect to Paseo
    const provider = createProvider(CONFIG.PASEO_RPC, 420420422);
    const wallet = new ethers.Wallet(CONFIG.RESOLVER_PRIVATE_KEY, provider);
    const escrow = new ethers.Contract(CONFIG.PASEO_ESCROW, ESCROW_ABI, wallet) as any;

    // Check if swap already exists
    // Note: getSwap() doesn't throw - it returns a struct with state=0 (INVALID) if swap doesn't exist
    const existingSwap = await escrow.getSwap(swapId);
    const swapState = Number(existingSwap.state); // Convert to number for comparison

    console.log(`🔍 Checking swap existence: state=${swapState}, type=${typeof existingSwap.state}`);

    if (swapState !== 0) {
      // 0 = INVALID (doesn't exist), anything else means it exists
      console.log(`⚠️ Swap already exists with state: ${swapState}`);
      return res.status(400).json({
        error: "Swap already exists",
        swapId: swapId,
        currentState: swapState,
      });
    }
    console.log("✅ Swap does not exist (state=0), proceeding...");

    // Validate parameters before transaction
    console.log(`📋 Transaction parameters:`);
    console.log(`  - Swap ID: ${swapId}`);
    console.log(`  - Secret Hash: ${secretHash}`);
    console.log(`  - Maker: ${maker}`);
    console.log(`  - DOT Amount: ${dotAmount} (${ethers.parseEther(dotAmount).toString()} wei)`);
    console.log(`  - Timelock: ${CONFIG.DOT_TIMELOCK} seconds`);

    // Create native swap on Paseo
    // Note: ethers.js v6 handles BigInt natively, no need to explicitly convert
    const tx = await escrow.createNativeSwap(
      swapId,
      secretHash,
      maker,
      CONFIG.DOT_TIMELOCK, // Pass as number, ethers will convert
      {
        value: ethers.parseEther(dotAmount),
      },
    );

    console.log(`✅ Transaction sent: ${tx.hash}`);
    console.log(`⏳ Waiting for transaction confirmation...`);

    // Wait for confirmation before responding
    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block: ${receipt.blockNumber}`);

    res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: Number(receipt.blockNumber), // Convert BigInt to number for JSON
      message: "DOT swap created and confirmed on Paseo",
    });
  } catch (error: any) {
    console.error(`❌ Error fulfilling swap:`, error.message);

    // Try to extract more specific error information
    let errorDetails = error.message;
    if (error.reason) {
      errorDetails = error.reason;
    } else if (error.data) {
      errorDetails = `Transaction failed: ${error.data}`;
    }

    // Check for common revert reasons
    if (error.message.includes("SwapAlreadyExists")) {
      errorDetails = "Swap already exists on the blockchain";
    } else if (error.message.includes("InvalidSecretHash")) {
      errorDetails = "Invalid secret hash provided";
    } else if (error.message.includes("InvalidAmount")) {
      errorDetails = "Invalid amount provided";
    } else if (error.message.includes("TimelockTooLong")) {
      errorDetails = "Timelock duration exceeds maximum allowed";
    }

    res.status(500).json({
      error: "Failed to fulfill swap",
      details: errorDetails,
      swapId: swapId,
    });
  }
});

/**
 * POST /fulfill-dot-to-eth
 * User created DOT swap, resolver fulfills with ETH
 *
 * Body:
 * {
 *   swapId: string,
 *   secretHash: string,
 *   taker: string,
 *   dotAmount: string
 * }
 */
app.post("/fulfill-dot-to-eth", async (req, res) => {
  try {
    const { swapId, secretHash, taker, dotAmount } = req.body;

    // Validate input
    if (!swapId || !secretHash || !taker || !dotAmount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate amounts
    const dotAmountFloat = parseFloat(dotAmount);
    if (dotAmountFloat < parseFloat(CONFIG.MIN_DOT_AMOUNT)) {
      return res.status(400).json({ error: "DOT amount below minimum" });
    }

    // Calculate ETH amount
    const ethAmount = (dotAmountFloat / CONFIG.EXCHANGE_RATE).toFixed(18);

    console.log(`\n🔄 Fulfilling DOT→ETH swap:`);
    console.log(`Swap ID: ${swapId}`);
    console.log(`Taker: ${taker}`);
    console.log(`DOT: ${dotAmount}, ETH: ${ethAmount}`);

    // Connect to Sepolia
    const provider = createProvider(CONFIG.SEPOLIA_RPC);
    const wallet = new ethers.Wallet(CONFIG.RESOLVER_PRIVATE_KEY, provider);
    const escrow = new ethers.Contract(CONFIG.SEPOLIA_ESCROW, ESCROW_ABI, wallet) as any;

    // Create swap on Sepolia
    // Note: ethers.js v6 handles BigInt natively, no need to explicitly convert
    const tx = await escrow.createSwap(
      swapId,
      secretHash,
      taker,
      ethers.parseEther(ethAmount),
      ethers.parseEther(dotAmount),
      CONFIG.EXCHANGE_RATE * 1e18, // Pass as number, ethers will convert
      CONFIG.ETH_TIMELOCK, // Pass as number, ethers will convert
      addressToBytes32(CONFIG.RESOLVER_ADDRESS),
      { value: ethers.parseEther(ethAmount) },
    );

    console.log(`✅ Transaction sent: ${tx.hash}`);
    console.log(`⏳ Waiting for transaction confirmation...`);

    // Wait for confirmation before responding
    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block: ${receipt.blockNumber}`);

    res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: Number(receipt.blockNumber), // Convert BigInt to number for JSON
      ethAmount,
      message: "ETH swap created and confirmed on Sepolia",
    });
  } catch (error: any) {
    console.error(`❌ Error fulfilling swap:`, error.message);
    res.status(500).json({
      error: "Failed to fulfill swap",
      details: error.message,
    });
  }
});

/**
 * GET /balance
 * Check resolver balances on both chains
 */
app.get("/balance", async (req, res) => {
  try {
    const sepoliaProvider = createProvider(CONFIG.SEPOLIA_RPC);
    const paseoProvider = createProvider(CONFIG.PASEO_RPC, 420420422);

    const sepoliaBalance = await sepoliaProvider.getBalance(CONFIG.RESOLVER_ADDRESS);
    const paseoBalance = await paseoProvider.getBalance(CONFIG.RESOLVER_ADDRESS);

    res.json({
      resolverAddress: CONFIG.RESOLVER_ADDRESS,
      balances: {
        sepolia: {
          wei: sepoliaBalance.toString(),
          eth: ethers.formatEther(sepoliaBalance),
        },
        paseo: {
          wei: paseoBalance.toString(),
          dot: ethers.formatEther(paseoBalance),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Auto-Claim: Watch for user claims and automatically claim resolver funds
 * @deprecated Currently disabled due to RPC compatibility issues
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function setupAutoClaimListeners() {
  try {
    console.log("\n🔔 Setting up auto-claim listeners...");

    const sepoliaProvider = createProvider(CONFIG.SEPOLIA_RPC);
    const paseoProvider = createProvider(CONFIG.PASEO_RPC, 420420422);

    const sepoliaWallet = new ethers.Wallet(CONFIG.RESOLVER_PRIVATE_KEY, sepoliaProvider);
    const paseoWallet = new ethers.Wallet(CONFIG.RESOLVER_PRIVATE_KEY, paseoProvider);

    const sepoliaEscrow = new ethers.Contract(CONFIG.SEPOLIA_ESCROW, ESCROW_ABI, sepoliaWallet);
    const paseoEscrow = new ethers.Contract(CONFIG.PASEO_ESCROW, ESCROW_ABI, paseoWallet);

    // Listen for SwapCompleted events on Polkadot (user claimed DOT)
    // → Resolver should claim ETH on Ethereum
    paseoEscrow.on("SwapCompleted", async (swapId: string, secret: string) => {
      console.log(`\n🔔 User claimed DOT on Polkadot! Swap ID: ${swapId}`);
      console.log(`Secret revealed: ${secret}`);
      console.log(`→ Claiming ETH on Ethereum...`);

      try {
        const tx = await sepoliaEscrow.completeSwap(swapId, secret);
        console.log(`✅ Resolver claimed ETH! TX: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Confirmed in block`);
      } catch (error: any) {
        console.error(`❌ Failed to claim ETH:`, error.message);
      }
    });

    // Listen for SwapCompleted events on Ethereum (user claimed ETH)
    // → Resolver should claim DOT on Polkadot
    sepoliaEscrow.on("SwapCompleted", async (swapId: string, secret: string) => {
      console.log(`\n🔔 User claimed ETH on Ethereum! Swap ID: ${swapId}`);
      console.log(`Secret revealed: ${secret}`);
      console.log(`→ Claiming DOT on Polkadot...`);

      try {
        // For Polkadot, we need to pass the resolver's address as the target
        const tx = await paseoEscrow["completeSwap(bytes32,bytes32,address)"](swapId, secret, CONFIG.RESOLVER_ADDRESS);
        console.log(`✅ Resolver claimed DOT! TX: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Confirmed in block`);
      } catch (error: any) {
        console.error(`❌ Failed to claim DOT:`, error.message);
      }
    });

    console.log("✅ Auto-claim listeners active on both chains!");
  } catch (error: any) {
    console.error("❌ Failed to setup auto-claim listeners:", error.message);
    console.error("⚠️  Resolver will NOT automatically claim funds!");
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              🚀 DotFusion Resolver API 🚀                     ║
╚═══════════════════════════════════════════════════════════════╝

✅ Server running on: http://localhost:${PORT}

📋 Configuration:
   Resolver Address: ${CONFIG.RESOLVER_ADDRESS}
   Exchange Rate: 1 ETH = ${CONFIG.EXCHANGE_RATE.toLocaleString()} DOT

🌐 Endpoints:
   GET  /status              - Check if resolver is online
   GET  /balance             - Check resolver balances
   POST /fulfill-eth-to-dot  - Fulfill ETH→DOT swap
   POST /fulfill-dot-to-eth  - Fulfill DOT→ETH swap

🔑 Using private key from .env
📡 Ready to receive swap requests!
  `);

  if (!CONFIG.RESOLVER_ADDRESS || !CONFIG.RESOLVER_PRIVATE_KEY) {
    console.error(`
⚠️  WARNING: RESOLVER_ADDRESS and RESOLVER_PRIVATE_KEY not set in .env!
The API is running but won't be able to fulfill swaps.
    `);
  } else {
    // Setup auto-claim listeners (temporarily disabled due to RPC compatibility issues)
    // await setupAutoClaimListeners();
    console.log("⚠️  Auto-claim listeners disabled - RPC endpoints may not support event filtering");
  }
});

export default app;
