import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactSupportForm } from "@/components/ContactSupportForm";

const ContactSection = () => {
  return (
    <section id="contact" className="py-16 sm:py-24 bg-background border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
            <Mail className="w-4 h-4" />
            <span>Contact us</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Get in touch</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Questions about JobSeeker or your account? Send us a message—we typically reply within one business day.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08 }}
        >
          <Card className="border-border/80 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Send a message</CardTitle>
              <CardDescription>All fields are required.</CardDescription>
            </CardHeader>
            <CardContent>
              <ContactSupportForm source="home" variant="compact" />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;
