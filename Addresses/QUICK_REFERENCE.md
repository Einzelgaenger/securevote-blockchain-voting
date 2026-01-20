# 🚀 Contract Addresses - Quick Reference

## 📍 Sepolia Testnet Deployment

**Network:** Sepolia (Chain ID: 11155111)  
**Deployed:** January 20, 2026  
**Status:** ✅ Production Ready

---

## 📋 Copy-Paste Ready Addresses

```javascript
// For frontend config
export const SEPOLIA_CONTRACTS = {
  MinimalForwarder: '0xdE41F486df655AdA306166a601166DDA5e69e241',
  SponsorVault: '0x04d1BB5E8565DF62743212B39F3586d5A9965b67',
  VotingRoomImplementation: '0xc6e866069dc20c0ABAD2a74509Ac9aA928f2f0cF',
  RoomFactory: '0x35404f230901488BFE187d7edCF31287396E6842',
} as const;
```

---

## 🔗 Etherscan Links

**MinimalForwarder:**  
https://sepolia.etherscan.io/address/0xdE41F486df655AdA306166a601166DDA5e69e241

**SponsorVault:**  
https://sepolia.etherscan.io/address/0x04d1BB5E8565DF62743212B39F3586d5A9965b67

**VotingRoom:**  
https://sepolia.etherscan.io/address/0xc6e866069dc20c0ABAD2a74509Ac9aA928f2f0cF

**RoomFactory:**  
https://sepolia.etherscan.io/address/0x35404f230901488BFE187d7edCF31287396E6842

---

## ⚙️ Configuration

**SponsorVault Settings:**
- Registration Fee: 0.01 ETH
- Overhead: 10%
- Platform Fee: 5%

**Compiler:**
- Version: 0.8.30
- Optimization: Enabled (Runs: 1 for VotingRoom)

---

## ✅ Files Updated

- ✅ `/Addresses/3_sepoliaAddresses.txt` (detailed documentation)
- ✅ `/lovable_ai/vote-free-main/vote-free-main/.env` (contract addresses)
- ✅ `/lovable_ai/vote-free-main/vote-free-main/.gitignore` (.env excluded from git)

---

## 🔜 Next Steps

1. ⏳ Setup Supabase (get URL + API keys)
2. ⏳ Get WalletConnect Project ID
3. ⏳ Update remaining .env variables
4. ⏳ Test frontend connection
5. ⏳ Deploy relayer service

---

**Need to verify on Etherscan?**  
Use Remix's verification plugin or manual verification at sepolia.etherscan.io
