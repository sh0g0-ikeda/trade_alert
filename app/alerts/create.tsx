// app/alerts/create.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert as RNAlert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createAlert } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function CreateAlertScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planType } = useAuth();
  const params = useLocalSearchParams<{
    ticker: string;
    asset_name: string;
    asset_class: string;
    currency: string;
    default_threshold_up: string;
    default_threshold_down: string;
  }>();

  const { ticker, asset_name, currency, default_threshold_up, default_threshold_down } =
    params;

  const [alertType, setAlertType] = useState<"absolute" | "percent">("percent");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [thresholdPrice, setThresholdPrice] = useState("");
  const [percentThreshold, setPercentThreshold] = useState(
    condition === "above" ? default_threshold_up : default_threshold_down
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFreePlan = planType === "free";

  const handleConditionChange = (newCondition: "above" | "below") => {
    setCondition(newCondition);
    if (alertType === "percent") {
      setPercentThreshold(
        newCondition === "above" ? default_threshold_up : default_threshold_down
      );
    }
  };

  const handleCreate = async () => {
    try {
      setIsSubmitting(true);

      if (alertType === "absolute") {
        if (!thresholdPrice.trim()) {
          RNAlert.alert("入力エラー", "閾値価格を入力してください。");
          return;
        }
        const threshold = Number(thresholdPrice);
        if (Number.isNaN(threshold) || threshold <= 0) {
          RNAlert.alert("入力エラー", "有効な価格を入力してください。");
          return;
        }

        await createAlert({
          symbol: ticker,
          condition,
          alert_type: "absolute",
          threshold_price: threshold,
          is_active: true,
        });
      } else {
        if (!percentThreshold?.trim()) {
          RNAlert.alert("入力エラー", "変動率を入力してください。");
          return;
        }
        const pct = Number(percentThreshold);
        if (Number.isNaN(pct) || pct <= 0) {
          RNAlert.alert("入力エラー", "有効な変動率を入力してください。");
          return;
        }

        await createAlert({
          symbol: ticker,
          condition,
          alert_type: "percent",
          percent_threshold: pct,
          is_active: true,
        });
      }

      RNAlert.alert("成功", "アラートを作成しました。", [
        {
          text: "OK",
          onPress: () => {
            router.dismissAll();
            router.replace("/(tabs)" as any);
          },
        },
      ]);
    } catch (e: any) {
      console.error("Failed to create alert:", e);
      RNAlert.alert("エラー", e?.message ?? "アラートの作成に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 24 + insets.bottom,
        }}
      >
        {/* ヘッダー */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Text style={{ color: "#38BDF8", fontSize: 16 }}>戻る</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#E5E7EB" }}>
            アラート作成
          </Text>
        </View>

        {/* 選択中の銘柄 */}
        <View
          style={{
            backgroundColor: "#1E293B",
            padding: 16,
            borderRadius: 12,
            marginBottom: 24,
          }}
        >
          <Text style={{ color: "#94A3B8", fontSize: 12 }}>選択中の銘柄</Text>
          <Text
            style={{
              color: "#E5E7EB",
              fontSize: 24,
              fontWeight: "bold",
              marginTop: 4,
            }}
          >
            {ticker}
          </Text>
          <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 4 }}>
            {asset_name}
          </Text>
          <Text style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
            通貨: {currency}
          </Text>
        </View>

        {/* アラート種別 */}
        <Text
          style={{
            color: "#E5E7EB",
            fontSize: 16,
            fontWeight: "bold",
            marginBottom: 12,
          }}
        >
          アラート種別
        </Text>
        <View style={{ flexDirection: "row", marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setAlertType("percent")}
            style={{
              flex: 1,
              padding: 14,
              backgroundColor: alertType === "percent" ? "#1D4ED8" : "#1E293B",
              borderRadius: 8,
              marginRight: 8,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: alertType === "percent" ? "#fff" : "#94A3B8",
                fontWeight: "bold",
              }}
            >
              変動率 (%)
            </Text>
            <Text
              style={{
                color: alertType === "percent" ? "#E5E7EB" : "#64748B",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              価格変動率で通知
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setAlertType("absolute")}
            style={{
              flex: 1,
              padding: 14,
              backgroundColor: alertType === "absolute" ? "#1D4ED8" : "#1E293B",
              borderRadius: 8,
              marginLeft: 8,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: alertType === "absolute" ? "#fff" : "#94A3B8",
                fontWeight: "bold",
              }}
            >
              価格 (絶対値)
            </Text>
            <Text
              style={{
                color: alertType === "absolute" ? "#E5E7EB" : "#64748B",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              指定価格で通知
            </Text>
          </TouchableOpacity>
        </View>

        {/* 通知条件 */}
        <Text
          style={{
            color: "#E5E7EB",
            fontSize: 16,
            fontWeight: "bold",
            marginBottom: 12,
          }}
        >
          通知条件
        </Text>
        <View style={{ flexDirection: "row", marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => handleConditionChange("above")}
            style={{
              flex: 1,
              padding: 14,
              backgroundColor: condition === "above" ? "#10B981" : "#1E293B",
              borderRadius: 8,
              marginRight: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 20, marginBottom: 4 }}>↑</Text>
            <Text
              style={{
                color: condition === "above" ? "#fff" : "#94A3B8",
                fontWeight: "bold",
              }}
            >
              上昇時
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleConditionChange("below")}
            style={{
              flex: 1,
              padding: 14,
              backgroundColor: condition === "below" ? "#EF4444" : "#1E293B",
              borderRadius: 8,
              marginLeft: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 20, marginBottom: 4 }}>↓</Text>
            <Text
              style={{
                color: condition === "below" ? "#fff" : "#94A3B8",
                fontWeight: "bold",
              }}
            >
              下落時
            </Text>
          </TouchableOpacity>
        </View>

        {/* 閾値入力 */}
        <Text
          style={{
            color: "#E5E7EB",
            fontSize: 16,
            fontWeight: "bold",
            marginBottom: 12,
          }}
        >
          {alertType === "percent" ? "変動率 (%)" : `閾値価格 (${currency})`}
        </Text>

        {alertType === "percent" ? (
          <View>
            <TextInput
              placeholder="萓・ 5.0"
              value={percentThreshold}
              onChangeText={setPercentThreshold}
              keyboardType="numeric"
              editable={!isFreePlan}
              placeholderTextColor="#64748B"
              style={{
                backgroundColor: "#1E293B",
                borderWidth: 1,
                borderColor: "#38BDF8",
                borderRadius: 8,
                padding: 14,
                color: "#E5E7EB",
                fontSize: 18,
                marginBottom: 8,
              }}
            />
            {isFreePlan && (
              <Text style={{ color: "#F59E0B", fontSize: 12, marginBottom: 4 }}>
                無料プランは±5%固定です。プレミアムで解除できます。
              </Text>
            )}
            <Text style={{ color: "#94A3B8", fontSize: 12 }}>
              価格が {percentThreshold || "?"}%{" "}
              {condition === "above" ? "上昇" : "下落"} したら通知
            </Text>
          </View>
        ) : (
          <View>
            <TextInput
              placeholder={`萓・ 150`}
              value={thresholdPrice}
              onChangeText={setThresholdPrice}
              keyboardType="numeric"
              editable={!isFreePlan}
              placeholderTextColor="#64748B"
              style={{
                backgroundColor: "#1E293B",
                borderWidth: 1,
                borderColor: "#38BDF8",
                borderRadius: 8,
                padding: 14,
                color: "#E5E7EB",
                fontSize: 18,
                marginBottom: 8,
              }}
            />
            {isFreePlan && (
              <Text style={{ color: "#F59E0B", fontSize: 12, marginBottom: 4 }}>
                無料プランは閾値編集ができません。プレミアムで解除できます。
              </Text>
            )}
            <Text style={{ color: "#94A3B8", fontSize: 12 }}>
              価格が {currency} {thresholdPrice || "?"}{" "}
              {condition === "above" ? "以上" : "以下"} になったら通知
            </Text>
          </View>
        )}

        {/* 作成ボタン */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={isSubmitting}
          style={{
            backgroundColor: isSubmitting ? "#374151" : "#1D4ED8",
            padding: 16,
            borderRadius: 8,
            alignItems: "center",
            marginTop: 32,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
            {isSubmitting ? "作成中..." : "アラートを作成"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}





