import type { NextApiRequest, NextApiResponse } from "next";

// This is a placeholder API route for sign-up
// In a real application, you would implement actual user registration logic here
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, email, password } = req.body;

    // Here you would:
    // 1. Validate the input
    // 2. Check if user already exists
    // 3. Hash the password
    // 4. Create user in database
    // 5. Return success or error

    // This is just a placeholder check
    // Replace with actual database check
    if (email === "demo@example.com") {
      return res.status(400).json({ message: "User already exists" });
    }

    // Simulate successful registration
    return res.status(201).json({
      user: {
        id: "2",
        name,
        email,
      },
    });
  } catch (error) {
    console.error("Sign-up error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
