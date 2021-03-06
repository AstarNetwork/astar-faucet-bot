// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import GoogleRecaptcha from 'google-recaptcha';

export const verifyRecaptcha = async ({
    recaptchaResponse,
    recaptchaSecret,
}: {
    recaptchaResponse: string;
    recaptchaSecret: string;
}): Promise<boolean> => {
    if (!recaptchaResponse) throw Error('recaptcha response is required');
    const googleRecaptcha = new GoogleRecaptcha({ secret: recaptchaSecret });
    return await new Promise<boolean>(async (resolve) => {
        googleRecaptcha.verify({ response: recaptchaResponse }, (error: Error) => {
            if (error) {
                throw Error('invalid recaptcha');
            } else {
                resolve(true);
            }
        });
    });
};
