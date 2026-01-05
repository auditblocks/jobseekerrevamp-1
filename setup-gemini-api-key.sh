#!/bin/bash

# Setup script for Google Gemini API Key for Resume Analysis
# This script helps you set up the GOOGLE_GEMINI_API_KEY for Supabase Edge Functions

echo "=========================================="
echo "Google Gemini API Key Setup"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Please install it first: https://supabase.com/docs/guides/cli/getting-started"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory."
    echo "Please run this script from the project root."
    exit 1
fi

echo "This script will help you set up the Google Gemini API key for resume analysis."
echo ""
echo "To get a Google Gemini API key:"
echo "1. Go to https://makersuite.google.com/app/apikey"
echo "2. Create a new API key"
echo "3. Copy the API key"
echo ""

# Prompt for API key
read -p "Enter your Google Gemini API key: " api_key

if [ -z "$api_key" ]; then
    echo "❌ API key cannot be empty. Exiting."
    exit 1
fi

echo ""
echo "Setting up API key..."

# Check if we're linked to a remote project
if supabase projects list &> /dev/null; then
    echo "📡 Detected remote Supabase project."
    echo "Setting secret for remote project..."
    if supabase secrets set GOOGLE_GEMINI_API_KEY="$api_key" --project-ref "$(grep 'project_id' supabase/config.toml | cut -d'"' -f2)" 2>&1; then
        echo "✅ API key set successfully for remote project!"
    else
        echo "⚠️  Could not set remote secret. Trying local setup..."
        # Fall through to local setup
    fi
fi

# Set for local development
echo "Setting secret for local development..."
if supabase secrets set GOOGLE_GEMINI_API_KEY="$api_key" 2>&1; then
    echo "✅ API key set successfully for local development!"
else
    echo "⚠️  Note: For local development, you may need to set this in your .env.local file"
    echo "   Add: GOOGLE_GEMINI_API_KEY=$api_key"
fi

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. If using remote Supabase, redeploy your edge functions:"
echo "   supabase functions deploy analyze-resume"
echo "   supabase functions deploy analyze-resume-ats"
echo "   supabase functions deploy optimize-resume"
echo ""
echo "2. For local development, restart your Supabase instance:"
echo "   supabase functions serve"
echo ""
echo "3. Test the resume analysis feature in your application."
echo ""
echo "✅ Setup complete!"

