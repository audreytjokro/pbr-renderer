import { mat4, vec3 } from 'gl-matrix';

/**
 * Orbit camera controller with mouse/touch support
 */
export class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Camera parameters
        this.position = vec3.fromValues(0, 0, 5);
        this.target = vec3.fromValues(0, 0, 0);
        this.up = vec3.fromValues(0, 1, 0);
        
        // Orbit parameters
        this.radius = 5.0;
        this.azimuth = 0.0;  // horizontal rotation (radians)
        this.elevation = 0.0; // vertical rotation (radians)
        
        // Projection parameters
        this.fov = Math.PI / 4; // 45 degrees
        this.near = 0.1;
        this.far = 100.0;
        this.aspect = canvas.width / canvas.height;
        
        // Interaction parameters
        this.rotateSpeed = 0.005;
        this.zoomSpeed = 0.1;
        this.minRadius = 1.0;
        this.maxRadius = 20.0;
        this.minElevation = -Math.PI / 2 + 0.1;
        this.maxElevation = Math.PI / 2 - 0.1;
        
        // Matrices
        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
        
        // Mouse state
        this.isMouseDown = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Initialize
        this.updateProjectionMatrix();
        this.updateViewMatrix();
        this.setupEventListeners();
    }
    
    updateProjectionMatrix() {
        mat4.perspective(this.projectionMatrix, this.fov, this.aspect, this.near, this.far);
    }
    
    updateViewMatrix() {
        // Convert spherical coordinates to cartesian
        const x = this.radius * Math.cos(this.elevation) * Math.cos(this.azimuth);
        const y = this.radius * Math.sin(this.elevation);
        const z = this.radius * Math.cos(this.elevation) * Math.sin(this.azimuth);
        
        // Update position
        vec3.set(this.position, x, y, z);
        vec3.add(this.position, this.position, this.target);
        
        // Create view matrix
        mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Window resize
        window.addEventListener('resize', this.onResize.bind(this));
    }
    
    onMouseDown(event) {
        this.isMouseDown = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.canvas.style.cursor = 'grabbing';
    }
    
    onMouseMove(event) {
        if (!this.isMouseDown) return;
        
        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;
        
        // Update rotation
        this.azimuth -= deltaX * this.rotateSpeed;
        this.elevation -= deltaY * this.rotateSpeed;
        
        // Clamp elevation
        this.elevation = Math.max(this.minElevation, Math.min(this.maxElevation, this.elevation));
        
        // Wrap azimuth
        this.azimuth = this.azimuth % (2 * Math.PI);
        
        this.updateViewMatrix();
        
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }
    
    onMouseUp(event) {
        this.isMouseDown = false;
        this.canvas.style.cursor = 'grab';
    }
    
    onWheel(event) {
        event.preventDefault();
        
        const delta = event.deltaY > 0 ? 1 : -1;
        this.radius += delta * this.zoomSpeed;
        
        // Clamp radius
        this.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.radius));
        
        this.updateViewMatrix();
    }
    
    // Touch event handlers (simplified)
    onTouchStart(event) {
        if (event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            this.isMouseDown = true;
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
        }
    }
    
    onTouchMove(event) {
        if (event.touches.length === 1 && this.isMouseDown) {
            event.preventDefault();
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.lastMouseX;
            const deltaY = touch.clientY - this.lastMouseY;
            
            this.azimuth -= deltaX * this.rotateSpeed;
            this.elevation -= deltaY * this.rotateSpeed;
            this.elevation = Math.max(this.minElevation, Math.min(this.maxElevation, this.elevation));
            
            this.updateViewMatrix();
            
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
        }
    }
    
    onTouchEnd(event) {
        this.isMouseDown = false;
    }
    
    onResize() {
        this.aspect = this.canvas.width / this.canvas.height;
        this.updateProjectionMatrix();
    }
    
    // Public methods
    setTarget(x, y, z) {
        vec3.set(this.target, x, y, z);
        this.updateViewMatrix();
    }
    
    setRadius(radius) {
        this.radius = Math.max(this.minRadius, Math.min(this.maxRadius, radius));
        this.updateViewMatrix();
    }
    
    getViewMatrix() {
        return this.viewMatrix;
    }
    
    getProjectionMatrix() {
        return this.projectionMatrix;
    }
    
    getPosition() {
        return this.position;
    }
}