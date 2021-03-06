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
    ],
    WANTS: {
        '0xa1C2c3B6b120cBd4Cec7D2371FFd4a931A134A32': 'AVAX-SNOB',
        '0x97B4957df08E185502A0ac624F332c7f8967eE8D': 'PNG-SNOB',
        '0xd7538cABBf8605BdE1f4901B47B8D42c61DE0367': 'AVAX-PNG',
        '0x1aCf1583bEBdCA21C8025E172D8E8f2817343d65': 'AVAX-ETH',
        '0x53B37b9A6631C462d74D65d61e1c056ea9dAa637': 'PNG-ETH',
        '0xf372ceAE6B2F4A2C4A6c0550044A7eab914405ea': 'PNG-WBTC',
        '0x7313835802C6e8CA2A6327E6478747B71440F7a4': 'PNG-LINK',
        '0xE8AcF438B10A2C09f80aEf3Ef2858F8E758C98F9': 'PNG-USDT',
        '0xF105fb50fC6DdD8a857bbEcd296c8a630E8ca857': 'PNG-SUSHI',
        '0x874685bc6794c8b4bEFBD037147C2eEF990761A9': 'PNG-UNI',
        '0x0025CEBD8289BBE0a51a5c85464Da68cBc2ec0c4': 'PNG-AAVE',
        '0xa465e953F9f2a00b2C1C5805560207B66A570093': 'PNG-YFI',
        '0xD765B31399985f411A9667330764f62153b42C76': 'PNG-DAI',
        '0x7a6131110B82dAcBb5872C7D352BfE071eA6A17C': 'AVAX-WBTC',
        '0xbbC7fFF833D27264AaC8806389E02F717A5506c9': 'AVAX-LINK',
        '0x9EE0a4E21bd333a6bb2ab298194320b8DaA26516': 'AVAX-USDT',
        '0xd8B262C0676E13100B33590F10564b46eeF652AD': 'AVAX-SUSHI',
    },
};

module.exports = Config;
