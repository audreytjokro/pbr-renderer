/**
 * WebGL utility functions for context creation, shader compilation, and error handling
 */

/**
 * Create WebGL2 context with proper error handling and extensions
 */
export function createWebGLContext(canvas) {
    const gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: true,
        depth: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
    });
    
    if (!gl) {
        throw new Error('WebGL2 is not supported by your browser');
    }
    
    // Check for required extensions
    const requiredExtensions = [
        'EXT_color_buffer_float',
        'OES_texture_float_linear'
    ];
    
    const supportedExtensions = [];
    for (const ext of requiredExtensions) {
        const extension = gl.getExtension(ext);
        if (extension) {
            supportedExtensions.push(ext);
        } else {
            console.warn(`Extension ${ext} not supported`);
        }
    }
    
    console.log('WebGL2 context created successfully');
    console.log('Supported extensions:', supportedExtensions);
    
    return gl;
}

/**
 * Compile a shader with error handling
 */
export function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        const typeName = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
        console.error(`${typeName} shader compilation error:`, error);
        
        // Add line numbers to source for debugging
        const lines = source.split('\n');
        const numberedSource = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
        console.error('Shader source with line numbers:\n', numberedSource);
        
        gl.deleteShader(shader);
        throw new Error(`${typeName} shader compilation failed: ${error}`);
    }
    
    return shader;
}

/**
 * Create and link a shader program
 */
export function createShaderProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program);
        console.error('Shader program linking error:', error);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        throw new Error(`Shader program linking failed: ${error}`);
    }
    
    // Clean up individual shaders (they're now part of the program)
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    
    return program;
}

/**
 * Load shader source from file/URL
 */
export async function loadShader(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Failed to load shader from ${url}:`, error);
        throw error;
    }
}

/**
 * Utility class for managing shader uniforms
 */
export class UniformManager {
    constructor(gl, program) {
        this.gl = gl;
        this.program = program;
        this.uniformLocations = new Map();
        this.uniformInfo = new Map();
        
        // Cache all uniform locations
        this.cacheUniforms();
    }
    
    cacheUniforms() {
        const gl = this.gl;
        const numUniforms = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
        
        for (let i = 0; i < numUniforms; i++) {
            const uniformInfo = gl.getActiveUniform(this.program, i);
            const location = gl.getUniformLocation(this.program, uniformInfo.name);
            
            this.uniformLocations.set(uniformInfo.name, location);
            this.uniformInfo.set(uniformInfo.name, uniformInfo);
        }
        
        console.log(`Cached ${numUniforms} uniforms:`, Array.from(this.uniformLocations.keys()));
    }
    
    setUniform(name, ...values) {
        const location = this.uniformLocations.get(name);
        if (location === null || location === undefined) {
            console.warn(`Uniform '${name}' not found`);
            return;
        }
        
        const gl = this.gl;
        const info = this.uniformInfo.get(name);
        
        try {
            switch (info.type) {
                case gl.FLOAT:
                    gl.uniform1f(location, values[0]);
                    break;
                case gl.FLOAT_VEC2:
                    if (Array.isArray(values[0])) {
                        gl.uniform2fv(location, values[0]);
                    } else {
                        gl.uniform2fv(location, values);
                    }
                    break;
                case gl.FLOAT_VEC3:
                    if (Array.isArray(values[0])) {
                        gl.uniform3fv(location, values[0]);
                    } else if (values[0] && typeof values[0] === 'object' && values[0].length >= 3) {
                        // Handle gl-matrix vec3 objects
                        gl.uniform3fv(location, Array.from(values[0]));
                    } else {
                        gl.uniform3fv(location, values);
                    }
                    break;
                case gl.FLOAT_VEC4:
                    if (Array.isArray(values[0])) {
                        gl.uniform4fv(location, values[0]);
                    } else {
                        gl.uniform4fv(location, values);
                    }
                    break;
                case gl.FLOAT_MAT3:
                    gl.uniformMatrix3fv(location, false, values[0]);
                    break;
                case gl.FLOAT_MAT4:
                    gl.uniformMatrix4fv(location, false, values[0]);
                    break;
                case gl.INT:
                case gl.SAMPLER_2D:
                case gl.SAMPLER_CUBE:
                case gl.BOOL: // Add boolean support
                    gl.uniform1i(location, values[0]);
                    break;
                default:
                    console.warn(`Unsupported uniform type: ${info.type}`);
            }
        } catch (error) {
            console.error(`Error setting uniform '${name}':`, error);
            console.error('Values:', values);
            console.error('Info:', info);
            console.error('Value type:', typeof values[0]);
            console.error('Value content:', values[0]);
        }
    }
    
    hasUniform(name) {
        return this.uniformLocations.has(name);
    }
}

/**
 * Handle WebGL errors
 */
export function checkGLError(gl, operation) {
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        let errorName = 'UNKNOWN_ERROR';
        switch (error) {
            case gl.INVALID_ENUM: errorName = 'INVALID_ENUM'; break;
            case gl.INVALID_VALUE: errorName = 'INVALID_VALUE'; break;
            case gl.INVALID_OPERATION: errorName = 'INVALID_OPERATION'; break;
            case gl.INVALID_FRAMEBUFFER_OPERATION: errorName = 'INVALID_FRAMEBUFFER_OPERATION'; break;
            case gl.OUT_OF_MEMORY: errorName = 'OUT_OF_MEMORY'; break;
            case gl.CONTEXT_LOST_WEBGL: errorName = 'CONTEXT_LOST_WEBGL'; break;
        }
        throw new Error(`WebGL error ${errorName} (${error}) during: ${operation}`);
    }
}

/**
 * Resize canvas and viewport
 */
export function resizeCanvasToDisplaySize(canvas) {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        return true;
    }
    return false;
}