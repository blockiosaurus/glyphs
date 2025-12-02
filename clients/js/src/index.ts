import { publicKey } from '@metaplex-foundation/umi';

export * from './generated';
export * from './plugin';

export const GLOBAL_SIGNER_ID = publicKey("3skJESN1mj5EMdYMA52ug8TUnsGFxF646F9nXow3CUru");
export const GLOBAL_SIGNER_BUMP = 252;

export const SLOT_TRACKER_ID = publicKey("4F1xoqW362RXP4YxjoTsMguWQWJYsCDwqG2VJxTgZLUe");
export const SLOT_TRACKER_BUMP = 255;

export const COLLECTION_ID = publicKey("G1yphsa2NejzXMsUn2yDpNrT92DXpjucG47kxLvgVKft");