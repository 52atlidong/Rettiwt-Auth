/**
 * The various subtasks involved in logging in to a Twitter account.
 */
export enum ELoginSubtasks {
    INITIATE = 'InitiateLogin',
    JS_INSTRUMENTATION = 'LoginJsInstrumentationSubtask',
    ENTER_USER_IDENTIFIER = 'LoginEnterUserIdentifierSSO',
    ENTER_ALTERNATE_USER_IDENTIFIER = 'LoginEnterAlternateIdentifierSubtask',
    ENTER_PASSWORD = 'LoginEnterPassword',
    ACCOUNT_DUPLICATION_CHECK = 'AccountDuplicationCheck'
}