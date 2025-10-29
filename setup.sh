#!/bin/bash

echo "======================================"
echo "Jグランツ補助金検索チャットボット"
echo "セットアップスクリプト"
echo "======================================"
echo ""

# Python仮想環境のチェック
if [ ! -d ".venv" ]; then
    echo "📦 Python仮想環境を作成中..."
    python3 -m venv .venv
    echo "✅ 仮想環境を作成しました"
else
    echo "✅ 仮想環境は既に存在します"
fi

# Python仮想環境をアクティベート
echo ""
echo "📦 Python仮想環境をアクティベート中..."
source .venv/bin/activate

# Python依存関係のインストール
echo ""
echo "📦 Python依存パッケージをインストール中..."
pip install --upgrade pip
pip install -r requirements.txt

# Node.js依存関係のインストール
echo ""
echo "📦 Node.js依存パッケージをインストール中..."
if command -v npm &> /dev/null; then
    npm install
elif command -v yarn &> /dev/null; then
    yarn install
else
    echo "❌ エラー: npmまたはyarnがインストールされていません"
    exit 1
fi

# 環境変数ファイルの作成
if [ ! -f ".env.local" ]; then
    echo ""
    echo "📝 環境変数ファイルを作成中..."
    cp .env.example .env.local
    echo "✅ .env.localを作成しました"
else
    echo ""
    echo "✅ .env.localは既に存在します"
fi

echo ""
echo "======================================"
echo "✅ セットアップが完了しました！"
echo "======================================"
echo ""
echo "次のステップ:"
echo ""
echo "1. ターミナル1でMCPサーバーを起動:"
echo "   python -m jgrants_mcp_server.core --port 8000"
echo ""
echo "2. ターミナル2でNext.jsアプリを起動:"
echo "   npm run dev"
echo ""
echo "3. ブラウザでアクセス:"
echo "   http://localhost:3000"
echo ""
echo "詳細はREADME.mdをご覧ください。"
echo ""
