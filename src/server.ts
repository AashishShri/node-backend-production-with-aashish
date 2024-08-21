import config from './config/config';
import app from './app'
import logger from './util/logger';


const server = app.listen(config.PORT)


    ; (() => {

        try {
            // Database Connection
            //const connection = await databaseService.connect()

            logger.info(`DATABASE_CONNECTION`, {
                meta: {
                    CONNECTION_NAME: config.SERVER_URL
                }
            })




            logger.info(`APPLICATION_STARTED`, {
                meta: {
                    PORT: config.PORT,
                    SERVER_URL: config.SERVER_URL
                }
            })
        } catch (err) {

            logger.error(`APPLICATION_ERROR`, { meta: err })

            server.close((error) => {
                if (error) {

                    logger.error(`APPLICATION_ERROR`, { meta: error })
                }

                process.exit(1)
            })
        }
    })()
