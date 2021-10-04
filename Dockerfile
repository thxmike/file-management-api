FROM node:14.16.0-alpine
LABEL team=gravity-diagnostics
#ENV PORT=80,443
ENV PORT=3000
ENV AZURE_KEY_STORE_URI=""
ENV AZURE_CLIENT_ID=""
ENV AZURE_CLIENT_SECRET=""
ENV AZURE_TENANT_ID=""
# Install Build Dependencies
RUN apk --no-cache --virtual build-dependencies add
ENV PYTHONUNBUFFERED=1

RUN echo "**** install Python ****" && \
    apk add --no-cache python3  && \
    if [ ! -e /usr/bin/python ]; then ln -sf python3 /usr/bin/python ; fi 
 # && \
 #   \
 #   echo "**** install pip ****" && \
 #   python3 -m ensurepip && \
 #   rm -r /usr/lib/python*/ensurepip && \
 #   pip3 install --no-cache --upgrade pip setuptools wheel && \
 #   if [ ! -e /usr/bin/pip ]; then ln -s pip3 /usr/bin/pip ; fi
#EXPOSE 443
RUN apk add --no-cache pkgconfig
RUN apk add --no-cache libsecret-dev
RUN apk add --no-cache g++ make

RUN mkdir -p /application && chown -R node:node /application
RUN mkdir -p /application/node_modules && chown -R node:node /application/node_modules
RUN mkdir -p /application/bin && chown -R node:node /application/bin
RUN which python
WORKDIR /application
COPY . /application
RUN npm install --global node-gyp
# Have to prebuild node modules and make part of the image since the azure hosts are missing python for building.
# RUN npm config set python "/usr/bin/python"
# RUN env PATH="/usr/bin:$PATH" PYTHON=/usr/bin/python 
RUN npm install
RUN node_modules/.bin/tsc
COPY --chown=node:node . .
RUN apk del python3
RUN apk del build-dependencies
RUN apk del pkgconfig
RUN apk del make
RUN apk del g++
EXPOSE 3000
USER node
CMD [ "ash", "deployment.sh" ]