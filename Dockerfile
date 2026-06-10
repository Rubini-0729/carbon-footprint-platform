FROM nginx:alpine
# Copy website static files to nginx html container directory
COPY . /usr/share/nginx/html
# Expose default HTTP port
EXPOSE 80
