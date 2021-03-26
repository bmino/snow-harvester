const CONFIG = require('../../config/Config');
const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
const Util = require('./Util');
const DiscordBot = require('./DiscordBot');

// Authenticate our wallet
if (CONFIG.EXECUTION.ENABLED) {
    web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
    console.log(`WARNING!! Test mode is disabled. Real harvesting might begin!!`);
}

// Globals to manage consistent scheduling with a window of variance
// Do not touch these :)
let executionWindowCenter = Date.now();
let executionDrift = 0;

// Manually trigger first harvest cycle
DiscordBot.login(CONFIG.DISCORD.TOKEN).then(harvest);


function harvest() {
    console.log(`Executing harvest() at ${new Date().toLocaleString()}`);
    initHarvests(CONFIG.STRATEGY)
        .then(addHarvestTx)
        .then(addHarvestGas)
        .then(addHarvestFees)
        .then(addHarvestGain)
        .then(filterHarvestByCostVsGain)
        .then(doHarvesting)
        .then(logHarvestingResults)
        .then(doDiscordUpdate)
        .then(scheduleNextHarvest)
        .catch(handleError);
}

async function initHarvests(strategyObject) {
    const contractCache = [];
    for (const [strategyAddress, strategyName] of Object.entries(strategyObject)) {
        if (!web3.utils.isAddress(strategyAddress)) continue;
        contractCache.push({
            name: strategyName,
            strategy: new web3.eth.Contract(ABI.STRATEGY, strategyAddress),
        });
    }
    return contractCache;
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

function addHarvestFees(harvests) {
    const addHarvestFees = async (harvest) => ({
        ...harvest,
        harvestable: web3.utils.toBN(await harvest.strategy.methods.getHarvestable().call()),
        treasuryFee: web3.utils.toBN(await harvest.strategy.methods.performanceTreasuryFee().call()),
        treasuryMax: web3.utils.toBN(await harvest.strategy.methods.performanceTreasuryFee().call()),
    });
    return Promise.all(harvests.map(addHarvestFees))
        .catch(err => {
            console.error(`Error fetching information from strategy`);
            throw err;
        });
}

function addHarvestGain(harvests) {
    const addHarvestGain = async (harvest) => ({
        ...harvest,
        gainWAVAX: await convertPNGToWavax(harvest.harvestable),
        gainUSDT: await convertPNGToUSDT(harvest.harvestable),
    });
    return Promise.all(harvests.map(addHarvestGain))
        .catch(err => {
            console.error(`Error adding harvest gain`);
            throw err;
        });
}

function filterHarvestByCostVsGain(harvests) {
    return harvests.filter(harvest => {
        console.log(`Comparing gas cost vs. treasury gain for ${harvest.strategy._address} (${harvest.name})`);
        const costAsAvax = web3.utils.toBN(harvest.gas).mul(web3.utils.toBN(harvest.gasPrice));
        const treasuryGainAsAvax = harvest.gainWAVAX.mul(harvest.treasuryFee).div(harvest.treasuryMax);
        console.log(`Gas cost: ${Util.displayBNasFloat(costAsAvax, 18).toFixed(4)} AVAX`);
        console.log(`Treasury gain: ${Util.displayBNasFloat(treasuryGainAsAvax, 18).toFixed(4)} AVAX`);
        return costAsAvax.lt(treasuryGainAsAvax);
    });
}

async function doHarvesting(harvests) {
    const nonce = await web3.eth.getTransactionCount(CONFIG.WALLET.ADDRESS);
    const executeHarvestTx = async (harvest, i) => {
        if (!CONFIG.EXECUTION.ENABLED) return console.log(`Would have harvested strategy ${harvest.strategy._address}. Set CONFIG.EXECUTION.ENABLED to enable harvesting`);
        console.log(`Harvesting strategy address: ${harvest.strategy._address} (${harvest.name}) ...`);
        return await harvest.tx.send({ from: CONFIG.WALLET.ADDRESS, gas: harvest.gas, gasPrice: harvest.gasPrice, nonce: nonce + i });
    };
    return Promise.allSettled(harvests.map(executeHarvestTx))
        .then(results => ({ results, harvests }));
}

function logHarvestingResults({ results, harvests }) {
    for (let i = 0; i< results.length; i++) {
        const {reason, value} = results[i];
        const harvest = harvests[i];
        if (value || !CONFIG.EXECUTION.ENABLED) {
            // Successfully called harvest()
            if (!CONFIG.EXECUTION.ENABLED) console.log(`---------- Set CONFIG.EXECUTION.ENABLED to execute the following ----------`);
            else console.log(`------------------------------------------------------------`);
            console.log(`Strategy:    ${harvest.name} (${value?.to ?? harvest.strategy._address})`);
            console.log(`Reinvested:  ${Util.displayBNasFloat(harvest.harvestable, 18).toFixed(2)} PNG ($${Util.displayBNasFloat(harvest.gainUSDT, 6).toFixed(2)})`);
            console.log(`Transaction: ${value?.transactionHash ?? '[real tx hash]'}`);
        } else {
            // Failed to execute harvest()
            console.error(`Failed to harvest for strategy ${value?.to ?? harvest.strategy._address} (${harvest.name})`);
            console.error(reason);
        }
    }
    return { results, harvests };
}

async function doDiscordUpdate({ results, harvests }) {
    if (!CONFIG.EXECUTION.ENABLED) return console.log(`Discord notifications are disabled while in test mode`);
    if (!CONFIG.DISCORD.ENABLED) return console.log(`Did not notify discord. Set CONFIG.DISCORD.ENABLED to send notifications to #harvests`);

    for (let i = 0; i< results.length; i++) {
        const {reason, value} = results[i];
        const harvest = harvests[i];
        if (value) {
            const msg = [];
            msg.push('```');
            msg.push(`Strategy:    ${harvest.name}`); // Excluding the strategy address for now: ${harvest.strategy._address}
            msg.push(`Reinvested:  ${Util.displayBNasFloat(harvest.harvestable, 18).toFixed(2)} PNG ($${Util.displayBNasFloat(harvest.gainUSDT, 6).toFixed(2)})`);
            msg.push(`Transaction: ${value.transactionHash}`);
            msg.push('```');
            DiscordBot.sendMessage(msg.join("\n"), CONFIG.DISCORD.CHANNEL);
        }
    }
}

function handleError(err) {
    console.error(err);
    setTimeout(() => process.exit(1), 1000); // Ensure stderr has time to flush buffer
}

function scheduleNextHarvest() {
    executionWindowCenter += CONFIG.EXECUTION.INTERVAL;
    executionDrift = Util.randomIntFromInterval(-1 * CONFIG.EXECUTION.INTERVAL_WINDOW, CONFIG.EXECUTION.INTERVAL_WINDOW);
    const now = Date.now();
    const delay = executionWindowCenter - now + executionDrift;
    console.log();
    console.log(`New execution window: ${new Date(executionWindowCenter - CONFIG.EXECUTION.INTERVAL_WINDOW).toLocaleTimeString()} - ${new Date(executionWindowCenter + CONFIG.EXECUTION.INTERVAL_WINDOW).toLocaleTimeString()}`);
    console.log(`Scheduled next harvest() for ${new Date(now + delay).toLocaleString()}`);
    console.log();
    setTimeout(harvest, delay);
}


///// Helper functions


async function convertPNGToWavax(pngQuantity) {
    const PANGOLIN_ROUTER_ADDRESS = '0xe54ca86531e17ef3616d22ca28b0d458b6c89106';
    const PNG_ADDRESS = '0x60781c2586d68229fde47564546784ab3faca982';
    const WAVAX_ADDRESS = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7';

    const routerContract = new web3.eth.Contract(ABI.PANGOLIN_ROUTER, PANGOLIN_ROUTER_ADDRESS);
    const [input, output] = await routerContract.methods.getAmountsOut(pngQuantity.toString(), [PNG_ADDRESS, WAVAX_ADDRESS]).call();
    return web3.utils.toBN(output);
}

async function convertPNGToUSDT(pngQuantity) {
    const PANGOLIN_ROUTER_ADDRESS = '0xe54ca86531e17ef3616d22ca28b0d458b6c89106';
    const PNG_ADDRESS = '0x60781c2586d68229fde47564546784ab3faca982';
    const USDT_ADDRESS = '0xde3a24028580884448a5397872046a019649b084';

    const routerContract = new web3.eth.Contract(ABI.PANGOLIN_ROUTER, PANGOLIN_ROUTER_ADDRESS);
    const [input, output] = await routerContract.methods.getAmountsOut(pngQuantity.toString(), [PNG_ADDRESS, USDT_ADDRESS]).call();
    return web3.utils.toBN(output);
}
