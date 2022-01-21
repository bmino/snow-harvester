const Wants = {
  GAUGE_PROXY_ADDRESS: "0x215D5eDEb6A6a3f84AE9d72962FEaCCdF815BF27",
  
  OVERRIDE_OMIT: [
    '0xA42BE3dB9aff3aee48167b240bFEE5e1697e1281', // S3F
    '0xdE1A11C331a0E45B9BA8FeE04D4B51A745f1e4A4', // S3D
    '0x53B37b9A6631C462d74D65d61e1c056ea9dAa637',
    '0xbBA0f8A3Aa16657D1df2A6E87A73ee74Fec42711', // Deprecated
    '0x7b74324f523831687fC8FCE946F15a3AA632dC06', // broken benqi wavax
    '0x68b8037876385BBd6bBe80bAbB2511b95DA372C4', // broken benqi qi
    '0x59C7b6E757CA14EF6F47e06A30B74CaE1017D92C'  // broken teddyxteddy
  ],

  OVERRIDE_ADD: [
    // '0x0000000000000000000000000000000000000000', // 'Add-Pool'
  ],

  CONTROLLERS: [
    '0x14559fb4d15Cf8DCbc35b7EDd1215d56c0468202', // New trader joe controller
    '0xCEB829a0881350689dAe8CBD77D0E012cf7a6a3f', // New trader joe controller
    '0x252B5fD3B1Cb07A2109bF36D5bDE6a247c6f4B59', // BENQI second Controller
    '0xF2FA11Fc9247C23b3B622C41992d8555f6D01D8f', // new BANKER JOE controller
    '0xACc69DEeF119AB5bBf14e6Aaf0536eAFB3D6e046', // second deployment (must come first to supersede other controller
    '0x425A863762BBf24A986d8EaE2A367cb514591C6F', // AAVE Controller
    '0x8Ffa3c1547479B77D9524316D5192777bedA40a1', // BENQI Controller
    '0xf7B8D9f8a82a7a6dd448398aFC5c77744Bd6cb85', // first deployment
    '0xc7D536a04ECC43269B6B95aC1ce0a06E0000D095', // AXIAL Controller
    '0xFb7102506B4815a24e3cE3eAA6B834BE7a5f2807', // Banker Joe Controller
  ],
  
};  

module.exports = Wants;
