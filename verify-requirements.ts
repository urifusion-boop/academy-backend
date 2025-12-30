import request from 'supertest';
import app from './src/app';
import { prisma } from './src/lib/prisma';

async function verifyRequirements() {
  const timestamp = Date.now();
  const studentEmail = `student_req_${timestamp}@test.com`;
  const password = 'Password123!';
  const cohortName = `Cohort Req ${timestamp}`;

  // 1. Create Cohort
  const cohort = await prisma.cohort.create({
    data: {
      name: cohortName,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 30),
      status: 'ACTIVE',
    },
  });

  // 2. Register Student
  const studentReg = await request(app).post('/api/auth/register').send({
    email: studentEmail,
    password,
    name: 'Req Student',
    role: 'STUDENT',
  });
  const studentToken = studentReg.body.accessToken;
  const studentId = studentReg.body.user.id;

  // 3. Assign Student to Cohort (Simulating Admin Update)
  await prisma.studentProfile.update({
    where: { userId: studentId },
    data: { cohortId: cohort.id },
  });

  // 4. Create Assignment for Cohort
  const assignment = await prisma.assignment.create({
    data: {
      title: 'Req Assignment',
      description: 'Desc',
      dueAt: new Date(),
      maxScore: 100,
      cohortId: cohort.id,
    },
  });

  // 5. Create Submission
  await prisma.submission.create({
    data: {
      assignmentId: assignment.id,
      studentId: (await prisma.studentProfile.findUnique({ where: { userId: studentId } }))!.id,
      status: 'PENDING',
      contentURL: 'http://test.com',
    },
  });

  console.log('--- STARTING VERIFICATION ---');

  // A. Curriculum
  console.log('A. Checking Curriculum...');
  const currRes = await request(app)
    .get('/api/curriculum')
    .set('Authorization', `Bearer ${studentToken}`);
  if (currRes.status === 200 && Array.isArray(currRes.body) && currRes.body[0].id) {
    console.log('SUCCESS: Curriculum returned with IDs.');
  } else {
    console.error('FAILURE: Curriculum check failed:', currRes.body);
  }

  // B. Assignments
  console.log('B. Checking Assignments...');
  const assignRes = await request(app)
    .get('/api/assignments')
    .set('Authorization', `Bearer ${studentToken}`);
  if (
    assignRes.status === 200 &&
    assignRes.body.data.length > 0 &&
    assignRes.body.data[0].cohortId === cohort.id
  ) {
    console.log('SUCCESS: Assignments returned and filtered by cohort.');
  } else {
    console.error('FAILURE: Assignments check failed:', assignRes.body);
  }

  // C. Submissions
  console.log('C. Checking Submissions...');
  const subRes = await request(app)
    .get('/api/assignments/submissions')
    .set('Authorization', `Bearer ${studentToken}`);
  if (subRes.status === 200 && subRes.body.data.length > 0) {
    console.log('SUCCESS: Submissions returned.');
  } else {
    console.error('FAILURE: Submissions check failed:', subRes.body);
  }

  // D. User Profile
  console.log('D. Checking User Profile...');
  const meRes = await request(app)
    .get('/api/users/me')
    .set('Authorization', `Bearer ${studentToken}`);
  if (meRes.status === 200 && meRes.body.profile && meRes.body.profile.cohortId === cohort.id) {
    console.log('SUCCESS: User profile includes cohortId.');
  } else {
    console.error('FAILURE: User profile check failed:', meRes.body);
  }

  // Cleanup
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.cohort.delete({ where: { id: cohort.id } });
  await prisma.user.delete({ where: { email: studentEmail } });
}

verifyRequirements().catch(console.error);
