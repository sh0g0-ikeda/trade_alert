// app/alerts/category-select.tsx
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { AssetCategory, getAssetCategories } from "../api";

export default function CategorySelectScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAssetCategories();
      setCategories(data);
    } catch (e: any) {
      console.error("Failed to load categories:", e);
      setError(e?.message ?? "カテゴリの読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
        <ActivityIndicator color="#38BDF8" />
        <Text style={{ marginTop: 8, color: "#E5E7EB" }}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0B1220",
          padding: 16,
        }}
      >
        <Text style={{ color: "#EF4444", fontSize: 16, marginBottom: 16 }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={loadCategories}
          style={{
            backgroundColor: "#1D4ED8",
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff" }}>再試行</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* ヘッダー */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Text style={{ color: "#38BDF8", fontSize: 16 }}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#E5E7EB" }}>
            銘柄を選択
          </Text>
        </View>

        <Text style={{ color: "#94A3B8", marginBottom: 20 }}>
          アラートを設定するカテゴリを選んでください
        </Text>

        {/* カテゴリグリッド */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.asset_class}
              onPress={() =>
                router.push({
                  pathname: "/alerts/asset-list" as any,
                  params: {
                    asset_class: cat.asset_class,
                    name_ja: cat.name_ja,
                    icon: cat.icon,
                    color: cat.color,
                    currency: cat.currency,
                    default_threshold_up: cat.default_threshold_up.toString(),
                    default_threshold_down: cat.default_threshold_down.toString(),
                  },
                })
              }
              style={{
                width: "48%",
                backgroundColor: "#1E293B",
                padding: 20,
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 2,
                borderColor: cat.color,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>{cat.icon}</Text>
              <Text
                style={{
                  color: "#E5E7EB",
                  fontSize: 16,
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                {cat.name_ja}
              </Text>
              <Text style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
                {cat.currency}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
