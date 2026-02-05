// app/contexts/AuthContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getCurrentUser,
  getSubscriptionStatus,
  login as apiLogin,
  setAuthToken,
  signup as apiSignup,
  SubscriptionStatus,
  User,
} from "../api";

const TOKEN_KEY = "auth_token";

type AuthContextType = {
  user: User | null;
  subscription: SubscriptionStatus | null;
  planType: "free" | "paid";
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const derivePlanType = useCallback((): "free" | "paid" => {
    if (subscription) {
      if (subscription.status === "active" || subscription.status === "grace_period") {
        return "paid";
      }
      return "free";
    }
    return user?.plan_type ?? "free";
  }, [subscription, user?.plan_type]);

  const refreshSubscription = useCallback(async () => {
    try {
      const sub = await getSubscriptionStatus();
      setSubscription(sub);
    } catch (error) {
      console.error("Failed to load subscription:", error);
    }
  }, []);

  // アプリ起動時にトークンを読み込んでユーザー情報を取得
  const loadStoredAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        setAuthToken(token);
        const userData = await getCurrentUser();
        setUser(userData);
        await refreshSubscription();
      }
    } catch (error) {
      console.error("Failed to load stored auth:", error);
      await AsyncStorage.removeItem(TOKEN_KEY);
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin({ email, password });
    const token = response.access_token;

    await AsyncStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);

    const userData = await getCurrentUser();
    setUser(userData);
    await refreshSubscription();
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const response = await apiSignup({ email, password });
    const token = response.access_token;

    await AsyncStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);

    const userData = await getCurrentUser();
    setUser(userData);
    await refreshSubscription();
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
    setSubscription(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        planType: derivePlanType(),
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
