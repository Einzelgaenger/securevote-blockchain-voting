# 🔍 Off-Chain Indexing Guide - The Graph Integration

## 📊 Overview

This guide explains **why** and **how** to use off-chain indexing (The Graph) instead of expensive on-chain queries for production deployment.

---

## ❌ Problem: Expensive On-Chain Queries

### **Example: `getRoomsByVoter()`**

**On-Chain Implementation:**
```solidity
function getRoomsByVoter(address voter) external view returns (address[] memory) {
    // Loop through ALL rooms
    for (uint256 i = 0; i < allRooms.length; i++) {
        // External call for EACH room
        (bool success, bytes memory result) = allRooms[i].staticcall(
            abi.encodeWithSignature("isVoterEligible(address)", voter)
        );
        // ...
    }
}
```

**Problems:**

| Metric | Small (100 rooms) | Medium (1000 rooms) | Large (10,000 rooms) |
|--------|-------------------|---------------------|----------------------|
| **Gas Cost** | ~200,000 | ~2,000,000 | ~20,000,000 |
| **Block Limit** | ✅ Safe | ⚠️ Close | ❌ Exceeds limit |
| **Transaction Time** | ~1 second | ~10 seconds | ❌ Timeout |
| **Cost (@ 50 gwei)** | ~$0.01 | ~$0.10 | ❌ FAIL |
| **Reliability** | ✅ Works | ⚠️ May fail | ❌ Will fail |

**Verdict:** **Not scalable for production!**

---

## ✅ Solution: The Graph (Off-Chain Indexing)

### **What is The Graph?**

**The Graph** = "Google for blockchain data"
- Indexes blockchain events into queryable database
- Free, fast, unlimited queries
- No gas costs
- Real-time updates

**How it works:**
```
1. Smart contract emits events:
   emit VoterAdded(room, voter)
   emit RoomCreated(room, admin, name)

2. The Graph listens and indexes:
   Database.insert({
     voter: "0x123...",
     room: "0xAAA...",
     timestamp: 1234567890
   })

3. Frontend queries The Graph:
   GET /voters/0x123/rooms
   
4. Response: Instant, free, unlimited
```

---

## 🚀 Implementation Guide

### **Step 1: Define Subgraph Schema**

Create `schema.graphql`:

```graphql
type Room @entity {
  id: ID!                    # Room address
  admin: Bytes!              # Room admin address
  name: String!              # Room name
  sponsorVault: Bytes!       # Sponsor vault address
  state: RoomState!          # Current state
  currentRound: BigInt!      # Current round number
  voters: [Voter!]! @derivedFrom(field: "room")
  candidates: [Candidate!]! @derivedFrom(field: "room")
  createdAt: BigInt!         # Block timestamp
  createdAtBlock: BigInt!    # Block number
}

enum RoomState {
  Inactive
  Active
  Ended
  Closed
}

type Voter @entity {
  id: ID!                    # Composite: room-voter
  room: Room!                # Room reference
  address: Bytes!            # Voter address
  credit: BigInt!            # Current credit
  hasVoted: Boolean!         # Voted this round?
  lastVotedRound: BigInt!    # Last vote round
  addedAt: BigInt!           # When added
}

type Candidate @entity {
  id: ID!                    # Composite: room-candidateId
  room: Room!                # Room reference
  candidateId: BigInt!       # Candidate ID
  name: String!              # Candidate name
  totalVotes: BigInt!        # Total votes received
  addedAt: BigInt!           # When added
}

type Vote @entity {
  id: ID!                    # Transaction hash
  room: Room!                # Room reference
  voter: Bytes!              # Voter address
  candidate: Candidate!      # Candidate voted for
  weight: BigInt!            # Vote weight
  round: BigInt!             # Round number
  timestamp: BigInt!         # Vote timestamp
}

type RoundSummary @entity {
  id: ID!                    # Composite: room-round
  room: Room!                # Room reference
  round: BigInt!             # Round number
  winnerId: BigInt           # Winner candidate ID
  winnerName: String         # Winner name snapshot
  totalVotesWeight: BigInt!  # Total vote weight
  startAt: BigInt!           # Round start time
  endAt: BigInt              # Round end time
  closed: Boolean!           # Is closed?
}

# Analytics entities
type PoolStats @entity {
  id: ID!                    # Room address
  room: Room!                # Room reference
  totalCreditsInSystem: BigInt!
  availableCreditsPool: BigInt!
  totalCreditsGranted: BigInt!
  totalCreditsUsed: BigInt!
  lastUpdated: BigInt!       # Block timestamp
}
```

---

### **Step 2: Create Event Handlers**

Create `src/mapping.ts`:

```typescript
import { 
  RoomCreated,
  VoterAdded,
  VoterRemoved,
  CandidateAdded,
  VoteCast,
  RoundClosed,
  PoolUpdated
} from "../generated/RoomFactory/RoomFactory"
import { Room, Voter, Candidate, Vote, RoundSummary, PoolStats } from "../generated/schema"

// Handle new room creation
export function handleRoomCreated(event: RoomCreated): void {
  let room = new Room(event.params.room.toHexString())
  room.admin = event.params.admin
  room.name = event.params.name
  room.state = "Inactive"
  room.currentRound = BigInt.fromI32(0)
  room.createdAt = event.block.timestamp
  room.createdAtBlock = event.block.number
  room.save()
  
  // Initialize pool stats
  let poolStats = new PoolStats(event.params.room.toHexString())
  poolStats.room = room.id
  poolStats.totalCreditsInSystem = BigInt.fromI32(0)
  poolStats.availableCreditsPool = BigInt.fromI32(0)
  poolStats.totalCreditsGranted = BigInt.fromI32(0)
  poolStats.totalCreditsUsed = BigInt.fromI32(0)
  poolStats.lastUpdated = event.block.timestamp
  poolStats.save()
}

// Handle voter added
export function handleVoterAdded(event: VoterAdded): void {
  let voterId = event.params.room.toHexString() + "-" + event.params.voter.toHexString()
  let voter = new Voter(voterId)
  
  voter.room = event.params.room.toHexString()
  voter.address = event.params.voter
  voter.credit = BigInt.fromI32(0)
  voter.hasVoted = false
  voter.lastVotedRound = BigInt.fromI32(0)
  voter.addedAt = event.block.timestamp
  voter.save()
}

// Handle voter removed
export function handleVoterRemoved(event: VoterRemoved): void {
  let voterId = event.params.room.toHexString() + "-" + event.params.voter.toHexString()
  let voter = Voter.load(voterId)
  
  if (voter != null) {
    // Soft delete - keep for historical data
    voter.credit = BigInt.fromI32(0)
    voter.save()
    
    // Or hard delete:
    // store.remove('Voter', voterId)
  }
}

// Handle vote cast
export function handleVoteCast(event: VoteCast): void {
  // Create vote record
  let voteId = event.transaction.hash.toHexString()
  let vote = new Vote(voteId)
  
  vote.room = event.params.room.toHexString()
  vote.voter = event.params.voter
  vote.candidate = event.params.room.toHexString() + "-" + event.params.candidateId.toString()
  vote.weight = event.params.weight
  vote.round = event.params.round
  vote.timestamp = event.block.timestamp
  vote.save()
  
  // Update voter
  let voterId = event.params.room.toHexString() + "-" + event.params.voter.toHexString()
  let voter = Voter.load(voterId)
  if (voter != null) {
    voter.hasVoted = true
    voter.lastVotedRound = event.params.round
    voter.credit = BigInt.fromI32(0) // Credit consumed
    voter.save()
  }
  
  // Update candidate votes
  let candidateId = event.params.room.toHexString() + "-" + event.params.candidateId.toString()
  let candidate = Candidate.load(candidateId)
  if (candidate != null) {
    candidate.totalVotes = candidate.totalVotes.plus(event.params.weight)
    candidate.save()
  }
}

// Handle pool updates
export function handlePoolUpdated(event: PoolUpdated): void {
  let poolStats = PoolStats.load(event.params.room.toHexString())
  
  if (poolStats != null) {
    poolStats.availableCreditsPool = event.params.newPoolAmount
    poolStats.lastUpdated = event.block.timestamp
    poolStats.save()
  }
}
```

---

### **Step 3: Deploy Subgraph**

```bash
# Install Graph CLI
npm install -g @graphprotocol/graph-cli

# Initialize project
graph init --studio your-voting-system

# Build
graph codegen
graph build

# Deploy to hosted service (free)
graph deploy --studio your-voting-system
```

---

### **Step 4: Query from Frontend**

**React/Next.js Example:**

```typescript
import { ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client';

// Initialize client
const client = new ApolloClient({
  uri: 'https://api.studio.thegraph.com/query/your-voting-system/v1',
  cache: new InMemoryCache(),
});

// Query: Get all rooms for voter
const GET_VOTER_ROOMS = gql`
  query GetVoterRooms($voter: Bytes!) {
    voters(where: { address: $voter }) {
      room {
        id
        name
        admin
        state
        currentRound
        createdAt
      }
      credit
      hasVoted
      lastVotedRound
    }
  }
`;

// React component
function VoterDashboard({ voterAddress }) {
  const { loading, error, data } = useQuery(GET_VOTER_ROOMS, {
    variables: { voter: voterAddress.toLowerCase() },
    client,
  });
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  return (
    <div>
      <h2>My Voting Rooms</h2>
      {data.voters.map(voter => (
        <RoomCard 
          key={voter.room.id}
          room={voter.room}
          credit={voter.credit}
          hasVoted={voter.hasVoted}
        />
      ))}
    </div>
  );
}
```

---

### **Step 5: Advanced Queries**

**Query: Get room statistics**
```graphql
query GetRoomStats($roomId: ID!) {
  room(id: $roomId) {
    name
    state
    currentRound
    
    # Voter stats
    voters(where: { credit_gt: 0 }) {
      id
      credit
    }
    
    # Candidate stats
    candidates(orderBy: totalVotes, orderDirection: desc) {
      name
      totalVotes
    }
    
    # Pool stats
    poolStats {
      totalCreditsInSystem
      availableCreditsPool
      totalCreditsGranted
      totalCreditsUsed
    }
  }
}
```

**Query: Get voting history**
```graphql
query GetVotingHistory($voter: Bytes!, $first: Int!) {
  votes(
    where: { voter: $voter }
    orderBy: timestamp
    orderDirection: desc
    first: $first
  ) {
    room {
      name
    }
    candidate {
      name
    }
    weight
    round
    timestamp
  }
}
```

**Query: Get top voters by participation**
```graphql
query GetTopVoters($first: Int!) {
  voters(
    where: { hasVoted: true }
    orderBy: lastVotedRound
    orderDirection: desc
    first: $first
  ) {
    address
    room {
      name
    }
    lastVotedRound
  }
}
```

---

## 📊 Performance Comparison

| Operation | On-Chain | The Graph |
|-----------|----------|-----------|
| **Query 1 room** | 50,000 gas (~$0.003) | Free |
| **Query 1000 rooms** | 2M gas (~$0.10) | Free |
| **Response time** | 10-30 seconds | < 100ms |
| **Filtering** | Limited | Full SQL-like |
| **Sorting** | Manual | Built-in |
| **Pagination** | Manual | Built-in |
| **Historical data** | Expensive | Free |
| **Aggregations** | Not possible | Full support |
| **Scalability** | Limited by gas | Unlimited |

---

## 🎯 Best Practices

### **1. Keep On-Chain Functions for Backward Compatibility**

```solidity
/**
 * @dev ⚠️ For small datasets only. Use The Graph for production.
 */
function getRoomsByVoter(address voter) external view returns (address[] memory) {
    // Keep implementation for testing, small deploys
}
```

### **2. Document Off-Chain Alternative**

```typescript
/**
 * Get rooms for voter
 * 
 * @deprecated Use The Graph query instead:
 * ```graphql
 * query { voters(where: {address: "0x..."}) { room { id } } }
 * ```
 */
async function getRoomsByVoter(voter: string) {
  // Fallback on-chain implementation
}
```

### **3. Implement Hybrid Approach**

```typescript
async function getRoomsByVoter(voter: string) {
  try {
    // Try The Graph first (fast, free)
    return await queryTheGraph(voter);
  } catch (error) {
    // Fallback to on-chain (slow, expensive)
    console.warn('The Graph unavailable, using on-chain query');
    return await contract.getRoomsByVoter(voter);
  }
}
```

---

## 🔧 Testing Without The Graph

**For development/testing before subgraph deployed:**

```typescript
// Mock The Graph response
const mockTheGraphQuery = async (voter: string) => {
  // Use on-chain as temporary solution
  const rooms = await contract.getRoomsByVoter(voter);
  
  // Transform to Graph-like response
  return {
    voters: rooms.map(room => ({
      room: {
        id: room,
        // Fetch additional data if needed
      }
    }))
  };
};
```

---

## 📚 Resources

- **The Graph Docs:** https://thegraph.com/docs
- **Hosted Service:** https://thegraph.com/hosted-service
- **Studio (Free):** https://thegraph.com/studio
- **Example Subgraphs:** https://github.com/graphprotocol/graph-node

---

## ✅ Summary

| Aspect | On-Chain Query | The Graph |
|--------|----------------|-----------|
| **Development** | ✅ Simple | ⚠️ Requires setup |
| **Production** | ❌ Expensive | ✅ Free |
| **Scalability** | ❌ Limited | ✅ Unlimited |
| **Speed** | ❌ Slow | ✅ Fast |
| **Features** | ❌ Basic | ✅ Advanced |
| **Recommendation** | Testing only | Production |

**For Thesis:**
- ✅ Keep on-chain functions (show you understand limitations)
- ✅ Document The Graph as production solution
- ✅ Implement basic subgraph (bonus points!)
- ✅ Compare performance in evaluation chapter

---

**Updated:** January 20, 2026  
**Version:** VotingRoom v2 Production Deployment Guide
