"use client";

import { useMemo, useState } from "react";
import { NextPage } from "next";
import { encodePacked, formatEther, keccak256 } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  GlobeAltIcon,
  KeyIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Address, InputBase } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type SwapState = "INVALID" | "OPEN" | "COMPLETED" | "CANCELLED";

interface SwapData {
  swapId: string;
  secretHash: string;
  maker: string;
  taker: string;
  takerPolkadotAddress: string;
  ethAmount: bigint;
  dotAmount: bigint;
  unlockTime: bigint;
  state: SwapState;
  blockNumber: bigint;
  transactionHash: string;
  chain: "ethereum" | "polkadot";
}

interface SwapEvent {
  args: {
    swapId?: string;
    secretHash?: string;
    maker?: string;
    taker?: string;
    polkadotSender?: string;
    ethAmount?: bigint;
    dotAmount?: bigint;
    unlockTime?: bigint;
  };
  blockNumber: bigint;
  transactionHash: string;
}

const SwapsPage: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [selectedSwap, setSelectedSwap] = useState<SwapData | null>(null);
  const [secretInput, setSecretInput] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-swaps" | "available-swaps">("my-swaps");

  // Contract hooks
  const { writeContractAsync: writeEthereumEscrow } = useScaffoldWriteContract({
    contractName: "DotFusionEthereumEscrow",
  });

  const { writeContractAsync: writePolkadotEscrow } = useScaffoldWriteContract({
    contractName: "DotFusionPolkadotEscrow",
  });

  // Fetch Ethereum swap events
  const { data: ethSwapCreatedEvents, isLoading: isLoadingEthCreated } = useScaffoldEventHistory({
    contractName: "DotFusionEthereumEscrow",
    eventName: "SwapCreated",
    fromBlock: 0n,
    watch: true,
    filters: {},
  });

  const { data: ethSwapCompletedEvents, isLoading: isLoadingEthCompleted } = useScaffoldEventHistory({
    contractName: "DotFusionEthereumEscrow",
    eventName: "SwapCompleted",
    fromBlock: 0n,
    watch: true,
    filters: {},
  });

  const { data: ethSwapCancelledEvents, isLoading: isLoadingEthCancelled } = useScaffoldEventHistory({
    contractName: "DotFusionEthereumEscrow",
    eventName: "SwapCancelled",
    fromBlock: 0n,
    watch: true,
    filters: {},
  });

  // Fetch Polkadot swap events
  const { data: dotSwapCreatedEvents, isLoading: isLoadingDotCreated } = useScaffoldEventHistory({
    contractName: "DotFusionPolkadotEscrow",
    eventName: "SwapCreated",
    fromBlock: 0n,
    watch: true,
    filters: {},
  });

  const { data: dotSwapCompletedEvents, isLoading: isLoadingDotCompleted } = useScaffoldEventHistory({
    contractName: "DotFusionPolkadotEscrow",
    eventName: "SwapCompleted",
    fromBlock: 0n,
    watch: true,
    filters: {},
  });

  const { data: dotSwapCancelledEvents, isLoading: isLoadingDotCancelled } = useScaffoldEventHistory({
    contractName: "DotFusionPolkadotEscrow",
    eventName: "SwapCancelled",
    fromBlock: 0n,
    watch: true,
    filters: {},
  });

  // Process and combine all swaps
  const allSwaps = useMemo(() => {
    const swaps: SwapData[] = [];

    // Process Ethereum swaps
    if (ethSwapCreatedEvents) {
      ethSwapCreatedEvents.forEach((event: SwapEvent) => {
        const swapId = event.args.swapId;
        if (
          !swapId ||
          !event.args.secretHash ||
          !event.args.maker ||
          !event.args.taker ||
          !event.args.ethAmount ||
          !event.args.dotAmount ||
          !event.args.unlockTime
        )
          return;

        // Check if completed
        const isCompleted = ethSwapCompletedEvents?.some((completed: any) => completed.args.swapId === swapId);

        // Check if cancelled
        const isCancelled = ethSwapCancelledEvents?.some((cancelled: any) => cancelled.args.swapId === swapId);

        swaps.push({
          swapId,
          secretHash: event.args.secretHash,
          maker: event.args.maker,
          taker: event.args.taker,
          takerPolkadotAddress: event.args.polkadotSender || "",
          ethAmount: event.args.ethAmount,
          dotAmount: event.args.dotAmount,
          unlockTime: event.args.unlockTime,
          state: isCompleted ? "COMPLETED" : isCancelled ? "CANCELLED" : "OPEN",
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          chain: "ethereum",
        });
      });
    }

    // Process Polkadot swaps
    if (dotSwapCreatedEvents) {
      dotSwapCreatedEvents.forEach((event: SwapEvent) => {
        const swapId = event.args.swapId;
        if (
          !swapId ||
          !event.args.secretHash ||
          !event.args.maker ||
          !event.args.taker ||
          !event.args.ethAmount ||
          !event.args.dotAmount ||
          !event.args.unlockTime
        )
          return;

        // Check if completed
        const isCompleted = dotSwapCompletedEvents?.some((completed: any) => completed.args.swapId === swapId);

        // Check if cancelled
        const isCancelled = dotSwapCancelledEvents?.some((cancelled: any) => cancelled.args.swapId === swapId);

        swaps.push({
          swapId,
          secretHash: event.args.secretHash,
          maker: event.args.maker,
          taker: event.args.taker,
          takerPolkadotAddress: event.args.polkadotSender || "",
          ethAmount: event.args.ethAmount,
          dotAmount: event.args.dotAmount,
          unlockTime: event.args.unlockTime,
          state: isCompleted ? "COMPLETED" : isCancelled ? "CANCELLED" : "OPEN",
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          chain: "polkadot",
        });
      });
    }

    return swaps.sort((a, b) => Number(b.blockNumber - a.blockNumber));
  }, [
    ethSwapCreatedEvents,
    ethSwapCompletedEvents,
    ethSwapCancelledEvents,
    dotSwapCreatedEvents,
    dotSwapCompletedEvents,
    dotSwapCancelledEvents,
  ]);

  // Filter swaps based on active tab
  const filteredSwaps = useMemo(() => {
    if (!connectedAddress) return [];

    if (activeTab === "my-swaps") {
      return allSwaps.filter(
        swap =>
          swap.maker.toLowerCase() === connectedAddress.toLowerCase() ||
          swap.taker.toLowerCase() === connectedAddress.toLowerCase(),
      );
    } else {
      return allSwaps.filter(
        swap => swap.state === "OPEN" && swap.taker.toLowerCase() === connectedAddress.toLowerCase(),
      );
    }
  }, [allSwaps, connectedAddress, activeTab]);

  // Check if swap can be cancelled
  const canCancel = (swap: SwapData) => {
    const now = Math.floor(Date.now() / 1000);
    return swap.state === "OPEN" && Number(swap.unlockTime) <= now;
  };

  // Complete swap
  const completeSwap = async (swap: SwapData) => {
    if (!secretInput) {
      notification.error("Please enter the secret");
      return;
    }

    // Validate secret
    const secretHash = keccak256(encodePacked(["bytes32"], [secretInput as `0x${string}`]));
    if (secretHash !== swap.secretHash) {
      notification.error("Invalid secret");
      return;
    }

    setIsCompleting(true);

    try {
      if (swap.chain === "ethereum") {
        await writeEthereumEscrow({
          functionName: "completeSwap",
          args: [swap.swapId as `0x${string}`, secretInput as `0x${string}`],
        });
      } else {
        await writePolkadotEscrow({
          functionName: "completeSwap",
          args: [swap.swapId as `0x${string}`, secretInput as `0x${string}`, swap.taker],
        });
      }

      notification.success("✅ Swap completed successfully!");
      setSecretInput("");
      setSelectedSwap(null);
    } catch (error) {
      console.error("Error completing swap:", error);
      notification.error("Failed to complete swap");
    } finally {
      setIsCompleting(false);
    }
  };

  // Cancel swap
  const cancelSwap = async (swap: SwapData) => {
    if (!canCancel(swap)) {
      notification.error("Swap cannot be cancelled yet");
      return;
    }

    setIsCancelling(true);

    try {
      if (swap.chain === "ethereum") {
        await writeEthereumEscrow({
          functionName: "cancelSwap",
          args: [swap.swapId as `0x${string}`],
        });
      } else {
        await writePolkadotEscrow({
          functionName: "cancelSwap",
          args: [swap.swapId as `0x${string}`],
        });
      }

      notification.success("✅ Swap cancelled successfully!");
      setSelectedSwap(null);
    } catch (error) {
      console.error("Error cancelling swap:", error);
      notification.error("Failed to cancel swap");
    } finally {
      setIsCancelling(false);
    }
  };

  // Get state color
  const getStateColor = (state: SwapState) => {
    switch (state) {
      case "OPEN":
        return "text-warning";
      case "COMPLETED":
        return "text-success";
      case "CANCELLED":
        return "text-error";
      default:
        return "text-base-content";
    }
  };

  // Get state icon
  const getStateIcon = (state: SwapState) => {
    switch (state) {
      case "OPEN":
        return <ClockIcon className="w-5 h-5" />;
      case "COMPLETED":
        return <CheckCircleIcon className="w-5 h-5" />;
      case "CANCELLED":
        return <XCircleIcon className="w-5 h-5" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5" />;
    }
  };

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

  const isLoading =
    isLoadingEthCreated ||
    isLoadingEthCompleted ||
    isLoadingEthCancelled ||
    isLoadingDotCreated ||
    isLoadingDotCompleted ||
    isLoadingDotCancelled;

  return (
    <div className="min-h-screen bg-base-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Atomic Swaps</h1>
          <p className="text-lg opacity-70">Manage your cross-chain atomic swaps</p>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed justify-center mb-8">
          <button
            className={`tab ${activeTab === "my-swaps" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("my-swaps")}
          >
            <EyeIcon className="w-5 h-5 mr-2" />
            My Swaps ({filteredSwaps.length})
          </button>
          <button
            className={`tab ${activeTab === "available-swaps" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("available-swaps")}
          >
            <GlobeAltIcon className="w-5 h-5 mr-2" />
            Available Swaps
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
            <p className="mt-4 opacity-70">Loading swaps...</p>
          </div>
        ) : filteredSwaps.length === 0 ? (
          <div className="text-center py-12">
            <GlobeAltIcon className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {activeTab === "my-swaps" ? "No Swaps Found" : "No Available Swaps"}
            </h3>
            <p className="opacity-70">
              {activeTab === "my-swaps"
                ? "You haven't created or participated in any swaps yet."
                : "There are no open swaps available for you to participate in."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredSwaps.map(swap => (
              <div key={swap.swapId} className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Swap Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`badge badge-lg ${getStateColor(swap.state)}`}>
                          {getStateIcon(swap.state)}
                          <span className="ml-2">{swap.state}</span>
                        </div>
                        <div className="badge badge-outline">{swap.chain === "ethereum" ? "Ethereum" : "Polkadot"}</div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-semibold mb-2">Amounts</h3>
                          <div className="flex items-center gap-2">
                            <CurrencyDollarIcon className="w-4 h-4" />
                            <span>{formatEther(swap.ethAmount)} ETH</span>
                            <ArrowPathIcon className="w-4 h-4" />
                            <span>{formatEther(swap.dotAmount)} DOT</span>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Participants</h3>
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="opacity-70">Maker:</span> <Address address={swap.maker} />
                            </div>
                            <div className="text-sm">
                              <span className="opacity-70">Taker:</span> <Address address={swap.taker} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h3 className="font-semibold mb-2">Swap ID</h3>
                        <div className="font-mono text-sm bg-base-300 p-2 rounded">{swap.swapId}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button className="btn btn-sm btn-outline" onClick={() => setSelectedSwap(swap)}>
                        <EyeIcon className="w-4 h-4" />
                        View Details
                      </button>

                      {swap.state === "OPEN" && (
                        <>
                          {connectedAddress && swap.taker.toLowerCase() === connectedAddress.toLowerCase() && (
                            <button className="btn btn-sm btn-success" onClick={() => setSelectedSwap(swap)}>
                              <KeyIcon className="w-4 h-4" />
                              Complete
                            </button>
                          )}

                          {canCancel(swap) && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => cancelSwap(swap)}
                              disabled={isCancelling}
                            >
                              {isCancelling ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                <XCircleIcon className="w-4 h-4" />
                              )}
                              Cancel
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Swap Details Modal */}
        {selectedSwap && (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <h3 className="font-bold text-lg mb-4">Swap Details</h3>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">State</span>
                    </label>
                    <div className={`badge ${getStateColor(selectedSwap.state)}`}>
                      {getStateIcon(selectedSwap.state)}
                      <span className="ml-2">{selectedSwap.state}</span>
                    </div>
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Chain</span>
                    </label>
                    <div className="badge badge-outline">
                      {selectedSwap.chain === "ethereum" ? "Ethereum" : "Polkadot"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Amounts</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatEther(selectedSwap.ethAmount)}</div>
                      <div className="text-sm opacity-70">ETH</div>
                    </div>
                    <ArrowPathIcon className="w-6 h-6" />
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatEther(selectedSwap.dotAmount)}</div>
                      <div className="text-sm opacity-70">DOT</div>
                    </div>
                  </div>
                </div>

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

                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Taker Polkadot Address</span>
                  </label>
                  <div className="font-mono text-sm bg-base-300 p-2 rounded">{selectedSwap.takerPolkadotAddress}</div>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Unlock Time</span>
                  </label>
                  <div className="text-sm">{new Date(Number(selectedSwap.unlockTime) * 1000).toLocaleString()}</div>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Secret Hash</span>
                  </label>
                  <div className="font-mono text-sm bg-base-300 p-2 rounded break-all">{selectedSwap.secretHash}</div>
                </div>

                {/* Complete Swap Form */}
                {selectedSwap.state === "OPEN" &&
                  connectedAddress &&
                  selectedSwap.taker.toLowerCase() === connectedAddress.toLowerCase() && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-4">Complete Swap</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="label">
                            <span className="label-text font-semibold">Secret</span>
                          </label>
                          <InputBase value={secretInput} onChange={setSecretInput} placeholder="0x..." />
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-success flex-1"
                            onClick={() => completeSwap(selectedSwap)}
                            disabled={isCompleting || !secretInput}
                          >
                            {isCompleting ? (
                              <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                              <CheckCircleIcon className="w-4 h-4" />
                            )}
                            Complete Swap
                          </button>
                          <button className="btn btn-outline" onClick={() => setSelectedSwap(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              <div className="modal-action">
                <button className="btn" onClick={() => setSelectedSwap(null)}>
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

export default SwapsPage;
