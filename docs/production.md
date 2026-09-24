# Production

This guide explains how the application runs in production and how to
deploy it, update it, back it up and repair it. It is written to be
studied, not only followed: each step says **why** it exists, not only
**what** to type.

The progress of the actual deployment is tracked in
[deployment-log.md](deployment-log.md).

It covers:

1. [Key concepts](#1-key-concepts)
2. [Branches, environments and releases](#2-branches-environments-and-releases)
3. [How the production setup works](#3-how-the-production-setup-works)
4. [The production files, one by one](#4-the-production-files-one-by-one)
5. [Rehearsing production on your computer](#5-rehearsing-production-on-your-computer)
6. [First deployment on DigitalOcean](#6-first-deployment-on-digitalocean)
7. [Releasing an update](#7-releasing-an-update)
8. [Database migrations in production](#8-database-migrations-in-production)
9. [Backups and restore](#9-backups-and-restore)
10. [Rolling back a release](#10-rolling-back-a-release)
11. [Day-to-day operations](#11-day-to-day-operations)
12. [Troubleshooting](#12-troubleshooting)
13. [Security checklist](#13-security-checklist)
14. [Known limitations and next improvements](#14-known-limitations-and-next-improvements)
15. [What has been verified](#15-what-has-been-verified)

---

## 1. Key concepts

**Environment.** A place where the application runs, with its own
settings and its own data. This project has two:

| | Development | Production |
|---|---|---|
| Where | Your computer | A server on the internet |
| Who uses it | You | Real users |
| Data | Disposable (`make db-reset`) | Precious: must be backed up |
| Backend and frontend | Run on the host (`make backend-run`, `make frontend-run`) | Run in Docker containers |
| Settings | `.env`, `compose.yaml` | `.env.production`, `compose.prod.yaml` |
| Protocol | Plain HTTP | HTTPS only |

**Docker image and container.** An *image* is a packaged, read-only
filesystem with everything a program needs (for example the .NET runtime
plus the compiled API). A *container* is a running instance of an image.
Rebuilding an image and recreating its container is how a new version is
deployed.

**Docker Compose.** A tool that starts several containers together from
one file (`compose.prod.yaml`), with a private network between them, so
they can reach each other by service name (`db`, `backend`, ...).

**Volume.** Storage managed by Docker that survives when a container is
deleted and recreated. The database files live in a volume; without it,
every deployment would erase the data.

**Reverse proxy.** A server that receives the requests from the internet
and forwards them to the right program behind it. Here, nginx is the
reverse proxy: it answers the browser directly for the Angular files and
forwards `/api/...` to the backend.

**HTTPS / TLS / certificate.** HTTPS is HTTP encrypted with TLS. To prove
its identity to browsers, the server needs a *certificate* for its domain
name, signed by an authority that browsers trust (here: Let's Encrypt,
free). The certificate is made of two files: `fullchain.pem` (public, sent
to browsers) and `privkey.pem` (secret, never shared).

**Domain name and DNS.** A domain (`revision.example.com`) is a
human-friendly name. DNS is the system that translates it into the
server's IP address, through an *A record*.

**VPS / Droplet.** A virtual private server: a Linux machine you rent and
fully control. DigitalOcean calls them *Droplets*.

**Migration.** A versioned change to the database structure (add a table,
a column, an index...). EF Core generates them in
`backend/src/RevisionPlatform.Api/Data/Migrations/`.

**Secret.** A value that gives access to something: database passwords,
the certificate's private key, the keys that encrypt the session cookies.
Secrets are never committed to Git.

---

## 2. Branches, environments and releases

### Branches are versions, environments are places

A frequent beginner idea is "the `production` branch contains the
production configuration and `development` contains the development
configuration". This project does **not** do that, on purpose:

- Both branches contain *all* the files: the development ones
  (`compose.yaml`, `.env.example`) and the production ones
  (`compose.prod.yaml`, the Dockerfiles, `.env.production.example`).
- What makes an environment different is **which settings file and which
  compose file you use**, and that is chosen by the command you run
  (`make backend-run` vs `make prod-up`), not by the branch.

Why:

- `production` stays an older (or equal) version of `development`, so
  releasing is always a simple merge, without conflicts.
- A change that needs a new production setting is written, tested and
  reviewed together with the code that needs it.
- You can rehearse production on your computer at any time
  ([section 5](#5-rehearsing-production-on-your-computer)).

The production files do not get in the way of daily work: they are only
used by the `prod-*` Makefile commands.

### The flow of a change

```
feature/xyz ──merge──► development ──merge──► production ──deploy──► Droplet
 (daily work)          (integrated,           (released,              (what users
                        tests pass)            stable)                  see)
```

1. **Daily work (as today).** Create `feature/xyz` from `development`,
   commit, run the tests, merge into `development`. Nothing reaches users.
2. **Release.** When `development` is in a state you are happy to show,
   merge it into `production` and tag the version
   ([section 7](#7-releasing-an-update)).
3. **Deploy.** On the Droplet, pull `production` and run `make prod-up`.

You decide how often to release: every week, every month, or only when a
feature is finished. Users only see what was released.

### Versions and tags

A *tag* is a permanent name on a commit, such as `v1.0.0`. Tag each
release so you always know what is deployed and can go back to it
([section 10](#10-rolling-back-a-release)).

A common convention is *semantic versioning*, `vMAJOR.MINOR.PATCH`:

- `PATCH` (`v1.0.1`): bug fixes only.
- `MINOR` (`v1.1.0`): new features that do not break anything.
- `MAJOR` (`v2.0.0`): breaking changes.

For a learning project, simply increasing `MINOR` at each release is fine.

---

## 3. How the production setup works

### The containers

```
                        Internet
                            │  https://revision.example.com  (port 443)
                            ▼
┌──────────────────────── Droplet (Ubuntu + Docker) ─────────────────────────┐
│                                                                            │
│   ┌──────────────────────────┐                                             │
│   │ frontend (nginx)         │  the only published port                    │
│   │ - TLS (HTTPS)            │                                             │
│   │ - Angular files          │                                             │
│   │ - /api/ ──────────┐      │                                             │
│   └───────────────────┼──────┘                                             │
│                       │ http://backend:8080 (private network)              │
│                       ▼                                                    │
│   ┌──────────────────────────┐         ┌──────────────────────────┐        │
│   │ backend (ASP.NET Core)   │────────►│ db (MySQL 8.4)           │        │
│   │ volume: cookie keys      │  3306   │ volume: mysql-data       │        │
│   └──────────────────────────┘         └──────────────────────────┘        │
│                ▲                                   ▲                       │
│   ┌────────────┴─────────────┐                     │                       │
│   │ migrate (runs once,      │─────────────────────┘                       │
│   │ then exits)              │                                             │
│   └──────────────────────────┘                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

| Service | Image | Role | Published port |
|---|---|---|---|
| `frontend` | `revision-platform-frontend` (built from `frontend/Dockerfile`) | Terminates HTTPS, serves the Angular build, forwards `/api/` | Yes (`APP_PORT`, 443 on the server) |
| `backend` | `revision-platform-backend` (built from `backend/Dockerfile`) | The REST API | No |
| `migrate` | Same image as `backend` | Applies pending migrations, then exits | No |
| `db` | `mysql:8.4` (official) | The database | No |

Only nginx can be reached from outside. The backend and MySQL are only
reachable from inside the private Compose network, which removes a whole
category of attacks (nobody can try passwords on MySQL from the
internet).

### The startup order

`make prod-up` runs `docker compose ... up -d --build --wait`:

1. **Build** the backend and frontend images (only the changed layers).
2. Start **`db`** and wait until its health check (`mysqladmin ping`)
   passes.
3. Start **`migrate`**, which runs `dotnet RevisionPlatform.Api.dll
   migrate`. It applies the migrations that are not yet in the database,
   prints what it did, and exits with code 0.
4. Start **`backend`**, only if `migrate` succeeded
   (`condition: service_completed_successfully`). A failed migration
   therefore never leaves a new backend running against an old database.
5. Start **`frontend`**.
6. `--wait` returns when everything is running (or reports the failure).

### The journey of a request

Take `GET https://revision.example.com/api/activities`:

1. The browser asks DNS for the IP of `revision.example.com` and gets the
   Droplet's IP.
2. It opens a TLS connection to port 443. nginx presents the certificate;
   the browser checks it is valid for this domain.
3. nginx sees the path starts with `/api/` and forwards the request over
   plain HTTP to `http://backend:8080`, adding two headers:
   - `X-Forwarded-For`: the browser's real IP address;
   - `X-Forwarded-Proto: https`: the original request was HTTPS.
4. ASP.NET Core reads these headers (because
   `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true`), so the rest of the backend
   sees the real client IP and an HTTPS request.
5. The backend queries MySQL at `db:3306` and answers; nginx sends the
   answer back through the encrypted connection.

A request for `/activities/42` (an Angular route, not a file) goes to
nginx's `location /`: the file does not exist, so nginx answers with
`index.html` and Angular's router displays the right page. This is what
makes page reloads and shared links work.

### Why HTTPS is mandatory, even to try it

In production (`ASPNETCORE_ENVIRONMENT=Production`), the backend:

- marks the session cookie (`revision_session`) and the anti-forgery
  cookie as **Secure**: browsers only send them over HTTPS, so nobody on
  the network (public Wi-Fi...) can steal a session;
- **refuses** to issue anti-forgery tokens on a plain HTTP request. The
  first version of this setup served plain HTTP, and every `GET /api/...`
  failed with a `500` and this log line:
  `The antiforgery system has the configuration value
  AntiforgeryOptions.Cookie.SecurePolicy = Always, but the current request
  is not an SSL request.`

That is why nginx terminates HTTPS itself, and why `make prod-cert`
exists to create a certificate for local rehearsals.

### Why the backend needs the client's real IP

The sign-in, registration and password endpoints are rate limited **per
client IP address** (10 requests per minute, see
`backend/src/RevisionPlatform.Api/Auth/AuthServiceCollectionExtensions.cs`)
to slow down password guessing. Behind nginx, every request comes from
nginx's IP; without the forwarded headers, *all users together* would
share a single limit of 10 per minute.

Trusting `X-Forwarded-For` is only safe when the backend cannot be reached
except through nginx, which is the case here (no published port). nginx
uses `$proxy_add_x_forwarded_for`, which appends the address it actually
saw, and ASP.NET Core only reads the last entry, so a client cannot fake
its address by sending the header itself.

### Why the cookie keys are kept in a volume

ASP.NET Core encrypts the session cookie with *Data Protection* keys that
it generates on first start and stores in
`/home/app/.aspnet/DataProtection-Keys`. If this folder disappeared at
each deployment, every user would be signed out at each release. The
`data-protection-keys` volume keeps it.

---

## 4. The production files, one by one

### `backend/Dockerfile`

A **multi-stage** build: the first stage has the full .NET SDK (large,
used to compile), the second only the ASP.NET runtime (smaller, used to
run). The final image contains no compiler and no source code.

- The `.csproj` is copied and `dotnet restore` runs **before** copying the
  code. Docker caches each step; since the packages rarely change, later
  builds skip the download.
- `dotnet publish --configuration Release` produces optimized binaries.
- `USER app`: the API runs as an unprivileged user (built into the
  official image), not as root. If the API were compromised, the attacker
  would have fewer rights.
- `ASPNETCORE_ENVIRONMENT=Production`: turns off Swagger and enables the
  HTTPS-only cookies.
- `ENTRYPOINT ["dotnet", "RevisionPlatform.Api.dll"]`: by default the
  container runs the API; extra arguments turn it into a command
  (`migrate`, `seed ...`, `users ...`), exactly like `dotnet run -- ...`
  in development.

`backend/.dockerignore` keeps `bin/`, `obj/` and the tests out of the
build context.

### `frontend/Dockerfile`

Also multi-stage:

1. `node:24-alpine` installs the packages with `npm ci` (exactly the
   versions of `package-lock.json`) and runs the production build
   (`ng build --configuration production`: minified, hashed file names).
2. `nginx:1.28-alpine` receives only the result
   (`dist/frontend/browser`) and `nginx.conf`. Node.js is not in the final
   image.

### `frontend/nginx.conf`

- `listen 443 ssl` with the certificate from `/etc/nginx/certs/`
  (mounted from the host, see `CERT_DIR`). Only TLS 1.2 and 1.3.
- `location /api/`: forwarded to the backend with the `Host`,
  `X-Forwarded-For` and `X-Forwarded-Proto` headers.
- `location ~* \.(?:js|css)$`: cached by browsers for a year. Safe because
  Angular puts a hash of the content in these file names
  (`main-ABC123.js`): a new version has a new name.
- `location /`: `index.html` is never cached (`no-cache`), so users get
  the new version right after a release; unknown paths fall back to
  `index.html` for Angular's router.

### `compose.prod.yaml`

- `name: revision-platform-prod`: a separate Compose project, so its
  containers and volumes never mix with the development database of
  `compose.yaml`.
- `x-database-connection`: the connection string written once and reused
  by `migrate` and `backend` (a YAML *anchor*).
- `restart: unless-stopped`: containers restart after a crash or a server
  reboot, unless you stopped them yourself.
- `ports: "${APP_ADDRESS:-127.0.0.1}:${APP_PORT:-8443}:443"`: by default
  only reachable from the machine itself; the server's `.env.production`
  opens it (`0.0.0.0:443`).
- Volumes: `mysql-data` (the database) and `data-protection-keys` (cookie
  keys). **Deleting them deletes the data** (`docker compose down -v`).

### `.env.production.example` and `.env.production`

The template of the production settings; the real `.env.production` is
created on the server and ignored by Git. Variables:

| Variable | Meaning | On the Droplet |
|---|---|---|
| `APP_ADDRESS` | Network interface nginx listens on | `0.0.0.0` (all) |
| `APP_PORT` | Published HTTPS port | `443` |
| `CERT_DIR` | Directory with `fullchain.pem` and `privkey.pem` | `./certs` |
| `MYSQL_DATABASE`, `MYSQL_USER` | Database and application user | Keep the defaults |
| `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | Passwords | Long random values |

MySQL reads the passwords **only when its volume is created**. Changing
them later in `.env.production` does not change them in MySQL; the
backend would then fail to connect.

### The `migrate` command

`backend/src/RevisionPlatform.Api/Commands/MigrateCommand.cs` applies the
pending migrations with EF Core's `Database.MigrateAsync()`. In
development you use `make db-migrate`, which calls the `dotnet ef` tool;
that tool needs the SDK and the source code, which the production image
does not contain, hence this command.

### The Makefile `prod-*` commands

All use `docker compose --env-file .env.production -f compose.prod.yaml`
and stop with a clear message if `.env.production` is missing.

| Command | What it does |
|---|---|
| `make prod-cert` | Creates a **self-signed** certificate in `certs/` (local rehearsal only) |
| `make prod-build` | Builds the images without starting anything |
| `make prod-up` | Builds, migrates and starts everything (the deploy command) |
| `make prod-down` | Stops and removes the containers; **keeps** the volumes |
| `make prod-logs` | Follows the logs of all services (`Ctrl+C` to quit) |
| `make prod-command CMD='...'` | Runs a backend command in a one-off container, e.g. `CMD='users list'` |
| `make prod-seed [FILES=...]` | Creates the seed activities from `seed/activities` |

---

## 5. Rehearsing production on your computer

Do this before the first deployment, and whenever you change a production
file (Dockerfile, nginx, compose).

```sh
cp .env.production.example .env.production   # the defaults are fine locally
make prod-cert                               # self-signed certificate in certs/
make prod-up                                 # takes a few minutes the first time
```

Open <https://localhost:8443>. The browser warns that the certificate is
not trusted: expected, since you signed it yourself. Accept the warning
for localhost only.

Then try: create an account, make it admin
(`make prod-command CMD='users grant-role you@example.com admin'`), seed
some activities (`make prod-seed FILES='cpp-*.json'`), sign out and in.

This production copy is independent from your development database; your
development workflow (`make db-up`, `make backend-run`,
`make frontend-run`) keeps working at the same time.

Clean up afterwards:

```sh
make prod-down                                                          # stop, keep data
docker compose --env-file .env.production -f compose.prod.yaml down -v  # or: delete its data too
```

---

## 6. First deployment on DigitalOcean

DigitalOcean is a good fit: a Droplet is a plain Linux server, and this
setup only needs Docker, so it runs there unchanged. Its documentation is
beginner-friendly, and it also has a *Cloud Firewall* and *Backups* that
are useful below.

Throughout this section, replace:

- `revision.example.com` with your domain;
- `203.0.113.10` with your Droplet's IP;
- `deploy` with the user name you choose.

Commands prefixed with `local$` run on your computer, `droplet$` on the
Droplet.

### 6.1 Before starting

You need:

- a DigitalOcean account (check the current prices on their site);
- a **domain name** (bought from any registrar). A certificate from
  Let's Encrypt is only issued for a domain, not for a bare IP;
- an **SSH key** on your computer. Check with `ls ~/.ssh/id_ed25519.pub`;
  if missing, create one:

  ```sh
  local$ ssh-keygen -t ed25519 -C "you@example.com"
  ```

  SSH keys replace passwords to log in to the server: much harder to
  guess, and required below.

### 6.2 Create the Droplet

In the DigitalOcean control panel, *Create → Droplets*:

- **Image:** Ubuntu 24.04 LTS (*LTS* = long-term support: security
  updates for years).
- **Size:** Basic, Regular, **2 GB RAM** or more. The images are built on
  the Droplet, and the Angular build plus MySQL plus the .NET API are too
  tight for 1 GB.
- **Region:** the closest to your users.
- **Authentication:** *SSH Key*, and add your `~/.ssh/id_ed25519.pub`.
  Do not choose a password.
- **Backups:** optional, see [section 9](#9-backups-and-restore).

Note the Droplet's public IPv4 address.

### 6.3 Point the domain to the Droplet

At your registrar (or in DigitalOcean's *Networking → Domains* if you
delegate the domain to it), create an **A record**:

| Type | Name | Value |
|---|---|---|
| A | `revision` (or `@` for the bare domain) | `203.0.113.10` |

DNS changes can take from minutes to a few hours to spread. Check:

```sh
local$ dig +short revision.example.com    # must print 203.0.113.10
```

### 6.4 First login, updates and a non-root user

```sh
local$ ssh root@203.0.113.10
```

The first time, SSH shows the server's fingerprint and asks whether to
trust it: answer `yes`. It saves it in `~/.ssh/known_hosts` and will warn
you if the server's identity ever changes.

A new Droplet's image is a few weeks old, so install the pending updates
first (on the first deployment: 154 updates, 125 of them security fixes):

```sh
droplet$ apt update && apt upgrade -y
droplet$ ls /var/run/reboot-required && reboot    # reboots only if an update asks for it (kernel)
```

If a screen asks about a modified configuration file, keep the local
version; if it asks which services to restart, accept the defaults.

Working as `root` all the time is risky (it can do anything, with no
confirmation), so create a normal user with `sudo` rights and give it your
SSH key:

```sh
droplet$ adduser deploy                  # choose a password: sudo asks for it
droplet$ usermod -aG sudo deploy         # -a = append to the groups
droplet$ rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

**Keep the root session open**, and in a second terminal:

```sh
local$ ssh deploy@203.0.113.10
droplet$ sudo whoami                     # must print: root
```

Then forbid root logins and password logins over SSH (keys only). Do it
in a file of `/etc/ssh/sshd_config.d/` rather than in
`/etc/ssh/sshd_config`: those files are read first, and for SSH **the
first value found wins**. On DigitalOcean's Ubuntu image,
`50-cloud-init.conf` is there and could override an edit of the main
file; the name `00-...` makes ours win.

```sh
droplet$ sudo tee /etc/ssh/sshd_config.d/00-hardening.conf > /dev/null <<'EOF'
# Keys only, and no direct root login (use deploy + sudo).
PasswordAuthentication no
PermitRootLogin no
EOF
droplet$ sudo sshd -t && sudo systemctl restart ssh      # -t: checks the syntax first
droplet$ sudo sshd -T | grep -E '^(passwordauthentication|permitrootlogin)'
#   permitrootlogin no
#   passwordauthentication no
```

`sshd` needs `sudo`: without it, it cannot read the configuration files
(`Permission denied`). It only exists on the server, not on your computer.

Test from a new terminal before closing the root session:

```sh
local$ ssh deploy@203.0.113.10                              # must work
local$ ssh root@203.0.113.10                                # Permission denied (publickey)
local$ ssh -o PubkeyAuthentication=no deploy@203.0.113.10   # Permission denied, no password asked
```

Ubuntu installs security updates automatically (`unattended-upgrades`).
Apply the others from time to time:

```sh
droplet$ sudo apt update && sudo apt upgrade
```

### 6.5 Firewall

This step can be done after the application works (that is what the
first deployment did, see [deployment-log.md](deployment-log.md)), but
**before sharing the link**. Until then, only SSH (keys only) and nginx's
port are reachable: Docker publishes no other port.

Use a **DigitalOcean Cloud Firewall** (*Networking → Firewalls*), applied
to the Droplet, with these inbound rules:

| Protocol | Port | Source | Why |
|---|---|---|---|
| TCP | 22 | Your IP if it is stable, otherwise all | SSH |
| TCP | 80 | All | Let's Encrypt checks (certificate issuance and renewal) |
| TCP | 443 | All | The application |

Why the Cloud Firewall rather than Ubuntu's `ufw`: **Docker writes its own
network rules, which bypass `ufw`**. A port published by a container is
reachable even if `ufw` blocks it. The Cloud Firewall filters traffic
before it reaches the Droplet, so Docker cannot bypass it.

### 6.6 Install Docker, Git and Make

Install Docker Engine by following the official instructions for Ubuntu
(<https://docs.docker.com/engine/install/ubuntu/>, section *Install using
the apt repository*). It includes the `docker compose` plugin.

Then:

```sh
droplet$ sudo usermod -aG docker deploy     # use docker without sudo
droplet$ exit                               # log out and in again for the group to apply
local$ ssh deploy@203.0.113.10
droplet$ docker run --rm hello-world        # checks Docker works
droplet$ sudo apt install -y git make
```

Being in the `docker` group is equivalent to being root on this machine;
only give it to users you trust.

### 6.7 Get the code

**If the repository is public** (the case for this project), no key is
needed; clone over HTTPS and skip the deploy key below:

```sh
droplet$ git clone https://github.com/BryanBD16/revision-platform.git ~/revision-platform
droplet$ cd ~/revision-platform && git checkout production
```

**If the repository is private**, the Droplet needs read access to the GitHub repository. A **deploy key**
is an SSH key that gives access to one repository only, read-only; if the
Droplet were compromised, the attacker could not push code nor reach your
other repositories.

```sh
droplet$ ssh-keygen -t ed25519 -C "revision-platform droplet" -f ~/.ssh/github_deploy -N ""
droplet$ cat ~/.ssh/github_deploy.pub
```

On GitHub: repository *Settings → Deploy keys → Add deploy key*, paste the
key, leave *Allow write access* **unchecked**.

```sh
droplet$ cat >> ~/.ssh/config <<'EOF'
Host github.com
    IdentityFile ~/.ssh/github_deploy
EOF
droplet$ git clone git@github.com:BryanBD16/revision-platform.git ~/revision-platform
droplet$ cd ~/revision-platform
droplet$ git checkout production
```

The Droplet always deploys the `production` branch. Make sure you pushed
it first ([section 7](#7-releasing-an-update)).

### 6.8 Production settings

```sh
droplet$ cd ~/revision-platform
droplet$ cp .env.production.example .env.production
droplet$ chmod 600 .env.production           # readable by deploy only
droplet$ openssl rand -hex 24                # run twice: one per password
droplet$ nano .env.production
```

Set:

```ini
APP_ADDRESS=0.0.0.0
APP_PORT=443
CERT_DIR=./certs
MYSQL_DATABASE=revision_platform
MYSQL_USER=revision_platform
MYSQL_PASSWORD=<first random value>
MYSQL_ROOT_PASSWORD=<second random value>
```

`openssl rand -hex` only produces `0-9a-f`, so the values never contain
the characters that break the connection string (`;`, `$`).

**Save the two passwords in a password manager.** You need the root
password to restore a backup on a new server.

### 6.9 The HTTPS certificate (Let's Encrypt)

**No domain yet?** Let's Encrypt needs one. To get the application
running first, use a self-signed certificate and open
`https://203.0.113.10`, accepting the browser's warning:

```sh
droplet$ cd ~/revision-platform && make prod-cert
```

Replace it with the Let's Encrypt certificate below once the domain
points to the Droplet (the deploy hook overwrites the files in `certs/`).

`certbot` obtains a free certificate from Let's Encrypt. To prove you
control the domain, Let's Encrypt connects to it on port 80; certbot's
*standalone* mode answers on port 80 itself (nothing else uses it here).

```sh
droplet$ sudo snap install --classic certbot
droplet$ sudo ln -s /snap/bin/certbot /usr/bin/certbot
droplet$ sudo certbot certonly --standalone -d revision.example.com -m you@example.com --agree-tos
```

The certificate is in `/etc/letsencrypt/live/revision.example.com/`. It is
valid **90 days**; certbot installs a timer that renews it automatically
about 30 days before expiry.

The files in `live/` are symbolic links to `../../archive/...`; mounted
alone into the container, those links would point to nothing. So a
**deploy hook** copies the real files into `~/revision-platform/certs`
and tells nginx to reload them. Certbot runs it after every successful
renewal:

```sh
droplet$ sudo nano /etc/letsencrypt/renewal-hooks/deploy/revision-platform.sh
```

```sh
#!/bin/sh
# Copies the renewed certificate where nginx reads it, then reloads nginx.
set -e
DOMAIN=revision.example.com
APP_DIR=/home/deploy/revision-platform

mkdir -p "$APP_DIR/certs"
install -m 644 "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$APP_DIR/certs/fullchain.pem"
install -m 600 "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$APP_DIR/certs/privkey.pem"

cd "$APP_DIR"
docker compose --env-file .env.production -f compose.prod.yaml exec -T frontend nginx -s reload \
    || echo "nginx is not running: the new certificate is used at its next start."
```

```sh
droplet$ sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/revision-platform.sh
droplet$ sudo /etc/letsencrypt/renewal-hooks/deploy/revision-platform.sh   # first copy
droplet$ ls -l ~/revision-platform/certs                                    # fullchain.pem, privkey.pem
```

`install` copies the *content* of the linked files. `privkey.pem` stays
owned by root with mode `600`: nginx's master process runs as root in the
container, so it can read it, and the `deploy` user cannot leak it by
mistake.

Check the renewal works (a dry run talks to Let's Encrypt's test server
and does **not** run deploy hooks):

```sh
droplet$ sudo certbot renew --dry-run
```

### 6.10 Start the application

```sh
droplet$ cd ~/revision-platform
droplet$ make prod-up
```

The first build takes several minutes. At the end, check:

```sh
droplet$ docker compose --env-file .env.production -f compose.prod.yaml ps -a
#   db, backend, frontend: running;  migrate: exited (0)
droplet$ docker compose --env-file .env.production -f compose.prod.yaml logs migrate
#   Applied N migration(s): ...
local$ curl https://revision.example.com/api/health
#   Healthy
```

Open `https://revision.example.com`: a padlock, no warning.

### 6.11 First admin and content

Create your account in the application, then:

```sh
droplet$ make prod-command CMD='users grant-role you@example.com admin'   # asks for confirmation
droplet$ make prod-seed                                                   # optional: the seed activities
```

`make prod-seed` creates the activities **each time** it runs; run it once,
then only with `FILES=...` for new seed files.

### 6.12 Last checks

- Reboot and verify everything comes back by itself (`restart:
  unless-stopped`):

  ```sh
  droplet$ sudo reboot
  # wait a minute, reconnect
  droplet$ docker compose --env-file ~/revision-platform/.env.production -f ~/revision-platform/compose.prod.yaml ps
  ```

- Set up the backups ([section 9](#9-backups-and-restore)) **before**
  sharing the link with users.

---

## 7. Releasing an update

### On your computer

```sh
local$ git checkout development
local$ git pull
local$ make test                          # everything must pass
# optional but recommended when production files changed:
local$ make prod-up                       # rehearsal (section 5)

local$ git checkout production
local$ git pull
local$ git merge --no-ff development -m "Merge branch 'development' into production"
local$ git tag -a v1.1.0 -m "v1.1.0: short description of the release"
local$ git push origin production v1.1.0
local$ git checkout development           # back to work
```

Before merging, look at what is being released:

```sh
local$ git log --oneline production..development                    # the commits
local$ git diff --stat production..development                      # the files
local$ git diff production..development -- backend/src/RevisionPlatform.Api/Data/Migrations   # the migrations!
```

### On the Droplet

```sh
droplet$ cd ~/revision-platform
droplet$ ./backup.sh                      # a backup just before, see section 9
droplet$ git pull --ff-only               # --ff-only: refuses if the Droplet's copy diverged
droplet$ make prod-up                     # rebuilds, migrates, restarts what changed
droplet$ docker compose --env-file .env.production -f compose.prod.yaml logs --tail 20 migrate backend
```

During `make prod-up`, the backend and frontend containers are replaced:
the application is unavailable for a few seconds. This is acceptable for
this project (avoiding it requires several servers or containers behind a
load balancer).

Signed-in users stay signed in, thanks to the `data-protection-keys`
volume.

### Keeping `development` and `production` in sync

Never commit directly on `production`. If a hot fix is urgent, make it on
a `fix/...` branch from `development`, merge into `development`, then
release as usual. That way `production` never contains something
`development` does not have, and the next merge stays trivial.

---

## 8. Database migrations in production

In development, a broken migration costs a `make db-reset`. In production
it can **lose users' data**, and `make prod-up` applies migrations
**automatically**. Rules:

1. **Read every migration before releasing it** (the `Up` method of the
   generated file). Look for `DropTable`, `DropColumn`, `RenameColumn`,
   `AlterColumn` that shortens or changes a type.
2. **Prefer additive changes.** Adding a table, a nullable column or a
   column with a default is safe. Removing or renaming is not:
   - to rename a column: add the new one, copy the data, deploy the code
     that uses it, and only in a later release drop the old one;
   - to drop a column: first release code that no longer uses it, then
     drop it in a later release.
3. **A new required column needs a default value**, or existing rows make
   the migration fail.
4. **Back up right before a release that contains a migration.**
5. **Never edit a migration that was already released.** Production
   remembers which migrations it applied (table `__EFMigrationsHistory`);
   an edited migration will not run again. Create a new one instead.
6. **Migrations do not roll back by themselves.** Going back to an older
   version of the code does not undo a migration
   ([section 10](#10-rolling-back-a-release)).

If `migrate` fails, the backend is not started, and `make prod-up`
reports it. Read the logs
(`docker compose ... logs migrate`), fix the migration in `development`,
and release again. MySQL does not roll back structure changes
(`CREATE`/`ALTER TABLE`) inside a transaction, so a migration that failed
halfway may have left partial changes: compare with the migration file,
and restore the backup if in doubt.

---

## 9. Backups and restore

**A backup that was never restored is not a backup.** Test the restore at
least once.

### What to back up

| What | Where | Importance |
|---|---|---|
| The database | Volume `mysql-data` | Critical: all users, activities and results |
| `.env.production` | The Droplet | Needed to restart; keep the passwords in a password manager |
| Cookie keys | Volume `data-protection-keys` | Low: losing them only signs every user out |
| Certificate | `/etc/letsencrypt` | Low: certbot can issue a new one |
| The code | GitHub | Already safe |

### Manual backup

`mysqldump` exports the database as SQL statements. `--single-transaction`
takes a consistent snapshot without blocking the application.

```sh
droplet$ cd ~/revision-platform
droplet$ mkdir -p ~/backups
droplet$ docker compose --env-file .env.production -f compose.prod.yaml exec -T db \
    sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --no-tablespaces "$MYSQL_DATABASE"' \
    | gzip > ~/backups/revision-platform-$(date +%Y-%m-%d_%H%M).sql.gz
```

The `-p"$MYSQL_ROOT_PASSWORD"` is expanded **inside** the container (note
the single quotes), so the password is not written in your shell history.
The warning *"Using a password on the command line interface can be
insecure"* is expected.

### Automatic daily backups

Create `~/revision-platform/backup.sh` (this file is not in Git; add it
on the Droplet):

```sh
#!/bin/sh
# Dumps the production database into ~/backups and keeps the last 14 days.
set -e
cd "$HOME/revision-platform"
mkdir -p "$HOME/backups"
FILE="$HOME/backups/revision-platform-$(date +%Y-%m-%d_%H%M).sql.gz"
docker compose --env-file .env.production -f compose.prod.yaml exec -T db \
    sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --no-tablespaces "$MYSQL_DATABASE"' \
    | gzip > "$FILE"
find "$HOME/backups" -name 'revision-platform-*.sql.gz' -mtime +14 -delete
echo "Backup written to $FILE"
```

```sh
droplet$ chmod +x ~/revision-platform/backup.sh
droplet$ ~/revision-platform/backup.sh       # test it
droplet$ crontab -e                          # add the line below: every day at 03:00 (server time, UTC by default)
0 3 * * * $HOME/revision-platform/backup.sh >> $HOME/backups/backup.log 2>&1
```

### Keep a copy outside the Droplet

Backups stored only on the Droplet disappear with it. At minimum, copy
them regularly to your computer:

```sh
local$ rsync -av deploy@203.0.113.10:backups/ ~/revision-platform-backups/
```

Better, later: upload them automatically to object storage (for example
DigitalOcean Spaces).

DigitalOcean's **Droplet Backups** option (paid, a percentage of the
Droplet's price) takes an image of the whole server daily or weekly. It is
a useful complement to restore the whole machine at once, but it is not a
replacement for database dumps: it is taken while MySQL is running, it is
less frequent, and it stays inside DigitalOcean.

### Restore

Restoring **replaces** the current tables with those of the backup (the
dump contains `DROP TABLE IF EXISTS` before each table).

```sh
droplet$ cd ~/revision-platform
droplet$ ./backup.sh                          # save the current state first, just in case
droplet$ gunzip -c ~/backups/revision-platform-2026-09-24_0300.sql.gz \
    | docker compose --env-file .env.production -f compose.prod.yaml exec -T db \
      sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
droplet$ docker compose --env-file .env.production -f compose.prod.yaml restart backend
```

To practise without risk, restore a backup into your **local rehearsal**
(section 5) rather than into production.

### Restore on a new server

If the Droplet is lost: create a new one (section 6, steps 6.2 to 6.9,
with the **same passwords** in `.env.production`), run `make prod-up`
(creates an empty, migrated database), restore the dump as above, then
point the DNS to the new IP.

---

## 10. Rolling back a release

If a release is broken and you cannot fix it quickly, go back to the
previous tag:

```sh
droplet$ cd ~/revision-platform
droplet$ git fetch --tags
droplet$ git checkout v1.0.0          # the last good version ("detached HEAD" is expected)
droplet$ make prod-up
```

Then fix the problem in `development`, release a new version, and put the
Droplet back on the branch:

```sh
droplet$ git checkout production && git pull --ff-only && make prod-up
```

**Limitation:** this rolls back the code, not the database. If the broken
release applied a migration, the old code runs against the new structure.
This works if the migration was additive (section 8, rule 2), which is the
main reason for that rule. If not, restore the backup taken just before
the release (section 9) — which also loses what users did since.

---

## 11. Day-to-day operations

All commands run in `~/revision-platform` on the Droplet. To shorten them,
you can define an alias in `~/.bashrc`:

```sh
alias dcp='docker compose --env-file .env.production -f compose.prod.yaml'
```

| Task | Command |
|---|---|
| State of the containers | `dcp ps -a` |
| Follow all logs | `make prod-logs` |
| Last lines of the backend logs | `dcp logs --tail 100 backend` |
| Restart the backend only | `dcp restart backend` |
| Stop everything (data kept) | `make prod-down` |
| Start again | `make prod-up` |
| MySQL prompt | `dcp exec db sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'` |
| List users and roles | `make prod-command CMD='users list'` |
| Temporary password for a user | `make prod-command CMD='users reset-password user@example.com'` |
| Disk usage | `df -h` and `docker system df` |
| Free disk space (old images and build cache) | `docker image prune -f` and `docker builder prune -f` |
| Update the base images (security fixes in MySQL, nginx, .NET) | `dcp pull db` then `dcp build --pull` then `make prod-up` |

Things to check every few weeks:

- the backups exist and are recent (`ls -lh ~/backups`);
- the disk is not full (`df -h`); each build leaves unused images;
- the certificate's expiry date (`sudo certbot certificates`);
- system updates (`sudo apt update && sudo apt upgrade`, then reboot if
  asked).

**Commands that destroy data** — never run them in production unless you
mean it and have a fresh backup:

- `docker compose ... down -v` (the `-v` deletes the volumes: the
  database);
- `docker volume rm` / `docker volume prune`;
- `docker system prune --volumes`.

---

## 12. Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| `make prod-up` says `Create .env.production ...` | The settings file is missing | Section 6.8 |
| Browser: *connection refused* / timeout | Wrong DNS, firewall, or frontend not running | `dig +short` the domain; check the Cloud Firewall allows 443; `dcp ps -a` |
| Browser opens `http://...` and fails | Only HTTPS is served (no port 80) | Type `https://` (see section 14) |
| Browser: certificate warning on the real domain | Self-signed or expired certificate, or wrong files in `certs/` | `sudo certbot certificates`; rerun the deploy hook script |
| nginx exits at startup: `cannot load certificate` | `certs/` empty or `CERT_DIR` wrong | Rerun the deploy hook (6.9); check `ls -l certs` |
| Every `/api` call answers `500`; log mentions *antiforgery ... not an SSL request* | Requests reach the backend as plain HTTP | Access through nginx on HTTPS only; do not publish the backend |
| `502 Bad Gateway` on `/api` | The backend is not running or crashed | `dcp ps -a`, `dcp logs backend` |
| `migrate` exited with an error, backend not started | Failing migration, or database unreachable | `dcp logs migrate`; section 8 |
| Backend logs `Access denied for user` | Password in `.env.production` differs from the one MySQL was created with | Put back the original password (MySQL only reads it when the volume is created) |
| Users are signed out after each release | `data-protection-keys` volume missing or deleted | Check `docker volume ls`; never use `down -v` |
| Many `429 Too Many Requests` for everyone | The backend does not see real client IPs | Check `ASPNETCORE_FORWARDEDHEADERS_ENABLED` in `compose.prod.yaml` and the headers in `nginx.conf` |
| Build fails / killed during `npm` or `dotnet` | Not enough memory on the Droplet | Resize to 2 GB+ or add swap |
| `git pull --ff-only` refuses | Someone changed files on the Droplet or history was rewritten | `git status`; never edit tracked files on the Droplet |
| `no space left on device` | Old images and build cache | `docker image prune -f`, `docker builder prune -f`, old backups |

---

## 13. Security checklist

Before sharing the link:

- [ ] Log in over SSH with keys only; root login and password login are
      disabled (6.4).
- [ ] The Cloud Firewall only allows 22, 80 and 443 (6.5).
- [ ] `.env.production` has long random passwords, mode `600`, and is not
      in Git (6.8).
- [ ] The passwords are saved in a password manager.
- [ ] The GitHub deploy key is read-only (6.7).
- [ ] HTTPS works with a Let's Encrypt certificate, and renewal was
      tested with `--dry-run` (6.9).
- [ ] Only nginx publishes a port: `dcp ps` shows no port for `db` and
      `backend`.
- [ ] Daily backups run, a copy exists outside the Droplet, and a restore
      was tested (9).
- [ ] Only you have admin accounts (`make prod-command CMD='users list'`).

Already handled by the application and this setup: HTTPS-only session
cookies, anti-forgery tokens, rate limiting of password endpoints per
client IP, account lockout after 5 failed sign-ins, non-root backend
container, Swagger disabled in production.

---

## 14. Known limitations and next improvements

These are deliberate simplifications for a first deployment, in rough
order of usefulness:

- **No HTTP → HTTPS redirect.** Port 80 is not served by the application,
  so `http://revision.example.com` does not load. Next step: an nginx
  `server` on port 80 that redirects to HTTPS (and serves certbot's
  challenge, so certbot no longer needs standalone mode).
- **Backups are scripts on the Droplet**, copied off it by hand. Next
  step: automatic upload to object storage.
- **Images are built on the Droplet.** Simple, but it needs memory and
  makes each release slower. Next step: build them in GitHub Actions,
  push them to a container registry, and only `pull` on the Droplet.
- **Releases are manual** (SSH, `git pull`, `make prod-up`). Next step:
  automate it with a CI/CD pipeline once the manual process is well
  understood.
- **No monitoring.** You find out the site is down when you visit it.
  Next step: an uptime check on `/api/health` (many free services exist,
  and DigitalOcean offers uptime checks).
- **A few seconds of downtime per release** (section 7).
- **A single server**: if the Droplet fails, the site is down until you
  restore it (section 9). Acceptable at this scale.
- **Cookie keys are stored unencrypted** in their volume (ASP.NET Core
  may log a warning about it at startup). Anyone with root access to the
  Droplet could read them — but such a person could also read the
  database.
- **No HSTS header** (telling browsers to always use HTTPS for the
  domain). Worth adding once HTTPS is confirmed stable on the real domain.

---

## 15. What has been verified

Verified on a development machine with the production setup
(`make prod-cert` + `make prod-up`, self-signed certificate):

- the images build from scratch, `migrate` applies all migrations, and
  the backend starts after it;
- over HTTPS: health check, account creation, session and anti-forgery
  cookies, signed-in requests, Angular routes on page reload;
- `make prod-command` (granting the admin role) and `make prod-seed`;
- users stay signed in after the backend container is recreated;
- the backup command, and restoring it into an empty database;
- `nginx -s reload` after replacing the certificate files.

**Not verified yet**, because they need the real server: every
DigitalOcean step (6.2 to 6.7), Let's Encrypt issuance and renewal with
the deploy hook, behaviour after a server reboot, the cron job, and that
the rate limiting uses the real client IP (the setting is in place, but no
test observed it). Check them during the first deployment and update this
section.
