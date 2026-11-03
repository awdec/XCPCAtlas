import hashlib
import json
import shutil
from pathlib import Path

root = Path(__file__).resolve().parent.parent
baseline = json.loads((root / "output/import-2021-baseline.json").read_text(encoding="utf-8"))
for name in ("web/public/data/2024/final.json", "web/public/data/2024/xian.json"):
    path = root / name
    data = path.read_bytes().replace(b"\r\n", b"\n").rstrip(b"\r\n")
    crlf = data.replace(b"\n", b"\r\n")
    variants = (data, data + b"\n", crlf, crlf + b"\r\n")
    matches = [v for v in variants if hashlib.sha256(v).hexdigest() == baseline[name]]
    assert matches, name
    path.write_bytes(matches[0])
    shutil.copyfile(path, root / name.replace("web/public/", "web/dist/"))
    print(name, "restored exact baseline and synchronized build")
