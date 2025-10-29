# クイックスタートガイド

このガイドでは、最速でJグランツ補助金検索チャットボットを起動する方法を説明します。

## 前提条件

- Python 3.11以上がインストールされている
- Node.js 18以上がインストールされている
- ターミナル/コマンドプロンプトが使える

## 3ステップで起動

### ステップ1: セットアップ

```bash
# セットアップスクリプトを実行
./setup.sh
```

または、手動でセットアップ:

```bash
# Python環境
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Node.js環境
npm install

# 環境変数
cp .env.example .env.local
```

### ステップ2: MCPサーバーを起動

**ターミナル1を開いて:**

```bash
# Python仮想環境をアクティベート（まだの場合）
source .venv/bin/activate

# MCPサーバーを起動
python -m jgrants_mcp_server.core --port 8000
```

起動に成功すると、以下のように表示されます:

```
Jグランツ MCPサーバーを起動中: http://127.0.0.1:8000/mcp
```

### ステップ3: Next.jsアプリを起動

**ターミナル2を開いて:**

```bash
npm run dev
```

起動に成功すると、以下のように表示されます:

```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### ステップ4: ブラウザでアクセス

ブラウザで以下のURLを開きます:

```
http://localhost:3000
```

## 動作確認

チャットボットが表示されたら、以下の質問を試してみてください:

1. **最新の補助金を教えて**
   - 最新の補助金情報が表示されます

2. **DXに関連する補助金を探して**
   - DX関連の補助金が検索されます

3. **補助金の統計情報を表示して**
   - 全体の統計情報が表示されます

## トラブルシューティング

### Q: MCPサーバーに接続できない

A: 以下を確認してください:
1. ターミナル1でMCPサーバーが起動しているか
2. ポート8000が他のアプリケーションで使用されていないか
3. `.env.local`の`MCP_SERVER_URL`が`http://localhost:8000`になっているか

### Q: Python/Nodeのバージョンが古い

A: 以下のコマンドでバージョンを確認してください:

```bash
python3 --version  # 3.11以上必要
node --version     # 18以上必要
```

古い場合は、公式サイトから最新版をインストールしてください。

### Q: 依存パッケージのインストールに失敗する

A: 以下を試してください:

```bash
# Python
pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir

# Node.js
rm -rf node_modules package-lock.json
npm install
```

## 次のステップ

- [README.md](README.md)で詳細な機能説明を確認
- MCPサーバーのコード([jgrants_mcp_server/core.py](jgrants_mcp_server/core.py))をカスタマイズ
- チャットUIのデザイン([src/components/ChatBot.tsx](src/components/ChatBot.tsx))を変更

## さらに詳しく知りたい方へ

- [デジタル庁のMCP実装記事](https://note.com/digital_gov/)
- [Model Context Protocol公式ドキュメント](https://modelcontextprotocol.io)
- [Jグランツ公式サイト](https://www.jgrants-portal.go.jp)

---

質問や不具合がある場合は、GitHubのIssuesでお知らせください。
