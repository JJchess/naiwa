"""Export the built static site and a self-contained, non-redirecting preview."""
from pathlib import Path
import base64
import shutil
import zipfile

project = Path(__file__).resolve().parents[1]
dist = project / "dist"
delivery = project.parent / "delivery"
delivery.mkdir(exist_ok=True)

html = (dist / "index.html").read_text()
html = html.replace('<link rel="preload" href="assets/naiwa-graduate.png" as="image">', '')
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + (dist / "style.css").read_text() + '\n</style>')
html = html.replace('<script defer src="assets/gsap.min.js"></script>', '')
html = html.replace('<script defer src="app.js"></script>', '')
for filename, mime in (("naiwa-graduate.png", "image/png"), ("favicon.svg", "image/svg+xml")):
    encoded = base64.b64encode((dist / "assets" / filename).read_bytes()).decode()
    html = html.replace("assets/" + filename, "data:" + mime + ";base64," + encoded)

app = (dist / "app.js").read_text()
app = app.replace("const preview = new URLSearchParams(location.search).get('preview') === '1';", "const preview = true; // Standalone preview: never automatically leave this file.")
scripts = [(dist / "assets/gsap.min.js").read_text(), app]
inline = '\n'.join('<script>\n' + script.replace('</script', '<\\/script') + '\n</script>' for script in scripts)
html = html.replace('</body>', inline + '\n</body>')
(delivery / "naiwa-preview.html").write_text(html)

archive = delivery / "naiwa-website.zip"
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
    for path in sorted(dist.rglob("*")):
        if path.is_file():
            package.write(path, path.relative_to(dist))
shutil.copyfile(project / "DEPLOYMENT.txt", delivery / "DEPLOYMENT.txt")
shutil.copyfile(project / "reference/asset-notes.txt", delivery / "asset-notes.txt")

with zipfile.ZipFile(archive) as package:
    assert package.testzip() is None
    assert "index.html" in package.namelist()
    assert "assets/naiwa-graduate.png" in package.namelist()
assert 'src="assets/' not in html
assert 'href="style.css"' not in html
assert 'const preview = true;' in html
for path in sorted(delivery.iterdir()):
    print(f"{path.name}: {path.stat().st_size:,} bytes")
