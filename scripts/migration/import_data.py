#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "psycopg2-binary>=2.9.9",
#     "minio>=7.2.0",
# ]
# ///
"""
NoteDock データインポートスクリプト

エクスポートされたデータを新しいシステムにインポートします。

入力: export_data.py で生成されたエクスポートディレクトリ
  - database/: 各テーブルのJSONファイル
  - files/: MinIOにアップロードするファイル
  - manifest.json: エクスポートメタデータ

Usage:
  uv run import_data.py <export_dir> [--db-only] [--files-only] [--force]
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import psycopg2
from psycopg2.extras import execute_values
from minio import Minio
from minio.error import S3Error


def get_env_config() -> dict[str, Any]:
    """環境変数から設定を取得（移行先）"""
    return {
        "db_host": os.environ.get("TARGET_DB_HOST", os.environ.get("DB_HOST", "localhost")),
        "db_port": int(os.environ.get("TARGET_DB_PORT", os.environ.get("DB_PORT", "5432"))),
        "db_user": os.environ.get("TARGET_DB_USER", os.environ.get("DB_USER", "notedock")),
        "db_password": os.environ.get("TARGET_DB_PASSWORD", os.environ.get("DB_PASSWORD", "notedock")),
        "db_name": os.environ.get("TARGET_DB_NAME", os.environ.get("DB_NAME", "notedock")),
        "minio_endpoint": os.environ.get("TARGET_MINIO_ENDPOINT", os.environ.get("MINIO_ENDPOINT", "localhost:9000")),
        "minio_access_key": os.environ.get("TARGET_MINIO_ACCESS_KEY", os.environ.get("MINIO_ACCESS_KEY", "notedock")),
        "minio_secret_key": os.environ.get("TARGET_MINIO_SECRET_KEY", os.environ.get("MINIO_SECRET_KEY", "notedock-secret")),
        "minio_bucket": os.environ.get("TARGET_MINIO_BUCKET", os.environ.get("MINIO_BUCKET", "notedock-files")),
        "minio_secure": os.environ.get("TARGET_MINIO_SECURE", os.environ.get("MINIO_SECURE", "false")).lower() == "true",
    }


def load_manifest(export_dir: Path) -> dict[str, Any]:
    """マニフェストを読み込み"""
    manifest_path = export_dir / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"マニフェストが見つかりません: {manifest_path}")

    with open(manifest_path, "r", encoding="utf-8") as f:
        return json.load(f)


def clear_database(config: dict[str, Any], force: bool = False) -> None:
    """データベースの既存データをクリア（外部キー制約順）"""
    if not force:
        response = input("\n⚠ 移行先データベースの既存データを削除しますか？ (yes/no): ")
        if response.lower() != "yes":
            print("中止しました")
            sys.exit(1)

    print("\n=== データベースクリア開始 ===")

    conn = psycopg2.connect(
        host=config["db_host"],
        port=config["db_port"],
        user=config["db_user"],
        password=config["db_password"],
        dbname=config["db_name"],
    )

    # 削除順（外部キー依存の逆順）
    tables = [
        "activity_logs",
        "note_links",
        "note_files",
        "note_tags",
        "comments",
        "note_versions",
        "notes",
        "files",
        "tags",
        "folders",
    ]

    with conn.cursor() as cur:
        for table in tables:
            try:
                cur.execute(f"DELETE FROM {table}")
                print(f"  ✓ {table} クリア")
            except psycopg2.Error as e:
                print(f"  ⚠ {table}: {e}")

    conn.commit()
    conn.close()


def import_database(config: dict[str, Any], export_dir: Path) -> dict[str, int]:
    """JSONファイルからデータベースへインポート"""
    print("\n=== データベースインポート開始 ===")

    conn = psycopg2.connect(
        host=config["db_host"],
        port=config["db_port"],
        user=config["db_user"],
        password=config["db_password"],
        dbname=config["db_name"],
    )

    # インポート順（依存関係順）
    tables_config = [
        ("folders", ["id", "name", "parent_id"]),
        ("tags", ["id", "name"]),
        ("files", ["id", "original_name", "stored_key", "mime_type", "size_bytes", "created_at"]),
        ("notes", ["id", "title", "content_md", "folder_id", "is_pinned", "is_readonly", "cover_file_id", "deleted_at", "editing_locked_by", "editing_locked_at", "created_at", "updated_at"]),
        ("note_versions", ["id", "note_id", "version_no", "title", "content_md", "cover_file_id", "created_at"]),
        ("comments", ["id", "note_id", "parent_id", "display_name", "content", "created_at", "updated_at"]),
        ("note_links", ["id", "from_note_id", "to_note_id"]),
        ("note_tags", ["note_id", "tag_id"]),
        ("note_files", ["note_id", "file_id"]),
        ("activity_logs", ["id", "event_type", "note_id", "actor_name", "details", "created_at"]),
    ]

    stats = {}
    db_dir = export_dir / "database"

    with conn.cursor() as cur:
        for table, columns in tables_config:
            json_file = db_dir / f"{table}.json"
            if not json_file.exists():
                print(f"  ⚠ {table}: ファイルなし（スキップ）")
                stats[table] = 0
                continue

            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    rows = json.load(f)

                if not rows:
                    print(f"  - {table}: 0 件（空）")
                    stats[table] = 0
                    continue

                # カラムがデータに存在するかチェックして有効なカラムのみ使用
                available_columns = [c for c in columns if c in rows[0]]

                # データを準備
                values = []
                for row in rows:
                    value_tuple = tuple(row.get(col) for col in available_columns)
                    values.append(value_tuple)

                # バルクインサート
                columns_str = ", ".join(available_columns)
                placeholders = ", ".join(["%s"] * len(available_columns))
                query = f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})"

                cur.executemany(query, values)
                conn.commit()

                stats[table] = len(rows)
                print(f"  ✓ {table}: {len(rows)} 件")

            except (psycopg2.Error, json.JSONDecodeError) as e:
                print(f"  ✗ {table}: {e}")
                conn.rollback()
                stats[table] = -1

        # シーケンスをリセット
        print("\n  シーケンスリセット中...")
        reset_sequences(cur, conn)

    conn.close()
    return stats


def reset_sequences(cur, conn) -> None:
    """プライマリキーのシーケンスを最大値に更新"""
    tables_with_id = [
        "folders",
        "tags",
        "files",
        "notes",
        "note_versions",
        "comments",
        "note_links",
        "activity_logs",
    ]

    for table in tables_with_id:
        try:
            cur.execute(f"""
                SELECT setval(
                    pg_get_serial_sequence('{table}', 'id'),
                    COALESCE((SELECT MAX(id) FROM {table}), 0) + 1,
                    false
                )
            """)
            conn.commit()
        except psycopg2.Error:
            conn.rollback()


def import_minio_files(config: dict[str, Any], export_dir: Path, manifest: dict) -> dict[str, int]:
    """ファイルをMinIOにアップロード"""
    print("\n=== MinIO ファイルインポート開始 ===")

    client = Minio(
        config["minio_endpoint"],
        access_key=config["minio_access_key"],
        secret_key=config["minio_secret_key"],
        secure=config["minio_secure"],
    )

    bucket = config["minio_bucket"]
    files_dir = export_dir / "files"

    stats = {
        "total": 0,
        "success": 0,
        "failed": 0,
        "skipped": 0,
    }

    # バケット作成
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            print(f"  ✓ バケット '{bucket}' を作成しました")
    except S3Error as e:
        print(f"  ✗ バケット作成エラー: {e}")
        return stats

    # マニフェストからファイルリストを取得
    file_list = manifest.get("file_list", [])

    if not file_list:
        # マニフェストにファイルリストがない場合、ディレクトリをスキャン
        print("  マニフェストにファイルリストがありません。ディレクトリをスキャンします...")
        if files_dir.exists():
            for file_path in files_dir.rglob("*"):
                if file_path.is_file():
                    relative_key = str(file_path.relative_to(files_dir))
                    file_list.append({
                        "key": relative_key,
                        "local_path": f"files/{relative_key}",
                    })

    for file_info in file_list:
        stats["total"] += 1
        object_key = file_info["key"]
        local_path = export_dir / file_info.get("local_path", f"files/{object_key}")

        if not local_path.exists():
            print(f"  ⚠ {object_key}: ファイルなし（スキップ）")
            stats["skipped"] += 1
            continue

        try:
            # 既存チェック
            try:
                client.stat_object(bucket, object_key)
                print(f"  - {object_key}: 既存（スキップ）")
                stats["skipped"] += 1
                continue
            except S3Error:
                pass  # 存在しない場合は続行

            # アップロード
            client.fput_object(bucket, object_key, str(local_path))
            stats["success"] += 1
            print(f"  ✓ {object_key}")

        except S3Error as e:
            print(f"  ✗ {object_key}: {e}")
            stats["failed"] += 1

    return stats


def main() -> None:
    """メイン処理"""
    import argparse

    parser = argparse.ArgumentParser(description="NoteDock データインポート")
    parser.add_argument(
        "export_dir",
        help="エクスポートディレクトリのパス",
    )
    parser.add_argument(
        "--db-only",
        action="store_true",
        help="データベースのみインポート（ファイルスキップ）",
    )
    parser.add_argument(
        "--files-only",
        action="store_true",
        help="ファイルのみインポート（データベーススキップ）",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="確認なしで既存データを削除",
    )
    parser.add_argument(
        "--no-clear",
        action="store_true",
        help="既存データを削除せずに追加（非推奨）",
    )
    args = parser.parse_args()

    export_dir = Path(args.export_dir)
    if not export_dir.exists():
        print(f"エラー: ディレクトリが見つかりません: {export_dir}")
        sys.exit(1)

    print("=" * 60)
    print("NoteDock データインポート")
    print("=" * 60)

    # マニフェスト読み込み
    try:
        manifest = load_manifest(export_dir)
    except FileNotFoundError as e:
        print(f"エラー: {e}")
        sys.exit(1)

    print(f"\nエクスポート情報:")
    print(f"  エクスポート日時: {manifest.get('exported_at', '不明')}")
    print(f"  元システム: {manifest.get('source_system', {}).get('db_host', '不明')}")

    config = get_env_config()
    print(f"\n移行先:")
    print(f"  DB: {config['db_host']}:{config['db_port']}/{config['db_name']}")
    print(f"  MinIO: {config['minio_endpoint']}/{config['minio_bucket']}")

    db_stats = {}
    file_stats = {}

    # データベースクリア
    if not args.files_only and not args.no_clear:
        clear_database(config, force=args.force)

    # データベースインポート
    if not args.files_only:
        db_stats = import_database(config, export_dir)

    # MinIOファイルインポート
    if not args.db_only:
        file_stats = import_minio_files(config, export_dir, manifest)

    # サマリー表示
    print("\n" + "=" * 60)
    print("インポート完了")
    print("=" * 60)
    if db_stats:
        total_records = sum(v for v in db_stats.values() if v >= 0)
        print(f"データベース: {total_records} レコード")
    if file_stats:
        print(f"ファイル: {file_stats.get('success', 0)}/{file_stats.get('total', 0)} 件")


if __name__ == "__main__":
    main()
