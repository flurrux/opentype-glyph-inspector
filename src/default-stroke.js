const strokeWithDefaultTransform = (ctx, style = {}) => {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	Object.assign(ctx, style);
	ctx.stroke();
	ctx.restore();
};
export default strokeWithDefaultTransform;