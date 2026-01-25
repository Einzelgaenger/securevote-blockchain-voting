import React from "react";
import ReactDOM from "react-dom/client";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import "./styles.css";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const config = getDefaultConfig({
    appName: "SecureVote UI",
    projectId,
    chains: [sepolia],
    ssr: false
});

const queryClient = new QueryClient();

function Shell() {
    return (
        <div className="page">
            <header className="topbar">
                <div>
                    <div className="title">SecureVote Remix-like UI</div>
                    <div className="subtitle">Sepolia • Gasless only for VotingRoom.vote()</div>
                </div>
                <ConnectButton />
            </header>
            <App />
            <footer className="footer">
                <span>Forwarder meta-tx + relayer backend</span>
            </footer>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    <Shell />
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    </React.StrictMode>
);
