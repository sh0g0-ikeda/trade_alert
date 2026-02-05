
---

```md
# Stock Alert App – Backend (FCM / Percent Alert)

## 概要

株価アラートアプリのバックエンド実装。  
absolute（価格）および percent（変動率）アラートに対応し、  
条件成立時に FCM Push 通知を送信する。

二重通知防止のため、通知済みアラートは `notified=true` として管理され、
明示的な操作なしには再通知されない設計となっている。

---

## 正パス（絶対に守る）

### Backend（正）

```

~/projects/stock-alert-clean/backend_old_20251217_212858

```

### Frontend（参考）

```

C:\Users\shogo\dev\multi-asset-alert\mobile

````

---

## 起動方法（統一・厳守）

バックエンドは **必ず以下のコマンドで起動する**。

```bash
python3 -m uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  --log-level info
````

※ これ以外の起動方法は使用しない
※ LAN 直指定前提（ngrok 等は禁止）

---

## 認証

すべての API リクエストに以下のヘッダが必須。

```
X-API-Key: <API_KEY>
```

未指定または不正な場合は 401 を返す。

---

## データベース（重要）

* SQLite を使用
* スキーマ変更時は **既存 DB を削除して再生成する**

```bash
rm -f stock_alert.db
```

uvicorn 再起動時に自動生成される。

---

## アラート仕様

### alert_type

* `absolute`

  * `threshold_price` を使用
* `percent`

  * `base_price × (1 ± percent_threshold / 100)` で判定

### percent アラートの base_price

* 作成時に `base_price` が未指定の場合、
  バックエンドが **現在価格から自動セット**する
* フロントエンドから送信する必要はない

---

## 二重通知防止（notified）

* 条件成立で通知送信後、`notified=true` に更新される
* `notified=true` のアラートは再通知されない
* 再通知したい場合は **一度 OFF → 再度 ON** にする

  * ON に戻す際に `notified=false` が送信される設計

この仕様は **バックエンド・フロントエンド双方で前提として固定**されている。

---

## ジョブ実行

```http
POST /jobs/run-alert-check
```

* 有効かつ未通知のアラートを評価する
* Push Token が存在しない場合でも **評価自体は必ず行う**
* 同一短時間での多重実行はスキップされる
* 通知送信失敗時も API は 200 を返す（暴走防止）

---

## 価格取得仕様

* 同一銘柄を複数アラートで使用している場合でも、
  **1ジョブ内で API 呼び出しは 1回のみ**
* TTL キャッシュにより短時間での再取得を抑制している
* API キー未設定時は開発用にランダム価格を返す

---

## 運用上の注意（破壊防止）

* ngrok 等のトンネリングは禁止
* LAN IP 直指定前提
* `.db` や credential JSON は Git 管理しない
* notified / 二重通知防止仕様を変更する場合は、
  必ずフロント実装と同時に行うこと

---

## この README について

* 本ファイルが **唯一の正しい仕様・運用ドキュメント**
* 別資料・Notion・メモへの分散は禁止
* 変更があった場合は必ず README を更新し、Git に履歴を残す

````