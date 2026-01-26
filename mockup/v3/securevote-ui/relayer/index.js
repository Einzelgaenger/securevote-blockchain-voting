import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

// ======================================================
// ENV & TLS (DEV FRIENDLY)
// ======================================================
process.env.NODE_TLS_REJECT_UNAUTHORIZED =
    process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? "0";

// ======================================================
// PATH SETUP
// ======================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================================
// LOAD ABIs
// ======================================================
const MinimalForwarderAbi = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "../frontend/src/abi/MinimalForwarder.json"),
        "utf8"
    )
);

const VotingRoomAbi = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "../frontend/src/abi/VotingRoom.json"),
        "utf8"
    )
);

const SponsorVaultAbi = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "../frontend/src/abi/SponsorVault.json"),
        "utf8"
    )
);

const roomIface = new ethers.Interface(VotingRoomAbi);
const vaultIface = new ethers.Interface(SponsorVaultAbi);

// ======================================================
// BASIC APP SETUP
// ======================================================
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ======================================================
// ENV VALIDATION
// ======================================================
const PORT = Number(process.env.PORT || 8787);
const RPC_URL =
    process.env.ALCHEMY_RPC_URL || process.env.RPC_URL || "";
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const FORWARDER_ADDRESS = process.env.FORWARDER_ADDRESS;
const SPONSOR_VAULT_ADDRESS = process.env.SPONSOR_VAULT_ADDRESS;
const ALLOWED_CHAIN_ID = Number(process.env.ALLOWED_CHAIN_ID || 11155111);

if (!RPC_URL || !RELAYER_PRIVATE_KEY || !FORWARDER_ADDRESS || !SPONSOR_VAULT_ADDRESS) {
    console.error("❌ Missing required env variables");
    process.exit(1);
}

// ======================================================
// PROVIDER & CONTRACTS
// ======================================================
const provider = new ethers.JsonRpcProvider(RPC_URL);
const relayerWallet = new ethers.Wallet(
    RELAYER_PRIVATE_KEY.startsWith("0x")
        ? RELAYER_PRIVATE_KEY
        : "0x" + RELAYER_PRIVATE_KEY,
    provider
);

const forwarder = new ethers.Contract(
    FORWARDER_ADDRESS,
    MinimalForwarderAbi,
    relayerWallet
);

const sponsorVault = new ethers.Contract(
    SPONSOR_VAULT_ADDRESS,
    SponsorVaultAbi,
    relayerWallet
);

// ======================================================
// HELPERS
// ======================================================
function extractRevertData(err) {
    return (
        err?.data ||
        err?.info?.error?.data ||
        err?.error?.data ||
        null
    );
}

function decodeRevert(data) {
    if (!data) return null;

    const hex =
        typeof data === "string"
            ? data
            : typeof data?.data === "string"
                ? data.data
                : null;

    if (!hex || !hex.startsWith("0x")) return null;

    // Error(string)
    if (hex.startsWith("0x08c379a0")) {
        try {
            const reason = ethers.AbiCoder.defaultAbiCoder()
                .decode(["string"], "0x" + hex.slice(10))[0];
            return { type: "Error(string)", reason };
        } catch { }
    }

    // Panic(uint256)
    if (hex.startsWith("0x4e487b71")) {
        try {
            const code = ethers.AbiCoder.defaultAbiCoder()
                .decode(["uint256"], "0x" + hex.slice(10))[0];
            return { type: "Panic(uint256)", code: code.toString() };
        } catch { }
    }

    // VotingRoom custom error
    try {
        const d = roomIface.parseError(hex);
        return { type: "VotingRoom", name: d.name, args: d.args };
    } catch { }

    // SponsorVault custom error
    try {
        const d = vaultIface.parseError(hex);
        return { type: "SponsorVault", name: d.name, args: d.args };
    } catch { }

    return { type: "UnknownRevertData", hex };
}

function findVoteActionId(logs, roomAddress) {
    for (const log of logs) {
        try {
            const parsed = roomIface.parseLog(log);
            if (parsed?.name === "VoteCast") {
                const room = parsed.args?.room?.toLowerCase?.();
                if (!roomAddress || !room || room !== roomAddress.toLowerCase()) {
                    continue;
                }
                return parsed.args?.actionId;
            }
        } catch { }
    }
    return null;
}

// ======================================================
// ROUTES
// ======================================================
app.get("/health", async (_req, res) => {
    const net = await provider.getNetwork();
    res.json({
        ok: true,
        chainId: Number(net.chainId),
        relayer: relayerWallet.address,
        forwarder: FORWARDER_ADDRESS,
    });
});

app.post("/relay", async (req, res) => {
    try {
        const { req: fwdReq, signature } = req.body || {};
        console.log("[/relay] to=", fwdReq.to, "from=", fwdReq.from, "gas=", fwdReq.gas);

        if (!fwdReq || !signature) {
            return res.status(400).json({ error: "Missing req or signature" });
        }


        const net = await provider.getNetwork();
        if (Number(net.chainId) !== ALLOWED_CHAIN_ID) {
            return res.status(400).json({ error: "Wrong chain" });
        }

        // Basic validation
        for (const k of ["from", "to", "value", "gas", "nonce", "data"]) {
            if (fwdReq[k] === undefined) {
                return res.status(400).json({ error: `Missing field ${k}` });
            }
        }

        // Only allow vote(uint256) meta-tx to protect relayer funds
        const voteSelector = roomIface.getFunction("vote").selector;
        if (typeof fwdReq.data !== "string" || !fwdReq.data.startsWith(voteSelector)) {
            return res.status(400).json({ error: "Only vote(uint256) meta-tx is allowed" });
        }

        // Verify signature on-chain
        const ok = await forwarder.verify(fwdReq, signature);
        if (!ok) {
            return res.status(400).json({
                error: "MinimalForwarder.verify failed (signature mismatch)",
            });
        }

        // Pre-check: room balance must be >= 2 * maxCostPerVoteWei (if set)
        const roomContract = new ethers.Contract(fwdReq.to, VotingRoomAbi, provider);
        const maxCostPerVoteWei = await roomContract.maxCostPerVoteWei();
        if (maxCostPerVoteWei > 0n) {
            const minRequired = maxCostPerVoteWei * 2n;
            const roomBalance = await sponsorVault.roomBalance(fwdReq.to);
            console.log(
                "[PRECHECK] room=",
                fwdReq.to,
                "maxCostPerVoteWei=",
                maxCostPerVoteWei.toString(),
                "minRequired=",
                minRequired.toString(),
                "roomBalance=",
                roomBalance.toString()
            );
            if (roomBalance < minRequired) {
                return res.status(400).json({
                    error: "Room balance below 2x maxCostPerVoteWei",
                    roomBalance: roomBalance.toString(),
                    maxCostPerVoteWei: maxCostPerVoteWei.toString(),
                    minRequired: minRequired.toString(),
                });
            }
        } else {
            console.log("[PRECHECK] maxCostPerVoteWei=0, skipping min balance check");
        }

        const outerGas =
            BigInt(fwdReq.gas) + 250_000n;

        const overrides = {
            gasLimit: outerGas,
            value: BigInt(fwdReq.value || "0"),
        };

        // ==================================================
        // PRE-FLIGHT SIMULATION
        // ==================================================
        try {
            await forwarder.execute.staticCall(
                fwdReq,
                signature,
                overrides
            );
        } catch (simErr) {
            const revertData = extractRevertData(simErr);
            const decoded = decodeRevert(revertData);

            console.error("❌ Simulation revert:", simErr);

            return res.status(400).json({
                error: decoded ?? {
                    type: "SimulationError",
                    message:
                        simErr.shortMessage ||
                        simErr.message ||
                        "Simulation reverted",
                },
            });
        }

        // ==================================================
        // REAL EXECUTION
        // ==================================================
        const tx = await forwarder.execute(
            fwdReq,
            signature,
            overrides
        );
        const receipt = await tx.wait();

        // ==================================================
        // SETTLEMENT (SponsorVault reimbursement)
        // ==================================================
        const actionId = findVoteActionId(receipt.logs, fwdReq.to);
        if (!actionId) {
            return res.status(500).json({
                error: "VoteCast event not found; cannot settle reimbursement",
            });
        }

        const overheadBps = await sponsorVault.overheadBps();
        const gasUsed = receipt.gasUsed;
        const gasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice;
        if (!gasPrice) {
            return res.status(500).json({ error: "Missing gas price in receipt" });
        }

        const actualGasCost = gasUsed * gasPrice;
        const overheadWei = (actualGasCost * BigInt(overheadBps)) / 10000n;
        const chargedAmount = actualGasCost + overheadWei;

        const roomBalanceBefore = await sponsorVault.roomBalance(fwdReq.to);
        if (roomBalanceBefore < chargedAmount) {
            return res.status(400).json({
                error: "Insufficient room balance for settlement",
                roomBalance: roomBalanceBefore.toString(),
                chargedAmount: chargedAmount.toString(),
            });
        }

        console.log(
            "[SETTLE] room=",
            fwdReq.to,
            "gasUsed=",
            gasUsed.toString(),
            "gasPrice=",
            gasPrice.toString(),
            "actualGasCost=",
            actualGasCost.toString(),
            "overheadBps=",
            overheadBps.toString(),
            "overheadWei=",
            overheadWei.toString(),
            "chargedAmount=",
            chargedAmount.toString(),
            "roomBalanceBefore=",
            roomBalanceBefore.toString()
        );

        const settleTx = await sponsorVault.settleAndWithdraw(
            fwdReq.to,
            actionId,
            chargedAmount
        );
        const settleReceipt = await settleTx.wait();
        const roomBalanceAfter = await sponsorVault.roomBalance(fwdReq.to);
        console.log(
            "[SETTLE] success tx=",
            settleTx.hash,
            "status=",
            settleReceipt.status,
            "chargedAmount=",
            chargedAmount.toString(),
            "roomBalanceAfter=",
            roomBalanceAfter.toString()
        );

        return res.json({
            txHash: tx.hash,
            status: receipt.status,
            gasPrice: gasPrice.toString(),
            chargedAmount: chargedAmount.toString(),
            actualGasCost: actualGasCost.toString(),
            overheadWei: overheadWei.toString(),
            roomBalanceBefore: roomBalanceBefore.toString(),
            roomBalanceAfter: roomBalanceAfter.toString(),
            settleTxHash: settleTx.hash,
            settleStatus: settleReceipt.status,
        });
    } catch (err) {
        const revertData = extractRevertData(err);
        const decoded = decodeRevert(revertData);

        console.error("❌ Relayer error:", err);

        return res.status(500).json({
            error: decoded ?? {
                type: "RelayerError",
                message:
                    err.shortMessage ||
                    err.message ||
                    "Relayer failed",
            },
        });
    }
});

// ======================================================
// START SERVER
// ======================================================
app.listen(PORT, () => {
    console.log(`🚀 Relayer listening on :${PORT}`);
});
