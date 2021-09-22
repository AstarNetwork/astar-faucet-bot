import { Math } from '../src/helpers';

// this is just a simple test starter for jest

describe('simple math', () => {
    it('should return a value that is the sum of two parameters', async () => {
        const response = Math.addNumbers(2, 6);
        expect(response).toEqual(8);
    });
});
