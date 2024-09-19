import { NextFunction, Request, Response } from 'express'
import httpResponse from '../util/httpResponse'
import responseMessage from '../constant/responseMessage'
import httpError from '../util/httpError'
import quicker from '../util/quicker'
import {
    IChangePasswordRequestBody,
    IDecryptedJwt,
    IForgotPasswordRequestBody,
    ILoginUserRequestBody,
    IRefreshToken,
    IRegisterUserRequestBody,
    IResetPasswordRequestBody,
    IUser,
    IUserWithId
} from '../types/userTypes'
import {
    ValidateChangePasswordBody,
    ValidateForgotPasswordBody,
    ValidateLoginBody,
    ValidateRegisterBody,
    ValidateResetPasswordBody,
    validateJoiSchema
} from '../service/validationService'
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

interface ISelfIdentificationRequest extends Request {
    authenticatedUser: IUser
}

interface IForgotPasswordRequest extends Request {
    body: IForgotPasswordRequestBody
}

interface IResetPasswordRequest extends Request {
    body: IResetPasswordRequestBody
    params: {
        token: string
    }
}

interface IChangePasswordRequest extends Request {
    authenticatedUser: IUserWithId
    body: IChangePasswordRequestBody
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
            const DOMAIN = quicker.getDomainFromUrl(config.SERVER_URL as string)

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
    },

    selfIdentification: (req: Request, res: Response, next: NextFunction) => {
        try {
            const { authenticatedUser } = req as ISelfIdentificationRequest
            httpResponse(req, res, 200, responseMessage.SUCCESS, authenticatedUser)
        } catch (err) {
            httpError(next, err, req, 500)
        }
    },
    logout: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { cookies } = req
            const { refreshToken } = cookies as {
                refreshToken: string | undefined
            }
            if (refreshToken) {
                // Db call to delete refresh token
                await databaseService.deleteRefreshToken(refreshToken)
            }
            const DOMAIN = quicker.getDomainFromUrl(config.SERVER_URL as string)
            //cookies clear
            res.clearCookie('accessToken', {
                path: '/api/v1',
                domain: DOMAIN,
                sameSite: 'strict',
                maxAge: 1000 * config.ACCESS_TOKEN.EXPIRY,
                httpOnly: true,
                secure: !(config.ENV === EApplicationEnvironment.DEVELOPMENT)
            })
            res.clearCookie('refreshToken', {
                path: '/api/v1',
                domain: DOMAIN,
                sameSite: 'strict',
                maxAge: 1000 * config.REFRESH_TOKEN.EXPIRY,
                httpOnly: true,
                secure: !(config.ENV === EApplicationEnvironment.DEVELOPMENT)
            })

            httpResponse(req, res, 200, responseMessage.SUCCESS)
        } catch (err) {
            httpError(next, err, req, 500)
        }
    },
    refreshToken: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { cookies } = req
            const { refreshToken, accessToken } = cookies as {
                refreshToken: string | undefined
                accessToken: string | undefined
            }
            if (accessToken) {
                return httpResponse(req, res, 200, responseMessage.SUCCESS, {
                    accessToken
                })
            }
            if (refreshToken) {
                // Db call to delete refresh token
                const rft = await databaseService.findRefreshToken(refreshToken)
                if (rft) {
                    // genrate new token
                    const DOMAIN = quicker.getDomainFromUrl(config.SERVER_URL as string)
                    let userId: null | string = null
                    try {
                        const decryptedJwt = quicker.verifyToken(refreshToken, config.REFRESH_TOKEN.SECRET as string) as IDecryptedJwt
                        userId = decryptedJwt.userId
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    } catch (err) {
                        userId = null
                    }
                    if (userId) {
                        // * Access token & refress token
                        const accessToken = quicker.generateToken(
                            {
                                userId: userId
                            },
                            config.ACCESS_TOKEN.SECRET as string,
                            config.ACCESS_TOKEN.EXPIRY
                        )
                        res.cookie('accessToken', accessToken, {
                            path: '/api/v1',
                            domain: DOMAIN,
                            sameSite: 'strict',
                            maxAge: 1000 * config.ACCESS_TOKEN.EXPIRY,
                            httpOnly: true,
                            secure: !(config.ENV === EApplicationEnvironment.DEVELOPMENT)
                        })
                        return httpResponse(req, res, 200, responseMessage.SUCCESS, {
                            accessToken
                        })
                    }
                }
            }

            httpError(next, new Error(responseMessage.UNAUTHORIZED), req, 401)
        } catch (err) {
            httpError(next, err, req, 500)
        }
    },

    forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
        try {
            // TODO
            // Body parseer
            const { body } = req as IForgotPasswordRequest
            // Validate body
            const { error, value } = validateJoiSchema<IForgotPasswordRequestBody>(ValidateForgotPasswordBody, body)
            if (error) {
                return httpError(next, error, req, 422)
            }

            // Find user by email address

            const { emailAddress } = value
            const user = await databaseService.findUserByEmailAddress(emailAddress)
            if (!user) {
                return httpError(next, new Error(responseMessage.NOT_FOUND('user')), req, 404)
            }
            // Check if user account confirm
            if (!user.accountConfirmation.status) {
                return httpError(next, new Error(responseMessage.ACCOUNT_CONFIRMATION_REQUIRED), req, 400)
            }

            // password reset token & expiry
            const token = quicker.generateRandomId()
            const expiry = quicker.generateResetPasswordExpiry(15)
            // user update
            user.passwordReset.token = token
            user.passwordReset.expiry = expiry
            await user.save()
            // email send
            const resetUrl = `${config.FRONTEND_URL}/reset-password/${token}`
            const to = [emailAddress]
            const subject = 'Account Paasword Reset Requested'
            const text = `Hey ${user.name}, Please reset your account password by clicking on the link below\n\n Link will expire within 15 minutes \n\n${resetUrl}`

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
    resetPassword: async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Todo
            // Body parser and validation
            const { body, params } = req as IResetPasswordRequest
            const { token } = params
            const { error, value } = validateJoiSchema<IResetPasswordRequestBody>(ValidateResetPasswordBody, body)
            if (error) {
                return httpError(next, error, req, 422)
            }

            // fetch user by token

            const { newPassword } = value
            const user = await databaseService.findUserByResetToken(token)
            if (!user) {
                return httpError(next, new Error(responseMessage.NOT_FOUND('user')), req, 404)
            }

            // Check if user account confirm
            if (!user.accountConfirmation.status) {
                return httpError(next, new Error(responseMessage.ACCOUNT_CONFIRMATION_REQUIRED), req, 400)
            }
            // check expiry of the url
            const storedExpiry = user.passwordReset.expiry
            const currentTimeStamp = dayjs().valueOf()
            if (!storedExpiry) {
                return httpError(next, new Error(responseMessage.INVALIED_REQUEST), req, 400)
            }
            if (currentTimeStamp > storedExpiry) {
                return httpError(next, new Error(responseMessage.EXPIRED_URL), req, 400)
            }
            // has new password
            const hashedPassword = await quicker.hashPassword(newPassword)
            // user update
            user.password = hashedPassword

            user.passwordReset.expiry = null
            user.passwordReset.token = null
            user.passwordReset.lastResetAt = dayjs().utc().toDate()
            await user.save()
            // email send

            const to = [user.emailAddress]
            const subject = 'Account Password Reset'
            const text = `Hey ${user.name}, Your account password has been reset successfully`

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
    changePassword: async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Todo
            // body parser and validation
            const { body, authenticatedUser } = req as IChangePasswordRequest

            const { error, value } = validateJoiSchema<IChangePasswordRequestBody>(ValidateChangePasswordBody, body)
            if (error) {
                return httpError(next, error, req, 422)
            }

            // fetch user by id
            const user = await databaseService.findUserById(authenticatedUser._id, '+password')
            if (!user) {
                return httpError(next, new Error(responseMessage.NOT_FOUND('user')), req, 404)
            }

            const { oldPassword, newPassword } = value

            // check old password matching with new
            const isPasswordMatching = await quicker.comparePassword(oldPassword, user.password)
            if (!isPasswordMatching) {
                return httpError(next, new Error(responseMessage.INVALIED_OLD_PASSWORD), req, 400)
            }
            if (oldPassword == newPassword) {
                return httpError(next, new Error(responseMessage.PASSWORD_MATCHING_WITH_OLD_PASSWORD), req, 400)
            }
            // password hash for new password
            const hashedPassword = await quicker.hashPassword(newPassword)
            // user update
            user.password = hashedPassword
            await user.save()

            // email send

            const to = [user.emailAddress]
            const subject = 'Password Successfully changed'
            const text = `Hey ${user.name}, Your account password has been changed successfully`

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
    }
}

