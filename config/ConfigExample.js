const Config = {
    WALLET: {
        ADDRESS: '0xFd7b8597cF8eE5317439B0B5C55a111F6Eec449D', // My address for easy runs in TEST_MODE
        KEY: '',
    },
    INTERVAL: 4 * 60 * 60 * 1000, // Every 4 hours
    CONTROLLER: '0xf7b8d9f8a82a7a6dd448398afc5c77744bd6cb85', // v4
    WANTS: [
        '0xd7538cabbf8605bde1f4901b47b8d42c61de0367', // AVAX-PNG
        '0x1acf1583bebdca21c8025e172d8e8f2817343d65', // AVAX-ETH
        '0xbbc7fff833d27264aac8806389e02f717a5506c9', // AVAX-LINK
        '0xd8b262c0676e13100b33590f10564b46eef652ad', // AVAX-SUSHI
    ],
    STRATEGY_NAME: {
        '0x1ec206a9dd85625e1940cd2b0c8e14a894d2e9ac': 'AVAX-PNG',
        '0x953853590b805a0e885a75a3c786d2affceea3cf': 'AVAX-ETH',
        '0x974ef0bda58c81f3094e124f530ef34fe70dc103': 'AVAX-LINK',
        '0x14ec55f8b4642111a5af4f5ddc56b7be867eb6cc': 'AVAX-SUSHI',
    },
    TEST_MODE: true,
};

module.exports = Config;
