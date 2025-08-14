#version 300 es
precision highp float;

// Math constants
#define PI 3.14159265359
#define MAX_LIGHTS 8

// Light types
#define LIGHT_DIRECTIONAL 0
#define LIGHT_POINT 1
#define LIGHT_SPOT 2

// Inputs from vertex shader
in vec3 v_worldPosition;
in vec3 v_normal;
in vec2 v_texCoord;

// Camera
uniform vec3 u_cameraPosition;

// Lights
uniform int u_numLights;
uniform int u_lightTypes[MAX_LIGHTS];
uniform vec3 u_lightPositions[MAX_LIGHTS];
uniform vec3 u_lightDirections[MAX_LIGHTS];
uniform vec3 u_lightColors[MAX_LIGHTS];
uniform float u_lightIntensities[MAX_LIGHTS];
uniform float u_lightRanges[MAX_LIGHTS];
uniform float u_lightInnerCones[MAX_LIGHTS];
uniform float u_lightOuterCones[MAX_LIGHTS];

// IBL settings
uniform bool u_useIBL;
uniform float u_iblIntensity;
uniform vec3 u_ambientColor;

// PBR Material properties
uniform vec3 u_albedo;
uniform float u_metallic;
uniform float u_roughness;
uniform float u_ao;

// Output color
out vec4 fragColor;

// ============================================================================
// PBR FUNCTIONS
// ============================================================================

float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
    
    return a2 / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    
    float denom = NdotV * (1.0 - k) + k;
    
    return NdotV / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);
    
    return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Fresnel with roughness for IBL
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// ============================================================================
// IBL FUNCTIONS
// ============================================================================

// Simple procedural sky
vec3 sampleSky(vec3 direction) {
    float horizon = direction.y;
    
    // Sky gradient
    vec3 skyColor = mix(
        vec3(0.4, 0.7, 1.0),    // Blue sky
        vec3(1.0, 0.9, 0.7),    // Horizon yellow
        pow(max(0.0, -horizon), 0.5)
    );
    
    // Sun
    vec3 sunDir = normalize(vec3(0.3, 0.8, 0.2));
    float sunDot = max(dot(direction, sunDir), 0.0);
    skyColor += vec3(1.0, 0.8, 0.4) * pow(sunDot, 128.0) * 2.0;
    
    return skyColor;
}

// Sample diffuse irradiance
vec3 sampleIrradiance(vec3 normal) {
    // Simplified approximation
    vec3 skyUp = sampleSky(vec3(0.0, 1.0, 0.0));
    vec3 skyDown = sampleSky(vec3(0.0, -1.0, 0.0));
    vec3 skyForward = sampleSky(normal);
    
    return (skyUp + skyDown + skyForward * 2.0) * 0.25;
}

// Sample specular radiance
vec3 sampleRadiance(vec3 reflectDir, float roughness) {
    return sampleSky(reflectDir) * (1.0 - roughness * 0.7);
}

// ============================================================================
// LIGHTING FUNCTIONS
// ============================================================================

vec3 calculateLightContribution(
    int lightType,
    vec3 lightPos,
    vec3 lightDir,
    vec3 lightColor,
    float lightIntensity,
    float lightRange,
    float innerCone,
    float outerCone,
    vec3 worldPos,
    vec3 N,
    vec3 V,
    vec3 albedo,
    float metallic,
    float roughness,
    vec3 F0
) {
    vec3 L;
    float attenuation = 1.0;
    
    if (lightType == LIGHT_DIRECTIONAL) {
        L = normalize(-lightDir);
    } else if (lightType == LIGHT_POINT) {
        L = normalize(lightPos - worldPos);
        float distance = length(lightPos - worldPos);
        attenuation = lightIntensity / (distance * distance);
        attenuation *= smoothstep(lightRange, lightRange * 0.5, distance);
    } else if (lightType == LIGHT_SPOT) {
        L = normalize(lightPos - worldPos);
        float distance = length(lightPos - worldPos);
        attenuation = lightIntensity / (distance * distance);
        attenuation *= smoothstep(lightRange, lightRange * 0.5, distance);
        
        vec3 spotDir = normalize(lightDir);
        float cosTheta = dot(L, -spotDir);
        float innerCos = cos(radians(innerCone));
        float outerCos = cos(radians(outerCone));
        float coneAttenuation = smoothstep(outerCos, innerCos, cosTheta);
        attenuation *= coneAttenuation;
    }
    
    if (attenuation < 0.001) {
        return vec3(0.0);
    }
    
    vec3 H = normalize(V + L);
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float HdotV = max(dot(H, V), 0.0);
    
    float D = DistributionGGX(N, H, roughness);
    float G = GeometrySmith(N, V, L, roughness);
    vec3 F = fresnelSchlick(HdotV, F0);
    
    vec3 numerator = D * G * F;
    float denominator = 4.0 * NdotV * NdotL + 0.0001;
    vec3 specular = numerator / denominator;
    
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;
    
    vec3 diffuse = kD * albedo / PI;
    vec3 radiance = lightColor * attenuation;
    
    return (diffuse + specular) * radiance * NdotL;
}

// ============================================================================
// MAIN SHADER
// ============================================================================

void main() {
    // Material properties
    vec3 albedo = pow(u_albedo, vec3(2.2));
    float metallic = u_metallic;
    float roughness = u_roughness;
    float ao = u_ao;
    
    // Calculate vectors
    vec3 N = normalize(v_normal);
    vec3 V = normalize(u_cameraPosition - v_worldPosition);
    vec3 R = reflect(-V, N);
    
    // Base reflectivity
    vec3 F0 = vec3(0.04);
    F0 = mix(F0, albedo, metallic);
    
    // Direct lighting
    vec3 Lo = vec3(0.0);
    
    for (int i = 0; i < u_numLights && i < MAX_LIGHTS; i++) {
        Lo += calculateLightContribution(
            u_lightTypes[i],
            u_lightPositions[i],
            u_lightDirections[i],
            u_lightColors[i],
            u_lightIntensities[i],
            u_lightRanges[i],
            u_lightInnerCones[i],
            u_lightOuterCones[i],
            v_worldPosition,
            N,
            V,
            albedo,
            metallic,
            roughness,
            F0
        );
    }
    
    // Image-based lighting
    vec3 ambient = vec3(0.0);
    
    if (u_useIBL) {
        // Diffuse IBL
        vec3 irradiance = sampleIrradiance(N);
        vec3 diffuse = irradiance * albedo;
        
        // Specular IBL
        float NdotV = max(dot(N, V), 0.0);
        vec3 F = fresnelSchlickRoughness(NdotV, F0, roughness);
        vec3 kS = F;
        vec3 kD = 1.0 - kS;
        kD *= 1.0 - metallic;
        
        vec3 prefilteredColor = sampleRadiance(R, roughness);
        vec3 specular = prefilteredColor * F;
        
        ambient = (kD * diffuse + specular) * ao * u_iblIntensity;
    } else {
        ambient = u_ambientColor * albedo * ao;
    }
    
    // Final color
    vec3 color = ambient + Lo;
    
    // HDR tone mapping
    color = color / (color + vec3(1.0));
    
    // Gamma correction
    color = pow(color, vec3(1.0/2.2));
    
    fragColor = vec4(color, 1.0);
}