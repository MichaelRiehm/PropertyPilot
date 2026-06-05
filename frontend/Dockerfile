# PropertyPilot frontend — multi-stage Docker build.
# Build context: repository root.
#
#   docker build -f frontend/Dockerfile -t propertypilot-frontend .
#
# The runtime image is a tiny nginx that serves the Vite production bundle
# and reverse-proxies /api/* to the backend service (see nginx.conf).

# ---- Stage 1: builder ----------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /repo

# Install deps first to keep the layer cached across source-only changes.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --workspace=@propertypilot/frontend --include-workspace-root

# Now copy the frontend source and build the production bundle.
COPY frontend/ ./frontend/
RUN npm run build -w frontend

# ---- Stage 2: runtime ----------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Static bundle.
COPY --from=builder /repo/frontend/dist /usr/share/nginx/html

# nginx config: SPA fallback + /api/* proxy to the backend service.
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# nginx:alpine already ships a healthy default CMD.
