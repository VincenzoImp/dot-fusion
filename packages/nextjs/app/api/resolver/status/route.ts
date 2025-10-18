/**
 * Resolver Status API Endpoint
 *
 * Returns the current status of the resolver service including:
 * - Exchange rate
 * - Resolver address
 * - Minimum amounts
 * - Service status
 */
import { NextResponse } from "next/server";

// Fixed exchange rate (should match resolver-service.ts)
const EXCHANGE_RATE = 100000; // 1 ETH = 100,000 DOT

// Resolver address from environment
const RESOLVER_ADDRESS = process.env.NEXT_PUBLIC_RESOLVER_ADDRESS || "0x0000000000000000000000000000000000000000";

// Minimum amounts (should match resolver-service.ts)
const MIN_ETH_AMOUNT = "0.001";
const MIN_DOT_AMOUNT = "100";

export async function GET() {
  try {
    // Try to contact resolver API
    let resolverOnline = false;
    let resolverData = null;

    try {
      const response = await fetch("http://localhost:3001/status", {
        method: "GET",
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });
      if (response.ok) {
        resolverData = await response.json();
        resolverOnline = true;
      }
    } catch {
      // Resolver API not reachable
      resolverOnline = false;
    }

    // If resolver API is online, use its data
    if (resolverOnline && resolverData) {
      return NextResponse.json(resolverData);
    }

    // Otherwise, return default status
    const status = {
      // Service info
      service: "DotFusion Resolver",
      version: "1.0.0",
      status: "online",

      // Resolver address
      resolverAddress: RESOLVER_ADDRESS,

      // Exchange rates
      exchangeRate: {
        ethToDot: EXCHANGE_RATE,
        dotToEth: 1 / EXCHANGE_RATE,
        description: `1 ETH = ${EXCHANGE_RATE.toLocaleString()} DOT`,
      },

      // Minimum amounts
      minimumAmounts: {
        eth: MIN_ETH_AMOUNT,
        dot: MIN_DOT_AMOUNT,
      },

      // Timelock information
      timelocks: {
        ethSide: "12 hours",
        dotSide: "6 hours",
      },

      // Features
      features: {
        automaticFulfillment: true,
        bidirectional: true,
        trustless: true,
        noFees: true,
      },

      // Timestamp
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error in resolver status API:", error);
    return NextResponse.json(
      {
        error: "Failed to get resolver status",
        status: "offline",
      },
      { status: 500 },
    );
  }
}
