// app/(tabs)/settings.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert as RNAlert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { runAlertCheck, testPush } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, planType } = useAuth();

  const [testingPush, setTestingPush] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);

  const handleTestPush = async () => {
    try {
      setTestingPush(true);
      const res = await testPush();
      RNAlert.alert(
        "テスト通知",
        `${res.message}\n送信先トークン数: ${res.token_count}`
      );
    } catch (e: any) {
      RNAlert.alert("エラー", e?.message ?? "テスト通知の送信に失敗しました。");
    } finally {
      setTestingPush(false);
    }
  };

  const handleRunAlertCheck = async () => {
    try {
      setRunningCheck(true);
      const res = await runAlertCheck();
      const triggered = res.triggered_alerts?.length ?? 0;
      RNAlert.alert(
        "アラートチェック完了",
        `発火したアラート: ${triggered}件\n通知先トークン数: ${res.token_count}`
      );
    } catch (e: any) {
      RNAlert.alert("エラー", e?.message ?? "アラートチェックに失敗しました。");
    } finally {
      setRunningCheck(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#E5E7EB" }}>
          設定
        </Text>

        {/* アカウント情報 */}
        <View
          style={{
            marginTop: 16,
            backgroundColor: "#1E293B",
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#94A3B8", fontSize: 12 }}>アカウント</Text>
          <Text style={{ color: "#E5E7EB", fontSize: 16, marginTop: 8 }}>
            {user?.email ?? "-"}
          </Text>
        </View>

        {/* プラン詳細へのリンク */}
        <TouchableOpacity
          onPress={() => router.push("/settings/plan" as any)}
          style={{
            marginTop: 16,
            backgroundColor: "#1E293B",
            padding: 16,
            borderRadius: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={{ color: "#94A3B8", fontSize: 12 }}>現在のプラン</Text>
            <Text style={{ color: "#E5E7EB", fontSize: 16, marginTop: 4 }}>
              {planType === "paid" ? "Premium プラン" : "Free プラン"}
            </Text>
          </View>
          <Text style={{ color: "#38BDF8", fontSize: 18 }}>→</Text>
        </TouchableOpacity>

        {/* スクショ解析へのリンク */}
        <TouchableOpacity
          onPress={() => router.push("/screenshot/import" as any)}
          style={{
            marginTop: 16,
            backgroundColor: "#1E293B",
            padding: 16,
            borderRadius: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={{ color: "#94A3B8", fontSize: 12 }}>スクショ解析</Text>
            <Text style={{ color: "#E5E7EB", fontSize: 14, marginTop: 4 }}>
              証券アプリの画面から銘柄を自動登録
            </Text>
          </View>
          <Text style={{ color: "#38BDF8", fontSize: 18 }}>→</Text>
        </TouchableOpacity>

        {/* デバッグ・テスト */}
        <Text
          style={{
            color: "#94A3B8",
            fontSize: 14,
            fontWeight: "bold",
            marginTop: 32,
            marginBottom: 12,
          }}
        >
          テスト・デバッグ
        </Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={handleTestPush}
            disabled={testingPush}
            style={{
              flex: 1,
              backgroundColor: "#1E293B",
              padding: 14,
              borderRadius: 8,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#334155",
            }}
          >
            {testingPush ? (
              <ActivityIndicator color="#38BDF8" size="small" />
            ) : (
              <>
                <Text style={{ color: "#E5E7EB", fontWeight: "bold" }}>
                  テスト通知
                </Text>
                <Text style={{ color: "#64748B", fontSize: 11, marginTop: 4 }}>
                  プッシュ通知の確認
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRunAlertCheck}
            disabled={runningCheck}
            style={{
              flex: 1,
              backgroundColor: "#1E293B",
              padding: 14,
              borderRadius: 8,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#334155",
            }}
          >
            {runningCheck ? (
              <ActivityIndicator color="#38BDF8" size="small" />
            ) : (
              <>
                <Text style={{ color: "#E5E7EB", fontWeight: "bold" }}>
                  手動チェック
                </Text>
                <Text style={{ color: "#64748B", fontSize: 11, marginTop: 4 }}>
                  アラート条件を即時確認
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ログアウト */}
        <TouchableOpacity
          onPress={logout}
          style={{
            marginTop: 32,
            backgroundColor: "#DC2626",
            padding: 12,
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#E5E7EB", fontWeight: "bold" }}>ログアウト</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
