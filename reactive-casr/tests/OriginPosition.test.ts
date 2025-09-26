import { expect } from "chai"
import { ethers } from "hardhat"
import { OriginPosition } from "../typechain-types"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("OriginPosition", function () {
  let originPosition: OriginPosition
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let mockToken0: string
  let mockToken1: string

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners()

    // Deploy OriginPosition contract
    const OriginPositionFactory = await ethers.getContractFactory("OriginPosition")
    originPosition = await OriginPositionFactory.deploy()
    await originPosition.waitForDeployment()

    // Mock token addresses
    mockToken0 = ethers.Wallet.createRandom().address
    mockToken1 = ethers.Wallet.createRandom().address
  })

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await originPosition.owner()).to.equal(owner.address)
    })

    it("Should initialize with zero positions", async function () {
      expect(await originPosition.totalPositions()).to.equal(0)
    })

    it("Should have correct constants", async function () {
      expect(await originPosition.PRICE_PRECISION()).to.equal(ethers.parseEther("1"))
      expect(await originPosition.MAX_PRICE_CHANGE()).to.equal(ethers.parseEther("0.5")) // 50%
    })
  })

  describe("Position Creation", function () {
    it("Should create a position successfully", async function () {
      const amount0 = ethers.parseEther("100")
      const amount1 = ethers.parseEther("200")

      // Mock the token transfers (in real implementation, these would be actual ERC20 tokens)
      const tx = await originPosition.connect(user1).createPosition(
        mockToken0,
        mockToken1,
        amount0,
        amount1
      )

      await expect(tx)
        .to.emit(originPosition, "PositionCreated")
        .withArgs(
          await tx.then(t => t.hash), // positionId
          user1.address,
          mockToken0,
          mockToken1,
          amount0,
          amount1,
          ethers.parseEther("2") // price = amount1 / amount0 = 200 / 100 = 2
        )

      expect(await originPosition.totalPositions()).to.equal(1)
    })

    it("Should fail to create position with zero token addresses", async function () {
      await expect(
        originPosition.connect(user1).createPosition(
          ethers.ZeroAddress,
          mockToken1,
          ethers.parseEther("100"),
          ethers.parseEther("200")
        )
      ).to.be.revertedWith("Invalid token addresses")
    })

    it("Should fail to create position with same token addresses", async function () {
      await expect(
        originPosition.connect(user1).createPosition(
          mockToken0,
          mockToken0,
          ethers.parseEther("100"),
          ethers.parseEther("200")
        )
      ).to.be.revertedWith("Tokens must be different")
    })

    it("Should fail to create position with zero amounts", async function () {
      await expect(
        originPosition.connect(user1).createPosition(
          mockToken0,
          mockToken1,
          0,
          ethers.parseEther("200")
        )
      ).to.be.revertedWith("Amounts must be positive")
    })

    it("Should calculate correct initial price", async function () {
      const amount0 = ethers.parseEther("100")
      const amount1 = ethers.parseEther("150")
      const expectedPrice = ethers.parseEther("1.5") // 150 / 100

      await originPosition.connect(user1).createPosition(
        mockToken0,
        mockToken1,
        amount0,
        amount1
      )

      const positionId = await originPosition.connect(user1).createPosition(
        mockToken0,
        mockToken1,
        amount0,
        amount1
      ).then(tx => tx.hash)

      const position = await originPosition.getPosition(positionId)
      expect(position.currentPrice).to.equal(expectedPrice)
    })
  })

  describe("Price Updates", function () {
    let positionId: string

    beforeEach(async function () {
      const tx = await originPosition.connect(user1).createPosition(
        mockToken0,
        mockToken1,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      )
      positionId = await tx.then(t => tx.hash)
    })

    it("Should update price successfully", async function () {
      const newPrice = ethers.parseEther("2.5")
      const oldPrice = ethers.parseEther("2.0")

      await expect(
        originPosition.connect(owner).updatePrice(positionId, newPrice)
      ).to.emit(originPosition, "PriceUpdate")
        .withArgs(positionId, oldPrice, newPrice, ethers.parseEther("0.25")) // 25% increase
    })

    it("Should fail to update price if not owner", async function () {
      await expect(
        originPosition.connect(user1).updatePrice(positionId, ethers.parseEther("2.5"))
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("Should fail to update price for inactive position", async function () {
      // Close the position first
      await originPosition.connect(user1).closePosition(positionId)

      await expect(
        originPosition.connect(owner).updatePrice(positionId, ethers.parseEther("2.5"))
      ).to.be.revertedWith("Position not active")
    })

    it("Should fail to update price with zero value", async function () {
      await expect(
        originPosition.connect(owner).updatePrice(positionId, 0)
      ).to.be.revertedWith("Invalid price")
    })

    it("Should fail to update price with extreme change", async function () {
      // Try to update price by more than 50%
      const extremePrice = ethers.parseEther("5.0") // 150% increase from 2.0

      await expect(
        originPosition.connect(owner).updatePrice(positionId, extremePrice)
      ).to.be.revertedWith("Price change too large")
    })
  })

  describe("Liquidity Updates", function () {
    let positionId: string

    beforeEach(async function () {
      const tx = await originPosition.connect(user1).createPosition(
        mockToken0,
        mockToken1,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      )
      positionId = await tx.then(t => tx.hash)
    })

    it("Should update liquidity successfully", async function () {
      const newLiquidity = ethers.parseEther("400")
      const oldLiquidity = ethers.parseEther("300") // 100 + 200

      await expect(
        originPosition.connect(owner).updateLiquidity(positionId, newLiquidity)
      ).to.emit(originPosition, "LiquidityUpdate")
        .withArgs(positionId, oldLiquidity, newLiquidity, ethers.parseEther("100")) // 100 increase
    })

    it("Should fail to update liquidity if not owner", async function () {
      await expect(
        originPosition.connect(user1).updateLiquidity(positionId, ethers.parseEther("400"))
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("Should fail to update liquidity for inactive position", async function () {
      // Close the position first
      await originPosition.connect(user1).closePosition(positionId)

      await expect(
        originPosition.connect(owner).updateLiquidity(positionId, ethers.parseEther("400"))
      ).to.be.revertedWith("Position not active")
    })

    it("Should fail to update liquidity with zero value", async function () {
      await expect(
        originPosition.connect(owner).updateLiquidity(positionId, 0)
      ).to.be.revertedWith("Invalid liquidity")
    })
  })

  describe("Position Management", function () {
    let positionId: string

    beforeEach(async function () {
      const tx = await originPosition.connect(user1).createPosition(
        mockToken0,
        mockToken1,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      )
      positionId = await tx.then(t => tx.hash)
    })

    it("Should close position successfully", async function () {
      await expect(
        originPosition.connect(user1).closePosition(positionId)
      ).to.emit(originPosition, "PositionClosed")
        .withArgs(positionId, user1.address)
    })

    it("Should fail to close position if not owner or position owner", async function () {
      await expect(
        originPosition.connect(user2).closePosition(positionId)
      ).to.be.revertedWith("Not authorized")
    })

    it("Should fail to close inactive position", async function () {
      // Close position first
      await originPosition.connect(user1).closePosition(positionId)

      // Try to close again
      await expect(
        originPosition.connect(user1).closePosition(positionId)
      ).to.be.revertedWith("Position not active")
    })

    it("Should allow owner to emergency withdraw", async function () {
      await expect(
        originPosition.connect(owner).emergencyWithdraw(positionId)
      ).to.emit(originPosition, "EmergencyWithdraw")
        .withArgs(positionId, user1.address)
    })

    it("Should fail emergency withdraw if not owner", async function () {
      await expect(
        originPosition.connect(user1).emergencyWithdraw(positionId)
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })
  })

  describe("Access Control", function () {
    it("Should allow owner to pause/unpause", async function () {
      await expect(originPosition.connect(owner).pause())
        .to.emit(originPosition, "Paused")
        .withArgs(owner.address)

      await expect(originPosition.connect(owner).unpause())
        .to.emit(originPosition, "Unpaused")
        .withArgs(owner.address)
    })

    it("Should fail to pause if not owner", async function () {
      await expect(
        originPosition.connect(user1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("Should prevent position creation when paused", async function () {
      await originPosition.connect(owner).pause()

      await expect(
        originPosition.connect(user1).createPosition(
          mockToken0,
          mockToken1,
          ethers.parseEther("100"),
          ethers.parseEther("200")
        )
      ).to.be.revertedWith("Pausable: paused")
    })
  })

  describe("User Positions", function () {
    it("Should track user positions correctly", async function () {
      // Create multiple positions for user1
      const tx1 = await originPosition.connect(user1).createPosition(
        mockToken0,
        mockToken1,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      )
      const positionId1 = await tx1.then(t => tx.hash)

      const tx2 = await originPosition.connect(user1).createPosition(
        mockToken0,
        mockToken1,
        ethers.parseEther("50"),
        ethers.parseEther("100")
      )
      const positionId2 = await tx2.then(t => tx.hash)

      const userPositions = await originPosition.getUserPositions(user1.address)
      expect(userPositions).to.have.length(2)
      expect(userPositions[0]).to.equal(positionId1)
      expect(userPositions[1]).to.equal(positionId2)
    })
  })
})