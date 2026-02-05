// app/(tabs)/index.tsx
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Alert as RNAlert,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Alert as AlertType,
  deleteAlert,
  getAlerts,
  getHealth,
  registerPushToken,
  updateAlert,
} from "../api";

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useAuth } from "../contexts/AuthContext";

// 通知ハンドラ
Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    } as Notifications.NotificationBehavior;
  },
});

async function registerForPushNotificationsAsync(): Promise<string> {
  try {
    if (!Device.isDevice) {
      return "NG: 実機でないと通知は使えません。";
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const perm = await Notifications.getPermissionsAsync();
    let finalStatus = perm.status;

    if (finalStatus !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }

    if (finalStatus !== "granted") {
      return `NG: 通知許可= ${finalStatus}`;
    }

    const tokenResult = await Notifications.getDevicePushTokenAsync();
    const token = (tokenResult as any)?.data;

    if (!token || typeof token !== "string") {
      return `NG: FCMトークンを取得できません ${JSON.stringify(tokenResult)}`;
    }

    try {
      await registerPushToken(token);
    } catch (e: any) {
      return `NG: pushトークン登録に失敗 ${String(e?.message ?? e)}`;
    }

    return `OK: token registered (${token.slice(0, 12)}...)`;
  } catch (e: any) {
    return `NG: exception: ${String(e?.message ?? e)}`;
  }
}

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, planType } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [health, setHealth] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertType[]>([]);

  const [pushDebug, setPushDebug] = useState<string>(
    "(push debug: not started)"
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth/login" as any);
    }
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [healthRes, alertsRes] = await Promise.all([
        getHealth(),
        getAlerts(),
      ]);
      setHealth(healthRes?.status ?? "unknown");
      setAlerts(alertsRes);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    (async () => {
      const msg = await registerForPushNotificationsAsync();
      setPushDebug(msg);
    })();
  }, []);

  const handleDeleteAlert = useCallback(async (id: number) => {
    try {
      await deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error("Failed to delete alert:", e);
      RNAlert.alert("エラー", "アラート削除に失敗しました。");
    }
  }, []);

  const handleToggleActive = useCallback(async (alert: AlertType) => {
    try {
      const nextIsActive = !alert.is_active;

      const payload = nextIsActive ? { is_active: true } : { is_active: false };
      const updated = await updateAlert(alert.id, payload);
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
    } catch (e) {
      console.error("Failed to toggle alert:", e);
      RNAlert.alert("エラー", "アラート更新に失敗しました。");
    }
  }, []);

  if (authLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0B1220",
        }}
      >
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: "#E5E7EB" }}>認証中...</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0B1220",
        }}
      >
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: "#E5E7EB" }}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
      <View style={{ flex: 1, padding: 16 }}>
        {/* ヘッダー */}
        <View
          style={{
            marginBottom: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#E5E7EB" }}>
              ホーム
            </Text>
            <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
              {user?.email} / {planType === "free" ? "無料" : "有料"}プラン
            </Text>
          </View>
        </View>

        {/* ステータス */}
        <View
          style={{
            backgroundColor: "#1E293B",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#94A3B8", fontSize: 12 }}>サーバー状態</Text>
            <Text
              style={{
                color: health === "ok" ? "#10B981" : "#EF4444",
                fontSize: 12,
                fontWeight: "bold",
              }}
            >
              {health === "ok" ? "正常" : health ?? "不明"}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <Text style={{ color: "#94A3B8", fontSize: 12 }}>通知</Text>
            <Text
              style={{
                color: pushDebug.startsWith("OK") ? "#10B981" : "#F59E0B",
                fontSize: 12,
              }}
              numberOfLines={1}
            >
              {pushDebug.startsWith("OK") ? "登録済み" : "未登録"}
            </Text>
          </View>
        </View>

        {/* ヒント */}
        <View
          style={{
            marginBottom: 12,
            padding: 10,
            backgroundColor: "#1E293B",
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#94A3B8", fontSize: 12 }}>
            通知済みのアラートは再通知されません。必要なら一度OFFにしてからONにしてください。
          </Text>
        </View>

        {/* アラート一覧 */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              marginBottom: 12,
              color: "#E5E7EB",
            }}
          >
            登録済みアラート ({alerts.length})
          </Text>

          <FlatList
            data={alerts}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: 32,
                }}
              >
                <Text style={{ color: "#64748B", fontSize: 14 }}>
                  アラートがありません
                </Text>
                <Text style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
                  右下のボタンから作成してください
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const label = (() => {
                if (item.alert_type === "percent") {
                  if (
                    item.alert_up_pct !== undefined ||
                    item.alert_down_pct !== undefined
                  ) {
                    const up = item.alert_up_pct ?? "?";
                    const down = item.alert_down_pct ?? "?";
                    return `↑ ${up}% / ↓ ${down}%`;
                  }
                  if (item.condition) {
                    return `${item.condition === "above" ? "↑" : "↓"} ${
                      item.percent_threshold ?? "?"
                    }%`;
                  }
                  return "—";
                }

                if (
                  item.threshold_price_up !== undefined ||
                  item.threshold_price_down !== undefined
                ) {
                  const up = item.threshold_price_up ?? "?";
                  const down = item.threshold_price_down ?? "?";
                  return `↑ ${up} / ↓ ${down}`;
                }

                if (item.condition) {
                  return `${item.condition === "above" ? "↑" : "↓"} ${
                    item.threshold_price ?? "?"
                  }`;
                }

                return "—";
              })();
              const isNotified = item.notified ?? !!item.last_notified_at;

              return (
                <View
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: item.is_active ? "#38BDF8" : "#334155",
                    borderRadius: 8,
                    backgroundColor: "#1E293B",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text
                          style={{
                            fontWeight: "bold",
                            color: "#E5E7EB",
                            fontSize: 16,
                          }}
                        >
                          {item.symbol}
                        </Text>
                        <Text
                          style={{
                            color: "#64748B",
                            fontSize: 12,
                            marginLeft: 8,
                          }}
                        >
                          {item.alert_type === "percent" ? "変動率" : "価格"}
                        </Text>
                      </View>
                      {isNotified && (
                        <View
                          style={{
                            marginTop: 6,
                            alignSelf: "flex-start",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            backgroundColor: "#334155",
                          }}
                        >
                          <Text style={{ color: "#94A3B8", fontSize: 10 }}>
                            通知済み
                          </Text>
                        </View>
                      )}

                      <Text style={{ color: "#38BDF8", marginTop: 4 }}>
                        {label}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <TouchableOpacity
                        onPress={() => router.push(`/alerts/${item.id}` as any)}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          borderRadius: 6,
                          backgroundColor: "#1D4ED8",
                          marginRight: 8,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 12 }}>編集</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleActive(item);
                        }}
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          backgroundColor: item.is_active ? "#10B981" : "#6B7280",
                          marginRight: 8,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 12 }}>
                          {item.is_active ? "ON" : "OFF"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          RNAlert.alert(
                            "削除確認",
                            `${item.symbol} のアラートを削除しますか？`,
                            [
                              { text: "キャンセル", style: "cancel" },
                              {
                                text: "削除",
                                style: "destructive",
                                onPress: () => handleDeleteAlert(item.id),
                              },
                            ]
                          );
                        }}
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          backgroundColor: "#374151",
                        }}
                      >
                        <Text style={{ color: "#EF4444", fontSize: 12 }}>削除</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>

        {/* 上限到達時の案内 */}
        {planType === "free" && alerts.length >= 6 && (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              backgroundColor: "#111827",
              borderWidth: 1,
              borderColor: "#334155",
            }}
          >
            <Text style={{ color: "#F59E0B", fontSize: 12, marginBottom: 8 }}>
              無料プランの上限（6件）に達しました。
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/settings/plan" as any)}
              style={{
                backgroundColor: "#38BDF8",
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#0B1220", fontWeight: "bold" }}>
                プレミアムにアップグレード
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          onPress={() => router.push("/alerts/category-select" as any)}
          style={{
            backgroundColor: "#1D4ED8",
            padding: 16,
            borderRadius: 12,
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 20, marginRight: 8 }}>＋</Text>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
            新しいアラートを作成
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

