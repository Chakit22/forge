"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { loginFormType } from "@/types/loginFormType";
import { signupformType } from "@/types/signupformType";

export async function login(formData: loginFormType) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(formData);

  if (error) {
    throw error;
  }

  revalidatePath("/", "layout");
}

export async function signup(formData: signupformType) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp(formData);

  if (error) {
    throw error;
  }

  revalidatePath("/", "layout");
}

export async function signout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  revalidatePath("/", "layout");
}
