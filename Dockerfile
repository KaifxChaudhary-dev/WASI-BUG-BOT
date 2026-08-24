FROM node:20-bookworm-slim

RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  ffmpeg \
  imagemagick \
  webp \
  git \
  ca-certificates && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json .npmrc* ./

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

ENV PORT=3000

CMD ["node", "index.js"]
