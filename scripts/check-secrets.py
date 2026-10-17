"""Report file/line only; never print credential values."""
from pathlib import Path
import re, sys
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
known=set()
for env in [root/'.env',root.parent/'.env']:
    if not env.is_file(): continue
    for line in env.read_text().splitlines():
        if '=' not in line or line.lstrip().startswith('#'): continue
        key,value=line.split('=',1);value=value.strip().strip('"').strip("'")
        if re.search(r'(API_KEY|PASSWORD|AUTH_SECRET|PREVIEW_TOKEN|PRIVATE_KEY)',key) and len(value)>=8: known.add(value)
skip={'node_modules','.git','.svelte-kit','build','__pycache__','static'}
hits=[]
for path in root.rglob('*'):
    if not path.is_file() or path.name.startswith('.env') or any(p in skip for p in path.relative_to(root).parts):continue
    if path.stat().st_size>5_000_000:continue
    try:text=path.read_text()
    except (UnicodeError,OSError):continue
    for i,line in enumerate(text.splitlines(),1):
        if any(value in line for value in known):hits.append(f'{path.relative_to(root)}:{i}')
if hits:
    print('Credential literals found in:');print('\n'.join(hits));sys.exit(1)
print('PASS: no configured secret values in source or documentation.')
