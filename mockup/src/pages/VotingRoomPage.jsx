import { useState, useEffect } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { supabase } from '../config/supabase';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import VotingRoomABI from '../../../contracts/ABI/v2/VotingRoom.json';

const STATE_LABELS = { 0: 'Inactive', 1: 'Active', 2: 'Ended', 3: 'Closed' };

export default function VotingRoomPage() {
    const { roomAddress } = useParams();
    const { address, isConnected } = useAccount();
    const navigate = useNavigate();

    const [roomData, setRoomData] = useState(null);
    const [voters, setVoters] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [voterAddress, setVoterAddress] = useState('');
    const [candidateId, setCandidateId] = useState('');
    const [candidateName, setCandidateName] = useState('');
    const [creditAmount, setCreditAmount] = useState('');
    const [selectedCandidateId, setSelectedCandidateId] = useState('');

    // Read room data from contract
    const { data: roomAdmin } = useReadContract({
        address: roomAddress,
        abi: VotingRoomABI,
        functionName: 'roomAdmin',
    });

    const { data: roomName } = useReadContract({
        address: roomAddress,
        abi: VotingRoomABI,
        functionName: 'roomName',
    });

    const { data: state } = useReadContract({
        address: roomAddress,
        abi: VotingRoomABI,
        functionName: 'state',
    });

    const { data: currentRound } = useReadContract({
        address: roomAddress,
        abi: VotingRoomABI,
        functionName: 'currentRound',
    });

    const { data: voterCredit } = useReadContract({
        address: roomAddress,
        abi: VotingRoomABI,
        functionName: 'voterCredit',
        args: address ? [address] : undefined,
    });

    const { data: maxCostPerVote } = useReadContract({
        address: roomAddress,
        abi: VotingRoomABI,
        functionName: 'maxCostPerVoteWei',
    });

    const { writeContract, data: hash, error, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const isRoomAdmin = roomAdmin?.toLowerCase() === address?.toLowerCase();
    const isFactoryOwner = address?.toLowerCase() === CONTRACT_ADDRESSES.FactoryOwner?.toLowerCase();

    // Fetch data from Supabase
    const fetchRoomData = async () => {
        setLoading(true);
        try {
            // Fetch voters
            const { data: votersData } = await supabase
                .from('voters')
                .select('*')
                .eq('room_address', roomAddress);
            setVoters(votersData || []);

            // Fetch candidates
            const { data: candidatesData } = await supabase
                .from('candidates')
                .select('*')
                .eq('room_address', roomAddress);
            setCandidates(candidatesData || []);

            // Fetch room info
            const { data: roomInfo } = await supabase
                .from('rooms')
                .select('*')
                .eq('room_address', roomAddress)
                .single();
            setRoomData(roomInfo);
        } catch (err) {
            console.error('Error fetching room data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (roomAddress) {
            fetchRoomData();
        }
    }, [roomAddress]);

    useEffect(() => {
        if (isSuccess) {
            fetchRoomData();
        }
    }, [isSuccess]);

    // Admin Functions
    const handleAddVoter = (e) => {
        e.preventDefault();
        writeContract({
            address: roomAddress,
            abi: VotingRoomABI,
            functionName: 'addVoter',
            args: [voterAddress],
        });
    };

    const handleAddCandidate = (e) => {
        e.preventDefault();
        writeContract({
            address: roomAddress,
            abi: VotingRoomABI,
            functionName: 'addCandidate',
            args: [BigInt(candidateId), candidateName],
        });
    };

    const handleGrantCredit = (e) => {
        e.preventDefault();
        writeContract({
            address: roomAddress,
            abi: VotingRoomABI,
            functionName: 'grantCredit',
            args: [voterAddress, BigInt(creditAmount)],
        });
    };

    const handleStartVoting = () => {
        writeContract({
            address: roomAddress,
            abi: VotingRoomABI,
            functionName: 'startVoting',
        });
    };

    const handleStopVoting = () => {
        writeContract({
            address: roomAddress,
            abi: VotingRoomABI,
            functionName: 'stopVoting',
        });
    };

    const handleEndVoting = () => {
        writeContract({
            address: roomAddress,
            abi: VotingRoomABI,
            functionName: 'endVoting',
        });
    };

    const handleCloseRound = () => {
        const winnerId = prompt('Enter winner candidate ID:');
        if (winnerId) {
            writeContract({
                address: roomAddress,
                abi: VotingRoomABI,
                functionName: 'closeRound',
                args: [BigInt(winnerId)],
            });
        }
    };

    const handleResetRoom = () => {
        if (confirm('Are you sure you want to reset the room? This will clear all voters and candidates.')) {
            writeContract({
                address: roomAddress,
                abi: VotingRoomABI,
                functionName: 'resetRoom',
            });
        }
    };

    const handlePrepareNextRound = () => {
        writeContract({
            address: roomAddress,
            abi: VotingRoomABI,
            functionName: 'prepareNextRound',
        });
    };

    // Voter Functions
    const handleVote = (e) => {
        e.preventDefault();
        if (!selectedCandidateId) {
            alert('Please select a candidate');
            return;
        }

        writeContract({
            address: roomAddress,
            abi: VotingRoomABI,
            functionName: 'vote',
            args: [BigInt(selectedCandidateId)],
        });
    };

    if (!isConnected) {
        return (
            <div className="center-page">
                <div className="card">
                    <h2>Please connect your wallet</h2>
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
                        {isFactoryOwner && <li><NavLink to="/admin">Admin Panel</NavLink></li>}
                    </ul>
                </div>
            </nav>

            <div className="container">
                {/* Room Header */}
                <div className="card" style={{ marginTop: '30px' }}>
                    <h2>{roomName || 'Loading...'}</h2>
                    <div className="wallet-address" style={{ fontSize: '12px' }}>
                        {roomAddress}
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
                        <span className={`state-badge state-${STATE_LABELS[state]}`}>
                            {STATE_LABELS[state]}
                        </span>
                        <span style={{ padding: '4px 12px', background: '#f0f0f0', borderRadius: '12px', fontSize: '14px' }}>
                            Round: {currentRound?.toString() || '0'}
                        </span>
                        {isRoomAdmin && (
                            <span style={{ padding: '4px 12px', background: '#d4edda', borderRadius: '12px', fontSize: '14px', color: '#155724' }}>
                                👑 You are the Admin
                            </span>
                        )}
                    </div>

                    {voterCredit && (
                        <div style={{ marginTop: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
                            <strong>Your Credits:</strong> {voterCredit.toString()}
                        </div>
                    )}

                    {maxCostPerVote && (
                        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                            Max Cost Per Vote: {formatEther(maxCostPerVote)} ETH
                        </div>
                    )}
                </div>

                {error && (
                    <div className="error" style={{ marginTop: '15px' }}>
                        Error: {error.message}
                    </div>
                )}

                {isSuccess && (
                    <div className="success" style={{ marginTop: '15px' }}>
                        Transaction successful!
                    </div>
                )}

                {/* Voters and Candidates */}
                <div className="voter-candidate-section" style={{ marginTop: '20px' }}>
                    <div className="voter-list">
                        <h3>Voters ({voters.length})</h3>
                        {loading ? (
                            <p>Loading...</p>
                        ) : voters.length === 0 ? (
                            <p style={{ color: '#666', fontSize: '14px' }}>No voters yet</p>
                        ) : (
                            voters.map((voter, idx) => (
                                <div key={idx} className="voter-item">
                                    <div style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                                        {voter.voter_address}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                        Credits: {voter.voter_credit} | Last Voted: Round {voter.last_voted_round || 'N/A'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="candidate-list">
                        <h3>Candidates ({candidates.length})</h3>
                        {loading ? (
                            <p>Loading...</p>
                        ) : candidates.length === 0 ? (
                            <p style={{ color: '#666', fontSize: '14px' }}>No candidates yet</p>
                        ) : (
                            candidates.map((candidate, idx) => (
                                <div key={idx} className="candidate-item">
                                    <strong>ID {candidate.candidate_id}:</strong> {candidate.candidate_name}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Admin Actions */}
                {isRoomAdmin && (
                    <div className="actions-section">
                        <h3 style={{ marginBottom: '15px' }}>Admin Actions</h3>

                        {/* State Control Buttons */}
                        <div className="actions-grid">
                            {state === 0 && (
                                <button onClick={handleStartVoting} disabled={isPending || isConfirming} className="action-btn">
                                    ▶ Start Voting
                                </button>
                            )}
                            {state === 1 && (
                                <>
                                    <button onClick={handleStopVoting} disabled={isPending || isConfirming} className="action-btn">
                                        ⏸ Stop Voting
                                    </button>
                                    <button onClick={handleEndVoting} disabled={isPending || isConfirming} className="action-btn">
                                        ⏹ End Voting
                                    </button>
                                </>
                            )}
                            {state === 2 && (
                                <button onClick={handleCloseRound} disabled={isPending || isConfirming} className="action-btn">
                                    ✓ Close Round
                                </button>
                            )}
                            {state === 3 && (
                                <>
                                    <button onClick={handlePrepareNextRound} disabled={isPending || isConfirming} className="action-btn">
                                        🔄 Prepare Next Round
                                    </button>
                                    <button onClick={handleResetRoom} disabled={isPending || isConfirming} className="action-btn">
                                        🔃 Reset Room
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Add Voter Form */}
                        {state !== 1 && (
                            <>
                                <h4 style={{ marginTop: '30px', marginBottom: '15px' }}>Add Voter</h4>
                                <form onSubmit={handleAddVoter} style={{ marginBottom: '20px' }}>
                                    <div className="form-group">
                                        <input
                                            type="text"
                                            value={voterAddress}
                                            onChange={(e) => setVoterAddress(e.target.value)}
                                            placeholder="Voter address (0x...)"
                                            required
                                        />
                                    </div>
                                    <button type="submit" disabled={isPending || isConfirming}>
                                        Add Voter
                                    </button>
                                </form>

                                {/* Add Candidate Form */}
                                <h4 style={{ marginBottom: '15px' }}>Add Candidate</h4>
                                <form onSubmit={handleAddCandidate} style={{ marginBottom: '20px' }}>
                                    <div className="form-group">
                                        <input
                                            type="number"
                                            value={candidateId}
                                            onChange={(e) => setCandidateId(e.target.value)}
                                            placeholder="Candidate ID"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <input
                                            type="text"
                                            value={candidateName}
                                            onChange={(e) => setCandidateName(e.target.value)}
                                            placeholder="Candidate Name"
                                            required
                                        />
                                    </div>
                                    <button type="submit" disabled={isPending || isConfirming}>
                                        Add Candidate
                                    </button>
                                </form>

                                {/* Grant Credit Form */}
                                <h4 style={{ marginBottom: '15px' }}>Grant Credits</h4>
                                <form onSubmit={handleGrantCredit}>
                                    <div className="form-group">
                                        <input
                                            type="text"
                                            value={voterAddress}
                                            onChange={(e) => setVoterAddress(e.target.value)}
                                            placeholder="Voter address (0x...)"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <input
                                            type="number"
                                            value={creditAmount}
                                            onChange={(e) => setCreditAmount(e.target.value)}
                                            placeholder="Credit amount"
                                            required
                                        />
                                    </div>
                                    <button type="submit" disabled={isPending || isConfirming}>
                                        Grant Credits
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                )}

                {/* Voter Actions */}
                {!isRoomAdmin && state === 1 && voterCredit > 0 && (
                    <div className="actions-section">
                        <h3 style={{ marginBottom: '15px' }}>Cast Your Vote</h3>
                        <form onSubmit={handleVote}>
                            <div className="form-group">
                                <label>Select Candidate</label>
                                <select
                                    value={selectedCandidateId}
                                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Choose a candidate --</option>
                                    {candidates.map((candidate) => (
                                        <option key={candidate.candidate_id} value={candidate.candidate_id}>
                                            ID {candidate.candidate_id}: {candidate.candidate_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" disabled={isPending || isConfirming}>
                                {isPending || isConfirming ? 'Voting...' : 'Vote'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Refresh Button */}
                <div style={{ textAlign: 'center', marginTop: '30px', marginBottom: '30px' }}>
                    <button onClick={fetchRoomData} className="btn-secondary">
                        🔄 Refresh Data from Supabase
                    </button>
                </div>
            </div>
        </div>
    );
}
