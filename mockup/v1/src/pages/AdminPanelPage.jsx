import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import SponsorVaultABI from '../contracts/ABI/v2/SponsorVault.json';

export default function AdminPanelPage() {
    const { address, isConnected } = useAccount();
    const navigate = useNavigate();

    const [newOverheadBps, setNewOverheadBps] = useState('');
    const [newRegistrationFee, setNewRegistrationFee] = useState('');
    const [newPlatformFeeBps, setNewPlatformFeeBps] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const isFactoryOwner = address?.toLowerCase() === CONTRACT_ADDRESSES.FactoryOwner?.toLowerCase();

    // Read current values from SponsorVault
    const { data: overheadBps, refetch: refetchOverhead } = useReadContract({
        address: CONTRACT_ADDRESSES.SponsorVault,
        abi: SponsorVaultABI,
        functionName: 'overheadBps',
    });

    const { data: registrationFeeWei, refetch: refetchRegFee } = useReadContract({
        address: CONTRACT_ADDRESSES.SponsorVault,
        abi: SponsorVaultABI,
        functionName: 'registrationFeeWei',
    });

    const { data: platformFeeBps, refetch: refetchPlatformFee } = useReadContract({
        address: CONTRACT_ADDRESSES.SponsorVault,
        abi: SponsorVaultABI,
        functionName: 'platformFeeBps',
    });

    const { data: platformBalance, refetch: refetchBalance } = useReadContract({
        address: CONTRACT_ADDRESSES.SponsorVault,
        abi: SponsorVaultABI,
        functionName: 'platformFeeBalance',
    });

    const { writeContract, data: hash, error, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (!isConnected || !isFactoryOwner) {
            navigate('/');
        }
    }, [isConnected, isFactoryOwner, navigate]);

    useEffect(() => {
        if (isSuccess) {
            // Refetch all data after successful transaction
            refetchOverhead();
            refetchRegFee();
            refetchPlatformFee();
            refetchBalance();
        }
    }, [isSuccess]);

    const handleSetOverhead = (e) => {
        e.preventDefault();
        if (!newOverheadBps) return;

        writeContract({
            address: CONTRACT_ADDRESSES.SponsorVault,
            abi: SponsorVaultABI,
            functionName: 'setOverheadBps',
            args: [BigInt(newOverheadBps)],
        });
    };

    const handleSetRegistrationFee = (e) => {
        e.preventDefault();
        if (!newRegistrationFee) return;

        writeContract({
            address: CONTRACT_ADDRESSES.SponsorVault,
            abi: SponsorVaultABI,
            functionName: 'setRegistrationFeeWei',
            args: [parseEther(newRegistrationFee)],
        });
    };

    const handleSetPlatformFee = (e) => {
        e.preventDefault();
        if (!newPlatformFeeBps) return;

        writeContract({
            address: CONTRACT_ADDRESSES.SponsorVault,
            abi: SponsorVaultABI,
            functionName: 'setPlatformFeeBps',
            args: [BigInt(newPlatformFeeBps)],
        });
    };

    const handleWithdrawPlatformFee = (e) => {
        e.preventDefault();
        if (!withdrawAmount) return;

        writeContract({
            address: CONTRACT_ADDRESSES.SponsorVault,
            abi: SponsorVaultABI,
            functionName: 'withdrawPlatformFee',
            args: [parseEther(withdrawAmount)],
        });
    };

    if (!isFactoryOwner) {
        return (
            <div className="center-page">
                <div className="card">
                    <h2>Access Denied</h2>
                    <p>Only the Factory Owner can access this page.</p>
                    <button onClick={() => navigate('/')}>Go to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <nav className="navbar">
                <div className="navbar-content">
                    <h2 style={{ color: '#667eea' }}>SecureVote</h2>
                    <ul className="navbar-links">
                        <li><NavLink to="/main">Home</NavLink></li>
                        <li><NavLink to="/create-room">Create Room</NavLink></li>
                        <li><NavLink to="/join-room">Join Room</NavLink></li>
                        <li><NavLink to="/rooms">Room Collection</NavLink></li>
                        <li><NavLink to="/admin" className="active">Admin Panel</NavLink></li>
                    </ul>
                </div>
            </nav>

            <div className="container">
                <h2 style={{ marginTop: '30px', marginBottom: '20px', color: '#333' }}>
                    Admin Panel (Factory Owner)
                </h2>

                {error && (
                    <div className="error">
                        Error: {error.message}
                    </div>
                )}

                {isSuccess && (
                    <div className="success">
                        Transaction successful!
                    </div>
                )}

                {/* Current Settings Display */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '15px' }}>Current Settings</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        <div>
                            <strong>Overhead BPS:</strong>
                            <p>{overheadBps?.toString() || '0'} ({(Number(overheadBps || 0) / 100).toFixed(2)}%)</p>
                        </div>
                        <div>
                            <strong>Registration Fee:</strong>
                            <p>{registrationFeeWei ? formatEther(registrationFeeWei) : '0'} ETH</p>
                        </div>
                        <div>
                            <strong>Platform Fee BPS:</strong>
                            <p>{platformFeeBps?.toString() || '0'} ({(Number(platformFeeBps || 0) / 100).toFixed(2)}%)</p>
                        </div>
                        <div>
                            <strong>Platform Balance:</strong>
                            <p>{platformBalance ? formatEther(platformBalance) : '0'} ETH</p>
                        </div>
                    </div>
                </div>

                {/* Admin Actions */}
                <div className="room-grid">
                    {/* Set Overhead */}
                    <div className="card">
                        <h3 style={{ marginBottom: '15px' }}>Set Overhead BPS</h3>
                        <form onSubmit={handleSetOverhead}>
                            <div className="form-group">
                                <label>New Overhead BPS</label>
                                <input
                                    type="number"
                                    value={newOverheadBps}
                                    onChange={(e) => setNewOverheadBps(e.target.value)}
                                    placeholder="1000 = 10%"
                                />
                                <small style={{ color: '#666', fontSize: '12px' }}>
                                    100 BPS = 1%
                                </small>
                            </div>
                            <button type="submit" disabled={isPending || isConfirming}>
                                {isPending || isConfirming ? 'Processing...' : 'Update Overhead'}
                            </button>
                        </form>
                    </div>

                    {/* Set Registration Fee */}
                    <div className="card">
                        <h3 style={{ marginBottom: '15px' }}>Set Registration Fee</h3>
                        <form onSubmit={handleSetRegistrationFee}>
                            <div className="form-group">
                                <label>New Registration Fee (ETH)</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={newRegistrationFee}
                                    onChange={(e) => setNewRegistrationFee(e.target.value)}
                                    placeholder="0.01"
                                />
                            </div>
                            <button type="submit" disabled={isPending || isConfirming}>
                                {isPending || isConfirming ? 'Processing...' : 'Update Fee'}
                            </button>
                        </form>
                    </div>

                    {/* Set Platform Fee */}
                    <div className="card">
                        <h3 style={{ marginBottom: '15px' }}>Set Platform Fee BPS</h3>
                        <form onSubmit={handleSetPlatformFee}>
                            <div className="form-group">
                                <label>New Platform Fee BPS</label>
                                <input
                                    type="number"
                                    value={newPlatformFeeBps}
                                    onChange={(e) => setNewPlatformFeeBps(e.target.value)}
                                    placeholder="500 = 5%"
                                />
                                <small style={{ color: '#666', fontSize: '12px' }}>
                                    100 BPS = 1%
                                </small>
                            </div>
                            <button type="submit" disabled={isPending || isConfirming}>
                                {isPending || isConfirming ? 'Processing...' : 'Update Platform Fee'}
                            </button>
                        </form>
                    </div>

                    {/* Withdraw Platform Fee */}
                    <div className="card">
                        <h3 style={{ marginBottom: '15px' }}>Withdraw Platform Fee</h3>
                        <form onSubmit={handleWithdrawPlatformFee}>
                            <div className="form-group">
                                <label>Amount to Withdraw (ETH)</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="0.0"
                                />
                                <small style={{ color: '#666', fontSize: '12px' }}>
                                    Available: {platformBalance ? formatEther(platformBalance) : '0'} ETH
                                </small>
                            </div>
                            <button type="submit" disabled={isPending || isConfirming}>
                                {isPending || isConfirming ? 'Processing...' : 'Withdraw'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
