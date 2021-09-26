# Use node
FROM node:latest

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install packages
RUN npm install

# Bundle app source
COPY . .

# Open port
EXPOSE 4200

# Start
CMD [ "node", "server.js" ]
