#!/bin/bash
#
# NoteDock バックアップスクリプト
#
# 機能:
#   1. PostgreSQLデータベースをバックアップ
#   2. MinIOストレージをバックアップ
#
# 使用方法:
#   ./scripts/backup.sh [--db-only] [--minio-only]
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
BACKUP_DIR="$PROJECT_ROOT/backups"

# デフォルト値
BACKUP_DB=true
BACKUP_MINIO=true
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --db-only)
            BACKUP_MINIO=false
            shift
            ;;
        --minio-only)
            BACKUP_DB=false
            shift
            ;;
        --help|-h)
            echo "使用方法: $0 [オプション]"
            echo ""
            echo "オプション:"
            echo "  --db-only     データベースのみバックアップ"
            echo "  --minio-only  MinIOのみバックアップ"
            echo "  --help, -h    このヘルプを表示"
            echo ""
            echo "例:"
            echo "  $0               # 全てバックアップ"
            echo "  $0 --db-only     # DBのみ"
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

# Docker Composeが動作しているか確認
check_docker() {
    cd "$PROJECT_ROOT"
    if ! docker compose ps --status running | grep -q "notedock"; then
        log_error "Docker Composeコンテナが起動していません"
        log_info "先に 'docker compose up -d' を実行してください"
        exit 1
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
    local backup_file="$BACKUP_DIR/db_backup_$TIMESTAMP.dump"

    log_info "データベースをバックアップ中..."

    cd "$PROJECT_ROOT"
    docker compose exec -T db pg_dump -U notedock -d notedock -Fc > "$backup_file"

    if [ $? -eq 0 ] && [ -s "$backup_file" ]; then
        log_success "データベースバックアップ完了: $backup_file"
        log_info "サイズ: $(du -h "$backup_file" | cut -f1)"
    else
        log_error "データベースバックアップに失敗しました"
        rm -f "$backup_file"
        exit 1
    fi
}

# MinIOバックアップ
backup_minio() {
    local backup_file="$BACKUP_DIR/minio_backup_$TIMESTAMP.tar.gz"
    local temp_dir=$(mktemp -d)

    log_info "MinIOストレージをバックアップ中..."

    cd "$PROJECT_ROOT"

    # MinIOコンテナからデータをコピー
    docker cp notedock-minio-1:/data/. "$temp_dir/"

    # tar.gzに圧縮
    tar -czf "$backup_file" -C "$temp_dir" .

    # 一時ディレクトリ削除
    rm -rf "$temp_dir"

    if [ $? -eq 0 ] && [ -s "$backup_file" ]; then
        log_success "MinIOバックアップ完了: $backup_file"
        log_info "サイズ: $(du -h "$backup_file" | cut -f1)"
    else
        log_error "MinIOバックアップに失敗しました"
        rm -f "$backup_file"
        exit 1
    fi
}

# メイン処理
main() {
    echo ""
    echo "========================================"
    echo "  NoteDock バックアップスクリプト"
    echo "========================================"
    echo ""

    # Docker確認
    check_docker

    # バックアップディレクトリ作成
    create_backup_dir

    # データベースバックアップ
    if [ "$BACKUP_DB" = true ]; then
        echo "----------------------------------------"
        echo "Step 1: データベースバックアップ"
        echo "----------------------------------------"
        backup_database
        echo ""
    fi

    # MinIOバックアップ
    if [ "$BACKUP_MINIO" = true ]; then
        echo "----------------------------------------"
        echo "Step 2: MinIOストレージバックアップ"
        echo "----------------------------------------"
        backup_minio
        echo ""
    fi

    # 完了
    echo "========================================"
    echo -e "${GREEN}  バックアップ完了${NC}"
    echo "========================================"
    echo ""
    log_info "バックアップディレクトリ: $BACKUP_DIR"
    ls -lh "$BACKUP_DIR"/*_$TIMESTAMP* 2>/dev/null || true
    echo ""
}

# スクリプト実行
main
