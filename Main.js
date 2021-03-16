const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));

// Config
const CONFIG = {
    WALLET: {
        ADDRESS: '',
        KEY: '',
    },
    INTERVAL: 4 * 60 * 60 * 1000, // Every 4 hours
    CONTROLLER: '0xf7b8d9f8a82a7a6dd448398afc5c77744bd6cb85', // v4
    WANTS: [
        '0xd7538cabbf8605bde1f4901b47b8d42c61de0367', // AVAX-PNG
        '0x1acf1583bebdca21c8025e172d8e8f2817343d65', // AVAX-ETH
        '0xbbc7fff833d27264aac8806389e02f717a5506c9', // AVAX-LINK
        '0xd8b262c0676e13100b33590f10564b46eef652ad', // AVAX-SUSHI
    ],
    TEST_MODE: true,
};

const CONTROLLER_ABI = [{"type":"constructor","stateMutability":"nonpayable","inputs":[{"type":"address","name":"_governance","internalType":"address"},{"type":"address","name":"_strategist","internalType":"address"},{"type":"address","name":"_timelock","internalType":"address"},{"type":"address","name":"_devfund","internalType":"address"},{"type":"address","name":"_treasury","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"approveGlobeConverter","inputs":[{"type":"address","name":"_converter","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"approveStrategy","inputs":[{"type":"address","name":"_token","internalType":"address"},{"type":"address","name":"_strategy","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"approvedGlobeConverters","inputs":[{"type":"address","name":"","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"approvedStrategies","inputs":[{"type":"address","name":"","internalType":"address"},{"type":"address","name":"","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"balanceOf","inputs":[{"type":"address","name":"_token","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"burn","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"convenienceFee","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"convenienceFeeMax","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"converters","inputs":[{"type":"address","name":"","internalType":"address"},{"type":"address","name":"","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"devfund","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"earn","inputs":[{"type":"address","name":"_token","internalType":"address"},{"type":"uint256","name":"_amount","internalType":"uint256"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"expected","internalType":"uint256"}],"name":"getExpectedReturn","inputs":[{"type":"address","name":"_strategy","internalType":"address"},{"type":"address","name":"_token","internalType":"address"},{"type":"uint256","name":"parts","internalType":"uint256"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"globes","inputs":[{"type":"address","name":"","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"governance","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"inCaseStrategyTokenGetStuck","inputs":[{"type":"address","name":"_strategy","internalType":"address"},{"type":"address","name":"_token","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"inCaseTokensGetStuck","inputs":[{"type":"address","name":"_token","internalType":"address"},{"type":"uint256","name":"_amount","internalType":"uint256"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"max","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"onesplit","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"revokeGlobeConverter","inputs":[{"type":"address","name":"_converter","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"revokeStrategy","inputs":[{"type":"address","name":"_token","internalType":"address"},{"type":"address","name":"_strategy","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setConvenienceFee","inputs":[{"type":"uint256","name":"_convenienceFee","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setDevFund","inputs":[{"type":"address","name":"_devfund","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setGlobe","inputs":[{"type":"address","name":"_token","internalType":"address"},{"type":"address","name":"_globe","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setGovernance","inputs":[{"type":"address","name":"_governance","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setOneSplit","inputs":[{"type":"address","name":"_onesplit","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setSplit","inputs":[{"type":"uint256","name":"_split","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setStrategist","inputs":[{"type":"address","name":"_strategist","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setStrategy","inputs":[{"type":"address","name":"_token","internalType":"address"},{"type":"address","name":"_strategy","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setTimelock","inputs":[{"type":"address","name":"_timelock","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setTreasury","inputs":[{"type":"address","name":"_treasury","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"split","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"strategies","inputs":[{"type":"address","name":"","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"strategist","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"swapExactGlobeForGlobe","inputs":[{"type":"address","name":"_fromGlobe","internalType":"address"},{"type":"address","name":"_toGlobe","internalType":"address"},{"type":"uint256","name":"_fromGlobeAmount","internalType":"uint256"},{"type":"uint256","name":"_toGlobeMinAmount","internalType":"uint256"},{"type":"address[]","name":"_targets","internalType":"address payable[]"},{"type":"bytes[]","name":"_data","internalType":"bytes[]"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"timelock","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"treasury","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"withdraw","inputs":[{"type":"address","name":"_token","internalType":"address"},{"type":"uint256","name":"_amount","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"withdrawAll","inputs":[{"type":"address","name":"_token","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"yearn","inputs":[{"type":"address","name":"_strategy","internalType":"address"},{"type":"address","name":"_token","internalType":"address"},{"type":"uint256","name":"parts","internalType":"uint256"}]}];
const SNOWGLOBE_ABI = [{"type":"constructor","stateMutability":"nonpayable","inputs":[{"type":"address","name":"_token","internalType":"address"},{"type":"address","name":"_governance","internalType":"address"},{"type":"address","name":"_timelock","internalType":"address"},{"type":"address","name":"_controller","internalType":"address"}]},{"type":"event","name":"Approval","inputs":[{"type":"address","name":"owner","internalType":"address","indexed":true},{"type":"address","name":"spender","internalType":"address","indexed":true},{"type":"uint256","name":"value","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"Transfer","inputs":[{"type":"address","name":"from","internalType":"address","indexed":true},{"type":"address","name":"to","internalType":"address","indexed":true},{"type":"uint256","name":"value","internalType":"uint256","indexed":false}],"anonymous":false},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"allowance","inputs":[{"type":"address","name":"owner","internalType":"address"},{"type":"address","name":"spender","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"approve","inputs":[{"type":"address","name":"spender","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"available","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"balance","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"balanceOf","inputs":[{"type":"address","name":"account","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"controller","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint8","name":"","internalType":"uint8"}],"name":"decimals","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"decreaseAllowance","inputs":[{"type":"address","name":"spender","internalType":"address"},{"type":"uint256","name":"subtractedValue","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"deposit","inputs":[{"type":"uint256","name":"_amount","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"depositAll","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"earn","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"getRatio","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"governance","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"harvest","inputs":[{"type":"address","name":"reserve","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"increaseAllowance","inputs":[{"type":"address","name":"spender","internalType":"address"},{"type":"uint256","name":"addedValue","internalType":"uint256"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"max","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"min","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"string","name":"","internalType":"string"}],"name":"name","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setController","inputs":[{"type":"address","name":"_controller","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setGovernance","inputs":[{"type":"address","name":"_governance","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setMin","inputs":[{"type":"uint256","name":"_min","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setTimelock","inputs":[{"type":"address","name":"_timelock","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"string","name":"","internalType":"string"}],"name":"symbol","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"timelock","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"contract IERC20"}],"name":"token","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"totalSupply","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"transfer","inputs":[{"type":"address","name":"recipient","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"transferFrom","inputs":[{"type":"address","name":"sender","internalType":"address"},{"type":"address","name":"recipient","internalType":"address"},{"type":"uint256","name":"amount","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"withdraw","inputs":[{"type":"uint256","name":"_shares","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"withdrawAll","inputs":[]}];
const STRATEGY_ABI = [{"type":"constructor","stateMutability":"nonpayable","inputs":[{"type":"address","name":"_governance","internalType":"address"},{"type":"address","name":"_strategist","internalType":"address"},{"type":"address","name":"_controller","internalType":"address"},{"type":"address","name":"_timelock","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"balanceOf","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"balanceOfPool","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"balanceOfWant","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"controller","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"deposit","inputs":[]},{"type":"function","stateMutability":"payable","outputs":[{"type":"bytes","name":"response","internalType":"bytes"}],"name":"execute","inputs":[{"type":"address","name":"_target","internalType":"address"},{"type":"bytes","name":"_data","internalType":"bytes"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"getHarvestable","inputs":[]},{"type":"function","stateMutability":"pure","outputs":[{"type":"string","name":"","internalType":"string"}],"name":"getName","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"governance","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"harvest","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"bool","name":"","internalType":"bool"}],"name":"harvesters","inputs":[{"type":"address","name":"","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"keepPNG","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"keepPNGMax","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"pangolinRouter","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"performanceDevFee","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"performanceDevMax","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"performanceTreasuryFee","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"performanceTreasuryMax","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"png","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"png_avax_png_lp","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"png_avax_png_rewards","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"revokeHarvester","inputs":[{"type":"address","name":"_harvester","internalType":"address"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"rewards","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setController","inputs":[{"type":"address","name":"_controller","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setGovernance","inputs":[{"type":"address","name":"_governance","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setKeepPNG","inputs":[{"type":"uint256","name":"_keepPNG","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setPerformanceDevFee","inputs":[{"type":"uint256","name":"_performanceDevFee","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setPerformanceTreasuryFee","inputs":[{"type":"uint256","name":"_performanceTreasuryFee","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setStrategist","inputs":[{"type":"address","name":"_strategist","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setTimelock","inputs":[{"type":"address","name":"_timelock","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setWithdrawalDevFundFee","inputs":[{"type":"uint256","name":"_withdrawalDevFundFee","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"setWithdrawalTreasuryFee","inputs":[{"type":"uint256","name":"_withdrawalTreasuryFee","internalType":"uint256"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"strategist","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"timelock","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"token1","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"want","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"address","name":"","internalType":"address"}],"name":"wavax","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"whitelistHarvester","inputs":[{"type":"address","name":"_harvester","internalType":"address"}]},{"type":"function","stateMutability":"nonpayable","outputs":[],"name":"withdraw","inputs":[{"type":"uint256","name":"_amount","internalType":"uint256"}]},{"type":"function","stateMutability":"nonpayable","outputs":[{"type":"uint256","name":"balance","internalType":"uint256"}],"name":"withdraw","inputs":[{"type":"address","name":"_asset","internalType":"contract IERC20"}]},{"type":"function","stateMutability":"nonpayable","outputs":[{"type":"uint256","name":"balance","internalType":"uint256"}],"name":"withdrawAll","inputs":[]},{"type":"function","stateMutability":"nonpayable","outputs":[{"type":"uint256","name":"balance","internalType":"uint256"}],"name":"withdrawForSwap","inputs":[{"type":"uint256","name":"_amount","internalType":"uint256"}]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"withdrawalDevFundFee","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"withdrawalDevFundMax","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"withdrawalTreasuryFee","inputs":[]},{"type":"function","stateMutability":"view","outputs":[{"type":"uint256","name":"","internalType":"uint256"}],"name":"withdrawalTreasuryMax","inputs":[]}];

// Authenticate our wallet
if (!CONFIG.TEST_MODE) {
    web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
    console.log(`WARNING!! Test mode is disabled. Real harvesting might begin!!`);
}

(async () => {
    const contracts = await initContracts(CONFIG.WANTS);

    // Execute once now
    loop();

    // Schedule main loop
    setInterval(loop, CONFIG.INTERVAL);

    function loop() {
        createHarvests(contracts)
            .then(addHarvestTx)
            .then(addHarvestGain)
            .then(addHarvestGas)
            .then(filterHarvestByCostVsGain)
            .then(doHarvesting)
            .then(logHarvestingResults)
            .catch(handleError);
    }

})();

async function initContracts(wantsAddresses) {
    const controllerContract = new web3.eth.Contract(CONTROLLER_ABI, CONFIG.CONTROLLER);

    const contractCache = [];
    for (const wantAddress of wantsAddresses) {
        const snowglobeAddresses = [await controllerContract.methods.globes(wantAddress).call()];
        const strategyAddresses = [await controllerContract.methods.strategies(wantAddress).call()];

        if (snowglobeAddresses.some(a => !web3.utils.isAddress(a)) || strategyAddresses.some(a => !web3.utils.isAddress(a))) {
            continue;
        }
        contractCache.push({
            globes: snowglobeAddresses.map(a => new web3.eth.Contract(SNOWGLOBE_ABI, a)),
            strategies: strategyAddresses.map(a => new web3.eth.Contract(STRATEGY_ABI, a)),
        });
    }
    return contractCache;
}

function createHarvests(contracts) {
    const mapStrategyToHarvestable = async (strategyContract) => ({
        strategy: strategyContract,
        harvestable: web3.utils.toBN(await strategyContract.methods.getHarvestable().call()),
        treasuryFee: web3.utils.toBN(await strategyContract.methods.performanceTreasuryFee().call()),
        treasuryMax: web3.utils.toBN(await strategyContract.methods.performanceTreasuryFee().call()),
    });
    const strategyContracts = contracts.map(c => c.strategies).reduce((output, strategies) => output.concat(strategies), []);
    return Promise.all(strategyContracts.map(mapStrategyToHarvestable))
        .catch(err => {
            console.error(`Error fetching information from strategy`);
            throw err;
        });
}

function addHarvestTx(harvests) {
    const addHarvestTx = async (harvest) => ({
        ...harvest,
        tx: harvest.strategy.methods.harvest(),
    });
    return Promise.all(harvests.map(addHarvestTx))
        .catch(err => {
            console.error(`Error adding harvest tx`);
            throw err;
        });
}

function addHarvestGain(harvests) {
    const addHarvestGain = async (harvest) => ({
        ...harvest,
        gain: await convertPNGToWavax(harvest.harvestable),
    });
    return Promise.all(harvests.map(addHarvestGain))
        .catch(err => {
            console.error(`Error adding harvest gain`);
            throw err;
        });
}

function addHarvestGas(harvests) {
    const addHarvestGas = async (harvest) => ({
        ...harvest,
        gas: await harvest.tx.estimateGas({from: CONFIG.WALLET.ADDRESS}),
        gasPrice: await web3.eth.getGasPrice(),
    });
    return Promise.all(harvests.map(addHarvestGas))
        .catch(err => {
            console.error(`Error adding harvest gas`);
            throw err;
        });
}

function filterHarvestByCostVsGain(harvests) {
    return harvests.filter(harvest => {
        console.log(`Comparing gas cost vs. treasury gain for ${harvest.strategy._address}`);
        const cost = convertGasToAvax(harvest.gas, harvest.gasPrice);
        const treasuryGain = harvest.gain.mul(harvest.treasuryFee).div(harvest.treasuryMax);
        console.log(`Gas cost: ${displayBNasFloat(cost, 18).toFixed(4)} AVAX`);
        console.log(`Treasury gain: ${displayBNasFloat(treasuryGain, 18).toFixed(4)} AVAX`);
        return cost.lt(treasuryGain);
    });
}

async function doHarvesting(harvests) {
    const nonce = await web3.eth.getTransactionCount(CONFIG.WALLET.ADDRESS);
    const executeHarvestTx = async (harvest, i) => {
        if (CONFIG.TEST_MODE) return console.log(`Would have harvested strategy ${harvest.strategy._address}. Disable CONFIG.TEST_MODE to execute`);
        console.log(`Harvesting strategy address: ${harvest.strategy._address} ...`);
        return await harvest.tx.send({ from: CONFIG.WALLET.ADDRESS, gas: harvest.gas, gasPrice: harvest.gasPrice, nonce: nonce + i });
    };
    return Promise.allSettled(harvests.map(executeHarvestTx));
}

function logHarvestingResults(results) {
    if (CONFIG.TEST_MODE) return;
    results.forEach(({ reason, value }) => {
        if (value) {
            // Successfully called harvest()
            console.log(`Successfully harvested strategy ${value.to} via transaction ${value.transactionHash} in block ${value.blockNumber}`);
        } else {
            // Failed to execute harvest()
            console.error(reason);
        }
    });
}


///// Helper functions


async function convertPNGToWavax(pngQuantity) {
    // Slimmed down ABI to just include the 'getReserves' method
    const PANGOLIN_POOL_ABI_SLIM = [{"type":"function","stateMutability":"view","payable":false,"outputs":[{"type":"uint112","name":"_reserve0","internalType":"uint112"},{"type":"uint112","name":"_reserve1","internalType":"uint112"},{"type":"uint32","name":"_blockTimestampLast","internalType":"uint32"}],"name":"getReserves","inputs":[],"constant":true}];
    const PANGOLIN_PNG_WAVAX_POOL_ADDRESS = '0xd7538cabbf8605bde1f4901b47b8d42c61de0367';
    const pangolinPNGWAVAXContract = new web3.eth.Contract(PANGOLIN_POOL_ABI_SLIM, PANGOLIN_PNG_WAVAX_POOL_ADDRESS);

    // reserve0 is PNG, reserve1 is WAVAX
    const { _reserve0, _reserve1 } = await pangolinPNGWAVAXContract.methods.getReserves().call();

    const reserveIn = web3.utils.toBN(_reserve0);
    const reserveOut = web3.utils.toBN(_reserve1);

    const amountInWithFee = pngQuantity.muln(977);
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.muln(1000).add(amountInWithFee);
    return numerator.div(denominator);
}

function convertGasToAvax(gas, gasPrice) {
    const gasBigNumber = web3.utils.toBN(gas);
    const gasPriceBigNumber = web3.utils.toBN(gasPrice);
    return gasBigNumber.mul(gasPriceBigNumber);
}

function displayBNasFloat(bigNumber, decimals) {
    const stringNumber = bigNumber.toString();
    const isNegative = stringNumber[0] === '-';
    const unsignedString = stringNumber.replace('-', '');
    const zeroPadding = '0'.repeat(Math.max(decimals - unsignedString.length, 0));
    const unsignedPaddedInput = zeroPadding + unsignedString;
    const wholePartString = (isNegative ? '-' : '') + unsignedPaddedInput.slice(0, unsignedPaddedInput.length - decimals);
    const fractionalPartString = unsignedPaddedInput.slice(unsignedPaddedInput.length - decimals, unsignedPaddedInput.length);

    if (decimals === 0) {
        // if (unsignedString.replace(/0+$/, '').length >= 18) logger.execution.warn(`Converting ${wholePartString} will lose precision`);
        return parseInt(wholePartString);
    } else {
        // if (unsignedString.replace(/0+$/, '').length >= 18) logger.execution.warn(`Converting ${wholePartString}.${fractionalPartString} will lose precision`);
        return parseFloat(`${wholePartString}.${fractionalPartString}`);
    }
}

function handleError(err) {
    console.error(err);
}
