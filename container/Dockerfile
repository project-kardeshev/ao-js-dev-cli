FROM emscripten/emsdk:3.1.59
LABEL maintainer="tom wilson <tom@hyper.io>"

# Install dependencies
RUN apt-get update -qq -y && \
    apt-get install -y curl vim make gcc libreadline-dev libssl-dev zlib1g-dev zip unzip python3 python3-pip git file

# Create a symlink from python3 to python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Install yaml
RUN pip3 install pyyaml

# Install NodeJS
ENV NODE_VERSION=18.17.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version && npm --version

###############
#### Build ####
###############
COPY ./src/emcc-duktape /usr/local/bin/emcc-duktape
COPY ./src/emcc_duktape_lib /usr/local/emcc-duktape/emcc_duktape_lib

COPY ./src/pre.js /opt/pre.js
COPY ./src/definition.yml /opt/definition.yml
COPY ./src/loader.js /opt/loader.js

RUN mkdir -p /opt/src
COPY ./src/ao.js /opt/src/ao.js
COPY ./src/main.c /opt/main.c
COPY ./src/main.js /opt/main.js
RUN chmod +x /usr/local/bin/emcc-duktape

# Clone and configure Duktape
RUN mkdir -p /duktape && \
    cd /duktape && \
    git clone https://github.com/svaarala/duktape.git . && \
    chmod +x tools/configure.py && \
    make && \
    python3 tools/configure.py --output-directory /duktape/preconfigured && \
    if [ ! -f "/duktape/preconfigured/duktape.c" ]; then echo "File /duktape/preconfigured/duktape.c does not exist" && exit 1; fi

# Compile Duktape to a static library
WORKDIR /duktape/preconfigured
RUN emcc -c -O3 -s WASM=1 -s MEMORY64=1 -s ALLOW_MEMORY_GROWTH=1 -s ENVIRONMENT=web duktape.c -o duktape.o && \
    emar rcs libduktape.a duktape.o && \
    if [ ! -f "libduktape.a" ]; then echo "File libduktape.a does not exist" && exit 1; fi && \
    file libduktape.a && \
    ar -t libduktape.a

# Set up the working directory and copy necessary files
WORKDIR /src
COPY ./src /src

# Build the final output
RUN chmod +x /src/build.py && \
    /src/build.py

# Set environment variables for Emscripten
ENV CC='emcc -s WASM=1'
ENV NM='llvm-nm'

#############################
##### Install Commands ######
#############################

###############
#### Init #####
###############
# The init command currently does not require running
# within the ao container, and so requires no additional setup

###############
#### Repl #####
###############
# The repl command simply fires up a JS repl, which is installed
# as part of the Node.js runtime above, and so requires no additional setup

###################################
# BUILD WeaveDrive Extension Helper
###################################
COPY ./src/aolibc /opt/aolibc
RUN cd /opt/aolibc && make CC="emcc -s WASM=1 -s MEMORY64=1 -s SUPPORT_LONGJMP=1"

###########################################
### Publish, Bundler, Process, Contract ###
###########################################
# We first create a directory for the node impls to be placed
# and dependencies installed
# 
# By running npm link, we allow any commands exposed by
# the node module to be ran globally within the container
RUN mkdir -p /opt/node
COPY ./src/node /opt/node
RUN cd /opt/node && \
  npm install --omit="dev" && \
  npm link
