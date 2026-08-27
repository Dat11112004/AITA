FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

ENV NODE_ENV=production

COPY . .
RUN npm install

EXPOSE 3001

CMD ["npx", "tsx", "src/server.ts"]
