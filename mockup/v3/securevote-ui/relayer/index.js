import "dotenv/config";
import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MinimalForwarderAbi = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../frontend/src/abi/MinimalForwarder.json"), "utf8")
);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 8787;
const RPC = process.env.ALCHEMY_RPC_URL;
const PK = process.env.RELAYER_PRIVATE_KEY;
const FORWARDER = process.env.FORWARDER_ADDRESS;
const ALLOWED_CHAIN_ID = Number(process.env.ALLOWED_CHAIN_ID || "11155111");

if (!RPC || !PK || !FORWARDER) {
    console.error("Missing env. Please set ALCHEMY_RPC_URL, RELAYER_PRIVATE_KEY, FORWARDER_ADDRESS");
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC);
const relayer = new ethers.Wallet(PK, provider);
const forwarder = new ethers.Contract(FORWARDER, MinimalForwarderAbi, relayer);

// very small allowlist: only forward vote() selector
const VOTE_SELECTOR = "0x0121b93f"; // bytes4(keccak256("vote(uint256)"))

app.get("/health", async (_req, res) => {
    const net = await provider.getNetwork();
    res.json({ ok: true, chainId: Number(net.chainId), relayer: relayer.address, forwarder: FORWARDER });
});

app.post("/relay", async (req, res) => {
    try {
        const { req: fwdReq, signature } = req.body || {};
        if (!fwdReq || !signature) return res.status(400).json({ error: "Missing req/signature" });

        const net = await provider.getNetwork();
        if (Number(net.chainId) !== ALLOWED_CHAIN_ID) {
            return res.status(400).json({ error: "Wrong chain" });
        }

        // basic shape checks
        for (const k of ["from", "to", "value", "gas", "nonce", "data"]) {
            if (fwdReq[k] === undefined) return res.status(400).json({ error: `Missing field ${k}` });
        }

        // enforce: only vote()
        const data = String(fwdReq.data);
        if (!data.startsWith(VOTE_SELECTOR)) {
            return res.status(403).json({ error: "Relayer only allows VotingRoom.vote()" });
        }

        // on-chain verify (strong)
        const ok = await forwarder.verify(fwdReq, signature);
        if (!ok) return res.status(400).json({ error: "Forwarder verify failed" });

        // outer gasLimit must be > inner req.gas
        const outerGas = BigInt(fwdReq.gas) + 200000n;

        const tx = await forwarder.execute(fwdReq, signature, { gasLimit: outerGas, value: BigInt(fwdReq.value || "0") });
        const receipt = await tx.wait();

        return res.json({ txHash: tx.hash, status: receipt.status });
    } catch (e) {
        return res.status(500).json({ error: e.shortMessage || e.message || "Relayer error" });
    }
});

app.listen(PORT, () => console.log(`Relayer listening on :${PORT}`));
