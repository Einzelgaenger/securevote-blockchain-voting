# Evaluation Plan - Besu QBFT Local 5 Node

Dokumen ini adalah checklist pengujian untuk jaringan Besu QBFT lokal 5 node.

## 1. Network Connectivity

Command:

```powershell
.\check-network.ps1
```

Expected:

- `eth_chainId = 0x539`
- `net_peerCount` sekitar `0x4`
- validator count `5`

## 2. Block Production

Command:

```powershell
Invoke-RestMethod -Uri http://localhost:8545 -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
Start-Sleep -Seconds 10
Invoke-RestMethod -Uri http://localhost:8545 -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":2}'
```

Expected: block number kedua lebih besar. Dengan `blockperiodseconds = 2`, kenaikan ideal sekitar 5 block dalam 10 detik.

## 3. Validator Verification

Command:

```powershell
Invoke-RestMethod -Uri http://localhost:8545 -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"qbft_getValidatorsByBlockNumber","params":["latest"],"id":1}'
```

Expected: 5 validator address.

## 4. Fault Tolerance

Command:

```powershell
.\fault-tolerance-test.ps1
```

Expected:

- Setelah `besu-node5` dimatikan, block tetap bertambah.
- 5-node QBFT secara praktis diuji untuk toleransi 1 faulty validator.

Optional:

```powershell
.\fault-tolerance-test.ps1 -RunTwoNodeFailure
```

Expected:

- Saat 2 validator mati, finality kemungkinan berhenti atau tidak stabil.

## 5. Smart Contract Deployment

Deploy contract SecureVote ke:

```txt
RPC URL: http://127.0.0.1:8545
Chain ID: 1337
```

Expected:

- Deployment transaction `status = 0x1`.
- Contract address tercatat.
- Gas used tercatat.

## 6. SecureVote App Test

Dari `APP_DIR`:

```powershell
cd .\frontend
npm run dev
```

Manual expected:

- MetaMask connect ke Besu local.
- Admin dapat create room.
- Admin dapat add voters dan candidates.
- Voter dapat vote.
- Admin dapat stop voting.
- Admin dapat submit history.
- Public audit/result center menampilkan version history.

## 7. Automated App Evaluation

Dari `APP_DIR`:

```powershell
cd .\evaluation
npm run network
npm run smart-contract
```

Expected:

- Network evaluation PASS.
- Smart contract evaluation membuat/reuse room, menjalankan vote, submit history, dan menyimpan result JSON.

## Result Table

| Test | Expected | Actual | Status |
| --- | --- | --- | --- |
| Chain ID | `0x539` | | |
| Peer count | sekitar `0x4` | | |
| Block production | block naik | | |
| Validator count | 5 | | |
| Stop 1 validator | block tetap naik | | |
| Stop 2 validators | kemungkinan halt/tidak stabil | | |
| Contract deployment | tx status success | | |
| App create room | success | | |
| App voting | success | | |
| Public audit history | version bertambah | | |
| `npm run network` | PASS/result file | | |
| `npm run smart-contract` | PASS/result file | | |

