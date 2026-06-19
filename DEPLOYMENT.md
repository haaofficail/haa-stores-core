# Deployment Guide — HAA Stores Core

## نظرة عامة

المشروع يستخدم GitHub Actions لـ CI/CD مع نشر عبر Docker + GHCR (GitHub Container Registry).

- **Staging**: نشر تلقائي عند كل push لـ `main`
- **Production**: نشر يدوي فقط عبر `workflow_dispatch`

---

## الـ Secrets المطلوبة

### إعداد Secrets في GitHub

اذهب إلى: `Settings → Secrets and variables → Actions`

#### Staging Secrets

| Secret                | القيمة                                            |
| --------------------- | ------------------------------------------------- |
| `STAGING_SSH_KEY`     | مفتاح SSH الخاص للاتصال بسيرفر staging            |
| `STAGING_HOST`        | عنوان IP أو domain سيرفر staging                  |
| `STAGING_USER`        | اسم مستخدم SSH (مثل: `deploy`)                    |
| `STAGING_DEPLOY_PATH` | مسار المشروع على السيرفر (مثل: `/opt/haa-stores`) |

#### Production Secrets

| Secret                   | القيمة                              |
| ------------------------ | ----------------------------------- |
| `PRODUCTION_SSH_KEY`     | مفتاح SSH الخاص لسيرفر production   |
| `PRODUCTION_HOST`        | عنوان IP أو domain سيرفر production |
| `PRODUCTION_USER`        | اسم مستخدم SSH                      |
| `PRODUCTION_DEPLOY_PATH` | مسار المشروع على السيرفر            |

#### Variables (ليست Secrets — `Settings → Variables`)

| Variable                | القيمة                                                                |
| ----------------------- | --------------------------------------------------------------------- |
| `STAGING_URL`           | رابط staging (مثل: `https://staging.haa-stores.com`)                  |
| `STAGING_HEALTH_URL`    | رابط health check staging (مثل: `https://api-staging.haa-stores.com`) |
| `PRODUCTION_URL`        | رابط production                                                       |
| `PRODUCTION_HEALTH_URL` | رابط health check production                                          |

---

## إعداد السيرفر (أول مرة)

### 1. تثبيت Docker وDocker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose plugin
sudo apt-get install docker-compose-plugin
```

### 2. إنشاء مستخدم deploy

```bash
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# إنشاء مجلد SSH
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy chmod 700 /home/deploy/.ssh
```

### 3. إضافة SSH Public Key

```bash
# أضف الـ public key المقابل لـ STAGING_SSH_KEY إلى:
sudo -u deploy nano /home/deploy/.ssh/authorized_keys
sudo -u deploy chmod 600 /home/deploy/.ssh/authorized_keys
```

### 4. إنشاء مجلد المشروع

```bash
sudo mkdir -p /opt/haa-stores
sudo chown deploy:deploy /opt/haa-stores

# نسخ ملف docker-compose.yml
sudo -u deploy cp docker-compose.yml /opt/haa-stores/
```

### 5. إعداد ملف .env على السيرفر

```bash
sudo -u deploy nano /opt/haa-stores/.env
# أضف جميع متغيرات البيئة المطلوبة
```

### 6. تسجيل الدخول لـ GHCR

```bash
# على السيرفر — قم بتسجيل الدخول مرة واحدة
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

---

## نشر يدوي لـ Staging

```bash
# من GitHub Actions UI
# 1. اذهب إلى Actions → Deploy
# 2. Run workflow → اختر staging
# 3. انقر Run workflow
```

أو من الـ terminal:

```bash
gh workflow run deploy.yml -f environment=staging
```

---

## نشر يدوي لـ Production

> تنبيه: يتطلب موافقة reviewer مسجل في GitHub Environment "production".

```bash
# من GitHub Actions UI
# 1. اذهب إلى Actions → Deploy
# 2. Run workflow → اختر production
# 3. انقر Run workflow
# 4. انتظر موافقة الـ reviewer
```

أو من الـ terminal:

```bash
gh workflow run deploy.yml -f environment=production
```

---

## Docker Compose على السيرفر

يجب أن يكون `docker-compose.yml` على السيرفر يستخدم متغيرات البيئة التالية:

```yaml
# /opt/haa-stores/docker-compose.yml
version: "3.8"

services:
  api:
    image: ${REGISTRY}/${IMAGE_PREFIX}-api:${IMAGE_TAG:-latest}
    restart: unless-stopped
    env_file: .env
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  merchant-dashboard:
    image: ${REGISTRY}/${IMAGE_PREFIX}-merchant-dashboard:${IMAGE_TAG:-latest}
    restart: unless-stopped
    ports:
      - "3001:3000"

  admin-dashboard:
    image: ${REGISTRY}/${IMAGE_PREFIX}-admin-dashboard:${IMAGE_TAG:-latest}
    restart: unless-stopped
    ports:
      - "3002:3000"

  storefront:
    image: ${REGISTRY}/${IMAGE_PREFIX}-storefront:${IMAGE_TAG:-latest}
    restart: unless-stopped
    ports:
      - "3003:3000"
```

---

## Rollback يدوي

إذا فشل الـ deploy وأردت الرجوع للإصدار السابق:

```bash
ssh deploy@STAGING_HOST

cd /opt/haa-stores

# إيقاف الـ containers الحالية
docker compose down

# تشغيل الإصدار السابق (بدون pull)
docker compose up -d --no-pull

# أو للرجوع لـ image محددة
export IMAGE_TAG=sha-PREVIOUS_SHA
docker compose up -d
```

للحصول على SHAs السابقة:

```bash
# قائمة الـ images المحلية
docker images ghcr.io/*/haa-stores-api --format "{{.Tag}}\t{{.CreatedAt}}"
```

---

## GitHub Environments

قم بإعداد Environments في GitHub:

### Staging Environment

- `Settings → Environments → New environment`
- الاسم: `staging`
- لا حاجة لـ protection rules

### Production Environment

- `Settings → Environments → New environment`
- الاسم: `production`
- فعّل: **Required reviewers** — أضف مسؤولي النشر
- فعّل: **Wait timer** (5 دقائق للمراجعة)
- فعّل: **Deployment branches** → `main` فقط

---

## Security Scan

يعمل الـ security scan تلقائياً:

- **أسبوعياً**: كل أحد الساعة 2 صباحاً UTC
- **عند تغيير الـ dependencies**: push لـ `main` يمس `package.json` أو `pnpm-lock.yaml`
- **يدوياً**: `Actions → Security Scan → Run workflow`

### تقارير الـ Security Scan

كل تشغيل ينتج artifacts:

- `pnpm-audit-report-N.json` — تقرير كامل للـ vulnerabilities
- `license-report-N.json` — تقرير التراخيص
- `outdated-packages-N.json` — الحزم القديمة

---

## صورة عامة للـ Pipeline

```
Push to main
     │
     ▼
CI (ci.yml)
├── preflight
├── typecheck ──┐
├── lint ───────┼──► build check (matrix: 4 apps)
└── test        │
                │
                ▼
Deploy (deploy.yml)
├── build-and-push (matrix: 4 apps → GHCR)
│
└── deploy-staging (تلقائي)
    ├── SSH → docker compose pull + up
    ├── Health check (10 retries × 10s)
    └── Rollback إذا فشل الـ health check
        │
        └── deploy-production (يدوي فقط + reviewer approval)
            ├── SSH → docker compose pull + up
            ├── Health check (15 retries × 15s)
            └── Rollback إذا فشل الـ health check
```

---

## استكشاف الأخطاء

### فشل بناء الـ Docker image

```bash
# تشغيل البناء محلياً
docker build -f apps/api/Dockerfile \
  --build-arg GIT_SHA=$(git rev-parse --short HEAD) \
  -t haa-api:local .
```

### فشل SSH

```bash
# اختبار الاتصال
ssh -i /path/to/key deploy@SERVER_HOST "echo OK"

# تأكد من وجود الـ public key في authorized_keys
cat ~/.ssh/authorized_keys | grep "deploy key"
```

### فشل Health Check

```bash
# تحقق من حالة الـ containers
ssh deploy@SERVER_HOST "docker compose ps"

# شاهد الـ logs
ssh deploy@SERVER_HOST "docker compose logs --tail=50 api"
```

### الـ GHCR يرفض الـ pull

```bash
# تأكد من تسجيل الدخول على السيرفر
ssh deploy@SERVER_HOST "docker login ghcr.io -u USERNAME -p TOKEN"
```
