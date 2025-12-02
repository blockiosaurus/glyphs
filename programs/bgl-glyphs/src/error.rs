use num_derive::FromPrimitive;
use solana_program::{
    decode_error::DecodeError,
    msg,
    program_error::{PrintProgramError, ProgramError},
};
use thiserror::Error;

#[derive(Error, Clone, Debug, Eq, PartialEq, FromPrimitive)]
pub enum BglGlyphsError {
    /// 0 - Invalid System Program
    #[error("Invalid System Program")]
    InvalidSystemProgram,

    /// 1 - Error deserializing account
    #[error("Error deserializing account")]
    DeserializationError,

    /// 2 - Error serializing account
    #[error("Error serializing account")]
    SerializationError,

    /// 3 - Invalid MPL Core Program
    #[error("Invalid MPL Core Program")]
    InvalidMplCoreProgram,

    /// 4 - Invalid Slot Tracker
    #[error("Invalid Slot Tracker")]
    InvalidSlotTracker,

    /// 5 - Invalid Glyph Signer
    #[error("Invalid Glyph Signer")]
    InvalidGlyphSigner,

    /// 6 - Numerical Overflow
    #[error("Numerical Overflow")]
    NumericalOverflow,

    /// 7 - Already Excavated
    #[error("Already Excavated")]
    AlreadyExcavated,

    /// 8 - Invalid Collection
    #[error("Invalid Collection")]
    InvalidCollection,

    /// 9 - Invalid Asset
    #[error("Invalid Asset")]
    InvalidAsset,

    /// 10 - Missing Required Signature
    #[error("Missing Required Signature")]
    MissingSignature,

    /// 11 - Invalid Slot Tracker Key
    #[error("Invalid Slot Tracker Key")]
    InvalidSlotTrackerKey,
}

impl PrintProgramError for BglGlyphsError {
    fn print<E>(&self) {
        msg!(&self.to_string());
    }
}

impl From<BglGlyphsError> for ProgramError {
    fn from(e: BglGlyphsError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl<T> DecodeError<T> for BglGlyphsError {
    fn type_of() -> &'static str {
        "Bgl Glyphs Error"
    }
}
