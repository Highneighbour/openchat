import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "typechain";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    "lasna-testnet": {
      url: process.env.LASNA_TESTNET_RPC || "https://rpc.lasna.reactive.network",
      chainId: 1596,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
    "reactive-mainnet": {
      url: process.env.REACTIVE_MAINNET_RPC || "https://rpc.reactive.network",
      chainId: 1597,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      "lasna-testnet": process.env.ETHERSCAN_API_KEY || "",
      "reactive-mainnet": process.env.ETHERSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "lasna-testnet",
        chainId: 1596,
        urls: {
          apiURL: "https://explorer.lasna.reactive.network/api",
          browserURL: "https://explorer.lasna.reactive.network",
        },
      },
      {
        network: "reactive-mainnet",
        chainId: 1597,
        urls: {
          apiURL: "https://explorer.reactive.network/api",
          browserURL: "https://explorer.reactive.network",
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  paths: {
    sources: "./contracts",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;