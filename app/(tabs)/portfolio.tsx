// app/(tabs)/portfolio.tsx
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  deletePortfolioItem,
  getPortfolioPerformance,
  getPortfolioValuation,
  PortfolioPerformance,
  PortfolioValuation,
} from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function PortfolioScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [valuation, setValuation] = useState<PortfolioValuation | null>(null);
  const [performance, setPerformance] = useState<PortfolioPerformance | null>(
    null
  );

  const loadData = useCallback(async () => {
    try {
      const [valuationRes, performanceRes] = await Promise.all([
        getPortfolioValuation(),
        getPortfolioPerformance(),
      ]);

      setValuation(valuationRes);
      setPerformance(performanceRes);
    } catch (error) {
      console.error("Failed to load portfolio data:", error);
      Alert.alert("エラー", "ポートフォリオデータの読み込みに失敗しました。");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && isAuthenticated) {
        loadData();
      }
    }, [authLoading, isAuthenticated, loadData])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  const handleDelete = useCallback(
    async (id: number, ticker: string) => {
      Alert.alert(
        "削除確認",
        `${ticker} をポートフォリオから削除しますか？`,
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "削除",
            style: "destructive",
            onPress: async () => {
              try {
                await deletePortfolioItem(id);
                Alert.alert("成功", "銘柄を削除しました。");
                loadData();
              } catch (error) {
                console.error("Failed to delete portfolio item:", error);
                Alert.alert("エラー", "削除に失敗しました。");
              }
            },
          },
        ]
      );
    },
    [loadData]
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
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#E5E7EB", marginBottom: 16 }}>
          ポートフォリオ
        </Text>

        {valuation && (
          <View
            style={{
              backgroundColor: "#1E293B",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 14, color: "#94A3B8", marginBottom: 8 }}>
              総評価額
            </Text>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "#E5E7EB",
                marginBottom: 16,
              }}
            >
              ${valuation.total_value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                  取得コスト
                </Text>
                <Text style={{ fontSize: 16, color: "#E5E7EB", marginTop: 4 }}>
                  ${valuation.total_cost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              <View>
                <Text style={{ fontSize: 12, color: "#94A3B8" }}>損益</Text>
                <Text
                  style={{
                    fontSize: 16,
                    color:
                      valuation.total_profit_loss >= 0 ? "#4ade80" : "#f87171",
                    marginTop: 4,
                    fontWeight: "bold",
                  }}
                >
                  {valuation.total_profit_loss >= 0 ? "+" : ""}
                  ${valuation.total_profit_loss.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  ({valuation.total_profit_loss_pct >= 0 ? "+" : ""}
                  {valuation.total_profit_loss_pct.toFixed(2)}%)
                </Text>
              </View>
            </View>
          </View>
        )}

        {performance && performance.total_positions > 0 && (
          <View
            style={{
              backgroundColor: "#1E293B",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#E5E7EB",
                marginBottom: 12,
              }}
            >
              パフォーマンス
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: "#94A3B8" }}>勝率</Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#38BDF8",
                    marginTop: 4,
                  }}
                >
                  {performance.win_rate.toFixed(0)}%
                </Text>
              </View>

              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: "#94A3B8" }}>含み益</Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#4ade80",
                    marginTop: 4,
                  }}
                >
                  {performance.winners}
                </Text>
              </View>

              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: "#94A3B8" }}>含み損</Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#f87171",
                    marginTop: 4,
                  }}
                >
                  {performance.losers}
                </Text>
              </View>
            </View>

            {performance.best_performer && (
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: "#334155",
                }}
              >
                <Text style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>
                  最高パフォーマンス
                </Text>
                <Text style={{ fontSize: 14, color: "#4ade80", fontWeight: "bold" }}>
                  {performance.best_performer.ticker}: +
                  {performance.best_performer.profit_loss_pct.toFixed(2)}%
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <FlatList
        data={valuation?.items || []}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#38BDF8"
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 32 }}>
            <Text style={{ color: "#94A3B8", fontSize: 16 }}>
              ポートフォリオが空です。
            </Text>
            <Text style={{ color: "#64748B", fontSize: 14, marginTop: 8 }}>
              右上の「+ 追加」から銘柄を登録してください。
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#1E293B",
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <View>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#E5E7EB" }}>
                  {item.ticker}
                </Text>
                <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                  {item.quantity} 株 @ ${item.purchase_price.toFixed(2)}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 16, color: "#E5E7EB" }}>
                  ${item.value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: item.profit_loss >= 0 ? "#4ade80" : "#f87171",
                    marginTop: 2,
                    fontWeight: "bold",
                  }}
                >
                  {item.profit_loss >= 0 ? "+" : ""}
                  {item.profit_loss_pct.toFixed(2)}%
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: "#334155",
              }}
            >
              <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                現在価格: ${item.current_price.toFixed(2)}
              </Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => router.push(`/portfolio/${item.id}` as any)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 4,
                    backgroundColor: "#334155",
                  }}
                >
                  <Text style={{ color: "#E5E7EB", fontSize: 12 }}>編集</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.ticker)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 4,
                    backgroundColor: "#7f1d1d",
                  }}
                >
                  <Text style={{ color: "#E5E7EB", fontSize: 12 }}>削除</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* 追加ボタン（固定フッター） */}
      <View style={{ padding: 16, paddingTop: 8 }}>
        <TouchableOpacity
          onPress={() => router.push("/portfolio/select-asset" as any)}
          style={{
            backgroundColor: "#1D4ED8",
            padding: 16,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
            + 追加
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
