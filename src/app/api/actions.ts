"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

// Type definitions
export type LoginData = {
  email: string;
  password: string;
};

export type SignupData = {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
};

export type ConversationData = {
  duration: string; // ISO duration format
  learning_option: string;
  summary?: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
};

export type Conversation = {
  id: number;
  user_id: number;
  duration: string;
  learning_option: string;
  summary?: string;
  created_at: string;
};

// Authentication Actions

/**
 * Sign in a user with email and password
 */
export async function login(formData: LoginData) {
  console.log("login");
  const supabase = await createClient();
  console.log("formData : ", formData);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  console.log("data : ", data);
  console.log("error : ", error);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user };
}

/**
 * Sign up a new user and create their profile in the database
 */
export async function signup(formData: SignupData) {
  const supabase = await createClient();

  // First create the auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
  });

  console.log("authData : ", authData);
  console.log("authError : ", authError);

  if (authError) {
    return { success: false, error: authError.message };
  }

  if (!authData.user) {
    return { success: false, error: "Failed to create user" };
  }

  console.log("authData : ", authData);

  // Then create the user profile in our database
  const { error: dbError } = await supabase.from("users").insert({
    name: formData.name,
    email: formData.email,
    phone_number: formData.phone_number || null,
  });

  if (dbError) {
    console.error("Error creating user profile:", dbError);
    // In a production app, you might want to delete the auth user if this fails
    return { success: false, error: dbError.message };
  }

  return { success: true, user: authData.user };
}

/**
 * Resend the confirmation email
 */
export async function resendConfirmationEmail(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
  })

  console.log("error : ", error);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Sign out the current user
 */
export async function signout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }
  
  // We don't need to manually handle cookies since the Supabase client handles it
  // Force revalidation of paths
  revalidatePath("/", "layout");
  
  return { success: true };
}

// User Data Actions

/**
 * Get the currently logged in user with their profile data
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  // First get the auth user
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  
  if (sessionError || !user) {
    return {
      success: false,
      error: sessionError?.message || "Not authenticated",
    };
  }

  console.log("user : ", user);

  // Then get the user profile from our database
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", user.email)
    .single();

  if (userError) {
    return { success: false, error: userError.message };
  }

  return { 
    success: true, 
    user: userData as User
  };
}

/**
 * Update a user's profile information
 */
export async function updateUserProfile(userData: Partial<User>) {
  const supabase = await createClient();
  
  // Get current user
  const { success, user, error } = await getCurrentUser();
  
  if (!success || !user) {
    return { success: false, error: error || "User not found" };
  }
  
  // Update user data
  const { error: updateError } = await supabase
    .from("users")
    .update(userData)
    .eq("id", user.id);
  
  if (updateError) {
    return { success: false, error: updateError.message };
  }
  
  revalidatePath("/dashboard");
  return { success: true };
}

// Conversation Actions

/**
 * Add a new conversation to the database
 */
export async function addConversation(conversationData: ConversationData) {
  const supabase = await createClient();

  console.log("conversationData", conversationData);
  
  // Get current user
  const { success, user, error } = await getCurrentUser();
  
  if (!success || !user) {
    return { success: false, error: error || "User not found" };
  }
  
  // Create conversation
  const { data, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      duration: conversationData.duration,
      learning_option: conversationData.learning_option,
      summary: conversationData.summary
    })
    .select()
    .single();
  
  if (conversationError) {
    return { success: false, error: conversationError.message };
  }
  
  return { success: true, conversation: data };
}

/**
 * Get conversations for the current user
 */
export async function getUserConversations(options?: { 
  limit?: number;
  orderBy?: {
    column: string;
    ascending: boolean;
  }
}) {
  const supabase = await createClient();
  
  // Get current user
  const { success, user, error } = await getCurrentUser();
  
  if (!success || !user) {
    return { success: false, error: error || "User not found" };
  }
  
  // Build query
  let query = supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id);

  // Apply ordering if specified
  if (options?.orderBy) {
    query = query.order(
      options.orderBy.column, 
      { ascending: options.orderBy.ascending }
    );
  } else {
    // Default ordering by created_at desc
    query = query.order("created_at", { ascending: false });
  }

  // Apply limit if specified
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error: convoError } = await query;
  
  if (convoError) {
    return { success: false, error: convoError.message };
  }
  
  return { 
    success: true, 
    conversations: data as Conversation[]
  };
}

/**
 * Get a specific conversation by ID (with its messages)
 */
export async function getConversationById(conversationId: number) {
  const supabase = await createClient();
  
  // Get current user
  const { success, user, error } = await getCurrentUser();
  
  if (!success || !user) {
    return { success: false, error: error || "User not found" };
  }
  
  // Get the conversation
  const { data: conversation, error: convoError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", user.id) // Ensure user can only access their own conversations
    .single();
  
  if (convoError) {
    return { success: false, error: convoError.message };
  }
  
  return { 
    success: true, 
    conversation
  };
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: number) {
  const supabase = await createClient();
  
  // Get current user
  const { success, user, error } = await getCurrentUser();
  
  if (!success || !user) {
    return { success: false, error: error || "User not found" };
  }
  
  // Delete the conversation
  const { error: deleteError } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id); // Ensure user can only delete their own conversations
  
  if (deleteError) {
    return { success: false, error: deleteError.message };
  }
  
  revalidatePath("/dashboard");
  return { success: true };
} 