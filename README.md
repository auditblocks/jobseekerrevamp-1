# JobSeeker - AI-Powered Job Outreach Platform

**Production URL**: https://startworking.in

## 📚 Documentation

- **[MASTER_GUIDE.md](./MASTER_GUIDE.md)** - Complete setup, configuration, and troubleshooting guide
- **[EDGE_FUNCTIONS_EXPORT.md](./EDGE_FUNCTIONS_EXPORT.md)** - Edge functions documentation and code
- **[DATABASE_BACKUP.sql](./DATABASE_BACKUP.sql)** - Complete database schema and backup
- **[RLS_POLICIES.sql](./RLS_POLICIES.sql)** - Row Level Security policies

## Quick Start

### Local Development

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend**: Supabase (PostgreSQL, Edge Functions, Auth, Storage)
- **Email**: Gmail API, Resend API
- **Payment**: Razorpay
- **Deployment**: Netlify

## Project Structure

```
├── src/                    # Frontend React application
├── supabase/
│   ├── functions/          # Edge functions (Deno)
│   └── migrations/         # Database migrations
├── public/                 # Static assets
├── MASTER_GUIDE.md         # Complete setup guide
├── DATABASE_BACKUP.sql     # Database backup
├── RLS_POLICIES.sql        # Security policies
└── EDGE_FUNCTIONS_EXPORT.md # Edge functions docs
```

## Deployment

The project is deployed on Netlify. See [MASTER_GUIDE.md](./MASTER_GUIDE.md) for domain configuration and deployment details.

## Support

For setup, configuration, and troubleshooting, see **[MASTER_GUIDE.md](./MASTER_GUIDE.md)**.
