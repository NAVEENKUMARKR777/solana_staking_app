use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
    system_instruction,
    program::{invoke, invoke_signed},
    clock::Clock,
};
use borsh::{BorshDeserialize, BorshSerialize};

// Program entrypoint
entrypoint!(process_instruction);

// Instructions
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum StakeInstruction {
    /// Initialize a staking pool
    /// Accounts expected:
    /// 0. `[writable, signer]` Pool authority
    /// 1. `[writable]` Pool account
    /// 2. `[]` System program
    /// 3. `[]` Rent sysvar
    InitializePool {
        reward_rate: u64, // Reward rate per slot
    },
    
    /// Stake tokens
    /// Accounts expected:
    /// 0. `[writable, signer]` Staker
    /// 1. `[writable]` Pool account
    /// 2. `[writable]` Stake account
    /// 3. `[]` System program
    Stake {
        amount: u64,
    },
    
    /// Unstake tokens
    /// Accounts expected:
    /// 0. `[writable, signer]` Staker
    /// 1. `[writable]` Pool account
    /// 2. `[writable]` Stake account
    Unstake {
        amount: u64,
    },
    
    /// Claim rewards
    /// Accounts expected:
    /// 0. `[writable, signer]` Staker
    /// 1. `[writable]` Pool account
    /// 2. `[writable]` Stake account
    ClaimRewards,
}

// Pool state
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct StakingPool {
    pub is_initialized: bool,
    pub authority: Pubkey,
    pub total_staked: u64,
    pub reward_rate: u64,
    pub last_update_slot: u64,
}

// Individual stake account
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct StakeAccount {
    pub is_initialized: bool,
    pub staker: Pubkey,
    pub amount: u64,
    pub last_claim_slot: u64,
    pub total_rewards: u64,
}

// Custom errors
#[derive(Debug)]
pub enum StakeError {
    InvalidInstruction,
    NotRentExempt,
    AlreadyInitialized,
    NotInitialized,
    InvalidAuthority,
    InsufficientFunds,
    MathOverflow,
}

impl From<StakeError> for ProgramError {
    fn from(e: StakeError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

// Main program logic
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = StakeInstruction::try_from_slice(instruction_data)
        .map_err(|_| StakeError::InvalidInstruction)?;

    match instruction {
        StakeInstruction::InitializePool { reward_rate } => {
            msg!("Instruction: InitializePool");
            process_initialize_pool(accounts, reward_rate, program_id)
        }
        StakeInstruction::Stake { amount } => {
            msg!("Instruction: Stake");
            process_stake(accounts, amount, program_id)
        }
        StakeInstruction::Unstake { amount } => {
            msg!("Instruction: Unstake");
            process_unstake(accounts, amount, program_id)
        }
        StakeInstruction::ClaimRewards => {
            msg!("Instruction: ClaimRewards");
            process_claim_rewards(accounts, program_id)
        }
    }
}

pub fn process_initialize_pool(
    accounts: &[AccountInfo],
    reward_rate: u64,
    program_id: &Pubkey,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority_info = next_account_info(account_info_iter)?;
    let pool_info = next_account_info(account_info_iter)?;
    let system_program_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    if !authority_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let rent = &Rent::from_account_info(rent_info)?;

    // Create pool account
    let space = std::mem::size_of::<StakingPool>();
    let lamports = rent.minimum_balance(space);

    invoke(
        &system_instruction::create_account(
            authority_info.key,
            pool_info.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[
            authority_info.clone(),
            pool_info.clone(),
            system_program_info.clone(),
        ],
    )?;

    let clock = Clock::get()?;
    let pool = StakingPool {
        is_initialized: true,
        authority: *authority_info.key,
        total_staked: 0,
        reward_rate,
        last_update_slot: clock.slot,
    };

    pool.serialize(&mut &mut pool_info.data.borrow_mut()[..])?;
    msg!("Staking pool initialized with reward rate: {}", reward_rate);

    Ok(())
}

pub fn process_stake(
    accounts: &[AccountInfo],
    amount: u64,
    program_id: &Pubkey,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker_info = next_account_info(account_info_iter)?;
    let pool_info = next_account_info(account_info_iter)?;
    let stake_account_info = next_account_info(account_info_iter)?;
    let system_program_info = next_account_info(account_info_iter)?;

    if !staker_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut pool = StakingPool::try_from_slice(&pool_info.data.borrow())?;
    if !pool.is_initialized {
        return Err(StakeError::NotInitialized.into());
    }

    // Create or update stake account
    let clock = Clock::get()?;
    let mut stake_account = if stake_account_info.data_len() == 0 {
        // Create new stake account
        let space = std::mem::size_of::<StakeAccount>();
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(space);

        invoke(
            &system_instruction::create_account(
                staker_info.key,
                stake_account_info.key,
                lamports,
                space as u64,
                program_id,
            ),
            &[
                staker_info.clone(),
                stake_account_info.clone(),
                system_program_info.clone(),
            ],
        )?;

        StakeAccount {
            is_initialized: true,
            staker: *staker_info.key,
            amount: 0,
            last_claim_slot: clock.slot,
            total_rewards: 0,
        }
    } else {
        StakeAccount::try_from_slice(&stake_account_info.data.borrow())?
    };

    // Update stake amount
    stake_account.amount = stake_account
        .amount
        .checked_add(amount)
        .ok_or(StakeError::MathOverflow)?;

    // Update pool
    pool.total_staked = pool
        .total_staked
        .checked_add(amount)
        .ok_or(StakeError::MathOverflow)?;
    pool.last_update_slot = clock.slot;

    // Save state
    stake_account.serialize(&mut &mut stake_account_info.data.borrow_mut()[..])?;
    pool.serialize(&mut &mut pool_info.data.borrow_mut()[..])?;

    msg!("Staked {} tokens for {}", amount, staker_info.key);
    Ok(())
}

pub fn process_unstake(
    accounts: &[AccountInfo],
    amount: u64,
    program_id: &Pubkey,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker_info = next_account_info(account_info_iter)?;
    let pool_info = next_account_info(account_info_iter)?;
    let stake_account_info = next_account_info(account_info_iter)?;

    if !staker_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut pool = StakingPool::try_from_slice(&pool_info.data.borrow())?;
    let mut stake_account = StakeAccount::try_from_slice(&stake_account_info.data.borrow())?;

    if !pool.is_initialized || !stake_account.is_initialized {
        return Err(StakeError::NotInitialized.into());
    }

    if stake_account.amount < amount {
        return Err(StakeError::InsufficientFunds.into());
    }

    // Calculate and add rewards before unstaking
    let clock = Clock::get()?;
    let slots_since_last_claim = clock
        .slot
        .checked_sub(stake_account.last_claim_slot)
        .unwrap_or(0);
    
    let rewards = stake_account
        .amount
        .checked_mul(pool.reward_rate)
        .and_then(|x| x.checked_mul(slots_since_last_claim))
        .and_then(|x| x.checked_div(10000)) // Normalize reward rate
        .ok_or(StakeError::MathOverflow)?;

    stake_account.total_rewards = stake_account
        .total_rewards
        .checked_add(rewards)
        .ok_or(StakeError::MathOverflow)?;

    // Update stake amount
    stake_account.amount = stake_account
        .amount
        .checked_sub(amount)
        .ok_or(StakeError::InsufficientFunds)?;

    stake_account.last_claim_slot = clock.slot;

    // Update pool
    pool.total_staked = pool
        .total_staked
        .checked_sub(amount)
        .ok_or(StakeError::InsufficientFunds)?;
    pool.last_update_slot = clock.slot;

    // Save state
    stake_account.serialize(&mut &mut stake_account_info.data.borrow_mut()[..])?;
    pool.serialize(&mut &mut pool_info.data.borrow_mut()[..])?;

    msg!("Unstaked {} tokens for {}", amount, staker_info.key);
    Ok(())
}

pub fn process_claim_rewards(
    accounts: &[AccountInfo],
    _program_id: &Pubkey,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker_info = next_account_info(account_info_iter)?;
    let pool_info = next_account_info(account_info_iter)?;
    let stake_account_info = next_account_info(account_info_iter)?;

    if !staker_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let pool = StakingPool::try_from_slice(&pool_info.data.borrow())?;
    let mut stake_account = StakeAccount::try_from_slice(&stake_account_info.data.borrow())?;

    if !pool.is_initialized || !stake_account.is_initialized {
        return Err(StakeError::NotInitialized.into());
    }

    // Calculate pending rewards
    let clock = Clock::get()?;
    let slots_since_last_claim = clock
        .slot
        .checked_sub(stake_account.last_claim_slot)
        .unwrap_or(0);
    
    let pending_rewards = stake_account
        .amount
        .checked_mul(pool.reward_rate)
        .and_then(|x| x.checked_mul(slots_since_last_claim))
        .and_then(|x| x.checked_div(10000)) // Normalize reward rate
        .ok_or(StakeError::MathOverflow)?;

    let total_claimable = stake_account
        .total_rewards
        .checked_add(pending_rewards)
        .ok_or(StakeError::MathOverflow)?;

    // Update stake account
    stake_account.total_rewards = 0; // Reset after claiming
    stake_account.last_claim_slot = clock.slot;

    // Save state
    stake_account.serialize(&mut &mut stake_account_info.data.borrow_mut()[..])?;

    msg!(
        "Claimed {} rewards for {}",
        total_claimable,
        staker_info.key
    );
    Ok(())
} 