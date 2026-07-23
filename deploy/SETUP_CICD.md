# ATLAS — GitHub → DigitalOcean CI/CD

Push (or merge) to `main` runs `.github/workflows/deploy.yml`, which SSHs into
the droplet and runs `deploy/remote-deploy.sh` (git pull → pip sync → web build →
PM2 + nginx reload via `deploy/restart.sh`).

---

## Prerequisites (already on the droplet)

Confirm these exist on the server before wiring Actions:

| Item | Expected |
|---|---|
| Repo clone | e.g. `/home/deploy/apps/weyobe-atlas` |
| Git remote | `origin` → `https://github.com/gerbymoraga/weyobe-atlas.git` (or SSH) |
| API venv | `apps/api/.venv` with deps installed |
| Web env | `apps/web/.env` with `VITE_API_URL=/api` + Supabase keys |
| Root env | `/path/to/repo/.env` for API (DB, Stripe, etc.) |
| PM2 | `atlas-api` process (see `deploy/ecosystem.config.cjs`) |
| Nginx | Serving `/var/www/atlas` (see `deploy/nginx-atlas.conf`) |
| Deploy user sudo | Passwordless `sudo` for `rsync`, `nginx -t`, `systemctl reload nginx` |

Quick check on the droplet:

```bash
cd /home/deploy/apps/weyobe-atlas   # adjust path if different
git status
pm2 status
curl -sf http://127.0.0.1:8000/health && echo OK
ls /var/www/atlas/index.html
```

---

## Step 1 — Create a deploy SSH key (on your laptop)

```bash
ssh-keygen -t ed25519 -C "github-actions-atlas-deploy" -f atlas-deploy -N ""
```

This creates:

- `atlas-deploy` — **private** key → GitHub secret `DROPLET_SSH_KEY`
- `atlas-deploy.pub` — **public** key → droplet `authorized_keys`

---

## Step 2 — Install the public key on the droplet

SSH in as the deploy user, then:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "PASTE_CONTENTS_OF_atlas-deploy.pub_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Or from your laptop (replace user/host):

```bash
ssh-copy-id -i atlas-deploy.pub deploy@167.172.135.40
```

Test:

```bash
ssh -i atlas-deploy deploy@167.172.135.40 "echo ok && hostname"
```

---

## Step 3 — Let the deploy user pull from GitHub

### Option A — HTTPS + deploy token (simple)

On GitHub: **Settings → Developer settings → Personal access tokens** (or a fine-grained
token limited to this repo, Contents: Read).

On the droplet:

```bash
cd /home/deploy/apps/weyobe-atlas
git remote -v
# If needed:
# git remote set-url origin https://github.com/gerbymoraga/weyobe-atlas.git
```

Configure a credential helper or embed the token in the remote URL (prefer a
credential store, not committing the token):

```bash
git config --global credential.helper store
# First pull will prompt once; paste token as password (username = your GitHub user)
git pull origin main
```

### Option B — Deploy key (SSH)

On the droplet:

```bash
ssh-keygen -t ed25519 -C "droplet-github-pull" -f ~/.ssh/github_atlas -N ""
cat ~/.ssh/github_atlas.pub
```

Add that **public** key on GitHub: repo → **Settings → Deploy keys → Add deploy key**
(read-only is enough).

```bash
# ~/.ssh/config
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_atlas
  IdentitiesOnly yes

chmod 600 ~/.ssh/config ~/.ssh/github_atlas
cd /home/deploy/apps/weyobe-atlas
git remote set-url origin git@github.com:gerbymoraga/weyobe-atlas.git
git fetch origin main
```

---

## Step 4 — Passwordless sudo for nginx sync (if not already)

`deploy/restart.sh` uses `sudo` for `/var/www/atlas` and nginx reload.

On the droplet (as root or with sudo):

```bash
sudo visudo -f /etc/sudoers.d/atlas-deploy
```

Add (adjust username):

```
deploy ALL=(root) NOPASSWD: /usr/bin/mkdir, /usr/bin/rsync, /usr/sbin/nginx, /bin/systemctl
```

Test as deploy user:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 5 — Make scripts executable and dry-run once

On the droplet:

```bash
cd /home/deploy/apps/weyobe-atlas
chmod +x deploy/*.sh
./deploy/remote-deploy.sh
```

Confirm:

- http://167.172.135.40/
- http://167.172.135.40/api/health

---

## Step 6 — Add GitHub Environment secrets

Environment secrets are **not** visible to the workflow unless the job sets
`environment: <same-name>`. The workflow uses `environment: production`.

1. Repo → **Settings → Environments → New environment**
2. Name it exactly: `production`  
   (If you already created a different name, either rename it to `production`
   or edit `.github/workflows/deploy.yml` so `environment:` matches your name.)
3. Under that environment → **Add environment secret**:

| Secret | Example value |
|---|---|
| `DROPLET_HOST` | `167.172.135.40` |
| `DROPLET_USER` | `deploy` |
| `DROPLET_SSH_KEY` | Full contents of private key file `atlas-deploy` (including `BEGIN` / `END` lines) |
| `DROPLET_PATH` | `/home/deploy/apps/weyobe-atlas` |
| `DROPLET_PORT` | `22` (optional; omit if default) |

Do **not** put the private key in the repo. Repository-level secrets also work if
you prefer — but then remove `environment:` from the job, or keep both in sync.

Delete the local `atlas-deploy` key files from your laptop after storing the secret
if you do not need them elsewhere (keep a backup in a password manager).

---

## Step 7 — Push the workflow to main

Commit and push:

- `.github/workflows/deploy.yml`
- `deploy/remote-deploy.sh`
- `deploy/SETUP_CICD.md` (this file)

Then either:

1. Push any commit to `main`, or
2. GitHub → **Actions → Deploy to DigitalOcean → Run workflow**

Watch the run. On success, the droplet is on the new commit and API/web are rebuilt.

---

## Manual deploy anytime

SSH to the droplet:

```bash
cd /home/deploy/apps/weyobe-atlas
./deploy/remote-deploy.sh
```

Or only API / only web:

```bash
./deploy/restart.sh --api-only
./deploy/restart.sh --web-only
```

---

## Troubleshooting

| Symptom | Check |
|---|---|
| Actions: Permission denied (publickey) | Public key in `~/.ssh/authorized_keys`; secret is the **private** key |
| Actions: git pull auth failed | Step 3 deploy token / deploy key |
| `ff-only` merge failed | Local commits on droplet — `git status`; avoid editing tracked files on the server |
| Web still old | `/var/www/atlas` sync + nginx reload; hard-refresh browser |
| API unhealthy | `pm2 logs atlas-api --lines 80` |
| sudo password prompt | Step 4 sudoers |

---

## Security notes

- Prefer a dedicated `deploy` user (not root).
- Use a **deploy-only** SSH key for Actions; revoke by removing the public key from the droplet.
- Keep `.env` / `apps/web/.env` only on the server (already gitignored).
- Restrict droplet firewall to SSH + 80/443 as needed.
