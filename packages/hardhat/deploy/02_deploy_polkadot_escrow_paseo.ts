import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys DotFusionPolkadotEscrow contract on Polkadot Paseo testnet
 *
 * Constructor parameters:
 * - _rescueDelay: Time delay before funds can be rescued (in seconds)
 * - _accessToken: ERC20 token required for access (address(0) for no requirement)
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployPolkadotEscrowPaseo: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Configuration for Polkadot Paseo testnet
  const RESCUE_DELAY = 7 * 24 * 60 * 60; // 7 days in seconds
  const ACCESS_TOKEN = "0x0000000000000000000000000000000000000000"; // No access token required

  console.log("🚀 Deploying DotFusionPolkadotEscrow to Polkadot Paseo testnet...");
  console.log("📋 Configuration:");
  console.log(`   - Deployer: ${deployer}`);
  console.log(`   - Rescue Delay: ${RESCUE_DELAY} seconds (7 days)`);
  console.log(`   - Access Token: ${ACCESS_TOKEN} (none required)`);

  const deployResult = await deploy("DotFusionPolkadotEscrow", {
    from: deployer,
    args: [RESCUE_DELAY, ACCESS_TOKEN],
    log: true,
    autoMine: true,
  });

  if (deployResult.newlyDeployed) {
    console.log("✅ DotFusionPolkadotEscrow deployed successfully!");
    console.log(`📍 Contract Address: ${deployResult.address}`);
    console.log(`🔗 Transaction Hash: ${deployResult.transactionHash}`);

    // Get the deployed contract to verify deployment
    const polkadotEscrow = await hre.ethers.getContract<Contract>("DotFusionPolkadotEscrow", deployer);

    // Verify contract state
    const owner = await polkadotEscrow.owner();
    const rescueDelay = await polkadotEscrow.rescueDelay();
    const accessToken = await polkadotEscrow.accessToken();

    console.log("🔍 Contract Verification:");
    console.log(`   - Owner: ${owner}`);
    console.log(`   - Rescue Delay: ${rescueDelay.toString()} seconds`);
    console.log(`   - Access Token: ${accessToken}`);

    console.log("\n📝 Next Steps:");
    console.log("   1. Verify contract on Polkadot explorer");
    console.log("   2. Update frontend configuration with contract address");
    console.log("   3. Test contract functionality on Paseo testnet");
    console.log("   4. Deploy XCMBridge contract to connect with this escrow");
  }
};

export default deployPolkadotEscrowPaseo;

// Tags for selective deployment
deployPolkadotEscrowPaseo.tags = ["PolkadotEscrow", "Paseo", "Polkadot"];
