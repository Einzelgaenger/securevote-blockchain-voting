param(
    [int[]]$Ports = @(8545, 8546, 8547, 8548, 8549),
    [int]$WaitSeconds = 10,
    [string]$ResultDir = "results"
)

$ErrorActionPreference = "Stop"

function Invoke-Rpc($Port, $Method, $Params = @()) {
    $body = @{
        jsonrpc = "2.0"
        method = $Method
        params = $Params
        id = 1
    } | ConvertTo-Json -Depth 20 -Compress

    Invoke-RestMethod -Uri "http://127.0.0.1:$Port" -Method Post -ContentType "application/json" -Body $body
}

function Hex-ToInt($Hex) {
    if (-not $Hex) { return 0 }
    return [Convert]::ToInt64($Hex.Replace("0x", ""), 16)
}

New-Item -ItemType Directory -Force -Path $ResultDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultPath = Join-Path $ResultDir "network-check-$timestamp.txt"
$lines = New-Object System.Collections.Generic.List[string]

$lines.Add("Besu QBFT 5 Node Network Check")
$lines.Add("Timestamp: $(Get-Date -Format o)")
$lines.Add("")

$lines.Add("1. Container status")
$dockerPs = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
$lines.AddRange([string[]]$dockerPs)
$lines.Add("")

$lines.Add("2. Chain ID")
$chain = Invoke-Rpc 8545 "eth_chainId"
$lines.Add("eth_chainId node1: $($chain.result)")
$lines.Add("Expected: 0x539")
$lines.Add("")

$lines.Add("3. Peer count per node")
foreach ($port in $Ports) {
    $peer = Invoke-Rpc $port "net_peerCount"
    $lines.Add("port $port net_peerCount: $($peer.result)")
}
$lines.Add("Expected for 5 nodes: node should see around 0x4 peers after discovery.")
$lines.Add("")

$lines.Add("4. Block production")
$before = Invoke-Rpc 8545 "eth_blockNumber"
$beforeInt = Hex-ToInt $before.result
$lines.Add("before: $($before.result) ($beforeInt)")
$lines.Add("waiting $WaitSeconds seconds...")
Start-Sleep -Seconds $WaitSeconds
$after = Invoke-Rpc 8545 "eth_blockNumber"
$afterInt = Hex-ToInt $after.result
$lines.Add("after:  $($after.result) ($afterInt)")
$lines.Add("delta:  $($afterInt - $beforeInt)")
$lines.Add("Expected: delta > 0")
$lines.Add("")

$lines.Add("5. Validators")
$validators = Invoke-Rpc 8545 "qbft_getValidatorsByBlockNumber" @("latest")
$lines.Add("validator count: $($validators.result.Count)")
foreach ($validator in $validators.result) {
    $lines.Add($validator)
}
$lines.Add("Expected: 5 validators")
$lines.Add("")

$passed = ($chain.result -eq "0x539") -and (($afterInt - $beforeInt) -gt 0) -and ($validators.result.Count -eq 5)
$lines.Add("Overall status: $(if ($passed) { "PASS" } else { "CHECK_MANUALLY" })")

$lines | Tee-Object -FilePath $resultPath
Write-Host ""
Write-Host "Saved result to $resultPath"

