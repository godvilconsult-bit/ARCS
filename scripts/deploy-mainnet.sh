#!/bin/bash
# ArcStable — Arc Mainnet Deploy Script
set -e

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  echo "ERROR: Set your private key first:"
  echo "  export DEPLOYER_PRIVATE_KEY=0x..."
  exit 1
fi

RPC="https://rpc.mainnet.arc.io"
ARCS="0xFb3a730cdb68D6EC773b85bD4C44Fd5daAb9AeBB"
USDC="0x3600000000000000000000000000000000000000"
EURC="0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a"
DEPLOYER=$(cast wallet address --private-key $DEPLOYER_PRIVATE_KEY)
WEEKLY="10000000000000000000000000"

echo "Deploying ArcStable to Arc Mainnet..."
echo "Deployer: $DEPLOYER"

# Helper: extract deployed address from forge create output
extract_addr() {
  grep -o 'Deployed to: 0x[0-9a-fA-F]*' | sed 's/Deployed to: //'
}

# 1. veARCS
echo ""
echo "1/5 Deploying veARCS..."
VE_OUT=$(forge create contracts/ArcStable.sol:veARCS \
  --rpc-url $RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --constructor-args $ARCS $DEPLOYER 2>&1)
echo "$VE_OUT"
VE_ARCS=$(echo "$VE_OUT" | extract_addr)
echo ">>> veARCS: $VE_ARCS"

# 2. ArcStablePool
echo ""
echo "2/5 Deploying ArcStablePool..."
POOL_OUT=$(forge create contracts/ArcStable.sol:ArcStablePool \
  --rpc-url $RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --constructor-args $USDC $EURC 100 4 $DEPLOYER $DEPLOYER 2>&1)
echo "$POOL_OUT"
POOL=$(echo "$POOL_OUT" | extract_addr)
echo ">>> ArcStablePool: $POOL"

# 3. GaugeController
echo ""
echo "3/5 Deploying GaugeController..."
GAUGE_OUT=$(forge create contracts/ArcStable.sol:GaugeController \
  --rpc-url $RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --constructor-args $ARCS $VE_ARCS $POOL $WEEKLY $DEPLOYER 2>&1)
echo "$GAUGE_OUT"
GAUGE=$(echo "$GAUGE_OUT" | extract_addr)
echo ">>> GaugeController: $GAUGE"

# 4. BuybackBurner
echo ""
echo "4/5 Deploying BuybackBurner..."
BUYBACK_OUT=$(forge create contracts/ArcStableExtensions.sol:BuybackBurner \
  --rpc-url $RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --constructor-args $USDC $ARCS $POOL $DEPLOYER 2>&1)
echo "$BUYBACK_OUT"
BUYBACK=$(echo "$BUYBACK_OUT" | extract_addr)
echo ">>> BuybackBurner: $BUYBACK"

# 5. RevenueDistributor
echo ""
echo "5/5 Deploying RevenueDistributor..."
REVENUE_OUT=$(forge create contracts/ArcStableExtensions.sol:RevenueDistributor \
  --rpc-url $RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --constructor-args $USDC $VE_ARCS $DEPLOYER 2>&1)
echo "$REVENUE_OUT"
REVENUE=$(echo "$REVENUE_OUT" | extract_addr)
echo ">>> RevenueDistributor: $REVENUE"

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE — COPY THESE ADDRESSES"
echo "=========================================="
echo "veARCS:              $VE_ARCS"
echo "ArcStablePool:       $POOL"
echo "GaugeController:     $GAUGE"
echo "BuybackBurner:       $BUYBACK"
echo "RevenueDistributor:  $REVENUE"
echo "=========================================="
