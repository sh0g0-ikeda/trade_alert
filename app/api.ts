// app/api.ts

// ✅ Ubuntu FastAPI の LAN IP（ngrok禁止）
const API_BASE_URL = "http://192.168.0.13:8000";

// ✅ APIキー（固定）
const API_KEY =
  "8587dec7dd75fb56d52f5d3631ea7c12d5c6964ac9ac38ed59cd57ece7d40b7e";

// ==========================
// 共通 fetch ラッパ（1本化）
// ==========================
async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...(options.headers || {}),
    };

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
  return apiFetch<HealthResponse>("/health", { method: "GET" }, 5000);
}

// ====== Alerts ======
export type Condition = "above" | "below";
export type AlertType = "absolute" | "percent";

export type Alert = {
  id: number;
  symbol: string;
  condition: Condition;

  threshold_price: number | null;

  is_active: boolean;
  notified: boolean;

  alert_type: AlertType;
  base_price: number | null;
  percent_threshold: number | null;

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
  input: UpdateAlertRequest
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
  platform: "android" | "ios" | "unknown" = "android"
): Promise<PushTokenResponse> {
  return apiFetch<PushTokenResponse>("/push-tokens/register", {
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
  return apiFetch<TestPushResponse>("/push-tokens/test", { method: "POST" }, 15000);
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
    20000
  );
}
