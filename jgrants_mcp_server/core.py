"""
Jグランツ補助金検索MCPサーバー
FastMCPを使用したJグランツ公開API のMCPサーバー実装
"""

import asyncio
import base64
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

import httpx
from fastmcp import FastMCP

# 定数定義
API_BASE_URL = "https://api.jgrants-portal.go.jp/exp/v1/public"
FILES_DIR = Path(os.getenv("JGRANTS_FILES_DIR", "./jgrants_files"))
FILES_DIR.mkdir(parents=True, exist_ok=True)

# FastMCP インスタンス生成
mcp = FastMCP("Jグランツ補助金検索")

# HTTPクライアントのシングルトン
_client: Optional[httpx.AsyncClient] = None


def _http_client() -> httpx.AsyncClient:
    """HTTPクライアントのシングルトンインスタンスを取得"""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


async def _get_json(url: str, params: Optional[Dict] = None, retries: int = 3) -> Dict[str, Any]:
    """JグランツAPIへのGETリクエストを実行"""
    client = _http_client()
    for attempt in range(retries):
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            if attempt == retries - 1:
                return {"error": f"API呼び出しエラー: {str(e)}"}
            await asyncio.sleep(1)
    return {"error": "予期しないエラー"}


def _parse_int(value: Any) -> Optional[int]:
    """文字列や数値を安全に整数変換"""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _deadline_status(end_datetime: Optional[str]) -> str:
    """締切日時から受付状態を判定"""
    if not end_datetime:
        return "不明"
    try:
        end = datetime.fromisoformat(end_datetime.replace("Z", "+00:00"))
        now = datetime.now(end.tzinfo)
        if now > end:
            return "終了"
        days_left = (end - now).days
        if days_left <= 7:
            return "期限間近"
        return "受付中"
    except Exception:
        return "不明"


def _sanitize_name(filename: str) -> str:
    """ファイル名から危険な文字を除去"""
    return re.sub(r'[^\w\-\.]', '_', filename)


def _save_files(subsidy_id: str, file_categories: Dict[str, List[Dict]]) -> Dict[str, List[str]]:
    """BASE64添付ファイルをデコードして保存"""
    save_dir = FILES_DIR / subsidy_id
    save_dir.mkdir(parents=True, exist_ok=True)

    result = {}
    for category, files in file_categories.items():
        saved_files = []
        for file_data in files:
            try:
                name = _sanitize_name(file_data.get("name", "unknown"))
                data = file_data.get("data", "")

                # BASE64デコード
                file_bytes = base64.b64decode(data)
                file_path = save_dir / name

                with open(file_path, "wb") as f:
                    f.write(file_bytes)

                saved_files.append(f"file://{file_path}")
            except Exception as e:
                saved_files.append(f"エラー: {str(e)}")

        result[category] = saved_files

    return result


def _compact_detail(result: Dict, subsidy_id: str) -> Dict[str, Any]:
    """API詳細レスポンスをLLMに適した形式に整形"""
    return {
        "id": result.get("id", subsidy_id),
        "title": result.get("title", ""),
        "detail": result.get("detail", ""),
        "subsidy_max_limit": _parse_int(result.get("subsidy_max_limit")),
        "subsidy_rate": result.get("subsidy_rate", ""),
        "acceptance_start_datetime": result.get("acceptance_start_datetime", ""),
        "acceptance_end_datetime": result.get("acceptance_end_datetime", ""),
        "deadline_status": _deadline_status(result.get("acceptance_end_datetime")),
        "target_area_search": result.get("target_area_search", ""),
        "target_industry": result.get("target_industry", ""),
        "target_number_of_employees": result.get("target_number_of_employees", ""),
        "inquiry_url": result.get("inquiry_url", ""),
        "update_datetime": result.get("update_datetime", ""),
    }


# ============================================================
# MCPツール定義
# ============================================================

@mcp.tool()
async def ping() -> str:
    """
    サーバーの動作確認を行います。

    Returns:
        "pong" という文字列（サーバーが正常に動作していることを示す）
    """
    return "pong"


@mcp.tool()
async def search_subsidies(
    keyword: str = "事業",
    sort: str = "created",
    order: str = "desc",
    acceptance: int = 1,
    limit: int = 20,
    page: int = 1
) -> Dict[str, Any]:
    """
    Jグランツの補助金を検索します。

    このツールは補助金の一覧を取得し、キーワードや条件で絞り込みます。

    Args:
        keyword: 検索キーワード（2文字以上、デフォルト: "事業"）
        sort: ソート項目（"created":作成日, "acceptance_start":受付開始日, "acceptance_end":受付終了日）
        order: ソート順（"asc":昇順, "desc":降順）
        acceptance: 受付状態（1:受付中のみ, 0:全て）
        limit: 取得件数（最大100）
        page: ページ番号

    Returns:
        補助金一覧と検索結果の統計情報
    """
    if len(keyword) < 2:
        return {"error": "キーワードは2文字以上で指定してください"}

    params = {
        "keyword": keyword,
        "sort": sort,
        "order": order,
        "acceptance": acceptance,
        "limit": min(limit, 100),
        "page": page
    }

    url = f"{API_BASE_URL}/subsidies"
    data = await _get_json(url, params)

    if "error" in data:
        return data

    # 結果を整形
    results = data.get("result", [])
    simplified_results = []

    for item in results:
        simplified_results.append({
            "id": item.get("id", ""),
            "title": item.get("title", ""),
            "subsidy_max_limit": _parse_int(item.get("subsidy_max_limit")),
            "acceptance_end_datetime": item.get("acceptance_end_datetime", ""),
            "deadline_status": _deadline_status(item.get("acceptance_end_datetime")),
            "target_area_search": item.get("target_area_search", ""),
            "target_industry": item.get("target_industry", ""),
            "detail": item.get("detail", "")[:200] + "..." if len(item.get("detail", "")) > 200 else item.get("detail", "")
        })

    return {
        "results": simplified_results,
        "total_count": data.get("total_count", 0),
        "page": data.get("page", page),
        "limit": data.get("limit", limit)
    }


@mcp.tool()
async def get_subsidy_detail(subsidy_id: str) -> Dict[str, Any]:
    """
    指定された補助金の詳細情報を取得し、添付ファイルをローカルに保存します。

    このツールは以下の情報を返します：
    - 補助金の詳細情報（タイトル、補助上限額、補助率、受付期間など）
    - 添付ファイルのfile:// URL（公募要領、概要資料、申請様式など）
    - ��ァイル保存先ディレクトリのパス

    Args:
        subsidy_id: 補助金ID（18文字以下の文字列）

    Returns:
        補助金の詳細情報（添付ファイルのfile:// URLを含む）

    注意:
        - 添付ファイルは自動的にローカルに保存されます
        - ファイルの内容を確認するには get_file_content ツールを使用してください
    """
    if not subsidy_id or not isinstance(subsidy_id, str):
        return {"error": "subsidy_id は文字列で指定してください"}

    url = f"{API_BASE_URL}/subsidies/id/{subsidy_id}"
    data = await _get_json(url)

    if "error" in data:
        return data

    result = data.get("result", data)
    if isinstance(result, list):
        result = result[0] if result else {}
    if not isinstance(result, dict):
        return {"error": "不明なレスポンス形式"}

    # 詳細情報の整形と添付ファイル保存
    detail = _compact_detail(result, subsidy_id)
    detail["files"] = _save_files(detail["id"], {
        "application_guidelines": result.get("application_guidelines", []),
        "outline_of_grant": result.get("outline_of_grant", []),
        "application_form": result.get("application_form", []),
    })
    detail["save_directory"] = str(FILES_DIR / detail["id"])

    return detail


@mcp.tool()
async def get_subsidy_statistics(
    keyword: str = "事業",
    acceptance: int = 1,
    output_format: str = "summary"
) -> Dict[str, Any]:
    """
    補助金の統計情報を取得します。

    このツールは、補助金の全体像を把握するための統計情報を提供します：
    - 締切日別の件数
    - 補助金額の分布
    - 対象地域・業種・企業規模の分布

    Args:
        keyword: 検索キーワード（デフォルト: "事業"）
        acceptance: 受付状態（1:受付中のみ, 0:全て）
        output_format: 出力形式（"summary":要約, "csv":CSV形式）

    Returns:
        補助金の統計情報
    """
    params = {
        "keyword": keyword,
        "sort": "acceptance_end",
        "order": "asc",
        "acceptance": acceptance,
        "limit": 100,
        "page": 1
    }

    url = f"{API_BASE_URL}/subsidies"
    data = await _get_json(url, params)

    if "error" in data:
        return data

    results = data.get("result", [])
    total_count = data.get("total_count", 0)

    # 統計情報の集計
    stats = {
        "total_count": total_count,
        "sampled_count": len(results),
        "deadline_distribution": {},
        "amount_distribution": {"不明": 0, "100万円未満": 0, "100-500万円": 0, "500-1000万円": 0, "1000万円以上": 0},
        "area_distribution": {},
        "industry_distribution": {},
    }

    for item in results:
        # 締切日の分布
        end_date = item.get("acceptance_end_datetime", "")
        if end_date:
            month = end_date[:7]
            stats["deadline_distribution"][month] = stats["deadline_distribution"].get(month, 0) + 1

        # 金額の分布
        amount = _parse_int(item.get("subsidy_max_limit"))
        if amount is None:
            stats["amount_distribution"]["不明"] += 1
        elif amount < 1000000:
            stats["amount_distribution"]["100万円未満"] += 1
        elif amount < 5000000:
            stats["amount_distribution"]["100-500万円"] += 1
        elif amount < 10000000:
            stats["amount_distribution"]["500-1000万円"] += 1
        else:
            stats["amount_distribution"]["1000万円以上"] += 1

        # 地域・業種の分布
        area = item.get("target_area_search", "不明")
        industry = item.get("target_industry", "不明")
        stats["area_distribution"][area] = stats["area_distribution"].get(area, 0) + 1
        stats["industry_distribution"][industry] = stats["industry_distribution"].get(industry, 0) + 1

    return stats


# ============================================================
# MCPプロンプト定義
# ============================================================

# Note: @mcp.prompt() と @mcp.resource() は fastmcp 0.2.0 ではサポートされていないため
# コメントアウトしています。将来のバージョンで有効化できます。

# @mcp.prompt()
# async def subsidy_search_guide():
#     """補助金検索のベストプラクティスを提供するプロンプト"""
#     return """# Jグランツ補助金検索ガイド
# 
# ## 効果的な検索のポイント
# 
# 1. **キーワードの選び方**
#    - 2文字以上必須（デフォルト: "事業"）
#    - 業種や目的を含めると精度向上
# 
# 2. **絞り込み条件の活用**
#    - 対象地域、業種、従業員数、受付状態を組み合わせる
#    - 締切日順、金額順でソート可能
# 
# ## 推奨検索パターン
# 
# - **広く探してから絞り込む**: まずキーワード検索 → 統計で全体把握 → 条件絞り込み
# - **目的明確型**: 最初から条件を指定して候補を限定
# """


# @mcp.prompt()
# async def api_usage_agreement():
#     """API利用規約と免責事項の確認プロンプト"""
#     return """# Jグランツ API 利用にあたっての同意事項
# 
# ## 免責事項
# 
# **本実装はあくまでサンプル実装であり、Jグランツサービスの検索性向上を保証するものではありません。**
# 最新情報は必ず公式サイトでご確認ください。
# 
# ## 利用規約
# 
# - 出典表示: 「Jグランツポータル（https://www.jgrants-portal.go.jp）」を明記
# - 適切な利用: 過度なAPI呼び出しは避ける
# - 個人情報: 取得した情報の適切な管理
# """


# ============================================================
# MCPリソース定義
# ============================================================

# @mcp.resource("jgrants://guidelines")
# async def usage_guidelines():
#     """MCPサーバー利用ガイドラインを提供するリソース"""
#     return """# Jグランツ MCP サーバー利用ガイドライン
# 
# ## 基本的な使い方
# 
# 1. **検索から始める**: `search_subsidies` で候補を探す
# 2. **詳細を確認**: `get_subsidy_detail` で詳細情報と添付ファイルを取得
# 3. **統計で全体像を把握**: `get_subsidy_statistics` で締切日・金額規模を確認
# 
# ## API制限と注意事項
# 
# - **レート制限**: 1分間に60リクエストまで（推奨値）
# - **タイムアウト**: 30秒で自動切断
# - **ファイルサイズ**: 大容量PDFは変換に時間がかかる場合あり
# 
# ## トラブルシューティング
# 
# - 検索結果0件 → キーワードを変更（"事業"等の汎用的なワードを試す）
# - 添付ファイル変換失敗 → BASE64形式で再取得
# - タイムアウト → 検索条件を絞り込む
# """


# ============================================================
# メイン実行
# ============================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Jグランツ補助金検索MCPサーバー")
    parser.add_argument("--mode", default="http", choices=["http", "stdio"], help="実行モード")
    parser.add_argument("--host", default="127.0.0.1", help="HTTPサーバーのホスト")
    parser.add_argument("--port", type=int, default=8000, help="HTTPサーバーのポート")

    args = parser.parse_args()

    if args.mode == "http":
        print(f"Jグランツ MCPサーバーを起動中: http://{args.host}:{args.port}/mcp")
        mcp.run(transport="streamable-http", host=args.host, port=args.port)
    else:
        mcp.run(transport="stdio")
