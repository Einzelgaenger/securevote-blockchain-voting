// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ISponsorVault {
    function acceptRegistrationFee() external payable;
    function registrationFeeWei() external view returns (uint256);
}

interface IVotingRoom {
    function initialize(
        address _roomAdmin,
        string calldata _roomName,
        address _sponsorVault,
        address _trustedForwarder
    ) external;
}

/**
 * @title RoomFactory
 * @notice Factory for creating voting rooms using EIP-1167 minimal proxy pattern
 * @dev Creates clones of VotingRoomImplementation to minimize deployment costs
 */
contract RoomFactory is Ownable {
    
    // ============ State Variables ============
    
    /// @notice Address of VotingRoom implementation (logic contract)
    address public immutable votingRoomImplementation;
    
    /// @notice Address of SponsorVault
    address public immutable sponsorVault;
    
    /// @notice Address of MinimalForwarder (ERC-2771)
    address public immutable trustedForwarder;
    
    /// @notice Mapping of room address to room admin
    mapping(address room => address admin) public roomOwner;
    
    /// @notice Check if address is a valid room created by this factory
    mapping(address room => bool valid) public isRoom;
    
    /// @notice List of all created rooms (optional, for enumeration)
    address[] public allRooms;
    
    // ============ Events ============
    
    event RoomRegistered(
        address indexed room,
        address indexed admin,
        uint256 feePaid,
        string name
    );
    
    // ============ Errors ============
    
    error InsufficientRegistrationFee();
    error RoomCreationFailed();
    error TransferFailed();
    
    // ============ Constructor ============
    
    constructor(
        address _votingRoomImplementation,
        address _sponsorVault,
        address _trustedForwarder
    ) Ownable(msg.sender) {
        require(_votingRoomImplementation != address(0), "Invalid implementation");
        require(_sponsorVault != address(0), "Invalid vault");
        require(_trustedForwarder != address(0), "Invalid forwarder");
        
        votingRoomImplementation = _votingRoomImplementation;
        sponsorVault = _sponsorVault;
        trustedForwarder = _trustedForwarder;
    }
    
    // ============ Factory Functions ============
    
    /**
     * @notice Create new voting room clone
     * @param roomName Name of the voting room
     * @return room Address of newly created room clone
     */
    function createRoom(string calldata roomName) external payable returns (address room) {
        // Check registration fee
        uint256 requiredFee = ISponsorVault(sponsorVault).registrationFeeWei();
        if (msg.value < requiredFee) revert InsufficientRegistrationFee();
        
        // Create minimal proxy clone
        room = Clones.clone(votingRoomImplementation);
        if (room == address(0)) revert RoomCreationFailed();
        
        // Initialize the clone
        IVotingRoom(room).initialize({
            _roomAdmin: msg.sender,
            _roomName: roomName,
            _sponsorVault: sponsorVault,
            _trustedForwarder: trustedForwarder
        });
        
        // Register room
        roomOwner[room] = msg.sender;
        isRoom[room] = true;
        allRooms.push(room);
        
        // Forward registration fee to SponsorVault
        ISponsorVault(sponsorVault).acceptRegistrationFee{value: msg.value}();
        
        emit RoomRegistered(room, msg.sender, msg.value, roomName);
    }
    
    /**
     * @notice Predict room address before deployment
     * @dev Useful for off-chain preparation
     */
    function predictRoomAddress(uint256 nonce) external view returns (address) {
        // Note: This is simplified - actual prediction requires salt mechanism
        // For basic Clones.clone(), address is deterministic based on implementation
        return Clones.predictDeterministicAddress(
            votingRoomImplementation,
            bytes32(nonce),
            address(this)
        );
    }
    
    /**
     * @notice Get total number of rooms created
     */
    function getRoomCount() external view returns (uint256) {
        return allRooms.length;
    }
    
    /**
     * @notice Get room address by index
     */
    function getRoomAt(uint256 index) external view returns (address) {
        require(index < allRooms.length, "Index out of bounds");
        return allRooms[index];
    }
    
    /**
     * @notice Get all rooms created by a specific admin
     */
    function getRoomsByAdmin(address admin) external view returns (address[] memory) {
        uint256 count = 0;
        
        // Count rooms owned by admin
        for (uint256 i = 0; i < allRooms.length; i++) {
            if (roomOwner[allRooms[i]] == admin) {
                count++;
            }
        }
        
        // Populate result array
        address[] memory result = new address[](count);
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < allRooms.length; i++) {
            if (roomOwner[allRooms[i]] == admin) {
                result[resultIndex] = allRooms[i];
                resultIndex++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Get all rooms where user is registered as voter
     * @dev Requires calling VotingRoom.isVoterEligible() for each room
     */
    function getRoomsByVoter(address voter) external view returns (address[] memory) {
        uint256 count = 0;
        
        // Count rooms where voter is eligible
        for (uint256 i = 0; i < allRooms.length; i++) {
            (bool success, bytes memory result) = allRooms[i].staticcall(
                abi.encodeWithSignature("isVoterEligible(address)", voter)
            );
            if (success && result.length > 0) {
                bool isEligible = abi.decode(result, (bool));
                if (isEligible) {
                    count++;
                }
            }
        }
        
        // Populate result array
        address[] memory result = new address[](count);
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < allRooms.length; i++) {
            (bool success, bytes memory data) = allRooms[i].staticcall(
                abi.encodeWithSignature("isVoterEligible(address)", voter)
            );
            if (success && data.length > 0) {
                bool isEligible = abi.decode(data, (bool));
                if (isEligible) {
                    result[resultIndex] = allRooms[i];
                    resultIndex++;
                }
            }
        }
        
        return result;
    }
}
