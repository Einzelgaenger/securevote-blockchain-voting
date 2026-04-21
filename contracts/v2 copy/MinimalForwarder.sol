// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title MinimalForwarder
 * @notice ERC-2771 compliant forwarder for gasless meta-transactions
 * @dev Used exclusively for vote() function in VotingRoom
 */
contract MinimalForwarder is EIP712 {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
    }

    bytes32 private constant TYPEHASH =
        keccak256("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)");

    mapping(address => uint256) private _nonces;

    event MetaTransactionExecuted(
        address indexed from,
        address indexed to,
        bytes32 indexed requestHash,
        bool success,
        bytes returnData
    );

    constructor() EIP712("MinimalForwarder", "1.0.0") {}

    /**
     * @notice Get current nonce for address
     */
    function getNonce(address from) public view returns (uint256) {
        return _nonces[from];
    }

    /**
     * @notice Verify signature of ForwardRequest
     */
    function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        address signer = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    TYPEHASH,
                    req.from,
                    req.to,
                    req.value,
                    req.gas,
                    req.nonce,
                    keccak256(req.data)
                )
            )
        ).recover(signature);

        return _nonces[req.from] == req.nonce && signer == req.from;
    }

    /**
     * @notice Execute meta-transaction
     * @dev Only allowlisted relayer should call this
     */
    function execute(ForwardRequest calldata req, bytes calldata signature)
        public
        payable
        returns (bool success, bytes memory returnData)
    {
        require(verify(req, signature), "MinimalForwarder: signature does not match request");

        _nonces[req.from] = req.nonce + 1;

        // Append the "from" address to calldata for ERC2771Context
        bytes memory data = abi.encodePacked(req.data, req.from);

        (success, returnData) = req.to.call{gas: req.gas, value: req.value}(data);

        emit MetaTransactionExecuted(
            req.from,
            req.to,
            keccak256(abi.encode(req)),
            success,
            returnData
        );

        // Propagate revert reason
        if (!success) {
            assembly {
                let ptr := add(returnData, 32)
                let size := mload(returnData)
                revert(ptr, size)
            }
        }
    }
}
