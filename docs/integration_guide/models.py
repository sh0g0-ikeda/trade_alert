# models.py
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class JobState(Base):
    __tablename__ = "job_state"

    id = Column(Integer, primary_key=True, index=True)
    last_run_at = Column(DateTime, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    plan_type = Column(String, default="free")  # "free" or "paid"
    plan_expiry = Column(DateTime, nullable=True)  # 有料プラン終了日時（キャンセル時など）
    free_until = Column(DateTime, nullable=True)  # Phase 3 U-NEXT方式: この日まで無料（課金開始日）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    push_tokens = relationship("PushToken", back_populates="user", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    symbol = Column(String, index=True)
    asset_class = Column(String, nullable=True, index=True)  # Phase 18: "us_stock", "crypto", etc.

    # ===== Alert type =====
    alert_type = Column(String, default="absolute")  # "absolute" or "percent"

    # ===== Legacy fields (deprecated but kept for backward compatibility) =====
    condition = Column(String, nullable=True)  # "above" or "below" (DEPRECATED)
    threshold_price = Column(Float, nullable=True)  # absolute の閾値（単方向、DEPRECATED）
    percent_threshold = Column(Float, nullable=True)  # percent の閾値（単方向、DEPRECATED）

    # ===== New bidirectional fields =====
    # absolute 用（両方向）
    threshold_price_up = Column(Float, nullable=True)    # 上昇側の絶対価格閾値
    threshold_price_down = Column(Float, nullable=True)  # 下降側の絶対価格閾値

    # percent 用（両方向）
    base_price = Column(Float, nullable=True)      # 基準価格（共通）
    alert_up_pct = Column(Float, nullable=True)    # 上昇側の変動率閾値
    alert_down_pct = Column(Float, nullable=True)  # 下降側の変動率閾値

    is_active = Column(Boolean, default=True)

    # 前回通知価格（NULL = 未通知、値あり = 通知済み）
    last_notified_price = Column(Float, nullable=True)
    last_notified_at = Column(DateTime, nullable=True)
    cooldown_until = Column(DateTime, nullable=True)  # クールダウン期間終了時刻

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="alerts")


class PushToken(Base):
    __tablename__ = "push_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    device_id = Column(String, nullable=False)
    token = Column(String, nullable=False, index=True)
    platform = Column(String, nullable=True)  # "ios" or "android"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="push_tokens")

    # Unique constraint: one device per user
    __table_args__ = (
        {"sqlite_autoincrement": True},
    )


class PriceCache(Base):
    __tablename__ = "price_cache"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False, index=True)  # "AAPL", "NVDA", etc.
    price = Column(Float, nullable=False)
    provider = Column(String, default="alpha_vantage")  # "alpha_vantage", "random", etc.
    fetched_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AssetMaster(Base):
    """
    Phase 4: 資産マスタテーブル

    各資産（株式、仮想通貨、貴金属、ETF等）の基本情報を管理
    フロントエンドでカテゴリ別に銘柄を検索・選択できるようにする
    """
    __tablename__ = "asset_master"

    id = Column(Integer, primary_key=True, index=True)

    # 資産クラス分類
    asset_class = Column(String, nullable=False, index=True)
    # "us_stock"      - 米国株
    # "jp_stock"      - 日本株
    # "crypto"        - 仮想通貨
    # "precious_metal" - 貴金属（金、銀、プラチナ等）
    # "etf"           - ETF
    # "fx"            - 外国為替（将来対応）

    # 銘柄識別情報
    ticker = Column(String, nullable=False, index=True)  # "AAPL", "BTC", "GLD" など
    name = Column(String, nullable=False)  # "Apple Inc.", "Bitcoin", "SPDR Gold Shares"
    name_ja = Column(String, nullable=True)  # 日本語名（任意）

    # 取引情報
    exchange = Column(String, nullable=True)  # "NASDAQ", "NYSE", "東証" など
    currency = Column(String, default="USD")  # "USD", "JPY", "BTC" など

    # メタ情報
    provider_code = Column(String, nullable=True)  # どのAPIで取得するか
    enabled = Column(Boolean, default=True)  # アプリで検索対象にするか
    is_popular = Column(Boolean, default=False)  # 人気銘柄フラグ

    # タイムスタンプ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 複合ユニークインデックス（asset_class + ticker）
    __table_args__ = (
        {"sqlite_autoincrement": True},
    )


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True, index=True)  # nullable for deleted alerts

    symbol = Column(String, nullable=False, index=True)
    direction = Column(String, nullable=False)  # "up" or "down"
    alert_type = Column(String, nullable=False)  # "absolute" or "percent"

    current_price = Column(Float, nullable=False)
    threshold_value = Column(Float, nullable=True)  # 閾値（絶対価格 or パーセント）
    base_price = Column(Float, nullable=True)  # percent型の場合の基準価格

    notification_method = Column(String, default="push")  # "push", "email", etc.
    notification_status = Column(String, default="sent")  # "sent", "failed", "pending"

    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    alert = relationship("Alert")


# Phase 16: バックグラウンドジョブ管理
class Job(Base):
    """バックグラウンドジョブの実行履歴"""
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String, nullable=False, index=True)  # "alert_evaluation", "cleanup", etc.
    status = Column(String, default="pending", index=True)  # "pending", "running", "success", "failed"

    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    result = Column(String, nullable=True)  # JSON形式の結果データ
    error_message = Column(String, nullable=True)  # エラーメッセージ

    retry_count = Column(Integer, default=0)  # リトライ回数
    max_retries = Column(Integer, default=3)  # 最大リトライ回数

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Phase 24: アラート発火履歴
class AlertHistory(Base):
    """アラート発火履歴（統計分析用）"""
    __tablename__ = "alert_history"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    ticker = Column(String, nullable=False, index=True)
    asset_class = Column(String, nullable=True)

    triggered_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    trigger_price = Column(Float, nullable=False)  # 発火時の価格
    base_price = Column(Float, nullable=True)  # percent型の場合の基準価格

    alert_type = Column(String, nullable=False)  # "absolute" or "percent"
    direction = Column(String, nullable=False)  # "up" or "down"

    threshold_value = Column(Float, nullable=True)  # 閾値（絶対価格またはパーセント）
    price_change_pct = Column(Float, nullable=True)  # 実際の変動率

    notification_sent = Column(Boolean, default=False)  # 通知が送信されたか
    notification_id = Column(Integer, ForeignKey("notification_logs.id"), nullable=True)

    # Relationships
    user = relationship("User")
    alert = relationship("Alert")
    notification = relationship("NotificationLog")


# Phase 26: ポートフォリオ管理
class Portfolio(Base):
    """ユーザーの保有銘柄（ポートフォリオ）"""
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    ticker = Column(String, nullable=False, index=True)
    asset_class = Column(String, nullable=True)  # "us_stock", "crypto", etc.

    quantity = Column(Float, nullable=False)  # 保有数量
    purchase_price = Column(Float, nullable=False)  # 取得単価
    purchase_date = Column(DateTime, nullable=False)  # 購入日

    notes = Column(String, nullable=True)  # メモ（オプション）

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
