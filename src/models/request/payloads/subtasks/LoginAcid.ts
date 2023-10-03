import { ILoginAcidInput } from "../../../../types/request/payloads/subtasks/LoginAcid";

export class LoginAcidInput implements ILoginAcidInput {
    text: string;
    link: string;

    constructor(text: string) {
        this.text = text;
        this.link = 'next_link';
    }
}