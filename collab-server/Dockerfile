# Collaboration server (Hocuspocus / Yjs over WebSockets).
#
# Runs TypeScript directly with tsx, as `npm start` does locally, so there is
# no separate build output to drift from the source.

FROM node:22-alpine

WORKDIR /app

# Install from the lockfile first so the dependency layer is cached between
# source-only changes.
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
# Hosts like Railway inject PORT; 1234 is the local default.
ENV PORT=1234
EXPOSE 1234

# Drop root: the server needs no privileges.
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["npm", "start"]
