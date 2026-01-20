import { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import RoomFactoryABI from '../contracts/ABI/v2/RoomFactory.json';
import SponsorVaultABI from '../contracts/ABI/v2/SponsorVault.json';

export default function CreateRoomPage() {
    const { address, isConnected } = useAccount();
    const navigate = useNavigate();
    const publicClient = usePublicClient();
    const [roomName, setRoomName] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [createdRoomAddress, setCreatedRoomAddress] = useState(null);

    // Read minimum registration fee from SponsorVault
    const { data: minRegistrationFee } = useReadContract({
        address: CONTRACT_ADDRESSES.SponsorVault,
        abi: SponsorVaultABI,
        functionName: 'registrationFeeWei',
    });

    const { writeContract, data: hash, error, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

    // Parse room address from transaction receipt
    useEffect(() => {
        if (isSuccess && receipt && !createdRoomAddress) {
            try {
                const roomCreatedEvent = receipt.logs.find(log => {
                    try {
                        const decoded = decodeEventLog({
                            abi: RoomFactoryABI,
                            data: log.data,
                            topics: log.topics
                        });
                        return decoded.eventName === 'RoomCreated';
                    } catch {
                        return false;
                    }
                });

                if (roomCreatedEvent) {
                    const decoded = decodeEventLog({
                        abi: RoomFactoryABI,
                        data: roomCreatedEvent.data,
                        topics: roomCreatedEvent.topics
                    });
                    setCreatedRoomAddress(decoded.args.room);
                }
            } catch (err) {
                console.error('Error parsing room address:', err);
            }
        }
    }, [isSuccess, receipt, createdRoomAddress]);

    const handleCreateRoom = async (e) => {
        e.preventDefault();

        if (!roomName || !depositAmount) {
            alert('Please fill all fields');
            return;
        }

        const depositWei = parseEther(depositAmount);

        if (minRegistrationFee && depositWei < minRegistrationFee) {
            alert(`Minimum registration fee is ${(Number(minRegistrationFee) / 1e18).toFixed(4)} ETH`);
            return;
        }

        writeContract({
            address: CONTRACT_ADDRESSES.RoomFactory,
            abi: RoomFactoryABI,
            functionName: 'createRoom',
            args: [roomName],
            value: depositWei,
        });
    };

    const isFactoryOwner = address?.toLowerCase() === CONTRACT_ADDRESSES.FactoryOwner?.toLowerCase();

    return (
        <div>
            <nav className="navbar">
                <div className="navbar-content">
                    <h2 style={{ color: '#667eea' }}>SecureVote</h2>
                    <ul className="navbar-links">
                        <li><NavLink to="/main">Home</NavLink></li>
                        <li><NavLink to="/create-room" className="active">Create Room</NavLink></li>
                        <li><NavLink to="/join-room">Join Room</NavLink></li>
                        <li><NavLink to="/rooms">Room Collection</NavLink></li>
                        {isFactoryOwner && <li><NavLink to="/admin">Admin Panel</NavLink></li>}
                    </ul>
                </div>
            </nav>

            <div className="container">
                <div className="center-page" style={{ minHeight: 'calc(100vh - 80px)' }}>
                    <div className="card">
                        <h2 style={{ marginBottom: '20px' }}>Create Voting Room</h2>

                        <form onSubmit={handleCreateRoom}>
                            <div className="form-group">
                                <label>Room Name *</label>
                                <input
                                    type="text"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    placeholder="Enter room name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Initial Deposit (ETH) *</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="0.01"
                                    required
                                />
                                {minRegistrationFee && (
                                    <small style={{ color: '#666', fontSize: '12px' }}>
                                        Minimum: {(Number(minRegistrationFee) / 1e18).toFixed(4)} ETH
                                    </small>
                                )}
                            </div>

                            {error && (
                                <div className="error">
                                    Error: {error.message}
                                </div>
                            )}

                            {isSuccess && (
                                <div className="success">
                                    Room created successfully!
                                </div>
                            )}

                            <button type="submit" disabled={isPending || isConfirming || !isConnected}>
                                {isPending ? 'Waiting for approval...' :
                                    isConfirming ? 'Creating room...' :
                                        'Create Room'}
                            </button>

                            {isSuccess && createdRoomAddress && (
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => navigate(`/room/${createdRoomAddress}`)}
                                    style={{ marginTop: '10px', width: '100%' }}
                                >
                                    Join Room
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
