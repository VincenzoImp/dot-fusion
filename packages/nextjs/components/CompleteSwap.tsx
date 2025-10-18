"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { keccak256, toHex } from "viem";
import { useAccount } from "wagmi";
import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
// import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface CompleteSwapProps {
  swapId: string;
  onComplete?: () => void;
}

const CompleteSwap: React.FC<CompleteSwapProps> = ({ swapId, onComplete }) => {
  const { isConnected } = useAccount();
  const [secret, setSecret] = useState<string>("");
  const [targetAddress, setTargetAddress] = useState<string>("");
  const [isCompleting, setIsCompleting] = useState(false);

  // Read swap data
  const { data: swapData } = useScaffoldReadContract({
    contractName: "DotFusionEthereumEscrow",
    functionName: "getSwap",
    args: [swapId as `0x${string}`],
  });

  // Write contract hook
  const { writeContractAsync: writeEthereumEscrowAsync } = useScaffoldWriteContract({
    contractName: "DotFusionEthereumEscrow",
  });

  const completeSwap = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!secret || !targetAddress) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!swapData) {
      toast.error("Swap data not found");
      return;
    }

    try {
      setIsCompleting(true);

      const secretHash = keccak256(toHex(secret));

      // Verify the secret matches the hash
      if (secretHash !== swapData.secretHash) {
        toast.error("Invalid secret");
        return;
      }

      await writeEthereumEscrowAsync({
        functionName: "completeSwap",
        args: [swapId as `0x${string}`, secret as `0x${string}`, targetAddress as `0x${string}`],
      });

      toast.success("Swap completed successfully!");
      setSecret("");
      setTargetAddress("");
      onComplete?.();
    } catch (error) {
      console.error("Error completing swap:", error);
      toast.error("Failed to complete swap. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  const isValidSecret = () => {
    if (!secret || !swapData) return false;
    try {
      const secretHash = keccak256(toHex(secret));
      return secretHash === swapData.secretHash;
    } catch {
      return false;
    }
  };

  if (!isConnected) {
    return (
      <div className="alert alert-warning">
        <ExclamationTriangleIcon className="h-5 w-5" />
        <span>Please connect your wallet to complete swaps</span>
      </div>
    );
  }

  if (!swapData || swapData.state !== 1) {
    // 1 = OPEN state
    return (
      <div className="alert alert-info">
        <CheckCircleIcon className="h-5 w-5" />
        <span>This swap is not available for completion</span>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title mb-4">Complete Swap</h2>

        <div className="space-y-4">
          {/* Swap Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Swap ID</span>
              </label>
              <div className="p-2 bg-base-200 rounded">
                <code className="text-xs break-all">{swapId}</code>
              </div>
            </div>
            <div>
              <label className="label">
                <span className="label-text font-semibold">Amount</span>
              </label>
              <div className="p-2 bg-base-200 rounded">
                <span className="font-mono">
                  {swapData.amount ? (Number(swapData.amount) / 1e18).toFixed(6) : "0"} ETH
                </span>
              </div>
            </div>
          </div>

          {/* Secret Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Secret</span>
              <span className="label-text-alt text-error">*</span>
            </label>
            <input
              type="text"
              className={`input input-bordered ${
                secret && !isValidSecret() ? "input-error" : secret && isValidSecret() ? "input-success" : ""
              }`}
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Enter the secret to complete the swap"
            />
            {secret && (
              <label className="label">
                <span className={`label-text-alt ${isValidSecret() ? "text-success" : "text-error"}`}>
                  {isValidSecret() ? "✓ Valid secret" : "✗ Invalid secret"}
                </span>
              </label>
            )}
          </div>

          {/* Target Address */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Target Address</span>
              <span className="label-text-alt text-error">*</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={targetAddress}
              onChange={e => setTargetAddress(e.target.value)}
              placeholder="Address to receive the tokens"
            />
          </div>

          {/* Action Button */}
          <div className="card-actions justify-end">
            <button
              className="btn btn-primary"
              onClick={completeSwap}
              disabled={isCompleting || !secret || !targetAddress || !isValidSecret()}
            >
              {isCompleting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  Complete Swap
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteSwap;
