/**
 * ArcStable deployed contract configuration
 *
 * ARCS token:  Arc Mainnet — 0xFb3a730cdb68D6EC773b85bD4C44Fd5daAb9AeBB (18 decimals, 1B supply)
 * Pool + governance contracts: Arc Testnet (pending mainnet redeploy)
 * Switch CHAIN_ID and pool addresses to Arc Mainnet once remaining contracts are redeployed there.
 */
import arcStablePoolArtifact from '../contracts/out/ArcStable.sol/ArcStablePool.json';
import veARCSArtifact from '../contracts/out/ArcStable.sol/veARCS.json';
import gaugeControllerArtifact from '../contracts/out/ArcStable.sol/GaugeController.json';
import arcsTokenArtifact from '../contracts/out/ArcStable.sol/ARCSToken.json';
import buybackBurnerArtifact from '../contracts/out/ArcStableExtensions.sol/BuybackBurner.json';
import revenueDistributorArtifact from '../contracts/out/ArcStableExtensions.sol/RevenueDistributor.json';

// Arc Mainnet = 5042, Arc Testnet = 5042002
export const ARC_CHAIN_ID = 5042;

// ARCS governance token — live on Arc Mainnet
export const ARCS_TOKEN_ADDRESS = '0xFb3a730cdb68D6EC773b85bD4C44Fd5daAb9AeBB' as const;
export const ARCS_DECIMALS = 18; // ARCS is 18 decimals

// Protocol contracts — Arc Mainnet (live)
export const VE_ARCS_ADDRESS = '0x40245f5C8Fe27A4525522FC684e0005b95D71cCF' as const;
export const POOL_ADDRESS = '0xecB0dCd298823a9667ED6a30c43A45935c325f6d' as const;
export const GAUGE_ADDRESS = '0xe54b73059d19Fa5d909bBbFEcbE6137bC9a50299' as const;
export const BUYBACK_BURNER_ADDRESS = '0xd6Aa70FE28f61cdeD7451acc4ecB7c106116eb9A' as const;
export const REVENUE_DISTRIBUTOR_ADDRESS = '0x1568c7C9aF826e7803F762028E9581f302e94534' as const;

// Token addresses — same on both Arc Mainnet and Arc Testnet
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const;
export const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as const;
export const USDC_DECIMALS = 6;

export const ARCS_TOKEN = { address: ARCS_TOKEN_ADDRESS, abi: arcsTokenArtifact.abi } as const;
export const VE_ARCS = { address: VE_ARCS_ADDRESS, abi: veARCSArtifact.abi } as const;
export const STABLE_POOL = { address: POOL_ADDRESS, abi: arcStablePoolArtifact.abi } as const;
export const GAUGE = { address: GAUGE_ADDRESS, abi: gaugeControllerArtifact.abi } as const;
export const BUYBACK_BURNER = { address: BUYBACK_BURNER_ADDRESS, abi: buybackBurnerArtifact.abi } as const;
export const REVENUE_DISTRIBUTOR = { address: REVENUE_DISTRIBUTOR_ADDRESS, abi: revenueDistributorArtifact.abi } as const;
