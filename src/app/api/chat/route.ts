import { NextRequest, NextResponse } from 'next/server';

interface JGrantsSubsidy {
  id: string;
  title: string;
  subsidy_max_limit?: number;
  acceptance_end_datetime?: string;
  deadline_status?: string;
  target_area_search?: string;
  target_industry?: string;
  detail?: string;
}

interface JGrantsSearchResponse {
  results: JGrantsSubsidy[];
  total_count: number;
  page: number;
  limit: number;
}

interface JGrantsDetailResponse {
  id: string;
  title: string;
  detail: string;
  subsidy_max_limit?: number;
  subsidy_rate?: string;
  acceptance_start_datetime?: string;
  acceptance_end_datetime?: string;
  deadline_status?: string;
  target_area_search?: string;
  target_industry?: string;
  target_number_of_employees?: string;
  inquiry_url?: string;
  update_datetime?: string;
  files?: {
    application_guidelines?: string[];
    outline_of_grant?: string[];
    application_form?: string[];
  };
  save_directory?: string;
}

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8000';

async function callMCPTool(toolName: string, args: Record<string, any>): Promise<any> {
  try {
    console.log(`[MCP] Calling tool: ${toolName}`);
    console.log(`[MCP] MCP_SERVER_URL: ${MCP_SERVER_URL}`);
    console.log(`[MCP] Arguments:`, args);

    const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
        id: Date.now(),
      }),
    });

    if (!response.ok) {
      console.error(`[MCP] Server error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[MCP] Error response:`, errorText);
      throw new Error(`MCP server error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[MCP] Response:`, data);
    return data.result?.content?.[0]?.text ? JSON.parse(data.result.content[0].text) : data.result;
  } catch (error) {
    console.error('[MCP] Call error:', error);
    throw error;
  }
}

function analyzeIntent(message: string): { intent: string; params: Record<string, any> } {
  const lowerMessage = message.toLowerCase();

  // キーワード抽出
  const keywords = {
    location: ['東京', '大阪', '神奈川', '愛知', '福岡', '北海道', '全国'],
    industry: ['製造業', 'IT', 'DX', 'デジタル', 'スタートアップ', '小売', 'サービス'],
    amount: /(\d+)万円/,
    deadline: ['今月', '来月', '3ヶ月', '締切', '期限'],
  };

  // 意図の判定
  if (lowerMessage.includes('最新') || lowerMessage.includes('新しい')) {
    return {
      intent: 'search_latest',
      params: {
        keyword: '事業',
        sort: 'created',
        order: 'desc',
        acceptance: 1,
        limit: 10,
      },
    };
  }

  if (lowerMessage.includes('詳細') || lowerMessage.includes('教えて')) {
    // IDが含まれているか確認
    const idMatch = message.match(/[a-zA-Z0-9]{18}/);
    if (idMatch) {
      return {
        intent: 'get_detail',
        params: {
          subsidy_id: idMatch[0],
        },
      };
    }
  }

  if (lowerMessage.includes('統計') || lowerMessage.includes('全体')) {
    return {
      intent: 'get_statistics',
      params: {
        keyword: '事業',
        acceptance: 1,
        output_format: 'summary',
      },
    };
  }

  // 通常の検索
  let keyword = '事業';

  // 業種キーワードの抽出
  for (const ind of keywords.industry) {
    if (lowerMessage.includes(ind.toLowerCase())) {
      keyword = ind;
      break;
    }
  }

  // 地域の抽出
  let hasLocation = false;
  for (const loc of keywords.location) {
    if (lowerMessage.includes(loc)) {
      hasLocation = true;
      break;
    }
  }

  return {
    intent: 'search',
    params: {
      keyword,
      sort: 'acceptance_end',
      order: 'asc',
      acceptance: 1,
      limit: 15,
    },
  };
}

function formatSearchResults(data: JGrantsSearchResponse): string {
  if (!data.results || data.results.length === 0) {
    return '申し訳ございません。該当する補助金が見つかりませんでした。別のキーワードでお試しください。';
  }

  let response = `${data.total_count}件の補助金が見つかりました。主な補助金をご紹介します：\n\n`;

  data.results.slice(0, 5).forEach((subsidy, index) => {
    response += `【${index + 1}】${subsidy.title}\n`;

    if (subsidy.subsidy_max_limit) {
      response += `💰 補助上限額: ${(subsidy.subsidy_max_limit / 10000).toLocaleString()}万円\n`;
    }

    if (subsidy.deadline_status) {
      const statusEmoji = subsidy.deadline_status === '期限間近' ? '⚠️' : '📅';
      response += `${statusEmoji} 受付状況: ${subsidy.deadline_status}\n`;
    }

    if (subsidy.acceptance_end_datetime) {
      const endDate = new Date(subsidy.acceptance_end_datetime);
      response += `📆 締切: ${endDate.toLocaleDateString('ja-JP')}\n`;
    }

    if (subsidy.target_area_search) {
      response += `🌍 対象地域: ${subsidy.target_area_search}\n`;
    }

    if (subsidy.target_industry) {
      response += `🏢 対象業種: ${subsidy.target_industry}\n`;
    }

    if (subsidy.detail) {
      response += `📝 概要: ${subsidy.detail}\n`;
    }

    response += `🔗 ID: ${subsidy.id}\n\n`;
  });

  if (data.total_count > 5) {
    response += `他にも${data.total_count - 5}件の補助金があります。\n`;
    response += `詳細を知りたい場合は、補助金のIDを教えてください。`;
  }

  return response;
}

function formatDetailResult(data: JGrantsDetailResponse): string {
  let response = `【${data.title}】の詳細情報\n\n`;

  response += `📝 概要:\n${data.detail}\n\n`;

  if (data.subsidy_max_limit) {
    response += `💰 補助上限額: ${(data.subsidy_max_limit / 10000).toLocaleString()}万円\n`;
  }

  if (data.subsidy_rate) {
    response += `📊 補助率: ${data.subsidy_rate}\n`;
  }

  if (data.acceptance_start_datetime && data.acceptance_end_datetime) {
    const startDate = new Date(data.acceptance_start_datetime);
    const endDate = new Date(data.acceptance_end_datetime);
    response += `📅 受付期間: ${startDate.toLocaleDateString('ja-JP')} 〜 ${endDate.toLocaleDateString('ja-JP')}\n`;
  }

  if (data.deadline_status) {
    response += `⏰ 受付状況: ${data.deadline_status}\n`;
  }

  if (data.target_area_search) {
    response += `🌍 対象地域: ${data.target_area_search}\n`;
  }

  if (data.target_industry) {
    response += `🏢 対象業種: ${data.target_industry}\n`;
  }

  if (data.target_number_of_employees) {
    response += `👥 対象企業規模: ${data.target_number_of_employees}\n`;
  }

  if (data.inquiry_url) {
    response += `\n🔗 詳細URL: ${data.inquiry_url}\n`;
  }

  if (data.files) {
    response += `\n📎 添付ファイル:\n`;
    if (data.files.application_guidelines && data.files.application_guidelines.length > 0) {
      response += `  - 公募要領: ${data.files.application_guidelines.length}件\n`;
    }
    if (data.files.outline_of_grant && data.files.outline_of_grant.length > 0) {
      response += `  - 概要資料: ${data.files.outline_of_grant.length}件\n`;
    }
    if (data.files.application_form && data.files.application_form.length > 0) {
      response += `  - 申請様式: ${data.files.application_form.length}件\n`;
    }
  }

  response += `\n※ 最新情報は公式サイトでご確認ください。`;

  return response;
}

function formatStatisticsResult(data: any): string {
  let response = `📊 補助金統計情報\n\n`;

  response += `📈 総件数: ${data.total_count}件（サンプル: ${data.sampled_count}件）\n\n`;

  if (data.deadline_distribution) {
    response += `📅 締切月別分布:\n`;
    Object.entries(data.deadline_distribution)
      .slice(0, 5)
      .forEach(([month, count]) => {
        response += `  ${month}: ${count}件\n`;
      });
    response += `\n`;
  }

  if (data.amount_distribution) {
    response += `💰 補助金額分布:\n`;
    Object.entries(data.amount_distribution).forEach(([range, count]) => {
      response += `  ${range}: ${count}件\n`;
    });
    response += `\n`;
  }

  if (data.area_distribution) {
    response += `🌍 地域別分布（上位5件）:\n`;
    Object.entries(data.area_distribution)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .forEach(([area, count]) => {
        response += `  ${area}: ${count}件\n`;
      });
  }

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージが必要です' },
        { status: 400 }
      );
    }

    // 意図を分析
    const { intent, params } = analyzeIntent(message);

    // MCPサーバーを呼び出し
    let mcpResponse;
    let formattedResponse;

    switch (intent) {
      case 'search_latest':
      case 'search':
        mcpResponse = await callMCPTool('search_subsidies', params);
        formattedResponse = formatSearchResults(mcpResponse);
        break;

      case 'get_detail':
        mcpResponse = await callMCPTool('get_subsidy_detail', params);
        formattedResponse = formatDetailResult(mcpResponse);
        break;

      case 'get_statistics':
        mcpResponse = await callMCPTool('get_subsidy_statistics', params);
        formattedResponse = formatStatisticsResult(mcpResponse);
        break;

      default:
        mcpResponse = await callMCPTool('search_subsidies', params);
        formattedResponse = formatSearchResults(mcpResponse);
    }

    return NextResponse.json({
      response: formattedResponse,
      raw: mcpResponse,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: 'サーバーエラーが発生しました',
        response: '申し訳ございません。エラーが発生しました。MCPサーバーが起動しているか確認してください。',
      },
      { status: 500 }
    );
  }
}
