// app/alerts/[id].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Alert as AlertType, deleteAlert, getAlert, updateAlert } from "../api";

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const alertId = Number(id);
  const [alert, setAlert] = useState<AlertType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 単体アラート読み込み
  const load = useCallback(async () => {
    if (!alertId || Number.isNaN(alertId)) {
      setError("不正なIDです");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const res = await getAlert(alertId);
      setAlert(res as AlertType);
    } catch (e: any) {
      console.error("❌ getAlert error", e);
      setError(e?.message ?? "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    load();
  }, [load]);

  // 表示用ラベル（一覧と同じ）
  const label = useMemo(() => {
    if (!alert) return "";
    const a: any = alert as any;
    if (a.alert_type === "percent") {
      return `${a.condition} ${a.percent_threshold ?? "?"}%`;
    }
    return `${a.condition} ${a.threshold_price ?? "?"}`;
  }, [alert]);

  // 有効/無効トグル
  // 仕様整合：ON に戻す時だけ notified=false を送って「再通知可能状態」に戻す
  const handleToggle = useCallback(async () => {
    if (!alert || toggling) return;

    try {
      setToggling(true);

      const nextIsActive = !alert.is_active;
      const payload = nextIsActive
        ? { is_active: true, notified: false } // ONにする時だけ通知済み解除
        : { is_active: false }; // OFFにする時は notified を触らない

      const updated = await updateAlert(alert.id, payload);
      setAlert(updated as AlertType);
    } catch (e: any) {
      console.error("❌ toggle error", e);
      setError(e?.message ?? "状態の更新に失敗しました");
    } finally {
      setToggling(false);
    }
  }, [alert, toggling]);

  // 削除
  const handleDelete = useCallback(async () => {
    if (!alert || deleting) return;

    console.log("📱 Detail handleDelete id =", alert.id);

    try {
      setDeleting(true);
      await deleteAlert(alert.id);
      router.back(); // 一覧に戻る
    } catch (e: any) {
      console.error("❌ delete error", e);
      setError(e?.message ?? "削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }, [alert, deleting, router]);

  // ------- render -------

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "white",
        }}
      >
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>読み込み中...</Text>
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
          backgroundColor: "white",
        }}
      >
        <Text style={{ fontSize: 18, marginBottom: 8 }}>エラー</Text>
        <Text style={{ textAlign: "center" }}>
          {error ?? "データがありません"}
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 16,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 6,
            backgroundColor: "#007AFF",
          }}
        >
          <Text style={{ color: "white" }}>戻る</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // alert_type / condition の存在を前提（一覧と同じ契約）
  const a: any = alert as any;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <View style={{ padding: 16 }}>
        {/* ヘッダー */}
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
              backgroundColor: "#eee",
              marginRight: 12,
            }}
          >
            <Text>← 戻る</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 22, fontWeight: "600" }}>
            {a.symbol} の詳細
          </Text>
        </View>

        {/* 基本情報 */}
        <View
          style={{
            padding: 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#ddd",
            backgroundColor: "#fafafa",
          }}
        >
          <Text style={{ fontSize: 16, marginBottom: 4 }}>
            銘柄: {a.symbol}
          </Text>

          <Text style={{ fontSize: 16, marginBottom: 4 }}>
            種別: {a.alert_type}
          </Text>

          <Text style={{ fontSize: 16, marginBottom: 4 }}>
            条件: {label}
          </Text>

          <Text style={{ fontSize: 16, marginBottom: 4 }}>
            状態: {a.is_active ? "有効" : "無効"}
          </Text>

          <Text style={{ fontSize: 14, color: "#666" }}>
            通知済み: {a.notified ? "はい" : "いいえ"}
          </Text>
        </View>

        {/* notified の仕様説明 */}
        {a.notified ? (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#ddd",
              backgroundColor: "#f7f7f7",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>
              このアラートは通知済みです
            </Text>
            <Text style={{ fontSize: 13, color: "#444", marginBottom: 6 }}>
              条件成立時にすでに通知が送信されています。二重通知防止のため、現在は同じ条件では再通知されません。
            </Text>
            <Text style={{ fontSize: 13, color: "#444" }}>
              再度通知を受けたい場合は、一度アラートを「無効」にしてから「有効」にしてください。（OFF → ON）
            </Text>
          </View>
        ) : null}

        {/* アクションボタン群 */}
        <View style={{ marginTop: 24 }}>
          <TouchableOpacity
            onPress={handleToggle}
            disabled={toggling}
            style={{
              paddingVertical: 10,
              borderRadius: 6,
              backgroundColor: a.is_active ? "#999" : "#34c759",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              {toggling
                ? "切り替え中..."
                : a.is_active
                ? "アラートを無効にする"
                : "アラートを有効にする"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            style={{
              paddingVertical: 10,
              borderRadius: 6,
              backgroundColor: "#ff3b30",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              {deleting ? "削除中..." : "このアラートを削除"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}


