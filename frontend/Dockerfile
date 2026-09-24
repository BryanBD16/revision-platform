# Production image of the frontend: the Angular build served by nginx, which
# also forwards /api to the backend. Build context: the frontend directory.

FROM node:24-alpine AS build
WORKDIR /src

# Install first, so the packages stay cached while only the code changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

FROM nginx:1.28-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist/frontend/browser /usr/share/nginx/html
EXPOSE 443
