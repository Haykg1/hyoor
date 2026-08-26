import { Controller, Get, Header, Options, Post, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { SkipTransform } from '../common/decorators/skip-transform.decorator';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { MCP_THROTTLE } from '../common/throttle/throttle.constants';

import { McpProtocolService } from './mcp-protocol.service';
import { MCP_DEFAULT_PROTOCOL_VERSION, MCP_PROTOCOL_HEADER } from './mcp.constants';

@ApiTags('mcp')
@SkipTransform()
@Controller('mcp')
@Throttle(MCP_THROTTLE)
export class McpController {
  constructor(private readonly protocol: McpProtocolService) {}

  @Post()
  @ApiOperation({
    summary: 'MCP Streamable HTTP endpoint for ChatGPT, Claude, and other AI assistants',
  })
  @ApiOkResponse({ description: 'JSON-RPC response' })
  @ApiStandardErrors({ auth: false, throttle: true })
  async handlePost(@Req() req: Request, @Res() res: Response): Promise<void> {
    const headerValue = req.header(MCP_PROTOCOL_HEADER);
    const result = await this.protocol.handleMessage(
      req.body,
      typeof headerValue === 'string' ? headerValue : undefined,
    );
    this.applyMcpHeaders(res, result.protocolVersion);
    if (result.body === undefined) {
      res.status(result.status).end();
      return;
    }
    res.status(result.status).json(result.body);
  }

  @Get()
  @ApiOperation({ summary: 'MCP uses POST; GET is not supported in stateless mode' })
  @ApiStandardErrors({ auth: false })
  handleGet(@Res() res: Response): void {
    this.applyMcpHeaders(res, MCP_DEFAULT_PROTOCOL_VERSION);
    res.status(405).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Method Not Allowed. Use POST JSON-RPC on this URL.' },
    });
  }

  @Options()
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  @Header('Access-Control-Allow-Headers', 'Content-Type, Accept, MCP-Protocol-Version')
  handleOptions(@Res() res: Response): void {
    res.status(204).end();
  }

  private applyMcpHeaders(res: Response, protocolVersion: string): void {
    res.setHeader(MCP_PROTOCOL_HEADER, protocolVersion);
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}
