FROM node:14.17.1
RUN mkdir -p /usr/src
WORKDIR /usr
RUN npm install @angular/cli@12.1.0
COPY . /usr/src/
WORKDIR /usr/src/client
RUN npm install
RUN npm run build

WORKDIR /usr/src/
RUN npm install
RUN npm install pm2 -g
RUN pm2 --version


CMD ["pm2-runtime", "ecosystem.config.js"]
