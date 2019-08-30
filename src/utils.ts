import * as log4js from 'log4js';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Utils {
    /**
     * Checks to see if a date is in the future
     * @param date The date to check
     * @category Date
     */
    export const isInFuture = (
        date: Date
    ): boolean => date > new Date();

    /**
     * Checks to see if a date is in the past
     * @param date The date to check
     * @category Date
     */
    export const isInPast = (
        date: Date
    ): boolean => date < new Date();

    /**
     * Checks to see if now is between two dates
     * @param dateStart The starting date to check
     * @param dateEnd The ending date to check
     * @category Date
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
                    filename: 'debug.log',
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

    /**
    * Error logger helper function
    * @param error The error to log
    */
    export const logError = (
        error: Error
    ): void => {
        logger.error('Unexpected error');
        logger.error(error.message);
    };

    process.on(
        'beforeExit',
        (code: number):
        void => {
            logger.info(`Process is shutting down: ${code}`);
        }
    );

    process.on(
        'uncaughtException',
        (error: Error):
        void => {
            logger.fatal(error);
            log4js.shutdown(
                (err: Error): void => {
                    console.log(`Shutdown: ${err}`);
                    process.exit(1);
                }
            );
        }
    );
}
