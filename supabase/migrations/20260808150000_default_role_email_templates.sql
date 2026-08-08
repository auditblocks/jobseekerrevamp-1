-- Default global cold-outreach email templates, one per common job role, so the
-- Templates page (src/pages/Templates.tsx) and Compose flow aren't empty on a
-- fresh install. Uses the same {{recruiterName}} / {{companyName}} / {{jobTitle}} /
-- {{userName}} merge-field convention already documented in the template create form.
-- Global templates are read-only for regular users (is_global = true, user_id = NULL) —
-- see the "Users can view global and their own email templates" RLS policy.
--
-- Covers 26 roles across tech, business, creative, engineering, and general
-- professional categories — a representative default set, not an exhaustive list
-- of every job title that exists.

-- Guarded so this migration is a safe no-op if it somehow runs more than once —
-- there's no natural unique key on (role, name) to hang ON CONFLICT off of.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.email_templates WHERE is_global = true AND created_by = 'admin'
  ) THEN
    INSERT INTO public.email_templates
      (user_id, name, subject, body, category, industry, role, tags, is_global, created_by)
    VALUES

(NULL, 'Software Engineer Outreach',
 'Application for {{jobTitle}} at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI came across the {{jobTitle}} opening at {{companyName}} and wanted to reach out directly. I have hands-on experience building and shipping production software, and I am confident I could contribute quickly to your engineering team.\n\nI have attached my resume for your review, and I would welcome the chance to discuss how my background lines up with what you are looking for.\n\nThank you for your time — I look forward to hearing from you.\n\nBest regards,\n{{userName}}',
 'Technology', 'Software Engineering', 'Software Engineer',
 ARRAY['engineering','tech','backend','frontend'], true, 'admin'),

(NULL, 'Data Scientist / Analyst Outreach',
 'Interested in the {{jobTitle}} role at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI noticed {{companyName}} is hiring for {{jobTitle}} and wanted to introduce myself. I work with data to find patterns that drive real decisions — from building models to turning messy datasets into something a business can act on.\n\nMy resume is attached; I would be glad to walk you through a couple of projects that are directly relevant to what your team is building.\n\nLooking forward to connecting.\n\nBest,\n{{userName}}',
 'Technology', 'Data & Analytics', 'Data Scientist',
 ARRAY['data','analytics','machine-learning'], true, 'admin'),

(NULL, 'DevOps / SRE Outreach',
 'Application for {{jobTitle}} — {{companyName}}',
 E'Hi {{recruiterName}},\n\nI am reaching out about the {{jobTitle}} position at {{companyName}}. I focus on keeping systems reliable and deployments boring — CI/CD, infrastructure as code, and monitoring that actually catches problems before users do.\n\nI have attached my resume and would welcome a conversation about your current infrastructure challenges and how I could help.\n\nThanks for considering my application.\n\nRegards,\n{{userName}}',
 'Technology', 'Infrastructure', 'DevOps Engineer',
 ARRAY['devops','sre','cloud','infrastructure'], true, 'admin'),

(NULL, 'QA / Test Engineer Outreach',
 'Application for {{jobTitle}} at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI saw the {{jobTitle}} opening at {{companyName}} and wanted to get in touch. I care about shipping software that actually works — building test strategies, automating what should not be manual, and catching issues before customers do.\n\nMy resume is attached. I would be happy to share examples of test frameworks I have built and how they reduced release-time defects.\n\nBest regards,\n{{userName}}',
 'Technology', 'Quality Assurance', 'QA Engineer',
 ARRAY['qa','testing','automation'], true, 'admin'),

(NULL, 'Product Manager Outreach',
 'Interested in the {{jobTitle}} opportunity at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI am writing about the {{jobTitle}} role at {{companyName}}. I enjoy the full arc of product work — talking to users, prioritizing ruthlessly, and shipping features that move the metrics that matter.\n\nI have attached my resume and would love to share how I have approached roadmap decisions in my previous roles.\n\nThanks for your time — hope to speak soon.\n\nBest,\n{{userName}}',
 'Technology', 'Product', 'Product Manager',
 ARRAY['product','strategy','roadmap'], true, 'admin'),

(NULL, 'UI/UX Designer Outreach',
 'Application for {{jobTitle}} at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI came across the {{jobTitle}} opening at {{companyName}} and wanted to reach out. I design with the user first — research, wireframes, and pixel-perfect execution that a development team can actually build.\n\nMy portfolio and resume are attached. I would love the opportunity to talk through my process and how it could fit your product.\n\nLooking forward to connecting.\n\nBest,\n{{userName}}',
 'Technology', 'Design', 'UI/UX Designer',
 ARRAY['design','ux','ui','product-design'], true, 'admin'),

(NULL, 'Cybersecurity Analyst Outreach',
 'Application for {{jobTitle}} — {{companyName}}',
 E'Hi {{recruiterName}},\n\nI am reaching out regarding the {{jobTitle}} role at {{companyName}}. I focus on identifying and closing security gaps before they become incidents — threat monitoring, vulnerability assessments, and incident response.\n\nMy resume is attached; I would welcome a conversation about your current security posture and where I could add value.\n\nThank you for your consideration.\n\nRegards,\n{{userName}}',
 'Technology', 'Security', 'Cybersecurity Analyst',
 ARRAY['security','infosec','risk'], true, 'admin'),

(NULL, 'Mobile App Developer Outreach',
 'Interested in the {{jobTitle}} role at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI noticed {{companyName}} is hiring for {{jobTitle}} and wanted to introduce myself. I build mobile apps that feel fast and native, and care as much about the details users notice as the architecture they do not.\n\nMy resume and a few app links are attached. Happy to walk through the technical decisions behind them whenever convenient.\n\nBest,\n{{userName}}',
 'Technology', 'Mobile Development', 'Mobile App Developer',
 ARRAY['mobile','ios','android','app-development'], true, 'admin'),

(NULL, 'Business Analyst Outreach',
 'Application for {{jobTitle}} at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI am writing about the {{jobTitle}} opening at {{companyName}}. I translate business problems into clear requirements and data-backed recommendations that teams can actually execute on.\n\nMy resume is attached, and I would welcome the chance to discuss the challenges your team is currently working through.\n\nThank you for your time.\n\nBest regards,\n{{userName}}',
 'General', 'Business Operations', 'Business Analyst',
 ARRAY['business-analysis','process','requirements'], true, 'admin'),

(NULL, 'Project Manager Outreach',
 'Interested in the {{jobTitle}} role at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI came across the {{jobTitle}} opening at {{companyName}} and wanted to reach out. I keep cross-functional projects on track — clear timelines, honest status updates, and the judgment to know when to escalate.\n\nMy resume is attached; I would be glad to share examples of projects I have delivered on time and budget.\n\nLooking forward to hearing from you.\n\nBest,\n{{userName}}',
 'General', 'Project Management', 'Project Manager',
 ARRAY['project-management','agile','delivery'], true, 'admin'),

(NULL, 'Sales Executive Outreach',
 'Application for {{jobTitle}} — {{companyName}}',
 E'Hi {{recruiterName}},\n\nI am reaching out about the {{jobTitle}} position at {{companyName}}. I build pipeline, close deals, and treat every prospect conversation as the start of a long-term relationship, not just a transaction.\n\nMy resume is attached with my track record. I would welcome a conversation about your current sales targets and how I could contribute.\n\nThanks for your consideration.\n\nBest,\n{{userName}}',
 'General', 'Sales', 'Sales Executive',
 ARRAY['sales','business-development','revenue'], true, 'admin'),

(NULL, 'Marketing Manager Outreach',
 'Interested in the {{jobTitle}} opportunity at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI saw the {{jobTitle}} role at {{companyName}} and wanted to get in touch. I plan and run campaigns end to end — positioning, channel strategy, and the analytics to know what actually worked.\n\nMy resume is attached; happy to share a few campaigns I have led and the results behind them.\n\nBest regards,\n{{userName}}',
 'Marketing', 'Marketing', 'Marketing Manager',
 ARRAY['marketing','branding','campaigns'], true, 'admin'),

(NULL, 'Digital Marketing Specialist Outreach',
 'Application for {{jobTitle}} at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI am writing about the {{jobTitle}} opening at {{companyName}}. I work across SEO, paid channels, and content to grow qualified traffic and turn it into results a business can measure.\n\nMy resume is attached, along with a summary of campaigns I have run. Would love to connect and discuss your current growth priorities.\n\nThanks,\n{{userName}}',
 'Marketing', 'Digital Marketing', 'Digital Marketing Specialist',
 ARRAY['digital-marketing','seo','ppc','content'], true, 'admin'),

(NULL, 'HR / Talent Acquisition Outreach',
 'Interested in the {{jobTitle}} role at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI came across the {{jobTitle}} opening at {{companyName}} and wanted to reach out directly. I focus on finding the right people quickly without cutting corners on candidate experience.\n\nMy resume is attached; I would welcome the opportunity to discuss your current hiring priorities.\n\nLooking forward to connecting.\n\nBest,\n{{userName}}',
 'General', 'Human Resources', 'HR / Talent Acquisition',
 ARRAY['hr','recruiting','talent-acquisition'], true, 'admin'),

(NULL, 'Finance / Accounting Analyst Outreach',
 'Application for {{jobTitle}} — {{companyName}}',
 E'Hi {{recruiterName}},\n\nI am reaching out about the {{jobTitle}} position at {{companyName}}. I work closely with numbers — financial modeling, reporting accuracy, and the kind of analysis that helps leadership make confident decisions.\n\nMy resume is attached; I would welcome a conversation about your team''s current priorities.\n\nThank you for your time.\n\nRegards,\n{{userName}}',
 'Finance', 'Finance & Accounting', 'Finance Analyst',
 ARRAY['finance','accounting','fp&a'], true, 'admin'),

(NULL, 'Operations Manager Outreach',
 'Interested in the {{jobTitle}} role at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI noticed {{companyName}} is hiring for {{jobTitle}} and wanted to introduce myself. I focus on making processes run smoother — fewer bottlenecks, clearer accountability, and measurable efficiency gains.\n\nMy resume is attached, and I would be glad to share examples of operational improvements I have led.\n\nBest regards,\n{{userName}}',
 'General', 'Operations', 'Operations Manager',
 ARRAY['operations','process-improvement','logistics'], true, 'admin'),

(NULL, 'Customer Success / Support Outreach',
 'Application for {{jobTitle}} at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI am writing about the {{jobTitle}} opening at {{companyName}}. I care about the customer actually succeeding with the product, not just closing tickets — retention and satisfaction follow from that.\n\nMy resume is attached; happy to discuss how I have approached customer relationships in my previous roles.\n\nThanks for your consideration.\n\nBest,\n{{userName}}',
 'General', 'Customer Success', 'Customer Success Manager',
 ARRAY['customer-success','support','retention'], true, 'admin'),

(NULL, 'Content Writer Outreach',
 'Interested in the {{jobTitle}} role at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI came across the {{jobTitle}} opening at {{companyName}} and wanted to reach out. I write content that is clear, on-brand, and actually gets read — from long-form pieces to sharp product copy.\n\nA few writing samples and my resume are attached. Would love to discuss your content goals.\n\nBest,\n{{userName}}',
 'Marketing', 'Content', 'Content Writer',
 ARRAY['content','writing','copywriting'], true, 'admin'),

(NULL, 'Graphic Designer Outreach',
 'Application for {{jobTitle}} — {{companyName}}',
 E'Hi {{recruiterName}},\n\nI am reaching out about the {{jobTitle}} position at {{companyName}}. I design visuals that are on-brand and get the message across quickly, across print and digital.\n\nMy portfolio and resume are attached. I would love to talk through my process and how it fits your brand.\n\nThank you,\n{{userName}}',
 'Marketing', 'Design', 'Graphic Designer',
 ARRAY['design','graphic-design','branding'], true, 'admin'),

(NULL, 'Video Editor Outreach',
 'Interested in the {{jobTitle}} role at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI saw the {{jobTitle}} opening at {{companyName}} and wanted to introduce myself. I edit video that holds attention — pacing, sound design, and a story that lands in the first few seconds.\n\nA showreel and my resume are attached. Happy to discuss your content pipeline whenever convenient.\n\nBest regards,\n{{userName}}',
 'Marketing', 'Video Production', 'Video Editor',
 ARRAY['video','editing','content-production'], true, 'admin'),

(NULL, 'Mechanical Engineer Outreach',
 'Application for {{jobTitle}} at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI am writing about the {{jobTitle}} opening at {{companyName}}. I work through design, prototyping, and testing to get products from concept to something that actually holds up in production.\n\nMy resume is attached; I would welcome a conversation about your current engineering priorities.\n\nThank you for your time.\n\nRegards,\n{{userName}}',
 'General', 'Mechanical Engineering', 'Mechanical Engineer',
 ARRAY['mechanical','engineering','manufacturing'], true, 'admin'),

(NULL, 'Civil Engineer Outreach',
 'Interested in the {{jobTitle}} role at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI came across the {{jobTitle}} opening at {{companyName}} and wanted to reach out. I work across planning, design, and site execution to deliver projects that are safe, on schedule, and built to last.\n\nMy resume is attached; I would be glad to discuss projects relevant to your current pipeline.\n\nBest,\n{{userName}}',
 'General', 'Civil Engineering', 'Civil Engineer',
 ARRAY['civil','engineering','construction'], true, 'admin'),

(NULL, 'Electrical Engineer Outreach',
 'Application for {{jobTitle}} — {{companyName}}',
 E'Hi {{recruiterName}},\n\nI am reaching out about the {{jobTitle}} position at {{companyName}}. I work on electrical systems from design through commissioning, with a focus on safety and reliability.\n\nMy resume is attached; I would welcome the opportunity to discuss your team''s current projects.\n\nThank you for your consideration.\n\nRegards,\n{{userName}}',
 'General', 'Electrical Engineering', 'Electrical Engineer',
 ARRAY['electrical','engineering','power-systems'], true, 'admin'),

(NULL, 'Teacher / Education Outreach',
 'Interested in the {{jobTitle}} role at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI noticed {{companyName}} is hiring for {{jobTitle}} and wanted to introduce myself. I care about making concepts click for students, not just covering the syllabus — building lessons that actually stick.\n\nMy resume is attached, and I would welcome a conversation about your current curriculum needs.\n\nBest regards,\n{{userName}}',
 'General', 'Education', 'Teacher',
 ARRAY['education','teaching','curriculum'], true, 'admin'),

(NULL, 'Legal / Compliance Outreach',
 'Application for {{jobTitle}} at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI am writing about the {{jobTitle}} opening at {{companyName}}. I work through contracts, regulatory requirements, and risk assessments with the precision this kind of work demands.\n\nMy resume is attached; I would welcome a conversation about your team''s current legal or compliance priorities.\n\nThank you for your time.\n\nBest,\n{{userName}}',
 'General', 'Legal', 'Legal / Compliance Associate',
 ARRAY['legal','compliance','contracts'], true, 'admin'),

(NULL, 'Management Consultant Outreach',
 'Interested in the {{jobTitle}} role at {{companyName}}',
 E'Hi {{recruiterName}},\n\nI came across the {{jobTitle}} opening at {{companyName}} and wanted to reach out. I work through ambiguous business problems and land on recommendations that clients can actually implement.\n\nMy resume is attached; I would be glad to share examples of engagements I have led.\n\nLooking forward to connecting.\n\nBest,\n{{userName}}',
 'General', 'Consulting', 'Management Consultant',
 ARRAY['consulting','strategy','advisory'], true, 'admin');

  END IF;
END $$;
