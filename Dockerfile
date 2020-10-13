# docker build -t docker.homejota.net/geoos/zrepo:latest -t docker.homejota.net/geoos/zrepo:0.31 .
# docker push docker.homejota.net/geoos/zrepo:latest
#
FROM node:14-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production

COPY . .
CMD ["node", "index"]