import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const apiDoc = {
  openapi: '3.0.0',
  info: {
    title: 'ias-pv API',
    version: '0.1.0',
    description: 'IPTV Recording Engine — channel management, probe, and recording API',
  },
  servers: [{ url: '/api' }],
  paths: {
    '/channels': {
      get: { summary: 'List all channels', tags: ['Channels'], responses: { '200': { description: 'Array of channels' } } },
      post: {
        summary: 'Create a channel', tags: ['Channels'],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateChannelInput' } } } },
        responses: { '201': { description: 'Created channel' }, '400': { description: 'Validation error' } },
      },
    },
    '/channels/{id}': {
      get: { summary: 'Get channel by ID', tags: ['Channels'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Channel object' }, '404': { description: 'Not found' } } },
      put: { summary: 'Update a channel', tags: ['Channels'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated channel' }, '404': { description: 'Not found' } } },
      delete: { summary: 'Delete a channel', tags: ['Channels'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } } },
    },
    '/channels/{id}/probe': {
      post: { summary: 'Probe channel health', tags: ['Channels'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '202': { description: 'Probe job enqueued' } } },
    },
    '/recordings': {
      get: { summary: 'List all recordings', tags: ['Recordings'], responses: { '200': { description: 'Array of recordings' } } },
      post: {
        summary: 'Schedule a recording', tags: ['Recordings'],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateRecordingInput' } } } },
        responses: { '201': { description: 'Created recording' }, '400': { description: 'Validation error' } },
      },
    },
    '/recordings/{id}': {
      get: { summary: 'Get recording by ID', tags: ['Recordings'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Recording object' }, '404': { description: 'Not found' } } },
      delete: { summary: 'Cancel a recording', tags: ['Recordings'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Cancelled' }, '404': { description: 'Not found' } } },
    },
    '/health': {
      get: { summary: 'System health status', tags: ['System'], responses: { '200': { description: 'Health status' } } },
    },
  },
  components: {
    schemas: {
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
