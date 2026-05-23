# Third-party notices

Globestudio is MIT-licensed (see [LICENSE](./LICENSE)). It bundles the
following third-party works, whose licenses are reproduced below.
Downstream consumers must preserve these notices when redistributing
Globestudio source or built artifacts.

---

## Pixelarticons

UI icons under `src/components/icons.jsx` (every export except the
hand-authored `DottedGlobe` brand mark and the `Twitter` fallback) are
adapted from **Pixelarticons** by Gerrit Halfmann.

- **Upstream**: https://github.com/halfmage/pixelarticons
- **License**: MIT

```
MIT License

Copyright (c) 2019 Gerrit Halfmann

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Geographic atlases

The dotted-map rendering pipeline draws from these published atlases
loaded at build/runtime. None are bundled as source in this repo; they
are pulled in via `package.json` and fetched at runtime where noted.

- **world-atlas** (Mike Bostock) — ISC, https://github.com/topojson/world-atlas
- **us-atlas** (Mike Bostock) — ISC, https://github.com/topojson/us-atlas
- **world-countries** (Mohammed Le Doze) — ODbL, https://mledoze.github.io/countries/
- **dotted-map** (Basile Bruneau) — MIT, https://github.com/NTag/dotted-map

City and river overlays in `public/data/` are sourced from
**Natural Earth** (public domain), https://www.naturalearthdata.com.
