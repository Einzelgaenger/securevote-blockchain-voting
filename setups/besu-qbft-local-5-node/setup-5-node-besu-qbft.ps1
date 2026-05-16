param(
    [int]$ChainId = 1337,
    [string]$TestingEoaFile = "",
    [string]$Balance = "0x200000000000000000000000000000000000000000000000000000000000000",
    [switch]$Reset
)

$ErrorActionPreference = "Stop"

function Write-JsonFile($Path, $Object) {
    $json = $Object | ConvertTo-Json -Depth 100
    Set-Content -Path $Path -Value $json -Encoding UTF8
}

function Normalize-Address($Address) {
    if (-not $Address) { return "" }
    return $Address.Trim().ToLower().Replace("0x", "")
}

function Assert-Docker() {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker command not found. Install/start Docker Desktop first."
    }
}

function New-ComposeFile() {
    $services = @()

    for ($i = 1; $i -le 5; $i++) {
        $rpcPort = 8544 + $i
        $hostP2pPort = 30302 + $i
        $ipLast = 10 + $i
        $bootnodeArg = if ($i -eq 1) { "" } else { ",`n        `"--bootnodes=`${BOOTNODE_URL}`"" }

        $services += @"
  node${i}:
    image: hyperledger/besu:latest
    container_name: besu-node$i
    volumes:
      - ./genesis.json:/opt/besu/genesis.json
      - ./nodes/node$i/data:/opt/besu/data
    ports:
      - "${rpcPort}:8545"
      - "${hostP2pPort}:30303"
    networks:
      besu-net:
        ipv4_address: 172.21.0.$ipLast
    command:
      [
        "--data-path=/opt/besu/data",
        "--genesis-file=/opt/besu/genesis.json",
        "--network-id=$ChainId",
        "--rpc-http-enabled=true",
        "--rpc-http-host=0.0.0.0",
        "--rpc-http-port=8545",
        "--rpc-http-api=ETH,NET,WEB3,QBFT,TXPOOL,ADMIN",
        "--host-allowlist=*",
        "--rpc-http-cors-origins=all",
        "--min-gas-price=0",
        "--sync-min-peers=0",
        "--p2p-port=30303"$bootnodeArg
      ]
"@
    }

    @"
services:
$($services -join "`n")

networks:
  besu-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/24
"@
}

Assert-Docker

$nodeCount = 5

if ($TestingEoaFile) {
    $TestingEoaFile = [System.IO.Path]::GetFullPath($TestingEoaFile)
    if (-not (Test-Path $TestingEoaFile)) {
        throw "TestingEoaFile not found: $TestingEoaFile"
    }
}

if ($Reset) {
    foreach ($target in @("config", "networkFiles", "nodes", "logs", "genesis.json", ".env", "docker-compose.yml", "prefunded-accounts.txt")) {
        if (Test-Path $target) {
            Remove-Item -LiteralPath $target -Recurse -Force
        }
    }
}

New-Item -ItemType Directory -Force -Path "config", "networkFiles", "nodes", "logs", "results" | Out-Null
for ($i = 1; $i -le $nodeCount; $i++) {
    New-Item -ItemType Directory -Force -Path "nodes\node$i\data" | Out-Null
}

$defaultAccounts = @(
    [ordered]@{ address = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"; privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; label = "hardhat-0" }
)

$alloc = [ordered]@{}
foreach ($account in $defaultAccounts) {
    $alloc[(Normalize-Address $account.address)] = [ordered]@{ balance = $Balance }
}

if ($TestingEoaFile) {
    $targetTestingEoaFile = [System.IO.Path]::GetFullPath("testing-eoas.json")
    if ($TestingEoaFile -ne $targetTestingEoaFile) {
        Copy-Item -Force $TestingEoaFile $targetTestingEoaFile
    }

    $eoas = Get-Content -Raw $TestingEoaFile | ConvertFrom-Json
    foreach ($account in $eoas.accounts) {
        $normalized = Normalize-Address $account.address
        if ($normalized) {
            $alloc[$normalized] = [ordered]@{ balance = $Balance }
        }
    }
}

$qbftConfig = [ordered]@{
    genesis = [ordered]@{
        config = [ordered]@{
            chainId = $ChainId
            berlinBlock = 0
            londonBlock = 0
            zeroBaseFee = $true
            qbft = [ordered]@{
                blockperiodseconds = 2
                epochlength = 30000
                requesttimeoutseconds = 4
            }
        }
        nonce = "0x0"
        timestamp = "0x58ee40ba"
        gasLimit = "0x1fffffffffffff"
        difficulty = "0x1"
        mixHash = "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365"
        coinbase = "0x0000000000000000000000000000000000000000"
        alloc = $alloc
    }
    blockchain = [ordered]@{
        nodes = [ordered]@{
            generate = $true
            count = $nodeCount
        }
    }
}

Write-JsonFile "config\qbftConfigFile.json" $qbftConfig

$workDir = (Get-Location).Path
docker run --rm -v "${workDir}:/opt/besu/network" hyperledger/besu:latest operator generate-blockchain-config --config-file=/opt/besu/network/config/qbftConfigFile.json --to=/opt/besu/network/networkFiles --private-key-file-name=key

Copy-Item -Force ".\networkFiles\genesis.json" ".\genesis.json"

$keys = Get-ChildItem ".\networkFiles\keys" -Directory | Sort-Object Name
if ($keys.Count -lt $nodeCount) {
    throw "Expected $nodeCount generated key folders, found $($keys.Count)."
}

for ($i = 1; $i -le $nodeCount; $i++) {
    Copy-Item -Force "$($keys[$i - 1].FullName)\key*" ".\nodes\node$i\data\"
}

$pub = Get-Content ".\nodes\node1\data\key.pub"
$pub = $pub.Trim().Replace("0x", "")
"BOOTNODE_URL=enode://$pub@172.21.0.11:30303" | Out-File -Encoding ascii ".env"

New-ComposeFile | Out-File -Encoding ascii "docker-compose.yml"

$accountLines = @()
$accountLines += "Prefunded local development accounts"
$accountLines += "Do not use these private keys outside local testing."
$accountLines += ""
foreach ($account in $defaultAccounts) {
    $accountLines += "$($account.label)"
    $accountLines += "address=$($account.address)"
    $accountLines += "privateKey=$($account.privateKey)"
    $accountLines += ""
}
$accountLines | Out-File -Encoding ascii "prefunded-accounts.txt"

Write-Host ""
Write-Host "Besu QBFT 5-node setup created."
Write-Host "Folder: $((Get-Location).Path)"
Write-Host "Chain ID: $ChainId"
Write-Host "Validators: $nodeCount"
Write-Host "Alloc entries: $($alloc.Count)"
Write-Host ""
Write-Host "Next commands:"
Write-Host "  docker compose up -d"
Write-Host "  .\check-network.ps1"
