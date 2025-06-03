import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import * as borsh from 'borsh';

// Program ID (you would replace this with your deployed program ID)
export const STAKING_PROGRAM_ID = new PublicKey('11111111111111111111111111111112'); // Placeholder

// Instruction schema for borsh serialization
class StakeInstructionData {
  instruction: number;
  amount?: bigint;
  reward_rate?: bigint;

  constructor(fields: { instruction: number; amount?: bigint; reward_rate?: bigint }) {
    this.instruction = fields.instruction;
    this.amount = fields.amount;
    this.reward_rate = fields.reward_rate;
  }
}

const StakeInstructionSchema = new Map([
  [
    StakeInstructionData,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['amount', { kind: 'option', type: 'u64' }],
        ['reward_rate', { kind: 'option', type: 'u64' }],
      ],
    },
  ],
]);

// Pool account schema
export class StakingPool {
  is_initialized: boolean = false;
  authority: Uint8Array = new Uint8Array(32);
  total_staked: bigint = BigInt(0);
  reward_rate: bigint = BigInt(0);
  last_update_slot: bigint = BigInt(0);

  constructor(fields?: {
    is_initialized: boolean;
    authority: Uint8Array;
    total_staked: bigint;
    reward_rate: bigint;
    last_update_slot: bigint;
  }) {
    if (fields) {
      this.is_initialized = fields.is_initialized;
      this.authority = fields.authority;
      this.total_staked = fields.total_staked;
      this.reward_rate = fields.reward_rate;
      this.last_update_slot = fields.last_update_slot;
    }
  }
}

export const StakingPoolSchema = new Map([
  [
    StakingPool,
    {
      kind: 'struct',
      fields: [
        ['is_initialized', 'u8'],
        ['authority', [32]],
        ['total_staked', 'u64'],
        ['reward_rate', 'u64'],
        ['last_update_slot', 'u64'],
      ],
    },
  ],
]);

// Stake account schema
export class StakeAccount {
  is_initialized: boolean = false;
  staker: Uint8Array = new Uint8Array(32);
  amount: bigint = BigInt(0);
  last_claim_slot: bigint = BigInt(0);
  total_rewards: bigint = BigInt(0);

  constructor(fields?: {
    is_initialized: boolean;
    staker: Uint8Array;
    amount: bigint;
    last_claim_slot: bigint;
    total_rewards: bigint;
  }) {
    if (fields) {
      this.is_initialized = fields.is_initialized;
      this.staker = fields.staker;
      this.amount = fields.amount;
      this.last_claim_slot = fields.last_claim_slot;
      this.total_rewards = fields.total_rewards;
    }
  }
}

export const StakeAccountSchema = new Map([
  [
    StakeAccount,
    {
      kind: 'struct',
      fields: [
        ['is_initialized', 'u8'],
        ['staker', [32]],
        ['amount', 'u64'],
        ['last_claim_slot', 'u64'],
        ['total_rewards', 'u64'],
      ],
    },
  ],
]);

// Helper function to find program derived addresses
export async function findStakeAccountAddress(
  staker: PublicKey,
  programId: PublicKey = STAKING_PROGRAM_ID
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from('stake'), staker.toBuffer()],
    programId
  );
}

export async function findPoolAddress(
  authority: PublicKey,
  programId: PublicKey = STAKING_PROGRAM_ID
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from('pool'), authority.toBuffer()],
    programId
  );
}

// Instruction builders
export function createInitializePoolInstruction(
  authority: PublicKey,
  poolAccount: PublicKey,
  rewardRate: number,
  programId: PublicKey = STAKING_PROGRAM_ID
): TransactionInstruction {
  const data = borsh.serialize(
    StakeInstructionSchema,
    new StakeInstructionData({
      instruction: 0, // InitializePool
      reward_rate: BigInt(rewardRate),
    })
  );

  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: poolAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId,
    data: Buffer.from(data),
  });
}

export function createStakeInstruction(
  staker: PublicKey,
  poolAccount: PublicKey,
  stakeAccount: PublicKey,
  amount: number,
  programId: PublicKey = STAKING_PROGRAM_ID
): TransactionInstruction {
  const data = borsh.serialize(
    StakeInstructionSchema,
    new StakeInstructionData({
      instruction: 1, // Stake
      amount: BigInt(amount),
    })
  );

  return new TransactionInstruction({
    keys: [
      { pubkey: staker, isSigner: true, isWritable: true },
      { pubkey: poolAccount, isSigner: false, isWritable: true },
      { pubkey: stakeAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: Buffer.from(data),
  });
}

export function createUnstakeInstruction(
  staker: PublicKey,
  poolAccount: PublicKey,
  stakeAccount: PublicKey,
  amount: number,
  programId: PublicKey = STAKING_PROGRAM_ID
): TransactionInstruction {
  const data = borsh.serialize(
    StakeInstructionSchema,
    new StakeInstructionData({
      instruction: 2, // Unstake
      amount: BigInt(amount),
    })
  );

  return new TransactionInstruction({
    keys: [
      { pubkey: staker, isSigner: true, isWritable: true },
      { pubkey: poolAccount, isSigner: false, isWritable: true },
      { pubkey: stakeAccount, isSigner: false, isWritable: true },
    ],
    programId,
    data: Buffer.from(data),
  });
}

export function createClaimRewardsInstruction(
  staker: PublicKey,
  poolAccount: PublicKey,
  stakeAccount: PublicKey,
  programId: PublicKey = STAKING_PROGRAM_ID
): TransactionInstruction {
  const data = borsh.serialize(
    StakeInstructionSchema,
    new StakeInstructionData({
      instruction: 3, // ClaimRewards
    })
  );

  return new TransactionInstruction({
    keys: [
      { pubkey: staker, isSigner: true, isWritable: true },
      { pubkey: poolAccount, isSigner: false, isWritable: true },
      { pubkey: stakeAccount, isSigner: false, isWritable: true },
    ],
    programId,
    data: Buffer.from(data),
  });
}

// Helper functions for account data parsing
export function parseStakingPool(data: Buffer): StakingPool | null {
  try {
    return borsh.deserialize(StakingPoolSchema, StakingPool, data);
  } catch (error) {
    console.error('Error parsing staking pool:', error);
    return null;
  }
}

export function parseStakeAccount(data: Buffer): StakeAccount | null {
  try {
    return borsh.deserialize(StakeAccountSchema, StakeAccount, data);
  } catch (error) {
    console.error('Error parsing stake account:', error);
    return null;
  }
}

// Transaction builders
export async function buildStakeTransaction(
  connection: Connection,
  staker: PublicKey,
  amount: number,
  programId: PublicKey = STAKING_PROGRAM_ID
): Promise<Transaction> {
  const [poolAddress] = await findPoolAddress(staker, programId);
  const [stakeAddress] = await findStakeAccountAddress(staker, programId);

  const transaction = new Transaction();
  const stakeInstruction = createStakeInstruction(
    staker,
    poolAddress,
    stakeAddress,
    amount,
    programId
  );

  transaction.add(stakeInstruction);
  
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = staker;

  return transaction;
}

export async function buildUnstakeTransaction(
  connection: Connection,
  staker: PublicKey,
  amount: number,
  programId: PublicKey = STAKING_PROGRAM_ID
): Promise<Transaction> {
  const [poolAddress] = await findPoolAddress(staker, programId);
  const [stakeAddress] = await findStakeAccountAddress(staker, programId);

  const transaction = new Transaction();
  const unstakeInstruction = createUnstakeInstruction(
    staker,
    poolAddress,
    stakeAddress,
    amount,
    programId
  );

  transaction.add(unstakeInstruction);
  
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = staker;

  return transaction;
} 