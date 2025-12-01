# How to Disable Vercel Auto-Deployments

## Quick Fix - Disable in Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Git**
4. Under **Production Branch**, uncheck **"Automatically deploy every push to the production branch"**
5. Under **Preview Deployments**, uncheck **"Automatically create preview deployments for pull requests"**
6. Click **Save**

## Alternative: Disconnect GitHub Integration

1. Go to Vercel Dashboard → Project Settings
2. Go to **Git** tab
3. Click **Disconnect** next to your GitHub repository
4. This will stop all automatic deployments

## Using vercel.json (Already Added)

I've added a `vercel.json` file that disables automatic deployments. However, you still need to configure it in the Vercel dashboard for it to take full effect.

## Manual Deployment Only

After disabling auto-deployments, you can deploy manually:
- Via Vercel Dashboard: Click "Deploy" button
- Via Vercel CLI: `vercel --prod`
- Via GitHub Actions: Use the deploy workflows we created

## Note

The `vercel.json` file I created will help, but the main setting needs to be changed in the Vercel dashboard for it to fully work.

