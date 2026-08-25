import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { GET_LISTING_TOOL_NAME, SEARCH_LISTINGS_TOOL_NAME } from '../../src/mcp/mcp.constants';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { createActivePropertyDirect, registerHostUser } from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';

describe('MCP (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ctx: TestAppContext = await createTestApp();
    app = ctx.app;
  });

  beforeEach(async () => {
    const prisma = app.get(PrismaService);
    await resetE2eDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('initializes over Streamable HTTP without auth', async () => {
    const response = await request(app.getHttpServer())
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'e2e', version: '1.0.0' },
        },
      })
      .expect(200);
    expect(response.headers['mcp-protocol-version']).toBe('2025-03-26');
    expect(response.body).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
      },
    });
    expect(response.body.success).toBeUndefined();
  });

  it('lists public listing tools', async () => {
    const response = await request(app.getHttpServer())
      .post('/mcp')
      .send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
      .expect(200);
    const names = (response.body.result.tools as Array<{ name: string }>).map((tool) => tool.name);
    expect(names).toEqual([SEARCH_LISTINGS_TOOL_NAME, GET_LISTING_TOOL_NAME]);
  });

  it('searches public listings and returns a website url', async () => {
    const host = await registerHostUser(app);
    const property = await createActivePropertyDirect(app, host);
    const response = await request(app.getHttpServer())
      .post('/mcp')
      .send({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: SEARCH_LISTINGS_TOOL_NAME,
          arguments: { q: 'E2E Favorites Apartment' },
        },
      })
      .expect(200);
    expect(response.body.result.isError).toBeUndefined();
    const text = response.body.result.content[0].text as string;
    expect(text).toContain(property.id);
    expect(text).toContain(`/en/property/${property.id}`);
  });

  it('returns listing detail for get_listing', async () => {
    const host = await registerHostUser(app);
    const property = await createActivePropertyDirect(app, host);
    const response = await request(app.getHttpServer())
      .post('/mcp')
      .send({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: GET_LISTING_TOOL_NAME,
          arguments: { id: property.id, locale: 'hy' },
        },
      })
      .expect(200);
    const text = response.body.result.content[0].text as string;
    expect(response.body.result.isError).toBeUndefined();
    expect(text).toContain(`/hy/property/${property.id}`);
    expect(text).toContain('Yerevan');
  });

  it('returns a tool error for unknown listing ids', async () => {
    const response = await request(app.getHttpServer())
      .post('/mcp')
      .send({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: GET_LISTING_TOOL_NAME, arguments: { id: 'missing-id' } },
      })
      .expect(200);
    expect(response.body.result.isError).toBe(true);
    expect(response.body.result.content[0].text).toMatch(/not found/i);
  });

  it('returns JSON-RPC method-not-found for unknown methods', async () => {
    const response = await request(app.getHttpServer())
      .post('/mcp')
      .send({ jsonrpc: '2.0', id: 6, method: 'prompts/list' })
      .expect(200);
    expect(response.body.error.code).toBe(-32601);
  });

  it('rejects GET in stateless mode', async () => {
    await request(app.getHttpServer()).get('/mcp').expect(405);
  });
});
