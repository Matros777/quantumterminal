import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
}

function getNexaAuthSecret(): string {
  return process.env.NEXTAUTH_SECRET || 'dev-admin-secret-2026';
}

function generateToken(user: AdminUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    getNexaAuthSecret(),
    { expiresIn: '7d' }
  );
}

function verifyToken(token: string): AdminUser | null {
  try {
    const decoded = jwt.verify(token, getNexaAuthSecret()) as AdminUser;
    return decoded;
  } catch {
    return null;
  }
}

function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookieToken = request.cookies.get('auth-token');
  if (cookieToken) {
    return cookieToken.value;
  }
  return null;
}

// POST /api/admin/login - Admin login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@quantumterminal.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'quantum2026!';

    // Validate credentials
    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const admin: AdminUser = {
      id: 'admin-1',
      email: adminEmail,
      role: 'admin'
    };

    const token = generateToken(admin);

    const response = NextResponse.json({
      success: true,
      data: { user: admin, token },
      message: 'Login successful'
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60
    });

    return response;
  } catch (error) {
    console.error('Error during admin login:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}

// GET /api/admin/login - Check login status
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user },
      message: 'Authenticated'
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication check failed' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/login - Logout
export async function DELETE() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful'
    });

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    });

    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
