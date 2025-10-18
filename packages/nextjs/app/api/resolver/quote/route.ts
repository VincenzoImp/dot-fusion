/**
 * Resolver Quote API Endpoint
 * 
 * Calculates swap quotes based on the fixed exchange rate.
 * 
 * Query parameters:
 * - from: "ETH" or "DOT"
 * - amount: amount to swap
 */

import { NextRequest, NextResponse } from "next/server";

// Fixed exchange rate (should match resolver-service.ts)
const EXCHANGE_RATE = 100000; // 1 ETH = 100,000 DOT

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const from = searchParams.get("from")?.toUpperCase();
        const amountStr = searchParams.get("amount");

        if (!from || !amountStr) {
            return NextResponse.json(
                {
                    error: "Missing required parameters: from and amount",
                    example: "/api/resolver/quote?from=ETH&amount=0.1",
                },
                { status: 400 }
            );
        }

        if (from !== "ETH" && from !== "DOT") {
            return NextResponse.json(
                {
                    error: "Invalid 'from' parameter. Must be 'ETH' or 'DOT'",
                },
                { status: 400 }
            );
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            return NextResponse.json(
                {
                    error: "Invalid amount. Must be a positive number",
                },
                { status: 400 }
            );
        }

        // Calculate quote
        let receiveAmount: number;
        let receiveCurrency: string;

        if (from === "ETH") {
            receiveAmount = amount * EXCHANGE_RATE;
            receiveCurrency = "DOT";
        } else {
            receiveAmount = amount / EXCHANGE_RATE;
            receiveCurrency = "ETH";
        }

        const quote = {
            from: {
                currency: from,
                amount: amount,
            },
            to: {
                currency: receiveCurrency,
                amount: receiveAmount,
            },
            exchangeRate: {
                ethToDot: EXCHANGE_RATE,
                dotToEth: 1 / EXCHANGE_RATE,
            },
            timestamp: new Date().toISOString(),
        };

        return NextResponse.json(quote);
    } catch (error) {
        console.error("Error in resolver quote API:", error);
        return NextResponse.json(
            {
                error: "Failed to calculate quote",
            },
            { status: 500 }
        );
    }
}


