# Cloud Hosting & GitHub Deployment Guide

Since this is a full-stack web application featuring an Express.js server and a MongoDB database, it cannot be hosted entirely on static-only hosting platforms like GitHub Pages. Instead, you need a hosting service that runs the Node.js runtime and connects to a database.

This guide explains how to host the codebase on **GitHub** and deploy the live application on the internet for free using **MongoDB Atlas** (for database hosting) and **Render.com** (for web application hosting).

---

## 🛠️ Step 1: Pushing the Codebase to GitHub

To store your code and connect it to automated deployment pipelines, push it to a GitHub repository:

1. **Sign in to GitHub:** Go to [github.com](https://github.com/) and click **New Repository**.
2. **Configure Repository:**
   - **Repository name:** `student-task-tracker`
   - **Public/Private:** Choose your preference.
   - **Do NOT** initialize with a README, gitignore, or license (these are already present in the workspace).
   - Click **Create Repository**.
3. **Initialize Git Locally:**
   Open PowerShell or Command Prompt in the project folder and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of full-stack task tracker"
   ```
4. **Push to GitHub:**
   Link your local repository to GitHub and push (replace `<username>` with your GitHub account name):
   ```bash
   git branch -M main
   git remote add origin https://github.com/<username>/student-task-tracker.git
   git push -u origin main
   ```

---

## 🛢️ Step 2: Setting Up a Free Cloud MongoDB Database

To persist user data on the internet, set up a free cluster on MongoDB Atlas:

1. **Sign Up:** Go to [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas) and register a free account.
2. **Create Database Cluster:**
   - Choose the **M0 Free Shared Tier**.
   - Select your preferred cloud provider (e.g. AWS) and region nearest to you.
   - Click **Create**.
3. **Configure Database Security:**
   - **Username & Password:** Create a database user (e.g. `db_user`) and record the password.
   - **IP Whitelist:** Under network access, select **Allow Access from Anywhere** (`0.0.0.0/0`) so that the Render hosting service can communicate with the database.
4. **Retrieve Connection String:**
   - Go to your database dashboard, click **Connect** -> **Drivers** (Node.js).
   - Copy the connection string. It will look like this:
     ```text
     mongodb+srv://db_user:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
     ```
   - Replace `<password>` with the password you generated for `db_user`.

---

## 🚀 Step 3: Hosting the Web App on Render.com

Render is a modern platform that can deploy your backend Node server and static frontend assets together for free.

1. **Sign Up:** Go to [render.com](https://render.com/) and register using your GitHub account.
2. **Create New Web Service:**
   - Click **New +** -> **Web Service**.
   - Under "Connect a repository", search for and select your `student-task-tracker` repository.
3. **Configure Build Settings:**
   - **Name:** `student-task-tracker`
   - **Region:** Choose a region close to your database.
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server/server.js`
   - **Instance Type:** `Free`
4. **Set up Environment Variables:**
   Click the **Environment** tab on Render and add the following key-value variables:
   
   | Key | Value | Description |
   |:---|:---|:---|
   | `NODE_ENV` | `production` | Enables production optimizations |
   | `PORT` | `10000` | Render's default web service port |
   | `MOCK_DB` | `false` | Disables the mock database fallback so real MongoDB is used |
   | `MONGO_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string from Step 2 |
   | `JWT_SECRET` | `your_long_random_jwt_secret_key` | Secure key to sign user login tokens |
   | `JWT_REFRESH_SECRET` | `your_longer_random_refresh_secret_key` | Secure key to sign refresh tokens |

5. **Deploy:**
   Click **Deploy Web Service**. Render will clone your GitHub repository, install packages, and build the server. 
   Once built, Render will display a public URL (e.g. `https://student-task-tracker-xxxx.onrender.com`).

---

## 🔗 Step 4: Accessing the Live Site

- Navigating to `https://student-task-tracker-xxxx.onrender.com/` will immediately load the responsive Welcome screen.
- You can now share this URL with students, and they can sign up, create categories, track assignments, and view completion metrics in real time!
- Any new commits pushed to the `main` branch of your GitHub repository will trigger a new deployment automatically.
