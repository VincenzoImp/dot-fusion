import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Master deployment script for DotFusion cross-chain atomic swap system
 *
 * This script deploys all contracts in the correct order:
 * 1. Ethereum Escrow (Sepolia)
 * 2. Polkadot Escrow (Paseo)
 * 3. XCM Bridge (Paseo)
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployAll: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log("🚀 Starting DotFusion Cross-Chain Atomic Swap Deployment...");
  console.log("=".repeat(60));

  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log(`📋 Deployer: ${deployer}`);
  console.log("🎯 Target Networks:");
  console.log("   - Ethereum Sepolia (ETH-DOT swaps)");
  console.log("   - Polkadot Paseo (DOT-ETH swaps)");
  console.log("=".repeat(60));

  // Configuration
  const RESCUE_DELAY = 7 * 24 * 60 * 60; // 7 days
  const ACCESS_TOKEN = "0x0000000000000000000000000000000000000000"; // No access token

  try {
    // Step 1: Deploy Ethereum Escrow on Sepolia
    console.log("\n🔵 Step 1: Deploying Ethereum Escrow on Sepolia...");
    const ethEscrowResult = await deploy("DotFusionEthereumEscrow", {
      from: deployer,
      args: [RESCUE_DELAY, ACCESS_TOKEN],
      log: true,
      autoMine: true,
    });

    if (ethEscrowResult.newlyDeployed) {
      console.log(`✅ Ethereum Escrow deployed: ${ethEscrowResult.address}`);
    }

    // Step 2: Deploy Polkadot Escrow on Paseo
    console.log("\n🟣 Step 2: Deploying Polkadot Escrow on Paseo...");
    const dotEscrowResult = await deploy("DotFusionPolkadotEscrow", {
      from: deployer,
      args: [RESCUE_DELAY, ACCESS_TOKEN],
      log: true,
      autoMine: true,
    });

    if (dotEscrowResult.newlyDeployed) {
      console.log(`✅ Polkadot Escrow deployed: ${dotEscrowResult.address}`);
    }

    // Step 3: Deploy XCM Bridge on Paseo
    console.log("\n🌉 Step 3: Deploying XCM Bridge on Paseo...");
    const xcmBridgeResult = await deploy("DotFusionXCMBridge", {
      from: deployer,
      args: [],
      log: true,
      autoMine: true,
    });

    if (xcmBridgeResult.newlyDeployed) {
      console.log(`✅ XCM Bridge deployed: ${xcmBridgeResult.address}`);
    }

    // Step 4: Configure XCM Bridge
    console.log("\n🔧 Step 4: Configuring XCM Bridge...");
    const xcmBridge = await hre.ethers.getContractAt("DotFusionXCMBridge", xcmBridgeResult.address);

    // Configure bridge with escrow addresses
    const configureTx = await xcmBridge.configureBridge(
      dotEscrowResult.address, // Polkadot escrow
      ethEscrowResult.address, // Ethereum escrow (for reference)
      1000, // Ethereum parachain ID (example)
    );
    await configureTx.wait();
    console.log(`✅ XCM Bridge configured. TX: ${configureTx.hash}`);

    // Step 5: Set XCM Bridge in Polkadot Escrow
    console.log("\n🔗 Step 5: Linking XCM Bridge to Polkadot Escrow...");
    const polkadotEscrow = await hre.ethers.getContractAt("DotFusionPolkadotEscrow", dotEscrowResult.address);

    const linkTx = await polkadotEscrow.setXCMBridge(xcmBridgeResult.address);
    await linkTx.wait();
    console.log(`✅ XCM Bridge linked to Polkadot Escrow. TX: ${linkTx.hash}`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("📋 Contract Addresses:");
    console.log(`   Ethereum Escrow (Sepolia): ${ethEscrowResult.address}`);
    console.log(`   Polkadot Escrow (Paseo):   ${dotEscrowResult.address}`);
    console.log(`   XCM Bridge (Paseo):        ${xcmBridgeResult.address}`);

    console.log("\n📝 Next Steps:");
    console.log("   1. Verify contracts on block explorers");
    console.log("   2. Update frontend configuration");
    console.log("   3. Configure XCM channels between parachains");
    console.log("   4. Test cross-chain swap functionality");
    console.log("   5. Deploy to mainnet when ready");

    console.log("\n🔗 Verification Commands:");
    console.log(`   yarn verify --network sepolia ${ethEscrowResult.address} ${RESCUE_DELAY} ${ACCESS_TOKEN}`);
    console.log(`   # Polkadot contracts can be verified on Polkadot explorer`);
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
};

export default deployAll;

// Tags for selective deployment
deployAll.tags = ["All", "EthereumEscrow", "PolkadotEscrow", "XCMBridge"];

// Run this deployment
deployAll.runAtTheEnd = true;
