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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Send password reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });

    if (error) {
      console.error("Password reset request error:", error);
      return res.status(400).json({ message: error.message });
    }

    // Always return success even if email doesn't exist for security reasons
    return res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
