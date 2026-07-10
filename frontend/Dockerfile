# ==============================================================================
# Hospital Information Assistance — Frontend Dockerfile
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file containerizes the React + TypeScript frontend application.
#   It uses a multi-stage Docker build to keep the final image as small and
#   secure as possible.
#
# STAGES:
#   1. Build Stage: Compiles React code using Node.js, yielding optimized HTML,
#      CSS, and JS inside the `/dist` directory.
#   2. Production Stage: Serves the static files using a lightweight Nginx web server.
#
# SPA ROUTING GUARD:
#   React uses client-side routing. If a user reloads `http://localhost/dashboard`
#   directly, Nginx will look for a file named `dashboard` and return a 404.
#   To prevent this, we copy a custom `nginx.conf` that redirects all requests
#   to `index.html`, allowing React Router to handle page rendering.
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: BUILD ENVIRONMENT
# ------------------------------------------------------------------------------
FROM node:20-alpine AS build

# Set the working directory
WORKDIR /app

# Copy dependency catalogs
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Compile the production bundle (outputs static assets inside /app/dist)
RUN npm run build

# ------------------------------------------------------------------------------
# STAGE 2: PRODUCTION ENVIRONMENT (NGINX SERV)
# ------------------------------------------------------------------------------
FROM nginx:stable-alpine

# Copy compiled static assets from Stage 1 into Nginx default serving folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the custom Nginx server configuration (SPA routing support)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for incoming HTTP web requests
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
