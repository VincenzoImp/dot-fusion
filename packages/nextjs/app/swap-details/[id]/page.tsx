"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatEther } from "viem";
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon,
    CheckCircleIcon,
    ClockIcon,
    KeyIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { Address, InputBase } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { SwapTrackingData, getTrackedSwap, getStageInfo, addSwapTransaction, getExplorerUrl } from "~~/utils/swapTracking";
import { encodePacked, keccak256 } from "viem";

export default function SwapDetailsPage() {
    const params = useParams();
    const swapId = params.id as string;

    const [swap, setSwap] = useState<SwapTrackingData | null>(null);
    const [secretInput, setSecretInput] = useState("");
    const [isClaiming, setIsClaiming] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Contract hooks
    const { writeContractAsync: writeEthereumEscrow } = useScaffoldWriteContract({
        contractName: "DotFusionEthereumEscrow",
    });

    const { writeContractAsync: writePolkadotEscrow } = useScaffoldWriteContract({
        contractName: "DotFusionPolkadotEscrow",
    });

    // Load swap data
    useEffect(() => {
        if (swapId) {
            const data = getTrackedSwap(swapId);
            setSwap(data);
        }
    }, [swapId]);

    // Refresh swap data
    const refreshSwap = () => {
        setIsRefreshing(true);
        const data = getTrackedSwap(swapId);
        setSwap(data);
        setTimeout(() => setIsRefreshing(false), 500);
    };

    // Claim funds
    const claimFunds = async () => {
        if (!swap || !secretInput) {
            notification.error("Please enter the secret");
            return;
        }

        // Validate secret hash
        const computedHash = keccak256(encodePacked(["bytes32"], [secretInput as `0x${string}`]));
        if (computedHash !== swap.secretHash) {
            notification.error("Invalid secret - hash doesn't match");
            return;
        }

        setIsClaiming(true);

        try {
            let txHash: string;

            // Determine which chain to claim on
            const claimChain = swap.direction === "ETH_TO_DOT" ? "polkadot" : "ethereum";

            if (claimChain === "ethereum") {
                const tx = await writeEthereumEscrow({
                    functionName: "completeSwap",
                    args: [swap.swapId as `0x${string}`, secretInput as `0x${string}`],
                });
                txHash = tx || "";
            } else {
                const tx = await writePolkadotEscrow({
                    functionName: "completeSwap",
                    args: [swap.swapId as `0x${string}`, secretInput as `0x${string}`, swap.userAddress as `0x${string}`],
                });
                txHash = tx || "";
            }

            // Add transaction to tracking
            addSwapTransaction(swap.swapId, {
                txHash,
                chain: claimChain,
                stage: "USER_CLAIMED",
                explorerUrl: getExplorerUrl(claimChain, txHash),
            });

            notification.success("✅ Funds claimed successfully! The resolver will automatically claim their funds.");
            notification.info("🔄 Swap will be marked as COMPLETED once the resolver claims back their funds.", {
                duration: 8000,
            });
            refreshSwap();
        } catch (error: any) {
            console.error("Error claiming funds:", error);
            notification.error("Failed to claim funds: " + (error.message || "Unknown error"));
        } finally {
            setIsClaiming(false);
        }
    };

    if (!swap) {
        return (
            <div className="min-h-screen bg-base-100 flex items-center justify-center">
                <div className="card w-96 bg-base-200 shadow-xl">
                    <div className="card-body text-center">
                        <XCircleIcon className="w-16 h-16 text-error mx-auto mb-4" />
                        <h2 className="card-title justify-center">Swap Not Found</h2>
                        <p className="opacity-70">The swap you're looking for doesn't exist or has been deleted</p>
                        <Link href="/swaps" className="btn btn-primary mt-4">
                            <ArrowLeftIcon className="w-5 h-5" />
                            Back to My Swaps
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const stageInfo = getStageInfo(swap.currentStage);

    // User can claim when:
    // 1. Resolver has matched (fulfilled on destination chain)
    // 2. User is the maker (initiator of Fast Swap)
    // 3. Swap is not already claimed or completed
    const canClaim =
        (swap.currentStage === "RESOLVER_MATCHED" || swap.currentStage === "INITIATED") &&
        swap.role === "MAKER" &&
        swap.currentStage !== "USER_CLAIMED" &&
        swap.currentStage !== "COMPLETED";

    return (
        <div className="min-h-screen bg-base-100 py-8">
            <div className="max-w-5xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/swaps" className="btn btn-ghost btn-sm mb-4">
                            <ArrowLeftIcon className="w-5 h-5" />
                            Back to My Swaps
                        </Link>
                        <h1 className="text-4xl font-bold">Swap Details</h1>
                        <p className="text-lg opacity-70 mt-2">Track your cross-chain atomic swap</p>
                    </div>
                    <button
                        className={`btn btn-circle ${isRefreshing ? "loading" : ""}`}
                        onClick={refreshSwap}
                        disabled={isRefreshing}
                    >
                        {!isRefreshing && <ArrowPathIcon className="w-5 h-5" />}
                    </button>
                </div>

                {/* Current Status */}
                <div className="card bg-gradient-to-br from-base-200 to-base-300 shadow-xl mb-6 border-2 border-primary/20">
                    <div className="card-body">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                                    <span className="text-4xl">{stageInfo.icon}</span>
                                    {stageInfo.label}
                                </h2>
                                <p className="text-lg opacity-80">{stageInfo.description}</p>
                            </div>
                            <div className={`badge badge-lg badge-${stageInfo.color} text-lg px-6 py-4`}>
                                {swap.currentStage}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Swap Overview */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Amounts */}
                    <div className="card bg-base-200 shadow-xl">
                        <div className="card-body">
                            <h3 className="card-title mb-4">Swap Amounts</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                                    <div>
                                        <div className="text-sm opacity-70">You Send</div>
                                        <div className="text-2xl font-bold">{swap.sendAmount}</div>
                                    </div>
                                    <div className="badge badge-lg badge-primary">
                                        {swap.direction === "ETH_TO_DOT" ? "ETH" : "DOT"}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
                                    <div>
                                        <div className="text-sm opacity-70">You Receive</div>
                                        <div className="text-2xl font-bold text-success">{swap.receiveAmount}</div>
                                    </div>
                                    <div className="badge badge-lg badge-success">
                                        {swap.direction === "ETH_TO_DOT" ? "DOT" : "ETH"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Addresses */}
                    <div className="card bg-base-200 shadow-xl">
                        <div className="card-body">
                            <h3 className="card-title mb-4">Addresses</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm opacity-70 mb-1">Your Address</div>
                                    <Address address={swap.userAddress} />
                                </div>
                                <div>
                                    <div className="text-sm opacity-70 mb-1">Destination Address</div>
                                    <Address address={swap.destinationAddress} />
                                </div>
                                {swap.resolverAddress && (
                                    <div>
                                        <div className="text-sm opacity-70 mb-1">Resolver Address</div>
                                        <Address address={swap.resolverAddress} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Technical Details */}
                <div className="card bg-base-200 shadow-xl mb-6">
                    <div className="card-body">
                        <h3 className="card-title mb-4">Technical Details</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm opacity-70 mb-1">Swap ID</div>
                                <div className="font-mono text-xs bg-base-300 p-2 rounded break-all">{swap.swapId}</div>
                            </div>
                            <div>
                                <div className="text-sm opacity-70 mb-1">Secret Hash</div>
                                <div className="font-mono text-xs bg-base-300 p-2 rounded break-all">{swap.secretHash}</div>
                            </div>
                            <div>
                                <div className="text-sm opacity-70 mb-1">Direction</div>
                                <div className="badge badge-outline">{swap.direction}</div>
                            </div>
                            <div>
                                <div className="text-sm opacity-70 mb-1">Your Role</div>
                                <div className="badge badge-outline">{swap.role}</div>
                            </div>
                            <div>
                                <div className="text-sm opacity-70 mb-1">Created At</div>
                                <div className="text-sm">{new Date(swap.createdAt).toLocaleString()}</div>
                            </div>
                            {swap.completedAt && (
                                <div>
                                    <div className="text-sm opacity-70 mb-1">Completed At</div>
                                    <div className="text-sm">{new Date(swap.completedAt).toLocaleString()}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="card bg-base-200 shadow-xl mb-6">
                    <div className="card-body">
                        <h3 className="card-title mb-4">Transaction History</h3>
                        {swap.transactions.length === 0 ? (
                            <div className="text-center py-8 opacity-70">
                                <ClockIcon className="w-12 h-12 mx-auto mb-2" />
                                <p>No transactions yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {swap.transactions.map((tx, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 bg-base-300 rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-xl">{getStageInfo(tx.stage).icon}</span>
                                                <div>
                                                    <div className="font-semibold">{getStageInfo(tx.stage).label}</div>
                                                    <div className="text-sm opacity-70">
                                                        {new Date(tx.timestamp).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="badge badge-sm badge-outline">{tx.chain}</div>
                                                <div className="font-mono text-xs opacity-70">
                                                    {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                                                </div>
                                            </div>
                                        </div>
                                        <a
                                            href={tx.explorerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-sm btn-ghost"
                                        >
                                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                            View
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Claim Funds Section */}
                {canClaim && (
                    <div className="card bg-success/10 border-2 border-success/30 shadow-xl">
                        <div className="card-body">
                            <h3 className="card-title text-success mb-4">
                                <KeyIcon className="w-6 h-6" />
                                Ready to Claim Your Funds!
                            </h3>
                            <p className="mb-4">
                                The resolver has matched your swap. You can now claim your {swap.direction === "ETH_TO_DOT" ? "DOT" : "ETH"} by revealing your secret.
                            </p>

                            {swap.secret ? (
                                <div className="alert alert-info mb-4">
                                    <div>
                                        <div className="font-semibold">Your Secret (Keep Private!)</div>
                                        <div className="font-mono text-xs break-all mt-1">{swap.secret}</div>
                                    </div>
                                </div>
                            ) : null}

                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold">Enter Secret to Claim</span>
                                </label>
                                <InputBase
                                    value={secretInput}
                                    onChange={setSecretInput}
                                    placeholder="0x..."
                                />
                            </div>

                            <button
                                className="btn btn-success btn-lg w-full"
                                onClick={claimFunds}
                                disabled={isClaiming || !secretInput}
                            >
                                {isClaiming ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Claiming...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Claim My {swap.direction === "ETH_TO_DOT" ? "DOT" : "ETH"}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

