/**
SVG Path -> THREE Path converter
Only supports SVG <path>'s
Outputs to THREE.Path: https://github.com/mrdoob/three.js/blob/master/src/extras/core/Path.js

MIT Licensed.

@author Ben Barnett @benpbarnett
Version 0.1

Thanks to http://code.google.com/p/canvg/
*/

var SVGToThree = (function() {

	// Array of TRHEE.Vector3's that should be looped through to create a THREE.Geometry()
	this.vectors = [];
	
	function SVGToThree(svgPath) {
		this.svgPath = svgPath;
		return this.generate();
	};
		
	// Base prototype
	var SVGToThreeProto = SVGToThree.prototype;
	
	// Point: http://code.google.com/p/canvg/source/browse/trunk/canvg.js#322
	var Point = (function() {
		
		function Point(x, y) {
			this.x = x;
			this.y = y;
        }

  		var PointProto = Point.prototype;

		PointProto.angleTo = function(p) {
			return Math.atan2(p.y - this.y, p.x - this.x);
		}

		PointProto.applyTransform = function(v) {
			var xp = this.x * v[0] + this.y * v[2] + v[4];
			var yp = this.x * v[1] + this.y * v[3] + v[5];
			this.x = xp;
			this.y = yp;
		}
		
		return Point;
		
	})();
	
	// Bounding Box: http://code.google.com/p/canvg/source/browse/trunk/canvg.js#351
	var BoundingBox = (function() {
		
		function BoundingBox(x1, y1, x2, y2) {
		    // pass in initial points if you want
		    this.x1 = Number.NaN;
		    this.y1 = Number.NaN;
		    this.x2 = Number.NaN;
		    this.y2 = Number.NaN;

		    this.x = function() {
		        return this.x1;
		    }
		    this.y = function() {
		        return this.y1;
		    }
		    this.width = function() {
		        return this.x2 - this.x1;
		    }
		    this.height = function() {
		        return this.y2 - this.y1;
		    }

		    this.addPoint = function(x, y) {
		        if (x != null) {
		            if (isNaN(this.x1) || isNaN(this.x2)) {
		                this.x1 = x;
		                this.x2 = x;
		            }
		            if (x < this.x1) this.x1 = x;
		            if (x > this.x2) this.x2 = x;
		        }

		        if (y != null) {
		            if (isNaN(this.y1) || isNaN(this.y2)) {
		                this.y1 = y;
		                this.y2 = y;
		            }
		            if (y < this.y1) this.y1 = y;
		            if (y > this.y2) this.y2 = y;
		        }
		    }
		    this.addX = function(x) {
		        this.addPoint(x, null);
		    }
		    this.addY = function(y) {
		        this.addPoint(null, y);
		    }

		    this.addBoundingBox = function(bb) {
		        this.addPoint(bb.x1, bb.y1);
		        this.addPoint(bb.x2, bb.y2);
		    }

		    this.addQuadraticCurve = function(p0x, p0y, p1x, p1y, p2x, p2y) {
		        var cp1x = p0x + 2 / 3 * (p1x - p0x);
		        // CP1 = QP0 + 2/3 *(QP1-QP0)
		        var cp1y = p0y + 2 / 3 * (p1y - p0y);
		        // CP1 = QP0 + 2/3 *(QP1-QP0)
		        var cp2x = cp1x + 1 / 3 * (p2x - p0x);
		        // CP2 = CP1 + 1/3 *(QP2-QP0)
		        var cp2y = cp1y + 1 / 3 * (p2y - p0y);
		        // CP2 = CP1 + 1/3 *(QP2-QP0)
		        this.addBezierCurve(p0x, p0y, cp1x, cp2x, cp1y, cp2y, p2x, p2y);
		    }

		    this.addBezierCurve = function(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
		        // from http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
		        var p0 = [p0x, p0y],
		        p1 = [p1x, p1y],
		        p2 = [p2x, p2y],
		        p3 = [p3x, p3y];
		        this.addPoint(p0[0], p0[1]);
		        this.addPoint(p3[0], p3[1]);

		        for (i = 0; i <= 1; i++) {
		            var f = function(t) {
		                return Math.pow(1 - t, 3) * p0[i]
		                + 3 * Math.pow(1 - t, 2) * t * p1[i]
		                + 3 * (1 - t) * Math.pow(t, 2) * p2[i]
		                + Math.pow(t, 3) * p3[i];
		            }

		            var b = 6 * p0[i] - 12 * p1[i] + 6 * p2[i];
		            var a = -3 * p0[i] + 9 * p1[i] - 9 * p2[i] + 3 * p3[i];
		            var c = 3 * p1[i] - 3 * p0[i];

		            if (a == 0) {
		                if (b == 0) continue;
		                var t = -c / b;
		                if (0 < t && t < 1) {
		                    if (i == 0) this.addX(f(t));
		                    if (i == 1) this.addY(f(t));
		                }
		                continue;
		            }

		            var b2ac = Math.pow(b, 2) - 4 * c * a;
		            if (b2ac < 0) continue;
		            var t1 = ( - b + Math.sqrt(b2ac)) / (2 * a);
		            if (0 < t1 && t1 < 1) {
		                if (i == 0) this.addX(f(t1));
		                if (i == 1) this.addY(f(t1));
		            }
		            var t2 = ( - b - Math.sqrt(b2ac)) / (2 * a);
		            if (0 < t2 && t2 < 1) {
		                if (i == 0) this.addX(f(t2));
		                if (i == 1) this.addY(f(t2));
		            }
		        }
		    }

		    this.isPointInBox = function(x, y) {
		        return (this.x1 <= x && x <= this.x2 && this.y1 <= y && y <= this.y2);
		    }

		    this.addPoint(x1, y1);
		    this.addPoint(x2, y2);
		}
		
		return BoundingBox;
		
	})();
	
	// Command list - Array of commands to re-create Path in THREE
	var CommandList = (function() {
		
		function CommandList() {
			// list of command objects
			this.commands = [];
			
			// Taken from Path.js in THREE
			this.PathActions = {

				MOVE_TO: 'moveTo',
				LINE_TO: 'lineTo',
				QUADRATIC_CURVE_TO: 'quadraticCurveTo', // Bezier quadratic curve
				BEZIER_CURVE_TO: 'bezierCurveTo', 		// Bezier cubic curve
				CSPLINE_THRU: 'splineThru',				// Catmull-rom spline
				ARC: 'arc'								// Circle

			};
		};
		
		var CommandListProto = CommandList.prototype;
		
		CommandListProto.add = function(action, params) {
			var action = this.PathActions[action] || null;
				
			if (action) {
				this.commands.push({
					action: action,
					params: params
				});
			}
			
			return this;
		};
		
		
		CommandListProto.getCommands = function() {
			return this.commands;
		};
		
		
		return CommandList;
		
	})();
	
	// Path: http://code.google.com/p/canvg/source/browse/trunk/canvg.js#1086
	var Path = (function() {
		
		function Path(d) {		
			
			// TODO: convert to real lexer based on http://www.w3.org/TR/SVG11/paths.html#PathDataBNF
            d = d.replace(/,/gm,' '); // get rid of all commas
            d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from commands
            d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from commands
            d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([^\s])/gm,'$1 $2'); // separate commands from points
            d = d.replace(/([^\s])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from points
            d = d.replace(/([0-9])([+\-])/gm,'$1 $2'); // separate digits when no comma
            d = d.replace(/(\.[0-9]*)(\.)/gm,'$1 $2'); // separate digits when no comma
            d = d.replace(/([Aa](\s+[0-9]+){3})\s+([01])\s*([01])/gm,'$1 $3 $4 '); // shorthand elliptical arc path syntax
            d = SVGToThreeProto.compressSpaces(d); // compress multiple spaces
            d = SVGToThreeProto.trim(d);
			
			// PathParser
			this.PathParser = new (function(d) {
			    this.tokens = d.split(' ');

	            this.reset = function() {
	                    this.i = -1;
	                    this.command = '';
	                    this.previousCommand = '';
	                    this.start = new Point(0, 0);
	                    this.control = new Point(0, 0);
	                    this.current = new Point(0, 0);
	                    this.points = [];
	                    this.angles = [];
	            }

	            this.isEnd = function() {
	                    return this.i >= this.tokens.length - 1;
	            }

	            this.isCommandOrEnd = function() {
	                    if (this.isEnd()) return true;
	                    return this.tokens[this.i + 1].match(/^[A-Za-z]$/) != null;
	            }

	            this.isRelativeCommand = function() {
	                    switch(this.command)
	                    {
	                            case 'm':
	                            case 'l':
	                            case 'h':
	                            case 'v':
	                            case 'c':
	                            case 's':
	                            case 'q':
	                            case 't':
	                            case 'a':
	                            case 'z':
	                                    return true;
	                                    break;
	                    }
	                    return false;
	            }

	            this.getToken = function() {
	                    this.i++;
	                    return this.tokens[this.i];
	            }

	            this.getScalar = function() {
	                    return parseFloat(this.getToken());
	            }

	            this.nextCommand = function() {
	                    this.previousCommand = this.command;
	                    this.command = this.getToken();
	            }                               

	            this.getPoint = function() {
	                    var p = new Point(this.getScalar(), this.getScalar());
	                    return this.makeAbsolute(p);
	            }

	            this.getAsControlPoint = function() {
	                    var p = this.getPoint();
	                    this.control = p;
	                    return p;
	            }

	            this.getAsCurrentPoint = function() {
	                    var p = this.getPoint();
	                    this.current = p;
	                    return p;       
	            }

	            this.getReflectedControlPoint = function() {
	                    if (this.previousCommand.toLowerCase() != 'c' && this.previousCommand.toLowerCase() != 's') {
	                            return this.current;
	                    }

	                    // reflect point
	                    var p = new Point(2 * this.current.x - this.control.x, 2 * this.current.y - this.control.y);                                        
	                    return p;
	            }

	            this.makeAbsolute = function(p) {
	                    if (this.isRelativeCommand()) {
	                            p.x += this.current.x;
	                            p.y += this.current.y;
	                    }
	                    return p;
	            }

	            this.addMarker = function(p, from, priorTo) {
	                    // if the last angle isn't filled in because we didn't have this point yet ...
	                    if (priorTo != null && this.angles.length > 0 && this.angles[this.angles.length-1] == null) {
	                            this.angles[this.angles.length-1] = this.points[this.points.length-1].angleTo(priorTo);
	                    }
	                    this.addMarkerAngle(p, from == null ? null : from.angleTo(p));
	            }

	            this.addMarkerAngle = function(p, a) {
	                    this.points.push(p);
	                    this.angles.push(a);
	            }                               

	            this.getMarkerPoints = function() { return this.points; }
	            this.getMarkerAngles = function() {
	                    for (var i=0; i<this.angles.length; i++) {
	                            if (this.angles[i] == null) {
	                                    for (var j=i+1; j<this.angles.length; j++) {
	                                            if (this.angles[j] != null) {
	                                                    this.angles[i] = this.angles[j];
	                                                    break;
	                                            }
	                                    }
	                            }
	                    }
	                    return this.angles;
	            }
	    	})(d);
		
		};
		
		var PathProto = Path.prototype;
		
		PathProto.process = function() {
		    var pp = this.PathParser;
		    pp.reset();

		    var bb = new BoundingBox(),
				cl = new CommandList();

		    while (!pp.isEnd()) {
		        pp.nextCommand();
		        switch (pp.command) {
		        case 'M':
		        case 'm':
		            var p = pp.getAsCurrentPoint();
		            pp.addMarker(p);
		            bb.addPoint(p.x, p.y);
		            // if (ctx != null) ctx.moveTo(p.x, p.y);
					cl.add('MOVE_TO', p.x, p.y);
		
		            pp.start = pp.current;
		            while (!pp.isCommandOrEnd()) {
		                var p = pp.getAsCurrentPoint();
		                pp.addMarker(p, pp.start);
		                bb.addPoint(p.x, p.y);
		                // if (ctx != null) ctx.lineTo(p.x, p.y);
						cl.add('LINE_TO', p.x, p.y);
		            }
		            break;
		        case 'L':
		        case 'l':
		            while (!pp.isCommandOrEnd()) {
		                var c = pp.current;
		                var p = pp.getAsCurrentPoint();
		                pp.addMarker(p, c);
		                bb.addPoint(p.x, p.y);
		                // if (ctx != null) ctx.lineTo(p.x, p.y);
						cl.add('LINE_TO', p.x, p.y);
		            }
		            break;
		        case 'H':
		        case 'h':
		            while (!pp.isCommandOrEnd()) {
		                var newP = new Point((pp.isRelativeCommand() ? pp.current.x: 0) + pp.getScalar(), pp.current.y);
		                pp.addMarker(newP, pp.current);
		                pp.current = newP;
		                bb.addPoint(pp.current.x, pp.current.y);
		                // if (ctx != null) ctx.lineTo(pp.current.x, pp.current.y);
						cl.add('LINE_TO', pp.current.x, pp.current.y);
		            }
		            break;
		        case 'V':
		        case 'v':
		            while (!pp.isCommandOrEnd()) {
		                var newP = new Point(pp.current.x, (pp.isRelativeCommand() ? pp.current.y: 0) + pp.getScalar());
		                pp.addMarker(newP, pp.current);
		                pp.current = newP;
		                bb.addPoint(pp.current.x, pp.current.y);
		                // if (ctx != null) ctx.lineTo(pp.current.x, pp.current.y);
						cl.add('LINE_TO', pp.current.x, pp.current.y);
		            }
		            break;
		        case 'C':
		        case 'c':
		            while (!pp.isCommandOrEnd()) {
		                var curr = pp.current;
		                var p1 = pp.getPoint();
		                var cntrl = pp.getAsControlPoint();
		                var cp = pp.getAsCurrentPoint();
		                pp.addMarker(cp, cntrl, p1);
		                bb.addBezierCurve(curr.x, curr.y, p1.x, p1.y, cntrl.x, cntrl.y, cp.x, cp.y);
		                // if (ctx != null) ctx.bezierCurveTo(p1.x, p1.y, cntrl.x, cntrl.y, cp.x, cp.y);
						cl.add('BEZIER_CURVE_TO', p1.x, p1.y, cntrl.x, cntrl.y, cp.x, cp.y);
		            }
		            break;
		        case 'S':
		        case 's':
		            while (!pp.isCommandOrEnd()) {
		                var curr = pp.current;
		                var p1 = pp.getReflectedControlPoint();
		                var cntrl = pp.getAsControlPoint();
		                var cp = pp.getAsCurrentPoint();
		                pp.addMarker(cp, cntrl, p1);
		                bb.addBezierCurve(curr.x, curr.y, p1.x, p1.y, cntrl.x, cntrl.y, cp.x, cp.y);
		                // if (ctx != null) ctx.bezierCurveTo(p1.x, p1.y, cntrl.x, cntrl.y, cp.x, cp.y);
						cl.add('BEZIER_CURVE_TO', p1.x, p1.y, cntrl.x, cntrl.y, cp.x, cp.y);
		            }
		            break;
		        case 'Q':
		        case 'q':
		            while (!pp.isCommandOrEnd()) {
		                var curr = pp.current;
		                var cntrl = pp.getAsControlPoint();
		                var cp = pp.getAsCurrentPoint();
		                pp.addMarker(cp, cntrl, cntrl);
		                bb.addQuadraticCurve(curr.x, curr.y, cntrl.x, cntrl.y, cp.x, cp.y);
		                // if (ctx != null) ctx.quadraticCurveTo(cntrl.x, cntrl.y, cp.x, cp.y);
						cl.add('QUADRATIC_CURVE_TO', cntrl.x, cntrl.y, cp.x, cp.y);
		            }
		            break;
		        case 'T':
		        case 't':
		            while (!pp.isCommandOrEnd()) {
		                var curr = pp.current;
		                var cntrl = pp.getReflectedControlPoint();
		                pp.control = cntrl;
		                var cp = pp.getAsCurrentPoint();
		                pp.addMarker(cp, cntrl, cntrl);
		                bb.addQuadraticCurve(curr.x, curr.y, cntrl.x, cntrl.y, cp.x, cp.y);
		                // if (ctx != null) ctx.quadraticCurveTo(cntrl.x, cntrl.y, cp.x, cp.y);
						cl.add('QUADRATIC_CURVE_TO', cntrl.x, cntrl.y, cp.x, cp.y);
		            }
		            break;
		        case 'A':
		        case 'a':
		            while (!pp.isCommandOrEnd()) {
		                var curr = pp.current;
		                var rx = pp.getScalar();
		                var ry = pp.getScalar();
		                var xAxisRotation = pp.getScalar() * (Math.PI / 180.0);
		                var largeArcFlag = pp.getScalar();
		                var sweepFlag = pp.getScalar();
		                var cp = pp.getAsCurrentPoint();

		                // Conversion from endpoint to center parameterization
		                // http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
		                // x1', y1'
		                var currp = new Point(
		                Math.cos(xAxisRotation) * (curr.x - cp.x) / 2.0 + Math.sin(xAxisRotation) * (curr.y - cp.y) / 2.0,
		                -Math.sin(xAxisRotation) * (curr.x - cp.x) / 2.0 + Math.cos(xAxisRotation) * (curr.y - cp.y) / 2.0
		                );
		                // adjust radii
		                var l = Math.pow(currp.x, 2) / Math.pow(rx, 2) + Math.pow(currp.y, 2) / Math.pow(ry, 2);
		                if (l > 1) {
		                    rx *= Math.sqrt(l);
		                    ry *= Math.sqrt(l);
		                }
		                // cx', cy'
		                var s = (largeArcFlag == sweepFlag ? -1: 1) * Math.sqrt(
		                ((Math.pow(rx, 2) * Math.pow(ry, 2)) - (Math.pow(rx, 2) * Math.pow(currp.y, 2)) - (Math.pow(ry, 2) * Math.pow(currp.x, 2))) /
		                (Math.pow(rx, 2) * Math.pow(currp.y, 2) + Math.pow(ry, 2) * Math.pow(currp.x, 2))
		                );
		                if (isNaN(s)) s = 0;
		                var cpp = new Point(s * rx * currp.y / ry, s * -ry * currp.x / rx);
		                // cx, cy
		                var centp = new Point(
		                (curr.x + cp.x) / 2.0 + Math.cos(xAxisRotation) * cpp.x - Math.sin(xAxisRotation) * cpp.y,
		                (curr.y + cp.y) / 2.0 + Math.sin(xAxisRotation) * cpp.x + Math.cos(xAxisRotation) * cpp.y
		                );
		                // vector magnitude
		                var m = function(v) {
		                    return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2));
		                }
		                // ratio between two vectors
		                var r = function(u, v) {
		                    return (u[0] * v[0] + u[1] * v[1]) / (m(u) * m(v))
		                }
		                // angle between two vectors
		                var a = function(u, v) {
		                    return (u[0] * v[1] < u[1] * v[0] ? -1: 1) * Math.acos(r(u, v));
		                }
		                // initial angle
		                var a1 = a([1, 0], [(currp.x - cpp.x) / rx, (currp.y - cpp.y) / ry]);
		                // angle delta
		                var u = [(currp.x - cpp.x) / rx, (currp.y - cpp.y) / ry];
		                var v = [( - currp.x - cpp.x) / rx, ( - currp.y - cpp.y) / ry];
		                var ad = a(u, v);
		                if (r(u, v) <= -1) ad = Math.PI;
		                if (r(u, v) >= 1) ad = 0;

		                if (sweepFlag == 0 && ad > 0) ad = ad - 2 * Math.PI;
		                if (sweepFlag == 1 && ad < 0) ad = ad + 2 * Math.PI;

		                // for markers
		                var halfWay = new Point(
		                centp.x - rx * Math.cos((a1 + ad) / 2),
		                centp.y - ry * Math.sin((a1 + ad) / 2)
		                );
		                pp.addMarkerAngle(halfWay, (a1 + ad) / 2 + (sweepFlag == 0 ? 1: -1) * Math.PI / 2);
		                pp.addMarkerAngle(cp, ad + (sweepFlag == 0 ? 1: -1) * Math.PI / 2);

		                bb.addPoint(cp.x, cp.y);
		
		
						// TODO: Add support
		                // TODO: this is too naive, make it better
		                // if (ctx != null) {
		                // 		                    var r = rx > ry ? rx: ry;
		                // 		                    var sx = rx > ry ? 1: rx / ry;
		                // 		                    var sy = rx > ry ? ry / rx: 1;
		                // 
		                // 		                    ctx.translate(centp.x, centp.y);
		                // 		                    ctx.rotate(xAxisRotation);
		                // 		                    ctx.scale(sx, sy);
		                // 		                    ctx.arc(0, 0, r, a1, a1 + ad, 1 - sweepFlag);
		                // 		                    ctx.scale(1 / sx, 1 / sy);
		                // 		                    ctx.rotate( - xAxisRotation);
		                // 		                    ctx.translate( - centp.x, -centp.y);
		                // 		                }
		            }
		            break;
		        case 'Z':
		        case 'z':
		            // if (ctx != null) ctx.closePath();
		            pp.current = pp.start;
		        }
		    }
		
			// console.log(pp);

		    return cl.getCommands();
		};
		
		PathProto.getMarkers = function() {
	        var points = this.PathParser.getMarkerPoints();
	        var angles = this.PathParser.getMarkerAngles();

	        var markers = [];
	        for (var i=0; i<points.length; i++) {
	        	markers.push([points[i], angles[i]]);
	        }
	        return markers;
        };
		
		return Path;
		
	})();
	

	
	
	// trim
	SVGToThreeProto.trim = function(s) { return s.replace(/^\s+|\s+$/g, ''); }

	// compress spaces
	SVGToThreeProto.compressSpaces = function(s) { return s.replace(/[\s\r\t\n]+/gm,' '); }
	
	// generator
	SVGToThreeProto.generate = function() {
		return new Path(this.svgPath).process();
	};
	
	
	return SVGToThree;
	
})();