
/*eslint-disable */
// Determine the distance from x to [left, right].
// import utils from 'dygraphs-commonjs/utils';
function pageX(e) {
  return (!e.pageX || e.pageX < 0) ? 0 : e.pageX;
}
function pageY(e) {
  return (!e.pageY || e.pageY < 0) ? 0 : e.pageY;
}
function dragGetX_(e, context) {
  return pageX(e) - context.px;
}
function dragGetY_(e, context) {
  return pageY(e) - context.py;
}

// Called in response to an interaction model operation that
// responds to an event that starts zooming.
//
// It's used in the default callback for "mousedown" operations.
// Custom interaction model builders can use it to provide the default
// zooming behavior.
//
export function startZoom(event, g, context) {
  context.isZooming = true;
}

// Called in response to an interaction model operation that
// responds to an event that defines zoom boundaries.
//
// It's used in the default callback for "mousemove" operations.
// Custom interaction model builders can use it to provide the default
// zooming behavior.
//
export function drawZoomRect_(startX, endX, startY, endY,
                                           prevEndX, prevEndY) {
  var ctx = this.canvas_.getContext("2d");

  // Clean up from the previous rect if necessary
  ctx.clearRect(Math.min(startX, prevEndX), Math.min(startY, prevEndY),
                Math.abs(startX - prevEndX), Math.abs(startY - prevEndY));

  // Draw a light-grey rectangle to show the new viewing area
  if (endX && startX && endY && startY) {
    ctx.fillStyle = "rgba(128,128,128,0.33)";
    ctx.fillRect(Math.min(startX, endX), Math.min(startY, endY),
                 Math.abs(endX - startX), Math.abs(endY - startY));
  }
}

export function moveZoom(event, g, context) {
  context.dragEndX = dragGetX_(event, context);
  context.dragEndY = dragGetY_(event, context);

  var xDelta = Math.abs(context.dragStartX - context.dragEndX);
  var yDelta = Math.abs(context.dragStartY - context.dragEndY);

  g.drawZoomRect_(
      context.dragStartX,
      context.dragEndX,
      context.dragStartY,
      context.dragEndY,
      context.prevEndX,
      context.prevEndY);

  context.prevEndX = context.dragEndX;
  context.prevEndY = context.dragEndY;
}

export function doZoom_(lowX, highX, lowY, highY) {
  // Find the earliest and latest dates contained in this canvasx range.
  // Convert the call to date ranges of the raw data.
  var minDate = this.toDataXCoord(lowX);
  var maxDate = this.toDataXCoord(highX);

  this.dateWindow_ = [minDate, maxDate];
  this.zoomed_x_ = true;

  // Find the highest and lowest values in pixel range for each axis.
  // Note that lowY (in pixels) corresponds to the max Value (in data coords).
  // This is because pixels increase as you go down on the screen, whereas data
  // coordinates increase as you go up the screen.
  var valueRanges = [];
  for (var i = 0; i < this.axes_.length; i++) {
    var hi = this.toDataYCoord(lowY, i);
    var low = this.toDataYCoord(highY, i);
    this.axes_[i].valueWindow = [low, hi];
    valueRanges.push([low, hi]);
  }

  this.zoomed_y_ = true;

  if (this.attr_("zoomCallback")) {
    this.attr_("zoomCallback")(minDate, maxDate, this.yAxisRanges());
  }
  this.drawGraph_();
}

// Called in response to an interaction model operation that
// responds to an event that performs a zoom based on previously defined
// bounds..
//
// It's used in the default callback for "mouseup" operations.
// Custom interaction model builders can use it to provide the default
// zooming behavior.
//
export function endZoom(event, g, context) {
  context.isZooming = false;
  context.dragEndX = dragGetX_(event, context);
  context.dragEndY = dragGetY_(event, context);
  var regionWidth = Math.abs(context.dragEndX - context.dragStartX);
  var regionHeight = Math.abs(context.dragEndY - context.dragStartY);

  if (regionWidth < 2 && regionHeight < 2 &&
      g.lastx_ != undefined && g.lastx_ != -1) {
    // TODO(danvk): pass along more info about the points, e.g. 'x'
    if (g.attr_('clickCallback') != null) {
      g.attr_('clickCallback')(event, g.lastx_, g.selPoints_);
    }
    if (g.attr_('pointClickCallback')) {
      // check if the click was on a particular point.
      var closestIdx = -1;
      var closestDistance = 0;
      for (var i = 0; i < g.selPoints_.length; i++) {
        var p = g.selPoints_[i];
        var distance = Math.pow(p.canvasx - context.dragEndX, 2) +
                       Math.pow(p.canvasy - context.dragEndY, 2);
        if (closestIdx == -1 || distance < closestDistance) {
          closestDistance = distance;
          closestIdx = i;
        }
      }

      // Allow any click within two pixels of the dot.
      var radius = g.attr_('highlightCircleSize') + 2;
      if (closestDistance <= 5 * 5) {
        g.attr_('pointClickCallback')(event, g.selPoints_[closestIdx]);
      }
    }
  }
  if (regionWidth >= 10 && regionHeight >= 10) {
    g.doZoom_(Math.min(context.dragStartX, context.dragEndX),
              Math.max(context.dragStartX, context.dragEndX),
              Math.min(context.dragStartY, context.dragEndY),
              Math.max(context.dragStartY, context.dragEndY));
  } else {
    g.canvas_.getContext("2d").clearRect(0, 0,
                                       g.canvas_.width,
                                       g.canvas_.height);
  }
  context.dragStartX = null;
  context.dragStartY = null;
}

