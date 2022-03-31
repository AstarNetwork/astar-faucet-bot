import BN from 'bn.js';
import BigNumber from 'bignumber.js';

/**
 * Converts the token denominated value to the minimal denomination. For example, 5 DOT will be converted to 50,000,000,000.
 * @param amount The token amount with decimal points
 * @param decimalPoint The number of zeros for 1 token (ex: 15 zeros)
 * @returns The converted token number that can be used in the blockchain.
 */
export const tokenToMinimalDenom = (amount: string | number, decimalPoint: number) => {
    const tokenAmount = new BigNumber(amount);
    const fullAmount = tokenAmount.multipliedBy(new BigNumber(10).pow(decimalPoint));
    return new BN(fullAmount.toFixed());
};
