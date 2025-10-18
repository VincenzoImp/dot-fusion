"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { toast } from "react-hot-toast";
import { keccak256, parseEther, toHex } from "viem";
import { useAccount } from "wagmi";
import { ArrowPathIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Address, AddressInput, EtherInput, IntegerInput } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

type SwapDirection = "ethereum-to-polkadot" | "polkadot-to-ethereum";

const CreateSwap: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [swapDirection, setSwapDirection] = useState<SwapDirection>("ethereum-to-polkadot");
  const [takerAddress, setTakerAddress] = useState<string>("");
  const [ethAmount, setEthAmount] = useState<string>("");
  const [dotAmount, setDotAmount] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<string>("100"); // Default: 100 DOT per ETH
  const [polkadotSender, setPolkadotSender] = useState<string>("");
  const [timelock, setTimelock] = useState<string>("3600"); // 1 hour default
  const [secret, setSecret] = useState<string>("");
  const [secretHash, setSecretHash] = useState<string>("");
  const [isGeneratingSecret, setIsGeneratingSecret] = useState(false);
  const [isCreatingSwap, setIsCreatingSwap] = useState(false);

  // Generate secret hash when secret changes
  useEffect(() => {
    if (secret) {
      try {
        const hash = keccak256(toHex(secret));
        setSecretHash(hash);
      } catch (error) {
        console.error("Error generating secret hash:", error);
      }
    } else {
      setSecretHash("");
    }
  }, [secret]);

  // Calculate DOT amount based on ETH amount and exchange rate
  useEffect(() => {
    if (ethAmount && exchangeRate) {
      try {
        const eth = parseFloat(ethAmount);
        const rate = parseFloat(exchangeRate);
        const dot = eth * rate;
        setDotAmount(dot.toString());
      } catch (error) {
        console.error("Error calculating DOT amount:", error);
      }
    } else {
      setDotAmount("");
    }
  }, [ethAmount, exchangeRate]);

  // Contract write hook
  const { writeContractAsync: writeEthereumEscrowAsync } = useScaffoldWriteContract({
    contractName: "DotFusionEthereumEscrow",
  });

  // Generate random secret
  const generateSecret = () => {
    setIsGeneratingSecret(true);
    const randomSecret = Math.random().toString(36).substring(2) + Date.now().toString(36);
    setSecret(randomSecret);
    setIsGeneratingSecret(false);
  };

  // Create swap
  const createSwap = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!takerAddress || !ethAmount || !dotAmount || !exchangeRate || !polkadotSender || !secretHash || !timelock) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsCreatingSwap(true);

      // Generate unique swap ID
      const swapId = keccak256(toHex(`${connectedAddress}-${takerAddress}-${Date.now()}`));

      // Convert Polkadot address to bytes32
      // If it's already a hex string with 0x prefix and 66 chars (0x + 64 hex), use it
      // Otherwise, pad it to 32 bytes
      let polkadotSenderBytes: `0x${string}`;

      if (polkadotSender.startsWith("0x") && polkadotSender.length === 66) {
        // Already a proper bytes32 hex string
        polkadotSenderBytes = polkadotSender as `0x${string}`;
      } else if (polkadotSender.startsWith("0x")) {
        // Hex string but not 32 bytes - pad it
        const cleanHex = polkadotSender.slice(2);
        const paddedHex = cleanHex.padEnd(64, "0");
        polkadotSenderBytes = `0x${paddedHex}` as `0x${string}`;
      } else {
        // Not a hex string - convert to hex and pad to 32 bytes
        const hexString = Array.from(polkadotSender)
          .map(c => c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("")
          .padEnd(64, "0");
        polkadotSenderBytes = `0x${hexString}` as `0x${string}`;
      }

      await writeEthereumEscrowAsync({
        functionName: "createSwap",
        args: [
          swapId,
          secretHash as `0x${string}`,
          takerAddress as `0x${string}`,
          parseEther(ethAmount),
          parseEther(dotAmount),
          parseEther(exchangeRate),
          BigInt(timelock),
          polkadotSenderBytes,
        ],
        value: parseEther(ethAmount), // Send ETH amount
      });

      toast.success("ETH-DOT swap created successfully!");

      // Reset form
      setTakerAddress("");
      setEthAmount("");
      setDotAmount("");
      setExchangeRate("100");
      setPolkadotSender("");
      setSecret("");
      setSecretHash("");
    } catch (error) {
      console.error("Error creating swap:", error);
      toast.error("Failed to create swap. Please try again.");
    } finally {
      setIsCreatingSwap(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-warning mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Wallet Not Connected</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Please connect your wallet to create atomic swaps.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Create ETH-DOT Cross-Chain Swap</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Swap ETH on Ethereum for DOT on Polkadot using secure atomic swaps with fixed exchange rates
          </p>
        </div>

        {/* Swap Direction Selector */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-4">Swap Direction</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                className={`btn btn-outline ${swapDirection === "ethereum-to-polkadot" ? "btn-primary" : ""}`}
                onClick={() => setSwapDirection("ethereum-to-polkadot")}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  Ethereum → Polkadot
                </div>
              </button>
              <button
                className={`btn btn-outline ${swapDirection === "polkadot-to-ethereum" ? "btn-primary" : ""}`}
                onClick={() => setSwapDirection("polkadot-to-ethereum")}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  Polkadot → Ethereum
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Swap Form */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-6">Swap Details</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Taker Address */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Taker Address</span>
                    <span className="label-text-alt text-error">*</span>
                  </label>
                  <AddressInput
                    value={takerAddress}
                    onChange={setTakerAddress}
                    placeholder="Enter taker's wallet address"
                  />
                </div>

                {/* ETH Amount */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">ETH Amount</span>
                    <span className="label-text-alt text-error">*</span>
                  </label>
                  <EtherInput value={ethAmount} onChange={setEthAmount} placeholder="0.0" />
                </div>

                {/* Exchange Rate */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Exchange Rate (DOT per ETH)</span>
                    <span className="label-text-alt text-error">*</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={exchangeRate}
                    onChange={e => setExchangeRate(e.target.value)}
                    placeholder="100"
                    step="0.01"
                  />
                </div>

                {/* DOT Amount (calculated) */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">DOT Amount (calculated)</span>
                  </label>
                  <div className="p-3 bg-base-200 rounded-lg">
                    <span className="text-lg font-semibold">{dotAmount || "0"} DOT</span>
                  </div>
                </div>

                {/* Polkadot Sender Address */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Polkadot Sender Address</span>
                    <span className="label-text-alt text-error">*</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={polkadotSender}
                    onChange={e => setPolkadotSender(e.target.value)}
                    placeholder="0x... (32 bytes hex) or SS58 address"
                  />
                  <label className="label">
                    <span className="label-text-alt">
                      The Polkadot address that will provide DOT tokens. Can be hex (0x...) or SS58 format.
                    </span>
                  </label>
                </div>

                {/* Timelock */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Timelock (seconds)</span>
                    <span className="label-text-alt text-error">*</span>
                  </label>
                  <IntegerInput value={timelock} onChange={setTimelock} placeholder="3600" />
                  <label className="label">
                    <span className="label-text-alt">Time before swap can be cancelled (default: 1 hour)</span>
                  </label>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Secret */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Secret</span>
                    <span className="label-text-alt text-error">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input input-bordered flex-1"
                      value={secret}
                      onChange={e => setSecret(e.target.value)}
                      placeholder="Enter or generate a secret"
                    />
                    <button className="btn btn-outline" onClick={generateSecret} disabled={isGeneratingSecret}>
                      {isGeneratingSecret ? <span className="loading loading-spinner loading-sm"></span> : "Generate"}
                    </button>
                  </div>
                  <label className="label">
                    <span className="label-text-alt">
                      Keep this secret safe! You&apos;ll need it to complete the swap.
                    </span>
                  </label>
                </div>

                {/* Secret Hash */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Secret Hash</span>
                  </label>
                  <div className="p-3 bg-base-200 rounded-lg">
                    <code className="text-sm break-all">{secretHash || "Enter a secret to generate hash"}</code>
                  </div>
                  <label className="label">
                    <span className="label-text-alt">This hash will be used to lock the swap</span>
                  </label>
                </div>

                {/* Connected Address Display */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Your Address</span>
                  </label>
                  <div className="p-3 bg-base-200 rounded-lg">
                    <Address address={connectedAddress} />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="card-actions justify-end mt-8">
              <button
                className="btn btn-primary btn-lg"
                onClick={createSwap}
                disabled={
                  isCreatingSwap ||
                  !takerAddress ||
                  !ethAmount ||
                  !dotAmount ||
                  !exchangeRate ||
                  !polkadotSender ||
                  !secretHash
                }
              >
                {isCreatingSwap ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating Swap...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="h-5 w-5" />
                    Create Swap
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h3 className="card-title text-sm justify-center">Cross-Chain</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Swap ETH on Ethereum for DOT on Polkadot using atomic swaps
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <ClockIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h3 className="card-title text-sm justify-center">Fixed Rate</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">Exchange rate is fixed at swap creation time</p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <ArrowPathIcon className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <h3 className="card-title text-sm justify-center">Atomic</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                The swap either completes entirely or fails completely
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSwap;
