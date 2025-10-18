import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys DotFusionXCMBridge contract on Polkadot Paseo testnet
 *
 * This contract coordinates cross-chain messaging using XCM Precompile
 * and should be deployed after the PolkadotEscrow contract.
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployXCMBridgePaseo: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("🚀 Deploying DotFusionXCMBridge to Polkadot Paseo testnet...");
  console.log("📋 Configuration:");
  console.log(`   - Deployer: ${deployer}`);

  const deployResult = await deploy("DotFusionXCMBridge", {
    from: deployer,
    args: [], // No constructor arguments
    log: true,
    autoMine: true,
  });

  if (deployResult.newlyDeployed) {
    console.log("✅ DotFusionXCMBridge deployed successfully!");
    console.log(`📍 Contract Address: ${deployResult.address}`);
    console.log(`🔗 Transaction Hash: ${deployResult.transactionHash}`);

    // Get the deployed contract to verify deployment
    const xcmBridge = await hre.ethers.getContract<Contract>("DotFusionXCMBridge", deployer);

    // Verify contract state
    const owner = await xcmBridge.owner();
    const xcmPrecompile = await xcmBridge.XCM_PRECOMPILE();

    console.log("🔍 Contract Verification:");
    console.log(`   - Owner: ${owner}`);
    console.log(`   - XCM Precompile: ${xcmPrecompile}`);

    // Try to get the escrow address (will be zero if not set yet)
    try {
      const escrowAddress = await xcmBridge.escrow();
      console.log(`   - Escrow Address: ${escrowAddress}`);
    } catch {
      console.log(`   - Escrow Address: Not set yet`);
    }

    console.log("\n📝 Next Steps:");
    console.log("   1. Set the escrow contract address:");
    console.log(`      await xcmBridge.setEscrow("<POLKADOT_ESCROW_ADDRESS>")`);
    console.log("   2. Verify contract on Polkadot explorer");
    console.log("   3. Test XCM messaging functionality");
    console.log("   4. Configure cross-chain communication with Ethereum Sepolia");
  }
};

export default deployXCMBridgePaseo;

// Tags for selective deployment
deployXCMBridgePaseo.tags = ["XCMBridge", "Paseo", "Polkadot"];

// Dependencies: Deploy after PolkadotEscrow
deployXCMBridgePaseo.dependencies = ["PolkadotEscrow"];
