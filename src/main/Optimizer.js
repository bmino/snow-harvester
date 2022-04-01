const { ethers } = require("ethers");
const { OPTIMIZER_CONTROLLER, OPTIMIZER_POOLS } = require("../../config/Wants");
const Utils = require('./Util.js');
const ABI = require('../../config/abi.json');
const CONFIG = require('../../config/Config');
const Constants = require("../../config/Constants");

//TO-DO add totalTVL 
async function doOptimize(signer) {
    const optimizerController = new ethers.Contract(OPTIMIZER_CONTROLLER, ABI.CONTROLLER, signer);

    let timelockOperations = [];

    let discordDescription = "";
    for (const pool of OPTIMIZER_POOLS) {
        const currentStrategy = await optimizerController.strategies(pool.LP);

        let currentPoolInfo = {
            yearlyAPY: 0
        };
        let infoList = [];
        for (const contract of pool.contracts) {
            if (contract.strategy.toLowerCase() === currentStrategy.toLowerCase()) {
                currentPoolInfo = await Utils.getPoolAPIInfo(contract.fixedSnowglobe);
                continue;
            }

            const poolInfo = await Utils.getPoolAPIInfo(contract.fixedSnowglobe);
            if (!poolInfo) {
                throw new Error("Pool not found in API");
            }

            infoList.push(
                {
                    name: poolInfo.name,
                    source: poolInfo.source,
                    APY: poolInfo.yearlyAPY,
                    TVL: poolInfo.tvlStaked,
                    strategy: contract.strategy,
                    snowglobe: pool.snowglobe,
                }
            )
        }

        //search for the best APY with a .3% buffer
        let bestAPY = currentPoolInfo ? Number(currentPoolInfo.yearlyAPY) + 0.05 : 0;
        let bestIndex = -1;
        let poolName = "", source = "";
        for (let i = 0; i < infoList.length; i++) {
            if(Number(infoList[i].APY) > bestAPY){
                //found best APY for pool
                bestIndex = i;
                bestAPY = Number(infoList[i].APY);
                poolName = infoList[i].name;
                source = infoList[i].source
            }
        }

        if(bestIndex > -1){
            discordDescription = discordDescription.length > 0 ? discordDescription + "\n" : "";
                discordDescription = discordDescription +
                    `**APY Update** for ${poolName} \n`+
                    `**New Source**: ${source} \n`+
                    `**Old APY**: ${currentPoolInfo.yearlyAPY.toFixed(2)}% - **New APY**: ${bestAPY.toFixed(2)}%`

            //prepare batch
            const IStrategy = new ethers.utils.Interface(ABI.STRATEGY);
            const ISnowglobe = new ethers.utils.Interface(ABI.SNOWGLOBE);

            const encodedHarvest = IStrategy.encodeFunctionData("harvest", []);
            const encodedLeverage = IStrategy.encodeFunctionData("leverageToMax", []);
            const encodedEarn = ISnowglobe.encodeFunctionData("earn", []);

            const IController = new ethers.utils.Interface(ABI.CONTROLLER);
            const encodedSetStrategy = IController.encodeFunctionData("setStrategy", [pool.LP, infoList[bestIndex].strategy]);

            let timelockTargets = [], timelockData = []

            timelockData.push(encodedHarvest);
            timelockTargets.push(currentStrategy);
            
            timelockData.push(encodedSetStrategy);
            timelockTargets.push(OPTIMIZER_CONTROLLER);

            timelockData.push(encodedEarn);
            timelockTargets.push(infoList[bestIndex].snowglobe);

            if(bestAPY / 365 > Constants.MIN_APR_TO_LEVERAGE){
                timelockData.push(encodedLeverage);
                timelockTargets.push(infoList[bestIndex].strategy);
            }
            timelockOperations.push({
                "targets": timelockTargets,
                "data": timelockData
            })
        }
    }
    console.log(timelockOperations);

    if(timelockOperations.length > 0){
        let executeData = {};
        for(let i = 0;i < timelockOperations.length;i++){
            const optimizerIndex = `Optimizer${i}`;
            executeData[optimizerIndex] = timelockOperations[i];
        }

        discordDescription += `\n\n**Run as deploy.json to Execute**:\n ${JSON.stringify(executeData)}`;

        const embed = {
            "embeds": [
                {
                    "title": "New Optimizer Batch for TimelockController",
                    "description": discordDescription,
                    "color": 43775,
                    "timestamp": new Date(Date.now()).toISOString()
                }
            ]
        };

        console.log(embed);

        if(CONFIG.DISCORD.ENABLED){
            await Utils.sendDiscord(CONFIG.DISCORD.WEBHOOK_OPTIMIZER, embed);
        }
    }
}

module.exports = { doOptimize }