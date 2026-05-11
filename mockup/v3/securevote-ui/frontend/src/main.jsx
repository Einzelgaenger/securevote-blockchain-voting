import React from "react";
import ReactDOM from "react-dom/client";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import "./styles.css";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const configuredChainId = Number(import.meta.env.VITE_CHAIN_ID || sepolia.id);
const configuredChainName = import.meta.env.VITE_CHAIN_NAME || sepolia.name;
const configuredRpcUrl = import.meta.env.VITE_RPC_URL || import.meta.env.VITE_SEPOLIA_RPC_URL;

const appChain =
    configuredChainId === sepolia.id
        ? sepolia
        : {
              id: configuredChainId,
              name: configuredChainName,
              nativeCurrency: {
                  name: import.meta.env.VITE_NATIVE_CURRENCY_NAME || "Ether",
                  symbol: import.meta.env.VITE_NATIVE_CURRENCY_SYMBOL || "ETH",
                  decimals: 18,
              },
              rpcUrls: {
                  default: { http: [configuredRpcUrl] },
                  public: { http: [configuredRpcUrl] },
              },
          };

const config = getDefaultConfig({
    appName: "SecureVote UI",
    projectId,
    chains: [appChain],
    transports: {
        [appChain.id]: http(configuredRpcUrl || undefined),
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
                    <div className="subtitle">{appChain.name} - direct vote via wallet</div>
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
