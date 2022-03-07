const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const Config = {
    WALLET: {
        ADDRESS: '0x096a46142C199C940FfEBf34F0fe2F2d674fDB1F',
        KEY: process.env.SNOWBALL_KEY,
    },
    EXECUTION: {
        ENABLED: true,
        INTERVAL: 1 * HOUR,
        INTERVAL_WINDOW: 30 * MINUTE,
        CONTAINER_MODE: true
    },
    DISCORD: {
        ENABLED: true,
        WEBHOOK_URL: process.env.WEBHOOK_URL,
        WEBHOOK_OPTIMIZER: process.env.WEBHOOK_OPTIMIZER
    },
    SNOWTRACE: {
        API_KEY: "INSERT_KEY"
    }
};

module.exports = Config;
