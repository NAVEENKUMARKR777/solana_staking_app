const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Solana Staking Program...\n');

try {
  // Check if Solana CLI is installed
  console.log('📋 Checking Solana CLI...');
  execSync('solana --version', { stdio: 'inherit' });

  // Check current config
  console.log('\n📍 Current Solana Config:');
  execSync('solana config get', { stdio: 'inherit' });

  // Build the program
  console.log('\n🔨 Building the program...');
  const programDir = path.join(__dirname, '../program');
  
  if (!fs.existsSync(programDir)) {
    console.error('❌ Program directory not found. Please ensure the program exists in ./program/');
    process.exit(1);
  }

  process.chdir(programDir);
  
  // Build with cargo
  console.log('Building Rust program...');
  execSync('cargo build-bpf', { stdio: 'inherit' });

  // Deploy the program
  console.log('\n🚀 Deploying program to Solana...');
  const deployResult = execSync('solana program deploy target/deploy/solana_staking_program.so', { 
    encoding: 'utf8' 
  });
  
  console.log(deployResult);

  // Extract program ID from deployment output
  const programIdMatch = deployResult.match(/Program Id: ([A-Za-z0-9]+)/);
  if (programIdMatch) {
    const programId = programIdMatch[1];
    console.log(`\n✅ Program deployed successfully!`);
    console.log(`🆔 Program ID: ${programId}`);
    
    // Save program ID to a config file
    const configPath = path.join(__dirname, '../config/program-id.json');
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify({ programId }, null, 2));
    console.log(`💾 Program ID saved to ${configPath}`);
    
    console.log('\n📝 Next steps:');
    console.log('1. Update utils/programUtils.ts with the new Program ID');
    console.log('2. Initialize the staking pool');
    console.log('3. Test the frontend integration');
  }

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Ensure Solana CLI is installed and configured');
  console.log('2. Make sure you have sufficient SOL for deployment');
  console.log('3. Check that you\'re connected to the correct network');
  console.log('4. Verify the program builds successfully');
  process.exit(1);
} 