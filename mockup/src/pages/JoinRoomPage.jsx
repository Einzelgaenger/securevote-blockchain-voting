import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export default function JoinRoomPage() {
    const { address, isConnected } = useAccount();
    const navigate = useNavigate();
    const [roomAddress, setRoomAddress] = useState('');
    const [error, setError] = useState('');

    const handleJoinRoom = (e) => {
        e.preventDefault();
        setError('');

        if (!isAddress(roomAddress)) {
            setError('Invalid Ethereum address');
            return;
        }

        navigate(`/room/${roomAddress}`);
    };

    const isFactoryOwner = address?.toLowerCase() === CONTRACT_ADDRESSES.FactoryOwner?.toLowerCase();

    return (
        <div>
            <nav className="navbar">
                <div className="navbar-content">
                    <h2 style={{ color: '#667eea' }}>SecureVote</h2>
                    <ul className="navbar-links">
                        <li><NavLink to="/main">Home</NavLink></li>
                        <li><NavLink to="/create-room">Create Room</NavLink></li>
                        <li><NavLink to="/join-room" className="active">Join Room</NavLink></li>
                        <li><NavLink to="/rooms">Room Collection</NavLink></li>
                        {isFactoryOwner && <li><NavLink to="/admin">Admin Panel</NavLink></li>}
                    </ul>
                </div>
            </nav>

            <div className="container">
                <div className="center-page" style={{ minHeight: 'calc(100vh - 80px)' }}>
                    <div className="card">
                        <h2 style={{ marginBottom: '20px' }}>Join Voting Room</h2>

                        <form onSubmit={handleJoinRoom}>
                            <div className="form-group">
                                <label>Room Address *</label>
                                <input
                                    type="text"
                                    value={roomAddress}
                                    onChange={(e) => setRoomAddress(e.target.value)}
                                    placeholder="0x..."
                                    required
                                />
                                <small style={{ color: '#666', fontSize: '12px' }}>
                                    Enter the Ethereum address of the voting room
                                </small>
                            </div>

                            {error && (
                                <div className="error">
                                    {error}
                                </div>
                            )}

                            <button type="submit" disabled={!isConnected}>
                                Join Room
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
