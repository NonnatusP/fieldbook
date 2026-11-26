# Field Kit

An offline phone app for total station fieldwork. It checks two-face observations against the instrument's specification and computes traverses with a Bowditch adjustment. It installs to the home screen like an app and works with no signal. Everything runs on the device and nothing is uploaded.

## Two-face checker
- Enter face left and face right readings (zenith, horizontal angle, slope distance, horizontal distance) side by side.
- Shows index error, 2C collimation, and slope and horizontal distance differences as you type, flagged against the instrument's tolerances.
- Prism and reflectorless modes, angles in DD.MMSS or decimal degrees.

## Instrument check
- Overall verdict on the instrument from all saved readings.
- Triangle closure (angle sum, reciprocal distances, side check).
- Scatter plot of errors against distance, slope or angle.

## Traverse
- Closed loop and closed link (known end coordinates and closing bearing).
- Angles as angle right, interior clockwise or interior anticlockwise.
- Can fill angles and distances straight from the two-face readings.
- Angular misclosure check, equal angle correction, Bowditch (compass rule) adjustment, linear misclosure and precision.
- Step-by-step workings: angles, bearings, coordinate differences, Bowditch corrections on northings and eastings, final coordinates.
- Sketch of the adjusted traverse with angles, distances and bearings, saved as PNG or SVG.

## Instrument library
- Pick a total station from the list (ComNav, FOIF Android, South, Leica, Trimble, Topcon, Sokkia and others) to set the tolerances, or enter your own.

## Your data
- Export to CSV, back up and restore as JSON, import CSV.
