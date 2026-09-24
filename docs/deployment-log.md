# Deployment log

The record of the first production deployment: what was done, in which
order, what was verified, and what is left. The *how* and *why* of each
step are in [production.md](production.md); this file tracks *where we
are*. Update it at each step.

Legend: ✅ done and verified · ⚠️ done, not fully verified · ⏳ to do

## The server

| | |
|---|---|
| Provider | DigitalOcean |
| Droplet name | `revision-platform-prod` |
| Public IPv4 | `165.227.81.12` |
| Image | Ubuntu 24.04 LTS (24.04.5 after the updates) |
| Disk | 47 GB |
| Region | *to fill in* |
| Size (RAM / CPU) | *to fill in* (2 GB RAM or more recommended) |
| Admin user | `deploy` (SSH key only, `sudo` with its password) |
| Domain | none yet |
| Released version | `v1.0.0` (branch `production`), running since 2026-09-24 |

## Release preparation (2026-09-24)

On the development computer, before touching the server:

- ✅ Production setup built and merged into `development`:
  Dockerfiles, `compose.prod.yaml`, `prod-*` Makefile commands, the
  `migrate` backend command. All tests passed (242 backend, 219 frontend).
- ✅ Rehearsed locally with `make prod-cert` + `make prod-up` (see
  [production.md, section 15](production.md#15-what-has-been-verified)).
- ✅ Production guide written ([production.md](production.md)).
- ✅ `development` pushed, merged into `production`, tagged `v1.0.0`,
  `production` and `v1.0.0` pushed to GitHub.

## On the server (2026-09-24)

### Step 6.2: Droplet created ✅

Created in the DigitalOcean control panel with Ubuntu 24.04 LTS and the
development computer's SSH key (`~/.ssh/id_ed25519.pub`); no password.
Monitoring enabled.

- ✅ `ssh root@165.227.81.12` works; the server's fingerprint was accepted
  (`SHA256:uEZa6/GEVOAD7UQ4oo6TbYBFt9diplVAlHg4QnQC1As`, ED25519). If SSH
  ever reports a *different* fingerprint for this IP without the Droplet
  having been rebuilt, do not connect.

Lesson learned: in commands like `ssh root@<ip>`, the `<...>` only marks
a placeholder. Typed literally, bash reads `<` and `>` as redirections
(`syntax error near unexpected token 'newline'`).

### Step 6.4: updates, `deploy` user, SSH lockdown ✅

1. ✅ `apt update && apt upgrade -y`: 154 updates (125 security). The
   server rebooted for the new kernel (`6.8.0-124` → `6.8.0-142`);
   afterwards: 0 pending updates.
2. ✅ User `deploy` created, added to the `sudo` group, given root's
   `~/.ssh` (the authorized key). `sudo whoami` prints `root`.
3. ✅ `/etc/ssh/sshd_config.d/00-hardening.conf` created with
   `PasswordAuthentication no` and `PermitRootLogin no`, SSH restarted.
   - ✅ `sudo sshd -T` shows `permitrootlogin no` and
     `passwordauthentication no`.
   - ✅ `ssh root@165.227.81.12` → `Permission denied (publickey)`.
   - ✅ `ssh deploy@165.227.81.12` still works.
   - ⚠️ Not run: `ssh -o PubkeyAuthentication=no deploy@165.227.81.12`
     (should be refused without asking a password). The `sshd -T` output
     already shows passwords are disabled.

Lessons learned:

- `sshd -t` on the development computer → `command not found`: `sshd` is
  the SSH *server*, it only exists on the Droplet.
- `sshd -t` on the Droplet without `sudo` → `Permission denied` on
  `50-cloud-init.conf`. That file exists on DigitalOcean's image, which
  confirmed the choice of a `00-...` file (the first value found wins).
  The guide initially said to edit `/etc/ssh/sshd_config`; it was
  corrected.

### Step 6.5: Cloud Firewall ⏳ postponed

Decision: get the application working first, add the firewall **before
sharing the link**. Meanwhile, only port 22 (SSH, keys only) and, once
the application runs, nginx's port are reachable: MySQL and the backend
publish no port.

### Step 6.6: Docker, Git and Make ✅

Installed from Docker's own apt repository (see the guide):

- Docker Engine 29.8.1 (the same version as the development computer),
  Docker Compose plugin v5.5.1, Git 2.43.0, Make 4.3.
- `deploy` added to the `docker` group, then logged out and in again.
- ✅ `docker run --rm hello-world` prints "Hello from Docker!".
- ✅ `groups` shows `deploy sudo users docker`.

Lessons learned:

- Paste **one block at a time** and wait for the prompt. A paste that
  contains `exit` followed by other commands closes the session, and
  the following lines never run where intended.
- The install had in fact been run once already in a session that was
  not recorded; running it again only printed `already the newest
  version`. apt commands are safe to repeat.

### Step 6.7: code cloned ✅

The GitHub repository is **public**, so the Droplet clones it over HTTPS
without any credential: no deploy key needed (the guide's deploy key is
only for a private repository). This is also why no secret must ever be
committed.

```sh
git clone https://github.com/BryanBD16/revision-platform.git ~/revision-platform
cd ~/revision-platform && git checkout production
```

- ✅ `git log --oneline -1` → `64d1df9 ... Merge branch 'development' into
  production`; `git describe --tags` → `v1.0.0`.

### Step 6.8: `.env.production` ✅

Created from `.env.production.example` with `sed`: `APP_ADDRESS=0.0.0.0`,
`APP_PORT=443`, and both MySQL passwords generated by
`openssl rand -hex 24` (written directly into the file, never typed).

- ✅ Mode `-rw-------`, owner `deploy`.
- ✅ Both passwords are 48 hexadecimal characters (checked with `grep -c`
  without displaying them).
- The passwords were displayed once to be saved in a password manager,
  and never shared anywhere else.

### Step 6.9 (temporary): self-signed certificate ✅

No domain yet, so `make prod-cert` created a self-signed certificate in
`certs/`. Browsers show a warning (the certificate is signed by the
Droplet itself and issued for `localhost`); the connection is encrypted
but the server's identity is not proven. To be replaced by Let's Encrypt.

### Step 6.10: first `make prod-up` ✅

- Backend image built in ~190 s, frontend in ~165 s (first build: every
  base image downloaded; later releases reuse the cached layers).
- Volumes `mysql-data` and `data-protection-keys` created.
- `db`, `backend`, `frontend` healthy; `migrate` exited.
- ✅ `https://165.227.81.12` opens (after accepting the certificate
  warning) and an account was created: the whole chain works (HTTPS,
  nginx, backend, MySQL, session cookies).
- ⚠️ The `migrate` exit code and log, `free -h` and the `curl` checks were
  not recorded; the working sign-up shows the migrations were applied.

### Step 6.11: first admin and seed activities ✅

```sh
make prod-command CMD='users grant-role <your email> admin'
make prod-seed
```

- ✅ The admin role was given, and the seed activities appear on the site.

Lessons learned:

- An empty activity list on a new server is normal: the production
  database is separate from the development one, and seeding is a
  deliberate step, never automatic.
- `grant-role` takes **two** arguments, the email and the role; with one,
  it only prints its usage and changes nothing.
- Replace a placeholder entirely: `your-email@example.com` →
  the real address, without the `your-` prefix.
- `make prod-seed` must run **once**: running it again duplicates every
  activity.

## What is left

In order. Each item points to the guide section.

### To get the website working ✅ (done on 2026-09-24)

1. ✅ **Install Docker, Git and Make** on the Droplet
   ([6.6](production.md#66-install-docker-git-and-make)), and add `deploy`
   to the `docker` group.
2. ✅ **Clone the repository** over HTTPS (public repository: no deploy
   key needed), on the `production` branch ([6.7](production.md#67-get-the-code)).
3. ✅ **Create `.env.production`** with random passwords, `APP_ADDRESS=0.0.0.0`,
   `APP_PORT=443`; save the passwords in a password manager
   ([6.8](production.md#68-production-settings)).
4. ✅ **Temporary self-signed certificate** (`make prod-cert`), since
   there is no domain yet ([6.9](production.md#69-the-https-certificate-lets-encrypt)).
5. ✅ **`make prod-up`**, then check the containers, the migrations and
   `https://165.227.81.12/api/health` ([6.10](production.md#610-start-the-application)).
   The browser warns about the certificate: expected until step 9.
6. ✅ **First admin and seed activities** ([6.11](production.md#611-first-admin-and-content)).

### Before sharing the link

7. ⏳ **Buy a domain** and create its **A record** →
   `165.227.81.12` ([6.3](production.md#63-point-the-domain-to-the-droplet)).
8. ⏳ **Cloud Firewall**: inbound 22, 80, 443 only
   ([6.5](production.md#65-firewall)). Then check with `nc -zv`: 22
   succeeds, 443 answers, 8080 times out.
9. ⏳ **Let's Encrypt certificate** with the deploy hook, replacing the
   self-signed one; test the renewal with `certbot renew --dry-run`
   ([6.9](production.md#69-the-https-certificate-lets-encrypt)).
10. ⏳ **Backups**: `backup.sh`, daily cron job, a copy off the Droplet,
    and one restore test ([9](production.md#9-backups-and-restore)).
11. ⏳ **Reboot test**: everything comes back by itself
    ([6.12](production.md#612-last-checks)).
12. ⏳ Go through the **security checklist**
    ([13](production.md#13-security-checklist)).
13. ⏳ Update [production.md, section 15](production.md#15-what-has-been-verified)
    with what the real deployment verified, and fill in the region and
    size above.

### Later improvements

See [production.md, section 14](production.md#14-known-limitations-and-next-improvements):
HTTP → HTTPS redirect, off-server backups, images built by CI, automated
releases, uptime monitoring, HSTS.
