const {
    PANGOLIN_ROUTER,
    JOE_ROUTER,
    JOE_ADDRESS,
    DAI_ADDRESS,
    WAVAX_ADDRESS,
    PNG_ADDRESS,
    USDT_ADDRESS,
    XJOE_ADDRESS,
    UST_ADDRESS
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
      case "0x9C8E99eb130AED653Ef90fED709D9C3E9cC8b269": case "0x921f99719Eb6C01b4B8f0BA7973A7C24891e740A":
      case "0xf03Dccaec9A28200A6708c686cf0b8BF26dDc356": case "0x00EE200Df31b869a321B10400Da10b561F3ee60d":  
      case "0xD4d026322C88C2d49942A75DfF920FCfbC5614C1": case "0xe19A1684873faB5Fb694CfD06607100A632fF21c":  
      case "0xB0a6e056B587D0a85640b39b1cB44086F7a26A1E": case "0x44754455564474A89358B2C2265883DF993b12F0":  
      case "0xfcc6CE74f4cd7eDEF0C5429bB99d38A3608043a5": case "0xf4e0B2dBfAC42672A0e87f086710c2649aeE80B6":  
        return {
          ROUTER: PANGOLIN_ROUTER,
          ROUTE: [assetAddress, WAVAX_ADDRESS],
        }
      case "0x0659133127749Cc0616Ed6632912ddF7cc8D7545":   
        return {
          ROUTER: PANGOLIN_ROUTER,
          ROUTE: [assetAddress, UST_ADDRESS, WAVAX_ADDRESS],
        }
      default:
        return {
          ROUTER: JOE_ROUTER,
          ROUTE: [assetAddress, WAVAX_ADDRESS],
        }
    }
};

module.exports = Valuation;
