"""Replace one disposable publication artifact without touching source anatomy.

The repository admits only its explicit `_site` output inside its own boundary.
An explicit external target must be disjoint from that source tree. Acquire and
write a complete candidate before the existing artifact changes; installation
failure restores the previous directory. This operation owns transport only.
"""
from pathlib import Path, PurePosixPath
import os
import shutil
import tempfile


def destination(target, source_root):
    """Resolve a disjoint output while refusing source paths and aliases."""
    root = Path(source_root).resolve()
    lexical = Path(os.path.abspath(target))
    target = lexical.resolve()
    output = root / '_site'
    if lexical.is_symlink():
        raise ValueError('artifact target must not be a symlink')
    # A symlink inside source must not authorize writes outside source either.
    for path in (lexical, target):
        if path == root or path in root.parents:
            raise ValueError('artifact target must be outside living anatomy')
        if root in path.parents and path != output:
            raise ValueError('only the declared _site artifact may be written inside the repository')
    if target.exists() and not target.is_dir():
        raise ValueError('artifact target must be a directory')
    return target


def replace(target, source_root, acquire):
    """Acquire once, stage completely, then install with rollback on failure."""
    target = destination(target, source_root)
    files = acquire()
    for name, data in files.items():
        if (not isinstance(name, str) or not name or PurePosixPath(name).is_absolute()
                or any(part in ('', '.', '..') for part in name.split('/'))
                or '\\' in name or not isinstance(data, bytes)):
            raise ValueError(f'invalid artifact member: {name!r}')
    target.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=f'.{target.name}-stage-', dir=target.parent))
    backup = None
    try:
        for name, data in files.items():
            path = stage / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        # Recheck after acquisition/staging so a changed destination cannot
        # silently become a source alias during ordinary publication work.
        destination(target, source_root)
        if target.exists():
            backup = Path(tempfile.mkdtemp(prefix=f'.{target.name}-previous-', dir=target.parent))
            backup.rmdir()
            os.replace(target, backup)
        try:
            os.replace(stage, target)
        except BaseException:
            if backup is not None:
                os.replace(backup, target)
                backup = None
            raise
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    if backup is not None:
        shutil.rmtree(backup)
    return files
