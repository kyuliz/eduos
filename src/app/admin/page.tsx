import { Shell } from '@/components/shell';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import AdminClient from './admin-client';

export default async function AdminPage() {
  const session = await getSession();
  if (!session) return null;
  const schoolId = session.schoolId;
  const [school, years, divisions, grades, classes, teachers] = await Promise.all([
    db.school.findUnique({ where: { id: schoolId }, select: { name: true, schoolType: true } }),
    db.academicYear.findMany({ where: { schoolId }, include: { terms: { select: { name: true } } }, orderBy: { startsAt: 'desc' } }),
    db.division.findMany({ where: { schoolId }, orderBy: { sortOrder: 'asc' } }),
    db.grade.findMany({ where: { schoolId }, orderBy: { sortOrder: 'asc' } }),
    db.class.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
    db.user.findMany({ where: { schoolId, role: 'TEACHER', status: 'ACTIVE' }, select: { id: true, name: true, role: true } }),
  ]);
  const initialData = { school: school ?? { name: '', schoolType: '' }, years, divisions, grades, classes };
  return <Shell title="学校設定"><AdminClient initialData={initialData} initialTeachers={teachers as Array<{id:string;name:string;role:'TEACHER'}>} /></Shell>;
}
