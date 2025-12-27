#!/bin/bash
#
# NoteDock 復元スクリプト
#
# 機能:
#   1. PostgreSQLデータベースを復元
#   2. MinIOストレージを復元
#
# 使用方法:
#   ./scripts/restore.sh [バックアップタイムスタンプ]
#   ./scripts/restore.sh 20251213_022344
#   ./scripts/restore.sh --list
#   ./scripts/restore.sh --latest
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
TIMESTAMP=""
LIST_ONLY=false
USE_LATEST=false

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --list|-l)
            LIST_ONLY=true
            shift
            ;;
        --latest)
            USE_LATEST=true
            shift
            ;;
        --help|-h)
            echo "使用方法: $0 [オプション] [タイムスタンプ]"
            echo ""
            echo "オプション:"
            echo "  --list, -l    利用可能なバックアップを一覧表示"
            echo "  --latest      最新のバックアップから復元"
            echo "  --help, -h    このヘルプを表示"
            echo ""
            echo "例:"
            echo "  $0 --list                  # バックアップ一覧"
            echo "  $0 --latest                # 最新から復元"
            echo "  $0 20251213_022344         # 指定タイムスタンプから復元"
            exit 0
            ;;
        *)
            TIMESTAMP="$1"
            shift
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

# バックアップ一覧を表示
list_backups() {
    echo ""
    echo "利用可能なバックアップ:"
    echo "========================================"

    if [ ! -d "$BACKUP_DIR" ]; then
        log_warning "バックアップディレクトリが存在しません: $BACKUP_DIR"
        exit 1
    fi

    # DBバックアップのタイムスタンプを抽出
    echo ""
    echo "データベースバックアップ:"
    ls -lh "$BACKUP_DIR"/db_backup_*.dump 2>/dev/null | while read line; do
        file=$(echo "$line" | awk '{print $NF}')
        size=$(echo "$line" | awk '{print $5}')
        ts=$(basename "$file" | sed 's/db_backup_\(.*\)\.dump/\1/')
        echo "  $ts  ($size)"
    done || echo "  (なし)"

    echo ""
    echo "MinIOバックアップ:"
    ls -lh "$BACKUP_DIR"/minio_backup_*.tar.gz 2>/dev/null | while read line; do
        file=$(echo "$line" | awk '{print $NF}')
        size=$(echo "$line" | awk '{print $5}')
        ts=$(basename "$file" | sed 's/minio_backup_\(.*\)\.tar\.gz/\1/')
        echo "  $ts  ($size)"
    done || echo "  (なし)"

    echo ""
    echo "使用方法: $0 <タイムスタンプ>"
    echo ""
}

# 最新のタイムスタンプを取得
get_latest_timestamp() {
    # DBバックアップの最新タイムスタンプを取得
    local latest_db=$(ls -t "$BACKUP_DIR"/db_backup_*.dump 2>/dev/null | head -1)
    if [ -n "$latest_db" ]; then
        basename "$latest_db" | sed 's/db_backup_\(.*\)\.dump/\1/'
    else
        echo ""
    fi
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

# データベース復元
restore_database() {
    local backup_file="$BACKUP_DIR/db_backup_$TIMESTAMP.dump"

    if [ ! -f "$backup_file" ]; then
        log_error "データベースバックアップファイルが見つかりません: $backup_file"
        return 1
    fi

    log_info "データベースを復元中..."
    log_info "ファイル: $backup_file"

    cd "$PROJECT_ROOT"

    # バックアップファイルをコンテナにコピーしてからリストア
    docker cp "$backup_file" notedock-db-1:/tmp/backup.dump
    docker compose exec -T db pg_restore -U notedock -d notedock --clean --if-exists /tmp/backup.dump 2>&1 || true
    docker compose exec -T db rm -f /tmp/backup.dump

    # 復元結果を確認
    local count=$(docker compose exec -T db psql -U notedock -d notedock -t -c "SELECT COUNT(*) FROM notes;")
    count=$(echo "$count" | tr -d ' ')

    if [ -n "$count" ] && [ "$count" -gt 0 ]; then
        log_success "データベース復元完了: $count 件のノート"
    else
        log_warning "データベース復元完了（ノート数を確認できませんでした）"
    fi
}

# MinIO復元
restore_minio() {
    local backup_file="$BACKUP_DIR/minio_backup_$TIMESTAMP.tar.gz"

    if [ ! -f "$backup_file" ]; then
        log_warning "MinIOバックアップファイルが見つかりません: $backup_file"
        log_info "MinIOの復元をスキップします"
        return 0
    fi

    log_info "MinIOストレージを復元中..."
    log_info "ファイル: $backup_file"

    cd "$PROJECT_ROOT"

    # 一時ディレクトリに展開
    local temp_dir=$(mktemp -d)
    tar -xzf "$backup_file" -C "$temp_dir"

    # バックアップ形式を検出してMinIOコンテナにコピー
    # 新形式: ルートに.minio.sysとnotedock-filesがある
    # 旧形式: minio_data/ディレクトリ内にデータがある
    local data_dir=""
    if [ -d "$temp_dir/.minio.sys" ] || [ -d "$temp_dir/notedock-files" ]; then
        # 新形式
        data_dir="$temp_dir"
        log_info "新形式のバックアップを検出"
    elif [ -d "$temp_dir/minio_data" ]; then
        # 旧形式
        data_dir="$temp_dir/minio_data"
        log_info "旧形式のバックアップを検出"
    else
        log_warning "MinIOバックアップの形式を認識できません"
        ls -la "$temp_dir"
        rm -rf "$temp_dir"
        return 1
    fi

    # MinIOコンテナにコピー
    docker cp "$data_dir/." notedock-minio-1:/data/

    # ファイル数を確認
    local file_count=$(docker compose exec -T minio ls /data/notedock-files/attachments/ 2>/dev/null | wc -l || echo "0")
    log_success "MinIO復元完了: $file_count 個のファイル"

    # 一時ディレクトリ削除
    rm -rf "$temp_dir"
}

# コンテナ再起動
restart_containers() {
    log_info "コンテナを再起動中..."

    cd "$PROJECT_ROOT"
    docker compose restart minio backend

    log_success "コンテナ再起動完了"
}

# メイン処理
main() {
    echo ""
    echo "========================================"
    echo "  NoteDock 復元スクリプト"
    echo "========================================"
    echo ""

    # 一覧表示モード
    if [ "$LIST_ONLY" = true ]; then
        list_backups
        exit 0
    fi

    # 最新を使用
    if [ "$USE_LATEST" = true ]; then
        TIMESTAMP=$(get_latest_timestamp)
        if [ -z "$TIMESTAMP" ]; then
            log_error "バックアップが見つかりません"
            exit 1
        fi
        log_info "最新のバックアップを使用: $TIMESTAMP"
    fi

    # タイムスタンプが指定されているか確認
    if [ -z "$TIMESTAMP" ]; then
        log_error "タイムスタンプを指定してください"
        echo ""
        echo "使用方法: $0 <タイムスタンプ>"
        echo "         $0 --latest"
        echo "         $0 --list"
        exit 1
    fi

    # Docker確認
    check_docker

    # バックアップディレクトリ確認
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "バックアップディレクトリが存在しません: $BACKUP_DIR"
        exit 1
    fi

    # 確認プロンプト
    echo "復元対象タイムスタンプ: $TIMESTAMP"
    echo ""
    log_warning "この操作は現在のデータを上書きします！"
    read -p "復元を開始しますか？ (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_warning "キャンセルしました"
        exit 0
    fi
    echo ""

    # データベース復元
    echo "----------------------------------------"
    echo "Step 1: データベース復元"
    echo "----------------------------------------"
    restore_database
    echo ""

    # MinIO復元
    echo "----------------------------------------"
    echo "Step 2: MinIOストレージ復元"
    echo "----------------------------------------"
    restore_minio
    echo ""

    # コンテナ再起動
    echo "----------------------------------------"
    echo "Step 3: コンテナ再起動"
    echo "----------------------------------------"
    restart_containers
    echo ""

    # 完了
    echo "========================================"
    echo -e "${GREEN}  復元完了${NC}"
    echo "========================================"
    echo ""
    log_info "ブラウザで動作を確認してください"
    echo ""
}

# スクリプト実行
main
