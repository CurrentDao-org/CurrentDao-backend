# CurrentDao Backend - Kubernetes Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the CurrentDao backend application on Kubernetes with production-grade configurations including auto-scaling, monitoring, service mesh, and disaster recovery.

## Prerequisites

- Kubernetes cluster (v1.28+)
- kubectl configured
- Helm 3.13+
- Istio installed (optional, for service mesh)
- Prometheus and Grafana installed (for monitoring)
- AWS CLI configured (for backup and disaster recovery)
- Docker registry access

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ingress       │    │   Service Mesh  │    │   Monitoring    │
│   (Nginx)       │    │   (Istio)       │    │ (Prometheus)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Auto-scaling  │    │   Logging       │
│   (NestJS)       │    │    (HPA/VPA)    │    │ (Fluent Bit)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │   Load Balancer │    │   Backup/DR     │
│  (PostgreSQL)   │    │   (NLB)         │    │   (S3/Scripts)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### 1. Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Create Secrets

```bash
kubectl create secret generic currentdao-secrets \
  --from-literal=database-url="postgresql://user:pass@host:5432/dbname" \
  --from-literal=jwt-secret="your-jwt-secret" \
  -n currentdao-prod

kubectl create secret generic aws-credentials \
  --from-literal=access-key-id="your-access-key" \
  --from-literal=secret-access-key="your-secret-key" \
  -n currentdao-prod
```

### 3. Deploy Application

```bash
# Deploy all resources
kubectl apply -f k8s/ -n currentdao-prod

# Or use Helm
helm install currentdao-backend ./helm \
  --namespace currentdao-prod \
  --values helm/values.yaml \
  --set environment=production
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n currentdao-prod

# Check services
kubectl get services -n currentdao-prod

# Check ingress
kubectl get ingress -n currentdao-prod

# Check HPA
kubectl get hpa -n currentdao-prod
```

## Configuration Files

### Core Kubernetes Resources

- **`k8s/namespace.yaml`** - Production namespace with Istio injection
- **`k8s/deployment.yaml`** - Application deployment with resource limits and probes
- **`k8s/service.yaml`** - Load balancer and internal services
- **`k8s/autoscaler.yaml`** - HPA and VPA configurations
- **`k8s/configmap.yaml`** - Application configuration
- **`k8s/ingress.yaml`** - External access with SSL and security headers

### Advanced Features

- **`k8s/istio.yaml`** - Service mesh configuration (Gateway, VirtualService, etc.)
- **`k8s/monitoring.yaml`** - Prometheus monitoring, Grafana dashboards, and logging
- **`k8s/disaster-recovery.yaml`** - Backup, restore, and failover scripts

### CI/CD

- **`.github/workflows/deploy.yml`** - Complete CI/CD pipeline with automated testing and deployment

### Helm Chart

- **`helm/values.yaml`** - Comprehensive Helm configuration for all environments

## Features

### Auto-scaling
- Horizontal Pod Autoscaler (HPA) with CPU, memory, and custom metrics
- Vertical Pod Autoscaler (VPA) for resource optimization
- Handles 10x traffic spikes with scaling from 3 to 50 pods

### Load Balancing
- Network Load Balancer (NLB) for optimal performance
- Internal services for microservice communication
- Least connection load balancing algorithm

### Service Mesh (Istio)
- Traffic management and routing rules
- Circuit breakers and retries
- Security policies and mTLS
- Observability and tracing

### Monitoring
- Prometheus metrics collection
- Grafana dashboards for visualization
- Custom alerts for all critical metrics
- Distributed tracing with Jaeger

### Logging
- Structured JSON logging
- Fluent Bit for log collection
- Elasticsearch storage
- Centralized log management

### Security
- Network policies for traffic control
- Pod security contexts
- Security headers in ingress
- Secrets management

### Disaster Recovery
- Automated daily backups to S3
- Point-in-time recovery capability
- Multi-region failover
- Health check scripts

## Performance Requirements

- **Response Time**: < 100ms (95th percentile)
- **Uptime**: 99.9%
- **Auto-scaling**: 3-50 pods
- **Load Balancing**: Even traffic distribution
- **Recovery Time**: < 10 minutes

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (production/staging) | Yes |
| `PORT` | Application port | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `STELLAR_NETWORK` | Stellar network (public/test) | Yes |
| `REDIS_HOST` | Redis server host | Yes |

## Monitoring Metrics

Key metrics monitored:
- Request rate and latency
- Error rate (5xx responses)
- Memory and CPU usage
- Pod restarts
- Database connections

## Backup Strategy

- **Frequency**: Daily at 2 AM
- **Retention**: 7 days
- **Storage**: AWS S3
- **Compression**: gzip
- **Verification**: Automated restore tests

## Disaster Recovery

### Failover Process
1. Health check failure detection
2. Automatic scale down of production
3. Switch to disaster recovery region
4. DNS update to DR region
5. Verification of service availability

### Recovery Process
1. Scale down DR deployment
2. Restore production deployment
3. Wait for pods to be ready
4. Update DNS back to production
5. Verify service health

## Troubleshooting

### Common Issues

1. **Pods not starting**
   ```bash
   kubectl describe pod <pod-name> -n currentdao-prod
   kubectl logs <pod-name> -n currentdao-prod
   ```

2. **High memory usage**
   ```bash
   kubectl top pods -n currentdao-prod
   kubectl get hpa currentdao-backend-hpa -n currentdao-prod
   ```

3. **Ingress not working**
   ```bash
   kubectl get ingress -n currentdao-prod
   kubectl describe ingress currentdao-backend-ingress -n currentdao-prod
   ```

4. **Backup failures**
   ```bash
   kubectl get cronjob currentdao-backend-backup -n currentdao-prod
   kubectl logs job/<backup-job-name> -n currentdao-prod
   ```

## Maintenance

### Rolling Updates
```bash
kubectl set image deployment/currentdao-backend \
  currentdao-backend=currentdao/backend:new-version -n currentdao-prod

kubectl rollout status deployment/currentdao-backend -n currentdao-prod
```

### Scaling
```bash
# Manual scaling
kubectl scale deployment currentdao-backend --replicas=10 -n currentdao-prod

# Check auto-scaling events
kubectl describe hpa currentdao-backend-hpa -n currentdao-prod
```

## Security Best Practices

1. **Network Policies**: Restrict traffic between namespaces
2. **Pod Security**: Run as non-root user with minimal privileges
3. **Secrets Management**: Use Kubernetes secrets, never in config files
4. **TLS Encryption**: Enable TLS for all external communication
5. **Regular Updates**: Keep images and dependencies updated

## Support

For issues and questions:
- Check the troubleshooting section
- Review Kubernetes events and logs
- Contact the DevOps team at devops@currentdao.org

## License

This deployment configuration is licensed under the MIT License.
