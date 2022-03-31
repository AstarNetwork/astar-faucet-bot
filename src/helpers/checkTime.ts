export const ONE_MINUTE = 60 * 1000;
export const ONE_HOUR = ONE_MINUTE * 60;
export const ONE_DAY = ONE_HOUR * 24;
export const ONE_WEEK = ONE_DAY * 7;

export const didTimePass = (start: number, seconds: number) => {
    const now = Date.now();
    return now > start + seconds;
};
