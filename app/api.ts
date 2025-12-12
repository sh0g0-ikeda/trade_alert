
// app/api.ts

const API_BASE_URL = "http://192.168.0.11:8000"; // ★Ubuntu側FastAPIのIP:PORTに合わせる
// app/api.ts

const API_KEY =
  "8587dec7dd75fb56d52f5d3631ea7c12d5c6964ac9ac38ed59cd57ece7d40b7e";





async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("API error:", res.status, text);
    throw new Error(`API error: ${res.status} ${text}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

// ====== Health ======
export async function getHealth() {
  return apiFetch("/health");
}

// ====== Alerts ======



export type Alert = {
  id: number;
  symbol: string;
  condition: "above" | "below";
  threshold_price: number;
  is_active: boolean;
  notified: boolean;
  created_at: string;
  updated_at: string;
};

export async function getAlerts(): Promise<Alert[]> {
  return apiFetch("/alerts");
}

export async function createAlert(input: {
  symbol: string;
  condition: "above" | "below";
  threshold_price: number;
  is_active: boolean;
}): Promise<Alert> {
  return apiFetch("/alerts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAlert(
  id: number,
  input: Partial<{
    symbol: string;
    condition: "above" | "below";
    threshold_price: number;
    is_active: boolean;
    notified: boolean;
  }>
): Promise<Alert> {
  return apiFetch(`/alerts/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteAlert(id: number): Promise<void> {
  await apiFetch(`/alerts/${id}`, {
    method: "DELETE",
  });
}

// ====== Push Tokens ======

export async function registerPushToken(token: string) {
  return apiFetch("/push-tokens/register", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function testPush() {
  return apiFetch("/push-tokens/test", {
    method: "POST",
  });
}

// ====== Jobs ======

export async function runAlertCheck() {
  return apiFetch("/jobs/run-alert-check", {
    method: "POST",
  });
}

// ★ 追加済みの型はそのままでOK
export type TestPushResponse = {
  message: string;
  token_count: number;
};

// ★ この関数部分「だけ」こう書き換えて
export async function sendTestNotification(): Promise<TestPushResponse> {
  const res = await apiFetch("/push-tokens/test", {
    method: "POST",
  });
  return res as TestPushResponse;
}
