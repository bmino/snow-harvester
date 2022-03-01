const { doOptimize } = require('./Optimizer');
const CONFIG = require('../../config/Config');
const ABI = require('../../config/abi.json');
const Util = require('./Util');
const { WANTS, OPTIMIZER_POOLS } = require('../../config/Wants');
const VALUATION = require('../../config/Valuation');
const {
    ZERO_ADDRESS,
    WAVAX_ADDRESS,
    PNG_ADDRESS,
    JOE_ADDRESS,
    BENQI_ADDRESS,
    MAX_GAS_LIMIT_EARN,
    MAX_GAS_LIMIT_LEV,
    MAX_GAS_LIMIT_HARV,
    MAX_GAS_PRICE,
    PROVIDERS_URL,
    AXIAL_ADDRESS,
    MIN_APR_TO_LEVERAGE,
    TEDDY_ADDRESS,
    TJ_MASTERCHEF,
    AXIAL_MASTERCHEF,
    QI_ADDRESS,
    RETRY_TXS,
    PTP_ADDRESS,
    MIN_TVL_TO_HARVEST_FOLDING
} = require('../../config/Constants');
const { ethers } = require('ethers');

var provider, signer;
var masterchefPoolIds = [];
var minichefRewarders = [];

// Authenticate our wallet
if (CONFIG.EXECUTION.ENABLED) {
    console.log(`WARNING!! Test mode is disabled. Real harvesting might begin!!`);
}

const selectBestProvider = async () => {

    for (const url of PROVIDERS_URL) {
        const currentProvider = new ethers.providers.
            StaticJsonRpcProvider(url);

        //do a quick call to check if the node is sync
        try {
            //avalanche burn address
            await currentProvider.getBalance('0x0100000000000000000000000000000000000000');
            return currentProvider;
        } catch (error) {
            console.error(error);
        }
    }
    if (!provider) {
        throw Error("Can't stabilish connection with the blockchain.");
    }
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

scheduledHarvest();

async function harvest() {
    const harvests = await initHarvests();
    await addRequirements(harvests)
        .then(addCalculations)
        .then(addEarnTx)
        .then(addHarvestTx)
        .then(addLeverageTx)
        .then(addDeleverageTx)
        .then(addDecisions)
        .then(doHarvesting)
        .then(doEarning)
        .then(doLeveraging)
        .then(doSync)
        .then(doDeleveraging)
        .then(sendDiscord)
        .then(async () => { await doOptimize(signer)  })
        .then(() => {
            if (CONFIG.EXECUTION.CONTAINER_MODE) {
                process.exit();
            } else {
                scheduleNextHarvest();
            }
        })
        .catch(handleError);
}

async function getSnowglobes() {
    const gauge_proxy = new ethers.Contract(WANTS.GAUGE_PROXY_ADDRESS, ABI.GAUGE_PROXY, signer);

    const pools = await gauge_proxy.tokens();

    return [
        // remove omitted overrides
        ...pools.filter(pool => !WANTS.OVERRIDE_OMIT.includes(pool)),

        // append add overrides
        ...WANTS.OVERRIDE_ADD,
    ];
}

async function initHarvests(retrys = 0) {
    provider = await selectBestProvider();
    signer = new ethers.Wallet(CONFIG.WALLET.KEY, provider);

    const gasPrice = await provider.getGasPrice();
    //we shouldnt harvest if the gas price is too high
    if (gasPrice > MAX_GAS_PRICE) {
        if(retrys > 11 ){ //try 2 hours
            throw new Error("Tried too many times, aborting.");
        }
        console.log("Gas too high, awaiting 10min before trying again.");
        await Util.wait(600000); //wait 10 minutes
        return initHarvests(retrys += 1);
    }

    const snowglobes = await getSnowglobes();

    const handleRejection = (snowglobe, err) => {
        console.error(`Could not initialize contracts for snowglobe (${Util.cchainAddressLink(snowglobe)})`);
        console.error(err);
    };

    const masterchefs = [AXIAL_MASTERCHEF, TJ_MASTERCHEF];
    const pangolinMinichef = '0x1f806f7C8dED893fd3caE279191ad7Aa3798E928';

    for (const address of masterchefs) {
        const mcContract = new ethers.Contract(address, ABI.MASTERCHEF_V3, signer);
        const poolLength = await mcContract.poolLength();

        let arrayPoolInfo = [];
        for (let i = 0; i < poolLength; i++) {
            const poolInfo = await mcContract.poolInfo(i);
            arrayPoolInfo.push(poolInfo);
        }
        masterchefPoolIds.push(arrayPoolInfo);
    }

    const pangolinMinichefContract = new ethers.Contract(pangolinMinichef, ABI.MINICHEF_V2, signer);
    const minichefLpTokens = await pangolinMinichefContract.lpTokens();
    for (let i = 0; i < minichefLpTokens.length; i++) {
        const rewarderAddress = await pangolinMinichefContract.rewarder(i);
        minichefRewarders.push({
            rewarderAddress,
            address: minichefLpTokens[i],
        });
    }

    const results = [];
    for(const snowglobeAddress of snowglobes){
        try {
            const { controller, want, snowglobe, strategy, type, wantAddress, strategyName } = await initializeContracts(WANTS.CONTROLLERS, snowglobeAddress);
            const snowglobeSymbol = await snowglobe.symbol();
            const wantSymbol = await want.symbol();
            const wantDecimals = parseInt(await want.decimals());

            let name;
            switch (type) {
                case "LP":
                    const token0_addr = await want.token0();
                    const token1_addr = await want.token1();
                    const token0 = new ethers.Contract(token0_addr, ABI.ERC20, signer);
                    const token1 = new ethers.Contract(token1_addr, ABI.ERC20, signer);
                    const token0_name = await token0.symbol();
                    const token1_name = await token1.symbol();
                    name = `${token0_name}-${token1_name}`;
                    break;
                default:
                    name = wantSymbol;
                    break;
            }

            results.push({
                name,
                strategyName,
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
            });
        } catch (error) {
            console.log(error.message);
        }
    };
    return results;
}

async function addRequirements(harvests) {
    const priceMap = async (harvest, isAxial, isPlatypus) => {
        if (isAxial) {
            return await estimatePriceOfAsset(AXIAL_ADDRESS, 18);
        }

        if (isPlatypus) {
            return await estimatePriceOfAsset(PTP_ADDRESS, 18);
        }

        switch (harvest.wantSymbol) {
            case 'WAVAX': return await estimatePriceOfAsset(WAVAX_ADDRESS, 18);
            case 'PGL': case 'PNG': return await estimatePriceOfAsset(PNG_ADDRESS, 18);
            case 'JLP': return await estimatePriceOfAsset(JOE_ADDRESS, 18);
            case 'xJOE': return await estimatePriceOfAsset(JOE_ADDRESS, 18);
        }

        switch (harvest.type) {
            case 'BENQI':
                return await estimatePriceOfAsset(BENQI_ADDRESS, 18);
            case 'BANKER':
                return await estimatePriceOfAsset(JOE_ADDRESS, 18);
            case 'AAVE':
                return await estimatePriceOfAsset(WAVAX_ADDRESS, 18);
            case 'TEDDY':
                return await estimatePriceOfAsset(WAVAX_ADDRESS, 18);
            default:
                return await estimatePriceOfAsset(WAVAX_ADDRESS, 18);
        }
    }

    const rewardMap = (harvest, isAxial, isPlatypus) => {
        if (isAxial) {
            return {
                symbol: "AXIAL",
                address: AXIAL_ADDRESS
            };
        }

        if (isPlatypus) {
            return {
                symbol: "PTP",
                address: PTP_ADDRESS
            };
        }

        switch (harvest.type) {
            case 'BENQI':
                return {
                    symbol: "QI",
                    address: QI_ADDRESS
                };
            case 'AAVE':
                return {
                    symbol: "WAVAX",
                    address: WAVAX_ADDRESS
                };
            case 'BANKER':
                return {
                    symbol: "JOE",
                    address: JOE_ADDRESS
                };
            case 'TEDDY':
                return {
                    symbol: "WAVAX",
                    address: WAVAX_ADDRESS
                };
        }
        switch (harvest.wantSymbol) {
            case 'PGL': case 'PNG': return {
                symbol: "PNG",
                address: PNG_ADDRESS
            };
            case 'JLP': return {
                symbol: "JOE",
                address: JOE_ADDRESS
            };
            default: return {
                symbol: harvest.wantSymbol,
                address: harvest.wantAddress
            };
        }
    };

    const addHarvestFees = async (harvest) => {
        let isAxial = false;
        let isPlatypus = false;
        let masterchefPlatypus;

        try {
            masterchefPlatypus = await harvest.strategy.masterChefPlatypus();
            isPlatypus = true;
        } catch (error) {
            //not platypus pool
        }

        try {
            await harvest.strategy.masterChefAxialV3();
            isAxial = true;
        } catch (error) {
            //not axial pool
        }

        if (!priceMap(harvest, isAxial, isPlatypus) ||
            !rewardMap(harvest, isAxial, isPlatypus)) {
            throw new Error(`Unknown symbol: ${harvest.wantSymbol}`);
        }

        let harvestable;
        let harvestOverride = false;

        //account for extra rewards
        try {
            if (harvest.type === "AAVE") {
                harvestable = await harvest.strategy.getWavaxAccrued();
            } else {
                harvestable = await harvest.strategy.getHarvestable();

                try {
                    const harvestedToken = rewardMap(harvest, isAxial, isPlatypus);
                    const tokenContract = new ethers.Contract(harvestedToken.address, ABI.ERC20, signer);
                    const storedToken = await tokenContract.balanceOf(harvest.strategy.address);
                    harvestable = harvestable.add(storedToken);
                } catch (error) {
                    console.error("Error fetching strategy balance.")
                    console.error(error);
                }

            }
        } catch (err) {
            // This fails for certain strategies where the strategy lacks a `rewarder`
            // Assuming the harvest should happen for now
            harvestable = ethers.BigNumber.from("0");
            harvestOverride = true;
        }

        let bonusTokens = [];
        try {
            let masterchefAddress, poolInfo;
            if (harvest.strategyName.startsWith("StrategyJoe")) {
                masterchefAddress = TJ_MASTERCHEF;
                poolInfo = getPoolInfo(harvest.wantAddress, masterchefAddress);

            } else if (harvest.strategyName.startsWith("StrategyAxial")) {
                masterchefAddress = AXIAL_MASTERCHEF;
                poolInfo = getPoolInfo(harvest.wantAddress, masterchefAddress);
            }

            if (poolInfo && poolInfo.poolId > -1) {
                const masterchefContract = new ethers.Contract(masterchefAddress, ABI.MASTERCHEF_V3, signer);
                const strategyInfo = await masterchefContract.pendingTokens(poolInfo.poolId, harvest.strategy.address);
                    const addressBonusToken = strategyInfo.bonusTokenAddress;

                if (strategyInfo.pendingBonusToken.gt("0x0")) {
                    const bonusTokenContract = new ethers.Contract(addressBonusToken, ABI.ERC20, signer);
                    const balanceOfRewarder = await bonusTokenContract.balanceOf(poolInfo.poolInfo.rewarder);
                    if(balanceOfRewarder.gt("0x0")){
                        let harvestableBonusToken = strategyInfo.pendingBonusToken;
                    const decimalsBonusToken = await bonusTokenContract.decimals();
                    const balanceOfStrategy = await bonusTokenContract.balanceOf(harvest.strategy.address);

                    harvestableBonusToken = harvestableBonusToken.add(balanceOfStrategy);
                    const bonusRewardPrice = await estimatePriceOfAsset(addressBonusToken, decimalsBonusToken);

                    bonusTokens.push(
                        {
                            decimals: decimalsBonusToken,
                            address: addressBonusToken,
                            harvestable: harvestableBonusToken,
                            price: bonusRewardPrice
                        }
                    )
                    }
                }
            }

            if (harvest.strategyName.startsWith("StrategyPng")) {
                const poolIndex = minichefRewarders.findIndex(o => o.address.toLowerCase() === harvest.wantAddress.toLowerCase());

                if (poolIndex > -1 && minichefRewarders[poolIndex].rewarderAddress !== ZERO_ADDRESS) {
                    const rewarderContract = new ethers.Contract(minichefRewarders[poolIndex].rewarderAddress, ABI.PANGOLIN_REWARDER, signer);
                    const extraMultipliers = await rewarderContract.getRewardMultipliers();
                    const addressBonusTokens = await rewarderContract.getRewardTokens();

                    for(let i = 0;i < extraMultipliers.length;i++){
                        const extraMultiplier = extraMultipliers[i];

                        if (harvestable > 0 && extraMultiplier > 0) {
                            const addressBonusToken = addressBonusTokens[i];
                            let harvestableBonusToken = harvestable.mul(extraMultiplier).div("1"+"0".repeat(18));

                        const bonusTokenContract = new ethers.Contract(addressBonusToken, ABI.ERC20, signer);
                            const balanceOfRewarder = await bonusTokenContract.balanceOf(minichefRewarders[poolIndex].rewarderAddress);

                            if(balanceOfRewarder.gt("0x0")){
                            const decimalsBonusToken = await bonusTokenContract.decimals();
                        const balanceOfStrategy = await bonusTokenContract.balanceOf(harvest.strategy.address);
                        harvestableBonusToken = harvestableBonusToken.add(balanceOfStrategy);
                            const bonusRewardPrice = await estimatePriceOfAsset(addressBonusToken, decimalsBonusToken);

                            bonusTokens.push({
                                address: addressBonusToken,
                                harvestable: harvestableBonusToken,
                                decimals: decimalsBonusToken,
                                price: bonusRewardPrice
                            })
                            }
                        }
                    }
                }
            }

        } catch (error) {
            console.error(error);
        }

        var keep, keepMax;
        try {
            keep = ethers.BigNumber.from(await harvest.strategy.keep());
            keepMax = ethers.BigNumber.from(await harvest.strategy.keepMax());
        } catch (error) {
            //old strategy
        }
        return {
            ...harvest,
            harvestable,
            harvestOverride,
            harvestSymbol: rewardMap(harvest, isAxial, isPlatypus).symbol,
            keep,
            keepMax,
            treasuryFee: ethers.BigNumber.from(await harvest.strategy.performanceTreasuryFee()),
            treasuryMax: ethers.BigNumber.from(await harvest.strategy.performanceTreasuryMax()),
            balance: await harvest.snowglobe.balance(),
            available: await harvest.snowglobe.available(),
            priceWAVAX: await priceMap({ type: 'ERC20', wantSymbol: 'WAVAX' }),
            rewardPrice: await priceMap(harvest, isAxial, isPlatypus),
            priceWant: harvest.type === 'LP'
                ? await getPoolShareAsUSD(harvest.want)
                : await estimatePriceOfAsset(harvest.wantAddress, harvest.wantDecimals, isAxial, isPlatypus),
            bonusTokens
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
        let gainWAVAX = harvest.harvestable.mul(harvest.rewardPrice).div(harvest.priceWAVAX);
        let gainUSD = harvest.harvestable.mul(harvest.rewardPrice).div(Util.offset(18));

        try {
            const bonusTokens = harvest.bonusTokens;
            for(const bonusToken of bonusTokens){
                if (bonusToken.address && bonusToken.harvestable && bonusToken.price) {
            const gainWAVAXBonus = bonusToken.harvestable.mul(bonusToken.price).div(harvest.priceWAVAX);
            const gainUSDBonus = bonusToken.harvestable.mul(bonusToken.price).div(Util.offset(18));

            gainWAVAX = gainWAVAX.add(gainWAVAXBonus);
            gainUSD = gainUSD.add(gainUSDBonus);
                }
            }
        } catch (error) {
            console.error(error);
        }

        const ratio = harvest.balance.isZero() ? ethers.BigNumber.from(100) : harvest.available.mul(100).div(harvest.balance);
        const adjust = (harvest.wantDecimals - 18);
        const availableUSD = harvest.available.mul(harvest.priceWant).div(Util.offset(18 + adjust));

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
        const earnTx = harvest.snowglobe.earn;
        const snowglobeUnsigned = new ethers.Contract(harvest.snowglobe.address, ABI.SNOWGLOBE, provider);
        const estGas = await snowglobeUnsigned.estimateGas.earn({ from: CONFIG.WALLET.ADDRESS });
        const earnGas = estGas > MAX_GAS_LIMIT_EARN ? estGas : MAX_GAS_LIMIT_EARN;
        return {
            ...harvest,
            earnTx,
            earnGas: ethers.BigNumber.from(earnGas),//await earnTx.estimateGas({from: CONFIG.WALLET.ADDRESS}),
        };
    };
    const handleRejection = (harvest, err) => {
        console.error(`Skipping ${harvest.name} due to earn() error (snowglobe: ${harvest.snowglobe.address})`);
        console.error(err);
    };
    return Promise.allSettled(harvests.map(addTx))
        .then(results => handleSettledPromises(results, harvests, handleRejection));
}

async function addHarvestTx(harvests) {
    const addTx = async (harvest) => {
        const harvestTx = harvest.strategy.harvest;
        const strategyUnsigned = new ethers.Contract(harvest.strategy.address, ABI.STRATEGY, provider);
        const estGas = await strategyUnsigned.estimateGas.harvest({ from: CONFIG.WALLET.ADDRESS });
        const harvestGas = estGas > MAX_GAS_LIMIT_HARV ? estGas : MAX_GAS_LIMIT_HARV;
        return {
            ...harvest,
            harvestTx,
            harvestGas: ethers.BigNumber.from(harvestGas),//await harvestTx.estimateGas({from: CONFIG.WALLET.ADDRESS}),
        };
    };
    const handleRejection = (harvest, err) => {
        console.error(`Skipping ${harvest.name} due to harvest() error (strategy: ${Util.cchainAddressLink(harvest.strategy.address)})`);
        console.error(err);
    };
    return Promise.allSettled(harvests.map(addTx))
        .then(results => handleSettledPromises(results, harvests, handleRejection));
}

async function addLeverageTx(harvests) {
    const addTx = async (harvest) => {
        if (harvest.type === 'BENQI' || harvest.type === 'AAVE' || harvest.type === 'BANKER') {
            try {
                //test if the strategy can be leveraged
                await harvest.strategy.getMaxLeverage();

                const leverageTx = harvest.strategy.leverageToMax;
                const strategyUnsigned = new ethers.Contract(harvest.strategy.address, ABI.STRATEGY, provider);
                const estGas = await strategyUnsigned.estimateGas.leverageToMax({ from: CONFIG.WALLET.ADDRESS });
                const leverageGas = estGas > MAX_GAS_LIMIT_LEV ? estGas : MAX_GAS_LIMIT_LEV;
                return {
                    ...harvest,
                    leverageTx,
                    leverageGas: ethers.BigNumber.from(leverageGas), //await leverageTx.estimateGas({from: CONFIG.WALLET.ADDRESS}),
                }
            } catch (error) {
                console.log(harvest.name, "Leverage");
                console.log(error.message);
                //cant be leveraged
                return { ...harvest };
            }
        } else {
            return { ...harvest };
        }
    }

    const handleRejection = (harvest, err) => {
        console.error(`Skipping ${harvest.name} due to leverageToMax() error (strategy: ${Util.cchainAddressLink(harvest.strategy.address)})`);
        console.error(err);
    };
    return Promise.allSettled(harvests.map(addTx))
        .then(results => handleSettledPromises(results, harvests, handleRejection));
}

async function addDeleverageTx(harvests) {
    const addTx = async (harvest) => {
        if (harvest.type === 'BENQI' || harvest.type === 'AAVE' || harvest.type === 'BANKER') {
            try {
                //test if the strategy can be leveraged
                await harvest.strategy.getMaxLeverage();

                const strategyUnsigned = new ethers.Contract(harvest.strategy.address, ABI.STRATEGY, provider);
                const unleveragedSupply = await strategyUnsigned.callStatic["getSuppliedUnleveraged()"]({ from: CONFIG.WALLET.ADDRESS, gasLimit: 7_000_000 });
                const idealSupply = await strategyUnsigned.callStatic["getLeveragedSupplyTarget(uint256)"](unleveragedSupply, { from: CONFIG.WALLET.ADDRESS, gasLimit: 7_000_000 });

                const optimizedIndex = OPTIMIZER_POOLS.findIndex(
                    o => o.snowglobe.toLowerCase() === harvest.snowglobe.address.toLowerCase()
                );

                let optimizedPool;
                if(optimizedIndex > -1){
                    optimizedPool = OPTIMIZER_POOLS[optimizedIndex].contracts.find(
                        o => o.strategy.toLowerCase() === harvest.strategy.address.toLowerCase()
                    )
                }

                const snowglobeAddr = optimizedPool ? optimizedPool.fixedSnowglobe : harvest.snowglobe.address;
                
                const poolState = await Util.getPoolAPIInfo(snowglobeAddr);
                const deposited = await strategyUnsigned.balanceOfPool();
                const supplied = await strategyUnsigned.getSuppliedView();
                const currLev = supplied / deposited;

                const notSafe = await strategyUnsigned.callStatic["sync()"]({ from: CONFIG.WALLET.ADDRESS, gasLimit: 7_000_000 });
                const estGasSync = await strategyUnsigned.estimateGas.sync({ from: CONFIG.WALLET.ADDRESS });
                const estGasDeleverageToMin = await strategyUnsigned.estimateGas.deleverageToMin({ from: CONFIG.WALLET.ADDRESS });

                const syncTx = harvest.strategy.sync;
                const deleverageTx = harvest.strategy.deleverageUntil;

                const syncGas = estGasSync > MAX_GAS_LIMIT_HARV ? estGasSync : MAX_GAS_LIMIT_HARV;
                const deleverageGas = estGasDeleverageToMin > MAX_GAS_LIMIT_HARV ? estGasDeleverageToMin : MAX_GAS_LIMIT_HARV;
                return {
                    ...harvest,
                    syncTx,
                    deleverageTx,
                    unleveragedSupply,
                    idealSupply,
                    notSafe,
                    syncGas: ethers.BigNumber.from(syncGas),
                    deleverageGas: ethers.BigNumber.from(deleverageGas),
                    currLev,
                    poolState
                }
            } catch (error) {
                console.log(harvest.name, "Deleverage");
                console.log(error.message);
                //cant be synced or deleveraged
                return { ...harvest };
            }
        } else {
            return { ...harvest };
        }
    }

    const handleRejection = (harvest, err) => {
        console.error(`Skipping ${harvest.name} due to sync() error (strategy: ${Util.cchainAddressLink(harvest.strategy.address)})`);
        console.error(err);
    };
    return Promise.allSettled(harvests.map(addTx))
        .then(results => handleSettledPromises(results, harvests, handleRejection));
}

function addDecisions(harvests) {
    const addHarvestDecision = (harvest) => {
        console.log(`Determining execution decisions for ${harvest.name}`);
        const cost = harvest.harvestGas.mul(harvest.gasPrice);
        var gain;
        if (harvest.treasuryFee.gt("0x0")) {
            gain = harvest.gainWAVAX.mul(harvest.treasuryFee).div(harvest.treasuryMax);
        } else {
            gain = harvest.gainWAVAX.mul(harvest.keep).div(harvest.keepMax);
        }
        const TWO_HUNDRED_USD = ethers.BigNumber.from('200' + '0'.repeat(18));
        const isFolding = (harvest.type === "BANKER" || harvest.type === "AAVE" || harvest.type === "BENQI");

        let harvestDecision = cost.lt(gain)
            || harvest.harvestOverride
            || (isFolding && harvest.poolState 
                && !harvest.poolState.deprecated 
                && harvest.poolState.tvlStaked > MIN_TVL_TO_HARVEST_FOLDING)
            || harvest.name === "QI" //added QI manually because the benqi rewarder contract have a bad view of pending rewards

        if (harvest.harvestOverride && !cost.lt(gain)) {
            console.log(`Harvest decision overridden by flag!`);
        }

        let earnDecision = harvest.ratio.gte(1) && harvest.availableUSD.gt(TWO_HUNDRED_USD);

        let leverageDecision = false, syncDecision = false, deleverageDecision = false;
        if (harvest.leverageTx && harvest.syncTx && harvest.deleverageTx) {
            //if it's not safe we want to drop some of leveraging
            if (harvest.poolState) {
                const shouldLeverage = (harvest.poolState.dailyAPR > MIN_APR_TO_LEVERAGE 
                    && !harvest.poolState.deprecated
                    && harvest.poolState.tvlStaked > MIN_TVL_TO_HARVEST_FOLDING
                    );
                console.log(harvest.currLev, harvest.notSafe, harvest.poolState.dailyAPR, MIN_APR_TO_LEVERAGE)
                if (harvest.currLev > 1.2 && !shouldLeverage) {
                    //we shouldn't be leveraging this pool!
                    deleverageDecision = true;
                }
                syncDecision = (!deleverageDecision && harvest.notSafe);

                if (!deleverageDecision && !syncDecision && shouldLeverage) {
                    if (harvest.unleveragedSupply.lte(harvest.idealSupply)) {
                        //if it's safe we gonna leverage
                        leverageDecision = true;
                    }
                }
            } else {
                if (harvest.currLev > 1.2) {
                    //if can't find the pool just deleverage stuff for safety
                    deleverageDecision = true;
                }
            }
        }
        console.log(harvest.type, harvest.name, gain / 1e18, cost / 1e18);
        console.log(`Harvest decision: ${harvestDecision}`);
        console.log(`Earn decision: ${earnDecision}`);
        console.log(`Leverage decision: ${leverageDecision}`);
        console.log(`Sync decision: ${syncDecision}`);
        console.log(`Deleverage decision: ${deleverageDecision}`);
        return {
            ...harvest,
            harvestDecision,
            earnDecision,
            leverageDecision,
            deleverageDecision,
            syncDecision
        };
    };
    return harvests.map(obj => addHarvestDecision(obj));
}

const executeTx = async (harvest, decision, tx, type, params = [], lastTry = 0) => {
    if (!decision) return null;
    if (!CONFIG.EXECUTION.ENABLED) return console.log(`Would ${type} strategy ${harvest.name} (${harvest.strategy.address}). Set CONFIG.EXECUTION.ENABLED to enable harvesting`);
    console.log(`${type} strategy address: ${harvest.strategy.address} (${harvest.name}) ...`);
    try {
        //add extra gas to be safe
        const plusGas = ethers.utils.parseUnits("5", 9);
        const gasPrice = (await provider.getGasPrice()).add(plusGas);
        let transaction
        if (params.length > 0) {
            transaction = await tx(...params, { gasLimit: 7_000_000, gasPrice: gasPrice });
        } else {
            transaction = await tx({ gasLimit: 7_000_000, gasPrice: gasPrice });
        }
        const finishedTx = await transaction.wait(1);
        return finishedTx;
    } catch (error) {
        console.log(error.message);
        if (RETRY_TXS > lastTry) {
            return executeTx(harvest, decision, tx, type, params, lastTry += 1)
        }
        return null;
    }
};

async function doHarvesting(harvests) {
    let results = [];
    for (const harvest of harvests) {
        results.push(await executeTx(harvest, harvest.harvestDecision, harvest.harvestTx, "Harvest"));
    }

    logResults({ results, harvests, type: "Harvest" });
    var payload = {
        harvests, results: {
            harvest: results
        }
    };
    return payload;
}

async function doEarning(payload) {
    await Util.wait(5000); // Allow arbitrarily 5 seconds before beginning earn() calls for the provider to sync the nonce

    let results = [];
    for (const harvest of payload.harvests) {
        results.push(await executeTx(harvest, harvest.earnDecision, harvest.earnTx, "Earn"));
    }

    logResults({ results, harvests: payload.harvests, type: "Earn" });

    payload.results.earn = results;

    return payload;
}

async function doLeveraging(payload) {
    await Util.wait(5000); // Allow arbitrarily 5 seconds before beginning earn() calls for the provider to sync the nonce

    let results = [];
    for (const harvest of payload.harvests) {
        results.push(await executeTx(harvest, harvest.leverageDecision, harvest.leverageTx, "Leverage"));
    }

    logResults({ results, harvests: payload.harvests, type: "Leverage" });

    payload.results.leverage = results;

    return payload;
}

async function doSync(payload) {
    await Util.wait(5000); // Allow arbitrarily 5 seconds before beginning earn() calls for the provider to sync the nonce

    let results = [];
    for (const harvest of payload.harvests) {
        results.push(await executeTx(harvest, harvest.syncDecision, harvest.syncTx, "Sync"));
    }

    logResults({ results, harvests: payload.harvests, type: "Sync" });

    payload.results.sync = results;

    return payload;
}

async function doDeleveraging(payload) {
    await Util.wait(5000); // Allow arbitrarily 5 seconds before beginning earn() calls for the provider to sync the nonce

    let results = [];
    for (const harvest of payload.harvests) {
        let params = [];
        if (harvest.deleverageDecision) {
            const deposited = await harvest.strategy.balanceOfPool();
            const BNSupply = floatToBN((deposited / 10 ** harvest.wantDecimals) * 1.01, harvest.wantDecimals);
            params = [BNSupply];
            console.log(harvest.name, harvest.type);
            console.log(deposited / 10 ** harvest.wantDecimals, params[0] / 10 ** harvest.wantDecimals);
        }
        results.push(
            await executeTx(
                harvest, harvest.deleverageDecision, harvest.deleverageTx, "Deleverage", params
            )
        );
    }

    logResults({ results, harvests: payload.harvests, type: "Deleverage" });

    payload.results.deleverage = results;

    return payload;
}

async function sendDiscord(payload) {
    //we need to await for our discord calls when running at container mode, and we can't let it await
    //between transactions because it opens margin for frontrunning

    await discordUpdate({ results: payload.results, harvests: payload.harvests })
}

function logResults(params) {
    for (let i = 0; i < params.results.length; i++) {
        const harvest = params.harvests[i];
        const txType = params.type;
        const value = params.results[i];
        switch (txType) {
            case "Harvest":
                if (!harvest.harvestDecision) {
                    continue;
                }
                break;
            case "Earn":
                if (!harvest.earnDecision) {
                    continue;
                }
                break;
            case "Leverage":
                if (!harvest.leverageDecision) {
                    continue;
                }
                break;
            case "Sync":
                if (!harvest.syncDecision) {
                    continue;
                }
                break;
            case "Deleverage":
                if (!harvest.deleverageDecision) {
                    continue;
                }
                break;
        }
        console.log(`--------------------------------------------------------------------`);
        if (value || !CONFIG.EXECUTION.ENABLED) {
            // Successfully called transaction or a test run
            console.log(`Snowglobe:   ${harvest.name} (${value?.to ?? harvest.snowglobe.address})`);
            if (txType === "Harvest") {
                console.log(`Reinvested:  ${harvest.harvestOverride ? 'Unknown' : Util.displayBNasFloat(harvest.harvestable, 18)} ${harvest.harvestSymbol} ($${harvest.harvestOverride ? '?.??' : Util.displayBNasFloat(harvest.gainUSD, 18)})`);
            } else if (txType === "Earn") {
                console.log(`${txType}:   ${Util.displayBNasFloat(harvest.available, harvest.wantDecimals, 5)} ${harvest.wantSymbol} ($${Util.displayBNasFloat(harvest.availableUSD, 18)})`);
            } else {
                console.log(`${txType}`)
            }
            console.log(`Transaction: ${value?.transactionHash ?? '[real tx hash]'}`);
        } else {
            // Failed to execute transaction
            console.error(`Failed to ${txType} for snowglobe ${value?.to ?? harvest.snowglobe.address} (${harvest.name})`);
        }
    }
    console.log(`--------------------------------------------------------------------`);
    return params;
}

async function discordUpdate({ results, harvests }) {
    if (!CONFIG.EXECUTION.ENABLED) return console.log(`Discord notifications are disabled while in test mode`);
    if (!CONFIG.DISCORD.ENABLED) return console.log(`Did not notify discord. Set CONFIG.DISCORD.ENABLED to send notifications to #harvests`);
    for (let i = 0; i < harvests.length; i++) {
        const notifList = [];
        if (harvests[i].harvestDecision && results.harvest[i]) {
            notifList.push({ harvest: true, txHash: results.harvest[i]?.transactionHash });
        }
        if (harvests[i].earnDecision && results.earn[i]) {
            notifList.push({ earn: true, txHash: results.earn[i]?.transactionHash });
        }
        if (harvests[i].leverageDecision && results.leverage[i]) {
            notifList.push({ leverage: true, txHash: results.leverage[i]?.transactionHash });
        }
        if (harvests[i].syncDecision && results.sync[i]) {
            notifList.push({ sync: true, txHash: results.sync[i]?.transactionHash });
        }
        if (harvests[i].deleverageDecision && results.deleverage[i]) {
            notifList.push({ deleverage: true, txHash: results.deleverage[i]?.transactionHash });
        }

        for (const event of notifList) {
            await Util.wait(3000);
            const embed = {
                "embeds": [
                    {
                        "title": null,
                        "description": null,
                        "url": Util.cchainTransactionLink(event.txHash),
                        "color": 43775,
                        "timestamp": new Date(Date.now()).toISOString()
                    }
                ]
            };

            if (event.harvest) {
                embed.embeds[0].title = `Strategy: ${harvests[i].name}`;
                embed.embeds[0].description = `**Reinvested:**  ${harvests[i].harvestOverride ? 'Unknown' : Util.displayBNasFloat(harvests[i].harvestable, 18, 2)} **${harvests[i].harvestSymbol}**\n` +
                    `**Value**:  $${harvests[i].harvestOverride ? '?.??' : Util.displayBNasFloat(harvests[i].gainUSD, 18, 2)}`;
            } else if (event.earn) {
                embed.embeds[0].title = `Snowglobe: ${harvests[i].name}`;
                embed.embeds[0].description = `**Swept:**  ${Util.displayBNasFloat(harvests[i].available, harvests[i].wantDecimals, 5)} **${harvests[i].wantSymbol}**\n` +
                    `**Value**:  $${Util.displayBNasFloat(harvests[i].availableUSD, 18, 2)}`;
            } else if (event.leverage) {
                embed.embeds[0].title = `Strategy: ${harvests[i].name}`;
                embed.embeds[0].description = `**Leveraged**`;
            } else if (event.sync) {
                embed.embeds[0].title = `Strategy: ${harvests[i].name}`;
                embed.embeds[0].description = `**Synced**`;
            } else if (event.deleverage) {
                embed.embeds[0].title = `Strategy: ${harvests[i].name}`;
                embed.embeds[0].description = `**Deleveraged**`;
            }

            if (embed.embeds[0].title) {
               await Util.sendDiscord(CONFIG.DISCORD.WEBHOOK_URL, embed);
            }
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

async function scheduleNextHarvest() {
    executionWindowCenter += CONFIG.EXECUTION.INTERVAL;
    executionDrift = Util.randomIntFromInterval(-1 * CONFIG.EXECUTION.INTERVAL_WINDOW, CONFIG.EXECUTION.INTERVAL_WINDOW);
    const now = Date.now();
    const delay = executionWindowCenter - now + executionDrift;
    console.log();
    console.log(`New execution window: ${new Date(executionWindowCenter - CONFIG.EXECUTION.INTERVAL_WINDOW).toLocaleTimeString()} - ${new Date(executionWindowCenter + CONFIG.EXECUTION.INTERVAL_WINDOW).toLocaleTimeString()}`);
    console.log(`Scheduled next harvest() for ${new Date(now + delay).toLocaleString()}`);
    console.log();
    await Util.wait(delay);
    await harvest();
}


///// Helper functions

async function initializeContracts(controllerAddresses, snowglobeAddress) {
    if (!ethers.utils.isAddress(snowglobeAddress)) throw new Error(`Invalid snowGlobe address ${snowglobeAddress}`);

    for (const controllerAddress of controllerAddresses) {
        if (!ethers.utils.isAddress(controllerAddress)) throw new Error(`Invalid controller address ${controllerAddress}`);

        const controller = new ethers.Contract(controllerAddress, ABI.CONTROLLER, signer);
        const snowglobe = new ethers.Contract(snowglobeAddress, ABI.SNOWGLOBE, signer);

        const wantAddress = await snowglobe.token();
        if (wantAddress === ZERO_ADDRESS) continue;

        const strategyAddress = await controller.strategies(wantAddress);
        if (strategyAddress === ZERO_ADDRESS) continue;

        const controllerSnowglobeAddress = await controller.globes(wantAddress);

        if (controllerSnowglobeAddress !== snowglobeAddress) continue;

        let type, poolToken = new ethers.Contract(wantAddress, ABI.UNI_V2_POOL, signer);
        const strategyContract = new ethers.Contract(strategyAddress, ABI.STRATEGY, signer);

        const strategyName = await strategyContract.getName();

        try {
            //test if this is an LP Token
            await poolToken.token1();
            type = 'LP';
        } catch (error) {
            //not LP
            poolToken = new ethers.Contract(wantAddress, ABI.ERC20, signer);
            try {
                //test if this is from benqi
                await strategyContract.benqi();
                type = 'BENQI';
            } catch (error) {
                //AAVE pool
                try {
                    await strategyContract.getWavaxAccrued();
                    type = 'AAVE';
                } catch (error) {
                    try {
                        //test if this is from banker joe
                        await strategyContract.jToken();
                        type = 'BANKER';
                    } catch (error) {
                        try {
                            //test if this is from teddy
                            await strategyContract.stake_teddy_rewards();
                            type = 'TEDDY';
                        } catch (error) {
                            type = 'ERC20';
                        }
                    }
                }
            }
        }

        return {
            controller,
            snowglobe,
            want: poolToken,
            wantAddress,
            type,
            strategyName,
            strategy: strategyContract,
        };
    }

    throw new Error(`Could not identify contracts for snowglobe ${snowglobeAddress}`);
}

async function getPoolShareAsUSD(poolContract) {
    const token0Address = await poolContract.token0();
    const token1Address = await poolContract.token1();
    const reserves = await poolContract.getReserves();
    const totalSupply = await poolContract.totalSupply();
    try {
        if (token0Address === WAVAX_ADDRESS) {
            const priceWAVAX = await estimatePriceOfAsset(WAVAX_ADDRESS, 18);
            return reserves._reserve0.mul(2).mul(priceWAVAX).div(totalSupply);
        } else if (token1Address === WAVAX_ADDRESS) {
            const priceWAVAX = await estimatePriceOfAsset(WAVAX_ADDRESS, 18);
            return reserves._reserve1.mul(2).mul(priceWAVAX).div(totalSupply);
        } else if (token0Address === PNG_ADDRESS) {
            const pricePNG = await estimatePriceOfAsset(PNG_ADDRESS, 18);
            return reserves._reserve0.mul(2).mul(pricePNG).div(totalSupply);
        } else if (token1Address === PNG_ADDRESS) {
            const pricePNG = await estimatePriceOfAsset(PNG_ADDRESS, 18);
            return reserves._reserve1.mul(2).mul(pricePNG).div(totalSupply);
        } else if (token0Address === JOE_ADDRESS) {
            const priceJOE = await estimatePriceOfAsset(JOE_ADDRESS, 18);
            return reserves._reserve0.mul(2).mul(priceJOE).div(totalSupply);
        } else if (token1Address === JOE_ADDRESS) {
            const priceJOE = await estimatePriceOfAsset(JOE_ADDRESS, 18);
            return reserves._reserve1.mul(2).mul(priceJOE).div(totalSupply);
        } else {
            try {
                const token0Contract = new ethers.Contract(token0Address, ABI.ERC20, signer);
                const token0Decimals = await token0Contract.decimals();
                const priceToken0 = await estimatePriceOfAsset(token0Address, token0Decimals);
                const correction = ethers.BigNumber.from(18 - token0Decimals);
                let priceLP;
                if (correction > 0) {
                    priceLP = reserves._reserve0.mul(ethers.BigNumber.from(10).pow(correction)).mul(2).mul(priceToken0).div(totalSupply);
                } else {
                    priceLP = reserves._reserve0.mul(2).mul(priceToken0).div(totalSupply);
                }
            
                return priceLP
            } catch (error) {
                const token1Contract = new ethers.Contract(token1Address, ABI.ERC20, signer);
                const token1Decimals = await token1Contract.decimals();
                const priceToken1 = await estimatePriceOfAsset(token1Address, token1Decimals);
                const correction = ethers.BigNumber.from(18 - token1Decimals);
                let priceLP;
                if (correction > 0) {
                    priceLP = reserves._reserve1.mul(ethers.BigNumber.from(10).pow(correction)).mul(2).mul(priceToken1).div(totalSupply);
                } else {
                    priceLP = reserves._reserve1.mul(2).mul(priceToken1).div(totalSupply);
                }
            
                return priceLP
            }
        }
    } catch (error) {
        console.error(`Could not convert want address ${poolContract.address} to USD`);
        console.error(error.message);
        return ethers.BigNumber.from('0');
    }
}

async function estimatePriceOfAsset(assetAddress, assetDecimals, isAxial = false, isPlatypus = false) {
    if (isAxial || isPlatypus) {
        const virtualPrice = ethers.utils.parseUnits("1", 18);
        return virtualPrice;
    }
    const { ROUTER, ROUTE } = VALUATION(assetAddress);
    const destination = ROUTE[ROUTE.length - 1];
    const destinationContract = new ethers.Contract(destination, ABI.ERC20, signer);
    const destinationDecimals = parseInt(await destinationContract.decimals());
    const correction = ethers.BigNumber.from(assetDecimals - destinationDecimals);

    const routerContract = new ethers.Contract(ROUTER, ABI.UNI_V2_ROUTER, signer);
    const [input, output] = await routerContract.getAmountsOut('1' + '0'.repeat(assetDecimals), ROUTE);
    let price = output;
    if (correction > 0) {
        price = output.mul(ethers.BigNumber.from(10).pow(correction));
    }

    //calculate the value of the token through AVAX price
    if (destination === WAVAX_ADDRESS) {
        const priceWAVAX = await estimatePriceOfAsset(WAVAX_ADDRESS, 18);
        price = price.mul(priceWAVAX).div('1' + '0'.repeat(18));
    }
    return price;
}

const roundDown = (value, decimals = 18) => {
    const valueString = value.toString();
    const integerString = valueString.split('.')[0];
    const decimalsString = valueString.split('.')[1];
    if (!decimalsString) {
        return integerString
    }
    return `${integerString}.${decimalsString.slice(0, decimals)}`;
}

const floatToBN = (number, decimals = 18) => {
    try {
        if (number > 0) {
            return ethers.utils.parseUnits(roundDown(number, decimals), decimals);
        } else {
            return ethers.utils.parseUnits("0");
        }
    } catch (error) {
        console.error(error.message);
    }
}

const getPoolInfo = (want, mcAddress) => {
    let arrayIndex = -1;
    switch (mcAddress.toLowerCase()) {
        case AXIAL_MASTERCHEF.toLowerCase():
            arrayIndex = 0;
            break;
        case TJ_MASTERCHEF.toLowerCase():
            arrayIndex = 1;
            break;
        default:
            throw new Error("Masterchef not found");
    }

    const poolId = masterchefPoolIds[arrayIndex].findIndex(o => o.lpToken.toLowerCase() === want.toLowerCase());
    const poolInfo = masterchefPoolIds[arrayIndex][poolId];
    return {
        poolId,
        poolInfo
    };
}
