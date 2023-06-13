// PACKAGES
import axios from 'axios';

// TYPES
import { Root as IGuestTokenResponse } from '../types/response/GuestToken';

// MODELS
import { AuthCredential } from '../models/AuthCredential';

/**
 * A class that deals with authenticating against Twitter API.
 */
export class AuthService {
    async getGuestCredential(): Promise<AuthCredential> {
        // Creating a new blank credential
        const cred: AuthCredential = new AuthCredential();

        // Getting the guest token
        await axios.post<IGuestTokenResponse>('https://api.twitter.com/1.1/guest/activate.json', null, {
            headers: {
                'Authorization': `Bearer ${cred.authToken as string}`
            }
        }).then(res => {
            cred.guestToken = res.data.guest_token;
        });

        return cred;
    }
}