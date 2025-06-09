# Email Allowlist Security Setup

## Overview
Your Paperbacks.AI application is now secured with an email allowlist. Only users with pre-approved email addresses can access the application.

## How It Works
1. **Landing Page**: Immediately redirects unauthenticated users to sign-in
2. **Email Validation**: During Google OAuth sign-in, the system checks if the user's email is in the allowlist
3. **Access Control**: Only approved emails can complete the sign-in process
4. **Error Handling**: Unauthorized users see a clear message explaining access is restricted

## Configuration

### 1. Add Your Email to the Allowlist
Edit your `.env.local` file and update the `ALLOWED_EMAILS` variable:

```env
# Single email
ALLOWED_EMAILS=your-email@gmail.com

# Multiple emails (comma-separated)
ALLOWED_EMAILS=your-email@gmail.com,colleague@company.com,tester@example.com
```

### 2. Important Notes
- **No spaces** around commas in the email list
- **Case sensitive** - make sure email matches exactly
- **Fail-safe**: If `ALLOWED_EMAILS` is empty, ALL access is denied
- Changes require server restart in development

## Testing the Security

### ✅ Authorized Access
1. Use an email that's in the `ALLOWED_EMAILS` list
2. Visit your app URL
3. You'll be redirected to Google sign-in
4. After successful OAuth, you'll access the editor

### ❌ Unauthorized Access
1. Try signing in with an email NOT in the allowlist
2. You'll be redirected to the error page with message:
   > "Access denied. Your email address is not authorized to use this application."

## Adding Beta Testers
To add new users:
1. Add their email to `ALLOWED_EMAILS` in `.env.local`
2. Restart your development server (`npm run dev`)
3. For production, update the environment variable in Vercel dashboard

## Security Features
- ✅ No public access to any pages
- ✅ Immediate authentication requirement
- ✅ Email-based access control
- ✅ Clear error messages for unauthorized users
- ✅ Fail-safe defaults (deny access if misconfigured)
- ✅ Works with existing Google OAuth flow

## Production Deployment
When deploying to Vercel:
1. Go to your project dashboard
2. Settings → Environment Variables
3. Add `ALLOWED_EMAILS` with your approved email list
4. Redeploy the application

Your app is now private and secure! 🔒