// app/screenshot/import.tsx
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  analyzeScreenshot,
  createAlert,
  ExtractedAsset,
} from "../api";

const ASSET_CLASS_LABEL: Record<string, string> = {
  us_stock: "米国株",
  jp_stock: "日本株",
  crypto: "暗号資産",
  precious_metal: "貴金属",
  etf: "ETF",
};

export default function ScreenshotImportScreen() {
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const [candidates, setCandidates] = useState<ExtractedAsset[]>([]);
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("権限エラー", "画像ライブラリへのアクセス許可が必要です。");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setCandidates([]);
      setSelectedTickers(new Set());
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("権限エラー", "カメラへのアクセス許可が必要です。");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setCandidates([]);
      setSelectedTickers(new Set());
    }
  };

  const analyzeImage = async () => {
    if (!imageUri) return;

    try {
      setIsAnalyzing(true);
      const response = await analyzeScreenshot(imageUri);

      if (response.success && response.extracted_assets) {
        setCandidates(response.extracted_assets);

        // 全選択をデフォルトに
        const allTickers = new Set(response.extracted_assets.map((a) => a.ticker));
        setSelectedTickers(allTickers);

        if (response.extracted_assets.length === 0) {
          Alert.alert("結果", "銘柄が検出されませんでした。別の画像をお試しください。");
        }
      } else {
        Alert.alert("エラー", "解析に失敗しました。");
      }
    } catch (error) {
      console.error("Screenshot analysis failed:", error);
      Alert.alert("エラー", "スクリーンショットの解析に失敗しました。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSelection = (ticker: string) => {
    setSelectedTickers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ticker)) {
        newSet.delete(ticker);
      } else {
        newSet.add(ticker);
      }
      return newSet;
    });
  };

  const confirmImport = async () => {
    if (selectedTickers.size === 0) {
      Alert.alert("選択エラー", "インポートする銘柄を選択してください。");
      return;
    }

    const selectedAssets = candidates.filter((c) => selectedTickers.has(c.ticker));

    try {
      setIsConfirming(true);
      let successCount = 0;

      for (const asset of selectedAssets) {
        try {
          await createAlert({
            symbol: asset.ticker,
            condition: "above",
            alert_type: "percent",
            base_price: asset.current_price,
            percent_threshold: 5,
          });
          successCount++;
        } catch (e) {
          console.error(`Failed to create alert for ${asset.ticker}:`, e);
        }
      }

      if (successCount > 0) {
        Alert.alert(
          "成功",
          `${successCount}件の銘柄をアラートに登録しました。`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("エラー", "インポートに失敗しました。");
      }
    } catch (error) {
      console.error("Confirm import failed:", error);
      Alert.alert("エラー", "インポートの確定に失敗しました。");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
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
            スクショ解析
          </Text>
        </View>

        <Text style={{ color: "#94A3B8", marginBottom: 16 }}>
          証券アプリのスクリーンショットをAIで解析し、保有銘柄を自動登録します。
        </Text>

        {/* 画像選択ボタン */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={pickImage}
            style={{
              flex: 1,
              backgroundColor: "#1E293B",
              padding: 16,
              borderRadius: 8,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#38BDF8",
            }}
          >
            <Text style={{ color: "#E5E7EB", fontWeight: "bold" }}>📁 ライブラリから選択</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={takePhoto}
            style={{
              flex: 1,
              backgroundColor: "#1E293B",
              padding: 16,
              borderRadius: 8,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#38BDF8",
            }}
          >
            <Text style={{ color: "#E5E7EB", fontWeight: "bold" }}>📷 カメラで撮影</Text>
          </TouchableOpacity>
        </View>

        {/* プレビュー */}
        {imageUri && (
          <View style={{ marginBottom: 16 }}>
            <Image
              source={{ uri: imageUri }}
              style={{
                width: "100%",
                height: 200,
                borderRadius: 8,
                backgroundColor: "#1E293B",
              }}
              resizeMode="contain"
            />
          </View>
        )}

        {/* 解析ボタン */}
        {imageUri && candidates.length === 0 && (
          <TouchableOpacity
            onPress={analyzeImage}
            disabled={isAnalyzing}
            style={{
              backgroundColor: "#1D4ED8",
              padding: 16,
              borderRadius: 8,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {isAnalyzing ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  解析中...（最大60秒）
                </Text>
              </View>
            ) : (
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                AIで解析する
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* 候補リスト */}
        {candidates.length > 0 && (
          <View>
            <Text
              style={{
                color: "#E5E7EB",
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 12,
              }}
            >
              検出された銘柄 ({candidates.length}件)
            </Text>

            {candidates.map((candidate) => {
              const isSelected = selectedTickers.has(candidate.ticker);
              return (
                <TouchableOpacity
                  key={candidate.ticker}
                  onPress={() => toggleSelection(candidate.ticker)}
                  style={{
                    backgroundColor: isSelected ? "#1E3A5F" : "#1E293B",
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? "#38BDF8" : "#334155",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text
                          style={{
                            color: "#E5E7EB",
                            fontSize: 16,
                            fontWeight: "bold",
                          }}
                        >
                          {candidate.ticker}
                        </Text>
                        <Text
                          style={{
                            color: "#94A3B8",
                            fontSize: 12,
                            backgroundColor: "#334155",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          {ASSET_CLASS_LABEL[candidate.asset_class] ?? candidate.asset_class}
                        </Text>
                      </View>
                      <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 4 }}>
                        {candidate.name}
                      </Text>
                      {candidate.current_price > 0 && (
                        <Text style={{ color: "#38BDF8", fontSize: 14, marginTop: 4 }}>
                          検出価格: ¥{candidate.current_price.toLocaleString()}
                        </Text>
                      )}
                    </View>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        borderWidth: 2,
                        borderColor: isSelected ? "#38BDF8" : "#64748B",
                        backgroundColor: isSelected ? "#38BDF8" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected && (
                        <Text style={{ color: "#0B1220", fontWeight: "bold" }}>✓</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* 確定ボタン */}
            <TouchableOpacity
              onPress={confirmImport}
              disabled={isConfirming || selectedTickers.size === 0}
              style={{
                backgroundColor: selectedTickers.size > 0 ? "#16A34A" : "#374151",
                padding: 16,
                borderRadius: 8,
                alignItems: "center",
                marginTop: 16,
              }}
            >
              {isConfirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                  {selectedTickers.size}件をインポート
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
