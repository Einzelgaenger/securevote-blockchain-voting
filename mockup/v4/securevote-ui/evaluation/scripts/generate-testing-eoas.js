import crypto from "node:crypto";
import path from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import { dataDir, ensureDir, loadEnv, writeJson } from "./common.js";

loadEnv();

const count = Number(process.env.TEST_EOA_COUNT || 30);
const accounts = Array.from({ length: count }, (_, index) => {
    const privateKey = `0x${crypto.randomBytes(32).toString("hex")}`;
    const account = privateKeyToAccount(privateKey);
    return {
        index,
        address: account.address,
        privateKey,
        remixImport: privateKey,
    };
});

ensureDir(dataDir);
writeJson(path.join(dataDir, "testing-eoas.json"), {
    generatedAt: new Date().toISOString(),
    count,
    warning: "Testing keys only. Do not use these accounts on public networks.",
    accounts,
});

console.log(`Generated ${count} testing EOAs at data/testing-eoas.json`);
