import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  loginValidators,
  logout,
  refresh,
  getMe,
  changePassword,
  changePasswordValidators,
  registerOrg,
  registerOrgValidators,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth/authenticate';
import { asyncHandler } from '../utils/asyncHandler';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registrations from this IP.' },
});

const refreshLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

const router = Router();

router.post('/login', loginLimiter, loginValidators, asyncHandler(login));
router.post('/register', registerLimiter, registerOrgValidators, asyncHandler(registerOrg));
router.post('/refresh', refreshLimiter, asyncHandler(refresh));
router.post('/logout', authenticate, asyncHandler(logout));
router.get('/me', authenticate, asyncHandler(getMe));
router.put('/change-password', authenticate, changePasswordValidators, asyncHandler(changePassword));

export default router;
