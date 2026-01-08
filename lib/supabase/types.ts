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
            sessions: {
                Row: {
                    id: string;
                    user_id: string;
                    title: string | null;
                    type: 'image' | 'video';
                    created_at: string;
                    updated_at: string;
                    is_archived: boolean;
                    is_pinned: boolean;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title?: string | null;
                    type?: 'image' | 'video';
                    created_at?: string;
                    updated_at?: string;
                    is_archived?: boolean;
                    is_pinned?: boolean;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    title?: string | null;
                    type?: 'image' | 'video';
                    created_at?: string;
                    updated_at?: string;
                    is_archived?: boolean;
                    is_pinned?: boolean;
                };
            };
            generations: {
                Row: {
                    id: string;
                    user_id: string;
                    session_id: string | null;
                    type: 'image' | 'video';
                    prompt: string;
                    file_url: string | null;
                    thumbnail_url: string | null;
                    file_size: number | null;
                    width: number | null;
                    height: number | null;
                    duration: number | null;
                    status: 'pending' | 'processing' | 'completed' | 'failed';
                    tokens_used: number;
                    is_favorite: boolean;
                    created_at: string;
                    metadata: {
                        taskId?: string;
                        duration?: string;
                        mode?: 'std' | 'pro';
                        aspectRatio?: string;
                        sourceType?: string;
                        sourceImage?: string | null;
                        klingVideoId?: string;
                        extendedFrom?: string;
                        hasAudio?: boolean;
                        audioTaskId?: string;
                        videoCost?: number;
                        audioCost?: number;
                    } | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    session_id?: string | null;
                    type: 'image' | 'video';
                    prompt: string;
                    file_url?: string | null;
                    thumbnail_url?: string | null;
                    file_size?: number | null;
                    width?: number | null;
                    height?: number | null;
                    duration?: number | null;
                    status?: 'pending' | 'processing' | 'completed' | 'failed';
                    tokens_used?: number;
                    is_favorite?: boolean;
                    created_at?: string;
                    metadata?: Json | null;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    session_id?: string | null;
                    type?: 'image' | 'video';
                    prompt?: string;
                    file_url?: string | null;
                    thumbnail_url?: string | null;
                    file_size?: number | null;
                    width?: number | null;
                    height?: number | null;
                    duration?: number | null;
                    status?: 'pending' | 'processing' | 'completed' | 'failed';
                    tokens_used?: number;
                    is_favorite?: boolean;
                    created_at?: string;
                    metadata?: Json | null;
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
export type Session = Database['public']['Tables']['sessions']['Row'];
export type Generation = Database['public']['Tables']['generations']['Row'];
export type NewGeneration = Database['public']['Tables']['generations']['Insert'];
export type NewSession = Database['public']['Tables']['sessions']['Insert'];

