import './glyph-gallery.js';
import './glyph-inspector.js';
import { render, html } from 'lit-html';
import { loadOpentypeAsync, getGlyphArray, getGlyphContours } from './opentype-util.js';


const normalizeBoundingBox = boundingBox => {
    return {
        xMin: boundingBox.x1,
        yMin: boundingBox.y1,
        xMax: boundingBox.x2,
        yMax: boundingBox.y2
    };
};

const fontUrl = "https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/fonts/KaTeX_Size4-Regular.ttf";
loadOpentypeAsync(fontUrl).then(font => {
    const glyphs = getGlyphArray(font).map(glyph => {
        return {
            index: glyph.index,
            contours: getGlyphContours(glyph),
            name: glyph.name, unicode: glyph.unicode,
            boundingBox: normalizeBoundingBox(glyph.getBoundingBox())
        }
    });
    const glyph = glyphs[10];
    // render(html`<glyph-gallery .glyphs=${glyphs}></glyph-gallery>`, document.querySelector("#page"));
    render(html`<glyph-inspector .glyph=${glyph}></glyph-inspector>`, document.querySelector("#page"));
});
