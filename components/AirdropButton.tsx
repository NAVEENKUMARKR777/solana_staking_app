import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState } from 'react';

const AirdropButton = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const requestAirdrop = async () => {
    if (!publicKey) {
      setStatus('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setStatus('');

    try {
      // Request 1 SOL airdrop
      const signature = await connection.requestAirdrop(
        publicKey,
        1 * LAMPORTS_PER_SOL
      );

      setStatus('Airdrop requested! Confirming transaction...');

      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      setStatus('✅ Successfully received 1 SOL!');
      
      // Clear status after 3 seconds
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Airdrop failed:', error);
      setStatus('❌ Airdrop failed. Try again later.');
      setTimeout(() => setStatus(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={requestAirdrop}
        disabled={isLoading || !publicKey}
        className={`btn w-full ${
          isLoading ? 'opacity-50 cursor-not-allowed' : 'btn-primary'
        }`}
      >
        {isLoading ? 'Requesting...' : 'Request 1 SOL Airdrop'}
      </button>
      
      {status && (
        <div className={`text-sm p-2 rounded ${
          status.includes('✅') ? 'bg-green-50 text-green-700' :
          status.includes('❌') ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {status}
        </div>
      )}
      
      <p className="text-xs text-gray-500">
        * Devnet only - Free test SOL for development
      </p>
    </div>
  );
};

export default AirdropButton; 