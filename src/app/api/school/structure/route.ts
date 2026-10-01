import { NextResponse } from 'next/server';
import { z } from 'zod';
import { audit } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireRole, safeEqualOrigin } from '@/lib/guards';

export async function GET() {
  const auth = await requireRole(['SCHOOL_ADMIN', 'TEACHER']);
  if (auth.error) return auth.error;
  const schoolId = auth.session!.schoolId;
  const [school, years, divisions, grades, classes] = await Promise.all([
    db.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true, schoolType: true } }),
    db.academicYear.findMany({ where: { schoolId }, include: { terms: true }, orderBy: { startsAt: 'desc' } }),
    db.division.findMany({ where: { schoolId }, orderBy: { sortOrder: 'asc' } }),
    db.grade.findMany({ where: { schoolId }, orderBy: { sortOrder: 'asc' } }),
    db.class.findMany({ where: { schoolId }, include: { grade: true, enrollments: { where: { academicYear: { isCurrent: true } }, select: { studentId: true } } }, orderBy: { name: 'asc' } }),
  ]);
  return NextResponse.json({ school, years, divisions, grades, classes });
}

const schema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('school'), name: z.string().trim().min(1).max(120), schoolType: z.string().trim().min(1).max(80) }),
  z.object({ kind: z.literal('year'), name: z.string().trim().min(1).max(40), startsAt: z.coerce.date(), endsAt: z.coerce.date(), isCurrent: z.boolean().default(false) }),
  z.object({ kind: z.literal('term'), academicYearId: z.string(), name: z.string().trim().min(1).max(40), startsAt: z.coerce.date(), endsAt: z.coerce.date() }),
  z.object({ kind: z.literal('division'), name: z.string().trim().min(1).max(80), sortOrder: z.number().int().default(0) }),
  z.object({ kind: z.literal('grade'), academicYearId: z.string(), divisionId: z.string().optional(), name: z.string().trim().min(1).max(60), sortOrder: z.number().int().default(0) }),
  z.object({ kind: z.literal('class'), academicYearId: z.string(), gradeId: z.string(), name: z.string().trim().min(1).max(60), homeroomTeacherId: z.string().optional() }),
]);

export async function POST(request: Request) {
  if (!safeEqualOrigin(request)) return NextResponse.json({ error: 'リクエストを確認できません。' }, { status: 403 });
  const auth = await requireRole(['SCHOOL_ADMIN']);
  if (auth.error) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '入力内容を確認してください。' }, { status: 400 });
  const schoolId = auth.session!.schoolId, input = parsed.data;
  let id = '';
  try {
    if (input.kind === 'school') { const row = await db.school.update({ where: { id: schoolId }, data: { name: input.name, schoolType: input.schoolType } }); id = row.id; }
    if (input.kind === 'year') {
      if (input.isCurrent) await db.academicYear.updateMany({ where: { schoolId }, data: { isCurrent: false } });
      const row = await db.academicYear.create({ data: { ...input, schoolId } }); id = row.id;
    }
    if (input.kind === 'term') {
      const parent = await db.academicYear.findFirst({ where: { id: input.academicYearId, schoolId } });
      if (!parent) return NextResponse.json({ error: '年度が見つかりません。' }, { status: 404 });
      const row = await db.term.create({ data: { ...input, academicYearId: parent.id } }); id = row.id;
    }
    if (input.kind === 'division') { const row = await db.division.create({ data: { ...input, schoolId } }); id = row.id; }
    if (input.kind === 'grade') {
      const year = await db.academicYear.findFirst({ where: { id: input.academicYearId, schoolId } });
      if (!year) return NextResponse.json({ error: '年度が見つかりません。' }, { status: 404 });
      if (input.divisionId && !(await db.division.findFirst({ where: { id: input.divisionId, schoolId } }))) return NextResponse.json({ error: '教育段階が見つかりません。' }, { status: 404 });
      const row = await db.grade.create({ data: { ...input, schoolId } }); id = row.id;
    }
    if (input.kind === 'class') {
      const [year, grade] = await Promise.all([db.academicYear.findFirst({ where: { id: input.academicYearId, schoolId } }), db.grade.findFirst({ where: { id: input.gradeId, schoolId, academicYearId: input.academicYearId } })]);
      if (!year || !grade) return NextResponse.json({ error: '年度または学年が見つかりません。' }, { status: 404 });
      if (input.homeroomTeacherId && !(await db.user.findFirst({ where: { id: input.homeroomTeacherId, schoolId, role: 'TEACHER', status: 'ACTIVE' } }))) return NextResponse.json({ error: '担任の教師アカウントが見つかりません。' }, { status: 404 });
      const row = await db.class.create({ data: { ...input, schoolId } }); id = row.id;
    }
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return NextResponse.json({ error: '同じ名前の項目が既に登録されています。' }, { status: 409 });
    throw error;
  }
  await audit(auth.session!.userId, schoolId, `school.structure.${input.kind}.create`, input.kind, id);
  return NextResponse.json({ id }, { status: 201 });
}
