"use client";

import { useEffect, useState } from "react";
import { NextPage } from "next";
import { encodePacked, keccak256, parseEther, toHex } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  LockClosedIcon,
  PlusCircleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { AddressInput, EtherInput, InputBase } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type SwapDirection = "ETH_TO_DOT" | "DOT_TO_ETH";

interface SwapFormData {
  direction: SwapDirection;
  takerEthAddress: string;
  takerPolkadotAddress: string;
  sendAmount: string; // Amount user is sending
  timelockHours: string;
  useConnectedAsTaker: boolean; // Use connected wallet for taker
}

interface GeneratedSwapData {
  secret: string;
  secretHash: string;
  swapId: string;
}

// Fixed exchange rate: 1 DOT = 0.00001 ETH (or 1 ETH = 100,000 DOT)
const FIXED_EXCHANGE_RATE = 100000; // 1 ETH = 100,000 DOT

/**
 * Swap Creation Page - Improved UX
 */
const CreateSwapPage: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();

  // Form state
  const [formData, setFormData] = useState<SwapFormData>({
    direction: "ETH_TO_DOT",
    takerEthAddress: "",
    takerPolkadotAddress: "",
    sendAmount: "",
    timelockHours: "12",
    useConnectedAsTaker: false,
  });

  // Calculated receive amount
  const [receiveAmount, setReceiveAmount] = useState<string>("");

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

  // Auto-calculate receive amount when send amount changes
  useEffect(() => {
    const send = parseFloat(formData.sendAmount);

    if (send > 0) {
      if (formData.direction === "ETH_TO_DOT") {
        // Sending ETH, receiving DOT
        setReceiveAmount((send * FIXED_EXCHANGE_RATE).toFixed(4));
      } else {
        // Sending DOT, receiving ETH
        setReceiveAmount((send / FIXED_EXCHANGE_RATE).toFixed(8));
      }
    } else {
      setReceiveAmount("");
    }
  }, [formData.sendAmount, formData.direction]);

  // Auto-fill taker address if using connected wallet
  useEffect(() => {
    if (formData.useConnectedAsTaker && connectedAddress) {
      setFormData(prev => ({
        ...prev,
        takerEthAddress: connectedAddress,
        takerPolkadotAddress: connectedAddress,
      }));
    }
  }, [formData.useConnectedAsTaker, connectedAddress]);

  /**
   * Validate Polkadot address format (0x format)
   */
  const isValidPolkadotAddress = (address: string): boolean => {
    if (!address) return false;
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  /**
   * Convert address to bytes32 (pad with zeros)
   */
  const addressToBytes32 = (address: string): `0x${string}` => {
    if (!address || address === "0x") {
      return "0x0000000000000000000000000000000000000000000000000000000000000000";
    }
    return `0x${address.slice(2).padStart(64, "0")}` as `0x${string}`;
  };

  /**
   * Generate cryptographically secure random secret
   */
  const generateSecret = () => {
    setIsGenerating(true);
    try {
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const secretHex = `0x${Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")}`;

      const hash = keccak256(encodePacked(["bytes32"], [secretHex as `0x${string}`]));
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
   * Swap direction (reverse the swap)
   */
  const toggleDirection = () => {
    const newDirection = formData.direction === "ETH_TO_DOT" ? "DOT_TO_ETH" : "ETH_TO_DOT";
    const defaultTimelock = newDirection === "ETH_TO_DOT" ? "12" : "6";
    setFormData({ ...formData, direction: newDirection, timelockHours: defaultTimelock });
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

    if (!isValidPolkadotAddress(formData.takerPolkadotAddress)) {
      notification.error("Please enter a valid Polkadot address (0x format)");
      return;
    }

    if (!formData.sendAmount || !receiveAmount) {
      notification.error("Please enter send amount");
      return;
    }

    const timelockSeconds = parseInt(formData.timelockHours) * 3600;

    // Validate timelock
    if (formData.direction === "ETH_TO_DOT") {
      const minTimelockSeconds = ethMinTimelock ? Number(ethMinTimelock) : 12 * 3600;
      if (timelockSeconds < minTimelockSeconds) {
        notification.error(`Timelock must be at least ${minTimelockSeconds / 3600} hours for ETH to DOT swaps`);
        return;
      }
    } else {
      const maxTimelockSeconds = dotMaxTimelock ? Number(dotMaxTimelock) : 6 * 3600;
      if (timelockSeconds > maxTimelockSeconds) {
        notification.error(`Timelock must be at most ${maxTimelockSeconds / 3600} hours for DOT to ETH swaps`);
        return;
      }
    }

    setIsCreating(true);

    try {
      if (formData.direction === "ETH_TO_DOT") {
        // Sending ETH, receiving DOT
        const ethAmount = formData.sendAmount;
        const dotAmount = receiveAmount;

        await writeEthereumEscrow({
          functionName: "createSwap",
          args: [
            swapData.swapId as `0x${string}`,
            swapData.secretHash as `0x${string}`,
            formData.takerEthAddress as `0x${string}`,
            parseEther(ethAmount),
            parseEther(dotAmount),
            BigInt(FIXED_EXCHANGE_RATE * 1e18), // exchange rate with 18 decimals
            BigInt(timelockSeconds),
            addressToBytes32(formData.takerPolkadotAddress),
          ],
          value: parseEther(ethAmount),
        });

        notification.success("✅ ETH swap created on Ethereum!");
      } else {
        // Sending DOT, receiving ETH
        await writePolkadotEscrow({
          functionName: "createNativeSwap",
          args: [
            swapData.swapId as `0x${string}`,
            swapData.secretHash as `0x${string}`,
            formData.takerEthAddress as `0x${string}`,
            BigInt(timelockSeconds),
          ],
          value: parseEther(formData.sendAmount),
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
      sendAmount: "",
      timelockHours: "12",
      useConnectedAsTaker: false,
    });
    setSwapData(null);
    setSwapCreated(false);
    setReceiveAmount("");
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
          <p className="text-lg opacity-70">Set your exchange rate and create a cross-chain swap in 3 easy steps</p>
        </div>

        {!swapCreated ? (
          <div className="space-y-6">
            {/* Step 1: Swap Configuration */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">
                  <span className="badge badge-primary">1</span>
                  Swap Configuration
                </h2>

                {/* Direction with Toggle Button */}
                <div className="flex items-center justify-between mb-6 p-4 bg-base-300 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="font-bold text-lg">{formData.direction === "ETH_TO_DOT" ? "ETH" : "DOT"}</div>
                      <div className="text-sm opacity-70">You Send</div>
                    </div>

                    <button className="btn btn-circle btn-sm btn-ghost" onClick={toggleDirection}>
                      <ArrowsRightLeftIcon className="w-5 h-5" />
                    </button>

                    <div className="text-center">
                      <div className="font-bold text-lg">{formData.direction === "ETH_TO_DOT" ? "DOT" : "ETH"}</div>
                      <div className="text-sm opacity-70">You Receive</div>
                    </div>
                  </div>

                  <div className="badge badge-outline">
                    {formData.direction === "ETH_TO_DOT" ? "Ethereum → Polkadot" : "Polkadot → Ethereum"}
                  </div>
                </div>

                {/* Fixed Exchange Rate Display */}
                <div className="alert alert-info mb-4">
                  <div className="flex items-center gap-2">
                    <ArrowRightIcon className="w-5 h-5" />
                    <div>
                      <h4 className="font-semibold">Fixed Exchange Rate</h4>
                      <p className="text-sm">
                        1 ETH = {FIXED_EXCHANGE_RATE.toLocaleString()} DOT
                        <span className="mx-2">•</span>1 DOT = {(1 / FIXED_EXCHANGE_RATE).toFixed(8)} ETH
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Timelock */}
                  <div className="form-control">
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
                      onChange={e => setFormData({ ...formData, timelockHours: e.target.value })}
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
                          ? `Min: ${ethMinTimelock ? Number(ethMinTimelock) / 3600 : 12}h`
                          : `Max: ${dotMaxTimelock ? Number(dotMaxTimelock) / 3600 : 6}h`}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Amount Input with Preview */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">
                      Amount to Send ({formData.direction === "ETH_TO_DOT" ? "ETH" : "DOT"})
                    </span>
                  </label>
                  <EtherInput
                    value={formData.sendAmount}
                    onChange={value => setFormData({ ...formData, sendAmount: value })}
                    placeholder="0.0"
                  />
                </div>

                {/* Calculated Receive Amount */}
                {receiveAmount && (
                  <div className="alert alert-success">
                    <ArrowRightIcon className="w-5 h-5" />
                    <div>
                      <h4 className="font-semibold">You will receive</h4>
                      <p className="text-lg font-bold">
                        {receiveAmount} {formData.direction === "ETH_TO_DOT" ? "DOT" : "ETH"}
                      </p>
                      <p className="text-sm opacity-70">At rate: 1 ETH = {FIXED_EXCHANGE_RATE.toLocaleString()} DOT</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Taker Information */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">
                  <span className="badge badge-primary">2</span>
                  Counter Party Information
                </h2>

                {/* Use Connected Wallet Toggle */}
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={formData.useConnectedAsTaker}
                      onChange={e => setFormData({ ...formData, useConnectedAsTaker: e.target.checked })}
                    />
                    <span className="label-text">
                      <UserCircleIcon className="w-5 h-5 inline mr-2" />
                      Use my connected wallet (for testing / self-swap)
                    </span>
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Taker Ethereum Address */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Counter Party Ethereum Address</span>
                    </label>
                    <AddressInput
                      value={formData.takerEthAddress}
                      onChange={value => setFormData({ ...formData, takerEthAddress: value })}
                      placeholder="0x..."
                      disabled={formData.useConnectedAsTaker}
                    />
                  </div>

                  {/* Taker Polkadot Address */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Counter Party Polkadot Address</span>
                    </label>
                    <InputBase
                      value={formData.takerPolkadotAddress}
                      onChange={value => setFormData({ ...formData, takerPolkadotAddress: value })}
                      placeholder="0x..."
                      disabled={formData.useConnectedAsTaker}
                    />
                    <label className="label">
                      <span className="label-text-alt">0x format (42 characters)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Generate Secret & Create */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">
                  <span className="badge badge-primary">3</span>
                  Generate Secret & Create Swap
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Left: Generate Secret */}
                  <div>
                    <button
                      className={`btn btn-primary w-full ${isGenerating ? "loading" : ""}`}
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

                    {swapData && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="label-text text-sm font-semibold">Secret Hash</label>
                          <div className="flex gap-2 mt-1">
                            <input
                              type="text"
                              className="input input-bordered input-sm w-full font-mono text-xs"
                              value={swapData.secretHash}
                              readOnly
                            />
                            <button
                              className="btn btn-sm btn-square btn-outline"
                              onClick={() => copyToClipboard(swapData.secretHash, "Secret Hash")}
                            >
                              <DocumentDuplicateIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="alert alert-warning alert-sm">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          <span className="text-xs">Keep your secret private until you want to complete the swap!</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Create Swap */}
                  <div>
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

                    {swapData && !swapCreated && (
                      <div className="alert alert-info alert-sm mt-4">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span className="text-xs">Ready to create! Click above to proceed.</span>
                      </div>
                    )}
                  </div>
                </div>
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
                  <div className="stats stats-vertical lg:stats-horizontal shadow">
                    <div className="stat">
                      <div className="stat-title">You Send</div>
                      <div className="stat-value text-2xl">
                        {formData.sendAmount} {formData.direction === "ETH_TO_DOT" ? "ETH" : "DOT"}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">They Receive</div>
                      <div className="stat-value text-2xl">
                        {receiveAmount} {formData.direction === "ETH_TO_DOT" ? "DOT" : "ETH"}
                      </div>
                    </div>
                  </div>

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
