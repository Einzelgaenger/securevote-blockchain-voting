# SecureVote Mockup - Minimalistic Testing UI

A minimalistic UI for testing blockchain voting features.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd mockup
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3001`

## 📋 Features

### Pages

1. **Landing Page** (`/`)
   - Connect wallet button (RainbowKit)
   - Auto-redirects to main page after connection

2. **Main Page** (`/main`)
   - Shows connected wallet address
   - Navbar with all navigation options
   - Factory Owner indicator
   - "Create Room" CTA button

3. **Create Room** (`/create-room`)
   - Form to create new voting room
   - Room name input
   - Initial deposit input (minimum enforced)
   - Creates room via RoomFactory contract
   - "Join Room" button after successful creation

4. **Join Room** (`/join-room`)
   - Input room address
   - Validates Ethereum address
   - Redirects to voting room page

5. **Room Collection** (`/rooms`)
   - Shows all rooms where user is admin/voter
   - Search by name or address
   - Filter by role (admin/voter/all)
   - Sort by created date, name, or state
   - Manual refresh from blockchain button
   - Real-time data from Supabase

6. **Admin Panel** (`/admin`) - Factory Owner Only
   - Set Overhead BPS
   - Set Registration Fee
   - Set Platform Fee BPS
   - Withdraw Platform Fee
   - View current settings and balances

7. **Voting Room** (`/room/:roomAddress`)
   - Room information display
   - State badge (Inactive/Active/Ended/Closed)
   - Voter and candidate lists
   - Admin actions (based on room state):
     - Start/Stop/End Voting
     - Add Voter
     - Add Candidate
     - Grant Credits
     - Close Round
     - Reset Room
     - Prepare Next Round
   - Voter actions:
     - Cast vote (when Active state)
     - View credits
   - Manual refresh button

## 🔑 Key Features

### Wallet Integration
- RainbowKit for beautiful wallet connection
- Auto-redirect after connection
- Network: Sepolia Testnet
- Factory Owner detection and special access

### Smart Contract Integration
- RoomFactory: Create rooms
- SponsorVault: Admin panel functions
- VotingRoom: All voting operations
- Real-time contract reads
- Transaction status tracking

### Supabase Integration
- Real-time data from off-chain database
- Voters, candidates, rooms tables
- Search and filter capabilities
- Manual refresh option for data integrity

## 📝 Environment Variables

All environment variables are already configured in `.env`:

- `VITE_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID
- `VITE_ALCHEMY_API_KEY` - Alchemy RPC key
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- Contract addresses (Sepolia):
  - `VITE_MINIMAL_FORWARDER`
  - `VITE_SPONSOR_VAULT`
  - `VITE_VOTING_ROOM`
  - `VITE_ROOM_FACTORY`
  - `VITE_FACTORY_OWNER`

## 🧪 Testing Workflow

### As Factory Owner:
1. Connect wallet
2. Go to Admin Panel
3. Set registration fee, platform fee, overhead
4. Create a room
5. Add voters and candidates
6. Grant credits to voters
7. Start voting
8. Monitor votes
9. End voting
10. Close round with winner

### As Voter:
1. Connect wallet
2. Join room (get address from admin)
3. Wait for admin to add you as voter
4. Wait for admin to grant credits
5. Vote when room is Active
6. View your vote confirmation

### As Room Admin:
1. Create room
2. Add voters (individual or batch)
3. Add candidates
4. Grant credits to voters
5. Start voting
6. Monitor progress
7. End voting
8. Close round
9. Prepare next round OR reset room

## 🔧 Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Wagmi v2** - React hooks for Ethereum
- **Viem** - TypeScript Ethereum library
- **RainbowKit 2.2** - Wallet connection
- **React Router** - Navigation
- **Supabase** - Off-chain database
- **Alchemy** - RPC provider

## 📦 Contract ABIs

ABIs are imported from:
```
../contracts/ABI/v2/RoomFactory.json
../contracts/ABI/v2/SponsorVault.json
../contracts/ABI/v2/VotingRoom.json
```

Make sure these files exist in the correct location.

## ⚠️ Important Notes

1. **Sepolia Testnet Only** - Get test ETH from faucet
2. **Manual Refresh** - Click refresh button to sync Supabase with blockchain
3. **Factory Owner** - Only `0x04A3baCFd9D57E2fA661064c03C1c1774A8cEb97` can access Admin Panel
4. **Room States**:
   - Inactive (0) - Setup phase
   - Active (1) - Voting open
   - Ended (2) - Voting closed, not finalized
   - Closed (3) - Round finalized with winner

## 🐛 Troubleshooting

### Transaction Fails
- Check you have enough Sepolia ETH
- Ensure you're on Sepolia network
- Check minimum registration fee (Admin Panel)

### Data Not Showing
- Click "Refresh from Blockchain" button
- Check Supabase connection
- Verify contract addresses in .env

### Access Denied
- Factory Owner pages require specific wallet address
- Room admin pages require you to be room creator

## 🎯 Next Steps

After testing with this mockup:
1. Implement batch operations (Excel upload)
2. Add event indexer to auto-sync Supabase
3. Implement gasless voting (EIP-2771)
4. Add real-time vote tally
5. Add analytics and charts
6. Improve error handling
7. Add loading states
8. Add transaction history

## 📖 Resources

- [Wagmi Documentation](https://wagmi.sh)
- [RainbowKit Documentation](https://rainbowkit.com)
- [Viem Documentation](https://viem.sh)
- [Supabase Documentation](https://supabase.com/docs)
