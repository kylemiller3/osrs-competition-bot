import * as winston from 'winston'

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace utils {
    /**
    * @function
    * @description Returns a new Record with an updated entry
    * @param {Record<string, T>} record The Record to edit
    * @param {T} entry The new entry
    * @returns {Record<string, T>} The new Record object
    */
    export const update = <T>(record: Record<string, T>, entry: T):
    Record<string, T> => Object.assign({}, record, entry)

    export const isInFuture = (date: Date):
    boolean => date > new Date()

    export const isInPast = (date: Date):
    boolean => date < new Date()

    export const isNowBetween = (dateStart: Date, dateEnd: Date):
    boolean => {
        const now: Date = new Date()
        return dateStart <= now && now <= dateEnd
    }

    /**
     * @function
     * @description Checks to see if a Date is valid
     * @param {Date} date The date to check
     * @returns {boolean} Whether the date is valid
     */
    export const isValidDate = (date: Date):
    boolean => date instanceof Date && !Number.isNaN(date.getTime())

    /**
    * @description Instance of global winston logger
    * @type {winston.Logger}
    * @constant
    */
    // create our winston logger
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
    })

    /**
    * @function
    * @description Error logger helper function
    * @param {Error} error The error
    */
    export const logError = (error: Error): void => {
        logger.error('Unexpected error')
        logger.error(error.message)
    }
}
