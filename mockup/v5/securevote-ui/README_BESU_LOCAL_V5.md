# SecureVote UI v5 - Local Besu QBFT

This folder is copied from `mockup/v4/securevote-ui` and changed to target a Besu QBFT network running on the local PC instead of a remote droplet.

## Main changes

- Frontend default RPC is `http://127.0.0.1:8545`.
- Evaluation default RPC is `http://127.0.0.1:8545`.
- Contract addresses are still centralized in `frontend/src/config/deployed-contracts.json`.
- Local Besu setup docs are in `docs/besu-qbft-local-setup.md`.
- Evaluation scripts remain in `evaluation/scripts`.

## Local PC Requirements

- Windows CMD or PowerShell.
- Docker Desktop on Windows.
- Recommended RAM: 8 GB or more.
- Free ports:
  - `8545` for RPC
  - `30303` for node1 P2P

## Run Local Besu

Read:

```txt
docs/besu-qbft-local-setup.md
```

By default, the portable script creates a local Besu working directory named:

```txt
.\besu-qbft-local
```

Portable files for another repository:

```txt
local-besu/setup-besu-qbft-local.ps1
local-besu/PORTABLE_SCRIPT_USAGE.md
```

## Update Contract Addresses

After deploying contracts to local Besu, update:

```txt
frontend/src/config/deployed-contracts.json
```

Fill:

- `RoomFactory.address`
- `VotingRoom.address`
- `VotingResultCenter.address`

## Run Frontend

```bash
cd mockup/v5/securevote-ui/frontend
npm install
npm run dev
```

## Run Evaluations

```bash
cd mockup/v5/securevote-ui/evaluation
npm install
npm run generate:eoa
npm run network
npm run smart-contract
```

