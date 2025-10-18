import { ethers, deployments } from "hardhat";

async function main() {
  console.log("🔍 Checking XCM Bridge Status...");
  console.log("=".repeat(50));

  const network = await ethers.provider.getNetwork();
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);

  try {
    const xcmBridge = await deployments.get("DotFusionXCMBridge");
    console.log(`📍 XCM Bridge: ${xcmBridge.address}`);

    const xcmBridgeContract = await ethers.getContractAt("DotFusionXCMBridge", xcmBridge.address);

    // Check all important values
    console.log("\n📊 Current Configuration:");

    const owner = await xcmBridgeContract.owner();
    console.log(`   Owner:           ${owner}`);

    const escrowAddress = await xcmBridgeContract.escrow();
    console.log(`   Escrow:          ${escrowAddress}`);

    // Check if bridge is configured
    const isConfigured = escrowAddress !== "0x0000000000000000000000000000000000000000";
    console.log(`\n🔧 Bridge Status: ${isConfigured ? "✅ CONFIGURED" : "❌ NOT CONFIGURED"}`);

    // Check Polkadot Escrow link
    try {
      const dotEscrow = await deployments.get("DotFusionPolkadotEscrow");
      const polkadotEscrowContract = await ethers.getContractAt("DotFusionPolkadotEscrow", dotEscrow.address);
      const bridgeInEscrow = await polkadotEscrowContract.xcmBridge();
      console.log(`\n🔗 Polkadot Escrow Bridge Link: ${bridgeInEscrow}`);
      console.log(`   Expected:                     ${xcmBridge.address}`);
      console.log(
        `   Linked: ${bridgeInEscrow.toLowerCase() === xcmBridge.address.toLowerCase() ? "✅ YES" : "❌ NO"}`,
      );
    } catch {
      console.log("\n⚠️  Could not check Polkadot Escrow link");
    }
  } catch (error: any) {
    console.error("\n❌ Check failed:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
