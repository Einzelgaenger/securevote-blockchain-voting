# Blockchain Voting App Mockup

This is a simple mockup for a blockchain voting application. The application allows users to:

1. Connect their wallet using RainbowKit.
2. Interact with four smart contracts: MinimalForwarder, SponsorVault, VotingRoom, and RoomFactory.
3. View and call functions and variables of the selected contract, similar to Remix IDE.
4. Perform gasless voting for the `vote()` function in the VotingRoom contract.

## Setup Instructions

1. Clone the repository.
2. Navigate to the `mockup/v2` directory.
3. Open `index.html` in your browser.

## Files

- `index.html`: The main HTML file for the application.
- `styles.css`: The CSS file for styling the application.
- `script.js`: The JavaScript file for handling wallet connection and contract interactions.

## Notes

- WalletConnect Project ID is stored in `database/walletconnect_reown_id.txt`.
- Contract ABIs are located in `ABI/v2`.
- Contract addresses are stored in `addresses/2_productionReady.txt` and `addresses/3_sepoliaAddresses.txt`.
- Gasless voting is implemented for the `vote()` function in the VotingRoom contract using the relayer wallet information in `database/alchemy.txt`.