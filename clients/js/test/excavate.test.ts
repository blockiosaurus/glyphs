import { generateSigner, sol } from '@metaplex-foundation/umi';
import test from 'ava';
import { AssetV1, fetchAssetV1 } from '@metaplex-foundation/mpl-core';
import { COLLECTION_ID, excavate } from '../src';
import { createUmi } from './_setup';

test('it can excavate a glyph', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const minter = generateSigner(umi);
  await umi.rpc.airdrop(minter.publicKey, sol(10));
  const asset = generateSigner(umi);

  // When we create a new account.
  const tx = await excavate(umi, {
    asset,
    payer: minter,
  }).sendAndConfirm(umi);

  console.log(await umi.rpc.getTransaction(tx.signature));

  const assetData = await fetchAssetV1(umi, asset.publicKey);
  console.log(assetData);
  console.log(assetData.attributes?.attributeList);

  const slot = assetData.attributes?.attributeList?.find(a => a.key === 'Slot')?.value;

  t.like(assetData, <AssetV1>{
    publicKey: asset.publicKey,
    owner: minter.publicKey,
    updateAuthority: {
      type: 'Collection',
      address: COLLECTION_ID,
    },
    name: 'Stone Glyph',
    uri: 'https://glyphs.quest/stone.json',
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

  // When we create a new account.
  const result = excavate(umi, {
    asset,
    payer: minter,
  }).add(excavate(umi, {
    asset,
    payer: minter,
  })).sendAndConfirm(umi);

  await t.throwsAsync(result, { name: "AlreadyExcavated" });
});
