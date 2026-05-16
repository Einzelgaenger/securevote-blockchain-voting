import path from "node:path";
import { parseEther } from "viem";
import {
    ensureDir,
    loadChain,
    loadEnv,
    publicClient,
    resultsDir,
    timed,
    todayStamp,
    walletClient,
    writeJson,
} from "./common.js";

const EMPTY_CONTRACT_INIT_CODE = "0x6001600c60003960016000f300";

loadEnv();

const chain = loadChain();
const client = publicClient(chain);
const resultDir = path.join(resultsDir, `network-evaluation-result-${todayStamp()}`);
ensureDir(resultDir);

async function rpc(method, params = []) {
    return client.request({ method, params });
}

async function waitForNewBlock(startBlock, timeoutMs = 60000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const block = await client.getBlockNumber();
        if (block > startBlock) return block;
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("No new block observed before timeout");
}

const report = {
    startedAt: new Date().toISOString(),
    chain,
    checks: [],
};

async function addCheck(name, fn) {
    try {
        const result = await timed(name, fn);
        report.checks.push({ name, ok: true, latencyMs: result.latencyMs, value: result.value });
        console.log(`[OK] ${name} (${result.latencyMs} ms)`);
    } catch (error) {
        report.checks.push({ name, ok: false, error: error.message });
        console.log(`[FAIL] ${name}: ${error.message}`);
    }
}

await addCheck("Network connectivity test", async () => ({
    clientVersion: await rpc("web3_clientVersion"),
    chainId: await client.getChainId(),
    netVersion: await rpc("net_version"),
    peerCount: await rpc("net_peerCount").catch(() => null),
}));

await addCheck("Block production test", async () => {
    const before = await client.getBlockNumber();
    const after = await waitForNewBlock(before);
    return { before: before.toString(), after: after.toString() };
});

await addCheck("Validator verification test", async () => {
    const validators = await rpc("qbft_getValidatorsByBlockNumber", ["latest"]);
    return { validators, count: validators.length };
});

if (process.env.ADMIN_PRIVATE_KEY) {
    const { account, client: adminWallet } = walletClient(chain, process.env.ADMIN_PRIVATE_KEY);

    await addCheck("Latency measurement", async () => {
        const hash = await adminWallet.sendTransaction({
            account,
            to: account.address,
            value: parseEther("0.000001"),
        });
        const receipt = await client.waitForTransactionReceipt({ hash });
        return { hash, status: receipt.status, blockNumber: receipt.blockNumber.toString() };
    });

    await addCheck("Smart contract deployment test", async () => {
        const hash = await adminWallet.deployContract({
            account,
            abi: [],
            bytecode: EMPTY_CONTRACT_INIT_CODE,
        });
        const receipt = await client.waitForTransactionReceipt({ hash });
        const code = await client.getBytecode({ address: receipt.contractAddress });
        return { hash, contractAddress: receipt.contractAddress, code };
    });
} else {
    report.checks.push({
        name: "Latency measurement",
        ok: false,
        skipped: true,
        reason: "ADMIN_PRIVATE_KEY is required to send transactions.",
    });
    report.checks.push({
        name: "Smart contract deployment test",
        ok: false,
        skipped: true,
        reason: "ADMIN_PRIVATE_KEY is required to deploy test contract.",
    });
}

report.faultTolerance = {
    mode: process.env.FAULT_TOLERANCE_MANUAL === "true" ? "manual" : "not-run",
    instruction:
        "Stop one validator node, rerun this script, compare block production and latency. For 5 validators QBFT can tolerate 1 Byzantine validator fault.",
};

report.finishedAt = new Date().toISOString();
writeJson(path.join(resultDir, "network-evaluation.json"), report);
console.log(`Saved result to ${path.join(resultDir, "network-evaluation.json")}`);
