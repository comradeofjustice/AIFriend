"""Check the Git index without printing secret values or reading production data."""
from pathlib import Path
import argparse
import re
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--private-env", action="append", default=[], help="Private env path outside the repository; values are never printed")
args = parser.parse_args()
root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
paths = subprocess.check_output(["git", "ls-files", "--cached", "-z"], cwd=root).decode().split("\0")
known = set()
for name in args.private_env:
    for line in Path(name).read_text().splitlines():
        if "=" not in line or line.lstrip().startswith("#"):
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")
        if re.search(r"KEY|PASSWORD|SECRET|TOKEN", key, re.I) and len(value) >= 8:
            known.add(value.encode())

patterns = {
    "private-key": rb"-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----",
    "github-token": rb"(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})",
    "aws-access-key": rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b",
    "slack-token": rb"\bxox[baprs]-[A-Za-z0-9-]{20,}",
    "api-token": rb"\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}",
}
findings = set()
count = 0
for relative in filter(None, paths):
    path = Path(relative)
    name = path.name
    prohibited = (
        (name.startswith(".env") and name != ".env.example")
        or name in {"env.txt", "id_rsa", "id_ed25519"}
        or any(part in {"node_modules", "build", ".svelte-kit", ".data", "backups", ".ssh"} for part in path.parts)
        or re.search(r"\.(?:sqlite(?:-wal|-shm)?|db|pem|key|p12|pfx|tgz|log)$", name)
    )
    if prohibited:
        findings.add((relative, 0, "private-runtime-file"))
    data = subprocess.check_output(["git", "show", ":" + relative], cwd=root)
    count += 1
    for secret in known:
        index = data.find(secret)
        if index >= 0:
            findings.add((relative, data[:index].count(b"\n") + 1, "configured-secret"))
    for label, pattern in patterns.items():
        for match in re.finditer(pattern, data):
            findings.add((relative, data[:match.start()].count(b"\n") + 1, label))
if findings:
    print("FAIL: review these staged paths; credential values are intentionally hidden.")
    for path, line, label in sorted(findings):
        print(f"{path}:{line} [{label}]")
    sys.exit(1)
print(f"PASS: {count} tracked files; no forbidden runtime files, configured secrets or recognized credential tokens.")
