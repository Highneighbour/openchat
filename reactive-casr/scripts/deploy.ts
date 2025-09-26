import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

interface DeploymentOutput {
  network: string;
  chainId: number;
  contracts: {
    originPosition: {
      address: string;
      txHash: string;
    };
    destinationHandler: {
      address: string;
      txHash: string;
    };
    reactiveManager: {
      address: string;
      txHash: string;
    };
  };
  subscriptions: {
    positionCreated: string;
    priceUpdate: string;
    liquidityUpdate: string;
  };
  timestamp: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Ensure deploy directory exists
  const deployDir = path.join(__dirname, "../deploy");
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  const deploymentOutput: DeploymentOutput = {
    network: network.name,
    chainId: Number(network.chainId),
    contracts: {
      originPosition: { address: "", txHash: "" },
      destinationHandler: { address: "", txHash: "" },
      reactiveManager: { address: "", txHash: "" }
    },
    subscriptions: {
      positionCreated: "",
      priceUpdate: "",
      liquidityUpdate: ""
    },
    timestamp: new Date().toISOString()
  };

  try {
    // Deploy OriginPosition contract
    console.log("\n=== Deploying OriginPosition ===");
    const OriginPosition = await ethers.getContractFactory("OriginPosition");
    const originPosition = await OriginPosition.deploy();
    await originPosition.deployed();
    
    deploymentOutput.contracts.originPosition.address = originPosition.address;
    deploymentOutput.contracts.originPosition.txHash = originPosition.deployTransaction.hash;
    
    console.log("OriginPosition deployed to:", originPosition.address);
    console.log("Transaction hash:", originPosition.deployTransaction.hash);

    // Deploy DestinationHandler contract
    console.log("\n=== Deploying DestinationHandler ===");
    const DestinationHandler = await ethers.getContractFactory("DestinationHandler");
    const destinationHandler = await DestinationHandler.deploy();
    await destinationHandler.deployed();
    
    deploymentOutput.contracts.destinationHandler.address = destinationHandler.address;
    deploymentOutput.contracts.destinationHandler.txHash = destinationHandler.deployTransaction.hash;
    
    console.log("DestinationHandler deployed to:", destinationHandler.address);
    console.log("Transaction hash:", destinationHandler.deployTransaction.hash);

    // Deploy ReactiveManager contract
    console.log("\n=== Deploying ReactiveManager ===");
    const ReactiveManager = await ethers.getContractFactory("ReactiveManager");
    const reactiveManager = await ReactiveManager.deploy(
      originPosition.address,
      destinationHandler.address,
      network.chainId // Using same chain for demo, in production would be different
    );
    await reactiveManager.deployed();
    
    deploymentOutput.contracts.reactiveManager.address = reactiveManager.address;
    deploymentOutput.contracts.reactiveManager.txHash = reactiveManager.deployTransaction.hash;
    
    console.log("ReactiveManager deployed to:", reactiveManager.address);
    console.log("Transaction hash:", reactiveManager.deployTransaction.hash);

    // Register subscriptions (these would be actual subscription IDs in production)
    console.log("\n=== Registering Subscriptions ===");
    const positionCreatedSubscription = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "bytes32", "uint256"],
        [originPosition.address, ethers.utils.id("PositionCreated(bytes32,address,address,address,uint256,uint256,uint256)"), Date.now()]
      )
    );
    
    const priceUpdateSubscription = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "bytes32", "uint256"],
        [originPosition.address, ethers.utils.id("PriceUpdate(bytes32,uint256,uint256,int256)"), Date.now()]
      )
    );
    
    const liquidityUpdateSubscription = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "bytes32", "uint256"],
        [originPosition.address, ethers.utils.id("LiquidityUpdate(bytes32,uint256,uint256,int256)"), Date.now()]
      )
    );

    deploymentOutput.subscriptions.positionCreated = positionCreatedSubscription;
    deploymentOutput.subscriptions.priceUpdate = priceUpdateSubscription;
    deploymentOutput.subscriptions.liquidityUpdate = liquidityUpdateSubscription;

    console.log("PositionCreated subscription:", positionCreatedSubscription);
    console.log("PriceUpdate subscription:", priceUpdateSubscription);
    console.log("LiquidityUpdate subscription:", liquidityUpdateSubscription);

    // Verify contracts (if on a supported network)
    if (network.chainId === 1596 || network.chainId === 1597) {
      console.log("\n=== Verifying Contracts ===");
      try {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        console.log("Verifying OriginPosition...");
        await hre.run("verify:verify", {
          address: originPosition.address,
          constructorArguments: [],
        });
        
        console.log("Verifying DestinationHandler...");
        await hre.run("verify:verify", {
          address: destinationHandler.address,
          constructorArguments: [],
        });
        
        console.log("Verifying ReactiveManager...");
        await hre.run("verify:verify", {
          address: reactiveManager.address,
          constructorArguments: [
            originPosition.address,
            destinationHandler.address,
            network.chainId
          ],
        });
        
        console.log("All contracts verified successfully!");
      } catch (error) {
        console.log("Verification failed:", error);
      }
    }

    // Save deployment output
    const outputPath = path.join(deployDir, "output.json");
    fs.writeFileSync(outputPath, JSON.stringify(deploymentOutput, null, 2));
    console.log("\n=== Deployment Summary ===");
    console.log("Deployment output saved to:", outputPath);
    console.log("Network:", deploymentOutput.network);
    console.log("Chain ID:", deploymentOutput.chainId);
    console.log("OriginPosition:", deploymentOutput.contracts.originPosition.address);
    console.log("DestinationHandler:", deploymentOutput.contracts.destinationHandler.address);
    console.log("ReactiveManager:", deploymentOutput.contracts.reactiveManager.address);

    // Create environment file for frontend
    const envContent = `# Contract Addresses for ${deploymentOutput.network}
NEXT_PUBLIC_ORIGIN_POSITION_CONTRACT=${deploymentOutput.contracts.originPosition.address}
NEXT_PUBLIC_DESTINATION_HANDLER_CONTRACT=${deploymentOutput.contracts.destinationHandler.address}
NEXT_PUBLIC_REACTIVE_MANAGER_CONTRACT=${deploymentOutput.contracts.reactiveManager.address}
NEXT_PUBLIC_CHAIN_ID=${deploymentOutput.chainId}
NEXT_PUBLIC_NETWORK_NAME=${deploymentOutput.network}
`;
    
    const envPath = path.join(deployDir, ".env.local");
    fs.writeFileSync(envPath, envContent);
    console.log("Frontend environment file created:", envPath);

  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });