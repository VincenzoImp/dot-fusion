"use client";

import { useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowPathIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { Address, InputBase } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface AvailableSwap {
  swapId: string;
  secretHash: string;
  maker: string;
  taker: string;
  takerPolkadotAddress: string;
  ethAmount: bigint;
  dotAmount: bigint;
  unlockTime: bigint;
  chain: "ethereum" | "polkadot";
  blockNumber: bigint;
  transactionHash: string;
}

interface SwapParticipantProps {
  className?: string;
}

/**
 * Swap Participant Component
 * Allows users to find and participate in existing swaps
 */
export const SwapParticipant: React.FC<SwapParticipantProps> = ({ className = "" }) => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [searchSwapId, setSearchSwapId] = useState("");
  const [selectedSwap, setSelectedSwap] = useState<AvailableSwap | null>(null);
  const [isParticipating, setIsParticipating] = useState(false);
  const [polkadotAddress, setPolkadotAddress] = useState("");

  // Contract hooks
  const { writeContractAsync: writeEthereumEscrow } = useScaffoldWriteContract({
    contractName: "DotFusionEthereumEscrow",
  });

  const { writeContractAsync: writePolkadotEscrow } = useScaffoldWriteContract({
    contractName: "DotFusionPolkadotEscrow",
  });

  // Fetch available swaps from both networks
  const { data: ethSwapCreatedEvents, isLoading: isLoadingEth } = useScaffoldEventHistory({
    contractName: "DotFusionEthereumEscrow",
    eventName: "SwapCreated",
    fromBlock: 0n,
    watch: true,
    filters: {},
    chainId: 11155111, // Sepolia
  });

  const { data: dotSwapCreatedEvents, isLoading: isLoadingDot } = useScaffoldEventHistory({
    contractName: "DotFusionPolkadotEscrow",
    eventName: "SwapCreated",
    fromBlock: 0n,
    watch: true,
    filters: {},
    chainId: 420420422, // Paseo
  });

  const { data: ethSwapCompletedEvents } = useScaffoldEventHistory({
    contractName: "DotFusionEthereumEscrow",
    eventName: "SwapCompleted",
    fromBlock: 0n,
    watch: true,
    filters: {},
    chainId: 11155111, // Sepolia
  });

  const { data: dotSwapCompletedEvents } = useScaffoldEventHistory({
    contractName: "DotFusionPolkadotEscrow",
    eventName: "SwapCompleted",
    fromBlock: 0n,
    watch: true,
    filters: {},
    chainId: 420420422, // Paseo
  });

  const { data: ethSwapCancelledEvents } = useScaffoldEventHistory({
    contractName: "DotFusionEthereumEscrow",
    eventName: "SwapCancelled",
    fromBlock: 0n,
    watch: true,
    filters: {},
    chainId: 11155111, // Sepolia
  });

  const { data: dotSwapCancelledEvents } = useScaffoldEventHistory({
    contractName: "DotFusionPolkadotEscrow",
    eventName: "SwapCancelled",
    fromBlock: 0n,
    watch: true,
    filters: {},
    chainId: 420420422, // Paseo
  });

  // Process available swaps
  const availableSwaps = useMemo(() => {
    const swaps: AvailableSwap[] = [];

    // Process Ethereum swaps
    if (ethSwapCreatedEvents) {
      ethSwapCreatedEvents.forEach((event: any) => {
        const swapId = event.args.swapId;

        // Check if completed or cancelled
        const isCompleted = ethSwapCompletedEvents?.some((completed: any) => completed.args.swapId === swapId);
        const isCancelled = ethSwapCancelledEvents?.some((cancelled: any) => cancelled.args.swapId === swapId);

        if (!isCompleted && !isCancelled) {
          swaps.push({
            swapId,
            secretHash: event.args.secretHash,
            maker: event.args.maker,
            taker: event.args.taker,
            takerPolkadotAddress:
              event.args.polkadotSender || "0x0000000000000000000000000000000000000000000000000000000000000000",
            ethAmount: event.args.ethAmount,
            dotAmount: event.args.dotAmount,
            unlockTime: event.args.unlockTime,
            chain: "ethereum",
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
          });
        }
      });
    }

    // Process Polkadot swaps
    if (dotSwapCreatedEvents) {
      dotSwapCreatedEvents.forEach((event: any) => {
        const swapId = event.args.swapId;

        // Check if completed or cancelled
        const isCompleted = dotSwapCompletedEvents?.some((completed: any) => completed.args.swapId === swapId);
        const isCancelled = dotSwapCancelledEvents?.some((cancelled: any) => cancelled.args.swapId === swapId);

        if (!isCompleted && !isCancelled) {
          swaps.push({
            swapId,
            secretHash: event.args.secretHash,
            maker: event.args.maker,
            taker: event.args.taker,
            takerPolkadotAddress:
              event.args.polkadotSender || "0x0000000000000000000000000000000000000000000000000000000000000000",
            ethAmount: event.args.ethAmount || event.args.amount,
            dotAmount: event.args.dotAmount || event.args.amount,
            unlockTime: event.args.unlockTime,
            chain: "polkadot",
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
          });
        }
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

  // Filter swaps for current user
  const userAvailableSwaps = availableSwaps.filter(
    swap => swap.taker.toLowerCase() === connectedAddress?.toLowerCase(),
  );

  // Search for specific swap
  const searchSwap = () => {
    if (!searchSwapId) return;

    const foundSwap = availableSwaps.find(swap => swap.swapId.toLowerCase() === searchSwapId.toLowerCase());

    if (foundSwap) {
      setSelectedSwap(foundSwap);
      notification.success("Swap found!");
    } else {
      notification.error("Swap not found or not available");
    }
  };

  // Participate in swap
  const participateInSwap = async (swap: AvailableSwap) => {
    if (!isConnected || !connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!polkadotAddress) {
      notification.error("Please enter your Polkadot address");
      return;
    }

    if (swap.taker.toLowerCase() !== connectedAddress.toLowerCase()) {
      notification.error("You are not the intended taker for this swap");
      return;
    }

    setIsParticipating(true);

    try {
      if (swap.chain === "ethereum") {
        // Create matching swap on Polkadot
        // Calculate remaining timelock duration (Polkadot swap should have shorter timelock)
        const currentTime = Math.floor(Date.now() / 1000);
        const remainingTime = Math.max(0, Number(swap.unlockTime) - currentTime);
        const polkadotTimelock = Math.min(remainingTime, 6 * 3600); // Max 6 hours for Polkadot

        await writePolkadotEscrow({
          functionName: "createNativeSwap",
          args: [
            swap.swapId as `0x${string}`,
            swap.secretHash as `0x${string}`,
            swap.maker as `0x${string}`,
            BigInt(polkadotTimelock),
          ],
          value: swap.dotAmount,
        });
        notification.success("✅ DOT swap created on Polkadot!");
      } else {
        // Create matching swap on Ethereum
        // Calculate timelock duration (Ethereum swap should have longer timelock)
        const currentTime = Math.floor(Date.now() / 1000);
        const remainingTime = Math.max(0, Number(swap.unlockTime) - currentTime);
        const ethereumTimelock = Math.max(remainingTime * 2, 12 * 3600); // At least 12 hours for Ethereum

        await writeEthereumEscrow({
          functionName: "createSwap",
          args: [
            swap.swapId as `0x${string}`,
            swap.secretHash as `0x${string}`,
            polkadotAddress as `0x${string}`,
            swap.ethAmount,
            swap.dotAmount,
            BigInt(Math.floor((Number(swap.dotAmount) / Number(swap.ethAmount)) * 1e18)),
            BigInt(ethereumTimelock),
            swap.takerPolkadotAddress as `0x${string}`,
          ],
          value: swap.ethAmount,
        });
        notification.success("✅ ETH swap created on Ethereum!");
      }

      setSelectedSwap(null);
      setPolkadotAddress("");
    } catch (error) {
      console.error("Error participating in swap:", error);
      notification.error("Failed to participate in swap");
    } finally {
      setIsParticipating(false);
    }
  };

  // Check if swap can be cancelled
  const canCancel = (swap: AvailableSwap) => {
    const now = Math.floor(Date.now() / 1000);
    return Number(swap.unlockTime) <= now;
  };

  if (!isConnected) {
    return (
      <div className={`card bg-base-200 shadow-xl ${className}`}>
        <div className="card-body text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-warning mx-auto mb-4" />
          <h3 className="card-title justify-center">Connect Wallet</h3>
          <p className="opacity-70">Connect your wallet to participate in swaps</p>
        </div>
      </div>
    );
  }

  const isLoading = isLoadingEth || isLoadingDot;

  return (
    <div className={`card bg-base-200 shadow-xl ${className}`}>
      <div className="card-body">
        <h3 className="card-title mb-4">
          <PlusCircleIcon className="w-6 h-6" />
          Participate in Swaps
        </h3>

        {/* Search for specific swap */}
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Search for Swap</h4>
          <div className="flex gap-2">
            <InputBase value={searchSwapId} onChange={setSearchSwapId} placeholder="Enter Swap ID" />
            <button className="btn btn-primary" onClick={searchSwap} disabled={!searchSwapId}>
              <MagnifyingGlassIcon className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>

        {/* Available Swaps */}
        <div>
          <h4 className="font-semibold mb-4">Available Swaps ({userAvailableSwaps.length})</h4>

          {isLoading ? (
            <div className="text-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="mt-4 opacity-70">Loading swaps...</p>
            </div>
          ) : userAvailableSwaps.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="w-12 h-12 text-base-content/30 mx-auto mb-4" />
              <p className="opacity-70">No available swaps for you to participate in</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {userAvailableSwaps.map(swap => (
                <div key={swap.swapId} className="card bg-base-300 shadow-sm">
                  <div className="card-body p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="badge badge-outline">
                            {swap.chain === "ethereum" ? "Ethereum" : "Polkadot"}
                          </div>
                          {canCancel(swap) && <div className="badge badge-warning">Can Cancel</div>}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-semibold mb-1">Amounts</h5>
                            <div className="flex items-center gap-2 text-sm">
                              <CurrencyDollarIcon className="w-4 h-4" />
                              <span>{formatEther(swap.ethAmount)} ETH</span>
                              <ArrowPathIcon className="w-4 h-4" />
                              <span>{formatEther(swap.dotAmount)} DOT</span>
                            </div>
                          </div>

                          <div>
                            <h5 className="font-semibold mb-1">Maker</h5>
                            <Address address={swap.maker} />
                          </div>
                        </div>

                        <div className="mt-2">
                          <h5 className="font-semibold mb-1">Swap ID</h5>
                          <div className="font-mono text-xs bg-base-200 p-2 rounded">{swap.swapId}</div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button className="btn btn-sm btn-outline" onClick={() => setSelectedSwap(swap)}>
                          <MagnifyingGlassIcon className="w-4 h-4" />
                          View Details
                        </button>
                        <button className="btn btn-sm btn-success" onClick={() => setSelectedSwap(swap)}>
                          <PlusCircleIcon className="w-4 h-4" />
                          Participate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Swap Details Modal */}
        {selectedSwap && (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <h3 className="font-bold text-lg mb-4">Swap Details</h3>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Chain</span>
                    </label>
                    <div className="badge badge-outline">
                      {selectedSwap.chain === "ethereum" ? "Ethereum" : "Polkadot"}
                    </div>
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Status</span>
                    </label>
                    <div className="badge badge-warning">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      Available
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

                {/* Participation Form */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-4">Participate in Swap</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="label">
                        <span className="label-text font-semibold">Your Polkadot Address</span>
                      </label>
                      <InputBase
                        value={polkadotAddress}
                        onChange={setPolkadotAddress}
                        placeholder="1A2B3C4D5E6F7G8H9I0J..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-success flex-1"
                        onClick={() => participateInSwap(selectedSwap)}
                        disabled={isParticipating || !polkadotAddress}
                      >
                        {isParticipating ? (
                          <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                          <PlusCircleIcon className="w-4 h-4" />
                        )}
                        Participate
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => {
                          setSelectedSwap(null);
                          setPolkadotAddress("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-action">
                <button
                  className="btn"
                  onClick={() => {
                    setSelectedSwap(null);
                    setPolkadotAddress("");
                  }}
                >
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

export default SwapParticipant;
