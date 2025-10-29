# Jグランツ補助金検索チャットボット

デジタル庁が提供するJグランツ補助金APIを活用した、自然言語で補助金情報を検索できるチャットボットアプリケーションです。

Model Context Protocol (MCP) を活用し、Next.jsで構築されたモダンなWebアプリケーションとして実装されています。

## 主な機能

- **自然言語検索**: 「最新の補助金を教えて」「東京都の製造業向け補助金はある?」など、自然な日本語で質問可能
- **詳細情報取得**: 補助金の詳細情報、締切日、対象地域、補助上限額などを表示
- **統計情報**: 補助金の全体像（締切日分布、金額分布など）を把握可能
- **リアルタイムチャット**: モダンなUIでスムーズなチャット体験

## システム構成

```
┌─────────────────┐
│  ブラウザ        │
│  (Next.js UI)   │
└────────┬────────┘
         │ HTTP
┌────────▼────────┐
│  Next.js API    │
│  (/api/chat)    │
└────────┬────────┘
         │ MCP Protocol
┌────────▼────────┐
│  MCPサーバー     │
│  (FastMCP)      │
└────────┬────────┘
         │ REST API
┌────────▼────────┐
│  Jグランツ API  │
└─────────────────┘
```

## 技術スタック

### フロントエンド
- **Next.js 14**: React フレームワーク
- **TypeScript**: 型安全な開発
- **CSS-in-JS**: スタイリング

### バックエンド
- **Python 3.11+**: MCPサーバー実装
- **FastMCP**: Model Context Protocol フレームワーク
- **httpx**: 非同期HTTPクライアント
- **pdfplumber**: PDFファイル処理
- **markitdown**: ファイル→Markdown変換

## セットアップ

### 必要な環境

- Node.js 18以上
- Python 3.11以上
- npm または yarn

### インストール手順

#### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd jgrants-chatbot
```

#### 2. Pythonの依存関係をインストール

```bash
# Python仮想環境を作成（推奨）
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 依存パッケージをインストール
pip install -r requirements.txt
```

#### 3. Node.jsの依存関係をインストール

```bash
npm install
# または
yarn install
```

#### 4. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local`を編集（必要に応じて）:

```env
MCP_SERVER_URL=http://localhost:8000
JGRANTS_FILES_DIR=./jgrants_files
```

## 起動方法

### 方法1: 別々のターミナルで起動

#### ターミナル1: MCPサーバーを起動

```bash
python -m jgrants_mcp_server.core --port 8000
```

起動すると以下のように表示されます:

```
Jグランツ MCPサーバーを起動中: http://127.0.0.1:8000/mcp
```

#### ターミナル2: Next.jsアプリを起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

### 方法2: npmスクリプトを使用

```bash
# MCPサーバーを起動
npm run mcp-server

# 別のターミナルで Next.jsを起動
npm run dev
```

## 使い方

### 質問例

1. **最新情報を取得**
   ```
   最新の補助金を教えて
   ```

2. **条件で絞り込み**
   ```
   東京都の製造業向け補助金はある?
   DXに関連する補助金を探して
   ```

3. **詳細情報を取得**
   ```
   <補助金ID>の詳細を教えて
   ```

4. **統計情報を確認**
   ```
   補助金の統計情報を表示して
   全体の傾向を教えて
   ```

### チャット画面の使い方

1. 画面下部のテキストボックスに質問を入力
2. 「送信」ボタンをクリック、またはEnterキーを押す
3. ボットからの回答が表示されます
4. 回答に含まれる補助金IDを使って、詳細情報を取得できます

## MCPツール一覧

実装されているMCPツール:

| ツール名 | 説明 |
|---------|------|
| `ping` | サーバーの動作確認 |
| `search_subsidies` | 補助金を検索 |
| `get_subsidy_detail` | 補助金の詳細情報を取得 |
| `get_subsidy_statistics` | 補助金の統計情報を取得 |

## プロジェクト構造

```
.
├── jgrants_mcp_server/       # MCPサーバー実装
│   ├── __init__.py
│   └── core.py               # メインロジック
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts  # チャットAPIエンドポイント
│   │   ├── layout.tsx        # レイアウト
│   │   └── page.tsx          # メインページ
│   └── components/
│       └── ChatBot.tsx       # チャットUIコンポーネント
├── package.json              # Node.js依存関係
├── requirements.txt          # Python依存関係
├── tsconfig.json             # TypeScript設定
├── next.config.js            # Next.js設定
└── README.md                 # このファイル
```

## デプロイ

### MCPサーバーのデプロイ

Railway、Render、Herokuなどのクラウドサービスにデプロイできます。

#### Railwayの例:

1. Railway CLIをインストール
2. プロジェクトを初期化
   ```bash
   railway init
   ```
3. デプロイ
   ```bash
   railway up
   ```

### Next.jsアプリのデプロイ

Vercel、Netlifyなどにデプロイできます。

#### Vercelの例:

```bash
npm install -g vercel
vercel
```

環境変数 `MCP_SERVER_URL` を設定してください。

## トラブルシューティング

### MCPサーバーに接続できない

1. MCPサーバーが起動しているか確認
   ```bash
   curl http://localhost:8000/mcp
   ```

2. `.env.local`の`MCP_SERVER_URL`が正しいか確認

### 検索結果が0件

- キーワードを変更してみてください（例: "事業"、"DX"、"IT"）
- 受付中の補助金に絞り込んでいる場合、条件を緩和してください

### ファイル保存エラー

- `JGRANTS_FILES_DIR`のパスに書き込み権限があるか確認
- ディレクトリが存在しない場合は自動作成されます

## 免責事項

- 本実装はサンプルコードであり、Jグランツサービスの検索性向上を保証するものではありません
- 最新情報は必ず[Jグランツ公式サイト](https://www.jgrants-portal.go.jp)でご確認ください
- 本システムの利用により生じた損害について、開発者は一切の責任を負いません

## ライセンス

MIT License

## 参考資料

- [デジタル庁 - MCPを活用したJグランツ補助金検索システムの実装例](https://note.com/digital_gov/)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io)
- [FastMCP](https://github.com/modelcontextprotocol/fastmcp)
- [Jグランツポータル](https://www.jgrants-portal.go.jp)
- [Jグランツ API仕様](https://developers.digital.go.jp/documents/jgrants/api/)

## お問い合わせ

質問や不具合報告は、GitHubのIssuesでお願いします。
