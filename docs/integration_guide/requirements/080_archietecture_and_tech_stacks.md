# 8. 技術構成

本章では、アプリ全体のアーキテクチャ、使用技術、インフラ構成を定義する。
目的は **「誰が実装しても迷わない技術選定と構成の明文化」** にある。

---

# 8.1 全体アーキテクチャ概要

本アプリは、
**クライアント（モバイルアプリ）＋ APIサーバー（サーバーレス）＋ バッチ処理（サーバーレス）＋ 外部API**
で構成する。

```
┌────────────────────────────┐
│        モバイルアプリ（フロント）        │
│  React Native / Expo / TypeScript        │
└───────────────┬────────────┘
                │ REST API
┌───────────────▼──────────────┐
│        API Gateway + Lambda (Backend)     │
│  FastAPI or Node.js (TypeScript)          │
│  - 認証                                   │
│  - 銘柄設定                                │
│  - 通知履歴                                │
│  - サブスク検証                            │
└───────┬──────────────────────┘
        │ DB Access
┌───────▼──────────────────────────┐
│            DynamoDB               │
│ - Users                           │
│ - UserAssetSettings               │
│ - PushTokens                      │
│ - NotificationLogs                │
│ - PriceCache                      │
└───────┬──────────────────────────┘
        │ EventBridge (Cron)
┌───────▼──────────────────────────┐
│   Price Fetcher Lambda (価格ジョブ)   │
│   Alert Evaluator Lambda (判定ジョブ) │
└───────┬──────────────────────────┘
        │ External API
┌───────▼──────────────────────────┐
│ Marketstack / CoinGecko / FX API │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ APNs / FCM（プッシュ通知）          │
└──────────────────────────────────┘
```

---

# 8.2 フロントエンド（モバイルアプリ）

### 8.2.1 使用技術

| 項目      | 技術                                           |
| ------- | -------------------------------------------- |
| フレームワーク | **React Native + Expo**                      |
| 言語      | **TypeScript**                               |
| UIライブラリ | React Native Paper / NativeWind（Tailwind RN） |
| 状態管理    | Zustand or Recoil or Redux Toolkit（軽量で良い）    |
| ルーティング  | Expo Router                                  |
| HTTP通信  | axios / fetch                                |
| バージョン管理 | GitHub                                       |

### 8.2.2 理由

* Expoによりビルド・配布が圧倒的に簡単（MVPに最適）
* APIがすべてRESTなので、React Nativeと相性が良い
* UIはシンプルでよく、重いロジックは持たない

---

# 8.3 バックエンド（APIサーバー）

### 8.3.1 使用技術

| 項目      | 技術                                                    |
| ------- | ----------------------------------------------------- |
| フレームワーク | **FastAPI（Python）** または **Node.js + Express/Fastify** |
| 実行環境    | AWS Lambda                                            |
| API管理   | API Gateway                                           |
| 認証      | JWT（HS256）                                            |
| DB接続    | boto3（DynamoDB SDK）                                   |



### 8.3.2 API方式

* REST API
* OpenAPI 3.0 でスキーマ定義（09章で作成）

---

# 8.4 データベース構成（DynamoDB）

### 8.4.1 採用理由

* スキーマレスでユーザーごとの設定が柔軟
* 読み書き頻度が小さいためコストが低い
* Lambdaと相性が良く、ほぼメンテ不要
* PITR（Point-In-Time Recovery）で安全性確保

### 8.4.2 使用テーブル

（05で定義済み）

* Users
* AssetMaster
* UserAssetSettings
* PriceCache
* NotificationLogs
* PushTokens
* Subscriptions（任意）

---

# 8.5 バッチ処理（価格取得・アラート判定）

### 8.5.1 使用技術

| 項目      | 技術                               |
| ------- | -------------------------------- |
| スケジューラー | EventBridge（Cron）                |
| 実行      | Lambda                           |
| 並列処理    | asset_class / ハッシュ値による分割スケジューリング |

### 8.5.2 ジョブ種類

1. **価格取得ジョブ**

   * 価格API → PriceCacheへ保存

2. **アラート判定ジョブ**

   * PriceCache と UserAssetSettings を比較
   * 通知キューへ積む

3. **通知送信ワーカー（push dispatcher）**

   * APNs / FCM に対して通知送信

---

# 8.6 通知（Push Notification）

### 8.6.1 使用技術

| 項目      | 技術                          |
| ------- | --------------------------- |
| iOS     | APNs                        |
| Android | FCM                         |
| 実装      | Lambda → APNs/FCM HTTPリクエスト |
| トークン保存  | PushTokens テーブル             |

### 8.6.2 方式

* **クライアントがデバイストークンを登録**
* バックエンドが通知キューを処理して送信
* 失効トークンは自動削除

---

# 8.7 外部API（価格取得・スクショ解析）

### 8.7.1 価格API

| 資産クラス        | API候補                     |
| ------------ | ------------------------- |
| 株 / ETF / 指数 | Marketstack               |
| 仮想通貨         | CoinGecko（商用無料）           |
| FX           | FreeForexAPI / TwelveData |
| コモディティ       | Marketstack               |

### 8.7.2 価格APIを複数に分ける理由

* 1つのAPIの障害でアプリ全体が止まらないようにする
* 価格APIは資産タイプに最適なサービスを選べる

---

### 8.7.3 スクショ解析（Vision API）

* OpenAI GPT-4.1 Vision or GPT-4o-mini
* アップロード時に一時保存（S3）
* 解析完了後即削除（Lifecycle: 1日）

---

# 8.8 インフラ構成（AWS）

下記すべて AWS 無料枠や低料金で構築可能。

| 目的          | サービス                                             |
| ----------- | ------------------------------------------------ |
| API         | API Gateway                                      |
| サーバー        | Lambda                                           |
| データベース      | DynamoDB                                         |
| ストレージ（スクショ） | S3                                               |
| 定期処理        | EventBridge                                      |
| CI/CD       | GitHub Actions + AWS CDK or Serverless Framework |
| シークレット管理    | AWS Secrets Manager                              |
| ログ          | CloudWatch                                       |

---

# 8.9 環境構成（dev / staging / prod）

### **dev**

* 開発用ローカル or AWS上の簡易環境
* DynamoDBはローカルでも可

### **staging**

* ストアに出す前のQA環境
* 本番と同じAPI構成

### **prod（本番）**

* 実際のユーザーが使う環境
* レートリミットやAPIキーを本番用に切り替え

---

# 8.10 開発フロー

### 8.10.1 ブランチモデル（Git）

* `main`：本番
* `develop`：開発
* featureブランチ（`feature/alert-logic`など）

### 8.10.2 CI/CD

* PR作成時に自動テスト
* Lambdaは GitHub Actions → CDKでデプロイ

---

# 8.11 技術スタックまとめ（一覧表）

| 層      | 技術                                                      |
| ------ | ------------------------------------------------------- |
| モバイル   | React Native + Expo + TypeScript                        |
| バックエンド | FastAPI (Python) or Node.js                             |
| インフラ   | AWS（Lambda / DynamoDB / S3 / EventBridge / API Gateway） |
| 通知     | APNs / FCM                                              |
| 価格API  | Marketstack / CoinGecko / FX API                        |
| 解析     | OpenAI Vision                                           |
| CI/CD  | GitHub Actions + CDK                                    |
| 認証     | JWT                                                     |
| DB     | DynamoDB                                                |

