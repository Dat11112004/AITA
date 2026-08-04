FROM node:20-slim AS builder

WORKDIR /app

COPY . .
RUN npm install
RUN npx vite build

FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
