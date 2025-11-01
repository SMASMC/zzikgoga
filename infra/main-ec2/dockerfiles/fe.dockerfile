FROM nginx:alpine

# Timezone, curl for health checks
RUN apk add --no-cache tzdata curl && \
    cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone && \
    apk del tzdata

# Built-in default nginx config for SPA (no external file required)
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  server_name _;' \
  '  large_client_header_buffers 4 32k;' \
  '  location = /health { default_type text/plain; return 200 "ok"; }' \
  '  location / {' \
  '    root /usr/share/nginx/html;' \
  '    try_files $uri /index.html;' \
  '  }' \
  '  location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {' \
  '    root /usr/share/nginx/html;' \
  '    expires 1y;' \
  '    add_header Cache-Control "public, immutable";' \
  '    try_files $uri =404;' \
  '  }' \
  '}' > /etc/nginx/conf.d/default.conf

# Static site contents copied by CI
COPY dist /usr/share/nginx/html
COPY build-info.txt /usr/share/nginx/html/build-info.txt

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
