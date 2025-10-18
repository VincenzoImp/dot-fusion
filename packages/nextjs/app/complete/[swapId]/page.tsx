"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { NextPage } from "next";
import { useAccount } from "wagmi";
import { ArrowLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { SwapCompletion } from "~~/components/SwapCompletion";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/**
 * Swap Completion Page
 * Allows users to complete atomic swaps by revealing the secret
 */
const CompleteSwapPage: NextPage = () => {
  const params = useParams();
  const router = useRouter();
  const { isConnected } = useAccount();
  const [swapId, setSwapId] = useState<string>("");
  const [chain, setChain] = useState<"ethereum" | "polkadot">("ethereum");

  // Get swap ID from URL
  useEffect(() => {
    if (params.swapId) {
      setSwapId(params.swapId as string);
    }
  }, [params.swapId]);

  // Try to find the swap on both chains
  const { data: ethSwapData } = useScaffoldReadContract({
    contractName: "DotFusionEthereumEscrow",
    functionName: "getSwap",
    args: [swapId as `0x${string}`],
  });

  const { data: dotSwapData } = useScaffoldReadContract({
    contractName: "DotFusionPolkadotEscrow",
    functionName: "getSwap",
    args: [swapId as `0x${string}`],
  });

  // Determine which chain the swap is on
  useEffect(() => {
    if (ethSwapData && ethSwapData.state !== 0) {
      // 0 = INVALID
      setChain("ethereum");
    } else if (dotSwapData && dotSwapData.state !== 0) {
      // 0 = INVALID
      setChain("polkadot");
    }
  }, [ethSwapData, dotSwapData]);

  // Handle completion
  const handleComplete = () => {
    router.push("/swaps");
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="card w-96 bg-base-200 shadow-xl">
          <div className="card-body text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="card-title justify-center">Wallet Not Connected</h2>
            <p className="opacity-70">Please connect your wallet to complete the swap</p>
          </div>
        </div>
      </div>
    );
  }

  if (!swapId) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="card w-96 bg-base-200 shadow-xl">
          <div className="card-body text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-error mx-auto mb-4" />
            <h2 className="card-title justify-center">Invalid Swap ID</h2>
            <p className="opacity-70">The swap ID in the URL is invalid</p>
            <div className="card-actions justify-center mt-4">
              <Link href="/swaps" className="btn btn-primary">
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Swaps
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/swaps" className="btn btn-outline btn-sm">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Swaps
          </Link>
          <div>
            <h1 className="text-4xl font-bold">Complete Swap</h1>
            <p className="text-lg opacity-70">Reveal the secret to complete your atomic swap</p>
          </div>
        </div>

        {/* Swap ID Display */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-4">Swap Information</h2>
            <div className="space-y-2">
              <div>
                <label className="label">
                  <span className="label-text font-semibold">Swap ID</span>
                </label>
                <div className="font-mono text-sm bg-base-300 p-2 rounded break-all">{swapId}</div>
              </div>
              <div>
                <label className="label">
                  <span className="label-text font-semibold">Chain</span>
                </label>
                <div className="badge badge-outline">{chain === "ethereum" ? "Ethereum" : "Polkadot"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Swap Completion Component */}
        <SwapCompletion swapId={swapId} chain={chain} onComplete={handleComplete} />

        {/* Instructions */}
        <div className="card bg-base-200 shadow-xl mt-8">
          <div className="card-body">
            <h2 className="card-title mb-4">How to Complete the Swap</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Enter the Secret</h3>
                  <p className="text-sm opacity-70">Enter the secret that was provided to you by the swap creator.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Validate the Secret</h3>
                  <p className="text-sm opacity-70">
                    Click &quot;Validate Secret&quot; to verify that the secret matches the hash.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">Complete the Swap</h3>
                  <p className="text-sm opacity-70">
                    Once validated, click &quot;Complete Swap&quot; to finalize the transaction.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold">Automatic Propagation</h3>
                  <p className="text-sm opacity-70">
                    The secret will be automatically sent to the other chain via XCM bridge.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="alert alert-warning mt-8">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <div>
            <h3 className="font-bold">Important Notes</h3>
            <ul className="text-sm mt-2 space-y-1">
              <li>• Make sure you have the correct secret before completing</li>
              <li>• The swap cannot be undone once completed</li>
              <li>• You will receive the tokens on the current chain</li>
              <li>• The secret will be automatically propagated to the other chain</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteSwapPage;
