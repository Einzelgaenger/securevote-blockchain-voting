import React, { useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { encodeFunctionData } from "viem";
import { CONTRACTS, CHAIN_ID, TYPES } from "./config/contracts.js";

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

                    {!read && <InputField label="tx value (wei) (opsional)" value={valueWei} onChange={setValueWei} placeholder="0" />}

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
    const [customRoomAddr, setCustomRoomAddr] = useState("");
    const [gaslessEnabled, setGaslessEnabled] = useState(true);
    const [calcGasPriceGwei, setCalcGasPriceGwei] = useState("");
    const [calcOverheadBps, setCalcOverheadBps] = useState("");
    const [calcInnerGas, setCalcInnerGas] = useState("500000");
    const [calcOuterBuffer, setCalcOuterBuffer] = useState("250000");
    const [calcResult, setCalcResult] = useState(null);

    const relayerUrl = import.meta.env.VITE_RELAYER_URL;

    const contract = selected ? CONTRACTS[selected] : null;

    const effectiveAddress = useMemo(() => {
        if (!contract) return null;
        if (selected === "VotingRoom" && customRoomAddr.trim()) return customRoomAddr.trim();
        return contract.address;
    }, [contract, selected, customRoomAddr]);

    const abiItems = useMemo(() => {
        if (!contract) return [];
        return contract.abi.filter((x) => x && x.type === "function");
    }, [contract]);

    const readFns = abiItems.filter(isReadFn);
    const writeFns = abiItems.filter(isWriteFn);

    function pushLog(line) {
        setResultLog((prev) => [line, ...prev].slice(0, 120));
    }

    function assertUsingRoomClone() {
        if (selected !== "VotingRoom") return;
        const impl = (CONTRACTS?.VotingRoom?.address || "").toLowerCase();
        const eff = (effectiveAddress || "").toLowerCase();
        if (!eff) throw new Error("VotingRoom address missing");
        if (impl && eff === impl) {
            throw new Error(
                "Kamu masih memakai VotingRoom IMPLEMENTATION. " +
                "Paste address room hasil createRoom (EIP-1167 clone), contoh: 0xa536..."
            );
        }
    }

    async function handleCall(fn, args) {
        try {
            const res = await publicClient.readContract({
                address: effectiveAddress,
                abi: contract.abi,
                functionName: fn.name,
                args: args.map((a) => (a === "" ? undefined : coerceArg(a))),
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
                args: args.map((a) => (a === "" ? undefined : coerceArg(a))),
                value: BigInt(valueWei || "0"),
                chain,
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
                    Gasless hanya untuk <b>vote()</b> (meta-tx via MinimalForwarder).
                    <br />
                    <b>Wajib</b> paste <b>room clone hasil createRoom</b> (contoh: <span className="mono">0xa536...</span>),{" "}
                    <b>bukan</b> implementation (<span className="mono">{shortAddr(CONTRACTS?.VotingRoom?.address)}</span>).
                </div>
            </>
        );
    }

    async function handleVoteGasless(args) {
        try {
            if (!relayerUrl) throw new Error("VITE_RELAYER_URL belum diset di .env frontend");
            if (!walletClient) throw new Error("WalletClient not ready");
            if (!address) throw new Error("Not connected");
            if (!effectiveAddress) throw new Error("VotingRoom address missing");
            if (chain?.id !== CHAIN_ID) throw new Error("Please switch to Sepolia");

            assertUsingRoomClone();

            if (!calcResult?.chargedAmount) {
                throw new Error("Hitung dulu Gas Cost Calculator (Estimate) sebelum vote");
            }

            // Guard: maxCostPerVoteWei harus sudah diset dan >= hasil kalkulasi
            const maxCostPerVoteWei = await publicClient.readContract({
                address: effectiveAddress,
                abi: contract.abi,
                functionName: "maxCostPerVoteWei",
            });
            pushLog(
                `[PRECHECK] maxCostPerVoteWei=${maxCostPerVoteWei} | suggested=${calcResult.chargedAmount}`
            );
            if (!maxCostPerVoteWei || BigInt(maxCostPerVoteWei) === 0n) {
                throw new Error("maxCostPerVoteWei belum diset. Set dulu di contract.");
            }
            const requiredMin = BigInt(calcResult.chargedAmount);
            if (BigInt(maxCostPerVoteWei) < requiredMin) {
                throw new Error(
                    `maxCostPerVoteWei terlalu kecil. On-chain=${maxCostPerVoteWei} < kalkulasi=${requiredMin}`
                );
            }

            // Guard: roomBalance harus >= 2x suggested maxCostPerVoteWei
            if (!CONTRACTS?.SponsorVault?.address) {
                throw new Error("SponsorVault address belum diset");
            }
            const roomBalance = await publicClient.readContract({
                address: CONTRACTS.SponsorVault.address,
                abi: CONTRACTS.SponsorVault.abi,
                functionName: "roomBalance",
                args: [effectiveAddress],
            });
            const minRoomBalance = requiredMin * 2n;
            pushLog(
                `[PRECHECK] roomBalance=${roomBalance} | minRequired(2x)=${minRoomBalance}`
            );
            if (BigInt(roomBalance) < minRoomBalance) {
                throw new Error(
                    `Room balance tidak cukup. roomBalance=${roomBalance} < minimum=${minRoomBalance}`
                );
            }

            const candidateId = BigInt(args?.[0] || "0");

            const forwarder = CONTRACTS.MinimalForwarder;

            pushLog("[GASLESS] step 1: read nonce");
            const nonce = await publicClient.readContract({
                address: forwarder.address,
                abi: forwarder.abi,
                functionName: "getNonce",
                args: [address],
            });

            pushLog("[GASLESS] step 2: encode vote data");
            const data = encodeFunctionData({
                abi: CONTRACTS.VotingRoom.abi,
                functionName: "vote",
                args: [candidateId],
            });

            // IMPORTANT:
            // Jangan estimateGas ke room.vote() langsung (bisa revert karena jalur meta-tx harus lewat forwarder.execute).
            pushLog("[GASLESS] step 3: skipped estimateGas; using fixed innerGas=500000");
            const innerGas = 500000n;

            // ✅ message untuk signTypedData HARUS pakai BigInt utk uint256 (value/gas/nonce)
            const dom = await publicClient.readContract({
                address: CONTRACTS.MinimalForwarder.address,
                abi: CONTRACTS.MinimalForwarder.abi,
                functionName: "eip712Domain",
            });

            // dom = [fields, name, version, chainId, verifyingContract, salt, ...]
            pushLog(`[EIP712] onchain name=${dom[1]} version=${dom[2]} chainId=${dom[3].toString()} verifying=${dom[4]}`);
            const reqToSign = {
                from: address,
                to: effectiveAddress,
                value: 0n,
                gas: innerGas,
                nonce: BigInt(nonce), // ensure BigInt
                data,
            };

            // ✅ domain HARUS match OZ MinimalForwarder: name="MinimalForwarder", version="1"
            // Jangan pakai config yang bisa kebalik; hardcode supaya tidak mismatch lagi.
            // const domain = {
            //     name: "MinimalForwarder",
            //     version: "1.0.0",
            //     chainId: CHAIN_ID,
            //     verifyingContract: forwarder.address,
            // };
            const domain = {
                name: dom[1],
                version: dom[2],
                chainId: Number(dom[3]),        // viem expects number
                verifyingContract: dom[4],      // MUST match forwarder contract
            };

            // Guard: pastikan address yang sign sama dengan req.from
            try {
                const addrs = await walletClient.getAddresses?.();
                if (addrs?.[0] && addrs[0].toLowerCase() !== address.toLowerCase()) {
                    throw new Error(`Signing address mismatch: wagmi=${address} walletClient=${addrs[0]}`);
                }
            } catch {
                // some wallet clients may not support getAddresses; ignore
            }

            pushLog("[GASLESS] step 4: signTypedData");
            const signature = await walletClient.signTypedData({
                domain,
                types: TYPES,
                primaryType: "ForwardRequest",
                message: reqToSign,
            });

            // ✅ JSON payload harus string untuk BigInt fields
            const reqJson = {
                ...reqToSign,
                value: reqToSign.value.toString(),
                gas: reqToSign.gas.toString(),
                nonce: reqToSign.nonce.toString(),
            };

            pushLog("[GASLESS] step 5: fetch relayer");
            const r = await fetch(`${relayerUrl}/relay`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ req: reqJson, signature }),
            });

            const j = await r.json();

            if (!r.ok) {
                const msg = typeof j?.error === "string" ? j.error : JSON.stringify(j?.error, null, 2);
                throw new Error(msg || "Relayer error");
            }

            pushLog(`[GASLESS] vote(${candidateId}) => ${j.txHash}`);
            if (j?.gasPrice !== undefined) {
                pushLog(`[GASLESS][COST] gasPrice=${j.gasPrice} wei`);
            }
            if (j?.actualGasCost !== undefined || j?.overheadWei !== undefined || j?.chargedAmount !== undefined) {
                pushLog(
                    `[GASLESS][COST] actualGasCost=${j.actualGasCost ?? "n/a"} wei (${formatWeiToEth(j.actualGasCost ?? "0")} ETH), ` +
                    `overhead=${j.overheadWei ?? "n/a"} wei (${formatWeiToEth(j.overheadWei ?? "0")} ETH), ` +
                    `charged=${j.chargedAmount ?? "n/a"} wei (${formatWeiToEth(j.chargedAmount ?? "0")} ETH)`
                );
            } else {
                pushLog(`[GASLESS][COST] missing fields from relayer response`);
            }
            if (j?.roomBalanceBefore && j?.roomBalanceAfter) {
                pushLog(
                    `[GASLESS][VAULT] roomBalance ${j.roomBalanceBefore} -> ${j.roomBalanceAfter} wei (${formatWeiToEth(j.roomBalanceAfter)} ETH)`
                );
            }
            if (j?.settleTxHash) {
                pushLog(`[GASLESS][SETTLE] ${j.settleTxHash} status=${j.settleStatus}`);
            }
        } catch (e) {
            pushLog(`[ERROR][GASLESS] vote: ${e.shortMessage || e.message}`);
        }
    }

    async function handleEstimateGasCost() {
        try {
            if (!publicClient) throw new Error("Public client not ready");
            const gasPrice = await publicClient.getGasPrice();
            const gasPriceGwei = (gasPrice / 1_000_000_000n).toString();
            setCalcGasPriceGwei(gasPriceGwei);

            let overheadBps = 0n;
            if (CONTRACTS?.SponsorVault?.address) {
                try {
                    const bps = await publicClient.readContract({
                        address: CONTRACTS.SponsorVault.address,
                        abi: CONTRACTS.SponsorVault.abi,
                        functionName: "overheadBps",
                    });
                    overheadBps = BigInt(bps);
                    setCalcOverheadBps(overheadBps.toString());
                } catch {
                    // ignore if read fails
                }
            }

            const innerGas = BigInt(calcInnerGas || "0");
            const outerBuffer = BigInt(calcOuterBuffer || "0");
            const totalGas = innerGas + outerBuffer;

            const baseCost = totalGas * gasPrice;
            const overheadWei = (baseCost * overheadBps) / 10000n;
            const chargedAmount = baseCost + overheadWei;

            setCalcResult({
                gasPrice: gasPrice.toString(),
                totalGas: totalGas.toString(),
                baseCost: baseCost.toString(),
                overheadWei: overheadWei.toString(),
                chargedAmount: chargedAmount.toString(),
            });
        } catch (e) {
            pushLog(`[ERROR][CALC] ${e.shortMessage || e.message}`);
        }
    }

    async function handleSetMaxCostPerVote() {
        try {
            if (!walletClient) throw new Error("WalletClient not ready");
            if (!effectiveAddress) throw new Error("VotingRoom address missing");
            if (!calcResult?.chargedAmount) throw new Error("Hitung dulu Gas Cost Calculator (Estimate)");

            const txHash = await walletClient.writeContract({
                address: effectiveAddress,
                abi: contract.abi,
                functionName: "setMaxCostPerVote",
                args: [BigInt(calcResult.chargedAmount)],
                chain,
            });

            pushLog(`[TX] setMaxCostPerVote(${calcResult.chargedAmount}) => ${txHash}`);
        } catch (e) {
            pushLog(`[ERROR][TX] setMaxCostPerVote: ${e.shortMessage || e.message}`);
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
                        <div className="cardTitle">VotingRoom Address (WAJIB untuk room clone)</div>
                        <div className="cardBody">
                            <input
                                className="input"
                                value={customRoomAddr}
                                onChange={(e) => setCustomRoomAddr(e.target.value)}
                                placeholder="Paste address room hasil createRoom() (contoh: 0xa536...)"
                            />
                            <div className="hint">
                                <b>Catatan:</b> Jika field ini kosong, UI akan pakai address implementation (template) dan gasless vote akan ditolak.
                            </div>

                            <div className="row">
                                <label className="toggle">
                                    <input type="checkbox" checked={gaslessEnabled} onChange={(e) => setGaslessEnabled(e.target.checked)} />
                                    <span>Enable Gasless vote()</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {selected === "VotingRoom" && (
                    <div className="card mini">
                        <div className="cardTitle">Gas Cost Calculator (per vote)</div>
                        <div className="cardBody">
                            <InputField
                                label="innerGas (vote call)"
                                value={calcInnerGas}
                                onChange={setCalcInnerGas}
                                placeholder="500000"
                            />
                            <InputField
                                label="outerBuffer (forwarder overhead)"
                                value={calcOuterBuffer}
                                onChange={setCalcOuterBuffer}
                                placeholder="250000"
                            />
                            <InputField
                                label="gasPrice (gwei)"
                                value={calcGasPriceGwei}
                                onChange={setCalcGasPriceGwei}
                                placeholder="auto on estimate"
                            />
                            <InputField
                                label="overheadBps (from SponsorVault)"
                                value={calcOverheadBps}
                                onChange={setCalcOverheadBps}
                                placeholder="auto on estimate"
                            />

                            <div className="row">
                                <button className="btn action" onClick={handleEstimateGasCost}>
                                    Estimate
                                </button>
                                <button className="btn action" onClick={handleSetMaxCostPerVote}>
                                    Set maxCostPerVote
                                </button>
                            </div>

                            {calcResult && (
                                <div className="hint">
                                    totalGas={calcResult.totalGas} | gasPrice={calcResult.gasPrice} wei
                                    <br />
                                    baseCost={calcResult.baseCost} wei ({formatWeiToEth(calcResult.baseCost)} ETH)
                                    <br />
                                    overhead={calcResult.overheadWei} wei ({formatWeiToEth(calcResult.overheadWei)} ETH)
                                    <br />
                                    suggested maxCostPerVoteWei={calcResult.chargedAmount} ({formatWeiToEth(calcResult.chargedAmount)} ETH)
                                    <br />
                                    suggested min roomBalance (2x)={String(BigInt(calcResult.chargedAmount) * 2n)} ({formatWeiToEth(String(BigInt(calcResult.chargedAmount) * 2n))} ETH)
                                </div>
                            )}
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
                    </div>
                </div>
            </div>

            <div className="panel">
                <div className="panelTitle">{selected ? `${selected} @ ${shortAddr(effectiveAddress)}` : "Select a contract"}</div>

                {contract && (
                    <>
                        <div className="sectionTitle">Read / Variables</div>
                        {readFns.map((fn) => (
                            <FnCard key={fn.name} fn={fn} onCall={(args) => handleCall(fn, args)} onSend={(args, valueWei) => handleSend(fn, args, valueWei)} />
                        ))}

                        <div className="sectionTitle">Write / Transactions</div>
                        {writeFns.map((fn) => (
                            <FnCard
                                key={fn.name}
                                fn={fn}
                                onCall={(args) => handleCall(fn, args)}
                                onSend={(args, valueWei) => handleSend(fn, args, valueWei)}
                                specialVoteGasless={selected === "VotingRoom" && fn.name === "vote" && gaslessEnabled ? (args) => VoteGaslessButton(args) : null}
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
                            <div key={i} className="consoleLine">
                                {l}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function coerceArg(val) {
    const v = String(val).trim();

    if (v === "true") return true;
    if (v === "false") return false;

    if (/^[0-9a-fA-F]{40}$/.test(v)) return `0x${v}`;

    if (/^\d+$/.test(v)) return BigInt(v);

    return v;
}

function stringify(x) {
    try {
        if (typeof x === "bigint") return x.toString();
        return JSON.stringify(x, (_, v) => (typeof v === "bigint" ? v.toString() : v));
    } catch {
        return String(x);
    }
}

function formatWeiToEth(weiValue, maxDecimals = 6) {
    try {
        const wei = BigInt(weiValue);
        const base = 1_000_000_000_000_000_000n;
        const whole = wei / base;
        const frac = wei % base;
        if (maxDecimals <= 0) return whole.toString();
        const fracStr = frac.toString().padStart(18, "0").slice(0, maxDecimals);
        return `${whole}.${fracStr}`.replace(/\.?0+$/, "");
    } catch {
        return "0";
    }
}
