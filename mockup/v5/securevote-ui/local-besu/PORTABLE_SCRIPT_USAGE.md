# Portable Local Besu QBFT Script

Copy this file into any repository:

```txt
setup-besu-qbft-local.ps1
```

Then run it from PowerShell.

## What The Script Creates

By default, it creates a local Besu folder named:

```txt
.\besu-qbft-local
```

inside your current terminal directory.

It prepares:

- QBFT genesis config
- 5 validator keys
- `config/genesis.json`
- prefunded `alloc` from `testing-eoas.json`
- `docker-compose.yml`

## Basic Usage

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\setup-besu-qbft-local.ps1 `
  -TestingEoaFile ".\testing-eoas.json" `
  -AdminPrivateKey "0xYOUR_ADMIN_PRIVATE_KEY"
```

If you want a custom output folder:

```powershell
.\setup-besu-qbft-local.ps1 `
  -BesuDir ".\my-besu-network" `
  -TestingEoaFile ".\testing-eoas.json" `
  -AdminPrivateKey "0xYOUR_ADMIN_PRIVATE_KEY"
```

If you already know the admin address:

```powershell
.\setup-besu-qbft-local.ps1 `
  -TestingEoaFile ".\testing-eoas.json" `
  -AdminAddress "0xYOUR_ADMIN_ADDRESS"
```

## Start Besu

```powershell
cd .\besu-qbft-local
docker compose up -d
```

If you used `-BesuDir`, `cd` into that folder instead.

## Verify

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8545 -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Expected:

```txt
0x539
```

## Stop

```powershell
docker compose down
```

## Regenerate From Zero

```powershell
.\setup-besu-qbft-local.ps1 `
  -TestingEoaFile ".\testing-eoas.json" `
  -AdminPrivateKey "0xYOUR_ADMIN_PRIVATE_KEY" `
  -Reset
```

Use the same `-BesuDir` as before if you used a custom output folder.
