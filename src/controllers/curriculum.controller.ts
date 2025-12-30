import { type RequestHandler } from 'express';

// Mock data structure based on requirements
// In a real app, this would likely come from a database model
const curriculumData = [
  {
    id: 'week-1',
    week: 1,
    title: 'Introduction to Sales',
    topics: ['Mindset', 'Sales Process Overview', 'Tools of the Trade'],
    durationMinutes: 120,
  },
  {
    id: 'week-2',
    week: 2,
    title: 'Prospecting & Lead Gen',
    topics: ['Cold Calling', 'Email Outreach', 'Social Selling'],
    durationMinutes: 180,
  },
  {
    id: 'week-3',
    week: 3,
    title: 'Discovery & Qualification',
    topics: ['Asking Great Questions', 'Active Listening', 'BANT Framework'],
    durationMinutes: 150,
  },
  {
    id: 'week-4',
    week: 4,
    title: 'Presentation & Demo',
    topics: ['Storytelling', 'Tailoring the Pitch', 'Handling Objections'],
    durationMinutes: 180,
  },
  {
    id: 'week-5',
    week: 5,
    title: 'Closing & Negotiation',
    topics: ['Closing Techniques', 'Negotiation Strategies', 'Contract Basics'],
    durationMinutes: 120,
  },
  {
    id: 'week-6',
    week: 6,
    title: 'Post-Sale & Relationship Management',
    topics: ['Onboarding Handoff', 'Customer Success', 'Referrals'],
    durationMinutes: 90,
  },
];

export const getCurriculum: RequestHandler = async (req, res) => {
  // In the future, we might filter this by cohort or track progress
  res.json(curriculumData);
};
