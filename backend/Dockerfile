# PropertyPilot backend — multi-stage Docker build.
# Build context: repository root (so the npm workspace lockfile is available).
#
#   docker build -f backend/Dockerfile -t propertypilot-backend .
#
# Runtime applies pending Prisma migrations against DATABASE_URL, then starts
# the compiled Express server on PORT (defaults to 4000).

# ---- Stage 1: builder ----------------------------------------------------
FROM node:20-alpine AS builder

# Native build tooling for bcrypt + OpenSSL for the Prisma query engine.
RUN apk add --no-cache python3 make g++ openssl libc6-compat

WORKDIR /repo

# Install dependencies first to keep this layer cached across source changes.
# We install across both workspaces because filtering with --workspace= silently
# drops some packages (notably the prisma CLI) when copied to a downstream stage.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci

# Now copy the backend source and build.
COPY backend/ ./backend/
RUN npm run prisma:generate -w backend
RUN npm run build -w backend

# ---- Stage 2: runtime ----------------------------------------------------
FROM node:20-alpine AS runtime

# Prisma needs OpenSSL at runtime; dumb-init handles SIGTERM correctly.
RUN apk add --no-cache openssl libc6-compat dumb-init

WORKDIR /app
ENV NODE_ENV=production

# Workspace package manifests so npm/npx can resolve scripts inside the image.
COPY --from=builder --chown=node:node /repo/package.json ./package.json
COPY --from=builder --chown=node:node /repo/package-lock.json ./package-lock.json
COPY --from=builder --chown=node:node /repo/backend/package.json ./backend/package.json

# Built JS, Prisma schema + migrations, and the resolved node_modules from
# the builder (so bcrypt's native binary stays Alpine-compatible).
# Note: npm workspaces hoists most deps to /repo/node_modules but leaves a
# few (notably the `prisma` CLI) in /repo/backend/node_modules. Both have
# to come over so Node's module resolution and the prisma bin work.
COPY --from=builder --chown=node:node /repo/backend/dist ./backend/dist
COPY --from=builder --chown=node:node /repo/backend/prisma ./backend/prisma
COPY --from=builder --chown=node:node /repo/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=node:node /repo/node_modules ./node_modules

USER node

EXPOSE 4000

WORKDIR /app/backend

# Apply pending migrations, then start the server. `prisma migrate deploy`
# is idempotent and safe to run on every container start.
CMD ["dumb-init", "sh", "-c", "./node_modules/.bin/prisma migrate deploy && node ./dist/app.js"]
