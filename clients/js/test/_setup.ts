/* eslint-disable import/no-extraneous-dependencies */
import { createUmi as basecreateUmi } from '@metaplex-foundation/umi-bundle-tests';
import { bglGlyphs } from '../src';

export const createUmi = async () =>
  (await basecreateUmi()).use(bglGlyphs());
