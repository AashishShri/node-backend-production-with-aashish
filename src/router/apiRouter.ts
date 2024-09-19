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
router.route('/register').post(rateLimit, apiController.register)

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/confirmation/:token').put(rateLimit, apiController.confirmation)

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/login').post(rateLimit, apiController.login)

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/self-identification').get(authentication, apiController.selfIdentification)

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/logout').put(authentication, apiController.logout)

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/refresh-token').post(rateLimit, apiController.refreshToken)

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/forgot-password').put(rateLimit, apiController.forgotPassword)

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/reset-password/:token').put(rateLimit, apiController.resetPassword)

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/change-password').put(authentication, apiController.changePassword)

export default router