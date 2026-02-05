// app/alerts/asset-list.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
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

import { Asset, searchAssets } from "../api";

export default function AssetListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    asset_class: string;
    name_ja: string;
    icon: string;
    color: string;
    currency: string;
    default_threshold_up: string;
    default_threshold_down: string;
  }>();

  const {
    asset_class,
    name_ja,
    icon,
    color,
    currency,
    default_threshold_up,
    default_threshold_down,
  } = params;

  const [isLoading, setIsLoading] = useState(true);
  const [popularAssets, setPopularAssets] = useState<Asset[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const loadAssets = useCallback(async () => {
    try {
      setIsLoading(true);

      const [popular, all] = await Promise.all([
        searchAssets({ asset_class, popular_only: true }),
        searchAssets({ asset_class }),
      ]);

      setPopularAssets(popular);
      setAllAssets(all);
    } catch (e) {
      console.error("Failed to load assets:", e);
    } finally {
      setIsLoading(false);
    }
  }, [asset_class]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const results = await searchAssets({ asset_class, query });
        setSearchResults(results);
      } catch (e) {
        console.error("Search failed:", e);
      } finally {
        setIsSearching(false);
      }
    },
    [asset_class]
  );

  const handleSelectAsset = (asset: Asset) => {
    router.push({
      pathname: "/alerts/create" as any,
      params: {
        ticker: asset.ticker,
        asset_name: asset.name_ja || asset.name,
        asset_class,
        currency,
        default_threshold_up,
        default_threshold_down,
      },
    });
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
        <ActivityIndicator color="#38BDF8" />
        <Text style={{ marginTop: 8, color: "#E5E7EB" }}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  // 検索中は検索結果のみ表示
  if (searchQuery.trim()) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
        <View style={{ flex: 1, padding: 16 }}>
          {/* ヘッダー */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
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

          {/* 検索バー */}
          <View style={{ marginBottom: 16, position: "relative" }}>
            <TextInput
              placeholder="ティッカー or 銘柄名..."
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
              placeholderTextColor="#64748B"
              style={{
                backgroundColor: "#1E293B",
                borderWidth: 1,
                borderColor: color || "#38BDF8",
                borderRadius: 8,
                padding: 12,
                color: "#E5E7EB",
                fontSize: 16,
              }}
            />
            {isSearching && (
              <ActivityIndicator
                color="#38BDF8"
                style={{ position: "absolute", right: 12, top: 12 }}
              />
            )}
          </View>

          {/* 検索結果 */}
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
                    <Text
                      style={{ color: "#E5E7EB", fontSize: 16, fontWeight: "bold" }}
                    >
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* ヘッダー */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Text style={{ color: "#38BDF8", fontSize: 16 }}>← 戻る</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 24, marginRight: 8 }}>{icon}</Text>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#E5E7EB" }}>
              {name_ja}
            </Text>
          </View>

          {/* 検索ボタン */}
          <TouchableOpacity
            onPress={() => setShowSearch(true)}
            style={{
              backgroundColor: "#1E293B",
              padding: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#94A3B8" }}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* 検索バー（展開時） */}
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
                borderColor: color || "#38BDF8",
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

        {/* 人気銘柄（2列グリッド） */}
        {popularAssets.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: "#E5E7EB",
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 12,
              }}
            >
              ⭐ 人気銘柄
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
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
                    borderColor: color || "#334155",
                  }}
                >
                  <Text
                    style={{
                      color: "#E5E7EB",
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  >
                    {asset.ticker}
                  </Text>
                  <Text
                    style={{
                      color: "#94A3B8",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                    numberOfLines={1}
                  >
                    {asset.name_ja || asset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 全銘柄（2列グリッド） */}
        <View>
          <Text
            style={{
              color: "#E5E7EB",
              fontSize: 16,
              fontWeight: "bold",
              marginBottom: 12,
            }}
          >
            全銘柄 ({allAssets.length})
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
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
                <Text
                  style={{
                    color: "#E5E7EB",
                    fontSize: 14,
                    fontWeight: "bold",
                  }}
                >
                  {asset.ticker}
                </Text>
                <Text
                  style={{
                    color: "#94A3B8",
                    fontSize: 11,
                    marginTop: 2,
                  }}
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
