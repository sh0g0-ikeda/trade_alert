# 5. 機能要件（バックエンド側）

バックエンドは、以下の3つの役割を担う。

1. 認証・ユーザー／銘柄設定の管理（APIサーバー）
2. 価格取得・アラート判定（バッチ／ジョブ）
3. プラン（無料／有料）の管理と制御

ここでは、「どんなテーブルを持ち」「どのジョブがいつ何をするか」まで具体的に書く。

---

## 5.1 全体アーキテクチャ（役割分担）

* 構成イメージ（AWS前提で記述、他クラウドでも置き換え可能）

  * API層：API Gateway → Lambda (or Container)
  * データストア：

    * `DynamoDB`（ユーザー／銘柄設定／ログ）
  * キャッシュ：

    * `PriceCache`用の DynamoDB or Redis
  * バッチ：

    * EventBridge（旧 CloudWatch Events）で Lambda を定期起動
  * 通知：

    * Lambda → APNs / FCM へ HTTP リクエスト

> ポイント：
> 「ユーザーのアクセスで価格APIを叩かない」
> → すべてバッチでユニーク銘柄ごとに取得し、キャッシュに載せる。

---

## 5.2 データモデル仕様

テーブル名は一例。NoSQL前提で「主キー」を明示する。

### 5.2.1 `Users`

ユーザーアカウント情報。

* 主キー：`user_id`（UUID）

| フィールド名        | 型        | 説明              |
| ------------- | -------- | --------------- |
| user_id       | string   | ユーザーID          |
| email         | string   | ログイン用メールアドレス    |
| password_hash | string   | ハッシュ済パスワード      |
| plan_type     | string   | `free` / `paid` |
| plan_expiry   | datetime | 有料プランの有効期限（任意）  |
| created_at    | datetime | 作成日時            |
| updated_at    | datetime | 更新日時            |

---

### 5.2.2 `AssetMaster`

監視対象の銘柄マスタ。

* 主キー：`asset_id`（UUID）
* セカンダリ：`asset_class + ticker` で検索できるようにする

| フィールド名        | 型        | 説明                                                |
| ------------- | -------- | ------------------------------------------------- |
| asset_id      | string   | 銘柄ID                                              |
| asset_class   | string   | `stock` / `crypto` / `fx` / `commodity` / `index` |
| ticker        | string   | `AAPL`, `BTC`, `USD/JPY` など                       |
| name          | string   | 銘柄名                                               |
| exchange      | string   | 取引所（株式用）                                          |
| currency      | string   | 価格通貨（USD, JPY 等）                                  |
| enabled       | bool     | アプリで検索／監視対象にするか                                   |
| provider_code | string   | どのAPIで取るかを示すコード                                   |
| created_at    | datetime | 作成日時                                              |
| updated_at    | datetime | 更新日時                                              |

---

### 5.2.3 `UserAssetSettings`

ユーザーが登録した銘柄と、そのアラート設定。

* 主キー：`user_asset_id`（UUID）
* インデックス：`user_id` で絞れるようにする

| フィールド名              | 型        | 説明                      |
| ------------------- | -------- | ----------------------- |
| user_asset_id       | string   | ユーザー銘柄設定ID              |
| user_id             | string   | ユーザーID                  |
| asset_id            | string   | `AssetMaster` への参照      |
| base_price          | number   | 基準価格（ユーザーが設定 or 初期＝現在値） |
| alert_up_pct        | number   | 上昇側のしきい値（％）             |
| alert_down_pct      | number   | 下落側のしきい値（％）             |
| last_notified_price | number   | 最後に通知したときの価格            |
| last_notified_at    | datetime | 最後に通知した日時               |
| cooldown_until      | datetime | 次に通知可能になる時刻（仮想通貨など用）    |
| created_at          | datetime | 作成日時                    |
| updated_at          | datetime | 更新日時                    |

> 無料プランでは、`alert_up_pct` / `alert_down_pct` は内部的に `5` 固定として扱う。

---

### 5.2.4 `PriceCache`

最新価格のキャッシュ。バッチで更新される。

* 主キー：`asset_id`

| フィールド名     | 型        | 説明                              |
| ---------- | -------- | ------------------------------- |
| asset_id   | string   | 銘柄ID                            |
| price      | number   | 最新価格                            |
| price_at   | datetime | 価格取得時刻（APIレスポンス時刻）              |
| provider   | string   | 取得元API（marketstack/coingecko 等） |
| updated_at | datetime | 更新日時                            |

---

### 5.2.5 `NotificationLogs`

送信した通知のログ。

* 主キー：`notification_id`（UUID）
* インデックス：`user_id`、`asset_id`、`notified_at`

| フィールド名          | 型        | 説明                |
| --------------- | -------- | ----------------- |
| notification_id | string   | 通知ID              |
| user_id         | string   | ユーザーID            |
| asset_id        | string   | 銘柄ID              |
| user_asset_id   | string   | ユーザー銘柄設定ID        |
| notified_price  | number   | 通知時の価格            |
| change_pct      | number   | 変動率（基準 or 前回通知から） |
| direction       | string   | `up` or `down`    |
| notified_at     | datetime | 通知送信時刻            |
| created_at      | datetime | 作成日時              |

> 通知履歴画面は、このテーブルをもとにAPIで返す。

---

### 5.2.6 `PushTokens`

各ユーザーのデバイストークン。

* 主キー：`user_id + device_id`

| フィールド名     | 型        | 説明                   |
| ---------- | -------- | -------------------- |
| user_id    | string   | ユーザーID               |
| device_id  | string   | クライアント側で生成した一意ID     |
| push_token | string   | APNs / FCM のデバイストークン |
| platform   | string   | `ios` / `android`    |
| created_at | datetime | 登録日時                 |
| updated_at | datetime | 更新日時                 |

---

### 5.2.7 `Subscriptions`（任意）

ストアのサブスク情報。

| フィールド名           | 型        | 説明                |
| ---------------- | -------- | ----------------- |
| user_id          | string   | ユーザーID            |
| platform         | string   | `ios` / `android` |
| original_receipt | string   | レシートデータ（トークン化）    |
| plan_type        | string   | `paid` など         |
| plan_expiry      | datetime | 有効期限              |
| last_verified_at | datetime | レシート検証を行った日時      |

---

## 5.3 API機能（ざっくり一覧）

ここは詳細な OpenAPI までは書かず、「バックエンド側が提供する機能」を列挙する。

1. 認証系

   * `POST /auth/signup`
   * `POST /auth/login`
2. ユーザー設定系

   * `GET /user/me`
3. 銘柄検索・マスタ系

   * `GET /assets/search`
4. ユーザー銘柄設定

   * `GET /user/assets`
   * `POST /user/assets`
   * `PUT /user/assets/{id}`（アラート条件更新・基準価格変更）
   * `DELETE /user/assets/{id}`
5. 価格参照

   * `GET /prices/current?asset_id=...`（フロントから見える用／基本はバッチの副産物）
6. 通知履歴

   * `GET /notifications/history`
7. プラン／サブスク

   * `POST /subscriptions/verify`
   * `GET /subscriptions/status`
8. プッシュトークン登録

   * `POST /push/register`

---

## 5.4 バッチジョブ（価格取得）

### 5.4.1 ジョブの種類

* 無料プラン用ジョブ：

  * 8:00〜24:00 の間に、4時間間隔で起動
* 有料プラン込みのジョブ：

  * 24時間、1〜2時間間隔で起動

**設計イメージ**

* EventBridge に2種類のルールを設定：

  * `FreePlanPriceJob`：4時間おき
  * `PaidPlanPriceJob`：1〜2時間おき

---

### 5.4.2 ジョブの処理フロー

共通構造（やること自体は同じで、対象ユーザーや監視時間が違うだけ）：

1. 今が実行対象時間かをチェック

   * 無料ジョブ → 8:00〜24:00 JST 以外はスキップ
2. 対象ユーザーの抽出

   * 無料ジョブ → `plan_type = free`
   * 有料ジョブ → `plan_type = paid`
3. 対象ユーザーの `UserAssetSettings` を集約し、**ユニークな asset_id のリスト**を作る
4. 資産クラスごとに銘柄を分ける

   * `stock` → Marketstack
   * `crypto` → CoinGecko
   * `fx` → FX API
   * `commodity` / `index` → Marketstack or その他
5. 外部APIを呼び出し、銘柄ごとの現在価格を取得

   * API側にまとめてクエリできるものは一括取得
6. `PriceCache` を更新
7. 次のステップ（アラート判定ジョブ）に渡す or 同じジョブ内で判定まで済ませる

---

## 5.5 バッチジョブ（アラート判定）

### 5.5.1 判定ジョブの役割

* `PriceCache` に入っている最新価格 と
  `UserAssetSettings` の `base_price` / `last_notified_price` を比較して
  **「通知すべきかどうか」を判定する。**

### 5.5.2 判定の基準

「どの価格を基準とするか」は以下のロジックで決める：

```text
基準価格 = last_notified_price が存在すればそれ
         なければ base_price
```

変動率は：

```text
change_pct = (price_now - 基準価格) / 基準価格 * 100
```

### 5.5.3 判定アルゴリズム（擬似コード）

ざっくり：

```pseudo
for each user_asset in UserAssetSettings (対象ユーザーのみ):
    if cooldown_until != null and now < cooldown_until:
        continue  // クールダウン中

    price = PriceCache[asset_id].price
    base = user_asset.last_notified_price or user_asset.base_price

    if user.plan_type == "free":
        up_threshold = 5
        down_threshold = 5
    else:
        up_threshold = user_asset.alert_up_pct
        down_threshold = user_asset.alert_down_pct

    change_pct = (price - base) / base * 100

    if change_pct >= up_threshold:
        direction = "up"
        should_notify = true
    else if change_pct <= -down_threshold:
        direction = "down"
        should_notify = true
    else:
        should_notify = false

    if should_notify:
        enqueue NotificationTask(user, user_asset, price, change_pct, direction)
        // 通知後の更新
        user_asset.last_notified_price = price
        user_asset.last_notified_at = now
        if asset_class == "crypto":
            user_asset.cooldown_until = now + 30分  // 例
        save user_asset
```

---

## 5.6 通知送信処理

### 5.6.1 通知キュー

* アラート判定ジョブで「通知すべき」となった結果は、一旦**キューに積む**。
* 実装パターン：

  * DynamoDB の `NotificationsToSend` テーブルにレコード追加
  * or SQSにメッセージ投入

### 5.6.2 通知送信ワーカー

* 別の Lambda が一定間隔 or イベントトリガーで起動し、キューを処理。

処理フロー：

1. `NotificationsToSend` から N件取得
2. 各通知について

   * `PushTokens` から該当 user_id のトークン一覧を取得
   * APNs / FCM に対してHTTPで通知送信
3. 成功したもの

   * `NotificationLogs` に保存
   * キューから削除
4. 失敗したもの

   * リトライ（一定回数）
   * 連続失敗するトークンは無効化マーク

---

### 5.6.3 通知内容の生成

通知のタイトル・本文はサーバー側で組み立てる。

```text
title: "{TICKER} が {変動率}% {上昇/下落} しました"
body:  "基準値: {base_price} → 現在値: {price_now}"
```

方向のラベル：

* `direction = "up"` → 「上昇」
* `direction = "down"` → 「下落」

---

## 5.7 プラン・課金管理

### 5.7.1 レシート検証 API

モバイルアプリから送られてくるレシートを検証する。

フロー：

1. クライアント → `POST /subscriptions/verify`

   * `platform`（ios/android）
   * `receipt`（ストアのレシート）
2. サーバー側で Apple / Google の検証APIを叩く
3. 成功した場合：

   * `Subscriptions` テーブルに保存 or 更新
   * 有効期限 `plan_expiry` を更新
   * `Users.plan_type = "paid"`

### 5.7.2 プラン判定ロジック

* リクエストごとに DB から `Users.plan_type` と `plan_expiry` を参照
* 現在時刻が `plan_expiry` を過ぎていれば、自動的に `free` にダウングレード

```pseudo
if user.plan_type == "paid" and now > user.plan_expiry:
    user.plan_type = "free"
    save user
```

このロジックは：

* 認証後に走らせる
* バッチで1日に1回全体チェックしてもOK

---

## 5.8 エラーハンドリング・リトライ

### 5.8.1 外部API（価格取得）の失敗

* 一時的なネットワークエラー等：

  * リトライ（例：3回まで、指数バックオフ）
* API制限超過（429など）：

  * 対象APIの呼び出し頻度を落とす
  * ログに残しつつ、その回はスキップ
* 取得に失敗した銘柄については、その回の通知判定は行わない

---

### 5.8.2 通知送信の失敗

* APNs / FCM がエラーを返した場合：

  * エラーコードに応じてリトライ or トークン無効化
* 一時的エラー

  * 一定回数リトライ
* トークン無効

  * 該当 `PushTokens` レコードを削除 or 無効フラグ

---

## 5.9 パフォーマンス・スケーリング方針（機能側の決めごと）

* ジョブは「ユーザー単位」ではなく「ユニーク銘柄単位」で動かす。

  * ユーザー×銘柄 = 数千〜数万になっても、
  * ユニーク銘柄 = 数百程度に抑えられる設計にする（プランで制御）
* ユーザー数が増えた場合：

  * ユーザーをシャーディングして複数ジョブに分割（例：user_id のハッシュで分割）
  * あるいは Asset ごとにグループを分けて並列処理
