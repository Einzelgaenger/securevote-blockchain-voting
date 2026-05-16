# Local Besu QBFT Setup

This guide runs the 5-validator Besu QBFT network on your local PC instead of the remote droplet.

Target:

- RPC: `http://127.0.0.1:8545`
- Chain ID: `1337`
- Consensus: QBFT
- Validator count: 5

## 1. Prerequisites

Use one of these:

- Windows + Docker Desktop
- Windows + WSL2 Ubuntu + Docker Engine
- Linux + Docker Engine

Verify:

```bash
docker --version
docker compose version
```

If your Docker uses the old Compose binary, use `docker-compose` instead of `docker compose`.

## 2. Create Local Besu Folder

Recommended location:

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

## 3. Generate Testing EOAs

From this repo:

```powershell
cd C:\Users\LEGION\Documents\Binus\Thesis\securevote-branches\05162026\securevote-blockchain-voting\mockup\v5\securevote-ui\evaluation
npm install
npm run generate:eoa
```

This creates:

```txt
evaluation/data/testing-eoas.json
```

Copy it into your local Besu folder:

```powershell
copy C:\Users\LEGION\Documents\Binus\Thesis\securevote-branches\05162026\securevote-blockchain-voting\mockup\v5\securevote-ui\evaluation\data\testing-eoas.json C:\Users\LEGION\Documents\Binus\Thesis\besu-qbft-local\securevote-besu-qbft\testing-eoas.json
```

## 4. Generate QBFT Genesis

Inside the local Besu folder, create `qbftConfigFile.json`:

```bash
cat > qbftConfigFile.json <<'JSON'
{
  "genesis": {
    "config": {
      "chainId": 1337,
      "berlinBlock": 0,
      "qbft": {
        "blockperiodseconds": 2,
        "epochlength": 30000,
        "requesttimeoutseconds": 10
      }
    },
    "nonce": "0x0",
    "timestamp": "0x58ee40ba",
    "gasLimit": "0x1fffffffffffff",
    "difficulty": "0x1",
    "mixHash": "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365",
    "coinbase": "0x0000000000000000000000000000000000000000",
    "alloc": {}
  },
  "blockchain": {
    "nodes": {
      "generate": true,
      "count": 5
    }
  }
}
JSON
```

Generate network files:

```bash
docker run --rm \
  -v "$PWD:/work" \
  hyperledger/besu:latest \
  operator generate-blockchain-config \
  --config-file=/work/qbftConfigFile.json \
  --to=/work/networkFiles \
  --private-key-file-name=key
```

Copy genesis:

```bash
cp networkFiles/genesis.json config/genesis.json
```

Copy validator keys one by one:

```bash
KEY_DIRS=($(find networkFiles/keys -mindepth 1 -maxdepth 1 -type d | sort))
for i in 1 2 3 4 5; do
  cp "${KEY_DIRS[$((i-1))]}/key" "nodekeys/node$i/key"
done
```

Check:

```bash
tree nodekeys
```

## 5. Add EOA Balances to Genesis

Find the admin address from `testing-eoas.json`. If your `ADMIN_PRIVATE_KEY` is the first generated EOA:

```bash
ADMIN_ADDRESS=$(jq -r '.accounts[0].address' testing-eoas.json)
BALANCE=0x3635C9ADC5DEA00000
```

If you use another admin address:

```bash
ADMIN_ADDRESS=0xYourAdminAddress
BALANCE=0x3635C9ADC5DEA00000
```

Inject admin + all testing EOAs:

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

Expected:

- `30` if admin is one of the generated EOAs.
- `31` if admin is separate.

## 6. Create Docker Compose

Create `docker-compose.yml` in the local Besu folder:

```yaml
services:
  node1:
    image: hyperledger/besu:latest
    environment:
      - JAVA_OPTS=-Xms256m -Xmx512m
    command:
      - --data-path=/data
      - --genesis-file=/config/genesis.json
      - --node-private-key-file=/keys/key
      - --rpc-http-enabled=true
      - --rpc-http-host=0.0.0.0
      - --rpc-http-port=8545
      - --rpc-http-api=ETH,NET,WEB3,QBFT,ADMIN,DEBUG,TXPOOL
      - --rpc-http-cors-origins=*
      - --host-allowlist=*
      - --p2p-host=0.0.0.0
      - --p2p-port=30303
      - --min-gas-price=0
    ports:
      - "8545:8545"
      - "30303:30303/tcp"
      - "30303:30303/udp"
    volumes:
      - ./config:/config
      - ./nodes/node1/data:/data
      - ./nodekeys/node1:/keys

  node2:
    image: hyperledger/besu:latest
    environment:
      - JAVA_OPTS=-Xms256m -Xmx512m
    command: ["--data-path=/data", "--genesis-file=/config/genesis.json", "--node-private-key-file=/keys/key", "--rpc-http-enabled=true", "--rpc-http-host=0.0.0.0", "--rpc-http-port=8545", "--rpc-http-api=ETH,NET,WEB3,QBFT,ADMIN,DEBUG,TXPOOL", "--rpc-http-cors-origins=*", "--host-allowlist=*", "--p2p-host=0.0.0.0", "--p2p-port=30303", "--min-gas-price=0"]
    volumes: ["./config:/config", "./nodes/node2/data:/data", "./nodekeys/node2:/keys"]

  node3:
    image: hyperledger/besu:latest
    environment:
      - JAVA_OPTS=-Xms256m -Xmx512m
    command: ["--data-path=/data", "--genesis-file=/config/genesis.json", "--node-private-key-file=/keys/key", "--rpc-http-enabled=true", "--rpc-http-host=0.0.0.0", "--rpc-http-port=8545", "--rpc-http-api=ETH,NET,WEB3,QBFT,ADMIN,DEBUG,TXPOOL", "--rpc-http-cors-origins=*", "--host-allowlist=*", "--p2p-host=0.0.0.0", "--p2p-port=30303", "--min-gas-price=0"]
    volumes: ["./config:/config", "./nodes/node3/data:/data", "./nodekeys/node3:/keys"]

  node4:
    image: hyperledger/besu:latest
    environment:
      - JAVA_OPTS=-Xms256m -Xmx512m
    command: ["--data-path=/data", "--genesis-file=/config/genesis.json", "--node-private-key-file=/keys/key", "--rpc-http-enabled=true", "--rpc-http-host=0.0.0.0", "--rpc-http-port=8545", "--rpc-http-api=ETH,NET,WEB3,QBFT,ADMIN,DEBUG,TXPOOL", "--rpc-http-cors-origins=*", "--host-allowlist=*", "--p2p-host=0.0.0.0", "--p2p-port=30303", "--min-gas-price=0"]
    volumes: ["./config:/config", "./nodes/node4/data:/data", "./nodekeys/node4:/keys"]

  node5:
    image: hyperledger/besu:latest
    environment:
      - JAVA_OPTS=-Xms256m -Xmx512m
    command: ["--data-path=/data", "--genesis-file=/config/genesis.json", "--node-private-key-file=/keys/key", "--rpc-http-enabled=true", "--rpc-http-host=0.0.0.0", "--rpc-http-port=8545", "--rpc-http-api=ETH,NET,WEB3,QBFT,ADMIN,DEBUG,TXPOOL", "--rpc-http-cors-origins=*", "--host-allowlist=*", "--p2p-host=0.0.0.0", "--p2p-port=30303", "--min-gas-price=0"]
    volumes: ["./config:/config", "./nodes/node5/data:/data", "./nodekeys/node5:/keys"]
```

## 7. Start and Stop

Start:

```bash
docker compose up -d
```

Check:

```bash
docker compose ps
docker compose logs node1 --tail=80
```

Stop temporarily:

```bash
docker compose down
```

Reset chain from zero:

```bash
docker compose down
rm -rf nodes/node*/data/*
```

Use reset only before you care about deployed contracts or voting data.

## 8. Verify RPC

```bash
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Expected:

```txt
0x539
```

Check block:

```bash
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Check validators:

```bash
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"qbft_getValidatorsByBlockNumber","params":["latest"],"id":1}'
```

## 9. MetaMask

Add custom network:

- Network name: `Besu QBFT Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `1337`
- Currency symbol: `ETH`

Import testing/admin private keys from:

```txt
mockup/v5/securevote-ui/evaluation/data/testing-eoas.json
```

