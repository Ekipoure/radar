import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from './database';
import { User } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'password_hash'>;
  token?: string;
  message?: string;
}

export async function authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE username = $1',
        [credentials.username]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      const user = result.rows[0] as User;
      const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);

      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const { password_hash, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
        token
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      message: 'Internal server error'
    };
  }
}

export function verifyToken(token: string): { userId: number; username: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function createUser(username: string, password: string): Promise<AuthResult> {
  try {
    const client = await pool.connect();
    
    try {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUser.rows.length > 0) {
        return {
          success: false,
          message: 'Username already exists'
        };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await client.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at, updated_at',
        [username, hashedPassword]
      );

      const user = result.rows[0];
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        success: true,
        user,
        token
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('User creation error:', error);
    return {
      success: false,
      message: 'Internal server error'
    };
  }
}
