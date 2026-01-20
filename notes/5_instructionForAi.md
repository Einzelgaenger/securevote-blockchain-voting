Di bawah ini adalah **instruksi siap-pakai** yang bisa kamu **copy–paste ke Copilot AI / GitHub Copilot Chat di VS Code** supaya Copilot **paham konteks, arsitektur, dan aturan** sebelum mulai menulis kode Solidity.

Ini ditulis sebagai **SYSTEM / PROJECT INSTRUCTIONS**, bukan sekadar prompt biasa.

---

# 🧠 Copilot AI Instructions — Web3 Gasless Voting System (EIP-1167)

> **Context:**
> You are assisting in writing Solidity smart contracts for a **Web3 Gasless Voting SaaS**.
> This system uses **ERC-2771 meta-transactions**, **EIP-1167 minimal proxy clones**, and a **trusted allowlisted relayer**.
> All voters are gasless. Relayers are paid from on-chain escrow.

---

## 1. Architecture Overview (DO NOT VIOLATE)

### Contracts

You MUST implement **exactly these components**:

1. **SponsorVault (singleton)**

   * Stores ETH deposit per voting room
   * Pays relayer per vote using `settleAndWithdraw`
   * Stores platform-level parameters (overhead, registration fee)
   * Maintains relayer allowlist

2. **VotingRoomImplementation (logic contract)**

   * NO constructor
   * MUST use `initialize()` once (EIP-1167 compatible)
   * Handles:

     * voters
     * candidates
     * weighted voting
     * rounds
     * state machine

3. **RoomFactory**

   * Deploys rooms using **EIP-1167 clone**
   * Calls `initialize()` on new clone
   * Charges non-refundable registration fee

4. **MinimalForwarder**

   * ERC-2771 trusted forwarder
   * Used ONLY for vote()

---

## 2. Core Design Rules (CRITICAL)

### 🚫 Never break these rules

* ❌ Voters MUST NEVER pay gas
* ❌ VotingRoom MUST NEVER hold ETH
* ❌ ETH for gas MUST be stored in SponsorVault
* ❌ Relayer MUST NEVER lose ETH
* ❌ No loops over voter or candidate lists (DoS risk)
* ❌ No constructor in VotingRoom (use initialize)

---

## 3. Voting Model (STRICT)

### Voting rules

* One voter → **one vote per round**
* VoteCredit = **weight**
* When voter votes:

  * ALL credits are consumed at once
  * Credit balance becomes `0`
* Credit CANNOT be reused in future rounds
* Voting is transparent (no commit-reveal)

### Anti-double-vote

```solidity
mapping(address => uint256) lastVotedRound;
```

---

## 4. State Machine (MANDATORY)

```solidity
enum State { Inactive, Active, Ended, Closed }
```

| State    | Allowed              |
| -------- | -------------------- |
| Inactive | setup, credit, topup |
| Active   | vote only            |
| Ended    | pause, no vote       |
| Closed   | withdraw, reset      |

Voting is ONLY allowed when `state == Active`.

---

## 5. Gasless Meta-Transaction Rules

### Identity handling

* **NEVER** use `msg.sender` for voter identity
* **ALWAYS** use:

```solidity
address voter = _msgSender();
```

VotingRoom MUST inherit `ERC2771Context`.

---

## 6. Relayer & Settlement Model (CRITICAL)

### Relayer characteristics

* EOA
* Allowlisted in SponsorVault
* Pays gas first
* Gets reimbursed per vote

### Settlement method (MANDATORY)

```solidity
function settleAndWithdraw(
  address room,
  bytes32 actionId,
  uint256 chargedAmount
) external;
```

Rules:

* Only allowlisted relayer
* One-time settlement per `actionId`
* ETH transferred immediately to relayer

---

## 7. Action ID (DO NOT CHANGE)

Action ID MUST be deterministic:

```solidity
actionId = keccak256(
  abi.encodePacked(room, currentRound, voter)
);
```

Reason:

* voter can vote only once per round
* prevents double-settlement

---

## 8. Deposit Rules

### Deposit storage

```solidity
mapping(address room => uint256) roomBalance;
```

### Mandatory buffer

Before vote is relayed:

```text
roomBalance >= 2 * maxCostPerVoteWei
```

Relayer MUST pre-check this off-chain.

---

## 9. Gas Cost & Overhead Calculation

### Off-chain (relayer)

```text
actualVoteCost = gasUsed * effectiveGasPrice
overhead = actualVoteCost * overheadBps / 10_000
chargedAmount = actualVoteCost + overhead
```

### On-chain

* Contract MUST TRUST relayer (allowlisted)
* BUT must enforce:

  * no double settlement
  * sufficient room balance

---

## 10. EIP-1167 Rules (STRICT)

### VotingRoomImplementation

* NO constructor
* MUST include:

```solidity
bool initialized;
```

```solidity
function initialize(...) external {
  require(!initialized);
  initialized = true;
}
```

### RoomFactory

* MUST use OpenZeppelin `Clones`
* MUST NOT deploy VotingRoom with `new`

---

## 11. Reset Strategy (NO LOOPS)

Use versioning, not deletion.

```solidity
uint256 voterRegistryVersion;
mapping(address => uint256) voterVersion;
```

Reset:

```solidity
voterRegistryVersion++;
candidateRegistryVersion++;
```

---

## 12. Required Events (DO NOT SKIP)

### VotingRoom

* `VoteCast(room, round, voter, candidateId, weight, actionId)`
* `RoundStarted(room, round)`
* `RoundEnded(room, round)`
* `CreditGranted(room, voter, amount)`

### SponsorVault

* `RoomToppedUp(room, amount)`
* `Settled(room, actionId, relayer, chargedAmount)`
* `OverheadBpsUpdated(old, new)`

---

## 13. Security Requirements

You MUST:

* Use Checks-Effects-Interactions
* Use `nonReentrant` for ETH transfers
* Validate room state before vote
* Validate credit > 0 before vote
* Prevent double settlement

---

## 14. Coding Style

* Solidity `^0.8.x`
* Use OpenZeppelin:

  * `Clones`
  * `Ownable`
  * `ReentrancyGuard`
  * `ERC2771Context`
* Prefer clarity over micro-optimization
* Explicit revert messages

---

## 15. If Anything Is Ambiguous

If you are unsure:

* ASK instead of guessing
* DO NOT invent new logic
* DO NOT simplify security rules

---

## ✅ Expected Output from Copilot

When coding, Copilot should:

* Follow architecture strictly
* Respect relayer trust model
* Use EIP-1167 correctly
* Never break gasless invariant
* Never store ETH in VotingRoom

---

Jika kamu mau, aku juga bisa:

* memecah instruksi ini menjadi **per-file prompt** (`SponsorVault.sol`, `VotingRoom.sol`, `RoomFactory.sol`)
* atau membuat **Copilot prompt versi pendek** (quick-start) khusus saat nulis satu file tertentu.

Tinggal bilang mau format yang mana.
