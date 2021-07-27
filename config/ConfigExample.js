const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const Config = {
    WALLET: {
        ADDRESS: '0x096a46142C199C940FfEBf34F0fe2F2d674fDB1F', // Sample address for easy runs in test mode
        KEY: '',
    },
    EXECUTION: {
        ENABLED: false,
        INTERVAL: 4 * HOUR,
        INTERVAL_WINDOW: 15 * MINUTE,
    },
    DISCORD: {
        ENABLED: false,
        TOKEN: '',
        CHANNEL: '818943563759878196', // #harvests
    },
};

module.exports = Config;
