/**
 * Swap Tracking Utility
 * 
 * Tracks the complete lifecycle of atomic swaps with transaction hashes
 */

export type SwapStage =
    | "INITIATED"           // User created swap
    | "RESOLVER_MATCHED"    // Resolver matched on other chain
    | "USER_CLAIMING"       // User is claiming their funds
    | "USER_CLAIMED"        // User successfully claimed
    | "RESOLVER_CLAIMING"   // Resolver is claiming
    | "COMPLETED"           // Both parties claimed
    | "FAILED"             // Swap failed
    | "REFUNDED";          // Swap was refunded

export interface SwapTransaction {
    txHash: string;
    chain: "ethereum" | "polkadot";
    stage: SwapStage;
    timestamp: number;
    blockNumber?: number;
    explorerUrl: string;
}

export interface SwapTrackingData {
    // Swap identifiers
    swapId: string;
    secretHash: string;
    secret?: string; // Only stored if user needs it to claim

    // Swap details
    direction: "ETH_TO_DOT" | "DOT_TO_ETH";
    userAddress: string;
    destinationAddress: string;
    sendAmount: string;
    receiveAmount: string;

    // Status
    currentStage: SwapStage;
    createdAt: number;
    completedAt?: number;

    // Transaction history
    transactions: SwapTransaction[];

    // User role
    role: "MAKER" | "TAKER";

    // Additional data
    resolverAddress?: string;
    unlockTime?: number;
}

// Local storage key
const STORAGE_KEY = "dotfusion_swaps";

/**
 * Get all tracked swaps from local storage
 */
export function getAllTrackedSwaps(): SwapTrackingData[] {
    if (typeof window === "undefined") return [];

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (error) {
        console.error("Error reading swaps from storage:", error);
        return [];
    }
}

/**
 * Get a specific tracked swap by ID
 */
export function getTrackedSwap(swapId: string): SwapTrackingData | null {
    const swaps = getAllTrackedSwaps();
    return swaps.find(s => s.swapId === swapId) || null;
}

/**
 * Get swaps for a specific user address
 */
export function getUserSwaps(userAddress: string): SwapTrackingData[] {
    const swaps = getAllTrackedSwaps();
    return swaps.filter(s =>
        s.userAddress.toLowerCase() === userAddress.toLowerCase()
    );
}

/**
 * Save a new swap or update existing one
 */
export function saveTrackedSwap(swap: SwapTrackingData): void {
    if (typeof window === "undefined") return;

    try {
        const swaps = getAllTrackedSwaps();
        const existingIndex = swaps.findIndex(s => s.swapId === swap.swapId);

        if (existingIndex >= 0) {
            // Update existing
            swaps[existingIndex] = swap;
        } else {
            // Add new
            swaps.push(swap);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(swaps));
    } catch (error) {
        console.error("Error saving swap to storage:", error);
    }
}

/**
 * Add a transaction to a swap's history
 */
export function addSwapTransaction(
    swapId: string,
    transaction: Omit<SwapTransaction, "timestamp">
): void {
    const swap = getTrackedSwap(swapId);
    if (!swap) {
        console.error("Swap not found:", swapId);
        return;
    }

    const fullTransaction: SwapTransaction = {
        ...transaction,
        timestamp: Date.now(),
    };

    swap.transactions.push(fullTransaction);
    swap.currentStage = transaction.stage;

    // If completed, set completion time
    if (transaction.stage === "COMPLETED") {
        swap.completedAt = Date.now();
    }

    saveTrackedSwap(swap);
}

/**
 * Update swap stage
 */
export function updateSwapStage(swapId: string, stage: SwapStage): void {
    const swap = getTrackedSwap(swapId);
    if (!swap) return;

    swap.currentStage = stage;

    if (stage === "COMPLETED") {
        swap.completedAt = Date.now();
    }

    saveTrackedSwap(swap);
}

/**
 * Get explorer URL for transaction
 */
export function getExplorerUrl(chain: "ethereum" | "polkadot", txHash: string): string {
    if (chain === "ethereum") {
        // Sepolia explorer
        return `https://sepolia.etherscan.io/tx/${txHash}`;
    } else {
        // Paseo explorer (Asset Hub)
        return `https://assethub-paseo.subscan.io/tx/${txHash}`;
    }
}

/**
 * Create initial swap tracking data
 */
export function createSwapTracking(params: {
    swapId: string;
    secretHash: string;
    secret?: string;
    direction: "ETH_TO_DOT" | "DOT_TO_ETH";
    userAddress: string;
    destinationAddress: string;
    sendAmount: string;
    receiveAmount: string;
    role: "MAKER" | "TAKER";
    resolverAddress?: string;
    unlockTime?: number;
}): SwapTrackingData {
    return {
        ...params,
        currentStage: "INITIATED",
        createdAt: Date.now(),
        transactions: [],
    };
}

/**
 * Get stage display information
 */
export function getStageInfo(stage: SwapStage): {
    label: string;
    description: string;
    color: string;
    icon: string;
} {
    switch (stage) {
        case "INITIATED":
            return {
                label: "Initiated",
                description: "Swap created, waiting for resolver",
                color: "info",
                icon: "🔵",
            };
        case "RESOLVER_MATCHED":
            return {
                label: "Matched",
                description: "Resolver locked matching funds",
                color: "warning",
                icon: "🟡",
            };
        case "USER_CLAIMING":
            return {
                label: "Claiming",
                description: "You are claiming your funds",
                color: "warning",
                icon: "⏳",
            };
        case "USER_CLAIMED":
            return {
                label: "Claimed",
                description: "You claimed your funds successfully",
                color: "success",
                icon: "✅",
            };
        case "RESOLVER_CLAIMING":
            return {
                label: "Finalizing",
                description: "Resolver is claiming their funds",
                color: "warning",
                icon: "⏳",
            };
        case "COMPLETED":
            return {
                label: "Completed",
                description: "Swap completed successfully!",
                color: "success",
                icon: "🎉",
            };
        case "FAILED":
            return {
                label: "Failed",
                description: "Swap failed",
                color: "error",
                icon: "❌",
            };
        case "REFUNDED":
            return {
                label: "Refunded",
                description: "Funds were refunded",
                color: "warning",
                icon: "↩️",
            };
        default:
            return {
                label: "Unknown",
                description: "Unknown status",
                color: "ghost",
                icon: "❓",
            };
    }
}

/**
 * Delete a swap from tracking
 */
export function deleteTrackedSwap(swapId: string): void {
    if (typeof window === "undefined") return;

    try {
        const swaps = getAllTrackedSwaps();
        const filtered = swaps.filter(s => s.swapId !== swapId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error("Error deleting swap from storage:", error);
    }
}

/**
 * Clear all tracked swaps (use with caution)
 */
export function clearAllTrackedSwaps(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
}

