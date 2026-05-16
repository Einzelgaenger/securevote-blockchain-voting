# Network Evaluation

Script:

```bash
cd mockup/v4/securevote-ui/evaluation
cp .env.example .env
npm install
npm run network
```

Result folder:

```txt
evaluation/results/network-evaluation-result-[ddmmyyyy]/network-evaluation.json
```

## What it tests

- Network connectivity test: calls `web3_clientVersion`, `eth_chainId`, `net_version`, and `net_peerCount`.
- Block production test: reads current block and waits until a new block appears.
- Validator verification test: calls `qbft_getValidatorsByBlockNumber`.
- Latency measurement: sends a tiny native transfer from `ADMIN_PRIVATE_KEY` to itself and measures receipt time.
- Smart contract deployment test: deploys a tiny empty test contract and verifies bytecode.
- Fault tolerance test: manual phase. Stop one validator, rerun this script, then compare latency and block production result.

## Fault tolerance workflow

With 5 QBFT validators, the network is expected to tolerate 1 Byzantine validator fault. Test it like this:

```bash
docker compose stop node5
```

Then rerun:

```bash
npm run network
```

Compare:

- Whether new blocks are still produced.
- Latency of the self-transfer transaction.
- Whether validator list still returns correctly.

Restart node:

```bash
docker compose start node5
```

