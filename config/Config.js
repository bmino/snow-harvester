const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const Config = {
    WALLET: {
        ADDRESS: '0x096a46142C199C940FfEBf34F0fe2F2d674fDB1F',
        KEY: process.env.SNOWBALL_KEY,
    },
    EXECUTION: {
        ENABLED: true,
        INTERVAL: 10 * MINUTE,
        INTERVAL_WINDOW: 5 * MINUTE,
        CONTAINER_MODE: true
    },
    DISCORD: {
        ENABLED: true,
        WEBHOOK_URL: process.env.WEBHOOK_URL
    },
};

module.exports = Config;
