# SecureVote Besu QBFT Setup

Target server:

- Host: `165.227.107.109`
- Consensus: QBFT
- Validator count: 5
- Public RPC: `http://165.227.107.109:8545`
- Chain ID: `1337`

## 1. Server preparation

Run on the droplet:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg ufw jq
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo ufw allow OpenSSH
sudo ufw allow 8545/tcp
sudo ufw allow 8546/tcp
sudo ufw allow 30303/tcp
sudo ufw allow 30303/udp
sudo ufw --force enable
```

If you already ran `sudo apt install -y docker.io docker-compose-plugin ufw jq` and got:

```txt
E: Unable to locate package docker-compose-plugin
```

that means the default Ubuntu repository on the droplet does not provide the Compose v2 plugin package. Use the Docker official apt repository commands above, then verify:

```bash
docker --version
docker compose version
```

Fallback if you only want the Ubuntu repository packages:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose ufw jq
sudo systemctl enable --now docker
```

With this fallback, use `docker-compose` instead of `docker compose` in later commands.

## 2. Folder layout

```bash
mkdir -p ~/securevote-besu-qbft/{config,nodes,nodekeys,logs}
cd ~/securevote-besu-qbft
```

Recommended layout:

```txt
securevote-besu-qbft/
  config/
    genesis.json
    static-nodes.json
  nodes/
    node1/data
    node2/data
    node3/data
    node4/data
    node5/data
  nodekeys/
    node1/key
    node2/key
    node3/key
    node4/key
    node5/key
```

## 3. Generate QBFT genesis

Use Besu operator tooling from Docker:

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

docker run --rm \
  -v "$PWD:/work" \
  hyperledger/besu:latest \
  operator generate-blockchain-config \
  --config-file=/work/qbftConfigFile.json \
  --to=/work/networkFiles \
  --private-key-file-name=key
```

Copy generated files:

```bash
cp networkFiles/genesis.json config/genesis.json
for i in 1 2 3 4 5; do
  mkdir -p nodes/node$i/data nodekeys/node$i
done
```

Copy each generated validator key from `networkFiles/keys/*/key` into `nodekeys/node1/key` through `nodekeys/node5/key`.

## 4. Prefund testing EOAs

On your local project:

```bash
cd mockup/v4/securevote-ui/evaluation
cp .env.example .env
npm install
npm run generate:eoa
```

Copy `evaluation/data/testing-eoas.json` to the server, then add each address to `config/genesis.json` under `alloc`:

```json
"0xYourTestingAddress": {
  "balance": "0x3635C9ADC5DEA00000"
}
```

That balance is `1000 ETH` in wei. Also prefund the deployer/admin EOA.

After editing genesis, do not run Besu in a manual `docker run` loop. Besu does not need a separate long-running init step here; the database is created when each node starts from `docker-compose.yml`.

If you accidentally ran a command like this and it started logging `Unable to find sync target. Waiting for 5 peers minimum`, press `Ctrl+C`, then reset the partially-created data folders before starting compose:

```bash
rm -rf nodes/node*/data/*
```

This reset is safe only before the real network has started and before contracts/rooms/votes exist.

## 5. Docker compose

Create `docker-compose.yml`:

```yaml
services:
  node1:
    image: hyperledger/besu:latest
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
    command: ["--data-path=/data", "--genesis-file=/config/genesis.json", "--node-private-key-file=/keys/key", "--rpc-http-enabled=true", "--rpc-http-host=0.0.0.0", "--rpc-http-port=8545", "--rpc-http-api=ETH,NET,WEB3,QBFT,ADMIN,DEBUG,TXPOOL", "--rpc-http-cors-origins=*", "--host-allowlist=*", "--p2p-host=0.0.0.0", "--p2p-port=30303"]
    volumes: ["./config:/config", "./nodes/node2/data:/data", "./nodekeys/node2:/keys"]

  node3:
    image: hyperledger/besu:latest
    command: ["--data-path=/data", "--genesis-file=/config/genesis.json", "--node-private-key-file=/keys/key", "--rpc-http-enabled=true", "--rpc-http-host=0.0.0.0", "--rpc-http-port=8545", "--rpc-http-api=ETH,NET,WEB3,QBFT,ADMIN,DEBUG,TXPOOL", "--rpc-http-cors-origins=*", "--host-allowlist=*", "--p2p-host=0.0.0.0", "--p2p-port=30303"]
    volumes: ["./config:/config", "./nodes/node3/data:/data", "./nodekeys/node3:/keys"]

  node4:
    image: hyperledger/besu:latest
    command: ["--data-path=/data", "--genesis-file=/config/genesis.json", "--node-private-key-file=/keys/key", "--rpc-http-enabled=true", "--rpc-http-host=0.0.0.0", "--rpc-http-port=8545", "--rpc-http-api=ETH,NET,WEB3,QBFT,ADMIN,DEBUG,TXPOOL", "--rpc-http-cors-origins=*", "--host-allowlist=*", "--p2p-host=0.0.0.0", "--p2p-port=30303"]
    volumes: ["./config:/config", "./nodes/node4/data:/data", "./nodekeys/node4:/keys"]

  node5:
    image: hyperledger/besu:latest
    command: ["--data-path=/data", "--genesis-file=/config/genesis.json", "--node-private-key-file=/keys/key", "--rpc-http-enabled=true", "--rpc-http-host=0.0.0.0", "--rpc-http-port=8545", "--rpc-http-api=ETH,NET,WEB3,QBFT,ADMIN,DEBUG,TXPOOL", "--rpc-http-cors-origins=*", "--host-allowlist=*", "--p2p-host=0.0.0.0", "--p2p-port=30303"]
    volumes: ["./config:/config", "./nodes/node5/data:/data", "./nodekeys/node5:/keys"]
```

Start:

```bash
docker compose up -d
docker compose logs -f node1
```

## 6. Stop nodes temporarily

Jika ingin hemat resource server, matikan semua container Besu sementara:

```bash
cd ~/securevote-besu-qbft
docker compose down
```

Command ini menghentikan dan menghapus container, tetapi data blockchain tetap aman karena data node disimpan di folder bind mount:

```txt
~/securevote-besu-qbft/nodes/node1/data
~/securevote-besu-qbft/nodes/node2/data
~/securevote-besu-qbft/nodes/node3/data
~/securevote-besu-qbft/nodes/node4/data
~/securevote-besu-qbft/nodes/node5/data
```

Untuk menyalakan lagi:

```bash
cd ~/securevote-besu-qbft
docker compose up -d
docker compose logs -f node1
```

Jika hanya ingin stop tanpa menghapus container:

```bash
docker compose stop
```

Lalu start lagi:

```bash
docker compose start
```

Jangan gunakan command berikut kecuali memang ingin reset network dari nol:

```bash
docker compose down -v
rm -rf nodes/node*/data/*
```

`down -v` dan penghapusan folder data akan menghilangkan state chain lokal, termasuk contract deployment, room, vote, dan result history.

## 7. Frontend configuration

Update:

```txt
mockup/v4/securevote-ui/frontend/src/config/deployed-contracts.json
```

Fill these after deploying contracts:

```json
{
  "RoomFactory": { "address": "0x..." },
  "VotingRoom": { "address": "0x..." },
  "VotingResultCenter": { "address": "0x..." }
}
```

MetaMask custom network:

- Network name: `Besu QBFT Private`
- RPC URL: `http://165.227.107.109:8545`
- Chain ID: `1337`
- Currency symbol: `ETH`
