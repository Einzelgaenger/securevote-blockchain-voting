// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ISponsorVault {
    function roomBalance(address room) external view returns (uint256);
}

/**
 * @title VotingRoom
 * @notice EIP-1167 compatible voting room with weighted credit-based voting
 * @dev NO constructor - uses initialize() pattern for clone compatibility
 */
contract VotingRoom is ERC2771Context, ReentrancyGuard {
    
    // ============ Enums ============
    
    enum State { Inactive, Active, Ended, Closed }
    
    // ============ Constants ============
    
    /// @notice Maximum batch size to prevent out-of-gas errors
    uint256 public constant MAX_BATCH_SIZE = 500;
    
    // ============ State Variables ============
    
    bool public initialized;
    
    address public roomAdmin;
    string public roomName;
    address public sponsorVault;
    
    State public state;
    uint256 public currentRound;
    
    /// @notice Maximum gas cost per vote (wei) - set by roomAdmin
    uint256 public maxCostPerVoteWei;
    
    // ============ Voter Management ============
    
    /// @notice Voter registry version (for reset without loops)
    uint256 public voterRegistryVersion;
    
    /// @notice Mapping voter to their registry version
    mapping(address voter => uint256 version) public voterVersion;
    
    /// @notice Vote credit balance per voter
    mapping(address voter => uint256 credit) public voterCredit;
    
    /// @notice Last round where voter voted (anti-double-vote)
    mapping(address voter => uint256 round) public lastVotedRound;
    
    /// @notice Total credits ever added to system (only increases when pool exhausted)
    uint256 public totalCreditsInSystem;
    
    /// @notice Available credits in pool (from removed voters, ready for reuse)
    uint256 public availableCreditsPool;
    
    /// @notice Total credits currently granted to active voters
    uint256 public totalCreditsGranted;
    
    /// @notice Total credits used in all votes
    uint256 public totalCreditsUsed;
    
    // ============ Candidate Management ============
    
    /// @notice Candidate registry version (for reset without loops)
    uint256 public candidateRegistryVersion;
    
    /// @notice Mapping candidate ID to their registry version
    mapping(uint256 candidateId => uint256 version) public candidateVersion;
    
    /// @notice Mapping candidate ID to name
    mapping(uint256 candidateId => string name) public candidateName;
    
    /// @notice Vote tally: round => candidateId => votes
    mapping(uint256 round => mapping(uint256 candidateId => uint256 votes)) public roundVotes;
    
    // ============ Round History ============
    
    struct RoundSummary {
        uint256 winnerId;
        string winnerName;
        uint256 totalVotesWeight;
        uint256 startAt;
        uint256 endAt;
        bool closed;
    }
    
    mapping(uint256 round => RoundSummary) public roundSummaries;
    
    // ============ Events ============
    
    event RoomInitialized(address indexed admin, string name);
    event RoundStarted(address indexed room, uint256 indexed round);
    event RoundStopped(address indexed room, uint256 indexed round);
    event RoundEnded(address indexed room, uint256 indexed round);
    event RoundClosed(address indexed room, uint256 indexed round, uint256 winnerId, uint256 totalWeight);
    
    event VoterAdded(address indexed room, address indexed voter);
    event VoterRemoved(address indexed room, address indexed voter);
    event CandidateAdded(address indexed room, uint256 indexed candidateId, string name);
    event CandidateRemoved(address indexed room, uint256 indexed candidateId);
    
    event CreditGranted(address indexed room, address indexed voter, uint256 amount, uint256 newBalance);
    event VoteCast(
        address indexed room,
        uint256 indexed round,
        address indexed voter,
        uint256 candidateId,
        uint256 weight,
        bytes32 actionId
    );
    
    event MaxCostUpdated(address indexed room, uint256 oldCost, uint256 newCost);
    event RegistryReset(address indexed room, uint256 voterVersion, uint256 candidateVersion);
    event RoundPrepared(address indexed room, uint256 indexed nextRound);
    event PoolUpdated(address indexed room, uint256 newPoolAmount, uint256 poolChange, string reason);
    event CreditsBurned(address indexed room, uint256 amount, uint256 newSystemTotal);
    event CreditUpdated(address indexed room, address indexed voter, uint256 oldCredit, uint256 newCredit);
    
    // ============ Errors ============
    
    error AlreadyInitialized();
    error NotInitialized();
    error OnlyRoomAdmin();
    error InvalidState();
    error VoterNotEligible();
    error AlreadyVotedThisRound();
    error NoCredit();
    error CandidateNotFound();
    error InsufficientDeposit();
    error ZeroAddress();
    error InvalidAmount();
    error ArrayTooLarge(uint256 provided, uint256 maxAllowed);
    error InsufficientPoolBalance(uint256 requested, uint256 available);
    error VaultWithdrawalFailed(bytes returnData);
    error TransferToAdminFailed();
    
    // ============ Modifiers ============
    
    modifier onlyAdmin() {
        if (_msgSender() != roomAdmin) revert OnlyRoomAdmin();
        _;
    }
    
    modifier inState(State required) {
        if (state != required) revert InvalidState();
        _;
    }
    
    modifier notInState(State forbidden) {
        if (state == forbidden) revert InvalidState();
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @dev NO constructor for EIP-1167 compatibility
     * @param trustedForwarder ERC-2771 forwarder address
     */
    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {
        // Implementation contract should not be initialized
    }
    
    // ============ Initialization ============
    
    /**
     * @notice Initialize clone (replaces constructor)
     * @dev Can only be called once per clone
     */
    function initialize(
        address _roomAdmin,
        string calldata _roomName,
        address _sponsorVault,
        address _trustedForwarder
    ) external {
        if (initialized) revert AlreadyInitialized();
        if (_roomAdmin == address(0) || _sponsorVault == address(0)) revert ZeroAddress();
        
        initialized = true;
        roomAdmin = _roomAdmin;
        roomName = _roomName;
        sponsorVault = _sponsorVault;
        
        state = State.Inactive;
        currentRound = 0;
        voterRegistryVersion = 1;
        candidateRegistryVersion = 1;
        
        emit RoomInitialized(_roomAdmin, _roomName);
    }
    
    // ============ Room Admin Functions ============
    
    /**
     * @notice Set maximum cost per vote
     */
    function setMaxCostPerVote(uint256 newCost) external onlyAdmin {
        uint256 oldCost = maxCostPerVoteWei;
        maxCostPerVoteWei = newCost;
        
        emit MaxCostUpdated(address(this), oldCost, newCost);
    }
    
    /**
     * @notice Add voter to registry
     */
    function addVoter(address voter) external onlyAdmin notInState(State.Active) {
        if (voter == address(0)) revert ZeroAddress();
        
        voterVersion[voter] = voterRegistryVersion;
        
        emit VoterAdded(address(this), voter);
    }
    
    /**
     * @notice Remove voter from registry with automatic credit pooling
     * @dev Credits returned to availableCreditsPool for reuse
     */
    function removeVoter(address voter) external onlyAdmin notInState(State.Active) {
        uint256 refundAmount = voterCredit[voter];
        
        // Remove voter
        voterVersion[voter] = 0;
        voterCredit[voter] = 0;
        
        // Return credits to pool (only if voter had credits)
        if (refundAmount > 0) {
            totalCreditsGranted -= refundAmount;
            availableCreditsPool += refundAmount; // ADD TO POOL!
            
            emit PoolUpdated(address(this), availableCreditsPool, refundAmount, "remove-voter-refund");
        }
        
        emit VoterRemoved(address(this), voter);
        if (refundAmount > 0) {
            emit CreditGranted(address(this), voter, 0, 0); // Signal credit reset
        }
    }
    
    /**
     * @notice Set voter credit (not add) - handles increase and decrease automatically
     * @dev Increase: uses pool first, then adds new | Decrease: returns diff to pool
     * @param voter Target voter address
     * @param newAmount New credit amount to SET (replaces current balance)
     */
    function grantCredit(address voter, uint256 newAmount) external onlyAdmin notInState(State.Active) {
        if (!_isVoterEligible(voter)) revert VoterNotEligible();
        
        uint256 currentCredit = voterCredit[voter];
        
        if (newAmount == currentCredit) {
            return; // No change needed
        }
        
        if (newAmount > currentCredit) {
            // INCREASE: need to add credits
            uint256 increaseAmount = newAmount - currentCredit;
            
            voterCredit[voter] = newAmount;
            totalCreditsGranted += increaseAmount;
            
            // Smart allocation from pool first
            if (availableCreditsPool >= increaseAmount) {
                // Pool covers all
                availableCreditsPool -= increaseAmount;
                emit PoolUpdated(address(this), availableCreditsPool, increaseAmount, "grant-from-pool");
            } else if (availableCreditsPool > 0) {
                // Pool partially covers
                uint256 fromPool = availableCreditsPool;
                uint256 newCreditsNeeded = increaseAmount - fromPool;
                
                availableCreditsPool = 0;
                totalCreditsInSystem += newCreditsNeeded;
                
                emit PoolUpdated(address(this), 0, fromPool, "grant-partial-pool");
            } else {
                // Pool empty - all from system
                totalCreditsInSystem += increaseAmount;
            }
        } else {
            // DECREASE: return excess to pool
            uint256 decreaseAmount = currentCredit - newAmount;
            
            voterCredit[voter] = newAmount;
            totalCreditsGranted -= decreaseAmount;
            availableCreditsPool += decreaseAmount;
            
            emit PoolUpdated(address(this), availableCreditsPool, decreaseAmount, "grant-refund-to-pool");
        }
        
        emit CreditUpdated(address(this), voter, currentCredit, newAmount);
        emit CreditGranted(address(this), voter, newAmount, voterCredit[voter]);
    }
    
    /**
     * @notice Burn credits from pool permanently (reduces system total)
     * @dev Can only burn from available pool, not from granted credits
     * @param amount Amount of credits to burn from pool
     */
    function burnPoolCredits(uint256 amount) external onlyAdmin notInState(State.Active) {
        if (amount == 0) revert InvalidAmount();
        if (amount > availableCreditsPool) revert InsufficientPoolBalance(amount, availableCreditsPool);
        
        availableCreditsPool -= amount;
        totalCreditsInSystem -= amount;
        
        emit CreditsBurned(address(this), amount, totalCreditsInSystem);
        emit PoolUpdated(address(this), availableCreditsPool, amount, "burned");
    }
    
    /**
     * @notice Add candidate
     */
    function addCandidate(uint256 candidateId, string calldata name) external onlyAdmin notInState(State.Active) {
        candidateVersion[candidateId] = candidateRegistryVersion;
        candidateName[candidateId] = name;
        
        emit CandidateAdded(address(this), candidateId, name);
    }
    
    /**
     * @notice Remove candidate
     */
    function removeCandidate(uint256 candidateId) external onlyAdmin notInState(State.Active) {
        candidateVersion[candidateId] = 0;
        
        emit CandidateRemoved(address(this), candidateId);
    }
    
    // ============ Batch Functions (Gas Optimization) ============
    
    /**
     * @notice Batch add multiple voters (IMPORTANT for Excel upload!)
     * @dev Single transaction = single popup = better UX
     * @dev Limited to MAX_BATCH_SIZE to prevent out-of-gas errors
     * @param voters Array of voter addresses to add (max 500)
     */
    function batchAddVoters(address[] calldata voters) external onlyAdmin notInState(State.Active) {
        if (voters.length > MAX_BATCH_SIZE) revert ArrayTooLarge(voters.length, MAX_BATCH_SIZE);
        
        for (uint256 i = 0; i < voters.length; i++) {
            if (voters[i] == address(0)) revert ZeroAddress();
            voterVersion[voters[i]] = voterRegistryVersion;
            emit VoterAdded(address(this), voters[i]);
        }
    }
    
    /**
     * @notice Batch set credits for multiple voters (SET behavior, not ADD)
     * @dev Uses pool first, then adds new credits. Skips duplicate voters.
     * @param voters Array of voter addresses (max 500)
     * @param amounts Array of credit amounts to SET (same length as voters)
     */
    function batchGrantCredits(
        address[] calldata voters,
        uint256[] calldata amounts
    ) external onlyAdmin notInState(State.Active) {
        if (voters.length != amounts.length) revert InvalidAmount();
        if (voters.length > MAX_BATCH_SIZE) revert ArrayTooLarge(voters.length, MAX_BATCH_SIZE);
        
        uint256 totalIncrease = 0;
        uint256 totalDecrease = 0;
        
        // Process all voters (duplicates allowed - last value wins)
        for (uint256 i = 0; i < voters.length; i++) {
            if (!_isVoterEligible(voters[i])) revert VoterNotEligible();
            
            uint256 currentCredit = voterCredit[voters[i]];
            uint256 newAmount = amounts[i];
            
            if (newAmount == currentCredit) continue; // No change
            
            if (newAmount > currentCredit) {
                // Increase
                uint256 increaseAmount = newAmount - currentCredit;
                totalIncrease += increaseAmount;
            } else {
                // Decrease
                uint256 decreaseAmount = currentCredit - newAmount;
                totalDecrease += decreaseAmount;
            }
            
            voterCredit[voters[i]] = newAmount;
            emit CreditUpdated(address(this), voters[i], currentCredit, newAmount);
            emit CreditGranted(address(this), voters[i], newAmount, voterCredit[voters[i]]);
        }
        
        // Handle decreases first (add to pool)
        if (totalDecrease > 0) {
            totalCreditsGranted -= totalDecrease;
            availableCreditsPool += totalDecrease;
            emit PoolUpdated(address(this), availableCreditsPool, totalDecrease, "batch-grant-decrease");
        }
        
        // Then handle increases (use pool first)
        if (totalIncrease > 0) {
            totalCreditsGranted += totalIncrease;
            
            if (availableCreditsPool >= totalIncrease) {
                availableCreditsPool -= totalIncrease;
                emit PoolUpdated(address(this), availableCreditsPool, totalIncrease, "batch-grant-from-pool");
            } else if (availableCreditsPool > 0) {
                uint256 fromPool = availableCreditsPool;
                uint256 newCreditsNeeded = totalIncrease - fromPool;
                
                availableCreditsPool = 0;
                totalCreditsInSystem += newCreditsNeeded;
                
                emit PoolUpdated(address(this), 0, fromPool, "batch-grant-partial-pool");
            } else {
                totalCreditsInSystem += totalIncrease;
            }
        }
    }
    
    /**
     * @notice Batch add voters AND set credits in ONE transaction
     * @dev MOST EFFICIENT for Excel upload (add + set = 1 popup!)
     * @dev Uses SET behavior for credits, skips duplicate voters
     * @param voters Array of voter addresses (max 500)
     * @param credits Array of credit amounts to SET
     */
    function batchAddVotersWithCredits(
        address[] calldata voters,
        uint256[] calldata credits
    ) external onlyAdmin notInState(State.Active) {
        if (voters.length != credits.length) revert InvalidAmount();
        if (voters.length > MAX_BATCH_SIZE) revert ArrayTooLarge(voters.length, MAX_BATCH_SIZE);
        
        uint256 totalIncrease = 0;
        uint256 totalDecrease = 0;
        
        // Process all voters (duplicates allowed - last value wins)
        for (uint256 i = 0; i < voters.length; i++) {
            if (voters[i] == address(0)) revert ZeroAddress();
            
            // Add voter if not already eligible
            if (!_isVoterEligible(voters[i])) {
                voterVersion[voters[i]] = voterRegistryVersion;
                emit VoterAdded(address(this), voters[i]);
            }
            
            // SET credit (not add)
            uint256 currentCredit = voterCredit[voters[i]];
            uint256 newAmount = credits[i];
            
            if (newAmount == currentCredit) continue; // No change
            
            if (newAmount > currentCredit) {
                uint256 increaseAmount = newAmount - currentCredit;
                totalIncrease += increaseAmount;
            } else {
                uint256 decreaseAmount = currentCredit - newAmount;
                totalDecrease += decreaseAmount;
            }
            
            voterCredit[voters[i]] = newAmount;
            emit CreditUpdated(address(this), voters[i], currentCredit, newAmount);
            emit CreditGranted(address(this), voters[i], newAmount, voterCredit[voters[i]]);
        }
        
        // Handle decreases first (add to pool)
        if (totalDecrease > 0) {
            totalCreditsGranted -= totalDecrease;
            availableCreditsPool += totalDecrease;
            emit PoolUpdated(address(this), availableCreditsPool, totalDecrease, "batch-add-decrease");
        }
        
        // Then handle increases (use pool first)
        if (totalIncrease > 0) {
            totalCreditsGranted += totalIncrease;
            
            if (availableCreditsPool >= totalIncrease) {
                availableCreditsPool -= totalIncrease;
                emit PoolUpdated(address(this), availableCreditsPool, totalIncrease, "batch-add-from-pool");
            } else if (availableCreditsPool > 0) {
                uint256 fromPool = availableCreditsPool;
                uint256 newCreditsNeeded = totalIncrease - fromPool;
                
                availableCreditsPool = 0;
                totalCreditsInSystem += newCreditsNeeded;
                
                emit PoolUpdated(address(this), 0, fromPool, "batch-add-partial-pool");
            } else {
                totalCreditsInSystem += totalIncrease;
            }
        }
    }
    
    /**
     * @notice Batch add multiple candidates
     * @dev Single transaction for adding many candidates from Excel
     * @param candidateIds Array of candidate IDs (max 500)
     * @param names Array of candidate names (same length)
     */
    function batchAddCandidates(
        uint256[] calldata candidateIds,
        string[] calldata names
    ) external onlyAdmin notInState(State.Active) {
        if (candidateIds.length != names.length) revert InvalidAmount();
        if (candidateIds.length > MAX_BATCH_SIZE) revert ArrayTooLarge(candidateIds.length, MAX_BATCH_SIZE);
        
        for (uint256 i = 0; i < candidateIds.length; i++) {
            candidateVersion[candidateIds[i]] = candidateRegistryVersion;
            candidateName[candidateIds[i]] = names[i];
            emit CandidateAdded(address(this), candidateIds[i], names[i]);
        }
    }
    
    /**
     * @notice Remove all voters with addresses provided
     * @dev Credits returned to pool for reuse. Efficient batch cleanup.
     * @param voters Array of voter addresses to remove (max 500)
     */
    function batchRemoveVoters(address[] calldata voters) external onlyAdmin notInState(State.Active) {
        if (voters.length > MAX_BATCH_SIZE) revert ArrayTooLarge(voters.length, MAX_BATCH_SIZE);
        
        uint256 totalRefund = 0;
        
        for (uint256 i = 0; i < voters.length; i++) {
            uint256 refundAmount = voterCredit[voters[i]];
            
            // Remove voter
            voterVersion[voters[i]] = 0;
            voterCredit[voters[i]] = 0;
            
            // Accumulate refund
            totalRefund += refundAmount;
            
            emit VoterRemoved(address(this), voters[i]);
        }
        
        // Batch refund to pool (single update)
        if (totalRefund > 0) {
            totalCreditsGranted -= totalRefund;
            availableCreditsPool += totalRefund;
            
            emit PoolUpdated(address(this), availableCreditsPool, totalRefund, "batch-remove-refund");
        }
    }
    
    /**
     * @notice Remove all candidates with IDs provided
     * @dev Use for cleanup/reset specific candidates
     * @param candidateIds Array of candidate IDs to remove (max 500)
     */
    function batchRemoveCandidates(uint256[] calldata candidateIds) external onlyAdmin notInState(State.Active) {
        if (candidateIds.length > MAX_BATCH_SIZE) revert ArrayTooLarge(candidateIds.length, MAX_BATCH_SIZE);
        
        for (uint256 i = 0; i < candidateIds.length; i++) {
            candidateVersion[candidateIds[i]] = 0;
            delete candidateName[candidateIds[i]];
            
            emit CandidateRemoved(address(this), candidateIds[i]);
        }
    }
    
    /**
     * @notice Start new voting round
     */
    function startVoting() external onlyAdmin inState(State.Inactive) {
        currentRound++;
        state = State.Active;
        
        roundSummaries[currentRound].startAt = block.timestamp;
        
        emit RoundStarted(address(this), currentRound);
    }
    
    /**
     * @notice Stop voting (pause)
     */
    function stopVoting() external onlyAdmin inState(State.Active) {
        state = State.Ended;
        
        emit RoundStopped(address(this), currentRound);
    }
    
    /**
     * @notice End voting round
     */
    function endVoting() external onlyAdmin inState(State.Active) {
        state = State.Ended;
        
        roundSummaries[currentRound].endAt = block.timestamp;
        
        emit RoundEnded(address(this), currentRound);
    }
    
    /**
     * @notice Close round and declare winner
     * @dev Saves winner name snapshot for historical integrity
     */
    function closeRound(uint256 winnerId) external onlyAdmin inState(State.Ended) {
        if (!_isCandidateValid(winnerId)) revert CandidateNotFound();
        
        RoundSummary storage summary = roundSummaries[currentRound];
        summary.winnerId = winnerId;
        summary.winnerName = candidateName[winnerId]; // Save snapshot!
        summary.totalVotesWeight = totalCreditsUsed;
        summary.closed = true;
        
        state = State.Closed;
        
        emit RoundClosed(address(this), currentRound, winnerId, totalCreditsUsed);
    }
    
    /**
     * @notice Reset room for new voting session
     * @dev Clears ALL credit tracking including pool and system total
     */
    function resetRoom() external onlyAdmin inState(State.Closed) {
        voterRegistryVersion++;
        candidateRegistryVersion++;
        
        // Reset ALL credit counters
        totalCreditsInSystem = 0;
        availableCreditsPool = 0;
        totalCreditsGranted = 0;
        totalCreditsUsed = 0;
        
        state = State.Inactive;
        
        emit RegistryReset(address(this), voterRegistryVersion, candidateRegistryVersion);
    }
    
    /**
     * @notice Prepare next round without resetting voter/candidate registry
     * @dev Preserves ALL credit state: pool, system, granted, and voter balances
     * @dev Only resets totalCreditsUsed for fresh vote tracking
     */
    function prepareNextRound() external onlyAdmin inState(State.Closed) {
        // Reset ONLY used credits for new round
        // PRESERVE: totalCreditsInSystem, availableCreditsPool, totalCreditsGranted, voterCredit[]
        totalCreditsUsed = 0;
        
        // Change state back to Inactive for setup
        state = State.Inactive;
        
        emit RoundPrepared(address(this), currentRound + 1);
    }
    
    // ============ Voting Function (Gasless) ============
    
    /**
     * @notice Cast vote (MUST be called via ERC-2771 forwarder)
     * @dev msg.sender = forwarder, _msgSender() = actual voter
     */
    function vote(uint256 candidateId) external nonReentrant inState(State.Active) {
        address voter = _msgSender();
        
        // Validation
        if (!_isVoterEligible(voter)) revert VoterNotEligible();
        if (lastVotedRound[voter] == currentRound) revert AlreadyVotedThisRound();
        if (!_isCandidateValid(candidateId)) revert CandidateNotFound();
        
        uint256 weight = voterCredit[voter];
        if (weight == 0) revert NoCredit();
        
        // Consume all credit
        voterCredit[voter] = 0;
        totalCreditsUsed += weight;
        
        // Record vote
        roundVotes[currentRound][candidateId] += weight;
        lastVotedRound[voter] = currentRound;
        
        // Generate deterministic actionId
        bytes32 actionId = keccak256(abi.encodePacked(address(this), currentRound, voter));
        
        emit VoteCast(address(this), currentRound, voter, candidateId, weight, actionId);
    }
    
    // ============ View Functions ============
    
    function _isVoterEligible(address voter) internal view returns (bool) {
        return voterVersion[voter] == voterRegistryVersion;
    }
    
    function _isCandidateValid(uint256 candidateId) internal view returns (bool) {
        return candidateVersion[candidateId] == candidateRegistryVersion;
    }
    
    function getVotes(uint256 round, uint256 candidateId) external view returns (uint256) {
        return roundVotes[round][candidateId];
    }
    
    function getRoundSummary(uint256 round) external view returns (RoundSummary memory) {
        return roundSummaries[round];
    }
    
    function isVoterEligible(address voter) external view returns (bool) {
        return _isVoterEligible(voter);
    }
    
    function isCandidateValid(uint256 candidateId) external view returns (bool) {
        return _isCandidateValid(candidateId);
    }
    
    /**
     * @notice Withdraw room deposit from SponsorVault
     * @dev Only callable by roomAdmin when not Active
     * @param amount Amount of ETH to withdraw (in wei)
     */
    function withdrawDeposit(uint256 amount) external onlyAdmin notInState(State.Active) nonReentrant {
        if (amount == 0) revert InvalidAmount();
        
        uint256 balanceBefore = address(this).balance;
        
        // Call SponsorVault withdraw - it will transfer back to this contract
        (bool success, bytes memory returnData) = sponsorVault.call(
            abi.encodeWithSignature("withdraw(address,uint256)", address(this), amount)
        );
        
        if (!success) {
            revert VaultWithdrawalFailed(returnData);
        }
        
        uint256 received = address(this).balance - balanceBefore;
        
        // Forward to roomAdmin
        (bool sent, ) = roomAdmin.call{value: received}("");
        if (!sent) {
            revert TransferToAdminFailed();
        }
    }
    
    // ============ Pool Query Functions ============
    
    /**
     * @notice Get comprehensive pool and credit status
     * @return systemTotal Total credits ever added to system
     * @return poolAvailable Credits in pool ready for reuse
     * @return currentlyGranted Credits currently held by active voters
     * @return totalUsed Credits consumed in votes
     */
    function getPoolStatus() external view returns (
        uint256 systemTotal,
        uint256 poolAvailable,
        uint256 currentlyGranted,
        uint256 totalUsed
    ) {
        return (
            totalCreditsInSystem,
            availableCreditsPool,
            totalCreditsGranted,
            totalCreditsUsed
        );
    }
    
    /**
     * @notice Check if pool can cover a specific grant amount
     * @param amount Amount to check
     * @return canCover True if pool has enough credits
     */
    function canPoolCover(uint256 amount) external view returns (bool canCover) {
        return availableCreditsPool >= amount;
    }
    
    /**
     * @notice Calculate how credits will be allocated for a grant
     * @param amount Amount to grant
     * @return fromPool Credits taken from pool
     * @return newCredits New credits that need to be added to system
     */
    function calculateCreditAllocation(uint256 amount) external view returns (
        uint256 fromPool,
        uint256 newCredits
    ) {
        if (availableCreditsPool >= amount) {
            return (amount, 0);
        } else if (availableCreditsPool > 0) {
            return (availableCreditsPool, amount - availableCreditsPool);
        } else {
            return (0, amount);
        }
    }
    
    /**
     * @notice Calculate new credits needed beyond pool
     * @param amount Amount to grant
     * @return needed New credits needed (0 if pool covers all)
     */
    function newCreditsNeeded(uint256 amount) external view returns (uint256 needed) {
        if (availableCreditsPool >= amount) {
            return 0;
        }
        return amount - availableCreditsPool;
    }
    
    /**
     * @notice Get credit utilization percentage (1-100)
     * @return utilization Percentage of system credits currently in use (not in pool)
     */
    function getCreditUtilization() external view returns (uint256 utilization) {
        if (totalCreditsInSystem == 0) return 0;
        
        uint256 inUse = totalCreditsInSystem - availableCreditsPool;
        return (inUse * 100) / totalCreditsInSystem;
    }
    
    /**
     * @notice Fallback to receive ETH from SponsorVault
     */
    receive() external payable {}
}
