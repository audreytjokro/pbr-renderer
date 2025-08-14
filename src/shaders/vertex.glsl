#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat3 u_normalMatrix;

out vec3 v_worldPosition;
out vec3 v_normal;
out vec2 v_texCoord;

void main() {
    vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
    v_worldPosition = worldPosition.xyz;
    v_normal = normalize(u_normalMatrix * a_normal);
    v_texCoord = a_texCoord;
    gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
}