# Discord Webhook 連携ガイド

NoteDockでは、Discord Webhookを使用してノートやコメントの更新通知をDiscordチャンネルに送信できます。

## 目次

1. [機能概要](#機能概要)
2. [セットアップ手順](#セットアップ手順)
3. [通知の種類](#通知の種類)
4. [トラブルシューティング](#トラブルシューティング)

---

## 機能概要

Discord Webhook連携を有効にすると、以下のイベント発生時にDiscordチャンネルへ自動通知が送信されます：

- 新規ノート作成
- ノート更新
- コメント投稿

通知はDiscord Embed形式で送信され、ノートへの直接リンクも含まれます。

---

## セットアップ手順

### 1. Discord Webhookの作成

1. Discordで通知を受け取りたいチャンネルを開く
2. チャンネル設定（歯車アイコン）をクリック
3. **連携サービス** > **ウェブフック** を選択
4. **新しいウェブフック** をクリック
5. Webhook名を設定（例: `NoteDock通知`）
6. **ウェブフックURLをコピー** をクリック

### 2. 環境変数の設定

コピーしたWebhook URLを環境変数に設定します。

#### ローカル開発環境

`.env` ファイルを編集：

```bash
# Discord Webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXXXXXXXXX/YYYYYYYYYY
```

#### Docker環境

`docker-compose.yml` の backend サービスに環境変数を追加：

```yaml
services:
  backend:
    environment:
      - DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXXXXXXXXX/YYYYYYYYYY
```

または、`.env` ファイルに記載してdocker-composeで読み込み：

```yaml
services:
  backend:
    env_file:
      - .env
```

### 3. 設定の確認

バックエンドを再起動すると、Discord通知が有効になります。

```bash
# ローカル環境
cd backend && uv run uvicorn app.main:app --reload

# Docker環境
docker compose restart backend
```

---

## 通知の種類

### ノート作成通知

新しいノートが作成されたときに送信されます。

| 項目 | 内容 |
|------|------|
| タイトル | 📝 新しいノートが作成されました |
| 色 | 緑 (#57F287) |
| 内容 | ノートタイトル、ノートID、リンク |

**表示例:**

```
📝 新しいノートが作成されました
──────────────────────────
プロジェクト設計書

ノートID: #42
[ノートを開く]
```

### ノート更新通知

既存のノートが更新されたときに送信されます。

| 項目 | 内容 |
|------|------|
| タイトル | ✏️ ノートが更新されました |
| 色 | 黄色 (#FEE75C) |
| 内容 | ノートタイトル、ノートID、リンク |

### コメント投稿通知

ノートに新しいコメントが投稿されたときに送信されます。

| 項目 | 内容 |
|------|------|
| タイトル | 💬 新しいコメントが投稿されました |
| 色 | Discord Blurple (#5865F2) |
| 内容 | ノートタイトル、コメントプレビュー、投稿者名、リンク |

**表示例:**

```
💬 新しいコメントが投稿されました
──────────────────────────
プロジェクト設計書

> このセクションについて質問があります...

投稿者: 田中太郎
ノートID: #42
[コメントを見る]
```

---

## 通知の無効化

Discord通知を無効にするには、環境変数を空にするか削除します：

```bash
# .env
DISCORD_WEBHOOK_URL=
```

Webhook URLが設定されていない場合、通知処理はスキップされ、エラーにはなりません。

---

## トラブルシューティング

### 通知が送信されない

1. **Webhook URLの確認**
   - URLが正しくコピーされているか確認
   - URLが `https://discord.com/api/webhooks/` で始まっているか確認

2. **環境変数の確認**
   ```bash
   # バックエンドコンテナ内で確認
   docker compose exec backend env | grep DISCORD
   ```

3. **ログの確認**
   ```bash
   # バックエンドログを確認
   docker compose logs -f backend | grep -i discord
   ```

### 通知がタイムアウトする

Discord APIへのリクエストは10秒でタイムアウトします。ネットワーク環境を確認してください。

通知はバックグラウンドタスクとして実行されるため、タイムアウトしてもAPI応答には影響しません。

### Webhookが削除された場合

Discord側でWebhookを削除すると、通知送信時に警告ログが出力されます：

```
Discord webhook returned 404: {"message": "Unknown Webhook", ...}
```

新しいWebhook URLを設定してください。

---

## 技術仕様

### リクエスト形式

```json
{
  "username": "NoteDock",
  "embeds": [
    {
      "title": "📝 新しいノートが作成されました",
      "description": "**ノートタイトル**",
      "color": 5763719,
      "url": "http://localhost:3000/notes/42",
      "fields": [
        {
          "name": "ノートID",
          "value": "#42",
          "inline": true
        }
      ]
    }
  ]
}
```

### 設定オプション

| 環境変数 | 説明 | デフォルト |
|---------|------|-----------|
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL | 空（無効） |

### 関連ファイル

- [backend/app/services/discord_service.py](../backend/app/services/discord_service.py) - Discordサービス実装
- [backend/app/core/config.py](../backend/app/core/config.py) - 設定管理
