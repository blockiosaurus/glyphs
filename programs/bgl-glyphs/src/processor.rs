use borsh::BorshDeserialize;
use mpl_core::instructions::CreateV1CpiBuilder;
use mpl_core::types::{Attribute, Attributes, Plugin, PluginAuthority, PluginAuthorityPair};
use mpl_utils::create_or_allocate_account_raw;
use solana_program::clock::Clock;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program::invoke,
    pubkey::Pubkey, system_instruction, system_program, sysvar::Sysvar,
};

use crate::error::BglGlyphsError;
use crate::instruction::accounts::ExcavateAccounts;
use crate::instruction::{BglGlyphsInstruction, ExcavateArgs};
use crate::state::{
    Key, Rarity, SlotTracker, COLLECTION_KEY, GLOBAL_SIGNER, GLOBAL_SIGNER_BUMP, GLOBAL_SIGNER_KEY,
    MINT_FEE, PREFIX, SLOT_TRACKER, SLOT_TRACKER_BUMP, SLOT_TRACKER_KEY,
};

pub fn process_instruction<'a>(
    _program_id: &Pubkey,
    accounts: &'a [AccountInfo<'a>],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction: BglGlyphsInstruction = BglGlyphsInstruction::try_from_slice(instruction_data)?;
    match instruction {
        BglGlyphsInstruction::Excavate(args) => {
            msg!("Instruction: Excavate");
            excavate(accounts, args)
        }
    }
}

fn excavate<'a>(accounts: &'a [AccountInfo<'a>], _args: ExcavateArgs) -> ProgramResult {
    // Accounts.
    let ctx = ExcavateAccounts::context(accounts)?;
    let clock = Clock::get()?;

    // Guards.
    if *ctx.accounts.slot_tracker.key != SLOT_TRACKER_KEY {
        return Err(BglGlyphsError::InvalidSlotTracker.into());
    }

    if *ctx.accounts.glyph_signer.key != GLOBAL_SIGNER_KEY {
        return Err(BglGlyphsError::InvalidGlyphSigner.into());
    }

    if *ctx.accounts.system_program.key != system_program::ID {
        return Err(BglGlyphsError::InvalidSystemProgram.into());
    }

    if *ctx.accounts.mpl_core.key != mpl_core::ID {
        return Err(BglGlyphsError::InvalidMplCoreProgram.into());
    }

    if *ctx.accounts.collection.key != COLLECTION_KEY {
        return Err(BglGlyphsError::InvalidCollection.into());
    }

    // Verify required signers
    if !ctx.accounts.payer.is_signer {
        return Err(BglGlyphsError::MissingSignature.into());
    }

    if !ctx.accounts.asset.is_signer {
        return Err(BglGlyphsError::MissingSignature.into());
    }

    // Create the slot tracker if it doesn't exist.
    let mut slot_tracker = if *ctx.accounts.slot_tracker.owner == system_program::ID
        && ctx.accounts.slot_tracker.data_is_empty()
    {
        create_or_allocate_account_raw(
            crate::ID,
            ctx.accounts.slot_tracker,
            ctx.accounts.system_program,
            ctx.accounts.payer,
            SlotTracker::LEN,
            &[
                PREFIX.as_bytes(),
                SLOT_TRACKER.as_bytes(),
                &[SLOT_TRACKER_BUMP],
            ],
        )?;

        SlotTracker {
            key: Key::SlotTracker,
            last_slot: clock.slot - 1,
        }
    } else {
        let tracker = SlotTracker::load(ctx.accounts.slot_tracker)?;
        // Validate the loaded slot tracker has the correct key type
        if !matches!(tracker.key, Key::SlotTracker) {
            return Err(BglGlyphsError::InvalidSlotTrackerKey.into());
        }
        tracker
    };

    if slot_tracker.last_slot >= clock.slot {
        return Err(BglGlyphsError::AlreadyExcavated.into());
    } else {
        slot_tracker.last_slot = clock.slot;
    }

    slot_tracker.save(ctx.accounts.slot_tracker)?;

    // Transfer minting fee to the global signer PDA
    invoke(
        &system_instruction::transfer(
            ctx.accounts.payer.key,
            ctx.accounts.glyph_signer.key,
            MINT_FEE,
        ),
        &[
            ctx.accounts.payer.clone(),
            ctx.accounts.glyph_signer.clone(),
            ctx.accounts.system_program.clone(),
        ],
    )?;

    let rarity = Rarity::get_rarity()?;

    // Create the Asset.
    CreateV1CpiBuilder::new(ctx.accounts.mpl_core)
        .asset(ctx.accounts.asset)
        .collection(Some(ctx.accounts.collection))
        .payer(ctx.accounts.payer)
        .authority(Some(ctx.accounts.glyph_signer))
        .system_program(ctx.accounts.system_program)
        .name(rarity.name())
        .uri(rarity.uri())
        .plugins(vec![PluginAuthorityPair {
            plugin: Plugin::Attributes(Attributes {
                attribute_list: vec![
                    Attribute {
                        key: "Rarity".to_owned(),
                        value: rarity.to_string(),
                    },
                    Attribute {
                        key: "Epoch".to_owned(),
                        value: clock.epoch.to_string(),
                    },
                    Attribute {
                        key: "Slot".to_owned(),
                        value: clock.slot.to_string(),
                    },
                ],
            }),
            authority: Some(PluginAuthority::None),
        }])
        .invoke_signed(&[&[
            PREFIX.as_bytes(),
            GLOBAL_SIGNER.as_bytes(),
            &[GLOBAL_SIGNER_BUMP],
        ]])?;

    Ok(())
}
