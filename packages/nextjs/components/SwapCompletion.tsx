"use client";

import { useState } from "react";
import { encodePacked, keccak256 } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { Address, InputBase } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface SwapCompletionProps {
  swapId: string;
  chain: "ethereum" | "polkadot";
  onComplete?: () => void;
  className?: string;
}

/**
 * Swap Completion Component
 * Handles the completion of atomic swaps by revealing the secret
 */
export const SwapCompletion: React.FC<SwapCompletionProps> = ({ swapId, chain, onComplete, className = "" }) => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [secret, setSecret] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  // Contract hooks
  const { writeContractAsync: writeEthereumEscrow } = useScaffoldWriteContract({
    contractName: "DotFusionEthereumEscrow",
  });

  const { writeContractAsync: writePolkadotEscrow } = useScaffoldWriteContract({
    contractName: "DotFusionPolkadotEscrow",
  });

  // Read swap data
  const { data: swapData } = useScaffoldReadContract({
    contractName: chain === "ethereum" ? "DotFusionEthereumEscrow" : "DotFusionPolkadotEscrow",
    functionName: "getSwap",
    args: [swapId as `0x${string}`],
  });

  // Validate secret
  const validateSecret = async () => {
    if (!secret || !swapData) return;

    setIsValidating(true);
    try {
      const secretHash = keccak256(encodePacked(["bytes32"], [secret as `0x${string}`]));

      if (secretHash === swapData.secretHash) {
        setValidationResult({
          isValid: true,
          message: "Secret is valid! You can complete the swap.",
        });
      } else {
        setValidationResult({
          isValid: false,
          message: "Invalid secret. Please check and try again.",
        });
      }
    } catch {
      setValidationResult({
        isValid: false,
        message: "Error validating secret. Please check the format.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Complete swap
  const completeSwap = async () => {
    if (!isConnected || !connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!secret) {
      notification.error("Please enter the secret");
      return;
    }

    if (!validationResult?.isValid) {
      notification.error("Please validate the secret first");
      return;
    }

    setIsCompleting(true);

    try {
      if (chain === "ethereum") {
        await writeEthereumEscrow({
          functionName: "completeSwap",
          args: [swapId as `0x${string}`, secret as `0x${string}`],
        });
      } else {
        await writePolkadotEscrow({
          functionName: "completeSwap",
          args: [swapId as `0x${string}`, secret as `0x${string}`, connectedAddress],
        });
      }

      notification.success("✅ Swap completed successfully!");
      setSecret("");
      setValidationResult(null);
      onComplete?.();
    } catch (error) {
      console.error("Error completing swap:", error);
      notification.error("Failed to complete swap");
    } finally {
      setIsCompleting(false);
    }
  };

  // Check if swap can be completed
  const canComplete = () => {
    if (!swapData) return false;
    return swapData.state === 1 && swapData.taker.toLowerCase() === connectedAddress?.toLowerCase();
  };

  if (!isConnected) {
    return (
      <div className={`card bg-base-200 shadow-xl ${className}`}>
        <div className="card-body text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-warning mx-auto mb-4" />
          <h3 className="card-title justify-center">Connect Wallet</h3>
          <p className="opacity-70">Connect your wallet to complete the swap</p>
        </div>
      </div>
    );
  }

  if (!swapData) {
    return (
      <div className={`card bg-base-200 shadow-xl ${className}`}>
        <div className="card-body text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-error mx-auto mb-4" />
          <h3 className="card-title justify-center">Swap Not Found</h3>
          <p className="opacity-70">The specified swap could not be found</p>
        </div>
      </div>
    );
  }

  if (!canComplete()) {
    return (
      <div className={`card bg-base-200 shadow-xl ${className}`}>
        <div className="card-body text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-warning mx-auto mb-4" />
          <h3 className="card-title justify-center">Cannot Complete</h3>
          <p className="opacity-70">
            {swapData.state !== 1 ? "This swap is no longer open" : "You are not the intended taker for this swap"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card bg-base-200 shadow-xl ${className}`}>
      <div className="card-body">
        <h3 className="card-title mb-6">
          <CheckCircleIcon className="w-6 h-6" />
          Complete Swap
        </h3>

        {/* Swap Information */}
        <div className="space-y-4 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Amounts</h4>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {chain === "ethereum"
                      ? (swapData as any).ethAmount?.toString()
                      : (swapData as any).amount?.toString()}
                  </div>
                  <div className="text-sm opacity-70">{chain === "ethereum" ? "ETH" : "DOT"}</div>
                </div>
                <ArrowPathIcon className="w-6 h-6" />
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {chain === "ethereum" ? (swapData as any).dotAmount?.toString() : "N/A"}
                  </div>
                  <div className="text-sm opacity-70">{chain === "ethereum" ? "DOT" : "N/A"}</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Participants</h4>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="opacity-70">Maker:</span> <Address address={swapData.maker} />
                </div>
                <div className="text-sm">
                  <span className="opacity-70">Taker:</span> <Address address={swapData.taker} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Unlock Time</h4>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4" />
              <span className="text-sm">{new Date(Number(swapData.unlockTime) * 1000).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Secret Hash</h4>
            <div className="font-mono text-sm bg-base-300 p-2 rounded break-all">{swapData.secretHash}</div>
          </div>
        </div>

        {/* Secret Input */}
        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text font-semibold">
                <KeyIcon className="w-4 h-4 inline mr-1" />
                Secret
              </span>
            </label>
            <InputBase value={secret} onChange={setSecret} placeholder="0x..." />
            <label className="label">
              <span className="label-text-alt">Enter the secret to complete the swap</span>
            </label>
          </div>

          {/* Validation */}
          <div className="flex gap-2">
            <button className="btn btn-outline flex-1" onClick={validateSecret} disabled={!secret || isValidating}>
              {isValidating ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <KeyIcon className="w-4 h-4" />
              )}
              Validate Secret
            </button>
          </div>

          {validationResult && (
            <div className={`alert ${validationResult.isValid ? "alert-success" : "alert-error"}`}>
              {validationResult.isValid ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5" />
              )}
              <span>{validationResult.message}</span>
            </div>
          )}

          {/* Complete Button */}
          <button
            className="btn btn-success w-full"
            onClick={completeSwap}
            disabled={!secret || !validationResult?.isValid || isCompleting}
          >
            {isCompleting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <CheckCircleIcon className="w-5 h-5" />
            )}
            Complete Swap
          </button>
        </div>

        {/* Warning */}
        <div className="alert alert-warning mt-4">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <div>
            <h3 className="font-bold">Important</h3>
            <div className="text-sm">
              Make sure you have the correct secret before completing the swap. Once completed, the swap cannot be
              undone.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapCompletion;
