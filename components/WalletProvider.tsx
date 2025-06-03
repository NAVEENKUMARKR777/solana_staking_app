import { FC, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Use multiple RPC endpoints for better reliability
const RPC_ENDPOINTS = [
  clusterApiUrl('devnet'),
  'https://api.devnet.solana.com',
  'https://devnet.solana.com',
];

// Use the first endpoint as primary
const endpoint = RPC_ENDPOINTS[0];

console.log('🌐 Using Solana devnet RPC endpoint:', endpoint);

const wallets = [
  new PhantomWalletAdapter(),
];

interface WalletProviderProps {
  children: ReactNode;
}

const WalletProviderComponent: FC<WalletProviderProps> = ({ children }) => {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletProviderComponent; 