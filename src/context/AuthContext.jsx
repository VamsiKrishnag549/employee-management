import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import authService from "../services/authService";
import { setSessionExpiredHandler } from "../services/api";
import { queryClient } from "../lib/queryClient";

const AuthContext = createContext(null);
// React StrictMode may mount the provider effect twice in development. Share a
// single startup refresh so a rotating refresh token is not consumed twice.
let sessionRestorePromise = null;

function decodeTokenPayload(token) {
  try {
    const payload = token?.split(".")?.[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function tokenIsUnexpired(token) {
  const payload = decodeTokenPayload(token);
  return Number.isFinite(payload?.exp) && payload.exp * 1000 > Date.now() + 5000;
}

function emailFromToken(token) {
  const payload = decodeTokenPayload(token);
  return payload?.email ||
    payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
    "";
}

function roleMatches(actualRole, expectedRole) {
  return String(actualRole || "").toLowerCase() === String(expectedRole || "").toLowerCase();
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    ["accessToken", "refreshToken", "token", "user"].forEach((key) => localStorage.removeItem(key));
    setUser(null);
    queryClient.clear();
  }, []);

  useEffect(() => {
    let active = true;
    setSessionExpiredHandler(clearSession);

    const restoreSession = async () => {
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");
      const rawUser = localStorage.getItem("user");

      if (!rawUser) {
        clearSession();
        return;
      }

      let storedUser;
      try {
        storedUser = JSON.parse(rawUser);
      } catch {
        clearSession();
        return;
      }

      if (accessToken && tokenIsUnexpired(accessToken)) {
        if (!storedUser.email) {
          storedUser.email = emailFromToken(accessToken);
          localStorage.setItem("user", JSON.stringify(storedUser));
        }
        if (active) setUser(storedUser);
        return;
      }

      // Do not treat a stale or malformed access token as authentication.
      // If the refresh token is still valid, refresh before unlocking routes.
      if (!refreshToken) {
        clearSession();
        return;
      }

      try {
        if (!sessionRestorePromise) {
          sessionRestorePromise = authService.refresh(refreshToken)
            .then((data) => {
              if (!data?.accessToken || !data?.refreshToken) {
                throw new Error("Session refresh returned an invalid response.");
              }
              const refreshedUser = data.user || storedUser;
              localStorage.setItem("accessToken", data.accessToken);
              localStorage.setItem("refreshToken", data.refreshToken);
              localStorage.setItem("user", JSON.stringify(refreshedUser));
              return refreshedUser;
            })
            .finally(() => { sessionRestorePromise = null; });
        }
        const restoredUser = await sessionRestorePromise;
        if (active) setUser(restoredUser);
      } catch {
        if (active) clearSession();
      }
    };

    restoreSession().finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      setSessionExpiredHandler(null);
    };
  }, [clearSession]);

  const login = useCallback(async (email, password, expectedRole) => {
    const data = await authService.login(email, password, expectedRole);
    if (!data?.accessToken || !data?.refreshToken || !data?.user) {
      throw new Error("Invalid login response from server.");
    }

    // The role returned by the backend is authoritative. The dropdown is only
    // a requested account type; it cannot grant a different role.
    if (!roleMatches(data.user.role, expectedRole)) {
      throw new Error("The selected role does not match this account.");
    }

    const userData = {
      ...data.user,
      email: data.user.email || email,
      role: data.user.role,
    };
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    return { ...data, user: userData };
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const value = useMemo(() => ({
    user,
    login,
    logout,
    isAuthenticated: !!user && !!token && tokenIsUnexpired(token),
    loading,
  }), [user, login, logout, loading, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
