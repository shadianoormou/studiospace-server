import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import { SignJWT, jwtVerify } from 'jose';
import { HttpError } from './errors.js';
export function createAuthentication(db, client, config) {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const auth = betterAuth({
    appName: 'StudioSpace', baseURL: config.origin, secret: config.secret,
    database: mongodbAdapter(db, { client }), trustedOrigins: config.origins,
    emailAndPassword: { enabled: true, minPasswordLength: 6, maxPasswordLength: 128, autoSignIn: false, requireEmailVerification: false },
    socialProviders: googleEnabled ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } } : {},
    advanced: { useSecureCookies: config.production },
    hooks: { before: createAuthMiddleware(async ctx => {
      if (ctx.path === '/sign-up/email' && !/^(?=.*[a-z])(?=.*[A-Z]).{6,128}$/.test(ctx.body?.password || '')) {
        throw new APIError('BAD_REQUEST', { message: 'Password needs an uppercase letter, a lowercase letter, and at least 6 characters.' });
      }
    }) },
  });
  const key = new TextEncoder().encode(config.jwtSecret);
  const cookieName = config.production ? '__Secure-studiospace_jwt' : 'studiospace_jwt';
  const cookieOptions = { httpOnly: true, secure: config.production, sameSite: 'lax', path: '/api', maxAge: 15 * 60 * 1000 };
  async function session(req, res, next) {
    const current = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!current) throw new HttpError(401, 'Please log in to continue.');
    req.user = current.user; req.authSession = current.session; next();
  }
  async function issueToken(req, res) {
    const token = await new SignJWT({ sid: req.authSession.id }).setProtectedHeader({ alg: 'HS256' }).setSubject(req.user.id)
      .setIssuedAt().setIssuer('studiospace').setAudience('studiospace-api').setExpirationTime('15m').sign(key);
    res.cookie(cookieName, token, cookieOptions).json({ success: true });
  }
  async function verifyToken(req, res, next) {
    try {
      const { payload } = await jwtVerify(req.cookies[cookieName] || '', key, { algorithms: ['HS256'], issuer: 'studiospace', audience: 'studiospace-api' });
      if (payload.sub !== req.user.id || payload.sid !== req.authSession.id) throw new Error('Session mismatch');
    } catch { throw new HttpError(401, 'Your secure session expired. Please try again.'); }
    next();
  }
  function checkOrigin(req, res, next) {
    if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin && !config.origins.includes(req.headers.origin)) throw new HttpError(403, 'Request origin is not allowed.');
    next();
  }
  return { auth, session, issueToken, verifyToken, checkOrigin, googleEnabled };
}
