const Util = {

    displayBNasFloat(bigNumber, decimals) {
        const stringNumber = bigNumber.toString();
        const isNegative = stringNumber[0] === '-';
        const unsignedString = stringNumber.replace('-', '');
        const zeroPadding = '0'.repeat(Math.max(decimals - unsignedString.length, 0));
        const unsignedPaddedInput = zeroPadding + unsignedString;
        const wholePartString = (isNegative ? '-' : '') + unsignedPaddedInput.slice(0, unsignedPaddedInput.length - decimals);
        const fractionalPartString = unsignedPaddedInput.slice(unsignedPaddedInput.length - decimals, unsignedPaddedInput.length);

        if (decimals === 0) {
            // if (unsignedString.replace(/0+$/, '').length >= 18) logger.execution.warn(`Converting ${wholePartString} will lose precision`);
            return parseInt(wholePartString);
        } else {
            // if (unsignedString.replace(/0+$/, '').length >= 18) logger.execution.warn(`Converting ${wholePartString}.${fractionalPartString} will lose precision`);
            return parseFloat(`${wholePartString}.${fractionalPartString}`);
        }
    },

    randomIntFromInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },

    cchainTransactionLink(tx) {
        return `https://cchain.explorer.avax.network/tx/${tx}`;
    },

    cchainAddressLink(address) {
        return `https://cchain.explorer.avax.network/address/${address}`;
    },

    thumbnailLink(strategy) {
        const linkRepo = 'https://raw.githubusercontent.com/Jonasslv/snow-harvester/facc6d6168fabd336ed66987e0bdedb68207fcab/assets/';
        return `${linkRepo}${strategy}.png`
    }

};

module.exports = Util;
