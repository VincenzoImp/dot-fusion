"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import CancelSwap from "~~/components/CancelSwap";
import CompleteSwap from "~~/components/CompleteSwap";
import { Address } from "~~/components/scaffold-eth";

// import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth"; // Temporarily disabled to prevent infinite loops

type SwapState = "INVALID" | "OPEN" | "COMPLETED" | "CANCELLED";

interface SwapData {
  swapId: string;
  secretHash: string;
  maker: string;
  taker: string;
  token: string;
  amount: string;
  unlockTime: string;
  state: SwapState;
  transactionHash: string;
  blockNumber: number;
}

const MySwaps: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [swaps, setSwaps] = useState<SwapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSwap, setSelectedSwap] = useState<SwapData | null>(null);
  const [showCompleteSwap, setShowCompleteSwap] = useState(false);
  const [showCancelSwap, setShowCancelSwap] = useState(false);

  // Initialize with empty swaps to prevent infinite loops
  useEffect(() => {
    if (!connectedAddress) {
      setSwaps([]);
      setLoading(false);
      return;
    }

    // For now, just set empty swaps to prevent infinite loops
    // TODO: Implement proper event fetching without causing infinite loops
    setSwaps([]);
    setLoading(false);
  }, [connectedAddress]);

  const getStateIcon = (state: SwapState) => {
    switch (state) {
      case "COMPLETED":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "CANCELLED":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "OPEN":
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStateBadge = (state: SwapState) => {
    const baseClasses = "badge";
    switch (state) {
      case "COMPLETED":
        return `${baseClasses} badge-success`;
      case "CANCELLED":
        return `${baseClasses} badge-error`;
      case "OPEN":
        return `${baseClasses} badge-warning`;
      default:
        return `${baseClasses} badge-neutral`;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const isExpired = (unlockTime: string) => {
    return Date.now() / 1000 > Number(unlockTime);
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-warning mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Wallet Not Connected</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Please connect your wallet to view your swaps.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Swaps</h1>
            <p className="text-gray-600 dark:text-gray-300">View and manage your atomic swaps</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{swaps.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Swaps</div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-yellow-500">{swaps.filter(s => s.state === "OPEN").length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Open</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-green-500">
                {swaps.filter(s => s.state === "COMPLETED").length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Completed</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-red-500">{swaps.filter(s => s.state === "CANCELLED").length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Cancelled</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-blue-500">
                {formatEther(swaps.reduce((sum, swap) => sum + BigInt(swap.amount), 0n))}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Volume (ETH)</div>
            </div>
          </div>
        </div>

        {/* Swaps Table */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Swap History</h2>

            {loading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : swaps.length === 0 ? (
              <div className="text-center py-8">
                <ArrowPathIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Swaps Found</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  You haven&apos;t created or participated in any swaps yet.
                </p>
                <a href="/swap" className="btn btn-primary">
                  Create Your First Swap
                </a>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Swap ID</th>
                      <th>Role</th>
                      <th>Amount</th>
                      <th>State</th>
                      <th>Unlock Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {swaps.map(swap => (
                      <tr key={swap.swapId}>
                        <td>
                          <code className="text-xs">
                            {swap.swapId.slice(0, 8)}...{swap.swapId.slice(-8)}
                          </code>
                        </td>
                        <td>
                          <span
                            className={`badge ${swap.maker === connectedAddress ? "badge-primary" : "badge-secondary"}`}
                          >
                            {swap.maker === connectedAddress ? "Maker" : "Taker"}
                          </span>
                        </td>
                        <td>
                          <div className="font-mono">{formatEther(BigInt(swap.amount))} ETH</div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {getStateIcon(swap.state)}
                            <span className={getStateBadge(swap.state)}>{swap.state}</span>
                            {swap.state === "OPEN" && isExpired(swap.unlockTime) && (
                              <span className="badge badge-warning badge-outline">Expired</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">{formatTime(swap.unlockTime)}</div>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSwap(swap)}>
                              <EyeIcon className="h-4 w-4" />
                              View
                            </button>
                            {swap.state === "OPEN" && (
                              <>
                                {swap.taker === connectedAddress && (
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => {
                                      setSelectedSwap(swap);
                                      setShowCompleteSwap(true);
                                    }}
                                  >
                                    Complete
                                  </button>
                                )}
                                {swap.maker === connectedAddress && (
                                  <button
                                    className="btn btn-error btn-sm"
                                    onClick={() => {
                                      setSelectedSwap(swap);
                                      setShowCancelSwap(true);
                                    }}
                                  >
                                    Cancel
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Swap Details Modal */}
        {selectedSwap && (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <h3 className="font-bold text-lg mb-4">Swap Details</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Swap ID</span>
                    </label>
                    <div className="p-2 bg-base-200 rounded">
                      <code className="text-xs break-all">{selectedSwap.swapId}</code>
                    </div>
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">State</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {getStateIcon(selectedSwap.state)}
                      <span className={getStateBadge(selectedSwap.state)}>{selectedSwap.state}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Maker</span>
                    </label>
                    <Address address={selectedSwap.maker} />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Taker</span>
                    </label>
                    <Address address={selectedSwap.taker} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Amount</span>
                    </label>
                    <div className="p-2 bg-base-200 rounded">
                      <span className="font-mono">{formatEther(BigInt(selectedSwap.amount))} ETH</span>
                    </div>
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Unlock Time</span>
                    </label>
                    <div className="p-2 bg-base-200 rounded">
                      <span className="text-sm">{formatTime(selectedSwap.unlockTime)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Secret Hash</span>
                  </label>
                  <div className="p-2 bg-base-200 rounded">
                    <code className="text-xs break-all">{selectedSwap.secretHash}</code>
                  </div>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Transaction Hash</span>
                  </label>
                  <div className="p-2 bg-base-200 rounded">
                    <code className="text-xs break-all">{selectedSwap.transactionHash}</code>
                  </div>
                </div>
              </div>

              <div className="modal-action">
                <button className="btn" onClick={() => setSelectedSwap(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Swap Modal */}
        {showCompleteSwap && selectedSwap && (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <CompleteSwap
                swapId={selectedSwap.swapId}
                onComplete={() => {
                  setShowCompleteSwap(false);
                  setSelectedSwap(null);
                }}
              />
              <div className="modal-action">
                <button className="btn" onClick={() => setShowCompleteSwap(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Swap Modal */}
        {showCancelSwap && selectedSwap && (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <CancelSwap
                swapId={selectedSwap.swapId}
                onCancel={() => {
                  setShowCancelSwap(false);
                  setSelectedSwap(null);
                }}
              />
              <div className="modal-action">
                <button className="btn" onClick={() => setShowCancelSwap(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySwaps;
