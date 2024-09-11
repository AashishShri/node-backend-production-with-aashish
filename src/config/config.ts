// Its use for env setup 
import DotenvFlow from 'dotenv-flow';
DotenvFlow.config()

export default {
    //General  
    ENV: process.env.ENV,
    PORT: process.env.PORT,
    SERVER_URL: process.env.SERVER_URL,
    //Frontend
    FRONTEND_URL : process.env.FRONTEND_URL,
    //Emailservice
    EMAIL_SERVICE_API_KEY : process.env.EMAIL_SERVICE_API_KEY,
    //Database 
    DATABASE_URL: process.env.DATABASE_URL,
}