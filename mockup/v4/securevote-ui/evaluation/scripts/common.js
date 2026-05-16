import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const evaluationRoot = path.resolve(process.cwd());
export const dataDir = path.join(evaluationRoot, "data");
export const resultsDir = path.join(evaluationRoot, "results");
export const frontendContractsPath = path.resolve(evaluationRoot, "../frontend/src/config/deployed-contracts.json");

export function todayStamp() {
    const now = new Date();
    return [
        String(now.getDate()).padStart(2, "0"),
        String(now.getMonth() + 1).padStart(2, "0"),
        now.getFullYear(),
    ].join("");
}

export function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

export function readJson(file, fallback = null) {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, `${JSON.stringify(value, null, 4)}\n`);
}

export function loadEnv() {
    const envPath = path.join(evaluationRoot, ".env");
    if (!fs.existsSync(envPath)) return;

    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const index = trimmed.indexOf("=");
        if (index === -1) continue;
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim();
        if (!process.env[key]) process.env[key] = value;
    }
}

export function loadChain() {
    const deployed = readJson(frontendContractsPath, {});
    const chainId = Number(process.env.CHAIN_ID || deployed?.network?.chainId || 1337);
    const rpcUrl = process.env.RPC_URL || deployed?.network?.rpcUrl || "http://165.227.107.109:8545";

    return {
        id: chainId,
        name: process.env.CHAIN_NAME || deployed?.network?.name || "Besu QBFT Private",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } },
    };
}

export function publicClient(chain) {
    return createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) });
}

export function walletClient(chain, privateKey) {
    const normalized = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    const account = privateKeyToAccount(normalized);
    return {
        account,
        client: createWalletClient({ account, chain, transport: http(chain.rpcUrls.default.http[0]) }),
    };
}

export function loadContracts() {
    const deployed = readJson(frontendContractsPath, {});
    return {
        roomFactory: deployed?.RoomFactory?.address,
        votingRoomImplementation: deployed?.VotingRoom?.address,
        votingResultCenter: deployed?.VotingResultCenter?.address,
    };
}

export function isAddress(value) {
    return /^0x[0-9a-fA-F]{40}$/.test(String(value || ""));
}

export async function ask(question) {
    const rl = readline.createInterface({ input, output });
    try {
        return (await rl.question(question)).trim();
    } finally {
        rl.close();
    }
}

export async function timed(label, fn) {
    const startedAt = Date.now();
    const value = await fn();
    return { label, value, latencyMs: Date.now() - startedAt };
}
