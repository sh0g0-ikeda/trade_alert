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
Notifications.setNotificationHandler({ handleNotification: async () => { return { shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false, } as Notifications.NotificationBehavior; }, });





async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Must use physical device for Push Notifications");
    return null;
  }

  // Android 通知チャネル
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  // 権限
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.warn("Failed to get push token permissions!");
    return null;
  }

  // ★ここが ExpoPushToken ではなく FCM デバイストークンになっているポイント
  const tokenResult = await Notifications.getDevicePushTokenAsync();
  const token = (tokenResult as any)?.data;
  console.log("🔥 FCM Device Push Token:", token);

  if (!token || typeof token !== "string") {
    console.warn("FCM token is not available or invalid:", tokenResult);
    return null;
  }

  // バックエンドへ登録
  try {
    await registerPushToken(token);
    console.log("Push token registered on backend.");
  } catch (e) {
    console.error("Failed to register push token:", e);
  }

  return token;
}

const HomeScreen: React.FC = () => {

  const [isLoading, setIsLoading] = useState(true);
  const [health, setHealth] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertType[]>([]);

  const [newSymbol, setNewSymbol] = useState("");
  const [newCondition, setNewCondition] = useState<"above" | "below">("above");
  const [newThreshold, setNewThreshold] = useState("");

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
      try {
        await registerForPushNotificationsAsync();
      } catch (e) {
        console.error("Error during push registration:", e);
      }
    })();
  }, []);

  // ==== Alert 操作 ====
  const handleCreateAlert = useCallback(async () => {
    if (!newSymbol || !newThreshold) {
      RNAlert.alert("入力エラー", "銘柄と価格を入力してください。");
      return;
    }

    const threshold = Number(newThreshold);
    if (Number.isNaN(threshold)) {
      RNAlert.alert("入力エラー", "価格は数値で入力してください。");
      return;
    }

    try {
      const created = await createAlert({
        symbol: newSymbol,
        condition: newCondition,
        threshold_price: threshold,
        is_active: true,
      });
      setAlerts((prev) => [...prev, created]);
      setNewSymbol("");
      setNewThreshold("");
    } catch (e) {
      console.error("Failed to create alert:", e);
      RNAlert.alert("エラー", "アラートの作成に失敗しました。");
    }
  }, [newSymbol, newThreshold, newCondition]);

  const handleDeleteAlert = useCallback(async (id: number) => {
    try {
      await deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error("Failed to delete alert:", e);
      RNAlert.alert("エラー", "アラートの削除に失敗しました。");
    }
  }, []);

  const handleToggleActive = useCallback(
    async (alert: AlertType) => {
      try {
        const updated = await updateAlert(alert.id, {
          is_active: !alert.is_active,
        });
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? updated : a))
        );
      } catch (e) {
        console.error("Failed to toggle alert:", e);
        RNAlert.alert("エラー", "アラートの更新に失敗しました。");
      }
    },
    []
  );

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
      RNAlert.alert(
        "ジョブ実行",
        `トリガーされたアラートID: ${(res?.triggered_alerts || []).join(
          ", "
        )}`
      );
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
          style={{
            borderWidth: 1,
            borderColor: "#ff0000ff",
            borderRadius: 4,
            padding: 8,
            marginBottom: 8,
          }}
        />
        <TextInput
          placeholder="閾値価格 (例: 150)"
          value={newThreshold}
          onChangeText={setNewThreshold}
          keyboardType="numeric"
          style={{
            borderWidth: 1,
            borderColor: "#ff0000ff",
            borderRadius: 4,
            padding: 8,
            marginBottom: 8,
          }}
        />
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => setNewCondition("above")}
            style={{
              flex: 1,
              padding: 8,
              backgroundColor:
                newCondition === "above" ? "#2196f3" : "#e0e0e0",
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
              backgroundColor:
                newCondition === "below" ? "#2196f3" : "#e0e0e0",
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
          renderItem={({ item }) => (
            <View
              style={{
                padding: 8,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 4,
              }}
            >
              <Text style={{ fontWeight: "bold" }}>
                {item.symbol} ({item.condition} {item.threshold_price})
              </Text>
              <Text>有効: {item.is_active ? "ON" : "OFF"}</Text>
              <Text>通知済み: {item.notified ? "はい" : "いいえ"}</Text>
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
          )}
        />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
