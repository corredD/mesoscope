(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
	typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
	(factory((global.gp = global.gp || {}),global.THREE));
}(this, (function (exports,THREE) { 'use strict';

	var passThroughVert = "void main() {\n    gl_Position = vec4( position, 1.0 );\n}";

	var passThroughFrag = "uniform sampler2D texture;\nuniform vec2 res;\nvoid main() {\n\tvec2 uv = gl_FragCoord.xy / res;\n\tgl_FragColor = texture2D( texture, uv );\n}";

	var setBodyDataVert = "uniform vec2 res;\n\
	attribute float bodyIndex;\n\
	attribute vec4 data;\n\
	varying vec4 vData;\n\
	void main() {\n\
	        vec2 uv = indexToUV(bodyIndex, res);\n\
	        uv += 0.5 / res;\n\
	        gl_PointSize = 1.0;\n\
	        vData = data;\n\
	        gl_Position = vec4(2.0*uv-1.0, 0, 1);\n\
	}";

	var setBodyDataFrag = "varying vec4 vData;\nvoid main() {\n\tgl_FragColor = vData;\n}";

	//step 1 - updateWorldParticlePositions() ->this.textures.particlePosWorld
	var localParticlePositionToWorldFrag = "uniform sampler2D localParticlePosTex;\n\
	uniform sampler2D bodyPosTex;\n\
	uniform sampler2D bodyQuatTex;\n\
	void main() {\n\
				vec2 uv = gl_FragCoord.xy / resolution;\n\
				float particleIndex = float(uvToIndex(uv, resolution));\n\
				vec4 particlePosAndBodyId = texture2D( localParticlePosTex, uv );\n\
				vec3 particlePos = particlePosAndBodyId.xyz;\n\
				float bodyIndex = particlePosAndBodyId.w;\n\
				vec2 bodyUV = indexToUV( bodyIndex, bodyTextureResolution );\n\
				bodyUV += vec2(0.5) / bodyTextureResolution;    \n\
				vec3 bodyPos = texture2D( bodyPosTex, bodyUV ).xyz;\n\
				vec4 bodyQuat = texture2D( bodyQuatTex, bodyUV );\n\
				vec3 worldParticlePos = vec3_applyQuat(particlePos, bodyQuat) + bodyPos;\n\
				gl_FragColor = vec4(worldParticlePos, bodyIndex);\n\
	}\n";

	//step 2 - updateRelativeParticlePositions() ->this.textures.particlePosRelative
		var localParticlePositionToRelativeFrag = "uniform sampler2D localParticlePosTex;\n\
	uniform sampler2D bodyQuatTex;\n\
	void main() {\n\
	        vec2 uv = gl_FragCoord.xy / resolution;\n\
	        float particleIndex = float(uvToIndex(uv, resolution));\n\
	        vec4 particlePosAndBodyId = texture2D( localParticlePosTex, uv );\n\
	        vec3 particlePos = particlePosAndBodyId.xyz;\n\
	        float bodyIndex = particlePosAndBodyId.w;\n\
	        vec2 bodyUV = indexToUV( bodyIndex, bodyTextureResolution );\n\
	        bodyUV += vec2(0.5) / bodyTextureResolution;\n\
					vec4 bodyQuat = texture2D( bodyQuatTex, bodyUV );\n\
	        vec3 relativeParticlePos = vec3_applyQuat(particlePos, bodyQuat);\n\
	        gl_FragColor = vec4(relativeParticlePos, bodyIndex);\n\
	}\n";

	//step 3 - updateParticleVelocity() ->this.textures.particleVel
		var bodyVelocityToParticleVelocityFrag = "uniform sampler2D relativeParticlePosTex;\n\
	uniform sampler2D bodyVelTex;\n\
	uniform sampler2D bodyAngularVelTex;\n\
	void main() {\n\
	        vec2 particleUV = gl_FragCoord.xy / resolution;\n\
	        vec4 particlePosAndBodyId = texture2D( relativeParticlePosTex, particleUV );\n\
	        vec3 relativeParticlePosition = particlePosAndBodyId.xyz;\n\
	        float bodyIndex = particlePosAndBodyId.w;\n\
	        vec2 bodyUV = indexToUV( bodyIndex, bodyTextureResolution );\n\
	        bodyUV += vec2(0.5) / bodyTextureResolution;\n\
	        vec3 bodyVelocity = texture2D( bodyVelTex, bodyUV ).xyz;\n\
	        vec3 bodyAngularVelocity = texture2D( bodyAngularVelTex, bodyUV ).xyz;\n\
	        vec3 particleVelocity = bodyVelocity - cross(relativeParticlePosition, bodyAngularVelocity);\n\
	        gl_FragColor = vec4(particleVelocity, 1);\n\
	}\n";

	//step 4 - updateGrid()->this.textures.grid
		var setStencilFrag = "uniform vec2 res;\n\
	uniform float quadrant;\n\
	void main() {\n\
	        vec2 coord = floor(gl_FragCoord.xy);\n\
	        if(mod(coord.x,2.0) + 2.0 * mod(coord.y,2.0) == quadrant){\n\
	                gl_FragColor = vec4(1,1,1,1);\n\
	        } else {\n\
	                discard;\n\
	        }\n\
	}\n";

	var mapParticleToCellVert = "uniform sampler2D posTex;\n\
	uniform vec3 cellSize;\n\
	uniform vec3 gridPos;\n\
	attribute float particleIndex;\n\
	varying float vParticleIndex;\n\
	void main() {\n\
		vParticleIndex = particleIndex;\n\
		vec2 particleUV = indexToUV(particleIndex, resolution);\n\
		vec3 particlePos = texture2D( posTex, particleUV ).xyz;\n\
		vec3 cellPos = worldPosToGridPos(particlePos, gridPos, cellSize);\n\
		vec2 gridUV = gridPosToGridUV(cellPos, 0, gridResolution, gridTextureResolution, gridZTiling);\n\
		gridUV += vec2(1) / gridTextureResolution;\n\
		gl_PointSize = 2.0;\n\
		gl_Position = vec4(2.0*(gridUV-0.5), 0, 1);\n\
	}\n";

	var mapParticleToCellFrag = "varying float vParticleIndex;\n\
	void main() {\n\
				gl_FragColor = vec4( vParticleIndex+1.0, 0, 0, 1 );}";

//step 5 - updateParticleForce()->this.textures.particleForce
var updateForceFrag = "uniform vec4 params1;\n\
	#define stiffness params1.x\n\
	#define damping params1.y\n\
	#define radius params1.z\n\
	uniform vec4 params2;\n\
	#define friction params2.y\n\
	uniform vec4 params3;\n\
	#define interactionSpherePos params3.xyz\n\
	#define interactionSphereRadius params3.w\n\
	uniform vec3 cellSize;\n\
	uniform vec3 gridPos;\n\
	uniform sampler2D posTex;\n\
	uniform sampler2D velTex;\n\
	uniform sampler2D bodyAngularVelTex;\n\
	uniform sampler2D particlePosRelative;\n\
	uniform sampler2D gridTex;\n\
	vec3 particleForce(float STIFFNESS, float DAMPING, float DAMPING_T, float distance, float minDistance, vec3 xi, vec3 xj, vec3 vi, vec3 vj){\n\
	    vec3 rij = xj - xi;\n\
	    vec3 rij_unit = normalize(rij);\n\
	    vec3 vij = vj - vi;\n\
	    vec3 vij_t = vij - dot(vij, rij_unit) * rij_unit;\n\
	    vec3 springForce = - STIFFNESS * (distance - max(length(rij), minDistance)) * rij_unit;\n\
	    vec3 dampingForce = DAMPING * dot(vij,rij_unit) * rij_unit;\n\
	    vec3 tangentForce = DAMPING_T * vij_t;\n\
	    return springForce + dampingForce + tangentForce;\n\
	}\n\
	void main() {\n\
	    vec2 uv = gl_FragCoord.xy / resolution;\n\
	    int particleIndex = uvToIndex(uv, resolution);\n\
	    vec4 positionAndBodyId = texture2D(posTex, uv);\n\
	    vec3 position = positionAndBodyId.xyz;\n\
	    float bodyId = positionAndBodyId.w;\n\
	    vec3 velocity = texture2D(velTex, uv).xyz;\n\
	    vec3 particleGridPos = worldPosToGridPos(position, gridPos, cellSize);\n\
	    vec3 bodyAngularVelocity = texture2D(bodyAngularVelTex, indexToUV(bodyId,bodyTextureResolution)).xyz;\n\
	    vec4 relativePositionAndBodyId = texture2D(particlePosRelative, uv);\n\
	    vec3 relativePosition = relativePositionAndBodyId.xyz;\n\
	    vec3 force = vec3(0);\n\
	    ivec3 iGridRes = ivec3(gridResolution);\n\
	    for(int i=-1; i<2; i++){\n\
	        for(int j=-1; j<2; j++){\n\
	            for(int k=-1; k<2; k++){\n\
	                vec3 neighborCellGridPos = particleGridPos + vec3(i,j,k);\n\
	                ivec3 iNeighborCellGridPos = ivec3(particleGridPos) + ivec3(i,j,k);\n\
	                for(int l=0; l<4; l++){\n\
	                    vec2 neighborCellTexUV = gridPosToGridUV(neighborCellGridPos, l, gridResolution, gridTextureResolution, gridZTiling);\n\
	                    neighborCellTexUV += vec2(0.5) / (2.0 * gridTextureResolution);\n\
	                    int neighborIndex = int(floor(texture2D(gridTex, neighborCellTexUV).x-1.0 + 0.5));\n\
	                    vec2 neighborUV = indexToUV(float(neighborIndex), resolution);\n\
	                    vec4 neighborPositionAndBodyId = texture2D(posTex, neighborUV);\n\
	                    vec3 neighborPosition = neighborPositionAndBodyId.xyz;\n\
	                    float neighborBodyId = neighborPositionAndBodyId.w;\n\
	                    vec3 neighborAngularVelocity = texture2D(bodyAngularVelTex, indexToUV(neighborBodyId,bodyTextureResolution)).xyz;\n\
	                    vec3 neighborVelocity = texture2D(velTex, neighborUV).xyz;\n\
	                    vec3 neighborRelativePosition = texture2D(particlePosRelative, neighborUV).xyz;\n\
	                    if(neighborIndex >=0 && neighborIndex != particleIndex && neighborBodyId != bodyId && \n\
	                          iNeighborCellGridPos.x>=0 && iNeighborCellGridPos.y>=0 && iNeighborCellGridPos.z>=0 && \n\
	                          iNeighborCellGridPos.x<iGridRes.x && iNeighborCellGridPos.y<iGridRes.y && iNeighborCellGridPos.z<iGridRes.z){\n\
	                        vec3 r = position - neighborPosition;\n\
	                        float len = length(r);\n\
	                        if(len > 0.0 && len < radius * 2.0){\n\
	                            vec3 dir = normalize(r);\n\
	                            vec3 v = velocity - cross(relativePosition + radius * dir, bodyAngularVelocity);\n\
	                            vec3 nv = neighborVelocity - cross(neighborRelativePosition + radius * (-dir), neighborAngularVelocity);\n\
	                            force += particleForce(stiffness, damping, friction, 2.0 * radius, radius, position, neighborPosition, v, nv);\n\
	                        }\n\
	                    }\n\
	                }\n\
	            }\n\
	        }\n\
	    }\n\
	    vec3 boxMin = vec3(-boxSize.x, 0.0, -boxSize.z);//vec3(-boxSize.x, 0.0, -boxSize.z);\n\
	    vec3 boxMax = vec3(boxSize.x, boxSize.y*0.5, boxSize.z);\n\
			vec3 dirs[3];\n\
			dirs[0] = vec3(1,0,0);\n\
			dirs[1] = vec3(0,1,0);\n\
			dirs[2] = vec3(0,0,1);\n\
			for(int i=0; i<3; i++){\n\
					vec3 dir = dirs[i];\n\
					vec3 v = velocity - cross(relativePosition + radius * dir, bodyAngularVelocity);\n\
					vec3 tangentVel = v - dot(v,dir) * dir;\n\
					float x = dot(dir,position) - radius;\n\
					if(x < boxMin[i]){\n\
							force += -( stiffness * (x - boxMin[i]) * dir + damping * dot(v,dir) * dir);\n\
							force -= friction * tangentVel;\n\
					}\n\
					x = dot(dir,position) + radius;\n\
					if(x > boxMax[i]){\n\
							dir = -dir;\n\
							force -= -( stiffness * (x - boxMax[i]) * dir - damping * dot(v,dir) * dir);\n\
							force -= friction * tangentVel;\n\
					}\n\
			}\n\
			vec3 r = position - interactionSpherePos;\n\
			float len = length(r);\n\
			if(len > 0.0 && len < interactionSphereRadius+radius){\n\
					force += particleForce(stiffness, damping, friction, radius + interactionSphereRadius, interactionSphereRadius, position, interactionSpherePos, velocity, vec3(0))*10.0;\n\
			}\n\
			//could add the surface force here as well?\n\
			gl_FragColor = vec4(force, 1.0);\n\
	}\n"

//step 6 - updateParticleTorque()->this.textures.particleTorque
var updateTorqueFrag = "uniform vec4 params1;\n\
	#define stiffness params1.x\n\
	#define damping params1.y\n\
	#define radius params1.z\n\
	uniform vec4 params2;\n\
	#define friction params2.y\n\
	uniform vec3 cellSize;\n\
	uniform vec3 gridPos;\n\
	uniform sampler2D posTex;\n\
	uniform sampler2D particlePosRelative;\n\
	uniform sampler2D velTex;\n\
	uniform sampler2D bodyAngularVelTex;\n\
	uniform sampler2D gridTex;\n\
	void main() {\n\
	    vec2 uv = gl_FragCoord.xy / resolution;\n\
	    int particleIndex = uvToIndex(uv, resolution);\n\
	    vec4 positionAndBodyId = texture2D(posTex, uv);\n\
	    vec3 position = positionAndBodyId.xyz;\n\
	    float bodyId = positionAndBodyId.w;\n\
	    vec4 relativePositionAndBodyId = texture2D(particlePosRelative, uv);\n\
	    vec3 relativePosition = relativePositionAndBodyId.xyz;\n\
	    vec3 velocity = texture2D(velTex, uv).xyz;\n\
	    vec3 angularVelocity = texture2D(bodyAngularVelTex, indexToUV(bodyId, bodyTextureResolution)).xyz;\n\
	    vec3 particleGridPos = worldPosToGridPos(position, gridPos, cellSize);\n\
	    ivec3 iGridRes = ivec3(gridResolution);\n\
	    vec3 torque = vec3(0);\n\
	    for(int i=-1; i<2; i++){\n\
	        for(int j=-1; j<2; j++){\n\
	            for(int k=-1; k<2; k++){\n\
	                vec3 neighborCellGridPos = particleGridPos + vec3(i,j,k);\n\
	                ivec3 iNeighborCellGridPos = ivec3(particleGridPos) + ivec3(i,j,k);\n\
	                for(int l=0; l<4; l++){\n\
	                    vec2 neighborCellTexUV = gridPosToGridUV(neighborCellGridPos, l, gridResolution, gridTextureResolution, gridZTiling);\n\
	                    neighborCellTexUV += vec2(0.5) / (2.0 * gridTextureResolution);\n\
	                    int neighborIndex = int(floor(texture2D(gridTex, neighborCellTexUV).x-1.0 + 0.5));\n\
	                    vec2 neighborUV = indexToUV(float(neighborIndex), resolution);\n\
	                    vec4 neighborPositionAndBodyId = texture2D(posTex, neighborUV);\n\
	                    vec3 neighborPosition = neighborPositionAndBodyId.xyz;\n\
	                    float neighborBodyId = neighborPositionAndBodyId.w;\n\
	                    vec3 neighborVelocity = texture2D(velTex, neighborUV).xyz;\n\
	                    vec3 neighborAngularVelocity = texture2D(bodyAngularVelTex, neighborUV).xyz;\n\
	                    vec3 neighborRelativePosition = texture2D(particlePosRelative, neighborUV).xyz;\n\
	                    if(neighborIndex >= 0 && neighborIndex != particleIndex && neighborBodyId != bodyId && \n\
	                        iNeighborCellGridPos.x>=0 && iNeighborCellGridPos.y>=0 && iNeighborCellGridPos.z>=0 && \n\
	                        iNeighborCellGridPos.x<iGridRes.x && iNeighborCellGridPos.y<iGridRes.y && iNeighborCellGridPos.z<iGridRes.z){\n\
	                        vec3 r = position - neighborPosition;\n\
	                        float len = length(r);\n\
	                        if(len > 0.0 && len < radius * 2.0){\n\
	                            vec3 dir = normalize(r);\n\
	                            vec3 relVel = (velocity - cross(relativePosition + radius * dir, angularVelocity)) - (neighborVelocity - cross(neighborRelativePosition + radius * (-dir), neighborAngularVelocity));\n\
	                            vec3 relTangentVel = relVel - dot(relVel, dir) * dir;\n\
	                            torque += friction * cross(relativePosition + radius * dir, relTangentVel);\n\
	                        }\n\
	                    }\n\
	                }\n\
	            }\n\
	        }\n\
	    }\n\
	    vec3 boxMin = vec3(-boxSize.x, 0.0, -boxSize.z);\n\
	    vec3 boxMax = vec3(boxSize.x, boxSize.y*0.5, boxSize.z);\n\
	    vec3 dirs[3];\n\
	    dirs[0] = vec3(1,0,0);\n\
	    dirs[1] = vec3(0,1,0);\n\
	    dirs[2] = vec3(0,0,1);\n\
	    for(int i=0; i<3; i++){\n\
	        vec3 dir = dirs[i];\n\
	        vec3 v = velocity - cross(relativePosition + radius * dir, angularVelocity);\n\
	        if(dot(dir,position) - radius < boxMin[i]){\n\
	            vec3 relTangentVel = (v - dot(v, dir) * dir);\n\
	            torque += friction * cross(relativePosition + radius * dir, relTangentVel);\n\
	        }\n\
	        if(dot(dir,position) + radius > boxMax[i]){\n\
	            dir = -dir;\n\
	            vec3 relTangentVel = v - dot(v, dir) * dir;\n\
	            torque += friction * cross(relativePosition + radius * dir, relTangentVel);\n\
	        }\n\
	    }\n\
	    gl_FragColor = vec4(torque, 0.0);\n\
	}\n";

//step 7 - updateBodyForce()
		var addParticleForceToBodyVert = "uniform sampler2D relativeParticlePosTex;\n\
	uniform sampler2D particleForceTex;\n\
	attribute float particleIndex;\n\
	attribute float bodyIndex;\n\
	varying vec3 vBodyForce;\n\
	void main() {\n\
	    vec2 particleUV = indexToUV( particleIndex, resolution );\n\
	    vec3 particleForce = texture2D( particleForceTex, particleUV ).xyz;\n\
	    vBodyForce = particleForce;\n\
	    vec2 bodyUV = indexToUV( bodyIndex, bodyTextureResolution );\n\
	    bodyUV += vec2(0.5) / bodyTextureResolution;\n\
			gl_PointSize = 1.0;\n\
	    gl_Position = vec4(2.0 * (bodyUV - 0.5), -particleIndex / (resolution.x*resolution.y), 1);\n\
	}\n";

//step 8 - updateBodyTorque
		var addParticleTorqueToBodyVert = "uniform sampler2D relativeParticlePosTex;\n\
	uniform sampler2D particleForceTex;\n\
	uniform sampler2D particleTorqueTex;\n\
	attribute float particleIndex;\n\
	attribute float bodyIndex;\n\
	varying vec3 vBodyForce;\n\
	void main() {\n\
	    vec2 particleUV = indexToUV( particleIndex, resolution );\n\
	    vec3 particleForce = texture2D( particleForceTex, particleUV ).xyz;\n\
	    vec3 particleTorque = texture2D( particleTorqueTex, particleUV ).xyz;\n\
	    vec3 relativeParticlePos = texture2D( relativeParticlePosTex, particleUV ).xyz;\n\
	    vBodyForce = particleTorque + cross(relativeParticlePos, particleForce);\n\
	    vec2 bodyUV = indexToUV( bodyIndex, bodyTextureResolution );\n\
	    bodyUV += vec2(0.5) / bodyTextureResolution;    gl_PointSize = 1.0;\n\
	    gl_Position = vec4(2.0 * (bodyUV - 0.5), -particleIndex / (resolution.x*resolution.y), 1);\n\
	}\n";

		var addParticleForceToBodyFrag = "varying vec3 vBodyForce;\n\
	void main() {\n\
	\tgl_FragColor = vec4(vBodyForce, 1.0);\n}";

//step 9&10 - updateBodyVelocity
	var updateBodyVelocityFrag = "uniform sampler2D bodyQuatTex;\n\
	uniform sampler2D bodyPosTex;\n\
	uniform sampler2D bodyVelTex;\n\
	uniform sampler2D bodyForceTex;\n\
	uniform sampler2D bodyMassTex;\n\
	uniform sampler2D bodyInfosTex;\n\
	uniform float linearAngular;\n\
	uniform vec3 gravity;\n\
	uniform vec3 maxVelocity;\n\
	uniform vec4 params2;\n\
	#define deltaTime params2.x\n\
	#define drag params2.z\n\
	void main() {\n\
			vec3 g = vec3(gravity);\n\
	    vec2 uv = gl_FragCoord.xy / bodyTextureResolution;\n\
	    vec4 velocity = texture2D(bodyVelTex, uv);\n\
	    vec4 force = texture2D(bodyForceTex, uv);\n\
	    vec4 quat = texture2D(bodyQuatTex, uv);\n\
	    vec4 massProps = texture2D(bodyMassTex, uv);\n\
	    vec3 newVelocity = velocity.xyz;\n\
			vec4 posTexData = texture2D(bodyPosTex, uv);\n\
			vec3 position = posTexData.xyz;\n\
			float bodyTypeIndex = posTexData.w;\n\
			vec2 bodyType_uv = indexToUV( bodyTypeIndex*2.0, bodyInfosTextureResolution );\n\
			vec4 bodyType_infos1 = texture2D(bodyInfosTex, bodyType_uv);\n\
			bodyType_uv = indexToUV( bodyTypeIndex*2.0+1.0, bodyInfosTextureResolution );\n\
			vec4 bodyType_infos2 = texture2D(bodyInfosTex, bodyType_uv);\n\
			vec3 sph_center = vec3(0.0,0.5,0.0);\n\
			float rads = 0.09;//(0.08798828125000001)*(0.08798828125000001);\n\
			vec3 toward_surface = sph_center - position;\n\
			float pos_radius = length(toward_surface);\n\
			float distance = (pos_radius-rads);\n\
			if (bodyType_infos1.w == 1.0) {\n\
					//update quat\n\
					vec3 up = bodyType_infos1.xyz;\n\
					vec3 off = bodyType_infos2.xyz;\n\
					if (pos_radius < rads ) force = vec4(-normalize(toward_surface),1)*200.0;\n\
					else {\n\
						force = vec4(0.0,0.0,0.0,0.0); \n\
						newVelocity = vec3(0.0,0.0,0.0);\n\
						g=vec3(0.0,0.0,0.0);\n\
					}\n\
			}\n\
			else {\n\
				if (abs(distance) < 0.02){\n\
						force = vec4(-normalize(toward_surface*distance),1)*100.0;\n\
				}\n\
			}\n\
			//updateBodyVelocity\n\
			if( linearAngular < 0.5 ){\n\
	        float invMass = massProps.w;\n\
	        newVelocity += (force.xyz + g) * deltaTime * invMass;\n\
	    } //updateBodyAngularVelocity\n\
			else {\n\
	        vec3 invInertia = massProps.xyz;\n\
	        newVelocity += force.xyz * deltaTime * invInertiaWorld(quat, invInertia);\n\
	    }\n\
	    newVelocity = clamp(newVelocity, -maxVelocity, maxVelocity);\n\
	    newVelocity *= pow(1.0 - drag, deltaTime);\n\
	    gl_FragColor = vec4(newVelocity, 1.0);\n\
	}\n";

//step 11 updateBodyPosition()
	var updateBodyPositionFrag = "uniform sampler2D bodyPosTex;\n\
uniform sampler2D bodyVelTex;\n\
uniform sampler2D bodyInfosTex;\n\
uniform vec4 params2;\n\
#define deltaTime params2.x\n\
void main() {\n\
        vec2 uv = gl_FragCoord.xy / bodyTextureResolution;\n\
        vec4 posTexData = texture2D(bodyPosTex, uv);\n\
        vec3 position = posTexData.xyz;\n\
        vec3 velocity = texture2D(bodyVelTex, uv).xyz;\n\
        gl_FragColor = vec4(position + velocity * deltaTime, posTexData.w);\n\
}\n";

//step 12 updateBodyQuaternion()
	var updateBodyQuaternionFrag = "uniform sampler2D bodyQuatTex;\n\
uniform sampler2D bodyAngularVelTex;\n\
uniform sampler2D bodyPosTex;\n\
uniform sampler2D bodyInfosTex;\n\
uniform vec4 params2;\n\
#define deltaTime params2.x\n\
void main() {\n\
        vec2 uv = gl_FragCoord.xy / bodyTextureResolution;\n\
				vec4 posTexData = texture2D(bodyPosTex, uv);\n\
				vec3 position = posTexData.xyz;\n\
				vec4 quat = texture2D(bodyQuatTex, uv);\n\
				vec3 angularVel = texture2D(bodyAngularVelTex, uv).xyz;\n\
        gl_FragColor = quat;//quat_integrate(quat, angularVel, deltaTime);\n\
}\n"


	var setBodyPositionFrag = "uniform sampler2D bodyPosTex;\n\
uniform sampler2D bodyVelTex;\n\
uniform sampler2D bodyInfosTex;\n\
uniform vec4 params2;\n\
#define deltaTime params2.x\n\
void main() {\n\
        vec2 uv = gl_FragCoord.xy / bodyTextureResolution;\n\
        vec4 posTexData = texture2D(bodyPosTex, uv);\n\
        vec3 position = posTexData.xyz;\n\
        vec3 velocity = texture2D(bodyVelTex, uv).xyz;\n\
        gl_FragColor = vec4(position + velocity * deltaTime, posTexData.w);\n\
}\n";

	var setBodyQuaternionFrag = "uniform sampler2D bodyQuatTex;\n\
uniform sampler2D bodyAngularVelTex;\n\
uniform sampler2D bodyPosTex;\n\
uniform sampler2D bodyInfosTex;\n\
uniform vec4 params2;\n\
#define deltaTime params2.x\n\
void main() {\n\
        vec2 uv = gl_FragCoord.xy / bodyTextureResolution;\n\
				vec4 posTexData = texture2D(bodyPosTex, uv);\n\
				vec3 position = posTexData.xyz;\n\
				vec4 quat = texture2D(bodyQuatTex, uv);\n\
				vec3 angularVel = texture2D(bodyAngularVelTex, uv).xyz;\n\
        gl_FragColor = quat;//quat_integrate(quat, angularVel, deltaTime);\n\
}\n"


var shared = "int uvToIndex(vec2 uv, vec2 size) {\n\
        ivec2 coord = ivec2(floor(uv*size+0.5));\n\
        return coord.x + int(size.x) * coord.y;\n\
}\n\
vec2 indexToUV(float index, vec2 res){\n\
        vec2 uv = vec2(mod(index/res.x,1.0), floor( index/res.y ) / res.x);\n\
        return uv;\n\
}\n\
vec3 worldPosToGridPos(vec3 particlePos, vec3 gridPos, vec3 cellSize){\n\
        return floor((particlePos - gridPos)/cellSize);\n\
}\n\
vec2 gridPosToGridUV(vec3 gridPos, int subIndex, vec3 gridRes, vec2 gridTextureRes, vec2 gridZTile){\n\
        gridPos = clamp(gridPos, vec3(0), gridRes-vec3(1));\n\
        vec2 gridUV = 2.0 * gridPos.xz / gridTextureRes;\n\
        vec2 zPos = vec2( mod(gridPos.y, gridZTile.x), floor(gridPos.y / gridZTile.y) );\n\
        zPos /= gridZTile;\n\
        gridUV += zPos;\n\
        float fSubIndex = float(subIndex);\n\
        gridUV += vec2( mod(fSubIndex,2.0), floor(fSubIndex/2.0) ) / gridTextureRes;\n\
        return gridUV;\n\
}\n\
vec4 quat_integrate(vec4 q, vec3 w, float dt){\n\
        float half_dt = dt * 0.5;\n\
        q.x += half_dt * (w.x * q.w + w.y * q.z - w.z * q.y);   q.y += half_dt * (w.y * q.w + w.z * q.x - w.x * q.z);\n\
        q.z += half_dt * (w.z * q.w + w.x * q.y - w.y * q.x);\n\
        q.w += half_dt * (- w.x * q.x - w.y * q.y - w.z * q.z);\n\
        return normalize(q);\n\
}\n\
vec3 vec3_applyQuat(vec3 v, vec4 q){\n\
        float ix =  q.w * v.x + q.y * v.z - q.z * v.y;  float iy =  q.w * v.y + q.z * v.x - q.x * v.z;\n\
        float iz =  q.w * v.z + q.x * v.y - q.y * v.x;\n\
        float iw = -q.x * v.x - q.y * v.y - q.z * v.z;\n\
        return vec3(\n\
                ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,\n\
                iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,\n\
                iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x\n\
        );\n\
}\n\
mat3 transpose2( const in mat3 v ) {\n\
        mat3 tmp;\n\
        tmp[0] = vec3(v[0].x, v[1].x, v[2].x);\n\
        tmp[1] = vec3(v[0].y, v[1].y, v[2].y);\n\
        tmp[2] = vec3(v[0].z, v[1].z, v[2].z);\n\
        return tmp;\n\
}\n\
mat3 quat2mat(vec4 q){\n\
        float x = q.x;\n\
        float y = q.y;\n\
        float z = q.z;\n\
        float w = q.w;\n\
        float x2 = x + x;\n\
        float y2 = y + y;\n\
        float z2 = z + z;\n\
        float xx = x * x2;\n\
        float xy = x * y2;\n\
        float xz = x * z2;\n\
        float yy = y * y2;\n\
        float yz = y * z2;\n\
        float zz = z * z2;\n\
        float wx = w * x2;\n\
        float wy = w * y2;\n\
        float wz = w * z2;\n\
        return mat3(\n\
                1.0 - ( yy + zz ),  xy - wz,            xz + wy,\n\
                xy + wz,            1.0 - ( xx + zz ),  yz - wx,\n\
                xz - wy,            yz + wx,            1.0 - ( xx + yy )\n\
        );\n\
}\n\
mat3 invInertiaWorld(vec4 q, vec3 invInertia){\n\
        mat3 R = quat2mat(q);\n\
        mat3 I = mat3(\n\
                invInertia.x, 0, 0,\n\
                0, invInertia.y, 0,\n\
                0, 0, invInertia.z\n\
        );\n\
        return transpose2(R) * I * R;\n\
}\n\
vec4 quat_slerp(vec4 v0, vec4 v1, float t){\n\
        float d = dot(v0, v1);\n\
        if (abs(d) > 0.9995) {\n\
                return normalize(mix(v0,v1,t));\n\
        }\n\
        if (d < 0.0) {\n\
                v1 = -v1;\n\
                d = -d;\n\
        }\n\
        d = clamp(d, -1.0, 1.0);\n\
        float theta0 = acos(d);\n\
        float theta = theta0*t;\n\
        vec4 v2 = normalize(v1 - v0*d);\n\
        return v0*cos(theta) + v2*sin(theta);\n\
}\n";

	var shaders = {
	    passThroughVert,
	    passThroughFrag,
	    setBodyDataVert,
	    setBodyDataFrag,
	    mapParticleToCellVert,
	    mapParticleToCellFrag,
	    updateForceFrag,
	    updateTorqueFrag,
	    updateBodyVelocityFrag,
	    updateBodyPositionFrag,
	    updateBodyQuaternionFrag,
	    addParticleForceToBodyVert,
	    addParticleTorqueToBodyVert,
	    addParticleForceToBodyFrag,
	    localParticlePositionToRelativeFrag,
	    localParticlePositionToWorldFrag,
	    bodyVelocityToParticleVelocityFrag,
	    shared
	};

	function getShader(id){
	  return shaders.shared + shaders[id];
	}

	function Broadphase(parameters){
	    this.position = new THREE.Vector3(0,0,0);
	    this.resolution = new THREE.Vector3(64,64,64);
	    this.gridZTiling = new THREE.Vector2();
	    this.update();
	}
	Object.assign(Broadphase.prototype, {
	    update: function(){
	        var gridPotZ = 1;
	        while(gridPotZ * gridPotZ < this.resolution.y) gridPotZ *= 2;
	        this.gridZTiling.set(gridPotZ,gridPotZ);
	    }
	});

	function World(parameters){
	    parameters = parameters || {};
	    var params1 = this.params1 = new THREE.Vector4(
	        parameters.stiffness !== undefined ? parameters.stiffness : 1700,
	        parameters.damping !== undefined ? parameters.damping : 6,
	        parameters.radius !== undefined ? parameters.radius : 0.5,
	        0 // unused
	    );
	    var params2 = this.params2 = new THREE.Vector4(
	        parameters.fixedTimeStep !== undefined ? parameters.fixedTimeStep : 1/120,
	        parameters.friction !== undefined ? parameters.friction : 2,
	        parameters.drag !== undefined ? parameters.drag : 0.1,
	        0 // unused
	    );
	    var params3 = this.params3 = new THREE.Vector4(10,10,10, 1);
	    this.time = 0;
	    this.fixedTime = 0;
	    this.broadphase = new Broadphase();
	    this.gravity = new THREE.Vector3(0,0,0);
	    this.maxVelocity = new THREE.Vector3(100000,100000,100000);
	    if(parameters.gravity) this.gravity.copy(parameters.gravity);
	    this.boxSize = new THREE.Vector3(1,1,1);
	    if(parameters.boxSize) this.boxSize.copy(parameters.boxSize);
	    if(parameters.gridPosition) this.broadphase.position.copy(parameters.gridPosition);
	    if(parameters.gridResolution) this.broadphase.resolution.copy(parameters.gridResolution);
	    this.broadphase.update();
	    this.materials = {};
	    this.textures = {};
	    this.dataTextures = {};
	    this.scenes = {};
	    this.renderer = parameters.renderer;
			this.bodyTypeCount = 0;
	    this.bodyCount = 0;
	    this.particleCount = 0;
	    this.massDirty = true;

	    this.maxSubSteps = parameters.maxSubSteps || 5;
	    this.accumulator = 0;
	    this.interpolationValue = 0;

	    var that = this;
	    function updateMaxVelocity(){
	        // Set max velocity so that we don't get too much overlap between 2 particles in one time step
	        var v = 2 * that.radius / that.fixedTimeStep;
	        that.maxVelocity.set(v,v,v);
	    }

	    Object.defineProperties( this, {
	        // Size of a cell side, and diameter of a particle
	        radius: {
	            get: function(){ return params1.z; },
	            set: function(s){
	                params1.z = s;
	                updateMaxVelocity();
	            }
	        },
	        fixedTimeStep: {
	            get: function(){ return params2.x; },
	            set: function(fixedTimeStep){
	                params2.x = fixedTimeStep;
	                updateMaxVelocity();
	            }
	        },
	        stiffness: {
	            get: function(){ return params1.x; },
	            set: function(stiffness){ params1.x = stiffness; },
	        },
	        damping: {
	            get: function(){ return params1.y; },
	            set: function(damping){ params1.y = damping; },
	        },
	        friction: {
	            get: function(){ return params2.y; },
	            set: function(friction){ params2.y = friction; },
	        },
	        drag: {
	            get: function(){ return params2.z; },
	            set: function(drag){ params2.z = drag; },
	        },
	        maxParticles: {
	            get: function(){
	                return this.textures.particlePosLocal.width * this.textures.particlePosLocal.height;
	            }
	        },
	        maxBodies: {
	            get: function(){
	                return this.textures.bodyPosRead.width * this.textures.bodyPosRead.height;
	            }
	        },
					maxBodyTypes: {
							get: function(){
									return this.textures.bodyInfos.width * this.textures.bodyInfos.height;
							}
					},
	        bodyPositionTexture: {      get: function(){ return this.textures.bodyPosRead.texture; } },
	        bodyPositionPrevTexture: {  get: function(){ return this.textures.bodyPosWrite.texture; } },
	        bodyQuaternionTexture: {    get: function(){ return this.textures.bodyQuatRead.texture; } },
	        bodyQuaternionPrevTexture: {get: function(){ return this.textures.bodyQuatWrite.texture; } },
	        bodyMassTexture: {          get: function(){ return this.textures.bodyMass.texture; } },
	        bodyForceTexture: {         get: function(){ return this.textures.bodyForce.texture; } },
	        bodyTextureSize: {          get: function(){ return this.textures.bodyPosRead.width; } },
	        particlePositionTexture: {  get: function(){ return this.textures.particlePosWorld.texture; } },
	        particleLocalPositionTexture: {  get: function(){ return this.textures.particlePosLocal.texture; } },
	        particleForceTexture: {     get: function(){ return this.textures.particleForce.texture; } },
	        particleTextureSize: {      get: function(){ return this.textures.particlePosWorld.width; } },
	        gridTexture: {              get: function(){ return this.textures.grid.texture; } }
	    });

	    updateMaxVelocity();

	    this.initTextures(
				  parameters.maxBodyTypes || 8,
	        parameters.maxBodies || 8,
	        parameters.maxParticles || 8
	    );

	    // Fullscreen render pass helpers
	    Object.assign( this.materials, {
	        // For rendering a full screen quad
	        textured: new THREE.ShaderMaterial({
	            uniforms: {
	                texture: { value: null },
	                res: { value: new THREE.Vector2() },
	            },
	            vertexShader: passThroughVert,
	            fragmentShader: passThroughFrag
	        })
	    });
	    this.scenes.fullscreen = new THREE.Scene();
	    this.fullscreenCamera = new THREE.Camera();
	    var plane = new THREE.PlaneBufferGeometry( 2, 2 );
	    var fullscreenQuad = this.fullscreenQuad = new THREE.Mesh( plane, this.materials.textured );
	    this.scenes.fullscreen.add( fullscreenQuad );
	}

	// Compute upper closest power of 2 for a number
	function powerOfTwoCeil(x){
	    var result = 1;
	    while(result * result < x){
	        result *= 2;
	    }
	    return result;
	}

	function idToX(id,sx,sy){
	    return id % sx;
	}
	function idToY(id,sx,sy){
	    return Math.floor(id / sy);
	}
	function idToDataIndex(id, w, h){
	    var px = idToX(id, w, h);
	    var py = idToY(id, w, h);
	    var p = 4 * (py * w + px);
	    return p;
	}
	function idToDataIndexSlice(id, w, h, slice){
	    var px = idToX(id, w, h);
	    var py = idToY(id, w, h);
	    var p = slice * (py * w + px);
	    return p;
	}


	Object.assign( World.prototype, {
	    getDefines: function(overrides){
	        var boxSize = this.boxSize;
	        var particleTextureSize = this.textures.particlePosLocal.height;
	        var gridResolution = this.broadphase.resolution;
	        var gridZTiling = this.broadphase.gridZTiling;
	        var gridTexture = this.textures.grid;
	        var numBodies = this.textures.bodyPosRead.width;
					var numBodyType = this.textures.bodyInfos.width;
	        var defines = Object.assign({}, overrides||{}, {
	            boxSize: 'vec3(' + boxSize.x + ', ' + boxSize.y + ', ' + boxSize.z + ')',
	            resolution: 'vec2( ' + particleTextureSize.toFixed( 1 ) + ', ' + particleTextureSize.toFixed( 1 ) + " )",
	            gridResolution: 'vec3( ' + gridResolution.x.toFixed( 1 ) + ', ' + gridResolution.y.toFixed( 1 ) + ', ' + gridResolution.z.toFixed( 1 ) + " )",
	            gridZTiling: 'vec2(' + gridZTiling.x + ', ' + gridZTiling.y + ')',
	            gridTextureResolution: 'vec2(' + gridTexture.width + ', ' + gridTexture.height + ')',
	            bodyTextureResolution: 'vec2( ' + numBodies.toFixed( 1 ) + ', ' + numBodies.toFixed( 1 ) + " )",
							bodyInfosTextureResolution: 'vec2( ' + numBodyType.toFixed( 1 ) + ', ' + numBodyType.toFixed( 1 ) + " )"
	        });
	        return defines;
	    },
	    step: function(deltaTime){
	        var accumulator = this.accumulator;
	        var fixedTimeStep = this.fixedTimeStep;

	        accumulator += deltaTime;
	        var substeps = 0;
	        while (accumulator >= fixedTimeStep) {
	            // Do fixed steps to catch up
	            if(substeps < this.maxSubSteps){
	                this.singleStep();
	            }
	            accumulator -= fixedTimeStep;
	            substeps++;
	        }

	        this.interpolationValue = accumulator / fixedTimeStep;
	        this.time += deltaTime;
	        this.accumulator = accumulator;
	    },
	    singleStep: function(){
	        this.saveRendererState();
	        this.flushData();
	        this.updateWorldParticlePositions(); 		//step 1
	        this.updateRelativeParticlePositions();	//step 2
	        this.updateParticleVelocity();					//step 3
	        this.updateGrid();											//step 4
	        this.updateParticleForce();							//step 5
	        this.updateParticleTorque();						//step 6
	        this.updateBodyForce();									//step 7
	        this.updateBodyTorque();								//step 8
	        this.updateBodyVelocity();							//step 9
	        this.updateBodyAngularVelocity();				//step 10
	        this.updateBodyPosition();							//step 11
	        this.updateBodyQuaternion();
	        this.restoreRendererState();
	        this.fixedTime += this.fixedTimeStep;
	    },
			addBodyType: function(surface,
														radius,
														pcpX, pcpY, pcpZ,
														offX, offY, offZ){

	        if(this.bodyTypeCount >= this.maxBodyTypes){
	            console.warn("Too many bodies: " + this.bodyTypeCount+" max "+this.maxBodyTypes);
	            return;
	        }

	        // Position
	        var tex = this.dataTextures.bodyInfos;
	        tex.needsUpdate = true;
	        var data = tex.image.data;
	        var w = tex.image.width;
	        var h = tex.image.height;
	        var p = idToDataIndex(this.bodyTypeCount*2.0, w, h);
	        data[p + 0] = pcpX;
	        data[p + 1] = pcpY;
					data[p + 2] = pcpZ;
					data[p + 3] = surface;
					p = idToDataIndex(this.bodyTypeCount*2.0+1.0, w, h);
					data[p + 0] = offX;
					data[p + 1] = offY;
					data[p + 2] = offZ;
					data[p + 3] = radius;//copynumber for this one ?
	        return this.bodyTypeCount++;
	    },

	    addBody: function(x, y, z, qx, qy, qz, qw, mass,
												inertiaX, inertiaY, inertiaZ,
												bodyType){

	        if(this.bodyCount >= this.maxBodies){
	            console.warn("Too many bodies: " + this.bodyCount+" max "+this.maxBodies);
	            return;
	        }

	        // Position
	        var tex = this.dataTextures.bodyPositions;
	        tex.needsUpdate = true;
	        var data = tex.image.data;
	        var w = tex.image.width;
	        var h = tex.image.height;
	        var p = idToDataIndex(this.bodyCount, w, h);
	        data[p + 0] = x;
	        data[p + 1] = y;
	        data[p + 2] = z;
	        data[p + 3] = bodyType;// this is normalize to this.maxBodyTypes which is the texture.width / 2

	        // Quaternion
	        data = this.dataTextures.bodyQuaternions.image.data;
	        this.dataTextures.bodyQuaternions.needsUpdate = true;
	        data[p + 0] = qx;
	        data[p + 1] = qy;
	        data[p + 2] = qz;
	        data[p + 3] = qw;

	        // Mass
	        data = this.dataTextures.bodyMass.image.data;
	        this.dataTextures.bodyMass.needsUpdate = true;
	        data[p + 0] = 1/inertiaX;
	        data[p + 1] = 1/inertiaY;
	        data[p + 2] = 1/inertiaZ;
	        data[p + 3] = 1/mass;

	        return this.bodyCount++;
	    },
	    addParticle: function(bodyId, x, y, z){
	        if(this.particleCount >= this.maxParticles){
	            console.warn("Too many particles: " + this.particleCount+" max "+this.maxParticles);
	            return;
	        }
	        // Position
	        var tex = this.dataTextures.particleLocalPositions;
	        tex.needsUpdate = true;
	        var data = tex.image.data;
	        var w = tex.image.width;
	        var h = tex.image.height;
	        var p = idToDataIndex(this.particleCount, w, h);
	        data[p + 0] = x;
	        data[p + 1] = y;
	        data[p + 2] = z;
	        data[p + 3] = bodyId;
	        //TODO: update point cloud mapping particles -> bodies?
	        return this.particleCount++;
	    },
	    getBodyId: function(particleId){
	        var tex = this.dataTextures.particleLocalPositions;
	        var data = tex.image.data;
	        var w = tex.image.width;
	        var h = tex.image.height;
	        var p = idToDataIndex(particleId, w, h);
	        return this.dataTextures.particleLocalPositions.image.data[p+3];
	    },
	    getBodyUV: function(bodyId){
	        var s = this.bodyTextureSize;
	        return new THREE.Vector2(
	            idToX(bodyId, s, s) / s,
	            idToY(bodyId, s, s) / s
	        );
	    },
	    setBodyMass: function(bodyId, mass, inertiaX, inertiaY, inertiaZ){
	        var tex = this.dataTextures.bodyMass;
	        var data = tex.image.data;
	        var w = tex.image.width;
	        var h = tex.image.height;
	        var p = idToDataIndex(bodyId, w, h);
	        data[p + 0] = inertiaX > 0 ? 1/inertiaX : 0;
	        data[p + 1] = inertiaY > 0 ? 1/inertiaY : 0;
	        data[p + 2] = inertiaZ > 0 ? 1/inertiaZ : 0;
	        data[p + 3] = mass > 0 ? 1/mass : 0;
	        tex.needsUpdate = true;
	        this.massDirty = true;
	    },
	    initTextures: function(maxBodyTypes, maxBodies, maxParticles){
	        var type = ( /(iPad|iPhone|iPod)/g.test( navigator.userAgent ) ) ? THREE.HalfFloatType : THREE.FloatType;
	        var bodyTextureSize = powerOfTwoCeil(maxBodies);
	        var particleTextureSize = powerOfTwoCeil(maxParticles);
					var bodyInfosTextureSize = powerOfTwoCeil(maxBodyTypes)*2;
	        Object.assign(this.textures, {
	            // Body textures
							bodyInfos: createRenderTarget(bodyInfosTextureSize, bodyInfosTextureSize, type),        // (x,y,z,1)
	            bodyPosRead: createRenderTarget(bodyTextureSize, bodyTextureSize, type),        // (x,y,z,1)
	            bodyPosWrite: createRenderTarget(bodyTextureSize, bodyTextureSize, type),
	            bodyQuatRead: createRenderTarget(bodyTextureSize, bodyTextureSize, type),       // (x,y,z,w)
	            bodyQuatWrite: createRenderTarget(bodyTextureSize, bodyTextureSize, type),
	            bodyVelRead: createRenderTarget(bodyTextureSize, bodyTextureSize, type),        // (vx,vy,vz,1)
	            bodyVelWrite: createRenderTarget(bodyTextureSize, bodyTextureSize, type),
	            bodyAngularVelRead: createRenderTarget(bodyTextureSize, bodyTextureSize, type), // (wx,wy,wz,1)
	            bodyAngularVelWrite: createRenderTarget(bodyTextureSize, bodyTextureSize, type),
	            bodyForce: createRenderTarget(bodyTextureSize, bodyTextureSize, type),          // (fx,fy,fz,1)
	            bodyTorque: createRenderTarget(bodyTextureSize, bodyTextureSize, type),         // (tx,ty,tz,1)
	            bodyMass: createRenderTarget(bodyTextureSize, bodyTextureSize, type),           // (invInertia.xyz, invMass)

	            // Particle textures
	            particlePosLocal: createRenderTarget(particleTextureSize, particleTextureSize, type),   // (x,y,z,bodyId)
	            particlePosRelative: createRenderTarget(particleTextureSize, particleTextureSize, type),// (x,y,z,bodyId)
	            particlePosWorld: createRenderTarget(particleTextureSize, particleTextureSize, type),   // (x,y,z,bodyId)
	            particleVel: createRenderTarget(particleTextureSize, particleTextureSize, type),        // (x,y,z,1)
	            particleForce: createRenderTarget(particleTextureSize, particleTextureSize, type),      // (x,y,z,1)
	            particleTorque: createRenderTarget(particleTextureSize, particleTextureSize, type),     // (x,y,z,1)

	            // Broadphase
	            grid: createRenderTarget(2*this.broadphase.resolution.x*this.broadphase.gridZTiling.x, 2*this.broadphase.resolution.z*this.broadphase.gridZTiling.y, type),
	        });

	        Object.assign(this.dataTextures, {
							bodyInfos: new THREE.DataTexture( new Float32Array(4*bodyInfosTextureSize*bodyInfosTextureSize), bodyInfosTextureSize, bodyInfosTextureSize, THREE.RGBAFormat, type ),
							bodyPositions: new THREE.DataTexture( new Float32Array(4*bodyTextureSize*bodyTextureSize), bodyTextureSize, bodyTextureSize, THREE.RGBAFormat, type ),
	            bodyQuaternions: new THREE.DataTexture( new Float32Array(4*bodyTextureSize*bodyTextureSize), bodyTextureSize, bodyTextureSize, THREE.RGBAFormat, type ),
	            particleLocalPositions: new THREE.DataTexture( new Float32Array(4*particleTextureSize*particleTextureSize), particleTextureSize, particleTextureSize, THREE.RGBAFormat, type ),
	            bodyMass: new THREE.DataTexture( new Float32Array(4*bodyTextureSize*bodyTextureSize), bodyTextureSize, bodyTextureSize, THREE.RGBAFormat, type ),
	        });
	    },
	    // Render data to rendertargets
	    flushData: function(){
	        if(this.massDirty){
	            this.flushDataToRenderTarget(this.textures.bodyMass, this.dataTextures.bodyMass);
	            this.massDirty = false;
	        }

	        if(this.time > 0) return; // Only want to flush initial data
	        this.flushDataToRenderTarget(this.textures.bodyPosWrite, this.dataTextures.bodyPositions); // Need to initialize both read+write in case someone is interpolating..
	        this.flushDataToRenderTarget(this.textures.bodyPosRead, this.dataTextures.bodyPositions);
	        this.flushDataToRenderTarget(this.textures.bodyQuatWrite, this.dataTextures.bodyQuaternions);
	        this.flushDataToRenderTarget(this.textures.bodyQuatRead, this.dataTextures.bodyQuaternions);
	        this.flushDataToRenderTarget(this.textures.particlePosLocal, this.dataTextures.particleLocalPositions);
					this.flushDataToRenderTarget(this.textures.bodyInfos, this.dataTextures.bodyInfos);
	    },
	    flushDataToRenderTarget: function(renderTarget, dataTexture){
	        var texturedMaterial = this.materials.textured;
	        texturedMaterial.uniforms.texture.value = dataTexture;
	        texturedMaterial.uniforms.res.value.set(renderTarget.width,renderTarget.height);
	        this.fullscreenQuad.material = texturedMaterial;
	        this.renderer.render( this.scenes.fullscreen, this.fullscreenCamera, renderTarget, true );
	        texturedMaterial.uniforms.texture.value = null;
	        this.fullscreenQuad.material = null;
	    },
	    setRenderTargetSubData: function(ids, getDataCallback, renderTarget, renderTarget2){
	        this.saveRendererState();
	        var numVertices = 128; // Good number?
	        if(!this.scenes.setBodyData){

	            this.materials.setBodyData = new THREE.ShaderMaterial({
	                uniforms: {
	                    res: { value: new THREE.Vector2() }
	                },
	                vertexShader: getShader( 'setBodyDataVert' ),
	                fragmentShader: getShader( 'setBodyDataFrag' ),
	                defines: this.getDefines()
	            });

	            var onePointPerBodyGeometry = this.onePointPerBodyGeometry = new THREE.BufferGeometry();
	            var maxBodies = this.maxBodies;
	            var bodyIndices = new Float32Array( numVertices );
	            var pixelData = new Float32Array( 4 * numVertices );
	            onePointPerBodyGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( numVertices * 3 ), 3 ) );
	            onePointPerBodyGeometry.addAttribute( 'data', new THREE.BufferAttribute( pixelData, 4 ) );
	            onePointPerBodyGeometry.addAttribute( 'bodyIndex', new THREE.BufferAttribute( bodyIndices, 1 ) );
	            this.setBodyDataMesh = new THREE.Points( onePointPerBodyGeometry, this.materials.setBodyData );
	            this.scenes.setBodyData = new THREE.Scene();
	            this.scenes.setBodyData.add( this.setBodyDataMesh );
	        }

	        this.materials.setBodyData.uniforms.res.value.set(this.bodyTextureSize, this.bodyTextureSize);
	        var data = new THREE.Vector4();
	        var attributes = this.onePointPerBodyGeometry.attributes;

	        for(var startIndex = 0; startIndex < ids.length; startIndex += numVertices){
	            var count = Math.min(numVertices, ids.length - startIndex);

	            attributes.bodyIndex.needsUpdate = true;
	            attributes.bodyIndex.updateRange.count = count;

	            attributes.data.needsUpdate = true;
	            attributes.data.updateRange.count = count;

	            for(var i=0; i<count; i++){
	                getDataCallback(data, startIndex + i);
	                attributes.bodyIndex.array[i] = ids[startIndex + i];
	                attributes.data.array[4*i+0] = data.x;
	                attributes.data.array[4*i+1] = data.y;
	                attributes.data.array[4*i+2] = data.z;
	                attributes.data.array[4*i+3] = data.w;
	            }
	            this.onePointPerBodyGeometry.setDrawRange( 0, count );
	            this.renderer.render( this.scenes.setBodyData, this.fullscreenCamera, renderTarget, false );
	            if(renderTarget2){
	                this.renderer.render( this.scenes.setBodyData, this.fullscreenCamera, renderTarget2, false );
	            }
	        }
	        this.restoreRendererState();
	    },
	    setBodyPositions: function(bodyIds, positions){
	        this.setRenderTargetSubData(bodyIds, function(out, i){
	            out.set(
	                positions[i].x,
	                positions[i].y,
	                positions[i].z,
	                1
	            );
	        }, this.textures.bodyPosRead, this.textures.bodyPosWrite);
	    },
	    setBodyQuaternions: function(bodyIds, quaternions){
	        this.setRenderTargetSubData(bodyIds, function(out, i){
	            out.set(
	                quaternions[i].x,
	                quaternions[i].y,
	                quaternions[i].z,
	                quaternions[i].w
	            );
	        }, this.textures.bodyQuatRead, this.textures.bodyQuatWrite);
	    },
	    setBodyVelocities: function(bodyIds, velocities){
	        this.setRenderTargetSubData(bodyIds, function(out, i){
	            out.set(
	                velocities[i].x,
	                velocities[i].y,
	                velocities[i].z,
	                1
	            );
	        }, this.textures.bodyVelRead, this.textures.bodyVelWrite);
	    },
	    setBodyAngularVelocities: function(bodyIds, angularVelocities){
	        this.setRenderTargetSubData(bodyIds, function(out, i){
	            out.set(
	                angularVelocities[i].x,
	                angularVelocities[i].y,
	                angularVelocities[i].z,
	                1
	            );
	        }, this.textures.bodyAngularVelRead, this.textures.bodyAngularVelWrite);
	    },
	    setBodyMassProperties: function(bodyIds, masses, inertias){
	        this.setRenderTargetSubData(bodyIds, function(out, i){
	            out.set(
	                inertias[i].x > 0 ? 1 / inertias[i].x : 0,
	                inertias[i].y > 0 ? 1 / inertias[i].y : 0,
	                inertias[i].z > 0 ? 1 / inertias[i].z : 0,
	                masses[i] > 0 ? 1 / masses[i] : 0
	            );
	        }, this.textures.bodyMass);
	    },
	    updateWorldParticlePositions: function(){
	        var mat = this.materials.localParticlePositionToWorld;
	        if(!mat){
	            mat = this.materials.localParticlePositionToWorld = new THREE.ShaderMaterial({
	                uniforms: {
	                    localParticlePosTex:  { value: null },
	                    bodyPosTex: { value: null },
	                    bodyQuatTex: { value: null },
	                },
	                vertexShader: passThroughVert,
	                fragmentShader: getShader( 'localParticlePositionToWorldFrag' ),
	                defines: this.getDefines()
	            });
	        }

	        var renderer = this.renderer;
	        renderer.state.buffers.depth.setTest( false );
	        renderer.state.buffers.stencil.setTest( false );

	        // Local particle positions to world
	        this.fullscreenQuad.material = mat;
	        mat.uniforms.localParticlePosTex.value = this.textures.particlePosLocal.texture;
	        mat.uniforms.bodyPosTex.value = this.textures.bodyPosRead.texture;
	        mat.uniforms.bodyQuatTex.value = this.textures.bodyQuatRead.texture;
	        renderer.render( this.scenes.fullscreen, this.fullscreenCamera, this.textures.particlePosWorld, false );
	        mat.uniforms.localParticlePosTex.value = null;
	        mat.uniforms.bodyPosTex.value = null;
	        mat.uniforms.bodyQuatTex.value = null;
	        this.fullscreenQuad.material = null;
	    },

	    updateRelativeParticlePositions: function(){
	        var mat = this.materials.localParticlePositionToRelative;
	        if(!mat){
	            mat = this.materials.localParticlePositionToRelative = new THREE.ShaderMaterial({
	                uniforms: {
	                    localParticlePosTex:  { value: null },
	                    bodyPosTex:  { value: null },
	                    bodyQuatTex:  { value: null },
	                },
	                vertexShader: passThroughVert,
	                fragmentShader: getShader( 'localParticlePositionToRelativeFrag' ),
	                defines: this.getDefines()
	            });
	        }

	        // Local particle positions to relative
	        this.fullscreenQuad.material = mat;
	        mat.uniforms.localParticlePosTex.value = this.textures.particlePosLocal.texture;
	        mat.uniforms.bodyPosTex.value = this.textures.bodyPosRead.texture;
	        mat.uniforms.bodyQuatTex.value = this.textures.bodyQuatRead.texture;
	        this.renderer.render( this.scenes.fullscreen, this.fullscreenCamera, this.textures.particlePosRelative, false );
	        this.fullscreenQuad.material = null;
	        mat.uniforms.localParticlePosTex.value = null;
	        mat.uniforms.bodyPosTex.value = null;
	        mat.uniforms.bodyQuatTex.value = null;
	    },

	    updateParticleVelocity: function(){

	        // bodyVelocityToParticleVelocity
	        var mat = this.materials.updateParticleVelocity;
	        if(!mat){
	            mat = this.materials.updateParticleVelocity = new THREE.ShaderMaterial({
	                uniforms: {
	                    relativeParticlePosTex:  { value: null },
	                    bodyVelTex:  { value: null },
	                    bodyAngularVelTex:  { value: null },
	                },
	                vertexShader: passThroughVert,
	                fragmentShader: getShader( 'bodyVelocityToParticleVelocityFrag' ),
	                defines: this.getDefines()
	            });
	        }

	        // Body velocity to particles in world space
	        this.fullscreenQuad.material = mat;
	        mat.uniforms.relativeParticlePosTex.value = this.textures.particlePosRelative.texture;
	        mat.uniforms.bodyVelTex.value = this.textures.bodyVelRead.texture;
	        mat.uniforms.bodyAngularVelTex.value = this.textures.bodyAngularVelRead.texture;
	        this.renderer.render( this.scenes.fullscreen, this.fullscreenCamera, this.textures.particleVel, false );
	        this.fullscreenQuad.material = null;
	        mat.uniforms.relativeParticlePosTex.value = null;
	        mat.uniforms.bodyVelTex.value = null;
	        mat.uniforms.bodyAngularVelTex.value = null;
	    },

	    resetGridStencilOld: function(){

	        var gridTexture = this.textures.grid;
	        var mat = this.materials.mapParticle;
	        var setGridStencilMaterial = this.materials.setGridStencil;

	        if(this.scenes.stencil === undefined){
	            // Scene for rendering the stencil buffer - one GL_POINT for each grid cell that we render 4 times
	            var sceneStencil = this.scenes.stencil = new THREE.Scene();
	            var onePointPerTexelGeometry = new THREE.Geometry();
	            gridTexture = this.textures.grid;
	            for(var i=0; i<gridTexture.width/2; i++){
	                for(var j=0; j<gridTexture.height/2; j++){
	                    onePointPerTexelGeometry.vertices.push(
	                        new THREE.Vector3(
	                            2*i/(gridTexture.width/2)-1,
	                            2*j/(gridTexture.height/2)-1,
	                            0
	                        )
	                    );
	                }
	            }
	            setGridStencilMaterial = this.materials.setGridStencil = new THREE.PointsMaterial({ size: 1, sizeAttenuation: false, color: 0xffffff });
	            this.setGridStencilMesh = new THREE.Points( onePointPerTexelGeometry, setGridStencilMaterial );
	            sceneStencil.add( this.setGridStencilMesh );
	        }

	        // Set up the grid texture for stencil routing.
	        // See http://www.gpgpu.org/static/s2007/slides/15-GPGPU-physics.pdf slide 24
	        var renderer = this.renderer;
	        var buffers = renderer.state.buffers;
	        var gl = renderer.context;
	        renderer.clearTarget( gridTexture, true, false, true );
	        buffers.depth.setTest( false );
	        buffers.depth.setMask( false ); // dont draw depth
	        buffers.color.setMask( false ); // dont draw color
	        buffers.color.setLocked( true );
	        buffers.depth.setLocked( true );
	        buffers.stencil.setTest( true );
	        buffers.stencil.setOp( gl.REPLACE, gl.REPLACE, gl.REPLACE );
	        buffers.stencil.setClear( 0 );
	        setGridStencilMaterial.color.setRGB(1,1,1);
	        var gridSizeX = gridTexture.width;
	        var gridSizeY = gridTexture.height;
	        for(var i=0;i<2;i++){
	            for(var j=0;j<2;j++){
	                var x = i, y = j;
	                var stencilValue = i + j * 2;
	                if(stencilValue === 0){
	                    continue; // No need to set 0 stencil value, it's already cleared
	                }
	                buffers.stencil.setFunc( gl.ALWAYS, stencilValue, 0xffffffff );
	                this.setGridStencilMesh.position.set((x+2)/gridSizeX,(y+2)/gridSizeY,0);
	                renderer.render( this.scenes.stencil, this.fullscreenCamera, gridTexture, false );
	            }
	        }
	        buffers.color.setLocked( false );
	        buffers.color.setMask( true );
	        buffers.depth.setLocked( false );
	        buffers.depth.setMask( true );
	    },

	    resetGridStencil: function(){

	        if(this.scenes.stencil2 === undefined){
	            this.materials.stencil = new THREE.ShaderMaterial({
	                uniforms: {
	                    res: { value: new THREE.Vector2(this.textures.grid.width,this.textures.grid.height) },
	                    quadrant: { value: 0.0 }
	                },
	                vertexShader: passThroughVert,
	                fragmentShader: setStencilFrag,
	            });

	            this.scenes.stencil2 = new THREE.Scene();
	            var quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), this.materials.stencil );
	            this.scenes.stencil2.add( quad );
	        }

	        var renderer = this.renderer;
	        renderer.setClearColor(0x000000, 1.0);
	        renderer.clearTarget( this.textures.grid, true, false, true ); // color, depth, stencil
	        var buffers = renderer.state.buffers;
	        var gl = renderer.context;
	        buffers.depth.setTest( false );
	        buffers.depth.setMask( false ); // dont draw depth
	        buffers.depth.setLocked( true );
	        buffers.color.setMask( false ); // dont draw color
	        buffers.color.setLocked( true );
	        buffers.stencil.setTest( true );
	        buffers.stencil.setOp( gl.REPLACE, gl.REPLACE, gl.REPLACE );
	        buffers.stencil.setClear( 0 );
	        buffers.stencil.setFunc( gl.ALWAYS, 1, 0xffffffff ); //always set stencil to 1
	        for(var i=0;i<2;i++){
	            for(var j=0;j<2;j++){
	                var x = i, y = j;
	                var stencilValue = i + j * 2;
	                if(stencilValue === 0){
	                    continue; // No need to set 0 stencil value, it's already cleared
	                }
	                this.materials.stencil.uniforms.quadrant.value = stencilValue;
	                buffers.stencil.setFunc( gl.ALWAYS, stencilValue, 0xffffffff );
	                renderer.render( this.scenes.stencil2, this.fullscreenCamera, this.textures.grid, false );
	            }
	        }
	        buffers.depth.setLocked( false );
	        buffers.depth.setMask( true );
	        buffers.depth.setTest( true );
	        buffers.color.setLocked( false );
	        buffers.color.setMask( true );
	    },

	    updateGrid: function(){

	        if(!window.a){
	            this.resetGridStencil();
	        } else {
	            this.resetGridStencilOld();
	        }

	        var renderer = this.renderer;
	        var buffers = renderer.state.buffers;
	        var gl = renderer.context;

	        var gridTexture = this.textures.grid;
	        var mat = this.materials.mapParticle;
	        var setGridStencilMaterial = this.materials.setGridStencil;
	        if(!mat){
	            mat = this.materials.mapParticle = new THREE.ShaderMaterial({
	                uniforms: {
	                    posTex: { value: null },
	                    cellSize: { value: new THREE.Vector3(this.radius*2, this.radius*2, this.radius*2) },
	                    gridPos: { value: this.broadphase.position },
	                },
	                vertexShader: getShader( 'mapParticleToCellVert' ),
	                fragmentShader: getShader( 'mapParticleToCellFrag' ),
	                defines: this.getDefines()
	            });

	            this.scenes.mapParticlesToGrid = new THREE.Scene();
	            var mapParticleGeometry = new THREE.BufferGeometry();
	            var size = this.textures.particlePosLocal.width;
	            var positions = new Float32Array( 3 * size * size );
	            var particleIndices = new Float32Array( size * size );
	            for(var i=0; i<size*size; i++){
	                particleIndices[i] = i; // Need to do this because there's no way to get the vertex index in webgl1 shaders...
	            }
	            mapParticleGeometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	            mapParticleGeometry.addAttribute( 'particleIndex', new THREE.BufferAttribute( particleIndices, 1 ) );
	            this.mapParticleToCellMesh = new THREE.Points( mapParticleGeometry, this.materials.mapParticle );
	            this.scenes.mapParticlesToGrid.add( this.mapParticleToCellMesh );
	        }

	        // Draw particle positions to grid, use stencil routing.
	        buffers.stencil.setFunc( gl.EQUAL, 3, 0xffffffff );
	        buffers.stencil.setOp( gl.INCR, gl.INCR, gl.INCR ); // Increment stencil value for every rendered fragment
	        this.mapParticleToCellMesh.material = mat;
	        mat.uniforms.posTex.value = this.textures.particlePosWorld.texture;
	        renderer.render( this.scenes.mapParticlesToGrid, this.fullscreenCamera, this.textures.grid, false );
	        mat.uniforms.posTex.value = null;
	        this.mapParticleToCellMesh.material = null;
	        buffers.stencil.setTest( false );
	    },

	    updateParticleForce: function(){
	        var renderer = this.renderer;
	        var buffers = renderer.state.buffers;
	        var gl = renderer.context;

	        // Update force material
	        var forceMaterial = this.materials.force;
	        if(!forceMaterial){
	            forceMaterial = this.materials.force = new THREE.ShaderMaterial({
	                uniforms: {
	                    cellSize: { value: new THREE.Vector3(this.radius*2,this.radius*2,this.radius*2) },
	                    gridPos: { value: this.broadphase.position },
	                    posTex:  { value: null },
	                    particlePosRelative:  { value: null },
	                    velTex:  { value: null },
	                    bodyAngularVelTex:  { value: null },
	                    gridTex:  { value: this.textures.grid.texture },
	                    params1: { value: this.params1 },
	                    params2: { value: this.params2 },
	                    params3: { value: this.params3 },
	                },
	                vertexShader: passThroughVert,
	                fragmentShader: getShader( 'updateForceFrag' ),
	                defines: this.getDefines()
	            });
	        }

	        // Update particle forces / collision reaction
	        buffers.depth.setTest( false );
	        buffers.stencil.setTest( false );
	        this.fullscreenQuad.material = this.materials.force;
	        forceMaterial.uniforms.posTex.value = this.textures.particlePosWorld.texture;
	        forceMaterial.uniforms.particlePosRelative.value = this.textures.particlePosRelative.texture;
	        forceMaterial.uniforms.velTex.value = this.textures.particleVel.texture;
	        forceMaterial.uniforms.bodyAngularVelTex.value = this.textures.bodyAngularVelRead.texture;
	        renderer.render( this.scenes.fullscreen, this.fullscreenCamera, this.textures.particleForce, false );
	        forceMaterial.uniforms.posTex.value = null;
	        forceMaterial.uniforms.particlePosRelative.value = null;
	        forceMaterial.uniforms.velTex.value = null;
	        forceMaterial.uniforms.bodyAngularVelTex.value = null;
	        this.fullscreenQuad.material = null;
	    },

	    // Update particle torques / collision reaction
	    updateParticleTorque: function(){
	        var renderer = this.renderer;
	        var buffers = renderer.state.buffers;
	        var gl = renderer.context;

	        // Update torque material
	        var updateTorqueMaterial = this.materials.updateTorque;
	        if(!updateTorqueMaterial){
	            updateTorqueMaterial = this.materials.updateTorque = new THREE.ShaderMaterial({
	                uniforms: {
	                    cellSize: { value: new THREE.Vector3(this.radius*2, this.radius*2, this.radius*2) },
	                    gridPos: { value: this.broadphase.position },
	                    posTex:  { value: null },
	                    particlePosRelative:  { value: null },
	                    velTex:  { value: null },
	                    bodyAngularVelTex:  { value: null },
	                    gridTex:  { value: null },
	                    params1: { value: this.params1 },
	                    params2: { value: this.params2 },
	                    params3: { value: this.params3 },
	                },
	                vertexShader: passThroughVert,
	                fragmentShader: getShader( 'updateTorqueFrag' ),
	                defines: this.getDefines()
	            });
	        }

	        buffers.depth.setTest( false );
	        buffers.stencil.setTest( false );
	        this.fullscreenQuad.material = this.materials.updateTorque;
	        updateTorqueMaterial.uniforms.gridTex.value = this.textures.grid.texture;
	        updateTorqueMaterial.uniforms.posTex.value = this.textures.particlePosWorld.texture;
	        updateTorqueMaterial.uniforms.particlePosRelative.value = this.textures.particlePosRelative.texture;
	        updateTorqueMaterial.uniforms.velTex.value = this.textures.particleVel.texture;
	        updateTorqueMaterial.uniforms.bodyAngularVelTex.value = this.textures.bodyAngularVelRead.texture; // Angular velocity for indivitual particles and bodies are the same
	        renderer.render( this.scenes.fullscreen, this.fullscreenCamera, this.textures.particleTorque, false );
	        updateTorqueMaterial.uniforms.posTex.value = null;
	        updateTorqueMaterial.uniforms.particlePosRelative.value = null;
	        updateTorqueMaterial.uniforms.velTex.value = null;
	        updateTorqueMaterial.uniforms.bodyAngularVelTex.value = null; // Angular velocity for indivitual particles and bodies are the same
	        updateTorqueMaterial.uniforms.gridTex.value = null;
	        this.fullscreenQuad.material = null;
	    },

	    updateBodyForce: function(){
	        var renderer = this.renderer;
	        var buffers = renderer.state.buffers;
	        var gl = renderer.context;

	        // Add force to body material
	        var addForceToBodyMaterial = this.materials.addForceToBody;
	        if(!addForceToBodyMaterial){
	            addForceToBodyMaterial = this.materials.addForceToBody = new THREE.ShaderMaterial({
	                uniforms: {
	                    relativeParticlePosTex:  { value: null },
	                    particleForceTex:  { value: null }
	                },
	                vertexShader: getShader( 'addParticleForceToBodyVert' ),
	                fragmentShader: getShader( 'addParticleForceToBodyFrag' ),
	                defines: this.getDefines(),
	                blending: THREE.AdditiveBlending,
	                transparent: true
	            });

	            // Scene for mapping the particle force to bodies - one GL_POINT for each particle
	            this.scenes.mapParticlesToBodies = new THREE.Scene();
	            var mapParticleToBodyGeometry = new THREE.BufferGeometry();
	            var numParticles = this.textures.particlePosLocal.width;
	            var bodyIndices = new Float32Array( numParticles * numParticles );
	            var particleIndices = new Float32Array( numParticles * numParticles );
	            for(var i=0; i<numParticles * numParticles; i++){
	                var particleId = i;
	                particleIndices[i] = particleId;
	                bodyIndices[i] = this.getBodyId(particleId);
	            }
	            mapParticleToBodyGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(numParticles*numParticles*3), 3 ) );
	            mapParticleToBodyGeometry.addAttribute( 'particleIndex', new THREE.BufferAttribute( particleIndices, 1 ) );
	            mapParticleToBodyGeometry.addAttribute( 'bodyIndex', new THREE.BufferAttribute( bodyIndices, 1 ) );
	            this.mapParticleToBodyMesh = new THREE.Points( mapParticleToBodyGeometry, addForceToBodyMaterial );
	            this.scenes.mapParticlesToBodies.add( this.mapParticleToBodyMesh );
	        }

	        // Add force to bodies
	        buffers.depth.setTest( false );
	        buffers.stencil.setTest( false );
	        renderer.clearTarget(this.textures.bodyForce, true, true, true ); // clear the color only?
	        this.mapParticleToBodyMesh.material = this.materials.addForceToBody;
	        addForceToBodyMaterial.uniforms.relativeParticlePosTex.value = this.textures.particlePosRelative.texture;
	        addForceToBodyMaterial.uniforms.particleForceTex.value = this.textures.particleForce.texture;
	        renderer.render( this.scenes.mapParticlesToBodies, this.fullscreenCamera, this.textures.bodyForce, false );
	        addForceToBodyMaterial.uniforms.relativeParticlePosTex.value = null;
	        addForceToBodyMaterial.uniforms.particleForceTex.value = null;
	        this.mapParticleToBodyMesh.material = null;
	    },

	    saveRendererState: function(){
	        this.oldAutoClear = this.renderer.autoClear;
	        this.renderer.autoClear = false;

	        this.oldClearColor = this.renderer.getClearColor().getHex();
	        this.oldClearAlpha = this.renderer.getClearAlpha();
	        this.renderer.setClearColor( 0x000000, 1.0 );
	    },

	    restoreRendererState: function(){
	        this.renderer.autoClear = this.oldAutoClear;
	        this.renderer.setRenderTarget( null );
	        this.renderer.setClearColor( this.oldClearColor, this.oldClearAlpha );
	    },

	    updateBodyTorque: function(){
	        var renderer = this.renderer;

	        // Add torque to body material
	        var addTorqueToBodyMaterial = this.materials.addTorqueToBody;
	        if(!addTorqueToBodyMaterial){
	            addTorqueToBodyMaterial = this.materials.addTorqueToBody = new THREE.ShaderMaterial({
	                uniforms: {
	                    relativeParticlePosTex: { value: null },
	                    particleForceTex: { value: null },
	                    particleTorqueTex: { value: null }
	                },
	                vertexShader: getShader( 'addParticleTorqueToBodyVert' ),
	                fragmentShader: getShader( 'addParticleForceToBodyFrag' ), // reuse
	                defines: this.getDefines(),
	                blending: THREE.AdditiveBlending,
	                transparent: true
	            });
	        }

	        // Add torque to bodies
	        renderer.clearTarget(this.textures.bodyTorque, true, true, true ); // clear the color only?
	        this.mapParticleToBodyMesh.material = addTorqueToBodyMaterial;
	        addTorqueToBodyMaterial.uniforms.relativeParticlePosTex.value = this.textures.particlePosRelative.texture;
	        addTorqueToBodyMaterial.uniforms.particleForceTex.value = this.textures.particleForce.texture;
	        addTorqueToBodyMaterial.uniforms.particleTorqueTex.value = this.textures.particleTorque.texture;
	        renderer.render( this.scenes.mapParticlesToBodies, this.fullscreenCamera, this.textures.bodyTorque, false );
	        addTorqueToBodyMaterial.uniforms.relativeParticlePosTex.value = null;
	        addTorqueToBodyMaterial.uniforms.particleForceTex.value = null;
	        addTorqueToBodyMaterial.uniforms.particleTorqueTex.value = null;
	        this.mapParticleToBodyMesh.material = null;
	    },

	    getUpdateVelocityMaterial: function(){
	        // Update body velocity - should work for both linear and angular
	        var updateBodyVelocityMaterial = this.materials.updateBodyVelocity;
	        if(!updateBodyVelocityMaterial){
	            updateBodyVelocityMaterial = this.materials.updateBodyVelocity = new THREE.ShaderMaterial({
	                uniforms: {
	                    linearAngular:  { type: 'f', value: 0.0 },
											bodyPosTex:  { value: null },
	                    bodyQuatTex:  { value: null },
	                    bodyForceTex:  { value: null },
	                    bodyVelTex:  { value: null },
	                    bodyMassTex:  { value: null },
											bodyInfosTex:  { value: null },
	                    params2: { value: this.params2 },
	                    gravity:  { value: this.gravity },
	                    maxVelocity: { value: this.maxVelocity }
	                },
	                vertexShader: passThroughVert,
	                fragmentShader: getShader( 'updateBodyVelocityFrag' ),
	                defines: this.getDefines()
	            });
	        }
	        return updateBodyVelocityMaterial;
	    },

	    updateBodyVelocity: function(){
	        var renderer = this.renderer;

	        var updateBodyVelocityMaterial = this.getUpdateVelocityMaterial();

	        // Update body velocity
	        this.fullscreenQuad.material = updateBodyVelocityMaterial;
	        updateBodyVelocityMaterial.uniforms.bodyMassTex.value = this.textures.bodyMass.texture;
	        updateBodyVelocityMaterial.uniforms.linearAngular.value = 0;
	        updateBodyVelocityMaterial.uniforms.bodyVelTex.value = this.textures.bodyVelRead.texture;
	        updateBodyVelocityMaterial.uniforms.bodyForceTex.value = this.textures.bodyForce.texture;
					updateBodyVelocityMaterial.uniforms.bodyInfosTex.value = this.textures.bodyInfos.texture;
					updateBodyVelocityMaterial.uniforms.bodyPosTex.value = this.textures.bodyPosRead.texture;
					updateBodyVelocityMaterial.uniforms.bodyQuatTex.value = this.textures.bodyQuatRead.texture;
	        renderer.render( this.scenes.fullscreen, this.fullscreenCamera, this.textures.bodyVelWrite, false );
	        this.fullscreenQuad.material = null;
					updateBodyVelocityMaterial.uniforms.bodyPosTex.value = null;
	        updateBodyVelocityMaterial.uniforms.bodyMassTex.value = null;
	        updateBodyVelocityMaterial.uniforms.bodyVelTex.value = null;
	        updateBodyVelocityMaterial.uniforms.bodyForceTex.value = null;
					updateBodyVelocityMaterial.uniforms.bodyInfosTex.value = null;
					updateBodyVelocityMaterial.uniforms.bodyQuatTex.value = null;

	        this.swapTextures('bodyVelWrite', 'bodyVelRead');
	    },

	    updateBodyAngularVelocity: function(){
	        var renderer = this.renderer;
	        // Update body angular velocity
	        var updateBodyVelocityMaterial = this.getUpdateVelocityMaterial();
	        this.fullscreenQuad.material = updateBodyVelocityMaterial;
	        updateBodyVelocityMaterial.uniforms.bodyQuatTex.value = this.textures.bodyQuatRead.texture;
	        updateBodyVelocityMaterial.uniforms.bodyMassTex.value = this.textures.bodyMass.texture;
	        updateBodyVelocityMaterial.uniforms.linearAngular.value = 1;
	        updateBodyVelocityMaterial.uniforms.bodyVelTex.value = this.textures.bodyAngularVelRead.texture;
	        updateBodyVelocityMaterial.uniforms.bodyForceTex.value = this.textures.bodyTorque.texture;
	        renderer.render( this.scenes.fullscreen, this.fullscreenCamera, this.textures.bodyAngularVelWrite, false );
	        this.fullscreenQuad.material = null;
	        updateBodyVelocityMaterial.uniforms.bodyQuatTex.value = null;
	        updateBodyVelocityMaterial.uniforms.bodyMassTex.value = null;
	        updateBodyVelocityMaterial.uniforms.bodyVelTex.value = null;
	        updateBodyVelocityMaterial.uniforms.bodyForceTex.value = null;
	        this.swapTextures('bodyAngularVelWrite', 'bodyAngularVelRead');
	    },

			setBodyPosition: function(){
					var renderer = this.renderer;

					// Body position update
					var setBodyPositionMaterial = this.materials.setBodyPosition;
					if(!setBodyPositionMaterial){
							setBodyPositionMaterial = this.materials.setBodyPosition = new THREE.ShaderMaterial({
									uniforms: {
											bodyPosTex:  { value: null },
											bodyVelTex:  { value: null },
											bodyInfosTex:  { value: null },
											params2: { value: this.params2 }
									},
									vertexShader: passThroughVert,
									fragmentShader: getShader( 'setBodyPositionFrag' ),
									defines: this.getDefines()
							});
					}

					// Update body positions
					this.fullscreenQuad.material = setBodyPositionMaterial;
					setBodyPositionMaterial.uniforms.bodyPosTex.value = this.textures.bodyPosRead.texture;
					setBodyPositionMaterial.uniforms.bodyVelTex.value = this.textures.bodyVelRead.texture;
					setBodyPositionMaterial.uniforms.bodyInfosTex.value = this.textures.bodyInfos.texture;
					renderer.render( this.scenes.fullscreen, this.fullscreenCamera, this.textures.bodyPosWrite, false );
					setBodyPositionMaterial.uniforms.bodyPosTex.value = null;
					setBodyPositionMaterial.uniforms.bodyVelTex.value = null;
					setBodyPositionMaterial.uniforms.bodyInfosTex.value = null;
					this.fullscreenQuad.material = null;
					this.swapTextures('bodyPosWrite', 'bodyPosRead');
			},

			setBodyQuaternion: function(){
					var renderer = this.renderer;

					// Update body quaternions
					var setBodyQuaternionMaterial = this.materials.setBodyQuaternion;
					if(!setBodyQuaternionMaterial){
							setBodyQuaternionMaterial = this.materials.setBodyQuaternion = new THREE.ShaderMaterial({
									uniforms: {
											bodyQuatTex: { value: null },
											bodyAngularVelTex: { value: null },
											bodyPosTex:  { value: null },
											bodyInfosTex:  { value: null },
											params2: { value: this.params2 }
									},
									vertexShader: passThroughVert,
									fragmentShader: getShader( 'setBodyQuaternionFrag' ),
									defines: this.getDefines()
							});
					}

					// Update body quaternions
					this.fullscreenQuad.material = setBodyQuaternionMaterial;
					setBodyQuaternionMaterial.uniforms.bodyQuatTex.value = this.textures.bodyQuatRead.texture;
					setBodyQuaternionMaterial.uniforms.bodyAngularVelTex.value = this.textures.bodyAngularVelRead.texture;
					setBodyQuaternionMaterial.uniforms.bodyPosTex.value = this.textures.bodyAngularVelRead.texture;
					setBodyQuaternionMaterial.uniforms.bodyInfosTex.value = this.textures.bodyInfos.texture;
					renderer.render( this.scenes.fullscreen, this.fullscreenCamera, this.textures.bodyQuatWrite, false );
					setBodyQuaternionMaterial.uniforms.bodyQuatTex.value = null;
					setBodyQuaternionMaterial.uniforms.bodyAngularVelTex.value = null;
					setBodyQuaternionMaterial.uniforms.bodyPosTex.value = null;
					setBodyQuaternionMaterial.uniforms.bodyInfosTex.value = null;
					this.fullscreenQuad.material = null;

					this.swapTextures('bodyQuatWrite', 'bodyQuatRead');
			},

	    updateBodyPosition: function(){
	        var renderer = this.renderer;

	        // Body position update
	        var updateBodyPositionMaterial = this.materials.updateBodyPosition;
	        if(!updateBodyPositionMaterial){
	            updateBodyPositionMaterial = this.materials.updateBodyPosition = new THREE.ShaderMaterial({
	                uniforms: {
	                    bodyPosTex:  { value: null },
	                    bodyVelTex:  { value: null },
											bodyInfosTex:  { value: null },
	                    params2: { value: this.params2 }
	                },
	                vertexShader: passThroughVert,
	                fragmentShader: getShader( 'updateBodyPositionFrag' ),
	                defines: this.getDefines()
	            });
	        }

	        // Update body positions
	        this.fullscreenQuad.material = updateBodyPositionMaterial;
	        updateBodyPositionMaterial.uniforms.bodyPosTex.value = this.textures.bodyPosRead.texture;
	        updateBodyPositionMaterial.uniforms.bodyVelTex.value = this.textures.bodyVelRead.texture;
					updateBodyPositionMaterial.uniforms.bodyInfosTex.value = this.textures.bodyInfos.texture;
	        renderer.render( this.scenes.fullscreen, this.fullscreenCamera, this.textures.bodyPosWrite, false );
	        updateBodyPositionMaterial.uniforms.bodyPosTex.value = null;
	        updateBodyPositionMaterial.uniforms.bodyVelTex.value = null;
					updateBodyPositionMaterial.uniforms.bodyInfosTex.value = null;
	        this.fullscreenQuad.material = null;
	        this.swapTextures('bodyPosWrite', 'bodyPosRead');
	    },

	    updateBodyQuaternion: function(){
	        var renderer = this.renderer;

	        // Update body quaternions
	        var updateBodyQuaternionMaterial = this.materials.updateBodyQuaternion;
	        if(!updateBodyQuaternionMaterial){
	            updateBodyQuaternionMaterial = this.materials.updateBodyQuaternion = new THREE.ShaderMaterial({
	                uniforms: {
	                    bodyQuatTex: { value: null },
	                    bodyAngularVelTex: { value: null },
											bodyPosTex:  { value: null },
											bodyInfosTex:  { value: null },
	                    params2: { value: this.params2 }
	                },
	                vertexShader: passThroughVert,
	                fragmentShader: getShader( 'updateBodyQuaternionFrag' ),
	                defines: this.getDefines()
	            });
	        }

	        // Update body quaternions
	        this.fullscreenQuad.material = updateBodyQuaternionMaterial;
	        updateBodyQuaternionMaterial.uniforms.bodyQuatTex.value = this.textures.bodyQuatRead.texture;
	        updateBodyQuaternionMaterial.uniforms.bodyAngularVelTex.value = this.textures.bodyAngularVelRead.texture;
					updateBodyQuaternionMaterial.uniforms.bodyPosTex.value = this.textures.bodyAngularVelRead.texture;
					updateBodyQuaternionMaterial.uniforms.bodyInfosTex.value = this.textures.bodyInfos.texture;
	        renderer.render( this.scenes.fullscreen, this.fullscreenCamera, this.textures.bodyQuatWrite, false );
	        updateBodyQuaternionMaterial.uniforms.bodyQuatTex.value = null;
	        updateBodyQuaternionMaterial.uniforms.bodyAngularVelTex.value = null;
					updateBodyQuaternionMaterial.uniforms.bodyPosTex.value = null;
					updateBodyQuaternionMaterial.uniforms.bodyInfosTex.value = null;
	        this.fullscreenQuad.material = null;

	        this.swapTextures('bodyQuatWrite', 'bodyQuatRead');
	    },

	    swapTextures: function(a,b){
	        var textures = this.textures;
	        if(!textures[a]) throw new Error("missing texture " + a);
	        if(!textures[b]) throw new Error("missing texture " + b);
	        var tmp = textures[a];
	        textures[a] = textures[b];
	        textures[b] = tmp;
	    },

	    setSphereRadius: function(sphereIndex, radius){
	        if(sphereIndex !== 0) throw new Error("Multiple spheres not supported yet");
	        this.params3.w = radius;
	    },

	    getSphereRadius: function(sphereIndex){
	        if(sphereIndex !== 0) throw new Error("Multiple spheres not supported yet");
	        return this.params3.w;
	    },

	    setSpherePosition: function(sphereIndex, x, y, z){
	        if(sphereIndex !== 0) throw new Error("Multiple spheres not supported yet");
	        this.params3.x = x;
	        this.params3.y = y;
	        this.params3.z = z;
	    },

	    getSpherePosition: function(sphereIndex, out){
	        if(sphereIndex !== 0) throw new Error("Multiple spheres not supported yet");
	        out.x = this.params3.x;
	        out.y = this.params3.y;
	        out.z = this.params3.z;
	    }
	});

	function createRenderTarget(w,h,type,format){
	    return new THREE.WebGLRenderTarget(w, h, {
	        minFilter: THREE.NearestFilter,
	        magFilter: THREE.NearestFilter,
	        format: format === undefined ? THREE.RGBAFormat : format,
	        type: type
	    });
	}

	exports.World = World;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
