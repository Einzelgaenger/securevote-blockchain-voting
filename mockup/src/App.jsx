import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './config/wagmi';

import LandingPage from './pages/LandingPage';
import MainPage from './pages/MainPage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import RoomCollectionPage from './pages/RoomCollectionPage';
import AdminPanelPage from './pages/AdminPanelPage';
import VotingRoomPage from './pages/VotingRoomPage';

const queryClient = new QueryClient();

function App() {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/main" element={<MainPage />} />
                            <Route path="/create-room" element={<CreateRoomPage />} />
                            <Route path="/join-room" element={<JoinRoomPage />} />
                            <Route path="/rooms" element={<RoomCollectionPage />} />
                            <Route path="/admin" element={<AdminPanelPage />} />
                            <Route path="/room/:roomAddress" element={<VotingRoomPage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </BrowserRouter>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export default App;
