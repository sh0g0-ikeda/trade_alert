// app/settings/plan.tsx
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert as RNAlert,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  endConnection,
  finishTransaction,
  flushFailedPurchasesCachedAsPendingAndroid,
  getSubscriptions,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestSubscription,
} from "react-native-iap";

import {
  devDowngrade,
  devUpgrade,
  getSubscriptionStatus,
  SubscriptionStatus,
  verifySubscription,
} from "../api";
import { useAuth } from "../contexts/AuthContext";

const PREMIUM_PRODUCT_ID = "premium_monthly";

export default function PlanDetailsScreen() {
  const router = useRouter();
  const { refreshSubscription } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null,
  );
  const [iapReady, setIapReady] = useState(false);
  const [iapError, setIapError] = useState<string | null>(null);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [iapProducts, setIapProducts] = useState<any[]>([]);

  const loadPlan = useCallback(async () => {
    try {
      setIsLoading(true);
      const subRes = await getSubscriptionStatus();
      setSubscription(subRes);
    } catch (error) {
      console.error("Failed to load plan:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    let purchaseUpdateSub: any;
    let purchaseErrorSub: any;

    const initIap = async () => {
      try {
        setIapError(null);
        await initConnection();
        if (Platform.OS === "android") {
          await flushFailedPurchasesCachedAsPendingAndroid();
        }
        const subs = await getSubscriptions({ skus: [PREMIUM_PRODUCT_ID] });
        const list = subs ?? [];
        setIapProducts(list);
        if (list.length === 0) {
          setIapReady(false);
          setIapError("ストア商品が取得できませんでした。");
        } else {
          setIapReady(true);
        }
      } catch (e: any) {
        console.error("IAP init error:", e);
        setIapError(e?.message ?? "課金の初期化に失敗しました。");
      }
    };

    initIap();

    purchaseUpdateSub = purchaseUpdatedListener(async (purchase) => {
      try {
        setPurchaseInProgress(true);
        const receipt =
          Platform.OS === "ios"
            ? purchase.transactionReceipt
            : purchase.purchaseToken;
        if (!receipt) {
          throw new Error("レシート情報が取得できませんでした。");
        }

        const verifyRes = await verifySubscription({
          platform: Platform.OS as "ios" | "android",
          receipt_data: receipt,
          product_id: purchase.productId ?? PREMIUM_PRODUCT_ID,
        });

        if (!verifyRes.success || !verifyRes.subscription) {
          throw new Error(verifyRes.message ?? "サブスクリプションの検証に失敗しました。");
        }

        setSubscription(verifyRes.subscription);
        await refreshSubscription();
        RNAlert.alert("成功", "プレミアムにアップグレードしました。");
      } catch (e: any) {
        console.error("Purchase verify error:", e);
        RNAlert.alert("エラー", e?.message ?? "購入の検証に失敗しました。");
      } finally {
        setPurchaseInProgress(false);
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch (e) {
          console.error("finishTransaction error:", e);
        }
      }
    });

    purchaseErrorSub = purchaseErrorListener((error) => {
      console.error("purchase error:", error);
      setPurchaseInProgress(false);
      setIapError(error?.message ?? "購入に失敗しました。");
    });

    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
      endConnection();
    };
  }, [refreshSubscription]);

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

  const isPaid = subscription?.plan_type === "paid";
  const expiryText = subscription?.expiry_date
    ? new Date(subscription.expiry_date).toLocaleDateString("ja-JP")
    : null;
  const remainingDays = subscription?.expiry_date
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.expiry_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  const planStatusLabel = (() => {
    if (!subscription) return "-";
    if (subscription.status === "free" || subscription.plan_type === "free") {
      return "フリープラン（6銘柄まで）";
    }
    if (subscription.status === "grace_period") {
      if (remainingDays !== null) {
        return `プレミアム（更新してください - 残り${remainingDays}日）`;
      }
      return "プレミアム（更新してください）";
    }
    if (subscription.status === "expired") {
      return "プレミアム（期限切れ）";
    }
    if (expiryText) {
      return `プレミアム（〜${expiryText}まで）`;
    }
    return "プレミアム";
  })();

  const handlePurchase = useCallback(async () => {
    if (!iapReady) {
      RNAlert.alert("エラー", "課金の初期化が完了していません。");
      return;
    }

    try {
      setIapError(null);
      setPurchaseInProgress(true);
      const product = iapProducts.find(
        (p: any) => p.productId === PREMIUM_PRODUCT_ID,
      );
      if (!product) {
        throw new Error("購入商品が見つかりません。");
      }

      if (Platform.OS === "android") {
        const offerToken =
          product?.subscriptionOfferDetails?.[0]?.offerToken ?? null;
        if (offerToken) {
          await requestSubscription({
            sku: PREMIUM_PRODUCT_ID,
            subscriptionOffers: [{ sku: PREMIUM_PRODUCT_ID, offerToken }],
          } as any);
        } else {
          await requestSubscription({ sku: PREMIUM_PRODUCT_ID } as any);
        }
      } else {
        await requestSubscription({ sku: PREMIUM_PRODUCT_ID } as any);
      }
    } catch (e: any) {
      console.error("requestSubscription error:", e);
      RNAlert.alert("エラー", e?.message ?? "課金処理に失敗しました。");
    } finally {
      setPurchaseInProgress(false);
    }
  }, [iapReady, iapProducts]);

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
            <Text style={{ color: "#38BDF8", fontSize: 16 }}>戻る</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#E5E7EB" }}>
            プラン詳細
          </Text>
        </View>

        {/* 現在のプラン */}
        <View
          style={{
            backgroundColor: isPaid ? "#1E3A5F" : "#1E293B",
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
            borderWidth: isPaid ? 2 : 1,
            borderColor: isPaid ? "#38BDF8" : "#334155",
          }}
        >
          {subscription?.status === "grace_period" && (
            <View
              style={{
                backgroundColor: "#7C2D12",
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#FDE68A", fontSize: 12 }}>
                お支払いに問題があります。3日以内に更新してください。
              </Text>
            </View>
          )}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#E5E7EB", fontSize: 20, fontWeight: "bold" }}>
              {isPaid ? "Premium プラン" : "Free プラン"}
            </Text>
            <View
              style={{
                backgroundColor: isPaid ? "#38BDF8" : "#6B7280",
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: isPaid ? "#0B1220" : "#E5E7EB",
                  fontSize: 12,
                  fontWeight: "bold",
                }}
              >
                {subscription?.status === "grace_period"
                  ? "GRACE"
                  : isPaid
                  ? "ACTIVE"
                  : "FREE"}
              </Text>
            </View>
          </View>

          <Text style={{ color: "#94A3B8", marginTop: 8 }}>
            {planStatusLabel}
          </Text>
        </View>
        {/* プラン制限 */}
        <Text
          style={{
            color: "#E5E7EB",
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 16,
          }}
        >
          プラン制限
        </Text>

        <View style={{ gap: 12 }}>
          <LimitRow
            label="アラート数"
            value={isPaid ? "500" : "6"}
            unit="件"
          />
          <LimitRow
            label="閾値設定"
            value={isPaid ? "自由" : "±5%固定"}
            unit=""
          />
          <LimitRow
            label="監視時間"
            value={isPaid ? "24時間" : "8-24時"}
            unit=""
          />
        </View>

        {/* プラン比較 */}
        <Text
          style={{
            color: "#E5E7EB",
            fontSize: 18,
            fontWeight: "bold",
            marginTop: 32,
            marginBottom: 16,
          }}
        >
          プラン比較
        </Text>

        <View
          style={{
            backgroundColor: "#1E293B",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* ヘッダー */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#334155",
              padding: 12,
            }}
          >
            <View style={{ flex: 2 }}>
              <Text style={{ color: "#E5E7EB", fontWeight: "bold" }}>項目</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "#E5E7EB", fontWeight: "bold" }}>Free</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "#38BDF8", fontWeight: "bold" }}>Premium</Text>
            </View>
          </View>

          <ComparisonRow label="アラート数" free="6件" premium="500件" />
          <ComparisonRow label="閾値設定" free="±5%固定" premium="自由" />
          <ComparisonRow label="監視時間" free="8-24時" premium="24時間" />
        </View>

        {/* アップグレード案内 */}
        {!isPaid && (
          <View style={{ marginTop: 24 }}>
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={!iapReady || purchaseInProgress}
              style={{
                backgroundColor:
                  !iapReady || purchaseInProgress ? "#94A3B8" : "#38BDF8",
                padding: 16,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: !iapReady || purchaseInProgress ? "#111827" : "#0B1220",
                  fontSize: 16,
                  fontWeight: "bold",
                }}
              >
                {purchaseInProgress ? "処理中..." : "Premium にアップグレード"}
              </Text>
            </TouchableOpacity>
            <Text
              style={{
                color: "#64748B",
                fontSize: 12,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              ストア課金の購入画面が開きます。
            </Text>
            {iapError && (
              <Text
                style={{
                  color: "#F59E0B",
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {iapError}
              </Text>
            )}
          </View>
        )}

        {__DEV__ && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 8 }}>
              開発用プラン切り替え
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const res = await devUpgrade();
                    setSubscription(res);
                    await refreshSubscription();
                  } catch (e: any) {
                    RNAlert.alert("エラー", e?.message ?? "アップグレードに失敗しました");
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: "#38BDF8",
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#0B1220", fontWeight: "bold" }}>
                  dev: アップグレード
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const res = await devDowngrade();
                    setSubscription(res);
                    await refreshSubscription();
                  } catch (e: any) {
                    RNAlert.alert("エラー", e?.message ?? "ダウングレードに失敗しました");
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: "#334155",
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#E5E7EB", fontWeight: "bold" }}>
                  dev: ダウングレード
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LimitRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit: string;
}) {
  return (
    <View
      style={{
        backgroundColor: "#1E293B",
        padding: 16,
        borderRadius: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text style={{ color: "#94A3B8", fontSize: 14 }}>{label}</Text>
      <Text style={{ color: "#E5E7EB", fontSize: 18, fontWeight: "bold" }}>
        {value}
        {unit && <Text style={{ fontSize: 14, color: "#94A3B8" }}> {unit}</Text>}
      </Text>
    </View>
  );
}

function ComparisonRow({
  label,
  free,
  premium,
}: {
  label: string;
  free: string;
  premium: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: "#334155",
      }}
    >
      <View style={{ flex: 2 }}>
        <Text style={{ color: "#94A3B8" }}>{label}</Text>
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={{ color: "#E5E7EB" }}>{free}</Text>
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={{ color: "#38BDF8" }}>{premium}</Text>
      </View>
    </View>
  );
}




