// app/portfolio/[id].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

import { getPortfolioItem, updatePortfolioItem } from "../api";

export default function EditPortfolioScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const portfolioId = Number(id);

  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    if (!portfolioId || Number.isNaN(portfolioId)) {
      Alert.alert("エラー", "不正なIDです。");
      router.back();
      return;
    }

    try {
      const item = await getPortfolioItem(portfolioId);
      setTicker(item.ticker);
      setQuantity(String(item.quantity));
      setPurchasePrice(String(item.purchase_price));
      setPurchaseDate(item.purchase_date.split("T")[0]);
      setNotes(item.notes ?? "");
    } catch (error) {
      console.error("Failed to load portfolio item:", error);
      Alert.alert("エラー", "データの取得に失敗しました。");
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      setSaving(true);
      await updatePortfolioItem(portfolioId, {
        quantity: Number(quantity),
        purchase_price: Number(purchasePrice),
        purchase_date: `${purchaseDate}T00:00:00`,
        notes: notes.trim() || undefined,
      });
      Alert.alert("成功", "更新しました。", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Failed to update portfolio item:", error);
      Alert.alert("エラー", "更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16 }}>
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
              編集: {ticker}
            </Text>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: "#94A3B8" }}>
              ティッカーシンボル
            </Text>
            <Text style={{ fontSize: 18, color: "#E5E7EB", marginTop: 6 }}>
              {ticker}
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
              取得単価 (USD) *
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
            disabled={saving}
            style={{
              backgroundColor: "#1D4ED8",
              padding: 16,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
                更新する
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
