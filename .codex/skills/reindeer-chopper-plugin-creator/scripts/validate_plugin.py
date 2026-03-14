#!/usr/bin/env python3
"""Validate a Reindeer Chopper plugin directory."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ALLOWED_TYPES = {"text", "number", "boolean", "select", "filepath"}
ALLOWED_PATH_MODES = {"file", "directory"}
SAFE_ID = re.compile(r"^[A-Za-z0-9_-]+$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate plugin.json and related files for Reindeer Chopper.",
    )
    parser.add_argument("plugin_dir", help="Path to the plugin directory")
    return parser.parse_args()


def load_json(path: Path, label: str, errors: list[str]) -> dict | list | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        errors.append(f"{label} not found: {path}")
    except json.JSONDecodeError as exc:
        errors.append(f"{label} is invalid JSON: {exc}")
    except OSError as exc:
        errors.append(f"Failed to read {label}: {exc}")
    return None


def is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_parameter(param: object, index: int, seen: set[str], errors: list[str]) -> None:
    ctx = f"parameters[{index}]"
    if not isinstance(param, dict):
        errors.append(f"{ctx} must be an object")
        return

    name = param.get("name")
    label = param.get("label")
    ptype = param.get("type")

    if not isinstance(name, str) or not name:
        errors.append(f"{ctx}.name must be a non-empty string")
    elif name in seen:
        errors.append(f"{ctx}.name duplicates another parameter: {name}")
    else:
        seen.add(name)

    if not isinstance(label, str) or not label:
        errors.append(f"{ctx}.label must be a non-empty string")

    if not isinstance(ptype, str) or ptype not in ALLOWED_TYPES:
        errors.append(f"{ctx}.type must be one of {sorted(ALLOWED_TYPES)}")
        return

    if "required" in param and not isinstance(param["required"], bool):
        errors.append(f"{ctx}.required must be boolean when provided")

    if ptype == "select":
        options = param.get("options")
        if not isinstance(options, list) or not options:
            errors.append(f"{ctx}.options must be a non-empty string array for select")
        elif not all(isinstance(item, str) and item for item in options):
            errors.append(f"{ctx}.options must contain only non-empty strings")
    elif ptype == "filepath":
        path_mode = param.get("pathMode")
        if not isinstance(path_mode, str) or path_mode not in ALLOWED_PATH_MODES:
            errors.append(f"{ctx}.pathMode must be 'file' or 'directory' for filepath")

    default = param.get("default")
    if default is None:
        return

    if ptype in {"text", "filepath", "select"} and not isinstance(default, str):
        errors.append(f"{ctx}.default must be string for type '{ptype}'")
    if ptype == "number" and not is_number(default):
        errors.append(f"{ctx}.default must be number for type 'number'")
    if ptype == "boolean" and not isinstance(default, bool):
        errors.append(f"{ctx}.default must be boolean for type 'boolean'")
    if ptype == "select" and isinstance(param.get("options"), list) and default not in param["options"]:
        errors.append(f"{ctx}.default must exist in options for type 'select'")


def validate_runtime(runtime: object, errors: list[str]) -> None:
    if not isinstance(runtime, dict):
        errors.append("runtime must be an object")
        return

    for platform in ("windows", "mac"):
        platform_runtime = runtime.get(platform)
        if not isinstance(platform_runtime, dict):
            errors.append(f"runtime.{platform} must be an object")
            continue

        run_cmd = platform_runtime.get("run")
        if not isinstance(run_cmd, str) or not run_cmd.strip():
            errors.append(f"runtime.{platform}.run must be a non-empty string")

        install_cmd = platform_runtime.get("install")
        if install_cmd is not None and not isinstance(install_cmd, str):
            errors.append(f"runtime.{platform}.install must be string when provided")


def main() -> int:
    args = parse_args()
    plugin_dir = Path(args.plugin_dir).expanduser().resolve()
    errors: list[str] = []

    if not plugin_dir.is_dir():
        print(f"[ERROR] Plugin directory not found: {plugin_dir}")
        return 1

    descriptor_path = plugin_dir / "plugin.json"
    descriptor = load_json(descriptor_path, "plugin.json", errors)
    if not isinstance(descriptor, dict):
        for err in errors:
            print(f"[ERROR] {err}")
        return 1

    plugin_id = descriptor.get("id")
    if not isinstance(plugin_id, str) or not SAFE_ID.fullmatch(plugin_id):
        errors.append("id must match ^[A-Za-z0-9_-]+$")

    for key in ("name", "version"):
        value = descriptor.get(key)
        if not isinstance(value, str) or not value:
            errors.append(f"{key} must be a non-empty string")

    if "description" in descriptor and descriptor["description"] is not None:
        if not isinstance(descriptor["description"], str):
            errors.append("description must be string when provided")

    validate_runtime(descriptor.get("runtime"), errors)

    params = descriptor.get("parameters")
    if not isinstance(params, list):
        errors.append("parameters must be an array")
    else:
        seen_names: set[str] = set()
        for idx, param in enumerate(params):
            validate_parameter(param, idx, seen_names, errors)

    package_json_path = plugin_dir / "package.json"
    if package_json_path.exists():
        package_json = load_json(package_json_path, "package.json", errors)
        if package_json is not None and not isinstance(package_json, dict):
            errors.append("package.json must be a JSON object")

    if errors:
        for err in errors:
            print(f"[ERROR] {err}")
        return 1

    print(f"[OK] Plugin contract valid: {plugin_dir}")
    print(f"     id={plugin_id}, parameters={len(params) if isinstance(params, list) else 0}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
