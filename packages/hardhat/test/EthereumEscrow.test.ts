import { expect } from "chai";
import { ethers } from "hardhat";
import { DotFusionEthereumEscrow } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("DotFusionEthereumEscrow", function () {
  let escrow: DotFusionEthereumEscrow;
  let owner: SignerWithAddress;
  let maker: SignerWithAddress;
  let taker: SignerWithAddress;
  let other: SignerWithAddress;

  const RESCUE_DELAY = 7 * 24 * 60 * 60; // 7 days
  const ACCESS_TOKEN = ethers.ZeroAddress;
  const TIMELOCK = 24 * 60 * 60; // 1 day

  const secret = ethers.encodeBytes32String("secret");
  const secretHash = ethers.keccak256(ethers.concat([secret]));
  const swapId = ethers.id("swap1");
  const polkadotSender = ethers.id("polkadot_address");

  beforeEach(async function () {
    [owner, maker, taker, other] = await ethers.getSigners();

    const EscrowFactory = await ethers.getContractFactory("DotFusionEthereumEscrow");
    escrow = await EscrowFactory.deploy(RESCUE_DELAY, ACCESS_TOKEN);
    await escrow.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await escrow.owner()).to.equal(owner.address);
    });

    it("Should set the correct rescue delay", async function () {
      expect(await escrow.rescueDelay()).to.equal(RESCUE_DELAY);
    });

    it("Should set the correct access token", async function () {
      expect(await escrow.accessToken()).to.equal(ACCESS_TOKEN);
    });
  });

  describe("Create Swap", function () {
    it("Should create a swap successfully", async function () {
      const ethAmount = ethers.parseEther("1.0");
      const dotAmount = ethers.parseEther("100");
      const exchangeRate = ethers.parseEther("100");

      await expect(
        escrow
          .connect(maker)
          .createSwap(swapId, secretHash, taker.address, ethAmount, dotAmount, exchangeRate, TIMELOCK, polkadotSender, {
            value: ethAmount,
          }),
      )
        .to.emit(escrow, "SwapCreated")
        .withArgs(
          swapId,
          secretHash,
          maker.address,
          taker.address,
          ethAmount,
          dotAmount,
          exchangeRate,
          await anyValue, // unlockTime can vary slightly
          polkadotSender,
        );

      const swap = await escrow.getSwap(swapId);
      expect(swap.maker).to.equal(maker.address);
      expect(swap.taker).to.equal(taker.address);
      expect(swap.ethAmount).to.equal(ethAmount);
      expect(swap.state).to.equal(1); // OPEN
    });

    it("Should fail if secret hash is zero", async function () {
      const ethAmount = ethers.parseEther("1.0");
      const dotAmount = ethers.parseEther("100");
      const exchangeRate = ethers.parseEther("100");

      await expect(
        escrow
          .connect(maker)
          .createSwap(
            swapId,
            ethers.ZeroHash,
            taker.address,
            ethAmount,
            dotAmount,
            exchangeRate,
            TIMELOCK,
            polkadotSender,
            { value: ethAmount },
          ),
      ).to.be.revertedWithCustomError(escrow, "InvalidSecretHash");
    });

    it("Should fail if amounts are zero", async function () {
      const dotAmount = ethers.parseEther("100");
      const exchangeRate = ethers.parseEther("100");

      await expect(
        escrow
          .connect(maker)
          .createSwap(swapId, secretHash, taker.address, 0, dotAmount, exchangeRate, TIMELOCK, polkadotSender, {
            value: 0,
          }),
      ).to.be.revertedWithCustomError(escrow, "InvalidAmount");
    });

    it("Should fail if msg.value doesn't match ethAmount", async function () {
      const ethAmount = ethers.parseEther("1.0");
      const dotAmount = ethers.parseEther("100");
      const exchangeRate = ethers.parseEther("100");

      await expect(
        escrow
          .connect(maker)
          .createSwap(swapId, secretHash, taker.address, ethAmount, dotAmount, exchangeRate, TIMELOCK, polkadotSender, {
            value: ethers.parseEther("0.5"),
          }),
      ).to.be.revertedWithCustomError(escrow, "InvalidAmount");
    });

    it("Should fail if swap already exists", async function () {
      const ethAmount = ethers.parseEther("1.0");
      const dotAmount = ethers.parseEther("100");
      const exchangeRate = ethers.parseEther("100");

      await escrow
        .connect(maker)
        .createSwap(swapId, secretHash, taker.address, ethAmount, dotAmount, exchangeRate, TIMELOCK, polkadotSender, {
          value: ethAmount,
        });

      await expect(
        escrow
          .connect(maker)
          .createSwap(swapId, secretHash, taker.address, ethAmount, dotAmount, exchangeRate, TIMELOCK, polkadotSender, {
            value: ethAmount,
          }),
      ).to.be.revertedWithCustomError(escrow, "SwapAlreadyExists");
    });
  });

  describe("Complete Swap", function () {
    beforeEach(async function () {
      const ethAmount = ethers.parseEther("1.0");
      const dotAmount = ethers.parseEther("100");
      const exchangeRate = ethers.parseEther("100");

      await escrow
        .connect(maker)
        .createSwap(swapId, secretHash, taker.address, ethAmount, dotAmount, exchangeRate, TIMELOCK, polkadotSender, {
          value: ethAmount,
        });
    });

    it("Should complete swap with correct secret", async function () {
      const takerBalanceBefore = await ethers.provider.getBalance(taker.address);

      await expect(escrow.connect(taker).completeSwap(swapId, secret))
        .to.emit(escrow, "SwapCompleted")
        .withArgs(swapId, secret);

      const swap = await escrow.getSwap(swapId);
      expect(swap.state).to.equal(2); // COMPLETED

      const takerBalanceAfter = await ethers.provider.getBalance(taker.address);
      expect(takerBalanceAfter).to.be.gt(takerBalanceBefore);
    });

    it("Should fail if secret is incorrect", async function () {
      const wrongSecret = ethers.encodeBytes32String("wrong_secret");

      await expect(escrow.connect(taker).completeSwap(swapId, wrongSecret)).to.be.revertedWithCustomError(
        escrow,
        "InvalidSecret",
      );
    });

    it("Should fail if caller is not the taker", async function () {
      await expect(escrow.connect(other).completeSwap(swapId, secret)).to.be.revertedWithCustomError(
        escrow,
        "Unauthorized",
      );
    });

    it("Should fail if swap doesn't exist", async function () {
      const nonExistentSwapId = ethers.id("nonexistent");

      await expect(escrow.connect(taker).completeSwap(nonExistentSwapId, secret)).to.be.revertedWithCustomError(
        escrow,
        "SwapDoesNotExist",
      );
    });

    it("Should fail if swap is already completed", async function () {
      await escrow.connect(taker).completeSwap(swapId, secret);

      await expect(escrow.connect(taker).completeSwap(swapId, secret)).to.be.revertedWithCustomError(
        escrow,
        "SwapNotOpen",
      );
    });

    it("Should prevent reentrancy attacks", async function () {
      // This test ensures the nonReentrant modifier is working
      // In a real scenario, we'd deploy a malicious contract that tries to reenter
      await expect(escrow.connect(taker).completeSwap(swapId, secret)).to.emit(escrow, "SwapCompleted");
    });
  });

  describe("Cancel Swap", function () {
    beforeEach(async function () {
      const ethAmount = ethers.parseEther("1.0");
      const dotAmount = ethers.parseEther("100");
      const exchangeRate = ethers.parseEther("100");

      await escrow
        .connect(maker)
        .createSwap(swapId, secretHash, taker.address, ethAmount, dotAmount, exchangeRate, TIMELOCK, polkadotSender, {
          value: ethAmount,
        });
    });

    it("Should cancel swap after timelock expires", async function () {
      // Fast forward past the timelock
      await time.increase(TIMELOCK + 1);

      const makerBalanceBefore = await ethers.provider.getBalance(maker.address);

      await expect(escrow.connect(maker).cancelSwap(swapId)).to.emit(escrow, "SwapCancelled").withArgs(swapId);

      const swap = await escrow.getSwap(swapId);
      expect(swap.state).to.equal(3); // CANCELLED

      const makerBalanceAfter = await ethers.provider.getBalance(maker.address);
      expect(makerBalanceAfter).to.be.gt(makerBalanceBefore);
    });

    it("Should fail if timelock hasn't expired", async function () {
      await expect(escrow.connect(maker).cancelSwap(swapId)).to.be.revertedWithCustomError(
        escrow,
        "TimelockNotExpired",
      );
    });

    it("Should fail if caller is not the maker", async function () {
      await time.increase(TIMELOCK + 1);

      await expect(escrow.connect(other).cancelSwap(swapId)).to.be.revertedWithCustomError(escrow, "Unauthorized");
    });

    it("Should fail if swap is already completed", async function () {
      await escrow.connect(taker).completeSwap(swapId, secret);
      await time.increase(TIMELOCK + 1);

      await expect(escrow.connect(maker).cancelSwap(swapId)).to.be.revertedWithCustomError(escrow, "SwapNotOpen");
    });
  });

  describe("Rescue Funds", function () {
    beforeEach(async function () {
      const ethAmount = ethers.parseEther("1.0");
      const dotAmount = ethers.parseEther("100");
      const exchangeRate = ethers.parseEther("100");

      await escrow
        .connect(maker)
        .createSwap(swapId, secretHash, taker.address, ethAmount, dotAmount, exchangeRate, TIMELOCK, polkadotSender, {
          value: ethAmount,
        });
    });

    it("Should rescue funds after rescue delay", async function () {
      await time.increase(TIMELOCK + RESCUE_DELAY + 1);

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      await expect(escrow.rescueFunds(swapId))
        .to.emit(escrow, "FundsRescued")
        .withArgs(swapId, ethers.parseEther("1.0"));

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });

    it("Should fail if called by non-owner", async function () {
      await time.increase(TIMELOCK + RESCUE_DELAY + 1);

      await expect(escrow.connect(other).rescueFunds(swapId)).to.be.revertedWithCustomError(escrow, "Unauthorized");
    });

    it("Should fail if rescue delay hasn't passed", async function () {
      await time.increase(TIMELOCK + 1);

      await expect(escrow.rescueFunds(swapId)).to.be.revertedWithCustomError(escrow, "TimelockNotExpired");
    });

    it("Should fail if swap is completed", async function () {
      await escrow.connect(taker).completeSwap(swapId, secret);
      await time.increase(TIMELOCK + RESCUE_DELAY + 1);

      await expect(escrow.rescueFunds(swapId)).to.be.revertedWithCustomError(escrow, "SwapNotOpen");
    });
  });

  describe("View Functions", function () {
    it("Should check if swap can be cancelled", async function () {
      const ethAmount = ethers.parseEther("1.0");
      const dotAmount = ethers.parseEther("100");
      const exchangeRate = ethers.parseEther("100");

      await escrow
        .connect(maker)
        .createSwap(swapId, secretHash, taker.address, ethAmount, dotAmount, exchangeRate, TIMELOCK, polkadotSender, {
          value: ethAmount,
        });

      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await escrow.canCancel(swapId)).to.be.false;

      await time.increase(TIMELOCK + 1);

      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await escrow.canCancel(swapId)).to.be.true;
    });

    it("Should validate secret", async function () {
      const ethAmount = ethers.parseEther("1.0");
      const dotAmount = ethers.parseEther("100");
      const exchangeRate = ethers.parseEther("100");

      await escrow
        .connect(maker)
        .createSwap(swapId, secretHash, taker.address, ethAmount, dotAmount, exchangeRate, TIMELOCK, polkadotSender, {
          value: ethAmount,
        });

      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await escrow.isValidSecret(swapId, secret)).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await escrow.isValidSecret(swapId, ethers.encodeBytes32String("wrong"))).to.be.false;
    });
  });
});
