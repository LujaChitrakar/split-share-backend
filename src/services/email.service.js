import nodemailer from 'nodemailer';
import envConfig from "../configs/env.config.js";

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: envConfig.NODEMAILER_EMAIL,
        pass: envConfig.NODEMAILER_APP_PASSWORD,
    },
});

transporter.verify((error, success) => {
    if (error) {
        console.error('Error connecting to email server:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

export async function sendEmail(to, subject, htmlContent) {
    const mailOptions = {
        from: `"SplitShare" <${envConfig.NODEMAILER_EMAIL}>`,
        to,
        subject,
        html: htmlContent,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}