"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
// import { createClient } from "@/utils/supabase/client";
import { getCurrentUser } from "@/app/api/actions";

// Define the user type
interface User {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to fetch the current user from the server
  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getCurrentUser();

      console.log("reponse : ", response);

      if (response.success && response.user) {
        setUser(response.user);
      } else {
        setUser(null);
        if (response.error) {
          setError(new Error(response.error));
        }
      }
    } catch (err) {
      console.error("Error fetching user:", err);
      setUser(null);
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Function to manually refresh user data
  const refreshUser = async () => {
    await fetchUser();
  };

  // Initialize user data on mount and listen for auth changes
  useEffect(() => {
    fetchUser();
  }, []);

  const value = {
    user,
    isLoading,
    error,
    refreshUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
}
