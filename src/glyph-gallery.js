import { LitElement, html, css } from 'lit-element';
import { getGlyphContours, pathContours } from './opentype-util.js';

const getRectFittingScale = (rect, availableSpaceRect) => {
    const aspectRatio = rect[1] / rect[0];
    const availableAspectRatio = availableSpaceRect[1] / availableSpaceRect[0];
    const scaleIndex = aspectRatio < availableAspectRatio ? 0 : 1;
    return availableSpaceRect[scaleIndex] / rect[scaleIndex];
};
const getCenteringPosition = (rect, availableSpaceRect) => [0, 1].map(ind => (availableSpaceRect[ind] - rect[ind]) / 2);

class GlyphItem extends LitElement {
    static get properties(){
        return {
            glyph: { type: Object }
        };
    }
    static get styles(){
        return css`
            :host {
                display: inline-block;
                border: 1px solid gray;
            }
        `;
    }
    constructor(){
        super();
        this.glyph = {
            index: -1,
            contours: [],
            boundingBox: {
                xMin: 0, xMax: 0,
                yMin: 0, yMax: 0
            },
            name: "",
            unicode: -1
        };
    }
    firstUpdated(){
        const canvas = this.shadowRoot.querySelector("canvas");
        const ctx = canvas.getContext("2d");
        this._renderGlyph(ctx, canvas);
    }
    _renderGlyph(ctx, canvas){
        const contours = this.glyph.contours;
        if (contours.length === 0){
            return;
        }
        const boundingBox = this.glyph.boundingBox;
        const boundingRect = [
            boundingBox.xMax - boundingBox.xMin,
            boundingBox.yMax - boundingBox.yMin
        ];
        const margin = 10;
        const canvasRect = [100, 100];
        const canvasMarginRect = [canvasRect[0] - margin, canvasRect[1] - margin];
        const fittingScale = getRectFittingScale(boundingRect, canvasMarginRect);
        const scaledBoundingRect = boundingRect.map(num => num * fittingScale);
        const centering = getCenteringPosition(scaledBoundingRect, canvasRect);
        const translation = [
            centering[0] - boundingBox.xMin * fittingScale,
            centering[1] - boundingBox.yMin * fittingScale
        ];
        ctx.save();
        ctx.setTransform(fittingScale, 0, 0, fittingScale, ...translation);
        
        pathContours(ctx, contours);
        ctx.fill();

        ctx.restore();
    }
    render(){
        return html`
            <div style="display: flex; flex-direction: column;">
                <canvas width=100 height=100></canvas>
                <div style="text-align: center;">${this.glyph.index}</div>
            </div>
        `;
    }
}
customElements.define("glyph-item", GlyphItem);

class GlyphGallery extends LitElement {
    static get properties(){
        return {
            glyphs: { type: Array }
        };
    }
    static get styles(){
        return css``;
    }
    constructor(){
        super();
        this.glyphs = [];
    }
    _glyphItemTemplate(glyph){
        return html`
            <glyph-item 
                .glyph=${glyph}
                style="margin: 10px;"
            ></glyph-item>`;
    }
    render(){
        return html`
            <div>
                ${ this.glyphs.map(this._glyphItemTemplate.bind(this)) }
            </div>
        `;
    }
}
customElements.define("glyph-gallery", GlyphGallery);