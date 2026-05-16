# Local Besu QBFT Setup

This guide is portable. It does not depend on a fixed directory.

Target:

- RPC: `http://127.0.0.1:8545`
- Chain ID: `1337`
- Consensus: QBFT
- Validator count: 5

## 1. Prerequisites

Install and start Docker Desktop.

Verify in PowerShell:

```powershell
docker --version
docker compose version
```

## 2. Script To Copy To Another Repo

Copy this script to your other repository:

```txt
local-besu/setup-besu-qbft-local.ps1
```

The script creates `.\besu-qbft-local` in the directory where you run it, unless you pass `-BesuDir`.

It prepares:

- `qbftConfigFile.json`
- 5 QBFT validator keys
- `config\genesis.json`
- prefunded `alloc` entries from `testing-eoas.json`
- `docker-compose.yml`

## 3. Prepare Testing EOAs

The script accepts a `testing-eoas.json` file with this shape:

```json
{
  "accounts": [
    {
      "address": "0x...",
      "privateKey": "0x..."
    }
  ]
}
```

If your repo has a generator, run it first. In this repo:

```powershell
cd .\evaluation
npm install
npm run generate:eoa
```

## 4. Run Setup

From the folder where `setup-besu-qbft-local.ps1` exists:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\setup-besu-qbft-local.ps1 `
  -TestingEoaFile ".\testing-eoas.json" `
  -AdminPrivateKey "0xYOUR_ADMIN_PRIVATE_KEY"
```

With a custom output folder:

```powershell
.\setup-besu-qbft-local.ps1 `
  -BesuDir ".\my-besu-network" `
  -TestingEoaFile ".\testing-eoas.json" `
  -AdminPrivateKey "0xYOUR_ADMIN_PRIVATE_KEY"
```

With an explicit admin address:

```powershell
.\setup-besu-qbft-local.ps1 `
  -TestingEoaFile ".\testing-eoas.json" `
  -AdminAddress "0xYOUR_ADMIN_ADDRESS"
```

## 5. Start Besu

Default output folder:

```powershell
cd .\besu-qbft-local
docker compose up -d
```

Custom output folder:

```powershell
cd .\my-besu-network
docker compose up -d
```

Check:

```powershell
docker compose ps
docker compose logs node1 --tail=80
```

## 6. Verify RPC

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8545 -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Expected:

```txt
0x539
```

Check block number:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8545 -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Check validators:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8545 -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"qbft_getValidatorsByBlockNumber","params":["latest"],"id":1}'
```

## 7. Stop or Reset

Stop temporarily:

```powershell
docker compose down
```

Regenerate from zero:

```powershell
cd ..
.\setup-besu-qbft-local.ps1 `
  -TestingEoaFile ".\testing-eoas.json" `
  -AdminPrivateKey "0xYOUR_ADMIN_PRIVATE_KEY" `
  -Reset
```

Use the same `-BesuDir` if you used a custom output folder.

Reset deletes deployed contracts, rooms, votes, and result history.
