import { PublicKey } from '@solana/web3.js';

export interface StakePosition {
  amount: number;
  timestamp: number;
  rewards: number;
}

export interface WalletInfo {
  publicKey: PublicKey | null;
  connected: boolean;
  balance: number;
}

export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  symbol: string;
}

export interface StakingPoolInfo {
  authority: PublicKey;
  totalStaked: number;
  rewardRate: number;
  lastUpdateSlot: number;
}

export interface UserStakeInfo {
  staker: PublicKey;
  amount: number;
  lastClaimSlot: number;
  totalRewards: number;
}

export interface TransactionStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  message?: string;
  signature?: string;
} 