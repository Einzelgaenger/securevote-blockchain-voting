param(
    [string]$BesuDir = "",
    [string]$TestingEoaFile = "",
    [string]$AdminAddress = "",
    [string]$AdminPrivateKey = "",
    [int]$ChainId = 1337,
    [int]$ValidatorCount = 5,
    [string]$Balance = "0x3635C9ADC5DEA00000",
    [switch]$Reset
)

$ErrorActionPreference = "Stop"

function Write-JsonFile($Path, $Object) {
    $json = $Object | ConvertTo-Json -Depth 100
    Set-Content -Path $Path -Value $json -Encoding UTF8
}

function Assert-Command($Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is not available. Install it first, then rerun this script."
    }
}

function New-BesuCompose($ValidatorCount) {
    $services = [ordered]@{}

    for ($i = 1; $i -le $ValidatorCount; $i++) {
        $service = [ordered]@{
            image = "hyperledger/besu:latest"
            environment = @("JAVA_OPTS=-Xms256m -Xmx512m")
            command = @(
                "--data-path=/data",
                "--genesis-file=/config/genesis.json",
                "--node-private-key-file=/keys/key",
                "--rpc-http-enabled=true",
                "--rpc-http-host=0.0.0.0",
                "--rpc-http-port=8545",
                "--rpc-http-api=ETH,NET,WEB3,QBFT,ADMIN,DEBUG,TXPOOL",
                "--rpc-http-cors-origins=*",
                "--host-allowlist=*",
                "--p2p-host=0.0.0.0",
                "--p2p-port=30303",
                "--min-gas-price=0"
            )
            volumes = @(
                "./config:/config",
                "./nodes/node$i/data:/data",
                "./nodekeys/node${i}:/keys"
            )
        }

        if ($i -eq 1) {
            $service.ports = @(
                "8545:8545",
                "30303:30303/tcp",
                "30303:30303/udp"
            )
        }

        $services["node$i"] = $service
    }

    $compose = [ordered]@{ services = $services }
    return $compose
}

Assert-Command "docker"

if (-not $BesuDir) {
    $BesuDir = Join-Path (Get-Location) "besu-qbft-local"
}

$BesuDir = [System.IO.Path]::GetFullPath($BesuDir)
New-Item -ItemType Directory -Force -Path $BesuDir | Out-Null

if ($Reset) {
    Write-Host "Reset requested. Removing existing local Besu generated data..."
    foreach ($name in @("networkFiles", "config", "nodes", "nodekeys", "logs")) {
        $target = Join-Path $BesuDir $name
        if (Test-Path $target) {
            Remove-Item -LiteralPath $target -Recurse -Force
        }
    }
}

Set-Location $BesuDir

foreach ($folder in @("config", "nodes", "nodekeys", "logs")) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}

for ($i = 1; $i -le $ValidatorCount; $i++) {
    New-Item -ItemType Directory -Force -Path "nodes\node$i\data" | Out-Null
    New-Item -ItemType Directory -Force -Path "nodekeys\node$i" | Out-Null
}

if ($TestingEoaFile) {
    $TestingEoaFile = [System.IO.Path]::GetFullPath($TestingEoaFile)
    if (-not (Test-Path $TestingEoaFile)) {
        throw "TestingEoaFile not found: $TestingEoaFile"
    }
    Copy-Item -Force $TestingEoaFile "testing-eoas.json"
}

$qbftConfig = [ordered]@{
    genesis = [ordered]@{
        config = [ordered]@{
            chainId = $ChainId
            berlinBlock = 0
            qbft = [ordered]@{
                blockperiodseconds = 2
                epochlength = 30000
                requesttimeoutseconds = 10
            }
        }
        nonce = "0x0"
        timestamp = "0x58ee40ba"
        gasLimit = "0x1fffffffffffff"
        difficulty = "0x1"
        mixHash = "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365"
        coinbase = "0x0000000000000000000000000000000000000000"
        alloc = [ordered]@{}
    }
    blockchain = [ordered]@{
        nodes = [ordered]@{
            generate = $true
            count = $ValidatorCount
        }
    }
}

Write-JsonFile "qbftConfigFile.json" $qbftConfig

if (-not (Test-Path "networkFiles")) {
    docker run --rm -v "${BesuDir}:/work" hyperledger/besu:latest operator generate-blockchain-config --config-file=/work/qbftConfigFile.json --to=/work/networkFiles --private-key-file-name=key
} else {
    Write-Host "networkFiles already exists. Skipping validator generation. Use -Reset to regenerate."
}

Copy-Item -Force "networkFiles\genesis.json" "config\genesis.json"

$keyDirs = Get-ChildItem -Path "networkFiles\keys" -Directory | Sort-Object Name
if ($keyDirs.Count -lt $ValidatorCount) {
    throw "Expected $ValidatorCount validator key folders, found $($keyDirs.Count)."
}

for ($i = 1; $i -le $ValidatorCount; $i++) {
    Copy-Item -Force (Join-Path $keyDirs[$i - 1].FullName "key") "nodekeys\node$i\key"
}

$genesis = Get-Content -Raw "config\genesis.json" | ConvertFrom-Json
$alloc = [ordered]@{}

if (Test-Path "testing-eoas.json") {
    $eoas = Get-Content -Raw "testing-eoas.json" | ConvertFrom-Json

    if (-not $AdminAddress) {
        if ($AdminPrivateKey) {
            $match = $eoas.accounts | Where-Object { $_.privateKey -ieq $AdminPrivateKey } | Select-Object -First 1
            if (-not $match) {
                throw "AdminPrivateKey was not found in testing-eoas.json. Pass -AdminAddress explicitly."
            }
            $AdminAddress = $match.address
        } elseif ($eoas.accounts.Count -gt 0) {
            $AdminAddress = $eoas.accounts[0].address
        }
    }

    foreach ($account in $eoas.accounts) {
        $alloc[$account.address] = [ordered]@{ balance = $Balance }
    }
}

if ($AdminAddress) {
    $alloc[$AdminAddress] = [ordered]@{ balance = $Balance }
}

$genesis.alloc = $alloc
Write-JsonFile "config\genesis.json" $genesis

$compose = New-BesuCompose -ValidatorCount $ValidatorCount
Write-JsonFile "docker-compose.yml" $compose

Write-Host ""
Write-Host "Besu QBFT local setup is ready."
Write-Host "Besu dir: $BesuDir"
Write-Host "Chain ID: $ChainId"
Write-Host "Validators: $ValidatorCount"
Write-Host "Prefunded alloc entries: $($alloc.Count)"
if ($AdminAddress) {
    Write-Host "Admin address: $AdminAddress"
}
Write-Host ""
Write-Host "Start network:"
Write-Host "  cd `"$BesuDir`""
Write-Host "  docker compose up -d"
Write-Host ""
Write-Host "Verify:"
Write-Host "  Invoke-RestMethod -Uri http://127.0.0.1:8545 -Method Post -ContentType `"application/json`" -Body '{`"jsonrpc`":`"2.0`",`"method`":`"eth_chainId`",`"params`":[],`"id`":1}'"
