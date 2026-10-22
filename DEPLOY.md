# Deploying cv_ssh

Goal: anyone can run `ssh henriquelop.es` and get the CV.

The server is an AWS Lightsail instance running Ubuntu 24.04 (x86_64), logged into as `ubuntu`.

Visitors connect on port 22, so the server's own admin SSH moves to port **2222**. The steps below do that in a safe order.

Commands marked **laptop** run in this repo on your machine; **server** run while logged into the instance.

## 1. Static IP

Lightsail console → instance → **Networking** → **Attach static IP**. Free while attached. Without it the IP can change on restart.

## 2. Point the domain at the server

In your registrar's DNS settings for `henriquelop.es`:

| Type | Name | Value |
|---|---|---|
| A | `@` | the static IP |

Check from the laptop (may take a few minutes to an hour):

```sh
dig +short henriquelop.es
```

Until this prints the static IP, use the IP directly in the commands below instead of `henriquelop.es`.

## 3. Move admin SSH to port 2222

This is the step where you could lock yourself out, so follow the order exactly.

**a.** Lightsail → instance → **Networking** → IPv4 Firewall → **Add rule**: Custom, TCP, port **2222**. Leave the existing SSH (22) rule in place.

**b.** Log in (**laptop**): `ssh ubuntu@<static-ip>`

**c.** On the **server**:

```sh
echo "Port 2222" | sudo tee /etc/ssh/sshd_config.d/10-port.conf
sudo systemctl daemon-reload && sudo systemctl restart ssh.socket
```

**d.** **Keep that session open.** In a *new* terminal on the **laptop**:

```sh
ssh -p 2222 ubuntu@<static-ip>
```

Only if that works, continue. If it fails, use the still-open session to undo: `sudo rm /etc/ssh/sshd_config.d/10-port.conf`, then run the `daemon-reload` / `restart ssh.socket` line again. As a last resort, Lightsail's browser **Connect using SSH** button also uses port 22 by default, so undo before closing the old session.

**e.** On the **server**, confirm nothing listens on 22 anymore:

```sh
ss -ltn | grep -E ':(22|2222)\b'   # should show only 2222
```

Note: after this, Lightsail's browser SSH button stops working (it only uses port 22). Use your terminal from now on.

## 4. Make admin login convenient (laptop)

Add to `~/.ssh/config`:

```
Host cv-server
    HostName henriquelop.es
    Port 2222
    User ubuntu
```

Now `ssh cv-server` logs you into the machine, while `ssh henriquelop.es` will show the CV.

If you ever connected to `henriquelop.es` on port 22 before this point, clear the old key: `ssh-keygen -R henriquelop.es`.

## 5. One-time install (laptop)

```sh
ssh cv-server 'sudo useradd --system --no-create-home --shell /usr/sbin/nologin cvssh; sudo mkdir -p /opt/cv_ssh/.ssh'
scp .ssh/id_ed25519 .ssh/id_ed25519.pub deploy/cv_ssh.service cv-server:/tmp/
ssh cv-server '
  sudo mv /tmp/id_ed25519 /tmp/id_ed25519.pub /opt/cv_ssh/.ssh/ &&
  sudo mv /tmp/cv_ssh.service /etc/systemd/system/ &&
  sudo chown root:root /etc/systemd/system/cv_ssh.service &&
  sudo chown -R cvssh:cvssh /opt/cv_ssh &&
  sudo chmod 700 /opt/cv_ssh/.ssh &&
  sudo chmod 600 /opt/cv_ssh/.ssh/id_ed25519 &&
  sudo systemctl daemon-reload &&
  sudo systemctl enable cv_ssh
'
```

The `.ssh/id_ed25519` copied here is the CV server's identity (not your personal key). Keeping it stable avoids "host key changed" warnings for visitors.

## 6. Deploy (laptop)

```sh
./deploy.sh
```

It builds, uploads, restarts the service, and prints `active` on success.

## 7. Try it

```sh
ssh henriquelop.es
```

## Updating the CV later

Edit `cv.yaml`, then run `./deploy.sh`. That's it.

## Troubleshooting

| Symptom | Check (on the server via `ssh cv-server`) |
|---|---|
| `Connection refused` | `systemctl status cv_ssh`, then `journalctl -u cv_ssh -n 50` |
| `address already in use` in logs | sshd still on 22: redo step 3e |
| Connection hangs / times out | Lightsail firewall missing the port |
| `REMOTE HOST IDENTIFICATION HAS CHANGED` | `ssh-keygen -R henriquelop.es` on the laptop |
