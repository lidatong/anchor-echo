use std::mem::size_of;

use anchor_lang::prelude::*;
use borsh::BorshSerialize;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod anchor_echo {
    use super::*;

    pub fn initialize_echo(_ctx: Context<InitializeEcho>) -> Result<()> {
        Ok(())
    }

    pub fn echo(ctx: Context<Echo>, data: Vec<u8>) -> Result<()> {
        let echo_buffer = &mut ctx.accounts.echo_buffer;
        if echo_buffer.buffer.data.iter().any(|&byte| byte != 0) {
            return Err(error!(ErrorCode::BufferOverwrite));
        }
        let len = (echo_buffer.to_account_info().data_len() - 8).min(data.len());
        echo_buffer.buffer.data = data[..len].to_vec();
        Ok(())
    }

    pub fn zero_copy_echo(ctx: Context<ZeroCopyEcho>, data: Vec<u8>) -> Result<()> {
        let zero_copy_echo_buffer = &mut ctx.accounts.zero_copy_echo_buffer.load_init()?;
        // you could also just `.copy_from_slice`
        // this is an example of idiomatic error handling (alternatively, impl `From`)
        let data = data.try_into().map_err(|_| error!(ErrorCode::BufferOverflow))?;
        zero_copy_echo_buffer.buffer.data = data;
        Ok(())
        // unlike above, Anchor does not need to BorshSerialize::serialize because it's already
        // mutated directly in the account data
        //
        // recall `[u8; 14]` is `Copy`, so those just get copied into the memory location where
        // account data lives
    }

    pub fn initialize_authorized_echo(
        ctx: Context<InitializeAuthorizedEcho>,
        buffer_seed: u64,
        buffer_size: u64,
    ) -> Result<()> {
        ctx.accounts.authorized_buffer.buffer_seed = buffer_seed;
        ctx.accounts.authorized_buffer.buffer_size = buffer_size;
        Ok(())
    }

    pub fn authorized_echo(ctx: Context<AuthorizedEcho>, data: Vec<u8>) -> Result<()> {
        let len = data.len().min(
            ctx.accounts.authorized_buffer.to_account_info().data_len() - size_of::<u64>() * 2 - 8,
        );
        ctx.accounts.authorized_buffer.buffer.data = data[..len].to_vec();
        Ok(())
    }
}

// borsh serializes Vec into u32 + repr(T)
const ECHO_SPACE: usize = size_of::<u32>() + "echo".len();

#[derive(Accounts)]
pub struct InitializeEcho<'info> {
    #[account(init, payer = payer, space = 8 + ECHO_SPACE)]
    pub echo_buffer: Account<'info, EchoBuffer>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Echo<'info> {
    #[account(mut)]
    pub echo_buffer: Account<'info, EchoBuffer>,
}

#[account]
#[derive(Debug, Default)]
pub struct EchoBuffer {
    pub buffer: Buffer,
}

/// this extra `Buffer` struct is unnecessary and is purely to provide an example of "how do I have
/// nested structs within an AccountInfo"
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default)]
pub struct Buffer {
    pub data: Vec<u8>, // heap-allocated copy of account data
}

const ZERO_COPY_ECHO_SPACE: usize = "zero copy echo".len();

/// this initializes the account and echos in the same instruction
#[derive(Accounts)]
pub struct ZeroCopyEcho<'info> {
    #[account(init, payer = payer, space = 8 + 14)]
    pub zero_copy_echo_buffer: AccountLoader<'info, ZeroCopyEchoBuffer>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account(zero_copy)]
#[derive(Debug, Default)]
pub struct ZeroCopyEchoBuffer {
    pub buffer: ZeroCopyBuffer,
}

/// same idea as above - this extra struct is just to illustrate how to have nested structs that
/// work with zero_copy
#[zero_copy]
#[derive(Debug, Default)]
pub struct ZeroCopyBuffer {
    pub data: [u8; 14], // zero-copy from account data directly
}

const BUFFER_SEED: u64 = 42;

#[derive(Accounts)]
#[instruction(buffer_seed: u64, buffer_size: u64)]
pub struct InitializeAuthorizedEcho<'info> {
    #[account(init, payer = authority, space = 8 + size_of::<u64>() * 2 + buffer_size as usize,
    seeds = [b"authority", authority.key.as_ref(), &buffer_seed.to_le_bytes()],
    bump)]
    pub authorized_buffer: Account<'info, AuthorizedBuffer>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(data: Vec<u8>)]
pub struct AuthorizedEcho<'info> {
    #[account(mut, seeds = [b"authority", authority.key.as_ref(), &BUFFER_SEED.to_le_bytes()], bump)]
    pub authorized_buffer: Account<'info, AuthorizedBuffer>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
#[derive(Debug, Default)]
pub struct AuthorizedBuffer {
    pub buffer_seed: u64,
    pub buffer_size: u64,
    pub buffer: Buffer,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Buffer overflow")]
    BufferOverflow,
    #[msg("Buffer overwrite")]
    BufferOverwrite,
}
