import { supabase } from "../utils/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import LogoutButton from "../components/logout";

export default function Dashboard() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/auth");
      else setUser({ email: data.user.email || "" });
    };
    getUser();
  }, []);

  return user ? (
    <div>
      <h1>Welcome, {user.email}!</h1>
      <LogoutButton />
    </div>
  ) : (
    <p>Loading...</p>
  );
}
