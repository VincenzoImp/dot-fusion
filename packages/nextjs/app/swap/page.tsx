"use client";

import { useState } from "react";
import { NextPage } from "next";
import { encodePacked, keccak256, parseEther, toHex } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  LockClosedIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { AddressInput, EtherInput, InputBase } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type SwapDirection = "ETH_TO_DOT" | "DOT_TO_ETH";

interface SwapFormData {
  direction: SwapDirection;
  takerEthAddress: string;
  takerPolkadotAddress: string;
  ethAmount: string;
  dotAmount: string;
  timelockHours: string;
}

interface GeneratedSwapData {
  secret: string;
  secretHash: string;
  swapId: string;
}

/**
 * Swap Creation Page - Updated for XCM Bridge Integration
 */
const CreateSwapPage: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();

  // Form state
  const [formData, setFormData] = useState<SwapFormData>({
    direction: "ETH_TO_DOT",
    takerEthAddress: "",
    takerPolkadotAddress: "",
    ethAmount: "",
    dotAmount: "",
    timelockHours: "12", // Default to 12 hours for ETH_TO_DOT
  });

  // Form setters
  const setTakerEthAddress = (value: string) => setFormData({ ...formData, takerEthAddress: value });
  const setTakerPolkadotAddress = (value: string) => setFormData({ ...formData, takerPolkadotAddress: value });
  const setEthAmount = (value: string) => setFormData({ ...formData, ethAmount: value });
  const setDotAmount = (value: string) => setFormData({ ...formData, dotAmount: value });
  const setTimelockHours = (value: string) => setFormData({ ...formData, timelockHours: value });

  // Update direction and adjust default timelock
  const setDirection = (direction: "ETH_TO_DOT" | "DOT_TO_ETH") => {
    const defaultTimelock = direction === "ETH_TO_DOT" ? "12" : "6";
    setFormData({ ...formData, direction, timelockHours: defaultTimelock });
  };

  // Generated swap data
  const [swapData, setSwapData] = useState<GeneratedSwapData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [swapCreated, setSwapCreated] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Contract hooks
  const { writeContractAsync: writeEthereumEscrow } = useScaffoldWriteContract({
    contractName: "DotFusionEthereumEscrow",
  });

  const { writeContractAsync: writePolkadotEscrow } = useScaffoldWriteContract({
    contractName: "DotFusionPolkadotEscrow",
  });

  // Read contract data
  const { data: ethMinTimelock } = useScaffoldReadContract({
    contractName: "DotFusionEthereumEscrow",
    functionName: "MIN_TIMELOCK",
  });

  const { data: dotMaxTimelock } = useScaffoldReadContract({
    contractName: "DotFusionPolkadotEscrow",
    functionName: "MAX_TIMELOCK",
  });

  /**
   * Generate cryptographically secure random secret
   */
  const generateSecret = () => {
    setIsGenerating(true);
    try {
      // Generate random 32 bytes
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const secretHex = `0x${Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")}`;

      // Compute hash using the same method as contracts
      const hash = keccak256(encodePacked(["bytes32"], [secretHex as `0x${string}`]));

      // Generate unique swap ID
      const timestamp = Date.now();
      const id = keccak256(toHex(`swap_${connectedAddress}_${timestamp}`));

      setSwapData({
        secret: secretHex,
        secretHash: hash,
        swapId: id,
      });

      notification.success("🔐 Secret generated securely!");
    } catch (error) {
      console.error("Error generating secret:", error);
      notification.error("Failed to generate secret");
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    notification.success(`${label} copied!`);
  };

  /**
   * Create the swap based on direction
   */
  const createSwap = async () => {
    if (!isConnected) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!swapData) {
      notification.error("Please generate a secret first");
      return;
    }

    if (!formData.takerEthAddress || !formData.takerPolkadotAddress) {
      notification.error("Please enter taker addresses");
      return;
    }

    if (!formData.ethAmount || !formData.dotAmount) {
      notification.error("Please enter amounts");
      return;
    }

    const timelockSeconds = parseInt(formData.timelockHours) * 3600;

    // Validate timelock based on swap direction
    if (formData.direction === "ETH_TO_DOT") {
      // For ETH_TO_DOT: Use Ethereum's minimum timelock (12 hours)
      const minTimelockSeconds = ethMinTimelock ? Number(ethMinTimelock) : 12 * 3600;
      if (timelockSeconds < minTimelockSeconds) {
        notification.error(`Timelock must be at least ${minTimelockSeconds / 3600} hours for ETH to DOT swaps`);
        return;
      }
    } else {
      // For DOT_TO_ETH: Use Polkadot's maximum timelock (6 hours)
      const maxTimelockSeconds = dotMaxTimelock ? Number(dotMaxTimelock) : 6 * 3600;
      if (timelockSeconds > maxTimelockSeconds) {
        notification.error(`Timelock must be at most ${maxTimelockSeconds / 3600} hours for DOT to ETH swaps`);
        return;
      }
    }

    setIsCreating(true);

    try {
      if (formData.direction === "ETH_TO_DOT") {
        // Create swap on Ethereum
        await writeEthereumEscrow({
          functionName: "createSwap",
          args: [
            swapData.swapId as `0x${string}`,
            swapData.secretHash as `0x${string}`,
            formData.takerEthAddress as `0x${string}`,
            parseEther(formData.ethAmount),
            parseEther(formData.dotAmount),
            BigInt((parseFloat(formData.dotAmount) / parseFloat(formData.ethAmount)) * 1e18), // exchange rate
            BigInt(timelockSeconds),
            formData.takerPolkadotAddress as `0x${string}`,
          ],
          value: parseEther(formData.ethAmount),
        });

        notification.success("✅ ETH swap created on Ethereum!");
      } else {
        // Create swap on Polkadot
        await writePolkadotEscrow({
          functionName: "createNativeSwap",
          args: [
            swapData.swapId as `0x${string}`,
            swapData.secretHash as `0x${string}`,
            formData.takerEthAddress as `0x${string}`,
            BigInt(timelockSeconds),
          ],
          value: parseEther(formData.dotAmount),
        });

        notification.success("✅ DOT swap created on Polkadot!");
      }

      setSwapCreated(true);
    } catch (error) {
      console.error("Error creating swap:", error);
      notification.error("Failed to create swap");
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setFormData({
      direction: "ETH_TO_DOT",
      takerEthAddress: "",
      takerPolkadotAddress: "",
      ethAmount: "",
      dotAmount: "",
      timelockHours: "12",
    });
    setSwapData(null);
    setSwapCreated(false);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="card w-96 bg-base-200 shadow-xl">
          <div className="card-body text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="card-title justify-center">Wallet Not Connected</h2>
            <p className="opacity-70">Please connect your wallet to create atomic swaps</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Create Atomic Swap</h1>
          <p className="text-lg opacity-70">
            Generate a secret and create a cross-chain swap between Ethereum and Polkadot
          </p>
        </div>

        {!swapCreated ? (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Form */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-6">
                  <PlusCircleIcon className="w-6 h-6" />
                  Swap Configuration
                </h2>

                {/* Swap Direction */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-semibold">Swap Direction</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="cursor-pointer label">
                      <input
                        type="radio"
                        name="direction"
                        className="radio radio-primary"
                        checked={formData.direction === "ETH_TO_DOT"}
                        onChange={() => setDirection("ETH_TO_DOT")}
                      />
                      <span className="label-text ml-2">ETH → DOT</span>
                    </label>
                    <label className="cursor-pointer label">
                      <input
                        type="radio"
                        name="direction"
                        className="radio radio-primary"
                        checked={formData.direction === "DOT_TO_ETH"}
                        onChange={() => setDirection("DOT_TO_ETH")}
                      />
                      <span className="label-text ml-2">DOT → ETH</span>
                    </label>
                  </div>
                </div>

                {/* Taker Addresses */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-semibold">Taker Ethereum Address</span>
                  </label>
                  <AddressInput value={formData.takerEthAddress} onChange={setTakerEthAddress} placeholder="0x..." />
                </div>

                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-semibold">Taker Polkadot Address</span>
                  </label>
                  <InputBase
                    value={formData.takerPolkadotAddress}
                    onChange={setTakerPolkadotAddress}
                    placeholder="1A2B3C4D5E6F7G8H9I0J..."
                  />
                </div>

                {/* Amounts */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-semibold">
                      {formData.direction === "ETH_TO_DOT" ? "ETH Amount" : "DOT Amount"}
                    </span>
                  </label>
                  <EtherInput
                    value={formData.direction === "ETH_TO_DOT" ? formData.ethAmount : formData.dotAmount}
                    onChange={formData.direction === "ETH_TO_DOT" ? setEthAmount : setDotAmount}
                    placeholder="0.0"
                  />
                </div>

                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-semibold">
                      {formData.direction === "ETH_TO_DOT" ? "DOT Amount" : "ETH Amount"}
                    </span>
                  </label>
                  <EtherInput
                    value={formData.direction === "ETH_TO_DOT" ? formData.dotAmount : formData.ethAmount}
                    onChange={formData.direction === "ETH_TO_DOT" ? setDotAmount : setEthAmount}
                    placeholder="0.0"
                  />
                </div>

                {/* Timelock */}
                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text font-semibold">
                      <ClockIcon className="w-4 h-4 inline mr-1" />
                      Timelock (hours)
                    </span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={formData.timelockHours}
                    onChange={e => setTimelockHours(e.target.value)}
                    placeholder="12"
                    min={
                      formData.direction === "ETH_TO_DOT" ? (ethMinTimelock ? Number(ethMinTimelock) / 3600 : 12) : 1
                    }
                    max={
                      formData.direction === "DOT_TO_ETH" ? (dotMaxTimelock ? Number(dotMaxTimelock) / 3600 : 6) : 168
                    }
                  />
                  <label className="label">
                    <span className="label-text-alt">
                      {formData.direction === "ETH_TO_DOT"
                        ? `Min: ${ethMinTimelock ? Number(ethMinTimelock) / 3600 : 12}h (Ethereum minimum)`
                        : `Max: ${dotMaxTimelock ? Number(dotMaxTimelock) / 3600 : 6}h (Polkadot maximum)`}
                    </span>
                  </label>
                </div>

                {/* Generate Secret Button */}
                <button
                  className={`btn btn-primary w-full mb-4 ${isGenerating ? "loading" : ""}`}
                  onClick={generateSecret}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    "Generating..."
                  ) : (
                    <>
                      <KeyIcon className="w-5 h-5" />
                      Generate Secret
                    </>
                  )}
                </button>

                {/* Create Swap Button */}
                <button
                  className={`btn btn-success w-full ${isCreating ? "loading" : ""}`}
                  onClick={createSwap}
                  disabled={!swapData || isCreating}
                >
                  {isCreating ? (
                    "Creating Swap..."
                  ) : (
                    <>
                      <LockClosedIcon className="w-5 h-5" />
                      Create Swap
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column - Generated Data */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-6">
                  <KeyIcon className="w-6 h-6" />
                  Generated Swap Data
                </h2>

                {swapData ? (
                  <div className="space-y-4">
                    {/* Secret Hash */}
                    <div>
                      <label className="label">
                        <span className="label-text font-semibold">Secret Hash</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input input-bordered w-full font-mono text-sm"
                          value={swapData.secretHash}
                          readOnly
                        />
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => copyToClipboard(swapData.secretHash, "Secret Hash")}
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Swap ID */}
                    <div>
                      <label className="label">
                        <span className="label-text font-semibold">Swap ID</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input input-bordered w-full font-mono text-sm"
                          value={swapData.swapId}
                          readOnly
                        />
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => copyToClipboard(swapData.swapId, "Swap ID")}
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Secret (Hidden) */}
                    <div>
                      <label className="label">
                        <span className="label-text font-semibold">Secret (Keep Private!)</span>
                      </label>
                      <div className="alert alert-warning">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        <span className="text-sm">Keep this secret private until you want to complete the swap!</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input input-bordered w-full font-mono text-sm"
                          value={swapData.secret}
                          readOnly
                        />
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => copyToClipboard(swapData.secret, "Secret")}
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="alert alert-info">
                      <CheckCircleIcon className="w-5 h-5" />
                      <div>
                        <h3 className="font-bold">Next Steps:</h3>
                        <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
                          <li>Share the Secret Hash and Swap ID with your counter party</li>
                          <li>Wait for them to create the matching swap on the other chain</li>
                          <li>Use the Secret to complete the swap when ready</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <KeyIcon className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
                    <p className="opacity-70">Generate a secret to see the swap data</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Success State */
          <div className="card bg-base-200 shadow-xl max-w-2xl mx-auto">
            <div className="card-body text-center">
              <CheckCircleIcon className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="card-title justify-center text-2xl">Swap Created Successfully!</h2>
              <p className="opacity-70 mb-6">Your atomic swap has been created and is waiting for a counter party.</p>

              {swapData && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Swap ID</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input input-bordered w-full font-mono text-sm"
                        value={swapData.swapId}
                        readOnly
                      />
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => copyToClipboard(swapData.swapId, "Swap ID")}
                      >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button className="btn btn-primary" onClick={resetForm}>
                  <PlusCircleIcon className="w-5 h-5" />
                  Create Another Swap
                </button>
                <a href="/swaps" className="btn btn-outline">
                  <ArrowRightIcon className="w-5 h-5" />
                  View My Swaps
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateSwapPage;
