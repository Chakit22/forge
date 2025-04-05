"use client";

import { useUser } from "@/context/user-context";

export function UserInfo() {
  const { user, isLoading, error } = useUser();

  if (isLoading) {
    return <div className="text-white/70">Loading user data...</div>;
  }

  if (error) {
    return <div className="text-red-300">Error loading user data</div>;
  }

  if (!user) {
    return (
      <div className="text-white/70">
        Please sign in to see your information
      </div>
    );
  }

  return (
    <div className="rounded-md bg-teal-600/30 p-4 text-white">
      <h2 className="mb-3 text-lg font-medium">User Information</h2>
      <div className="space-y-2">
        <p>
          <span className="font-medium">Name:</span> {user.name}
        </p>
        <p>
          <span className="font-medium">Email:</span> {user.email}
        </p>
        {user.phone_number && (
          <p>
            <span className="font-medium">Phone:</span> {user.phone_number}
          </p>
        )}
      </div>
    </div>
  );
}
