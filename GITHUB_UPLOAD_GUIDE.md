# 📤 Upload Thesis Project to GitHub - Step-by-Step Guide

## 🎯 Quick Steps Overview

1. Create new repository on GitHub
2. Initialize Git locally (if not done)
3. Add files to Git
4. Connect to GitHub remote
5. Push code

---

## 📋 Detailed Instructions

### **Step 1: Create Repository on GitHub**

1. Go to: https://github.com
2. Click the **"+"** button (top-right) → **"New repository"**
3. Fill in details:
   ```
   Repository name: BlockchainVotingApp
   Description: Web3 Gasless Voting System - Thesis Project
   Visibility: ✅ Private (recommended for thesis)
            OR Public (if you want to showcase)
   
   ❌ Do NOT initialize with README (we have local files)
   ❌ Do NOT add .gitignore (we'll create one)
   ❌ Do NOT add license yet
   ```
4. Click **"Create repository"**
5. **Keep the page open** - you'll need the URL!

---

### **Step 2: Open PowerShell in Your Project**

```powershell
# Navigate to your project folder
cd "C:\Users\shaquill.razaq\OneDrive - Bina Nusantara\Thesis\BlockchainVotingApp_1"
```

---

### **Step 3: Check if Git is Initialized**

```powershell
# Check if .git folder exists
if (Test-Path .git) {
    Write-Host "✅ Git already initialized"
} else {
    Write-Host "❌ Git not initialized - will initialize now"
    git init
}
```

---

### **Step 4: Create .gitignore File**

**Important!** Don't upload sensitive files or large dependencies.

```powershell
# Create .gitignore file
New-Item -Path .gitignore -ItemType File -Force

# Add content to .gitignore
@"
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment variables (SENSITIVE!)
.env
.env.local
.env.production
.env.development
*.env

# Build outputs
dist/
build/
out/
.next/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
desktop.ini

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Cache
.cache/
*.tsbuildinfo

# Testing
coverage/
.nyc_output/

# Misc
.eslintcache
*.local

# Hardhat (if you add later)
cache/
artifacts/
typechain-types/

# Remix backups
*.sol~
*.backup

# Large files
*.xlsx
*.xls
*.pdf
*.zip
*.rar
"@ | Set-Content .gitignore
```

---

### **Step 5: Add Files to Git**

```powershell
# Check status
git status

# Add all files (respecting .gitignore)
git add .

# Verify what will be committed
git status

# If you see sensitive files listed, remove them:
# git reset <filename>
```

---

### **Step 6: Make Initial Commit**

```powershell
# Create first commit
git commit -m "Initial commit: Web3 Gasless Voting System

- Smart contracts v1 and v2 with EIP-1167 clone pattern
- Batch operations for Excel upload support
- Credit refund system
- Complete documentation and manuals
- Supabase integration guides
- RainbowKit setup documentation"
```

---

### **Step 7: Connect to GitHub Remote**

**Replace with YOUR GitHub repository URL:**

```powershell
# Add remote (replace USERNAME with your GitHub username)
git remote add origin https://github.com/USERNAME/BlockchainVotingApp.git

# Verify remote
git remote -v
```

**Example:**
```powershell
# If your GitHub username is "razaqshaquille"
git remote add origin https://github.com/razaqshaquille/BlockchainVotingApp.git
```

---

### **Step 8: Push to GitHub**

```powershell
# Push to main branch
git push -u origin main

# If you get error about "master" vs "main":
git branch -M main
git push -u origin main
```

**If you get authentication error:**

#### **Option A: HTTPS with Personal Access Token (Recommended)**

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Give it a name: "Thesis Project Access"
4. Select scopes:
   - ✅ repo (all)
5. Click **"Generate token"**
6. **Copy the token** (you won't see it again!)
7. When Git asks for password, paste the token

#### **Option B: SSH Key**

```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"
# Press Enter for default location
# Enter passphrase (or leave empty)

# Copy public key
Get-Content ~/.ssh/id_ed25519.pub | clip

# Go to: https://github.com/settings/keys
# Click "New SSH key"
# Paste the key
# Click "Add SSH key"

# Change remote to SSH
git remote set-url origin git@github.com:USERNAME/BlockchainVotingApp.git

# Push again
git push -u origin main
```

---

## ✅ Verify Upload

1. Go to your GitHub repository page
2. Refresh the page
3. You should see all your files!

**Check structure:**
```
BlockchainVotingApp/
├── contracts/
│   ├── v1/
│   └── v2/
├── manuals/
│   └── v2/
├── templates/
├── MarkDowns/
├── .gitignore
└── README.md (if you have one)
```

---

## 🔒 Security Check

**⚠️ IMPORTANT: Verify NO sensitive data uploaded!**

```powershell
# Check if .env files are in repo
git ls-files | Select-String "\.env"

# Should return NOTHING
# If it shows .env files:
git rm --cached .env
git rm --cached .env.local
git commit -m "Remove sensitive files"
git push
```

**Never commit:**
- ❌ `.env` files (API keys, private keys)
- ❌ `node_modules/` (large, regenerable)
- ❌ Private keys or mnemonics
- ❌ Database passwords
- ❌ API secrets

---

## 📝 Create README.md (Optional but Recommended)

```powershell
# Create README
New-Item -Path README.md -ItemType File -Force
```

**Suggested content:**

```markdown
# 🗳️ SecureVote - Web3 Gasless Voting System

Blockchain-based voting system with gasless transactions for my thesis project.

## 🎯 Features

- ✅ Gasless voting using ERC-2771 meta-transactions
- ✅ EIP-1167 minimal proxy pattern (97% gas savings)
- ✅ Batch operations for Excel upload (400 voters in 1 tx)
- ✅ Automatic credit refund system
- ✅ Multi-round voting support
- ✅ Escrow deposit system with platform fees

## 📁 Project Structure

- `contracts/v1/` - Version 1 (basic functionality)
- `contracts/v2/` - Version 2 (batch operations + refund logic)
- `manuals/` - Complete documentation
- `templates/` - Excel upload templates

## 🚀 Tech Stack

- **Blockchain:** Solidity ^0.8.20
- **Standards:** EIP-1167, ERC-2771
- **Frontend:** Next.js, RainbowKit, Wagmi
- **Database:** Supabase (PostgreSQL)
- **Network:** Ethereum Sepolia Testnet

## 📚 Documentation

See `manuals/v2/` for complete guides:
- [v1 vs v2 Changes](./manuals/v2/V1_VS_V2_CHANGES.md)
- [Implementation Guide](./manuals/v2/IMPLEMENTATION_GUIDE.md)
- [Voting Room Lifecycle](./manuals/v2/VOTING_ROOM_LIFECYCLE.md)
- [Credit Refund Logic](./manuals/v2/CREDIT_REFUND_LOGIC.md)

## 🎓 Academic Context

This project is developed as part of my thesis at Bina Nusantara University, exploring decentralized voting systems with improved UX through gasless transactions.

## 📄 License

[Add your license - e.g., MIT, Apache 2.0]
```

**Add and commit README:**

```powershell
git add README.md
git commit -m "Add comprehensive README"
git push
```

---

## 🔄 Future Updates Workflow

**When you make changes:**

```powershell
# Check what changed
git status

# Add specific files
git add contracts/v2/VotingRoom.sol
git add manuals/v2/IMPLEMENTATION_GUIDE.md

# Or add all changes
git add .

# Commit with descriptive message
git commit -m "Add withdrawal function to VotingRoom v2

- Implement withdrawDeposit() for admin
- Add ETH receiver fallback
- Update documentation"

# Push to GitHub
git push
```

---

## 🌿 Branch Strategy (Optional)

**For larger features:**

```powershell
# Create feature branch
git checkout -b feature/frontend-implementation

# Make changes...
git add .
git commit -m "Implement RainbowKit integration"

# Push branch
git push -u origin feature/frontend-implementation

# On GitHub: Create Pull Request
# After review: Merge to main
```

---

## 🔗 Clone on Another Computer

**To work from different location:**

```powershell
# Clone repository
git clone https://github.com/USERNAME/BlockchainVotingApp.git

# Navigate into folder
cd BlockchainVotingApp

# Install dependencies (if you add package.json later)
npm install

# Create .env file (don't commit this!)
New-Item -Path .env.local -ItemType File
# Add your API keys manually
```

---

## 🆘 Common Issues

### **Issue 1: "Permission denied"**

**Solution:** Use Personal Access Token or SSH key (see Step 8)

---

### **Issue 2: "Repository not found"**

**Solution:** Check remote URL

```powershell
git remote -v

# If wrong, update:
git remote set-url origin https://github.com/CORRECT-USERNAME/CORRECT-REPO.git
```

---

### **Issue 3: "Large files rejected"**

**Solution:** GitHub has 100MB file limit

```powershell
# Find large files
Get-ChildItem -Recurse | Where-Object { $_.Length -gt 50MB } | Select-Object FullName, @{Name="SizeMB";Expression={[math]::Round($_.Length/1MB,2)}}

# Remove from Git
git rm --cached large-file.xlsx

# Add to .gitignore
Add-Content .gitignore "`nlarge-file.xlsx"

# Commit
git commit -m "Remove large file"
git push
```

---

### **Issue 4: "Already exists on GitHub"**

**Solution:** If you created README/license on GitHub:

```powershell
# Pull first
git pull origin main --allow-unrelated-histories

# Then push
git push
```

---

## 🎯 Quick Command Reference

```powershell
# Status
git status

# Add files
git add .
git add filename

# Commit
git commit -m "Message"

# Push
git push

# Pull latest
git pull

# View history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes
git reset --hard HEAD
```

---

## 📊 Repository Settings (After Upload)

### **1. Make Repository Private (if thesis)**

1. Go to repository → Settings
2. Scroll to "Danger Zone"
3. Click "Change visibility"
4. Select "Private"

### **2. Add Collaborators (if needed)**

1. Repository → Settings → Collaborators
2. Click "Add people"
3. Enter email/username

### **3. Protect Main Branch**

1. Repository → Settings → Branches
2. Add rule for "main"
3. Check "Require pull request reviews"

---

## ✅ Final Checklist

Before pushing:
- [ ] Created .gitignore
- [ ] No .env files in repo
- [ ] No node_modules/
- [ ] No private keys
- [ ] No large files (>50MB)
- [ ] Meaningful commit message
- [ ] README.md created
- [ ] Repository visibility set (public/private)

After pushing:
- [ ] Verify files on GitHub
- [ ] Check repository settings
- [ ] Add description to repo
- [ ] Add topics/tags (blockchain, solidity, voting, thesis)

---

## 🎓 Thesis Backup Strategy

**Recommended:**
1. **GitHub** (primary, version control)
2. **OneDrive** (automatic, current location)
3. **External Drive** (weekly backup)
4. **University Server** (if available)

**Never rely on single location for thesis work!**

---

## 📚 Resources

- [GitHub Docs](https://docs.github.com)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [GitHub Desktop](https://desktop.github.com/) (GUI alternative)

---

**Ready to upload? Copy commands from Step 2 onwards!** 🚀
