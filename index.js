const { getAPY,
    setupWeb3,
    getVaultContractById,
    VENUSCONTRACTADDRESS,
    getAllHoldersById
    } = require('./utils.js')




setupWeb3().then((web3s) => {

    const bscWeb3 = web3s.bsc
    const ethWeb3 = web3s.eth

    // 1. get current APY of Vault ID 565 on BSC
    // getAPY("latest", bscWeb3, VENUSCONTRACTADDRESS).then((apy) => {
    //     console.log("apy: ", apy)
    // })

    // // 2. get APY of Vault ID 565 on BSC 50000 blocks ago
    // bscWeb3.eth.getBlockNumber().then((blockNum) => {
    //     getAPY(blockNum - 500000, bscWeb3, VENUSCONTRACTADDRESS).then((apy) => {
    //         console.log("apy 500000 blocks ago: ", apy)
    //     })
    // })







    
    // // 3. get contract adds of Vault ID 565 on all networks
    // Object.entries(web3s).forEach(([network, web3]) => {
    //     getVaultContractById(web3, 565).then((contract) => {
    //         console.log(`Vault ID 565 on: ${network}: `, contract._address)
    //     })
    // })

    // 4. according to https://bscscan.com/token/0x889447dFab0611F714a12306cB66392EC38d2211
    // vault ID 565 only exist on BSC
    // so BSC has 100% of users

    // 5. get number of holders and users
    getAllHoldersById({eth: ethWeb3}, 113).then((result) => {
        console.log("result: ", result)
    })
})

