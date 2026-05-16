# Complete Local Besu QBFT Testing Runbook

Dokumen ini adalah alur lengkap dari nol sampai selesai testing untuk SecureVote v5 dengan Besu QBFT berjalan di local PC.

Target:

- Network: local Besu private network
- Consensus: QBFT
- Validator: 5 nodes
- Chain ID: `1337`
- RPC: `http://127.0.0.1:8545`
- Frontend folder: `mockup/v5/securevote-ui/frontend`
- Evaluation folder: `mockup/v5/securevote-ui/evaluation`
- Local Besu folder example: `C:\Users\LEGION\Documents\Binus\Thesis\besu-qbft-local\securevote-besu-qbft`

## 0. Read First

```txt
mockup/v5/securevote-ui/README_BESU_LOCAL_V5.md
mockup/v5/securevote-ui/docs/besu-qbft-local-setup.md
mockup/v5/securevote-ui/docs/network-evaluation.md
mockup/v5/securevote-ui/docs/smart-contract-evaluation.md
mockup/v5/securevote-ui/frontend/src/config/deployed-contracts.json
mockup/v5/securevote-ui/evaluation/.env.example
mockup/v5/securevote-ui/frontend/.env.example
```

## 1. Generate Testing EOAs

```powershell
cd C:\Users\LEGION\Documents\Binus\Thesis\securevote-branches\05162026\securevote-blockchain-voting\mockup\v5\securevote-ui\evaluation
npm install
npm run generate:eoa
```

Output:

```txt
mockup/v5/securevote-ui/evaluation/data/testing-eoas.json
```

The file contains:

- `address`
- `privateKey`
- `remixImport`

Use these accounts only for testing.

## 2. Configure Evaluation Env

Edit:

```txt
mockup/v5/securevote-ui/evaluation/.env
```

Example:

```env
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=1337
ADMIN_PRIVATE_KEY=0xYOUR_ADMIN_PRIVATE_KEY
TEST_EOA_COUNT=30
VOTER_COUNT=30
CANDIDATE_COUNT=3
FAULT_TOLERANCE_MANUAL=false
```

The admin account must be funded in genesis.

## 3. Create Local Besu Folder

PowerShell:

```powershell
mkdir C:\Users\LEGION\Documents\Binus\Thesis\besu-qbft-local\securevote-besu-qbft
cd C:\Users\LEGION\Documents\Binus\Thesis\besu-qbft-local\securevote-besu-qbft
```

If using WSL/Linux:

```bash
mkdir -p ~/besu-qbft-local/securevote-besu-qbft
cd ~/besu-qbft-local/securevote-besu-qbft
```

Create folders:

```bash
mkdir -p config nodes nodekeys logs
for i in 1 2 3 4 5; do
  mkdir -p nodes/node$i/data nodekeys/node$i
done
```

Copy testing EOA file into the local Besu folder:

```powershell
copy C:\Users\LEGION\Documents\Binus\Thesis\securevote-branches\05162026\securevote-blockchain-voting\mockup\v5\securevote-ui\evaluation\data\testing-eoas.json C:\Users\LEGION\Documents\Binus\Thesis\besu-qbft-local\securevote-besu-qbft\testing-eoas.json
```

## 4. Generate QBFT Genesis

Follow the full commands in:

```txt
mockup/v5/securevote-ui/docs/besu-qbft-local-setup.md
```

Summary:

1. Create `qbftConfigFile.json`.
2. Run Besu operator:

```bash
docker run --rm \
  -v "$PWD:/work" \
  hyperledger/besu:latest \
  operator generate-blockchain-config \
  --config-file=/work/qbftConfigFile.json \
  --to=/work/networkFiles \
  --private-key-file-name=key
```

3. Copy `networkFiles/genesis.json` to `config/genesis.json`.
4. Copy each generated validator key to `nodekeys/node1/key` through `nodekeys/node5/key`.

## 5. Prefund Admin and EOAs

Inside local Besu folder:

```bash
ADMIN_ADDRESS=0xYourAdminAddress
BALANCE=0x3635C9ADC5DEA00000
```

Inject balances:

```bash
jq --arg balance "$BALANCE" --arg admin "$ADMIN_ADDRESS" --slurpfile eoas testing-eoas.json '
  .alloc = (
    (.alloc // {}) +
    {($admin): {balance: $balance}} +
    (reduce $eoas[0].accounts[].address as $addr ({}; . + {($addr): {balance: $balance}}))
  )
' config/genesis.json > config/genesis.tmp.json

mv config/genesis.tmp.json config/genesis.json
```

Check:

```bash
jq '.alloc | length' config/genesis.json
```

Expected `30` if admin is one of testing EOAs, or `31` if admin is separate.

## 6. Start Local Besu

Create `docker-compose.yml` as shown in:

```txt
docs/besu-qbft-local-setup.md
```

Start:

```bash
docker compose up -d
```

Check:

```bash
docker compose ps
docker compose logs node1 --tail=80
```

Verify RPC:

```bash
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Expected:

```txt
0x539
```

## 7. MetaMask

Add custom network:

```txt
Network name: Besu QBFT Local
RPC URL: http://127.0.0.1:8545
Chain ID: 1337
Currency symbol: ETH
```

Import the admin private key from:

```txt
mockup/v5/securevote-ui/evaluation/data/testing-eoas.json
```

## 8. Deploy Contracts

Deploy these contracts to local Besu:

```txt
contracts/v2/VotingRoom.sol
contracts/v2/RoomFactory.sol
contracts/v2/VotingResultCenter.sol
```

Deploy order:

1. Deploy `VotingRoom`.
2. Deploy `RoomFactory` with constructor argument `VotingRoom implementation address`.
3. Deploy `VotingResultCenter` with constructor argument `RoomFactory address`.

You can deploy with Remix:

1. Open Remix.
2. Use Injected Provider - MetaMask.
3. Make sure MetaMask is on `Besu QBFT Local`.
4. Compile with Solidity `0.8.20` or compatible.
5. Deploy in the order above.

## 9. Update Frontend Contract Addresses

Edit:

```txt
mockup/v5/securevote-ui/frontend/src/config/deployed-contracts.json
```

Example:

```json
{
    "network": {
        "name": "Besu QBFT Private",
        "chainId": 1337,
        "rpcUrl": "http://127.0.0.1:8545"
    },
    "RoomFactory": {
        "address": "0xROOM_FACTORY_ADDRESS"
    },
    "VotingRoom": {
        "address": "0xVOTING_ROOM_IMPLEMENTATION_ADDRESS",
        "note": "Implementation/template address, not a room clone."
    },
    "VotingResultCenter": {
        "address": "0xVOTING_RESULT_CENTER_ADDRESS"
    }
}
```

## 10. Run Frontend

```powershell
cd C:\Users\LEGION\Documents\Binus\Thesis\securevote-branches\05162026\securevote-blockchain-voting\mockup\v5\securevote-ui\frontend
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

## 11. Run Network Evaluation

```powershell
cd C:\Users\LEGION\Documents\Binus\Thesis\securevote-branches\05162026\securevote-blockchain-voting\mockup\v5\securevote-ui\evaluation
npm install
npm run network
```

Output:

```txt
evaluation/results/network-evaluation-result-[ddmmyyyy]/network-evaluation.json
```

## 12. Run Smart Contract Evaluation

```powershell
cd C:\Users\LEGION\Documents\Binus\Thesis\securevote-branches\05162026\securevote-blockchain-voting\mockup\v5\securevote-ui\evaluation
npm run smart-contract
```

The script will:

1. Create or reuse a saved room.
2. Register voters.
3. Add candidates.
4. Start voting.
5. Send concurrent vote transactions.
6. Stop voting.
7. Submit round history.
8. Restart the room for the next run.

Output:

```txt
evaluation/results/smart-contract-evaluation-result-[ddmmyyyy]/smart-contract-evaluation.json
```

## 13. Stop Local Besu

Temporarily stop:

```bash
docker compose down
```

Reset from zero:

```bash
docker compose down
rm -rf nodes/node*/data/*
```

Reset deletes deployed contracts, rooms, votes, and result history.

## 14. Final Checklist

- Local Besu RPC returns `0x539`.
- Block number increases.
- Validator list returns 5 validators.
- MetaMask can connect to `Besu QBFT Local`.
- Admin account has balance.
- Contract addresses are set in `deployed-contracts.json`.
- Frontend public audit dashboard opens.
- Network evaluation result is saved.
- Smart contract evaluation result is saved.

