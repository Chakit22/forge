export interface User {
    id: number;
    name: string;
    email: string;
    phone_number?: string;
  }
  
  export interface Conversation {
    id: number;
    user_id: number;
    duration: string; // ISO duration format
    learning_option: string;
    summary?: string;
    created_at: string; // ISO timestamp
  }
  
  export enum AuthStatus {
    LOADING = 'loading',
    AUTHENTICATED = 'authenticated',
    UNAUTHENTICATED = 'unauthenticated'
  }