// app/auth/signup.tsx
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

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("入力エラー", "すべての項目を入力してください。");
      return;
    }

    if (password.length < 8) {
      Alert.alert("入力エラー", "パスワードは8文字以上で入力してください。");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("入力エラー", "パスワードが一致しません。");
      return;
    }

    try {
      setIsLoading(true);
      await signup(email, password);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Signup failed:", error);
      const errorMessage = String(error?.message ?? "");

      if (errorMessage.includes("409")) {
        Alert.alert("登録失敗", "このメールアドレスはすでに登録されています。");
      } else {
        Alert.alert("登録失敗", "アカウント作成に失敗しました。");
      }
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
            新規登録
          </Text>
          <Text style={{ fontSize: 16, color: "#94A3B8" }}>
            無料でアカウントを作成
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

        <View style={{ marginBottom: 16 }}>
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

        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, color: "#E5E7EB", marginBottom: 8 }}>
            パスワード（確認）
          </Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="もう一度入力してください"
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
          onPress={handleSignup}
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
              登録する
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center" }}>
          <Text style={{ color: "#94A3B8", marginRight: 4 }}>
            すでにアカウントをお持ちの方は
          </Text>
          <TouchableOpacity onPress={() => router.push("/auth/login" as any)}>
            <Text style={{ color: "#38BDF8", fontWeight: "bold" }}>
              ログイン
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
