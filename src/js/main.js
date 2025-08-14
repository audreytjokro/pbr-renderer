import { mat4, mat3, vec3 } from 'gl-matrix';
import { 
    createWebGLContext, 
    createShaderProgram, 
    loadShader, 
    UniformManager, 
    resizeCanvasToDisplaySize,
    checkGLError 
} from './webgl-utils.js';
import { Camera } from './camera.js';
import { Mesh } from './mesh.js';
import { MaterialEditor } from './material-editor.js';
import { SceneManager, SceneObject } from './scene-object.js';

import vertexShaderSource from '../shaders/vertex.glsl?raw';
import fragmentShaderSource from '../shaders/fragment.glsl?raw';

/**
 * Main PBR Renderer Application
 */
class PBRRenderer {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.shaderProgram = null;
        this.uniformManager = null;
        this.camera = null;
        this.mesh = null;
        this.materialEditor = null;
        this.sceneManager = null;
        this.meshes = {};
        
        // Scene objects
        this.models = [];
        
        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.lastFpsTime = 0;
        
        // Material parameters (PBR workflow)
        this.material = {
            albedo: [0.7, 0.3, 0.3],    // Red-ish base color
            metallic: 0.0,              // Non-metallic (dielectric)
            roughness: 0.5,             // Medium roughness
            ao: 1.0                     // No ambient occlusion
        };
        
        // IBL settings
        this.ibl = {
            enabled: true,
            intensity: 1.0,
            ambientColor: [0.1, 0.1, 0.15] // Fallback ambient if IBL disabled
        };
        this.lights = [
            {
                type: 0, // Directional (sun)
                position: [0, 0, 0], // Not used for directional
                direction: [-0.5, -1.0, -0.3],
                color: [1.0, 0.95, 0.8], // Warm sunlight
                intensity: 3.0,
                range: 0, // Not used for directional
                innerCone: 0,
                outerCone: 0
            },
            {
                type: 1, // Point light
                position: [3.0, 2.0, 2.0],
                direction: [0, 0, 0], // Not used for point
                color: [1.0, 0.4, 0.2], // Orange/red
                intensity: 5.0,
                range: 8.0,
                innerCone: 0,
                outerCone: 0
            },
            {
                type: 2, // Spot light
                position: [-2.0, 3.0, 1.0],
                direction: [0.3, -1.0, 0.2],
                color: [0.2, 0.4, 1.0], // Cool blue
                intensity: 8.0,
                range: 10.0,
                innerCone: 15.0,
                outerCone: 25.0
            }
        ];
        
        // Animation
        this.rotation = 0;
        this.animationSpeed = 1.0;
    }
    
    async init() {
        try {
            console.log('Initializing PBR Renderer...');
            
            // Get canvas and create WebGL context
            this.canvas = document.getElementById('canvas');
            if (!this.canvas) {
                throw new Error('Canvas element not found');
            }
            
            this.gl = createWebGLContext(this.canvas);
            
            // Load and compile shaders with correct paths relative to index.html
            console.log('Loading shaders...');
            
            this.shaderProgram = createShaderProgram(
                this.gl, 
                vertexShaderSource, 
                fragmentShaderSource
            );
            
            // Create uniform manager
            this.uniformManager = new UniformManager(this.gl, this.shaderProgram);
            
            // Initialize camera
            console.log('Initializing camera...');
            this.camera = new Camera(this.canvas);
            
            // Create geometry
            console.log('Creating geometry...');
            this.meshes = {
                cube: Mesh.createCube(this.gl),
                sphere: Mesh.createSphere(this.gl, 1.0, 32),
                plane: Mesh.createPlane(this.gl, 4.0),
                cylinder: Mesh.createCylinder(this.gl, 1.0, 2.0, 16)
            };
            
            // Create scene manager and setup initial scene
            this.sceneManager = new SceneManager();
            
            // Start with single sphere (clean, focused experience)
            this.sceneManager.addObject(new SceneObject(
                this.meshes.sphere,
                this.material,
                { 
                    position: [0, 0, 0],
                    rotationSpeed: [0, 0.5, 0]
                }
            ));
            
            // For backward compatibility with material editor
            this.mesh = this.meshes.cube;
            
            // Setup WebGL state
            this.setupWebGLState();
            
            // Setup UI
            this.setupUI();
            
            // Create material editor
            this.materialEditor = new MaterialEditor(this);
            
            console.log('PBR Renderer initialized successfully!');
            
            // Start render loop
            this.lastTime = performance.now();
            this.render();
            
        } catch (error) {
            this.displayError('Initialization failed: ' + error.message);
            console.error('Init error:', error);
        }
    }
    
    setupWebGLState() {
        const gl = this.gl;
        
        // Enable depth testing
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        
        // Enable face culling
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
        
        // Set clear color to dark gray
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        
        // Enable blending for alpha
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    
    setupUI() {
        // Setup FPS counter
        this.fpsElement = document.getElementById('fps-counter');
        this.frameTimeElement = document.getElementById('frame-time');
        
        // Setup error handling
        window.addEventListener('error', (event) => {
            this.displayError('JavaScript error: ' + event.message);
        });
        
        // Setup resize handling
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Initial resize
        this.handleResize();
    }
    
    handleResize() {
        const canvas = this.canvas;
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
            
            this.gl.viewport(0, 0, displayWidth, displayHeight);
            
            if (this.camera) {
                this.camera.aspect = displayWidth / displayHeight;
                this.camera.updateProjectionMatrix();
            }
        }
    }
    
    update(deltaTime) {
        // Update scene objects
        if (this.sceneManager) {
            this.sceneManager.update(deltaTime);
        }
        
        // Animate rotation (for backward compatibility)
        this.rotation += deltaTime * this.animationSpeed;
        
        // Update material editor
        if (this.materialEditor) {
            this.materialEditor.update();
        }
        
        // Update FPS counter
        this.frameCount++;
        const currentTime = performance.now();
        if (currentTime - this.lastFpsTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsTime));
            this.frameCount = 0;
            this.lastFpsTime = currentTime;
            
            if (this.fpsElement) {
                this.fpsElement.textContent = `FPS: ${this.fps}`;
            }
            if (this.frameTimeElement) {
                const frameTime = (1000 / this.fps).toFixed(2);
                this.frameTimeElement.textContent = `Frame: ${frameTime} ms`;
            }
        }
    }
    
    render() {
        try {
            const currentTime = performance.now();
            this.deltaTime = (currentTime - this.lastTime) / 1000.0;
            this.lastTime = currentTime;
            
            // Update
            this.update(this.deltaTime);
            
            // Clear
            const gl = this.gl;
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            
            // Use shader program
            gl.useProgram(this.shaderProgram);
            
            // Set global uniforms (same for all objects)
            this.uniformManager.setUniform('u_viewMatrix', this.camera.getViewMatrix());
            this.uniformManager.setUniform('u_projectionMatrix', this.camera.getProjectionMatrix());
            this.uniformManager.setUniform('u_cameraPosition', Array.from(this.camera.getPosition()));
            
            // Set multi-light uniforms
            this.uniformManager.setUniform('u_numLights', this.lights.length);
            for (let i = 0; i < this.lights.length; i++) {
                if (this.uniformManager.hasUniform(`u_lightTypes[${i}]`)) {
                    this.uniformManager.setUniform(`u_lightTypes[${i}]`, this.lights[i].type);
                    this.uniformManager.setUniform(`u_lightPositions[${i}]`, this.lights[i].position);
                    this.uniformManager.setUniform(`u_lightDirections[${i}]`, this.lights[i].direction);
                    this.uniformManager.setUniform(`u_lightColors[${i}]`, this.lights[i].color);
                    this.uniformManager.setUniform(`u_lightIntensities[${i}]`, this.lights[i].intensity);
                    this.uniformManager.setUniform(`u_lightRanges[${i}]`, this.lights[i].range);
                    this.uniformManager.setUniform(`u_lightInnerCones[${i}]`, this.lights[i].innerCone);
                    this.uniformManager.setUniform(`u_lightOuterCones[${i}]`, this.lights[i].outerCone);
                }
            }
            
            // Set IBL uniforms
            this.uniformManager.setUniform('u_useIBL', this.ibl.enabled ? 1 : 0);
            this.uniformManager.setUniform('u_iblIntensity', this.ibl.intensity);
            this.uniformManager.setUniform('u_ambientColor', this.ibl.ambientColor);
            
            // Render all scene objects
            if (this.sceneManager) {
                const objects = this.sceneManager.getAllObjects();
                
                for (const sceneObject of objects) {
                    // Create model matrix
                    const modelMatrix = sceneObject.modelMatrix;
                    
                    // Create normal matrix
                    const normalMatrix = mat3.create();
                    mat3.normalFromMat4(normalMatrix, modelMatrix);
                    
                    // Set transform uniforms
                    this.uniformManager.setUniform('u_modelMatrix', modelMatrix);
                    this.uniformManager.setUniform('u_normalMatrix', normalMatrix);
                    
                    // Set object-specific material
                    this.uniformManager.setUniform('u_albedo', sceneObject.material.albedo);
                    this.uniformManager.setUniform('u_metallic', sceneObject.material.metallic);
                    this.uniformManager.setUniform('u_roughness', sceneObject.material.roughness);
                    this.uniformManager.setUniform('u_ao', sceneObject.material.ao);
                    
                    // Render the object
                    sceneObject.render(this);
                }
            } else {
                // Fallback: render single object (backward compatibility)
                const modelMatrix = mat4.create();
                mat4.rotateY(modelMatrix, modelMatrix, this.rotation);
                mat4.rotateX(modelMatrix, modelMatrix, this.rotation * 0.5);
                
                const normalMatrix = mat3.create();
                mat3.normalFromMat4(normalMatrix, modelMatrix);
                
                this.uniformManager.setUniform('u_modelMatrix', modelMatrix);
                this.uniformManager.setUniform('u_normalMatrix', normalMatrix);
                this.uniformManager.setUniform('u_albedo', this.material.albedo);
                this.uniformManager.setUniform('u_metallic', this.material.metallic);
                this.uniformManager.setUniform('u_roughness', this.material.roughness);
                this.uniformManager.setUniform('u_ao', this.material.ao);
                
                if (this.mesh) {
                    this.mesh.render();
                }
            }
            
            checkGLError(gl, 'render');
            
        } catch (error) {
            console.error('Render error:', error);
            this.displayError('Render error: ' + error.message);
        }
        
        // Continue render loop
        requestAnimationFrame(() => this.render());
    }
    
    displayError(message) {
        console.error(message);
        
        // Create error display if it doesn't exist
        let errorDiv = document.getElementById('error-display');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'error-display';
            errorDiv.className = 'error';
            document.body.appendChild(errorDiv);
        }
        
        errorDiv.innerHTML = `
            <h3>Error</h3>
            <p>${message}</p>
            <p>Check the browser console for more details.</p>
        `;
        errorDiv.style.display = 'block';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    const renderer = new PBRRenderer();
    await renderer.init();
});

// Export for debugging
window.PBRRenderer = PBRRenderer;