# フロントエンド統合ガイド

## 概要

このドキュメントは、フロントエンド開発者（React Native等）がバックエンドAPIと統合する際に必要な情報をまとめたものです。

**対象読者:** フロントエンド側のClaude Code、またはフロントエンド開発者

**バックエンドURL:** `http://<server-ip>:8000`

---

## 必須ファイル一覧

フロントエンド開発を開始する前に、以下のファイルを確認してください。

### 1. 全体仕様とセットアップ

| ファイル | 目的 | 優先度 |
|---------|------|--------|
| [README.md](README.md) | バックエンドの概要、起動方法、アーキテクチャ | ★★★ 必須 |
| [models.py](models.py) | 全データベーステーブル定義（User, Alert, Portfolio等） | ★★★ 必須 |

### 2. フェーズ別完了レポート（実装済み機能）

バックエンドはフェーズ単位で実装されています。各フェーズのレポートでAPI仕様と使用例を確認できます。

#### 基本機能（Phase 1-3）
| フェーズ | 内容 | レポート |
|---------|------|----------|
| Phase 1 | 基本的なアラート管理（絶対値・変動率） | [PHASE1_COMPLETION_REPORT.md](PHASE1_COMPLETION_REPORT.md) |
| Phase 2 | マルチユーザー対応 | [PHASE2_COMPLETION_REPORT.md](PHASE2_COMPLETION_REPORT.md) |
| Phase 3 | U-NEXT風のUI/UX設計（企画書） | [PHASE3_COMPLETION_REPORT.md](PHASE3_COMPLETION_REPORT.md) |

#### アセット管理（Phase 7-9）
| フェーズ | 内容 | レポート |
|---------|------|----------|
| Phase 7 | 通知履歴 | [PHASE7_COMPLETION_REPORT.md](PHASE7_COMPLETION_REPORT.md) |
| Phase 8 | アセットマスターデータ | [PHASE8_COMPLETION_REPORT.md](PHASE8_COMPLETION_REPORT.md) |
| Phase 9 | フィルタリング・ソート機能 | [PHASE9_COMPLETION_REPORT.md](PHASE9_COMPLETION_REPORT.md) |

#### インフラ・通知（Phase 10-17）
| フェーズ | 内容 | レポート |
|---------|------|----------|
| Phase 10 | FCMプッシュ通知 | [PHASE10_COMPLETION_REPORT.md](PHASE10_COMPLETION_REPORT.md) |
| Phase 11 | エラーハンドリング | [PHASE11_COMPLETION_REPORT.md](PHASE11_COMPLETION_REPORT.md) |
| Phase 12 | ロギング | [PHASE12_COMPLETION_REPORT.md](PHASE12_COMPLETION_REPORT.md) |
| Phase 13 | データベースインデックス | [PHASE13_COMPLETION_REPORT.md](PHASE13_COMPLETION_REPORT.md) |
| Phase 14 | レート制限 | [PHASE14_COMPLETION_REPORT.md](PHASE14_COMPLETION_REPORT.md) |
| Phase 15 | 監視・ヘルスチェック | [PHASE15_COMPLETION_REPORT.md](PHASE15_COMPLETION_REPORT.md) |
| Phase 16 | ジョブ管理 | [PHASE16_COMPLETION_REPORT.md](PHASE16_COMPLETION_REPORT.md) |
| Phase 17 | キャッシュ管理 | [PHASE17_COMPLETION_REPORT.md](PHASE17_COMPLETION_REPORT.md) |

#### アセットクラス・サブスクリプション（Phase 18-21）
| フェーズ | 内容 | レポート |
|---------|------|----------|
| Phase 18-19 | 多様なアセットクラス対応 | [PHASE18_19_COMPLETION_REPORT.md](PHASE18_19_COMPLETION_REPORT.md) |
| Phase 20 | スケジューラ | [PHASE20_COMPLETION_REPORT.md](PHASE20_COMPLETION_REPORT.md) |
| Phase 21 | サブスクリプション検証 | [PHASE21_COMPLETION_REPORT.md](PHASE21_COMPLETION_REPORT.md) |

#### 高度な機能（Phase 22-26）
| フェーズ | 内容 | レポート |
|---------|------|----------|
| Phase 22 | スクリーンショット解析（AI Vision） | [PHASE22_COMPLETION_REPORT.md](PHASE22_COMPLETION_REPORT.md) |
| Phase 24 | アラート履歴と統計分析 | [PHASE24_COMPLETION_REPORT.md](PHASE24_COMPLETION_REPORT.md) |
| Phase 26 | ポートフォリオ管理 | [PHASE26_COMPLETION_REPORT.md](PHASE26_COMPLETION_REPORT.md) |

### 3. スキーマ定義（API入出力型定義）

| ファイル | 内容 |
|---------|------|
| [schemas.py](schemas.py) | 基本スキーマ（User, Alert, Push Token等） |
| [schemas_subscription.py](schemas_subscription.py) | サブスクリプション関連 |
| [schemas_screenshot.py](schemas_screenshot.py) | スクリーンショット解析 |
| [schemas_alert_history.py](schemas_alert_history.py) | アラート履歴・統計 |
| [schemas_portfolio.py](schemas_portfolio.py) | ポートフォリオ管理 |

---

## APIエンドポイント一覧

### 認証関連

| メソッド | エンドポイント | 説明 | レスポンス |
|---------|---------------|------|-----------|
| POST | `/auth/signup` | ユーザー登録 | `{"access_token": "...", "token_type": "bearer"}` |
| POST | `/auth/login` | ログイン | `{"access_token": "...", "token_type": "bearer"}` |
| GET | `/auth/me` | 現在のユーザー情報 | `{"id": 1, "email": "...", "plan_type": "free"}` |

**認証ヘッダー:**
```
Authorization: Bearer <access_token>
```

### アラート管理

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/alerts` | アラート一覧取得 |
| POST | `/alerts` | 新規アラート作成 |
| PUT | `/alerts/{id}` | アラート更新 |
| DELETE | `/alerts/{id}` | アラート削除 |
| POST | `/alerts/{id}/reset` | アラート再有効化（notified=false） |
| POST | `/alerts/bulk-create` | 複数アラート一括作成（Phase 22） |

### プッシュ通知

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| POST | `/push-tokens` | FCMトークン登録 |
| DELETE | `/push-tokens/{token}` | FCMトークン削除 |

### 通知履歴

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/notifications` | 通知履歴一覧 |
| PUT | `/notifications/{id}/mark-read` | 既読にする |
| POST | `/notifications/mark-all-read` | 全て既読にする |

### アラート履歴・統計（Phase 24）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/alerts/history` | アラート発火履歴 |
| GET | `/alerts/stats/summary` | 統計サマリー |
| GET | `/alerts/stats/ticker/{ticker}` | 銘柄別統計 |

### ポートフォリオ管理（Phase 26）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/portfolio` | ポートフォリオ一覧 |
| POST | `/portfolio` | 新規アイテム追加 |
| PUT | `/portfolio/{id}` | アイテム更新 |
| DELETE | `/portfolio/{id}` | アイテム削除 |
| GET | `/portfolio/valuation` | 評価額計算 |
| GET | `/portfolio/performance` | パフォーマンス分析 |

### スクリーンショット解析（Phase 22）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| POST | `/screenshots/analyze` | スクリーンショート解析（AI Vision） |

### アセット検索

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/assets/search` | アセット検索 |
| GET | `/assets/{asset_class}` | アセットクラス別一覧 |

### 監視・ヘルスチェック

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/health` | ヘルスチェック |
| GET | `/metrics` | メトリクス（Prometheus形式） |

---

## 主要なAPI使用例

### 1. ユーザー登録とログイン

```typescript
// 新規登録
const signupResponse = await fetch('http://localhost:8000/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword',
  }),
});

const { access_token } = await signupResponse.json();

// 以降、全てのAPIリクエストでこのトークンを使用
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json',
};
```

### 2. アラート作成（絶対値 vs 変動率）

#### 絶対値アラート（価格 > $185）
```typescript
const response = await fetch('http://localhost:8000/alerts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ticker: 'AAPL',
    asset_class: 'us_stock',
    alert_type: 'absolute',  // 絶対値
    direction: 'up',         // 上昇
    threshold_value: 185.0,  // $185以上
  }),
});
```

#### 変動率アラート（+5%以上上昇）
```typescript
const response = await fetch('http://localhost:8000/alerts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ticker: 'AAPL',
    asset_class: 'us_stock',
    alert_type: 'percent',  // 変動率
    direction: 'up',        // 上昇
    threshold_value: 5.0,   // +5%
    base_price: 175.0,      // 基準価格（現在価格を自動設定する場合は省略可）
  }),
});
```

### 3. アラート一覧取得（フィルタリング・ソート）

```typescript
// アクティブなアラートのみ、ティッカー順でソート
const response = await fetch(
  'http://localhost:8000/alerts?is_active=true&sort_by=ticker&order=asc',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const data = await response.json();
console.log(`Total alerts: ${data.total_count}`);
data.alerts.forEach(alert => {
  console.log(`${alert.ticker}: ${alert.alert_type} ${alert.direction} ${alert.threshold_value}`);
});
```

### 4. FCMプッシュトークン登録

```typescript
// React Nativeでfirebase-messagingからトークンを取得した後
const fcmToken = await messaging().getToken();

const response = await fetch('http://localhost:8000/push-tokens', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: fcmToken,
    device_type: 'ios',  // or 'android'
  }),
});
```

### 5. ポートフォリオ評価額取得

```typescript
const response = await fetch('http://localhost:8000/portfolio/valuation', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const valuation = await response.json();

console.log(`総資産: $${valuation.total_value}`);
console.log(`損益: $${valuation.total_profit_loss} (${valuation.total_profit_loss_pct}%)`);

// 個別銘柄
valuation.items.forEach(item => {
  console.log(`${item.ticker}: ${item.profit_loss_pct > 0 ? '+' : ''}${item.profit_loss_pct}%`);
});
```

### 6. アラート統計取得（過去30日）

```typescript
const response = await fetch('http://localhost:8000/alerts/stats/summary?days=30', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const stats = await response.json();

console.log(`過去30日のアラート統計`);
console.log(`発火回数: ${stats.total_triggers}回`);
console.log(`上昇: ${stats.up_triggers}回 (${stats.up_percentage}%)`);
console.log(`下落: ${stats.down_triggers}回 (${stats.down_percentage}%)`);

console.log(`\n最も活発な銘柄:`);
stats.top_tickers.forEach((item, index) => {
  console.log(`${index + 1}. ${item.ticker}: ${item.count}回`);
});
```

### 7. スクリーンショート解析（AI Vision）

```typescript
import { launchImageLibrary } from 'react-native-image-picker';

// 画像選択
const result = await launchImageLibrary({ mediaType: 'photo' });
const imageUri = result.assets[0].uri;

// Base64エンコード
const base64Image = await fetch(imageUri)
  .then(res => res.blob())
  .then(blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  }));

// スクリーンショート解析
const analyzeResponse = await fetch('http://localhost:8000/screenshots/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    image_data: base64Image,
    asset_class_hint: 'us_stock',
    min_confidence: 0.8,
  }),
});

const { extracted_assets } = await analyzeResponse.json();

console.log(`検出された銘柄: ${extracted_assets.length}件`);
extracted_assets.forEach(asset => {
  console.log(`${asset.ticker}: ${asset.asset_name} (信頼度: ${asset.confidence})`);
});

// 一括アラート作成
const alerts = extracted_assets.map(asset => ({
  ticker: asset.ticker,
  asset_class: asset.asset_class,
  alert_type: 'percent',
  direction: 'up',
  threshold_value: 5.0,
}));

const bulkResponse = await fetch('http://localhost:8000/alerts/bulk-create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ alerts }),
});

const { created_count } = await bulkResponse.json();
console.log(`${created_count}件のアラートを作成しました`);
```

---

## エラーハンドリング

全てのAPIはHTTPステータスコードでエラーを返します。

### 一般的なエラーレスポンス

```json
{
  "detail": "Error message here"
}
```

### 主要なステータスコード

| コード | 意味 | 原因 |
|-------|------|------|
| 200 | OK | 成功 |
| 201 | Created | リソース作成成功 |
| 204 | No Content | 削除成功（レスポンスボディなし） |
| 400 | Bad Request | リクエストパラメータ不正 |
| 401 | Unauthorized | 認証トークンが無効・期限切れ |
| 403 | Forbidden | プラン制限超過（例: Freeプランで7個目のアラート作成） |
| 404 | Not Found | リソースが存在しない |
| 422 | Unprocessable Entity | バリデーションエラー |
| 429 | Too Many Requests | レート制限超過 |
| 500 | Internal Server Error | サーバーエラー |

### エラーハンドリング例

```typescript
try {
  const response = await fetch('http://localhost:8000/alerts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(alertData),
  });

  if (!response.ok) {
    const error = await response.json();

    if (response.status === 403) {
      // プラン制限超過
      alert('アラート数の上限に達しました。有料プランにアップグレードしてください。');
    } else if (response.status === 401) {
      // 認証エラー → 再ログイン
      navigateToLogin();
    } else if (response.status === 422) {
      // バリデーションエラー
      console.error('入力内容が不正です:', error.detail);
    } else {
      // その他のエラー
      console.error('エラーが発生しました:', error.detail);
    }

    return;
  }

  const data = await response.json();
  console.log('アラート作成成功:', data);

} catch (error) {
  console.error('ネットワークエラー:', error);
  alert('サーバーに接続できません');
}
```

---

## プラン制限

| プラン | アラート数上限 | 価格 |
|-------|--------------|------|
| Free | 6個 | 無料 |
| Paid | 無制限 | 有料 |

**プラン情報の取得:**
```typescript
const response = await fetch('http://localhost:8000/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const user = await response.json();

if (user.plan_type === 'free') {
  console.log('Freeプラン: 6個まで作成可能');
} else {
  console.log('Paidプラン: 無制限');
}
```

---

## リアルタイム更新（WebSocket）

現在、WebSocketによるリアルタイム価格配信は未実装です。

**代替案:**
- ポーリング: 定期的にGET `/alerts`や`/portfolio/valuation`を呼び出す
- プッシュ通知: アラート発火時にFCMで通知を受け取る

---

## 開発環境での注意点

### CORS設定

バックエンドはCORSを許可しています:
- 開発時: `http://localhost:*`
- 本番時: フロントエンドのドメインを追加設定

### ローカル開発時のURL

```typescript
const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'  // 開発環境
  : 'https://api.yourapp.com';  // 本番環境
```

### Android Emulatorからのアクセス

Androidエミュレータからlocalhostにアクセスする場合:
```typescript
const API_BASE_URL = 'http://10.0.2.2:8000';  // Android Emulator
```

---

## 次のステップ

1. **バックエンドのセットアップ**
   - [README.md](README.md)を参照してバックエンドを起動

2. **認証フローの実装**
   - ユーザー登録・ログイン画面
   - トークンの永続化（AsyncStorage等）

3. **アラート管理画面の実装**
   - アラート一覧表示
   - 新規作成フォーム
   - 編集・削除機能

4. **プッシュ通知の統合**
   - FCMの設定
   - トークン登録
   - 通知受信ハンドリング

5. **ポートフォリオ画面の実装**
   - 保有銘柄の一覧
   - 評価額の表示
   - パフォーマンスグラフ

6. **高度な機能**
   - スクリーンショート解析
   - アラート履歴・統計の可視化

---

## サポート

質問や問題が発生した場合は、各Phase完了レポートの「フロントエンド統合ガイド」セクションを参照してください。

特に重要なレポート:
- [PHASE1_COMPLETION_REPORT.md](PHASE1_COMPLETION_REPORT.md) - 基本的なアラート管理
- [PHASE10_COMPLETION_REPORT.md](PHASE10_COMPLETION_REPORT.md) - FCMプッシュ通知
- [PHASE22_COMPLETION_REPORT.md](PHASE22_COMPLETION_REPORT.md) - スクリーンショート解析
- [PHASE24_COMPLETION_REPORT.md](PHASE24_COMPLETION_REPORT.md) - アラート履歴・統計
- [PHASE26_COMPLETION_REPORT.md](PHASE26_COMPLETION_REPORT.md) - ポートフォリオ管理

---

**フロントエンド開発の準備が整いました。**