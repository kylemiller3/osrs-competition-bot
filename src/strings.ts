enum Error {
    NO_USER_MENTION = 'There must be a user mention.',
    NO_EVENT_SPECIFIED = 'You must specify an event.',
    NO_SCORE_SPECIFIED = 'You forgot a score to add.',
    EVENT_NOT_FOUND = 'Cannot find event in database.',
    USER_NOT_SIGNED_UP = 'User is not signed up.',
    NO_RSN_SPECIFIED = 'RSN must be supplied for automatic tracking.',
    NO_TEAM_SPECIFIED = 'Team must be specified for team events.',
    NO_TRACKING_SPECIFIED = 'Skills event must track at least one skill.',
}

export default Error;
