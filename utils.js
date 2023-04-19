const Web3 = require("web3");
const VENUSABI = require("./abi/VenusERC4626ReInvestAbi.json");
const VENUSCONTRACTADDRESS = "0x889447dFab0611F714a12306cB66392EC38d2211";
const SUPERPOSITIONCONTRACTADDRESS = "0xfF3aFb7d847AeD8f2540f7b5042F693242e01ebD"
const superPositionAbi = require('./abi/SuperPositionAbi.json')
const superDestinationAbi = require('./abi/SuperDestinationAbi.json')
const erc4626Abi = require('./abi/erc4626Abi.json')

const connectToEndpoint = async (endpoints) => {
    let web3;

    // Run through three provided BSC endpoints until a connection is established and a valid web3 object is returned

    while (true) {
        for (i = 0; i < endpoints.length; i++) {
            try {
                web3 = await new Web3(
                    new Web3.providers.HttpProvider(endpoints[i])
                );
            } catch (e) {
                console.log("Fail to connect to HttpProvider: ", endpoints[i]);
            }

            if (web3.currentProvider) break;

            await sleep(100);
        }

        if (web3.currentProvider) break;
    }

    return web3;
}

const setupBSCWeb3 = async () => {
    const bsc_endpoints = [
        "https://flashy-burned-friday.bsc.discover.quiknode.pro/3051ebbf8e6a1344368e4d8b091c6a60df2ef0e7/",
        "https://bsc-dataseed1.defibit.io",
        "https://bsc-dataseed1.ninicoin.io",
    ]

    const bsc_web3 = await connectToEndpoint(bsc_endpoints);

    return bsc_web3;
}


const setupWeb3 = async () => {

    // connect to BSC
    const bsc_web3 = await setupBSCWeb3();
    
    // connect to Ethereum
    const eth_endpoints = [
        "https://eth.llamarpc.com",
        "https://ethereum.publicnode.com",
        "https://rpc.mevblocker.io",
    ]

    const eth_web3 = await connectToEndpoint(eth_endpoints);
    
    // connect to Polygon
    const polygon_endpoints = [
        "https://polygon.llamarpc.com",
        "https://1rpc.io/matic",
        "https://polygon-bor.publicnode.com",
    ]

    const polygon_web3 = await connectToEndpoint(polygon_endpoints);

    // connect to Fantom
    const fantom_endpoints = [
        "https://fantom.publicnode.com	",
        "https://fantom-mainnet.public.blastapi.io",
        "https://rpc3.fantom.network",
    ]

    const fantom_web3 = await connectToEndpoint(fantom_endpoints);

    // connect to Avalanche
    const avalanche_endpoints = [
        "https://api.avax.network/ext/bc/C/rpc",
        "https://avalanche-c-chain.publicnode.com",
        "https://endpoints.omniatech.io/v1/avax/mainnet/public",
    ]

    const avalanche_web3 = await connectToEndpoint(avalanche_endpoints);

    // connect to Optimism
    const optimism_endpoints = [
        "https://mainnet.optimism.io",
        "https://endpoints.omniatech.io/v1/op/mainnet/public",
        "https://opt-mainnet.g.alchemy.com/v2/demo",
    ]

    const optimism_web3 = await connectToEndpoint(optimism_endpoints);

    // connect to Arbitrum
    const arbitrum_endpoints = [
        "https://arb1.croswap.com/rpc",
        "https://arbitrum-one.public.blastapi.io",
        "https://rpc.ankr.com/arbitrum",
    ]

    const arbitrum_web3 = await connectToEndpoint(arbitrum_endpoints);

    // return web3 objects
    return {
        bsc: bsc_web3,
        eth: eth_web3,
        polygon: polygon_web3,
        fantom: fantom_web3,
        avalanche: avalanche_web3,
        optimism: optimism_web3,
        arbitrum: arbitrum_web3,
    }
};

// helper function that finds contract creation block using binary search.
const findCreationBlock = async (contractAddress, web3) => {

    let low = 0;
    let high = await web3.eth.getBlockNumber();

    while (high - low > 1) {
        let mid = Math.floor(low + (high - low) / 2);
        let code;
        try {
            code = await web3.eth.getCode(contractAddress, mid);
        } catch (e) {
            console.log(e);
            code = null;
        }
        if (code !== "0x") {
            high = mid;
        } else {
            low = mid;
        }
    }

    return high;
};

// helper function that finds the closest block after a given timestamp using binary search.
const findCloestBlockAfterTimesteamp = async (timestamp, web3) => {
    if (timestamp > Date.now()) {
        console.log("timestamp is in the future");
        return;
    }


    let low = 0;
    let high = await web3.eth.getBlockNumber();

    while (high - low > 1) {
        let mid = Math.floor(low + (high - low) / 2);
        let block;
        try {
            block = await web3.eth.getBlock(mid);
            if (block.timestamp > timestamp) {
                high = mid;
            } else {
                low = mid;
            }
        } catch (e) {
            console.log(e);
            block = null;
        }
    }

    return high;
};

// helper function that returns assetsPerSupplyRatio at a given block number
const getAssetsPerSupplyRatio = async (blockNum = "latest", web3, vaultAddress) => {

    let contract = new web3.eth.Contract(VENUSABI, vaultAddress);

    // totalAssets of this contract
    let totalAssets
    
    try {
        totalAssets = await contract.methods.totalAssets().call(blockNum);
    } catch (e) {
        console.log(e);
        totalAssets = 0
    }


    // totalSupply of this contract
    let totalSupply = await contract.methods.totalSupply().call(blockNum);

    let assetsPerSupplyRatio = totalAssets / totalSupply;

    return assetsPerSupplyRatio;
};

const getTimestampInSeconds = () => {
    return Math.floor(Date.now() / 1000)
}

const getVaultContractById = async (web3, id) => {
    const superPositionContract = new web3.eth.Contract(superPositionAbi, SUPERPOSITIONCONTRACTADDRESS)
    const superDestinationAddress = await superPositionContract.methods.srcSuperDestination().call()
    const superDestinationContract = new web3.eth.Contract(superDestinationAbi, superDestinationAddress)
    const vault565Address = await superDestinationContract.methods.vault(id).call()
    // if vault565Address is the zero address, return null
    // if (vault565Address === "0x0000000000000000000000000000000000000000") {
    //     return null
    // }
    const vault565Contract = new web3.eth.Contract(erc4626Abi, vault565Address)
    return vault565Contract
}

const getAPY = async (blockNum = "latest", web3, vaultAddress) => {

    // find contract creation block
    const creationBlock = await findCreationBlock(vaultAddress, web3)

    const currBlock = await web3.eth.getBlockNumber()

    if (blockNum > currBlock) {
        console.log("blockNum is in the future")
        return
    }

    // get assetsPerSupplyRatio at creation block
    const creationAPSR = 1

    // get assetsPerSupplyRatio at current block
    const currAPSR = await getAssetsPerSupplyRatio(blockNum, web3, vaultAddress)


    // if current assetsPerSupplyRatio is 0, return 0
    if (currAPSR === 0) {
        return 0
    }


    // calculate average blocks per day in the past week
    const currTime = (await web3.eth.getBlock(blockNum)).timestamp
    const weekAgoBlockNum = await findCloestBlockAfterTimesteamp(currTime - 604800, web3)

    const blocksPerDay = ((blockNum === "latest" ? currBlock : blockNum) - weekAgoBlockNum) / 7


    // calculate APY
    const ratioDelta = (currAPSR - creationAPSR) / creationAPSR

    const blockDelta = (blockNum === "latest" ? currBlock : blockNum) - creationBlock
    const days = blockDelta / blocksPerDay
    const apy = (1 + ratioDelta) ** (365 / days) - 1

    return apy
}
// get all holders of a given vault ID on all networks.
// return an object with the network as the key and the number of holders as the value
const getAllHoldersById = async (web3s, id) => {

    let result = {}

    await Promise.all(
        Object.entries(web3s).map(
            async ([network, web3]) => {

                let networkResult = {}

                const contract = await getVaultContractById(web3, id)
                console.log("contract: ", contract._address)
                if (contract._address !== "0x0000000000000000000000000000000000000000") {
                    const holders = new Set()
                    const eventsTransfer = await contract.getPastEvents("Transfer", {fromBlock: "earliest", toBlock: "latest"})
                    // console.log("events: ", events)
                    for (var i = 0; i < eventsTransfer.length; i++) {
                        const event = eventsTransfer[i]
                        holders.add(event.returnValues.from)
                        holders.add(event.returnValues.to)
                    }

                    networkResult["Transfer"] = holders.size
        
                    // checks if the wallet has any balance
                    holders.forEach((holder) => {
                        contract.methods.balanceOf(holder).call().then((balance) => {
                            if (balance === 0) {
                                holders.delete(holder)
                            }
                        })
                    })

                    // checks if the wallet has any balance
                    holders.forEach((holder) => {
                        contract.methods.balanceOf(holder).call().then((balance) => {
                            if (balance === 0) {
                                holders.delete(holder)
                            }
                        })
                    })

                    const users = new Set()
                    const eventsDeposit = await contract.getPastEvents("Deposit", {fromBlock: "earliest", toBlock: "latest"})
                    for (var i = 0; i < eventsDeposit.length; i++) {
                        const event = eventsDeposit[i]
                        users.add(event.returnValues.caller)
                    }

                    const eventsWithdraw = await contract.getPastEvents("Withdraw", {fromBlock: "earliest", toBlock: "latest"})
                    // console.log("events: ", eventsWithdraw)
                    for (var i = 0; i < eventsWithdraw.length; i++) {
                        const event = eventsWithdraw[i]
                        users.add(event.returnValues.caller)
                    }

                    networkResult["Depoist|Withdraw"] = users.size

                    
        
                
                    result[network] = networkResult
                }


            }
        )
    )

    return result
}
  

module.exports = {
    setupWeb3,
    findCreationBlock,
    findCloestBlockAfterTimesteamp,
    getAssetsPerSupplyRatio,
    VENUSCONTRACTADDRESS,
    getTimestampInSeconds,
    setupBSCWeb3,
    getVaultContractById,
    getAPY,
    getAllHoldersById
};
