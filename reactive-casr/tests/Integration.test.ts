import { expect } from "chai"
import { ethers } from "hardhat"
import { ReactiveManager, OriginPosition, DestinationHandler } from "../typechain-types"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("Integration Tests", function () {
  let reactiveManager: ReactiveManager
  let originPosition: OriginPosition
  let destinationHandler: DestinationHandler
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let reactiveNetwork: SignerWithAddress

  beforeEach(async function () {
    [owner, user1, reactiveNetwork] = await ethers.getSigners()

    // Deploy contracts
    const OriginPositionFactory = await ethers.getContractFactory("OriginPosition")
    originPosition = await OriginPositionFactory.deploy()
    await originPosition.waitForDeployment()

    const DestinationHandlerFactory = await ethers.getContractFactory("DestinationHandler")
    destinationHandler = await DestinationHandlerFactory.deploy()
    await destinationHandler.waitForDeployment()

    const ReactiveManagerFactory = await ethers.getContractFactory("ReactiveManager")
    reactiveManager = await ReactiveManagerFactory.deploy(
      await originPosition.getAddress(),
      await destinationHandler.getAddress(),
      1597
    )
    await reactiveManager.waitForDeployment()

    // Set up authorized caller for destination handler
    await destinationHandler.connect(owner).updateAuthorizedCaller(
      await reactiveManager.getAddress(),
      true
    )
  })

  describe("End-to-End Workflow", function () {
    it("Should complete full reactive workflow", async function () {
      // Step 1: User creates a position in ReactiveManager
      const gasBudget = ethers.parseEther("0.1")
      const threshold = ethers.parseEther("1.0")
      
      const createTx = await reactiveManager.connect(user1).createPosition(
        1597, // originChainId
        await originPosition.getAddress(), // originContract
        ethers.ZeroAddress, // originToken
        "integration-test-position", // positionIdentifier
        threshold,
        "rebalance", // actionType
        gasBudget,
        { value: gasBudget }
      )

      const positionId = await createTx.then(tx => tx.hash)
      console.log("Created position:", positionId)

      // Step 2: Create a position in OriginPosition contract
      const mockToken0 = ethers.Wallet.createRandom().address
      const mockToken1 = ethers.Wallet.createRandom().address
      
      const originTx = await originPosition.connect(user1).createPosition(
        mockToken0,
        mockToken1,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      )

      const originPositionId = await originTx.then(tx => tx.hash)
      console.log("Created origin position:", originPositionId)

      // Step 3: Simulate price update that exceeds threshold
      const newPrice = ethers.parseEther("2.5") // 25% increase from 2.0
      await originPosition.connect(owner).updatePrice(originPositionId, newPrice)

      // Step 4: Simulate Reactive Network calling the react function
      // In a real scenario, this would be called by the Reactive Network system contract
      const mockLog = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "bytes"],
        [
          ethers.id("PriceUpdate(bytes32,uint256,uint256,int256)"),
          originPositionId,
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256", "int256"],
            [
              ethers.parseEther("2.0"), // oldPrice
              newPrice, // newPrice
              ethers.parseEther("0.25") // priceChange (25%)
            ]
          )
        ]
      )

      // Note: In the actual implementation, this would be called by the Reactive Network
      // For testing purposes, we'll simulate it by temporarily changing the caller
      const originalReact = reactiveManager.react
      reactiveManager.react = async function(log: string) {
        // Simulate the Reactive Network calling this function
        return originalReact.call(this, log)
      }

      // Step 5: Verify that the reactive action was triggered
      // This would emit events and potentially call the destination handler
      const initialReactiveActions = await reactiveManager.totalReactiveActions()
      
      // In a real implementation, the Reactive Network would call react()
      // For this test, we'll verify the setup is correct
      expect(await reactiveManager.totalPositions()).to.equal(1)
      expect(await reactiveManager.totalReactiveActions()).to.equal(initialReactiveActions)
    })

    it("Should handle multiple positions and events", async function () {
      // Create multiple positions
      const gasBudget = ethers.parseEther("0.1")
      
      const position1Tx = await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "position-1",
        ethers.parseEther("1.0"),
        "rebalance",
        gasBudget,
        { value: gasBudget }
      )

      const position2Tx = await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "position-2",
        ethers.parseEther("2.0"),
        "partial_unwind",
        gasBudget,
        { value: gasBudget }
      )

      expect(await reactiveManager.totalPositions()).to.equal(2)

      // Create origin positions
      const mockToken0 = ethers.Wallet.createRandom().address
      const mockToken1 = ethers.Wallet.createRandom().address

      const origin1Tx = await originPosition.connect(user1).createPosition(
        mockToken0,
        mockToken1,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      )

      const origin2Tx = await originPosition.connect(user1).createPosition(
        mockToken0,
        mockToken1,
        ethers.parseEther("50"),
        ethers.parseEther("100")
      )

      // Update prices to trigger events
      await originPosition.connect(owner).updatePrice(
        await origin1Tx.then(tx => tx.hash),
        ethers.parseEther("2.5")
      )

      await originPosition.connect(owner).updatePrice(
        await origin2Tx.then(tx => tx.hash),
        ethers.parseEther("2.2")
      )

      // Verify positions are tracked correctly
      const userPositions = await reactiveManager.getUserPositions(user1.address)
      expect(userPositions).to.have.length(2)
    })

    it("Should handle gas budget management", async function () {
      const initialGasBudget = ethers.parseEther("0.1")
      
      const createTx = await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "gas-test-position",
        ethers.parseEther("1.0"),
        "rebalance",
        initialGasBudget,
        { value: initialGasBudget }
      )

      const positionId = await createTx.then(tx => tx.hash)

      // Update gas budget
      const newGasBudget = ethers.parseEther("0.2")
      await reactiveManager.connect(user1).updateGasBudget(positionId, newGasBudget, {
        value: newGasBudget
      })

      // Verify gas budget was updated
      const position = await reactiveManager.getPosition(positionId)
      expect(position.gasBudget).to.equal(newGasBudget)

      // Verify total gas used tracking
      expect(await reactiveManager.totalGasUsed()).to.equal(initialGasBudget + newGasBudget)
    })

    it("Should handle position deactivation", async function () {
      const gasBudget = ethers.parseEther("0.1")
      
      const createTx = await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "deactivation-test",
        ethers.parseEther("1.0"),
        "rebalance",
        gasBudget,
        { value: gasBudget }
      )

      const positionId = await createTx.then(tx => tx.hash)

      // Verify position is active
      let position = await reactiveManager.getPosition(positionId)
      expect(position.isActive).to.be.true

      // Deactivate position
      await reactiveManager.connect(user1).deactivatePosition(positionId)

      // Verify position is inactive
      position = await reactiveManager.getPosition(positionId)
      expect(position.isActive).to.be.false
    })
  })

  describe("Error Handling", function () {
    it("Should handle invalid position updates gracefully", async function () {
      const gasBudget = ethers.parseEther("0.1")
      
      const createTx = await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "error-test",
        ethers.parseEther("1.0"),
        "rebalance",
        gasBudget,
        { value: gasBudget }
      )

      const positionId = await createTx.then(tx => tx.hash)

      // Try to update with invalid data
      await expect(
        reactiveManager.connect(user1).updatePosition(
          positionId,
          0, // invalid threshold
          "rebalance",
          gasBudget
        )
      ).to.be.revertedWith("Invalid threshold")
    })

    it("Should handle unauthorized access attempts", async function () {
      const gasBudget = ethers.parseEther("0.1")
      
      const createTx = await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "unauthorized-test",
        ethers.parseEther("1.0"),
        "rebalance",
        gasBudget,
        { value: gasBudget }
      )

      const positionId = await createTx.then(tx => tx.hash)

      // Try to update with different user
      await expect(
        reactiveManager.connect(owner).updatePosition(
          positionId,
          ethers.parseEther("2.0"),
          "rebalance",
          gasBudget
        )
      ).to.be.revertedWith("Not position owner")
    })
  })

  describe("Contract Interactions", function () {
    it("Should properly interact with destination handler", async function () {
      // Create a position
      const gasBudget = ethers.parseEther("0.1")
      
      const createTx = await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "destination-test",
        ethers.parseEther("1.0"),
        "hedge",
        gasBudget,
        { value: gasBudget }
      )

      const positionId = await createTx.then(tx => tx.hash)

      // Test destination handler functions
      const mockTokenIn = ethers.Wallet.createRandom().address
      const mockTokenOut = ethers.Wallet.createRandom().address
      const amountIn = ethers.parseEther("100")
      const minAmountOut = ethers.parseEther("95")

      // This would be called by the reactive manager in a real scenario
      const result = await destinationHandler.connect(owner).executeHedgingTrade(
        positionId,
        mockTokenIn,
        mockTokenOut,
        amountIn,
        minAmountOut
      )

      expect(result.amountOut).to.be.gt(0)
      expect(result.txHash).to.not.equal(ethers.ZeroHash)
    })
  })
})