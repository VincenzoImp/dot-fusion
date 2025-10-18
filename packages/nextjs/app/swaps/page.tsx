"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  GlobeAltIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { SwapTrackingData, getStageInfo, getUserSwaps } from "~~/utils/swapTracking";

type FilterType = "all" | "active" | "completed" | "failed";

const MySwapsPage: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();

  const [swaps, setSwaps] = useState<SwapTrackingData[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load swaps from tracking
  useEffect(() => {
    if (connectedAddress) {
      const userSwaps = getUserSwaps(connectedAddress);
      setSwaps(userSwaps);
    }
  }, [connectedAddress]);

  // Refresh swaps
  const refreshSwaps = () => {
    setIsRefreshing(true);
    if (connectedAddress) {
      const userSwaps = getUserSwaps(connectedAddress);
      setSwaps(userSwaps);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter swaps
  const filteredSwaps = useMemo(() => {
    let filtered = swaps;

    switch (filter) {
      case "active":
        filtered = swaps.filter(
          s => s.currentStage !== "COMPLETED" && s.currentStage !== "FAILED" && s.currentStage !== "REFUNDED",
        );
        break;
      case "completed":
        filtered = swaps.filter(s => s.currentStage === "COMPLETED");
        break;
      case "failed":
        filtered = swaps.filter(s => s.currentStage === "FAILED" || s.currentStage === "REFUNDED");
        break;
      default:
        filtered = swaps;
    }

    // Sort by creation time (newest first)
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [swaps, filter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = swaps.length;
    const active = swaps.filter(
      s => s.currentStage !== "COMPLETED" && s.currentStage !== "FAILED" && s.currentStage !== "REFUNDED",
    ).length;
    const completed = swaps.filter(s => s.currentStage === "COMPLETED").length;
    const failed = swaps.filter(s => s.currentStage === "FAILED" || s.currentStage === "REFUNDED").length;

    return { total, active, completed, failed };
  }, [swaps]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="card w-96 bg-base-200 shadow-xl">
          <div className="card-body text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="card-title justify-center">Wallet Not Connected</h2>
            <p className="opacity-70">Please connect your wallet to view your swaps</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">My Swaps</h1>
            <p className="text-lg opacity-70">Track all your cross-chain atomic swaps</p>
          </div>
          <button
            className={`btn btn-circle ${isRefreshing ? "loading" : ""}`}
            onClick={refreshSwaps}
            disabled={isRefreshing}
          >
            {!isRefreshing && <ArrowPathIcon className="w-5 h-5" />}
          </button>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body text-center p-6">
              <GlobeAltIcon className="w-10 h-10 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-sm opacity-70">Total Swaps</div>
            </div>
          </div>
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body text-center p-6">
              <ClockIcon className="w-10 h-10 text-warning mx-auto mb-2" />
              <div className="text-3xl font-bold">{stats.active}</div>
              <div className="text-sm opacity-70">Active</div>
            </div>
          </div>
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body text-center p-6">
              <CheckCircleIcon className="w-10 h-10 text-success mx-auto mb-2" />
              <div className="text-3xl font-bold">{stats.completed}</div>
              <div className="text-sm opacity-70">Completed</div>
            </div>
          </div>
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body text-center p-6">
              <XCircleIcon className="w-10 h-10 text-error mx-auto mb-2" />
              <div className="text-3xl font-bold">{stats.failed}</div>
              <div className="text-sm opacity-70">Failed/Refunded</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="tabs tabs-boxed justify-center mb-8">
          <button className={`tab ${filter === "all" ? "tab-active" : ""}`} onClick={() => setFilter("all")}>
            All ({stats.total})
          </button>
          <button className={`tab ${filter === "active" ? "tab-active" : ""}`} onClick={() => setFilter("active")}>
            Active ({stats.active})
          </button>
          <button
            className={`tab ${filter === "completed" ? "tab-active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            Completed ({stats.completed})
          </button>
          <button className={`tab ${filter === "failed" ? "tab-active" : ""}`} onClick={() => setFilter("failed")}>
            Failed ({stats.failed})
          </button>
        </div>

        {/* Swaps List */}
        {filteredSwaps.length === 0 ? (
          <div className="text-center py-12">
            <GlobeAltIcon className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Swaps Found</h3>
            <p className="opacity-70 mb-6">
              {filter === "all" ? "You haven't created any swaps yet." : `No ${filter} swaps found.`}
            </p>
            <Link href="/swap-simple" className="btn btn-primary">
              Create Your First Swap
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredSwaps.map(swap => {
              const stageInfo = getStageInfo(swap.currentStage);
              const canClaim = swap.currentStage === "RESOLVER_MATCHED" && swap.role === "MAKER";

              return (
                <div key={swap.swapId} className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
                  <div className="card-body">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Left: Swap Info */}
                      <div className="flex-1">
                        {/* Status Badge */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`badge badge-lg badge-${stageInfo.color} gap-2`}>
                            <span className="text-xl">{stageInfo.icon}</span>
                            {stageInfo.label}
                          </div>
                          <div className="badge badge-outline">
                            {swap.direction === "ETH_TO_DOT" ? "ETH → DOT" : "DOT → ETH"}
                          </div>
                          {canClaim && <div className="badge badge-success gap-1">✨ Ready to Claim</div>}
                        </div>

                        {/* Amounts */}
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="badge badge-primary">Send</div>
                            <div>
                              <div className="font-bold">{swap.sendAmount}</div>
                              <div className="text-sm opacity-70">
                                {swap.direction === "ETH_TO_DOT" ? "ETH" : "DOT"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="badge badge-success">Receive</div>
                            <div>
                              <div className="font-bold text-success">{swap.receiveAmount}</div>
                              <div className="text-sm opacity-70">
                                {swap.direction === "ETH_TO_DOT" ? "DOT" : "ETH"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Addresses */}
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-xs opacity-60 mb-1">Your Address</div>
                            <Address address={swap.userAddress} />
                          </div>
                          <div>
                            <div className="text-xs opacity-60 mb-1">Destination</div>
                            <Address address={swap.destinationAddress} />
                          </div>
                        </div>

                        {/* Transactions */}
                        {swap.transactions.length > 0 && (
                          <div>
                            <div className="text-xs opacity-60 mb-2">Transactions: {swap.transactions.length}</div>
                            <div className="flex gap-2 flex-wrap">
                              {swap.transactions.map((tx, idx) => (
                                <a
                                  key={idx}
                                  href={tx.explorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="badge badge-sm badge-outline hover:badge-primary transition-colors"
                                >
                                  {tx.chain} • {tx.txHash.slice(0, 6)}...
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex gap-4 mt-4 text-sm opacity-70">
                          <div>
                            <span className="font-semibold">Created:</span> {new Date(swap.createdAt).toLocaleString()}
                          </div>
                          {swap.completedAt && (
                            <div>
                              <span className="font-semibold">Completed:</span>{" "}
                              {new Date(swap.completedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col gap-2 lg:min-w-[200px]">
                        <Link
                          href={`/swap-details/${swap.swapId}`}
                          className={`btn ${canClaim ? "btn-primary" : "btn-outline"} btn-block`}
                        >
                          <EyeIcon className="w-5 h-5" />
                          {canClaim ? "Claim Now" : "View Details"}
                        </Link>

                        {swap.swapId && (
                          <div className="text-xs opacity-60 text-center mt-2">ID: {swap.swapId.slice(0, 8)}...</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Card */}
        <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 shadow-xl mt-8">
          <div className="card-body">
            <h3 className="card-title">💡 Swap Tracking</h3>
            <div className="text-sm space-y-2">
              <p>• Your swaps are tracked locally in your browser and linked to your wallet address.</p>
              <p>• Click on any swap to see detailed transaction history with explorer links.</p>
              <p>• &quot;Active&quot; swaps need your attention to claim or may be waiting for the resolver.</p>
              <p>• Keep your secret safe - you&apos;ll need it to claim your funds!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MySwapsPage;
