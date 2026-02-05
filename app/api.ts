// app/api.ts

// ✅ Ubuntu FastAPI の LAN IP（ngrok禁止）
const API_BASE_URL = "http://52.196.53.170";

// ✅ APIキー（固定）- 後方互換性のため残す
const API_KEY =
  "8587dec7dd75fb56d52f5d3631ea7c12d5c6964ac9ac38ed59cd57ece7d40b7e";

// ==========================
// JWT トークン管理
// ==========================
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// ==========================
// 共通 fetch ラッパ（1本化）
// ==========================
async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 8000,
  skipAuth = false,
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    };

    // 既存のヘッダーをマージ
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === "string") {
          headers[key] = value;
        }
      });
    }

    // JWT認証ヘッダーの追加（skipAuth=false かつ トークンがある場合）
    if (!skipAuth && authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    // 204 は本文なし
    if (res.status === 204) return null as T;

    const text = await res.text().catch(() => "");
    const data = text ? safeJsonParse(text) : null;

    if (!res.ok) {
      // 失敗時は本文も含めて投げる（デバッグ優先）
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    return data as T;
  } finally {
    clearTimeout(id);
  }
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    // JSONじゃないレスポンスが返ってきた時に握り潰さず分かるようにする
    return { raw: text };
  }
}

// ====== Health ======
export type HealthResponse = { status: string };
export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health", { method: "GET" }, 5000, true); // skipAuth=true
}

// ====== Auth ======
export type AuthResponse = {
  access_token: string;
  token_type: string;
};

export type User = {
  id: number;
  email: string;
  plan_type: "free" | "paid";
  created_at?: string;
};

export type SignupRequest = {
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export async function signup(input: SignupRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(
    "/auth/signup",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    8000,
    true,
  ); // skipAuth=true (まだログインしていないため)
}

export async function login(input: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    8000,
    true,
  ); // skipAuth=true
}

export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>("/user/me", { method: "GET" });
}

// ====== Alerts ======
export type Condition = "above" | "below";
export type AlertType = "absolute" | "percent";

export type Alert = {
  id: number;
  symbol: string;
  asset_class?: string | null;
  condition?: Condition;

  threshold_price?: number | null;
  threshold_price_up?: number | null;
  threshold_price_down?: number | null;

  is_active: boolean;
  notified?: boolean;

  alert_type: AlertType;
  base_price: number | null;
  percent_threshold?: number | null;
  alert_up_pct?: number | null;
  alert_down_pct?: number | null;

  last_notified_price?: number | null;
  last_notified_at?: string | null;
  cooldown_until?: string | null;

  created_at: string;
  updated_at: string;
};

export type CreateAlertRequest = {
  symbol: string;
  condition: Condition;

  is_active?: boolean;

  threshold_price?: number | null;

  alert_type?: AlertType;
  base_price?: number | null;
  percent_threshold?: number | null;
};

export type UpdateAlertRequest = Partial<CreateAlertRequest> & {
  notified?: boolean;
  alert_up_pct?: number;
  alert_down_pct?: number;
  base_price?: number;
  threshold_price_up?: number;
  threshold_price_down?: number;
  reset_base_price?: boolean;
};

export async function getAlerts(): Promise<Alert[]> {
  return apiFetch<Alert[]>("/alerts", { method: "GET" });
}

// ★追加：単体取得（詳細画面用）
export async function getAlert(id: number): Promise<Alert> {
  return apiFetch<Alert>(`/alerts/${id}`, { method: "GET" });
}

export async function createAlert(input: CreateAlertRequest): Promise<Alert> {
  return apiFetch<Alert>("/alerts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAlert(
  id: number,
  input: UpdateAlertRequest,
): Promise<Alert> {
  return apiFetch<Alert>(`/alerts/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteAlert(id: number): Promise<void> {
  await apiFetch<void>(`/alerts/${id}`, { method: "DELETE" });
}

// ====== Push Tokens ======
export type PushTokenResponse = {
  id: number;
  token: string;
  platform?: string | null;
  created_at: string;
};

// ★通知復旧の安全策：platform を送る（バックエンドが無視してもOK）
export async function registerPushToken(
  token: string,
  platform: "android" | "ios" | "unknown" = "android",
): Promise<PushTokenResponse> {
  return apiFetch<PushTokenResponse>("/push-tokens", {
    method: "POST",
    body: JSON.stringify({ token, platform }),
  });
}

export type TestPushResponse = {
  message: string;
  token_count: number;
};

export async function testPush(): Promise<TestPushResponse> {
  // test は端末に出るかどうかだけ見たいので timeout 少し長めでもOK
  return apiFetch<TestPushResponse>(
    "/push-tokens/test",
    { method: "POST" },
    15000,
  );
}

export async function sendTestNotification(): Promise<TestPushResponse> {
  return testPush();
}

// ====== Jobs ======
export type RunAlertCheckResponse = {
  triggered_alerts: any[];
  token_count: number;
};

export async function runAlertCheck(): Promise<RunAlertCheckResponse> {
  return apiFetch<RunAlertCheckResponse>(
    "/jobs/run-alert-check",
    { method: "POST" },
    20000,
  );
}

// ====== Portfolio ======
export type PortfolioItem = {
  id: number;
  ticker: string;
  asset_class: string | null;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PortfolioItemWithValue = {
  id: number;
  ticker: string;
  asset_class: string | null;
  quantity: number;
  purchase_price: number;
  current_price: number;
  cost: number;
  value: number;
  profit_loss: number;
  profit_loss_pct: number;
};

export type PortfolioValuation = {
  total_cost: number;
  total_value: number;
  total_profit_loss: number;
  total_profit_loss_pct: number;
  items: PortfolioItemWithValue[];
};

export type PerformerInfo = {
  ticker: string;
  profit_loss_pct: number;
  profit_loss: number;
};

export type PortfolioPerformance = {
  total_positions: number;
  winners: number;
  losers: number;
  win_rate: number;
  best_performer: PerformerInfo | null;
  worst_performer: PerformerInfo | null;
};

export type CreatePortfolioRequest = {
  ticker: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  asset_class?: string;
  notes?: string;
};

export type UpdatePortfolioRequest = {
  quantity?: number;
  purchase_price?: number;
  purchase_date?: string;
  notes?: string;
};

export async function getPortfolio(): Promise<{
  total_count: number;
  items: PortfolioItem[];
}> {
  return apiFetch<{ total_count: number; items: PortfolioItem[] }>(
    "/portfolio",
    { method: "GET" },
  );
}

export async function getPortfolioItem(id: number): Promise<PortfolioItem> {
  return apiFetch<PortfolioItem>(`/portfolio/${id}`, { method: "GET" });
}

export async function createPortfolioItem(
  input: CreatePortfolioRequest,
): Promise<PortfolioItem> {
  return apiFetch<PortfolioItem>("/portfolio", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePortfolioItem(
  id: number,
  input: UpdatePortfolioRequest,
): Promise<PortfolioItem> {
  return apiFetch<PortfolioItem>(`/portfolio/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deletePortfolioItem(id: number): Promise<void> {
  await apiFetch<void>(`/portfolio/${id}`, { method: "DELETE" });
}

export async function getPortfolioValuation(): Promise<PortfolioValuation> {
  return apiFetch<PortfolioValuation>("/portfolio/valuation", {
    method: "GET",
  });
}

export async function getPortfolioPerformance(): Promise<PortfolioPerformance> {
  return apiFetch<PortfolioPerformance>("/portfolio/performance", {
    method: "GET",
  });
}

// ====== Alert History / Stats ======
export type AlertHistoryItem = {
  id: number;
  alert_id: number;
  ticker: string;
  asset_class: string | null;
  triggered_at: string;
  trigger_price: number;
  base_price: number | null;
  alert_type: "absolute" | "percent";
  direction: "up" | "down";
  threshold_value: number | null;
  price_change_pct: number | null;
  notification_sent: boolean;
};

export type AlertHistoryResponse = {
  total_count: number;
  period_days: number;
  history: AlertHistoryItem[];
};

export type AlertStatsSummary = {
  period_days: number;
  total_triggers: number;
  up_triggers: number;
  down_triggers: number;
  up_percentage: number;
  down_percentage: number;
  notification_success_rate: number;
  top_tickers: { ticker: string; count: number }[];
  asset_class_breakdown: { asset_class: string; count: number }[];
  daily_trigger_counts: { date: string; count: number }[];
};

export async function getAlertHistory(
  days = 30,
): Promise<AlertHistoryResponse> {
  return apiFetch<AlertHistoryResponse>(`/alerts/history?days=${days}`, {
    method: "GET",
  });
}

export async function getAlertStatsSummary(
  days = 30,
): Promise<AlertStatsSummary> {
  return apiFetch<AlertStatsSummary>(`/alerts/stats/summary?days=${days}`, {
    method: "GET",
  });
}

// ====== Screenshot Import ======
export type ExtractedAsset = {
  ticker: string;
  name: string;
  current_price: number;
  asset_class: "us_stock" | "jp_stock" | "crypto" | "precious_metal" | "etf";
  confidence: number;
};

export type ScreenshotImportResponse = {
  success: boolean;
  extracted_assets: ExtractedAsset[];
  assets_found: number;
  message: string;
  dev_mode: boolean;
};

// multipart/form-data で画像を送信
export async function analyzeScreenshot(
  imageUri: string,
): Promise<ScreenshotImportResponse> {
  const formData = new FormData();

  // React Native の場合、画像URIからファイルを作成
  const filename = imageUri.split("/").pop() || "screenshot.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("image", {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 60000); // 60秒タイムアウト（AI解析は時間がかかる）

  try {
    const headers: Record<string, string> = {
      "X-API-Key": API_KEY,
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/screenshot/import`, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });

    const text = await res.text().catch(() => "");
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    return data as ScreenshotImportResponse;
  } finally {
    clearTimeout(id);
  }
}


// ====== User Plan ======
export type UserPlan = {
  plan_type: "free" | "paid";
  plan_expiry: string | null;
  limits: {
    max_assets: number;
    screenshot_import_per_month: number;
    monitoring_hours: string;
    check_interval_hours: number;
  };
};

export async function getUserPlan(): Promise<UserPlan> {
  return apiFetch<UserPlan>("/user/plan", { method: "GET" });
}

// ====== Subscriptions ======
export type SubscriptionStatus = {
  plan_type: "free" | "paid";
  is_active: boolean;
  expiry_date: string | null;
  auto_renew_enabled: boolean | null;
  product_id: string | null;
  status: "free" | "active" | "expired" | "grace_period";
};

export type VerifySubscriptionRequest = {
  platform: "ios" | "android";
  receipt_data: string;
  product_id?: string;
};

export type VerifySubscriptionResponse = {
  success: boolean;
  message: string;
  subscription: SubscriptionStatus | null;
};

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return apiFetch<SubscriptionStatus>("/subscriptions/status", {
    method: "GET",
  });
}

export async function verifySubscription(
  input: VerifySubscriptionRequest,
): Promise<VerifySubscriptionResponse> {
  return apiFetch<VerifySubscriptionResponse>("/subscriptions/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function devUpgrade(): Promise<SubscriptionStatus> {
  return apiFetch<SubscriptionStatus>("/user/upgrade", { method: "POST" });
}

export async function devDowngrade(): Promise<SubscriptionStatus> {
  return apiFetch<SubscriptionStatus>("/user/downgrade", { method: "POST" });
}

// ====== Asset Categories & Search ======
export type AssetCategory = {
  asset_class: string;
  name_ja: string;
  name_en: string;
  icon: string;
  color: string;
  default_threshold_up: number;
  default_threshold_down: number;
  currency: string;
  market_hours: string;
};

export type Asset = {
  asset_id: string;
  ticker: string;
  name: string;
  name_ja?: string;
  asset_class: string;
  currency: string;
  is_popular?: boolean;
};

export async function getAssetCategories(): Promise<AssetCategory[]> {
  return apiFetch<AssetCategory[]>("/assets/categories", { method: "GET" });
}

export type SearchAssetsParams = {
  asset_class?: string;
  query?: string;
  popular_only?: boolean;
  limit?: number;
};

export async function searchAssets(
  params: SearchAssetsParams,
): Promise<Asset[]> {
  const searchParams = new URLSearchParams();
  if (params.asset_class)
    searchParams.append("asset_class", params.asset_class);
  if (params.query) searchParams.append("query", params.query);
  if (params.popular_only) searchParams.append("popular_only", "true");
  if (params.limit) searchParams.append("limit", params.limit.toString());

  const queryString = searchParams.toString();
  const path = queryString ? `/assets/search?${queryString}` : "/assets/search";
  return apiFetch<Asset[]>(path, { method: "GET" });
}
