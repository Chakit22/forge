import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Sign in user with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign-in error:", error);
      return res.status(401).json({ message: error.message });
    }

    // Set cookies for authentication
    const { session } = data;

    // Return user data and session
    return res.status(200).json({
      user: data.user,
      session: session,
    });
  } catch (error) {
    console.error("Sign-in error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
