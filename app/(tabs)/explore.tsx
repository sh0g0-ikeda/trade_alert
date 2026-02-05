// app/(tabs)/explore.tsx
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  Text,
  View,
} from "react-native";

import {
  AlertHistoryItem,
  AlertHistoryResponse,
  AlertStatsSummary,
  getAlertHistory,
  getAlertStatsSummary,
} from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function NotificationsScreen() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<AlertHistoryResponse | null>(null);
  const [summary, setSummary] = useState<AlertStatsSummary | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [historyRes, summaryRes] = await Promise.all([
        getAlertHistory(30),
        getAlertStatsSummary(30),
      ]);
      setHistory(historyRes);
      setSummary(summaryRes);
    } catch (error) {
      console.error("Failed to load alert history:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && isAuthenticated) {
        loadData();
      }
    }, [authLoading, isAuthenticated, loadData])
  );

  if (authLoading || isLoading) {
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
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#E5E7EB", marginBottom: 4 }}>
          通知履歴
        </Text>
        <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
          直近30日
        </Text>

        {summary && (
          <View
            style={{
              marginTop: 24,
              backgroundColor: "#1E293B",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ color: "#E5E7EB", fontSize: 16, fontWeight: "bold" }}>
              サマリー
            </Text>
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#94A3B8", fontSize: 12 }}>発火回数</Text>
                <Text style={{ color: "#E5E7EB", fontSize: 20, fontWeight: "bold" }}>
                  {summary.total_triggers}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#94A3B8", fontSize: 12 }}>通知成功率</Text>
                <Text style={{ color: "#E5E7EB", fontSize: 20, fontWeight: "bold" }}>
                  {summary.notification_success_rate.toFixed(1)}%
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#94A3B8", fontSize: 12 }}>上昇</Text>
                <Text style={{ color: "#4ade80", fontSize: 16, fontWeight: "bold" }}>
                  {summary.up_triggers} ({summary.up_percentage.toFixed(1)}%)
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#94A3B8", fontSize: 12 }}>下落</Text>
                <Text style={{ color: "#f87171", fontSize: 16, fontWeight: "bold" }}>
                  {summary.down_triggers} ({summary.down_percentage.toFixed(1)}%)
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={history?.history ?? []}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 32 }}>
            <Text style={{ color: "#94A3B8", fontSize: 16 }}>
              まだ通知はありません。
            </Text>
            <Text style={{ color: "#64748B", fontSize: 14, marginTop: 8 }}>
              価格変動を検知するとここに表示されます。
            </Text>
          </View>
        }
        renderItem={({ item }: { item: AlertHistoryItem }) => {
          const directionLabel = item.direction === "up" ? "上昇" : "下落";
          const changePct =
            item.price_change_pct !== null ? item.price_change_pct.toFixed(2) : "--";

          return (
            <View
              style={{
                backgroundColor: "#1E293B",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#E5E7EB", fontSize: 16, fontWeight: "bold" }}>
                  {item.ticker}
                </Text>
                <Text
                  style={{
                    color: item.direction === "up" ? "#4ade80" : "#f87171",
                    fontWeight: "bold",
                  }}
                >
                  {directionLabel} {changePct}%
                </Text>
              </View>

              <Text style={{ color: "#94A3B8", marginTop: 6 }}>
                発火価格: {item.trigger_price.toFixed(2)}
              </Text>
              <Text style={{ color: "#94A3B8", marginTop: 2, fontSize: 12 }}>
                {new Date(item.triggered_at).toLocaleString()}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
