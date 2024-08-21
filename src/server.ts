import config from './config/config';
import app from './app'

const server = app.listen(config.PORT)


    ; (() => {
       
        try {
            // Database Connection
            //const connection = await databaseService.connect()
            // eslint-disable-next-line no-console
            console.info(`DATABASE_CONNECTION`, {
                meta: {
                    CONNECTION_NAME: config.SERVER_URL
                }
            })



// eslint-disable-next-line no-console
            console.info(`APPLICATION_STARTED`, {
                meta: {
                    PORT: config.PORT,
                    SERVER_URL: config.SERVER_URL
                }
            })
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(`APPLICATION_ERROR`, { meta: err })

            server.close((error) => {
                if (error) {
                    // eslint-disable-next-line no-console
                    console.error(`APPLICATION_ERROR`, { meta: error })
                }

                process.exit(1)
            })
        }
    })()
