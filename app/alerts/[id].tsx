// app/alerts/[id].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert as AlertType, deleteAlert, getAlert, updateAlert } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { planType } = useAuth();
  const insets = useSafeAreaInsets();

  const alertId = Number(id);
  const [alert, setAlert] = useState<AlertType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingBase, setResettingBase] = useState(false);

  const [alertUpPct, setAlertUpPct] = useState("");
  const [alertDownPct, setAlertDownPct] = useState("");
  const [thresholdUp, setThresholdUp] = useState("");
  const [thresholdDown, setThresholdDown] = useState("");
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    if (!alertId || Number.isNaN(alertId)) {
      setError("不正なIDです。");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const res = await getAlert(alertId);
      setAlert(res as AlertType);
    } catch (e: any) {
      console.error("getAlert error", e);
      setError(e?.message ?? "アラートの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!alert) return;
    setAlertUpPct(
      alert.alert_up_pct !== null && alert.alert_up_pct !== undefined
        ? String(alert.alert_up_pct)
        : ""
    );
    setAlertDownPct(
      alert.alert_down_pct !== null && alert.alert_down_pct !== undefined
        ? String(alert.alert_down_pct)
        : ""
    );
    setThresholdUp(
      alert.threshold_price_up !== null && alert.threshold_price_up !== undefined
        ? String(alert.threshold_price_up)
        : ""
    );
    setThresholdDown(
      alert.threshold_price_down !== null && alert.threshold_price_down !== undefined
        ? String(alert.threshold_price_down)
        : ""
    );
    setIsActive(alert.is_active);
  }, [alert]);

  const label = useMemo(() => {
    if (!alert) return "";
    if (alert.alert_type === "percent") {
      if (
        alert.alert_up_pct !== undefined ||
        alert.alert_down_pct !== undefined
      ) {
        const up = alert.alert_up_pct ?? "?";
        const down = alert.alert_down_pct ?? "?";
        return `↑ ${up}% / ↓ ${down}%`;
      }
      if (alert.condition) {
        return `${alert.condition} ${alert.percent_threshold ?? "?"}%`;
      }
      return "—";
    }
    if (
      alert.threshold_price_up !== undefined ||
      alert.threshold_price_down !== undefined
    ) {
      const up = alert.threshold_price_up ?? "?";
      const down = alert.threshold_price_down ?? "?";
      return `↑ ${up} / ↓ ${down}`;
    }
    if (alert.condition) {
      return `${alert.condition} ${alert.threshold_price ?? "?"}`;
    }
    return "—";
  }, [alert]);

  const isNotified = useMemo(() => {
    if (!alert) return false;
    return alert.notified ?? !!alert.last_notified_at;
  }, [alert]);

  const handleSave = useCallback(async () => {
    if (!alert || saving) return;

    if (planType === "free") {
      setError(
        "無償プランでは閾値編集はできません。プレミアムにアップグレードしてください。"
      );
      return;
    }

    try {
      setSaving(true);
      const payload: any = { is_active: isActive };

      if (alert.alert_type === "percent") {
        if (!alertUpPct.trim() || !alertDownPct.trim()) {
          setError("上下の変動率を入力してください。");
          return;
        }
        const up = Number(alertUpPct);
        const down = Number(alertDownPct);
        if (Number.isNaN(up) || up <= 0 || Number.isNaN(down) || down <= 0) {
          setError("変動率は正の数値で入力してください。");
          return;
        }
        payload.alert_up_pct = up;
        payload.alert_down_pct = down;
      } else {
        if (!thresholdUp.trim() || !thresholdDown.trim()) {
          setError("上下の価格を入力してください。");
          return;
        }
        const up = Number(thresholdUp);
        const down = Number(thresholdDown);
        if (Number.isNaN(up) || up <= 0 || Number.isNaN(down) || down <= 0) {
          setError("価格は正の数値で入力してください。");
          return;
        }
        payload.threshold_price_up = up;
        payload.threshold_price_down = down;
      }

      const updated = await updateAlert(alert.id, payload);
      setAlert(updated as AlertType);
      setError(null);
    } catch (e: any) {
      console.error("update error", e);
      setError(e?.message ?? "更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  }, [
    alert,
    alertDownPct,
    alertUpPct,
    isActive,
    saving,
    thresholdDown,
    thresholdUp,
    planType,
  ]);

  const handleResetBasePrice = useCallback(async () => {
    if (!alert || resettingBase) return;
    try {
      setResettingBase(true);
      const updated = await updateAlert(alert.id, { reset_base_price: true });
      setAlert(updated as AlertType);
      setError(null);
    } catch (e: any) {
      console.error("reset base price error", e);
      setError(e?.message ?? "基準価格のリセットに失敗しました。");
    } finally {
      setResettingBase(false);
    }
  }, [alert, resettingBase]);
  const handleDelete = useCallback(async () => {
    if (!alert || deleting) return;

    try {
      setDeleting(true);
      await deleteAlert(alert.id);
      router.back();
    } catch (e: any) {
      console.error("delete error", e);
      setError(e?.message ?? "削除に失敗しました。");
    } finally {
      setDeleting(false);
    }
  }, [alert, deleting, router]);

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0B1220",
        }}
      >
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: "#E5E7EB" }}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  if (error || !alert) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
          backgroundColor: "#0B1220",
        }}
      >
        <Text style={{ fontSize: 18, marginBottom: 8, color: "#E5E7EB" }}>
          エラー
        </Text>
        <Text style={{ textAlign: "center", color: "#94A3B8" }}>
          {error ?? "データがありません。"}
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 16,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 6,
            backgroundColor: "#1D4ED8",
          }}
        >
          <Text style={{ color: "white" }}>戻る</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 24 + insets.bottom,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 6,
              backgroundColor: "#1E293B",
              marginRight: 12,
            }}
          >
            <Text style={{ color: "#E5E7EB" }}>戻る</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 22, fontWeight: "600", color: "#E5E7EB" }}>
            {alert.symbol} の詳細
          </Text>
        </View>

        <View
          style={{
            padding: 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#334155",
            backgroundColor: "#111827",
          }}
        >
          <Text style={{ fontSize: 16, marginBottom: 4, color: "#E5E7EB" }}>
            銘柄: {alert.symbol}
          </Text>

          <Text style={{ fontSize: 16, marginBottom: 4, color: "#E5E7EB" }}>
            種別: {alert.alert_type}
          </Text>

          <Text style={{ fontSize: 16, marginBottom: 4, color: "#E5E7EB" }}>
            閾値: {label}
          </Text>

          <Text style={{ fontSize: 16, marginBottom: 4, color: "#E5E7EB" }}>
            状態: {alert.is_active ? "有効" : "無効"}
          </Text>

          <Text style={{ fontSize: 14, color: "#94A3B8" }}>
            通知済み: {isNotified ? "はい" : "いいえ"}
          </Text>
        </View>

        <View
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#334155",
            backgroundColor: "#0F172A",
          }}
        >
          <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 6 }}>
            基準価格
          </Text>
          <Text style={{ color: "#E5E7EB", fontSize: 16, fontWeight: "600" }}>
            {alert.base_price !== null && alert.base_price !== undefined
              ? alert.base_price
              : "-"}
          </Text>
          <TouchableOpacity
            onPress={handleResetBasePrice}
            disabled={resettingBase}
            style={{
              marginTop: 10,
              paddingVertical: 10,
              borderRadius: 6,
              backgroundColor: resettingBase ? "#374151" : "#1E293B",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#334155",
            }}
          >
            <Text style={{ color: "#E5E7EB", fontWeight: "600" }}>
              {resettingBase ? "リセット中..." : "現在価格でリセット"}
            </Text>
          </TouchableOpacity>
        </View>

        {isNotified ? (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#334155",
              backgroundColor: "#0F172A",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 6,
                color: "#E5E7EB",
              }}
            >
              このアラートは通知済みです
            </Text>
            <Text style={{ fontSize: 13, color: "#94A3B8", marginBottom: 6 }}>
              通知済みのアラートは再通知されません。
            </Text>
            <Text style={{ fontSize: 13, color: "#94A3B8" }}>
              必要なら一度無効化してから再度有効化してください。
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              color: "#E5E7EB",
              fontSize: 16,
              fontWeight: "bold",
              marginBottom: 8,
            }}
          >
            閾値編集
          </Text>

          {planType === "free" && (
            <View
              style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: "#111827",
                borderWidth: 1,
                borderColor: "#334155",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#F59E0B", fontSize: 12 }}>
                無償プランでは閾値編集はできません。プレミアムで解除されます。
              </Text>
            </View>
          )}

          {alert.alert_type === "percent" ? (
            <View>
              <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 6 }}>
                上昇時 (%) / 下落時 (%)
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  value={alertUpPct}
                  onChangeText={setAlertUpPct}
                  keyboardType="decimal-pad"
                  editable={planType !== "free"}
                  placeholder="上昇 (例: 5)"
                  placeholderTextColor="#64748B"
                  style={{
                    flex: 1,
                    backgroundColor: "#1E293B",
                    borderWidth: 1,
                    borderColor: "#38BDF8",
                    borderRadius: 8,
                    padding: 12,
                    color: "#E5E7EB",
                  }}
                />
                <TextInput
                  value={alertDownPct}
                  onChangeText={setAlertDownPct}
                  keyboardType="decimal-pad"
                  editable={planType !== "free"}
                  placeholder="下落 (例: 5)"
                  placeholderTextColor="#64748B"
                  style={{
                    flex: 1,
                    backgroundColor: "#1E293B",
                    borderWidth: 1,
                    borderColor: "#38BDF8",
                    borderRadius: 8,
                    padding: 12,
                    color: "#E5E7EB",
                  }}
                />
              </View>
            </View>
          ) : (
            <View>
              <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 6 }}>
                上限価格 / 下限価格
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  value={thresholdUp}
                  onChangeText={setThresholdUp}
                  keyboardType="decimal-pad"
                  editable={planType !== "free"}
                  placeholder="上限"
                  placeholderTextColor="#64748B"
                  style={{
                    flex: 1,
                    backgroundColor: "#1E293B",
                    borderWidth: 1,
                    borderColor: "#38BDF8",
                    borderRadius: 8,
                    padding: 12,
                    color: "#E5E7EB",
                  }}
                />
                <TextInput
                  value={thresholdDown}
                  onChangeText={setThresholdDown}
                  keyboardType="decimal-pad"
                  editable={planType !== "free"}
                  placeholder="下限"
                  placeholderTextColor="#64748B"
                  style={{
                    flex: 1,
                    backgroundColor: "#1E293B",
                    borderWidth: 1,
                    borderColor: "#38BDF8",
                    borderRadius: 8,
                    padding: 12,
                    color: "#E5E7EB",
                  }}
                />
              </View>
            </View>
          )}

          <View style={{ marginTop: 12, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => setIsActive((prev) => !prev)}
              style={{
                paddingVertical: 10,
                borderRadius: 6,
                backgroundColor: isActive ? "#10B981" : "#6B7280",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>
                {isActive ? "アラート有効" : "アラート無効"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || planType === "free"}
            style={{
              paddingVertical: 12,
              borderRadius: 6,
              backgroundColor:
                saving || planType === "free" ? "#374151" : "#1D4ED8",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              {saving ? "更新中..." : "変更を保存"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            style={{
              paddingVertical: 10,
              borderRadius: 6,
              backgroundColor: "#EF4444",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              {deleting ? "削除中..." : "このアラートを削除"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


