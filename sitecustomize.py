"""Compatibility shims for legacy third-party packages used in local tooling."""

import inspect


if not hasattr(inspect, "getargspec"):
    inspect.getargspec = inspect.getfullargspec
