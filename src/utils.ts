import * as winston from 'winston';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace utils {
    /**
     * Returns a new Record with an updated entry
     * @typeparam T The entry type to update
     * @param record The source Record
     * @param entry The new entry
     * @returns The new Record object
     */
    export const update = <T>(
        dictionaryA: T,
        dictionaryB: {}
    ): T => {
        const copy = {
            ...dictionaryA,
            ...dictionaryB,
        };
        return copy;
    };

    /**
     * Checks to see if a date is in the future
     * @param date The date to check
     */
    export const isInFuture = (
        date: Date
    ): boolean => date > new Date();

    /**
     * Checks to see if a date is in the past
     * @param date The date to check
     */
    export const isInPast = (
        date: Date
    ): boolean => date < new Date();

    /**
     * Checks to see if now is between two dates
     * @param dateStart The starting date to check
     * @param dateEnd The ending date to check
     */
    export const isNowBetween = (
        dateStart: Date,
        dateEnd: Date
    ): boolean => {
        const now: Date = new Date();
        return dateStart <= now && now <= dateEnd;
    };

    /**
     * Checks to see if a Date is valid
     * @param date The date to check
     * @returns Whether the date is valid
     */
    export const isValidDate = (
        date: Date
    ): boolean => date instanceof Date
        && !Number.isNaN(
            date.getTime()
        );

    /**
     * Instance of global winston logger
     */
    export const logger: winston.Logger = winston.createLogger({
        level: 'debug',
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss',
            })
        ),
        transports: [
            new winston.transports.File({
                filename: 'log',
            }),
            new winston.transports.Console({
                format: winston.format.simple(),
            }),
        ],
    });

    /**
    * @function
    * @description Error logger helper function
    * @param {Error} error The error
    */
    export const logError = (error: Error): void => {
        logger.error('Unexpected error');
        logger.error(error.message);
    };
}
