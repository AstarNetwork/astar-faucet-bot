import pino from 'pino';

export const logLevel = process.env.NODE_ENV === 'production' ? 'debug' : 'trace';

export const logger = pino({ level: logLevel });
