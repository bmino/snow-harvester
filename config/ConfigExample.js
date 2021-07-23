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
    CONTROLLERS: [
        '0xACc69DEeF119AB5bBf14e6Aaf0536eAFB3D6e046', // second deployment (must come first to supersede other controller
        '0xf7b8d9f8a82a7a6dd448398afc5c77744bd6cb85', // first deployment
    ].map(a => a.toLowerCase()),
};

module.exports = Config;
