FROM node:slim

RUN apt-get update && \
    apt-get install -y ffmpeg

ENV OPENAI_API_KEY=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
 
WORKDIR /app
COPY . .
RUN npm ci
 
ARG PORT
EXPOSE 8000
 
CMD ["npm", "run", "start"]