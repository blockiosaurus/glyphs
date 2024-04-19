import { UmiPlugin } from '@metaplex-foundation/umi';
import { createBglGlyphsProgram } from './generated';

export const bglGlyphs = (): UmiPlugin => ({
  install(umi) {
    umi.programs.add(createBglGlyphsProgram(), false);
  },
});
