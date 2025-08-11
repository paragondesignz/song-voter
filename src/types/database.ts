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
          email: string
          display_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          avatar_url?: string | null
          created_at?: string
        }
      }
      bands: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code?: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          created_by?: string
          created_at?: string
        }
      }
      band_members: {
        Row: {
          id: string
          band_id: string
          user_id: string
          role: 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          band_id: string
          user_id: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          band_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
      }
      song_suggestions: {
        Row: {
          id: string
          band_id: string
          suggested_by: string
          spotify_track_id: string | null
          title: string
          artist: string
          album: string | null
          duration_ms: number | null
          album_art_url: string | null
          preview_url: string | null
          notes: string | null
          status: 'suggested' | 'in_rehearsal' | 'practiced'
          created_at: string
        }
        Insert: {
          id?: string
          band_id: string
          suggested_by: string
          spotify_track_id?: string | null
          title: string
          artist: string
          album?: string | null
          duration_ms?: number | null
          album_art_url?: string | null
          preview_url?: string | null
          notes?: string | null
          status?: 'suggested' | 'in_rehearsal' | 'practiced'
          created_at?: string
        }
        Update: {
          id?: string
          band_id?: string
          suggested_by?: string
          spotify_track_id?: string | null
          title?: string
          artist?: string
          album?: string | null
          duration_ms?: number | null
          album_art_url?: string | null
          preview_url?: string | null
          notes?: string | null
          status?: 'suggested' | 'in_rehearsal' | 'practiced'
          created_at?: string
        }
      }
      song_votes: {
        Row: {
          id: string
          band_id: string
          song_suggestion_id: string
          voter_id: string
          vote_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          band_id: string
          song_suggestion_id: string
          voter_id: string
          vote_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          band_id?: string
          song_suggestion_id?: string
          voter_id?: string
          vote_type?: string
          created_at?: string
          updated_at?: string
        }
      }
      rehearsals: {
        Row: {
          id: string
          band_id: string
          created_by: string
          name: string
          rehearsal_date: string
          start_time: string | null
          location: string | null
          songs_to_learn: number
          selection_deadline: string | null
          description: string | null
          status: 'planning' | 'songs_selected' | 'completed'
          created_at: string
        }
        Insert: {
          id?: string
          band_id: string
          created_by: string
          name: string
          rehearsal_date: string
          start_time?: string | null
          location?: string | null
          songs_to_learn: number
          selection_deadline?: string | null
          description?: string | null
          status?: 'planning' | 'songs_selected' | 'completed'
          created_at?: string
        }
        Update: {
          id?: string
          band_id?: string
          created_by?: string
          name?: string
          rehearsal_date?: string
          start_time?: string | null
          location?: string | null
          songs_to_learn?: number
          selection_deadline?: string | null
          description?: string | null
          status?: 'planning' | 'songs_selected' | 'completed'
          created_at?: string
        }
      }
      rehearsal_setlists: {
        Row: {
          id: string
          rehearsal_id: string
          song_suggestion_id: string
          selection_reason: string | null
          position: number
          vote_count_at_selection: number | null
          created_at: string
        }
        Insert: {
          id?: string
          rehearsal_id: string
          song_suggestion_id: string
          selection_reason?: string | null
          position: number
          vote_count_at_selection?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          rehearsal_id?: string
          song_suggestion_id?: string
          selection_reason?: string | null
          position?: number
          vote_count_at_selection?: number | null
          created_at?: string
        }
      }
      vote_rate_limits: {
        Row: {
          id: string
          user_id: string
          band_id: string
          vote_count: number
          window_start: string
        }
        Insert: {
          id?: string
          user_id: string
          band_id: string
          vote_count?: number
          window_start?: string
        }
        Update: {
          id?: string
          user_id?: string
          band_id?: string
          vote_count?: number
          window_start?: string
        }
      }
    }
    Views: {
      song_leaderboard: {
        Row: {
          id: string
          band_id: string
          title: string
          artist: string
          album_art_url: string | null
          spotify_track_id: string | null
          suggested_by: string
          vote_count: number
          recent_votes: number
          suggested_at: string
        }
      }
    }
    Functions: {
      refresh_song_leaderboard: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}