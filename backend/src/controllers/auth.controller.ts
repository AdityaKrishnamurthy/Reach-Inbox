import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { config } from '../config/env';

export class AuthController {
  /**
   * GET /api/auth/google
   * Redirects to Google OAuth consent page
   */
  static googleLogin(req: Request, res: Response): void {
    if (!config.google.clientId || !config.google.clientSecret) {
      console.warn('[Google OAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
      res.redirect(`${config.frontendUrl}/login?error=oauth_config_missing`);
      return;
    }

    const authUrl = AuthService.getGoogleAuthUrl();
    res.redirect(authUrl);
  }

  /**
   * GET /api/auth/google/callback
   * Handles callback from Google OAuth
   */
  static async googleCallback(req: Request, res: Response): Promise<void> {
    const { code, error } = req.query;

    if (error || !code || typeof code !== 'string') {
      console.error('[Google OAuth Callback Error]:', error || 'No code returned');
      res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
      return;
    }

    try {
      // 1. Exchange code for access token
      const tokens = await AuthService.getGoogleTokens(code);
      
      // 2. Fetch user information
      const googleUser = await AuthService.getGoogleUser(tokens.access_token);

      // 3. Upsert user in database
      const user = await AuthService.upsertGoogleUser(googleUser);

      // 4. Generate session token
      const token = AuthService.generateSessionToken(user);

      // 5. Set secure HttpOnly cookie (sameSite: 'none' in production supports cross-domain Vercel/Railway setups)
      res.cookie('reachinbox_token', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // 6. Redirect to dashboard
      res.redirect(`${config.frontendUrl}/dashboard`);
    } catch (err: any) {
      console.error('[Google Auth Error]:', err.message);
      res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
    }
  }

  /**
   * GET /api/auth/me
   * Returns authenticated user profile
   */
  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await AuthService.findUserById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve profile' });
    }
  }

  /**
   * POST /api/auth/logout
   * Logs out user by clearing the auth cookie
   */
  static logout(req: Request, res: Response): void {
    res.clearCookie('reachinbox_token', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      path: '/',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  }
}
