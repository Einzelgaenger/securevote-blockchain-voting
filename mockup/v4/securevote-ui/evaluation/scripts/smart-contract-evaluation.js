import path from "node:path";
import { decodeEventLog } from "viem";
import {
    ask,
    dataDir,
    ensureDir,
    evaluationRoot,
    isAddress,
    loadChain,
    loadContracts,
    loadEnv,
    publicClient,
    readJson,
    resultsDir,
    timed,
    todayStamp,
    walletClient,
    writeJson,
} from "./common.js";

loadEnv();

const chain = loadChain();
const client = publicClient(chain);
const contracts = loadContracts();
const RoomFactoryAbi = readJson(path.resolve(evaluationRoot, "../frontend/src/abi/RoomFactory.json"));
const VotingRoomAbi = readJson(path.resolve(evaluationRoot, "../frontend/src/abi/VotingRoom.json"));
const resultDir = path.join(resultsDir, `smart-contract-evaluation-result-${todayStamp()}`);
const savedRoomsPath = path.join(dataDir, "saved-rooms.json");
const eoaPath = path.join(dataDir, "testing-eoas.json");
ensureDir(resultDir);

if (!process.env.ADMIN_PRIVATE_KEY) throw new Error("ADMIN_PRIVATE_KEY is required.");
if (!isAddress(contracts.roomFactory)) throw new Error("RoomFactory address is missing in frontend/src/config/deployed-contracts.json.");
if (!isAddress(contracts.votingResultCenter)) throw new Error("VotingResultCenter address is missing in frontend/src/config/deployed-contracts.json.");

const { account: admin, client: adminWallet } = walletClient(chain, process.env.ADMIN_PRIVATE_KEY);
const eoaFile = readJson(eoaPath);
if (!eoaFile?.accounts?.length) throw new Error("Run npm run generate:eoa first, then prefund those addresses in Besu.");

const voterCount = Math.min(Number(process.env.VOTER_COUNT || 30), eoaFile.accounts.length);
const candidateCount = Math.max(1, Number(process.env.CANDIDATE_COUNT || 3));
const voterAccounts = eoaFile.accounts.slice(0, voterCount);
const candidateIds = Array.from({ length: candidateCount }, (_, index) => BigInt(index + 1));
const candidateNames = candidateIds.map((id) => `Candidate ${id}`);

async function wait(hash) {
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`Transaction failed: ${hash}`);
    return receipt;
}

async function writeRoom(room, functionName, args = []) {
    const hash = await adminWallet.writeContract({
        account: admin,
        address: room,
        abi: VotingRoomAbi,
        functionName,
        args,
    });
    return wait(hash);
}

async function createRoom() {
    const roomName = `SecureVote Evaluation ${new Date().toISOString()}`;
    const hash = await adminWallet.writeContract({
        account: admin,
        address: contracts.roomFactory,
        abi: RoomFactoryAbi,
        functionName: "createRoom",
        args: [roomName],
    });
    const receipt = await wait(hash);
    for (const log of receipt.logs) {
        try {
            const event = decodeEventLog({ abi: RoomFactoryAbi, data: log.data, topics: log.topics });
            if (event.eventName === "RoomRegistered") {
                return { room: event.args.room, name: roomName, admin: event.args.admin };
            }
        } catch {
            // Ignore non-factory logs.
        }
    }
    throw new Error("RoomRegistered event not found.");
}

async function chooseRoom() {
    const saved = readJson(savedRoomsPath, { rooms: [] });
    if (saved.rooms.length > 0) {
        console.log("Saved rooms:");
        saved.rooms.forEach((room, index) => console.log(`${index + 1}. ${room.name} - ${room.room}`));
        const choice = await ask("Pilih nomor room, N untuk buat baru, atau paste room address: ");
        const selectedIndex = Number(choice) - 1;
        if (saved.rooms[selectedIndex]) return saved.rooms[selectedIndex];
        if (choice.toLowerCase() !== "n" && isAddress(choice)) return { room: choice, name: "Pasted Room", admin: admin.address };
    }

    const created = await createRoom();
    saved.rooms.push(created);
    writeJson(savedRoomsPath, saved);
    return created;
}

async function ensureRoomReady(room) {
    const roomAdmin = await client.readContract({ address: room, abi: VotingRoomAbi, functionName: "roomAdmin" });
    if (roomAdmin.toLowerCase() !== admin.address.toLowerCase()) {
        throw new Error(`ADMIN_PRIVATE_KEY must match roomAdmin. Room admin is ${roomAdmin}`);
    }

    const currentCenter = await client.readContract({ address: room, abi: VotingRoomAbi, functionName: "resultCenter" });
    if (currentCenter.toLowerCase() !== contracts.votingResultCenter.toLowerCase()) {
        await writeRoom(room, "setResultCenter", [contracts.votingResultCenter]);
    }

    const status = await client.readContract({ address: room, abi: VotingRoomAbi, functionName: "getCurrentRoundStatus" });
    if (Number(status[1]) === 1) await writeRoom(room, "stop");
    const afterStopStatus = await client.readContract({ address: room, abi: VotingRoomAbi, functionName: "getCurrentRoundStatus" });
    if (!afterStopStatus[2]) await writeRoom(room, "restart");

    for (const item of voterAccounts) {
        const eligible = await client.readContract({
            address: room,
            abi: VotingRoomAbi,
            functionName: "isVoterEligible",
            args: [item.address],
        });
        if (!eligible) await writeRoom(room, "addVoter", [item.address]);
    }

    const existingCandidateCount = await client.readContract({ address: room, abi: VotingRoomAbi, functionName: "getCandidateCount" });
    if (existingCandidateCount === 0n) await writeRoom(room, "addCandidates", [candidateIds, candidateNames]);
}

async function voteWith(accountInfo, candidateId) {
    const { account, client: voterWallet } = walletClient(chain, accountInfo.privateKey);
    const hash = await voterWallet.writeContract({
        account,
        address: selected.room,
        abi: VotingRoomAbi,
        functionName: "vote",
        args: [candidateId],
    });
    const receipt = await wait(hash);
    return { voter: account.address, candidateId: candidateId.toString(), hash, blockNumber: receipt.blockNumber.toString() };
}

const selected = await chooseRoom();
const report = {
    startedAt: new Date().toISOString(),
    room: selected,
    admin: admin.address,
    voterCount,
    candidateCount,
    steps: [],
};

report.steps.push(await timed("Prepare room", () => ensureRoomReady(selected.room)));
report.steps.push(await timed("Start voting round", () => writeRoom(selected.room, "start")));

const voteStarted = Date.now();
const voteResults = await Promise.all(
    voterAccounts.map((accountInfo, index) => voteWith(accountInfo, candidateIds[index % candidateIds.length]))
);
report.voteTransactions = {
    total: voteResults.length,
    latencyMs: Date.now() - voteStarted,
    averageMs: Math.round((Date.now() - voteStarted) / voteResults.length),
    transactions: voteResults,
};

report.steps.push(await timed("Stop voting round", () => writeRoom(selected.room, "stop")));
const status = await client.readContract({ address: selected.room, abi: VotingRoomAbi, functionName: "getCurrentRoundStatus" });
const submittedRound = status[0];
report.steps.push(await timed("Submit round history", () => writeRoom(selected.room, "submitRoundHistory", [submittedRound])));
report.steps.push(await timed("Restart room for next run", () => writeRoom(selected.room, "restart")));

report.finishedAt = new Date().toISOString();
writeJson(path.join(resultDir, "smart-contract-evaluation.json"), report);
console.log(`Saved result to ${path.join(resultDir, "smart-contract-evaluation.json")}`);
