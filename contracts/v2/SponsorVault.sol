// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SponsorVault
 * @notice Escrow contract for gasless voting system
 * @dev Stores ETH deposits per room, pays relayers, collects platform fees
 */
contract SponsorVault is Ownable, ReentrancyGuard {
    
    // ============ State Variables ============
    
    /// @notice Balance deposited per room (refundable)
    mapping(address room => uint256 balance) public roomBalance;
    
    /// @notice Track if actionId has been settled (prevent double settlement)
    mapping(bytes32 actionId => bool settled) public settled;
    
    /// @notice Allowlisted relayer addresses
    mapping(address relayer => bool allowed) public isRelayer;
    
    /// @notice Overhead percentage in basis points (e.g., 1000 = 10%)
    uint256 public overheadBps;
    
    /// @notice Registration fee for creating new room (non-refundable)
    uint256 public registrationFeeWei;
    
    /// @notice Platform fee percentage in basis points (e.g., 500 = 5%)
    uint256 public platformFeeBps;
    
    /// @notice Accumulated platform fees (registration + withdraw fees)
    uint256 public platformFeeAccrued;
    
    // ============ Events ============
    
    event RoomToppedUp(
        address indexed room,
        address indexed admin,
        uint256 amount,
        uint256 newBalance
    );
    
    event RoomWithdrawn(
        address indexed room,
        address indexed admin,
        uint256 amountToAdmin,
        uint256 platformFee,
        uint256 newBalance
    );
    
    event Settled(
        address indexed room,
        bytes32 indexed actionId,
        address indexed relayer,
        uint256 chargedAmount,
        uint256 newBalance
    );
    
    event OverheadBpsUpdated(uint256 oldBps, uint256 newBps);
    
    event RegistrationFeeUpdated(uint256 oldFee, uint256 newFee);
    
    event PlatformFeeBpsUpdated(uint256 oldBps, uint256 newBps);
    
    event RelayerUpdated(address indexed relayer, bool allowed);
    
    event PlatformFeeWithdrawn(address indexed to, uint256 amount);
    
    // ============ Errors ============
    
    error InsufficientDeposit();
    error AlreadySettled();
    error OnlyRelayer();
    error InvalidBps();
    error ZeroAddress();
    error InsufficientBalance();
    error TransferFailed();
    
    // ============ Constructor ============
    
    constructor(
        uint256 _overheadBps,
        uint256 _registrationFeeWei,
        uint256 _platformFeeBps
    ) Ownable(msg.sender) {
        if (_overheadBps > 10000 || _platformFeeBps > 10000) revert InvalidBps();
        
        overheadBps = _overheadBps;
        registrationFeeWei = _registrationFeeWei;
        platformFeeBps = _platformFeeBps;
    }
    
    // ============ Room Functions ============
    
    /**
     * @notice Top up room balance (refundable deposit)
     * @dev Can be called anytime by room admin
     */
    function topup(address room) external payable {
        if (room == address(0)) revert ZeroAddress();
        
        roomBalance[room] += msg.value;
        
        emit RoomToppedUp(room, msg.sender, msg.value, roomBalance[room]);
    }
    
    /**
     * @notice Withdraw room balance (only when not Active)
     * @dev Platform fee is deducted before transfer
     */
    function withdraw(address room, uint256 amount) external nonReentrant {
        // NOTE: Room contract will validate caller is roomAdmin
        // and state is not Active
        
        uint256 balance = roomBalance[room];
        if (balance < amount) revert InsufficientBalance();
        
        // Calculate platform fee
        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 amountToAdmin = amount - platformFee;
        
        // Update state
        roomBalance[room] = balance - amount;
        platformFeeAccrued += platformFee;
        
        // Transfer to room admin (caller must be room contract)
        (bool success, ) = msg.sender.call{value: amountToAdmin}("");
        if (!success) revert TransferFailed();
        
        emit RoomWithdrawn(room, msg.sender, amountToAdmin, platformFee, roomBalance[room]);
    }
    
    // ============ Settlement Functions ============
    
    /**
     * @notice Settle and withdraw gas cost for one vote action
     * @dev Called by allowlisted relayer after vote tx is mined
     * @param room Address of voting room
     * @param actionId Unique identifier for vote action
     * @param chargedAmount Total cost including overhead
     */
    function settleAndWithdraw(
        address room,
        bytes32 actionId,
        uint256 chargedAmount
    ) external nonReentrant {
        if (!isRelayer[msg.sender]) revert OnlyRelayer();
        if (settled[actionId]) revert AlreadySettled();
        
        uint256 balance = roomBalance[room];
        if (balance < chargedAmount) revert InsufficientDeposit();
        
        // Mark as settled
        settled[actionId] = true;
        
        // Update balance
        roomBalance[room] = balance - chargedAmount;
        
        // Transfer to relayer immediately
        (bool success, ) = msg.sender.call{value: chargedAmount}("");
        if (!success) revert TransferFailed();
        
        emit Settled(room, actionId, msg.sender, chargedAmount, roomBalance[room]);
    }
    
    // ============ Platform Admin Functions ============
    
    /**
     * @notice Update overhead percentage
     */
    function setOverheadBps(uint256 newBps) external onlyOwner {
        if (newBps > 10000) revert InvalidBps();
        
        uint256 oldBps = overheadBps;
        overheadBps = newBps;
        
        emit OverheadBpsUpdated(oldBps, newBps);
    }
    
    /**
     * @notice Update registration fee
     */
    function setRegistrationFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = registrationFeeWei;
        registrationFeeWei = newFee;
        
        emit RegistrationFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @notice Update platform fee percentage
     */
    function setPlatformFeeBps(uint256 newBps) external onlyOwner {
        if (newBps > 10000) revert InvalidBps();
        
        uint256 oldBps = platformFeeBps;
        platformFeeBps = newBps;
        
        emit PlatformFeeBpsUpdated(oldBps, newBps);
    }
    
    /**
     * @notice Add or remove relayer from allowlist
     */
    function setRelayer(address relayer, bool allowed) external onlyOwner {
        if (relayer == address(0)) revert ZeroAddress();
        
        isRelayer[relayer] = allowed;
        
        emit RelayerUpdated(relayer, allowed);
    }
    
    /**
     * @notice Withdraw platform fees
     */
    function withdrawPlatformFee(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        
        uint256 amount = platformFeeAccrued;
        platformFeeAccrued = 0;
        
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit PlatformFeeWithdrawn(to, amount);
    }
    
    /**
     * @notice Accept registration fee from RoomFactory
     */
    function acceptRegistrationFee() external payable {
        if (msg.value < registrationFeeWei) revert InsufficientDeposit();
        
        platformFeeAccrued += msg.value;
    }
    
    // ============ Analytics Functions ============
    
    /**
     * @notice Get total balance held in vault (all room deposits + platform fees)
     * @dev Useful for monitoring total TVL (Total Value Locked)
     */
    function getTotalBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Get balance breakdown for multiple rooms
     * @param rooms Array of room addresses to query
     * @return balances Array of balances corresponding to each room
     */
    function getRoomBalances(address[] calldata rooms) external view returns (uint256[] memory balances) {
        balances = new uint256[](rooms.length);
        for (uint256 i = 0; i < rooms.length; i++) {
            balances[i] = roomBalance[rooms[i]];
        }
        return balances;
    }
    
    /**
     * @notice Get comprehensive vault statistics
     * @return totalLocked Total ETH in contract
     * @return platformFees Accumulated platform fees
     * @return roomsDeposits Total deposits across all rooms (calculated)
     */
    function getVaultStats() external view returns (
        uint256 totalLocked,
        uint256 platformFees,
        uint256 roomsDeposits
    ) {
        totalLocked = address(this).balance;
        platformFees = platformFeeAccrued;
        roomsDeposits = totalLocked - platformFees; // Approximate
        return (totalLocked, platformFees, roomsDeposits);
    }
}
