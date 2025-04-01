"use client";

import { supabase } from "../utils/supabase";
import { useRouter } from "next/router";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return <button onClick={handleLogout}>Logout</button>;
}
