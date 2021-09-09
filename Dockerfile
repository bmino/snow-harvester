FROM node:15.14.0-alpine3.10

#ENV NODE_ENV production uncomment for prod.
# Set the working directory to /app
WORKDIR '/app'
# Initially copy only the dependencies json file
COPY package.json .
COPY config .
COPY assets .
# install dependencies 
RUN npm install

# Since we have everthing inside src we need to re-create it and copy its content.
COPY ./src .

CMD ["node", "/main/Main.js"]