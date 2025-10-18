"use client";

import Link from "next/link";
import { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  GlobeAltIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { SwapParticipant } from "~~/components/SwapParticipant";
import { XCMBridgeStatus } from "~~/components/XCMBridgeStatus";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

/**
 * Dashboard Page - Main control center for DotFusion
 */
const DashboardPage: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();

  // Fetch swap statistics from both networks
  const { data: ethSwapCreatedEvents } = useScaffoldEventHistory({
    contractName: "DotFusionEthereumEscrow",
    eventName: "SwapCreated",
    fromBlock: 0n,
    watch: true,
    filters: {},
    chainId: 11155111, // Sepolia
  });

  const { data: dotSwapCreatedEvents } = useScaffoldEventHistory({
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

  // Calculate statistics
  const totalSwaps = (ethSwapCreatedEvents?.length || 0) + (dotSwapCreatedEvents?.length || 0);
  const completedSwaps = (ethSwapCompletedEvents?.length || 0) + (dotSwapCompletedEvents?.length || 0);
  const userSwaps =
    totalSwaps > 0
      ? [...(ethSwapCreatedEvents || []), ...(dotSwapCreatedEvents || [])].filter(
          (event: any) =>
            event.args.maker.toLowerCase() === connectedAddress?.toLowerCase() ||
            event.args.taker.toLowerCase() === connectedAddress?.toLowerCase(),
        ).length
      : 0;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="card w-96 bg-base-200 shadow-xl">
          <div className="card-body text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="card-title justify-center">Wallet Not Connected</h2>
            <p className="opacity-70">Please connect your wallet to access the dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
          <p className="text-lg opacity-70">Manage your cross-chain atomic swaps and monitor the system</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body text-center">
              <ChartBarIcon className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="card-title justify-center">Total Swaps</h3>
              <div className="text-3xl font-bold">{totalSwaps}</div>
              <p className="opacity-70">All time</p>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl">
            <div className="card-body text-center">
              <EyeIcon className="w-12 h-12 text-success mx-auto mb-4" />
              <h3 className="card-title justify-center">Completed</h3>
              <div className="text-3xl font-bold">{completedSwaps}</div>
              <p className="opacity-70">Successful swaps</p>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl">
            <div className="card-body text-center">
              <PlusCircleIcon className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h3 className="card-title justify-center">Your Swaps</h3>
              <div className="text-3xl font-bold">{userSwaps}</div>
              <p className="opacity-70">Created or participated</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-6">
              <PlusCircleIcon className="w-6 h-6" />
              Quick Actions
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/swap" className="btn btn-primary btn-lg">
                <PlusCircleIcon className="w-6 h-6" />
                Create Swap
              </Link>

              <Link href="/swaps" className="btn btn-outline btn-lg">
                <EyeIcon className="w-6 h-6" />
                My Swaps
              </Link>

              <button
                className="btn btn-outline btn-lg"
                onClick={() => document.getElementById("participant-component")?.scrollIntoView({ behavior: "smooth" })}
              >
                <GlobeAltIcon className="w-6 h-6" />
                Find Swaps
              </button>

              <button
                className="btn btn-outline btn-lg"
                onClick={() => document.getElementById("xcm-bridge")?.scrollIntoView({ behavior: "smooth" })}
              >
                <GlobeAltIcon className="w-6 h-6" />
                Bridge Status
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Swap Participant */}
          <div id="participant-component">
            <SwapParticipant />
          </div>

          {/* Right Column - XCM Bridge Status */}
          <div id="xcm-bridge">
            <XCMBridgeStatus />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card bg-base-200 shadow-xl mt-8">
          <div className="card-body">
            <h2 className="card-title mb-6">
              <ChartBarIcon className="w-6 h-6" />
              Recent Activity
            </h2>

            <div className="space-y-4">
              {totalSwaps === 0 ? (
                <div className="text-center py-8">
                  <ChartBarIcon className="w-12 h-12 text-base-content/30 mx-auto mb-4" />
                  <p className="opacity-70">No activity yet</p>
                  <p className="text-sm opacity-50">Create your first swap to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    ...(ethSwapCreatedEvents?.map(e => ({ ...e, chain: "ethereum" })) || []),
                    ...(dotSwapCreatedEvents?.map(e => ({ ...e, chain: "polkadot" })) || []),
                  ]
                    .sort((a, b) => Number(b.blockNumber - a.blockNumber))
                    .slice(0, 5)
                    .map((event: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-base-300 rounded">
                        <div className="flex items-center gap-3">
                          <div className="badge badge-outline">{event.chain === "ethereum" ? "ETH" : "DOT"}</div>
                          <div>
                            <div className="font-semibold">Swap Created</div>
                            <div className="text-sm opacity-70">ID: {event.args.swapId.slice(0, 8)}...</div>
                          </div>
                        </div>
                        <div className="text-sm opacity-70">
                          {new Date(Number(event.blockNumber) * 1000).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="card bg-base-200 shadow-xl mt-8">
          <div className="card-body">
            <h2 className="card-title mb-6">
              <GlobeAltIcon className="w-6 h-6" />
              System Status
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4">Ethereum Network</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="opacity-70">Status:</span>
                    <div className="badge badge-success">Connected</div>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Swaps Created:</span>
                    <span>{ethSwapCreatedEvents?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Swaps Completed:</span>
                    <span>{ethSwapCompletedEvents?.length || 0}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Polkadot Network</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="opacity-70">Status:</span>
                    <div className="badge badge-success">Connected</div>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Swaps Created:</span>
                    <span>{dotSwapCreatedEvents?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Swaps Completed:</span>
                    <span>{dotSwapCompletedEvents?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
