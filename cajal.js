/**
 * cajal is a javascript library for drawing and animating pixelgrahics
 * on the canvas element as specified in the html5 standard.
 * Being completely object orientated you can draw the same item objects an animations
 * to several cajal instances, each linked with a different canvas element.
 *
 *
 * @author Robert Fleischmann
 * @version 1.0.1
 */
(function() {
    /**
     * Constructor for a new cajal instance
     * @param element id of the canvas element or the DOM-object that should be drawn on
     * @return cajal instance
     */
    var cajal = this.cajal = function(element, options) {
        this.init(element, options);
    };

    /**
     * Copy of the extend function from jquery to combine multiple objects
     * @param objects to combine
     * @return combined object
     */
    cajal.extend = function() {
        // copy reference to target object
        var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;

        // Handle a deep copy situation
        if (typeof target === "boolean") {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if (typeof target !== "object" && !cajal.isFunction(target)) {
            target = {};
        }

        // extend cajal itself if only one argument is passed
        if (length === i) {
            target = this;
            --i;
        }

        for ( ; i < length; i++) {
            // Only deal with non-null/undefined values
            if ((options = arguments[i]) !== null) {
                // Extend the base object
                for (name in options) {
                    src = target[name];
                    copy = options[name];

                    // Prevent never-ending loop
                    if (target === copy) {
                        continue;
                    }

                    // Recurse if we're merging object literal values or arrays
                    if (deep && copy && (cajal.isPlainObject(copy) || cajal.isArray(copy))) {
                        var clone = src && (cajal.isPlainObject(src) || cajal.isArray(src)) ? src
                            : cajal.isArray(copy) ? [] : {};

                        // Never move original objects, clone them
                        target[name] = cajal.extend(deep, clone, copy);

                    // Don't bring in undefined values
                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    };

    //extend the cajal object with static funcitons
    cajal.extend({

        isEmptyObject: function(obj) {
            for (var name in obj) {
                return false;
            }
            return true;
        },

        isFunction: function(obj) {
            return Object.prototype.toString.call(obj) === "[object Function]";
        },

        isArray: function(obj) {
            return Object.prototype.toString.call(obj) === "[object Array]";
        },

        isPlainObject: function(obj) {
            // Must be an Object.
            // Because of IE, we also have to check the presence of the constructor property.
            // Make sure that DOM nodes and window objects don't pass through, as well
            if (!obj || Object.prototype.toString.call(obj) !== "[object Object]" || obj.nodeType || obj.setInterval) {
                return false;
            }

            // Not own constructor property must be Object
            if (obj.constructor
                && !Object.prototype.hasOwnProperty.call(obj, "constructor")
                && !Object.prototype.hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf")) {
                return false;
            }

            // Own properties are enumerated firstly, so to speed up,
            // if last one is own, then all properties are own.

            var key;
            for (key in obj) {}

            return key === undefined || Object.prototype.hasOwnProperty.call(obj, key);
        }
    });

    /**
     * Default options for cajal
     */
    var defaultOptions = {
        /**
         * flag weather the canvas will be cleared before each call of the draw method
         */
        autoClearCanvas: true,

        /**
         * Global Alpha (will be applied to all objects drawn on the canvas)
         */
        globalAlpha: 1,

        /**
         * Global composite operation
         * valid values: source-over, source-atop, source-in, source-out, destination-atop, destination-in, destination-out, destination-over, copy, darker, lighter, xor
         */
        globalCompositeOperation: 'source-over',

        /**
         * FPS for the animation loop
         */
        loopFps: 30
    };

    //extend the cajal instance by basic functions
    cajal.extend(cajal.prototype, {

        /**
         * Internal constructor to set up basic variables and clear the canvas
         * @param element id of the canvas element or DOM-object that should be drawn on
         * @param options literal object with global settings (boolean autoClearCanvas, boolean isEmpty, double globalAlpha [between 0 and 1], string globalCompositeOperation, integer loopFps, integer loopFrame)
         */
        init: function(element, options) {
            /**
             * canvas DOM Element
             */
            if (typeof(element) === 'string') {
                //element represents the canvas id attribute
                this.canvas = document.getElementById(element);
            } else {
                //element represents the canvas DOM
                this.canvas = element;
            }

            /**
             * canvas 2D rendering context
             */
            this.ctx = this.canvas.getContext('2d');

            /**
             * Array of all Items
             * The Item object contains the itemId variable that must be unique and the item object itsself
             */
            this.items = [];

            /**
             * Array with all current animations
             */
            this.loopAnimations = [];
            /**
             * Array with frame numbers for each animation
             */
            this.loopAnimationFrames = [];

            /**
             * Global frame number
             */
            this.loopFrame = 0;

            /**
             * Cajal options
             */
            this.options = cajal.extend({}, defaultOptions, options);

            /**
             * Flag if canvas is not empty. In that case it has to be cleared before drawing
             */
            this.isEmpty = true;

            /**
             * Clear the complete canvas
             */
            this.clear();

        },

        /**
         * Adds an item to the item array
         * @param itemId Name of the item (unique value)
         * @param item item object
         * @return cajal instance or false if itemId already exists or param item is no object
         */
        addItem: function(itemId, item) {
            if (this.getItem(itemId) === false && typeof(item) === 'object') {   //no duplicate itemId and item must be an object
                this.items.push({
                    itemId: itemId,
                    item: item
                });
                return this;
            }
            return false;
        },

        /**
         * Get the item with specific itemId or false
         * @param itemId item id of the specific item
         * @return the item with specific itemId or false
         */
        getItem: function(itemId) {
            for (i in this.items) {
                if (this.items[i].itemId === itemId) {
                    return this.items[i].item;
                }
            }
            return false;
        },

        /**
         * Override item with specific itemId
         * @param itemId item id of specific item
         * @param item new item object
         * @return cajal instance or false if itemId does not exist
         */
        setItem: function(itemId, item) {
            for (i in this.items) {
                if (this.items[i].itemId === itemId) {
                    this.items[i] = {
                        itemId: itemId,
                        item: item
                    };
                    return this;
                }
            }
            return false;
        },

        /**
         * Delete item from item array
         * @param itemId item id of the item
         * @return cajal instance on success or false if item does not exist
         */
        deleteItem: function(itemId) {
            var i = this.getItemPosition(itemId);
            if (false !== i) {
                var rest = this.items.slice(i+1);
                this.items.length = i;
                this.items.push.apply(this.items, rest);
                return this;
            }
            return false;
        },

        /**
         * Get the key of the item in the item array
         * @param itemId item id of the item
         * @return key of the item or false if item does not exist
         */
        getItemPosition: function(itemId) {
            for (i in this.items) {
                if (this.items[i].itemId === itemId) {
                    return  parseInt(i);
                }
            }
            return false;
        },

        /**
         * Move item one layer up
         * @param itemId item id of the item
         * @return cajal instance on success or false
         */
        up: function(itemId) {
            var i;
            if ((i = this.getItemPosition(itemId)) !== false) {
                var item = this.items[i++];
                this.deleteItem(itemId);
                this.items.splice(i, 0, item);
                return this;
            }
            return false;
        },

        /**
         * Move item one layer down
         * @param itemId item id of the item
         * @return cajal instance on success or false
         */
        down: function(itemId) {
            var i;
            if ((i = this.getItemPosition(itemId)) !== false) {
                var item = this.items[i--];
                this.deleteItem(itemId);
                this.items.splice(i, 0, item);
                return this;
            }
            return false;
        },

        /**
         * Move item on the top
         * @param itemId item id of the item
         * @return cajal instance on success or false
         */
        top: function(itemId) {
            var i;
            if ((i = this.getItemPosition(itemId)) !== false) {
                var item = this.getItem(itemId);
                this.deleteItem(itemId).addItem(itemId, item);
                return this;
            }
            return false;
        },

        /**
         * Move item to the bottom
         * @param itemId item id of the item
         * @return cajal instance on success or false
         */
        bottom: function(itemId) {
            var i;
            if ((i = this.getItemPosition(itemId)) !== false) {
                var item = this.items[i];
                this.deleteItem(itemId);
                this.items.splice(0, 0, item);
                return this;
            }
            return false;
        },

        /**
         * Draw all Objects stored in the item array to the canvas
         * The canvas will be cleared if the flag "autoClearCanvas" is true
         * @param options literal object with draw options that will override the draw options of each item for this draw call
         * @return cajal instance
         */
        draw: function(options) {
            if (this.isEmpty === false && this.options.autoClearCanvas === true) {
                this.clear();
            }
            this.isEmpty = false;
            for (i in this.items) {
                this.items[i].item.draw(this, options);
            }
            return this;
        },

        /**
         * Clears the complete canvas
         * @return cajal instance
         */
        clear: function() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.isEmpty = true;
            return this;
        },

        /**
         * Triggers the given animation with specific duration
         * @param animation callback function
         * @param duration duration of the animation in frames
         * @return cajal instance
         */
        startAnimation: function(animation, duration) {
            this.loopAddAnimation(animation, duration);
            return this;
        },

        /**
         * Stops animation
         * @param animation callback function
         * @return cajal instance or false if animation does not exist in loop
         */
        stopAnimation: function(animation) {
            for (i in this.loopAnimations) {
                if (this.loopAnimations[i].callback === animation) {
                    delete(this.loopAnimations[i]);
                    return this;
                }
            }
            return false;
        },

        /**
         * Interval reference
         */
        loopInterval: null,

        /**
         * Checks weather an animation already exists in the animation array
         * @param animation callback function
         * @return true on success or false
         */
        loopAnimationExists: function(animation) {
            for (i in this.loopAnimations) {
                if (this.loopAnimations[i].callback === animation) {
                    return true;
                }
            }
            return false;
        },

        /**
         * Add animation to the animation loop and start the loop if it is not started yet
         * @param animation callback function
         * @param duration duration for this animation
         */
        loopAddAnimation: function(animation, duration) {
            if (!this.loopAnimationExists(animation)) {
                this.loopAnimations.push({
                    callback: animation,
                    duration: duration || -1,
                    frame: 0
                });

                //start loop if not running
                if (this.loopInterval === null) {
                    var obj = this;
                    this.loopInterval = setInterval(function(){
                        obj.loop();
                    }, Math.round(1000 / this.options.loopFps));
                }

            }
        },

        /**
         * Loop routine that calls each animation callback, increments the frame number,
         * removes animations that reached their duration limit, and stops the loop
         * interval if no animations are left in the loop
         */
        loop: function() {
            this.loopFrame++;
            for (i in this.loopAnimations) {
                var animation = this.loopAnimations[i];
                animation.frame++;
                if (animation.duration > 0 && animation.frame > animation.duration) {
                    delete(this.loopAnimations[i]);
                } else {
                    animation.callback.apply(this, [animation.frame, animation.duration]);
                }
            }
            this.draw();
            //stop loop if all animations are over
            if (this.loopAnimations.length === 0) {
                clearInterval(this.loopInterval);
                this.loopInterval = null;
            }

        }

    });

    /**
     * Create a linear gradient
     * color stops can be added using the colorStop method
     * @param x1 x coordinate for the gradient start
     * @param y1 y coordinate for the gradient start
     * @param x2 x coordinate for the gradient end
     * @param y2 y coordinate for the gradient end
     * @return gradient object
     */
    cajal.LinearGradient = function(x1, y1, x2, y2) {
        this.properties = {
            start: {
                x: x1,
                y: y1
            },
            end: {
                x: x2,
                y: y2
            },
            colorStops: []
        }
        return this;
    };

    //extend the linear gradient object by methods
    cajal.extend(cajal.LinearGradient.prototype, {
        /**
         * add a color stop to the gradient
         * @param pos float number between 0 and 1 where the color is located on the gradient
         * @param color hex or rgb(a) value of the color
         * @return gradient instance
         */
        colorStop: function(pos, color) {
            this.properties.colorStops.push({
                pos: pos,
                color: color
            });
            return this;
        },

        /**
         * Get the canvas gradient object for drawing the gradient
         * @param context 2D rendering context
         * @return the canvas gradient object
         */
        draw: function(context) {
            var gradient = context.createLinearGradient(this.properties.start.x, this.properties.start.y, this.properties.end.x, this.properties.end.y);
            for (i in this.properties.colorStops) {
                gradient.addColorStop(this.properties.colorStops[i].pos, this.properties.colorStops[i].color);
            }
            return gradient;
        }
    });

    /**
     * Create a radial gradient
     * color stops can be added using the colorStop method
     * @param x1 x coordinate for the gradient start
     * @param y1 y coordinate for the gradient start
     * @param r1 radius for the gradient start
     * @param x2 x coordinate for the gradient end
     * @param y2 y coordinate for the gradient end
     * @param r2 radius for the gradient end
     * @return gradient object
     */
    cajal.RadialGradient = function(x1, y1, r1, x2, y2, r2) {
        this.properties = {
            start: {
                x: x1,
                y: y1,
                r: r1
            },
            end: {
                x: x2,
                y: y2,
                r: r2
            },
            colorStops: []
        }
        return this;
    };
    cajal.extend(cajal.RadialGradient.prototype, {
        /**
         * add a color stop to the gradient
         * @param pos float number between 0 and 1 where the color is located on the gradient
         * @param color hex or rgb(a) value of the color
         * @return gradient instance
         */
        colorStop: function(pos, color) {
            this.properties.colorStops.push({
                pos: pos,
                color: color
            });
            return this;
        },

        /**
         * Get the canvas gradient object for drawing the gradient
         * @param context 2D rendering context
         */
        draw: function(context) {
            var gradient = context.createRadialGradient(this.properties.start.x, this.properties.start.y, this.properties.start.r, this.properties.end.x, this.properties.end.y, this.properties.end.r);
            for (i in this.properties.colorStops) {
                gradient.addColorStop(this.properties.colorStops[i].pos, this.properties.colorStops[i].color);
            }
            return gradient;
        }
    });


    /**
     * Default values for the drawing options
     */
    var defaultDrawOptions = {
            stroke: null,
            fill: null,
            width: 1,
            font: '13px sans-serif',
            lineCap: 'butt', //butt,square,round
            lineJoin: 'miter', //bevel,miter,round
            miterLimit: 10,
            shadowX: 0,
            shadowY: 0,
            shadowBlur: 0,
            shadow: null
        },
        /**
         * Default values for the item options
         */
        defaultItemOptions  = {
            translate: null,
            scale: null,
            rotate: null,
            matrix: null,
            hidden: false
        };

    /**
     * Basic item methods
     * Each item hase those methods
     */
    var Item = {

        /**
         * Clone the item
         * @return clone of the item
         */
        clone: function() {
            return cajal.extend(true, {}, this);
        },

        /**
         * Hide item
         * Hidden items are not drawn to the canvas
         * @return item instance
         */
        hide: function() {
            this.itemOptions.hidden = true;
            return this;
        },

        /**
         * Show item if hidden
         * @return item instance
         */
        show: function() {
            this.itemOptions.hidden = false;
            return this;
        },

        /**
         * Change the matrix of the canvas element for this item by multiplication with current matrix
         * By applying a custom matrix you can translate, scale and rotate items in one step
         * @param values of the 3x3 matrix (dx and dy are m13 and m23 values of the matrix)
         * @return item instance
         */
        changeMatrix: function(m11, m12, m21, m22, dx, dy) {
             //identity
            var m = {
                m11: 1,
                m12: 0,
                dx: 0,
                m21: 0,
                m22: 1,
                dy: 0
            };
            //override the identity if matrix is given
            if (this.itemOptions.matrix !== null) {
                m = this.itemOptions.matrix;
            }
            //simple matrix multiplication
            this.itemOptions.matrix = {
                m11: m.m11 * m11 + m.m12 * m21,
                m12: m.m11 * m21 + m.m12 * m22,
                dx : m.m11 * dx  + m.m12 * dy  + m.dx,
                m21: m.m21 * m11 + m.m22 * m21,
                m22: m.m21 * m21 + m.m22 * m22,
                dy : m.m21 * dx  + m.m22 * dy  + m.dy
            }
            return this;
        },

        /**
         * Set the matrix of the canvas element for this item
         * Current matrix will be overwritten
         * By applying a custom matrix you can translate, scale and rotate items in one step
         * @param values of the 3x3 matrix (dx and dy are m13 and m23 values of the matrix)
         * @return item instance
         */
        setMatrix: function(m11, m12, m21, m22, dx, dy) {
            if (m11 === 1 && m12 === 0 && m21 === 0 && m22 === 1 && dx === 0 && dy === 0) { //identity
                this.itemOptions.matrix = null;
            } else {
                this.itemOptions.matrix = {
                    m11: m11,
                    m12: m12,
                    m21: m21,
                    m22: m22,
                    dx: dx,
                    dy: dy
                };
            }
            return this;
        },

        /**
         * Rotate item by an angle
         * @param angle rotation angle in degree
         * @return item instance
         */
        rotateBy: function(angle) {
            if (this.itemOptions !== null) {
                this.itemOptions.rotate += Math.PI * angle / 180;
            } else {
                return this.rotate(angle);
            }
            return this;
        },

        /**
         * Set rotation of item to an angle
         * @param angle rotation angle in degree
         * @return item instance
         */
        rotate: function(angle) {
            if (angle === 0) {
                this.itemOptions.rotate = null;
            } else {
                this.itemOptions.rotate = Math.PI * angle / 180;
            }
            return this;
        },

        /**
         * Scale item by given value
         * 0.1 would be +10% size
         * @param dx scale values for x axis
         * @param dy scale values for y axis
         * @return item instance
         */
        scaleBy: function(dx, dy) {
            if (this.itemOptions.scale !== null) {
                this.itemOptions.scale.dx += dx;
                this.itemOptions.scale.dy += dy;
            } else {
                return this.scale(1 + dx, 1 + dy);
            }
            return this;
        },

        /**
         * Scale item to given facor
         * 0.1 would be 10% of original size
         * @param x scale values for x axis
         * @param y scale values for y axis
         * @return item instance
         */
        scale: function(x, y) {
            if (x === 1 && y === 1) {
                this.itemOptions.scale = null;
            } else {
                this.itemOptions.scale = {
                    dx: x,
                    dy: y
                };
            }
            return this;
        },

        /**
         * Move item by given pixels
         * @param dx pixel offset for x axis
         * @param dy pixel offset for y axis
         * @return item instance
         */
        moveBy: function(dx, dy) {
            if (this.itemOptions.translate !== null) {
                this.itemOptions.translate.x += dx;
                this.itemOptions.translate.y += dy;
            }else {
                return this.move(dx, dy);
            }
            return this;
        },

        /**
         * Move item to given coordinates
         * @param dx pixel offset for x axis
         * @param dy pixel offset for y axis
         * @return item instance
         */
        move: function(x, y) {
            if (x === 0 && x === 0) {
                this.itemOptions.translate = null;
            }else {
                this.itemOptions.translate = {
                    x: x,
                    y: y
                };
            }
            return this;
        },

        /**
         * Set draw options for the item
         * @param options literal object of the options
         * @return item instance
         */
        setDrawOptions: function(options) {
            cajal.extend(this.drawOptions, options);
            return this;
        },

        prepare: function (canvas, options) {
            var ctx = canvas.ctx;
            ctx.save();
            //globalAlpha and globalCompositeOperation
            ctx.globalAlpha = canvas.options.globalAlpha;
            ctx.globalCompositeOperation = canvas.options.globalCompositeOperation;

            //dont draw if hidden
            if (this.itemOptions.hidden === true) {
                return;
            }

            if (options !== undefined) {
                options = cajal.extend({}, this.drawOptions, options);
            } else {
                options = this.drawOptions;
            }

            if (options.fill !== null) {
                if (typeof(options.fill) === 'object') {
                    ctx.fillStyle = options.fill.draw(ctx);
                } else if (cajal.isFunction(options.fill)) {
                    ctx.fillStyle = options.fill.apply(this, [ctx]);
                } else {
                    ctx.fillStyle = options.fill;
                }
            }

            if (options.stroke !== null) {
                if (typeof(options.stroke) === 'object') {
                    ctx.strokeStyle = options.stroke.draw(ctx);
                } else if (cajal.isFunction(options.stroke)) {
                    ctx.strokeStyle = options.stroke.apply(this, [ctx]);
                } else {
                    ctx.strokeStyle = options.stroke;
                }
                ctx.lineWidth = options.width;
                ctx.lineCap = options.lineCap;
                ctx.lineJoin = options.lineJoin;
                ctx.miterLimit = options.miterLimit;
            }

            if (options.shadow !== null) {
                ctx.shadowOffsetX = options.shadowX;
                ctx.shadowOffsetY = options.shadowY;
                ctx.shadowBlur = options.shadowBlur;
                ctx.shadowColor = options.shadow;
            }

            ctx.setTransform(1, 0, 0, 1, 0, 0);

            //handle matrix changes
            //matrix changes
            if (this.itemOptions.matrix !== undefined && this.itemOptions.matrix !== null) {
                var m = this.itemOptions.matrix;
                ctx.setTransform(m.m11, m.m12, m.m21, m.m22, m.dx, m.dy);
            }
            //center of object
            var center = this.center(ctx)
            //translate
            if (this.itemOptions.translate !== undefined && this.itemOptions.translate !== null) {
                ctx.translate(this.itemOptions.translate.x, this.itemOptions.translate.y);
            }
            // rotate round center of object
            if (this.itemOptions.rotate !== undefined && this.itemOptions.rotate !== null) {
                //translate to the center of the object
                ctx.translate(center.x, center.y);
                //rotate
                ctx.rotate(this.itemOptions.rotate);
                //translate back
                ctx.translate(-center.x, -center.y);
            }
            //scale form center of object
            if (this.itemOptions.scale !== undefined && this.itemOptions.scale !== null) {
                //translate to the center of the object
                ctx.translate(center.x, center.y);
                //scale
                ctx.scale(this.itemOptions.scale.dx, this.itemOptions.scale.dy);
                //translate back
                ctx.translate(-center.x, -center.y);
            }

            ctx.beginPath();

            return options;
        },

        finalize: function (canvas, options) {
            var ctx = canvas.ctx;
            if (options.stroke !== null) {
                ctx.stroke();
            }

            if (options.fill !== null) {
                ctx.fill();
            }

            ctx.restore();
        }
    };

    /**
     * Create a circle
     * @param x position in pixel
     * @param y position in pixel
     * @param r radius of the circle
     * @return circle item instance
     */
    cajal.Circle = function(x, y, r) {
        this.drawOptions = cajal.extend({}, defaultDrawOptions);
        this.itemOptions = cajal.extend({}, defaultItemOptions);
        this.radius = r;
        this.move(x, y);
    }
    cajal.extend(cajal.Circle.prototype, Item, {
        /**
         * Get the center of the item for rotation
         * @return point object of the center
         */
        center: function() {
            return {
                x: 0,
                y: 0
            };
        },
        
        /**
         * Draw routine for the items
         * Each item is drawn as path to the canvas
         * @param canvas cajal instance
         * @param options draw options for this draw call
         */
        draw: function(canvas, options) {
            var ctx = canvas.ctx;
            options = this.prepare(canvas, options);
            
            ctx.moveTo(this.radius, 0);
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2, false);
            ctx.closePath();

            this.finalize(canvas, options);
        }

    });

    /**
     * Create a rectangle
     * Optional with rounded corners if radius is set
     * @param x position on the x axis in pixel
     * @param y position on the y axis in pixel
     * @param w height of the rectangle in pixel
     * @param h width of the rectangle in pixel
     * @param r (optional) radius for rounded corners
     * @return rectangle item instance
     */
    cajal.Rect = function(x, y, w, h, r) {
        this.drawOptions = cajal.extend({}, defaultDrawOptions);
        this.itemOptions = cajal.extend({}, defaultItemOptions);
        this.rect = {
            w: w,
            h: h
        };
        if (r !== undefined) { //rounded rect
            this.rect.r = r;
        }
        this.move(x, y);
    }
    cajal.extend(cajal.Rect.prototype, Item, {
        /**
         * Get the center of the item for rotation
         * @return point object of the center
         */
        center: function() {
            return {
                x: this.rect.w / 2,
                y: this.rect.h / 2
            };
        },
        /**
         * Get the height of the rectangle
         */
        height: function() {
            return this.rect.h;
        },
        /**
         * Get the width of the rectangle
         */
        width: function() {
            return this.rect.w;
        },
        /**
         * Draw routine for the items
         * Each item is drawn as path to the canvas
         * @param canvas cajal instance
         * @param options draw options for this draw call
         */
        draw: function(canvas, options) {
            var ctx = canvas.ctx;
            options = this.prepare(canvas, options);

            if (this.rect.r !== undefined) {
                ctx.moveTo(this.rect.r, 0);
                ctx.arcTo (this.rect.w, 0, this.rect.w, this.rect.r, this.rect.r);
                ctx.arcTo (this.rect.w, this.rect.h, this.rect.r, this.rect.h, this.rect.r);
                ctx.arcTo (0, this.rect.h, 0, this.rect.r, this.rect.r);
                ctx.arcTo (0, 0, this.rect.r, 0, this.rect.r);
            } else {
                ctx.rect(0, 0, this.rect.w, this.rect.h);
            }
            ctx.closePath();

            this.finalize(canvas, options);
        }
    });

    /**
     * Create a path
     * @param x start of the path at position x in pixel
     * @param y start of the path at position y in pixel
     * @return path item instance
     */
    cajal.Path = function(x, y) {
        this.drawOptions = cajal.extend({}, defaultDrawOptions);
        this.itemOptions = cajal.extend({}, defaultItemOptions);
        this.isClosed = false;
        this.offset = {
            x: x || 0,
            y: y || 0
        }
        this.pointStack = [{type: 'start'}];
        this.move(x, y);
    }
    cajal.extend(cajal.Path.prototype, Item, {

        /**
         * Array for the points in the path
         */
        pointStack: [],

        /**
         * Create a line to (x, y)
         * @param x position of the end point on the x-axis in pixel
         * @param y position of the end point on the y-axis in pixel
         * @return path item instance
         */
        line: function(x, y) {
            var p = {
                type: 'point',
                x: x - this.offset.x,
                y: y - this.offset.y
            };
            this.pointStack.push(p);
            return this;
        },

        /**
         * Create a line to (x, y)
         * @param x position of the end point on the x-axis in pixel
         * @param y position of the end point on the y-axis in pixel
         * @return path item instance
         */
        to: function(x, y) {
            return this.line(x, y);
        },

        /**
         * Close the path
         * @return path item instance
         */
        close: function() {
            this.isClosed = true;
            return this;
        },

        /**
         * Create a quadratic bezier curve to (x, y) with the control point (cx, cy)
         * @param x position of the end point on the x-axis in pixel
         * @param y position of the end point on the y-axis in pixel
         * @param cx position of the control point on the x-axis in pixel
         * @param cy position of the control point on the y-axis in pixel
         * @return path item instance
         */
        quadraticCurve: function(x, y, cx, cy) {
            var p = {
                type: 'quadratic',
                x:  x - this.offset.x,
                y:  y - this.offset.y,
                cx: cx - this.offset.x,
                cy: cy - this.offset.y
            }
            this.pointStack.push(p);
            return this;
        },

        /**
         * Create a bezier curve to (x, y) with the control points (c1x, c1y) and (c2x, c2y)
         * @param x position of the end point on the x-axis in pixel
         * @param y position of the end point on the y-axis in pixel
         * @param c1x position of the first control point on the x-axis in pixel
         * @param c1y position of the first control point on the y-axis in pixel
         * @param c2x position of the second control point on the x-axis in pixel
         * @param c2y position of the second control point on the y-axis in pixel
         * @return path item instance
         */
        bezierCurve: function(x, y, c1x, c1y, c2x, c2y) {
            var p = {
                type: 'bezier',
                x: x - this.offset.x,
                y: y - this.offset.y,
                c1x: c1x - this.offset.x,
                c1y: c1y - this.offset.y,
                c2x: c2x - this.offset.x,
                c2y: c2y - this.offset.y
            }
            this.pointStack.push(p);
            return this;
        },

        /**
         * Get the approximate center of the path for rotation
         * @return point object of the center
         */
        center: function() { //only aprox. because bezier and quadradic curves can not be measured exacly
            //calculate center of every subpath
            var polygon = {
                i: 0,
                x: 0,
                y: 0
            };
            for (var i = 0; i < this.pointStack.length; i++) {
                var p = this.pointStack[i];

                switch (p.type) {
                    case 'point':
                        polygon.i++;
                        polygon.x += p.x;
                        polygon.y += p.y;
                        break;

                    case 'quadratic':
                        polygon.i += 2;
                        polygon.x += p.x + p.cx;
                        polygon.y += p.y + p.cy;
                        break;

                    case 'bezier':
                        polygon.i += 3;
                        polygon.x += p.x + p.c1x + p.c2x;
                        polygon.y += p.y + p.c1y + p.c2y;
                        break;
                    default:
                        break;
                }
            }
            return {
                x: polygon.x / polygon.i,
                y: polygon.y / polygon.i
            };
        },

        /**
         * Draw routine for the items
         * Each item is drawn as path to the canvas
         * @param canvas cajal instance
         * @param options draw options for this draw call
         */
        draw: function(canvas, options) {
            var ctx = canvas.ctx;
            options = this.prepare(canvas, options);

            for (i in this.pointStack) {
                var p = this.pointStack[i];

                switch (p.type) {

                    case 'start':
                        ctx.moveTo(0, 0);
                        break;

                    case 'point':
                        ctx.lineTo(p.x, p.y);
                        break;

                    case 'quadratic':
                        ctx.quadraticCurveTo(p.cx, p.cy, p.x, p.y);
                        break;

                    case 'bezier':
                        ctx.bezierCurveTo(p.c1x, p.c1y, p.c2x, p.c2y, p.x, p.y);
                        break;
                }
            }

            if (this.isClosed) {
                ctx.closePath();
            }

            this.finalize(canvas, options);
        }
    });

    /**
     * Create a text item
     * @param x position on x axis in pixel
     * @param y position on y axis in pixel
     * @param text Text to draw
     * @return text item instance
     */
    cajal.Text = function(x, y, text) {
        this.drawOptions = cajal.extend({}, defaultDrawOptions);
        this.itemOptions = cajal.extend({}, defaultItemOptions);
        this.move(x, y);
        this.text = text;
    };
    cajal.extend(cajal.Text.prototype, Item, {

        /**
         * Append text to the current text
         * @param text Text to add
         * @return text item instance
         */
        append: function(text) {
            this.text += ("" + text);
            return this;
        },

        /**
         * Prepend text to the current text
         * @param text Text to prepend
         * @return text item instance
         */
        prepend: function(text) {
            this.text = "" + text + this.pointStack[0].text;
            return this;
        },

        /**
         * Set text to the current text
         * @param text Text to draw
         * @return text item instance
         */
        text: function(text) {
            this.text = "" + text;
            return this;
        },

        /**
         * Get the center of the text for rotation
         * @return point object of the center
         */
        center: function(ctx) {
            ctx.save();
            ctx.font = this.drawOptions.font;
            var size = ctx.measureText(this.text);
            ctx.restore();
            return {
                x: size.width / 2,
                y: 0
            };
        },

        /**
         * Draw routine for the items
         * Each item is drawn as path to the canvas
         * @param canvas cajal instance
         * @param options draw options for this draw call
         */
        draw: function(canvas, options) {
            var ctx = canvas.ctx;
            options = this.prepare(canvas, options);

            ctx.font = options.font;
            if (options.stroke !== null) {
                ctx.strokeText (this.text, 0, 0);
            }
            if (options.fill !== null) {
                ctx.fillText(this.text, 0, 0);
            }
            ctx.closePath();
            this.finalize(canvas, options);
        }
    });

    /**
     * Create a symmetric polygon
     * @param x Position on x-axis in pixel
     * @param y Position on y-axis in pixel
     * @param n Number of edges
     * @param r Radius of the polygon
     * @return polygon item instance
     */
    cajal.Polygon = function(x, y, n, r) {
        this.drawOptions = cajal.extend({}, defaultDrawOptions);
        this.itemOptions = cajal.extend({}, defaultItemOptions);
        this.pointStack = [];
        this.move(x, y);
        this.setPoints(n, r);
    }
    cajal.extend(cajal.Polygon.prototype, Item, {

        /**
         * Get the center of the item for rotation
         * @return point object of the center
         */
        center: function() {
            return {
                x: 0,
                y: 0
            };
        },

        /**
         * Manipulate the polygon by setting a new radius and new number of edges
         * @param n new number of edges
         * @param r new radius
         * @return polygon item instance
         */
        setPoints: function(n, r) {
            this.pointStack = [];
            var angle = Math.PI * 2 / n;
            for (var i = 0; i < n; i++) {
                this.pointStack.push({
                    x: r * Math.cos(i * angle),
                    y: r * Math.sin(i * angle)
                });
            }
            return this;
        },

        /**
         * Draw routine for the items
         * Each item is drawn as path to the canvas
         * @param canvas cajal instance
         * @param options draw options for this draw call
         */
        draw: function(canvas, options) {
            var ctx = canvas.ctx;
            options = this.prepare(canvas, options);

            for (i in this.pointStack) {
                var p = this.pointStack[i];
                ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            this.finalize(canvas, options);
        }
    });

    /**
     * Easing functions for more dynamic animations
     */
    cajal.Ease = {

        /**
         * Quadratic ease in
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @return change of the value for frame f
         */
        quadIn: function(d, f, t) {
            f /= t;
            return 2 * f * d / t;
        },

        /**
         * Quadratic ease out
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @return change of the value for frame f
         */
        quadOut: function(d, f, t) {
            f /= t;
            return -2 * (f - 1) * d / t;
        },

        /**
         * Quadratic ease in and ease out
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @return change of the value for frame f
         */
        quadInOut: function(d, f, t) {
            f /= t / 2;
            if (f < 1) return 2 * f * d / t;
            f--;
            return -2 * (f - 1) * d / t;
        },

        /**
         * Exponential ease in
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @param p power of the exponential function
         * @return change of the value for frame f
         */
        expIn: function(d, f, t, p) {
            p = p || 3;
            f /= t;
            return p * Math.pow(f, p - 1) * d / t;
        },

        /**
         * Exponential ease out
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @param p power of the exponential function
         * @return change of the value for frame f
         */
        expOut: function(d, f, t, p) {
            return this.expIn(d, t-f, t, p);
        },

        /**
         * Exponential ease in and ease out
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @param p power of the exponential function
         * @return change of the value for frame f
         */
        expInOut: function(d, f, t, p) {
            f /= t / 2;
            if (f < 1) return this.expIn(d, f*t, t, p);
            f--;
            return this.expOut(d, f*t, t, p);
        },

        /**
         * Back ease in
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @param a amplitude of the overrun
         * @return change of the value for frame f
         */
        backIn: function(d, f, t, a) {
            a = a || 1.70158;
            f /= t;
            return f*(3*a*f+3*f-2*a)*d/t;
        },

        /**
         * Back ease out
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @param a amplitude of the overrun
         * @return change of the value for frame f
         */
        backOut: function(d, f, t, a) {
            a = a || 1.70158;
            f /= t;
            f -= 1;
            return f * (3 * a * f + 3 * f + 2 * a) * d / t;
        },

        /**
         * Back ease in and out
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @param a amplitude of the overrun
         * @return change of the value for frame f
         */
        backInOut: function(d, f, t, a) {
            a = a || 1.70158 * 1.525;
            f /= t / 2;
            if (f < 1) return f * (3 * a * f + 3 * f - 2 * a) * d / t;
            f -= 2;
            return f * (3 * a * f + 3 * f + 2 * a) * d / t;
        },

        /**
         * Bounce ease in
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @return change of the value for frame f
         */
        bounceIn: function(d, f, t) {
            return this.bounceOut(d, t-f, t)
        },

        /**
         * Bounce ease out
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @return change of the value for frame f
         */
        bounceOut: function(d, f, t) {
            f/=t;
            if (f < (1/2.75)) {
                return (7.5625 * 2 * f) * d / t;
            } else if (f < (2/2.75)) {
                return (7.5625 * 2 * (f - (1.5 / 2.75))) * d / t;
            } else if (f < (2.5/2.75)) {
                return (7.5625 * 2 * (f - (2.25 / 2.75))) * d / t;
            } else {
                return (7.5625 * 2 * (f - (2.625 / 2.75))) * d / t;
            }
        },

        /**
         * Bounce ease in and out
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @return change of the value for frame f
         */
        bounceInOut: function(d, f, t) {
            if (f < t/2) return this.bounceIn(d, f*2, t);
            return this.bounceOut(d, f*2-t, t);
        },

        /**
         * Elastic ease in
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @param p number of oscillation
         * @return change of the value for frame f
         */
        elasticIn: function(d, f, t, p) {
            f /= t;
            p = p || 3;
            var pi = Math.PI;
            var T = 1 / (p + .25);
            return d / t * (2 / 9) * Math.pow(f, 3.5) * Math.sin(f * 2 * pi / T) + d / t * Math.pow(f, 4.5) * Math.cos(f * 2 * pi / T) * (2 * pi / T);
        },

        /**
         * Elastic ease out
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @param p number of oscillation
         * @return change of the value for frame f
         */
        elasticOut: function(d, f, t, p) {
            return this.elasticIn(d, t-f, t, p);
        },

        /**
         * Elastic ease in and out
         * @param d total amount that should be changed over time
         * @param f current frame
         * @param t duration in frames
         * @param p number of oscillation
         * @return change of the value for frame f
         */
        elasticInOut: function(d, f, t, p) {
            if (f < t/2) return this.elasticIn(d, f*2, t, p);
            return this.elasticOut(d, f*2-t, t, p);
        }

    };

})();
