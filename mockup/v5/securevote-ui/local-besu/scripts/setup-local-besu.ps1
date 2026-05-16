param(
    [string]$BesuDir = "",
    [string]$TestingEoaFile = ""
)

$ErrorActionPreference = "Stop"

function Write-JsonFile($Path, $Object) {
    $json = $Object | ConvertTo-Json -Depth 100
    Set-Content -Path $Path -Value $json -Encoding UTF8
}

if (-not $TestingEoaFile) {
    $ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    $UiRoot = Resolve-Path (Join-Path $ScriptRoot "..\..")
    $TestingEoaFile = Join-Path $UiRoot "evaluation\data\testing-eoas.json"
}

if (-not $BesuDir) {
    $BesuDir = Join-Path (Get-Location) "besu-qbft-local"
}

$BesuDir = [System.IO.Path]::GetFullPath($BesuDir)

New-Item -ItemType Directory -Force -Path $BesuDir | Out-Null
Set-Location $BesuDir

$folders = @("config", "nodes", "nodekeys", "logs")
foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}

for ($i = 1; $i -le 5; $i++) {
    New-Item -ItemType Directory -Force -Path "nodes\node$i\data" | Out-Null
    New-Item -ItemType Directory -Force -Path "nodekeys\node$i" | Out-Null
}

if (Test-Path $TestingEoaFile) {
    Copy-Item -Force $TestingEoaFile "testing-eoas.json"
}

$qbftConfig = [ordered]@{
    genesis = [ordered]@{
        config = [ordered]@{
            chainId = 1337
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
            count = 5
        }
    }
}

Write-JsonFile "qbftConfigFile.json" $qbftConfig

if (Test-Path "networkFiles") {
    Write-Host "networkFiles already exists. Skipping Besu operator generation."
} else {
    docker run --rm -v "${PWD}:/work" hyperledger/besu:latest operator generate-blockchain-config --config-file=/work/qbftConfigFile.json --to=/work/networkFiles --private-key-file-name=key
}

Copy-Item -Force "networkFiles\genesis.json" "config\genesis.json"

$keyDirs = Get-ChildItem -Path "networkFiles\keys" -Directory | Sort-Object Name
if ($keyDirs.Count -lt 5) {
    throw "Expected 5 generated validator key folders, found $($keyDirs.Count)."
}

for ($i = 1; $i -le 5; $i++) {
    Copy-Item -Force (Join-Path $keyDirs[$i - 1].FullName "key") "nodekeys\node$i\key"
}

Write-Host "Local Besu folder prepared at: $BesuDir"
Write-Host "Next: run prefund-genesis.ps1, then docker compose up -d."
