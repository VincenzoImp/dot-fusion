# Swap protocol and contracts

This page describes the hash time-locked contract (HTLC) protocol as the code in
`packages/hardhat/contracts/` implements it. Function signatures are copied from
the contracts; where the code and earlier descriptions disagreed, the code wins.

## Roles and parameters

- **Maker**: the party that generates the secret. In the Ethereum escrow the maker
  is the account that calls `createSwap`; in the Polkadot escrow it is the address
  passed as `maker`, the only address allowed to claim with the secret.
- **Taker**: the counterparty. In the Ethereum escrow it is the `taker` argument,
  the only address allowed to claim the ETH; in the Polkadot escrow it is the
  account that calls `createNativeSwap` and the one refunded on cancellation.
- **Secret**: a `bytes32` value. The hash lock is `keccak256(abi.encodePacked(secret))`.
- **Swap ID**: a `bytes32` chosen by the creator; the same ID is used on both chains.
- **Timelocks**: `DotFusionEthereumEscrow.MIN_TIMELOCK` is 12 hours (the timelock
  must be at least this); `DotFusionPolkadotEscrow.MAX_TIMELOCK` is 6 hours (the
  timelock must be at most this). The frontend and the resolver use exactly 12 h
  and 6 h.
- **Rate**: the frontend and the resolver use a fixed rate of 1 ETH = 100,000 DOT.
  The Ethereum escrow stores the rate it is given but does not check it.

## ETH to DOT flow

```
Maker (user)                         Taker (resolver)
     |                                      |
     | 1. secret = random bytes32           |
     |    hash = keccak256(secret)          |
     |                                      |
     | 2. Sepolia: createSwap(..., hash)    |
     |    locks ETH, timelock >= 12 h       |
     |------------------------------------->|
     |                                      | 3. Paseo: createNativeSwap(id, hash,
     |                                      |    maker, timelock), locks DOT,
     |<-------------------------------------|    timelock <= 6 h
     |                                      |
     | 4. Paseo: completeSwap(id, secret,   |
     |    target) -> DOT sent to target     |
     |    secret is now public on Paseo     |
     |------------------------------------->|
     |                                      | 5. Sepolia: completeSwap(id, secret)
     |                                      |    -> ETH sent to taker
```

If the taker never locks DOT, the maker calls `cancelSwap` on Sepolia after the
timelock and gets the ETH back. If the maker never reveals, the taker calls
`cancelSwap` on Paseo after its shorter timelock. Because the Paseo timelock is
shorter, the maker has to reveal while the taker still has time to claim on Sepolia.

## DotFusionEthereumEscrow (`EthereumEscrow.sol`)

Holds native ETH. Constructor: `(uint32 _rescueDelay, address _accessToken)`.

| Function | Who may call | Effect |
| --- | --- | --- |
| `createSwap(bytes32 swapId, bytes32 secretHash, address payable taker, uint256 ethAmount, uint256 dotAmount, uint256 exchangeRate, uint256 timelock, bytes32 polkadotSender)` | anyone (becomes maker); `msg.value` must equal `ethAmount` | Opens a swap |
| `completeSwap(bytes32 swapId, bytes32 secret)` | taker only | Sends the ETH to the taker |
| `cancelSwap(bytes32 swapId)` | maker only, after `unlockTime` | Refunds the maker |
| `publicCancelSwap(bytes32 swapId)` | anyone (the access-token check is not implemented) | Refunds the maker after `unlockTime` |
| `rescueFunds(bytes32 swapId)` | owner, after `unlockTime + rescueDelay` | Sends a non-completed swap's ETH to the owner |
| `getSwap`, `canCancel`, `isValidSecret` | view | |

Events: `SwapCreated(swapId, secretHash, maker, taker, ethAmount, dotAmount,
exchangeRate, unlockTime, polkadotSender)`, `SwapCompleted(swapId, secret)`,
`SwapCancelled(swapId)`, `FundsRescued(swapId, amount)`.

## DotFusionPolkadotEscrow (`PolkadotEscrow.sol`)

Holds native DOT or an ERC-20 token. Constructor: `(uint32 _rescueDelay, address _accessToken)`.

| Function | Who may call | Effect |
| --- | --- | --- |
| `createNativeSwap(bytes32 swapId, bytes32 secretHash, address payable maker, uint256 timelock)` | anyone (becomes taker) | Locks `msg.value` |
| `createSwap(bytes32 swapId, bytes32 secretHash, address payable maker, IERC20 token, uint256 amount, uint256 timelock)` | anyone (becomes taker) | Locks ERC-20 tokens; `msg.value` is kept as a safety deposit |
| `completeSwap(bytes32 swapId, bytes32 secret, address target)` | maker only | Sends the funds to `target`, then tries `xcmBridge.propagateSecret` (a failure there is ignored) |
| `cancelSwap(bytes32 swapId)` | taker only, after `unlockTime` | Refunds the taker |
| `publicCancelSwap(bytes32 swapId)` | anyone, after `unlockTime` | Refunds the taker |
| `rescueFunds(bytes32 swapId)` | owner, after `unlockTime + rescueDelay` | Sends a non-completed swap's funds to the owner |
| `setXCMBridge(address)` | owner | Links the bridge |
| `propagateSecretToEthereum(bytes32 swapId, bytes32 secret)` | anyone, for a completed swap | Retries the bridge call |
| `receiveSwap(...)` | anyone | Compatibility stub: stores nothing, only emits `SwapCompleted` |

Events: `SwapCreated(swapId, secretHash, maker, taker, token, amount, unlockTime)`,
`SwapCompleted(swapId, secret)`, `SwapCancelled(swapId)`, `FundsRescued`.

## DotFusionXCMBridge (`XCMBridge.sol`)

Calls the XCM precompile at `0x0000000000000000000000000000000000000804`.

| Function | Who may call | Effect |
| --- | --- | --- |
| `configureBridge(address _escrow, address _ethereumEscrow, uint32 _ethereumParaId)` | owner | Stores the Polkadot escrow; the other two values are only emitted in `BridgeConfigured` |
| `propagateSecret(bytes32 swapId, bytes32 secret)` | Polkadot escrow only | Calls the precompile's `send(uint32,bytes,uint64)` with `xcmFee` from the bridge's balance |
| `sendToEthereum(bytes32 swapId, bytes32 secret)` | anyone, paying at least `xcmFee` | Same call, fee paid by the caller |
| `receiveFromEthereum(...)` | anyone | Forwards to the escrow's `receiveSwap` stub |
| `updateXCMFee`, `withdrawFees` | owner | Fee management (default `xcmFee` is 0.01 ether) |

The destination is the constant `ETHEREUM_PARACHAIN_ID = 1000` (marked as an
example in the code) and the target address is the constant
`ETHEREUM_ESCROW_ADDRESS = 0x0`. The payload is an ABI-encoded placeholder, not a
SCALE-encoded XCM program. Sepolia is not reachable over XCM, so this path does
not complete the Ethereum side of a swap; the taker completes it with
`completeSwap` on Sepolia.

## Deployment and bridge configuration

`packages/hardhat/deploy/00_deploy_all.ts` deploys all three contracts to the
selected network with a rescue delay of 7 days and a zero access token, calls
`configureBridge(polkadotEscrow, ethereumEscrow, 1000)`, and then
`setXCMBridge(bridge)` on the Polkadot escrow. If the bridge needs to be
configured again:

```bash
yarn configure-bridge --network paseo
yarn workspace @se-2/hardhat check-bridge --network paseo
```
