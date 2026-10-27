"""
wifi.py — WiFi Access Point + HTTP control server for Rasor Crest.

ESP32 runs as a WiFi AP. Connect phone to the AP, open browser at
http://192.168.4.1 to control ship status via buttons.
"""

import network
import socket
import _thread
from system import Status

_SSID     = "RasorCrest"
_PASSWORD = "razorcrest"   # min 8 chars for WPA2

_HTML = """\
HTTP/1.0 200 OK
Content-Type: text/html

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rasor Crest</title>
  <style>
    body {{ font-family: sans-serif; background: #111; color: #eee;
            display: flex; flex-direction: column; align-items: center;
            padding: 30px; gap: 16px; }}
    h1   {{ color: #4af; margin-bottom: 8px; }}
    a    {{ display: block; width: 220px; padding: 16px; text-align: center;
            border-radius: 10px; font-size: 1.2em; text-decoration: none;
            color: #fff; }}
    .loading {{ background: #555; }}
    .idle    {{ background: #28a; }}
    .error   {{ background: #c33; }}
    .damaged {{ background: #a60; }}
    .off     {{ background: #333; border: 1px solid #666; }}
    .active  {{ outline: 3px solid #fff; }}
  </style>
</head>
<body>
  <h1>Rasor Crest</h1>
  <p>Status: <b>{status}</b></p>
  <a class="loading {loading_a}" href="/set/loading">LOADING</a>
  <a class="idle    {idle_a}"    href="/set/idle">IDLE</a>
  <a class="error   {error_a}"   href="/set/error">ERROR</a>
  <a class="damaged {damaged_a}" href="/set/damaged">DAMAGED</a>
  <a class="off     {off_a}"     href="/set/off">OFF</a>
</body>
</html>
"""

_ship = None


def _render(current_status):
    def active(s):
        return "active" if current_status == s else ""
    return _HTML.format(
        status    = current_status,
        loading_a = active(Status.LOADING),
        idle_a    = active(Status.IDLE),
        error_a   = active(Status.ERROR),
        damaged_a = active(Status.DAMAGED),
        off_a     = active(Status.OFF),
    )


def _handle(conn):
    try:
        req = conn.recv(512).decode()
        first_line = req.split("\r\n")[0]   # e.g. "GET /set/idle HTTP/1.1"
        path = first_line.split(" ")[1] if " " in first_line else "/"

        if path.startswith("/set/"):
            new_status = path[5:]           # strip "/set/"
            if _ship and new_status in (Status.OFF, Status.LOADING,
                                        Status.IDLE, Status.ERROR, Status.DAMAGED):
                _ship.set_status(new_status)

        if path == "/favicon.ico":
            conn.sendall(b"HTTP/1.0 404 Not Found\r\n\r\n")
        else:
            status = _ship.status if _ship else Status.OFF
            conn.sendall(_render(status).encode())
    finally:
        conn.close()


def _server_loop():
    addr = socket.getaddrinfo("0.0.0.0", 80)[0][-1]
    srv = socket.socket()
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(addr)
    srv.listen(1)
    print("[wifi] HTTP server at http://192.168.4.1")
    while True:
        conn, _ = srv.accept()
        _handle(conn)


def start(ship):
    """Start WiFi AP and HTTP server. Pass the ShipSystem instance."""
    global _ship
    _ship = ship

    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    ap.config(essid=_SSID, password=_PASSWORD, authmode=network.AUTH_WPA_WPA2_PSK)

    while not ap.active():
        pass

    print("[wifi] AP started:", _SSID, "/ ip:", ap.ifconfig()[0])
    _thread.start_new_thread(_server_loop, ())
