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
    export interface EventsAdd {
        name: string
        starting: string
        ending: string
        type: string
        teams: boolean
    }

    /**
     * Implementation of the add event command description
     * @category Event Implementations
     */
    const eventsAdd: Description = {
        description: 'Schedules a new uniquely named event.',
        accessControl: onlyAdmin,
        command: '!f events add',
        params: {
            name: {
                description: 'The event\'s name.',
                usage: 'event id',
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
                usage: 'skills AND skill1 skill2... OR bh OR lms OR clues AND difficulty1 difficulty2... OR custom',
                expectedType: ParamType.STRING,
                required: false,
                default: 'casual',
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
        command: '!f events list all',
    };

    /**
     * Implementation of the list active command description
     * @category Event Implementations
     */
    const eventsListActive: Description = {
        description: 'Lists active events.',
        accessControl: anyUser,
        command: '!f events list active',
    };

    /**
     * The resulting dictionary after parsing [[ALL.EVENTS_DELETE]]
     * @category Parsing Interfaces
     */
    export interface EventsDelete {
        id: number
    }

    /**
     * Implementation of the delete event command description
     * @category Event Implementations
     */
    const eventsDelete: Description = {
        description: 'Deletes an event with name.',
        accessControl: onlyAdmin,
        command: '!f events delete',
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
     * Implementation of the edit event command description
     * @category Event Implementations
     */
    const eventsEdit: Description = {
        description: 'Edits an event with name.',
        accessControl: onlyAdmin,
        command: '!f events edit',
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
     * The resulting dictionary after parsing [[ALL.EVENTS_END_EVENT]]
     * @category Parsing Interfaces
     */
    export interface EventsEndEvent {
        id: number
    }

    /**
     * Implementation of the end event command description
     * @category Event Implementations
     */
    const eventsEndEvent: Description = {
        description: 'Ends an event immediately.',
        accessControl: onlyAdmin,
        command: '!f events end',
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
        command: '!f events force signup',
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
        },
    };

    /**
     * Implementation of the force un-signup command description
     * @category Admin Implementations
     */
    const eventsForceUnsignup: Description = {
        description: 'Forces a user to un-sign up for an event.',
        accessControl: onlyAdmin,
        command: '!f events force unsignup',
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
     * The resulting dictionary after parsing [[ALL.EVENTS_DELETE]]
     * @category Parsing Interfaces
     */
    export interface EventsAddScore {
        id: number
        score: number
    }

    /**
     * Implementation of the update score command description
     * @category Admin Implementations
     */
    const eventsAddScore: Description = {
        description: 'Adds to a user\'s score.',
        accessControl: onlyAdmin,
        command: '!f events update score',
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
        },
    };

    /**
     * The resulting dictionary after parsing [[ALL.EVENTS_SIGNUP]]
     * @category Parsing Interfaces
     */
    export interface EventsSignup {
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
        command: '!f users signup',
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
    export interface EventsUnsignup {
        id: number
    }

    /**
     * Implementation of the un-signup command description
     * @category User Implementations
     */
    const eventsUnsignup: Description = {
        description: 'Un-signs up a user for an event.',
        accessControl: anyUser,
        command: '!f users unsignup',
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
    export interface EventsListParticipants {
        id: number
    }

    /**
     * Implementation of the list participants command description
     * @category User Implementations
     */
    const eventsListParticipants: Description = {
        description: 'Lists all users signed up for an event.',
        accessControl: anyUser,
        command: '!f users list participants',
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
    export interface EventsAmISignedUp {
        id: number
    }

    /**
     * Implementation of the amisignedup command description
     * @category User Implementations
     */
    const eventsAmISignedUp: Description = {
        description: 'Tells you if you are signed up for an event.',
        accessControl: anyUser,
        command: '!f users amisignedup',
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
        command: '!f users stats',
        params: {
            user: {
                description: 'Mention of the user to print stats.',
                usage: '@mention',
                expectedType: ParamType.STRING,
                required: false,
                default: undefined,
            },
        },
    };

    /**
     * Implementation of the set channel command description
     * @category Admin Implementations
     */
    const adminSetChannel: Description = {
        description: 'Sets the announcements channel to the first channel mentioned.',
        accessControl: onlyAdmin,
        command: '!f admin set channel',
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
        command: '!f help',
        description: 'Prints this help.',
        accessControl: anyUser,
    };

    export enum ALL {
        ADMIN_SET_CHANNEL,
        EVENTS_ADD,
        EVENTS_AMISIGNEDUP,
        EVENTS_DELETE,
        EVENTS_EDIT,
        EVENTS_END_EVENT,
        EVENTS_FORCE_SIGNUP,
        EVENTS_FORCE_UNSIGNUP,
        EVENTS_LIST_ACTIVE,
        EVENTS_LIST_ALL,
        EVENTS_LIST_PARTICIPANTS,
        EVENTS_SIGNUP,
        EVENTS_UNSIGNUP,
        EVENTS_ADD_SCORE,
        HELP,
        USERS_STATS,
    }

    const lookup: Record<Command.ALL, Description> = {
        [Command.ALL.ADMIN_SET_CHANNEL]: adminSetChannel,
        [Command.ALL.EVENTS_ADD]: eventsAdd,
        [Command.ALL.EVENTS_AMISIGNEDUP]: eventsAmISignedUp,
        [Command.ALL.EVENTS_DELETE]: eventsDelete,
        [Command.ALL.EVENTS_EDIT]: eventsEdit,
        [Command.ALL.EVENTS_END_EVENT]: eventsEndEvent,
        [Command.ALL.EVENTS_FORCE_SIGNUP]: eventsForceSignup,
        [Command.ALL.EVENTS_FORCE_UNSIGNUP]: eventsForceUnsignup,
        [Command.ALL.EVENTS_LIST_ACTIVE]: eventsListActive,
        [Command.ALL.EVENTS_LIST_ALL]: eventsListAll,
        [Command.ALL.EVENTS_LIST_PARTICIPANTS]: eventsListParticipants,
        [Command.ALL.EVENTS_SIGNUP]: eventsSignup,
        [Command.ALL.EVENTS_UNSIGNUP]: eventsUnsignup,
        [Command.ALL.EVENTS_ADD_SCORE]: eventsAddScore,
        [Command.ALL.HELP]: help,
        [Command.ALL.USERS_STATS]: usersStats,
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
                    string => {
                        if (cDescription.params[paramName].required) {
                            return `${paramName}=(${cDescription.params[paramName].usage})`;
                        }
                        return `${paramName}?=(${cDescription.params[paramName].usage})`;
                    }
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
            const paramNames: string[] = cDescription.params !== undefined
                ? Object.keys(cDescription.params)
                : undefined;
            if (paramNames === undefined) {
                return `${cDescription.command}\n\tDescription: ${cDescription.description}\n\tParams: No parameters\n\t${cDescription.accessControl.description}\n`;
            }
            const paramStr: string = paramNames.map(
                (name: string):
                string => `\t\t${name}: ${cDescription.params[name].description} Expects: ${cDescription.params[name].expectedType}. Required: ${cDescription.params[name].required}. Default: ${cDescription.params[name].default}.`
            ).join('\n');
            return `${cDescription.command}\n\tDescription: ${cDescription.description}\n\tParams:\n${paramStr}\n\t${generateCommandUsageString(key as unknown as ALL)}`;
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
        const params: Record<string, ParamDescription> = cDescription.params;
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

        const results: Record<string, string> = allKeys.map(
            (key: string):
            Record<string, string> => {
                const exec: RegExpExecArray = regexes[key].exec(str);
                if (exec === null) {
                    if (cDescription.params[key].default !== undefined) {
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
                switch (params[key].expectedType) {
                    case ParamType.BOOLEAN:
                        return {
                            [key]: (
                                results[key].toLowerCase() !== 'false'
                                && results[key].toLowerCase() !== 'no'
                            ),
                        };
                    case ParamType.NUMBER: {
                        const num: number = parseInt(
                            results[key],
                            10,
                        );
                        return {
                            [key]: (
                                Number.isNaN(num)
                                    ? undefined
                                    : num
                            ),
                        };
                    }
                    case ParamType.STRING:
                    default:
                        return {
                            [key]: results[key],
                        };
                }
            }
        ).reduce(reduceRecord);

        return parsed as unknown as T;
    };

}
