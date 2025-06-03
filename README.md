# Solana Staking App

A comprehensive token staking application built on Solana devnet with Phantom wallet integration.

![Solana Staking App](https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)

## 🚀 Features

- **Phantom Wallet Integration**: Seamless connection with Phantom wallet
- **SOL Airdrop**: Get free SOL for testing on devnet
- **Token Purchase**: Buy STAKE tokens for staking
- **Stake Tokens**: Stake your tokens and earn rewards
- **Unstake Anytime**: Flexible unstaking with no lock period
- **Real-time Rewards**: Track and claim your staking rewards
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS

## 🏗️ Architecture

### Frontend
- **Next.js 14**: React framework with TypeScript
- **Solana Wallet Adapter**: For wallet connections
- **Tailwind CSS**: Utility-first CSS framework
- **@solana/web3.js**: Solana JavaScript SDK

### Smart Contract
- **Rust**: Solana program written in Rust
- **Borsh**: Binary serialization for account data
- **Solana Program Library**: Standard Solana program utilities

## 📋 Prerequisites

Before running this application, make sure you have:

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **Phantom Wallet** browser extension
4. **Rust** (for building Solana programs)
5. **Solana CLI** (for program deployment)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd solana-staking-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Solana CLI

```bash
# On macOS/Linux
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"

# On Windows
curl https://release.solana.com/v1.16.0/solana-install-init-x86_64-pc-windows-msvc.exe --output C:\solana-install-tmp\solana-install-init.exe --create-dirs
```

### 4. Configure Solana for Devnet

```bash
solana config set --url https://api.devnet.solana.com
solana-keygen new
```

### 5. Build the Solana Program (Optional)

```bash
cd program
cargo build-bpf
```

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## 📱 Usage Guide

### 1. Connect Wallet
- Install Phantom wallet extension
- Click "Select Wallet" and choose Phantom
- Approve the connection

### 2. Get Test SOL
- Click "Request 1 SOL Airdrop" to get free SOL
- Wait for transaction confirmation

### 3. Buy STAKE Tokens
- Enter the amount of tokens to purchase
- Click "Buy STAKE Tokens"
- Confirm the transaction in your wallet

### 4. Stake Tokens
- Enter the amount to stake
- Use percentage buttons for quick selection
- Click "Stake Tokens" and confirm

### 5. Unstake & Claim Rewards
- Enter unstake amount or use "MAX"
- Click "Unstake Tokens" to withdraw and claim rewards
- Or use "Claim Rewards" to claim without unstaking

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```

### Wallet Configuration

The app is configured for Solana devnet by default. To change networks:

1. Update `contexts/WalletProvider.tsx`
2. Change `WalletAdapterNetwork.Devnet` to desired network
3. Update RPC endpoint accordingly

## 🎯 Smart Contract Details

### Program Structure

```rust
// Instructions
- InitializePool: Create a new staking pool
- Stake: Stake tokens in the pool
- Unstake: Withdraw staked tokens
- ClaimRewards: Claim accumulated rewards

// Account Types
- StakingPool: Global pool state
- StakeAccount: Individual user stake data
```

### Deployment

To deploy your own program:

```bash
cd program
cargo build-bpf
solana program deploy target/deploy/solana_staking_program.so
```

## 🛡️ Security Considerations

- This is a demo application for educational purposes
- Smart contract includes basic security checks
- Always audit smart contracts before mainnet deployment
- Test thoroughly on devnet before production use

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Manual Testing Checklist

- [ ] Wallet connection works
- [ ] Airdrop functionality
- [ ] Token purchase simulation
- [ ] Staking tokens
- [ ] Unstaking tokens
- [ ] Claiming rewards
- [ ] UI responsiveness

## 📁 Project Structure

```
solana-staking-app/
├── components/          # React components
│   ├── AirdropButton.tsx
│   ├── StakingInterface.tsx
│   └── TokenPurchase.tsx
├── contexts/           # React contexts
│   └── WalletProvider.tsx
├── pages/              # Next.js pages
│   ├── _app.tsx
│   └── index.tsx
├── program/            # Solana program (Rust)
│   ├── src/
│   │   └── lib.rs
│   └── Cargo.toml
├── styles/             # CSS styles
│   └── globals.css
├── utils/              # Utility functions
├── package.json
├── next.config.js
├── tailwind.config.js
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [troubleshooting guide](#troubleshooting)
2. Review Solana documentation
3. Check Phantom wallet connection
4. Ensure you're on devnet

## 🔍 Troubleshooting

### Common Issues

**Wallet won't connect:**
- Ensure Phantom is installed and unlocked
- Check browser permissions
- Try refreshing the page

**Airdrop fails:**
- Devnet airdrop has rate limits
- Try again after a few minutes
- Check Solana network status

**Transactions fail:**
- Ensure sufficient SOL for gas fees
- Check wallet approval
- Verify network connection

**Build errors:**
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify all dependencies are installed

## 📚 Resources

- [Solana Documentation](https://docs.solana.com/)
- [Phantom Wallet](https://phantom.app/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Next.js Documentation](https://nextjs.org/docs)

## 🎯 Demo Video

https://drive.google.com/file/d/1JMSzDtCnWjLDRCm6Y99qi7kKCWwdCp5f/view?usp=sharing

---

Built with ❤️ for the Solana ecosystem 
