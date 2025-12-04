#!/bin/bash
set -e

# NoteDock 開発環境起動スクリプト (Docker版)
# Usage: ./scripts/start-dev.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 色付き出力
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  NoteDock 開発環境起動スクリプト${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$PROJECT_ROOT"

# .envファイルの確認
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}.envファイルが見つかりません。.env.exampleからコピーします...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .envファイルを作成しました${NC}"
    echo ""
fi

# 1. Docker Composeで全サービス起動
echo -e "${YELLOW}[1/2] Docker Composeで全サービスをビルド中...${NC}"
docker compose build
echo -e "${GREEN}✓ ビルド完了${NC}"
echo ""

echo -e "${YELLOW}[2/2] Docker Composeで全サービスを起動中...${NC}"
docker compose up -d
echo -e "${GREEN}✓ 全サービスを起動しました${NC}"
echo ""

# サービス起動待ち
echo -e "${YELLOW}サービスの起動を待機中...${NC}"
sleep 5

# ヘルスチェック
echo -e "${YELLOW}ヘルスチェック中...${NC}"
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ バックエンドAPI: 正常${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo "  バックエンドAPIの起動を待機中... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}⚠ バックエンドAPIの起動がタイムアウトしました${NC}"
    echo "  ログを確認してください: docker compose logs backend"
fi

# 完了メッセージ
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}NoteDock が起動しました！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}アクセス先:${NC}"
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  API Docs:    http://localhost:8000/api/docs"
echo "  MinIO:       http://localhost:9001 (notedock/notedock-secret)"
echo ""
echo -e "${BLUE}便利なコマンド:${NC}"
echo "  ログ確認:     docker compose logs -f"
echo "  停止:         docker compose down"
echo "  再起動:       docker compose restart"
echo ""
