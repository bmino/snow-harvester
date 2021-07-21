const ABI = require('../../config/abi.json');

const Wants = {
  GAUGE_PROXY_ADDRESS: "0xFc371bA1E7874Ad893408D7B581F3c8471F03D2C",
  GAUGE_PROXY_CONTRACT: new ethers.Contract(GAUGE_PROXY_ADDRESS, ABI.GAUGE_PROXY, signer),

  OVERRIDE_OMIT: {
    '0xA42BE3dB9aff3aee48167b240bFEE5e1697e1281': 'S3F',
    '0xdE1A11C331a0E45B9BA8FeE04D4B51A745f1e4A4': 'S3D',
    '0x53B37b9A6631C462d74D65d61e1c056ea9dAa637': 'Depricated'
  },

  OVERRIDE_ADD: {
    // '0x0000000000000000000000000000000000000000': 'Add-Pool',
  }
  
};  

module.exports = Wants