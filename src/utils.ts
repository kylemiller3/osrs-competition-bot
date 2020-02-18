import * as log4js from 'log4js';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Utils {

    /**
     * Checks to see if a string is a yes answer
     * @param input The string to check
     */
    export const isYes = (
        input: string
    ): boolean => input.toLowerCase() === 'yes'
        || input.toLowerCase() === 'y'
        || input.toLowerCase() === 'ok'
        || input.toLowerCase() === 'okay'
        || input.toLowerCase() === 'true'
        || input.toLowerCase() === 't'
        || input === '1';

    /**
     * Strict mode safe object undefined and null filter
     * @param input The array to filter
     * @returns An array without undefined or nulls
     */
    export const isDefinedFilter = <T>(
        input: T | undefined | null
    ): input is T => typeof input !== 'undefined' && input !== null;


    /**
     * Checks to see if a date is in the future
     * @param date The date to check
     * @category Date
     * @returns True if the date is in the future
     */
    export const isInFuture = (
        date: Date
    ): boolean => date > new Date();

    /**
     * Checks to see if a date is in the past
     * @param date The date to check
     * @category Date
     * @returns True if the date is in the past
     */
    export const isInPast = (
        date: Date
    ): boolean => date < new Date();

    /**
     * Checks to see if now is between two dates
     * @param dateStart The starting date to check
     * @param dateEnd The ending date to check
     * @category Date
     * @returns True if now is between the supplied dates
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
     * @category Date
     */
    export const isValidDate = (
        date: Date
    ): boolean => date instanceof Date
        && !Number.isNaN(
            date.getTime()
        );

    /**
     * A date far in the future
     * @returns a new date far in the future
     * @category Date
     */
    export const distantFuture: Date = new Date('9999-12-31Z');

    log4js.configure(
        {
            appenders: {
                out: {
                    type: 'stdout',
                    layout: {
                        type: 'pattern', pattern: '%[[%d] [%p] %f{1}:%l -%] %m',
                    },
                },
                file: {
                    type: 'file',
                    filename: 'logs/compy.log',
                    maxLogSize: 10485760,
                    backups: 3,
                    compress: true,
                    layout: {
                        type: 'pattern', pattern: '[%d] [%p] %f{1}:%l - %m',
                    },
                },
            },
            categories: {
                default: {
                    appenders: [
                        'file',
                        'out',
                    ],
                    level: 'debug',
                    enableCallStack: true,
                },
            },
        }
    );

    /**
     * Global instance of log4js logger configured to log to disk and console
     * @category Log
     */
    export const logger = log4js.getLogger();

    // process.on('exit', (): void => {

    // });
    // process.on('SIGHUP', (): void => process.exit(128 + 1));
    // process.on('SIGINT', (): void => process.exit(128 + 2));
    // process.on('SIGTERM', (): void => process.exit(128 + 15));

    // process.on(
    //     'uncaughtException',
    //     (error: Error):
    //     void => {
    //         logger.fatal(error);
    //         log4js.shutdown(
    //             (err: Error): void => {
    //                 process.exit(1);
    //             }
    //         );
    //     }
    // );

    // process.on('unhandledRejection',
    //     (up: Error):
    //     void => {
    //         throw up;
    //     });
}
