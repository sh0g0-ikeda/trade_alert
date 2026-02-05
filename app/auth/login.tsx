// app/auth/login.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("入力エラー", "メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Login failed:", error);
      Alert.alert(
        "ログイン失敗",
        "メールアドレスまたはパスワードが正しくありません。"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "center", padding: 24 }}
      >
        <View style={{ marginBottom: 48 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "bold",
              color: "#E5E7EB",
              marginBottom: 8,
            }}
          >
            ログイン
          </Text>
          <Text style={{ fontSize: 16, color: "#94A3B8" }}>
            マルチアラートへようこそ
          </Text>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: "#E5E7EB", marginBottom: 8 }}>
            メールアドレス
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            placeholderTextColor="#64748B"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
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
            パスワード
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="8文字以上"
            placeholderTextColor="#64748B"
            secureTextEntry
            autoCapitalize="none"
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

        <TouchableOpacity
          onPress={handleLogin}
          disabled={isLoading}
          style={{
            backgroundColor: "#1D4ED8",
            padding: 16,
            borderRadius: 8,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
              ログイン
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center" }}>
          <Text style={{ color: "#94A3B8", marginRight: 4 }}>
            アカウントをお持ちでない方は
          </Text>
          <TouchableOpacity onPress={() => router.push("/auth/signup" as any)}>
            <Text style={{ color: "#38BDF8", fontWeight: "bold" }}>
              新規登録
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
