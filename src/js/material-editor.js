import { GUI } from 'dat.gui';
import { SceneObject } from './scene-object.js';

/**
 * Material Editor UI using dat.GUI
 */
export class MaterialEditor {
    constructor(renderer) {
        this.renderer = renderer;
        this.gui = new GUI({ width: 300 });
        this.gui.domElement.style.position = 'absolute';
        this.gui.domElement.style.top = '10px';
        this.gui.domElement.style.right = '10px';
        this.gui.domElement.style.zIndex = '1000';
        
        this.setupMaterialControls();
        this.setupSceneControls();
        this.setupLightingControls();
        this.setupRenderingControls();
        this.setupPresets();
    }
    
    setupMaterialControls() {
        const materialFolder = this.gui.addFolder('Material Properties');
        
        // Material type selector
        this.materialType = {
            preset: 'Custom'
        };
        
        // PBR Parameters
        const material = this.renderer.material;
        
        // Albedo color picker
        this.albedoController = materialFolder.addColor(material, 'albedo')
            .name('Albedo Color')
            .onChange(() => this.updateMaterial());
        
        // Metallic slider
        this.metallicController = materialFolder.add(material, 'metallic', 0, 1, 0.01)
            .name('Metallic')
            .onChange(() => this.updateMaterial());
        
        // Roughness slider
        this.roughnessController = materialFolder.add(material, 'roughness', 0, 1, 0.01)
            .name('Roughness')
            .onChange(() => this.updateMaterial());
        
        // Ambient Occlusion
        this.aoController = materialFolder.add(material, 'ao', 0, 1, 0.01)
            .name('Ambient Occlusion')
            .onChange(() => this.updateMaterial());
        
        materialFolder.open();
    }
    
    setupSceneControls() {
        const objectFolder = this.gui.addFolder('Object & Scene');
        
        this.objectControls = {
            shape: 'Sphere',
            backgroundEnvironment: 'Studio'
        };
        
        // Object shape selector
        objectFolder.add(this.objectControls, 'shape', [
            'Sphere', 'Cube', 'Cylinder', 'Plane'
        ]).name('Object Shape').onChange((value) => this.changeObjectShape(value));
        
        // Environment selector  
        objectFolder.add(this.objectControls, 'backgroundEnvironment', [
            'Studio', 'Outdoor', 'Sunset', 'Night'
        ]).name('Environment').onChange((value) => this.changeEnvironment(value));
        
        objectFolder.open();
    }
    
    setupLightingControls() {
        const lightingFolder = this.gui.addFolder('Lighting');
        
        // IBL Controls
        const ibl = this.renderer.ibl;
        lightingFolder.add(ibl, 'enabled')
            .name('Environment Lighting')
            .onChange(() => this.updateMaterial());
            
        lightingFolder.add(ibl, 'intensity', 0, 3, 0.1)
            .name('Environment Intensity')
            .onChange(() => this.updateMaterial());
        
        // Main directional light
        if (this.renderer.lights.length > 0) {
            const mainLight = this.renderer.lights[0];
            
            const lightFolder = lightingFolder.addFolder('Main Light');
            lightFolder.add(mainLight, 'intensity', 0, 10, 0.1)
                .name('Intensity')
                .onChange(() => this.updateMaterial());
                
            lightFolder.addColor(mainLight, 'color')
                .name('Color')
                .onChange(() => this.updateMaterial());
        }
        
        lightingFolder.open();
    }
    
    setupRenderingControls() {
        const renderFolder = this.gui.addFolder('Rendering');
        
        // Debug modes
        this.debugMode = {
            mode: 'Final',
            showWireframe: false
        };
        
        renderFolder.add(this.debugMode, 'mode', [
            'Final', 'Albedo', 'Metallic', 'Roughness', 'Normals', 'AO'
        ]).name('Debug View').onChange(() => this.updateDebugMode());
        
        renderFolder.add(this.debugMode, 'showWireframe')
            .name('Wireframe')
            .onChange(() => this.updateWireframe());
        
        // Export functionality
        renderFolder.add({
            'Export Material': () => this.exportMaterial()
        }, 'Export Material');
        
        renderFolder.add({
            'Save Screenshot': () => this.saveScreenshot()
        }, 'Save Screenshot');
        
        // Camera controls info
        const cameraFolder = renderFolder.addFolder('Camera Info');
        this.cameraInfo = {
            distance: '5.0',
            position: 'x: 0, y: 0, z: 5'
        };
        
        cameraFolder.add(this.cameraInfo, 'distance').name('Distance').listen();
        cameraFolder.add(this.cameraInfo, 'position').name('Position').listen();
        
        renderFolder.open();
    }
    
    setupPresets() {
        const presetFolder = this.gui.addFolder('Material Presets');
        
        this.presets = {
            'Gold': {
                albedo: [1.0, 0.8, 0.1],
                metallic: 1.0,
                roughness: 0.1,
                ao: 1.0
            },
            'Silver': {
                albedo: [0.95, 0.95, 0.95],
                metallic: 1.0,
                roughness: 0.05,
                ao: 1.0
            },
            'Copper': {
                albedo: [0.95, 0.6, 0.4],
                metallic: 1.0,
                roughness: 0.15,
                ao: 1.0
            },
            'Iron': {
                albedo: [0.56, 0.56, 0.56],
                metallic: 1.0,
                roughness: 0.3,
                ao: 1.0
            },
            'Plastic Red': {
                albedo: [0.8, 0.2, 0.2],
                metallic: 0.0,
                roughness: 0.5,
                ao: 1.0
            },
            'Plastic Blue': {
                albedo: [0.2, 0.4, 0.8],
                metallic: 0.0,
                roughness: 0.3,
                ao: 1.0
            },
            'Rubber': {
                albedo: [0.1, 0.1, 0.1],
                metallic: 0.0,
                roughness: 0.9,
                ao: 1.0
            },
            'Ceramic': {
                albedo: [0.9, 0.9, 0.85],
                metallic: 0.0,
                roughness: 0.1,
                ao: 1.0
            },
            'Wood': {
                albedo: [0.6, 0.4, 0.2],
                metallic: 0.0,
                roughness: 0.8,
                ao: 1.0
            },
            'Glass': {
                albedo: [0.95, 0.95, 0.95],
                metallic: 0.0,
                roughness: 0.0,
                ao: 1.0
            }
        };
        
        // Create preset buttons
        Object.keys(this.presets).forEach(presetName => {
            presetFolder.add({
                [presetName]: () => this.loadPreset(presetName)
            }, presetName);
        });
        
        presetFolder.open();
    }
    
    loadPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;
        
        // Update main material properties
        this.renderer.material.albedo = [...preset.albedo];
        this.renderer.material.metallic = preset.metallic;
        this.renderer.material.roughness = preset.roughness;
        this.renderer.material.ao = preset.ao;
        
        // Update all scene objects with the new material
        const sceneManager = this.renderer.sceneManager;
        if (sceneManager) {
            sceneManager.getAllObjects().forEach(obj => {
                obj.material.albedo = [...preset.albedo];
                obj.material.metallic = preset.metallic;
                obj.material.roughness = preset.roughness;
                obj.material.ao = preset.ao;
            });
        }
        
        // Update GUI controllers
        this.albedoController.updateDisplay();
        this.metallicController.updateDisplay();
        this.roughnessController.updateDisplay();
        this.aoController.updateDisplay();
        
        this.materialType.preset = presetName;
        
        console.log(`Loaded preset: ${presetName}`);
    }
    
    changeObjectShape(shape) {
        const sceneManager = this.renderer.sceneManager;
        if (!sceneManager) return;
        
        // Clear current scene
        sceneManager.objects = [];
        
        // Select mesh based on shape
        let selectedMesh;
        switch (shape) {
            case 'Sphere':
                selectedMesh = this.renderer.meshes.sphere;
                break;
            case 'Cube':
                selectedMesh = this.renderer.meshes.cube;
                break;
            case 'Cylinder':
                selectedMesh = this.renderer.meshes.cylinder;
                break;
            case 'Plane':
                selectedMesh = this.renderer.meshes.plane;
                break;
            default:
                selectedMesh = this.renderer.meshes.sphere;
        }
        
        // Add single object with current material settings
        sceneManager.addObject(new SceneObject(
            selectedMesh,
            this.renderer.material,
            { 
                position: [0, 0, 0],
                rotationSpeed: [0, 0.5, 0] // Slow rotation to show material
            }
        ));
        
        console.log(`Changed object shape to: ${shape}`);
    }
    
    changeEnvironment(environment) {
        // Update IBL settings based on environment
        const ibl = this.renderer.ibl;
        
        switch (environment) {
            case 'Studio':
                ibl.intensity = 1.0;
                ibl.ambientColor = [0.1, 0.1, 0.15];
                break;
            case 'Outdoor':
                ibl.intensity = 1.5;
                ibl.ambientColor = [0.15, 0.15, 0.1];
                break;
            case 'Sunset':
                ibl.intensity = 0.8;
                ibl.ambientColor = [0.2, 0.1, 0.05];
                break;
            case 'Night':
                ibl.intensity = 0.3;
                ibl.ambientColor = [0.05, 0.05, 0.1];
                break;
        }
        
        console.log(`Changed environment to: ${environment}`);
    }
    
    updateMaterial() {
        // Update all scene objects when material parameters change
        const sceneManager = this.renderer.sceneManager;
        if (sceneManager) {
            sceneManager.getAllObjects().forEach(obj => {
                obj.material.albedo = [...this.renderer.material.albedo];
                obj.material.metallic = this.renderer.material.metallic;
                obj.material.roughness = this.renderer.material.roughness;
                obj.material.ao = this.renderer.material.ao;
            });
        }
        
        // Mark as custom when manually adjusted
        this.materialType.preset = 'Custom';
    }
    
    updateDebugMode() {
        // For now, just log the debug mode
        // In a full implementation, this would change shader uniforms
        console.log(`Debug mode: ${this.debugMode.mode}`);
    }
    
    updateWireframe() {
        // For now, just log wireframe toggle
        // In a full implementation, this would change rendering mode
        console.log(`Wireframe: ${this.debugMode.showWireframe}`);
    }
    
    updateCameraInfo() {
        const camera = this.renderer.camera;
        this.cameraInfo.distance = camera.radius.toFixed(1);
        this.cameraInfo.position = `x: ${camera.position[0].toFixed(1)}, y: ${camera.position[1].toFixed(1)}, z: ${camera.position[2].toFixed(1)}`;
    }
    
    update() {
        // Update camera info display
        this.updateCameraInfo();
    }
    
    destroy() {
        if (this.gui) {
            this.gui.destroy();
        }
    }
    
    exportMaterial() {
        const material = this.renderer.material;
        const materialData = {
            name: this.materialType.preset || 'Custom',
            albedo: material.albedo,
            metallic: material.metallic,
            roughness: material.roughness,
            ao: material.ao,
            timestamp: new Date().toISOString(),
            renderer: 'PBR Material Studio'
        };
        
        // Download as JSON
        const dataStr = JSON.stringify(materialData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `material_${materialData.name.toLowerCase().replace(/\s+/g, '_')}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        console.log('Material exported successfully');
    }
    
    saveScreenshot() {
        const canvas = this.renderer.canvas;
        const link = document.createElement('a');
        link.download = `material_preview_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        console.log('Screenshot saved');
    }
}