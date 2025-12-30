export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Uri Academy API',
    version: '0.1.0',
  },
  servers: [{ url: '/api' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'OK',
          },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register',
        requestBody: { required: true },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        phoneNumber: { type: 'string' },
                        role: { type: 'string' },
                        createdAt: { type: 'string' },
                      },
                    },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login',
        requestBody: { required: true },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh',
        requestBody: { required: true },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Logout',
        requestBody: { required: true },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/auth/password/reset/request': {
      post: {
        summary: 'Request password reset',
        requestBody: { required: true },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/auth/password/reset/confirm': {
      post: {
        summary: 'Confirm password reset',
        requestBody: { required: true },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/users/me': {
      get: {
        summary: 'Get me',
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        summary: 'Update me',
        requestBody: { required: true },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/users/me/password': {
      patch: {
        summary: 'Update password',
        requestBody: { required: true },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/users/me/notifications': {
      patch: {
        summary: 'Update notifications',
        requestBody: { required: true },
        responses: { '200': { description: 'OK' } },
      },
    },
  },
};
