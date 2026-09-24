# Deployment log

The story of the first production deployment of the Revision Platform,
on 2026-09-24: what was done, in which order, why, what was checked, what
went wrong and what was learned.

This file is the **diary**; [production.md](production.md) is the
**manual** (the reference that explains each step in detail). Section
numbers like "6.4" refer to the manual.

Legend: ✅ done and verified · ⚠️ done, not fully verified · ⏳ to do ·
⏭️ skipped on purpose

## How to study this deployment

Suggested reading order:

1. [production.md, sections 1 to 3](production.md#1-key-concepts): the
   vocabulary (container, reverse proxy, TLS, DNS...), branches vs
   environments, and how the containers fit together.
2. [In short](#in-short) below: the whole deployment on one page.
3. [The stages](#the-stages-in-the-order-they-happened), in order, with
   the manual open next to them for the details.
4. [Decisions](#decisions-and-their-reasons) and
   [lessons learned](#lessons-learned): the part worth remembering for the
   next project.

## In short

**The goal:** put the application, running on a laptop until now, on a
server on the internet, reachable at `https://revision.bryanbd16.xyz`.

**The result:**

```
Browser ──HTTPS──► revision.bryanbd16.xyz ──DNS──► 165.227.81.12
                                                   DigitalOcean Droplet (Ubuntu 24.04)
                                                   ├─ Cloud Firewall: only 22, 80, 443 get in
                                                   └─ Docker Compose (compose.prod.yaml)
                                                      ├─ frontend: nginx, HTTPS, Angular, /api → backend
                                                      ├─ backend:  ASP.NET Core API
                                                      ├─ migrate:  applies migrations, then exits
                                                      └─ db:       MySQL 8.4 (volume mysql-data)
```

**The path, in the order it was done:**

| # | Stage | Where | Result |
|---|---|---|---|
| 1 | [Prepare the release](#1-prepare-the-release) | Laptop | Docker setup, guide, `v1.0.0` on GitHub |
| 2 | [Create the Droplet](#2-create-the-droplet) | DigitalOcean panel | A Linux server with our SSH key |
| 3 | [Secure the server](#3-secure-the-server) | Droplet | Updates, `deploy` user, SSH keys only |
| 4 | [Install Docker](#4-install-docker-git-and-make) | Droplet | Docker 29.8.1, Compose, Git, Make |
| 5 | [Get the code and the settings](#5-get-the-code-and-the-settings) | Droplet | `production` branch, `.env.production` |
| 6 | [Start the application](#6-start-the-application) | Droplet | Site running on `https://165.227.81.12` |
| 7 | [Admin and content](#7-first-admin-and-content) | Droplet | Admin account, seed activities |
| 8 | [Domain and DNS](#8-domain-and-dns) | Namecheap | `revision.bryanbd16.xyz` → `165.227.81.12` (took ~30 min to publish) |
| 9 | [Firewall](#9-firewall) | DigitalOcean panel | Only 22, 80, 443 reachable |
| 10 | [Prepare the certificate](#10-prepare-the-certificate) | Droplet | certbot + renewal hook ready |
| 11 | [Get the certificate](#11-get-the-real-certificate) | Droplet | Let's Encrypt certificate, auto-renewed: **the site is live** |
| 12 | [Reboot test](#12-reboot-test) | Droplet | Everything comes back by itself, data kept |
| 13 | [Security checklist](#13-security-checklist) | Everywhere | Done; backups and password manager skipped on purpose |

## The server

| | |
|---|---|
| Provider | DigitalOcean |
| Droplet name | `revision-platform-prod` |
| Public IPv4 | `165.227.81.12` |
| Image | Ubuntu 24.04 LTS (24.04.5 after the updates) |
| Size | Basic (shared CPU): 1 vCPU, 2 GB RAM, 50 GB disk |
| Region | not recorded (shown on the Droplet's page) |
| Admin user | `deploy` (SSH key only; `sudo` asks for its password) |
| Application folder | `/home/deploy/revision-platform` |
| Domain | `bryanbd16.xyz` (Namecheap, registered 2026-09-24, **expires 2027-09-24**) |
| Application URL | **https://revision.bryanbd16.xyz** (live, Let's Encrypt certificate until 2026-12-23, renewed automatically) |
| Released version | `v1.0.0` (branch `production`), running since 2026-09-24 |

### Secrets and accounts

Every secret involved in this deployment, from most to least important.
None of them is in Git.

| Secret | Where it lives | What it protects | If it is lost |
|---|---|---|---|
| DigitalOcean account | Chosen by you | Everything: Droplet, firewall, billing | Whoever has it controls the server: enable **2FA** |
| Namecheap account | Chosen by you | The domain and its DNS | The domain could be redirected elsewhere: enable **2FA** |
| SSH private key `~/.ssh/id_ed25519` | A file on the laptop | Logging in to the Droplet | Recover access through DigitalOcean's web console |
| `sudo` password of `deploy` | Chosen at `adduser`, remembered | Every administration command | Can still log in with the key, but not administer; recover through DigitalOcean's console |
| Admin account of the site | Chosen at sign-up | The application's admin features | `make prod-command CMD='users reset-password <email>'` |
| MySQL passwords (2) | Generated, only in `.env.production` | The backend's connection to MySQL | Only needed to restore a backup (none are made) |

No password manager is used (see [decisions](#decisions-and-their-reasons)).

## The stages, in the order they happened

### 1. Prepare the release

*Laptop. Manual: sections 2 to 5.*

Before touching a server, the application had to be able to run without
the development tools (`dotnet run`, `ng serve`):

- ✅ Docker images for the backend and the frontend, a production compose
  file, `prod-*` Makefile commands, and a `migrate` backend command (the
  production image has no `dotnet ef`). All tests passed (242 backend,
  219 frontend).
- ✅ Rehearsed on the laptop with `make prod-cert` + `make prod-up`. The
  rehearsal caught a real problem: over plain HTTP, every API call
  failed with a `500`, because the backend's cookies are HTTPS-only in
  production. Decision: nginx serves HTTPS itself
  ([manual 3](production.md#why-https-is-mandatory-even-to-try-it)).
- ✅ Released: `development` merged into `production`, tagged `v1.0.0`,
  both pushed to GitHub.

**Why both branches have all the files:** branches are *versions* of the
code, environments are *places* where it runs. What differs between the
laptop and the server is the settings file and the command, not the
branch ([manual 2](production.md#2-branches-environments-and-releases)).

### 2. Create the Droplet

*DigitalOcean control panel. Manual: 6.2.*

- Ubuntu 24.04 **LTS** (security updates for years), Basic shared CPU,
  the laptop's public key `~/.ssh/id_ed25519.pub` for authentication (no
  password), Monitoring enabled.
- ✅ First login: `ssh root@165.227.81.12`. SSH showed the server's
  fingerprint, `SHA256:uEZa6/GEVOAD7UQ4oo6TbYBFt9diplVAlHg4QnQC1As`
  (ED25519), and saved it in `~/.ssh/known_hosts`. If SSH ever reports a
  *different* fingerprint for this IP without the Droplet having been
  rebuilt, do not connect: something is impersonating the server.

⚠️ What went wrong: `ssh root@<165.227.81.12>` → `syntax error near
unexpected token 'newline'`. The `<...>` in instructions only marks a
placeholder; bash reads `<` and `>` as file redirections.

### 3. Secure the server

*Droplet, as root, then as `deploy`. Manual: 6.4.*

1. ✅ **Updates.** `apt update && apt upgrade -y`: 154 updates, 125 of
   them security fixes (the Droplet image was a few weeks old). A new
   kernel required a reboot (`6.8.0-124` → `6.8.0-142`).
2. ✅ **A normal user.** `root` can do anything without confirmation, so
   daily work uses `deploy`, which borrows root's rights with `sudo`:
   ```sh
   adduser deploy
   usermod -aG sudo deploy                                  # -a: append to the groups
   rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # give it the SSH key
   ```
   Checked in a second terminal, keeping the root session open as a
   safety net: `sudo whoami` → `root`.
3. ✅ **SSH keys only, no root login.** In
   `/etc/ssh/sshd_config.d/00-hardening.conf`:
   ```
   PasswordAuthentication no
   PermitRootLogin no
   ```
   - `sudo sshd -T` → `permitrootlogin no`, `passwordauthentication no`.
   - `ssh root@165.227.81.12` → `Permission denied (publickey)`.
   - `ssh deploy@165.227.81.12` still works.
   - ⚠️ Not run: `ssh -o PubkeyAuthentication=no deploy@...` (would prove
     passwords are refused; `sshd -T` already shows it).

**Why a file in `sshd_config.d/` named `00-...`:** those files are read
before `sshd_config`, and for SSH *the first value found wins*.
DigitalOcean's image has a `50-cloud-init.conf` there, which could
override an edit of the main file. The manual first said to edit
`sshd_config`; this deployment corrected it.

⚠️ What went wrong: `sshd -t` on the laptop → `command not found`
(`sshd` is the SSH *server*, only on the Droplet); on the Droplet without
`sudo` → `Permission denied` (the configuration is readable by root only).

### 4. Install Docker, Git and Make

*Droplet, as `deploy`. Manual: 6.6.*

- ✅ Docker Engine **29.8.1** (same as the laptop), Compose plugin
  **v5.5.1**, Git 2.43.0, Make 4.3, from Docker's own apt repository (more
  recent than Ubuntu's).
- ✅ `deploy` added to the `docker` group, then logged out and in again (a
  new group only applies to new sessions): `groups` → `deploy sudo users
  docker`; `docker run --rm hello-world` → "Hello from Docker!".

Being in the `docker` group is equivalent to being root: only for trusted
users.

⚠️ What went wrong: several blocks were pasted at once, including `exit`.
`exit` closed the session and the lines after it never ran on the
server. Paste one block at a time and wait for the prompt. (Docker turned
out to be installed already from an earlier, unrecorded attempt;
re-running apt only printed `already the newest version`: apt commands
are safe to repeat.)

### 5. Get the code and the settings

*Droplet. Manual: 6.7 and 6.8.*

- ✅ The GitHub repository is **public**, so the Droplet clones it over
  HTTPS without any credential (no deploy key needed):
  ```sh
  git clone https://github.com/BryanBD16/revision-platform.git ~/revision-platform
  cd ~/revision-platform && git checkout production
  ```
  `git describe --tags` → `v1.0.0`. The server always runs `production`,
  never `development`.
- ✅ `.env.production` created from the example with `sed`:
  `APP_ADDRESS=0.0.0.0` (accept connections from the internet),
  `APP_PORT=443` (the standard HTTPS port), and two passwords generated
  by `openssl rand -hex 24` and written straight into the file.
  - Mode `-rw-------`: only `deploy` can read it.
  - Checked with `grep -c` that both passwords are 48 hex characters,
    **without displaying them**. Passwords never go in a chat, a
    screenshot or Git.

A public repository is the reason why no secret must ever be committed:
anyone can read everything in it.

### 6. Start the application

*Droplet. Manual: 6.9 (temporary part) and 6.10.*

- ✅ No domain yet, so a **self-signed certificate** (`make prod-cert`).
  The connection is encrypted, but browsers warn because nobody they
  trust vouches for the server's identity. Temporary.
- ✅ `make prod-up`: first build ~190 s (backend) and ~165 s (frontend);
  later releases reuse Docker's cached layers. Volumes `mysql-data` and
  `data-protection-keys` created; `db`, `backend`, `frontend` healthy;
  `migrate` exited.
- ✅ `https://165.227.81.12` opens after accepting the warning, and an
  account was created: HTTPS, nginx, backend, MySQL and the session
  cookies all work.
- ⚠️ Not recorded: the `migrate` exit code and log, `free -h`, the `curl`
  checks. The working sign-up shows the migrations ran.

### 7. First admin and content

*Droplet. Manual: 6.11.*

```sh
make prod-command CMD='users grant-role YOUR_EMAIL admin'   # the account's email; asks for "yes"
make prod-seed                                                         # once only
```

- ✅ Admin role given; the seed activities appear on the site.

⚠️ What went wrong: the first attempt was
`CMD='users grant-role your-<email>'`: the role was missing
(the command only printed its usage, nothing changed) and the `your-`
placeholder prefix was left in the email.

Why the list was empty at first: the production database is new and
separate from the laptop's. Seeding is deliberate, never automatic, so a
release can never duplicate activities. Running `make prod-seed` twice
*would* duplicate them.

### 8. Domain and DNS

*Namecheap. Manual: 1 (why a domain), 6.3.*

- ✅ `bryanbd16.xyz` bought at Namecheap: `.xyz` was the cheapest first
  year (renewal costs more, see the expiry date above). The application
  uses a **subdomain**, `revision.bryanbd16.xyz`, so the bare domain
  stays free for a portfolio page or other projects.
- ✅ The DNS record: Namecheap → Domain List → Manage → Advanced DNS →
  Add New Record → `A Record`, Host `revision`, Value `165.227.81.12`,
  TTL Automatic → green ✓ to save. Nameservers: Namecheap BasicDNS.
- ✅ Namecheap's nameserver answers correctly:
  `dig +short A revision.bryanbd16.xyz @dns1.registrar-servers.com` →
  `165.227.81.12`.
- ✅ The `.xyz` registry first did not know the new domain
  (`dig +norec NS bryanbd16.xyz @generationxyz.nic.xyz.` → `NXDOMAIN`
  for about 30 minutes after purchase), then published it with
  Namecheap's nameservers (`NOERROR`, `dns1.registrar-servers.com`).
  Right after, `dig +short A revision.bryanbd16.xyz` → `165.227.81.12` at
  both `1.1.1.1` and `8.8.8.8`, and
  `https://revision.bryanbd16.xyz/api/health` answered (still with the
  self-signed certificate, so only with `curl -k`).

⚠️ What went wrong: the message said "bought `revisionplatform.xyz`,
use a subdomain `bryanbd16.xyz`"; `whois` showed the domain actually
bought was `bryanbd16.xyz`. Check facts with tools (`whois`, `dig`)
rather than memory.

**How a DNS lookup works** (why a correct record can still be
invisible): a resolver (your ISP's, `1.1.1.1`, `8.8.8.8`) asks the root
servers who handles `.xyz`, then asks the `.xyz` registry who handles
`bryanbd16.xyz`, and only then asks Namecheap's nameservers for
`revision.bryanbd16.xyz`. If the registry does not know the domain yet,
the chain stops before reaching Namecheap. Resolvers also remember a
"does not exist" answer (up to 1 hour for `.xyz`), which is why testing
in the browser too early can delay things.

Namecheap sends an email to verify the contact address; an unverified
domain is suspended after about 15 days.

### 9. Firewall

*DigitalOcean control panel. Manual: 6.5.*

First postponed to get the site working, then done while waiting for DNS.

- ✅ *Networking → Firewalls → Create Firewall*, named
  `revision-platform-prod`. Inbound: SSH 22, HTTP 80, HTTPS 443, all
  sources. Outbound: the defaults (everything: updates, Docker images,
  GitHub, Let's Encrypt). Applied to the Droplet.
- ✅ Checked from the laptop with `nc -zv -w 5 165.227.81.12 <port>`:

  | Port | Result | Meaning |
  |---|---|---|
  | 22 | open | SSH allowed |
  | 443 | open, `/api/health` → 200 | The site |
  | 80 | refused | Allowed (for Let's Encrypt), nothing listening |
  | 3306, 8080 | timeout | Blocked by the firewall |

**Refused vs timeout:** *refused* means the packet reached the Droplet,
which answered "nobody here". *Timeout* means the firewall dropped it
silently before it arrived, and a scanner learns nothing.

**Why DigitalOcean's firewall and not Ubuntu's `ufw`:** Docker writes its
own network rules, which bypass `ufw`. The Cloud Firewall filters traffic
before it reaches the Droplet, so Docker cannot bypass it. MySQL was
already safe (Docker does not publish it); the firewall is a second layer
in case a future mistake publishes a port.

### 10. Prepare the certificate

*Droplet. Manual: 6.9.*

- ✅ certbot **5.8.0** installed with `sudo snap install --classic
  certbot` (certbot's recommended way: it updates itself).
- ✅ Renewal hook `/etc/letsencrypt/renewal-hooks/deploy/revision-platform.sh`
  (`-rwxr-xr-x root`, `DOMAIN=revision.bryanbd16.xyz`). After each
  renewal, it copies the new certificate into
  `/home/deploy/revision-platform/certs/` and reloads nginx. A copy is
  needed because the files in `/etc/letsencrypt/live/` are symbolic links
  that would point to nothing inside the container.

`certbot certonly` then waited for DNS: Let's Encrypt must find the
domain through public DNS, and repeated failed attempts get temporarily
blocked. Preparing everything else meanwhile made the final step a single
command.

### 11. Get the real certificate

*Droplet. Manual: 6.9.* ✅ Done on 2026-09-24, right after DNS resolved.

```sh
sudo certbot certonly --standalone -d revision.bryanbd16.xyz --agree-tos -m YOUR_EMAIL
```

*Standalone* mode: certbot briefly starts its own small web server on
port 80, Let's Encrypt connects to `http://revision.bryanbd16.xyz/...` to
check that we control the domain, and the certificate is saved in
`/etc/letsencrypt/live/revision.bryanbd16.xyz/`. This is why port 80 is
open in the firewall even though the application does not use it.

- ✅ `Successfully received certificate`, expires **2026-12-23** (90 days).
- ✅ Certbot ran the deploy hook **by itself** on this first issuance:
  the certificate was copied into `certs/` and nginx reloaded. No manual
  step was needed (the plan said to run the hook by hand; the manual was
  corrected).
- ✅ From the laptop, **without** `-k`:
  `curl https://revision.bryanbd16.xyz/api/health` → 200. The served
  certificate: `CN = revision.bryanbd16.xyz`, issuer
  `Let's Encrypt (YE2)`, valid 2026-09-24 → 2026-12-23.
- ✅ `sudo certbot renew --dry-run` → `all simulated renewals succeeded`.
- ✅ `systemctl list-timers` shows `snap.certbot.renew.timer` (it checks
  twice a day and renews when fewer than 30 days remain, so around
  2026-11-23).

Things that looked alarming but were not:

- `Hook 'deploy-hook' ran with error output: ... signal process started`:
  nginx confirms the reload on its *error stream*, and certbot reports
  anything written there. The reload worked.
- The EFF newsletter question is optional (answered yes; any of their
  emails has an unsubscribe link).
- A browser that accepted the self-signed warning for the IP may remember
  that exception: open the site in a new tab.

### 12. Reboot test

*Droplet. Manual: 6.12.* ✅ Done on 2026-09-24.

**Why:** a reboot will happen sooner or later: a kernel update (Ubuntu
installs security updates automatically but only reboots when asked, and
creates `/var/run/reboot-required`), DigitalOcean maintenance or a
hardware failure, a resize, a crash. After a reboot, Docker restarts the
containers itself (`restart: unless-stopped`) **without** `make prod-up`'s
ordering: the backend may start before MySQL, nginx before the backend.
The test checks that everything still recovers on its own.

```sh
sudo reboot                      # the SSH session closes
ssh deploy@165.227.81.12         # a minute later
uptime                           # "up 1 min": the reboot happened
cd ~/revision-platform
docker compose --env-file .env.production -f compose.prod.yaml ps -a
```

- ✅ Reported: everything back up (`db`, `backend`, `frontend` Up; `migrate`
  stays Exited, it only runs during `make prod-up`), site working.
- ✅ Checked from the laptop: `https://revision.bryanbd16.xyz/api/health` →
  200, and the API still lists the 18 seed activities: the data survived
  in the `mysql-data` volume.
- ⚠️ The `uptime` and `ps -a` outputs were not recorded.

### 13. Security checklist

*Manual: 13.* ✅ Done on 2026-09-24.

| Item | Result |
|---|---|
| SSH with keys only; root and password logins disabled | ✅ `sshd -T`, root refused ([stage 3](#3-secure-the-server)) |
| Cloud Firewall: only 22, 80, 443 | ✅ `nc` from outside ([stage 9](#9-firewall)) |
| `.env.production`: random passwords, mode `600`, not in Git | ✅ ([stage 5](#5-get-the-code-and-the-settings)) |
| Passwords saved in a password manager | ⏭️ Skipped on purpose ([decisions](#decisions-and-their-reasons)) |
| GitHub deploy key read-only | ➖ Not applicable: public repository cloned over HTTPS |
| HTTPS with Let's Encrypt, renewal tested | ✅ `certbot renew --dry-run` ([stage 11](#11-get-the-real-certificate)) |
| Only nginx publishes a port | ✅ From outside, only 22, 80 and 443 answer; 3306 and 8080 time out |
| Daily backups | ⏭️ Skipped on purpose ([decisions](#decisions-and-their-reasons)) |
| Only you have admin accounts | ✅ `make prod-command CMD='users list'`: one user, the owner, role `admin` |

Recommended outside the server: two-factor authentication on the
DigitalOcean and Namecheap accounts ([secrets](#secrets-and-accounts)).

## What is left

**The first deployment is complete** (2026-09-24): the application runs
at https://revision.bryanbd16.xyz with a trusted, automatically renewed
certificate, behind a firewall, and survives reboots.

1. ✅ [Get the certificate](#11-get-the-real-certificate).
2. ✅ [Reboot test](#12-reboot-test).
3. ✅ [Security checklist](#13-security-checklist).
4. ⏭️ Backups and password manager: skipped on purpose (see
   [decisions](#decisions-and-their-reasons)).

To keep an eye on:

- **Around 2026-11-23:** the first real certificate renewal. Check with
  `sudo certbot certificates` that the expiry date moved to February 2027.
- **Every few weeks:** `sudo apt update && sudo apt upgrade` on the
  Droplet, and reboot if `/var/run/reboot-required` exists (the reboot
  test showed it is safe).
- **Next release:** follow [manual 7](production.md#7-releasing-an-update).

Later improvements, all optional
([manual 14](production.md#14-known-limitations-and-next-improvements)):
redirect `http://` to `https://` (today `http://revision.bryanbd16.xyz`
does not answer; browsers try HTTPS first when no scheme is typed),
uptime monitoring, images built by GitHub Actions, HSTS.

**Before 2027-09-24:** decide whether to renew `bryanbd16.xyz` (renewal
is more expensive than the first year) or move to another domain. If
the domain expires, the site disappears under that name and the
certificate can no longer be renewed.

## Decisions and their reasons

| Decision | Why | Consequence |
|---|---|---|
| Deployment files in every branch | Branches are versions, environments are places; releasing stays a simple merge | `production` is always an older or equal version of `development` |
| nginx terminates HTTPS itself | The backend refuses plain HTTP in production (HTTPS-only cookies); one proxy keeps the real client IP for rate limiting | Certificates must be mounted into the frontend container |
| Migrations run automatically at each `make prod-up` | No `dotnet ef` in the production image; nobody can forget them | Every migration must be read before a release ([manual 8](production.md#8-database-migrations-in-production)) |
| DigitalOcean Droplet | A plain Linux server: `compose.prod.yaml` runs unchanged; good documentation | We manage the server ourselves (updates, security) |
| `deploy` user, SSH keys only, no root login | Keys cannot be guessed; `root` is the first target of attacks | Losing the laptop's SSH key means using DigitalOcean's recovery console |
| Clone over HTTPS, no deploy key | The repository is public | A private repository would need the deploy key of manual 6.7 |
| Self-signed certificate first | Get the site working before having a domain | Browser warning until the Let's Encrypt certificate |
| Firewall after the site worked | Priority to a working site; only 22 and 443 were exposed meanwhile | Done later the same day |
| `.xyz` domain, app on a subdomain | Cheapest first year; the bare domain stays free for other projects | More expensive renewal; `.xyz` has a spam reputation with some filters |
| **No password manager** | The MySQL passwords are only needed to restore a backup on a new server, and there are no backups; the `sudo` password is remembered | The MySQL passwords exist only in `.env.production`. Forgetting the `sudo` password means recovering through DigitalOcean's console. The accounts that really protect the project are DigitalOcean and Namecheap: enable 2FA on both |
| **No backups** | Portfolio project: the data (accounts, activities, results) can be recreated, and the seed activities come from Git | If the Droplet or its volume is lost, users and results are lost; restart with `make prod-up` + `make prod-seed`. To add them later: [manual 9](production.md#9-backups-and-restore) (commands already tested) |

## Lessons learned

The ones worth remembering for the next deployment:

1. **Rehearse production locally first.** The HTTPS-only cookie problem
   was found on the laptop, not on the server.
2. **Placeholders are not literal.** `<ip>`, `your-email@example.com`:
   replace the whole thing, brackets and prefixes included.
3. **Paste one block at a time** and wait for the prompt, especially when
   a block contains `exit` or `reboot`.
4. **Keep a safety session open** when changing SSH or firewall settings,
   and test from a new terminal before closing it.
5. **Check what a setting actually does** (`sshd -T`, `groups`, `dig`,
   `nc`) rather than trusting that the edit worked.
6. **Secrets never leave the server** (except to a password manager, if
   you use one): not in Git, chats or screenshots. Check them without displaying them
   (`grep -c`).
7. **Know where a command must run**: laptop or Droplet, with or without
   `sudo`. The prompt tells you (`bryan-blais-dupuis@...` vs
   `deploy@revision-platform-prod`).
8. **DNS has several layers** (registry → nameservers → record) and
   caches; a correct record can take time to be visible.
9. **Refused vs timeout** tells you whether a firewall is involved.
10. **Tools change; observe what they actually do.** The plan said the
    certbot hook would need a manual first run; certbot 5.8.0 ran it by
    itself. Check the result, then fix the documentation.
11. **Idempotent commands are your friend**: apt, `mkdir -p` and
    `make prod-up` can be repeated safely. `make prod-seed` cannot.
