const path = require("path");

const programDir = path.join(__dirname, "..", "programs");

function getProgram(programBinary) {
  return path.join(programDir, ".bin", programBinary);
}

module.exports = {
  validator: {
    commitment: "processed",
    programs: [
      {
        label: "Bgl Glyphs",
        programId: "GLYPHQ8TkcUZYrdbMLkfWUzfdKPyCc9JLf987iNY5MAs",
        deployPath: getProgram("bgl_glyphs_program.so"),
      },
      // Below are external programs that should be included in the local validator.
      // You may configure which ones to fetch from the cluster when building
      // programs within the `configs/program-scripts/dump.sh` script.
      {
        label: "MPL Core",
        programId: "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d",
        deployPath: getProgram("mpl_core.so"),
      },
    ],
    accounts: [
      {
        label: 'Glyphs Collection',
        accountId: 'G1yphsa2NejzXMsUn2yDpNrT92DXpjucG47kxLvgVKft',
        cluster: 'https://api.devnet.solana.com',
      },
    ]
  },
};
