import React, { useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { encodeFunctionData, parseAbiItem } from "viem";
import { CONTRACTS, CHAIN_ID, FORWARDER_EIP712, TYPES } from "./config/contracts.js";

function isReadFn(item) {
    return item.type === "function" && (item.stateMutability === "view" || item.stateMutability === "pure");
}
function isWriteFn(item) {
    return item.type === "function" && !isReadFn(item);
}
function shortAddr(a) {
    return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

function InputField({ label, value, onChange, placeholder }) {
    return (
        <div className="field">
            <div className="label">{label}</div>
            <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        </div>
    );
}

function FnCard({ fn, onCall, onSend, specialVoteGasless }) {
    const [open, setOpen] = useState(false);
    const [args, setArgs] = useState(() => (fn.inputs || []).map(() => ""));
    const [valueWei, setValueWei] = useState("0");

    const hasInputs = (fn.inputs || []).length > 0;
    const read = fn.stateMutability === "view" || fn.stateMutability === "pure";

    const buttonClass = read ? "btn read" : "btn write";

    return (
        <div className="fnCard">
            <button className={buttonClass} onClick={() => setOpen((v) => !v)}>
                <span className="fnName">{fn.name}</span>
                <span className="fnSig">
                    {(fn.inputs || []).map((i) => i.type).join(", ")}
                    {read ? "  (view)" : ""}
                </span>
            </button>

            {open && (
                <div className="fnBody">
                    {hasInputs &&
                        (fn.inputs || []).map((inp, idx) => (
                            <InputField
                                key={idx}
                                label={`${inp.name || `arg${idx}`} (${inp.type})`}
                                value={args[idx]}
                                onChange={(v) => setArgs((prev) => prev.map((x, i) => (i === idx ? v : x)))}
                                placeholder={inp.type}
                            />
                        ))}

                    {!read && (
                        <InputField
                            label="tx value (wei) (opsional)"
                            value={valueWei}
                            onChange={setValueWei}
                            placeholder="0"
                        />
                    )}

                    <div className="row">
                        {read ? (
                            <button className="btn action" onClick={() => onCall(args)}>
                                Call
                            </button>
                        ) : fn.name === "vote" && specialVoteGasless ? (
                            specialVoteGasless(args)
                        ) : (
                            <button className="btn action" onClick={() => onSend(args, valueWei)}>
                                Transact
                            </button>
                        )}
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

    const [selected, setSelected] = useState(null);
    const [resultLog, setResultLog] = useState([]);
    const [customRoomAddr, setCustomRoomAddr] = useState(""); // untuk VotingRoom dinamis
    const [gaslessEnabled, setGaslessEnabled] = useState(true);

    const relayerUrl = import.meta.env.VITE_RELAYER_URL;

    const contract = selected ? CONTRACTS[selected] : null;

    const effectiveAddress = useMemo(() => {
        if (!contract) return null;
        if (selected === "VotingRoom" && customRoomAddr.trim()) return customRoomAddr.trim();
        return contract.address;
    }, [contract, selected, customRoomAddr]);

    const abiItems = useMemo(() => {
        if (!contract) return [];
        return contract.abi.filter((x) => x && (x.type === "function"));
    }, [contract]);

    const readFns = abiItems.filter(isReadFn);
    const writeFns = abiItems.filter(isWriteFn);

    function pushLog(line) {
        setResultLog((prev) => [line, ...prev].slice(0, 50));
    }

    async function handleCall(fn, args) {
        try {
            const res = await publicClient.readContract({
                address: effectiveAddress,
                abi: contract.abi,
                functionName: fn.name,
                args: args.map((a) => (a === "" ? undefined : coerceArg(a, fn)))
            });
            pushLog(`[CALL] ${fn.name} => ${stringify(res)}`);
        } catch (e) {
            pushLog(`[ERROR][CALL] ${fn.name}: ${e.shortMessage || e.message}`);
        }
    }

    async function handleSend(fn, args, valueWei) {
        try {
            if (!walletClient) throw new Error("WalletClient not ready");
            const hash = await walletClient.writeContract({
                address: effectiveAddress,
                abi: contract.abi,
                functionName: fn.name,
                args: args.map((a) => (a === "" ? undefined : coerceArg(a, fn))),
                value: BigInt(valueWei || "0"),
                chain
            });
            pushLog(`[TX] ${fn.name} => ${hash}`);
        } catch (e) {
            pushLog(`[ERROR][TX] ${fn.name}: ${e.shortMessage || e.message}`);
        }
    }

    function VoteGaslessButton(voteArgs) {
        return (
            <>
                <button className="btn action" onClick={() => handleVoteGasless(voteArgs)}>
                    Gasless Vote
                </button>
                <div className="hint">
                    Gasless hanya untuk <b>vote()</b> (meta-tx via MinimalForwarder)
                </div>
            </>
        );
    }

    async function handleVoteGasless(args) {
        try {
            if (!walletClient) throw new Error("WalletClient not ready");
            if (!address) throw new Error("Not connected");
            if (!effectiveAddress) throw new Error("VotingRoom address missing");
            if (chain?.id !== CHAIN_ID) throw new Error("Please switch to Sepolia");

            const candidateId = BigInt(args[0] || "0");

            // 1) nonce dari forwarder
            const forwarder = CONTRACTS.MinimalForwarder;
            const nonce = await publicClient.readContract({
                address: forwarder.address,
                abi: forwarder.abi,
                functionName: "getNonce",
                args: [address]
            });

            // 2) calldata vote(candidateId)
            const data = encodeFunctionData({
                abi: CONTRACTS.VotingRoom.abi,
                functionName: "vote",
                args: [candidateId]
            });

            // 3) gas estimate untuk inner call
            const estimated = await publicClient.estimateGas({
                to: effectiveAddress,
                data
            });

            const req = {
                from: address,
                to: effectiveAddress,
                value: 0n,
                gas: (estimated + 50_000n).toString(),
                nonce: nonce.toString(),
                data
            };

            const domain = {
                name: FORWARDER_EIP712.domainName,
                version: FORWARDER_EIP712.domainVersion,
                chainId: CHAIN_ID,
                verifyingContract: forwarder.address
            };

            // 4) sign typed data
            const signature = await walletClient.signTypedData({
                domain,
                types: TYPES,
                primaryType: "ForwardRequest",
                message: req
            });

            // 5) kirim ke relayer
            const r = await fetch(`${relayerUrl}/relay`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ req, signature })
            });

            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || "Relayer error");

            pushLog(`[GASLESS] vote(${candidateId}) => ${j.txHash}`);
        } catch (e) {
            pushLog(`[ERROR][GASLESS] vote: ${e.shortMessage || e.message}`);
        }
    }

    if (!isConnected) {
        return (
            <div className="card">
                <div className="cardTitle">Connect Wallet</div>
                <div className="cardBody">
                    Klik tombol connect di kanan atas.
                    <div className="hint">Setelah connect, akan muncul 4 tombol kontrak.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="panel">
                <div className="panelTitle">Contracts</div>
                <div className="pillRow">
                    {Object.keys(CONTRACTS).map((k) => (
                        <button
                            key={k}
                            className={`pill ${selected === k ? "active" : ""}`}
                            onClick={() => setSelected(k)}
                            title={CONTRACTS[k].address}
                        >
                            {k}
                        </button>
                    ))}
                </div>

                {selected === "VotingRoom" && (
                    <div className="card mini">
                        <div className="cardTitle">VotingRoom Address (opsional)</div>
                        <div className="cardBody">
                            <input
                                className="input"
                                value={customRoomAddr}
                                onChange={(e) => setCustomRoomAddr(e.target.value)}
                                placeholder="Kalau room hasil createRoom, paste address-nya di sini"
                            />
                            <div className="row">
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={gaslessEnabled}
                                        onChange={(e) => setGaslessEnabled(e.target.checked)}
                                    />
                                    <span>Enable Gasless vote()</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                <div className="card mini">
                    <div className="cardTitle">Connected</div>
                    <div className="cardBody">
                        <div className="mono">{shortAddr(address)}</div>
                        <div className="mono">Chain: {chain?.name} ({chain?.id})</div>
                    </div>
                </div>
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
                                key={fn.name}
                                fn={fn}
                                onCall={(args) => handleCall(fn, args)}
                                onSend={(args, valueWei) => handleSend(fn, args, valueWei)}
                            />
                        ))}

                        <div className="sectionTitle">Write / Transactions</div>
                        {writeFns.map((fn) => (
                            <FnCard
                                key={fn.name}
                                fn={fn}
                                onCall={(args) => handleCall(fn, args)}
                                onSend={(args, valueWei) => handleSend(fn, args, valueWei)}
                                specialVoteGasless={
                                    selected === "VotingRoom" && fn.name === "vote" && gaslessEnabled
                                        ? (args) => VoteGaslessButton(args)
                                        : null
                                }
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
                        resultLog.map((l, i) => (
                            <div key={i} className="consoleLine">{l}</div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// Minimal coercion: uint/int -> BigInt, address/bytes/string keep string
function coerceArg(val, fn) {
    const inputs = fn.inputs || [];
    // caller already supplies by index; we only parse by type here is not possible without index.
    // We'll keep it simple: detect number-like.
    if (/^\d+$/.test(val)) return BigInt(val);
    return val;
}

function stringify(x) {
    try {
        if (typeof x === "bigint") return x.toString();
        return JSON.stringify(x, (_, v) => (typeof v === "bigint" ? v.toString() : v));
    } catch {
        return String(x);
    }
}
