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
    
    /// @notice Total credits granted to all voters
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
     * @notice Remove voter from registry
     */
    function removeVoter(address voter) external onlyAdmin notInState(State.Active) {
        voterVersion[voter] = 0;
        
        emit VoterRemoved(address(this), voter);
    }
    
    /**
     * @notice Grant vote credit to voter
     */
    function grantCredit(address voter, uint256 amount) external onlyAdmin notInState(State.Active) {
        if (amount == 0) revert InvalidAmount();
        if (!_isVoterEligible(voter)) revert VoterNotEligible();
        
        voterCredit[voter] += amount;
        totalCreditsGranted += amount;
        
        emit CreditGranted(address(this), voter, amount, voterCredit[voter]);
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
     */
    function closeRound(uint256 winnerId) external onlyAdmin inState(State.Ended) {
        if (!_isCandidateValid(winnerId)) revert CandidateNotFound();
        
        RoundSummary storage summary = roundSummaries[currentRound];
        summary.winnerId = winnerId;
        summary.totalVotesWeight = totalCreditsUsed;
        summary.closed = true;
        
        state = State.Closed;
        
        emit RoundClosed(address(this), currentRound, winnerId, totalCreditsUsed);
    }
    
    /**
     * @notice Reset room for new voting session
     */
    function resetRoom() external onlyAdmin inState(State.Closed) {
        voterRegistryVersion++;
        candidateRegistryVersion++;
        
        totalCreditsGranted = 0;
        totalCreditsUsed = 0;
        
        state = State.Inactive;
        
        emit RegistryReset(address(this), voterRegistryVersion, candidateRegistryVersion);
    }
    
    /**
     * @notice Prepare next round without resetting voter/candidate registry
     * @dev Use this to continue with same voters and candidates
     */
    function prepareNextRound() external onlyAdmin inState(State.Closed) {
        // Reset credit counters for new round
        totalCreditsGranted = 0;
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
}
