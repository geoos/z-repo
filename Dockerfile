# multiplataforma, incluye el push
# docker buildx build --push --platform linux/amd64,linux/arm64 -t docker.homejota.net/geoos/zrepo:latest -t docker.homejota.net/geoos/zrepo:0.50 .
#
# docker build -t docker.homejota.net/geoos/zrepo:latest -t docker.homejota.net/geoos/zrepo:0.42 .
# docker push docker.homejota.net/geoos/zrepo:latest
#
FROM node:14-alpine
EXPOSE 8096
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production

COPY . .
CMD ["node", "index"]