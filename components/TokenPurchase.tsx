import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  getOrCreateTokenMint,
  getRealTokenBalance,
  mintTokensToUser,
  TOKENS_PER_SOL,
  checkMintAuthorityBalance,
  getDevnetInfo
} from '../utils/tokenMint';
import { Transaction, SystemProgram } from '@solana/web3.js';

const TokenPurchase = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [amount, setAmount] = useState<string>('100');
  const [isLoading, setIsLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<string>('');
  const [tokenBalance, setTokenBalance] = useState(0);
  const [tokenMint, setTokenMint] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isTestingWallet, setIsTestingWallet] = useState(false);

  // Initialize token data and get balance
  useEffect(() => {
    if (publicKey) {
      initializeTokenData();
    }
  }, [publicKey]);

  const initializeTokenData = async () => {
    try {
      // Get or create token mint
      const mint = await getOrCreateTokenMint(connection);
      setTokenMint(mint.toBase58());
      
      // Get real token balance from blockchain
      const balance = await getRealTokenBalance(connection, publicKey!, mint);
      setTokenBalance(balance);
    } catch (error) {
      console.error('Error initializing token data:', error);
    }
  };

  const checkSystemStatus = async () => {
    try {
      console.log('🔍 Checking system status...');
      
      // Check network details
      console.log('🌐 RPC Endpoint:', connection.rpcEndpoint);
      console.log('🌐 Commitment:', connection.commitment);
      
      // Check mint authority balance
      const authorityBalance = await checkMintAuthorityBalance(connection);
      
      // Check user's actual balance from the RPC
      let userBalance = 0;
      if (publicKey) {
        const balance = await connection.getBalance(publicKey);
        userBalance = balance / LAMPORTS_PER_SOL;
        console.log('👤 User SOL balance from RPC:', userBalance);
      }
      
      // Get devnet info
      const devnetInfo = getDevnetInfo();
      
      const debugData = {
        rpcEndpoint: connection.rpcEndpoint,
        userBalance,
        authorityBalance,
        ...devnetInfo,
        timestamp: new Date().toISOString()
      };
      
      setDebugInfo(debugData);
      console.log('📊 System Status:', debugData);
    } catch (error) {
      console.error('Error checking system status:', error);
    }
  };

  const testWalletConnection = async () => {
    if (!publicKey || !sendTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    setIsTestingWallet(true);

    try {
      console.log('🧪 Testing wallet with simple transaction...');
      
      // Create a minimal self-transfer (0.001 SOL)
      const testTransaction = new Transaction();
      
      const testInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: publicKey, // Send to self
        lamports: 1000000, // 0.001 SOL
      });
      
      testTransaction.add(testInstruction);
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      testTransaction.recentBlockhash = blockhash;
      testTransaction.feePayer = publicKey;
      
      console.log('📤 Sending test transaction...');
      const signature = await sendTransaction(testTransaction, connection);
      console.log(`✅ Test transaction successful: ${signature}`);
      
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('✅ Test transaction confirmed');
      
      alert(`✅ Wallet test successful!\n\nTransaction: ${signature}\n\nYour wallet is working properly.`);
      
    } catch (error) {
      console.error('❌ Wallet test failed:', error);
      alert(`❌ Wallet test failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThis helps us understand the wallet issue.`);
    } finally {
      setIsTestingWallet(false);
    }
  };

  const handlePurchase = async () => {
    if (!publicKey || !sendTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    const purchaseAmount = parseFloat(amount);
    if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Calculate real market cost
    const solCost = purchaseAmount / TOKENS_PER_SOL;
    const estimatedFee = 0.01; // More realistic fee estimation
    const totalRequired = solCost + estimatedFee;
    
    // Check if user has enough SOL for market-based purchase
    const solBalance = await connection.getBalance(publicKey);
    
    console.log(`SOL Balance: ${solBalance / LAMPORTS_PER_SOL}`);
    console.log(`Market Cost: ${solCost} SOL`);
    console.log(`Estimated Fee: ${estimatedFee} SOL`);
    console.log(`Total Required: ${totalRequired} SOL`);
    
    if (solBalance < (totalRequired * LAMPORTS_PER_SOL)) {
      alert(`Insufficient devnet SOL balance. You need ${totalRequired.toFixed(4)} devnet SOL.\n\nMarket Rate: 1 SOL = ${TOKENS_PER_SOL} STAKE tokens\nUse the airdrop button to get more devnet SOL!`);
      return;
    }

    setIsLoading(true);
    setTxSignature('');

    try {
      // Create timeout for stuck transactions
      const timeout = setTimeout(() => {
        setIsLoading(false);
        alert('⚠️ Transaction timed out. Please try again.');
      }, 60000); // 60 second timeout for real minting

      console.log(`🪙 Minting ${purchaseAmount} STAKE tokens for ${solCost} SOL...`);
      
      // Use real token minting with market-based pricing
      const signature = await mintTokensToUser(
        connection,
        publicKey,
        purchaseAmount,
        solCost,
        async (transaction) => {
          return await sendTransaction(transaction, connection);
        }
      );

      clearTimeout(timeout);
      setTxSignature(signature);
      setAmount('100'); // Reset amount
      
      // Refresh token balance
      await initializeTokenData();
      
      alert(`🎉 Successfully purchased ${purchaseAmount} STAKE tokens!\n\n💰 Cost: ${solCost} devnet SOL\n🪙 Tokens minted to your wallet\n🔗 Transaction: ${signature}`);
      
    } catch (error) {
      console.error('Purchase failed:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        alert(`⚠️ Transaction timed out: ${error.message}\n\nPlease check your internet connection and try again.`);
      } else if (error instanceof Error && error.message.includes('insufficient')) {
        alert(`❌ Insufficient funds: ${error.message}\n\nPlease airdrop more devnet SOL and try again.`);
      } else {
        alert(`❌ Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or check the console for details.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const tokenValue = parseFloat(amount) || 0;
  const marketCost = tokenValue / TOKENS_PER_SOL; // Real market-based cost

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
        <div>
          <p className="font-medium text-blue-900">Your STAKE Token Balance</p>
          <p className="text-2xl font-bold text-blue-600">{tokenBalance.toFixed(2)} STAKE</p>
          {tokenMint && (
            <p className="text-xs text-blue-600 font-mono break-all">
              Mint: {tokenMint.slice(0, 20)}...
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-blue-700">Market Rate</p>
          <p className="font-medium text-blue-900">1 SOL = {TOKENS_PER_SOL} STAKE</p>
          <p className="text-xs text-blue-600">Real SPL Token</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount to Purchase (STAKE tokens)
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter amount"
            disabled={isLoading}
          />
          
          {/* Quick Amount Buttons */}
          <div className="flex space-x-2 mt-2">
            <button 
              onClick={() => setAmount('100')} 
              className="btn-sm bg-gray-100 hover:bg-gray-200"
              disabled={isLoading}
            >
              100
            </button>
            <button 
              onClick={() => setAmount('500')} 
              className="btn-sm bg-gray-100 hover:bg-gray-200"
              disabled={isLoading}
            >
              500
            </button>
            <button 
              onClick={() => setAmount('1000')} 
              className="btn-sm bg-gray-100 hover:bg-gray-200"
              disabled={isLoading}
            >
              1000
            </button>
            <button 
              onClick={() => setAmount('5000')} 
              className="btn-sm bg-gray-100 hover:bg-gray-200"
              disabled={isLoading}
            >
              5000
            </button>
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Tokens to purchase:</span>
            <span className="font-medium">{tokenValue.toLocaleString()} STAKE</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Market Cost:</span>
            <span className="font-medium text-blue-600">{marketCost.toFixed(4)} devnet SOL</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t mt-2">
            <span>Est. Network Fee:</span>
            <span className="font-medium">~0.01 SOL</span>
          </div>
          <div className="flex justify-between text-sm text-green-600 font-medium">
            <span>Total Cost:</span>
            <span>{(marketCost + 0.01).toFixed(4)} devnet SOL</span>
          </div>
        </div>

        <button
          onClick={handlePurchase}
          disabled={isLoading || !publicKey || tokenValue <= 0}
          className="w-full btn btn-primary"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Minting Tokens...
            </div>
          ) : (
            `Purchase ${tokenValue.toLocaleString()} STAKE for ${marketCost.toFixed(4)} SOL`
          )}
        </button>

        {txSignature && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800 mb-1">✅ Tokens Minted Successfully!</p>
            <p className="text-xs text-green-600 font-mono break-all">
              {txSignature}
            </p>
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
            >
              🔍 View on Solana Explorer (Devnet) →
            </a>
          </div>
        )}
      </div>

      {/* Debug Section */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">🔍 System Debug</h3>
          <button
            onClick={checkSystemStatus}
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
          >
            Check Status
          </button>
        </div>
        
        {debugInfo && (
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>RPC Endpoint:</strong> {debugInfo.rpcEndpoint}</p>
            <p><strong>User SOL Balance:</strong> {debugInfo.userBalance} SOL</p>
            <p><strong>Mint Authority Balance:</strong> {debugInfo.authorityBalance} SOL</p>
            <p><strong>Mint Authority:</strong> {debugInfo.mintAuthority}</p>
            <p><strong>Token Mint:</strong> {debugInfo.tokenMint}</p>
            <p><strong>Staking Pool Users:</strong> {debugInfo.stakingPoolUsers}</p>
            <p><strong>Network:</strong> {debugInfo.network}</p>
            <p><strong>Persistent:</strong> {debugInfo.persistent ? 'Yes' : 'No'}</p>
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-2">
          Use this to debug mint authority funding issues
        </p>
      </div>

      <div className="text-xs text-gray-500 space-y-1 bg-blue-50 p-3 rounded-lg">
        <p className="font-medium text-blue-800">🌐 Real Solana Devnet Token System:</p>
        <p>• Persistent mint authority with file-based storage</p>
        <p>• Real SPL token minting on Solana devnet</p>
        <p>• Market-based pricing (1 SOL = {TOKENS_PER_SOL} STAKE)</p>
        <p>• Actual devnet SOL payment required for tokens</p>
        <p>• Real token accounts created on blockchain</p>
        <p>• Professional payment processing on devnet</p>
        <p>• All transactions recorded on Solana devnet</p>
      </div>

      <button
        onClick={testWalletConnection}
        disabled={isTestingWallet || !publicKey}
        className="w-full btn btn-primary"
      >
        {isTestingWallet ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Testing Wallet Connection...
          </div>
        ) : (
          'Test Wallet Connection'
        )}
      </button>
    </div>
  );
};

export default TokenPurchase; 