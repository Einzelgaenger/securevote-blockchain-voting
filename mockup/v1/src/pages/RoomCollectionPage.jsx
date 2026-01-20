import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { supabase } from '../config/supabase';
import { CONTRACT_ADDRESSES } from '../config/contracts';

const STATE_LABELS = {
    0: 'Inactive',
    1: 'Active',
    2: 'Ended',
    3: 'Closed'
};

export default function RoomCollectionPage() {
    const { address, isConnected } = useAccount();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [showAsAdmin, setShowAsAdmin] = useState(true);
    const [showAsVoter, setShowAsVoter] = useState(true);
    const [sortBy, setSortBy] = useState('created_at');

    const isFactoryOwner = address?.toLowerCase() === CONTRACT_ADDRESSES.FactoryOwner?.toLowerCase();

    const fetchRooms = async () => {
        if (!address) return;

        setLoading(true);
        setError(null);

        try {
            // Fetch all rooms
            const { data: allRooms, error: roomsError } = await supabase
                .from('rooms')
                .select('*')
                .order(sortBy, { ascending: false });

            if (roomsError) throw roomsError;

            // Fetch voter rooms
            const { data: voterRooms, error: voterError } = await supabase
                .from('voters')
                .select('room_address')
                .eq('voter_address', address);

            if (voterError) throw voterError;

            const voterRoomAddresses = voterRooms?.map(v => v.room_address.toLowerCase()) || [];

            // Filter rooms based on user role
            let filteredRooms = allRooms || [];

            if (showAsAdmin && !showAsVoter) {
                filteredRooms = filteredRooms.filter(room =>
                    room.room_admin?.toLowerCase() === address?.toLowerCase()
                );
            } else if (showAsVoter && !showAsAdmin) {
                filteredRooms = filteredRooms.filter(room =>
                    voterRoomAddresses.includes(room.room_address?.toLowerCase())
                );
            } else if (showAsAdmin || showAsVoter) {
                filteredRooms = filteredRooms.filter(room =>
                    room.room_admin?.toLowerCase() === address?.toLowerCase() ||
                    voterRoomAddresses.includes(room.room_address?.toLowerCase())
                );
            }

            // Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filteredRooms = filteredRooms.filter(room =>
                    room.room_name?.toLowerCase().includes(term) ||
                    room.room_address?.toLowerCase().includes(term)
                );
            }

            // Fetch counts for each room
            const roomsWithCounts = await Promise.all(
                filteredRooms.map(async (room) => {
                    const { count: voterCount } = await supabase
                        .from('voters')
                        .select('*', { count: 'exact', head: true })
                        .eq('room_address', room.room_address);

                    const { count: candidateCount } = await supabase
                        .from('candidates')
                        .select('*', { count: 'exact', head: true })
                        .eq('room_address', room.room_address);

                    return {
                        ...room,
                        voters: [{ count: voterCount || 0 }],
                        candidates: [{ count: candidateCount || 0 }]
                    };
                })
            );

            setRooms(roomsWithCounts);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching rooms:', err);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        // TODO: Call blockchain to refresh data
        alert('Manual refresh from blockchain - TODO: implement');
        await fetchRooms();
    };

    useEffect(() => {
        if (isConnected && address) {
            fetchRooms();
        }
    }, [address, isConnected, searchTerm, showAsAdmin, showAsVoter, sortBy]);

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
                        <li><NavLink to="/rooms" className="active">Room Collection</NavLink></li>
                        {isFactoryOwner && <li><NavLink to="/admin">Admin Panel</NavLink></li>}
                    </ul>
                </div>
            </nav>

            <div className="container">
                <h2 style={{ marginTop: '30px', marginBottom: '20px', color: '#333' }}>
                    My Rooms
                </h2>

                <div className="filter-section">
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Search</label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or address..."
                            />
                        </div>

                        <div className="filter-group">
                            <label>Sort By</label>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <option value="created_at">Created Date</option>
                                <option value="room_name">Name</option>
                                <option value="state">State</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <button onClick={refreshData} className="btn-secondary">
                                🔄 Refresh from Blockchain
                            </button>
                        </div>
                    </div>

                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={showAsAdmin}
                                onChange={(e) => setShowAsAdmin(e.target.checked)}
                            />
                            Show as Admin
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={showAsVoter}
                                onChange={(e) => setShowAsVoter(e.target.checked)}
                            />
                            Show as Voter
                        </label>
                    </div>
                </div>

                {loading && <div className="loading">Loading rooms...</div>}

                {error && (
                    <div className="error">
                        Error loading rooms: {error}
                    </div>
                )}

                {!loading && !error && rooms.length === 0 && (
                    <div className="card" style={{ textAlign: 'center' }}>
                        <p>No rooms found</p>
                        <button onClick={() => navigate('/create-room')} style={{ marginTop: '15px' }}>
                            Create Your First Room
                        </button>
                    </div>
                )}

                <div className="room-grid">
                    {rooms.map((room) => (
                        <div
                            key={room.room_address}
                            className="room-card"
                            onClick={() => navigate(`/room/${room.room_address}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            <h3>{room.room_name}</h3>

                            <span className={`state-badge state-${STATE_LABELS[room.state]}`}>
                                {STATE_LABELS[room.state]}
                            </span>

                            <p>
                                <strong>Address:</strong><br />
                                <span style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                                    {room.room_address}
                                </span>
                            </p>

                            <p><strong>Round:</strong> {room.current_round}</p>
                            <p><strong>Voters:</strong> {room.voters?.[0]?.count || 0}</p>
                            <p><strong>Candidates:</strong> {room.candidates?.[0]?.count || 0}</p>

                            {room.room_admin?.toLowerCase() === address?.toLowerCase() && (
                                <div className="success" style={{ marginTop: '10px', padding: '5px', fontSize: '12px' }}>
                                    👑 You are the Admin
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
