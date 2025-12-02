use borsh::{BorshDeserialize, BorshSerialize};
use power_of_two::power_of_two;
use shank::ShankAccount;
use solana_program::account_info::AccountInfo;
use solana_program::clock::Clock;
use solana_program::entrypoint::ProgramResult;
use solana_program::epoch_schedule::EpochSchedule;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use solana_program::sysvar::Sysvar;
use solana_program::{msg, pubkey};
use strum_macros::Display;

use crate::error::BglGlyphsError;

pub const PREFIX: &str = "GLYPH";
pub const GLOBAL_SIGNER: &str = "GLOBAL_SIGNER";
pub const SLOT_TRACKER: &str = "SLOT_TRACKER";
pub const GLOBAL_SIGNER_KEY: Pubkey = pubkey!("3skJESN1mj5EMdYMA52ug8TUnsGFxF646F9nXow3CUru");
pub const GLOBAL_SIGNER_BUMP: u8 = 252;
pub const SLOT_TRACKER_KEY: Pubkey = pubkey!("4F1xoqW362RXP4YxjoTsMguWQWJYsCDwqG2VJxTgZLUe");
pub const SLOT_TRACKER_BUMP: u8 = 255;
/// Minting fee in lamports (0.001 SOL)
pub const MINT_FEE: u64 = 1_000_000;
// TODO: Update with the actual collection address before deployment
pub const COLLECTION_KEY: Pubkey = pubkey!("G1yphsa2NejzXMsUn2yDpNrT92DXpjucG47kxLvgVKft");

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub enum Key {
    Uninitialized,
    SlotTracker,
}

#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, Display)]
pub enum Rarity {
    Stone,    // 1 per Slot
    Jade,     // 1 per 2^10 Slots
    Bronze,   // 1 per Epoch
    Silver,   // 1 per 2^20 Slots
    Gold,     // 1 per 2^22 Slots
    Obsidian, // 1 per 2^24 Slots
    Neon,     // 1 per 2^26 Slots
}

// #[repr(usize)]
// #[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
// pub enum RarityMask {
//     Stone = power_of_two!(0) - 1,     // 1 per Slot
//     Jade = power_of_two!(10) - 1,     // 1 per 2^10 Slots
//     Bronze,                           // 1 per Epoch
//     Silver = power_of_two!(20) - 1,   // 1 per 2^20 Slots
//     Gold = power_of_two!(22) - 1,     // 1 per 2^22 Slots
//     Obsidian = power_of_two!(24) - 1, // 1 per 2^24 Slots
//     Neon = power_of_two!(26) - 1,     // 1 per 2^26 Slots
// }

impl Rarity {
    const JADE_MASK: u64 = (power_of_two!(10) - 1) as u64; // 1 per 2^10 Slots
    const SILVER_MASK: u64 = (power_of_two!(20) - 1) as u64; // 1 per 2^20 Slots
    const GOLD_MASK: u64 = (power_of_two!(22) - 1) as u64; // 1 per 2^22 Slots
    const OBSIDIAN_MASK: u64 = (power_of_two!(24) - 1) as u64; // 1 per 2^24 Slots
    const NEON_MASK: u64 = (power_of_two!(26) - 1) as u64; // 1 per 2^26 Slots

    pub fn name(&self) -> String {
        match self {
            Rarity::Stone => "Stone Glyph".to_string(),
            Rarity::Jade => "Jade Glyph".to_string(),
            Rarity::Bronze => "Bronze Glyph".to_string(),
            Rarity::Silver => "Silver Glyph".to_string(),
            Rarity::Gold => "Gold Glyph".to_string(),
            Rarity::Obsidian => "Obsidian Glyph".to_string(),
            Rarity::Neon => "Neon Glyph".to_string(),
        }
    }

    pub fn uri(&self) -> String {
        match self {
            Rarity::Stone => "https://www.glyphs.quest/stone.json".to_string(),
            Rarity::Jade => "https://www.glyphs.quest/jade.json".to_string(),
            Rarity::Bronze => "https://www.glyphs.quest/bronze.json".to_string(),
            Rarity::Silver => "https://www.glyphs.quest/silver.json".to_string(),
            Rarity::Gold => "https://www.glyphs.quest/gold.json".to_string(),
            Rarity::Obsidian => "https://www.glyphs.quest/obsidian.json".to_string(),
            Rarity::Neon => "https://www.glyphs.quest/neon.json".to_string(),
        }
    }

    pub fn get_rarity() -> Result<Self, ProgramError> {
        let clock = Clock::get()?;
        match clock.slot {
            _ if clock.slot & Self::NEON_MASK == 0 => Ok(Rarity::Neon),
            _ if clock.slot & Self::OBSIDIAN_MASK == 0 => Ok(Rarity::Obsidian),
            _ if clock.slot & Self::GOLD_MASK == 0 => Ok(Rarity::Gold),
            _ if clock.slot & Self::SILVER_MASK == 0 => Ok(Rarity::Silver),
            _ if EpochSchedule::get()?.get_first_slot_in_epoch(clock.epoch) == clock.slot => {
                Ok(Rarity::Bronze)
            }
            _ if clock.slot & Self::JADE_MASK == 0 => Ok(Rarity::Jade),
            _ => Ok(Rarity::Stone),
        }
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct SlotTracker {
    pub key: Key,       // 1
    pub last_slot: u64, // 8
}

impl SlotTracker {
    pub const LEN: usize = 1 + 8;

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        SlotTracker::deserialize(&mut bytes).map_err(|error| {
            msg!("Error: {}", error);
            BglGlyphsError::DeserializationError.into()
        })
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        borsh::to_writer(&mut account.data.borrow_mut()[..], self).map_err(|error| {
            msg!("Error: {}", error);
            BglGlyphsError::SerializationError.into()
        })
    }
}
