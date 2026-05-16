# Besu QBFT Local 5 Node

Folder ini khusus untuk setup jaringan Besu QBFT lokal 5 node di Windows. Folder ini tidak bergantung pada app SecureVote, jadi bisa dicopy ke direktori lain dan dijalankan dari sana.

Target network:

- RPC utama: `http://127.0.0.1:8545`
- Chain ID: `1337`
- Consensus: QBFT
- Validator count: 5
- RPC ports: `8545`, `8546`, `8547`, `8548`, `8549`
- P2P ports: `30303`, `30304`, `30305`, `30306`, `30307`
- Docker subnet: `172.21.0.0/24`

## Files

```txt
commands.txt
setup-5-node-besu-qbft.ps1
check-network.ps1
fault-tolerance-test.ps1
app-testing-commands.txt
evaluation-plan-5-node.md
expected-results-template.txt
results/README.md
```

## Quick Start

Copy folder ini ke direktori kerja lokal, misalnya:

```txt
C:\Users\YOUR_USER\Documents\besu-qbft-local\v5-5node
```

Lalu jalankan:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\setup-5-node-besu-qbft.ps1 -Reset
docker compose up -d
.\check-network.ps1
.\fault-tolerance-test.ps1
```

Jika ingin prefund account dari SecureVote evaluation:

```powershell
.\setup-5-node-besu-qbft.ps1 `
  -TestingEoaFile ".\testing-eoas.json" `
  -Reset
```

`testing-eoas.json` harus dicopy ke folder ini terlebih dahulu.

## Output

Setup script membuat:

```txt
config/qbftConfigFile.json
networkFiles/
genesis.json
nodes/node1/data/key
nodes/node2/data/key
nodes/node3/data/key
nodes/node4/data/key
nodes/node5/data/key
.env
docker-compose.yml
prefunded-accounts.txt
```

Testing scripts membuat hasil di:

```txt
results/
```

