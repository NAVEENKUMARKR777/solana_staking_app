import {
  Connection,
  PublicKey,
  Transaction,
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
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from '@solana/spl-token';

// Production Token Configuration for Real Devnet
export const TOKEN_DECIMALS = 6;
export const TOKEN_NAME = "STAKE";
export const TOKEN_SYMBOL = "STAKE";
export const TOKENS_PER_SOL = 1000; // Market rate: 1 SOL = 1000 STAKE tokens

// Real Devnet Configuration using browser storage
const DEVNET_STORAGE_KEYS = {
  mintAuthority: 'solana-devnet-mint-authority',
  tokenMint: 'solana-devnet-token-mint',
  stakingPool: 'solana-devnet-staking-pool'
};

let mintAuthority: Keypair | null = null;
let tokenMint: PublicKey | null = null;
let mintCreationPromise: Promise<PublicKey> | null = null; // Prevent race condition

// Browser-compatible storage helpers
function getStorageItem(key: string): any {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading from storage: ${key}`, error);
    return null;
  }
}

function setStorageItem(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to storage: ${key}`, error);
  }
}

// Load or create persistent mint authority for real devnet
export function getMintAuthority(): Keypair {
  if (!mintAuthority) {
    try {
      // Try to load existing mint authority from browser storage
      const savedAuthority = getStorageItem(DEVNET_STORAGE_KEYS.mintAuthority);
      
      if (savedAuthority && savedAuthority.secretKey) {
        mintAuthority = Keypair.fromSecretKey(new Uint8Array(savedAuthority.secretKey));
        console.log(`🔑 Loaded existing devnet mint authority: ${mintAuthority.publicKey.toBase58()}`);
      } else {
        // Create new mint authority and save it
        mintAuthority = Keypair.generate();
        
        const authorityData = {
          secretKey: Array.from(mintAuthority.secretKey),
          publicKey: mintAuthority.publicKey.toBase58(),
          created: new Date().toISOString()
        };
        
        setStorageItem(DEVNET_STORAGE_KEYS.mintAuthority, authorityData);
        console.log(`🔑 Created new devnet mint authority: ${mintAuthority.publicKey.toBase58()}`);
        console.log(`💾 Saved mint authority to browser storage`);
      }
    } catch (error) {
      console.error('❌ Error loading/creating mint authority:', error);
      throw error;
    }
  }
  return mintAuthority;
}

// Load or create persistent token mint for real devnet (with race condition protection)
export async function getOrCreateTokenMint(connection: Connection): Promise<PublicKey> {
  // Return existing mint if available
  if (tokenMint) {
    return tokenMint;
  }

  // If mint creation is already in progress, wait for it
  if (mintCreationPromise) {
    console.log('⏳ Waiting for ongoing mint creation...');
    return await mintCreationPromise;
  }

  // Start mint creation process
  mintCreationPromise = createTokenMint(connection);
  
  try {
    tokenMint = await mintCreationPromise;
    return tokenMint;
  } finally {
    mintCreationPromise = null; // Clear promise when done
  }
}

// Internal function to handle mint creation
async function createTokenMint(connection: Connection): Promise<PublicKey> {
  try {
    // Try to load existing token mint from browser storage
    const savedMint = getStorageItem(DEVNET_STORAGE_KEYS.tokenMint);
    
    if (savedMint && savedMint.mint) {
      const candidateMint = new PublicKey(savedMint.mint);
      console.log(`🪙 Checking existing devnet token mint: ${candidateMint.toBase58()}`);
      
      // Verify the mint exists on devnet
      try {
        const mintInfo = await connection.getAccountInfo(candidateMint);
        if (mintInfo) {
          console.log(`✅ Using existing verified token mint on Solana devnet`);
          return candidateMint;
        }
      } catch (error) {
        console.log(`⚠️ Saved mint not found on devnet, creating new one...`);
        localStorage.removeItem(DEVNET_STORAGE_KEYS.tokenMint); // Clear invalid data
      }
    }
    
    // Create new token mint
    const authority = getMintAuthority();
    
    // IMPORTANT: Fund the mint authority before creating mint
    console.log('💰 Ensuring mint authority has SOL for mint creation...');
    await ensureMintAuthorityFunded(connection);
    
    console.log('🪙 Creating new token mint on Solana devnet...');
    
    const newMint = await createMint(
      connection,
      authority, // Payer
      authority.publicKey, // Mint authority
      authority.publicKey, // Freeze authority  
      TOKEN_DECIMALS // Decimals
    );

    // Save mint data to browser storage for persistence
    const mintData = {
      mint: newMint.toBase58(),
      authority: authority.publicKey.toBase58(),
      decimals: TOKEN_DECIMALS,
      symbol: TOKEN_SYMBOL,
      name: TOKEN_NAME,
      created: new Date().toISOString(),
      network: 'devnet'
    };
    
    setStorageItem(DEVNET_STORAGE_KEYS.tokenMint, mintData);
    
    console.log(`✅ Token mint created on devnet: ${newMint.toBase58()}`);
    console.log(`🔑 Mint authority: ${authority.publicKey.toBase58()}`);
    console.log(`💾 Saved mint data to browser storage`);
    
    return newMint;
  } catch (error) {
    console.error('❌ Error creating token mint:', error);
    throw error;
  }
}

// Check mint authority balance (for debugging)
export async function checkMintAuthorityBalance(connection: Connection): Promise<number> {
  try {
    const authority = getMintAuthority();
    const balance = await connection.getBalance(authority.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    console.log(`🏦 Mint authority balance: ${solBalance} SOL (${authority.publicKey.toBase58()})`);
    return solBalance;
  } catch (error) {
    console.error('❌ Error checking mint authority balance:', error);
    return 0;
  }
}

// Fund mint authority with devnet SOL if needed
export async function ensureMintAuthorityFunded(connection: Connection): Promise<void> {
  const authority = getMintAuthority();
  const balance = await connection.getBalance(authority.publicKey);
  const requiredBalance = 0.1 * LAMPORTS_PER_SOL; // Need at least 0.1 SOL
  const solBalance = balance / LAMPORTS_PER_SOL;
  
  console.log(`🏦 Current mint authority balance: ${solBalance} SOL`);
  
  if (balance < requiredBalance) {
    console.log(`⚠️ Mint authority needs funding. Required: 0.1 SOL, Current: ${solBalance} SOL`);
    console.log(`🪂 Requesting devnet SOL airdrop for mint authority...`);
    
    try {
      const airdropSignature = await connection.requestAirdrop(
        authority.publicKey,
        2 * LAMPORTS_PER_SOL // Request 2 SOL
      );
      
      console.log(`🪂 Airdrop transaction: ${airdropSignature}`);
      await connection.confirmTransaction(airdropSignature, 'confirmed');
      
      // Check new balance
      const newBalance = await connection.getBalance(authority.publicKey);
      const newSolBalance = newBalance / LAMPORTS_PER_SOL;
      console.log(`✅ Airdropped 2 SOL to mint authority. New balance: ${newSolBalance} SOL`);
    } catch (error) {
      console.error('❌ Failed to airdrop to mint authority:', error);
      throw new Error(`Mint authority needs SOL funding for operations. Current balance: ${solBalance} SOL`);
    }
  } else {
    console.log(`✅ Mint authority has sufficient balance: ${solBalance} SOL`);
  }
}

// Create or get user's associated token account
export async function getOrCreateUserTokenAccount(
  connection: Connection,
  userPublicKey: PublicKey,
  mint: PublicKey
) {
  try {
    // Ensure mint authority has funds for account creation
    await ensureMintAuthorityFunded(connection);
    
    const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      getMintAuthority(), // Payer (authority pays for account creation)
      mint,
      userPublicKey
    );
    
    return associatedTokenAccount;
  } catch (error) {
    console.error('❌ Error creating user token account:', error);
    throw error;
  }
}

// Get real token balance from blockchain
export async function getRealTokenBalance(
  connection: Connection,
  userPublicKey: PublicKey,
  mint: PublicKey
): Promise<number> {
  try {
    const tokenAccount = await getOrCreateUserTokenAccount(
      connection,
      userPublicKey,
      mint
    );
    
    const accountInfo = await getAccount(connection, tokenAccount.address);
    return Number(accountInfo.amount) / Math.pow(10, TOKEN_DECIMALS);
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
      return 0;
    }
    console.error('❌ Error getting token balance:', error);
    return 0;
  }
}

// Simplified Real SPL token minting for market-based purchase on devnet
export async function mintTokensToUser(
  connection: Connection,
  userPublicKey: PublicKey,
  tokenAmount: number,
  solPayment: number,
  sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>
): Promise<string> {
  try {
    const mint = await getOrCreateTokenMint(connection);
    const authority = getMintAuthority();
    
    console.log(`💰 Processing real devnet payment: ${solPayment} SOL for ${tokenAmount} STAKE tokens`);
    
    // Step 1: Create and send simplified SOL payment transaction
    let paymentSignature: string;
    
    try {
      console.log('🔍 Preparing SOL payment transaction...');
      
      // Create simple transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: authority.publicKey,
        lamports: Math.floor(solPayment * LAMPORTS_PER_SOL),
      });
      
      console.log(`📤 Transfer: ${solPayment} SOL from ${userPublicKey.toBase58()} to ${authority.publicKey.toBase58()}`);
      
      // Create transaction with minimal setup
      const paymentTransaction = new Transaction();
      paymentTransaction.add(transferInstruction);
      
      // Get recent blockhash with retry
      let blockhash: string;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const response = await connection.getLatestBlockhash('finalized');
          blockhash = response.blockhash;
          console.log(`🔗 Got blockhash (attempt ${attempts + 1}): ${blockhash.slice(0, 8)}...`);
          break;
        } catch (error) {
          attempts++;
          console.warn(`⚠️ Blockhash attempt ${attempts} failed:`, error);
          if (attempts >= maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }
      }
      
      // Set transaction parameters
      paymentTransaction.recentBlockhash = blockhash!;
      paymentTransaction.feePayer = userPublicKey;
      
      console.log('🔍 Transaction details:');
      console.log(`  - Instructions: ${paymentTransaction.instructions.length}`);
      console.log(`  - Fee payer: ${paymentTransaction.feePayer?.toBase58()}`);
      console.log(`  - Recent blockhash: ${paymentTransaction.recentBlockhash?.slice(0, 8)}...`);
      
      console.log('💳 Sending payment transaction to wallet...');
      paymentSignature = await sendTransaction(paymentTransaction, connection);
      console.log(`✅ Payment transaction submitted: ${paymentSignature}`);
      
      console.log('⏳ Confirming payment on devnet...');
      const confirmation = await connection.confirmTransaction(paymentSignature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Payment transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log('✅ Payment confirmed on Solana devnet');
      
    } catch (error) {
      console.error('❌ Payment transaction failed:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Unexpected error')) {
          throw new Error('Wallet rejected the transaction. Please try refreshing the page and ensure your wallet is properly connected.');
        } else if (error.message.includes('insufficient')) {
          throw new Error('Insufficient SOL balance. Please airdrop more devnet SOL.');
        } else if (error.message.includes('blockhash')) {
          throw new Error('Network connectivity issue. Please try again in a moment.');
        }
      }
      
      throw error;
    }
    
    // Step 2: Authority mints tokens (this runs automatically after payment)
    try {
      console.log('🪙 Minting SPL tokens on devnet...');
      
      // Ensure mint authority has funds for token operations
      await ensureMintAuthorityFunded(connection);
      
      const userTokenAccount = await getOrCreateUserTokenAccount(
        connection,
        userPublicKey,
        mint
      );
      
      console.log(`🎯 Minting ${tokenAmount} tokens to: ${userTokenAccount.address.toBase58()}`);
      
      const mintTransaction = new Transaction();
      // Mint tokens to user
      // Ensure integer amount for SPL tokens
      const mintAmount = Math.round(tokenAmount * Math.pow(10, TOKEN_DECIMALS));
      
      const mintInstruction = createMintToInstruction(
        mint,
        userTokenAccount.address,
        authority.publicKey,
        mintAmount
      );
      
      mintTransaction.add(mintInstruction);
      
      // Get fresh blockhash for mint transaction
      const mintBlockhash = await connection.getLatestBlockhash('finalized');
      mintTransaction.recentBlockhash = mintBlockhash.blockhash;
      mintTransaction.feePayer = authority.publicKey;
      
      // Authority signs and sends mint transaction
      mintTransaction.partialSign(authority);
      
      console.log('🚀 Sending mint transaction...');
      const mintSignature = await connection.sendRawTransaction(mintTransaction.serialize());
      console.log(`🪙 Mint transaction: ${mintSignature}`);
      
      console.log('⏳ Confirming token mint on devnet...');
      const mintConfirmation = await connection.confirmTransaction(mintSignature, 'confirmed');
      
      if (mintConfirmation.value.err) {
        console.error('Mint transaction error:', mintConfirmation.value.err);
        throw new Error(`Token minting failed: ${JSON.stringify(mintConfirmation.value.err)}`);
      }
      
      console.log('✅ SPL tokens minted successfully on Solana devnet');
      
      return paymentSignature; // Return payment transaction signature
      
    } catch (error) {
      console.error('❌ Token minting failed:', error);
      throw new Error(`Payment successful but token minting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Error in real devnet token minting:', error);
    throw error;
  }
}

// Real token transfer for staking on devnet
export async function transferTokensToStaking(
  connection: Connection,
  userPublicKey: PublicKey,
  amount: number,
  sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>
): Promise<string> {
  try {
    const mint = await getOrCreateTokenMint(connection);
    const authority = getMintAuthority();
    
    const userTokenAccount = await getOrCreateUserTokenAccount(
      connection,
      userPublicKey,
      mint
    );
    
    const stakingTokenAccount = await getOrCreateUserTokenAccount(
      connection,
      authority.publicKey,
      mint
    );
    
    const transaction = new Transaction();
    
    // Ensure integer amount for SPL tokens
    const transferAmount = Math.round(amount * Math.pow(10, TOKEN_DECIMALS));
    
    const transferInstruction = createTransferInstruction(
      userTokenAccount.address,
      stakingTokenAccount.address,
      userPublicKey,
      transferAmount
    );
    
    transaction.add(transferInstruction);
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;
    
    const signature = await sendTransaction(transaction, connection);
    console.log(`🔒 Real devnet staking transfer: ${signature}`);
    
    return signature;
  } catch (error) {
    console.error('❌ Error in real devnet staking transfer:', error);
    throw error;
  }
}

// Real token transfer from staking (unstaking) on devnet
export async function transferTokensFromStaking(
  connection: Connection,
  userPublicKey: PublicKey,
  amount: number,
  rewards: number
): Promise<string> {
  try {
    const mint = await getOrCreateTokenMint(connection);
    const authority = getMintAuthority();
    
    // Ensure mint authority has funds
    await ensureMintAuthorityFunded(connection);
    
    const userTokenAccount = await getOrCreateUserTokenAccount(
      connection,
      userPublicKey,
      mint
    );
    
    const stakingTokenAccount = await getOrCreateUserTokenAccount(
      connection,
      authority.publicKey,
      mint
    );
    
    const transaction = new Transaction();
    
    // Transfer staked amount back (if any)
    if (amount > 0) {
      // Ensure integer amount for SPL tokens
      const transferAmount = Math.round(amount * Math.pow(10, TOKEN_DECIMALS));
      
      const unstakeInstruction = createTransferInstruction(
        stakingTokenAccount.address,
        userTokenAccount.address,
        authority.publicKey,
        transferAmount
      );
      
      transaction.add(unstakeInstruction);
    }
    
    // Mint rewards
    if (rewards > 0) {
      // Ensure integer amount for SPL tokens - round down to prevent precision issues
      const rewardAmount = Math.floor(rewards * Math.pow(10, TOKEN_DECIMALS));
      
      console.log(`🎁 Minting ${rewards} rewards (${rewardAmount} base units) to user`);
      
      const rewardInstruction = createMintToInstruction(
        mint,
        userTokenAccount.address,
        authority.publicKey,
        rewardAmount
      );
      
      transaction.add(rewardInstruction);
    }
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authority.publicKey;
    
    transaction.partialSign(authority);
    
    const signature = await connection.sendRawTransaction(transaction.serialize());
    console.log(`🔓 Real devnet unstaking: ${signature}`);
    
    await connection.confirmTransaction(signature, 'confirmed');
    
    return signature;
  } catch (error) {
    console.error('❌ Error in real devnet unstaking:', error);
    throw error;
  }
}

// Get persistent staking pool info using browser storage
export function getStakingPoolInfo(): any {
  try {
    return getStorageItem(DEVNET_STORAGE_KEYS.stakingPool) || {};
  } catch (error) {
    console.error('Error loading staking pool info:', error);
    return {};
  }
}

// Save staking pool info using browser storage
export function saveStakingPoolInfo(data: any): void {
  try {
    const stakingData = {
      ...data,
      lastUpdated: new Date().toISOString(),
      network: 'devnet'
    };
    setStorageItem(DEVNET_STORAGE_KEYS.stakingPool, stakingData);
  } catch (error) {
    console.error('Error saving staking pool info:', error);
  }
}

// Get devnet configuration info for debugging
export function getDevnetInfo(): any {
  const authority = getStorageItem(DEVNET_STORAGE_KEYS.mintAuthority);
  const mint = getStorageItem(DEVNET_STORAGE_KEYS.tokenMint);
  const pool = getStorageItem(DEVNET_STORAGE_KEYS.stakingPool);
  
  return {
    mintAuthority: authority?.publicKey || 'Not created',
    tokenMint: mint?.mint || 'Not created',
    stakingPoolUsers: pool ? Object.keys(pool).length : 0,
    network: 'devnet',
    persistent: true
  };
}