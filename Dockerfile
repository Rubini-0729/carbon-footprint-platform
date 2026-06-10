FROM nginx:alpine
# Change Nginx default port from 80 to 8080 for Google Cloud Run compatibility
RUN sed -i 's/listen       80;/listen       8080;/g' /etc/nginx/conf.d/default.conf
# Copy static files to the public Nginx directory
COPY . /usr/share/nginx/html
# Expose port 8080
EXPOSE 8080
