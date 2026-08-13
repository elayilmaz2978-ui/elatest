FROM ruby:3.2-slim

WORKDIR /app

# Oyun yalnızca Ruby standart kütüphanesini kullanır; gem kurulumu gerekmez.
COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["/usr/local/bin/ruby", "server.rb"]
