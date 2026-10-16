from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib, shutil
root=Path(__file__).resolve().parents[1]
delivery=root.parent/'delivery'
delivery.mkdir(exist_ok=True)
target=delivery/'naiwa-campus-sample-v1.zip'
with ZipFile(target,'w',ZIP_DEFLATED) as archive:
    for file in sorted((root/'dist').rglob('*')):
        if file.is_file(): archive.write(file,file.relative_to(root/'dist'))
with ZipFile(target) as archive:
    assert archive.testzip() is None
    assert 'index.html' in archive.namelist()
    assert 'jump/index.html' in archive.namelist()
for name in ['desktop','mobile-1','mobile-2']:
    shutil.copyfile(root/f'public/art/poster-{name}.webp',delivery/f'naiwa-campus-sample-{name}.webp')
digest=hashlib.sha256(target.read_bytes()).hexdigest()
(delivery/'naiwa-campus-sample-v1.sha256').write_text(f'{digest}  {target.name}\n')
print(f'{target}\n{target.stat().st_size / 1024 / 1024:.2f} MiB\nSHA256 {digest}')
