// app/alerts/[id].tsx

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { deleteAlert, getAlert, updateAlert } from "../api";

type Alert = {
  id: number;
  symbol: string;
  threshold_price: number;
  direction: "above" | "below";
  is_active: boolean;
  notified: boolean;
};

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const alertId = Number(id);
  const [alert, setAlert] = useState<Alert | null>(null);
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
      setAlert(res as Alert);
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

  // 有効/無効トグル
  const handleToggle = useCallback(async () => {
    if (!alert || toggling) return;

    try {
      setToggling(true);
      const updated: Alert = { ...alert, is_active: !alert.is_active };

      await updateAlert(alert.id, {
        symbol: updated.symbol,
        threshold_price: updated.threshold_price,
        direction: updated.direction,
        is_active: updated.is_active,
        notified: updated.notified,
      });

      setAlert(updated);
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

    console.log("📱 Detail handleDelete id =", alert.id); // ★追加

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
        <Text style={{ textAlign: "center" }}>{error ?? "データがありません"}</Text>

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
            {alert.symbol} の詳細
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
            銘柄: {alert.symbol}
          </Text>
          <Text style={{ fontSize: 16, marginBottom: 4 }}>
            条件: {alert.direction} {alert.threshold_price}
          </Text>
          <Text style={{ fontSize: 16, marginBottom: 4 }}>
            状態: {alert.is_active ? "有効" : "無効"}
          </Text>
          <Text style={{ fontSize: 14, color: "#666" }}>
            通知済み: {alert.notified ? "はい" : "いいえ"}
          </Text>
        </View>

        {/* アクションボタン群 */}
        <View style={{ marginTop: 24 }}>
          <TouchableOpacity
            onPress={handleToggle}
            disabled={toggling}
            style={{
              paddingVertical: 10,
              borderRadius: 6,
              backgroundColor: alert.is_active ? "#999" : "#34c759",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              {toggling
                ? "切り替え中..."
                : alert.is_active
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
