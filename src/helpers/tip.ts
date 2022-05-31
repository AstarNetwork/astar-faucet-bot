import { tokenToMinimalDenom } from './calculation';
import axios from 'axios';

const GAS_API_URL = 'https://gas.astar.network/api';

interface ApiGasNow {
    code: number;
    data: PriceData;
}

interface PriceData {
    slow: string;
    average: string;
    fast: string;
    timestamp: number;
    eip1559: Eip1559;
    tip: Fee;
}

interface Eip1559 {
    priorityFeePerGas: Fee;
    baseFeePerGas: string;
}

interface Fee {
    slow: string;
    average: string;
    fast: string;
}

type Speed = 'slow' | 'average' | 'fast';

const checkTipPrice = (fee: string): void => {
    const astrDecimal = 18;
    const oneAstr = tokenToMinimalDenom('1', astrDecimal).toString();
    // Memo: throw an error whenever provided price is too way expensive
    if (Number(fee) > Number(oneAstr)) {
        throw Error('Calculated tip amount is more than 1 ASTR/SDN');
    }
};

export const fetchTip = async ({ network, speed }: { network: string; speed: Speed }): Promise<string> => {
    try {
        const formattedNetwork = network === 'shibuya testnet' ? 'shibuya' : network;
        const url = `${GAS_API_URL}/gasnow?network=${formattedNetwork}`;
        const { data } = await axios.get<ApiGasNow>(url);
        if (!data || data.code !== 200) {
            throw Error('something went wrong');
        }
        const { tip } = data.data;
        const fee = tip[speed];
        checkTipPrice(fee);
        return fee;
    } catch (error) {
        console.error(error);
        const fallback = '10000000000000';
        return fallback;
    }
};
