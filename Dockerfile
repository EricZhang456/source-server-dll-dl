# FIXME: only works when the container is in host mode

FROM node:22-alpine

ENV PORT=3000
ENV DLL_DOWNLOAD_LOCATION="./dll/"

WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . /app

CMD [ "npm", "run", "prod" ]

VOLUME [ "/app/data" ]

EXPOSE 3000
