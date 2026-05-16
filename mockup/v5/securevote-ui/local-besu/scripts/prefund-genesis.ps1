param(
    [string]$BesuDir = "",
    [string]$AdminPrivateKey = "",
    [string]$AdminAddress = "",
    [string]$Balance = "0x3635C9ADC5DEA00000"
)

$ErrorActionPreference = "Stop"

if (-not $BesuDir) {
    $BesuDir = Join-Path (Get-Location) "besu-qbft-local"
}

$BesuDir = [System.IO.Path]::GetFullPath($BesuDir)

Set-Location $BesuDir

if (-not (Test-Path "config\genesis.json")) {
    throw "config\genesis.json not found. Run setup-local-besu.ps1 first."
}

if (-not (Test-Path "testing-eoas.json")) {
    throw "testing-eoas.json not found in $BesuDir."
}

$eoas = Get-Content -Raw "testing-eoas.json" | ConvertFrom-Json

if (-not $AdminAddress) {
    if ($AdminPrivateKey) {
        $match = $eoas.accounts | Where-Object { $_.privateKey -ieq $AdminPrivateKey } | Select-Object -First 1
        if (-not $match) {
            throw "AdminPrivateKey was not found in testing-eoas.json. Pass -AdminAddress explicitly."
        }
        $AdminAddress = $match.address
    } else {
        $AdminAddress = $eoas.accounts[0].address
    }
}

$genesis = Get-Content -Raw "config\genesis.json" | ConvertFrom-Json
$alloc = [ordered]@{}

foreach ($property in $genesis.alloc.PSObject.Properties) {
    $alloc[$property.Name] = $property.Value
}

$alloc[$AdminAddress] = [ordered]@{ balance = $Balance }

foreach ($account in $eoas.accounts) {
    $alloc[$account.address] = [ordered]@{ balance = $Balance }
}

$genesis.alloc = $alloc
$json = $genesis | ConvertTo-Json -Depth 100
Set-Content -Path "config\genesis.json" -Value $json -Encoding UTF8

Write-Host "Prefunded genesis alloc entries: $($alloc.Count)"
Write-Host "Admin address: $AdminAddress"
