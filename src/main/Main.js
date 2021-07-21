const CONFIG = require('../../config/Config');
const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
const Util = require('./Util');
const DiscordBot = require('./DiscordBot');
const Wants = require('./Wants')
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const WAVAX_ADDRESS = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7';
const PNG_ADDRESS = '0x60781c2586d68229fde47564546784ab3faca982';
const JOE_ADDRESS = '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd';
const DAI_ADDRESS = '0xba7deebbfc5fa1100fb055a87773e1e99cd3507a';

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

async function getWants() {
    const omits = Wants.OVERRIDE_OMIT;
    const adds = Wants.OVERRIDE_ADD;
    const gauge_proxy = Wants.GAUGE_PROXY_CONTRACT;

    const gauges = await gauge_proxy.methods.tokens().call();

    console.log("gauges: ",gauges);

    // remove omit overrides
    gauges.filter(gauge => gauge in omits)

    // append add overrides
    Object.keys(adds).map((key, index) => {
        gauges.push(key)
    })

    return gauges
}

async function initHarvests() {
    const harvests = [];

    const gasPrice = await web3.eth.getGasPrice();

    const wants = await getWants()

    wants.map(wantAddress => {
        const { controller, want, snowglobe, strategy } = await initializeContracts(CONFIG.CONTROLLERS, wantAddress);
        const snowglobeSymbol = await snowglobe.methods.symbol().call();
        const wantSymbol = await want.methods.symbol().call();
        const wantDecimals = parseInt(await want.methods.decimals().call());
        const token0_addr = await want.methods.token0.call();
        const token1_addr = await want.methods.token1.call();
        const token0 = new web3.eth.Contract(ABI.ERC20, token0_addr) 
        const token1 = new web3.eth.Contract(ABI.ERC20, token1_addr)
        const token0_name = await token0.methods.symbol().call();
        const token1_name = await token1.methods.symbol().call();

        harvests.push({
            name: `${token0_name}-${token1_name}`,
            controller,
            want,
            wantSymbol,
            wantDecimals,
            snowglobe,
            snowglobeSymbol,
            strategy,
            gasPrice,
        });
    })

    return harvests;
}

function addRequirements(harvests) {
    const addHarvestFees = async (harvest) => {
        let priceLP
        switch(harvest.wantSymbol) {
            case("PGL"):
                priceLP = await estimatePriceOfAsset(PNG_ADDRESS, 18)
            case("JLP"):
                priceLP = await estimatePriceOfAsset(JLP_ADDRESS, 18)
            default:
                null
        }

        return {
            ...harvest,
            harvestable: web3.utils.toBN(await harvest.strategy.methods.getHarvestable().call()),
            treasuryFee: web3.utils.toBN(await harvest.strategy.methods.performanceTreasuryFee().call()),
            treasuryMax: web3.utils.toBN(await harvest.strategy.methods.performanceTreasuryFee().call()),
            balance: web3.utils.toBN(await harvest.snowglobe.methods.balance().call()),
            available: web3.utils.toBN(await harvest.snowglobe.methods.available().call()),
            priceWAVAX: await estimatePriceOfAsset(WAVAX_ADDRESS, 18),
            priceLP: priceLP,
            priceWant: await getPoolShareAsUSD(harvest.want),
        }
    };

    return Promise.all(harvests.map(addHarvestFees))
        .catch(err => {
            console.error(`Error fetching requirements from strategy`);
            throw err;
        });
}

function addCalculations(harvests) {
    const addHarvestGain = async (harvest) => ({
        ...harvest,
        gainWAVAX: harvest.harvestable.mul(harvest.priceLP).div(harvest.priceWAVAX),
        gainUSD: harvest.harvestable.mul(harvest.priceLP).div(Util.offset(18)),
        ratio: harvest.available.muln(100).div(harvest.balance),
        availableUSD: harvest.available.mul(harvest.priceWant).div(Util.offset(harvest.wantDecimals)),
    });
    return Promise.all(harvests.map(addHarvestGain))
        .catch(err => {
            console.error(`Error adding calculations`);
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
            console.error(`Error adding tx`);
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
            console.error(`Error adding gas`);
            throw err;
        });
}

function addDecisions(harvests) {
    const addHarvestDecision = (harvest) => {
        console.log(`Determining execution decisions for ${harvest.name}`);
        const cost = web3.utils.toBN(harvest.harvestGas).mul(web3.utils.toBN(harvest.gasPrice));
        const gain = harvest.gainWAVAX.mul(harvest.treasuryFee).div(harvest.treasuryMax);
        const FIVE_THOUSAND_USD = web3.utils.toBN('5000' + '0'.repeat(18));
        const harvestDecision = cost.lt(gain);
        console.log(`Harvest decision: ${harvestDecision}`);
        const earnDecision = harvest.ratio.gten(1) && harvest.availableUSD.gt(FIVE_THOUSAND_USD);
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
        if (!CONFIG.EXECUTION.ENABLED) return console.log(`Would have harvested strategy ${harvest.name} (${harvest.strategy._address}). Set CONFIG.EXECUTION.ENABLED to enable harvesting`);
        console.log(`Harvesting strategy address: ${harvest.strategy._address} (${harvest.name}) ...`);
        return await harvest.harvestTx.send({ from: CONFIG.WALLET.ADDRESS, gas: harvest.harvestGas, gasPrice: harvest.gasPrice, nonce: nonce++ });
    };

    const results = await Promise.allSettled(harvests.map(executeHarvestTx));
    logHarvestingResults({ results, harvests });
    await discordHarvestUpdate({ results, harvests });
    return harvests;
}

async function doEarning(harvests) {
    await Util.wait(5000); // Allow arbitrarily 5 seconds before beginning earn() calls for the provider to sync the nonce

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
        console.log(`--------------------------------------------------------------------`);
        let token
        switch(harvest.wantSymbol) {
            case("PGL"):
                token = "PNG"
            case("JLP"):
                token = "JOE"
            default:
                null
        }
        if (value || !CONFIG.EXECUTION.ENABLED) {
            // Successfully called harvest() or a test run
            console.log(`Strategy:    ${harvest.name} (${value?.to ?? harvest.strategy._address})`);
            console.log(`Reinvested:  ${Util.displayBNasFloat(harvest.harvestable, 18)} ${token} ($${Util.displayBNasFloat(harvest.gainUSD, 18)})`);
            console.log(`Transaction: ${value?.transactionHash ?? '[real tx hash]'}`);
        } else {
            // Failed to execute harvest()
            console.error(`Failed to harvest for strategy ${value?.to ?? harvest.strategy._address} (${harvest.name})`);
            console.error(reason);
        }
    }
    console.log(`--------------------------------------------------------------------`);
    return { results, harvests };
}

function logEarnResults({ results, harvests }) {
    for (let i = 0; i < results.length; i++) {
        const harvest = harvests[i];
        if (!harvest.earnDecision) continue;
        const {reason, value} = results[i];
        console.log(`--------------------------------------------------------------------`);
        if (value || !CONFIG.EXECUTION.ENABLED) {
            // Successfully called earn() or a test run
            console.log(`Snowglobe:   ${harvest.name} (${value?.to ?? harvest.snowglobe._address})`);
            console.log(`Swept:       ${Util.displayBNasFloat(harvest.available, 18, 5)} ${harvest.wantSymbol} ($${Util.displayBNasFloat(harvest.availableUSD, 18)})`);
            console.log(`Transaction: ${value?.transactionHash ?? '[real tx hash]'}`);
        } else {
            // Failed to execute earn()
            console.error(`Failed to sweep for snowglobe ${value?.to ?? harvest.snowglobe._address} (${harvest.name})`);
            console.error(reason);
        }
    }
    console.log(`--------------------------------------------------------------------`);
    return { results, harvests };
}

async function discordHarvestUpdate({ results, harvests }) {
    if (!CONFIG.EXECUTION.ENABLED) return console.log(`Discord notifications are disabled while in test mode`);
    if (!CONFIG.DISCORD.ENABLED) return console.log(`Did not notify discord. Set CONFIG.DISCORD.ENABLED to send notifications to #harvests`);

    for (let i = 0; i< results.length; i++) {
        const {reason, value} = results[i];
        const harvest = harvests[i];
        if (!harvest.harvestDecision) continue;
        if (value) {
            const embedObj = {
                Color:'0x00aaff',
                Title:`Strategy: ${harvest.name}`,
                Thumbnail:Util.thumbnailLink(harvest.name),
                URL:Util.cchainTransactionLink(value.transactionHash),
            };
            const message = `**Reinvested:**  ${Util.displayBNasFloat(harvest.harvestable, 18, 2)} **${harvest.symbol}**\n`+
                            `**Value**:  $${Util.displayBNasFloat(harvest.gainUSD, 18, 2)}`;
            embedObj.Description = message;
            DiscordBot.sendMessage(DiscordBot.makeEmbed(embedObj), CONFIG.DISCORD.CHANNEL);
        }
    }
}

async function discordEarnUpdate({ results, harvests }) {
    if (!CONFIG.EXECUTION.ENABLED) return console.log(`Discord notifications are disabled while in test mode`);
    if (!CONFIG.DISCORD.ENABLED) return console.log(`Did not notify discord. Set CONFIG.DISCORD.ENABLED to send notifications to #harvests`);

    for (let i = 0; i< results.length; i++) {
        const {reason, value} = results[i];
        const harvest = harvests[i];
        if (!harvest.earnDecision) continue;
        if (value) {
            const embedObj = {
                Color:'0x00aaff',
                Title:`Snowglobe: ${harvest.name}`,
                Thumbnail:Util.thumbnailLink(harvest.name),
                URL:Util.cchainTransactionLink(value.transactionHash),
            };
            const message = `**Swept:**  ${Util.displayBNasFloat(harvest.available, 18, 5)} **${harvest.wantSymbol}**\n`+
                            `**Value**:  $${Util.displayBNasFloat(harvest.availableUSD, 18, 2)}`;
            embedObj.Description = message;
            DiscordBot.sendMessage(DiscordBot.makeEmbed(embedObj), CONFIG.DISCORD.CHANNEL);
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

async function getPoolShareAsUSD(poolContract) {
    const token0Address = (await poolContract.methods.token0().call()).toLowerCase();
    const token1Address = (await poolContract.methods.token1().call()).toLowerCase();
    const { _reserve0, _reserve1 } = await poolContract.methods.getReserves().call();
    const reserve0 = web3.utils.toBN(_reserve0);
    const reserve1 = web3.utils.toBN(_reserve1);
    const totalSupply = web3.utils.toBN(await poolContract.methods.totalSupply().call());

    if (token0Address === WAVAX_ADDRESS) {
        const priceWAVAX = await estimatePriceOfAsset(WAVAX_ADDRESS, 18);
        return reserve0.muln(2).mul(priceWAVAX).div(totalSupply);
    } else if (token1Address === WAVAX_ADDRESS) {
        const priceWAVAX = await estimatePriceOfAsset(WAVAX_ADDRESS, 18);
        return reserve1.muln(2).mul(priceWAVAX).div(totalSupply);
    } else if (token0Address === PNG_ADDRESS) {
        const pricePNG = await estimatePriceOfAsset(PNG_ADDRESS, 18);
        return reserve0.muln(2).mul(pricePNG).div(totalSupply);
    } else if (token1Address === PNG_ADDRESS) {
        const pricePNG = await estimatePriceOfAsset(PNG_ADDRESS, 18);
        return reserve1.muln(2).mul(pricePNG).div(totalSupply);
    } else if (token0Address === JOE_ADDRESS) {
        const priceJOE = await estimatePriceOfAsset(JOE_ADDRESS, 18);
        return reserve0.muln(2).mul(priceJOE).div(totalSupply);
    } else if (token1Address === JOE_ADDRESS) {
        const priceJOE = await estimatePriceOfAsset(JOE_ADDRESS, 18);
        return reserve1.muln(2).mul(priceJOE).div(totalSupply);
    } else {
        console.error(`Could not convert want address ${poolContract._address} to USD`);
        return web3.utils.toBN('0');
    }
}

async function estimatePriceOfAsset(assetAddress, assetDecimals) {
    const PANGOLIN_ROUTER_ADDRESS = '0xe54ca86531e17ef3616d22ca28b0d458b6c89106';

    const routerContract = new web3.eth.Contract(ABI.PANGOLIN_ROUTER, PANGOLIN_ROUTER_ADDRESS);
    const [input, output] = await routerContract.methods.getAmountsOut('1' + '0'.repeat(assetDecimals), [assetAddress, DAI_ADDRESS]).call();
    return web3.utils.toBN(output);
}
