import dotenv from 'dotenv';
dotenv.config();

const envConfig = {
    JWT_SECRET: process.env.JWT_SECRET,

    NODEMAILER_EMAIL: process.env.NODEMAILER_EMAIL,
    NODEMAILER_APP_PASSWORD: process.env.NODEMAILER_APP_PASSWORD,

    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT || 5000,
}

export default envConfig;