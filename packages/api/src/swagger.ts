import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const apiDoc = {
  openapi: '3.0.0',
  info: {
    title: 'ias-pv API',
    version: '0.1.0',
    description: 'IPTV Recording Engine — channel management, probe, recording, and auth API',
  },
  servers: [{ url: '/api' }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Login with username and password', tags: ['Auth'],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } } },
        responses: { '200': { description: 'JWT token + user object' }, '400': { description: 'Missing body' }, '401': { description: 'Invalid credentials' } },
      },
    },
    '/auth/users': {
      get: {
        summary: 'List all users (admin only)', tags: ['Auth', 'Admin'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Array of users' }, '401': { description: 'Unauthorized' }, '403': { description: 'Admin access required' } },
      },
      post: {
        summary: 'Create a new user (admin only)', tags: ['Auth', 'Admin'],
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserInput' } } } },
        responses: { '201': { description: 'Created user' }, '400': { description: 'Validation error' }, '403': { description: 'Admin access required' } },
      },
    },
    '/auth/users/{id}': {
      delete: {
        summary: 'Delete a user (admin only)', tags: ['Auth', 'Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Deleted' }, '400': { description: 'Cannot delete own account' }, '403': { description: 'Admin access required' }, '404': { description: 'Not found' } },
      },
    },
    '/channels': {
      get: { summary: 'List all channels', tags: ['Channels'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Array of channels' }, '401': { description: 'Unauthorized' } } },
      post: {
        summary: 'Create a channel (admin only)', tags: ['Channels'],
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateChannelInput' } } } },
        responses: { '201': { description: 'Created channel' }, '400': { description: 'Validation error' }, '403': { description: 'Admin access required' } },
      },
    },
    '/channels/{id}': {
      get: { summary: 'Get channel by ID', tags: ['Channels'], security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Channel object' }, '401': { description: 'Unauthorized' }, '404': { description: 'Not found' } } },
      put: { summary: 'Update a channel (admin only)', tags: ['Channels'], security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated channel' }, '403': { description: 'Admin access required' }, '404': { description: 'Not found' } } },
      delete: { summary: 'Delete a channel (admin only)', tags: ['Channels'], security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deleted' }, '403': { description: 'Admin access required' }, '404': { description: 'Not found' } } },
    },
    '/channels/{id}/probe': {
      post: { summary: 'Probe channel health (admin only)', tags: ['Channels'], security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '202': { description: 'Probe job enqueued' }, '403': { description: 'Admin access required' } } },
    },
    '/recordings': {
      get: { summary: 'List all recordings', tags: ['Recordings'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Array of recordings' }, '401': { description: 'Unauthorized' } } },
      post: {
        summary: 'Schedule a recording (admin only)', tags: ['Recordings'],
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateRecordingInput' } } } },
        responses: { '201': { description: 'Created recording' }, '400': { description: 'Validation error' }, '403': { description: 'Admin access required' } },
      },
    },
    '/recordings/{id}': {
      get: { summary: 'Get recording by ID', tags: ['Recordings'], security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Recording object' }, '404': { description: 'Not found' } } },
      delete: { summary: 'Cancel a recording (admin only)', tags: ['Recordings'], security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Cancelled' }, '403': { description: 'Admin access required' }, '404': { description: 'Not found' } } },
    },
    '/health': {
      get: { summary: 'System health status', tags: ['System'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Health status' }, '401': { description: 'Unauthorized' } } },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      LoginInput: {
        type: 'object', required: ['username', 'password'],
        properties: { username: { type: 'string' }, password: { type: 'string' } },
      },
      CreateUserInput: {
        type: 'object', required: ['username', 'password'],
        properties: { username: { type: 'string' }, password: { type: 'string' }, role: { type: 'string', enum: ['admin', 'user'] } },
      },
      CreateChannelInput: {
        type: 'object', required: ['name', 'url', 'group'],
        properties: { name: { type: 'string' }, url: { type: 'string' }, group: { type: 'string' } },
      },
      CreateRecordingInput: {
        type: 'object', required: ['channelId', 'cronExpression', 'duration'],
        properties: { channelId: { type: 'string' }, cronExpression: { type: 'string' }, duration: { type: 'integer' }, maxRetries: { type: 'integer' } },
      },
    },
  },
};

export function createSwaggerRouter(): Router {
  const router = Router();
  router.use(swaggerUi.serve);
  router.get('/', swaggerUi.setup(apiDoc));
  return router;
}
