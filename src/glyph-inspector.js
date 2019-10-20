
import { LitElement, html, css } from 'lit-element';
import { getGlyphContours, pathContours } from './opentype-util.js';
import * as R from 'ramda';
import './repeating-grid.js';
import {
	DeclarativeScene2dElement, 
	TransformGroupElement, 
	LayoutGroupElement,
	PolylineElement, 
	DiscElement, 
	RectElement,
	UnboundedCanvasElement
} from '@flurrux/declarative-scene-2d';

import * as Vec2 from '@flurrux/array-vector-2d';
import * as Matrix2 from '@flurrux/array-matrix-2d';

const clamp = (min, max, val) => {
    if (val < min) return min;
    if (val > max) return max;
    return val;
};

const FastDiscElement = class extends DiscElement {
	getRenderTransform(matrix) {
		const { radius } = this;
		return Matrix2.multiplyMatrices(matrix, Matrix2.translationMatrix(-radius, -radius));
	}
};
customElements.define("fast-disc-element", FastDiscElement);


import strokeWithDefaultTransform from './default-stroke.js';
const GlyphShapeElement = class extends UnboundedCanvasElement {
	static get properties(){
		return {
			contours: { type: Array }
		}
	}
	constructor(){
		super();
		this.contours = [];
	}
	renderOnCanvas(ctx, canvas) {
		const { contours } = this;
		
		pathContours(ctx, contours);
		ctx.fillStyle = "#7eb334";
		ctx.fill();
		
		const matrix = this.getCanvasMatrix();
		const scale = matrix[0];
		pathContours(ctx, contours);
		strokeWithDefaultTransform(ctx, { lineWidth: clamp(1, 6, scale * 3), strokeStyle: "#4a4644" });
	}
};
customElements.define("glyph-shape", GlyphShapeElement);

const sceneTooltipTemplate = (tooltip) => html`
	<layout-group 
		.transform=${Matrix2.translationMatrix(...tooltip.position)}
		style="pointer-events: none;"	
	>
		<div style="background-color: white; margin: 10px; border: 1px solid black;">
			<table>
				${
					Reflect.ownKeys(tooltip.content).map(key => html`
						<tr>
							<td>${key}</td>
							<td>${tooltip.content[key]}</td>
						</tr>
					`)
				}
			</table>
		</div>
	</layout-group>
`;


class GlyphInspector extends LitElement {
    static get properties(){
        return {
            glyph: { type: Object },
            scale: { type: Number },
            translation: { type: Array },
            tooltip: { type: Object }
        };
    }
    static get styles(){
        return css`
            :host {
                display: block;
            }
            canvas {
                border: 1px solid black;
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
        this.scale = 1;
        this.translation = [0, 0];
		this.tooltip = null;
		this._tooltipSrc = null;
	}
	
	firstUpdated(){
		this._setupNavigation();
	}
    _setupNavigation(){
		const naviEl = this.shadowRoot.querySelector("decl-scene-2d");
		naviEl.addEventListener("mousewheel", e => {
			const { translation, scale } = this;
			const matrix = [scale, 0, 0, -scale, ...translation];
			const scrollAmount = e.deltaY;
			const deltaScale = -scrollAmount * 0.0008;
			const nextScale = scale * (1 + deltaScale);
			const nextScaledMatrix = [nextScale, 0, 0, -nextScale, ...translation];
			
			const naviRect = naviEl.getBoundingClientRect();
			const mousePoint = Vec2.subtract([e.clientX, e.clientY], [naviRect.x, naviRect.y]);

			const localMousePoint = Matrix2.inverseTransformPoint(matrix, Vec2.subtract(mousePoint, matrix.slice(4)));
			const globalPointAfter = Matrix2.transformPoint(nextScaledMatrix, localMousePoint);

			const zoomShift = Vec2.subtract(globalPointAfter, mousePoint);
            const nextTranslation = Vec2.subtract(translation, zoomShift);

			Object.assign(this, { translation: nextTranslation, scale: nextScale });
        });
        let isCanvasMouseDown = false;
		naviEl.addEventListener("mousedown", e => isCanvasMouseDown = true);
        document.addEventListener("mouseup", e => isCanvasMouseDown = false);
        document.addEventListener("mousemove", e => {
            if (!isCanvasMouseDown){
                return;
            }
            e.preventDefault();
			const delta = [e.movementX, e.movementY];
			this.translation = Vec2.add(this.translation, delta);
        });
    }

	render(){
		const { scale, translation, glyph } = this;
		const matrix = [scale, 0, 0, -scale, ...translation];
		const mulPoint = point => Matrix2.transformPoint(matrix, point);
		const contours = glyph.contours;
		const glyphPoints = contours.flat();
		const glyphPointsTransformed = glyphPoints.map(glyphPoint => [glyphPoint.x, glyphPoint.y]).map(mulPoint);
		const contourIndexMap = contours.map((contour, contourIndex) => R.range(0, contour.length).map(() => contourIndex)).flat();
		const bbox = glyph.boundingBox;
		const bboxBottomLeft = Matrix2.transformPoint(matrix, [bbox.xMin, bbox.yMin]);
		const bboxTopRight = Matrix2.transformPoint(matrix, [bbox.xMax, bbox.yMax]);
		const getGlobalScenePoint = mouseEvent => {
			const naviRect = this.shadowRoot.querySelector("decl-scene-2d").getBoundingClientRect();
			return Vec2.subtract([mouseEvent.clientX, mouseEvent.clientY], [naviRect.x, naviRect.y]);
		};

		return html`
			<decl-scene-2d
				style="width: 650px; height: 480px; padding: 10px;"
				.viewportOrigin=${[0, 0]} 
			>
				<transform-group>
					<repeating-grid .transform=${matrix}></repeating-grid>
					
					<glyph-shape
						.transform=${matrix}
						.contours=${contours}
					></glyph-shape>
					
					<polyline-element
						.points=${glyphPointsTransformed}
					></polyline-element>

					<!--bounding box-->
					<transform-group>
						<rect-element
							.normalizedOrigin=${[0, 0.5]}
							.width=${bboxTopRight[0] - bboxBottomLeft[0]}
							.height=${3}
							.transform=${Matrix2.translationMatrix(...bboxBottomLeft)}
							@pointerenter=${(e) => this.tooltip = {
								position: [getGlobalScenePoint(e)[0], bboxBottomLeft[1]],
								content: { yMin: bbox.yMin }
							}}
							@pointerleave=${() => this.tooltip = null}
						></rect-element>
						<rect-element
							.normalizedOrigin=${[0, 0.5]}
							.width=${bboxTopRight[0] - bboxBottomLeft[0]} .height=${3}
							.transform=${Matrix2.translationMatrix(bboxBottomLeft[0], bboxTopRight[1])}
							@pointerenter=${(e) => this.tooltip = {
								position: [getGlobalScenePoint(e)[0], bboxTopRight[1]],
								content: { yMax: bbox.yMax }
							}}
							@pointerleave=${() => this.tooltip = null}
						></rect-element>
						<rect-element
							.normalizedOrigin=${[0.5, 0]}
							.height=${bboxBottomLeft[1] - bboxTopRight[1]} .width=${3}
							.transform=${Matrix2.translationMatrix(bboxBottomLeft[0], bboxTopRight[1])}
							@pointerenter=${(e) => this.tooltip = {
								position: [bboxBottomLeft[0], getGlobalScenePoint(e)[1]],
								content: { xMin: bbox.xMin }
							}}
							@pointerleave=${() => this.tooltip = null}
						></rect-element>
						<rect-element
							.normalizedOrigin=${[0.5, 0]}
							.height=${bboxBottomLeft[1] - bboxTopRight[1]} .width=${3}
							.transform=${Matrix2.translationMatrix(bboxTopRight[0], bboxTopRight[1])}
							@pointerenter=${(e) => this.tooltip = {
								position: [bboxTopRight[0], getGlobalScenePoint(e)[1]],
								content: { xMax: bbox.xMax }
							}}
							@pointerleave=${() => this.tooltip = null}
						></rect-element>
					</transform-group>
					
					${
						glyphPoints.map((glyphPoint, glyphIndex) => html`
							<fast-disc-element
								.transform=${Matrix2.translationMatrix(...glyphPointsTransformed[glyphIndex])} 
								.radius=${clamp(4, 12, scale * 5)} 
								style="--fill-style: ${glyphPoint.onCurve ? "#a6e66e" : "#cf5006"}; will-change: transform;"
								@pointerenter=${e => {
									this.tooltip = {
										position: glyphPointsTransformed[glyphIndex],
										content: {
											x: glyphPoint.x, y: glyphPoint.y, 
											index: glyphIndex, contourIndex: contourIndexMap[glyphIndex],
											onCurve: glyphPoint.onCurve
										}
									};
								}}
								@pointerleave=${e => this.tooltip = null}
							></fast-disc-element>
						`)
					}
					${ this.tooltip ? sceneTooltipTemplate(this.tooltip) : null }
				</transform-group>
			</decl-scene-2d>
		`;
	}
}
customElements.define("glyph-inspector", GlyphInspector);