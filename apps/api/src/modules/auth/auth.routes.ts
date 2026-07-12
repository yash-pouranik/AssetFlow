import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { adminOnly } from '../../shared/middleware/rbac.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { SignupDto, LoginDto, RefreshTokenDto, PromoteRoleDto, ForgotPasswordDto, ResetPasswordDto } from './auth.dto';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & role management
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new employee account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               phone: { type: string }
 */
router.post('/signup', validate(SignupDto), authController.signup);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email & password
 */
router.post('/login', validate(LoginDto), authController.login);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset OTP
 */
router.post('/forgot-password', validate(ForgotPasswordDto), authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using OTP
 */
router.post('/reset-password', validate(ResetPasswordDto), authController.resetPassword);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 */
router.post('/refresh', validate(RefreshTokenDto), authController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (invalidates refresh token)
 *     security:
 *       - BearerAuth: []
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security:
 *       - BearerAuth: []
 */
router.get('/me', authenticate, authController.getProfile);

/**
 * @swagger
 * /auth/users/{userId}/promote:
 *   patch:
 *     tags: [Auth]
 *     summary: Promote user role (Admin only)
 *     security:
 *       - BearerAuth: []
 */
router.patch(
  '/users/:userId/promote',
  authenticate,
  adminOnly,
  validate(PromoteRoleDto),
  authController.promoteRole
);

export default router;
