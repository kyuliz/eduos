import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();
async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO !== 'true') throw new Error('Production seed requires explicit SEED_DEMO=true.');
  if (await db.school.count()) { console.log('A school is already present; seed skipped.'); return; }
  const schoolId = 'demo-school', yearId = 'academic-year-2026';
  const school = await db.school.create({ data: { id: schoolId, name: 'みらい学園', schoolType: '小中一貫校' } });
  const year = await db.academicYear.create({ data: { id: yearId, schoolId, name: '2026年度', startsAt: new Date('2026-04-01T00:00:00+09:00'), endsAt: new Date('2027-03-31T23:59:59+09:00'), isCurrent: true } });
  const division = await db.division.create({ data: { schoolId, name: '中学校', sortOrder: 1 } });
  const grade = await db.grade.create({ data: { schoolId, academicYearId: year.id, divisionId: division.id, name: '1年', sortOrder: 1 } });
  const admin = await db.user.create({ data: { id: 'demo-admin', schoolId, role: 'SCHOOL_ADMIN', loginId: 'admin', name: '学校管理者', passwordHash: await bcrypt.hash('ChangeMe2026!', 12) } });
  const teacher = await db.user.create({ data: { id: 'demo-teacher', schoolId, role: 'TEACHER', loginId: 'teacher', name: '佐藤先生', passwordHash: await bcrypt.hash('ChangeMe2026!', 12) } });
  const cls = await db.class.create({ data: { schoolId, academicYearId: year.id, gradeId: grade.id, name: 'A組', homeroomTeacherId: teacher.id } });
  await db.teachingAssignment.create({ data: { teacherId: teacher.id, classId: cls.id } });
  const student = await db.user.create({ data: { id: 'demo-student', schoolId, role: 'STUDENT', loginId: 'student', studentNumber: 'S-001', name: '山田 花', passwordHash: await bcrypt.hash('ChangeMe2026!', 12) } });
  await db.enrollment.create({ data: { schoolId, studentId: student.id, academicYearId: year.id, gradeId: grade.id, classId: cls.id, rollNumber: 1, startsAt: new Date('2026-04-01T00:00:00+09:00') } });
  console.log(`Seeded ${school.name} with demo accounts. Change passwords immediately; see README.`);
  console.log('Demo IDs:', admin.loginId, teacher.loginId, student.loginId);
}
main().finally(() => db.$disconnect());
