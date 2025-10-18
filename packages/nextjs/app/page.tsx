"use client";

import Link from "next/link";
import { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  ArrowRightIcon,
  BoltIcon,
  ClockIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const HomePage: NextPage = () => {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-base-100">
      {/* Hero Section */}
      <div className="hero min-h-[60vh] bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="hero-content text-center">
          <div className="max-w-4xl">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              DotFusion
            </h1>
            <p className="text-2xl font-semibold mt-4">Cross-Chain Atomic Swaps</p>
            <p className="text-lg opacity-70 mt-6 max-w-2xl mx-auto">
              Trustless, secure, and fast token exchanges between Ethereum and Polkadot ecosystems. No intermediaries,
              no wrapped tokens, just pure atomic swaps.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              {isConnected ? (
                <>
                  <Link href="/swap" className="btn btn-primary btn-lg">
                    <BoltIcon className="w-6 h-6" />
                    Start Swap
                  </Link>
                  <Link href="/swaps" className="btn btn-outline btn-lg">
                    <ClockIcon className="w-6 h-6" />
                    My Swaps
                  </Link>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-lg mb-4">Connect your wallet to get started</p>
                  <div className="btn btn-primary btn-lg">
                    <GlobeAltIcon className="w-6 h-6" />
                    Connect Wallet
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose DotFusion?</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body text-center">
                <ShieldCheckIcon className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="card-title justify-center">Trustless & Secure</h3>
                <p className="opacity-70">
                  Built on Hash Time-Locked Contracts (HTLC) with no trusted intermediaries. Your funds are always
                  secure.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body text-center">
                <BoltIcon className="w-12 h-12 text-secondary mx-auto mb-4" />
                <h3 className="card-title justify-center">Fast & Efficient</h3>
                <p className="opacity-70">
                  Optimized smart contracts with automatic XCM bridge integration. Complete swaps in minutes, not hours.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body text-center">
                <GlobeAltIcon className="w-12 h-12 text-accent mx-auto mb-4" />
                <h3 className="card-title justify-center">Cross-Chain Native</h3>
                <p className="opacity-70">
                  Direct ETH ↔ DOT swaps without wrapped tokens. True cross-chain interoperability.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body text-center">
                <CurrencyDollarIcon className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="card-title justify-center">No Fees</h3>
                <p className="opacity-70">No platform fees, no hidden costs. Only pay for network gas fees.</p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body text-center">
                <ClockIcon className="w-12 h-12 text-secondary mx-auto mb-4" />
                <h3 className="card-title justify-center">Time-Locked</h3>
                <p className="opacity-70">
                  Configurable timeouts ensure you can always recover your funds if the other party doesn&apos;t
                  complete the swap.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body text-center">
                <ArrowRightIcon className="w-12 h-12 text-accent mx-auto mb-4" />
                <h3 className="card-title justify-center">Bidirectional</h3>
                <p className="opacity-70">Swap ETH for DOT or DOT for ETH. Full bidirectional support for all users.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 px-4 bg-base-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-content rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Swap</h3>
              <p className="opacity-70">Generate a secret and create a swap on Ethereum, locking your ETH.</p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary text-secondary-content rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Counter Party</h3>
              <p className="opacity-70">
                Another user sees your swap and locks DOT on Polkadot with the same secret hash.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-accent-content rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Reveal Secret</h3>
              <p className="opacity-70">
                Claim your DOT by revealing the secret, which is automatically sent to Ethereum.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-success text-success-content rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-semibold mb-2">Complete</h3>
              <p className="opacity-70">The counter party claims their ETH using the revealed secret. Swap complete!</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Start Swapping?</h2>
          <p className="text-lg opacity-70 mb-8">
            Join the future of cross-chain trading with DotFusion. Secure, fast, and completely decentralized.
          </p>

          {isConnected ? (
            <Link href="/swap" className="btn btn-primary btn-lg">
              <BoltIcon className="w-6 h-6" />
              Start Your First Swap
            </Link>
          ) : (
            <div className="text-center">
              <p className="text-lg mb-4">Connect your wallet to get started</p>
              <div className="btn btn-primary btn-lg">
                <GlobeAltIcon className="w-6 h-6" />
                Connect Wallet
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
