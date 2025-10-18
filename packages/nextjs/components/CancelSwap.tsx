"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useAccount } from "wagmi";
import { ClockIcon, ExclamationTriangleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface CancelSwapProps {
  swapId: string;
  onCancel?: () => void;
}

const CancelSwap: React.FC<CancelSwapProps> = ({ swapId, onCancel }) => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [isCancelling, setIsCancelling] = useState(false);

  // Read swap data
  const { data: swapData } = useScaffoldReadContract({
    contractName: "DotFusionEthereumEscrow",
    functionName: "getSwap",
    args: [swapId as `0x${string}`],
  });

  // Read if swap can be cancelled
  const { data: canCancel } = useScaffoldReadContract({
    contractName: "DotFusionEthereumEscrow",
    functionName: "canCancel",
    args: [swapId as `0x${string}`],
  });

  // Write contract hook
  const { writeContractAsync: writeEthereumEscrowAsync } = useScaffoldWriteContract({
    contractName: "DotFusionEthereumEscrow",
  });

  const cancelSwap = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!swapData) {
      toast.error("Swap data not found");
      return;
    }

    if (!canCancel) {
      toast.error("Swap cannot be cancelled yet");
      return;
    }

    try {
      setIsCancelling(true);

      await writeEthereumEscrowAsync({
        functionName: "cancelSwap",
        args: [swapId as `0x${string}`],
      });

      toast.success("Swap cancelled successfully!");
      onCancel?.();
    } catch (error) {
      console.error("Error cancelling swap:", error);
      toast.error("Failed to cancel swap. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const isOwner = () => {
    return swapData && swapData.maker === connectedAddress;
  };

  const getTimeUntilUnlock = () => {
    if (!swapData) return null;

    const unlockTime = Number(swapData.unlockTime);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeLeft = unlockTime - currentTime;

    if (timeLeft <= 0) return "Unlocked";

    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (!isConnected) {
    return (
      <div className="alert alert-warning">
        <ExclamationTriangleIcon className="h-5 w-5" />
        <span>Please connect your wallet to cancel swaps</span>
      </div>
    );
  }

  if (!swapData || swapData.state !== 1) {
    // 1 = OPEN state
    return (
      <div className="alert alert-info">
        <XCircleIcon className="h-5 w-5" />
        <span>This swap is not available for cancellation</span>
      </div>
    );
  }

  if (!isOwner()) {
    return (
      <div className="alert alert-warning">
        <ExclamationTriangleIcon className="h-5 w-5" />
        <span>Only the swap maker can cancel this swap</span>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title mb-4">Cancel Swap</h2>

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

          {/* Timelock Info */}
          <div className="alert alert-info">
            <ClockIcon className="h-5 w-5" />
            <div>
              <div className="font-semibold">Timelock Status</div>
              <div className="text-sm">
                {canCancel ? (
                  <span className="text-success">✓ Swap can be cancelled</span>
                ) : (
                  <span className="text-warning">⏳ Time until unlock: {getTimeUntilUnlock()}</span>
                )}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="alert alert-warning">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <div>
              <div className="font-semibold">Warning</div>
              <div className="text-sm">
                Cancelling this swap will return your tokens to your address. This action cannot be undone.
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="card-actions justify-end">
            <button className="btn btn-error" onClick={cancelSwap} disabled={isCancelling || !canCancel}>
              {isCancelling ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircleIcon className="h-5 w-5" />
                  Cancel Swap
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelSwap;
