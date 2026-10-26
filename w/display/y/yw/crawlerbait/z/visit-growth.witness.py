#!/usr/bin/env python3
"""Read-only software-GLES witness of actual earned place growth."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

here = Path(__file__).resolve()
spec = importlib.util.spec_from_file_location('gles', here.parents[4] / 'w/locus-shader.gles.test.py')
gles = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gles)
cases = []
for width, height in [(390, 844), (1280, 800)]:
    for visits in (1, 4, 7, 16):
        capture = json.loads(subprocess.check_output([
            'node', str(here.with_name('meal.gles-capture.cjs')),
            str(width), str(height), str(visits)], text=True))
        images, programs = gles.replay(capture.pop('commands'), width, height, min_depth_clears=0)
        assert programs == 3 and len(images) == 1
        pixels = images[0][0]
        assert len({pixels[i:i+4] for i in range(0, len(pixels), 4)}) > 100
        cases.append({'carrier': [width, height], **capture,
                      'pixels_sha256': hashlib.sha256(pixels).hexdigest()})
print(json.dumps({'status': 'PASS', 'cases': cases,
                  'scope': 'Actual source visit prefixes, contained place geometry and real Goo/Ink programs; isolated place, not browser CSS or pointer interaction.'}))
