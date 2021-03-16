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

    convertViaPool(amountIn, reserveIn, reserveOut) {
        const amountInWithFee = amountIn.muln(977);
        const numerator = amountInWithFee.mul(reserveOut);
        const denominator = reserveIn.muln(1000).add(amountInWithFee);
        return numerator.div(denominator);
    }

};

module.exports = Util;
