import { useEffect, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const WalletButton = ({ className }: { className?: string }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder during SSR to match server rendering
    return (
      <button 
        className={`${className} opacity-50 cursor-not-allowed`}
        disabled
      >
        Loading...
      </button>
    );
  }

  return <WalletMultiButton className={className} />;
};

export default WalletButton; 