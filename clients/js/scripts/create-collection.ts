/* eslint-disable no-console */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import { createSignerFromKeypair, generateSigner, keypairIdentity } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { addressPluginAuthority, createCollectionV1, pluginAuthorityPair } from '@metaplex-foundation/mpl-core';
import { bglGlyphs, GLOBAL_SIGNER_ID } from '../src';

// Load .env from scripts directory (compiled runs from dist/scripts/)
dotenv.config({ path: path.join(__dirname, '..', '..', 'scripts', '.env') });

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const KEYPAIR_PATH = process.env.KEYPAIR_PATH || path.join(process.env.HOME!, '.config/solana/id.json');
const { COLLECTION_KEYPAIR_PATH } = process.env;

// Collection metadata - update these for your official collection
const COLLECTION_NAME = 'Glyphs';
const COLLECTION_URI = 'https://www.glyphs.quest/collection.json';

async function main() {
  console.log('Creating Glyphs collection...');
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Payer Keypair: ${KEYPAIR_PATH}`);

  // Load payer keypair from file
  const keypairFile = fs.readFileSync(KEYPAIR_PATH, 'utf-8');
  const keypairData = JSON.parse(keypairFile);

  // Create Umi instance
  const umi = createUmi(RPC_URL).use(bglGlyphs());

  // Create keypair and set as identity
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData));
  const signer = createSignerFromKeypair(umi, keypair);
  umi.use(keypairIdentity(keypair));

  console.log(`Payer: ${signer.publicKey}`);
  console.log(`Global Signer (UpdateDelegate): ${GLOBAL_SIGNER_ID}`);

  // Load vanity collection keypair or generate a new one
  let collection;
  if (COLLECTION_KEYPAIR_PATH) {
    console.log(`\nUsing vanity keypair from: ${COLLECTION_KEYPAIR_PATH}`);
    const collectionKeypairFile = fs.readFileSync(COLLECTION_KEYPAIR_PATH, 'utf-8');
    const collectionKeypairData = JSON.parse(collectionKeypairFile);
    const collectionKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(collectionKeypairData));
    collection = createSignerFromKeypair(umi, collectionKeypair);
  } else {
    console.log('\nNo COLLECTION_KEYPAIR_PATH provided, generating random keypair...');
    collection = generateSigner(umi);
  }
  console.log(`Collection address: ${collection.publicKey}`);

  // Create the collection with UpdateDelegate plugin
  const tx = await createCollectionV1(umi, {
    collection,
    name: COLLECTION_NAME,
    uri: COLLECTION_URI,
    plugins: [
      pluginAuthorityPair({
        type: 'UpdateDelegate',
        authority: addressPluginAuthority(GLOBAL_SIGNER_ID),
      }),
    ],
  }).sendAndConfirm(umi);

  console.log('\nCollection created successfully!');
  console.log(`Signature: ${Buffer.from(tx.signature).toString('base64')}`);
  console.log(`\nCollection Public Key: ${collection.publicKey}`);
  console.log('\nAdd this to your environment or configuration:');
  console.log(`COLLECTION_ADDRESS=${collection.publicKey}`);
}

main().catch((err) => {
  console.error('Error creating collection:', err);
  process.exit(1);
});
