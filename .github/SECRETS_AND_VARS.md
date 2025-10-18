# GitHub Secrets and Variables Configuration

This document lists all the GitHub Secrets and Variables that need to be configured for the CI/CD workflow to work properly.

## Repository Variables

Go to: **Settings → Secrets and variables → Actions → Variables**

### Google Cloud Platform Variables

| Variable Name    | Description                           | Example Value       |
| ---------------- | ------------------------------------- | ------------------- |
| `GKE_CLUSTER`    | Google Kubernetes Engine cluster name | `rcce-cluster`      |
| `GKE_ZONE`       | GKE cluster zone                      | `asia-southeast1-a` |
| `GCP_PROJECT_ID` | Google Cloud Project ID               | `my-project-123456` |

### Application Variables

| Variable Name                     | Description                     | Example Value                      |
| --------------------------------- | ------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_APP_URL`             | Public URL of your application  | `https://your-domain.com`          |
| `NEXT_PUBLIC_SOCKETIO_SERVER_URL` | Public Socket.IO server URL     | `https://your-domain.com/socketio` |
| `NEXT_PUBLIC_YJS_SERVER_URL`      | Public Yjs WebSocket server URL | `wss://your-domain.com/yjs`        |

### Firebase Variables

| Variable Name                              | Description                  |
| ------------------------------------------ | ---------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase API Key             |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Firebase Auth Domain         |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Firebase Project ID          |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Firebase Storage Bucket      |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Firebase App ID              |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`      | Firebase Measurement ID      |

### GitHub Variables

| Variable Name                  | Description                     |
| ------------------------------ | ------------------------------- |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | GitHub OAuth Client ID (public) |

## Repository Secrets

Go to: **Settings → Secrets and variables → Actions → Secrets**

### Required Secrets

| Secret Name  | Description                           | How to Get                                                        |
| ------------ | ------------------------------------- | ----------------------------------------------------------------- |
| `GCP_SA_KEY` | Google Cloud Service Account JSON key | Create a service account in GCP with GKE/GCR permissions          |
| `MONGO_URI`  | MongoDB connection string             | Your MongoDB Atlas or hosted MongoDB URI                          |
| `JWT_SECRET` | Secret key for JWT token signing      | Generate a random secure string (e.g., `openssl rand -base64 32`) |

### Optional Secrets (for additional features)

| Secret Name         | Description                                | Feature             |
| ------------------- | ------------------------------------------ | ------------------- |
| `SMTP_HOST`         | SMTP server hostname                       | Email functionality |
| `SMTP_PORT`         | SMTP server port (e.g., 587)               | Email functionality |
| `SMTP_USER`         | SMTP authentication username               | Email functionality |
| `SMTP_PASS`         | SMTP authentication password               | Email functionality |
| `SENDER_EMAIL`      | Default sender email address               | Email functionality |
| `GEMINI_API_KEY`    | Google Gemini API key                      | AI chat assistant   |
| `GEMINI_MODEL_NAME` | Gemini model name (e.g., gemini-2.0-flash) | AI chat assistant   |
| `GH_CLIENT_ID`      | GitHub OAuth Client ID                     | GitHub login        |
| `GH_CLIENT_SECRET`  | GitHub OAuth Client Secret                 | GitHub login        |

## Setup Instructions

### 1. Add Variables

```bash
# Go to GitHub repository
# Settings → Secrets and variables → Actions → Variables tab
# Click "New repository variable" and add each variable
```

### 2. Add Secrets

```bash
# Go to GitHub repository
# Settings → Secrets and variables → Actions → Secrets tab
# Click "New repository secret" and add each secret
```

### 3. Google Cloud Service Account Setup

```bash
# Create a service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant necessary permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create and download the key
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com

# Copy the contents of key.json and add it as GCP_SA_KEY secret
cat key.json
```

### 4. Generate JWT Secret

```bash
# Generate a random secure string
openssl rand -base64 32
# Copy the output and add it as JWT_SECRET
```

## Verification

After configuring all secrets and variables, you can verify them:

1. Go to **Settings → Secrets and variables → Actions**
2. Check that all required variables are listed under "Variables" tab
3. Check that all required secrets are listed under "Secrets" tab
4. Try running the workflow manually via **Actions → Deploy to GKE → Run workflow**

## Notes

- **Required secrets** must be configured for the application to work
- **Optional secrets** can be left unconfigured - the application will work with reduced functionality
- Never commit secrets to the repository
- Use `optional: true` in Kubernetes deployments for optional secrets
- Secrets are encrypted and not visible after creation
- Variables are visible to anyone with repository access
