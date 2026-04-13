/**
 * @fileoverview Contact/support form component.
 * Submits messages via the `send-contact-form` Supabase edge function.
 * Supports pre-populated name/email, two visual variants (default and compact),
 * and tracks which page the form was submitted from via the `source` prop.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ContactFormSource = "home" | "contact_page" | "settings";

interface ContactSupportFormProps {
  source: ContactFormSource;
  defaultName?: string;
  defaultEmail?: string;
  variant?: "default" | "compact";
  className?: string;
}

/**
 * Reusable contact support form that sends messages to the backend edge function.
 * Resets subject/message fields on success while preserving name/email defaults.
 * @param source - Identifies where the form is rendered (home, contact_page, settings) for analytics.
 * @param variant - "compact" reduces spacing and row count for embedding in smaller containers.
 */
export function ContactSupportForm({
  source,
  defaultName = "",
  defaultEmail = "",
  variant = "default",
  className = "",
}: ContactSupportFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: defaultName,
    email: defaultEmail,
    subject: "",
    message: "",
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      name: defaultName || prev.name,
      email: defaultEmail || prev.email,
    }));
  }, [defaultName, defaultEmail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const email = formData.email.trim();
    const subject = formData.subject.trim();
    const message = formData.message.trim();

    if (!name || !email || !subject || !message) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-form", {
        body: { name, email, subject, message, source },
      });

      if (error) throw error;
      if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(String((data as { error: string }).error));
      }

      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({
        name: defaultName || "",
        email: defaultEmail || "",
        subject: "",
        message: "",
      });
    } catch (err: unknown) {
      console.error("Error sending contact form:", err);
      const msg = err instanceof Error ? err.message : "Failed to send message. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const compact = variant === "compact";

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      <div className={`grid grid-cols-1 ${compact ? "gap-4" : "sm:grid-cols-2 gap-6"}`}>
        <div className="space-y-2">
          <Label htmlFor={`contact-name-${source}`}>Name *</Label>
          <Input
            id={`contact-name-${source}`}
            name="name"
            type="text"
            required
            autoComplete="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your name"
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`contact-email-${source}`}>Email *</Label>
          <Input
            id={`contact-email-${source}`}
            name="email"
            type="email"
            required
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your.email@example.com"
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`contact-subject-${source}`}>Subject *</Label>
        <Input
          id={`contact-subject-${source}`}
          name="subject"
          type="text"
          required
          value={formData.subject}
          onChange={handleChange}
          placeholder="What is this regarding?"
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`contact-message-${source}`}>Message *</Label>
        <Textarea
          id={`contact-message-${source}`}
          name="message"
          required
          value={formData.message}
          onChange={handleChange}
          placeholder="Tell us how we can help..."
          rows={compact ? 4 : 6}
          className="w-full resize-none"
        />
      </div>

      <Button type="submit" size={compact ? "default" : "lg"} className={compact ? "w-full sm:w-auto" : "w-full sm:w-auto"} disabled={loading}>
        {loading ? (
          <>
            <Send className="mr-2 h-4 w-4 animate-pulse" />
            Sending...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send message
          </>
        )}
      </Button>
    </form>
  );
}
