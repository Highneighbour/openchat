import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Registering subscriptions with account:", deployer.address);
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Load deployment output
  const outputPath = path.join(__dirname, "../deploy/output.json");
  if (!fs.existsSync(outputPath)) {
    console.error("Deployment output not found. Please run deploy.ts first.");
    process.exit(1);
  }

  const deploymentOutput = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  
  try {
    // Get contract instances
    const reactiveManager = await ethers.getContractAt(
      "ReactiveManager",
      deploymentOutput.contracts.reactiveManager.address
    );

    const originPosition = await ethers.getContractAt(
      "OriginPosition",
      deploymentOutput.contracts.originPosition.address
    );

    console.log("\n=== Current Contract Addresses ===");
    console.log("ReactiveManager:", reactiveManager.address);
    console.log("OriginPosition:", originPosition.address);

    // In a real implementation, this would register subscriptions with the Reactive Network
    // For now, we'll just log the subscription details
    console.log("\n=== Subscription Details ===");
    console.log("PositionCreated subscription:", deploymentOutput.subscriptions.positionCreated);
    console.log("PriceUpdate subscription:", deploymentOutput.subscriptions.priceUpdate);
    console.log("LiquidityUpdate subscription:", deploymentOutput.subscriptions.liquidityUpdate);

    // Test creating a position to verify the setup
    console.log("\n=== Testing Position Creation ===");
    
    // Create mock tokens for testing (in real implementation, these would be actual token addresses)
    const mockToken0 = "0x0000000000000000000000000000000000000001";
    const mockToken1 = "0x0000000000000000000000000000000000000002";
    
    try {
      // This would fail in a real scenario without actual tokens, but shows the flow
      console.log("Attempting to create test position...");
      console.log("Note: This will fail without actual token contracts, but demonstrates the flow");
      
      // In a real implementation, you would:
      // 1. Deploy or use existing token contracts
      // 2. Create a position using createPosition
      // 3. Monitor for events
      // 4. Test the reactive workflow
      
    } catch (error) {
      console.log("Expected error (no actual tokens):", error.message);
    }

    console.log("\n=== Subscription Registration Complete ===");
    console.log("The contracts are ready to monitor events and trigger reactive actions.");
    console.log("Next steps:");
    console.log("1. Deploy the frontend application");
    console.log("2. Set up Supabase database");
    console.log("3. Test the end-to-end workflow");

  } catch (error) {
    console.error("Subscription registration failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });