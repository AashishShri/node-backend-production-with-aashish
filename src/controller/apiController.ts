import { NextFunction, Request, Response } from 'express'
import httpResponse from '../util/httpResponse'
import responseMessage from '../constant/responseMessage'
import httpError from '../util/httpError'
import quicker from '../util/quicker'
import { ILoginUserRequestBody, IRefreshToken, IRegisterUserRequestBody, IUser } from '../types/userTypes'
import { ValidateLoginBody, ValidateRegisterBody, validateJoiSchema } from '../service/validationService'
import databaseService from '../service/databaseService'
import { EUserRole } from '../constant/userConstant'
import config from '../config/config'
import emailService from '../service/emailService'
import logger from '../util/logger'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { EApplicationEnvironment } from '../constant/application'

dayjs.extend(utc)

interface IRegisterUserRequest extends Request {
    body: IRegisterUserRequestBody
}

interface ILoginUserRequest extends Request {
    body: ILoginUserRequestBody
}
interface IConfirmRequest extends Request {
    params: {
        token: string
    }
    query: {
        code: string
    }
}
export default {
    self: (req: Request, res: Response, next: NextFunction) => {
        try {
            httpResponse(req, res, 200, responseMessage.SUCCESS)
        } catch (err) {
            httpError(next, err, req, 500)
        }
    },

    health: (req: Request, res: Response, next: NextFunction) => {
        try {
            const healthData = {
                application: quicker.getApplicationHealth(),
                system: quicker.getSystemHealth(),
                timeStamp: Date.now()
            }
            httpResponse(req, res, 200, responseMessage.SUCCESS, healthData)
        } catch (err) {
            httpError(next, err, req, 500)
        }
    },

    register: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { body } = req as IRegisterUserRequest

            // * Body Validation
            const { error, value } = validateJoiSchema<IRegisterUserRequestBody>(ValidateRegisterBody, body)
            if (error) {
                return httpError(next, error, req, 422)
            }

            // Destructure Value
            const { name, emailAddress, password, phoneNumber, consent } = value

            // * Phone Number Validation & Parsing
            const { countryCode, isoCode, internationalNumber } = quicker.parsePhoneNumber(`+` + phoneNumber)

            if (!countryCode || !isoCode || !internationalNumber) {
                return httpError(next, new Error(responseMessage.INVALID_PHONE_NUMBER), req, 422)
            }

            // * Timezone
            const timezone = quicker.countryTimezone(isoCode)

            if (!timezone || timezone.length === 0) {
                return httpError(next, new Error(responseMessage.INVALID_PHONE_NUMBER), req, 422)
            }

            // * Check User Existence using Email Address
            const user = await databaseService.findUserByEmailAddress(emailAddress)
            if (user) {
                return httpError(next, new Error(responseMessage.ALREADY_EXIST('user', emailAddress)), req, 403)
            }

            // * Encrypting Password
            const encryptedPassword = await quicker.hashPassword(password)

            // * Account Confirmation Object
            const token = quicker.generateRandomId()
            const code = quicker.generateOtp(6)

            // * Preparing Object
            const payload: IUser = {
                name,
                emailAddress,
                phoneNumber: {
                    countryCode: countryCode,
                    isoCode: isoCode,
                    internationalNumber: internationalNumber
                },
                accountConfirmation: {
                    status: false,
                    token,
                    code: code,
                    timestamp: null
                },
                passwordReset: {
                    token: null,
                    expiry: null,
                    lastResetAt: null
                },
                lastLoginAt: null,
                role: EUserRole.USER,
                timezone: timezone[0].name,
                password: encryptedPassword,
                consent
            }

            // Create New User
            const newUser = await databaseService.registerUser(payload)

            // * Send Email
            const confirmationUrl = `${config.FRONTEND_URL}/confirmation/${token}?code=${code}`
            const to = [emailAddress]
            const subject = 'Confirm Your Account'
            const text = `Hey ${name}, Please confirm your account by clicking on the link below\n\n${confirmationUrl}`

            emailService.sendEmail(to, subject, text).catch((err) => {
                logger.error(`EMAIL_SERVICE`, {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    meta: err
                })
            })

            // Send Response
            httpResponse(req, res, 201, responseMessage.SUCCESS, { _id: newUser._id })
        } catch (err) {
            httpError(next, err, req, 500)
        }
    },

    confirmation: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { params, query } = req as IConfirmRequest

            // Todo:
            const { token } = params
            const { code } = query

            // * Fetch User By Token & Code
            const user = await databaseService.findUserByConfirmationTokenAndCode(token, code)
            if (!user) {
                return httpError(next, new Error(responseMessage.INVALID_ACCOUNT_CONFIRMATION_TOKEN_OR_CODE), req, 400)
            }

            // * Check if Account already confirmed
            if (user.accountConfirmation.status) {
                return httpError(next, new Error(responseMessage.ACCOUNT_ALREADY_CONFIRMED), req, 400)
            }

            // * Account confirm
            user.accountConfirmation.status = true
            user.accountConfirmation.timestamp = dayjs().utc().toDate()

            await user.save()

            // * Account Confirmation Email
            const to = [user.emailAddress]
            const subject = 'Account Confirmed'
            const text = `Your account has been confirmed`

            emailService.sendEmail(to, subject, text).catch((err) => {
                logger.error(`EMAIL_SERVICE`, {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    meta: err
                })
            })

            httpResponse(req, res, 200, responseMessage.SUCCESS)
        } catch (err) {
            httpError(next, err, req, 500)
        }
    },

    login: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { body } = req as ILoginUserRequest
            // Todo:
            // * Validate & parse body

            const { error, value } = validateJoiSchema<ILoginUserRequestBody>(ValidateLoginBody, body)
            if (error) {
                return httpError(next, error, req, 422)
            }
            // * Find user
            const { emailAddress, password } = value
            const user = await databaseService.findUserByEmailAddress(emailAddress, `+password`)
            if (!user) {
                return httpError(next, new Error(responseMessage.NOT_FOUND('user')), req, 404)
            }
            // * Validate password
            const isValidPassword = await quicker.comparePassword(password, user.password)
            if (!isValidPassword) {
                return httpError(next, new Error(responseMessage.INVALID_EMAIL_OR_PASSWORD), req, 400)
            }
            // * Access token & refress token
            const accesstoken = quicker.generateToken(
                {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    userId: user.id
                },
                config.ACCESS_TOKEN.SECRET as string,
                config.ACCESS_TOKEN.EXPIRY
            )

            const refreshtoken = quicker.generateToken(
                {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    userId: user.id
                },
                config.REFRESH_TOKEN.SECRET as string,
                config.REFRESH_TOKEN.EXPIRY
            )
            // * Last login information
            user.lastLoginAt = dayjs().utc().toDate()
            await user.save()
            // * Refress token store
            const refreshTokenPayload: IRefreshToken = {
                token: refreshtoken
            }
            await databaseService.createRefreshToken(refreshTokenPayload)
            // * Cookie send
            let DOMAIN = ''
            try {
                const url = new URL(config.SERVER_URL as string)
                DOMAIN = url.hostname
            } catch (error) {
                throw error
            }
            res.cookie('accessToken', accesstoken, {
                path: '/api/v1',
                domain: DOMAIN,
                sameSite: 'strict',
                maxAge: 1000 * config.ACCESS_TOKEN.EXPIRY,
                httpOnly: true,
                secure: !(config.ENV === EApplicationEnvironment.DEVELOPMENT)
            }).cookie('refreshToken', refreshtoken, {
                path: '/api/v1',
                domain: DOMAIN,
                sameSite: 'strict',
                maxAge: 1000 * config.ACCESS_TOKEN.EXPIRY,
                httpOnly: true,
                secure: !(config.ENV === EApplicationEnvironment.DEVELOPMENT)
            })

            httpResponse(req, res, 200, responseMessage.SUCCESS, {
                accesstoken,
                refreshtoken
            })
        } catch (err) {
            httpError(next, err, req, 500)
        }
    }
}

