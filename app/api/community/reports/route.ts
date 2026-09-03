import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';
import CommunityReport, { CommunityReportDoc } from '@/models/CommunityReport';

type ReportReason = 'spam' | 'abuse' | 'misinformation' | 'scam' | 'copyright' | 'other';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const key = user ? `community:report:${user.id}` : `community:report:anon`;
  const rl = rateLimit(key, 20, 24 * 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  await connectDB();

  const body = (await req.json().catch(() => null)) as
    | { targetType?: 'post' | 'comment'; targetId?: string; reason?: string; details?: string }
    | null;

  const targetType = body?.targetType;
  const targetId = (body?.targetId ?? '').toString().trim();
  const reason = (body?.reason ?? '').toString().trim() as ReportReason;
  const details = (body?.details ?? '').toString().trim();

  if (!(targetType === 'post' || targetType === 'comment')) {
    return NextResponse.json({ success: false, error: 'Invalid targetType' }, { status: 400 });
  }
  if (!targetId) {
    return NextResponse.json({ success: false, error: 'Missing targetId' }, { status: 400 });
  }
  const allowedReasons: ReportReason[] = ['spam', 'abuse', 'misinformation', 'scam', 'copyright', 'other'];
  if (!allowedReasons.includes(reason)) {
    return NextResponse.json({ success: false, error: 'Invalid reason' }, { status: 400 });
  }

  const report = await CommunityReport.create({
    targetType,
    targetId,
    reason,
    details,
    reporterId: user ? user.id : null,
    reporterEmail: user ? user.email : '',
  }) as CommunityReportDoc;

  return NextResponse.json({ success: true, reportId: report._id.toString() });
}
