const { ethers } = require('ethers');

const Util = {

    convertBNtoFloat(bigNumber, decimals) {
        return Util.convertStringToFloat(bigNumber.toString(), decimals);
    },

    roundDown(value, decimals = 18) {
      const valueString = value.toString();
      const integerString = valueString.split('.')[0];
      const decimalsString = valueString.split('.')[1];
      if (!decimalsString) {
        return integerString
      }
      return `${integerString}.${decimalsString.slice(0, decimals)}`;
    },

    convertStringToFloat(stringNumber, decimals) {
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

    displayBNasFloat(bigNumber, decimals, formattingDecimals = 2) {
        const float = Util.convertBNtoFloat(bigNumber, decimals);
        return parseFloat(float.toFixed(formattingDecimals)).toLocaleString('en-US', { maximumFractionDigits: 20 });
    },

    offset(decimals) {
        return ethers.BigNumber.from('1' + '0'.repeat(decimals));
    },

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
