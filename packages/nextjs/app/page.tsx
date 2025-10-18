"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  GlobeAltIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { Address, Balance } from "~~/components/scaffold-eth";

// import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();

  // Read contract data for dashboard stats
  // const { data: ethereumEscrowAddress } = useScaffoldReadContract({
  //   contractName: "DotFusionEthereumEscrow",
  //   functionName: "owner",
  // });

  return (
    <>
      <div className="flex flex-col grow">
        {/* Hero Section */}
        <div className="hero min-h-[60vh] bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
          <div className="hero-content text-center">
            <div className="max-w-4xl">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                DotFusion
              </h1>
              <p className="py-6 text-xl text-gray-600 dark:text-gray-300">
                Secure, trustless cross-chain atomic swaps between Ethereum and Polkadot ecosystems. Exchange tokens
                across different blockchain networks without intermediaries.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/swap" className="btn btn-primary btn-lg">
                  <PlusIcon className="h-5 w-5" />
                  Create Swap
                </Link>
                <Link href="/swaps" className="btn btn-outline btn-lg">
                  <ClockIcon className="h-5 w-5" />
                  View My Swaps
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose DotFusion?</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Built with security and user experience in mind, DotFusion provides the most reliable cross-chain atomic
              swap experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <ShieldCheckIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="card-title justify-center">Trustless</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  No intermediaries required. Your funds are secured by smart contracts.
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <ArrowPathIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="card-title justify-center">Atomic</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Swaps either complete entirely or fail completely. No partial states.
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <GlobeAltIcon className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h3 className="card-title justify-center">Cross-Chain</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Seamlessly bridge between Ethereum and Polkadot ecosystems.
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <ChartBarIcon className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h3 className="card-title justify-center">Transparent</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  All transactions are verifiable on-chain with comprehensive event logging.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Network Status Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Network Status</h2>
            <p className="text-gray-600 dark:text-gray-300">Current status of supported networks and contracts</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ethereum Sepolia */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-blue-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Ethereum Sepolia
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Status:</span>
                    <span className="badge badge-success">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Contract:</span>
                    <span className="text-sm font-mono">0x43bD...B154</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Chain ID:</span>
                    <span className="text-sm">11155111</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Polkadot Paseo */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-purple-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Polkadot Paseo
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Status:</span>
                    <span className="badge badge-success">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Contract:</span>
                    <span className="text-sm font-mono">Deployed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Chain ID:</span>
                    <span className="text-sm">420420422</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Info Section */}
        {isConnected && (
          <div className="container mx-auto px-4 py-16">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">Your Account</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Connected Address</h3>
                    <Address address={connectedAddress} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">ETH Balance</h3>
                    <Balance address={connectedAddress} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="hero bg-base-200 rounded-3xl">
            <div className="hero-content text-center">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-bold mb-4">Ready to Start Swapping?</h2>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                  Connect your wallet and create your first cross-chain atomic swap in minutes.
                </p>
                <Link href="/swap" className="btn btn-primary btn-lg">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
