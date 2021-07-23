const {
    PANGOLIN_ROUTER,
    JOE_ROUTER,
    WAVAX_ADDRESS,
    PNG_ADDRESS,
    JOE_ADDRESS,
    DAI_ADDRESS,
    USDT_ADDRESS,
} = require('./Constants');

const Valuation = {
    // Must support a route to a stablecoin
    [WAVAX_ADDRESS]: {
        ROUTER: PANGOLIN_ROUTER,
        ROUTE: [WAVAX_ADDRESS, DAI_ADDRESS],
    },
    [PNG_ADDRESS]: {
        ROUTER: PANGOLIN_ROUTER,
        ROUTE: [PNG_ADDRESS, DAI_ADDRESS],
    },
    [JOE_ADDRESS]: {
        ROUTER: JOE_ROUTER,
        ROUTE: [JOE_ADDRESS, USDT_ADDRESS],
    },
};

module.exports = Valuation;
