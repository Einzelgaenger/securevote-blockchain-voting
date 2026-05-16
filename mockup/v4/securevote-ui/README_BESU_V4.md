# SecureVote UI v4 - Besu QBFT

This folder is copied from `mockup/v3/securevote-ui` and changed to target a private Besu QBFT network instead of Sepolia.

## Main changes

- Frontend default chain is now `Besu QBFT Private`.
- Default RPC is `http://165.227.107.109:8545`.
- Contract addresses are centralized in `frontend/src/config/deployed-contracts.json`.
- Evaluation scripts are in `evaluation/scripts`.
- Setup and testing docs are in `docs`.

## Files to update after deployment

```txt
frontend/src/config/deployed-contracts.json
```

Fill:

- `RoomFactory.address`
- `VotingRoom.address`
- `VotingResultCenter.address`

## Run frontend

```bash
cd mockup/v4/securevote-ui/frontend
cp .env.example .env
npm install
npm run dev
```

## Run evaluations

```bash
cd mockup/v4/securevote-ui/evaluation
cp .env.example .env
npm install
npm run generate:eoa
npm run network
npm run smart-contract
```

Read:

- `docs/besu-qbft-setup.md`
- `docs/network-evaluation.md`
- `docs/smart-contract-evaluation.md`
