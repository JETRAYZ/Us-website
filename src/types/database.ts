export type Role = 'admin' | 'partner';

export interface Profile {
  id: string;
  role: Role;
  name: string;
  pin_hash: string;
  avatar_url: string | null;
  mood_percent: number;
  music_url: string | null;
  updated_at: string;
}

export interface Snap {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

export interface PostIt {
  id: string;
  author_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  event_date: string;
  type: 'errand' | 'date' | 'important';
  created_by: string;
  created_at: string;
  is_virtual?: boolean;
  virtual_color?: string;
}

export interface WheelItem {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  title: string;
  cover_url: string | null;
  status: 'waiting' | 'watching' | 'done';
  added_by: string;
  created_at: string;
}

export interface TimeCapsule {
  id: string;
  author_id: string;
  content_text: string | null;
  image_url: string | null;
  unlock_date: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      snaps: {
        Row: Snap;
        Insert: Omit<Snap, 'id' | 'created_at'>;
        Update: Partial<Omit<Snap, 'id'>>;
      };
      post_its: {
        Row: PostIt;
        Insert: Omit<PostIt, 'id' | 'created_at'>;
        Update: Partial<Omit<PostIt, 'id'>>;
      };
      // ... other tables if needed
    };
  };
}
