/**
 * The various urls for various operations related to login.
 *
 * @internal
 */
export enum ELoginUrls {
	GUEST_TOKEN = 'https://api.twitter.com/1.1/guest/activate.json',
	INITIATE_LOGIN = 'https://api.twitter.com/1.1/onboarding/task.json?flow_name=login',
	LOGIN_SUBTASK = 'https://api.twitter.com/1.1/onboarding/task.json',
}

/**
 * The various subtasks involved in logging in to a Twitter account.
 *
 * @internal
 */
export enum ELoginSubtasks {
	JS_INSTRUMENTATION = 'LoginJsInstrumentationSubtask',
	ENTER_USER_IDENTIFIER = 'LoginEnterUserIdentifierSSO',
	ENTER_ALTERNATE_USER_IDENTIFIER = 'LoginEnterAlternateIdentifierSubtask',
	ENTER_PASSWORD = 'LoginEnterPassword',
	ACCOUNT_DUPLICATION_CHECK = 'AccountDuplicationCheck',
	LOGIN_ACID = 'LoginAcid',
	LOGIN_TWO_FACTOR_AUTH_CHALLENGE = 'LoginTwoFactorAuthChallenge',
	LOGIN_SUCCESS_SUBTASK = 'LoginSuccessSubtask',
}
