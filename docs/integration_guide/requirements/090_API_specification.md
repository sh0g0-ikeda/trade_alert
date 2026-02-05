# 9. API仕様

本章では、モバイルアプリ（React Native / JS）から利用する **バックエンドREST API** の仕様を定義する。
全APIは **JSON** を入出力とし、認証には **JWT ベアラートークン** を使用する。

---

## 9.1 共通仕様

### 9.1.1 ベースURL

* `https://api.example.com/v1`（仮）

以下、パスは `/v1` 以降で記載する。

---

### 9.1.2 認証

* 認証が必要なエンドポイントは、HTTPヘッダに以下を付与する：

```http
Authorization: Bearer <access_token>
```

* `access_token` は `/auth/login` または `/auth/signup` のレスポンスで返される。

---

### 9.1.3 共通レスポンス形式

#### 正常系（例）

```json
{
  "success": true,
  "data": { ... }
}
```

#### エラー系

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "メールアドレスまたはパスワードが正しくありません。"
  }
}
```

代表的な `error.code` 例：

* `VALIDATION_ERROR`
* `UNAUTHORIZED`
* `FORBIDDEN`
* `NOT_FOUND`
* `RATE_LIMITED`
* `PLAN_LIMIT_EXCEEDED`
* `INTERNAL_ERROR`

---

### 9.1.4 ページネーション（通知履歴など）

* クエリパラメータ：

  * `limit`（1〜100、デフォルト20）
  * `cursor`（次ページ取得用トークン）

* レスポンス例：

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "next_cursor": "eyJpZCI6ICJhYmMxMjM0In0="
  }
}
```

`next_cursor` が `null` または存在しない場合は末尾。

---

## 9.2 エンドポイント一覧

| 分類     | メソッド   | パス                             | 説明                 |
| ------ | ------ | ------------------------------ | ------------------ |
| 認証     | POST   | `/auth/signup`                 | 新規登録               |
| 認証     | POST   | `/auth/login`                  | ログイン               |
| ユーザー   | GET    | `/user/me`                     | 自分の情報取得            |
| プラン    | GET    | `/user/plan`                   | 現在プラン情報取得          |
| プラン    | POST   | `/subscriptions/verify`        | サブスクレシート検証         |
| プッシュ   | POST   | `/push/register`               | FCMトークン登録          |
| 銘柄マスタ  | GET    | `/assets/search`               | 銘柄検索               |
| ユーザー銘柄 | GET    | `/user/assets`                 | 自分の監視銘柄一覧          |
| ユーザー銘柄 | POST   | `/user/assets`                 | 銘柄登録               |
| ユーザー銘柄 | PUT    | `/user/assets/{user_asset_id}` | 銘柄設定更新（基準値等）       |
| ユーザー銘柄 | DELETE | `/user/assets/{user_asset_id}` | 監視銘柄削除             |
| 価格     | GET    | `/prices/current`              | 単一銘柄の現在価格参照（必要時のみ） |
| 通知履歴   | GET    | `/notifications/history`       | 通知履歴一覧取得           |
| スクショ   | POST   | `/screenshot/import`           | 保有銘柄スクショ解析＆候補返却    |
| スクショ   | POST   | `/screenshot/import/confirm`   | 候補から実際に銘柄登録        |

※バッチ系（価格取得・アラート判定・通知送信）は内部用であり、ここでは外部公開APIのみ記載。

---

## 9.3 各API詳細

### 9.3.1 サインアップ：`POST /auth/signup`

**概要**

新規ユーザーを登録し、ログイン状態のトークンを返す。

**リクエスト**

```json
{
  "email": "user@example.com",
  "password": "password1234"
}
```

* `email`：必須、メール形式
* `password`：必須、8文字以上

**レスポンス（成功）**

```json
{
  "success": true,
  "data": {
    "user_id": "uuid-xxxx",
    "access_token": "jwt-token",
    "plan_type": "free"
  }
}
```

---

### 9.3.2 ログイン：`POST /auth/login`

**リクエスト**

```json
{
  "email": "user@example.com",
  "password": "password1234"
}
```

**レスポンス（成功）**

```json
{
  "success": true,
  "data": {
    "user_id": "uuid-xxxx",
    "access_token": "jwt-token",
    "plan_type": "free"
  }
}
```

**エラー**

* `401 UNAUTHORIZED` + `INVALID_CREDENTIALS`

---

### 9.3.3 自分の情報取得：`GET /user/me`

**認証必須**

**レスポンス**

```json
{
  "success": true,
  "data": {
    "user_id": "uuid-xxxx",
    "email": "user@example.com",
    "plan_type": "free",
    "plan_expiry": "2025-12-31T23:59:59Z"
  }
}
```

---

### 9.3.4 現在プラン取得：`GET /user/plan`

**レスポンス**

```json
{
  "success": true,
  "data": {
    "plan_type": "free",
    "plan_expiry": null,
    "limits": {
      "max_assets": 6,
      "screenshot_import_per_month": 2,
      "monitoring_hours": "08:00-24:00",
      "check_interval_hours": 4
    }
  }
}
```

---

### 9.3.5 サブスク検証：`POST /subscriptions/verify`

**概要**

ストア（App Store / Google Play）のレシートを検証し、有料プランを有効化する。

**リクエスト**

```json
{
  "platform": "android", 
  "receipt": "string-or-json"
}
```

* `platform`: `"android"` or `"ios"`
* `receipt`: ストアから取得したレシートデータ（文字列化）

**レスポンス（成功例）**

```json
{
  "success": true,
  "data": {
    "plan_type": "paid",
    "plan_expiry": "2026-01-31T23:59:59Z"
  }
}
```

---

### 9.3.6 プッシュトークン登録：`POST /push/register`

**概要**

FCMのデバイストークンを保存し、通知送信用に使う。

**認証必須**

**リクエスト**

```json
{
  "device_id": "device-uuid",
  "push_token": "fcm-token",
  "platform": "android"
}
```

**レスポンス**

```json
{
  "success": true,
  "data": {}
}
```

---

### 9.3.7 銘柄検索：`GET /assets/search`

**概要**

銘柄マスタから、資産クラス＋クエリで検索。

**クエリパラメータ**

* `class`（必須）：`stock` / `crypto` / `fx` / `commodity` / `index`
* `query`（必須）：ティッカー or 名称の一部（2〜3文字以上）
* `limit`（任意）：最大件数（デフォルト20）

**例**

`GET /assets/search?class=stock&query=AAPL`

**レスポンス**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "asset_id": "uuid-asset",
        "asset_class": "stock",
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "exchange": "NASDAQ",
        "currency": "USD"
      }
    ]
  }
}
```

---

### 9.3.8 自分の監視銘柄一覧：`GET /user/assets`

**概要**

ユーザーが登録した監視銘柄（UserAssetSettings）一覧を返す。

**認証必須**

**レスポンス**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "user_asset_id": "uuid-user-asset",
        "asset": {
          "asset_id": "uuid-asset",
          "asset_class": "stock",
          "ticker": "AAPL",
          "name": "Apple Inc.",
          "currency": "USD"
        },
        "base_price": 150.0,
        "alert_up_pct": 5.0,
        "alert_down_pct": 5.0,
        "last_notified_price": 142.2,
        "last_notified_at": "2025-12-02T08:00:00Z"
      }
    ]
  }
}
```

---

### 9.3.9 銘柄登録：`POST /user/assets`

**概要**

ユーザーに新しく監視銘柄を追加する。

**認証必須**

**リクエスト**

```json
{
  "asset_id": "uuid-asset",
  "base_price": 150.0,
  "alert_up_pct": 5.0,
  "alert_down_pct": 5.0
}
```

* `asset_id`：必須
* `base_price`：任意。null の場合はサーバー側で現在価格を初期値として設定。
* `alert_up_pct` / `alert_down_pct`：

  * 有料プラン：任意（1〜50の範囲）
  * 無料プラン：受け取っても無視して 5% 固定として扱う

**レスポンス（成功）**

```json
{
  "success": true,
  "data": {
    "user_asset_id": "uuid-user-asset"
  }
}
```

**エラー例**

* 無料プランで上限6銘柄を超えた場合
  → `400` + `PLAN_LIMIT_EXCEEDED`

---

### 9.3.10 銘柄設定更新：`PUT /user/assets/{user_asset_id}`

**概要**

既存の監視銘柄の設定（基準価格・しきい値等）を更新。

**認証必須**

**リクエスト**

```json
{
  "base_price": 120.0,
  "alert_up_pct": 3.0,
  "alert_down_pct": 8.0
}
```

* すべて任意フィールド
* `null` の場合はその項目は更新しない

**レスポンス**

```json
{
  "success": true,
  "data": {}
}
```

**備考**

* 無料プランの場合、`alert_*` の更新要求は無視して `±5%` を維持。
* 有料プランの場合のみ `alert_*` を反映。

---

### 9.3.11 銘柄削除：`DELETE /user/assets/{user_asset_id}`

**概要**

監視対象銘柄から外す。

**レスポンス**

```json
{
  "success": true,
  "data": {}
}
```

---

### 9.3.12 現在価格取得（任意）：`GET /prices/current`

**概要**

フロント側が「今の価格を確認したい」場合にのみ使用（基本は一覧はサーバーの PriceCache レスポンスで足りる）。

**クエリパラメータ**

* `asset_id`（必須）

**レスポンス**

```json
{
  "success": true,
  "data": {
    "asset_id": "uuid-asset",
    "price": 142.2,
    "currency": "USD",
    "price_at": "2025-12-02T08:00:00Z"
  }
}
```

---

### 9.3.13 通知履歴取得：`GET /notifications/history`

**概要**

最近の通知を取得し、アプリの「通知履歴」画面で表示する。

**クエリパラメータ**

* `limit`（任意、デフォルト20）
* `cursor`（任意、ページネーション用）

**レスポンス**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "notification_id": "uuid-noti",
        "asset": {
          "asset_id": "uuid-asset",
          "asset_class": "crypto",
          "ticker": "BTC",
          "name": "Bitcoin"
        },
        "direction": "down",
        "change_pct": -10.2,
        "notified_price": 38000.0,
        "notified_at": "2025-12-02T04:00:00Z"
      }
    ],
    "next_cursor": null
  }
}
```

# 9.3.14 スクショ一括インポート（解析）：`POST /screenshot/import`

**概要**

証券アプリなどの「保有銘柄一覧」のスクリーンショットをアップロードし、
**DeepSeek の Vision モデル**で解析して、銘柄候補リストを返す。

* 外部に公開するAPI仕様としては、
  　「画像を送ると `candidates` が返ってくる」というインターフェースに固定
* DeepSeek を使うかどうかは**内部実装の話**として隠蔽する

---

### 認証

* 必須（`Authorization: Bearer <token>`）

---

### リクエスト

`Content-Type: multipart/form-data`

フィールド：

* `image`：PNG / JPEG のスクリーンショットファイル
  （証券アプリの保有銘柄一覧画面など）

#### 例（概念）

```http
POST /screenshot/import
Content-Type: multipart/form-data; boundary=...

--boundary
Content-Disposition: form-data; name="image"; filename="portfolio.png"
Content-Type: image/png

<binary...>
--boundary--
```

---

### レスポンス（成功）

```json
{
  "success": true,
  "data": {
    "import_id": "uuid-import-session",
    "candidates": [
      {
        "asset_id": "uuid-asset-1",
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "detected_base_price": 150.0,
        "detected_currency": "USD"
      },
      {
        "asset_id": "uuid-asset-2",
        "ticker": "MSFT",
        "name": "Microsoft Corporation",
        "detected_base_price": 300.5,
        "detected_currency": "USD"
      }
    ]
  }
}
```

* `import_id`：この解析セッションを一意に識別するID
  → `/screenshot/import/confirm` で利用
* `candidates`：DeepSeek が認識した銘柄候補

  * `asset_id`：内部の `AssetMaster` のID
  * `ticker` / `name`：人間向け表示用
  * `detected_base_price`：スクショ上の取得単価・平均取得単価など（候補）
  * `detected_currency`：通貨（`USD` / `JPY` など）

---

### エラー例

* 画像無しで送られた場合：
  → `400` + `VALIDATION_ERROR`
* DeepSeek API 失敗（タイムアウト、429など）：
  → `502` もしくは `500` + `EXTERNAL_VISION_ERROR`
  （ユーザーには「解析に失敗しました。時間をおいて再度お試しください」と返す）

---

### 内部実装メモ（DeepSeek 前提）

※API仕様書に「補足メモ」として残しておくイメージ

1. フロント → バックエンドへの流れ

   * Android / iOS アプリから画像ファイルを multipart で送信
   * FastAPI が一時的に S3 に保存 or メモリ上で扱う

2. DeepSeek 呼び出し

   * Python から DeepSeek の Vision API を叩く
   * プロンプトで「銘柄名」「ティッカー」「価格」「通貨」などを抽出するよう指示
   * レスポンスは LLMのJSON or text をパースして構造化

3. AssetMaster とのマッピング

   * 抽出された `ticker` / `name` を `AssetMaster` に突っ込んで最も近い銘柄にマップ
   * マッチしなかったものは `candidates` に含めない or 「unknown」として扱う

4. 画像削除

   * S3 に置いた場合は解析完了後すぐ削除
   * ライフサイクルルールも11時間〜1日程度で削除する設定を入れる

5. コスト

   * DeepSeek はトークン単価が安いので、
     「月数百枚〜千枚レベルのスクショ解析」があっても十分コスト内に収まる前提

---

# 9.3.15 スクショ一括インポート（確定）：`POST /screenshot/import/confirm`


### 概要

解析結果からユーザーが登録したい銘柄を選び、
まとめて `UserAssetSettings` に登録する。

---

### 認証

* 必須

---

### リクエスト

```json
{
  "import_id": "uuid-import-session",
  "assets": [
    {
      "asset_id": "uuid-asset-1",
      "base_price": 148.0
    },
    {
      "asset_id": "uuid-asset-2",
      "base_price": 300.5
    }
  ]
}
```

* `import_id`：直前の `/screenshot/import` で返ってきたID
* `assets`：

  * `asset_id`：登録したい銘柄
  * `base_price`：ユーザーが確認・修正した基準価格

---

### レスポンス（成功）

```json
{
  "success": true,
  "data": {
    "created_user_asset_ids": [
      "uuid-user-asset-1",
      "uuid-user-asset-2"
    ]
  }
}
```

---

### エラー例

* `import_id` が存在しない / 期限切れ
  → `400` + `IMPORT_SESSION_EXPIRED`
* 無料プランでスクショ利用上限を超えている
  → `400` + `PLAN_LIMIT_EXCEEDED`
* 無料プランで銘柄登録数上限超過（6銘柄超）
  → 同じく `PLAN_LIMIT_EXCEEDED`

---

