import { expect } from "chai"
import { ethers } from "hardhat"
import { ReactiveManager, OriginPosition, DestinationHandler } from "../typechain-types"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("ReactiveManager", function () {
  let reactiveManager: ReactiveManager
  let originPosition: OriginPosition
  let destinationHandler: DestinationHandler
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners()

    // Deploy OriginPosition contract
    const OriginPositionFactory = await ethers.getContractFactory("OriginPosition")
    originPosition = await OriginPositionFactory.deploy()
    await originPosition.waitForDeployment()

    // Deploy DestinationHandler contract
    const DestinationHandlerFactory = await ethers.getContractFactory("DestinationHandler")
    destinationHandler = await DestinationHandlerFactory.deploy()
    await destinationHandler.waitForDeployment()

    // Deploy ReactiveManager contract
    const ReactiveManagerFactory = await ethers.getContractFactory("ReactiveManager")
    reactiveManager = await ReactiveManagerFactory.deploy(
      await originPosition.getAddress(),
      await destinationHandler.getAddress(),
      1597 // Reactive Mainnet chain ID
    )
    await reactiveManager.waitForDeployment()
  })

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await reactiveManager.owner()).to.equal(owner.address)
    })

    it("Should set the correct contract addresses", async function () {
      expect(await reactiveManager.originPositionContract()).to.equal(await originPosition.getAddress())
      expect(await reactiveManager.destinationHandlerContract()).to.equal(await destinationHandler.getAddress())
      expect(await reactiveManager.destinationChainId()).to.equal(1597)
    })

    it("Should initialize with zero positions", async function () {
      expect(await reactiveManager.totalPositions()).to.equal(0)
      expect(await reactiveManager.totalReactiveActions()).to.equal(0)
      expect(await reactiveManager.totalGasUsed()).to.equal(0)
    })
  })

  describe("Position Management", function () {
    it("Should create a position successfully", async function () {
      const originChainId = 1597
      const originContract = await originPosition.getAddress()
      const originToken = ethers.ZeroAddress
      const positionIdentifier = "test-position-001"
      const threshold = ethers.parseEther("1.0")
      const actionType = "rebalance"
      const gasBudget = ethers.parseEther("0.1")

      const tx = await reactiveManager.connect(user1).createPosition(
        originChainId,
        originContract,
        originToken,
        positionIdentifier,
        threshold,
        actionType,
        gasBudget,
        { value: gasBudget }
      )

      await expect(tx)
        .to.emit(reactiveManager, "PositionCreated")
        .withArgs(
          await tx.then(t => t.hash), // positionId
          user1.address,
          originChainId,
          originContract,
          threshold,
          actionType
        )

      expect(await reactiveManager.totalPositions()).to.equal(1)
    })

    it("Should fail to create position with zero gas budget", async function () {
      await expect(
        reactiveManager.connect(user1).createPosition(
          1597,
          await originPosition.getAddress(),
          ethers.ZeroAddress,
          "test-position",
          ethers.parseEther("1.0"),
          "rebalance",
          0,
          { value: 0 }
        )
      ).to.be.revertedWith("Invalid gas budget")
    })

    it("Should fail to create position with insufficient payment", async function () {
      await expect(
        reactiveManager.connect(user1).createPosition(
          1597,
          await originPosition.getAddress(),
          ethers.ZeroAddress,
          "test-position",
          ethers.parseEther("1.0"),
          "rebalance",
          ethers.parseEther("0.1"),
          { value: ethers.parseEther("0.05") } // Less than gas budget
        )
      ).to.be.revertedWith("Insufficient gas payment")
    })

    it("Should update position successfully", async function () {
      // First create a position
      const gasBudget = ethers.parseEther("0.1")
      const tx = await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "test-position",
        ethers.parseEther("1.0"),
        "rebalance",
        gasBudget,
        { value: gasBudget }
      )

      const positionId = await tx.then(t => t.hash)

      // Update the position
      const newThreshold = ethers.parseEther("2.0")
      const newActionType = "partial_unwind"
      const newGasBudget = ethers.parseEther("0.2")

      await expect(
        reactiveManager.connect(user1).updatePosition(
          positionId,
          newThreshold,
          newActionType,
          newGasBudget
        )
      ).to.emit(reactiveManager, "PositionUpdated")
        .withArgs(positionId, newThreshold, newActionType)
    })

    it("Should fail to update position if not owner", async function () {
      // Create position with user1
      const gasBudget = ethers.parseEther("0.1")
      const tx = await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "test-position",
        ethers.parseEther("1.0"),
        "rebalance",
        gasBudget,
        { value: gasBudget }
      )

      const positionId = await tx.then(t => t.hash)

      // Try to update with user2 (should fail)
      await expect(
        reactiveManager.connect(user2).updatePosition(
          positionId,
          ethers.parseEther("2.0"),
          "partial_unwind",
          ethers.parseEther("0.2")
        )
      ).to.be.revertedWith("Not position owner")
    })

    it("Should deactivate position successfully", async function () {
      // Create position
      const gasBudget = ethers.parseEther("0.1")
      const tx = await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "test-position",
        ethers.parseEther("1.0"),
        "rebalance",
        gasBudget,
        { value: gasBudget }
      )

      const positionId = await tx.then(t => t.hash)

      // Deactivate position
      await expect(
        reactiveManager.connect(user1).deactivatePosition(positionId)
      ).to.emit(reactiveManager, "PositionDeactivated")
        .withArgs(positionId, user1.address)
    })
  })

  describe("Gas Management", function () {
    it("Should update gas budget successfully", async function () {
      // Create position
      const gasBudget = ethers.parseEther("0.1")
      const tx = await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "test-position",
        ethers.parseEther("1.0"),
        "rebalance",
        gasBudget,
        { value: gasBudget }
      )

      const positionId = await tx.then(t => t.hash)

      // Update gas budget
      const newGasBudget = ethers.parseEther("0.2")
      await expect(
        reactiveManager.connect(user1).updateGasBudget(positionId, newGasBudget, {
          value: newGasBudget
        })
      ).to.emit(reactiveManager, "GasBudgetUpdated")
        .withArgs(positionId, newGasBudget)
    })

    it("Should fail to update gas budget with insufficient payment", async function () {
      // Create position
      const gasBudget = ethers.parseEther("0.1")
      const tx = await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "test-position",
        ethers.parseEther("1.0"),
        "rebalance",
        gasBudget,
        { value: gasBudget }
      )

      const positionId = await tx.then(t => t.hash)

      // Try to update gas budget with insufficient payment
      await expect(
        reactiveManager.connect(user1).updateGasBudget(positionId, ethers.parseEther("0.2"), {
          value: ethers.parseEther("0.1") // Less than new gas budget
        })
      ).to.be.revertedWith("Insufficient gas payment")
    })
  })

  describe("Access Control", function () {
    it("Should allow owner to pause/unpause", async function () {
      await expect(reactiveManager.connect(owner).pause())
        .to.emit(reactiveManager, "Paused")
        .withArgs(owner.address)

      await expect(reactiveManager.connect(owner).unpause())
        .to.emit(reactiveManager, "Unpaused")
        .withArgs(owner.address)
    })

    it("Should fail to pause if not owner", async function () {
      await expect(
        reactiveManager.connect(user1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("Should allow owner to withdraw gas fees", async function () {
      // Create a position to generate some gas fees
      const gasBudget = ethers.parseEther("0.1")
      await reactiveManager.connect(user1).createPosition(
        1597,
        await originPosition.getAddress(),
        ethers.ZeroAddress,
        "test-position",
        ethers.parseEther("1.0"),
        "rebalance",
        gasBudget,
        { value: gasBudget }
      )

      const balanceBefore = await ethers.provider.getBalance(owner.address)
      const contractBalance = await ethers.provider.getBalance(await reactiveManager.getAddress())

      await reactiveManager.connect(owner).withdrawGasFees()

      const balanceAfter = await ethers.provider.getBalance(owner.address)
      expect(balanceAfter).to.be.gt(balanceBefore)
    })
  })

  describe("React Function", function () {
    it("Should fail to call react if not Reactive Network", async function () {
      const mockLog = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "bytes"],
        [
          ethers.id("PriceUpdate(bytes32,uint256,uint256,int256)"),
          ethers.id("test-position"),
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256", "int256"],
            [ethers.parseEther("1.0"), ethers.parseEther("1.5"), ethers.parseEther("0.5")]
          )
        ]
      )

      await expect(
        reactiveManager.connect(user1).react(mockLog)
      ).to.be.revertedWith("Only Reactive Network can call react")
    })
  })
})