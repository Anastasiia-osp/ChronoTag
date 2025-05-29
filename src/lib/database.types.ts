export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          nickname: string | null
          bio: string | null
          links: Json | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          name?: string | null
          nickname?: string | null
          bio?: string | null
          links?: Json | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          nickname?: string | null
          bio?: string | null
          links?: Json | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          user_id: string
          latitude: number
          longitude: number
          message: string
          activation_datetime: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          latitude: number
          longitude: number
          message: string
          activation_datetime: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          latitude?: number
          longitude?: number
          message?: string
          activation_datetime?: string
          created_at?: string
        }
      }
    }
  }
}