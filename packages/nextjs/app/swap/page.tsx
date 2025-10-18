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
  const [amount, setAmount] = useState<string>("");
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

    if (!takerAddress || !amount || !secretHash || !timelock) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsCreatingSwap(true);

      // Generate unique swap ID
      const swapId = keccak256(toHex(`${connectedAddress}-${takerAddress}-${Date.now()}`));

      // For demo purposes, we'll use ETH as the token (address(0))
      const tokenAddress = "0x0000000000000000000000000000000000000000";

      await writeEthereumEscrowAsync({
        functionName: "createSwap",
        args: [
          swapId,
          secretHash as `0x${string}`,
          takerAddress as `0x${string}`,
          tokenAddress as `0x${string}`,
          parseEther(amount),
          BigInt(timelock),
        ],
        value: parseEther(amount), // Send ETH as the token amount
      });

      toast.success("Swap created successfully!");

      // Reset form
      setTakerAddress("");
      setAmount("");
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
          <h1 className="text-4xl font-bold mb-4">Create Atomic Swap</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Create a secure, trustless cross-chain atomic swap between Ethereum and Polkadot
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

                {/* Amount */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Amount (ETH)</span>
                    <span className="label-text-alt text-error">*</span>
                  </label>
                  <EtherInput value={amount} onChange={setAmount} placeholder="0.0" />
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
                disabled={isCreatingSwap || !takerAddress || !amount || !secretHash}
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
              <h3 className="card-title text-sm justify-center">Secure</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Your funds are locked in smart contracts until the swap completes
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <ClockIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h3 className="card-title text-sm justify-center">Timelock</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                You can cancel the swap after the timelock period expires
              </p>
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
