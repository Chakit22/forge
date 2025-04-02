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
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    // Create user in Supabase with email confirmation
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
      },
    });

    if (error) {
      console.error("Sign-up error:", error);
      return res.status(400).json({ message: error.message });
    }

    // Check if email confirmation is required
    if (data?.user?.identities?.length === 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    return res.status(201).json({
      user: data.user,
      message: "Please check your email to confirm your account",
    });
  } catch (error) {
    console.error("Sign-up error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
