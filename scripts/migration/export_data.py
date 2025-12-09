#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "psycopg2-binary>=2.9.9",
#     "minio>=7.2.0",
# ]
# ///
"""
NoteDock データエクスポートスクリプト

PostgreSQLデータベースとMinIOストレージから全データをエクスポートします。
出力: タイムスタンプ付きディレクトリに以下を格納
  - database/: 各テーブルのJSONファイル
  - files/: MinIOからダウンロードした全ファイル
  - manifest.json: エクスポートメタデータ

Usage:
  uv run export_data.py [--output DIR] [--db-only] [--files-only]
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor
from minio import Minio
from minio.error import S3Error


def get_env_config() -> dict[str, Any]:
    """環境変数から設定を取得"""
    return {
        "db_host": os.environ.get("DB_HOST", "localhost"),
        "db_port": int(os.environ.get("DB_PORT", "5432")),
        "db_user": os.environ.get("DB_USER", "notedock"),
        "db_password": os.environ.get("DB_PASSWORD", "notedock"),
        "db_name": os.environ.get("DB_NAME", "notedock"),
        "minio_endpoint": os.environ.get("MINIO_ENDPOINT", "localhost:9000"),
        "minio_access_key": os.environ.get("MINIO_ACCESS_KEY", "notedock"),
        "minio_secret_key": os.environ.get("MINIO_SECRET_KEY", "notedock-secret"),
        "minio_bucket": os.environ.get("MINIO_BUCKET", "notedock-files"),
        "minio_secure": os.environ.get("MINIO_SECURE", "false").lower() == "true",
    }


def create_export_directory(base_path: str | None = None) -> Path:
    """エクスポート用ディレクトリを作成"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if base_path:
        export_dir = Path(base_path) / f"notedock_export_{timestamp}"
    else:
        export_dir = Path.cwd() / f"notedock_export_{timestamp}"

    export_dir.mkdir(parents=True, exist_ok=True)
    (export_dir / "database").mkdir(exist_ok=True)
    (export_dir / "files").mkdir(exist_ok=True)

    return export_dir


def export_database(config: dict[str, Any], export_dir: Path) -> dict[str, int]:
    """データベースからJSONエクスポート"""
    print("\n=== データベースエクスポート開始 ===")

    conn = psycopg2.connect(
        host=config["db_host"],
        port=config["db_port"],
        user=config["db_user"],
        password=config["db_password"],
        dbname=config["db_name"],
    )

    # エクスポート対象テーブル（依存関係順）
    tables = [
        "folders",
        "tags",
        "files",
        "notes",
        "note_versions",
        "comments",
        "note_links",
        "note_tags",
        "note_files",
        "activity_logs",
    ]

    stats = {}
    db_dir = export_dir / "database"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        for table in tables:
            try:
                cur.execute(f"SELECT * FROM {table}")
                rows = cur.fetchall()

                # datetime/date型をISO形式に変換
                serialized_rows = []
                for row in rows:
                    serialized_row = {}
                    for key, value in dict(row).items():
                        if isinstance(value, datetime):
                            serialized_row[key] = value.isoformat()
                        else:
                            serialized_row[key] = value
                    serialized_rows.append(serialized_row)

                # JSONファイルに出力
                output_file = db_dir / f"{table}.json"
                with open(output_file, "w", encoding="utf-8") as f:
                    json.dump(serialized_rows, f, ensure_ascii=False, indent=2)

                stats[table] = len(rows)
                print(f"  ✓ {table}: {len(rows)} 件")

            except psycopg2.Error as e:
                print(f"  ✗ {table}: エラー - {e}")
                stats[table] = -1

    conn.close()
    return stats


def export_minio_files(config: dict[str, Any], export_dir: Path) -> dict[str, Any]:
    """MinIOからファイルをエクスポート"""
    print("\n=== MinIO ファイルエクスポート開始 ===")

    client = Minio(
        config["minio_endpoint"],
        access_key=config["minio_access_key"],
        secret_key=config["minio_secret_key"],
        secure=config["minio_secure"],
    )

    bucket = config["minio_bucket"]
    files_dir = export_dir / "files"

    stats = {
        "total_files": 0,
        "total_bytes": 0,
        "success": 0,
        "failed": 0,
        "file_list": [],
    }

    try:
        if not client.bucket_exists(bucket):
            print(f"  ⚠ バケット '{bucket}' が存在しません")
            return stats

        objects = client.list_objects(bucket, recursive=True)

        for obj in objects:
            stats["total_files"] += 1
            object_name = obj.object_name

            # ディレクトリ構造を維持してダウンロード
            local_path = files_dir / object_name
            local_path.parent.mkdir(parents=True, exist_ok=True)

            try:
                client.fget_object(bucket, object_name, str(local_path))
                stats["success"] += 1
                stats["total_bytes"] += obj.size or 0
                stats["file_list"].append({
                    "key": object_name,
                    "size": obj.size,
                    "local_path": str(local_path.relative_to(export_dir)),
                })
                print(f"  ✓ {object_name} ({obj.size:,} bytes)")
            except S3Error as e:
                stats["failed"] += 1
                print(f"  ✗ {object_name}: {e}")

    except S3Error as e:
        print(f"  ✗ MinIOエラー: {e}")

    return stats


def create_manifest(export_dir: Path, db_stats: dict, file_stats: dict, config: dict) -> None:
    """エクスポートマニフェストを作成"""
    manifest = {
        "export_version": "1.0",
        "exported_at": datetime.now().isoformat(),
        "source_system": {
            "db_host": config["db_host"],
            "db_name": config["db_name"],
            "minio_endpoint": config["minio_endpoint"],
            "minio_bucket": config["minio_bucket"],
        },
        "database_stats": db_stats,
        "file_stats": {
            "total_files": file_stats["total_files"],
            "success": file_stats["success"],
            "failed": file_stats["failed"],
            "total_bytes": file_stats["total_bytes"],
        },
        "file_list": file_stats.get("file_list", []),
    }

    manifest_path = export_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n✓ マニフェスト作成: {manifest_path}")


def main() -> None:
    """メイン処理"""
    import argparse

    parser = argparse.ArgumentParser(description="NoteDock データエクスポート")
    parser.add_argument(
        "--output", "-o",
        help="出力先ディレクトリ（デフォルト: カレントディレクトリ）",
        default=None,
    )
    parser.add_argument(
        "--db-only",
        action="store_true",
        help="データベースのみエクスポート（ファイルスキップ）",
    )
    parser.add_argument(
        "--files-only",
        action="store_true",
        help="ファイルのみエクスポート（データベーススキップ）",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("NoteDock データエクスポート")
    print("=" * 60)

    config = get_env_config()
    print(f"\n接続情報:")
    print(f"  DB: {config['db_host']}:{config['db_port']}/{config['db_name']}")
    print(f"  MinIO: {config['minio_endpoint']}/{config['minio_bucket']}")

    # エクスポートディレクトリ作成
    export_dir = create_export_directory(args.output)
    print(f"\n出力先: {export_dir}")

    db_stats = {}
    file_stats = {"total_files": 0, "success": 0, "failed": 0, "total_bytes": 0}

    # データベースエクスポート
    if not args.files_only:
        db_stats = export_database(config, export_dir)

    # MinIOファイルエクスポート
    if not args.db_only:
        file_stats = export_minio_files(config, export_dir)

    # マニフェスト作成
    create_manifest(export_dir, db_stats, file_stats, config)

    # サマリー表示
    print("\n" + "=" * 60)
    print("エクスポート完了")
    print("=" * 60)
    print(f"出力ディレクトリ: {export_dir}")
    print(f"データベース: {sum(v for v in db_stats.values() if v >= 0)} レコード")
    print(f"ファイル: {file_stats['success']}/{file_stats['total_files']} 件 ({file_stats['total_bytes']:,} bytes)")


if __name__ == "__main__":
    main()
