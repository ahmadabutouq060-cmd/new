# NASEEJ place photos

Automated photo collection for the 112 places currently defined in `js/data.js`.

`assets/places/manifest.json` records the selected Wikimedia Commons source, author and license for every downloaded file.

Only openly licensed files are accepted automatically. `match_type=exact` is a strong name match; `match_type=contextual` is a real photo of the surrounding location/experience and should be reviewed before treating it as the exact waypoint image. `NO_MATCH` means no suitable openly licensed image was found.
