// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Command {

    /**
     * Contract description of each Command
     * @category Interfaces
     */
    interface Description {
        description: string
        accessControl: AccessControl
        command: string
        params?: Record<string, ParamDescription>
    }

    /**
     * Contract containing what to ask the user and the error message on failure
     */

    /**
     * Contract describing a parameter
     * of a command
     * @category Interfaces
     */
    interface ParamDescription {
        description: string
        usage: string
        expectedType: ParamType
        required: boolean
        default?: string | number | boolean
    }

    /**
     * Enum of the expected parsing of a parameter
     * @category Interfaces
     */
    enum ParamType {
        STRING = 'string',
        NUMBER = 'number',
        BOOLEAN = 'bool',
    }

    /**
     * Contract describing Access Controls of each bot [[Description]]
     * @category Interfaces
     */
    interface AccessControl {
        controlFunction: (
            admin: boolean
        ) => boolean
        description: string
    }

    /**
     * Implementation of [[AccessControl]] for
     * admin users only access
     * @category Access Implementations
     */
    const onlyAdmin: AccessControl = {
        controlFunction: (
            admin: boolean
        ): boolean => admin,
        description: 'Only admins or \'osrs event manager\' role.',
    };

    /**
     * Implementation of [[AccessControl]] for any user access
     * @category Access Implementations
     */
    const anyUser: AccessControl = {
        controlFunction: (
        ): boolean => true,
        description: 'Any user access.',
    };

    /**
     * The resulting dictionary after parsing [[ALL.EVENTS_ADD]]
     * @category Parsing Interfaces
     */
    export interface EventsAdd extends Record<string, string | number | boolean> {
        name: string
        starting: string
        ending: string
        type: string
        teams: boolean
        global: boolean
    }

    /**
     * Implementation of the add event command description
     * @category Event Implementations
     */
    const eventsAdd: Description = {
        description: 'Schedules a new event.',
        accessControl: onlyAdmin,
        command: '.add',
        params: {
            name: {
                description: 'The event\'s name.',
                usage: 'event name',
                expectedType: ParamType.STRING,
                required: true,
            },
            starting: {
                description: 'A date in ISO 8601 format of when to start.',
                usage: 'start date',
                expectedType: ParamType.STRING,
                required: false,
                default: undefined,
            },
            ending: {
                description: 'A date in ISO 8601 format of when to end.',
                usage: 'end date',
                expectedType: ParamType.STRING,
                required: false,
                default: undefined,
            },
            type: {
                description: 'The type of event to schedule.',
                usage: '(comma separated lists) skills AND skill1 skill2... OR bh OR lms OR clues AND difficulty1 difficulty2... OR custom OR bosses AND boss list...',
                expectedType: ParamType.STRING,
                required: false,
                default: 'custom',
            },
            global: {
                description: 'Cross guild event.',
                usage: 'yes or no',
                expectedType: ParamType.BOOLEAN,
                required: false,
                default: 'no',
            },
        },
    };

    /**
     * Implementation of the list all events command description
     * @category Event Implementations
     */
    const eventsListAll: Description = {
        description: 'Lists all events.',
        accessControl: anyUser,
        command: '.listall',
    };

    /**
     * Implementation of the list active command description
     * @category Event Implementations
     */
    const eventsListActive: Description = {
        description: 'Lists active events.',
        accessControl: anyUser,
        command: '.listactive',
    };

    /**
     * The resulting dictionary after parsing [[ALL.EVENTS_DELETE]]
     * @category Parsing Interfaces
     */
    export interface EventsDelete extends Record<string, string | number | boolean> {
        id: number
    }

    /**
     * Implementation of the delete event command description
     * @category Event Implementations
     */
    const eventsDelete: Description = {
        description: 'Deletes an event with id.',
        accessControl: onlyAdmin,
        command: '.delete',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
        },
    };

    /**
     * The resulting dictionary after parsing [[ALL.EVENTS_EDIT]]
     * @category Parsing Interfaces
     */
    export interface EventsEdit extends Record<string, string | number | boolean> {
        id: number
        name: string
        starting: string
        ending: string
    }

    /**
     * Implementation of the edit event command description
     * @category Event Implementations
     */
    const eventsEdit: Description = {
        description: 'Edits an event with name.',
        accessControl: onlyAdmin,
        command: '.edit',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
            name: {
                description: 'The event\'s name.',
                usage: 'event name',
                expectedType: ParamType.STRING,
                required: false,
                default: undefined,
            },
            starting: {
                description: 'A date in ISO 8601 format of when to start.',
                usage: 'start date',
                expectedType: ParamType.STRING,
                required: false,
                default: undefined,
            },
            ending: {
                description: 'A date in ISO 8601 format of when to end.',
                usage: 'end date',
                expectedType: ParamType.STRING,
                required: false,
                default: undefined,
            },
        },
    };

    /**
     * The resulting dictionary after parsing [[ALL.EVENTS_END_EVENT]]
     * @category Parsing Interfaces
     */
    export interface EventsEnd extends Record<string, string | number | boolean> {
        id: number
    }

    /**
     * Implementation of the end event command description
     * @category Event Implementations
     */
    const eventsEndEvent: Description = {
        description: 'Ends an event immediately.',
        accessControl: onlyAdmin,
        command: '.end',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
        },
    };

    /**
     * Implementation of the force signup command description
     * @category Admin Implementations
     */
    const eventsForceSignup: Description = {
        description: 'Forces a user to sign up for an event.',
        accessControl: onlyAdmin,
        command: '.forcesignup',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
            rsn: {
                description: 'The RuneScape name to sign-up.',
                usage: 'the RSN',
                expectedType: ParamType.STRING,
                required: true,
            },
            user: {
                description: 'Mention of the user to sign-up.',
                usage: '@mention',
                expectedType: ParamType.STRING,
                required: false,
                default: '',
            },
            team: {
                description: 'The team to sign-up the user for',
                usage: 'teamname',
                expectedType: ParamType.STRING,
                required: false,
                default: '',
            },
        },
    };

    /**
     * Implementation of the force un-signup command description
     * @category Admin Implementations
     */
    const eventsForceUnsignup: Description = {
        description: 'Forces a user to un-sign up for an event.',
        accessControl: onlyAdmin,
        command: '.forceunsignup',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
            user: {
                description: 'Mention of the user to un-signup.',
                usage: '@mention',
                expectedType: ParamType.STRING,
                required: false,
                default: undefined,
            },
        },
    };

    /**
     * The resulting dictionary after parsing [[ALL.EVENTS_ADD_SCORE]]
     * @category Parsing Interfaces
     */
    export interface EventsAddScore extends Record<string, string | number | boolean> {
        id: number
        score: number
        note: string
    }

    /**
     * Implementation of the update score command description
     * @category Admin Implementations
     */
    const eventsAddScore: Description = {
        description: 'Adds to a user\'s score.',
        accessControl: onlyAdmin,
        command: '.updatescore',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
            score: {
                description: 'The score to add.',
                usage: '+/-score',
                expectedType: ParamType.NUMBER,
                required: true,
            },
            note: {
                description: 'A record-keeping note.',
                usage: '(string)',
                expectedType: ParamType.STRING,
                required: false,
            },
        },
    };

    /**
     * The resulting dictionary after parsing [[ALL.EVENTS_SIGNUP]]
     * @category Parsing Interfaces
     */
    export interface EventsSignup extends Record<string, string | number | boolean> {
        id: number
        rsn: string
        team: string
    }

    /**
     * Implementation of the signup command description
     * @category User Implementations
     */
    const eventsSignup: Description = {
        description: 'Signs up a user for an event.',
        accessControl: anyUser,
        command: '.signup',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
            rsn: {
                description: 'The RuneScape name to sign-up.',
                usage: 'your RSN',
                expectedType: ParamType.STRING,
                required: false,
                default: undefined,
            },
            team: {
                description: 'The team name to create or join.',
                usage: 'team name',
                expectedType: ParamType.STRING,
                required: false,
            },
        },
    };

    /**
     * The resulting dictionary after parsing [[ALL.EVENTS_UNSIGNUP]]
     * @category Parsing Interfaces
     */
    export interface EventsUnsignup extends Record<string, string | number | boolean> {
        id: number
    }

    /**
     * Implementation of the un-signup command description
     * @category User Implementations
     */
    const eventsUnsignup: Description = {
        description: 'Un-signs up a user for an event.',
        accessControl: anyUser,
        command: '.unsignup',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
        },
    };

    /**
     * The resulting dictionary after parsing [[ALL.EVENTS_LIST_PARTICIPANTS]]
     * @category Parsing Interfaces
     */
    export interface EventsListParticipants extends Record<string, string | number | boolean> {
        id: number
    }

    /**
     * Implementation of the list participants command description
     * @category User Implementations
     */
    const eventsListParticipants: Description = {
        description: 'Lists all users signed up for an event.',
        accessControl: anyUser,
        command: '.listparticipants',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
        },
    };

    /**
     * The resulting dictionary after parsing [[ALL.EVENTS_AMISIGNEDUP]]
     * @category Parsing Interfaces
     */
    export interface EventsAmISignedUp extends Record<string, string | number | boolean> {
        id: number
    }

    /**
     * Implementation of the amisignedup command description
     * @category User Implementations
     */
    const eventsAmISignedUp: Description = {
        description: 'Tells you if you are signed up for an event.',
        accessControl: anyUser,
        command: '.amisignedup',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
        },
    };

    /**
     * Implementation of the user stats command description
     * @category User Implementations
     */
    const usersStats: Description = {
        description: 'Prints stats for a user or self if no mention.',
        accessControl: anyUser,
        command: '.stats',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
        },
    };


    /**
     * The resulting dictionary after parsing [[ALL.FORCE_UPDATE]]
     * @category Parsing Interfaces
     */
    export interface ForceUpdate extends Record<string, string | number | boolean> {
        id: number
    }
    /**
     * Implementation of the force update command description
     * @category User Implementations
     */
    const forceUpdate: Description = {
        description: 'Forces an update for an event.',
        accessControl: onlyAdmin,
        command: '.forceupdate',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
        },
    };

    /**
     * The resulting dictionary after parsing [[ALL.JOIN_GLOBAL]]
     * @category Parsing Interfaces
     */
    export interface JoinGlobal extends Record<string, string | number | boolean> {
        id: number
    }
    /**
     * Implementation of the force update command description
     * @category User Implementations
     */
    const joinGlobal: Description = {
        description: 'Allows your Guild to signup for a global event.',
        accessControl: onlyAdmin,
        command: '.gjoin',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
        },
    };

    /**
     * The resulting dictionary after parsing [[ALL.JOIN_GLOBAL]]
     * @category Parsing Interfaces
     */
    export interface UnjoinGlobal extends Record<string, string | number | boolean> {
        id: number
    }
    /**
     * Implementation of the force update command description
     * @category User Implementations
     */
    const unjoinGlobal: Description = {
        description: 'Removes and forcefully removes your Guild\'s participants from a global event.',
        accessControl: onlyAdmin,
        command: '.gleave',
        params: {
            id: {
                description: 'The event\'s unique id.',
                usage: 'event id',
                expectedType: ParamType.NUMBER,
                required: true,
            },
        },
    };

    /**
     * The resulting dictionary after parsing [[ALL.ADMIN_SET_CHANNEL]]
     * @category Parsing Interfaces
     */
    export interface AdminSetChannel extends Record<string, string | number | boolean> {
        channel: string
    }

    /**
     * Implementation of the set channel command description
     * @category Admin Implementations
     */
    const adminSetChannel: Description = {
        description: 'Sets the announcements channel to the first channel mentioned.',
        accessControl: onlyAdmin,
        command: '.setchannel',
        params: {
            channel: {
                description: 'Mention of the channel to use.',
                usage: '#channel',
                expectedType: ParamType.STRING,
                required: false,
                default: undefined,
            },
        },
    };

    /**
     * Implementation of the help command description
     * @category Implementations
     */
    const help: Description = {
        command: '.help',
        description: 'Prints this help.',
        accessControl: anyUser,
    };

    export enum ALL {
        ADMIN_SET_CHANNEL,
        EVENTS_ADD,
        // EVENTS_AMISIGNEDUP,
        EVENTS_DELETE,
        // EVENTS_EDIT,
        EVENTS_END_EVENT,
        EVENTS_FORCE_SIGNUP,
        EVENTS_FORCE_UNSIGNUP,
        // EVENTS_LIST_ACTIVE,
        EVENTS_LIST_ALL,
        // EVENTS_LIST_PARTICIPANTS,
        EVENTS_SIGNUP,
        EVENTS_UNSIGNUP,
        // EVENTS_ADD_SCORE,
        HELP,
        // USERS_STATS,
        FORCE_UPDATE,
        JOIN_GLOBAL,
        UNJOIN_GLOBAL,
    }

    const lookup: Record<Command.ALL, Description> = {
        [Command.ALL.ADMIN_SET_CHANNEL]: adminSetChannel,
        [Command.ALL.EVENTS_ADD]: eventsAdd,
        // [Command.ALL.EVENTS_AMISIGNEDUP]: eventsAmISignedUp,
        [Command.ALL.EVENTS_DELETE]: eventsDelete,
        // [Command.ALL.EVENTS_EDIT]: eventsEdit,
        [Command.ALL.EVENTS_END_EVENT]: eventsEndEvent,
        [Command.ALL.EVENTS_FORCE_SIGNUP]: eventsForceSignup,
        [Command.ALL.EVENTS_FORCE_UNSIGNUP]: eventsForceUnsignup,
        // [Command.ALL.EVENTS_LIST_ACTIVE]: eventsListActive,
        [Command.ALL.EVENTS_LIST_ALL]: eventsListAll,
        // [Command.ALL.EVENTS_LIST_PARTICIPANTS]: eventsListParticipants,
        [Command.ALL.EVENTS_SIGNUP]: eventsSignup,
        [Command.ALL.EVENTS_UNSIGNUP]: eventsUnsignup,
        // [Command.ALL.EVENTS_ADD_SCORE]: eventsAddScore,
        [Command.ALL.HELP]: help,
        // [Command.ALL.USERS_STATS]: usersStats,
        [Command.ALL.FORCE_UPDATE]: forceUpdate,
        [Command.ALL.JOIN_GLOBAL]: joinGlobal,
        [Command.ALL.UNJOIN_GLOBAL]: unjoinGlobal,
    };

    /**
     * Helper function used in spoofing messages
     * @param command The command to use
     * @returns The command string
     * @category API
     */
    export const getCommandString = (
        command: Command.ALL,
    ): string => lookup[command].command;

    /**
     * Checks to see if the user has access to the command they called
     * @param command The command to use
     * @param guild The Discord guild to use
     * @param author The Discord user to check
     * @returns True if the Discord user has access
     * @category API
     */
    export const hasAccess = (
        command: Command.ALL,
        admin: boolean,
    ): boolean => {
        const cDescription: Description = lookup[command];
        const access = cDescription.accessControl.controlFunction(
            admin
        );
        return access;
    };

    /**
     * Checks the string to see if the command contains the proper command string
     * @param command The command to use
     * @param str The string to check
     * @returns True if the string contains the command string
     * @category API
     */
    export const isValid = (
        command: Command.ALL,
        str: string,
    ): boolean => {
        const valid: boolean = str
            .toLowerCase()
            .startsWith(
                lookup[command].command
            );
        return valid;
    };

    /**
     * Generates a string describing how to use the command
     * @param description The command description to use
     * @returns The generated string
     * @category API
     */
    export const generateCommandUsageString = (
        command: Command.ALL
    ): string => {
        const cDescription: Description = lookup[command];
        const usage = 'Usage: ';
        const commandStr: string = usage
            .concat(cDescription.command)
            .concat(' ');
        if (cDescription.params !== undefined) {
            const commandParamStr: string = commandStr.concat(
                Object.keys(cDescription.params).map(
                    (paramName: string):
                    string => ''
                    // if (cDescription.params) {
                    //     // if (cDescription.params[paramName].required) {
                    //         return `${paramName}=(${cDescription.params[paramName].usage})`;
                    //     // }
                    //     // return `${paramName}?=(${cDescription.params[paramName].usage})`;
                    // }
                ).join(' ')
            );
            return commandParamStr;
        }
        return commandStr;
    };

    /**
     * Generates a help string describing how to use the command
     * @param description The command description to use
     * @returns The generated string
     * @category Helper
     */
    export const generateHelpString = (
        admin: boolean,
    ): string => {
        const allKeys = Object.keys(lookup);
        const filteredKeys: string[] = allKeys.filter(
            (key: string):
            boolean => {
                if (admin) return true;
                return lookup[key].accessControl === anyUser;
            }
        );

        const generateSubString = (
            key: string
        ): string => {
            const cDescription: Description = lookup[key];
            const paramNames: string[] | undefined = cDescription.params !== undefined
                ? Object.keys(cDescription.params)
                : undefined;
            if (paramNames === undefined) {
                // return `${cDescription.command}\n\tDescription: ${cDescription.description}\n\tParams: None\n\t${cDescription.accessControl.description}\n`;
                return `${cDescription.command}\n\t${cDescription.description}\n\tNo Parameters\n`;
            }
            const paramStr: string = paramNames.map(
                (name: string):
                string => {
                    if (cDescription.params) {
                        // return `\t\t${name}: ${cDescription.params[name].description} Expects: ${cDescription.params[name].expectedType}. Required: ${cDescription.params[name].required}. Default: ${cDescription.params[name].default}.`;
                        return `\t\t${name}: ${cDescription.params[name].description}`;
                    }
                    return '';
                }
            ).join('\n');
            return `${cDescription.command}\n\t${cDescription.description}\n${paramStr}\n\t${generateCommandUsageString(key as unknown as ALL)}\n`;
        };

        const helpStr: string = filteredKeys.map(
            (key: string):
            string => generateSubString(key)
        ).join('\n');
        return helpStr;
    };

    /**
     * Parses a string using the parameters specified in [[ParamDescription]]
     * @param params The param dictionary to use
     * @param str The string to parse
     * @returns A object with keys of the command's
     * parameters and values from the regex execution results
     */
    export const parseParameters = <T>(
        command: Command.ALL,
        str: string,
    ): T => {
        const cDescription: Description = lookup[command];
        const params: Record<string, ParamDescription> | undefined = cDescription.params;
        if (params === undefined) return {} as unknown as T;

        const reduceRecord = (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            acc: Record<string, any>,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            x: Record<string, any>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ): Record<string, any> => {
            acc[Object.keys(x)[0]] = Object.values(x)[0];
            return acc;
        };

        const allKeys: string[] = Object.keys(params);
        const regexes: Record<string, RegExp> = allKeys.map(
            (anchor: string):
            Record<string, RegExp> => {
                const filteredEndingAnchors: string[] = allKeys.filter(
                    (endingAnchor: string):
                    boolean => endingAnchor !== anchor
                );
                const endingAnchorRegex: string = filteredEndingAnchors.join('=|');
                return {
                    [anchor]: RegExp(`(?<=${anchor}=)(.*?)(?:${endingAnchorRegex}=|$)`, 'i'),
                };
            }
        ).reduce(reduceRecord);

        const results: Record<string, string | undefined> = allKeys.map(
            (key: string):
            Record<string, string | undefined> => {
                const exec: RegExpExecArray | null = regexes[key].exec(str);
                if (exec === null) {
                    if (cDescription.params !== undefined
                        && cDescription.params[key].default !== undefined) {
                        return {
                            [key]: cDescription.params[key].default as string,
                        };
                    }
                    return {
                        [key]: undefined,
                    };
                }
                return {
                    [key]: exec[1].trim(),
                };
            }
        ).reduce(reduceRecord);

        const parsed: Record<string, string | number | boolean> = allKeys.map(
            (key: string):
            Record<string, string | number | boolean> => {
                const value = results[key];
                if (value !== undefined) {
                    switch (params[key].expectedType) {
                        case ParamType.BOOLEAN:
                            return {
                                [key]: value.toLowerCase() !== 'false'
                                    && value.toLowerCase() !== 'no',
                            };
                        case ParamType.NUMBER: {
                            const num: number = parseInt(
                                value,
                                10,
                            );
                            if (!Number.isNaN(num)) {
                                return {
                                    [key]: num,
                                };
                            }
                            break;
                        }
                        case ParamType.STRING:
                            return {
                                [key]: value,
                            };
                        default:
                            break;
                    }
                }
                return {};
            }
        ).reduce(reduceRecord);

        return parsed as unknown as T;
    };

}
