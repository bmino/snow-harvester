const CONFIG = require('../../config/Config');
const ABI = require('../../config/abi.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://api.avax.network/ext/bc/C/rpc'));
const Util = require('./Util');
const DiscordBot = require('./DiscordBot');
const WANTS = require('../../config/Wants');
const VALUATION = require('../../config/Valuation');
const {
    ZERO_ADDRESS,
    WAVAX_ADDRESS,
    PNG_ADDRESS,
    JOE_ADDRESS,
    BENQI_ADDRESS,
} = require('../../config/Constants');
const { roundDown } = require('./Util');
const { ethers } = require('ethers');

// Authenticate our wallet
if (CONFIG.EXECUTION.ENABLED) {
    web3.eth.accounts.wallet.add(CONFIG.WALLET.KEY);
    console.log(`WARNING!! Test mode is disabled. Real harvesting might begin!!`);
}

// Globals to manage consistent scheduling with a window of variance
// Do not touch these :)
let executionWindowCenter = Date.now();
let executionDrift = 0;

//if execution is enabled it makes a window, if not it just harvests in testmode
const scheduledHarvest = 
    CONFIG.EXECUTION.ENABLED && CONFIG.EXECUTION.CONTAINER_MODE 
    ? scheduleNextHarvest 
    : harvest;

if (CONFIG.DISCORD.ENABLED){
    DiscordBot.login(CONFIG.DISCORD.TOKEN).then(scheduledHarvest);
}else{
    scheduledHarvest();
}


function harvest() {
    initHarvests()
        .then(addRequirements)
        .then(addCalculations)
        .then(addEarnTx)
        .then(addHarvestTx)
        .then(addDecisions)
        .then(doHarvesting)
        .then(doEarning)
        .then(() => {
          if(CONFIG.EXECUTION.CONTAINER_MODE){
            process.exit();
          }else{
            scheduleNextHarvest();
          }
        })
        .catch(handleError);
}

async function getSnowglobes() {
    const gauge_proxy = new web3.eth.Contract(ABI.GAUGE_PROXY, WANTS.GAUGE_PROXY_ADDRESS);

    const pools = await gauge_proxy.methods.tokens().call();

    return [
        // remove omitted overrides
        ...pools.filter(pool => !WANTS.OVERRIDE_OMIT.includes(pool)),

        // append add overrides
        ...WANTS.OVERRIDE_ADD,
    ];
}

async function initHarvests() {
    const gasPrice = await web3.eth.getGasPrice();

    const snowglobes = await getSnowglobes();

    const handleRejection = (snowglobe, err) => {
        console.error(`Could not initialize contracts for snowglobe (${Util.cchainAddressLink(snowglobe)})`);
        console.error(err);
    };

    return Promise.allSettled(snowglobes.map(async snowglobeAddress => {
        const { controller, want, snowglobe, strategy, type, wantAddress } = await initializeContracts(WANTS.CONTROLLERS, snowglobeAddress);
        const snowglobeSymbol = await snowglobe.methods.symbol().call();
        const wantSymbol = await want.methods.symbol().call();
        const wantDecimals = parseInt(await want.methods.decimals().call());
        
        let name;
        switch(type){
          case "LP":
            const token0_addr = await want.methods.token0().call();
            const token1_addr = await want.methods.token1().call();
            const token0 = new web3.eth.Contract(ABI.ERC20, token0_addr) 
            const token1 = new web3.eth.Contract(ABI.ERC20, token1_addr)
            const token0_name = await token0.methods.symbol().call();
            const token1_name = await token1.methods.symbol().call();
            name = `${token0_name}-${token1_name}`;
            break;
          default:
            name = wantSymbol;
            break;
        }


        return {
            name,
            type,
            controller,
            want,
            wantSymbol,
            wantDecimals,
            wantAddress,
            snowglobe,
            snowglobeSymbol,
            strategy,
            gasPrice,
        };
    }))
        .then(results => handleSettledPromises(results, snowglobes, handleRejection));
}

async function addRequirements(harvests) {
    const priceMap = async (harvest) => {
      switch(harvest.wantSymbol){
        case 'WAVAX': case 'PNG': return await estimatePriceOfAsset(WAVAX_ADDRESS, 18);
        case 'PGL': return await estimatePriceOfAsset(PNG_ADDRESS, 18);
        case 'JLP': case 'xJOE': return await estimatePriceOfAsset(JOE_ADDRESS, 18);
         
      }
      
      switch(harvest.type){
        case 'BENQI':
          return await estimatePriceOfAsset(BENQI_ADDRESS, 18);
      }
    }

    const rewardMap = (harvest) => {
      if(harvest.type === 'BENQI'){
        return 'QI';
      }
      switch(harvest.wantSymbol){
        case 'PGL': return 'PNG';
        case 'JLP': return 'JOE';
        case 'PNG': return 'WAVAX';
        default:
          return harvest.wantSymbol;
      }
    };

    const addHarvestFees = async (harvest) => {
        if (!priceMap(harvest) || 
          !rewardMap(harvest)) {
            throw new Error(`Unknown symbol: ${harvest.wantSymbol}`);
        }

        let harvestable;
        let harvestOverride = false;

        try {
            harvestable = web3.utils.toBN(await harvest.strategy.methods.getHarvestable().call());
        } catch(err) {
            // This fails for certain strategies where the strategy lacks a `rewarder`
            // Assuming the harvest should happen for now
            harvestable = web3.utils.toBN(0);
            harvestOverride = true;
        }

        return {
            ...harvest,
            harvestable,
            harvestOverride,
            harvestSymbol: rewardMap(harvest),
            treasuryFee: web3.utils.toBN(await harvest.strategy.methods.performanceTreasuryFee().call()),
            treasuryMax: web3.utils.toBN(await harvest.strategy.methods.performanceTreasuryMax().call()),
            balance: web3.utils.toBN(await harvest.snowglobe.methods.balance().call()),
            available: web3.utils.toBN(await harvest.snowglobe.methods.available().call()),
            priceWAVAX: await priceMap({type:'ERC20', wantSymbol:'WAVAX'}),
            rewardPrice: await priceMap(harvest),
            priceWant: harvest.type === 'LP'? await getPoolShareAsUSD(harvest.want) : await estimatePriceOfAsset(harvest.wantAddress,harvest.wantDecimals),
        }
    };
    return await Promise.all(harvests.map(addHarvestFees))
    .catch(err => {
        console.error(`Error fetching requirements from strategy`);
        throw err;
    });
}

function addCalculations(harvests) {
    const addHarvestGain = (harvest) => {
      const gainWAVAX = harvest.harvestable.mul(harvest.rewardPrice).div(harvest.priceWAVAX);
      const gainUSD = harvest.harvestable.mul(harvest.rewardPrice).div(Util.offset(18));
      const ratio = harvest.balance.isZero() ? web3.utils.toBN(100) : harvest.available.muln(100).div(harvest.balance);
      const usdPrice = ethers.utils.parseUnits(
        roundDown(
          (harvest.available/10**harvest.wantDecimals*harvest.priceWant/1e18),harvest.wantDecimals)
            ,harvest.wantDecimals);
      
      const availableUSD = web3.utils.toBN(usdPrice.toString());
      return {
        gainWAVAX,
        gainUSD,
        ratio,
        availableUSD,
        ...harvest,
      }
    };
    return harvests.map(addHarvestGain);
}

async function addEarnTx(harvests) {
    const addTx = async (harvest) => {
        const earnTx = harvest.snowglobe.methods.earn();
        return {
            ...harvest,
            earnTx,
            earnGas: await earnTx.estimateGas({from: CONFIG.WALLET.ADDRESS}),
        };
    };
    const handleRejection = (harvest, err) => {
        console.error(`Skipping ${harvest.name} due to earn() error (snowglobe: ${harvest.snowglobe._address})`);
        console.error(err);
    };
    return Promise.allSettled(harvests.map(addTx))
        .then(results => handleSettledPromises(results, harvests, handleRejection));
}

async function addHarvestTx(harvests) {
    const addTx = async (harvest) => {
        const harvestTx = harvest.strategy.methods.harvest();
        return {
            ...harvest,
            harvestTx,
            harvestGas: await harvestTx.estimateGas({from: CONFIG.WALLET.ADDRESS}),
        };
    };
    const handleRejection = (harvest, err) => {
        console.error(`Skipping ${harvest.name} due to harvest() error (strategy: ${Util.cchainAddressLink(harvest.strategy._address)})`);
        console.error(err);
    };
    return Promise.allSettled(harvests.map(addTx))
        .then(results => handleSettledPromises(results, harvests, handleRejection));
}

function addDecisions(harvests) {
    const addHarvestDecision = (harvest) => {
        console.log(`Determining execution decisions for ${harvest.name}`);
        const cost = web3.utils.toBN(harvest.harvestGas).mul(web3.utils.toBN(harvest.gasPrice));
        const gain = harvest.gainWAVAX.mul(harvest.treasuryFee).div(harvest.treasuryMax);
        const TWO_HUNDRED_USD = web3.utils.toBN('200' + '0'.repeat(18));
        const harvestDecision = cost.lt(gain) || harvest.harvestOverride;
        if (harvest.harvestOverride && !cost.lt(gain)) {
            console.log(`Harvest decision overridden by flag!`);
        }
        console.log(`Harvest decision: ${harvestDecision}`);
        const earnDecision = harvest.ratio.gten(1) && harvest.availableUSD.gt(TWO_HUNDRED_USD);
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
        if (value || !CONFIG.EXECUTION.ENABLED) {
            // Successfully called harvest() or a test run
            console.log(`Strategy:    ${harvest.name} (${value?.to ?? harvest.strategy._address})`);
            console.log(`Reinvested:  ${harvest.harvestOverride ? 'Unknown' : Util.displayBNasFloat(harvest.harvestable, 18)} ${harvest.harvestSymbol} ($${harvest.harvestOverride ? '?.??' : Util.displayBNasFloat(harvest.gainUSD, 18)})`);
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
            console.log(`Swept:       ${Util.displayBNasFloat(harvest.available, harvest.wantDecimals, 5)} ${harvest.wantSymbol} ($${Util.displayBNasFloat(harvest.availableUSD, 18)})`);
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
            const message = `**Reinvested:**  ${harvest.harvestOverride ? 'Unknown' : Util.displayBNasFloat(harvest.harvestable, 18, 2)} **${harvest.harvestSymbol}**\n`+
                            `**Value**:  $${harvest.harvestOverride ? '?.??' : Util.displayBNasFloat(harvest.gainUSD, 18, 2)}`;
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
            const message = `**Swept:**  ${Util.displayBNasFloat(harvest.available, harvest.wantDecimals, 5)} **${harvest.wantSymbol}**\n`+
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

function handleSettledPromises(results, originals, rejectCallback) {
    results.forEach((result, i) => {
        if (result.status !== 'fulfilled') rejectCallback(originals[i], new Error(result.reason.message))
    });
    return results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
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

async function initializeContracts(controllerAddresses, snowglobeAddress) {
    if (!web3.utils.isAddress(snowglobeAddress)) throw new Error(`Invalid snowGlobe address ${snowglobeAddress}`);

    for (const controllerAddress of controllerAddresses) {
        if (!web3.utils.isAddress(controllerAddress)) throw new Error(`Invalid controller address ${controllerAddress}`);

        const controller = new web3.eth.Contract(ABI.CONTROLLER, controllerAddress);
        const snowglobe = new web3.eth.Contract(ABI.SNOWGLOBE, snowglobeAddress);

        const wantAddress = await snowglobe.methods.token().call();
        if (wantAddress === ZERO_ADDRESS) continue;

        const strategyAddress = await controller.methods.strategies(wantAddress).call();
        if (strategyAddress === ZERO_ADDRESS) continue;

        const controllerSnowglobeAddress = await controller.methods.globes(wantAddress).call();

        if (controllerSnowglobeAddress !== snowglobeAddress) continue;

        let type,poolToken = new web3.eth.Contract(ABI.UNI_V2_POOL, wantAddress);

        try {
          //test if this is an LP Token
          await poolToken.methods.token1().call();
          type = 'LP';
        } catch (error) {
          //not LP
          poolToken = new web3.eth.Contract(ABI.ERC20, wantAddress);
          try{
            //test if this is from benqi
            const strategyContract = new web3.eth.Contract(ABI.STRATEGY, strategyAddress);
            await strategyContract.methods.benqi().call();
            type = 'BENQI';
          }catch(error){
            type = 'ERC20';
          }
        }


        return {
            controller,
            snowglobe,
            want: poolToken,
            wantAddress,
            type,
            strategy: new web3.eth.Contract(ABI.STRATEGY, strategyAddress),
        };
    }

    throw new Error(`Could not identify contracts for snowglobe ${snowglobeAddress}`);
}

async function getPoolShareAsUSD(poolContract) {
    const token0Address = await poolContract.methods.token0().call();
    const token1Address = await poolContract.methods.token1().call();
    const { _reserve0, _reserve1 } = await poolContract.methods.getReserves().call();
    const reserve0 = web3.utils.toBN(_reserve0);
    const reserve1 = web3.utils.toBN(_reserve1);
    const totalSupply = web3.utils.toBN(await poolContract.methods.totalSupply().call());
    try {
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
      const tokenContract = new web3.eth.Contract(ABI.ERC20, token0Address);
      const tokenDecimals = await tokenContract.methods.decimals().call();
      const priceToken = await estimatePriceOfAsset(token0Address, tokenDecimals);
      return reserve0.muln(2).mul(priceToken).div(totalSupply);
    }
    } catch (error) {
      console.error(`Could not convert want address ${poolContract._address} to USD`);
      console.error(error.message);
      return web3.utils.toBN('0');
    }

}

async function estimatePriceOfAsset(assetAddress, assetDecimals) {
    const { ROUTER, ROUTE } = VALUATION(assetAddress);
    const destination = ROUTE[ROUTE.length - 1];
    const destinationContract = new web3.eth.Contract(ABI.ERC20, destination);
    const destinationDecimals = parseInt(await destinationContract.methods.decimals().call());
    const correction = web3.utils.toBN(destinationDecimals - assetDecimals);

    const routerContract = new web3.eth.Contract(ABI.UNI_V2_ROUTER, ROUTER);
    const [input, output] = await routerContract.methods.getAmountsOut('1' + '0'.repeat(assetDecimals), ROUTE).call();
    let price = web3.utils.toBN(output).mul(web3.utils.toBN(10).pow(correction));
    
    //calculate the value of the token through AVAX price
    if(destination === WAVAX_ADDRESS){
      const priceWAVAX = await estimatePriceOfAsset(WAVAX_ADDRESS, 18);
      const priceFloat = (price/1e18)*(priceWAVAX/1e18);
      const priceWei = ethers.utils.parseUnits(roundDown(priceFloat,18),18);
      price = web3.utils.toBN(priceWei.toString());
    }
    return price;
}
