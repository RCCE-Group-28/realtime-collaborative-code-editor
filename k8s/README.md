# GKE Deployment

## Setup

1. **Create GKE Cluster:**
```bash
gcloud container clusters create rcce-cluster \
  --zone us-central1-a \
  --num-nodes 2 \
  --machine-type e2-small \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 3
```

2. **Configure GitHub Secrets** (see `.github/SECRETS_AND_VARS.md`)

3. **Deploy:** Push to `main` branch - GitHub Actions handles deployment

## Access
Get the LoadBalancer IP: `kubectl get service nextjs-service`

## Useful Commands
```bash
kubectl get pods
kubectl logs -l app=nextjs-app
kubectl describe pod <pod-name>
```
