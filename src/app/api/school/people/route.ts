import { NextResponse } from 'next/server';
import { z } from 'zod';
import { audit, bcrypt } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireRole, safeEqualOrigin } from '@/lib/guards';

export async function GET(request: Request) {
  const auth = await requireRole(['SCHOOL_ADMIN', 'TEACHER']);
  if (auth.error) return auth.error;
  const url = new URL(request.url), role = url.searchParams.get('role'), schoolId = auth.session!.schoolId;
  if (auth.session!.user.role === 'TEACHER' && role !== 'STUDENT') return NextResponse.json({ error: '教師は担当生徒のみ閲覧できます。' }, { status: 403 });
  const validRole = role === 'STUDENT' || role === 'TEACHER' ? role : undefined;
  let users = await db.user.findMany({ where: { schoolId, ...(validRole ? { role: validRole } : {}), status: 'ACTIVE' }, select: { id: true, name: true, loginId: true, role: true, studentNumber: true, enrollments: { where: { academicYear: { isCurrent: true } }, include: { grade: true, class: true, academicYear: true } } }, orderBy: [{ role: 'asc' }, { name: 'asc' }] });
  if (auth.session!.user.role === 'TEACHER') {
    const assigned = await db.teachingAssignment.findMany({ where: { teacherId: auth.session!.userId }, select: { classId: true } });
    const allowed = new Set(assigned.map(x => x.classId));
    const homeroom = await db.class.findMany({ where: { homeroomTeacherId: auth.session!.userId }, select: { id: true } }); homeroom.forEach(x => allowed.add(x.id));
    users = users.filter(x => x.enrollments.some(e => allowed.has(e.classId)));
  }
  return NextResponse.json({ users });
}

const schema = z.object({ role: z.enum(['STUDENT', 'TEACHER']), loginId: z.string().trim().min(2).max(120), name: z.string().trim().min(1).max(100), password: z.string().min(12).max(200), studentNumber: z.string().trim().max(40).optional(), enrollment: z.object({ academicYearId: z.string(), gradeId: z.string(), classId: z.string(), rollNumber: z.number().int().positive().optional() }).optional() });
export async function POST(request: Request) {
  if (!safeEqualOrigin(request)) return NextResponse.json({ error: 'リクエストを確認できません。' }, { status: 403 });
  const auth = await requireRole(['SCHOOL_ADMIN']);
  if (auth.error) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '入力内容を確認してください。パスワードは12文字以上必要です。' }, { status: 400 });
  const { role, loginId, name, password, studentNumber, enrollment } = parsed.data, schoolId = auth.session!.schoolId;
  if (role === 'STUDENT' && !enrollment) return NextResponse.json({ error: '生徒には年度・学年・クラスの所属情報が必要です。' }, { status: 400 });
  if (role === 'TEACHER' && enrollment) return NextResponse.json({ error: '教師には生徒の所属情報を設定できません。' }, { status: 400 });
  if (enrollment) {
    const [year, grade, cls] = await Promise.all([
      db.academicYear.findFirst({ where: { id: enrollment.academicYearId, schoolId } }),
      db.grade.findFirst({ where: { id: enrollment.gradeId, schoolId, academicYearId: enrollment.academicYearId } }),
      db.class.findFirst({ where: { id: enrollment.classId, schoolId, academicYearId: enrollment.academicYearId, gradeId: enrollment.gradeId } }),
    ]);
    if (!year || !grade || !cls) return NextResponse.json({ error: '年度・学年・クラスの組み合わせを確認してください。' }, { status: 400 });
  }
  try {
    const user = await db.$transaction(async tx => {
      const created = await tx.user.create({ data: { schoolId, role, loginId, name, studentNumber: role === 'STUDENT' ? studentNumber || null : null, passwordHash: await bcrypt.hash(password, 12) } });
      if (enrollment) await tx.enrollment.create({ data: { ...enrollment, studentId: created.id, schoolId, startsAt: new Date() } });
      return created;
    });
    await audit(auth.session!.userId, schoolId, `school.${role.toLowerCase()}.create`, 'User', user.id);
    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'ログインIDまたは生徒IDは既に使用されています。' }, { status: 409 });
    throw error;
  }
}
