import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from '@solana/spl-token';

// Token constants
export const TOKEN_DECIMALS = 6;
export const TOKENS_PER_SOL = 1000; // Exchange rate: 1 SOL = 1000 STAKE tokens

// Mint authority keypair (in production, this would be stored securely)
let mintAuthority: Keypair | null = null;
let tokenMint: PublicKey | null = null;

// Initialize or get mint authority
export function getMintAuthority(): Keypair {
  if (!mintAuthority) {
    // In production, this would be loaded from secure storage
    // For demo, we'll generate a new one each time
    mintAuthority = Keypair.generate();
  }
  return mintAuthority;
}

// Create or get token mint
export async function getOrCreateTokenMint(
  connection: Connection,
  payer: PublicKey
): Promise<PublicKey> {
  if (tokenMint) {
    return tokenMint;
  }

  try {
    const authority = getMintAuthority();
    
    // Create a new mint
    tokenMint = await createMint(
      connection,
      authority, // We need the full keypair here, but for demo we'll use a different approach
      authority.publicKey, // Mint authority
      authority.publicKey, // Freeze authority
      TOKEN_DECIMALS
    );

    console.log('Created new token mint:', tokenMint.toBase58());
    return tokenMint;
  } catch (error) {
    console.error('Error creating token mint:', error);
    throw error;
  }
}

// Alternative: Use a pre-deployed token mint for consistency
export function getStaticTokenMint(): PublicKey {
  // For demo purposes, we'll use a fixed mint address
  // In production, this would be your deployed token mint
  return new PublicKey('So11111111111111111111111111111111111111112'); // Wrapped SOL as example
}

// Get or create user's token account
export async function getOrCreateUserTokenAccount(
  connection: Connection,
  userPublicKey: PublicKey,
  mint: PublicKey,
  payer?: Keypair
) {
  try {
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer || getMintAuthority(), // Use mint authority as payer if none provided
      mint,
      userPublicKey
    );
    return tokenAccount;
  } catch (error) {
    console.error('Error getting/creating token account:', error);
    throw error;
  }
}

// Get token balance
export async function getTokenBalance(
  connection: Connection,
  userPublicKey: PublicKey,
  mint: PublicKey
): Promise<number> {
  try {
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      getMintAuthority(),
      mint,
      userPublicKey
    );
    
    const account = await getAccount(connection, tokenAccount.address);
    return Number(account.amount) / Math.pow(10, TOKEN_DECIMALS);
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
      return 0;
    }
    console.error('Error getting token balance:', error);
    return 0;
  }
}

// Mint tokens to user (simulate token purchase)
export async function purchaseTokens(
  connection: Connection,
  userPublicKey: PublicKey,
  amount: number,
  sendTransaction: (transaction: Transaction) => Promise<string>
): Promise<string> {
  try {
    // For demo, we'll simulate minting tokens by transferring from a reserve
    // In a real app, this would involve payment processing
    
    const mint = getStaticTokenMint();
    const userTokenAccount = await getOrCreateUserTokenAccount(
      connection,
      userPublicKey,
      mint
    );

    // Create transaction to mint tokens
    const transaction = new Transaction();
    
    // In a real app, you would:
    // 1. Verify payment (SOL transfer or other payment)
    // 2. Mint tokens to user's account
    
    // For now, we'll simulate by airdropping tokens
    const mintAmount = amount * Math.pow(10, TOKEN_DECIMALS);
    
    // This would require the mint authority's signature in a real implementation
    // For demo purposes, we'll track balances differently
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    // Send the transaction
    const signature = await sendTransaction(transaction);
    
    // Store the purchase in local storage for demo
    const purchases = JSON.parse(localStorage.getItem('tokenPurchases') || '{}');
    purchases[userPublicKey.toBase58()] = (purchases[userPublicKey.toBase58()] || 0) + amount;
    localStorage.setItem('tokenPurchases', JSON.stringify(purchases));
    
    return signature;
  } catch (error) {
    console.error('Error purchasing tokens:', error);
    throw error;
  }
}

// Get user's purchased token balance (for demo)
export function getUserTokenBalance(userPublicKey: PublicKey): number {
  const purchases = JSON.parse(localStorage.getItem('tokenPurchases') || '{}');
  return purchases[userPublicKey.toBase58()] || 0;
}

// Transfer tokens between accounts
export async function transferTokens(
  connection: Connection,
  fromPublicKey: PublicKey,
  toPublicKey: PublicKey,
  amount: number,
  mint: PublicKey,
  sendTransaction: (transaction: Transaction) => Promise<string>
): Promise<string> {
  try {
    const fromTokenAccount = await getOrCreateUserTokenAccount(
      connection,
      fromPublicKey,
      mint
    );
    
    const toTokenAccount = await getOrCreateUserTokenAccount(
      connection,
      toPublicKey,
      mint
    );

    const transaction = new Transaction();
    
    // Add transfer instruction
    const transferAmount = amount * Math.pow(10, TOKEN_DECIMALS);
    
    // Note: This is simplified for demo. Real implementation would use proper transfer instruction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPublicKey;

    const signature = await sendTransaction(transaction);
    return signature;
  } catch (error) {
    console.error('Error transferring tokens:', error);
    throw error;
  }
}

// Stake tokens (transfer to staking pool)
export async function stakeTokens(
  connection: Connection,
  userPublicKey: PublicKey,
  amount: number,
  sendTransaction: (transaction: Transaction) => Promise<string>
): Promise<string> {
  try {
    const transaction = new Transaction();
    
    // In a real staking program, this would:
    // 1. Transfer tokens to staking pool
    // 2. Create staking account record
    // 3. Start reward accumulation
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    // For demo, track staking in local storage and simulate blockchain transaction
    const signature = await sendTransaction(transaction);
    
    // Update local tracking
    const staking = JSON.parse(localStorage.getItem('tokenStaking') || '{}');
    const userKey = userPublicKey.toBase58();
    
    if (!staking[userKey]) {
      staking[userKey] = {
        staked: 0,
        rewards: 0,
        lastUpdate: Date.now()
      };
    }
    
    staking[userKey].staked += amount;
    staking[userKey].lastUpdate = Date.now();
    localStorage.setItem('tokenStaking', JSON.stringify(staking));
    
    // Update token balance
    const purchases = JSON.parse(localStorage.getItem('tokenPurchases') || '{}');
    purchases[userKey] = (purchases[userKey] || 0) - amount;
    localStorage.setItem('tokenPurchases', JSON.stringify(purchases));
    
    return signature;
  } catch (error) {
    console.error('Error staking tokens:', error);
    throw error;
  }
}

// Unstake tokens
export async function unstakeTokens(
  connection: Connection,
  userPublicKey: PublicKey,
  amount: number,
  sendTransaction: (transaction: Transaction) => Promise<string>
): Promise<string> {
  try {
    const transaction = new Transaction();
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    const signature = await sendTransaction(transaction);
    
    // Update local tracking
    const staking = JSON.parse(localStorage.getItem('tokenStaking') || '{}');
    const userKey = userPublicKey.toBase58();
    
    if (staking[userKey]) {
      // Calculate rewards
      const timeStaked = Date.now() - staking[userKey].lastUpdate;
      const rewards = (staking[userKey].staked * 0.001 * timeStaked) / (1000 * 60); // 0.1% per minute
      
      staking[userKey].staked -= amount;
      staking[userKey].rewards += rewards;
      staking[userKey].lastUpdate = Date.now();
      localStorage.setItem('tokenStaking', JSON.stringify(staking));
      
      // Return tokens plus rewards to balance
      const purchases = JSON.parse(localStorage.getItem('tokenPurchases') || '{}');
      purchases[userKey] = (purchases[userKey] || 0) + amount + rewards;
      localStorage.setItem('tokenPurchases', JSON.stringify(purchases));
    }
    
    return signature;
  } catch (error) {
    console.error('Error unstaking tokens:', error);
    throw error;
  }
}

// Get staking info
export function getStakingInfo(userPublicKey: PublicKey) {
  const staking = JSON.parse(localStorage.getItem('tokenStaking') || '{}');
  const userKey = userPublicKey.toBase58();
  
  if (!staking[userKey]) {
    return {
      staked: 0,
      rewards: 0,
      lastUpdate: Date.now()
    };
  }
  
  // Calculate current rewards
  const timeStaked = Date.now() - staking[userKey].lastUpdate;
  const currentRewards = (staking[userKey].staked * 0.001 * timeStaked) / (1000 * 60);
  
  return {
    staked: staking[userKey].staked,
    rewards: staking[userKey].rewards + currentRewards,
    lastUpdate: staking[userKey].lastUpdate
  };
}

// Claim rewards
export async function claimRewards(
  connection: Connection,
  userPublicKey: PublicKey,
  sendTransaction: (transaction: Transaction) => Promise<string>
): Promise<string> {
  try {
    const transaction = new Transaction();
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    const signature = await sendTransaction(transaction);
    
    // Update local tracking
    const staking = JSON.parse(localStorage.getItem('tokenStaking') || '{}');
    const userKey = userPublicKey.toBase58();
    
    if (staking[userKey]) {
      const timeStaked = Date.now() - staking[userKey].lastUpdate;
      const rewards = (staking[userKey].staked * 0.001 * timeStaked) / (1000 * 60);
      
      // Add rewards to balance
      const purchases = JSON.parse(localStorage.getItem('tokenPurchases') || '{}');
      purchases[userKey] = (purchases[userKey] || 0) + staking[userKey].rewards + rewards;
      localStorage.setItem('tokenPurchases', JSON.stringify(purchases));
      
      // Reset rewards
      staking[userKey].rewards = 0;
      staking[userKey].lastUpdate = Date.now();
      localStorage.setItem('tokenStaking', JSON.stringify(staking));
    }
    
    return signature;
  } catch (error) {
    console.error('Error claiming rewards:', error);
    throw error;
  }
} 