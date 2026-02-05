// app/portfolio/add.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createPortfolioItem } from "../api";

export default function AddPortfolioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    ticker?: string;
    asset_name?: string;
    asset_class?: string;
    currency?: string;
  }>();

  const [ticker] = useState(params.ticker ?? "");
  const assetName = params.asset_name ?? "";
  const assetClass = params.asset_class ?? "us_stock";
  const currency = params.currency ?? "USD";

  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // パラメータなしで開かれた場合は銘柄選択へリダイレクト
  if (!ticker) {
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
        <Text style={{ color: "#E5E7EB", fontSize: 16, marginBottom: 16 }}>
          銘柄を選択してください
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/portfolio/select-asset" as any)}
          style={{
            backgroundColor: "#1D4ED8",
            padding: 14,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>銘柄を選択</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleSubmit = async () => {
    if (!quantity.trim() || Number.isNaN(Number(quantity)) || Number(quantity) <= 0) {
      Alert.alert("入力エラー", "数量は正の数値で入力してください。");
      return;
    }

    if (
      !purchasePrice.trim() ||
      Number.isNaN(Number(purchasePrice)) ||
      Number(purchasePrice) <= 0
    ) {
      Alert.alert("入力エラー", "取得単価は正の数値で入力してください。");
      return;
    }

    try {
      setIsLoading(true);

      await createPortfolioItem({
        ticker,
        quantity: Number(quantity),
        purchase_price: Number(purchasePrice),
        purchase_date: `${purchaseDate}T00:00:00`,
        asset_class: assetClass,
        notes: notes.trim() || undefined,
      });

      Alert.alert("成功", "ポートフォリオに追加しました。", [
        {
          text: "OK",
          onPress: () => {
            router.dismissAll();
            router.replace("/(tabs)/portfolio" as any);
          },
        },
      ]);
    } catch (error: any) {
      console.error("Failed to create portfolio item:", error);
      Alert.alert("エラー", "追加に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
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
              marginBottom: 24,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: 16 }}
            >
              <Text style={{ color: "#38BDF8", fontSize: 16 }}>← 戻る</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: "#E5E7EB" }}>
              銘柄を追加
            </Text>
          </View>

          {/* 選択された銘柄 */}
          <View
            style={{
              backgroundColor: "#1E293B",
              padding: 16,
              borderRadius: 12,
              marginBottom: 24,
            }}
          >
            <Text style={{ color: "#94A3B8", fontSize: 12 }}>選択した銘柄</Text>
            <Text
              style={{ color: "#E5E7EB", fontSize: 22, fontWeight: "bold", marginTop: 4 }}
            >
              {ticker}
            </Text>
            {assetName ? (
              <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 4 }}>
                {assetName}
              </Text>
            ) : null}
            <Text style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
              通貨: {currency}
            </Text>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: "#E5E7EB", marginBottom: 8 }}>
              数量 *
            </Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="例: 10"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              style={{
                backgroundColor: "#1E293B",
                borderWidth: 1,
                borderColor: "#38BDF8",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: "#E5E7EB",
              }}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: "#E5E7EB", marginBottom: 8 }}>
              取得単価 ({currency}) *
            </Text>
            <TextInput
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              placeholder="例: 150.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              style={{
                backgroundColor: "#1E293B",
                borderWidth: 1,
                borderColor: "#38BDF8",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: "#E5E7EB",
              }}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: "#E5E7EB", marginBottom: 8 }}>
              購入日
            </Text>
            <TextInput
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#64748B"
              style={{
                backgroundColor: "#1E293B",
                borderWidth: 1,
                borderColor: "#38BDF8",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: "#E5E7EB",
              }}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: "#E5E7EB", marginBottom: 8 }}>
              メモ (任意)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="例: 長期保有"
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: "#1E293B",
                borderWidth: 1,
                borderColor: "#38BDF8",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: "#E5E7EB",
                textAlignVertical: "top",
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            style={{
              backgroundColor: "#1D4ED8",
              padding: 16,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
                追加する
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
