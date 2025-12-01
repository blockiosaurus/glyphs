import { generateSigner, sol } from '@metaplex-foundation/umi';
import test from 'ava';
import { addressPluginAuthority, AssetV1, createCollectionV1, fetchAssetV1, MPL_CORE_PROGRAM_ID, pluginAuthorityPair } from '@metaplex-foundation/mpl-core';
import { excavate, GLOBAL_SIGNER_ID, SLOT_TRACKER_ID } from '../src';
import { createUmi } from './_setup';

test('it can excavate a glyph', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const minter = generateSigner(umi);
  await umi.rpc.airdrop(minter.publicKey, sol(10));
  const asset = generateSigner(umi);
  const collection = generateSigner(umi);

  await createCollectionV1(umi, {
    collection,
    name: 'Glyphs',
    uri: 'www.example.com',
    plugins: [pluginAuthorityPair({
      type: 'UpdateDelegate',
      authority: addressPluginAuthority(GLOBAL_SIGNER_ID),
    })]
  }).sendAndConfirm(umi);

  // When we create a new account.
  const tx = await excavate(umi, {
    asset,
    collection: collection.publicKey,
    mplCore: MPL_CORE_PROGRAM_ID,
    payer: minter,
    slotTracker: SLOT_TRACKER_ID,
    glyphSigner: GLOBAL_SIGNER_ID,
  }).sendAndConfirm(umi);

  console.log(await umi.rpc.getTransaction(tx.signature));

  const assetData = await fetchAssetV1(umi, asset.publicKey);
  // console.log(assetData);
  // console.log(assetData.attributes?.attributeList);

  const slot = assetData.attributes?.attributeList?.find(a => a.key === 'Slot')?.value;

  t.like(assetData, <AssetV1>{
    publicKey: asset.publicKey,
    owner: minter.publicKey,
    updateAuthority: {
      type: 'Collection',
      address: collection.publicKey,
    },
    name: 'TEST NAME',
    uri: 'TEST_URI',
    attributes: {
      authority: { type: 'None' },
      attributeList: [
        { key: 'Rarity', value: 'Stone' },
        { key: 'Epoch', value: '0' },
        { key: 'Slot', value: slot },
      ],
    }
  });
});

test('it cannot excavate two glyphs in the same slot', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const minter = generateSigner(umi);
  await umi.rpc.airdrop(minter.publicKey, sol(10));
  const asset = generateSigner(umi);
  const collection = generateSigner(umi);

  await createCollectionV1(umi, {
    collection,
    name: 'Glyphs',
    uri: 'www.example.com',
    plugins: [pluginAuthorityPair({
      type: 'UpdateDelegate',
      authority: addressPluginAuthority(GLOBAL_SIGNER_ID),
    })]
  }).sendAndConfirm(umi);

  // When we create a new account.
  const result = excavate(umi, {
    asset,
    collection: collection.publicKey,
    mplCore: MPL_CORE_PROGRAM_ID,
    payer: minter,
    slotTracker: SLOT_TRACKER_ID,
    glyphSigner: GLOBAL_SIGNER_ID,
  }).add(excavate(umi, {
    asset,
    collection: collection.publicKey,
    mplCore: MPL_CORE_PROGRAM_ID,
    payer: minter,
    slotTracker: SLOT_TRACKER_ID,
    glyphSigner: GLOBAL_SIGNER_ID,
  })).sendAndConfirm(umi);

  await t.throwsAsync(result, { name: "AlreadyExcavated" });
});
