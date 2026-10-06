from __future__ import absolute_import, division, print_function, unicode_literals

import importlib

from .catalog import FeatureInfo


def _import(name):
    try:
        return importlib.import_module(name)
    except ImportError:
        return None


def load_features(root_package, instances, skip=()):
    features = []
    for feature_id in sorted(instances):
        if feature_id in skip:
            continue
        base = '%s.features.%s' % (root_package, feature_id)
        package = _import(base)
        constants = _import(base + '.model.constants')
        features.append(FeatureInfo(
            feature_id,
            _import(base + '.settings'),
            instances[feature_id],
            getattr(package, 'PACKAGE_NAME', None),
            _import(base + '.model.editor'),
            getattr(constants, 'EDITOR_GROUPS', None),
        ))
    return features


def root_package(module_name, marker='.ui.'):
    return module_name.split(marker, 1)[0]
