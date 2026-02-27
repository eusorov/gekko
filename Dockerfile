FROM node:24

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install GYP dependencies globally, will be used to code build other dependencies
# RUN npm install -g --production node-gyp && \
#     npm cache clean --force

# Install Gekko dependencies
COPY package.json .
RUN npm install && \
    npm install tulind && \
    npm cache clean --force

# Install Gekko Broker dependencies
RUN mkdir -p /usr/src/app/exchange
COPY ./exchange/package.json /usr/src/app/exchange/package.json
WORKDIR /usr/src/app/exchange
RUN npm install
WORKDIR /usr/src/app

# Install Vue UI dependencies and build
COPY ./web/vue/package.json /usr/src/app/web/vue/package.json
RUN cd /usr/src/app/web/vue && npm install --ignore-scripts

# Bundle app source and build Vue
COPY . /usr/src/app

# Vue build-time env vars (VUE_APP_* are inlined into the bundle)
ARG VUE_APP_APIKEY
ARG VUE_APP_AUTHDOMAIN
ARG VUE_APP_DATABASEURL
ARG VUE_APP_PROJECTID
ARG VUE_APP_STORAGEBUCKET
ARG VUE_APP_MESSAGINGSENDERID
ARG VUE_APP_APPID
ENV VUE_APP_APIKEY=$VUE_APP_APIKEY
ENV VUE_APP_AUTHDOMAIN=$VUE_APP_AUTHDOMAIN
ENV VUE_APP_DATABASEURL=$VUE_APP_DATABASEURL
ENV VUE_APP_PROJECTID=$VUE_APP_PROJECTID
ENV VUE_APP_STORAGEBUCKET=$VUE_APP_STORAGEBUCKET
ENV VUE_APP_MESSAGINGSENDERID=$VUE_APP_MESSAGINGSENDERID
ENV VUE_APP_APPID=$VUE_APP_APPID

RUN cd web/vue && npm run build

#RUN chmod +x /usr/src/app/docker-entrypoint.sh

CMD ["node", "gekko", "--config", "sample-config.js", "--ui"]
