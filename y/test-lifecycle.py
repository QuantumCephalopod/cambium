#!/usr/bin/env python3
"""Refuse the actual recurring completed-intake gate, preserve genuine food."""
import importlib.util
from pathlib import Path
import tempfile

spec=importlib.util.spec_from_file_location('current_intake_check',Path(__file__).with_name('check.py'))
checker=importlib.util.module_from_spec(spec);spec.loader.exec_module(checker)
with tempfile.TemporaryDirectory(prefix='intake-completion-') as tmp:
    root=Path(tmp);stomach=root/'_stomach';waste=root/'_waste';stomach.mkdir();waste.mkdir()
    current=stomach/'nutrient.md'
    for status in ('IMPLEMENTED_NATIVE / live owner acceptance pending','PARTIAL / EARNED NATIVE — exact candidate visitor witness pending','IMPLEMENTED_NATIVE / OWNER_PROMOTION_PENDING','IMPLEMENTED_NATIVE'):
        current.write_text('status: '+status+'\n')
        try:checker.check_current_intakes(root)
        except AssertionError:pass
        else:raise AssertionError('completed/personal-gated intake was accepted: '+status)
    for status in ('OPEN / ADMITTED — implementation and visitor witness pending','RESIDUAL / OPEN — authenticated runtime not executable','PARTIAL — one required source parser remains unimplemented'):
        current.write_text('status: '+status+'\n')
        checker.check_current_intakes(root)
    # Fossil pending claims are evidence history, never an active approval queue.
    (waste/'old-nutrient.md').write_text('status: IMPLEMENTED_NATIVE / owner acceptance pending\n')
    (root/'_root').mkdir();(root/'_root/history.json').write_text('{"outcome":"LIVE_ACCEPTANCE_PENDING"}')
    checker.check_current_intakes(root)
    # An independently rooted descendant owns its own direct shell.
    child=root/'nested';(child/'_stomach').mkdir(parents=True)
    (child/'_stomach/nutrient.md').write_text('Status: IMPLEMENTED_NATIVE / OWNER_PROMOTION_PENDING\n')
    checker.check_current_intakes(root)
    try:checker.check_current_intakes(child)
    except AssertionError:pass
    else:raise AssertionError('child-local completed intake escaped its own boundary')
print('PASS — completed/personal-gated intake refused; genuine unresolved food, immutable history and owner-local shells preserved')
