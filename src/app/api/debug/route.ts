import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const mcpUrl = process.env.MCP_SERVER_URL;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    hasOpenAIKey: !!openaiKey,
    openaiKeyPreview: openaiKey ? `${openaiKey.substring(0, 10)}...` : 'NOT SET',
    mcpServerUrl: mcpUrl,
    environment: process.env.NODE_ENV,
    message: 'Debug endpoint for checking environment variables',
  });
}
