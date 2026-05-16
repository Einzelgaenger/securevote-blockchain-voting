# Complete Besu QBFT Testing Runbook

Dokumen ini adalah alur lengkap dari nol sampai selesai testing untuk SecureVote v4 di private Besu QBFT network.

Target:

- Server: `165.227.107.109`
- Network: Besu private network
- Consensus: QBFT
- Validator: 5 nodes
- Chain ID: `1337`
- Public RPC: `http://165.227.107.109:8545`
- Frontend folder: `mockup/v4/securevote-ui/frontend`
- Evaluation folder: `mockup/v4/securevote-ui/evaluation`

## 0. File Yang Perlu Dibaca Dulu

Sebelum mulai, baca file ini:

```txt
mockup/v4/securevote-ui/README_BESU_V4.md
mockup/v4/securevote-ui/docs/besu-qbft-setup.md
mockup/v4/securevote-ui/docs/network-evaluation.md
mockup/v4/securevote-ui/docs/smart-contract-evaluation.md
mockup/v4/securevote-ui/frontend/src/config/deployed-contracts.json
mockup/v4/securevote-ui/evaluation/.env.example
mockup/v4/securevote-ui/frontend/.env.example
```

File utama yang akan sering diubah:

```txt
mockup/v4/securevote-ui/frontend/src/config/deployed-contracts.json
mockup/v4/securevote-ui/evaluation/.env
mockup/v4/securevote-ui/frontend/.env
```

## 1. Persiapan Lokal

Dari komputer lokal, masuk ke folder project:

```powershell
cd C:\Users\LEGION\Documents\Binus\Thesis\securevote-branches\05162026\securevote-blockchain-voting
```

Pastikan folder v4 ada:

```powershell
dir mockup\v4\securevote-ui
```

Masuk ke folder evaluation:

```powershell
cd mockup\v4\securevote-ui\evaluation
```

Install dependency:

```powershell
npm install
```

Buat `.env` dari template:

```powershell
copy .env.example .env
```

Generate 30 testing EOA:

```powershell
npm run generate:eoa
```

Output:

```txt
mockup/v4/securevote-ui/evaluation/data/testing-eoas.json
```

File tersebut berisi:

- `address`
- `privateKey`
- `remixImport`

Penting: ini private key testing. Jangan gunakan di public network dan jangan commit ke repo public.

## 2. Siapkan Admin/Deployer Account

Pilih satu EOA sebagai admin/deployer. Bisa menggunakan salah satu dari:

```txt
evaluation/data/testing-eoas.json
```

Ambil private key-nya, lalu masukkan ke:

```txt
mockup/v4/securevote-ui/evaluation/.env
```

Contoh:

```env
RPC_URL=http://165.227.107.109:8545
CHAIN_ID=1337
ADMIN_PRIVATE_KEY=0xPRIVATE_KEY_ADMIN
TEST_EOA_COUNT=30
VOTER_COUNT=30
CANDIDATE_COUNT=3
FAULT_TOLERANCE_MANUAL=false
```

Admin/deployer ini harus punya balance di genesis Besu, karena akan dipakai untuk:

- deploy contract
- create room
- add voter
- add candidate
- start/stop/restart room
- submit round history

## 3. Setup Server Droplet

SSH ke server:

```bash
ssh root@165.227.107.109
```

Install dependency server:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin ufw jq
sudo systemctl enable --now docker
```

Buka firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 8545/tcp
sudo ufw allow 8546/tcp
sudo ufw allow 30303/tcp
sudo ufw allow 30303/udp
sudo ufw --force enable
```

Buat folder network:

```bash
mkdir -p ~/securevote-besu-qbft/{config,nodes,nodekeys,logs}
cd ~/securevote-besu-qbft
```

Struktur akhirnya:

```txt
securevote-besu-qbft/
  config/
    genesis.json
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

## 4. Generate QBFT Genesis

Di server, buat file config generator:

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

Buat folder node:

```bash
for i in 1 2 3 4 5; do
  mkdir -p nodes/node$i/data nodekeys/node$i
done
```

Copy validator keys. Cek nama folder hasil generate:

```bash
find networkFiles/keys -name key -print
```

Lalu copy 5 key itu ke:

```bash
cp networkFiles/keys/*/key nodekeys/node1/key
cp networkFiles/keys/*/key nodekeys/node2/key
cp networkFiles/keys/*/key nodekeys/node3/key
cp networkFiles/keys/*/key nodekeys/node4/key
cp networkFiles/keys/*/key nodekeys/node5/key
```

Catatan: command di atas adalah pola cepat. Pastikan setiap node memakai key yang berbeda. Cara aman:

```bash
ls networkFiles/keys
```

Lalu copy satu per satu dari folder key yang berbeda.

## 5. Prefund Admin dan Testing EOA di Genesis

Dari lokal, buka:

```txt
mockup/v4/securevote-ui/evaluation/data/testing-eoas.json
```

Ambil semua `address`. Tambahkan semua address itu ke `config/genesis.json` pada bagian `alloc`.

Tambahkan juga address admin/deployer.

Contoh entry:

```json
"0xYourAddress": {
  "balance": "0x3635C9ADC5DEA00000"
}
```

Nilai tersebut setara `1000 ETH`.

Contoh bentuk `alloc`:

```json
"alloc": {
  "0xAdminAddress": {
    "balance": "0x3635C9ADC5DEA00000"
  },
  "0xTestingEoa1": {
    "balance": "0x3635C9ADC5DEA00000"
  },
  "0xTestingEoa2": {
    "balance": "0x3635C9ADC5DEA00000"
  }
}
```

Penting: prefund harus dilakukan sebelum node diinisialisasi. Kalau genesis berubah setelah node berjalan, data node harus di-reset dan init ulang.

## 6. Prepare Besu Node Data

Di server:

```bash
cd ~/securevote-besu-qbft
```

Besu tidak perlu step init manual terpisah untuk alur Docker Compose ini. Database node akan dibuat saat service compose pertama kali start dengan `--genesis-file=/config/genesis.json` dan `--node-private-key-file=/keys/key`.

Jangan menjalankan loop manual seperti ini:

```bash
for i in 1 2 3 4 5; do
  docker run --rm \
    -v "$PWD/config:/config" \
    -v "$PWD/nodes/node$i/data:/data" \
    hyperledger/besu:latest \
    --data-path=/data \
    --genesis-file=/config/genesis.json
done
```

Command tersebut akan menjalankan node pertama dan menunggu peer, bukan sekadar init singkat. Kalau sudah terlanjur menjalankannya dan muncul log `Unable to find sync target. Waiting for 5 peers minimum`, tekan `Ctrl+C`, lalu reset data yang terlanjur dibuat:

```bash
rm -rf nodes/node*/data/*
```

Reset ini hanya aman sebelum network benar-benar dipakai dan sebelum ada contract/room/vote.

## 7. Buat Docker Compose Besu

Di server, buat:

```bash
nano docker-compose.yml
```

Isi:

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

Start network:

```bash
docker compose up -d
```

Cek log:

```bash
docker compose logs -f node1
```

## 8. Verifikasi RPC Besu

Dari lokal:

```powershell
curl -X POST http://165.227.107.109:8545 `
  -H "Content-Type: application/json" `
  --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_chainId\",\"params\":[],\"id\":1}"
```

Expected chain id:

```txt
0x539
```

`0x539` adalah hexadecimal untuk `1337`.

Cek block number:

```powershell
curl -X POST http://165.227.107.109:8545 `
  -H "Content-Type: application/json" `
  --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}"
```

Cek validator:

```powershell
curl -X POST http://165.227.107.109:8545 `
  -H "Content-Type: application/json" `
  --data "{\"jsonrpc\":\"2.0\",\"method\":\"qbft_getValidatorsByBlockNumber\",\"params\":[\"latest\"],\"id\":1}"
```

Expected:

- chain id benar
- block number bertambah
- validator list berisi 5 validator

## 9. Tambahkan Network ke MetaMask

Di MetaMask, add custom network:

```txt
Network name: Besu QBFT Private
RPC URL: http://165.227.107.109:8545
Chain ID: 1337
Currency symbol: ETH
```

Import admin/deployer account:

```txt
evaluation/data/testing-eoas.json
```

Gunakan field:

```txt
privateKey atau remixImport
```

Cek balance di MetaMask. Kalau balance masih 0, berarti address tersebut belum benar-benar masuk genesis `alloc`, atau node masih memakai data genesis lama.

## 10. Deploy Smart Contracts

Kontrak yang perlu deploy:

```txt
contracts/v2/VotingRoom.sol
contracts/v2/RoomFactory.sol
contracts/v2/VotingResultCenter.sol
```

Urutan deploy:

1. Deploy `VotingRoom`
2. Deploy `RoomFactory` dengan constructor argument:

```txt
VotingRoom implementation address
```

3. Deploy `VotingResultCenter` dengan constructor argument:

```txt
RoomFactory address
```

Setelah deploy, simpan address:

```txt
VotingRoom implementation address
RoomFactory address
VotingResultCenter address
```

Deploy bisa dilakukan via Remix:

1. Buka Remix.
2. Tambahkan contract Solidity v2.
3. Compile dengan Solidity `0.8.20` atau compatible.
4. Environment pilih `Injected Provider - MetaMask`.
5. Pastikan MetaMask sedang di network `Besu QBFT Private`.
6. Deploy sesuai urutan di atas.

## 11. Update Contract Address Frontend

Buka file:

```txt
mockup/v4/securevote-ui/frontend/src/config/deployed-contracts.json
```

Isi address hasil deploy:

```json
{
    "network": {
        "name": "Besu QBFT Private",
        "chainId": 1337,
        "rpcUrl": "http://165.227.107.109:8545"
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

Penting:

- `VotingRoom.address` adalah implementation/template.
- Untuk vote/start/stop di room tertentu, pakai clone address hasil `RoomFactory.createRoom`.
- Public Audit Dashboard membaca room dari `RoomFactory`, lalu membaca result dari `VotingResultCenter`.

## 12. Setup Frontend

Dari lokal:

```powershell
cd C:\Users\LEGION\Documents\Binus\Thesis\securevote-branches\05162026\securevote-blockchain-voting\mockup\v4\securevote-ui\frontend
```

Install dependency:

```powershell
npm install
```

Buat `.env`:

```powershell
copy .env.example .env
```

Isi minimal:

```env
VITE_CHAIN_ID=1337
VITE_CHAIN_NAME=Besu QBFT Private
VITE_RPC_URL=http://165.227.107.109:8545
VITE_NATIVE_CURRENCY_NAME=Ether
VITE_NATIVE_CURRENCY_SYMBOL=ETH
VITE_WALLETCONNECT_PROJECT_ID=
```

Run frontend:

```powershell
npm run dev
```

Buka URL Vite yang muncul, biasanya:

```txt
http://localhost:5173
```

Expected:

- Header menampilkan `Besu QBFT Private`
- Wallet bisa connect ke MetaMask
- Public Audit Dashboard bisa terbuka tanpa wallet
- Contract Console bisa dipakai setelah wallet connect

## 13. Run Network Evaluation

Dari lokal:

```powershell
cd C:\Users\LEGION\Documents\Binus\Thesis\securevote-branches\05162026\securevote-blockchain-voting\mockup\v4\securevote-ui\evaluation
```

Pastikan `.env` sudah berisi:

```env
RPC_URL=http://165.227.107.109:8545
CHAIN_ID=1337
ADMIN_PRIVATE_KEY=0xPRIVATE_KEY_ADMIN
```

Run:

```powershell
npm run network
```

Script akan menguji:

- network connectivity
- block production
- validator verification
- latency transfer kecil
- smart contract deployment test sederhana

Output disimpan ke:

```txt
evaluation/results/network-evaluation-result-[ddmmyyyy]/network-evaluation.json
```

## 14. Run Fault Tolerance Test

Di server, matikan 1 validator:

```bash
cd ~/securevote-besu-qbft
docker compose stop node5
```

Dari lokal, rerun network evaluation:

```powershell
cd C:\Users\LEGION\Documents\Binus\Thesis\securevote-branches\05162026\securevote-blockchain-voting\mockup\v4\securevote-ui\evaluation
npm run network
```

Bandingkan result sebelum dan sesudah node dimatikan:

```txt
evaluation/results/network-evaluation-result-[ddmmyyyy]/network-evaluation.json
```

Yang dicek:

- apakah block tetap bertambah
- apakah transaksi tetap sukses
- berapa latency sebelum/sesudah 1 node mati
- apakah validator list masih terbaca

Nyalakan kembali node:

```bash
docker compose start node5
```

Catatan: dengan 5 validator QBFT, toleransi fault normal adalah 1 validator. Kalau lebih dari 1 validator mati, network bisa berhenti finalisasi block tergantung kondisi quorum.

## 15. Run Smart Contract Evaluation

Dari lokal:

```powershell
cd C:\Users\LEGION\Documents\Binus\Thesis\securevote-branches\05162026\securevote-blockchain-voting\mockup\v4\securevote-ui\evaluation
```

Pastikan file ini ada:

```txt
data/testing-eoas.json
```

Kalau belum ada:

```powershell
npm run generate:eoa
```

Pastikan testing EOA sudah punya balance di Besu.

Pastikan `.env`:

```env
RPC_URL=http://165.227.107.109:8545
CHAIN_ID=1337
ADMIN_PRIVATE_KEY=0xPRIVATE_KEY_ADMIN
TEST_EOA_COUNT=30
VOTER_COUNT=30
CANDIDATE_COUNT=3
```

Run:

```powershell
npm run smart-contract
```

Jika belum ada saved room, script akan membuat room baru lewat `RoomFactory`.

Jika sudah ada saved room, script akan menampilkan:

```txt
Saved rooms:
1. SecureVote Evaluation ... - 0xRoomAddress
```

Pilihan:

- ketik nomor room untuk reuse
- ketik `N` untuk create room baru
- paste room address manual

Saved room disimpan di:

```txt
evaluation/data/saved-rooms.json
```

## 16. Cara Kerja Smart Contract Evaluation

Script otomatis menjalankan:

1. Cek `roomAdmin`.
2. Pastikan admin dari `.env` sama dengan admin room.
3. Set `VotingResultCenter` jika belum sama.
4. Stop room jika ternyata masih active.
5. Restart room jika previous round sudah selesai.
6. Add semua testing EOA sebagai voters.
7. Skip voter yang sudah pernah ditambahkan.
8. Add candidates jika candidate belum ada.
9. Start voting round.
10. Kirim vote dari semua EOA secara concurrent.
11. Distribusi vote ke candidate secara rata.
12. Stop voting round.
13. Submit round history ke `VotingResultCenter`.
14. Restart room agar siap dipakai untuk run berikutnya.

Distribusi vote:

```txt
candidate = voterIndex % candidateCount
```

Contoh:

- 30 voters, 3 candidates: 10 vote per candidate
- 20 voters, 2 candidates: 10 vote per candidate
- jika tidak habis dibagi rata, selisih maksimal 1 vote

Output disimpan ke:

```txt
evaluation/results/smart-contract-evaluation-result-[ddmmyyyy]/smart-contract-evaluation.json
```

## 17. Cek Public Audit Dashboard

Setelah smart-contract evaluation selesai:

1. Buka frontend.
2. Masuk ke `Public Audit Dashboard`.
3. Klik `Refresh`.
4. Pastikan room muncul dari `RoomFactory`.
5. Pastikan confirmed result muncul dari `VotingResultCenter`.

Kalau room muncul tapi result belum muncul, biasanya:

- `submitRoundHistory` belum sukses
- `VotingResultCenter.address` salah
- room belum di-set ke result center yang benar
- contract address di `deployed-contracts.json` belum update

## 18. Cek Manual Lewat Contract Console

Di frontend:

1. Connect wallet admin.
2. Buka `Contract Console`.
3. Pilih `RoomFactory`.
4. Call `getRoomCount`.
5. Call `getRoomAt`.
6. Copy room clone address.
7. Pilih `VotingRoom`.
8. Paste clone address.
9. Call:

```txt
roomAdmin
roomName
getCurrentRoundStatus
getVoterCount
getCandidates
```

Untuk result center:

1. Pilih `VotingResultCenter`.
2. Call:

```txt
getRoomVersionCount(room)
getRoomVersionSummary(room, version)
getRoomVersionCandidates(room, version)
```

## 19. Common Troubleshooting

### Chain ID Salah

Gejala:

- wallet connect tapi transaksi gagal
- frontend meminta switch network

Cek:

```txt
frontend/.env
frontend/src/config/deployed-contracts.json
```

Pastikan chain ID `1337`.

### Balance 0

Gejala:

- deploy gagal
- vote gagal
- transaction underpriced/insufficient funds

Solusi:

- pastikan address masuk `alloc` genesis
- reset data node jika genesis sudah terlanjur berubah
- init ulang semua node

### Public Audit Kosong

Gejala:

- room tidak muncul

Cek:

- `RoomFactory.address` benar
- sudah pernah create room dari factory tersebut
- frontend memakai RPC Besu yang benar

Gejala:

- room muncul, result kosong

Cek:

- `VotingResultCenter.address` benar
- room sudah `setResultCenter`
- admin sudah `stop`
- admin sudah `submitRoundHistory(round)`

### Smart Contract Evaluation Gagal di roomAdmin

Gejala:

```txt
ADMIN_PRIVATE_KEY must match roomAdmin
```

Solusi:

- gunakan private key admin yang membuat room
- atau buat room baru dengan admin private key yang sedang dipakai

### QBFT Tidak Produksi Block

Cek di server:

```bash
docker compose ps
docker compose logs node1
docker compose logs node2
```

Cek validator:

```bash
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"qbft_getValidatorsByBlockNumber","params":["latest"],"id":1}'
```

Kemungkinan:

- validator key salah/copy duplicate
- genesis tidak sama antar node
- data node lama belum dihapus setelah genesis berubah
- port P2P tidak terbuka

## 20. Final Checklist

Server:

- Docker installed
- Firewall opened
- 5 Besu nodes running
- RPC accessible at `http://165.227.107.109:8545`
- `eth_chainId` returns `0x539`
- block number increases
- QBFT validator list returns 5 validators

Accounts:

- 30 testing EOA generated
- admin/deployer selected
- admin and testing EOAs prefunded
- private keys stored only for testing

Contracts:

- `VotingRoom` implementation deployed
- `RoomFactory` deployed with VotingRoom implementation address
- `VotingResultCenter` deployed with RoomFactory address
- `frontend/src/config/deployed-contracts.json` updated

Frontend:

- `.env` points to Besu RPC
- `npm run dev` works
- MetaMask connected to Besu QBFT
- Public Audit Dashboard loads

Evaluation:

- `npm run network` completed
- network result JSON saved
- fault tolerance test with 1 node stopped completed
- `npm run smart-contract` completed
- smart-contract result JSON saved
- public audit dashboard shows confirmed round history
