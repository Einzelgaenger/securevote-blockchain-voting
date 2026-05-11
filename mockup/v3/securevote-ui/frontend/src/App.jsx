import React, { useEffect, useMemo, useState } from "react";
import { decodeEventLog } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { CONTRACTS, CHAIN_ID, CHAIN_NAME, assertIsRoomClone } from "./config/contracts.js";

function isReadFn(item) {
    return item.type === "function" && (item.stateMutability === "view" || item.stateMutability === "pure");
}

function isWriteFn(item) {
    return item.type === "function" && !isReadFn(item);
}

function shortAddr(address) {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

function InputField({ label, value, onChange, placeholder }) {
    return (
        <div className="field">
            <div className="label">{label}</div>
            <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        </div>
    );
}

function getInputPlaceholder(contractName, fn, input, index, customRoomAddr) {
    if (input.type === "address" && input.name === "room") {
        return customRoomAddr || "0x... address room clone";
    }

    if (input.type === "address" && input.name === "newCenter") {
        return CONTRACTS.VotingResultCenter.address;
    }

    if (input.type === "uint256" && input.name === "version") {
        return "1";
    }

    if (input.type === "uint256" && (input.name === "round" || input.name === "roundId")) {
        return "1";
    }

    if (input.type === "uint256" && input.name === "index") {
        return "0";
    }

    if (contractName === "RoomFactory" && fn.name === "allRooms") {
        return "0";
    }

    if (input.type.endsWith("[]")) {
        return input.type === "string[]" ? '["Andi","Budi"]' : "[1,2]";
    }

    return input.type || `arg${index}`;
}

function FnCard({ contractName, customRoomAddr, fn, onCall, onSend }) {
    const [open, setOpen] = useState(false);
    const [args, setArgs] = useState(() => (fn.inputs || []).map(() => ""));
    const [valueWei, setValueWei] = useState("0");

    const read = isReadFn(fn);
    const hasInputs = (fn.inputs || []).length > 0;
    const inputSignature = (fn.inputs || []).map((input) => `${input.name}:${input.type}`).join("|");

    useEffect(() => {
        setArgs((fn.inputs || []).map(() => ""));
        setValueWei("0");
    }, [contractName, fn.name, inputSignature]);

    return (
        <div className="fnCard">
            <button className={`btn ${read ? "read" : "write"}`} onClick={() => setOpen((value) => !value)}>
                <span className="fnName">{fn.name}</span>
                <span className="fnSig">
                    {(fn.inputs || []).map((input) => input.type).join(", ")}
                    {read ? " (view)" : ""}
                </span>
            </button>

            {open && (
                <div className="fnBody">
                    {hasInputs &&
                        fn.inputs.map((input, index) => (
                            <InputField
                                key={`${fn.name}-${index}`}
                                label={`${input.name || `arg${index}`} (${input.type})`}
                                value={args[index]}
                                onChange={(value) =>
                                    setArgs((prev) => {
                                        const next = [...prev];
                                        next[index] = value;
                                        return next;
                                    })
                                }
                                placeholder={getInputPlaceholder(contractName, fn, input, index, customRoomAddr)}
                            />
                        ))}

                    {!read && (
                        <InputField
                            label="tx value (wei)"
                            value={valueWei}
                            onChange={setValueWei}
                            placeholder="0"
                        />
                    )}

                    <div className="row">
                        <button className="btn action" onClick={() => (read ? onCall(args) : onSend(args, valueWei))}>
                            {read ? "Call" : fn.name === "vote" ? "Direct Vote" : "Transact"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function App() {
    const { address, isConnected, chain } = useAccount();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();

    const [selected, setSelected] = useState("RoomFactory");
    const [customRoomAddr, setCustomRoomAddr] = useState("");
    const [resultLog, setResultLog] = useState([]);

    const contract = selected ? CONTRACTS[selected] : null;
    const effectiveAddress = useMemo(() => {
        if (!contract) return null;
        if (selected === "VotingRoom" && customRoomAddr.trim()) return customRoomAddr.trim();
        return contract.address;
    }, [contract, selected, customRoomAddr]);

    const abiItems = useMemo(() => {
        if (!contract) return [];
        return contract.abi.filter((item) => item && item.type === "function");
    }, [contract]);

    const readFns = abiItems.filter(isReadFn);
    const writeFns = abiItems.filter(isWriteFn);

    function pushLog(line) {
        setResultLog((prev) => [line, ...prev].slice(0, 120));
    }

    function pushResultCenterHint(fnName) {
        if (selected !== "VotingResultCenter") return;

        if (["getRooms", "getRoomCount", "getRoomAt", "getRoomsWithAdmins"].includes(fnName)) {
            pushLog("[HINT] VotingResultCenter masih kosong sampai room clone memanggil submitRoundHistory(round) setelah stop(). Room yang baru dibuat hanya muncul di RoomFactory.");
        }

        if (["getRoomVersionCount", "getLatestVersion", "getRoomVersionSummary", "getRoomVersionCandidates", "getRoomAdmin"].includes(fnName)) {
            pushLog("[HINT] Input room harus address clone dari event RoomRegistered. Version mulai dari 1 setelah submitRoundHistory() sukses.");
        }
    }

    function assertReadyForSelectedContract() {
        if (!effectiveAddress) throw new Error("Contract address missing");
        if (selected === "VotingRoom") assertIsRoomClone(effectiveAddress);
    }

    async function handleCall(fn, args) {
        try {
            if (!publicClient) throw new Error("Public client not ready");
            assertReadyForSelectedContract();

            const result = await publicClient.readContract({
                address: effectiveAddress,
                abi: contract.abi,
                functionName: fn.name,
                args: buildArgs(fn, args),
            });

            pushLog(`[CALL] ${fn.name} => ${stringify(result)}`);
            pushResultCenterHint(fn.name);
        } catch (error) {
            pushLog(`[ERROR][CALL] ${fn.name}: ${error.shortMessage || error.message}`);
            pushResultCenterHint(fn.name);
        }
    }

    async function handleSend(fn, args, valueWei) {
        try {
            if (!walletClient) throw new Error("WalletClient not ready");
            if (chain?.id !== CHAIN_ID) throw new Error(`Please switch to ${CHAIN_NAME} (${CHAIN_ID})`);
            assertReadyForSelectedContract();

            const hash = await walletClient.writeContract({
                address: effectiveAddress,
                abi: contract.abi,
                functionName: fn.name,
                args: buildArgs(fn, args),
                value: BigInt(valueWei || "0"),
                chain,
            });

            pushLog(`[TX] ${fn.name} => ${hash}`);
            if (publicClient) {
                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                pushLog(`[RECEIPT] ${fn.name} status=${receipt.status}`);
                logDecodedEvents(receipt.logs, contract.abi, pushLog, {
                    onRoomRegistered: (room) => {
                        setCustomRoomAddr(room);
                        pushLog(`[ROOM] clone address disimpan untuk VotingRoom: ${room}`);
                    },
                });
            }
        } catch (error) {
            pushLog(`[ERROR][TX] ${fn.name}: ${error.shortMessage || error.message}`);
        }
    }

    if (!isConnected) {
        return (
            <div className="card">
                <div className="cardTitle">Connect Wallet</div>
                <div className="cardBody">
                    Klik tombol connect di kanan atas.
                    <div className="hint">Setelah connect, pilih kontrak v2 dan panggil fungsi yang dibutuhkan.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="panel">
                <div className="panelTitle">Contracts</div>
                <div className="pillRow">
                    {Object.keys(CONTRACTS).map((name) => (
                        <button
                            key={name}
                            className={`pill ${selected === name ? "active" : ""}`}
                            onClick={() => setSelected(name)}
                            title={CONTRACTS[name].address}
                        >
                            {name}
                        </button>
                    ))}
                </div>

                {selected === "VotingRoom" && (
                    <div className="card mini">
                        <div className="cardTitle">VotingRoom Clone Address</div>
                        <div className="cardBody">
                            <input
                                className="input"
                                value={customRoomAddr}
                                onChange={(event) => setCustomRoomAddr(event.target.value)}
                                placeholder="Paste address room hasil createRoom()"
                            />
                            <div className="hint">
                                Config menyimpan implementation {shortAddr(CONTRACTS.VotingRoom.address)}. Untuk vote, start,
                                stop, submit histori, dan setup room, gunakan address clone.
                            </div>
                        </div>
                    </div>
                )}

                <div className="card mini">
                    <div className="cardTitle">Connected</div>
                    <div className="cardBody">
                        <div className="mono">{shortAddr(address)}</div>
                        <div className="mono">
                            Chain: {chain?.name} ({chain?.id})
                        </div>
                        <div className="hint">Target: {CHAIN_NAME} ({CHAIN_ID})</div>
                    </div>
                </div>

                <div className="card mini">
                    <div className="cardTitle">v2 Flow</div>
                    <div className="cardBody">
                        <div className="hint">
                            Create room lewat RoomFactory, set result center di room clone, lalu voter memanggil vote()
                            langsung dari wallet. Tidak ada relayer, vault, deposit, atau maxCostPerVote.
                        </div>
                    </div>
                </div>

                {selected === "VotingResultCenter" && (
                    <div className="card mini">
                        <div className="cardTitle">Result Center Notes</div>
                        <div className="cardBody">
                            <div className="hint">
                                Room baru tidak langsung muncul di sini. Data pusat baru terisi setelah admin room memanggil
                                submitRoundHistory(round) dari VotingRoom clone setelah stop().
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="panel">
                <div className="panelTitle">
                    {selected ? `${selected} @ ${shortAddr(effectiveAddress)}` : "Select a contract"}
                </div>

                {contract && (
                    <>
                        <div className="sectionTitle">Read / Variables</div>
                        {readFns.map((fn) => (
                            <FnCard
                                key={`${selected}:read:${fn.name}:${(fn.inputs || []).map((input) => input.type).join(",")}`}
                                contractName={selected}
                                customRoomAddr={customRoomAddr}
                                fn={fn}
                                onCall={(args) => handleCall(fn, args)}
                                onSend={(args, valueWei) => handleSend(fn, args, valueWei)}
                            />
                        ))}

                        <div className="sectionTitle">Write / Transactions</div>
                        {writeFns.map((fn) => (
                            <FnCard
                                key={`${selected}:write:${fn.name}:${(fn.inputs || []).map((input) => input.type).join(",")}`}
                                contractName={selected}
                                customRoomAddr={customRoomAddr}
                                fn={fn}
                                onCall={(args) => handleCall(fn, args)}
                                onSend={(args, valueWei) => handleSend(fn, args, valueWei)}
                            />
                        ))}
                    </>
                )}
            </div>

            <div className="panel">
                <div className="panelTitle">Console</div>
                <div className="console">
                    {resultLog.length === 0 ? (
                        <div className="hint">Output call/tx akan muncul di sini.</div>
                    ) : (
                        resultLog.map((line, index) => (
                            <div key={index} className="consoleLine">
                                {line}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function coerceScalar(value) {
    const trimmed = String(value).trim();

    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (/^[0-9a-fA-F]{40}$/.test(trimmed)) return `0x${trimmed}`;
    if (/^\d+$/.test(trimmed)) return BigInt(trimmed);

    return trimmed;
}

function normalizeArrayValue(value) {
    if (Array.isArray(value)) return value.map((item) => normalizeArrayValue(item));
    if (typeof value === "string") return coerceScalar(value);
    if (typeof value === "number") return BigInt(value);
    return value;
}

function coerceArgByType(value, type) {
    const trimmed = String(value).trim();

    if (type.endsWith("[]")) {
        let parsed;
        try {
            parsed = JSON.parse(trimmed);
        } catch {
            throw new Error(`Format array untuk ${type} harus JSON valid, contoh: [1,2] atau ["andi","budi"]`);
        }

        if (!Array.isArray(parsed)) {
            throw new Error(`Value "${trimmed}" is not a valid array.`);
        }

        return parsed.map((item) => normalizeArrayValue(item));
    }

    return coerceScalar(trimmed);
}

function buildArgs(fn, args) {
    return (fn.inputs || []).map((input, index) => {
        const raw = args?.[index] ?? "";
        if (String(raw).trim() === "") {
            throw new Error(`Input ${input.name || `arg${index}`} (${input.type}) wajib diisi`);
        }

        return coerceArgByType(raw, input.type);
    });
}

function stringify(value) {
    try {
        if (typeof value === "bigint") return value.toString();
        return JSON.stringify(value, (_, item) => (typeof item === "bigint" ? item.toString() : item));
    } catch {
        return String(value);
    }
}

function logDecodedEvents(logs, abi, pushLog, handlers = {}) {
    logs.forEach((log) => {
        try {
            const event = decodeEventLog({
                abi,
                data: log.data,
                topics: log.topics,
            });

            pushLog(`[EVENT] ${event.eventName} ${stringify(event.args)}`);
            if (event.eventName === "RoomRegistered" && event.args?.room) {
                handlers.onRoomRegistered?.(event.args.room);
            }
        } catch {
            // Ignore logs emitted by other contracts in the same transaction.
        }
    });
}
