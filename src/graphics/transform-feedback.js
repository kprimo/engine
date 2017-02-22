pc.extend(pc, function () {
    'use strict';

    /**
     * @name pc.TransformFeedback
     * @class Transform feedback helper object
     * @description This object allows you to configure and use the transform feedback feature (WebGL2 only).
     * @example
     *  How to use:
     *  1. First, check that you're on WebGL2, by looking at the app.graphicsDevice.webgl2 value.
     *  2. Define the outputs in your vertex shader. The syntax is out vec3 out_vertex_position, note that there must be out_ in the name. You can then simply assign values to these outputs in VS. The order and size of shader outputs must match the output buffer layout.
     *  3. Create the shader using pc.TransformFeedback.createShader(device, vsCode, yourShaderName).
     *  4. Create/acquire the input vertex buffer. Can be any pc.VertexBuffer, either manually created, or from a pc.Mesh.
     *  5. Create the pc.TransformFeedback object: var tf = new pc.TransformFeedback(inputBuffer). This object will internally create an output buffer.
     *  6. Run the shader: tf.process(shader). Shader will take the input buffer, process it and write to the ouput buffer, then the input/output buffers will be automatically swapped, so you'll immediately see the result.
     * @param {pc.VertexBuffer} inputBuffer The input vertex buffer
     * @param {Number} [usage] The optional usage type of the output vertex buffer (see pc.BUFFER_*). pc.BUFFER_GPUDYNAMIC is recommended for continious update, and is the default value.
     */
    var TransformFeedback = function (inputBuffer, usage) {
        usage = usage || pc.BUFFER_GPUDYNAMIC;
        this.device = inputBuffer.device;
        var gl = this.device.gl;

        this._inVb = inputBuffer;
        if (usage===pc.BUFFER_GPUDYNAMIC && inputBuffer.usage!==usage) {
            // have to recreate input buffer with other usage
            gl.bindBuffer(gl.ARRAY_BUFFER, inputBuffer.bufferId);
            gl.bufferData(gl.ARRAY_BUFFER, inputBuffer.storage, gl.DYNAMIC_COPY);
        }

        this._outVb = new pc.VertexBuffer(inputBuffer.device, inputBuffer.format, inputBuffer.numVertices, usage, inputBuffer.storage);
    };

    /**
     * @function
     * @name pc.TransformFeedback#createShader
     * @description Creates a transform feedback ready vertex shader from code.
     * @param {pc.GraphicsDevice} graphicsDevice The graphics device used by the renderer.
     * @param {String} vsCode Vertex shader code. Should contain output variables starting with "out_".
     * @param {String} name Unique name for caching the shader.
     * @returns {pc.Shader} A shader to use in the process() function.
     */
    TransformFeedback.createShader = function (device, vsCode, name) {
        return pc.shaderChunks.createShaderFromCode(device, vsCode, null, name, true);
    };

    TransformFeedback.prototype = {
        /**
         * @function
         * @name pc.TransformFeedback#destroy
         * @description Destroys the transform feedback helper object
         */
        destroy: function () {
            this._outVb.destroy();
        },

        /**
         * @function
         * @name pc.TransformFeedback#process
         * @description Runs the specified shader on the input buffer, writes results into the new buffer, then optionally swaps input/output.
         * @param {Boolean} [swap] Swap input/output buffer data. Useful for continious buffer processing. Default is true.
         */
        process: function (shader, swap) {
            if (swap===undefined) swap = true;

            var device = this.device;
            device.setRenderTarget(null);
            device.updateBegin();
            device.setVertexBuffer(this._inVb, 0);
            device.setRaster(false);
            device.setTransformFeedbackBuffer(this._outVb);
            device.setShader(shader);
            device.draw({
                type: pc.PRIMITIVE_POINTS,
                base: 0,
                count: this._inVb.numVertices,
                indexed: false
            });
            device.setTransformFeedbackBuffer(null);
            device.setRaster(true);
            device.updateEnd();

            // swap buffers
            if (swap) {
                var tmp = this._inVb.bufferId;
                this._inVb.bufferId = this._outVb.bufferId;
                this._outVb.bufferId = tmp;
            }
        }
    };

    /**
     * @readonly
     * @name pc.TransformFeedback#inputBuffer
     * @type pc.VertexBuffer
     * @description The current input buffer
     */
    Object.defineProperty(TransformFeedback.prototype, 'inputBuffer', {
        get: function () { return this._inVb; },
    });

    /**
     * @readonly
     * @name pc.TransformFeedback#outputBuffer
     * @type pc.VertexBuffer
     * @description The current output buffer
     */
    Object.defineProperty(TransformFeedback.prototype, 'outputBuffer', {
        get: function () { return this._outVb; },
    });

    return {
        TransformFeedback: TransformFeedback
    };
}());
