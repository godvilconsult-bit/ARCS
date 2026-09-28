# ArcStable — Curve-Style Stable AMM on Arc

> Built with Arc Studio - money-powered apps in minutes

## ARCS Token — Arc Mainnet (LIVE)

| Token | Address | Explorer |
|---|---|---|
| ARCS (ARCSTABLE) | `0xFb3a730cdb68D6EC773b85bD4C44Fd5daAb9AeBB` | [view](https://explorer.arc.io/address/0xFb3a730cdb68D6EC773b85bD4C44Fd5daAb9AeBB) |

Token: name=ARCSTABLE, symbol=ARCS, decimals=18, totalSupply=1,000,000,000 ARCS

## Protocol Contracts — Arc Mainnet (LIVE)

| Contract | Address | Explorer |
|---|---|---|
| veARCS | `0x40245f5C8Fe27A4525522FC684e0005b95D71cCF` | [view](https://explorer.arc.io/address/0x40245f5C8Fe27A4525522FC684e0005b95D71cCF) |
| ArcStablePool (USDC/EURC) | `0xecB0dCd298823a9667ED6a30c43A45935c325f6d` | [view](https://explorer.arc.io/address/0xecB0dCd298823a9667ED6a30c43A45935c325f6d) |
| GaugeController | `0xe54b73059d19Fa5d909bBbFEcbE6137bC9a50299` | [view](https://explorer.arc.io/address/0xe54b73059d19Fa5d909bBbFEcbE6137bC9a50299) |
| BuybackBurner | `0xd6Aa70FE28f61cdeD7451acc4ecB7c106116eb9A` | [view](https://explorer.arc.io/address/0xd6Aa70FE28f61cdeD7451acc4ecB7c106116eb9A) |
| RevenueDistributor | `0x1568c7C9aF826e7803F762028E9581f302e94534` | [view](https://explorer.arc.io/address/0x1568c7C9aF826e7803F762028E9581f302e94534) |

Pool: token0=USDC (0x3600…), token1=EURC (0x89B5…), A=100, fee=4bps. Weekly emission: 1M ARCS/week.

### Extension Contracts (Deflationary Engine)

| Contract | Address | Explorer |
|---|---|---|
| BuybackBurner | `0x08e139f634c5838b59101094a9fc2607be33a2f7` | [view](https://explorer.testnet.arc.io/address/0x08e139f634c5838b59101094a9fc2607be33a2f7) |
| RevenueDistributor | `0xcd92724ab63db3d248cb50342251e4a37233ec09` | [view](https://explorer.testnet.arc.io/address/0xcd92724ab63db3d248cb50342251e4a37233ec09) |

BuybackBurner: receives USDC fees from pool, swaps into ARCS and burns to 0xdead when arcsPool is configured.
RevenueDistributor: distributes real USDC yield pro-rata to veARCS holders every weekly epoch.

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

[Brief description of what the app does and its primary use case]

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```
