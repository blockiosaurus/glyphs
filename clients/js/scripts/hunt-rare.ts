/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import { createSignerFromKeypair, generateSigner, keypairIdentity } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { fetchAssetV1 } from '@metaplex-foundation/mpl-core';
import { bglGlyphs, excavate } from '../src';

// Load .env from scripts directory
dotenv.config({ path: path.join(__dirname, '..', '..', 'scripts', '.env') });

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const KEYPAIR_PATH = process.env.KEYPAIR_PATH || path.join(process.env.HOME!, '.config/solana/id.json');
const BURST_COUNT = parseInt(process.env.BURST_COUNT || '5', 10); // Number of transactions to fire per attempt
const BURST_SPREAD_MS = parseInt(process.env.BURST_SPREAD_MS || '200', 10); // Ms between each transaction in burst
const RPC_LATENCY_MS = parseInt(process.env.RPC_LATENCY_MS || '3000', 10); // Expected RPC round-trip latency
const SLOT_TIME_MS = parseInt(process.env.SLOT_TIME_MS || '400', 10); // Slot duration in ms

// Rarity masks (must match Rust program)
const MASKS = {
  neon: 67_108_863n, // 2^26 - 1
  obsidian: 16_777_215n, // 2^24 - 1
  gold: 4_194_303n, // 2^22 - 1
  silver: 1_048_575n, // 2^20 - 1
  jade: 1023n, // 2^10 - 1
};

const DIVISORS = {
  neon: 67_108_864n, // 2^26
  obsidian: 16_777_216n, // 2^24
  gold: 4_194_304n, // 2^22
  silver: 1_048_576n, // 2^20
  jade: 1024n, // 2^10
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const rarityColors: Record<string, string> = {
  Neon: colors.magenta + colors.bright,
  Obsidian: colors.white + colors.bright,
  Gold: colors.yellow + colors.bright,
  Silver: colors.white,
  Bronze: colors.yellow,
  Jade: colors.green,
  Stone: colors.dim,
};

function getRarityForSlot(slot: bigint, epochFirstSlot: bigint): string {
  if ((slot & MASKS.neon) === 0n) return 'Neon';
  if ((slot & MASKS.obsidian) === 0n) return 'Obsidian';
  if ((slot & MASKS.gold) === 0n) return 'Gold';
  if ((slot & MASKS.silver) === 0n) return 'Silver';
  if (slot === epochFirstSlot) return 'Bronze';
  if ((slot & MASKS.jade) === 0n) return 'Jade';
  return 'Stone';
}

function getNextRareSlot(currentSlot: bigint, epochFirstSlot: bigint): { slot: bigint; rarity: string } {
  // Calculate next slot for each rarity tier
  const candidates: { slot: bigint; rarity: string }[] = [];

  // Next Jade slot
  const nextJade = ((currentSlot / DIVISORS.jade) + 1n) * DIVISORS.jade;
  candidates.push({ slot: nextJade, rarity: 'Jade' });

  // Next Silver slot
  const nextSilver = ((currentSlot / DIVISORS.silver) + 1n) * DIVISORS.silver;
  candidates.push({ slot: nextSilver, rarity: 'Silver' });

  // Next Gold slot
  const nextGold = ((currentSlot / DIVISORS.gold) + 1n) * DIVISORS.gold;
  candidates.push({ slot: nextGold, rarity: 'Gold' });

  // Next Obsidian slot
  const nextObsidian = ((currentSlot / DIVISORS.obsidian) + 1n) * DIVISORS.obsidian;
  candidates.push({ slot: nextObsidian, rarity: 'Obsidian' });

  // Next Neon slot
  const nextNeon = ((currentSlot / DIVISORS.neon) + 1n) * DIVISORS.neon;
  candidates.push({ slot: nextNeon, rarity: 'Neon' });

  // Bronze is special - we'd need epoch schedule info
  // For now we'll skip Bronze hunting (it requires epoch schedule)

  // Sort by slot (soonest first) and return the best rarity for each slot
  candidates.sort((a, b) => (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0));

  // Return the soonest rare slot, but check if a rarer tier shares the same slot
  const soonest = candidates[0];

  // Check if any rarer tiers share the same slot
  for (const candidate of candidates) {
    if (candidate.slot === soonest.slot) {
      // This is rarer (earlier in our priority order from the rarity check)
      const actualRarity = getRarityForSlot(candidate.slot, epochFirstSlot);
      return { slot: candidate.slot, rarity: actualRarity };
    }
  }

  return soonest;
}

function formatDuration(slots: bigint): string {
  const seconds = (Number(slots) * SLOT_TIME_MS) / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  console.log(`${colors.cyan}${colors.bright}=== Glyph Rarity Hunter ===${colors.reset}\n`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Keypair: ${KEYPAIR_PATH}`);
  console.log(`Burst size: ${BURST_COUNT} transactions`);
  console.log(`RPC latency: ${RPC_LATENCY_MS}ms (adjust with RPC_LATENCY_MS env var)\n`);

  // Load keypair
  const keypairFile = fs.readFileSync(KEYPAIR_PATH, 'utf-8');
  const keypairData = JSON.parse(keypairFile);

  // Create Umi instance
  const umi = createUmi(RPC_URL).use(bglGlyphs());

  // Set up identity
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData));
  const payer = createSignerFromKeypair(umi, keypair);
  umi.use(keypairIdentity(keypair));

  console.log(`Payer: ${payer.publicKey}`);

  // Get initial balance
  const balance = await umi.rpc.getBalance(payer.publicKey);
  console.log(`Balance: ${Number(balance.basisPoints) / 1e9} SOL\n`);

  // Main hunting loop
  let mintCount = 0;
  const minted: { slot: bigint; rarity: string; asset: string }[] = [];

  console.log(`${colors.green}Starting hunt... Press Ctrl+C to stop${colors.reset}\n`);

  while (true) {
    try {
      // Get current slot
      const currentSlot = BigInt(await umi.rpc.getSlot());

      // For now, use 0 as epoch first slot (Bronze detection won't work perfectly)
      // In production, you'd query the epoch schedule
      const epochFirstSlot = 0n;

      // Find next rare slot
      const { slot: targetSlot, rarity: expectedRarity } = getNextRareSlot(currentSlot, epochFirstSlot);
      const slotsUntil = targetSlot - currentSlot;

      // Display status
      const color = rarityColors[expectedRarity] || colors.reset;
      process.stdout.write(
        `\r${colors.dim}Slot ${currentSlot}${colors.reset} | ` +
          `Next: ${color}${expectedRarity}${colors.reset} at slot ${targetSlot} ` +
          `(${slotsUntil} slots, ~${formatDuration(slotsUntil)})   `
      );

      // Account for RPC latency when timing the burst
      // We need to fire transactions RPC_LATENCY_MS before we want them to land
      const burstDuration = (BURST_COUNT - 1) * BURST_SPREAD_MS; // ms between first and last tx
      const totalLeadTime = RPC_LATENCY_MS + burstDuration / 2; // time before target to start
      const slotsForBurst = Math.ceil(totalLeadTime / SLOT_TIME_MS) + 2; // slots needed + buffer

      if (slotsUntil <= BigInt(slotsForBurst) && slotsUntil > 0n) {
        // Calculate when to fire to center burst on target slot
        // Target slot is ~(slotsUntil * SLOT_TIME_MS)ms away in real time
        // But transactions take RPC_LATENCY_MS to land
        const msUntilTarget = Number(slotsUntil) * SLOT_TIME_MS;
        const halfBurst = burstDuration / 2;
        // Fire early to account for RPC latency, centered around target
        const initialDelay = Math.max(0, msUntilTarget - RPC_LATENCY_MS - halfBurst);

        console.log(`\n\n${colors.yellow}${colors.bright}Approaching ${expectedRarity} slot!${colors.reset}`);
        console.log(`Firing ${BURST_COUNT} transactions centered on target (delay: ${initialDelay}ms)...`);

        // Generate multiple asset keypairs
        const assets = Array.from({ length: BURST_COUNT }, () => generateSigner(umi));

        // Wait for initial delay, then stagger transactions ~200ms apart
        // This centers the burst around the target slot
        await sleep(initialDelay);

        const txPromises = assets.map((asset, i) =>
          sleep(i * BURST_SPREAD_MS).then(() =>
            excavate(umi, { asset, payer })
              .sendAndConfirm(umi)
              .then((tx) => ({ success: true as const, asset, tx }))
              .catch((err) => ({ success: false as const, asset, error: err }))
          )
        );

        const results = await Promise.all(txPromises);

        // Process results
        let successCount = 0;
        let alreadyExcavatedCount = 0;

        for (const result of results) {
          if (result.success) {
            successCount += 1;

            // Wait a moment then fetch asset data
            await sleep(300);

            try {
              const assetData = await fetchAssetV1(umi, result.asset.publicKey);
              const attributes = (assetData as any).attributes?.attributeList || [];
              const rarityAttr = attributes.find((a: any) => a.key === 'Rarity');
              const actualRarity = rarityAttr?.value || 'Unknown';
              const slotAttr = attributes.find((a: any) => a.key === 'Slot');
              const actualSlot = slotAttr?.value || 'Unknown';

              mintCount += 1;
              minted.push({ slot: BigInt(actualSlot), rarity: actualRarity, asset: result.asset.publicKey.toString() });

              const rarityColor = rarityColors[actualRarity] || colors.reset;
              console.log(
                `${colors.green}SUCCESS!${colors.reset} ` +
                  `Minted ${rarityColor}${actualRarity} Glyph${colors.reset} at slot ${actualSlot}`
              );
              console.log(`  Asset: ${result.asset.publicKey}`);
            } catch (fetchErr) {
              console.log(`${colors.green}SUCCESS!${colors.reset} Asset: ${result.asset.publicKey} (couldn't fetch details)`);
            }
          } else {
            const errMsg = result.error?.message || '';
            if (errMsg.includes('AlreadyExcavated')) {
              alreadyExcavatedCount += 1;
            } else if (errMsg.includes('insufficient funds')) {
              console.log(`${colors.red}Insufficient funds!${colors.reset}`);
            }
            // Silently ignore other errors (expected for burst transactions)
          }
        }

        console.log(
          `\nBurst complete: ${colors.green}${successCount} minted${colors.reset}, ` +
            `${alreadyExcavatedCount} blocked (slot taken), ` +
            `${BURST_COUNT - successCount - alreadyExcavatedCount} failed`
        );
        console.log(`Total minted this session: ${mintCount}\n`);

        // Delay before continuing to let slots advance
        await sleep(2000);
      } else if (slotsUntil > 50n) {
        // If target is far away, sleep longer
        await sleep(5000);
      } else {
        // Poll more frequently as we get closer
        await sleep(400);
      }
    } catch (err: any) {
      console.error(`\n${colors.red}Error: ${err.message}${colors.reset}`);
      await sleep(5000);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n\n${colors.cyan}Hunt complete!${colors.reset}`);
  process.exit(0);
});

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
