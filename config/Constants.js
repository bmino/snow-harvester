const Constants = {
    ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
    WAVAX_ADDRESS: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    PNG_ADDRESS: '0x60781C2586D68229fde47564546784ab3fACA982',
    JOE_ADDRESS: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd',
    DAI_ADDRESS: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
    USDT_ADDRESS: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
    XJOE_ADDRESS: '0x57319d41F71E81F3c65F2a47CA4e001EbAFd4F33',
    BENQI_ADDRESS: '0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5',
    AXIAL_ADDRESS: '0xcF8419A615c57511807236751c0AF38Db4ba3351',

    PANGOLIN_ROUTER: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106',
    JOE_ROUTER: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    MAX_GAS_LIMIT_EARN: 2500000,
    MAX_GAS_LIMIT_HARV: 1000000,
    MAX_GAS_LIMIT_LEV: 2500000,
    MAX_GAS_PRICE: 100000000000,
    MIN_APR_TO_LEVERAGE: 0.011, //4% yearly
    PROVIDERS_URL:[        
        'https://api.avax.network/ext/bc/C/rpc',
        'https://node.snowapi.net/ext/bc/C/rpc',
    ] //this is by order of prefference
};

module.exports = Constants;
