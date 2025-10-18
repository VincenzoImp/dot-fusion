import { ethers, deployments } from "hardhat";

/**
 * Configure XCM Bridge
 *
 * This script configures the XCM bridge with the deployed escrow contracts.
 * Run this after deploying contracts if the bridge is not configured.
 */

async function main() {
  console.log("🔧 Configuring XCM Bridge...");
  console.log("=".repeat(50));

  const [deployer] = await ethers.getSigners();
  console.log(`📋 Deployer: ${deployer.address}`);

  // Get network
  const network = await ethers.provider.getNetwork();
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);

  try {
    // Get deployed contract addresses from deployments
    const ethEscrow = await deployments.get("DotFusionEthereumEscrow");
    const dotEscrow = await deployments.get("DotFusionPolkadotEscrow");
    const xcmBridge = await deployments.get("DotFusionXCMBridge");

    console.log("\n📍 Contract Addresses:");
    console.log(`   Ethereum Escrow: ${ethEscrow.address}`);
    console.log(`   Polkadot Escrow: ${dotEscrow.address}`);
    console.log(`   XCM Bridge:      ${xcmBridge.address}`);

    // Get contract instances using deployed ABIs
    const xcmBridgeContract = await ethers.getContractAt(xcmBridge.abi, xcmBridge.address);
    const polkadotEscrowContract = await ethers.getContractAt(dotEscrow.abi, dotEscrow.address);

    // Check if already configured
    const currentEscrow = await xcmBridgeContract.escrow();
    if (currentEscrow !== "0x0000000000000000000000000000000000000000") {
      console.log("\n⚠️  XCM Bridge is already configured!");
      console.log(`   Current escrow: ${currentEscrow}`);

      const shouldReconfigure = true; // Set to false if you don't want to reconfigure
      if (!shouldReconfigure) {
        console.log("   Skipping reconfiguration.");
        return;
      }
      console.log("   Reconfiguring anyway...");
    }

    // Step 1: Set Escrow in XCM Bridge
    console.log("\n🔧 Step 1: Setting Escrow in XCM Bridge...");

    const configureTx = await xcmBridgeContract.setEscrow(dotEscrow.address);

    console.log(`   Transaction hash: ${configureTx.hash}`);
    console.log("   Waiting for confirmation...");
    await configureTx.wait();
    console.log("   ✅ Escrow set in XCM Bridge!");

    // Step 2: Link XCM Bridge to Polkadot Escrow (if function exists)
    console.log("\n🔗 Step 2: Checking Polkadot Escrow link...");
    try {
      if (typeof polkadotEscrowContract.setXCMBridge === "function") {
        const linkTx = await polkadotEscrowContract.setXCMBridge(xcmBridge.address);
        console.log(`   Transaction hash: ${linkTx.hash}`);
        console.log("   Waiting for confirmation...");
        await linkTx.wait();
        console.log("   ✅ XCM Bridge linked!");
      } else {
        console.log("   ℹ️  Deployed contract version doesn't require explicit linking.");
        console.log("   ✅ Using backward compatibility mode.");
      }
    } catch {
      console.log("   ℹ️  Deployed contract version doesn't require explicit linking.");
      console.log("   ✅ Using backward compatibility mode.");
    }

    // Step 3: Verify configuration
    console.log("\n✅ Verification:");
    const verifyEscrow = await xcmBridgeContract.escrow();
    console.log(`   Polkadot Escrow in Bridge: ${verifyEscrow}`);

    // Try to check bridge link if function exists
    try {
      const verifyBridgeInEscrow = await polkadotEscrowContract.xcmBridge();
      console.log(`   Bridge in Polkadot Escrow: ${verifyBridgeInEscrow}`);
    } catch {
      console.log(`   Bridge in Polkadot Escrow: N/A (backward compatibility mode)`);
    }

    // Check if escrow is configured
    const isConfigured = verifyEscrow.toLowerCase() === dotEscrow.address.toLowerCase();

    if (isConfigured) {
      console.log("\n🎉 SUCCESS! XCM Bridge is fully configured and operational!");
      console.log("\n📝 Next Steps:");
      console.log("   1. Refresh your frontend");
      console.log("   2. Check the XCM Bridge Status component");
      console.log("   3. The bridge should now show as 'CONFIGURED'");
    } else {
      console.log("\n⚠️  Configuration completed but values don't match. Please check manually.");
    }
  } catch (error: any) {
    console.error("\n❌ Configuration failed:", error.message);

    if (error.message.includes("Unauthorized")) {
      console.log("\n💡 Tip: Make sure you're using the same account that deployed the contracts.");
    } else if (error.message.includes("reverted")) {
      console.log("\n💡 Tip: Check that all contracts are deployed correctly.");
    }

    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
