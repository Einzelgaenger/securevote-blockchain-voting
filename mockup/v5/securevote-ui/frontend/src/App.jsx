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

    const [mode, setMode] = useState("dashboard");
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

    return (
        <>
            <div className="modeBar">
                <button className={`pill ${mode === "voter" ? "active" : ""}`} onClick={() => setMode("voter")}>
                    Voter Booth
                </button>
                <button className={`pill ${mode === "dashboard" ? "active" : ""}`} onClick={() => setMode("dashboard")}>
                    Public Audit Dashboard
                </button>
                <button className={`pill ${mode === "console" ? "active" : ""}`} onClick={() => setMode("console")}>
                    Contract Console
                </button>
            </div>

            {mode === "voter" ? (
                <VoterBooth
                    address={address}
                    chain={chain}
                    isConnected={isConnected}
                    publicClient={publicClient}
                    walletClient={walletClient}
                />
            ) : mode === "dashboard" ? (
                <PublicAuditDashboard publicClient={publicClient} />
            ) : !isConnected ? (
                <div className="card">
                    <div className="cardTitle">Connect Wallet</div>
                    <div className="cardBody">
                        Klik tombol connect di kanan atas untuk transaksi admin/voter.
                        <div className="hint">Dashboard public tetap bisa dibuka tanpa wallet.</div>
                    </div>
                </div>
            ) : (
                <ContractConsole
                    address={address}
                    chain={chain}
                    publicClient={publicClient}
                    walletClient={walletClient}
                    selected={selected}
                    setSelected={setSelected}
                    customRoomAddr={customRoomAddr}
                    setCustomRoomAddr={setCustomRoomAddr}
                    resultLog={resultLog}
                    setResultLog={setResultLog}
                    contract={contract}
                    effectiveAddress={effectiveAddress}
                    readFns={readFns}
                    writeFns={writeFns}
                />
            )}
        </>
    );
}

function ContractConsole({
    address,
    chain,
    publicClient,
    walletClient,
    selected,
    setSelected,
    customRoomAddr,
    setCustomRoomAddr,
    resultLog,
    setResultLog,
    contract,
    effectiveAddress,
    readFns,
    writeFns,
}) {
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

function VoterBooth({ address, chain, isConnected, publicClient, walletClient }) {
    const [roomAddress, setRoomAddress] = useState("");
    const [roomInfo, setRoomInfo] = useState(null);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [voting, setVoting] = useState(false);
    const [message, setMessage] = useState("");

    async function loadRoom() {
        try {
            if (!publicClient) throw new Error("Public client not ready");
            if (!isEthAddress(roomAddress)) throw new Error("Room address tidak valid");

            setLoading(true);
            setMessage("");
            setSelectedCandidate(null);

            const normalizedRoom = roomAddress.trim();
            const [isRoom, name, status, candidates, voterCount] = await Promise.all([
                safeRead(publicClient, CONTRACTS.RoomFactory.address, CONTRACTS.RoomFactory.abi, "isRoom", [normalizedRoom]),
                safeRead(publicClient, normalizedRoom, CONTRACTS.VotingRoom.abi, "roomName", []),
                safeRead(publicClient, normalizedRoom, CONTRACTS.VotingRoom.abi, "getCurrentRoundStatus", []),
                safeRead(publicClient, normalizedRoom, CONTRACTS.VotingRoom.abi, "getCandidates", []),
                safeRead(publicClient, normalizedRoom, CONTRACTS.VotingRoom.abi, "getVoterCount", []),
            ]);

            if (!isRoom) {
                throw new Error("Address ini bukan room resmi dari RoomFactory aktif");
            }

            let eligible = null;
            let lastVotedRound = null;
            if (address) {
                [eligible, lastVotedRound] = await Promise.all([
                    safeRead(publicClient, normalizedRoom, CONTRACTS.VotingRoom.abi, "isVoterEligible", [address]),
                    safeRead(publicClient, normalizedRoom, CONTRACTS.VotingRoom.abi, "lastVotedRound", [address]),
                ]);
            }

            setRoomInfo({
                address: normalizedRoom,
                name: name || "(room name unavailable)",
                status,
                voterCount: voterCount ?? 0n,
                candidates: formatCandidates(candidates),
                eligible,
                lastVotedRound,
            });
        } catch (err) {
            setRoomInfo(null);
            setMessage(err.shortMessage || err.message || "Gagal membaca room");
        } finally {
            setLoading(false);
        }
    }

    async function submitVote() {
        try {
            if (!walletClient) throw new Error("Connect wallet voter dulu");
            if (chain?.id !== CHAIN_ID) throw new Error(`Please switch to ${CHAIN_NAME} (${CHAIN_ID})`);
            if (!roomInfo?.address) throw new Error("Load room dulu");
            if (!selectedCandidate) throw new Error("Pilih kandidat dulu");

            setVoting(true);
            setMessage("");

            const hash = await walletClient.writeContract({
                address: roomInfo.address,
                abi: CONTRACTS.VotingRoom.abi,
                functionName: "vote",
                args: [BigInt(selectedCandidate.id)],
                chain,
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            if (receipt.status !== "success") throw new Error("Transaksi vote gagal");

            setMessage("Vote berhasil dikirim.");
            setRoomInfo((prev) => (prev ? { ...prev, hasJustVoted: true } : prev));
            window.setTimeout(() => {
                setMessage("");
            }, 5000);
        } catch (err) {
            setMessage(err.shortMessage || err.message || "Vote gagal");
        } finally {
            setVoting(false);
        }
    }

    const status = normalizeRoomStatus(roomInfo?.status);
    const hasVotedThisRound =
        roomInfo?.lastVotedRound != null &&
        roomInfo?.status?.[0] != null &&
        BigInt(roomInfo.lastVotedRound) === BigInt(roomInfo.status[0]);
    const canVote = isConnected && roomInfo && status.stateLabel === "Active" && roomInfo.eligible === true && !hasVotedThisRound && !roomInfo.hasJustVoted;

    return (
        <div className="voterBooth">
            <div className="dashboardHeader">
                <div>
                    <div className="panelTitle">Voter Booth</div>
                    <div className="hint">Masukkan room address, pilih kandidat, lalu kirim vote dari wallet voter yang sedang connect.</div>
                </div>
                <div className="mono small">{isConnected ? `Voter: ${address}` : "Wallet belum connect"}</div>
            </div>

            <div className="voterSearch">
                <input
                    className="input"
                    value={roomAddress}
                    onChange={(event) => setRoomAddress(event.target.value)}
                    placeholder="0x... room clone address"
                />
                <button className="btn action refreshBtn" onClick={loadRoom} disabled={loading}>
                    {loading ? "Loading..." : "Load Room"}
                </button>
            </div>

            {message && <div className={message.toLowerCase().includes("berhasil") ? "successBox" : "errorBox"}>{message}</div>}

            {roomInfo && (
                <div className="votePanel">
                    <div className="roomHeader">
                        <div>
                            <div className="roomName">{roomInfo.name}</div>
                            <div className="mono small">{roomInfo.address}</div>
                        </div>
                        <div className={`statusPill ${status.stateClass}`}>{status.stateLabel}</div>
                    </div>

                    <div className="roomFacts voterFacts">
                        <div>
                            <div className="label">Current Round</div>
                            <div className="factValue">{status.roundId}</div>
                        </div>
                        <div>
                            <div className="label">Eligibility</div>
                            <div className="factValue">{roomInfo.eligible == null ? "-" : roomInfo.eligible ? "Eligible" : "Not eligible"}</div>
                        </div>
                        <div>
                            <div className="label">Vote Status</div>
                            <div className="factValue">{hasVotedThisRound || roomInfo.hasJustVoted ? "Done" : "Open"}</div>
                        </div>
                    </div>

                    {!isConnected && <div className="emptyState">Connect wallet voter untuk mengirim vote.</div>}
                    {status.stateLabel !== "Active" && <div className="emptyState">Room belum aktif untuk voting.</div>}
                    {isConnected && roomInfo.eligible === false && <div className="emptyState">Address wallet ini belum terdaftar sebagai voter di room ini.</div>}
                    {(hasVotedThisRound || roomInfo.hasJustVoted) && <div className="successBox">Vote untuk round ini sudah tercatat.</div>}

                    {canVote && (
                        <>
                            <div className={`candidateVoteGrid ${selectedCandidate ? "hasSelection" : ""}`}>
                                {roomInfo.candidates.map((candidate) => {
                                    const selected = selectedCandidate?.id === candidate.id;
                                    return (
                                        <button
                                            key={candidate.id}
                                            className={`candidateVoteCard ${selected ? "selected" : ""}`}
                                            onClick={() => setSelectedCandidate(candidate)}
                                        >
                                            <div className="candidateId">#{candidate.id}</div>
                                            <div className="candidateVoteName">{candidate.name}</div>
                                            {selected && <div className="checkMark">✓</div>}
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedCandidate && (
                                <div className="voteConfirm">
                                    <button className="btn action" onClick={submitVote} disabled={voting}>
                                        {voting ? "Submitting..." : `Confirm Vote: ${selectedCandidate.name}`}
                                    </button>
                                    <button className="btn read" onClick={() => setSelectedCandidate(null)} disabled={voting}>
                                        Change Selection
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <div className="organizerNote">
                <div className="cardTitle">Switch Voter</div>
                <div className="cardBody">
                    Pergantian voter dilakukan dengan switch account di wallet atau disconnect lalu connect wallet voter lain.
                    Admin hanya perlu mendaftarkan address voter dan memastikan tiap voter punya native coin untuk gas.
                </div>
            </div>
        </div>
    );
}

function PublicAuditDashboard({ publicClient }) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [error, setError] = useState("");

    async function refreshDashboard() {
        try {
            if (!publicClient) throw new Error("Public client not ready");
            setLoading(true);
            setError("");

            const roomCount = await publicClient.readContract({
                address: CONTRACTS.RoomFactory.address,
                abi: CONTRACTS.RoomFactory.abi,
                functionName: "getRoomCount",
            });

            const roomAddresses = await Promise.all(
                Array.from({ length: Number(roomCount) }, (_, index) =>
                    publicClient.readContract({
                        address: CONTRACTS.RoomFactory.address,
                        abi: CONTRACTS.RoomFactory.abi,
                        functionName: "getRoomAt",
                        args: [BigInt(index)],
                    })
                )
            );

            const roomRows = await Promise.all(
                roomAddresses.map(async (roomAddress) => {
                    const [admin, name, voterCount, status, versionCount] = await Promise.all([
                        safeRead(publicClient, CONTRACTS.RoomFactory.address, CONTRACTS.RoomFactory.abi, "roomOwner", [roomAddress]),
                        safeRead(publicClient, roomAddress, CONTRACTS.VotingRoom.abi, "roomName", []),
                        safeRead(publicClient, roomAddress, CONTRACTS.VotingRoom.abi, "getVoterCount", []),
                        safeRead(publicClient, roomAddress, CONTRACTS.VotingRoom.abi, "getCurrentRoundStatus", []),
                        safeRead(publicClient, CONTRACTS.VotingResultCenter.address, CONTRACTS.VotingResultCenter.abi, "getRoomVersionCount", [roomAddress]),
                    ]);

                    const versions = await loadRoomVersions(publicClient, roomAddress, Number(versionCount || 0n));

                    return {
                        room: roomAddress,
                        admin: admin || "0x0000000000000000000000000000000000000000",
                        name: name || "(name unavailable)",
                        voterCount: voterCount ?? 0n,
                        status,
                        versionCount: versionCount ?? 0n,
                        versions,
                    };
                })
            );

            setRooms(roomRows);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.shortMessage || err.message || "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refreshDashboard();
        const timer = window.setInterval(refreshDashboard, 15000);
        return () => window.clearInterval(timer);
    }, [publicClient]);

    const totalVersions = rooms.reduce((sum, room) => sum + Number(room.versionCount || 0n), 0);
    const totalVoters = rooms.reduce((sum, room) => sum + Number(room.voterCount || 0n), 0);

    return (
        <div className="dashboard">
            <div className="dashboardHeader">
                <div>
                    <div className="panelTitle">Public Audit Dashboard</div>
                    <div className="hint">
                        Menampilkan semua room dari RoomFactory. Hasil round diambil hanya dari data confirmed di VotingResultCenter.
                    </div>
                </div>
                <button className="btn action refreshBtn" onClick={refreshDashboard} disabled={loading}>
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {error && <div className="errorBox">{error}</div>}

            <div className="statGrid">
                <StatCard label="Rooms" value={rooms.length} />
                <StatCard label="Total Voters" value={totalVoters} />
                <StatCard label="Submitted Versions" value={totalVersions} />
                <StatCard label="Last Updated" value={lastUpdated ? lastUpdated.toLocaleTimeString() : "-"} />
            </div>

            {rooms.length === 0 && !loading ? (
                <div className="emptyState">
                    Belum ada room yang terdaftar di RoomFactory.
                </div>
            ) : (
                <div className="roomList">
                    {rooms.map((room) => (
                        <RoomAuditCard key={room.room} room={room} />
                    ))}
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="statCard">
            <div className="label">{label}</div>
            <div className="statValue">{String(value)}</div>
        </div>
    );
}

function RoomAuditCard({ room }) {
    const status = normalizeRoomStatus(room.status);

    return (
        <div className="auditRoom">
            <div className="roomHeader">
                <div>
                    <div className="roomName">{room.name}</div>
                    <div className="mono small">{room.room}</div>
                </div>
                <div className={`statusPill ${status.stateClass}`}>{status.stateLabel}</div>
            </div>

            <div className="roomFacts">
                <div>
                    <div className="label">Admin</div>
                    <div className="mono small">{room.admin}</div>
                </div>
                <div>
                    <div className="label">Voters</div>
                    <div className="factValue">{String(room.voterCount)}</div>
                </div>
                <div>
                    <div className="label">Current Round</div>
                    <div className="factValue">{status.roundId}</div>
                </div>
                <div>
                    <div className="label">Confirmed Versions</div>
                    <div className="factValue">{String(room.versionCount)}</div>
                </div>
            </div>

            <div className="sectionTitle">Confirmed Results</div>
            {room.versions.length === 0 ? (
                <div className="hint">Belum ada version hasil untuk room ini.</div>
            ) : (
                room.versions.map((version) => <RoundResult key={`${room.room}-${version.version}`} version={version} />)
            )}
        </div>
    );
}

function RoundResult({ version }) {
    const totalVotes = version.candidates.reduce((sum, item) => sum + Number(item.voteCount), 0);

    return (
        <div className="roundResult">
            <div className="roundTitle">
                <span>Round {version.roundId}</span>
                <span>Version {version.version}</span>
            </div>
            <div className="resultMeta">
                <span>Total voter: {version.totalVoter}</span>
                <span>Votes: {totalVotes}</span>
                <span>Golput: {version.totalGolput}</span>
                <span>Submitted: {formatUnix(version.submittedAt)}</span>
            </div>
            <div className="mono small hashLine">{version.historyHash}</div>
            <div className="candidateList">
                {version.candidates.map((candidate) => (
                    <div key={`${version.version}-${candidate.id}`} className="candidateRow">
                        <span>{candidate.name}</span>
                        <span className="mono">{candidate.voteCount}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

async function safeRead(publicClient, address, abi, functionName, args) {
    try {
        return await publicClient.readContract({
            address,
            abi,
            functionName,
            args,
        });
    } catch {
        return null;
    }
}

async function loadRoomVersions(publicClient, roomAddress, versionCount) {
    const versions = [];

    for (let version = 1; version <= versionCount; version += 1) {
        const [summary, candidates] = await Promise.all([
            safeRead(
                publicClient,
                CONTRACTS.VotingResultCenter.address,
                CONTRACTS.VotingResultCenter.abi,
                "getRoomVersionSummary",
                [roomAddress, BigInt(version)]
            ),
            safeRead(
                publicClient,
                CONTRACTS.VotingResultCenter.address,
                CONTRACTS.VotingResultCenter.abi,
                "getRoomVersionCandidates",
                [roomAddress, BigInt(version)]
            ),
        ]);

        if (!summary || !candidates) continue;

        versions.push({
            version,
            roundId: stringifyNumberish(summary[0]),
            admin: summary[1],
            totalVoter: stringifyNumberish(summary[2]),
            totalGolput: stringifyNumberish(summary[3]),
            startAt: stringifyNumberish(summary[4]),
            stopAt: stringifyNumberish(summary[5]),
            historyHash: summary[6],
            submittedAt: stringifyNumberish(summary[7]),
            candidates: candidates[0].map((id, index) => ({
                id: stringifyNumberish(id),
                name: candidates[1][index],
                voteCount: stringifyNumberish(candidates[2][index]),
            })),
        });
    }

    return versions.reverse();
}

function normalizeRoomStatus(status) {
    if (!status) {
        return {
            roundId: "-",
            stateLabel: "Unknown",
            stateClass: "unknown",
        };
    }

    const roundId = stringifyNumberish(status[0]);
    const state = Number(status[1]);
    const readyToStart = Boolean(status[2]);

    if (state === 1) {
        return {
            roundId,
            stateLabel: "Active",
            stateClass: "activeState",
        };
    }

    return {
        roundId,
        stateLabel: readyToStart ? "Inactive / Ready" : "Inactive / Closed",
        stateClass: readyToStart ? "readyState" : "closedState",
    };
}

function stringifyNumberish(value) {
    return typeof value === "bigint" ? value.toString() : String(value ?? "0");
}

function formatUnix(value) {
    const seconds = Number(value);
    if (!seconds) return "-";
    return new Date(seconds * 1000).toLocaleString();
}

function formatCandidates(candidates) {
    if (!candidates) return [];

    const ids = candidates[0] || [];
    const names = candidates[1] || [];

    return ids.map((id, index) => ({
        id: stringifyNumberish(id),
        name: names[index] || `(candidate ${stringifyNumberish(id)})`,
    }));
}

function isEthAddress(value) {
    return /^0x[0-9a-fA-F]{40}$/.test(String(value).trim());
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
