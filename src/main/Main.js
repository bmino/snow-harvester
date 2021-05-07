const CONFIG = require('../../config/Config');
const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
const Util = require('./Util');
const DiscordBot = require('./DiscordBot');
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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
    initHarvests()
        .then(addRequirements)
        .then(addCalculations)
        .then(addTx)
        .then(addGas)
        .then(addDecisions)
        .then(doHarvesting)
        .then(doEarning)
        .then(scheduleNextHarvest)
        .catch(handleError);
}

async function initHarvests() {
    const harvests = [];

    const gasPrice = await web3.eth.getGasPrice();

    for (const [wantAddress, friendlyName] of Object.entries(CONFIG.WANTS)) {
        const { controller, want, snowglobe, strategy } = await initializeContracts(CONFIG.CONTROLLERS, wantAddress);
        const snowglobeSymbol = await snowglobe.methods.symbol().call();

        harvests.push({
            name: friendlyName,
            controller,
            want,
            snowglobe,
            snowglobeSymbol,
            strategy,
            gasPrice,
        });
    }

    return harvests;
}

function addRequirements(harvests) {
    const addHarvestFees = async (harvest) => ({
        ...harvest,
        harvestable: web3.utils.toBN(await harvest.strategy.methods.getHarvestable().call()),
        treasuryFee: web3.utils.toBN(await harvest.strategy.methods.performanceTreasuryFee().call()),
        treasuryMax: web3.utils.toBN(await harvest.strategy.methods.performanceTreasuryFee().call()),
        balance: web3.utils.toBN(await harvest.snowglobe.methods.balance().call()),
        available: web3.utils.toBN(await harvest.snowglobe.methods.available().call()),
    });
    return Promise.all(harvests.map(addHarvestFees))
        .catch(err => {
            console.error(`Error fetching requirements from strategy`);
            throw err;
        });
}

function addCalculations(harvests) {
    const addHarvestGain = async (harvest) => ({
        ...harvest,
        gainWAVAX: await convertPNGToWavax(harvest.harvestable),
        gainUSDT: await convertPNGToUSDT(harvest.harvestable),
        ratio: harvest.available.muln(100).div(harvest.balance),
    });
    return Promise.all(harvests.map(addHarvestGain))
        .catch(err => {
            console.error(`Error adding harvest gain`);
            throw err;
        });
}

function addTx(harvests) {
    const addHarvestTx = async (harvest) => ({
        ...harvest,
        harvestTx: harvest.strategy.methods.harvest(),
        earnTx: harvest.snowglobe.methods.earn(),
    });
    return Promise.all(harvests.map(addHarvestTx))
        .catch(err => {
            console.error(`Error adding harvest tx`);
            throw err;
        });
}

async function addGas(harvests) {
    const addHarvestGas = async (harvest) => ({
        ...harvest,
        harvestGas: await harvest.harvestTx.estimateGas({from: CONFIG.WALLET.ADDRESS}),
        earnGas: await harvest.earnTx.estimateGas({from: CONFIG.WALLET.ADDRESS}),
    });
    return Promise.all(harvests.map(addHarvestGas))
        .catch(err => {
            console.error(`Error adding harvest gas`);
            throw err;
        });
}

function addDecisions(harvests) {
    const addHarvestDecision = (harvest) => {
        console.log(`Determining execution decisions for ${harvest.name}`);
        const cost = web3.utils.toBN(harvest.harvestGas).mul(web3.utils.toBN(harvest.gasPrice));
        const gain = harvest.gainWAVAX.mul(harvest.treasuryFee).div(harvest.treasuryMax);
        const harvestDecision = cost.lt(gain);
        console.log(`Harvest decision: ${harvestDecision}`);
        const earnDecision = harvest.ratio.gten(1);
        console.log(`Earn decision: ${earnDecision}`);
        return {
            ...harvest,
            harvestDecision,
            earnDecision,
        };
    };
    return harvests.map(addHarvestDecision);
}


async function doHarvesting(harvests) {
    let nonce = await web3.eth.getTransactionCount(CONFIG.WALLET.ADDRESS);
    const executeHarvestTx = async (harvest) => {
        if (!harvest.harvestDecision) return null;
        if (!CONFIG.EXECUTION.ENABLED) return console.log(`Would have harvested strategy ${harvest.strategy._address}. Set CONFIG.EXECUTION.ENABLED to enable harvesting`);
        console.log(`Harvesting strategy address: ${harvest.strategy._address} (${harvest.name}) ...`);
        return await harvest.harvestTx.send({ from: CONFIG.WALLET.ADDRESS, gas: harvest.harvestGas, gasPrice: harvest.gasPrice, nonce: nonce++ });
    };
    const results = await Promise.allSettled(harvests.map(executeHarvestTx));
    logHarvestingResults({ results, harvests });
    await discordHarvestUpdate({ results, harvests });
    return harvests;
}

async function doEarning(harvests) {
    let nonce = await web3.eth.getTransactionCount(CONFIG.WALLET.ADDRESS);
    const executeEarnTx = async (harvest) => {
        if (!harvest.earnDecision) return null;
        if (!CONFIG.EXECUTION.ENABLED) return console.log(`Would have swept ${harvest.snowglobe._address}. Set CONFIG.EXECUTION.ENABLED to enable sweeping`);
        console.log(`Sweeping snowglobe address: ${harvest.snowglobe._address} (${harvest.name}) ...`);
        return await harvest.earnTx.send({ from: CONFIG.WALLET.ADDRESS, gas: harvest.earnGas, gasPrice: harvest.gasPrice, nonce: nonce++ });
    };

    const results = await Promise.allSettled(harvests.map(executeEarnTx));
    logEarnResults({ results, harvests });
    await discordEarnUpdate({ results, harvests });
    return harvests;
}


function logHarvestingResults({ results, harvests }) {
    for (let i = 0; i < results.length; i++) {
        const harvest = harvests[i];
        if (!harvest.harvestDecision) continue;
        const {reason, value} = results[i];
        if (value || !CONFIG.EXECUTION.ENABLED) {
            // Successfully called harvest() or a test run
            console.log(`------------------------------------------------------------`);
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

function logEarnResults({ results, harvests }) {
    for (let i = 0; i < results.length; i++) {
        const harvest = harvests[i];
        if (!harvest.earnDecision) continue;
        const {reason, value} = results[i];
        if (value || !CONFIG.EXECUTION.ENABLED) {
            // Successfully called earn() or a test run
            console.log(`------------------------------------------------------------`);
            console.log(`Snowglobe:   ${harvest.name} (${value?.to ?? harvest.snowglobe._address})`);
            console.log(`Swept:       ${Util.displayBNasFloat(harvest.available, 18).toFixed(2)} ${harvest.snowglobeSymbol}`);
            console.log(`Transaction: ${value?.transactionHash ?? '[real tx hash]'}`);
        } else {
            // Failed to execute earn()
            console.error(`Failed to sweep for snowglobe ${value?.to ?? harvest.snowglobe._address} (${harvest.name})`);
            console.error(reason);
        }
    }
    return { results, harvests };
}

async function discordHarvestUpdate({ results, harvests }) {
    if (!CONFIG.EXECUTION.ENABLED) return console.log(`Discord notifications are disabled while in test mode`);
    if (!CONFIG.DISCORD.ENABLED) return console.log(`Did not notify discord. Set CONFIG.DISCORD.ENABLED to send notifications to #harvests`);

    for (let i = 0; i< results.length; i++) {
        const {reason, value} = results[i];
        const harvest = harvests[i];
        if (value) {
            const msg = [];
            msg.push('```');
            msg.push(`Strategy:    ${harvest.name}`);
            msg.push(`Reinvested:  ${Util.displayBNasFloat(harvest.harvestable, 18).toFixed(2)} PNG ($${Util.displayBNasFloat(harvest.gainUSDT, 6).toFixed(2)})`);
            msg.push(`Transaction: ${value.transactionHash}`);
            msg.push('```');
            DiscordBot.sendMessage(msg.join("\n"), CONFIG.DISCORD.HARVESTS);
        }
    }
}

async function discordEarnUpdate({ results, harvests }) {
    if (!CONFIG.EXECUTION.ENABLED) return console.log(`Discord notifications are disabled while in test mode`);
    if (!CONFIG.DISCORD.ENABLED) return console.log(`Did not notify discord. Set CONFIG.DISCORD.ENABLED to send notifications to #sweeps`);

    for (let i = 0; i< results.length; i++) {
        const {reason, value} = results[i];
        const harvest = harvests[i];
        if (value) {
            const msg = [];
            msg.push('```');
            console.log(`Snowglobe:   ${harvest.name}`);
            console.log(`Swept:       ${Util.displayBNasFloat(harvest.available, 18).toFixed(2)} ${harvest.snowglobeSymbol}`);
            console.log(`Transaction: ${value?.transactionHash ?? '[real tx hash]'}`);
            msg.push('```');
            DiscordBot.sendMessage(msg.join("\n"), CONFIG.DISCORD.HARVESTS);
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

async function initializeContracts(controllerAddresses, wantAddress) {
    if (!web3.utils.isAddress(wantAddress)) throw new Error(`Invalid want address ${wantAddress}`);

    for (const controllerAddress of controllerAddresses) {
        if (!web3.utils.isAddress(controllerAddress)) throw new Error(`Invalid controller address ${controllerAddress}`);

        const controller = new web3.eth.Contract(ABI.CONTROLLER, controllerAddress);
        const snowglobeAddress = await controller.methods.globes(wantAddress).call();
        const strategyAddress = await controller.methods.strategies(wantAddress).call();

        if (strategyAddress !== ZERO_ADDRESS && snowglobeAddress !== ZERO_ADDRESS) return {
            controller,
            want: new web3.eth.Contract(ABI.PANGOLIN_POOL, wantAddress),
            snowglobe: new web3.eth.Contract(ABI.SNOWGLOBE, snowglobeAddress),
            strategy: new web3.eth.Contract(ABI.STRATEGY, strategyAddress),
        };
    }
    throw new Error(`Could not identify a strategy & snowglobe for want address ${wantAddress}`);
}

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
