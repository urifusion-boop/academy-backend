import { api } from './setup';

import jwt from 'jsonwebtoken';

describe('users', () => {
  it('gets current user', async () => {
    const token = jwt.sign({ sub: 'u1', role: 'STUDENT' }, 'testaccess');
    const res = await api().get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.studentProfile).toBeDefined();
    expect(res.body.notificationPref).toBeDefined();
  });
});
