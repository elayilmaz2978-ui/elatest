# ELAGENCYLER — bağımlılıksız statik + WebSocket oda sunucusu (yalnız stdlib).
# Kullanım: ruby server.rb [port]   (öntanımlı 8000)
# Aynı port hem sayfayı sunar hem ws:// oda senkronunu taşır.
require "socket"
require "digest/sha1"
require "base64"
require "json"

PORT = (ARGV[0] || 8000).to_i
ROOT = File.expand_path(File.dirname(__FILE__))
GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

$rooms = {}      # code => { socks: [], state: {} }
$mu = Mutex.new

# Oda durumunu sunucuda tutar (yetkili sunucu): geç katılan/kopan dönen
# her istemci bu durumdan taze bir anlık görüntü alır.
def fresh_state
  { "modeId" => "classic", "caseId" => nil, "cardIndex" => 0, "unlocked" => 1,
    "marked" => [], "markedBy" => {}, "teamCount" => 1, "teamNames" => [],
    "players" => [], "activePlayer" => 0, "teamConfirm" => [], "traitor" => nil }
end

def apply_event(st, m)
  case m["t"]
  when "mark"
    st["marked"] ||= []
    st["marked"] << m["i"] unless st["marked"].include?(m["i"])
    (st["markedBy"] ||= {})[m["i"].to_s] = m["by"]
  when "unmark"
    (st["marked"] ||= []).delete(m["i"])
    (st["markedBy"] ||= {}).delete(m["i"].to_s)
  when "confirm"
    (st["teamConfirm"] ||= [])[m["i"]] = m["on"]
  when "active"
    st["activePlayer"] = m["i"]
  when "case"
    st["caseId"] = m["id"]; st["cardIndex"] = 0; st["unlocked"] = 1
    st["marked"] = []; st["markedBy"] = {}; st["teamConfirm"] = []
  when "card"
    st["cardIndex"] = m["i"]
    st["unlocked"] = [st["unlocked"].to_i, m["unlocked"].to_i].max
  when "setup"
    %w[modeId teamCount teamNames players].each { |k| st[k] = m[k] if m.key?(k) }
  when "traitor"
    st["traitor"] = m["i"]
  end
  st
end

MIME = { ".html" => "text/html; charset=utf-8", ".css" => "text/css", ".js" => "text/javascript",
         ".png" => "image/png", ".svg" => "image/svg+xml", ".ico" => "image/x-icon" }

def ws_accept(key)
  Base64.strict_encode64(Digest::SHA1.digest(key + GUID))
end

def read_frame(io)
  b1 = io.readbyte
  b2 = io.readbyte
  opcode = b1 & 0x0F
  masked = (b2 & 0x80) != 0
  len = b2 & 0x7F
  if len == 126
    len = io.read(2).unpack("n")[0]
  elsif len == 127
    len = io.read(8).unpack("Q>")[0]
  end
  mask = masked ? io.read(4).bytes : nil
  payload = len.positive? ? io.read(len) : ""
  if mask
    bytes = payload.bytes
    bytes.each_with_index { |b, i| bytes[i] = b ^ mask[i % 4] }
    payload = bytes.pack("C*")
  end
  [opcode, payload]
rescue EOFError, Errno::ECONNRESET
  nil
end

def send_frame(io, text)
  data = text.dup.force_encoding("BINARY")
  len = data.bytesize
  header = [0x81].pack("C")
  if len < 126
    header += [len].pack("C")
  elsif len < 65536
    header += [126, len].pack("Cn")
  else
    header += [127, len].pack("CQ>")
  end
  io.write(header + data)
rescue EOFError, Errno::ECONNRESET
end

def serve_static(client, path)
  rel = path.split("?").first
  rel = "/index.html" if rel == "/" || rel.empty?
  file = File.join(ROOT, rel.gsub(/\.\./, ""))
  if File.file?(file)
    ext = File.extname(file)
    body = File.binread(file)
    client.write("HTTP/1.1 200 OK\r\nContent-Type: #{MIME[ext] || 'application/octet-stream'}\r\nContent-Length: #{body.bytesize}\r\nCache-Control: no-store\r\n\r\n")
    client.write(body)
  else
    client.write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n")
  end
end

def handle_ws(client, room_code)
  $mu.synchronize do
    $rooms[room_code] ||= { socks: [], state: fresh_state }
    room = $rooms[room_code]
    is_host = room[:socks].empty?
    room[:socks] << client
    client.instance_variable_set(:@room, room_code)
    send_frame(client, JSON.generate({ t: "welcome", isHost: is_host, room: room_code }))
    send_frame(client, JSON.generate({ t: "snapshot", state: room[:state] }))
    room[:socks].each { |s| send_frame(s, JSON.generate({ t: "peer", n: room[:socks].length })) if s != client }
  end

  loop do
    frame = read_frame(client)
    break if frame.nil?
    opcode, payload = frame
    break if opcode == 8
    if opcode == 9
      send_frame(client, "") # pong benzeri
      next
    end
    next if opcode != 1
    $mu.synchronize do
      room = $rooms[client.instance_variable_get(:@room)]
      next unless room
      begin
        msg = JSON.parse(payload)
        room[:state] = apply_event(room[:state], msg)
      rescue JSON::ParserError
      end
      room[:socks].each { |s| send_frame(s, payload) if s != client }
    end
  end
ensure
  $mu.synchronize do
    code = client.instance_variable_get(:@room)
    if code && $rooms[code]
      $rooms[code][:socks].delete(client)
      $rooms[code][:socks].each { |s| send_frame(s, JSON.generate({ t: "peer", n: $rooms[code][:socks].length })) }
      $rooms.delete(code) if $rooms[code][:socks].empty?
    end
  end
  client.close rescue nil
end

server = TCPServer.new("0.0.0.0", PORT)
puts "ELAGENCYLER sunucu: http://localhost:#{PORT} (oda senkronu aktif)"

loop do
  client = server.accept
  Thread.new(client) do |c|
    begin
      request_line = c.gets
      headers = {}
      while (line = c.gets) && line != "\r\n"
        k, v = line.split(":", 2)
        headers[k.strip.downcase] = v.to_s.strip if k
      end
      if headers["upgrade"] =~ /websocket/i
        key = headers["sec-websocket-key"]
        c.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: #{ws_accept(key)}\r\n\r\n")
        room = request_line.to_s.split("?")[1].to_s[/room=([A-Z0-9]+)/i, 1] || "GENEL"
        handle_ws(c, room.upcase)
      else
        path = request_line.to_s.split(" ")[1]
        serve_static(c, path)
        c.close rescue nil
      end
    rescue => e
      c.close rescue nil
    end
  end
end
