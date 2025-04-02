"use client";

import { supabase } from "../utils/supabase";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/signup");
  };

  return <button onClick={handleLogout}>Logout</button>;
}
