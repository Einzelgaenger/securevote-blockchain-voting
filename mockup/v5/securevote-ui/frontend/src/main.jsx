import React from "react";
import ReactDOM from "react-dom/client";
import "@rainbow-me/rainbowkit/styles.css";
import { connectorsForWallets, RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import { APP_CHAIN, RPC_URL } from "./config/contracts.js";
import "./styles.css";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "securevote-local-besu";

const connectors = connectorsForWallets(
    [
        {
            groupName: "Local Wallet",
            wallets: [injectedWallet],
        },
    ],
    {
        appName: "SecureVote UI",
        projectId,
    }
);

const config = createConfig({
    chains: [APP_CHAIN],
    connectors,
    transports: {
        [APP_CHAIN.id]: http(RPC_URL || undefined),
    },
    ssr: false,
});

const queryClient = new QueryClient();

function Shell() {
    return (
        <div className="page">
            <header className="topbar">
                <div>
                    <div className="title">SecureVote v2 UI</div>
                    <div className="subtitle">{APP_CHAIN.name} - Besu QBFT direct vote via wallet</div>
                </div>
                <ConnectButton />
            </header>
            <App />
            <footer className="footer">
                <span>RoomFactory + VotingRoom + VotingResultCenter</span>
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
