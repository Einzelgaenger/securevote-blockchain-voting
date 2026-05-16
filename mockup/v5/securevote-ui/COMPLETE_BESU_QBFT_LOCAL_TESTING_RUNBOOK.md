# Complete Local Besu QBFT Testing Runbook

This runbook avoids hardcoded directories. Commands assume you are in the repository that contains the scripts.

## 1. Prepare Testing EOAs

If your repo has the SecureVote evaluation generator:

```powershell
cd .\evaluation
npm install
npm run generate:eoa
cd ..
```

Expected file:

```txt
.\evaluation\data\testing-eoas.json
```

## 2. Copy Portable Script

Copy this script into your target repo:

```txt
local-besu/setup-besu-qbft-local.ps1
```

## 3. Setup Besu QBFT

From your target repo:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\local-besu\setup-besu-qbft-local.ps1 `
  -TestingEoaFile ".\evaluation\data\testing-eoas.json" `
  -AdminPrivateKey "0xYOUR_ADMIN_PRIVATE_KEY"
```

This creates:

```txt
.\besu-qbft-local
```

If you want a custom folder:

```powershell
.\local-besu\setup-besu-qbft-local.ps1 `
  -BesuDir ".\my-besu-network" `
  -TestingEoaFile ".\evaluation\data\testing-eoas.json" `
  -AdminPrivateKey "0xYOUR_ADMIN_PRIVATE_KEY"
```

## 4. Start Besu

```powershell
cd .\besu-qbft-local
docker compose up -d
```

If you used `-BesuDir`, `cd` into that folder instead.

Check:

```powershell
docker compose ps
docker compose logs node1 --tail=80
```

## 5. Verify RPC

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8545 -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Expected:

```txt
0x539
```

## 6. MetaMask

Add custom network:

```txt
Network name: Besu QBFT Local
RPC URL: http://127.0.0.1:8545
Chain ID: 1337
Currency symbol: ETH
```

Import the admin/testing private key from `testing-eoas.json`.

## 7. Deploy Contracts

Deploy:

```txt
contracts/v2/VotingRoom.sol
contracts/v2/RoomFactory.sol
contracts/v2/VotingResultCenter.sol
```

Order:

1. `VotingRoom`
2. `RoomFactory(VotingRoom implementation address)`
3. `VotingResultCenter(RoomFactory address)`

Then update:

```txt
frontend/src/config/deployed-contracts.json
```

Use:

```json
"rpcUrl": "http://127.0.0.1:8545"
```

## 8. Run Frontend

```powershell
cd .\frontend
npm install
npm run dev
```

## 9. Run Evaluations

Network:

```powershell
cd .\evaluation
npm install
npm run network
```

Smart contract:

```powershell
npm run smart-contract
```

## 10. Stop or Reset

Stop:

```powershell
cd .\besu-qbft-local
docker compose down
```

Reset:

```powershell
cd ..
.\local-besu\setup-besu-qbft-local.ps1 `
  -TestingEoaFile ".\evaluation\data\testing-eoas.json" `
  -AdminPrivateKey "0xYOUR_ADMIN_PRIVATE_KEY" `
  -Reset
```
