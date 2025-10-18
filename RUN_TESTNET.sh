#!/bin/bash

# DotFusion Testnet Runner
# This script helps you run the resolver service on testnets

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          🌐 DotFusion Testnet Setup Helper 🌐                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f "packages/hardhat/.env" ]; then
    echo "❌ ERROR: .env file not found in packages/hardhat/"
    echo ""
    echo "Please create it with:"
    echo "  cd packages/hardhat"
    echo "  cp resolver.env.example .env"
    echo "  # Edit .env with your resolver address and private key"
    exit 1
fi

echo "✅ Found .env configuration"
echo ""

# Ask which network
echo "Which network do you want to run the resolver on?"
echo "  1) Sepolia (Ethereum testnet)"
echo "  2) Paseo (Polkadot testnet)"
echo "  3) Both (requires 2 terminals)"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting resolver on Sepolia..."
        echo ""
        cd packages/hardhat
        HARDHAT_NETWORK=sepolia yarn resolver-service
        ;;
    2)
        echo ""
        echo "🚀 Starting resolver on Paseo..."
        echo ""
        cd packages/hardhat
        HARDHAT_NETWORK=paseo yarn resolver-service
        ;;
    3)
        echo ""
        echo "📋 To run on both networks, open 2 terminals:"
        echo ""
        echo "Terminal 1 (Sepolia):"
        echo "  cd packages/hardhat"
        echo "  HARDHAT_NETWORK=sepolia yarn resolver-service"
        echo ""
        echo "Terminal 2 (Paseo):"
        echo "  cd packages/hardhat"
        echo "  HARDHAT_NETWORK=paseo yarn resolver-service"
        echo ""
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac


