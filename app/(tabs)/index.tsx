// app/(tabs)/index.tsx
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Alert as RNAlert,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Alert as AlertType,
  createAlert,
  deleteAlert,
  getAlerts,
  getHealth,
  registerPushToken,
  runAlertCheck,
  testPush,
  updateAlert,
} from "../api";

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

// ==== 通知ハンドラ（既存方針を尊重しつつ、シンプルに） ====
Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    } as Notifications.NotificationBehavior;
  },
});

/**
 * 目的：ログが見えない状況でも原因を確定できるように、
 * 成功/失敗理由を文字列で返す（UIに表示する）。
 *
 * ※トークン全体は漏洩リスクがあるので、UI表示は先頭だけ。
 */
async function registerForPushNotificationsAsync(): Promise<string> {
  try {
    if (!Device.isDevice) {
      return "NG: Device.isDevice is false（実機として認識されていない）";
    }

    // Android 通知チャネル
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    // 権限
    const perm = await Notifications.getPermissionsAsync();
    let finalStatus = perm.status;

    if (finalStatus !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }

    if (finalStatus !== "granted") {
      return `NG: notification permission = ${finalStatus}`;
    }

    // ★ここが ExpoPushToken ではなく FCM デバイストークンになっているポイント
    const tokenResult = await Notifications.getDevicePushTokenAsync();
    const token = (tokenResult as any)?.data;

    if (!token || typeof token !== "string") {
      return `NG: FCM token invalid. tokenResult=${JSON.stringify(tokenResult)}`;
    }

    // バックエンドへ登録
    try {
      await registerPushToken(token);
    } catch (e: any) {
      return `NG: registerPushToken failed: ${String(e?.message ?? e)}`;
    }

    // tokenは先頭だけ表示
    return `OK: token acquired & registered. token(head)=${token.slice(0, 12)}...`;
  } catch (e: any) {
    return `NG: exception: ${String(e?.message ?? e)}`;
  }
}

const HomeScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [health, setHealth] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertType[]>([]);

  // ★追加：push の状態をUIに出す
  const [pushDebug, setPushDebug] = useState<string>(
    "(push debug: not started)"
  );

  const [newSymbol, setNewSymbol] = useState("");
  const [newCondition, setNewCondition] = useState<"above" | "below">("above");

  // ★追加：アラート種別
  const [newAlertType, setNewAlertType] = useState<"absolute" | "percent">(
    "absolute"
  );

  // absolute用（価格）
  const [newThreshold, setNewThreshold] = useState("");

  // percent用（%）
  const [newPercentThreshold, setNewPercentThreshold] = useState("");

  // ==== 初期ロード & フォーカス時のリロード ====
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

  // ==== FCM token 登録 ====
  useEffect(() => {
    (async () => {
      const msg = await registerForPushNotificationsAsync();
      setPushDebug(msg);
    })();
  }, []);

  // ==== Alert 操作 ====
  const handleCreateAlert = useCallback(async () => {
    if (!newSymbol) {
      RNAlert.alert("入力エラー", "銘柄を入力してください。");
      return;
    }

    try {
      if (newAlertType === "absolute") {
        if (!newThreshold) {
          RNAlert.alert("入力エラー", "閾値価格を入力してください。");
          return;
        }
        const threshold = Number(newThreshold);
        if (Number.isNaN(threshold)) {
          RNAlert.alert("入力エラー", "閾値価格は数値で入力してください。");
          return;
        }

        const created = await createAlert({
          symbol: newSymbol,
          condition: newCondition,
          alert_type: "absolute",
          threshold_price: threshold,
          is_active: true,
        });

        setAlerts((prev) => [...prev, created]);
        setNewSymbol("");
        setNewThreshold("");
        return;
      }

      // percent
      if (!newPercentThreshold) {
        RNAlert.alert("入力エラー", "閾値(%)を入力してください。");
        return;
      }
      const pct = Number(newPercentThreshold);
      if (Number.isNaN(pct)) {
        RNAlert.alert("入力エラー", "閾値(%)は数値で入力してください。");
        return;
      }

      const created = await createAlert({
        symbol: newSymbol,
        condition: newCondition,
        alert_type: "percent",
        percent_threshold: pct,
        // base_price は backend 側で自動セットする想定なら送らなくてOK
        is_active: true,
      });

      setAlerts((prev) => [...prev, created]);
      setNewSymbol("");
      setNewPercentThreshold("");
    } catch (e) {
      console.error("Failed to create alert:", e);
      RNAlert.alert("エラー", "アラートの作成に失敗しました。");
    }
  }, [newSymbol, newCondition, newAlertType, newThreshold, newPercentThreshold]);

  const handleDeleteAlert = useCallback(async (id: number) => {
    try {
      await deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error("Failed to delete alert:", e);
      RNAlert.alert("エラー", "アラートの削除に失敗しました。");
    }
  }, []);

  // ★重要：ONに戻す時だけ notified=false を送って再通知可能に戻す
  const handleToggleActive = useCallback(async (alert: AlertType) => {
    try {
      const nextIsActive = !alert.is_active;

      const payload = nextIsActive
        ? { is_active: true, notified: false } // ONにする時だけ通知済みを解除
        : { is_active: false }; // OFFにする時は触らない

      const updated = await updateAlert(alert.id, payload);
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
    } catch (e) {
      console.error("Failed to toggle alert:", e);
      RNAlert.alert("エラー", "アラートの更新に失敗しました。");
    }
  }, []);

  const handleTestPush = useCallback(async () => {
    try {
      await testPush();
      RNAlert.alert("送信完了", "バックエンドからテスト通知を送信しました。");
    } catch (e) {
      console.error("Failed to send test push:", e);
      RNAlert.alert("エラー", "テスト通知の送信に失敗しました。");
    }
  }, []);

  const handleRunAlertCheck = useCallback(async () => {
    try {
      const res = await runAlertCheck();
      const ids = (res?.triggered_alerts || [])
        .map((x: any) => (typeof x === "object" ? x.id : x))
        .join(", ");

      RNAlert.alert("ジョブ実行", `トリガー: ${ids || "なし"}`);
    } catch (e) {
      console.error("Failed to run alert check:", e);
      RNAlert.alert("エラー", "ジョブ実行に失敗しました。");
    }
  }, []);

  // ==== UI ====
  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>バックエンド状態</Text>
        <Text style={{ marginTop: 4 }}>health: {health}</Text>
        <Text style={{ marginTop: 8 }}>push: {pushDebug}</Text>
      </View>

      {/* Pushテスト＆ジョブテスト */}
      <View style={{ flexDirection: "row", marginBottom: 16 }}>
        <TouchableOpacity
          onPress={handleTestPush}
          style={{
            padding: 8,
            backgroundColor: "#2196f3",
            borderRadius: 4,
            marginRight: 8,
          }}
        >
          <Text style={{ color: "#fff" }}>テスト通知送信</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRunAlertCheck}
          style={{
            padding: 8,
            backgroundColor: "#4caf50",
            borderRadius: 4,
          }}
        >
          <Text style={{ color: "#fff" }}>アラート判定実行</Text>
        </TouchableOpacity>
      </View>

      {/* 新規アラート作成 */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
          新規アラート作成
        </Text>

        <TextInput
          placeholder="銘柄 (例: AAPL)"
          value={newSymbol}
          onChangeText={setNewSymbol}
          placeholderTextColor="#64748B"
          style={{
            borderWidth: 1,
            borderColor: "#38BDF8",
            borderRadius: 4,
            padding: 8,
            marginBottom: 8,
            backgroundColor: "#1E293B",
            color: "#E5E7EB",
          }}
        />

        {/* アラート種別 */}
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => setNewAlertType("absolute")}
            style={{
              flex: 1,
              padding: 8,
              backgroundColor: newAlertType === "absolute" ? "#2196f3" : "#e0e0e0",
              borderRadius: 4,
              marginRight: 4,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: newAlertType === "absolute" ? "#fff" : "#000",
              }}
            >
              価格（absolute）
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setNewAlertType("percent")}
            style={{
              flex: 1,
              padding: 8,
              backgroundColor: newAlertType === "percent" ? "#2196f3" : "#e0e0e0",
              borderRadius: 4,
              marginLeft: 4,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: newAlertType === "percent" ? "#fff" : "#000",
              }}
            >
              変動率（percent）
            </Text>
          </TouchableOpacity>
        </View>

        {/* 閾値入力（種別で切替） */}
        {newAlertType === "absolute" ? (
          <TextInput
            placeholder="閾値価格 (例: 150)"
            value={newThreshold}
            onChangeText={setNewThreshold}
            keyboardType="numeric"
            placeholderTextColor="#64748B"
            style={{
              borderWidth: 1,
              borderColor: "#38BDF8",
              borderRadius: 4,
              padding: 8,
              marginBottom: 8,
              backgroundColor: "#1E293B",
              color: "#E5E7EB",
            }}
          />
        ) : (
          <TextInput
            placeholder="閾値(%) (例: 5.0)"
            value={newPercentThreshold}
            onChangeText={setNewPercentThreshold}
            keyboardType="numeric"
            placeholderTextColor="#64748B"
            style={{
              borderWidth: 1,
              borderColor: "#38BDF8",
              borderRadius: 4,
              padding: 8,
              marginBottom: 8,
              backgroundColor: "#1E293B",
              color: "#E5E7EB",
            }}
          />
        )}

        {/* 条件 */}
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => setNewCondition("above")}
            style={{
              flex: 1,
              padding: 8,
              backgroundColor: newCondition === "above" ? "#2196f3" : "#e0e0e0",
              borderRadius: 4,
              marginRight: 4,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: newCondition === "above" ? "#fff" : "#000000ff",
              }}
            >
              以上で通知
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setNewCondition("below")}
            style={{
              flex: 1,
              padding: 8,
              backgroundColor: newCondition === "below" ? "#2196f3" : "#e0e0e0",
              borderRadius: 4,
              marginLeft: 4,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: newCondition === "below" ? "#fff" : "#000",
              }}
            >
              以下で通知
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleCreateAlert}
          style={{
            padding: 10,
            backgroundColor: "#673ab7",
            borderRadius: 4,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>追加</Text>
        </TouchableOpacity>
      </View>

      {/* アラート一覧 */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
          登録済みアラート
        </Text>

        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const label =
              item.alert_type === "percent"
                ? `${item.condition} ${item.percent_threshold ?? "?"}%`
                : `${item.condition} ${item.threshold_price ?? "?"}`;

            return (
              <View
                style={{
                  padding: 8,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: "#334155",
                  borderRadius: 4,
                  backgroundColor: "#0B1220",
                }}
              >
                {/* 1行目：銘柄＋条件＋通知済みバッジ */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "bold",
                      color: "#E5E7EB",
                      marginRight: 8,
                    }}
                  >
                    {item.symbol} ({item.alert_type}) / {label}
                  </Text>

                  {item.notified ? (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor: "#334155",
                      }}
                    >
                      <Text style={{ color: "#E5E7EB", fontSize: 12 }}>
                        通知済み
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={{ color: "#94A3B8", marginTop: 6 }}>
                  有効: {item.is_active ? "ON" : "OFF"}
                </Text>

                {/* 仕様説明（notified=true のときだけ） */}
                {item.notified ? (
                  <Text style={{ color: "#94A3B8", marginTop: 4, fontSize: 12 }}>
                    二重通知防止のため、このアラートは再通知されません。再度通知したい場合は一度 OFF にしてから ON にしてください。
                  </Text>
                ) : null}

                <View style={{ flexDirection: "row", marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleToggleActive(item)}
                    style={{
                      padding: 6,
                      borderRadius: 4,
                      backgroundColor: item.is_active ? "#ff9800" : "#4caf50",
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ color: "#fff" }}>
                      {item.is_active ? "無効化" : "有効化"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteAlert(item.id)}
                    style={{
                      padding: 6,
                      borderRadius: 4,
                      backgroundColor: "#f44336",
                    }}
                  >
                    <Text style={{ color: "#fff" }}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
