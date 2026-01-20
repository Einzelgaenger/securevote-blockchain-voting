import { useAccount } from 'wagmi';
import { useNavigate, NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export default function MainPage() {
    const { address, isConnected } = useAccount();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isConnected) {
            navigate('/');
        }
    }, [isConnected, navigate]);

    const isFactoryOwner = address?.toLowerCase() === CONTRACT_ADDRESSES.FactoryOwner?.toLowerCase();

    return (
        <div>
            <nav className="navbar">
                <div className="navbar-content">
                    <h2 style={{ color: '#667eea' }}>SecureVote</h2>
                    <ul className="navbar-links">
                        <li><NavLink to="/create-room">Create Room</NavLink></li>
                        <li><NavLink to="/join-room">Join Room</NavLink></li>
                        <li><NavLink to="/rooms">Room Collection</NavLink></li>
                        {isFactoryOwner && (
                            <li><NavLink to="/admin">Admin Panel</NavLink></li>
                        )}
                    </ul>
                </div>
            </nav>

            <div className="container">
                <div className="center-page" style={{ minHeight: 'calc(100vh - 80px)' }}>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <h2 style={{ marginBottom: '20px', color: '#333' }}>
                            Welcome!
                        </h2>
                        <div className="wallet-address">
                            Connected: {address}
                        </div>
                        {isFactoryOwner && (
                            <div className="success" style={{ marginTop: '15px' }}>
                                ✓ You are the Factory Owner
                            </div>
                        )}
                        <div style={{ marginTop: '30px' }}>
                            <button onClick={() => navigate('/create-room')}>
                                Create Room
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
