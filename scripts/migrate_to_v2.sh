#!/bin/bash
#
# NoteDock v2 マイグレーションスクリプト
#
# 機能:
#   1. 現在のデータベースをバックアップ
#   2. Alembicマイグレーションを実行
#   3. 既存ノートにデフォルトの作成者を設定（オプション）
#
# 使用方法:
#   ./scripts/migrate_to_v2.sh [--set-author "作成者名"]
#

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
BACKUP_DIR="$PROJECT_ROOT/backups"

# デフォルト値
DEFAULT_AUTHOR=""
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/notedock_backup_$TIMESTAMP.sql"

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --set-author)
            DEFAULT_AUTHOR="$2"
            shift 2
            ;;
        --help|-h)
            echo "使用方法: $0 [オプション]"
            echo ""
            echo "オプション:"
            echo "  --set-author \"名前\"  既存ノートにデフォルトの作成者を設定"
            echo "  --help, -h           このヘルプを表示"
            echo ""
            echo "例:"
            echo "  $0                           # バックアップとマイグレーションのみ"
            echo "  $0 --set-author \"管理者\"    # 既存ノートに作成者を設定"
            exit 0
            ;;
        *)
            echo -e "${RED}不明なオプション: $1${NC}"
            exit 1
            ;;
    esac
done

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 環境変数読み込み
load_env() {
    if [ -f "$BACKEND_DIR/.env" ]; then
        log_info ".env ファイルを読み込み中..."
        export $(grep -v '^#' "$BACKEND_DIR/.env" | xargs)
    else
        log_warning ".env ファイルが見つかりません。環境変数から設定を使用します。"
    fi
}

# データベース接続情報を取得
get_db_connection() {
    # DATABASE_URLから接続情報を抽出
    if [ -n "$DATABASE_URL" ]; then
        # postgresql://user:password@host:port/dbname 形式をパース
        DB_USER=$(echo $DATABASE_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
        DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*@\([^:]*\):.*|\1|p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
        DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*/\([^?]*\).*|\1|p')
    else
        DB_USER="${POSTGRES_USER:-postgres}"
        DB_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
        DB_HOST="${POSTGRES_HOST:-localhost}"
        DB_PORT="${POSTGRES_PORT:-5432}"
        DB_NAME="${POSTGRES_DB:-notedock}"
    fi
}

# バックアップディレクトリ作成
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "バックアップディレクトリを作成: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# データベースバックアップ
backup_database() {
    log_info "データベースをバックアップ中..."
    log_info "バックアップ先: $BACKUP_FILE"

    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F p \
        -f "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        log_success "バックアップ完了: $BACKUP_FILE"
        log_info "バックアップサイズ: $(du -h "$BACKUP_FILE" | cut -f1)"
    else
        log_error "バックアップに失敗しました"
        exit 1
    fi
}

# Alembicマイグレーション実行
run_migration() {
    log_info "Alembicマイグレーションを実行中..."

    cd "$BACKEND_DIR"

    # 仮想環境をアクティベート
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    fi

    # 現在のリビジョンを表示
    log_info "現在のデータベースリビジョン:"
    alembic current

    # マイグレーション実行
    log_info "マイグレーションを適用中..."
    alembic upgrade head

    if [ $? -eq 0 ]; then
        log_success "マイグレーション完了"
        log_info "新しいリビジョン:"
        alembic current
    else
        log_error "マイグレーションに失敗しました"
        log_warning "バックアップから復元するには以下を実行:"
        log_warning "  PGPASSWORD=\"$DB_PASSWORD\" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
        exit 1
    fi
}

# 既存ノートに作成者を設定
set_default_author() {
    if [ -z "$DEFAULT_AUTHOR" ]; then
        return
    fi

    log_info "既存ノートにデフォルトの作成者を設定中: $DEFAULT_AUTHOR"

    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "UPDATE notes SET created_by = '$DEFAULT_AUTHOR', updated_by = '$DEFAULT_AUTHOR' WHERE created_by IS NULL;"

    if [ $? -eq 0 ]; then
        # 更新されたレコード数を取得
        COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -t \
            -c "SELECT COUNT(*) FROM notes WHERE created_by = '$DEFAULT_AUTHOR';")
        log_success "作成者を設定しました: ${COUNT// /} 件のノート"
    else
        log_error "作成者の設定に失敗しました"
    fi
}

# Discord通知設定の初期化
init_discord_setting() {
    log_info "Discord通知設定を初期化中..."

    # 設定が存在しない場合のみ追加
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "INSERT INTO app_settings (key, value, description) VALUES ('discord_notification_enabled', 'false', 'Discord通知の有効/無効') ON CONFLICT (key) DO NOTHING;"

    log_success "Discord通知設定を初期化しました（デフォルト: 無効）"
}

# メイン処理
main() {
    echo ""
    echo "========================================"
    echo "  NoteDock v2 マイグレーションスクリプト"
    echo "========================================"
    echo ""

    # 環境変数読み込み
    load_env

    # データベース接続情報取得
    get_db_connection

    log_info "データベース: $DB_NAME @ $DB_HOST:$DB_PORT"
    echo ""

    # 確認プロンプト
    read -p "マイグレーションを開始しますか？ (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_warning "キャンセルしました"
        exit 0
    fi
    echo ""

    # Step 1: バックアップ
    echo "----------------------------------------"
    echo "Step 1: データベースバックアップ"
    echo "----------------------------------------"
    create_backup_dir
    backup_database
    echo ""

    # Step 2: マイグレーション
    echo "----------------------------------------"
    echo "Step 2: Alembicマイグレーション"
    echo "----------------------------------------"
    run_migration
    echo ""

    # Step 3: 設定初期化
    echo "----------------------------------------"
    echo "Step 3: 設定初期化"
    echo "----------------------------------------"
    init_discord_setting
    echo ""

    # Step 4: 既存データの更新（オプション）
    if [ -n "$DEFAULT_AUTHOR" ]; then
        echo "----------------------------------------"
        echo "Step 4: 既存ノートの作成者設定"
        echo "----------------------------------------"
        set_default_author
        echo ""
    fi

    # 完了
    echo "========================================"
    echo -e "${GREEN}  マイグレーション完了${NC}"
    echo "========================================"
    echo ""
    log_info "バックアップファイル: $BACKUP_FILE"
    echo ""
    log_warning "問題が発生した場合の復元コマンド:"
    echo "  PGPASSWORD=\"\$DB_PASSWORD\" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
    echo ""
}

# スクリプト実行
main
