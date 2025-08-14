import { mat4, vec3 } from 'gl-matrix';

/**
 * Scene Object - represents a renderable object with transform and material
 */
export class SceneObject {
    constructor(mesh, material, transform = {}) {
        this.mesh = mesh;
        this.material = {
            albedo: material.albedo || [0.7, 0.7, 0.7],
            metallic: material.metallic || 0.0,
            roughness: material.roughness || 0.5,
            ao: material.ao || 1.0
        };
        
        // Transform properties
        this.position = vec3.fromValues(
            transform.position?.[0] || 0,
            transform.position?.[1] || 0,
            transform.position?.[2] || 0
        );
        this.rotation = vec3.fromValues(
            transform.rotation?.[0] || 0,
            transform.rotation?.[1] || 0,
            transform.rotation?.[2] || 0
        );
        this.scale = vec3.fromValues(
            transform.scale?.[0] || 1,
            transform.scale?.[1] || 1,
            transform.scale?.[2] || 1
        );
        
        // Animation properties
        this.rotationSpeed = transform.rotationSpeed || [0, 0, 0];
        
        // Computed matrix
        this.modelMatrix = mat4.create();
        this.updateMatrix();
    }
    
    updateMatrix() {
        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, this.position);
        mat4.rotateX(this.modelMatrix, this.modelMatrix, this.rotation[0]);
        mat4.rotateY(this.modelMatrix, this.modelMatrix, this.rotation[1]);
        mat4.rotateZ(this.modelMatrix, this.modelMatrix, this.rotation[2]);
        mat4.scale(this.modelMatrix, this.modelMatrix, this.scale);
    }
    
    update(deltaTime) {
        // Apply rotation animation
        this.rotation[0] += this.rotationSpeed[0] * deltaTime;
        this.rotation[1] += this.rotationSpeed[1] * deltaTime;
        this.rotation[2] += this.rotationSpeed[2] * deltaTime;
        
        this.updateMatrix();
    }
    
    render(renderer) {
        // This will be called by the main renderer
        if (this.mesh) {
            this.mesh.render();
        }
    }
}

/**
 * Scene Manager - handles multiple objects and materials
 */
export class SceneManager {
    constructor() {
        this.objects = [];
        this.activeObjectIndex = 0;
    }
    
    addObject(sceneObject) {
        this.objects.push(sceneObject);
        return this.objects.length - 1;
    }
    
    removeObject(index) {
        if (index >= 0 && index < this.objects.length) {
            this.objects.splice(index, 1);
            if (this.activeObjectIndex >= this.objects.length) {
                this.activeObjectIndex = Math.max(0, this.objects.length - 1);
            }
        }
    }
    
    getActiveObject() {
        return this.objects[this.activeObjectIndex] || null;
    }
    
    setActiveObject(index) {
        if (index >= 0 && index < this.objects.length) {
            this.activeObjectIndex = index;
        }
    }
    
    update(deltaTime) {
        this.objects.forEach(obj => obj.update(deltaTime));
    }
    
    getAllObjects() {
        return this.objects;
    }
    
    // Predefined scene setups
    createMaterialShowcase(meshes) {
        this.objects = []; // Clear existing objects
        
        const materials = [
            { name: 'Gold', albedo: [1.0, 0.8, 0.1], metallic: 1.0, roughness: 0.1 },
            { name: 'Silver', albedo: [0.95, 0.95, 0.95], metallic: 1.0, roughness: 0.05 },
            { name: 'Copper', albedo: [0.95, 0.6, 0.4], metallic: 1.0, roughness: 0.15 },
            { name: 'Plastic Red', albedo: [0.8, 0.2, 0.2], metallic: 0.0, roughness: 0.3 },
            { name: 'Plastic Blue', albedo: [0.2, 0.4, 0.8], metallic: 0.0, roughness: 0.5 }
        ];
        
        materials.forEach((material, index) => {
            const x = (index - 2) * 2.5; // Spread objects horizontally
            const obj = new SceneObject(
                meshes.sphere, // Use sphere for all objects
                material,
                {
                    position: [x, 0, 0],
                    rotationSpeed: [0, 0.5, 0] // Slow Y rotation
                }
            );
            this.addObject(obj);
        });
    }
    
    createMixedScene(meshes) {
        this.objects = []; // Clear existing objects
        
        // Center sphere - Gold
        this.addObject(new SceneObject(
            meshes.sphere,
            { albedo: [1.0, 0.8, 0.1], metallic: 1.0, roughness: 0.1 },
            { position: [0, 0, 0], rotationSpeed: [0, 1.0, 0] }
        ));
        
        // Left cube - Red plastic
        this.addObject(new SceneObject(
            meshes.cube,
            { albedo: [0.8, 0.2, 0.2], metallic: 0.0, roughness: 0.4 },
            { position: [-3, 0, 0], rotationSpeed: [0.5, 0.5, 0] }
        ));
        
        // Right cube - Blue plastic
        this.addObject(new SceneObject(
            meshes.cube,
            { albedo: [0.2, 0.4, 0.8], metallic: 0.0, roughness: 0.6 },
            { position: [3, 0, 0], rotationSpeed: [-0.5, 0.5, 0] }
        ));
        
        // Floor plane - Dark metal
        this.addObject(new SceneObject(
            meshes.plane,
            { albedo: [0.3, 0.3, 0.3], metallic: 1.0, roughness: 0.8 },
            { 
                position: [0, -2, 0], 
                scale: [8, 1, 8],
                rotation: [-Math.PI/2, 0, 0] // Rotate to be horizontal
            }
        ));
    }
}