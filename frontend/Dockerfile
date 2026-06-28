
# Build stage - Upgraded from node:18 to node:20 to support modern packages

# Build stage

FROM node:20-alpine AS builder

WORKDIR /app

# Installed dependencies without ignoring engine checks
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

ARG REACT_APP_BACKEND_URL=http://localhost:8001
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

RUN yarn build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

RUN echo 'server { \
  listen 3000; \
  root /usr/share/nginx/html; \
  index index.html; \
  location /api { \
    proxy_pass http://backend:8001; \
    proxy_set_header Host $host; \
  } \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000