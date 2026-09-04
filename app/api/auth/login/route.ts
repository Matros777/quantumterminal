import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Session from '@/models/Session';

const COOKIE_NAME = 'qt_session';

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || 'dev-fallback-secret-do-not-use-in-prod';
}

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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
    await connectDB();

    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email ? normalizeEmail(body.email) : '';
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, password' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email }).lean();

    // Avoid account enumeration: generic error
    if (!user?.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    try {
      await createSession(String(user._id), 7);
    } catch (e) {
      console.error('Session creation failed:', e);
      return NextResponse.json(
        { success: false, error: 'Failed to create session.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: String(user._id),
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to login.' },
      { status: 500 }
    );
  }
}
