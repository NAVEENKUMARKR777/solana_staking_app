import { NextPage } from 'next';
import Head from 'next/head';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import StakingInterface from '../components/StakingInterface';
import AirdropButton from '../components/AirdropButton';
import TokenPurchase from '../components/TokenPurchase';
import WalletButton from '../components/WalletButton';

const Home: NextPage = () => {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (publicKey && connected && mounted) {
      // Get wallet balance
      connection.getBalance(publicKey).then((balance) => {
        setBalance(balance / LAMPORTS_PER_SOL);
      }).catch((error) => {
        console.log('Error fetching balance:', error);
        setBalance(0);
      });
    }
  }, [connection, publicKey, connected, mounted]);

  if (!mounted) {
    // Return loading state during SSR
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading Solana Staking App...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Head>
        <title>Solana Staking App</title>
        <meta name="description" content="Stake and unstake tokens on Solana devnet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                🪙 Solana Staking
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {connected && (
                <div className="text-sm text-gray-600">
                  Balance: {balance.toFixed(4)} SOL
                </div>
              )}
              <WalletButton className="btn btn-solana" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {!connected ? (
          // Wallet not connected state
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Solana Staking
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Connect your Phantom wallet to start staking tokens on Solana devnet
              </p>
              
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4">Features:</h3>
                  <ul className="text-left space-y-2 text-gray-600">
                    <li>✅ Stake tokens securely</li>
                    <li>✅ Unstake anytime</li>
                    <li>✅ Airdrop SOL for testing</li>
                    <li>✅ Buy custom tokens</li>
                    <li>✅ Track your rewards</li>
                  </ul>
                </div>
                
                <div className="pt-4">
                  <WalletButton className="btn btn-solana text-lg px-8 py-3" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Wallet connected state
          <div className="space-y-8">
            {/* Wallet Info & Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Wallet Info */}
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Wallet Information</h2>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Address:</span>
                  </p>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                    {publicKey?.toBase58()}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Balance:</span> {balance.toFixed(4)} SOL
                  </p>
                </div>
              </div>

              {/* Airdrop */}
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Get Test SOL</h2>
                <p className="text-gray-600 mb-4">
                  Get free SOL for testing on devnet
                </p>
                <AirdropButton />
              </div>
            </div>

            {/* Token Purchase */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Buy Staking Tokens</h2>
              <TokenPurchase />
            </div>

            {/* Staking Interface */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Stake & Unstake Tokens</h2>
              <StakingInterface />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 text-sm">
            <p>Built on Solana Devnet • For Educational Purposes</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home; 