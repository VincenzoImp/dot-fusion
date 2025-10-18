#!/bin/bash

# Quick RPC Connection Tester for DotFusion

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              🔍 Testing RPC Connections 🔍                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Array of Sepolia RPCs to test
SEPOLIA_RPCS=(
    "https://ethereum-sepolia-rpc.publicnode.com"
    "https://rpc.ankr.com/eth_sepolia"
    "https://rpc.sepolia.org"
)

# Array of Paseo RPCs to test
PASEO_RPCS=(
    "https://sys.ibp.network/paseo-asset-hub"
    "https://paseo-asset-hub-rpc.polkadot.io"
)

echo "Testing Sepolia RPCs..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for rpc in "${SEPOLIA_RPCS[@]}"; do
    echo -n "Testing: $rpc ... "
    
    response=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        --max-time 5 "$rpc" 2>/dev/null)
    
    if [[ $response == *"result"* ]]; then
        echo "✅ WORKS"
        block=$(echo $response | grep -o '"result":"[^"]*' | sed 's/"result":"//')
        echo "   Latest block: $block"
    else
        echo "❌ FAILED"
    fi
done

echo ""
echo "Testing Paseo RPCs..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for rpc in "${PASEO_RPCS[@]}"; do
    echo -n "Testing: $rpc ... "
    
    response=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        --max-time 5 "$rpc" 2>/dev/null)
    
    if [[ $response == *"result"* ]]; then
        echo "✅ WORKS"
        block=$(echo $response | grep -o '"result":"[^"]*' | sed 's/"result":"//')
        echo "   Latest block: $block"
    else
        echo "❌ FAILED"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Use the RPCs marked with ✅ in your .env file"
echo ""


