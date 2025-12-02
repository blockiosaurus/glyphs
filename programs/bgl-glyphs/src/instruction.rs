use borsh::{BorshDeserialize, BorshSerialize};
use shank::{ShankContext, ShankInstruction};

#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, ShankContext, ShankInstruction)]
#[rustfmt::skip]
pub enum BglGlyphsInstruction {
    /// Excavate a Glyph
    /// Creates a Glyph asset of the appropriate rarity.
    #[account(0, writable, signer, name="asset", desc = "The asset to be created")]
    #[account(1, writable, name="collection", desc = "The collection to which the asset belongs")]
    #[account(2, writable, signer, name="payer", desc = "The account paying for the storage fees")]
    #[account(3, writable, name="slot_tracker", desc = "The slot tracker account")]
    #[account(4, writable, name="glyph_signer", desc = "The global signer for the Glyph program")]
    #[account(5, name="system_program", desc = "The system program")]
    #[account(6, name="mpl_core", desc = "The mpl_core program")]
    Excavate(ExcavateArgs),
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub struct ExcavateArgs {}
