FROM node:24

ENV HOST localhost
ENV PORT 3000

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
RUN cd /usr/src/app/exchange 
RUN npm install
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app

EXPOSE 3000
RUN chmod +x /usr/src/app/docker-entrypoint.sh

CMD ["node", "gekko", "--config", "sample-config.js", "--ui"]
