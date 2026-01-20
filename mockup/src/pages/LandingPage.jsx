import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function LandingPage() {
    const { isConnected } = useAccount();
    const navigate = useNavigate();

    useEffect(() => {
        if (isConnected) {
            navigate('/main');
        }
    }, [isConnected, navigate]);

    return (
        <div className="center-page">
            <div className="card" style={{ textAlign: 'center' }}>
                <h1 style={{ marginBottom: '20px', color: '#667eea' }}>
                    SecureVote
                </h1>
                <p style={{ marginBottom: '30px', color: '#666' }}>
                    Gasless Blockchain Voting Platform
                </p>
                <ConnectButton />
            </div>
        </div>
    );
}
