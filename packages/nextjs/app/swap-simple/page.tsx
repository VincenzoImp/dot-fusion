"use client";

import { useEffect, useState } from "react";
import { NextPage } from "next";
import { encodePacked, keccak256, parseEther, toHex } from "viem";
import { useAccount } from "wagmi";
import {
    ArrowRightIcon,
    ArrowsRightLeftIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    LockClosedIcon,
    SparklesIcon,
    BoltIcon,
    ShieldCheckIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import { AddressInput, EtherInput } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type SwapDirection = "ETH_TO_DOT" | "DOT_TO_ETH";

// Fixed exchange rate: 1 ETH = 100,000 DOT
const FIXED_EXCHANGE_RATE = 100000;

// Resolver address (this should match the address in resolver-service.ts)
const RESOLVER_ADDRESS = process.env.NEXT_PUBLIC_RESOLVER_ADDRESS || "0x0000000000000000000000000000000000000000";

// Resolver status
interface ResolverStatus {
    online: boolean;
    resolverAddress: string;
    exchangeRate: number;
}

/**
 * Simplified Swap Page - Works with Resolver Service
 * 
 * Users only need to:
 * 1. Choose direction (ETH->DOT or DOT->ETH)
 * 2. Enter destination address
 * 3. Enter amount
 * 4. Click swap
 * 
 * The resolver service automatically fulfills the swap!
 */
const SimpleSwapPage: NextPage = () => {
    const { address: connectedAddress, isConnected } = useAccount();

    // Form state
    const [direction, setDirection] = useState<SwapDirection>("ETH_TO_DOT");
    const [destinationAddress, setDestinationAddress] = useState<string>("");
    const [sendAmount, setSendAmount] = useState<string>("");
    const [receiveAmount, setReceiveAmount] = useState<string>("");

    // Transaction state
    const [isCreating, setIsCreating] = useState(false);
    const [swapCreated, setSwapCreated] = useState(false);
    const [swapId, setSwapId] = useState<string>("");
    const [secretHash, setSecretHash] = useState<string>("");

    // Resolver status
    const [resolverStatus, setResolverStatus] = useState<ResolverStatus | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);

    // Contract hooks
    const { writeContractAsync: writeEthereumEscrow } = useScaffoldWriteContract({
        contractName: "DotFusionEthereumEscrow",
    });

    const { writeContractAsync: writePolkadotEscrow } = useScaffoldWriteContract({
        contractName: "DotFusionPolkadotEscrow",
    });

    // Read timelock constraints
    const { data: ethMinTimelock } = useScaffoldReadContract({
        contractName: "DotFusionEthereumEscrow",
        functionName: "MIN_TIMELOCK",
    });

    const { data: dotMaxTimelock } = useScaffoldReadContract({
        contractName: "DotFusionPolkadotEscrow",
        functionName: "MAX_TIMELOCK",
    });

    // Fetch resolver status on mount
    useEffect(() => {
        const fetchResolverStatus = async () => {
            try {
                const response = await fetch("/api/resolver/status");
                if (response.ok) {
                    const data = await response.json();
                    setResolverStatus({
                        online: data.status === "online",
                        resolverAddress: data.resolverAddress,
                        exchangeRate: data.exchangeRate?.ethToDot || FIXED_EXCHANGE_RATE,
                    });
                } else {
                    setResolverStatus({
                        online: false,
                        resolverAddress: RESOLVER_ADDRESS,
                        exchangeRate: FIXED_EXCHANGE_RATE,
                    });
                }
            } catch (error) {
                setResolverStatus({
                    online: false,
                    resolverAddress: RESOLVER_ADDRESS,
                    exchangeRate: FIXED_EXCHANGE_RATE,
                });
            } finally {
                setLoadingStatus(false);
            }
        };

        fetchResolverStatus();
    }, []);

    // Auto-calculate receive amount
    useEffect(() => {
        const send = parseFloat(sendAmount);

        if (send > 0) {
            if (direction === "ETH_TO_DOT") {
                setReceiveAmount((send * FIXED_EXCHANGE_RATE).toFixed(4));
            } else {
                setReceiveAmount((send / FIXED_EXCHANGE_RATE).toFixed(8));
            }
        } else {
            setReceiveAmount("");
        }
    }, [sendAmount, direction]);

    /**
     * Convert address to bytes32 (pad with zeros)
     */
    const addressToBytes32 = (address: string): `0x${string}` => {
        if (!address || address === "0x") {
            return "0x0000000000000000000000000000000000000000000000000000000000000000";
        }
        return `0x${address.slice(2).padStart(64, "0")}` as `0x${string}`;
    };

    /**
     * Generate cryptographically secure random secret
     */
    const generateSecret = () => {
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        const secretHex = `0x${Array.from(randomBytes)
            .map(b => b.toString(16).padStart(2, "0"))
            .join("")}`;

        const hash = keccak256(encodePacked(["bytes32"], [secretHex as `0x${string}`]));

        return { secret: secretHex, secretHash: hash };
    };

    /**
     * Toggle swap direction
     */
    const toggleDirection = () => {
        setDirection(direction === "ETH_TO_DOT" ? "DOT_TO_ETH" : "ETH_TO_DOT");
    };

    /**
     * Create the swap
     */
    const createSwap = async () => {
        if (!isConnected) {
            notification.error("Please connect your wallet");
            return;
        }

        if (!destinationAddress) {
            notification.error("Please enter destination address");
            return;
        }

        if (!sendAmount || !receiveAmount) {
            notification.error("Please enter send amount");
            return;
        }

        const send = parseFloat(sendAmount);
        if (send <= 0) {
            notification.error("Amount must be greater than 0");
            return;
        }

        // Generate secret and swap ID
        const { secret, secretHash } = generateSecret();
        const timestamp = Date.now();
        const id = keccak256(toHex(`swap_${connectedAddress}_${timestamp}`));

        setSecretHash(secretHash);
        setSwapId(id);
        setIsCreating(true);

        try {
            if (direction === "ETH_TO_DOT") {
                // User sends ETH, receives DOT
                // Step 1: Create swap on Ethereum
                const timelockSeconds = ethMinTimelock ? Number(ethMinTimelock) : 12 * 3600;

                await writeEthereumEscrow({
                    functionName: "createSwap",
                    args: [
                        id as `0x${string}`,
                        secretHash as `0x${string}`,
                        RESOLVER_ADDRESS as `0x${string}`, // Resolver is the taker
                        parseEther(sendAmount),
                        parseEther(receiveAmount),
                        BigInt(FIXED_EXCHANGE_RATE * 1e18),
                        BigInt(timelockSeconds),
                        addressToBytes32(destinationAddress), // User's destination DOT address
                    ],
                    value: parseEther(sendAmount),
                });

                // Step 2: Call resolver API to fulfill with DOT
                try {
                    const response = await fetch("http://localhost:3001/fulfill-eth-to-dot", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            swapId: id,
                            secretHash,
                            maker: connectedAddress,
                            ethAmount: sendAmount,
                            dotAmount: receiveAmount,
                        }),
                    });

                    if (response.ok) {
                        notification.success("✅ Swap created and fulfilled by resolver!");
                    } else {
                        notification.warning("⚠️ Swap created but resolver fulfillment pending...");
                    }
                } catch (apiError) {
                    console.error("Resolver API error:", apiError);
                    notification.warning("⚠️ Swap created but resolver may be offline");
                }

            } else {
                // User sends DOT, receives ETH
                // Step 1: Create swap on Polkadot
                const timelockSeconds = dotMaxTimelock ? Number(dotMaxTimelock) : 6 * 3600;

                await writePolkadotEscrow({
                    functionName: "createNativeSwap",
                    args: [
                        id as `0x${string}`,
                        secretHash as `0x${string}`,
                        destinationAddress as `0x${string}`, // User's destination ETH address  
                        BigInt(timelockSeconds),
                    ],
                    value: parseEther(sendAmount),
                });

                // Step 2: Call resolver API to fulfill with ETH
                try {
                    const response = await fetch("http://localhost:3001/fulfill-dot-to-eth", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            swapId: id,
                            secretHash,
                            taker: connectedAddress,
                            dotAmount: sendAmount,
                        }),
                    });

                    if (response.ok) {
                        notification.success("✅ Swap created and fulfilled by resolver!");
                    } else {
                        notification.warning("⚠️ Swap created but resolver fulfillment pending...");
                    }
                } catch (apiError) {
                    console.error("Resolver API error:", apiError);
                    notification.warning("⚠️ Swap created but resolver may be offline");
                }
            }

            setSwapCreated(true);
        } catch (error: any) {
            console.error("Error creating swap:", error);
            notification.error("Failed to create swap: " + (error.message || "Unknown error"));
        } finally {
            setIsCreating(false);
        }
    };

    /**
     * Reset form
     */
    const resetForm = () => {
        setDestinationAddress("");
        setSendAmount("");
        setReceiveAmount("");
        setSwapCreated(false);
        setSwapId("");
        setSecretHash("");
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-base-100 flex items-center justify-center">
                <div className="card w-96 bg-base-200 shadow-xl">
                    <div className="card-body text-center">
                        <ExclamationTriangleIcon className="w-16 h-16 text-warning mx-auto mb-4" />
                        <h2 className="card-title justify-center">Wallet Not Connected</h2>
                        <p className="opacity-70">Please connect your wallet to swap</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-base-100 via-base-200 to-base-100 py-8">
            <div className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <BoltIcon className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Instant Swap
                        </h1>
                    </div>
                    <p className="text-xl opacity-80 mb-4">Lightning-fast cross-chain swaps</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        <div className={`badge badge-lg ${resolverStatus?.online ? "badge-success" : "badge-warning"}`}>
                            <div className={`w-2 h-2 rounded-full mr-2 ${resolverStatus?.online ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}></div>
                            {loadingStatus ? "Checking..." : resolverStatus?.online ? "Resolver Online" : "Resolver Offline"}
                        </div>
                        <div className="badge badge-lg badge-ghost">
                            <ShieldCheckIcon className="w-4 h-4 mr-1" />
                            Trustless
                        </div>
                        <div className="badge badge-lg badge-ghost">
                            <ClockIcon className="w-4 h-4 mr-1" />
                            ~2 minutes
                        </div>
                    </div>
                </div>

                {!swapCreated ? (
                    <div className="space-y-6">
                        {/* Resolver Status Alert */}
                        {!loadingStatus && !resolverStatus?.online && (
                            <div className="alert alert-warning">
                                <ExclamationTriangleIcon className="w-6 h-6" />
                                <div>
                                    <h3 className="font-bold">Resolver Service Offline</h3>
                                    <p className="text-sm">
                                        The automatic resolver service is not running. Your swap will not be automatically fulfilled.
                                        Please check the documentation to start the resolver service.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Main Swap Card */}
                        <div className="card bg-base-200 shadow-2xl border border-base-300">
                            <div className="card-body p-8">
                                {/* Exchange Rate Banner */}
                                <div className="alert mb-6 bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/30">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/20 rounded-full">
                                            <ArrowRightIcon className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg">Fixed Exchange Rate</h4>
                                            <p className="text-sm opacity-90">
                                                1 ETH = {(resolverStatus?.exchangeRate || FIXED_EXCHANGE_RATE).toLocaleString()} DOT
                                                <span className="mx-2">•</span>
                                                1 DOT = {(1 / (resolverStatus?.exchangeRate || FIXED_EXCHANGE_RATE)).toFixed(8)} ETH
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Direction Toggle */}
                                <div className="flex items-center justify-center gap-6 mb-8 p-6 bg-gradient-to-r from-base-300/50 to-base-300/30 rounded-2xl border border-base-300">
                                    <div className="text-center flex-1">
                                        <div className="mb-2 opacity-60 text-xs uppercase tracking-wider">From</div>
                                        <div className="badge badge-lg badge-primary font-bold text-xl px-6 py-4">
                                            {direction === "ETH_TO_DOT" ? "ETH" : "DOT"}
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-circle btn-lg bg-gradient-to-br from-primary to-secondary text-primary-content border-none hover:scale-110 transition-transform"
                                        onClick={toggleDirection}
                                    >
                                        <ArrowsRightLeftIcon className="w-7 h-7" />
                                    </button>

                                    <div className="text-center flex-1">
                                        <div className="mb-2 opacity-60 text-xs uppercase tracking-wider">To</div>
                                        <div className="badge badge-lg badge-secondary font-bold text-xl px-6 py-4">
                                            {direction === "ETH_TO_DOT" ? "DOT" : "ETH"}
                                        </div>
                                    </div>
                                </div>

                                {/* Amount Input */}
                                <div className="form-control mb-6">
                                    <label className="label">
                                        <span className="label-text font-bold text-lg flex items-center gap-2">
                                            <span className="badge badge-sm badge-primary">{direction === "ETH_TO_DOT" ? "ETH" : "DOT"}</span>
                                            Amount to Send
                                        </span>
                                        <span className="label-text-alt opacity-60">
                                            Min: {direction === "ETH_TO_DOT" ? "0.00001 ETH" : "1 DOT"}
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <EtherInput
                                            value={sendAmount}
                                            onChange={value => setSendAmount(value)}
                                            placeholder="0.0"
                                        />
                                    </div>
                                </div>

                                {/* Receive Amount Display */}
                                {receiveAmount && (
                                    <div className="mb-6 p-6 bg-gradient-to-r from-success/20 to-success/10 border-2 border-success/30 rounded-2xl">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm opacity-70 mb-1">You will receive</div>
                                                <div className="text-3xl font-bold text-success flex items-baseline gap-2">
                                                    {receiveAmount}
                                                    <span className="text-lg badge badge-success badge-outline">
                                                        {direction === "ETH_TO_DOT" ? "DOT" : "ETH"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-success/20 rounded-full">
                                                <ArrowRightIcon className="w-6 h-6 text-success" />
                                            </div>
                                        </div>
                                        <div className="mt-3 text-xs opacity-60">
                                            Rate: 1 {direction === "ETH_TO_DOT" ? "ETH" : "DOT"} = {direction === "ETH_TO_DOT" ? FIXED_EXCHANGE_RATE.toLocaleString() : (1 / FIXED_EXCHANGE_RATE).toFixed(8)} {direction === "ETH_TO_DOT" ? "DOT" : "ETH"}
                                        </div>
                                    </div>
                                )}

                                {/* Destination Address */}
                                <div className="form-control mb-8">
                                    <label className="label">
                                        <span className="label-text font-bold text-lg flex items-center gap-2">
                                            <span className="badge badge-sm badge-secondary">{direction === "ETH_TO_DOT" ? "DOT" : "ETH"}</span>
                                            Destination Address
                                        </span>
                                    </label>
                                    <AddressInput
                                        value={destinationAddress}
                                        onChange={value => setDestinationAddress(value)}
                                        placeholder={direction === "ETH_TO_DOT" ? "Your DOT address (0x...)" : "Your ETH address (0x...)"}
                                    />
                                    <label className="label">
                                        <span className="label-text-alt opacity-70 flex items-center gap-1">
                                            <CheckCircleIcon className="w-3 h-3" />
                                            {direction === "ETH_TO_DOT" ? "DOT" : "ETH"} will be sent here automatically
                                        </span>
                                    </label>
                                </div>

                                {/* How it Works */}
                                <div className="alert border-2 border-info/30 bg-info/10 mb-6">
                                    <div className="w-full">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="p-2 bg-info/20 rounded-full">
                                                <BoltIcon className="w-5 h-5 text-info" />
                                            </div>
                                            <h4 className="font-bold text-lg">How It Works</h4>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-3">
                                                <div className="badge badge-sm badge-info mt-1">1</div>
                                                <p className="text-sm flex-1">You lock {direction === "ETH_TO_DOT" ? "ETH" : "DOT"} in the smart contract</p>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="badge badge-sm badge-info mt-1">2</div>
                                                <p className="text-sm flex-1">Resolver detects your swap and locks matching {direction === "ETH_TO_DOT" ? "DOT" : "ETH"}</p>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="badge badge-sm badge-info mt-1">3</div>
                                                <p className="text-sm flex-1">Atomic swap completes automatically (~2 minutes)</p>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="badge badge-sm badge-success mt-1">✓</div>
                                                <p className="text-sm flex-1 font-semibold text-success">You receive {direction === "ETH_TO_DOT" ? "DOT" : "ETH"} at your address!</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Create Button */}
                                <button
                                    className={`btn btn-lg w-full shadow-xl ${isCreating
                                        ? "btn-disabled loading"
                                        : !destinationAddress || !sendAmount || !resolverStatus?.online
                                            ? "btn-disabled"
                                            : "btn-primary"
                                        } bg-gradient-to-r from-primary to-secondary border-none text-primary-content hover:scale-[1.02] transition-transform`}
                                    onClick={createSwap}
                                    disabled={isCreating || !destinationAddress || !sendAmount || !resolverStatus?.online}
                                >
                                    {isCreating ? (
                                        <span className="flex items-center gap-2">
                                            <span className="loading loading-spinner"></span>
                                            Creating Swap...
                                        </span>
                                    ) : !resolverStatus?.online ? (
                                        <span className="flex items-center gap-2">
                                            <ExclamationTriangleIcon className="w-6 h-6" />
                                            Resolver Offline
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2 text-lg font-bold">
                                            <BoltIcon className="w-6 h-6" />
                                            Instant Swap {direction === "ETH_TO_DOT" ? "ETH → DOT" : "DOT → ETH"}
                                        </span>
                                    )}
                                </button>

                                {!resolverStatus?.online && (
                                    <div className="text-center text-sm opacity-60 mt-2">
                                        Resolver service must be running for automatic swaps
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info Cards */}
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                                <div className="card-body p-6">
                                    <BoltIcon className="w-8 h-8 text-primary mb-2" />
                                    <h3 className="font-bold text-lg">Lightning Fast</h3>
                                    <p className="text-sm opacity-70">Automatic fulfillment in ~2 minutes</p>
                                </div>
                            </div>
                            <div className="card bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                                <div className="card-body p-6">
                                    <ShieldCheckIcon className="w-8 h-8 text-success mb-2" />
                                    <h3 className="font-bold text-lg">100% Secure</h3>
                                    <p className="text-sm opacity-70">Trustless atomic swaps with HTLC</p>
                                </div>
                            </div>
                            <div className="card bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20">
                                <div className="card-body p-6">
                                    <CheckCircleIcon className="w-8 h-8 text-secondary mb-2" />
                                    <h3 className="font-bold text-lg">No Fees</h3>
                                    <p className="text-sm opacity-70">Only pay network gas fees</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Success State */
                    <div className="card bg-base-200 shadow-2xl border-2 border-success/30">
                        <div className="card-body text-center p-10">
                            <div className="mx-auto mb-6 p-4 bg-success/20 rounded-full w-fit">
                                <CheckCircleIcon className="w-20 h-20 text-success animate-pulse" />
                            </div>
                            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-success to-success/70 bg-clip-text text-transparent">
                                Swap Created Successfully!
                            </h2>
                            <p className="text-lg opacity-80 mb-6">
                                Your swap is being processed automatically. You&apos;ll receive your funds in ~2 minutes!
                            </p>

                            {/* Progress indicator */}
                            <div className="mb-6">
                                <div className="flex justify-center items-center gap-2 mb-2">
                                    <span className="loading loading-spinner loading-sm text-success"></span>
                                    <span className="text-sm font-semibold text-success">Processing...</span>
                                </div>
                                <progress className="progress progress-success w-full"></progress>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                                <div className="card bg-base-300 border border-base-content/10">
                                    <div className="card-body p-6">
                                        <div className="text-sm opacity-60 mb-1">You Sent</div>
                                        <div className="text-3xl font-bold flex items-baseline gap-2">
                                            {sendAmount}
                                            <span className="badge badge-primary badge-lg">{direction === "ETH_TO_DOT" ? "ETH" : "DOT"}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="card bg-gradient-to-br from-success/20 to-success/10 border border-success/30">
                                    <div className="card-body p-6">
                                        <div className="text-sm opacity-60 mb-1">You Will Receive</div>
                                        <div className="text-3xl font-bold text-success flex items-baseline gap-2">
                                            {receiveAmount}
                                            <span className="badge badge-success badge-lg">{direction === "ETH_TO_DOT" ? "DOT" : "ETH"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card bg-base-300 border border-base-content/10 mb-6">
                                <div className="card-body p-4">
                                    <div className="text-sm opacity-60 mb-1">Destination Address</div>
                                    <div className="font-mono text-xs break-all">{destinationAddress}</div>
                                </div>
                            </div>

                            <details className="collapse collapse-arrow bg-base-300 mb-6">
                                <summary className="collapse-title text-sm font-semibold">
                                    Technical Details
                                </summary>
                                <div className="collapse-content text-xs font-mono space-y-2">
                                    <div>
                                        <div className="opacity-60 mb-1">Swap ID:</div>
                                        <div className="break-all">{swapId}</div>
                                    </div>
                                    <div>
                                        <div className="opacity-60 mb-1">Secret Hash:</div>
                                        <div className="break-all">{secretHash}</div>
                                    </div>
                                </div>
                            </details>

                            <div className="flex gap-4 justify-center flex-wrap">
                                <button
                                    className="btn btn-primary btn-lg shadow-xl"
                                    onClick={resetForm}
                                >
                                    <SparklesIcon className="w-5 h-5" />
                                    Create Another Swap
                                </button>
                                <a
                                    href="/swaps"
                                    className="btn btn-outline btn-lg"
                                >
                                    <ArrowRightIcon className="w-5 h-5" />
                                    View My Swaps
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Resolver Info */}
                <div className="card bg-gradient-to-r from-base-300 to-base-200 shadow-xl border border-base-content/10 mt-6">
                    <div className="card-body p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <BoltIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Resolver Service</h3>
                                <p className="text-sm opacity-70">
                                    Automated liquidity provider for instant swaps
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs opacity-60 mb-1">Status</div>
                                <div className={`badge ${resolverStatus?.online ? "badge-success" : "badge-warning"}`}>
                                    {resolverStatus?.online ? "Online & Ready" : "Offline"}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs opacity-60 mb-1">Exchange Rate</div>
                                <div className="font-semibold">
                                    1 ETH = {(resolverStatus?.exchangeRate || FIXED_EXCHANGE_RATE).toLocaleString()} DOT
                                </div>
                            </div>
                        </div>

                        <details className="collapse collapse-arrow bg-base-200 mt-4">
                            <summary className="collapse-title text-sm font-semibold">
                                Resolver Details
                            </summary>
                            <div className="collapse-content">
                                <div className="text-xs font-mono break-all">
                                    {resolverStatus?.resolverAddress || RESOLVER_ADDRESS}
                                </div>
                                {(RESOLVER_ADDRESS === "0x0000000000000000000000000000000000000000" || !resolverStatus?.online) && (
                                    <div className="alert alert-warning alert-sm mt-3">
                                        <ExclamationTriangleIcon className="w-4 h-4" />
                                        <div className="text-xs">
                                            {RESOLVER_ADDRESS === "0x0000000000000000000000000000000000000000"
                                                ? "Resolver not configured. Set NEXT_PUBLIC_RESOLVER_ADDRESS in .env.local"
                                                : "Resolver service is not running. Start it with: yarn resolver-service"}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimpleSwapPage;

