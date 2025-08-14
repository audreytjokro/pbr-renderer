/**
 * Mesh class for loading and rendering 3D geometry
 */
export class Mesh {
    constructor(gl) {
        this.gl = gl;
        this.vertexArray = null;
        this.vertexBuffer = null;
        this.indexBuffer = null;
        this.indexCount = 0;
    }
    
    /**
     * Create a cube mesh with proper normals and UVs
     */
    static createCube(gl) {
        const mesh = new Mesh(gl);
        
        // Cube vertices with positions, normals, and texture coordinates
        // Each face needs separate vertices for proper normals
        const vertices = new Float32Array([
            // Front face
            -1.0, -1.0,  1.0,   0.0,  0.0,  1.0,   0.0, 0.0,  // Bottom-left
             1.0, -1.0,  1.0,   0.0,  0.0,  1.0,   1.0, 0.0,  // Bottom-right
             1.0,  1.0,  1.0,   0.0,  0.0,  1.0,   1.0, 1.0,  // Top-right
            -1.0,  1.0,  1.0,   0.0,  0.0,  1.0,   0.0, 1.0,  // Top-left
            
            // Back face
            -1.0, -1.0, -1.0,   0.0,  0.0, -1.0,   1.0, 0.0,  // Bottom-left
            -1.0,  1.0, -1.0,   0.0,  0.0, -1.0,   1.0, 1.0,  // Top-left
             1.0,  1.0, -1.0,   0.0,  0.0, -1.0,   0.0, 1.0,  // Top-right
             1.0, -1.0, -1.0,   0.0,  0.0, -1.0,   0.0, 0.0,  // Bottom-right
            
            // Top face
            -1.0,  1.0, -1.0,   0.0,  1.0,  0.0,   0.0, 1.0,  // Top-left
            -1.0,  1.0,  1.0,   0.0,  1.0,  0.0,   0.0, 0.0,  // Bottom-left
             1.0,  1.0,  1.0,   0.0,  1.0,  0.0,   1.0, 0.0,  // Bottom-right
             1.0,  1.0, -1.0,   0.0,  1.0,  0.0,   1.0, 1.0,  // Top-right
            
            // Bottom face
            -1.0, -1.0, -1.0,   0.0, -1.0,  0.0,   1.0, 1.0,  // Top-right
             1.0, -1.0, -1.0,   0.0, -1.0,  0.0,   0.0, 1.0,  // Top-left
             1.0, -1.0,  1.0,   0.0, -1.0,  0.0,   0.0, 0.0,  // Bottom-left
            -1.0, -1.0,  1.0,   0.0, -1.0,  0.0,   1.0, 0.0,  // Bottom-right
            
            // Right face
             1.0, -1.0, -1.0,   1.0,  0.0,  0.0,   1.0, 0.0,  // Bottom-left
             1.0,  1.0, -1.0,   1.0,  0.0,  0.0,   1.0, 1.0,  // Top-left
             1.0,  1.0,  1.0,   1.0,  0.0,  0.0,   0.0, 1.0,  // Top-right
             1.0, -1.0,  1.0,   1.0,  0.0,  0.0,   0.0, 0.0,  // Bottom-right
            
            // Left face
            -1.0, -1.0, -1.0,  -1.0,  0.0,  0.0,   0.0, 0.0,  // Bottom-right
            -1.0, -1.0,  1.0,  -1.0,  0.0,  0.0,   1.0, 0.0,  // Bottom-left
            -1.0,  1.0,  1.0,  -1.0,  0.0,  0.0,   1.0, 1.0,  // Top-left
            -1.0,  1.0, -1.0,  -1.0,  0.0,  0.0,   0.0, 1.0   // Top-right
        ]);
        
        // Indices for drawing triangles (2 triangles per face)
        const indices = new Uint16Array([
            0,  1,  2,    0,  2,  3,    // Front face
            4,  5,  6,    4,  6,  7,    // Back face
            8,  9,  10,   8,  10, 11,   // Top face
            12, 13, 14,   12, 14, 15,   // Bottom face
            16, 17, 18,   16, 18, 19,   // Right face
            20, 21, 22,   20, 22, 23    // Left face
        ]);
        
        mesh.loadFromData(vertices, indices);
        return mesh;
    }
    
    /**
     * Create a sphere mesh for testing
     */
    static createSphere(gl, radius = 1.0, segments = 32) {
        const mesh = new Mesh(gl);
        
        const vertices = [];
        const indices = [];
        
        // Generate sphere vertices
        for (let lat = 0; lat <= segments; lat++) {
            const theta = lat * Math.PI / segments;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            for (let lon = 0; lon <= segments; lon++) {
                const phi = lon * 2 * Math.PI / segments;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                
                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;
                
                const u = 1 - (lon / segments);
                const v = 1 - (lat / segments);
                
                // Position
                vertices.push(radius * x, radius * y, radius * z);
                // Normal (same as position for unit sphere)
                vertices.push(x, y, z);
                // UV
                vertices.push(u, v);
            }
        }
        
        // Generate sphere indices
        for (let lat = 0; lat < segments; lat++) {
            for (let lon = 0; lon < segments; lon++) {
                const first = (lat * (segments + 1)) + lon;
                const second = first + segments + 1;
                
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }
        
        mesh.loadFromData(new Float32Array(vertices), new Uint16Array(indices));
        return mesh;
    }
    
    /**
     * Load mesh from vertex and index data
     */
    loadFromData(vertices, indices) {
        const gl = this.gl;
        
        try {
            // Create and bind vertex array object
            this.vertexArray = gl.createVertexArray();
            gl.bindVertexArray(this.vertexArray);
            
            // Create vertex buffer
            this.vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            
            // Set up vertex attributes
            // Position (location 0)
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 8 * 4, 0);
            
            // Normal (location 1)
            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 8 * 4, 3 * 4);
            
            // Texture coordinates (location 2)
            gl.enableVertexAttribArray(2);
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 8 * 4, 6 * 4);
            
            // Create index buffer
            this.indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
            
            this.indexCount = indices.length;
            
            // Unbind
            gl.bindVertexArray(null);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            
            console.log(`Mesh loaded: ${vertices.length / 8} vertices, ${indices.length / 3} triangles`);
        } catch (error) {
            console.error('Error loading mesh data:', error);
            throw error;
        }
    }
    
    /**
     * Render the mesh
     */
    render() {
        const gl = this.gl;
        
        if (!this.vertexArray) {
            console.warn('Mesh not loaded');
            return;
        }
        
        try {
            gl.bindVertexArray(this.vertexArray);
            gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
            gl.bindVertexArray(null);
        } catch (error) {
            console.error('Error rendering mesh:', error);
            throw error;
        }
    }
    
    /**
     * Create a plane mesh (for floors, walls, etc.)
     */
    static createPlane(gl, size = 2.0) {
        const mesh = new Mesh(gl);
        
        const s = size / 2;
        const vertices = new Float32Array([
            // Positions      // Normals       // UVs
            -s, 0, -s,        0, 1, 0,        0, 0,  // Bottom-left
             s, 0, -s,        0, 1, 0,        1, 0,  // Bottom-right
             s, 0,  s,        0, 1, 0,        1, 1,  // Top-right
            -s, 0,  s,        0, 1, 0,        0, 1   // Top-left
        ]);
        
        const indices = new Uint16Array([
            0, 1, 2,  0, 2, 3
        ]);
        
        mesh.loadFromData(vertices, indices);
        return mesh;
    }
    
    /**
     * Create a cylinder mesh
     */
    static createCylinder(gl, radius = 1.0, height = 2.0, segments = 16) {
        const mesh = new Mesh(gl);
        
        const vertices = [];
        const indices = [];
        
        const halfHeight = height / 2;
        
        // Generate vertices for top and bottom circles
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const u = i / segments;
            
            // Top circle
            vertices.push(x, halfHeight, z);   // Position
            vertices.push(0, 1, 0);           // Normal (up)
            vertices.push(u, 1);              // UV
            
            // Bottom circle
            vertices.push(x, -halfHeight, z);  // Position
            vertices.push(0, -1, 0);          // Normal (down)
            vertices.push(u, 0);              // UV
            
            // Side vertices (top)
            vertices.push(x, halfHeight, z);   // Position
            vertices.push(x/radius, 0, z/radius); // Normal (outward)
            vertices.push(u, 1);              // UV
            
            // Side vertices (bottom)
            vertices.push(x, -halfHeight, z);  // Position
            vertices.push(x/radius, 0, z/radius); // Normal (outward)
            vertices.push(u, 0);              // UV
        }
        
        // Generate indices for sides
        for (let i = 0; i < segments; i++) {
            const sideTopA = (i * 4) + 2;      // Current top side vertex
            const sideBottomA = (i * 4) + 3;   // Current bottom side vertex
            const sideTopB = ((i + 1) % segments) * 4 + 2;    // Next top side vertex
            const sideBottomB = ((i + 1) % segments) * 4 + 3; // Next bottom side vertex
            
            // Two triangles for each side quad
            indices.push(sideTopA, sideBottomA, sideTopB);
            indices.push(sideBottomA, sideBottomB, sideTopB);
        }

        const vertsPerSeg = 4;                                // you emit 4 verts per segment
        const ringVertCount = (segments + 1) * vertsPerSeg;   // total ring verts you created
        const topCenterIndex = ringVertCount;                 // new index for top center
        const bottomCenterIndex = topCenterIndex + 1;         // new index for bottom center

        // Top center (pos, normal, uv)
        vertices.push(0,  halfHeight, 0);  // position
        vertices.push(0,  1,          0);  // normal up
        vertices.push(0.5, 0.5);           // uv center of disk

        // Bottom center (pos, normal, uv)
        vertices.push(0, -halfHeight, 0);  // position
        vertices.push(0, -1,          0);  // normal down
        vertices.push(0.5, 0.5);           // uv center of disk

        for (let i = 0; i < segments; i++) {
        const a = i * 4 + 0;        // current top ring vertex
        const b = (i + 1) * 4 + 0;  // next top ring vertex
        indices.push(topCenterIndex, a, b);
        }

        // Reverse winding so the bottom faces outward with default BACK culling
        for (let i = 0; i < segments; i++) {
        const a = i * 4 + 1;        // current bottom ring vertex
        const b = (i + 1) * 4 + 1;  // next bottom ring vertex
        indices.push(bottomCenterIndex, b, a);
        }
        
        mesh.loadFromData(new Float32Array(vertices), new Uint16Array(indices));
        return mesh;
    }
    dispose() {
        const gl = this.gl;
        
        if (this.vertexArray) {
            gl.deleteVertexArray(this.vertexArray);
            this.vertexArray = null;
        }
        
        if (this.vertexBuffer) {
            gl.deleteBuffer(this.vertexBuffer);
            this.vertexBuffer = null;
        }
        
        if (this.indexBuffer) {
            gl.deleteBuffer(this.indexBuffer);
            this.indexBuffer = null;
        }
    }
}