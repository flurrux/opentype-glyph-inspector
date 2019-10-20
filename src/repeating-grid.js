import { UnboundedCanvasElement } from '@flurrux/declarative-scene-2d';
import strokeWithDefaultTransform from './default-stroke.js';

const getIntervalRange = (start, end, interval) => [
	Math.floor(start / interval),
	Math.ceil(end / interval)
];
const getCameraRect = (canvasWidth, canvasHeight, scale, translation) => {
	const invScale = 1 / scale;
	const xMin = -translation[0];
	const yMin = translation[1] - canvasHeight;
	const xMax = xMin + canvasWidth;
	const yMax = translation[1];
	const boundsScaled = [xMin, yMin, xMax, yMax].map(num => num * invScale);
	return { xMin: boundsScaled[0], yMin: boundsScaled[1], xMax: boundsScaled[2], yMax: boundsScaled[3] };
};

const pathGrid = (ctx, canvasWidth, canvasHeight, scale, translation, cellSize) => {
	const { xMin, yMin, xMax, yMax } = getCameraRect(canvasWidth, canvasHeight, scale, translation);
	const horizontalIntervalRange = getIntervalRange(xMin, xMax, cellSize);
	const verticalIntervalRange = getIntervalRange(yMin, yMax, cellSize);

	const xStart = horizontalIntervalRange[0] * cellSize;
	const xCount = horizontalIntervalRange[1] - horizontalIntervalRange[0];
	const yStart = verticalIntervalRange[0] * cellSize;
	const yCount = verticalIntervalRange[1] - verticalIntervalRange[0];

	for (let i = 0; i < xCount; i++) {
		ctx.save();
		ctx.translate(xStart + i * cellSize, 0);
		ctx.moveTo(0, yMin);
		ctx.lineTo(0, yMax);
		ctx.restore();
	}

	for (let i = 0; i < yCount; i++) {
		ctx.save();
		ctx.translate(0, yStart + i * cellSize);
		ctx.moveTo(xMin, 0);
		ctx.lineTo(xMax, 0);
		ctx.restore();
	}
};
const drawGrid = (ctx, canvasWidth, canvasHeight, scale, translation, cellSize) => {
	ctx.beginPath();
	pathGrid(ctx, canvasWidth, canvasHeight, scale, translation, cellSize);
	strokeWithDefaultTransform(ctx, { lineWidth: 1.4, strokeStyle: "#19191982" });
};
const getLogarithmicRepeatData = (scale, defaultSize, repeatInterval, offset) => {
	const baseLog = Math.log(repeatInterval);
	const normalizedLogPosition = Math.log(scale) / baseLog + offset;
	const floorPow = Math.floor(normalizedLogPosition);
	const floorScale = Math.exp(floorPow * baseLog);
	const size = defaultSize / floorScale;
	return { size, normalizedLogPosition };
};
const drawRepeatingGrid = (ctx, canvasWidth, canvasHeight, scale, translation, defaultCellSize, repeatFactor, offset = 0) => {
	const data = getLogarithmicRepeatData(scale, defaultCellSize, repeatFactor, offset);
	ctx.save();
	ctx.globalAlpha = data.normalizedLogPosition - Math.floor(data.normalizedLogPosition);
	drawGrid(ctx, canvasWidth, canvasHeight, scale, translation, data.size);
	ctx.restore();
};
const pathMainAxes = (ctx, canvasWidth, canvasHeight, scale, translation) => {
	const camRect = getCameraRect(canvasWidth, canvasHeight, scale, translation);
	ctx.moveTo(camRect.xMin, 0);
	ctx.lineTo(camRect.xMax, 0);
	ctx.moveTo(0, camRect.yMin);
	ctx.lineTo(0, camRect.yMax);
};
const drawMainAxes = (ctx, canvasWidth, canvasHeight, scale, translation) => {
	ctx.beginPath();
	pathMainAxes(ctx, canvasWidth, canvasHeight, scale, translation);
	strokeWithDefaultTransform(ctx, { lineWidth: 1.8, strokeStyle: "#393b40" });
};

class RepeatingGrid extends UnboundedCanvasElement {
	renderOnCanvas(ctx, canvas){
		const matrix = this.getCanvasMatrix();
		const translation = matrix.slice(4);
		const scale = matrix[0];
		
		[-0.5, 0].forEach(offset => drawRepeatingGrid(ctx, canvas.width, canvas.height, scale, translation, 30, 5, offset));
		drawMainAxes(ctx, canvas.width, canvas.height, scale, translation);
	}
}
customElements.define("repeating-grid", RepeatingGrid);