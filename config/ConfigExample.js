const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const Config = {
    WALLET: {
        ADDRESS: '0xFd7b8597cF8eE5317439B0B5C55a111F6Eec449D', // My address for easy runs in test mode
        KEY: '',
    },
    EXECUTION: {
        ENABLED: false,
        INTERVAL: 4 * HOUR,
        INTERVAL_WINDOW: 15 * MINUTE,
    },
    BOT: {
        ENABLED: false,
        TOKEN: '',
        CHANNEL: '818943563759878196', // #harvests
    },
    CONTROLLER: '0xf7b8d9f8a82a7a6dd448398afc5c77744bd6cb85', // v4
    STRATEGY: {
        '0x6a803904b9ea0fc982fbb077c7243c244ae05a2d': 'AVAX-PNG',
        '0x953853590b805a0e885a75a3c786d2affceea3cf': 'AVAX-ETH',
        '0x974ef0bda58c81f3094e124f530ef34fe70dc103': 'AVAX-LINK',
        '0x14ec55f8b4642111a5af4f5ddc56b7be867eb6cc': 'AVAX-SUSHI',
        '0x74db28797957a52a28963f424daf2b10226ba04c': 'AVAX-USDT',
    },
};

module.exports = Config;
