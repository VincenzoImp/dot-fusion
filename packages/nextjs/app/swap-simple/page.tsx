"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NextPage } from "next";
import { encodePacked, keccak256, parseEther, toHex } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  KeyIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { AddressInput, EtherInput } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import {
  SwapTransaction,
  addSwapTransaction,
  createSwapTracking,
  getExplorerUrl,
  getStageInfo,
  saveTrackedSwap,
} from "~~/utils/swapTracking";

type SwapDirection = "ETH_TO_DOT" | "DOT_TO_ETH";

// Fixed exchange rate: 1 ETH = 100,000 DOT
const FIXED_EXCHANGE_RATE = 100000;

// Resolver address
const RESOLVER_ADDRESS = process.env.NEXT_PUBLIC_RESOLVER_ADDRESS || "0x0000000000000000000000000000000000000000";

// Resolver status
interface ResolverStatus {
  online: boolean;
  resolverAddress: string;
  exchangeRate: number;
}

/**
 * Fast Swap Page - With Complete Transaction Tracking
 */
const FastSwapPage: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();

  // Form state
  const [direction, setDirection] = useState<SwapDirection>("ETH_TO_DOT");
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [sendAmount, setSendAmount] = useState<string>("");
  const [receiveAmount, setReceiveAmount] = useState<string>("");

  // Swap state
  const [isCreating, setIsCreating] = useState(false);
  const [swapCreated, setSwapCreated] = useState(false);
  const [swapId, setSwapId] = useState<string>("");
  const [secret, setSecret] = useState<string>("");

  // Secret input state
  const [customSecret, setCustomSecret] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Transaction tracking
  const [transactions, setTransactions] = useState<SwapTransaction[]>([]);

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

  // Fetch resolver status
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
      } catch {
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
   * Convert address to bytes32
   */
  const addressToBytes32 = (address: string): `0x${string}` => {
    if (!address || address === "0x") {
      return "0x0000000000000000000000000000000000000000000000000000000000000000";
    }
    return `0x${address.slice(2).padStart(64, "0")}` as `0x${string}`;
  };

  /**
   * Generate random secret
   */
  const generateRandomSecret = () => {
    setIsGenerating(true);
    try {
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const secretHex = `0x${Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")}`;

      setCustomSecret(secretHex);
      notification.success("🔐 Random secret generated securely!");
    } catch (error) {
      console.error("Error generating secret:", error);
      notification.error("Failed to generate secret");
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Process secret and create swap
   */
  const processSecretAndCreate = () => {
    if (!customSecret) {
      notification.error("Please enter or generate a secret");
      return;
    }

    try {
      // Validate secret format (should be 0x + 64 hex characters)
      if (!/^0x[a-fA-F0-9]{64}$/.test(customSecret)) {
        notification.error("Secret must be 64 hex characters (0x + 64 chars)");
        return;
      }

      // Use the custom secret for swap creation
      setSecret(customSecret);
      createSwapWithSecret(customSecret);
    } catch (error) {
      console.error("Error processing secret:", error);
      notification.error("Failed to process secret");
    }
  };

  /**
   * Toggle direction
   */
  const toggleDirection = () => {
    setDirection(direction === "ETH_TO_DOT" ? "DOT_TO_ETH" : "ETH_TO_DOT");
  };

  /**
   * Add transaction to tracking
   */
  const addTransaction = (tx: Omit<SwapTransaction, "timestamp">) => {
    const fullTx: SwapTransaction = { ...tx, timestamp: Date.now() };
    setTransactions(prev => [...prev, fullTx]);
  };

  /**
   * Create swap with provided secret
   */
  const createSwapWithSecret = async (providedSecret: string) => {
    if (!isConnected || !connectedAddress) {
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

    // Generate secret hash and swap ID
    const secretHash = keccak256(encodePacked(["bytes32"], [providedSecret as `0x${string}`]));
    const timestamp = Date.now();
    const id = keccak256(toHex(`swap_${connectedAddress}_${timestamp}`));

    setSwapId(id);
    setIsCreating(true);

    // Create swap tracking data
    const swapTracking = createSwapTracking({
      swapId: id,
      secretHash: secretHash,
      secret: providedSecret,
      direction,
      userAddress: connectedAddress,
      destinationAddress,
      sendAmount,
      receiveAmount,
      role: "MAKER",
      resolverAddress: RESOLVER_ADDRESS,
    });

    try {
      if (direction === "ETH_TO_DOT") {
        // User sends ETH, receives DOT
        const timelockSeconds = ethMinTimelock ? Number(ethMinTimelock) : 12 * 3600;

        notification.info("📝 Step 1/3: Creating swap on Ethereum...");

        const ethTxHash = await writeEthereumEscrow({
          functionName: "createSwap",
          args: [
            id as `0x${string}`,
            secretHash as `0x${string}`,
            RESOLVER_ADDRESS as `0x${string}`,
            parseEther(sendAmount),
            parseEther(receiveAmount),
            BigInt(FIXED_EXCHANGE_RATE * 1e18),
            BigInt(timelockSeconds),
            addressToBytes32(destinationAddress),
          ],
          value: parseEther(sendAmount),
        });

        const ethTx: SwapTransaction = {
          txHash: ethTxHash || "",
          chain: "ethereum",
          stage: "INITIATED",
          timestamp: Date.now(),
          explorerUrl: getExplorerUrl("ethereum", ethTxHash || ""),
        };
        addTransaction(ethTx);
        addSwapTransaction(id, ethTx);

        notification.success("✅ Step 1/3: Swap created on Ethereum!");

        // Call resolver API
        notification.info("🔄 Step 2/3: Waiting for resolver to match...");

        try {
          const response = await fetch("http://localhost:3001/fulfill-eth-to-dot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              swapId: id,
              secretHash: secretHash,
              maker: connectedAddress,
              ethAmount: sendAmount,
              dotAmount: receiveAmount,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const dotTx: SwapTransaction = {
              txHash: data.txHash,
              chain: "polkadot",
              stage: "RESOLVER_MATCHED",
              timestamp: Date.now(),
              explorerUrl: getExplorerUrl("polkadot", data.txHash),
            };
            addTransaction(dotTx);
            addSwapTransaction(id, dotTx);

            notification.success("✅ Step 2/3: Resolver matched on Polkadot!");
            notification.info("🎯 Step 3/3: You can now claim your DOT! Go to Swap Details to complete the swap.", {
              duration: 10000,
            });
          } else {
            notification.warning("⚠️ Resolver didn't respond. Please check My Swaps later.");
          }
        } catch (apiError) {
          console.error("Resolver API error:", apiError);
          notification.warning("⚠️ Resolver may be offline. Check My Swaps for updates.");
        }
      } else {
        // User sends DOT, receives ETH
        const timelockSeconds = dotMaxTimelock ? Number(dotMaxTimelock) : 6 * 3600;

        notification.info("📝 Step 1/3: Creating swap on Polkadot...");

        const dotTxHash = await writePolkadotEscrow({
          functionName: "createNativeSwap",
          args: [
            id as `0x${string}`,
            secretHash as `0x${string}`,
            destinationAddress as `0x${string}`,
            BigInt(timelockSeconds),
          ],
          value: parseEther(sendAmount),
        });

        const dotTx: SwapTransaction = {
          txHash: dotTxHash || "",
          chain: "polkadot",
          stage: "INITIATED",
          timestamp: Date.now(),
          explorerUrl: getExplorerUrl("polkadot", dotTxHash || ""),
        };
        addTransaction(dotTx);
        addSwapTransaction(id, dotTx);

        notification.success("✅ Step 1/3: Swap created on Polkadot!");

        // Call resolver API
        notification.info("🔄 Step 2/3: Waiting for resolver to match...");

        try {
          const response = await fetch("http://localhost:3001/fulfill-dot-to-eth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              swapId: id,
              secretHash: secretHash,
              taker: connectedAddress,
              dotAmount: sendAmount,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const ethTx: SwapTransaction = {
              txHash: data.txHash,
              chain: "ethereum",
              stage: "RESOLVER_MATCHED",
              timestamp: Date.now(),
              explorerUrl: getExplorerUrl("ethereum", data.txHash),
            };
            addTransaction(ethTx);
            addSwapTransaction(id, ethTx);

            notification.success("✅ Step 2/3: Resolver matched on Ethereum!");
            notification.info("🎯 Step 3/3: You can now claim your ETH! Go to Swap Details to complete the swap.", {
              duration: 10000,
            });
          } else {
            notification.warning("⚠️ Resolver didn't respond. Please check My Swaps later.");
          }
        } catch (apiError) {
          console.error("Resolver API error:", apiError);
          notification.warning("⚠️ Resolver may be offline. Check My Swaps for updates.");
        }
      }

      // Save to tracking
      saveTrackedSwap(swapTracking);
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
    setSecret("");
    setCustomSecret("");
    setTransactions([]);
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
              Fast Swap
            </h1>
          </div>
          <p className="text-xl opacity-80 mb-4">Lightning-fast cross-chain swaps with full tracking</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className={`badge badge-lg ${resolverStatus?.online ? "badge-success" : "badge-warning"}`}>
              <div
                className={`w-2 h-2 rounded-full mr-2 ${resolverStatus?.online ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}
              ></div>
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
                        <span className="mx-2">•</span>1 DOT ={" "}
                        {(1 / (resolverStatus?.exchangeRate || FIXED_EXCHANGE_RATE)).toFixed(8)} ETH
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
                  </label>
                  <EtherInput value={sendAmount} onChange={value => setSendAmount(value)} placeholder="0.0" />
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
                  </div>
                )}

                {/* Destination Address */}
                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text font-bold text-lg flex items-center gap-2">
                      <span className="badge badge-sm badge-secondary">
                        {direction === "ETH_TO_DOT" ? "DOT" : "ETH"}
                      </span>
                      Destination Address
                    </span>
                  </label>
                  <AddressInput
                    value={destinationAddress}
                    onChange={value => setDestinationAddress(value)}
                    placeholder={direction === "ETH_TO_DOT" ? "Your DOT address (0x...)" : "Your ETH address (0x...)"}
                  />
                </div>

                {/* Secret Configuration */}
                <div className="mb-8 p-6 bg-gradient-to-br from-primary/10 via-base-300/50 to-secondary/10 rounded-2xl border-2 border-primary/20 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/20 rounded-full">
                      <KeyIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl">Secret Configuration</h3>
                      <p className="text-sm opacity-70">Generate or enter your swap secret</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-bold flex items-center gap-2">
                          <span className="badge badge-sm badge-primary">Required</span>
                          Secret (64 hex characters)
                        </span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered font-mono text-sm bg-base-100 focus:border-primary focus:outline-primary"
                        placeholder="0x..."
                        value={customSecret}
                        onChange={(e) => setCustomSecret(e.target.value)}
                      />
                      <label className="label">
                        <span className="label-text-alt opacity-70 flex items-center gap-1">
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          Enter your own secret or generate a random one below
                        </span>
                      </label>
                    </div>

                    <button
                      className={`btn btn-outline btn-primary w-full ${isGenerating ? "loading" : ""}`}
                      onClick={generateRandomSecret}
                      disabled={isGenerating}
                    >
                      {!isGenerating && <KeyIcon className="w-5 h-5" />}
                      {isGenerating ? "Generating Secure Random Secret..." : "Generate Random Secret"}
                    </button>

                    {customSecret && (
                      <div className="alert alert-success shadow-md">
                        <CheckCircleIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold">Secret ready! You can now create the swap.</span>
                      </div>
                    )}

                    <div className="alert alert-warning shadow-md">
                      <ExclamationTriangleIcon className="w-5 h-5" />
                      <div>
                        <p className="font-bold text-sm">Keep Your Secret Safe!</p>
                        <p className="text-xs opacity-90">
                          Your secret is only known to you. Keep it private until you complete the swap.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Create Button */}
                <button
                  className={`btn btn-lg w-full shadow-xl ${isCreating
                    ? "btn-disabled loading"
                    : !destinationAddress || !sendAmount || !customSecret || !resolverStatus?.online
                      ? "btn-disabled"
                      : "btn-primary"
                    } bg-gradient-to-r from-primary to-secondary border-none text-primary-content hover:scale-[1.02] transition-transform`}
                  onClick={processSecretAndCreate}
                  disabled={isCreating || !destinationAddress || !sendAmount || !customSecret || !resolverStatus?.online}
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
                      Fast Swap {direction === "ETH_TO_DOT" ? "ETH → DOT" : "DOT → ETH"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Success State with Transaction Tracking */
          <div className="space-y-6">
            <div className="card bg-base-200 shadow-2xl border-2 border-success/30">
              <div className="card-body p-10">
                <div className="mx-auto mb-6 p-4 bg-success/20 rounded-full w-fit">
                  <CheckCircleIcon className="w-20 h-20 text-success animate-pulse" />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-success to-success/70 bg-clip-text text-transparent">
                  Swap Initiated Successfully!
                </h2>
                <p className="text-lg opacity-80 mb-6 text-center">
                  Your swap is being processed. Track all transactions below.
                </p>

                {/* Transaction Tracking */}
                <div className="card bg-base-300 mb-6">
                  <div className="card-body">
                    <h3 className="card-title mb-4">Transaction Stages</h3>
                    {transactions.length === 0 ? (
                      <div className="text-center py-4 opacity-70">
                        <ClockIcon className="w-8 h-8 mx-auto mb-2" />
                        <p>Waiting for transactions...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {transactions.map((tx, index) => {
                          const stageInfo = getStageInfo(tx.stage);
                          return (
                            <div key={index} className="flex items-center gap-4 p-4 bg-base-200 rounded-lg">
                              <span className="text-3xl">{stageInfo.icon}</span>
                              <div className="flex-1">
                                <div className="font-bold">{stageInfo.label}</div>
                                <div className="text-sm opacity-70">{stageInfo.description}</div>
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
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Swap Details */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="card bg-base-300">
                    <div className="card-body p-4">
                      <div className="text-sm opacity-60 mb-1">You Sent</div>
                      <div className="text-2xl font-bold flex items-baseline gap-2">
                        {sendAmount}
                        <span className="badge badge-primary">{direction === "ETH_TO_DOT" ? "ETH" : "DOT"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="card bg-gradient-to-br from-success/20 to-success/10 border border-success/30">
                    <div className="card-body p-4">
                      <div className="text-sm opacity-60 mb-1">You Will Receive</div>
                      <div className="text-2xl font-bold text-success flex items-baseline gap-2">
                        {receiveAmount}
                        <span className="badge badge-success">{direction === "ETH_TO_DOT" ? "DOT" : "ETH"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="alert alert-info mb-6">
                  <div>
                    <h4 className="font-bold">📌 Next Steps:</h4>
                    <ol className="list-decimal list-inside text-sm space-y-1 mt-2">
                      <li>Wait for resolver to match your swap (~30 seconds)</li>
                      <li>Go to Swap Details to claim your funds</li>
                      <li>Use your secret to complete the swap</li>
                    </ol>
                  </div>
                </div>

                {/* Important: Secret */}
                {secret && (
                  <div className="alert alert-warning mb-6">
                    <div className="w-full">
                      <h4 className="font-bold mb-2">🔑 Your Secret (SAVE THIS!):</h4>
                      <div className="font-mono text-xs bg-base-300 p-3 rounded break-all mb-2">{secret}</div>
                      <p className="text-sm">
                        You&apos;ll need this secret to claim your {direction === "ETH_TO_DOT" ? "DOT" : "ETH"}. Keep it
                        safe!
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 justify-center flex-wrap">
                  <Link href={`/swap-details/${swapId}`} className="btn btn-primary btn-lg shadow-xl">
                    <EyeIcon className="w-5 h-5" />
                    View Swap Details
                  </Link>
                  <button className="btn btn-outline btn-lg" onClick={resetForm}>
                    <SparklesIcon className="w-5 h-5" />
                    Create Another Swap
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FastSwapPage;
