use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod anchor_echo {
    use super::*;

    pub fn echo(ctx: Context<Echo>, echo_data: Vec<u8>) -> ProgramResult {
        msg!("Instruction: Echo");
        let echo_buffer = &mut ctx.accounts.echo_buffer;
        if echo_buffer.data.iter().any(|&byte| byte != 0) {
            return Err(ProgramError::InvalidInstructionData);
        }
        let len = echo_data
            .len()
            .min(echo_buffer.to_account_info().data.borrow().len());
        echo_buffer.data = echo_data[..len].to_vec();
        Ok(())
    }

    pub fn initialize_authorized_echo(
        ctx: Context<InitializeAuthorizedEcho>,
        buffer_seed: u64,
        buffer_size: u64,
    ) -> ProgramResult {
        ctx.accounts.authorized_buffer.data =
            [buffer_seed.to_le_bytes(), buffer_size.to_le_bytes()]
                .concat()
                .to_vec();
        Ok(())
    }

    pub fn authorized_echo(ctx: Context<AuthorizedEcho>, data: Vec<u8>) -> ProgramResult {
        let mut authorized_buffer = &mut ctx.accounts.authorized_buffer;
        let len = data.len().min(authorized_buffer.to_account_info().data.borrow().len());
        authorized_buffer.data = data[..len].to_vec();
        Ok(())
    }

    // pub fn dynamic_buffer(ctx: Context<DynamicBuffer>, buffer_size: u64) -> ProgramResult {
    //     Ok(())
    // }
}

#[derive(Accounts)]
pub struct Echo<'info> {
    #[account(init, payer = signer, space = 8 + 4 + 8)]
    pub echo_buffer: Account<'info, EchoBuffer>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(buffer_seed: u64, buffer_size: u64)]
pub struct InitializeAuthorizedEcho<'info> {
    #[account(init, payer = authority, space = 8 + std::mem::size_of::<u64>() + (buffer_size as usize),
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
    #[account(mut)]
    pub authorized_buffer: Account<'info, AuthorizedBuffer>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

// #[derive(Accounts)]
// #[instruction(buffer_size: u64)]
// pub struct DynamicBuffer<'info> {
//     #[account(init, payer = signer, space = 8)]
//     pub dynamic_buffer: Account<'info, EchoBuffer>,
// }
//
#[account]
pub struct EchoBuffer {
    pub data: Vec<u8>,
}

#[account]
pub struct AuthorizedBuffer {
    pub data: Vec<u8>,
}
