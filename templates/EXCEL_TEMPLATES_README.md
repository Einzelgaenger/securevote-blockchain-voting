# 📋 Excel Templates for Bulk Upload

## Overview

These Excel templates enable batch upload of voters and candidates to voting rooms. Use these to add hundreds of participants with a single transaction (1 wallet popup!).

---

## 🗳️ Voters Template

### **File: `voters-template.xlsx`**

### **Column Structure:**

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| **Address** | Text | ✅ Yes | Ethereum wallet address (42 chars) | 0x742d35Cc6634C0532925a3b844Bc454e4438f44e |
| **Credit** | Number | ✅ Yes | Vote credit (weight) to grant | 100 |

### **Example Rows:**

```
Address                                     | Credit
-------------------------------------------|-------
0x742d35Cc6634C0532925a3b844Bc454e4438f44e | 100
0x5B38Da6a701c568545dCfcB03FcB875f56beddC4 | 150
0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2 | 100
```

### **Validation Rules:**

✅ **Address:**
- Must start with `0x`
- Must be 42 characters long
- Must contain only hexadecimal characters (0-9, a-f, A-F)
- Example valid: `0x742d35Cc6634C0532925a3b844Bc454e4438f44e`
- Example invalid: `0x123`, `742d35Cc...` (missing 0x), `0xGGGG...` (invalid chars)

✅ **Credit:**
- Must be a positive integer
- Recommended range: 1 - 1,000,000
- Typical value: 100 (standard weight)
- Cannot be 0 or negative

### **Batch Limits:**

| Total Voters | Transactions Needed | Popups | Gas Cost (approx) |
|--------------|--------------------|---------|--------------------|
| 1 - 400 | 1 | **1** | ~28M gas (~$3 @ 10 gwei) |
| 401 - 800 | 2 | **2** | ~56M gas (~$6 @ 10 gwei) |
| 801 - 1,200 | 3 | **3** | ~84M gas (~$9 @ 10 gwei) |

**Recommendation:** Keep under 400 voters per file for optimal UX.

---

## 🎯 Candidates Template

### **File: `candidates-template.xlsx`**

### **Column Structure:**

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| **ID** | Number | ✅ Yes | Unique candidate identifier (integer) | 1 |
| **Name** | Text | ✅ Yes | Candidate name (max 100 chars) | John Doe |

### **Example Rows:**

```
ID | Name
---|-------------------
1  | John Doe
2  | Jane Smith
3  | Robert Johnson
```

### **Validation Rules:**

✅ **ID:**
- Must be a positive integer
- Must be unique within the room
- Recommended range: 1 - 999,999
- Example valid: `1`, `42`, `1001`
- Example invalid: `0`, `-1`, `1.5`, `abc`

✅ **Name:**
- Must not be empty
- Maximum length: 100 characters
- Can contain letters, numbers, spaces, and special chars
- Example valid: `John Doe`, `Candidate #1`, `María García`
- Example invalid: ` ` (empty/spaces only), `[101 character name]`

### **Batch Limits:**

| Total Candidates | Transactions Needed | Popups | Gas Cost (approx) |
|-----------------|--------------------|---------|--------------------|
| 1 - 350 | 1 | **1** | ~28M gas (~$3 @ 10 gwei) |
| 351 - 700 | 2 | **2** | ~56M gas (~$6 @ 10 gwei) |
| 701 - 1,050 | 3 | **3** | ~84M gas (~$9 @ 10 gwei) |

**Recommendation:** Keep under 350 candidates per file for optimal UX.

---

## 🔧 How to Use

### **Step 1: Download Template**

Download the appropriate template from the DApp:
- **Voters:** Click "Download Voters Template"
- **Candidates:** Click "Download Candidates Template"

### **Step 2: Fill Data**

Open in Excel/Google Sheets and fill in your data:

**For Voters:**
1. Paste wallet addresses in column A
2. Enter credit amounts in column B
3. Save as `.xlsx`

**For Candidates:**
1. Enter sequential IDs in column A (1, 2, 3...)
2. Enter candidate names in column B
3. Save as `.xlsx`

### **Step 3: Upload**

1. Go to Room Admin Dashboard
2. Navigate to "Voters" or "Candidates" tab
3. Click "Upload Excel" button
4. Select your file
5. Review validation results
6. Confirm transaction (1 wallet popup!)

### **Step 4: Wait for Confirmation**

- **Blockchain confirmation:** ~12 seconds
- **Database sync:** ~2 seconds
- **Total time:** ~15 seconds

---

## ⚠️ Common Errors

### **Error: "Invalid address"**

**Cause:** Address format is wrong

**Solutions:**
- Ensure address starts with `0x`
- Check address is exactly 42 characters
- Remove spaces before/after address
- Use checksum address (get from MetaMask)

**How to get correct address:**
```
✅ Copy from MetaMask: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
❌ Don't type manually: 0x742d... (incomplete)
❌ Don't include spaces: 0x742d35Cc 6634C053...
```

### **Error: "Invalid credit"**

**Cause:** Credit is not a valid number

**Solutions:**
- Use whole numbers only (no decimals)
- Remove currency symbols ($, Rp)
- Remove thousand separators (,)
- Ensure value is positive

**Examples:**
```
✅ Correct: 100
❌ Wrong: 100.5 (decimal)
❌ Wrong: 1,000 (comma)
❌ Wrong: $100 (symbol)
❌ Wrong: 0 (zero)
❌ Wrong: -50 (negative)
```

### **Error: "Duplicate ID"**

**Cause:** Same candidate ID used twice

**Solution:**
- Ensure each ID is unique
- Use sequential numbers (1, 2, 3, 4...)
- Don't skip numbers (optional but recommended)

**Examples:**
```
✅ Correct:
ID | Name
---|------
1  | Alice
2  | Bob
3  | Charlie

❌ Wrong (duplicate):
ID | Name
---|------
1  | Alice
1  | Bob  ← Duplicate!
3  | Charlie
```

### **Error: "Gas estimation failed"**

**Cause:** Too many items in one batch

**Solutions:**
- Split file into smaller batches
- Max 400 voters per file
- Max 350 candidates per file
- Upload multiple times if needed

**How to split:**
1. Original file: 1000 voters
2. Split into 3 files:
   - File 1: voters 1-400
   - File 2: voters 401-800
   - File 3: voters 801-1000
3. Upload each file separately (3 transactions)

---

## 💡 Pro Tips

### **Tip 1: Use MetaMask Address Book**

Export addresses from MetaMask to avoid typos:
1. MetaMask → Settings → Contacts
2. Export to CSV
3. Copy addresses to Excel template

### **Tip 2: Test with Small Batch First**

Before uploading 1000 voters:
1. Create test file with 5 voters
2. Upload and verify it works
3. Then upload full list

### **Tip 3: Keep Backup**

Always save original Excel file:
- In case transaction fails
- For audit trail
- For future reference

### **Tip 4: Standardize Credits**

For fairness, use same credit for all voters:
- Standard: 100 credits per voter
- Weighted: VIP gets 200, normal gets 100
- Custom: Based on role/seniority

### **Tip 5: Name Candidates Clearly**

Use descriptive names:
```
✅ Good:
1 | John Doe - Economics Department
2 | Jane Smith - Engineering Faculty
3 | Robert Lee - Student Representative

❌ Confusing:
1 | JD
2 | JS
3 | RL
```

---

## 📊 Sample Data

### **Sample Voters (10 entries)**

```
Address                                     | Credit
-------------------------------------------|-------
0x742d35Cc6634C0532925a3b844Bc454e4438f44e | 100
0x5B38Da6a701c568545dCfcB03FcB875f56beddC4 | 100
0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2 | 100
0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db | 100
0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB | 100
0x617F2E2fD72FD9D5503197092aC168c91465E7f2 | 100
0x17F6AD8Ef982297579C203069C1DbfFE4348c372 | 100
0x5c6B0f7Bf3E7ce046039Bd8FABdfD3f9F5021678 | 100
0x03C6FcED478cBbC9a4FAB34eF9f40767739D1Ff7 | 100
0x1aE0EA34a72D944a8C7603FfB3eC30a6669E454C | 100
```

### **Sample Candidates (5 entries)**

```
ID | Name
---|---------------------------
1  | Alice Johnson
2  | Bob Williams
3  | Charlie Davis
4  | Diana Martinez
5  | Edward Thompson
```

---

## 🔐 Security Notes

### **Privacy Considerations:**

⚠️ **Wallet addresses are PUBLIC on blockchain**
- Anyone can see who voted (not what they voted for)
- Vote content is private (weighted to candidate)
- Consider this when sharing voter lists

### **Data Protection:**

✅ **Best practices:**
- Don't share Excel files publicly
- Store templates securely
- Use encrypted storage for sensitive data
- Delete after upload (if needed)

### **Validation:**

✅ **System validates:**
- Address format (42 chars, starts with 0x)
- Credit amount (positive integer)
- Candidate ID uniqueness
- Name length (max 100 chars)

❌ **System does NOT validate:**
- Whether address actually exists
- Whether voter owns that address
- Whether name is person's real name

**⚠️ Important:** Admin is responsible for ensuring correct addresses!

---

## 📞 Support

If you encounter issues:

1. **Check validation errors** in upload modal
2. **Review this README** for common errors
3. **Test with small batch** (5-10 entries)
4. **Check network** (must be on Sepolia)
5. **Contact support** if issue persists

---

## 📝 Version History

- **v1.0** (2026-01-20): Initial template release
  - Voters template (Address, Credit)
  - Candidates template (ID, Name)
  - Batch limits: 400 voters, 350 candidates

