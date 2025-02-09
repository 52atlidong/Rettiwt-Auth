#! /usr/bin/env node

// PACKAGES
import { Auth } from './';

// Getting the account credentials from commandline args
const email: string = process.argv[2];
const userName: string = process.argv[3];
const password: string = process.argv[4];
const code: string = process.argv[5];
// Logging in and returning the credentials
new Auth().getUserCredential({
    email: email,
    userName: userName,
    password: password,
    code: code,
}).then(res => console.log(res.toHeader())).catch(err => console.log(err));