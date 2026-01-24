const walletConnectProjectId = "25801ba773152aa9e14070125007a6c1";
const contractAddresses = {
    MinimalForwarder: "0xdE41F486df655AdA306166a601166DDA5e69e241",
    SponsorVault: "0x04d1BB5E8565DF62743212B39F3586d5A9965b67",
    VotingRoom: "0xc6e866069dc20c0ABAD2a74509Ac9aA928f2f0cF",
    RoomFactory: "0x35404f230901488BFE187d7edCF31287396E6842"
};
const contractABIs = {
    MinimalForwarder: /* ABI content here */,
    SponsorVault: /* ABI content here */,
    VotingRoom: /* ABI content here */,
    RoomFactory: /* ABI content here */
};

let provider;
let signer;

// Connect Wallet
const connectWalletButton = document.getElementById("connectWallet");
const contractButtonsDiv = document.getElementById("contractButtons");
const contractFunctionsDiv = document.getElementById("contractFunctions");

connectWalletButton.addEventListener("click", async () => {
    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        connectWalletButton.style.display = "none";
        contractButtonsDiv.style.display = "block";
    } catch (error) {
        console.error("Error connecting wallet:", error);
    }
});

// Load Contract Functions
contractButtonsDiv.addEventListener("click", (event) => {
    if (event.target.classList.contains("contractButton")) {
        const contractName = event.target.getAttribute("data-contract");
        const contractAddress = contractAddresses[contractName];
        const contractABI = contractABIs[contractName];

        if (contractAddress && contractABI) {
            const contract = new ethers.Contract(contractAddress, contractABI, signer);
            displayContractFunctions(contract, contractName);
        } else {
            console.error("Contract address or ABI not found for:", contractName);
        }
    }
});

// Display Contract Functions
function displayContractFunctions(contract, contractName) {
    contractFunctionsDiv.innerHTML = `<h2>${contractName} Functions</h2>`;
    contractFunctionsDiv.style.display = "block";

    contract.interface.fragments.forEach((fragment) => {
        if (fragment.type === "function") {
            const button = document.createElement("button");
            button.textContent = fragment.name;
            button.addEventListener("click", async () => {
                try {
                    const result = await contract[fragment.name]();
                    console.log(`${fragment.name} result:`, result);
                } catch (error) {
                    console.error(`Error calling ${fragment.name}:`, error);
                }
            });
            contractFunctionsDiv.appendChild(button);
        }
    });
}