# How to Fix Missing Movie Images - TMDb API Setup

## Problem
Your IMDb clone has no movie posters or images because the TMDb API key is not configured.

## Solution: Get FREE TMDb API Key (Takes 5 minutes)

### Step 1: Create TMDb Account
1. Go to https://www.themoviedb.org/signup
2. Create a free account (use email or Google/GitHub)
3. Verify your email address

### Step 2: Request API Key
1. Log in to your TMDb account
2. Go to https://www.themoviedb.org/settings/api
3. Click **"Request an API Key"**
4. Choose **"Developer"** (This is FREE forever)

### Step 3: Fill Application Form
Fill in the form with these details:

**Application Name:** IMDb Clone Development  
**Application URL:** http://localhost:3000  
**Application Summary:** Personal movie database web application for learning purposes

(You can use any details - it's just for their records)

### Step 4: Copy API Key
1. After submitting, you'll see your **API Key (v3 auth)**
2. Copy this key (it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### Step 5: Add to Your Project
1. Open `.env.local` file in your project root
2. Replace this line:
   ```env
   NEXT_PUBLIC_TMDB_API_KEY=
   ```
   
   With your actual key:
   ```env
   NEXT_PUBLIC_TMDB_API_KEY=your_actual_key_here
   ```

3. Save the file

### Step 6: Restart Dev Server
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## What You'll Get After Setup

✅ **Real movie posters** from TMDb  
✅ **Movie backdrop images** on detail pages  
✅ **Actor profile photos**  
✅ **High-quality images** (automatic WebP/AVIF optimization by Next.js)  
✅ **Trending movies** (updated daily)  
✅ **Popular movies** (real-time data)  
✅ **Top rated movies**  
✅ **Upcoming releases**  
✅ **Movie trailers** from YouTube  
✅ **Full movie details** (cast, crew, reviews, recommendations)

## Verification

After adding the API key and restarting:

1. Open http://localhost:3000
2. You should see movie posters in these sections:
   - Trending Today
   - Popular Movies
   - Top Rated
   - Upcoming Releases

## Troubleshooting

### Still no images?
1. Make sure there are NO spaces around the `=` sign in `.env.local`
2. Make sure the key starts with `NEXT_PUBLIC_` (required for client-side access)
3. Restart the dev server completely (Ctrl+C then `npm run dev`)
4. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

### API Key Not Working?
1. Check if you copied the **API Key (v3 auth)**, not the Access Token
2. Make sure your TMDb account email is verified
3. Wait 5 minutes after creating the key (TMDb might need time to activate it)

## Note About Costs

**TMDb API is 100% FREE** for non-commercial use. There are NO charges, NO credit card required, and NO limits for personal projects.

## Alternative: Use Vercel Environment Variables

If deploying to Vercel:

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add: `NEXT_PUBLIC_TMDB_API_KEY` with your key
4. Redeploy your site

The images will work on your live site!
