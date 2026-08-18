import { config } from '../config/env';
import { query } from '../db';
import { User } from '../types/db';
import jwt from 'jsonwebtoken';

export interface GoogleUserInfo {
  sub: string;
  name: string;
  email: string;
  picture?: string;
  email_verified?: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export class AuthService {
  /**
   * Generates the Google OAuth authorization URL
   */
  static getGoogleAuthUrl(state?: string): string {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: config.google.callbackUrl,
      client_id: config.google.clientId,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid',
      ].join(' '),
      state: state || 'reachinbox-auth',
    };

    const qs = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
  }

  /**
   * Exchanges authorization code for Google tokens
   */
  static async getGoogleTokens(code: string): Promise<{ access_token: string; id_token?: string }> {
    const url = 'https://oauth2.googleapis.com/token';
    const values = {
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.callbackUrl,
      grant_type: 'authorization_code',
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(values),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to exchange Google OAuth code: ${errorText}`);
    }

    return res.json();
  }

  /**
   * Fetches Google user profile using access token
   */
  static async getGoogleUser(accessToken: string): Promise<GoogleUserInfo> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch Google user profile');
    }

    return res.json();
  }

  /**
   * Upserts Google user into PostgreSQL
   */
  static async upsertGoogleUser(googleUser: GoogleUserInfo): Promise<User> {
    const result = await query<User>(
      `INSERT INTO users (google_subject, name, email, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_subject)
       DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         avatar_url = EXCLUDED.avatar_url,
         updated_at = NOW()
       RETURNING *`,
      [
        googleUser.sub,
        googleUser.name || 'User',
        googleUser.email,
        googleUser.picture || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Generates JWT session token
   */
  static generateSessionToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
      config.sessionSecret,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verifies JWT session token
   */
  static verifySessionToken(token: string): SessionUser | null {
    try {
      const decoded = jwt.verify(token, config.sessionSecret) as SessionUser;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Finds user by ID
   */
  static async findUserById(id: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT id, google_subject, name, email, avatar_url, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }
}
