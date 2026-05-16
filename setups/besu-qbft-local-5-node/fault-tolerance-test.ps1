param(
    [int]$WaitSeconds = 10,
    [switch]$RunTwoNodeFailure,
    [string]$ResultDir = "results"
)

$ErrorActionPreference = "Stop"

function Invoke-Rpc($Method, $Params = @()) {
    $body = @{
        jsonrpc = "2.0"
        method = $Method
        params = $Params
        id = 1
    } | ConvertTo-Json -Depth 20 -Compress

    Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method Post -ContentType "application/json" -Body $body
}

function Hex-ToInt($Hex) {
    if (-not $Hex) { return 0 }
    return [Convert]::ToInt64($Hex.Replace("0x", ""), 16)
}

function Get-BlockNumberInt() {
    $block = Invoke-Rpc "eth_blockNumber"
    return @{
        hex = $block.result
        int = Hex-ToInt $block.result
    }
}

New-Item -ItemType Directory -Force -Path $ResultDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultPath = Join-Path $ResultDir "fault-tolerance-$timestamp.txt"
$lines = New-Object System.Collections.Generic.List[string]

$lines.Add("Besu QBFT 5 Node Fault Tolerance Test")
$lines.Add("Timestamp: $(Get-Date -Format o)")
$lines.Add("Note: 5-node QBFT is expected to tolerate 1 faulty validator.")
$lines.Add("")

try {
    $lines.Add("Baseline")
    $b1 = Get-BlockNumberInt
    $lines.Add("block before wait: $($b1.hex) ($($b1.int))")
    Start-Sleep -Seconds $WaitSeconds
    $b2 = Get-BlockNumberInt
    $lines.Add("block after wait:  $($b2.hex) ($($b2.int))")
    $lines.Add("baseline delta: $($b2.int - $b1.int)")
    $lines.Add("")

    $lines.Add("Stop 1 validator: besu-node5")
    docker stop besu-node5 | Out-Null
    $oneBefore = Get-BlockNumberInt
    $lines.Add("block after stop node5: $($oneBefore.hex) ($($oneBefore.int))")
    Start-Sleep -Seconds $WaitSeconds
    $oneAfter = Get-BlockNumberInt
    $oneDelta = $oneAfter.int - $oneBefore.int
    $lines.Add("block after wait:       $($oneAfter.hex) ($($oneAfter.int))")
    $lines.Add("one-node-failure delta: $oneDelta")
    $lines.Add("Expected: delta > 0")
    $lines.Add("Status: $(if ($oneDelta -gt 0) { "PASS" } else { "FAIL_OR_CHECK" })")
    $lines.Add("")

    if ($RunTwoNodeFailure) {
        $lines.Add("Stop 2nd validator: besu-node4")
        docker stop besu-node4 | Out-Null
        $twoBefore = Get-BlockNumberInt
        $lines.Add("block after stop node4: $($twoBefore.hex) ($($twoBefore.int))")
        Start-Sleep -Seconds $WaitSeconds
        $twoAfter = Get-BlockNumberInt
        $twoDelta = $twoAfter.int - $twoBefore.int
        $lines.Add("block after wait:       $($twoAfter.hex) ($($twoAfter.int))")
        $lines.Add("two-node-failure delta: $twoDelta")
        $lines.Add("Expected: likely 0 or unstable, because 5-node QBFT only tolerates 1 faulty validator.")
        $lines.Add("")
    }
}
finally {
    $lines.Add("Restart stopped validators")
    docker start besu-node5 | Out-Null
    if ($RunTwoNodeFailure) {
        docker start besu-node4 | Out-Null
    }
    $lines.Add("Restart command sent.")
    $lines.Add("")
}

$lines.Add("Container status after test")
$dockerPs = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
$lines.AddRange([string[]]$dockerPs)

$lines | Tee-Object -FilePath $resultPath
Write-Host ""
Write-Host "Saved result to $resultPath"

