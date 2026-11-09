import React, { createContext, useContext, useState } from 'react';

// Flexible string type to match your updated routing roles
export type Role = string; 

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  [key: string]: any;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface AppContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // 1. Check localStorage immediately upon application load
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('sevana_jwt');
  });
  
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('sevana_user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 2. Save both token and user to localStorage upon login
  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('sevana_jwt', newToken);
    localStorage.setItem('sevana_user', JSON.stringify(newUser));
  };

  // 3. Clear localStorage upon logout
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('sevana_jwt');
    localStorage.removeItem('sevana_user');
  };

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <AppContext.Provider value={{ user, token, login, logout, toasts, addToast, removeToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}