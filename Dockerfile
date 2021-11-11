FROM node:16 as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build


#FROM node:alpine
FROM gcr.io/distroless/nodejs:16

WORKDIR /app
COPY --from=build /app /app
# libxss1 or libuuid1?
RUN apt-get install libuuid1 libxss1

ENV ISKO_SPREADSHEET_ID $ISKO_SPREADSHEET_ID
ENV GOOGLE_EMAIL $GOOGLE_EMAIL
ENV GOOGLE_PRIVATE_KEY $GOOGLE_PRIVATE_KEY

CMD [ "dist/index.js" ]