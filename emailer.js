const nodemailer = require("nodemailer")

class Emailer {
    constructor(smtpAddr, smtpUser, smtpPassword) {
        this.transporter = nodemailer.createTransport({
            host: smtpAddr,
            port: 587,
            secure: false,
            auth: {
                user: smtpUser,
                pass: smtpPassword,
            },
        })
    }

    
    /**
     * @param  {string} from
     * @param  {string}  toList
     * @param  {string} subject
     * @param  {string} htmlMessage
     */
    async sendEmail(from, toList, subject, htmlMessage) {
        console.log("sending email from "+from+" to "+toList)
        return await this.transporter.sendMail({
            from: from,
            to: toList,
            subject: subject,
            html: htmlMessage,
        })
    }
}

module.exports = { Emailer }