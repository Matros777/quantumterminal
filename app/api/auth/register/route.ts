import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Session from '@/models/Session';

const COOKIE_NAME = 'qt_session';

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function slugifyUsername(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

async function generateUniqueUsernameFromEmail(email: string): Promise<string> {
  const local = email.split('@')[0] ?? 'user';
  let base = slugifyUsername(local) || 'user';
  
  // Ensure base is at least 3 chars
  if (base.length < 3) base = 'user_' + base;
  
  // 1) Try base
  const existsBase = await User.findOne({ username: base }).select({ _id: 1 }).lean();
  if (!existsBase) return base;

  // 2) Try base_2 ... base_999
  for (let i = 2; i <= 999; i++) {
    const candidate = `${base}_${i}`.slice(0, 24);
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.findOne({ username: candidate }).select({ _id: 1 }).lean();
    if (!exists) return candidate;
  }

  // 3) Fallback
  return `user_${Date.now().toString(36)}`.slice(0, 24);
}

async function createSession(userId: string, days = 7) {
  await connectDB();

  const token = randomToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await Session.create({ tokenHash, userId, expiresAt });

  const { cookies } = await import('next/headers');
  const jar = await cookies();
  jar.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return { token, expiresAt };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email ? normalizeEmail(body.email) : '';
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, password' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format.' },
        { status: 400 }
      );
    }

    if (password.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 10 characters.' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if email exists
    const existing = await User.findOne({ email }).select({ _id: 1 }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email is already registered.' },
        { status: 409 }
      );
    }

    // Generate username
    const username = await generateUniqueUsernameFromEmail(email);

    // Create user
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ 
      email, 
      username, 
      passwordHash, 
      role: 'user' 
    });

    // Auto-login after registration
    try {
      await createSession(String(user._id), 7);
    } catch (e) {
      console.warn('Session creation failed (registration still succeeded):', e);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: String(user._id),
          email: user.email,
          username: user.username,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to register: ${message}` },
      { status: 500 }
    );
  }
}
