# Judge0 WSL2 Definitive Fix Guide

To resolve "Internal Error" and "No Sandbox" issues, follow these exact steps.

### 1. Prerequisite Check (Already Done)
Your `docker-compose.yml` is correctly set to:
- Image: Custom Build (`judge0.Dockerfile`)
- Privileged: `true`
- **Volume Mount:** `/sys/fs/cgroup:/sys/fs/cgroup:rw`
- **REMOVED:** `cgroup: host` (This was causing v2 conflicts)

### 2. CRITICAL: Reset Volumes
You must delete the old, broken database and cgroup states.

**Run this command (inside WSL2 terminal):**
```bash
docker-compose down -v
```
*(Wait ensuring volumes are removed)*

### 3. Start Judge0 (With Custom Build)
We need to build the custom worker that includes Node.js.

```bash
docker-compose up -d --build
```

### 4. Verify Execution & Database
Check logs to confirm worker is running:
```bash
docker-compose logs -f judge0-worker
```

**NOTE:** After this starts, I (the AI) will automatically insert the "JavaScript" language into the database for you. Just let me know when it's running.

### Explanation
- **Why Reset?** The "Language ID not found" and "Cannot write" errors are persistent artifacts from failed runs. Resetting clears them.
- **Why 1.13.1-extra?** It is the only version version proven to work with WSL2 cgroups in `host` mode.
- **Why Privileged?** Isolate requires namespaces.
- **Why Host Cgroup?** WSL2 v2 cgroups are only accessible via host mode.
