// PACKAGES
import axios, { AxiosError } from 'axios';

// ENUMS
import { ELoginUrls, ELoginSubtasks } from './enums/Login';

// TYPES
import { Root as IGuestTokenResponse } from './types/response/GuestToken';
import { Root as ILoginSubtaskResponse } from './types/response/LoginSubtask';

// MODELS
import { AuthCredential } from './models/AuthCredential';
import { AccountCredential } from './models/AccountCredential';
import { LoginSubtaskPayload } from './models/request/payloads/LoginSubtask';
import { EAuthenticationErrors } from './enums/Authentication';
import https, { Agent } from 'https';

import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
/**
 * A class that deals with authenticating against Twitter API.
 *
 * @public
 */
export class Auth {
	/** The current flow token. */
	private flowToken: string;

	/** The current auth credentials. */
	private cred: AuthCredential;

	/** The order in which the login subtasks must be executed. */
	private subtasks: ELoginSubtasks[];

	private readonly httpsAgent: Agent;

	constructor(proxyUrl?: URL) {
		this.flowToken = '';
		this.cred = new AuthCredential();
		this.httpsAgent = this.getHttpsAgent(proxyUrl);
		this.subtasks = [
			ELoginSubtasks.JS_INSTRUMENTATION,
			ELoginSubtasks.ENTER_USER_IDENTIFIER,
			ELoginSubtasks.ENTER_ALTERNATE_USER_IDENTIFIER,
			ELoginSubtasks.ENTER_PASSWORD,
			ELoginSubtasks.ACCOUNT_DUPLICATION_CHECK,
		];
	}

	private getHttpsAgent(proxyUrl?: URL): Agent {
		if (proxyUrl) {
			if (proxyUrl.toString().startsWith('socks')) {
				return new SocksProxyAgent(proxyUrl);
			}
			return new HttpsProxyAgent(proxyUrl);
		}
		return new https.Agent();
	}

	/**
	 * Generates the apporpriate payload for the given login subtask and given data.
	 *
	 * @param subtask The name of the subtask.
	 * @param flowToken The flow token for the subtask.
	 * @param accCred The account credentials to the Twitter account.
	 * @returns The requried payload.
	 *
	 * @internal
	 */
	private getSubtaskPayload(
		subtask: ELoginSubtasks,
		flowToken: string,
		accCred: AccountCredential,
	): LoginSubtaskPayload {
		if (subtask == ELoginSubtasks.ENTER_USER_IDENTIFIER) {
			return new LoginSubtaskPayload(subtask, flowToken, accCred.email);
		} else if (subtask == ELoginSubtasks.ENTER_ALTERNATE_USER_IDENTIFIER) {
			return new LoginSubtaskPayload(subtask, flowToken, accCred.userName);
		} else if (subtask == ELoginSubtasks.ENTER_PASSWORD) {
			return new LoginSubtaskPayload(subtask, flowToken, accCred.password);
		} else if (subtask == ELoginSubtasks.LOGIN_TWO_FACTOR_AUTH_CHALLENGE) {
			return new LoginSubtaskPayload(subtask, flowToken, accCred.code);
		}
		else {
			return new LoginSubtaskPayload(subtask, flowToken);
		}
	}

	/**
	 * Parses the incoming authentication error from Twitter API into a simplified message.
	 *
	 * @param error The incoming error.
	 * @param flowName The flow that was executed, which raised this error.
	 * @returns The simplified error message.
	 *
	 * @internal
	 */
	private parseAuthError(error: AxiosError<ILoginSubtaskResponse>, flowName: ELoginSubtasks): EAuthenticationErrors {
		/** The error message to throw. */
		let errorMessage: EAuthenticationErrors = EAuthenticationErrors.AUTHENTICATION_FAILED;

		// If there is any error related to login
		if (error.response?.data.errors[0].code == 399) {
			// If email error
			if (flowName == ELoginSubtasks.ENTER_USER_IDENTIFIER) {
				errorMessage = EAuthenticationErrors.INVALID_EMAIL;
			}
			// If username error
			else if (flowName == ELoginSubtasks.ENTER_ALTERNATE_USER_IDENTIFIER) {
				errorMessage = EAuthenticationErrors.INVALID_USERNAME;
			}
			// If password error
			else if (flowName == ELoginSubtasks.ENTER_PASSWORD) {
				errorMessage = EAuthenticationErrors.INVALID_PASSWORD;
			}
		}

		return errorMessage;
	}

	/**
	 * Initiates the login process and gets the required flow token and cookies for the login process.
	 *
	 * @internal
	 */
	private async initiateLogin(): Promise<void> {
		await axios
			.post<ILoginSubtaskResponse>(ELoginUrls.INITIATE_LOGIN, null, {
				headers: { ...this.cred.toHeader() },
				httpsAgent: this.httpsAgent,
			})
			.then((res) => {
				// Setting the flow token
				this.flowToken = res.data.flow_token;

				// Setting the cookie string of the auth credentials
				this.cred.cookies = (res.headers['set-cookie'] as string[]).join(';');
			});
	}

	/**
	 * Fetches a guest token, for guest authentication, from Twitter API.
	 *
	 * @returns The credentials containing the guest token.
	 *
	 * @public
	 */
	async getGuestCredential(): Promise<AuthCredential> {
		// Creating a new blank credential
		const cred: AuthCredential = new AuthCredential();

		// Getting the guest token
		await axios
			.post<IGuestTokenResponse>(ELoginUrls.GUEST_TOKEN, null, {
				headers: { ...cred.toHeader() },
				httpsAgent: this.httpsAgent,
			})
			.then((res) => {
				cred.guestToken = res.data.guest_token;
			});

		return cred;
	}

	async getUserCredentialNew(accCred: AccountCredential): Promise<AuthCredential> {
		let task: ELoginSubtasks | undefined = ELoginSubtasks.JS_INSTRUMENTATION;
		this.cred = await this.getGuestCredential();
		await this.initiateLogin();
		while (task) {
			const payload: LoginSubtaskPayload = this.getSubtaskPayload(task, this.flowToken, accCred);
			await axios
				.post<ILoginSubtaskResponse>(ELoginUrls.LOGIN_SUBTASK, payload, {
					headers: { ...this.cred.toHeader() },
					httpsAgent: this.httpsAgent,
				})
				.then((res) => {
					this.flowToken = res.data.flow_token;
					if (res.data.subtasks.map((subtask) => subtask.subtask_id).includes(ELoginSubtasks.ENTER_USER_IDENTIFIER)) {
						task = ELoginSubtasks.ENTER_USER_IDENTIFIER;
					} else if (res.data.subtasks.map((subtask) => subtask.subtask_id).includes(ELoginSubtasks.ENTER_ALTERNATE_USER_IDENTIFIER)) {
						task = ELoginSubtasks.ENTER_ALTERNATE_USER_IDENTIFIER;
					} else if (res.data.subtasks.map((subtask) => subtask.subtask_id).includes(ELoginSubtasks.ENTER_PASSWORD)) {
						task = ELoginSubtasks.ENTER_PASSWORD;
					} else if (res.data.subtasks.map((subtask) => subtask.subtask_id).includes(ELoginSubtasks.ACCOUNT_DUPLICATION_CHECK)) {
						task = ELoginSubtasks.ACCOUNT_DUPLICATION_CHECK;
					} else if (res.data.subtasks.map((subtask) => subtask.subtask_id).includes(ELoginSubtasks.LOGIN_TWO_FACTOR_AUTH_CHALLENGE)) {
						task = ELoginSubtasks.LOGIN_TWO_FACTOR_AUTH_CHALLENGE;
					} else if (res.data.subtasks.map((subtask) => subtask.subtask_id).includes(ELoginSubtasks.LOGIN_SUCCESS_SUBTASK)) {
						this.cred = new AuthCredential(res.headers['set-cookie'] as string[]);
						task = undefined;
					}else {
						throw new Error(`Uncheck task ${task!}`);
						task = undefined;
					}
					// if(res.data.subtasks.map((subtask) => subtask.subtask_id).includes(ELoginSubtasks))
				})
				/**
				 * Catching any error that might have arised in the authentication process.
				 *
				 * Then parsing that error to generate a simplified error message, which is then thrown.
				 */
				.catch((err: AxiosError<ILoginSubtaskResponse>) => {
					throw new Error(this.parseAuthError(err, task!));
				});
		}
		return this.cred;
	}

	/**
	 * Fetches the credentials for user authentication, from Twitter API.
	 *
	 * @param accCred The credentials (email, username and password) to the Twitter account.
	 * @returns The credentials containing the authenticated tokens.
	 *
	 * @public
	 */
	async getUserCredential(accCred: AccountCredential): Promise<AuthCredential> {
		// Creating a new guest credential
		this.cred = await this.getGuestCredential();

		// Initiating the login process
		await this.initiateLogin();

		// Executing the subtasks in the pre-defined order
		for (let i: number = 0; i < this.subtasks.length; i++) {
			// Preparing the subtask payload
			const payload: LoginSubtaskPayload = this.getSubtaskPayload(this.subtasks[i], this.flowToken, accCred);
			// Executing the subtask
			await axios
				.post<ILoginSubtaskResponse>(ELoginUrls.LOGIN_SUBTASK, payload, {
					headers: { ...this.cred.toHeader() },
					httpsAgent: this.httpsAgent,
				})
				.then((res) => {
					/**
					 * After the execution of ENTER_USER_IDENTIFIER subtask, two outcomes are possible:
					 *
					 * 1. Twitter API asks username, then asks for password
					 * 2. Twitter API directly asks for password, skipping username check
					 *
					 * Therefore, it is checked if Twitter API is asking for password after ENTER_USER_IDENTIFIER subtask.
					 *
					 * If yes, then the next subtask (ENTER_ALTERNATE_USER_IDENTIFIER) is skipped and ENTER_PASSWORD subtask is run directly.
					 */
					if (
						this.subtasks[i] == ELoginSubtasks.ENTER_USER_IDENTIFIER &&
						res.data.subtasks.map((subtask) => subtask.subtask_id).includes(ELoginSubtasks.ENTER_PASSWORD)
					) {
						i++;
					}

					// Getting the flow token required for next subtask
					this.flowToken = res.data.flow_token;
					// console.log(this.flowToken);
					// If this is the last subtask, namely ACCOUNT_DUPLICATION_CHECK, setting the AuthCredentials
					if (this.subtasks[i] == ELoginSubtasks.ACCOUNT_DUPLICATION_CHECK
					) {
						console.log(res.data.subtasks);
						if (res.data.subtasks.map((subtask) => subtask.subtask_id).includes('LoginTwoFactorAuthChallenge')) {
							console.log('need check email');
						} else {
							this.cred = new AuthCredential(res.headers['set-cookie'] as string[]);
						}

					}
				})
				/**
				 * Catching any error that might have arised in the authentication process.
				 *
				 * Then parsing that error to generate a simplified error message, which is then thrown.
				 */
				.catch((err: AxiosError<ILoginSubtaskResponse>) => {
					throw new Error(this.parseAuthError(err, this.subtasks[i]));
				});
		}

		return this.cred;
	}

	async checkEmail(code: string): Promise<AuthCredential> {
		const payload: LoginSubtaskPayload = new LoginSubtaskPayload(ELoginSubtasks.LOGIN_ACID, this.flowToken, code);
		await axios
			.post<ILoginSubtaskResponse>(ELoginUrls.LOGIN_SUBTASK, payload, {
				headers: { ...this.cred.toHeader() },
				httpsAgent: this.httpsAgent,
			}).then((res) => {
				this.cred = new AuthCredential(res.headers['set-cookie'] as string[]);
			}).catch((err: AxiosError<ILoginSubtaskResponse>) => {
				// console.log(err);
				// console.log(err.response?.data);
				throw new Error(this.parseAuthError(err, ELoginSubtasks.LOGIN_ACID));
			});
		return this.cred;
	}

}
