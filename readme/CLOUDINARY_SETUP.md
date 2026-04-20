# Cloudinary Setup Guide

This guide explains how to set up Cloudinary for image uploads on JC Rentals.

## Why Cloudinary?

Render has an ephemeral file system, meaning files stored on disk are deleted when:
- Your app restarts
- The dyno is restarted
- Your app is redeployed

Cloudinary solves this by storing images in the cloud, making them persistent across app restarts and deployments.

## Step 1: Create a Cloudinary Account

1. Go to https://cloudinary.com/
2. Click "Sign Up" and create a free account
3. Verify your email
4. Log in to your Cloudinary Dashboard

## Step 2: Get Your Credentials

From your Cloudinary Dashboard:

1. Navigate to the **Dashboard** tab
2. Find your **Cloud Name** at the top
3. Find your **API Key** and **API Secret** (click "Show" if needed)

**Important:** Keep your API Secret private. Never commit it to version control.

## Step 3: Add Environment Variables

### Locally (Development):

Create or update your `.env` file in the root directory:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Replace:
- `your_cloud_name` - Your Cloudinary Cloud Name
- `your_api_key` - Your Cloudinary API Key
- `your_api_secret` - Your Cloudinary API Secret

### On Render (Production):

1. Go to your Render service Dashboard
2. Click on **Environment**
3. Add the three environment variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Click **Save Changes**
5. Your app will automatically redeploy

## Step 4: Verify Setup

1. Start your local server: `npm start`
2. Go to Admin > Add Equipment
3. Upload an image for each category
4. If successful, you should see a Cloudinary URL in the image field
5. Images will be organized in Cloudinary by category folder

### Viewing Images in Cloudinary

After uploading:
1. Log in to Cloudinary Dashboard
2. Go to **Media Library**
3. You'll see folders like `jc-rentals/equipment/Tools`, `jc-rentals/equipment/Machinery`, etc.
4. Each image will be in its corresponding category folder

## Troubleshooting

### Images not uploading?
- Check that all three environment variables are set correctly
- Verify API credentials are valid
- Check browser console for errors

### Can't find API Secret on Render?
- Make sure you're in the right place (Settings > Environment)
- Double-check the variable names match exactly
- Render needs a redeploy after adding variables

## How It Works

- Images are uploaded directly to Cloudinary
- **Automatic category validation** prevents invalid or duplicate folders
- Images are organized in folders by category: `jc-rentals/equipment/{category}`
- Each equipment category gets its own subfolder (Tools, Machinery, Vehicles, Safety, Other)
- Only valid categories are allowed to prevent folder clutter in Cloudinary
- Images get instant URLs (no need to deploy)
- Images persist across app restarts/redeployments
- Automatic image optimization and CDN delivery
- Free tier includes 25GB storage per month

## Category Validation

The system validates categories at two levels:

### 1. Route-Level Validation (First Check)
When you upload equipment, the category is validated BEFORE upload:
- Only categories in the allowed list are accepted
- Invalid categories are rejected with an error message
- Prevents Cloudinary from creating unwanted/duplicate folders

### 2. Controller-Level Validation (Second Check)
After upload, category is validated again before saving to database:
- Ensures data consistency
- Provides an additional safety layer

### Allowed Categories
- **Tools** - Hand tools, power tools, etc.
- **Machinery** - Heavy machinery, equipment
- **Vehicles** - Trucks, forklifts, lifts
- **Safety** - Safety gear, PPE
- **Other** - Miscellaneous items

If you try to upload with an invalid category, you'll get an error:
```
Invalid category. Allowed categories are: Tools, Machinery, Vehicles, Safety, Other
```

## Folder Organization

When you upload equipment, the image automatically goes to the appropriate category folder in Cloudinary:

```
jc-rentals/
├── equipment/
│   ├── Tools/
│   │   ├── equipment-1234567890.jpg
│   │   └── equipment-1234567891.jpg
│   ├── Machinery/
│   │   └── equipment-1234567892.jpg
│   ├── Vehicles/
│   │   └── equipment-1234567893.jpg
│   ├── Safety/
│   │   └── equipment-1234567894.jpg
│   └── Other/
│       └── equipment-1234567895.jpg
```

## Testing Cloudinary Upload

```bash
# Verify environment variables are loaded
node -e "require('dotenv').config(); console.log(process.env.CLOUDINARY_CLOUD_NAME);"
```

Should print your cloud name if setup correctly.
