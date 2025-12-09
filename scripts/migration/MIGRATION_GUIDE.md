# NoteDock データ移行ガイド

このガイドでは、NoteDockのデータ（PostgreSQLデータベース + MinIOファイルストレージ）を別システムに移行する手順を説明します。

## 目次

1. [概要](#概要)
2. [事前準備](#事前準備)
3. [エクスポート手順](#エクスポート手順)
4. [インポート手順](#インポート手順)
5. [検証手順](#検証手順)
6. [トラブルシューティング](#トラブルシューティング)
7. [ロールバック手順](#ロールバック手順)

---

## 概要

### 移行対象データ

| データ種類 | 説明 | 格納先 |
|-----------|------|--------|
| ノート | タイトル、Markdownコンテンツ | PostgreSQL (notes) |
| フォルダ | 階層構造（最大3階層） | PostgreSQL (folders) |
| タグ | ノート分類用 | PostgreSQL (tags) |
| ファイル | 添付ファイル（画像等） | PostgreSQL (メタデータ) + MinIO (実体) |
| バージョン履歴 | ノートの変更履歴 | PostgreSQL (note_versions) |
| コメント | スレッド形式のコメント | PostgreSQL (comments) |
| リンク | ノート間リンク情報 | PostgreSQL (note_links) |
| アクティビティログ | 操作履歴 | PostgreSQL (activity_logs) |

### 移行の流れ

```
[移行元システム]                    [移行先システム]
     │                                   │
     │ 1. エクスポート                    │
     ├──────────────────►                │
     │    notedock_export_YYYYMMDD/      │
     │    ├─ database/*.json             │
     │    ├─ files/*                     │
     │    └─ manifest.json               │
     │                                   │
     │ 2. エクスポートデータ転送          │
     │ ─────────────────────────────────►│
     │    (scp, rsync, USB等)            │
     │                                   │
     │                      3. インポート │
     │                 ◄──────────────────┤
     │                                   │
```

---

## 事前準備

### 移行元システム

1. **サービス停止（推奨）**
   ```bash
   # データ整合性のため、移行中はサービスを停止
   docker compose stop frontend backend
   ```

2. **uvのインストール確認**
   ```bash
   # uvがインストールされていることを確認
   uv --version

   # インストールされていない場合
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

3. **接続情報の確認**
   ```bash
   # .env ファイルまたは環境変数を確認
   cat .env

   # 必要な環境変数:
   # DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
   # MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
   ```

### 移行先システム

1. **NoteDockの新規セットアップ**
   ```bash
   # Docker環境の起動（空のDBが作成される）
   docker compose up -d db minio minio-init

   # Alembicマイグレーション実行
   cd backend
   DB_HOST=localhost DB_PORT=5432 DB_USER=notedock \
   DB_PASSWORD=notedock DB_NAME=notedock \
   uv run alembic upgrade head
   ```

2. **接続確認**
   ```bash
   # PostgreSQL接続確認
   PGPASSWORD=notedock psql -h localhost -U notedock -d notedock -c "SELECT 1"

   # MinIO接続確認
   mc alias set notedock-target http://localhost:9000 notedock notedock-secret
   mc ls notedock-target
   ```

---

## エクスポート手順

### 基本的なエクスポート

```bash
cd /path/to/NoteDock/scripts/migration

# 環境変数を設定
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=notedock
export DB_PASSWORD=notedock
export DB_NAME=notedock
export MINIO_ENDPOINT=localhost:9000
export MINIO_ACCESS_KEY=notedock
export MINIO_SECRET_KEY=notedock-secret
export MINIO_BUCKET=notedock-files

# エクスポート実行（uvが依存パッケージを自動インストール）
uv run export_data.py
```

### オプション指定

```bash
# 出力先を指定
uv run export_data.py --output /path/to/backup

# データベースのみエクスポート
uv run export_data.py --db-only

# ファイルのみエクスポート
uv run export_data.py --files-only
```

### 出力例

```
============================================================
NoteDock データエクスポート
============================================================

接続情報:
  DB: localhost:5432/notedock
  MinIO: localhost:9000/notedock-files

出力先: /home/user/notedock_export_20241209_120000

=== データベースエクスポート開始 ===
  ✓ folders: 5 件
  ✓ tags: 12 件
  ✓ files: 45 件
  ✓ notes: 128 件
  ✓ note_versions: 340 件
  ✓ comments: 67 件
  ...

=== MinIO ファイルエクスポート開始 ===
  ✓ uploads/abc123.png (1,234,567 bytes)
  ✓ uploads/def456.pdf (2,345,678 bytes)
  ...

✓ マニフェスト作成: .../manifest.json

============================================================
エクスポート完了
============================================================
出力ディレクトリ: /home/user/notedock_export_20241209_120000
データベース: 597 レコード
ファイル: 45/45 件 (123,456,789 bytes)
```

---

## インポート手順

### エクスポートデータの転送

```bash
# 例: scpで転送
scp -r notedock_export_20241209_120000 user@target-server:/tmp/

# 例: rsyncで転送（大量ファイルの場合）
rsync -avz --progress notedock_export_20241209_120000/ \
  user@target-server:/tmp/notedock_export_20241209_120000/
```

### 移行先でのインポート

```bash
cd /path/to/NoteDock/scripts/migration

# 移行先の接続情報を設定
export TARGET_DB_HOST=localhost
export TARGET_DB_PORT=5432
export TARGET_DB_USER=notedock
export TARGET_DB_PASSWORD=notedock
export TARGET_DB_NAME=notedock
export TARGET_MINIO_ENDPOINT=localhost:9000
export TARGET_MINIO_ACCESS_KEY=notedock
export TARGET_MINIO_SECRET_KEY=notedock-secret
export TARGET_MINIO_BUCKET=notedock-files

# インポート実行（uvが依存パッケージを自動インストール）
uv run import_data.py /tmp/notedock_export_20241209_120000
```

### オプション指定

```bash
# 確認なしで実行（自動化用）
uv run import_data.py /path/to/export --force

# データベースのみインポート
uv run import_data.py /path/to/export --db-only

# ファイルのみインポート
uv run import_data.py /path/to/export --files-only

# 既存データを削除せずに追加（非推奨）
uv run import_data.py /path/to/export --no-clear
```

### 出力例

```
============================================================
NoteDock データインポート
============================================================

エクスポート情報:
  エクスポート日時: 2024-12-09T12:00:00
  元システム: source-server

移行先:
  DB: localhost:5432/notedock
  MinIO: localhost:9000/notedock-files

⚠ 移行先データベースの既存データを削除しますか？ (yes/no): yes

=== データベースクリア開始 ===
  ✓ activity_logs クリア
  ✓ note_links クリア
  ...

=== データベースインポート開始 ===
  ✓ folders: 5 件
  ✓ tags: 12 件
  ...

  シーケンスリセット中...

=== MinIO ファイルインポート開始 ===
  ✓ バケット 'notedock-files' を作成しました
  ✓ uploads/abc123.png
  ✓ uploads/def456.pdf
  ...

============================================================
インポート完了
============================================================
データベース: 597 レコード
ファイル: 45/45 件
```

---

## 検証手順

### 1. レコード数の確認

```bash
# 移行先でテーブルごとのレコード数を確認
PGPASSWORD=notedock psql -h localhost -U notedock -d notedock << EOF
SELECT 'notes' as table_name, COUNT(*) as count FROM notes
UNION ALL
SELECT 'folders', COUNT(*) FROM folders
UNION ALL
SELECT 'tags', COUNT(*) FROM tags
UNION ALL
SELECT 'files', COUNT(*) FROM files
UNION ALL
SELECT 'note_versions', COUNT(*) FROM note_versions
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
UNION ALL
SELECT 'note_links', COUNT(*) FROM note_links
ORDER BY table_name;
EOF
```

### 2. マニフェストとの比較

```bash
# manifest.json の database_stats と比較
cat /path/to/export/manifest.json | jq '.database_stats'
```

### 3. ファイル数の確認

```bash
# MinIOのファイル数を確認
mc ls --recursive notedock-target/notedock-files | wc -l

# manifest.json と比較
cat /path/to/export/manifest.json | jq '.file_stats'
```

### 4. アプリケーションでの動作確認

```bash
# 移行先でサービス起動
docker compose up -d

# ブラウザで確認
# - ノート一覧が表示されるか
# - 添付ファイル（画像等）が表示されるか
# - バージョン履歴が確認できるか
# - コメントが表示されるか
```

---

## トラブルシューティング

### エクスポート時のエラー

#### PostgreSQL接続エラー
```
psycopg2.OperationalError: could not connect to server
```
**対処法:**
- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME を確認
- PostgreSQLサービスが起動しているか確認
- ファイアウォール設定を確認

#### MinIO接続エラー
```
minio.error.S3Error: Access Denied
```
**対処法:**
- MINIO_ACCESS_KEY, MINIO_SECRET_KEY を確認
- MINIO_ENDPOINT のプロトコル（http/https）を確認
- バケットのアクセス権限を確認

### インポート時のエラー

#### 外部キー制約エラー
```
psycopg2.errors.ForeignKeyViolation
```
**対処法:**
- `--force` オプションで既存データをクリアしてから再実行
- マイグレーションが完了しているか確認

#### シーケンスエラー
```
duplicate key value violates unique constraint
```
**対処法:**
- シーケンスリセットが正しく行われたか確認
- 手動でシーケンスをリセット:
  ```sql
  SELECT setval('notes_id_seq', (SELECT MAX(id) FROM notes) + 1);
  ```

#### ファイル不整合
```
⚠ uploads/xxx.png: ファイルなし（スキップ）
```
**対処法:**
- エクスポートディレクトリの files/ 内にファイルがあるか確認
- manifest.json の file_list を確認

---

## ロールバック手順

移行に問題があった場合のロールバック手順です。

### 移行元システムの復旧

```bash
# 移行元のサービスを再起動
docker compose up -d
```

### 移行先のクリーンアップ

```bash
# データベースをクリア
PGPASSWORD=notedock psql -h localhost -U notedock -d notedock << EOF
TRUNCATE TABLE activity_logs, note_links, note_files, note_tags,
               comments, note_versions, notes, files, tags, folders
CASCADE;
EOF

# MinIOバケットを空にする
mc rm --recursive --force notedock-target/notedock-files
```

---

## 補足情報

### エクスポートディレクトリ構造

```
notedock_export_20241209_120000/
├── manifest.json          # エクスポートメタデータ
├── database/
│   ├── folders.json       # フォルダデータ
│   ├── tags.json          # タグデータ
│   ├── files.json         # ファイルメタデータ
│   ├── notes.json         # ノートデータ
│   ├── note_versions.json # バージョン履歴
│   ├── comments.json      # コメントデータ
│   ├── note_links.json    # ノート間リンク
│   ├── note_tags.json     # ノート-タグ関連
│   ├── note_files.json    # ノート-ファイル関連
│   └── activity_logs.json # アクティビティログ
└── files/
    └── uploads/           # MinIOからダウンロードしたファイル
        ├── abc123.png
        ├── def456.pdf
        └── ...
```

### 環境変数一覧

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| DB_HOST | PostgreSQLホスト | localhost |
| DB_PORT | PostgreSQLポート | 5432 |
| DB_USER | PostgreSQLユーザー | notedock |
| DB_PASSWORD | PostgreSQLパスワード | notedock |
| DB_NAME | データベース名 | notedock |
| MINIO_ENDPOINT | MinIOエンドポイント | localhost:9000 |
| MINIO_ACCESS_KEY | MinIOアクセスキー | notedock |
| MINIO_SECRET_KEY | MinIOシークレットキー | notedock-secret |
| MINIO_BUCKET | MinIOバケット名 | notedock-files |
| MINIO_SECURE | HTTPS使用 | false |

移行先用のプレフィックス `TARGET_` を付けると、移行先専用の設定になります。

---

## サポート

問題が発生した場合は、以下の情報を添えて報告してください：

1. 実行したコマンド
2. エラーメッセージ全文
3. manifest.json の内容
4. 環境情報（OS、Python版、Docker版）
