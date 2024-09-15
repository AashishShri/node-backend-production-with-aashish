import { Router } from 'express';
import apiController from '../controller/apiController';
import rateLimit from '../middleware/rateLimit';
import authentication from '../middleware/authentication';

const router = Router()

//router.use(rateLimit) // to apply in all route
router.route('/self').get(rateLimit, apiController.self)
router.route('/health').get(apiController.health)

//Router for authentications system
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/register').post(apiController.register)

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/confirmation/:token').put(apiController.confirmation)

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/login').post(apiController.login)

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/self-identification').get(authentication, apiController.selfIdentification)

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/logout').put(authentication, apiController.logout)

export default router