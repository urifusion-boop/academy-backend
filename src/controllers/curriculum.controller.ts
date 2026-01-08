import { type RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { createCurriculumItemSchema, updateCurriculumItemSchema } from '../validators/curriculum';
import { NotFoundError, ValidationError } from '../utils/errors';

export const getCurriculum: RequestHandler = async (req, res) => {
  const items = await prisma.curriculumItem.findMany({
    orderBy: [{ week: 'asc' }, { orderIndex: 'asc' }],
  });
  res.json(items);
};

export const createCurriculumItem: RequestHandler = async (req, res) => {
  const parsed = createCurriculumItemSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const item = await prisma.curriculumItem.create({
    data: parsed.data,
  });
  res.status(201).json(item);
};

export const updateCurriculumItem: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const parsed = updateCurriculumItemSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const existing = await prisma.curriculumItem.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Curriculum item not found');
  }
  const updated = await prisma.curriculumItem.update({
    where: { id },
    data: parsed.data,
  });
  res.json(updated);
};

export const deleteCurriculumItem: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.curriculumItem.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Curriculum item not found');
  }
  await prisma.curriculumItem.delete({ where: { id } });
  res.status(200).json({ ok: true });
};

export const seedCurriculum: RequestHandler = async (req, res) => {
  const data = [
    {
      id: 'phase-1-overview',
      week: 1,
      title: 'Phase 1: The Blueprint',
      description:
        'Theme: Sales, People & Money. Focus: Shift from graduate mindset to Revenue Engineer.',
      durationMinutes: 60,
      orderIndex: 0,
    },
    {
      id: 'w1-sales-psychology',
      week: 1,
      title: 'Sales Psychology Fundamentals',
      description: 'Why people buy and the cultural nuance for Western vs African markets.',
      durationMinutes: 90,
      orderIndex: 1,
    },
    {
      id: 'w1-icp-persona',
      week: 1,
      title: 'ICP & Persona Mapping',
      description: 'Identify who has budget and who has the pain; mapping ideal customer profiles.',
      durationMinutes: 90,
      orderIndex: 2,
    },
    {
      id: 'w1-lead-sourcing',
      week: 1,
      title: 'Lead Sourcing & Data Hygiene',
      description:
        'Build prioritized prospect lists using modern mining tools; maintain clean CRM.',
      durationMinutes: 90,
      orderIndex: 3,
    },
    {
      id: 'w1-cold-email',
      week: 1,
      title: 'Cold Email Copywriting',
      description: 'Write high-conversion scripts that bypass filters and get replies.',
      durationMinutes: 90,
      orderIndex: 4,
    },
    {
      id: 'phase-2-overview',
      week: 2,
      title: 'Phase 2: The Build',
      description:
        'Theme: Conversations, Systems & Tools. Focus: Transition from theory to active hunting.',
      durationMinutes: 60,
      orderIndex: 0,
    },
    {
      id: 'w2-crm-sequencing',
      week: 2,
      title: 'CRM Management & Sequencing',
      description:
        'Set up your digital cockpit: pipeline stages, automated sequencing, dashboard reporting.',
      durationMinutes: 90,
      orderIndex: 1,
    },
    {
      id: 'w2-discovery-framework',
      week: 2,
      title: 'The Discovery Framework',
      description:
        'Run calls that qualify opportunities effectively; structure discovery questions.',
      durationMinutes: 90,
      orderIndex: 2,
    },
    {
      id: 'w2-inbound-outbound',
      week: 2,
      title: 'Inbound vs Outbound',
      description: 'Manage lead flows and build multi-touch cadences to stay top-of-mind.',
      durationMinutes: 90,
      orderIndex: 3,
    },
    {
      id: 'w2-quota-challenge',
      week: 2,
      title: 'The Quota Challenge',
      description: 'Mock quota: use Uri tools to hunt leads and book simulated meetings.',
      durationMinutes: 90,
      orderIndex: 4,
    },
    {
      id: 'phase-3-overview',
      week: 3,
      title: 'Phase 3: Placement',
      description:
        'Theme: Closing, Capstone & Career Readiness. Focus: Finalize skills and secure the role.',
      durationMinutes: 60,
      orderIndex: 0,
    },
    {
      id: 'w3-capstone-campaign',
      week: 3,
      title: 'The Capstone Campaign',
      description: 'Execute a full outbound campaign; deliver a short demo pitch to stakeholders.',
      durationMinutes: 90,
      orderIndex: 1,
    },
    {
      id: 'w3-portfolio',
      week: 3,
      title: 'Portfolio Review & Polish',
      description:
        'Turn course data (emails, leads, meetings) into a visual proof-of-work portfolio.',
      durationMinutes: 90,
      orderIndex: 2,
    },
    {
      id: 'w3-interview-prep',
      week: 3,
      title: 'Interview Preparation',
      description: 'Intensive career coaching and roleplay tailored for tech sales interviews.',
      durationMinutes: 90,
      orderIndex: 3,
    },
    {
      id: 'w3-hiring-intro',
      week: 3,
      title: 'Hiring Partner Intro',
      description:
        'Top performers get direct introductions to partner organizations for placement.',
      durationMinutes: 60,
      orderIndex: 4,
    },
  ];

  for (const item of data) {
    await prisma.curriculumItem.upsert({
      where: { id: item.id },
      update: {
        week: item.week,
        title: item.title,
        description: item.description,
        durationMinutes: item.durationMinutes,
        orderIndex: item.orderIndex,
      },
      create: item,
    });
  }

  res.json({ seeded: data.length });
};
