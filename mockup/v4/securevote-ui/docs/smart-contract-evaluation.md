# Smart Contract Evaluation

Script:

```bash
cd mockup/v4/securevote-ui/evaluation
cp .env.example .env
npm install
npm run generate:eoa
npm run smart-contract
```

Result folder:

```txt
evaluation/results/smart-contract-evaluation-result-[ddmmyyyy]/smart-contract-evaluation.json
```

## Required setup

1. Besu QBFT RPC is reachable.
2. Testing EOAs in `evaluation/data/testing-eoas.json` are prefunded in genesis or funded later.
3. `ADMIN_PRIVATE_KEY` in `evaluation/.env` is the room admin/deployer account.
4. Contract addresses are filled in:

```txt
frontend/src/config/deployed-contracts.json
```

## Room strategy

The script supports both paths:

- If a saved room exists, terminal shows room name and address so you can reuse it.
- You can paste a room address manually.
- If no room exists, or you choose `N`, the script creates a new room through `RoomFactory.createRoom`.

The chosen room is saved in:

```txt
evaluation/data/saved-rooms.json
```

## Automatic flow

For each run, the script:

1. Verifies the room admin matches `ADMIN_PRIVATE_KEY`.
2. Sets `VotingResultCenter` if not configured.
3. Stops an active round if needed.
4. Restarts the room if the previous round has already been stopped.
5. Adds all testing EOAs as voters, skipping addresses already registered.
6. Adds candidates if the room does not have candidates yet.
7. Starts the room.
8. Sends vote transactions from testing EOAs concurrently.
9. Stops the room.
10. Submits round history to `VotingResultCenter`.
11. Restarts the room so the next script run can start again.

## Candidate distribution

Default:

- `VOTER_COUNT=30`
- `CANDIDATE_COUNT=3`

Votes are distributed with modulo assignment:

```txt
voterIndex % candidateCount
```

So with 30 voters and 3 candidates, each candidate receives 10 votes.

For 20 voters and 2 candidates, each receives 10 votes.

For uneven totals, the difference is at most 1 vote.

## Remix usage

Open:

```txt
evaluation/data/testing-eoas.json
```

Each account has:

- `address`
- `privateKey`
- `remixImport`

Use `remixImport` to import the EOA into Remix or MetaMask for manual testing.

