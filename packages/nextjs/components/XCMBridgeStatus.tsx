"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface XCMBridgeStatusProps {
  className?: string;
}

/**
 * XCM Bridge Status Component
 * Shows the current status of the XCM bridge and allows management
 */
export const XCMBridgeStatus: React.FC<XCMBridgeStatusProps> = ({ className = "" }) => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);
  const [newFee, setNewFee] = useState("");

  // Read XCM bridge data
  const { data: owner } = useScaffoldReadContract({
    contractName: "DotFusionXCMBridge",
    functionName: "owner",
  });

  const { data: escrow } = useScaffoldReadContract({
    contractName: "DotFusionXCMBridge",
    functionName: "escrow",
  });

  const { data: ethereumEscrow } = useScaffoldReadContract({
    contractName: "DotFusionXCMBridge",
    functionName: "ETHEREUM_ESCROW_ADDRESS",
  });

  const { data: ethereumParaId } = useScaffoldReadContract({
    contractName: "DotFusionXCMBridge",
    functionName: "ETHEREUM_PARACHAIN_ID",
  });

  const { data: xcmFee } = useScaffoldReadContract({
    contractName: "DotFusionXCMBridge",
    functionName: "xcmFee",
  });

  const { data: minXcmFee } = useScaffoldReadContract({
    contractName: "DotFusionXCMBridge",
    functionName: "MIN_XCM_FEE",
  });

  // Write contract hooks
  const { writeContractAsync: writeXCMBridge } = useScaffoldWriteContract({
    contractName: "DotFusionXCMBridge",
  });

  // Check if user is owner
  const isOwner = connectedAddress && owner && connectedAddress.toLowerCase() === owner.toLowerCase();

  // Update XCM fee
  const updateXCMFee = async () => {
    if (!newFee || !isOwner) return;

    setIsUpdatingFee(true);
    try {
      await writeXCMBridge({
        functionName: "updateXCMFee",
        args: [BigInt(newFee)],
      });
      notification.success("✅ XCM fee updated successfully!");
      setNewFee("");
    } catch (error) {
      console.error("Error updating XCM fee:", error);
      notification.error("Failed to update XCM fee");
    } finally {
      setIsUpdatingFee(false);
    }
  };

  // Withdraw fees
  const withdrawFees = async () => {
    if (!isOwner) return;

    try {
      await writeXCMBridge({
        functionName: "withdrawFees",
      });
      notification.success("✅ Fees withdrawn successfully!");
    } catch (error) {
      console.error("Error withdrawing fees:", error);
      notification.error("Failed to withdraw fees");
    }
  };

  // Get bridge status
  const getBridgeStatus = () => {
    if (!escrow || escrow === "0x0000000000000000000000000000000000000000") {
      return { status: "not-configured", color: "text-error", icon: ExclamationTriangleIcon };
    }
    // For deployed contracts: if escrow is set, bridge is configured
    // ethereumEscrow and ethereumParaId are optional (may be constants in older versions)
    return { status: "configured", color: "text-success", icon: CheckCircleIcon };
  };

  const bridgeStatus = getBridgeStatus();
  const StatusIcon = bridgeStatus.icon;

  if (!isConnected) {
    return (
      <div className={`card bg-base-200 shadow-xl ${className}`}>
        <div className="card-body text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-warning mx-auto mb-4" />
          <h3 className="card-title justify-center">Connect Wallet</h3>
          <p className="opacity-70">Connect your wallet to view XCM bridge status</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card bg-base-200 shadow-xl ${className}`}>
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title">
            <GlobeAltIcon className="w-6 h-6" />
            XCM Bridge Status
          </h3>
          <div className={`badge ${bridgeStatus.color}`}>
            <StatusIcon className="w-4 h-4 mr-1" />
            {bridgeStatus.status.toUpperCase()}
          </div>
        </div>

        {/* Bridge Configuration */}
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Configuration</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-70">Polkadot Escrow:</span>
                <span className="font-mono">{escrow ? `${escrow.slice(0, 6)}...${escrow.slice(-4)}` : "Not Set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Ethereum Escrow:</span>
                <span className="font-mono">
                  {ethereumEscrow && ethereumEscrow !== "0x0000000000000000000000000000000000000000"
                    ? `${ethereumEscrow.slice(0, 6)}...${ethereumEscrow.slice(-4)}`
                    : "Built-in"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Ethereum Para ID:</span>
                <span>{ethereumParaId && ethereumParaId > 0 ? ethereumParaId.toString() : "Built-in"}</span>
              </div>
            </div>
          </div>

          {/* XCM Fee Management */}
          <div>
            <h4 className="font-semibold mb-2">XCM Fee</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="opacity-70">Current Fee:</span>
                <div className="flex items-center gap-2">
                  <CurrencyDollarIcon className="w-4 h-4" />
                  <span className="font-mono">{xcmFee ? formatEther(xcmFee) : "0"} DOT</span>
                </div>
              </div>

              {minXcmFee && (
                <div className="flex justify-between">
                  <span className="opacity-70">Minimum Fee:</span>
                  <span className="font-mono">{formatEther(minXcmFee)} DOT</span>
                </div>
              )}

              {isOwner && (
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    placeholder="New fee (DOT)"
                    className="input input-sm input-bordered flex-1"
                    value={newFee}
                    onChange={e => setNewFee(e.target.value)}
                    step="0.001"
                    min={minXcmFee ? formatEther(minXcmFee) : "0.001"}
                  />
                  <button className="btn btn-sm btn-primary" onClick={updateXCMFee} disabled={isUpdatingFee || !newFee}>
                    {isUpdatingFee ? <span className="loading loading-spinner loading-xs"></span> : "Update"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Owner Actions */}
          {isOwner && (
            <div>
              <h4 className="font-semibold mb-2">Owner Actions</h4>
              <div className="flex gap-2">
                <button className="btn btn-sm btn-outline" onClick={withdrawFees}>
                  <CurrencyDollarIcon className="w-4 h-4" />
                  Withdraw Fees
                </button>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {bridgeStatus.status === "not-configured" && (
            <div className="alert alert-warning">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <div>
                <h3 className="font-bold">Bridge Not Configured</h3>
                <div className="text-sm">
                  The XCM bridge needs to be configured with escrow addresses and parachain ID.
                </div>
              </div>
            </div>
          )}

          {bridgeStatus.status === "partial" && (
            <div className="alert alert-info">
              <ClockIcon className="w-5 h-5" />
              <div>
                <h3 className="font-bold">Partial Configuration</h3>
                <div className="text-sm">Bridge is partially configured. Ethereum escrow address needs to be set.</div>
              </div>
            </div>
          )}

          {bridgeStatus.status === "configured" && (
            <div className="alert alert-success">
              <CheckCircleIcon className="w-5 h-5" />
              <div>
                <h3 className="font-bold">Bridge Ready</h3>
                <div className="text-sm">XCM bridge is fully configured and ready for cross-chain swaps.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default XCMBridgeStatus;
