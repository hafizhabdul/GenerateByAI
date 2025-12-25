export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    name: string | null;
                    avatar_url: string | null;
                    plan: 'free' | 'pro' | 'business';
                    tokens_total: number;
                    tokens_used: number;
                    tokens_reset_at: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    name?: string | null;
                    avatar_url?: string | null;
                    plan?: 'free' | 'pro' | 'business';
                    tokens_total?: number;
                    tokens_used?: number;
                    tokens_reset_at?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    name?: string | null;
                    avatar_url?: string | null;
                    plan?: 'free' | 'pro' | 'business';
                    tokens_total?: number;
                    tokens_used?: number;
                    tokens_reset_at?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            generations: {
                Row: {
                    id: string;
                    user_id: string;
                    type: 'image' | 'video';
                    prompt: string;
                    file_url: string;
                    thumbnail_url: string | null;
                    file_size: number | null;
                    width: number | null;
                    height: number | null;
                    duration: number | null;
                    status: 'pending' | 'processing' | 'completed' | 'failed';
                    tokens_used: number;
                    is_favorite: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    type: 'image' | 'video';
                    prompt: string;
                    file_url: string;
                    thumbnail_url?: string | null;
                    file_size?: number | null;
                    width?: number | null;
                    height?: number | null;
                    duration?: number | null;
                    status?: 'pending' | 'processing' | 'completed' | 'failed';
                    tokens_used?: number;
                    is_favorite?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    type?: 'image' | 'video';
                    prompt?: string;
                    file_url?: string;
                    thumbnail_url?: string | null;
                    file_size?: number | null;
                    width?: number | null;
                    height?: number | null;
                    duration?: number | null;
                    status?: 'pending' | 'processing' | 'completed' | 'failed';
                    tokens_used?: number;
                    is_favorite?: boolean;
                    created_at?: string;
                };
            };
        };
        Views: {};
        Functions: {};
        Enums: {};
    };
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Generation = Database['public']['Tables']['generations']['Row'];
export type NewGeneration = Database['public']['Tables']['generations']['Insert'];
