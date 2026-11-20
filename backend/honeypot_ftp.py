import socket
import threading
from datetime import datetime

HOST = "0.0.0.0"
PORT = 2121
LOGFILE = "/opt/blackjack/ftp_honeypot.log"

def log(msg):
    with open(LOGFILE, "a") as f:
        f.write(f"[{datetime.now()}] {msg}\n")

def handle_client(conn, addr):
    ip = addr[0]
    username = ""

    log(f"Connection from {ip}")
    conn.send(b"220 FTP Server Ready\r\n")

    try:
        while True:
            data = conn.recv(1024)
            if not data:
                break

            cmd = data.decode(errors="ignore").strip()
            log(f"{ip}: {cmd}")

            if cmd.upper().startswith("USER"):
                username = cmd[5:]
                conn.send(b"331 Password required\r\n")

            elif cmd.upper().startswith("PASS"):
                password = cmd[5:]
                log(f"LOGIN ATTEMPT -> USER={username} PASS={password}")
                conn.send(b"530 Login incorrect\r\n")

            elif cmd.upper().startswith("QUIT"):
                conn.send(b"221 Goodbye\r\n")
                break

            else:
                conn.send(b"500 Command not understood\r\n")

    except Exception as e:
        log(f"ERROR from {ip}: {e}")

    conn.close()

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind((HOST, PORT))
server.listen(5)

print(f"FTP honeypot listening on port {PORT}")

while True:
    conn, addr = server.accept()
    threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()