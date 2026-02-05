// app/portfolio/select-asset.tsx
// カテゴリ選択 → 銘柄選択 → portfolio/add へ遷移するフロー
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Asset,
  AssetCategory,
  getAssetCategories,
  searchAssets,
} from "../api";

type Step = "category" | "asset";

export default function SelectAssetForPortfolioScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("category");

  // カテゴリ
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // 銘柄
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [popularAssets, setPopularAssets] = useState<Asset[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAssetCategories();
        setCategories(data);
      } catch (e) {
        console.error("Failed to load categories:", e);
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  const handleSelectCategory = useCallback(async (cat: AssetCategory) => {
    setSelectedCategory(cat);
    setStep("asset");
    setLoadingAssets(true);

    try {
      const [popular, all] = await Promise.all([
        searchAssets({ asset_class: cat.asset_class, popular_only: true }),
        searchAssets({ asset_class: cat.asset_class }),
      ]);
      setPopularAssets(popular);
      setAllAssets(all);
    } catch (e) {
      console.error("Failed to load assets:", e);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const results = await searchAssets({
          asset_class: selectedCategory!.asset_class,
          query,
        });
        setSearchResults(results);
      } catch (e) {
        console.error("Search failed:", e);
      }
    },
    [selectedCategory]
  );

  const handleSelectAsset = (asset: Asset) => {
    router.push({
      pathname: "/portfolio/add" as any,
      params: {
        ticker: asset.ticker,
        asset_name: asset.name_ja || asset.name,
        asset_class: asset.asset_class,
        currency: selectedCategory?.currency ?? "USD",
      },
    });
  };

  const handleBack = () => {
    if (step === "asset") {
      setStep("category");
      setSelectedCategory(null);
      setSearchQuery("");
      setShowSearch(false);
    } else {
      router.back();
    }
  };

  // ── カテゴリ選択 ──
  if (step === "category") {
    if (loadingCategories) {
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
        </SafeAreaView>
      );
    }

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
            <TouchableOpacity onPress={handleBack} style={{ marginRight: 16 }}>
              <Text style={{ color: "#38BDF8", fontSize: 16 }}>← 戻る</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: "#E5E7EB" }}>
              カテゴリを選択
            </Text>
          </View>

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
                onPress={() => handleSelectCategory(cat)}
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

  // ── 銘柄選択 ──
  if (loadingAssets) {
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

  // 検索中
  if (searchQuery.trim()) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
        <View style={{ flex: 1, padding: 16 }}>
          <View
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
          >
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setShowSearch(false);
              }}
              style={{ marginRight: 16 }}
            >
              <Text style={{ color: "#38BDF8", fontSize: 16 }}>← 戻る</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#E5E7EB" }}>
              検索結果
            </Text>
          </View>

          <TextInput
            placeholder="ティッカー or 銘柄名..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
            placeholderTextColor="#64748B"
            style={{
              backgroundColor: "#1E293B",
              borderWidth: 1,
              borderColor: selectedCategory?.color || "#38BDF8",
              borderRadius: 8,
              padding: 12,
              color: "#E5E7EB",
              fontSize: 16,
              marginBottom: 16,
            }}
          />

          <ScrollView>
            {searchResults.length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 32 }}>
                <Text style={{ color: "#94A3B8" }}>該当する銘柄が見つかりません</Text>
              </View>
            ) : (
              searchResults.map((asset) => (
                <TouchableOpacity
                  key={asset.asset_id}
                  onPress={() => handleSelectAsset(asset)}
                  style={{
                    backgroundColor: "#1E293B",
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#E5E7EB", fontSize: 16, fontWeight: "bold" }}>
                      {asset.ticker}
                    </Text>
                    <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 2 }}>
                      {asset.name_ja || asset.name}
                    </Text>
                  </View>
                  <Text style={{ color: "#38BDF8", fontSize: 18 }}>→</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // デフォルト：銘柄一覧
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={handleBack} style={{ marginRight: 16 }}>
              <Text style={{ color: "#38BDF8", fontSize: 16 }}>← 戻る</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 24, marginRight: 8 }}>
              {selectedCategory?.icon}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#E5E7EB" }}>
              {selectedCategory?.name_ja}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowSearch(true)}
            style={{ backgroundColor: "#1E293B", padding: 10, borderRadius: 8 }}
          >
            <Text style={{ color: "#94A3B8" }}>🔍</Text>
          </TouchableOpacity>
        </View>

        {showSearch && (
          <View style={{ marginBottom: 16, position: "relative" }}>
            <TextInput
              placeholder="ティッカー or 銘柄名で検索..."
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
              placeholderTextColor="#64748B"
              style={{
                backgroundColor: "#1E293B",
                borderWidth: 1,
                borderColor: selectedCategory?.color || "#38BDF8",
                borderRadius: 8,
                padding: 12,
                color: "#E5E7EB",
                fontSize: 16,
              }}
            />
            <TouchableOpacity
              onPress={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              style={{ position: "absolute", right: 12, top: 10 }}
            >
              <Text style={{ color: "#94A3B8", fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {popularAssets.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{ color: "#E5E7EB", fontSize: 16, fontWeight: "bold", marginBottom: 12 }}
            >
              ⭐ 人気銘柄
            </Text>
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}
            >
              {popularAssets.map((asset) => (
                <TouchableOpacity
                  key={`popular-${asset.asset_id}`}
                  onPress={() => handleSelectAsset(asset)}
                  style={{
                    width: "48%",
                    backgroundColor: "#1E293B",
                    padding: 14,
                    borderRadius: 10,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: selectedCategory?.color || "#334155",
                  }}
                >
                  <Text style={{ color: "#E5E7EB", fontSize: 16, fontWeight: "bold" }}>
                    {asset.ticker}
                  </Text>
                  <Text
                    style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}
                    numberOfLines={1}
                  >
                    {asset.name_ja || asset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View>
          <Text
            style={{ color: "#E5E7EB", fontSize: 16, fontWeight: "bold", marginBottom: 12 }}
          >
            全銘柄 ({allAssets.length})
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}
          >
            {allAssets.map((asset) => (
              <TouchableOpacity
                key={asset.asset_id}
                onPress={() => handleSelectAsset(asset)}
                style={{
                  width: "48%",
                  backgroundColor: "#1E293B",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: "#E5E7EB", fontSize: 14, fontWeight: "bold" }}>
                  {asset.ticker}
                </Text>
                <Text
                  style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}
                  numberOfLines={1}
                >
                  {asset.name_ja || asset.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
