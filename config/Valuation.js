const {
    PANGOLIN_ROUTER,
    JOE_ROUTER,
    JOE_ADDRESS,
    DAI_ADDRESS,
    WAVAX_ADDRESS,
    PNG_ADDRESS,
    USDT_ADDRESS,
    XJOE_ADDRESS
} = require('./Constants');

const Valuation = (assetAddress) => {
    // Must support a route to a stablecoin
    switch(assetAddress){
      case JOE_ADDRESS: case XJOE_ADDRESS:
        return {
          ROUTER: JOE_ROUTER,
          ROUTE: [JOE_ADDRESS, USDT_ADDRESS],
        }
      case WAVAX_ADDRESS: case PNG_ADDRESS:
        return {
          ROUTER: PANGOLIN_ROUTER,
          ROUTE: [assetAddress, DAI_ADDRESS],
        }
      default:
        return {
          ROUTER: JOE_ROUTER,
          ROUTE: [assetAddress, WAVAX_ADDRESS],
        }
    }
};

module.exports = Valuation;
