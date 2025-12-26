export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chatbot_conversations: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          response: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          response?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          response?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          body_full: string | null
          body_preview: string | null
          clicked_at: string | null
          created_at: string | null
          email_history_id: string | null
          follow_up_to_message_id: string | null
          id: string
          is_follow_up: boolean | null
          message_number: number
          metadata: Json | null
          opened_at: string | null
          replied_at: string | null
          sender_type: string
          sent_at: string
          status: string | null
          subject: string
          thread_id: string
        }
        Insert: {
          body_full?: string | null
          body_preview?: string | null
          clicked_at?: string | null
          created_at?: string | null
          email_history_id?: string | null
          follow_up_to_message_id?: string | null
          id?: string
          is_follow_up?: boolean | null
          message_number: number
          metadata?: Json | null
          opened_at?: string | null
          replied_at?: string | null
          sender_type: string
          sent_at: string
          status?: string | null
          subject: string
          thread_id: string
        }
        Update: {
          body_full?: string | null
          body_preview?: string | null
          clicked_at?: string | null
          created_at?: string | null
          email_history_id?: string | null
          follow_up_to_message_id?: string | null
          id?: string
          is_follow_up?: boolean | null
          message_number?: number
          metadata?: Json | null
          opened_at?: string | null
          replied_at?: string | null
          sender_type?: string
          sent_at?: string
          status?: string | null
          subject?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_email_history_id_fkey"
            columns: ["email_history_id"]
            isOneToOne: false
            referencedRelation: "email_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_follow_up_to_message_id_fkey"
            columns: ["follow_up_to_message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_threads: {
        Row: {
          company_name: string | null
          created_at: string | null
          engagement_score: number | null
          first_contact_at: string | null
          id: string
          last_activity_at: string | null
          last_recruiter_message_at: string | null
          last_user_message_at: string | null
          metadata: Json | null
          recruiter_email: string
          recruiter_messages_count: number | null
          recruiter_name: string | null
          response_rate: number | null
          status: string
          subject_line: string | null
          total_messages: number | null
          updated_at: string | null
          user_id: string
          user_messages_count: number | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          engagement_score?: number | null
          first_contact_at?: string | null
          id?: string
          last_activity_at?: string | null
          last_recruiter_message_at?: string | null
          last_user_message_at?: string | null
          metadata?: Json | null
          recruiter_email: string
          recruiter_messages_count?: number | null
          recruiter_name?: string | null
          response_rate?: number | null
          status?: string
          subject_line?: string | null
          total_messages?: number | null
          updated_at?: string | null
          user_id: string
          user_messages_count?: number | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          engagement_score?: number | null
          first_contact_at?: string | null
          id?: string
          last_activity_at?: string | null
          last_recruiter_message_at?: string | null
          last_user_message_at?: string | null
          metadata?: Json | null
          recruiter_email?: string
          recruiter_messages_count?: number | null
          recruiter_name?: string | null
          response_rate?: number | null
          status?: string
          subject_line?: string | null
          total_messages?: number | null
          updated_at?: string | null
          user_id?: string
          user_messages_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_recruiter_requests: {
        Row: {
          admin_notes: string | null
          company_name: string | null
          created_at: string | null
          domain_name: string | null
          id: string
          recruiter_email: string | null
          recruiter_name: string | null
          request_type: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          company_name?: string | null
          created_at?: string | null
          domain_name?: string | null
          id?: string
          recruiter_email?: string | null
          recruiter_name?: string | null
          request_type: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          company_name?: string | null
          created_at?: string | null
          domain_name?: string | null
          id?: string
          recruiter_email?: string | null
          recruiter_name?: string | null
          request_type?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      domains: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_history: {
        Row: {
          created_at: string | null
          domain: string | null
          id: string
          recipient: string
          sent_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          id?: string
          recipient: string
          sent_at?: string | null
          status: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          id?: string
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          industry: string | null
          is_global: boolean | null
          name: string
          rating: number | null
          role: string | null
          subject: string
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          industry?: string | null
          is_global?: boolean | null
          name: string
          rating?: number | null
          role?: string | null
          subject: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          industry?: string | null
          is_global?: boolean | null
          name?: string
          rating?: number | null
          role?: string | null
          subject?: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_tracking: {
        Row: {
          bounced_at: string | null
          click_links: Json | null
          clicked_at: string | null
          created_at: string | null
          domain: string | null
          email_id: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient: string
          replied_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          tracking_pixel_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bounced_at?: string | null
          click_links?: Json | null
          clicked_at?: string | null
          created_at?: string | null
          domain?: string | null
          email_id?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient: string
          replied_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          tracking_pixel_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bounced_at?: string | null
          click_links?: Json | null
          clicked_at?: string | null
          created_at?: string | null
          domain?: string | null
          email_id?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient?: string
          replied_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          tracking_pixel_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      follow_up_suggestions: {
        Row: {
          ai_generated: boolean | null
          created_at: string | null
          id: string
          priority: string | null
          reason: string
          status: string | null
          suggested_at: string | null
          suggested_body_preview: string | null
          suggested_date: string
          suggested_subject: string | null
          thread_id: string
          updated_at: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          created_at?: string | null
          id?: string
          priority?: string | null
          reason: string
          status?: string | null
          suggested_at?: string | null
          suggested_body_preview?: string | null
          suggested_date: string
          suggested_subject?: string | null
          thread_id: string
          updated_at?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          created_at?: string | null
          id?: string
          priority?: string | null
          reason?: string
          status?: string | null
          suggested_at?: string | null
          suggested_body_preview?: string | null
          suggested_date?: string
          suggested_subject?: string | null
          thread_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_suggestions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          application_date: string | null
          company_name: string
          created_at: string | null
          follow_up_date: string | null
          id: string
          interview_date: string | null
          job_title: string
          job_url: string | null
          notes: string | null
          offer_amount: number | null
          recruiter_email: string
          recruiter_name: string | null
          response_date: string | null
          response_received: boolean | null
          source: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_date?: string | null
          company_name: string
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          interview_date?: string | null
          job_title: string
          job_url?: string | null
          notes?: string | null
          offer_amount?: number | null
          recruiter_email: string
          recruiter_name?: string | null
          response_date?: string | null
          response_received?: boolean | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_date?: string | null
          company_name?: string
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          interview_date?: string | null
          job_title?: string
          job_url?: string | null
          notes?: string | null
          offer_amount?: number | null
          recruiter_email?: string
          recruiter_name?: string | null
          response_date?: string | null
          response_received?: boolean | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string
          error_message: string | null
          failed_count: number | null
          html_body: string
          id: string
          sent_count: number | null
          started_at: string | null
          status: string
          subject: string
          target_filters: Json | null
          target_type: string
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          error_message?: string | null
          failed_count?: number | null
          html_body: string
          id?: string
          sent_count?: number | null
          started_at?: string | null
          status?: string
          subject: string
          target_filters?: Json | null
          target_type: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          error_message?: string | null
          failed_count?: number | null
          html_body?: string
          id?: string
          sent_count?: number | null
          started_at?: string | null
          status?: string
          subject?: string
          target_filters?: Json | null
          target_type?: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          campaign_id: string
          created_at: string | null
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "notification_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_analytics: {
        Row: {
          average_time_on_page: number | null
          bounce_count: number | null
          created_at: string
          exit_count: number | null
          id: string
          metadata: Json | null
          page_path: string
          page_title: string | null
          unique_visitors: number | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          average_time_on_page?: number | null
          bounce_count?: number | null
          created_at?: string
          exit_count?: number | null
          id?: string
          metadata?: Json | null
          page_path: string
          page_title?: string | null
          unique_visitors?: number | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          average_time_on_page?: number | null
          bounce_count?: number | null
          created_at?: string
          exit_count?: number | null
          id?: string
          metadata?: Json | null
          page_path?: string
          page_title?: string | null
          unique_visitors?: number | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          daily_emails_sent: number
          email: string
          failed_emails: number
          gmail_token_refreshed_at: string | null
          google_refresh_token: string | null
          id: string
          job_domains: Json | null
          last_sent_date: string | null
          linkedin_url: string | null
          location: string | null
          name: string
          permissions: string[] | null
          phone: string | null
          portfolio_url: string | null
          preferences: Json | null
          professional_title: string | null
          profile_photo_url: string | null
          resume_url: string | null
          role: string
          status: string
          subscription_expires_at: string | null
          subscription_tier: string
          successful_emails: number
          total_emails_sent: number
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          daily_emails_sent?: number
          email: string
          failed_emails?: number
          gmail_token_refreshed_at?: string | null
          google_refresh_token?: string | null
          id: string
          job_domains?: Json | null
          last_sent_date?: string | null
          linkedin_url?: string | null
          location?: string | null
          name: string
          permissions?: string[] | null
          phone?: string | null
          portfolio_url?: string | null
          preferences?: Json | null
          professional_title?: string | null
          profile_photo_url?: string | null
          resume_url?: string | null
          role?: string
          status?: string
          subscription_expires_at?: string | null
          subscription_tier?: string
          successful_emails?: number
          total_emails_sent?: number
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          daily_emails_sent?: number
          email?: string
          failed_emails?: number
          gmail_token_refreshed_at?: string | null
          google_refresh_token?: string | null
          id?: string
          job_domains?: Json | null
          last_sent_date?: string | null
          linkedin_url?: string | null
          location?: string | null
          name?: string
          permissions?: string[] | null
          phone?: string | null
          portfolio_url?: string | null
          preferences?: Json | null
          professional_title?: string | null
          profile_photo_url?: string | null
          resume_url?: string | null
          role?: string
          status?: string
          subscription_expires_at?: string | null
          subscription_tier?: string
          successful_emails?: number
          total_emails_sent?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      push_notification_campaigns: {
        Row: {
          badge: string | null
          body: string
          clicked_count: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          data: Json | null
          delivered_count: number | null
          failed_count: number | null
          icon: string | null
          id: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          target_filters: Json | null
          target_type: string | null
          title: string
          total_recipients: number | null
          url: string | null
        }
        Insert: {
          badge?: string | null
          body: string
          clicked_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          delivered_count?: number | null
          failed_count?: number | null
          icon?: string | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          target_filters?: Json | null
          target_type?: string | null
          title: string
          total_recipients?: number | null
          url?: string | null
        }
        Update: {
          badge?: string | null
          body?: string
          clicked_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          delivered_count?: number | null
          failed_count?: number | null
          icon?: string | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          target_filters?: Json | null
          target_type?: string | null
          title?: string
          total_recipients?: number | null
          url?: string | null
        }
        Relationships: []
      }
      push_notification_events: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "push_notification_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          subscription: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subscription: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subscription?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      recruiters: {
        Row: {
          company: string | null
          company_size: string | null
          created_at: string | null
          domain: string | null
          email: string
          id: string
          last_contacted: string | null
          name: string
          quality_score: number | null
          response_rate: number | null
          scraped_at: string | null
          source_platform: string | null
          subdomain_id: string | null
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          company_size?: string | null
          created_at?: string | null
          domain?: string | null
          email: string
          id?: string
          last_contacted?: string | null
          name: string
          quality_score?: number | null
          response_rate?: number | null
          scraped_at?: string | null
          source_platform?: string | null
          subdomain_id?: string | null
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          company_size?: string | null
          created_at?: string | null
          domain?: string | null
          email?: string
          id?: string
          last_contacted?: string | null
          name?: string
          quality_score?: number | null
          response_rate?: number | null
          scraped_at?: string | null
          source_platform?: string | null
          subdomain_id?: string | null
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruiters_subdomain_id_fkey"
            columns: ["subdomain_id"]
            isOneToOne: false
            referencedRelation: "subdomains"
            referencedColumns: ["id"]
          },
        ]
      }
      scraper_config: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_run_at: string | null
          last_success_at: string | null
          platform: string
          quota_per_day: number | null
          rate_limit_per_minute: number | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          last_success_at?: string | null
          platform: string
          quota_per_day?: number | null
          rate_limit_per_minute?: number | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          last_success_at?: string | null
          platform?: string
          quota_per_day?: number | null
          rate_limit_per_minute?: number | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scraping_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          errors: Json | null
          id: string
          metadata: Json | null
          platform: string
          records_added: number | null
          records_found: number | null
          records_skipped: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          errors?: Json | null
          id?: string
          metadata?: Json | null
          platform: string
          records_added?: number | null
          records_found?: number | null
          records_skipped?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          errors?: Json | null
          id?: string
          metadata?: Json | null
          platform?: string
          records_added?: number | null
          records_found?: number | null
          records_skipped?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      subdomains: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          domain_id: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          domain_id: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          domain_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subdomains_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          amount: number
          created_at: string | null
          expires_at: string | null
          id: string
          payment_id: string | null
          payment_method: string | null
          plan_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          plan_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          plan_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_cycle_display: string | null
          button_disabled_text: string | null
          button_text: string | null
          created_at: string | null
          daily_limit: number
          description: string | null
          discount_percentage: number | null
          display_name: string | null
          duration_days: number
          duration_unit: string
          features: string[]
          id: string
          is_active: boolean | null
          is_recommended: boolean
          max_features: number | null
          name: string
          old_price: number | null
          price: number
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          billing_cycle_display?: string | null
          button_disabled_text?: string | null
          button_text?: string | null
          created_at?: string | null
          daily_limit?: number
          description?: string | null
          discount_percentage?: number | null
          display_name?: string | null
          duration_days?: number
          duration_unit?: string
          features?: string[]
          id: string
          is_active?: boolean | null
          is_recommended?: boolean
          max_features?: number | null
          name: string
          old_price?: number | null
          price: number
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          billing_cycle_display?: string | null
          button_disabled_text?: string | null
          button_text?: string | null
          created_at?: string | null
          daily_limit?: number
          description?: string | null
          discount_percentage?: number | null
          display_name?: string | null
          duration_days?: number
          duration_unit?: string
          features?: string[]
          id?: string
          is_active?: boolean | null
          is_recommended?: boolean
          max_features?: number | null
          name?: string
          old_price?: number | null
          price?: number
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      system_credentials: {
        Row: {
          created_at: string | null
          credentials: Json
          id: string
          integration_name: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials: Json
          id?: string
          integration_name: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json
          id?: string
          integration_name?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_activity_events: {
        Row: {
          created_at: string
          element_id: string | null
          element_text: string | null
          element_type: string | null
          event_name: string | null
          event_type: string
          id: string
          metadata: Json | null
          page_path: string
          page_title: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          element_id?: string | null
          element_text?: string | null
          element_type?: string | null
          event_name?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          page_path: string
          page_title?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          element_id?: string | null
          element_text?: string | null
          element_type?: string | null
          event_name?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page_path?: string
          page_title?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_engagement_metrics: {
        Row: {
          average_session_duration: number | null
          bounce_rate: number | null
          created_at: string
          id: string
          metadata: Json | null
          metric_date: string
          pages_per_session: number | null
          total_clicks: number | null
          total_form_submits: number | null
          total_page_views: number | null
          total_sessions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_session_duration?: number | null
          bounce_rate?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_date: string
          pages_per_session?: number | null
          total_clicks?: number | null
          total_form_submits?: number | null
          total_page_views?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_session_duration?: number | null
          bounce_rate?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_date?: string
          pages_per_session?: number | null
          total_clicks?: number | null
          total_form_submits?: number | null
          total_page_views?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "notification_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_resumes: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_primary: boolean | null
          updated_at: string
          user_id: string
          version_name: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_primary?: boolean | null
          updated_at?: string
          user_id: string
          version_name?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_primary?: boolean | null
          updated_at?: string
          user_id?: string
          version_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          ended_at: string | null
          exit_page: string | null
          exit_reason: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity_at: string
          metadata: Json | null
          session_token: string
          started_at: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          exit_page?: string | null
          exit_reason?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string
          metadata?: Json | null
          session_token: string
          started_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          exit_page?: string | null
          exit_reason?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string
          metadata?: Json | null
          session_token?: string
          started_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_all_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          name: string
          role: string
          status: string
          subscription_tier: string
        }[]
      }
      admin_get_dashboard_stats: { Args: never; Returns: Json }
      admin_get_subscription_distribution: {
        Args: never
        Returns: {
          count: number
          tier: string
        }[]
      }
      admin_get_user_signups_last_30_days: {
        Args: never
        Returns: {
          count: number
          signup_date: string
        }[]
      }
      get_recruiter_counts_by_tier_category: {
        Args: never
        Returns: {
          count: number
          domain_name: string
          subdomain_id: string
          tier: string
        }[]
      }
      get_tier_limits: {
        Args: never
        Returns: {
          limit_per_category: number
          tier: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_superadmin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
