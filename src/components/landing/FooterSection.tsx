import { Mail, Twitter, Linkedin, Github } from "lucide-react";
import { Link } from "react-router-dom";

const FooterSection = () => {
  return (
    <footer className="bg-primary py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-glow">
                <Mail className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="text-xl font-bold text-primary-foreground">JobSeeker</span>
            </div>
            <p className="text-primary-foreground/60 mb-6">
              Automate your job search and land your dream role faster with AI-powered outreach.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <Twitter className="w-5 h-5 text-primary-foreground" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <Linkedin className="w-5 h-5 text-primary-foreground" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <Github className="w-5 h-5 text-primary-foreground" />
              </a>
            </div>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-semibold text-primary-foreground mb-4">Product</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">Features</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">Pricing</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">Templates</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">API</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-primary-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">About</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">Blog</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">Careers</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-primary-foreground mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><Link to="/privacy-policy" className="text-primary-foreground/60 hover:text-accent transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="text-primary-foreground/60 hover:text-accent transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/60 text-sm">
            © 2024 JobSeeker. All rights reserved.
          </p>
          <p className="text-primary-foreground/60 text-sm">
            Made with ❤️ for job seekers worldwide
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
