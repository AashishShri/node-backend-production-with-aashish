import { Router } from 'express';
import apiController from '../controller/apiController';
import rateLimit from '../middleware/rateLimit';

const router = Router()

//router.use(rateLimit) // to apply in all route
router.route('/self').get(rateLimit, apiController.self)
router.route('/health').get(apiController.health)

//Router for authentications system
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.route('/register').post(apiController.register)

export default router