const OPTIMIZER_CONTROLLER = "0x2F0b4e7aC032d0708C082994Fb21Dd75DB514744";

const OPTIMIZER_POOLS = [
  //avax
  {
    snowglobe: "0x3a3a0570f66cD5DfacB3c72b5214fec88e5722a8",
    LP: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    contracts: [
      //benqi
      {
        strategy: "0x51B29aA47588A0dCAE748297C7A9ddE10035522E",
        fixedSnowglobe: "0xaCF2814cF22fCB08b3dDA331221A52ad7B05639B" //snowglobe from non-optimized strategy
      },
      //aave
      {
        strategy: "0x0f776b5b97BfA366f929FE82bd50C312C39f26f1",
        fixedSnowglobe: "0x951f6c751A9bC5A75a4E4d43be205aADa709D3B8" //snowglobe from non-optimized strategy
      },
      //banker
      {
        strategy: "0x5bd7bB54e3B6798Ca33AcbD1F26541053721e69f",
        fixedSnowglobe: "0x5d587f520590bb80153356271d33828bf499e9A2" //snowglobe from non-optimized strategy
      }
    ]
  },
  { //dai
    snowglobe: "0x8665e1FAD19D14b16Eecb96A7608cD42962E7eEB",
    LP: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
    contracts: [
      //benqi
      {
        strategy: "0x1Ab9ab0260736Cebbf1FdA8E0e31650Cf14B93DA",
        fixedSnowglobe: "0x7b2525A502800E496D2e656e5b1188723e547012" //snowglobe from non-optimized strategy
      },
      //aave
      {
        strategy: "0x13d753C651526Bf3501818813B829B339ae867AF",
        fixedSnowglobe: "0xE4543C234D4b0aD6d29317cFE5fEeCAF398f5649" //snowglobe from non-optimized strategy
      }
    ]
  },
  { //link
    snowglobe: "0xECce05f99cc3D9252eb22699c4fa4B0268B33353",
    LP: "0x5947BB275c521040051D82396192181b413227A3",
    contracts: [
      //benqi
      {
        strategy: "0xEbbDEC4bFDd23eCC53225214Faf4612c19Dd0347",
        fixedSnowglobe: "0x32d9D114A2F5aC4ce777463e661BFA28C8fE9Eb7" //snowglobe from non-optimized strategy
      },
      //banker
      {
        strategy: "0x702490d609BcaAf697f345D502b15F7c60F35856",
        fixedSnowglobe: "0x6C6B562100663b4179C95E5B199576f2E16b150e" //snowglobe from non-optimized strategy
      }
    ]
  },
  { //eth
    snowglobe: "0xEBeCc1f55963F52649B71BCeCA663d2A03028f76",
    LP: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    contracts: [
      //benqi
      {
        strategy: "0x730ad83E992aE5A328a5ccEeEF26B0e821ACB524",
        fixedSnowglobe: "0x37d4b7B04ccfC14d3D660EDca1637417f5cA37f3" //snowglobe from non-optimized strategy
      },
      //aave
      {
        strategy: "0xBe290f7E69d5eC6941F9A3d6F1ebF93C179AD6DE",
        fixedSnowglobe: "0x72b7AddaeFE3e4b6452CFAEcf7C0d11e5EBD05a0" //snowglobe from non-optimized strategy
      },
      //banker
      {
        strategy: "0xfd2400B36a20a07c4ca79DfbEf4045Ea249B2a45",
        fixedSnowglobe: "0x49e6A1255DEfE0B194a67199e78aD5AA5D7cb092" //snowglobe from non-optimized strategy
      }
    ]
  },
  { //wbtc
    snowglobe: "0x26CBeA666139daAde08A5E6E8bc3bB7245c6b5dd",
    LP: "0x50b7545627a5162F82A992c33b87aDc75187B218",
    contracts: [
      //benqi
      {
        strategy: "0x35C340bFFB89e00734e13b245EA2B80570D528b1",
        fixedSnowglobe: "0x8FA104f65BDfddEcA211867b77e83949Fc9d8b44" //snowglobe from non-optimized strategy
      },
      //aave
      {
        strategy: "0xC623a46Ebd2398db4188070Efde2f355F5832399",
        fixedSnowglobe: "0xcB707aA965aEB9cB03d21dFADf496e6581Cd7b96" //snowglobe from non-optimized strategy
      },
      //banker
      {
        strategy: "0x9DcB28e8c2dB31b44Ce0448d567f48E8a310E808",
        fixedSnowglobe: "0xfb49ea67b84F7c1bBD825de7febd2C836BC4B47E" //snowglobe from non-optimized strategy
      }
    ]
  },
  { //usdc
    snowglobe: "0x1022baD88471d7e7d59893A86E4e2fc49F441981",
    LP: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
    contracts: [
      //benqi
      {
        strategy: "0xE8c651B51460248457b80DFDEE0E545Bd474bd68",
        fixedSnowglobe: "0xa8981Eab82d0a471b37F7d87A221C92aE60c0E00" //snowglobe from non-optimized strategy
      },
      //aave
      {
        strategy: "0x707090bbCfd3b4470C724aF560FE3d7D7d0590E2",
        fixedSnowglobe: "0x0c33d6076F0Dce93db6e6103E98Ad951A0F33917" //snowglobe from non-optimized strategy
      },
      //banker
      {
        strategy: "0x80e47C48e9375c6431bE3FCB7DCd30dcc2bb5A3b",
        fixedSnowglobe: "0x8C9fAEBD41c68B801d628902EDad43D88e4dD0a6" //snowglobe from non-optimized strategy
      }
    ]
  },
  { //usdt
    snowglobe: "0x4C7887F2C555ba214582D7935ed60D004816BB0C",
    LP: "0xc7198437980c041c805A1EDcbA50c1Ce5db95118",
    contracts: [
      //benqi
      {
        strategy: "0xcCb342985a2963Cd3643cfb40b63D145Ec8C5A40",
        fixedSnowglobe: "0xE9d842C46e3bE5Ab68b226d9329515a85DF7cEE2" //snowglobe from non-optimized strategy
      },
      //aave
      {
        strategy: "0x5e8B060639646117539Fd33Ee221364012332C9B",
        fixedSnowglobe: "0x567350328dB688d49284e79F7DBfad2AAd094B7A" //snowglobe from non-optimized strategy
      },
      //banker joe
      {
        strategy: "0x1A07f2AEec34E3CaDaf85EeEE45fcC70881178DF",
        fixedSnowglobe: "0xc7Ca863275b2D0F7a07cA6e2550504362705aA1A" //snowglobe from non-optimized strategy
      }
    ]
  }
]

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
    OPTIMIZER_CONTROLLER,
    '0x14559fb4d15Cf8DCbc35b7EDd1215d56c0468202', // Platypus controller
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

module.exports = { WANTS: Wants, OPTIMIZER_CONTROLLER, OPTIMIZER_POOLS};
