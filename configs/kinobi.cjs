const path = require("path");
const k = require("@metaplex-foundation/kinobi");

// Paths.
const clientDir = path.join(__dirname, "..", "clients");
const idlDir = path.join(__dirname, "..", "idls");

// Instanciate Kinobi.
const kinobi = k.createFromIdls([path.join(idlDir, "bgl_glyphs_program.json")]);

// Update programs.
kinobi.update(
  new k.updateProgramsVisitor({
    bglGlyphsProgram: { name: "bglGlyphs" },
  })
);

// Update accounts.
// kinobi.update(
//   new k.updateAccountsVisitor({
//     myPdaAccount: {
//       seeds: [
//         k.constantPdaSeedNodeFromString("myPdaAccount"),
//         k.programIdPdaSeedNode(),
//         k.variablePdaSeedNode("authority", k.publicKeyTypeNode(), "The address of the authority"),
//         k.variablePdaSeedNode("name", k.stringTypeNode(), "The name of the account"),
//       ],
//     },
//   })
// );

// Update instructions.
kinobi.update(
  new k.updateInstructionsVisitor({
    excavate: {
      accounts: {
        collection: {
          defaultValue: k.publicKeyValueNode("G1yphsa2NejzXMsUn2yDpNrT92DXpjucG47kxLvgVKft"),
        },
        glyphSigner: {
          defaultValue: k.publicKeyValueNode("3skJESN1mj5EMdYMA52ug8TUnsGFxF646F9nXow3CUru"),
        },
        mplCore: {
          defaultValue: k.publicKeyValueNode("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d"),
        },
        slotTracker: {
          defaultValue: k.publicKeyValueNode("4F1xoqW362RXP4YxjoTsMguWQWJYsCDwqG2VJxTgZLUe"),
        },
      }
    },
  })
);

// Set ShankAccount discriminator.
const key = (name) => ({ field: "key", value: k.enumValueNode("Key", name) });
kinobi.update(
  new k.setAccountDiscriminatorFromFieldVisitor({
    slotTracker: key("SlotTracker"),
  })
);

// Render JavaScript.
const jsDir = path.join(clientDir, "js", "src", "generated");
const prettier = require(path.join(clientDir, "js", ".prettierrc.json"));
kinobi.accept(new k.renderJavaScriptVisitor(jsDir, { prettier }));

// Render Rust.
const crateDir = path.join(clientDir, "rust");
const rustDir = path.join(clientDir, "rust", "src", "generated");
kinobi.accept(
  new k.renderRustVisitor(rustDir, {
    formatCode: true,
    crateFolder: crateDir,
  })
);
