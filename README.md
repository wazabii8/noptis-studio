
# NOPTIS GID Inspector

A small React + Vite application for parsing and validating GID values.  
The application detects a GID type from an input prefix, splits the value into segments based on layout rules, and validates each segment.

## Features

- Detect GID type from prefix
- Segment input according to layout rules
- Validate segment lengths and padding
- Language support (e.g. English / Swedish)
- Live parsing while typing

## Tech Stack

- React
- TypeScript
- Vite
- Custom segmentation helpers

## Project Structure

```

src/
│
├── App.tsx                Main application
├── segments/              Segment definitions & layouts
├── utils/Helpers.ts       Parsing and segmentation helpers
├── i18n/                  Localization helpers
├── components/            UI components (tables, views, etc.)
└── App.css

```

## Installation

Clone repository and install dependencies:

```bash
npm install
````

## Development

Run development server:

```bash
npm run dev
```

Default dev server:

```
http://localhost:5173
```

## Build

Create production build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Core Flow

1. User enters a GID value.
2. Prefix is extracted.
3. Matching GID type is selected.
4. Layout defines how input is segmented.
5. Segments are validated and displayed.

## Example Segmentation Result

Example output:

```
Prefix              9031
THM Number          112
Contractor Number   1234
Vehicle Number      12345
```

Each segment contains:

* key
* extracted value
* label
* validation status

## Future Improvements

* Auto-format input while typing
* Highlight invalid segments
* Copy formatted GID
* Segment visualization
* Import/export layouts

## License

MIT
