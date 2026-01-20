# 🔗 WalletConnect Setup - Quick Guide

## 📋 What You Need

WalletConnect Project ID diperlukan untuk RainbowKit (wallet connection UI).

**Time needed:** 3-5 menit  
**Cost:** Gratis (Free tier)

---

## 🚀 Step-by-Step

### Step 1: Create Account

1. Go to: https://cloud.walletconnect.com/
2. Click **"Sign Up"** (kanan atas)
3. Sign up dengan:
   - Email + Password, atau
   - GitHub account, atau
   - Google account
4. Verify email (check inbox)

### Step 2: Create Project

1. After login, click **"Create"** atau **"New Project"**
2. Fill form:
   ```
   Project Name: SecureVote
   Project Description: Gasless blockchain voting platform
   Project Homepage: https://securevote.app (atau biarkan kosong)
   ```
3. Click **"Create"**

### Step 3: Get Project ID

1. Dashboard akan show project **"SecureVote"**
2. Click project → See **Project ID**
3. Copy Project ID (format: `abc123def456...`)
4. Paste ke notepad

### Step 4: Update Frontend .env

**Path:**
```
c:\Users\shaquill.razaq\OneDrive - Bina Nusantara\Thesis\BlockchainVotingApp_1\lovable_ai\vote-free-main\vote-free-main\.env
```

**Add:**
```env
VITE_WALLETCONNECT_PROJECT_ID=your-project-id-here
```

---

## ✅ Verification

After setup, test di frontend:

```bash
cd lovable_ai/vote-free-main/vote-free-main
npm run dev
```

Open http://localhost:8080/ → Click "Connect Wallet" → Should see WalletConnect modal! 🎉

---

## 🆓 Free Tier Limits

WalletConnect free tier includes:
- ✅ Unlimited users
- ✅ 1 million requests/month (cukup banget!)
- ✅ All wallet support (MetaMask, WalletConnect, Coinbase, etc.)
- ✅ No credit card required

**Perfect untuk MVP!** 🚀

---

## 🔗 Useful Links

- Dashboard: https://cloud.walletconnect.com/
- Docs: https://docs.walletconnect.com/
- Explorer: https://walletconnect.com/explorer (list supported wallets)

---

**Once you have the Project ID, paste it here and I'll update the .env!** 📝
