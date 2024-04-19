const path = require("path");
const { generateIdl } = require("@metaplex-foundation/shank-js");

const idlDir = path.join(__dirname, "..", "idls");
const binaryInstallDir = path.join(__dirname, "..", ".crates");
const programDir = path.join(__dirname, "..", "programs");

generateIdl({
  generator: "shank",
  programName: "bgl_glyphs_program",
  programId: "GLYPHQ8TkcUZYrdbMLkfWUzfdKPyCc9JLf987iNY5MAs",
  idlDir,
  binaryInstallDir,
  programDir: path.join(programDir, "bgl-glyphs"),
});
