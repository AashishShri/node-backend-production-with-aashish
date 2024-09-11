import { Resend } from 'resend'
import config from '../config/config'

const resend = new Resend(config.EMAIL_SERVICE_API_KEY)

export default {
    sendEmail: async (to: string[], subject: string, text: string) => {
        try {
            await resend.emails.send({
                from: 'Coder Aashish <onboarding@resend.dev>',
                to,
                subject,
                text
            })
        } catch (err) {
            throw err
        }
    }
}

