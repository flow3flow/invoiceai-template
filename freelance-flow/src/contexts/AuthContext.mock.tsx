import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ isLoggedIn: false, login: () => {}, logout: () => {} });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("invoiceai_logged_in") === "true");

  const login = () => {
    localStorage.setItem("invoiceai_logged_in", "true");
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("invoiceai_logged_in");
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
