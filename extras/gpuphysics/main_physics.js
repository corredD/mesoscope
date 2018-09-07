//http://mgldev.scripps.edu/projects/mesoscopebeta/template.html?n=256&c=10&atom=false
//http://mgldev.scripps.edu/projects/mesoscopebeta/template.html?scene=0&n=128&atom=true&c=10
// TODO:
// compartments
// compartments-forces
// fiber
// fiber-forces
//var loading_bar;
//http://iquilezles.org/www/articles/distfunctions/distfunctions.htm
var DEBUGGPU = false;
var query;
var ySpread = 0.1;
var nodes;
var root;
var pack = d3v4.pack()
      .size([600, 600])
      .padding(30);
var stage;
var ascale = 0.065/40;
var instance_infos=[];
var instance_atoms_infos=[];
var max_atoms = 100000;
var type_meshs={};
var meshMeshs=[];
var world;
var copy_number=20;
var num_instances=0;
var num_beads_total=0;
var scene, ambientLight, light, camera, controls, renderer;
var amesh;

var debugMesh, debugGridMesh, cv_Mesh;
var gridPoints;

var controller;
var boxSize;
var numParticles;
var radius;

var meshMaterial;
var cv_Material;
var customDepthMaterial;
var all_materials;
var current_material;
var atomData;
var atomData_do=false;
var current_node_id = 0;
var current_atom_start = 0;
var atomData_done = false;
var atomData_build = false;
var atomData_mapping = {};
var atomData_mapping_instance = [];//for every beads what is the atomid?
var rb_init = false;
var master_grid_field;
var master_grid_id;
var inited = false;
var particle_id_Count=0;
/*SSAO PARAMATER AND VARIABLE*/
var ssao_params= {
				output: 0,
				saoBias: 0.5,
				saoIntensity: 0.25,
				saoScale: 1,
				saoKernelRadius: 100,
				saoMinResolution: 0,
				saoBlur: true,
				saoBlurRadius: 12,
				saoBlurStdDev: 6,
				saoBlurDepthCutoff: 0.01
			}

var depthMaterial, saoMaterial, saoModulateMaterial, normalMaterial, vBlurMaterial, hBlurMaterial, copyMaterial;
var depthRenderTarget, normalRenderTarget, saoRenderTarget, beautyRenderTarget, blurIntermediateRenderTarget;
var composer, renderPass, saoPass1,saoPass2, copyPass;

var raycaster;
var gp_mouse = THREE.Vector2(0,0);

var general_inertia_mass;

/*display shader*/
var imposter_vertex="precision highp float;\n\
uniform sampler2D particleWorldPosTex;\n\
uniform sampler2D quatTex;\n\
uniform float radius;\n\
attribute float instanceInfos;\n\
varying float vRadius;\n\
varying vec3 vPosition;\n\
varying vec4 vColor;\n\
varying vec2 vUv;\n\
varying mat4 modelView;\n\
void main(){\n\
  float particleId = instanceInfos;\n\
  vec2 particleUV = indexToUV(particleId,resolution);\n\
  vec4 particlePosAndBodyId = texture2D(particleWorldPosTex,particleUV);\n\
  vec2 bodyUV = indexToUV(particlePosAndBodyId.w,bodyTextureResolution);\n\
  vec4 bodyQuat = texture2D(quatTex,bodyUV).xyzw;\n\
  vec3 billboardWorldPos = particlePosAndBodyId.xyz;\n\
  vRadius = radius;\n\
  vec3 vertexPos = position*radius;// * 0.0078125;//radius;\n\
  modelView = modelViewMatrix;\n\
  mat4 VP = projectionMatrix * modelViewMatrix;\n\
  vec3 CameraRight = vec3(modelViewMatrix[0][0], modelViewMatrix[1][0], modelViewMatrix[2][0]);\n\
  vec3 CameraUp = vec3(modelViewMatrix[0][1], modelViewMatrix[1][1], modelViewMatrix  [2][1]);\n\
  vec3 billboardVertexWorldPos = billboardWorldPos.xyz\n\
           + CameraRight * vertexPos.x + CameraUp * vertexPos.y;\n\
	vColor = vec4(1.0,0.0,0.0,1.0);\n\
  vUv = uv;\n\
	gl_Position = VP  * vec4( billboardVertexWorldPos.xyz , 1.0 );\n\
  vPosition = billboardVertexWorldPos;\n\
}\n";
var imposter_fragment="#include <logdepthbuf_pars_fragment>\n\
#include <packing>\n\
precision highp float;\n\
uniform mat4 projectionMatrix;\n\
uniform float cameraNear;\n\
uniform float cameraFar;\n\
varying float vRadius;\n\
varying vec3 vPosition;\n\
varying vec4 vColor;\n\
varying vec2 vUv;\n\
varying mat4 modelView;\n\
vec4 getZparams(){\n\
  // OpenGL would be this:\n\
  float zc0 = (1.0 - cameraFar / cameraNear) / 2.0;\n\
  float zc1 = (1.0 + cameraFar / cameraNear) / 2.0;\n\
  // D3D is this:\n\
  //zc0 = 1.0 - m_FarClip / m_NearClip;\n\
  //zc1 = m_FarClip / m_NearClip;\n\
  // now set _ZBufferParams with (zc0, zc1, zc0/m_FarClip, zc1/m_FarClip);\n\
  return vec4(zc0, zc1, zc0/cameraFar, zc1/cameraNear);\n\
}\n\
float LinearEyeDepth(vec4 _ZBufferParams,float z){\n\
  return 1.0 / (_ZBufferParams.x * z + _ZBufferParams.y);\n\
}\n\
float calcDepth( float z ){\n\
    vec2 clipZW = z * projectionMatrix[2].zw + projectionMatrix[3].zw;\n\
    return 0.5 + 0.5 * clipZW.x / clipZW.y;\n\
}\n\
void main() {\n\
  float lensqr = dot(vUv, vUv);\n\
  if (lensqr > 1.0) discard;\n\
  vec3 normal = normalize(vec3(vUv, sqrt(1.0 - lensqr)));\n\
  vec3 cameraPos = (normal * vRadius) + vPosition;\n\
  vec4 clipPos = projectionMatrix * modelView * vec4(cameraPos, 1.0);\n\
  float ndcDepth = clipPos.z / clipPos.w;\n\
  float gldepth = ((gl_DepthRange.diff * ndcDepth) +\n\
        gl_DepthRange.near + gl_DepthRange.far) / 2.0;\n\
  gl_FragDepthEXT = gldepth;\n\
	gl_FragColor = vec4(normal,1.0);//0.78,0.78,0.78,1.0);\n\
}\n";

/*functions*/
function Debug_getValues( i, j, k){
	var u = (k * world.broadphase.resolution.x * world.broadphase.resolution.x) + (j * world.broadphase.resolution.x) + i;
  var g_value = master_grid_field[u*4+3];
  return g_value;
}

function Debug_trilinearInterpolation(point){
	// Find the x, y and z values of the \n\
	// 8 vertices of the cube that surrounds the point\n\
  var p = new NGL.Vector3( point.x,
                           point.y,
                           point.z);
  p.sub(world.broadphase.position);
  p.multiplyScalar(world.broadphase.resolution.x);//.divide(bounds.size);//.divideScalar(bounds.maxsize);
	var x0 = Math.floor(p.x);
	var x1 = Math.floor(p.x) + 1.0;
	var y0 = Math.floor(p.y);
	var y1 = Math.floor(p.y) + 1.0;
	var z0 = Math.floor(p.z);
	var z1 = Math.floor(p.z) + 1.0;
	// Look up the values of the 8 points surrounding the cube\n\
	// Find the weights for each dimension\n\
	var x = (p.x - x0);
	var y = (p.y - y0);
	var z = (p.z - z0);
	var V000=Debug_getValues(x0,y0,z0);
	var V100=Debug_getValues(x1,y0,z0);
	var V010=Debug_getValues(x0,y1,z0);
	var V001=Debug_getValues(x0,y0,z1);
	var V101=Debug_getValues(x1,y0,z1);
	var V011=Debug_getValues(x0,y1,z1);
	var V110=Debug_getValues(x1,y1,z0);
	var V111=Debug_getValues(x1,y1,z1);
	var Vxyz = 	V000*(1.0 - x)*(1.0 - y)*(1.0 - z) +
	V100*x*(1.0 - y)*(1.0 - z) +
	V010*(1.0 - x)*y*(1.0 - z) +
	V001*(1.0 - x)*(1.0 - y)*z +
	V101*x*(1.0 - y)*z +
	V011*(1.0 - x)*y*z +
	V110*x*y*(1.0 - z) +
	V111*x*y*z;
	return Vxyz;//*1175.0*0.000390625;
}

function Debug_CalculateSurfaceNormal(p,H)
{
	//var H = world.radius/8.0; //1.0f/grid_unit;\n\
  var x = new THREE.Vector3( H, 0.0, 0.0 );
  var y = new THREE.Vector3( 0.0, H, 0.0 );
  var z = new THREE.Vector3( 0.0, 0.0, H );
	var dx = Debug_trilinearInterpolation(new THREE.Vector3( ).copy(p).add(x)) - Debug_trilinearInterpolation(new THREE.Vector3( ).copy(p).sub(x));
	var dy = Debug_trilinearInterpolation(new THREE.Vector3( ).copy(p).add(y)) - Debug_trilinearInterpolation(new THREE.Vector3( ).copy(p).sub(x));
	var dz = Debug_trilinearInterpolation(new THREE.Vector3( ).copy(p).add(z)) - Debug_trilinearInterpolation(new THREE.Vector3( ).copy(p).sub(x));
  var dxyz = new THREE.Vector3(dx, dy, dz);
  dxyz.normalize();
  return dxyz;
}

function ComputeVolume(anode) {
    //Debug.Log("ComputeVolume " + compId.ToString());
    if (anode.data.mc) {
      return anode.data.vol;
    }
    var gridStepSize = world.radius;//*2;
    var N = world.broadphase.resolution.x*world.broadphase.resolution.y*world.broadphase.resolution.z;//nbVoxelPerCompartmentsCPU[(int)Mathf.Abs(compId)];
    var unit = gridStepSize * (1.0 / ascale);
    var volume_one_voxel = unit * unit * unit;
    return N * volume_one_voxel;
}

function ComputeArea(anode){
    var m = anode.parent.data.geo;
    var inv_scale = anode.parent.data.mc.data_bound.maxsize;//1.0/ascale;
    var result = new THREE.Vector3(0,0,0);
    for (var p = m.vertices.length/3 - 1, q = 0; q < m.vertices.length/3; p = q++)
    {
      var cr = new THREE.Vector3();
      cr.crossVectors(new THREE.Vector3(m.vertices[q*3]*inv_scale,m.vertices[q*3+1]*inv_scale,m.vertices[q*3+2]*inv_scale),
                      new THREE.Vector3(m.vertices[p*3]*inv_scale,m.vertices[p*3+1]*inv_scale,m.vertices[p*3+2]*inv_scale));
      result.add(cr );
      //result += Vector3.Cross(m.vertices[q], m.vertices[p]);
    }
    result.multiplyScalar(0.5);// *= 0.5f;
    //100 square angstrom = 1 square nanometer
    return result.length()*0.01;//.length();//this is in angstrom**
}

function BuildMeshTriangle(radius){
    var triMesh={};
    //Vector4 offset = new Vector4(radius,radius,0,0);
    var offset = new THREE.Vector2(radius, radius);
    //*****//
    var uvs = [];
    var indices = [];
    var vertices = [];

    var triBase = 3.464;
    var triHeigth = 3;
    var triBaseHalf = triBase * 0.5;
    var triOffset = new THREE.Vector2(triBaseHalf, 1.0);

    var uv = new THREE.Vector2(0, 0);
    uv.sub(triOffset);
    uvs.push(uv.x);uvs.push(uv.y);
    uv.multiply(offset)
    var v = new THREE.Vector3(uv.x, uv.y, 0);
    vertices.push(v.x);vertices.push(v.y);vertices.push(v.z);// output.pos = projPos + float4(output.uv * offset.xy, 0, 0);
    indices.push(0);

    uv = new THREE.Vector2(triBaseHalf, triHeigth)
    uv.sub(triOffset);
    uvs.push(uv.x);uvs.push(uv.y);
    uv.multiply(offset)
    v = new THREE.Vector3(uv.x, uv.y, 0);
    vertices.push(v.x);vertices.push(v.y);vertices.push(v.z);///output.pos = projPos + float4(output.uv * offset.xy, 0, 0);
    indices.push(1);

    uv = new THREE.Vector2(triBase, 0)
    uv.sub(triOffset);
    uvs.push(uv.x);uvs.push(uv.y);
    uv.multiply(offset)
    v = new THREE.Vector3(uv.x, uv.y, 0);
    vertices.push(v.x);vertices.push(v.y);vertices.push(v.z);///output.pos = projPos + float4(output.uv * offset.xy, 0, 0);
    indices.push(2);

    triMesh.vertices = vertices;
    triMesh.uv = uvs;
    triMesh.triangles = indices;
    return triMesh;
}
/*
public int to1D( int x, int y, int z ) {
    return (z * xMax * yMax) + (y * xMax) + x;
}


public int[] to3D( int idx ) {
    final int z = idx / (xMax * yMax);
    idx -= (z * xMax * yMax);
    final int y = idx / xMax;
    final int x = idx % xMax;
    return new int[]{ x, y, z };
}*/

function GP_uToWorldCoordinate(u){
	var ijk = Util_getIJK(u,world.broadphase.resolution.x);
	//var r = Util_getXYZ(qi,world.broadphase.resolution.x,ascale);
	x = - world.boxSize.x +ijk[0]/world.broadphase.resolution.x;//r[0];//-boxSize.x +-boxSize.x +
	y = - 0.5 + ijk[1]/world.broadphase.resolution.x;//;//-boxSize.y +-boxSize.y +-boxSize.y +
	z = - world.boxSize.z +ijk[2]/world.broadphase.resolution.x;//;//-boxSize.z +-boxSize.z +
	//console.log(qi,ijk,x,y,z,anode.parent.data.insides.length,h,count);//nan
	return [x/ascale,y/ascale,z/ascale];
}

function GP_getMinMax(xs,ys,zs,radius,n){
  var min_z = Math.floor(zs - radius);
  if (min_z < 0) min_z = 0;
  var max_z = Math.floor(zs + radius);
  if (max_z > n) max_z = n;
  var min_y = Math.floor(ys - radius);
  if (min_y < 0) min_y = 0;
  var max_y = Math.floor(ys + radius);
  if (max_y > n) max_y = n;
  var min_x = Math.floor(xs - radius);
  if (min_x < 0) min_x = 0;
  var max_x = Math.floor(xs + radius);
  if (max_x > n) max_x = n;
  return {"min_x":min_x,"max_x":max_x,
          "min_y":min_y,"max_y":max_y,
          "min_z":min_z,"max_z":max_z}
}

function GP_CombineGrid(){
  //do it starting from the compartments...
  var w = world.broadphase.resolution.x * world.radius * 2;//1
  var h = world.broadphase.resolution.y * world.radius * 2;//1
  var d = world.broadphase.resolution.z * world.radius * 2;//1
  var counter = 0;
  var extend = 1.0/ascale;
  var n = world.broadphase.resolution.x;
  //master grid is aligned to the broadphase grid
  master_grid_field = new Float32Array(n*n*n*4);//intialized to 0
  master_grid_id = new Float32Array(n*n*n);//intialized to 0
  //initialize root inside indices
  var indices = [];
  for ( var i = 0; i < n*n*n; i ++ ) {
    indices.push(i);
    master_grid_field[i*4+3] = 2.0;
  }
  for (var i=0;i<nodes.length;i++){//nodes.length
    if (!nodes[i].parent)
    {
        nodes[i].data.compId=counter;
        counter+=1;
        continue;
    }
    else if ((nodes[i].children !== null) && (nodes[i].data.nodetype === "compartment")) {
        //normalize the box
        var bsize = nodes[i].data.mc.data_bound.maxsize*ascale;
        var center = nodes[i].data.mc.data_bound.center;//*ascale;
        var zPlaneLength = n * n;
        //where it this in the box
        //-boxSize.x
        //x = -boxSize.x + Util_halton(bodyId,2)*w;
        //scaling issue
        //var bb = GP_getMinMax((center.x*ascale-world.broadphase.position.x+boxSize.x)*n,
        //                      (center.y*ascale-world.broadphase.position.y+boxSize.y)*n,
        //                      (center.z*ascale-world.broadphase.position.z+boxSize.z)*n,bsize*n,n);
        var bb = GP_getMinMax((center.x*ascale-world.broadphase.position.x)*n,
                              (center.y*ascale-world.broadphase.position.y)*n,
                              (center.z*ascale-world.broadphase.position.z)*n,bsize*n,n);

        nodes[i].data.mc.bb= bb;
        var x, y, z;
        for (z = bb.min_z; z < bb.max_z; z++) {
            for (y = bb.min_y; y < bb.max_y; y++) {
                for (x = bb.min_x; x < bb.max_x; x++) {
                    var u = Util_getUfromIJK(x,y,z,n);
                    var wxyz = GP_uToWorldCoordinate(u);
                    //var u = x + off;//y_offset + x;//this.field[y_offset + x] += val;
                    //var q = nodes[i].data.mc.getUfromXYZ( ((x/n-boxSize.x)/ascale),
                    //                                      ((y/n-boxSize.y)/ascale),
                    //                                      ((z/n-boxSize.z)/ascale) );
                    var q = nodes[i].data.mc.getUfromXYZ( wxyz[0],wxyz[1],wxyz[2] );
                    if (q<0) continue;
                    var e = nodes[i].data.mc.field[q];
                    //if ( e  >= nodes[i].data.mc.isolation) {//-1 && e < nodes[i].data.mc.isolation+1){
                    //inside is negative
                    if ( e < master_grid_field[u*4+3])
                    {
                      master_grid_field[u*4+3] = e;
                      master_grid_field[u*4] = nodes[i].data.mc.normal_cache[q * 3];
                      master_grid_field[u*4+1] = nodes[i].data.mc.normal_cache[q * 3+1];
                      master_grid_field[u*4+2] = nodes[i].data.mc.normal_cache[q * 3+2];
                    }
                    if ( e < nodes[i].data.mc.isolation ) {//-1 && e < nodes[i].data.mc.isolation+1){
                      master_grid_id[u] = counter;
                      nodes[i].data.compId=counter;
                      //console.log("inside");
                      indices.splice(u,1);
                    }
                }
            }
        }
        //
    }
    else continue;
  }
  nodes[0].data.insides = indices;
  //make a texture out of it, do we include normal_cache, or should we recompute it ?
  //lets try both
  world.addCompGrid(master_grid_id,master_grid_field);
}
/*
function GP_CombineGrid(root){
  //need to use the world grid size
  //create a texture with value,compId ?
  //onscreen it is 1,1,1
  var extend = 1.0/ascale;
  var n = world.broadphase.resolution;
  var grid_field = new Float32Array(n*n*n);
  var grid_normal_cache = new Float32Array(n*n*n * 3);
  for (var z=0;z<n;z++){
    for (var y=0;y<n;y++){
      for (var x=0;x<n;x++){
        var u = (z * n * n) + (y * n) + x;
        var aXYZ = [(x/64.0)/ascale,(y/64.0)/ascale,(z/64.0)/ascale];
        //where is this points ?
        //or do it  per compartement?
        for (var i=0;i<n;i++){//nodes.length
          if (!nodes[i].parent)
            {

            }
          if ((nodes[i].children !== null) && (nodes[i].data.nodetype === "compartment")) {
              //check int the field
              var q = nodes[i].parent.data.mc.getUfromXYZ(aXYZ);
              var e = nodes[i].parent.data.mc.field[q];
              if (e  > nodes[i].parent.data.mc.isolation-1 && e < nodes[i].parent.data.mc.isolation+1){
                grid_field[u] =
              }
              continue;
          };
        }
      }
    }
  }

}*/

function GP_updateMBCompartment(anode){
  anode.data.mc.update(anode.data.pos[0].coords,anode.data.radii[0].radii,0.2,0.0);
  anode.data.mc.isolation = 0.0;
  //NGL_updateMetaBallsGeom(anode);
  if (controller.renderIsoMB){
    var geo = anode.data.mc.generateGeometry();
    anode.data.geo = geo;
    var positions = new Float32Array(geo.vertices);
    var normals = new Float32Array(geo.normals);
    nodes[1].data.mesh.geometry.attributes.position = new THREE.BufferAttribute(positions, 3);
    nodes[1].data.mesh.geometry.attributes.normal = new THREE.BufferAttribute(positions, 3);
    nodes[1].data.mesh.geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(geo.faces), 1));
    nodes[1].data.mesh.geometry.attributes.position.needsUpdate = true;
    nodes[1].data.mesh.geometry.attributes.normal.needsUpdate = true;
    nodes[1].data.mesh.geometry.index.needsUpdate = true;
  }
}

function GP_createOneCompartmentMesh(anode) {
  var comp_geom = new THREE.Object3D();
  var comp_sphere = new THREE.Object3D();
  comp_geom.add(comp_sphere);
  anode.data.comp_geom = comp_geom;
  var w = world.broadphase.resolution.x * world.radius * 2;
  var h = world.broadphase.resolution.y * world.radius * 2;
  var d = world.broadphase.resolution.z * world.radius * 2;
  //    if (!ngl_marching_cube) ngl_marching_cube = new NGL.MarchingCubes(30, null, true, false);
  //    NGL_updateMetaBalls(anode);
  if (!anode.data.mc) anode.data.mc = new NGL.MarchingCubes(30, null, true, false);
  if (!("pos" in anode.data)||(anode.data.pos === null)||(anode.data.pos.length===0)) {
    anode.data.pos = [{"coords":[0.0,0.0,0.0]}];
    anode.data.radii=[{"radii":[500.0]}];
  }
  /* BUILD THE SPHERES */
  for (var s=0;s<anode.data.radii[0].radii.length;s++){
    //create one sphere per metaballs as well
    var aSphereMesh = new THREE.Mesh(new THREE.SphereBufferGeometry(1,16,16),
                                   new THREE.MeshPhongMaterial({ color: 0xffffff }));
    aSphereMesh.position.set(anode.data.pos[0].coords[s*3]*ascale,
                            anode.data.pos[0].coords[s*3+1]*ascale,
                            anode.data.pos[0].coords[s*3+2]*ascale);
    aSphereMesh.scale.set(anode.data.radii[0].radii[s]*ascale/2.0,
                          anode.data.radii[0].radii[s]*ascale/2.0,
                          anode.data.radii[0].radii[s]*ascale/2.0);
    aSphereMesh.name = anode.data.name+"_"+s;
    aSphereMesh.castShadow = true;
    aSphereMesh.receiveShadow = true;
    comp_sphere.add(aSphereMesh);
  }
  anode.data.mc.update(anode.data.pos[0].coords,anode.data.radii[0].radii,0.2,0.0);
  anode.data.mc.isolation = 0.0;
  //NGL_updateMetaBallsGeom(anode);
  var geo = anode.data.mc.generateGeometry();
  anode.data.geo = geo;
  /* BUILD THE BOX */
  var w = anode.data.mc.data_bound.maxsize*ascale;
  var boxGeom = new THREE.BoxGeometry( 1, 1, 1 );
  var wireframeMaterial = new THREE.MeshBasicMaterial({ wireframe: true });
  var mesh = new THREE.Mesh(boxGeom,wireframeMaterial);
  mesh.scale.x = anode.data.mc.data_bound.maxsize *ascale;//halfsize?
  mesh.scale.y = anode.data.mc.data_bound.maxsize *ascale;
  mesh.scale.z = anode.data.mc.data_bound.maxsize *ascale;
  mesh.position.x = (anode.data.mc.data_bound.min.x + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+w/2.0;//+w/2.0;//center of the box
  mesh.position.y = (anode.data.mc.data_bound.min.y + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+h/2.0;//+h/2.0;
  mesh.position.z = (anode.data.mc.data_bound.min.z + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+d/2.0;//+d/2.0;
  //comp_geom.add(mesh);
  /* BUILD THE MESH */
  //anode.data.vol = anode.data.mc.computeVolumeInside();
  var bufferGeometry = new THREE.BufferGeometry();
  bufferGeometry.dynamic = true;
  var positions = new Float32Array(geo.vertices);
  var normals = new Float32Array(geo.normals);
  bufferGeometry.addAttribute('position', new THREE.BufferAttribute(positions, 3).setDynamic( true ) );
  bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3).setDynamic( true ) );
  bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(geo.faces), 1).setDynamic( true ) );
  var wireframeMaterial = new THREE.MeshBasicMaterial({ wireframe: false });
  var compMesh = new THREE.Mesh(bufferGeometry, wireframeMaterial);//new THREE.MeshPhongMaterial({ color: 0xffffff }));
  compMesh.scale.x = anode.data.mc.data_bound.maxsize/2.0*ascale;//halfsize?
  compMesh.scale.y = anode.data.mc.data_bound.maxsize/2.0*ascale;
  compMesh.scale.z = anode.data.mc.data_bound.maxsize/2.0*ascale;
  compMesh.position.x = (anode.data.mc.data_bound.min.x + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+w/2.0;//+w/2.0;//center of the box
  compMesh.position.y = (anode.data.mc.data_bound.min.y + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+h/2.0;//+h/2.0;
  compMesh.position.z = (anode.data.mc.data_bound.min.z + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+d/2.0;//+d/2.0;
  compMesh.castShadow = true;
  compMesh.receiveShadow = true;
  scene.add(compMesh);
  //scene.add(comp_geom);
  return compMesh;
}

function distributesMesh(){
  var n = nodes.length;
  var start = 0;
  var total = 0;
  var count = 0;//total ?
  particle_id_Count = 0;
  //build the compartments
  //general_inertia_mass = GP_getInertiaOneSphere();
  for (var i=0;i<n;i++){//nodes.length
    if (!nodes[i].parent)
      {
        nodes[i].data.vol = ComputeVolume(nodes[i]);
        continue;
      }
    if ((nodes[i].children !== null) && (nodes[i].data.nodetype === "compartment")) {
        //use NGL to load the object?
        if (!("mc" in nodes[i].data)) nodes[i].data.mesh = GP_createOneCompartmentMesh(nodes[i]);
        else GP_updateMBCompartment(nodes[i]);
        //remove volume from parent volume
        nodes[i].parent.data.vol = nodes[i].parent.data.vol - nodes[i].data.vol;
        continue;
    };
  }

  //build master grid with everything? should align with gpu_grid
  GP_CombineGrid();
  initDebugGrid();
  for (var i=0;i<n;i++){//nodes.length
    console.log(i,nodes[i].data.name);
    if (nodes[i].data.ingtype == "fiber") continue;
    if (nodes[i].children!== null && nodes[i].parent === null) continue;
    if ((nodes[i].children !== null) && (nodes[i].data.nodetype === "compartment")) {
        //use NGL to load the object?
        //nodes[i].data.mesh = GP_createOneCompartmentMesh(nodes[i]);
        continue;
    };
    //if (!nodes[i].data.surface) continue;
    //if (nodes[i].parent.parent) continue;
    if (!nodes[i].data.radii) continue;
    //if (!nodes[i].data.surface) continue;
    var pdbname = nodes[i].data.source.pdb;
    if (pdbname.startsWith("EMD")
    || pdbname.startsWith("EMDB")
    || pdbname.slice(-4, pdbname.length) === ".map") {
      continue;
    }
    if (nodes[i].data.molarity && nodes[i].data.molarity !== 0) {
      //compute volume..?
      if (nodes[i].data.surface && nodes[i].parent.data.mesh) {
        //%surface ?
        var A = ComputeArea(nodes[i].parent);
        count = Math.round(nodes[i].data.molarity*A);
      }
      else {
        var V = nodes[i].parent.data.vol;// ComputeVolume(nodes[i].parent);
        count = Util_getCountFromMolarity(nodes[i].data.molarity, V);
      }
    }
    else if (nodes[i].data.count !== 0) count = nodes[i].data.count;
    else {
      //if (nodes[i].data.surface && nodes[i].parent.data.mesh)
      //     count = (Util_getRandomInt( nodes[i].parent.data.geo.faces.length/3 )+1)/10;
      //else
      count = Util_getRandomInt( copy_number )+1;//remove root
    }
    //count = Util_getRandomInt( copy_number )+1;//remove root
    console.log(i,nodes[i].data.name,nodes[i].parent.data.name,count);
    if (!nodes[i].data.surface && nodes[i].parent !== null && !nodes[i].parent.data.insides )
    {
       var anode = nodes[i];
       //this line is really slow with the outside compartments.
       //should just remove id from it ?
       anode.parent.data.insides = master_grid_id.reduce((a, e, i) => (e === anode.parent.data.compId) ? a.concat(i) : a, [])
       //anode.parent.data.insides = anode.parent.data.mc.field.reduce((a, e, i) => (e > 85 ) ? a.concat(i) : a, [])
       //count = nodes[i].parent.data.insides.length;
    }
    createInstancesMesh(i,nodes[i],start,count);
    start = start + count;
    total = total + count;
  }
  if (atomData_do) createCellVIEW();
  console.log ( "there is instances ",total);
  console.log ( "there is atoms ",num_beads_total);
  num_instances = total;
  world.particleCount = particle_id_Count;
  world.bodyCount = num_instances;
  console.log(type_meshs[instance_infos[0]]);

  var keys = Object.keys(type_meshs);
  var nMeshs = keys.length;
  var amesh;
  for (var i=0;i<nMeshs;i++) {
      if (i >= meshMeshs.length) {
        amesh = new THREE.Mesh( type_meshs[keys[i]], all_materials[current_material].m );
        amesh.frustumCulled = false; // Instances can't be culled like normal meshes
        // Create a depth material for rendering instances to shadow map
        amesh.customDepthMaterial = customDepthMaterial;
        amesh.castShadow = true;
        amesh.receiveShadow = true;
        meshMeshs.push(amesh);
        scene.add( amesh );
      }
      console.log("mesh builded",keys[i]);
  }

  GP_debugBeadsSpheres();
}

//when all atoms are loaded
function createCellVIEW(){
  //split in multiple calls ?
  //one call per object-> maybe faster and less data ?
  //var offsets = [];
  var instances = num_beads_total;
  //for ( var i = 0; i < instances; i ++ ) {
	//			// offsets
	//			offsets.push( Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 );
  //    }
  console.log(instances);
  var tri_mesh = BuildMeshTriangle(1.0);
  var geometry = new THREE.InstancedBufferGeometry();
	geometry.maxInstancedCount = instances; // set so its initalized for dat.GUI, will be set in first draw otherwise
	geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( tri_mesh.vertices, 3 ) );
	geometry.addAttribute( 'uv', new THREE.Float32BufferAttribute( new Float32Array( tri_mesh.uv ), 2 ) );
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(tri_mesh.triangles), 1));
  var instanceInfos = new THREE.InstancedBufferAttribute(
    new Float32Array( atomData_mapping_instance.slice(0,instances*2) ), 2, true, 1 );
  //aGeometry.addAttribute( 'bodyColor', bodyColors );
  geometry.addAttribute( 'instanceInfos', instanceInfos );
  geometry.boundingSphere = null;

  var phongShader = THREE.ShaderLib.phong;
  var uniforms = THREE.UniformsUtils.clone(phongShader.uniforms);
  uniforms.bodyQuatTex = { value: null };
  uniforms.bodyPosTex = { value: null };
  uniforms.atomPositionsTex = { value: atomData };
  uniforms.scale = {value : ascale};
  uniforms.cameraNear =   { value: camera.near };
  uniforms.cameraFar = { value: camera.far };
  //1024
  var tsize = 1024;
	cv_Material = new THREE.ShaderMaterial( {
		uniforms: uniforms,
		vertexShader: sharedShaderCode.innerText + document.getElementById( 'xvertexShader' ).textContent,
		fragmentShader: imposter_fragment,//document.getElementById( 'xfragmentShader' ).textContent,
		side: THREE.DoubleSide,
    lights: true,
    depthWrite: true,
    defines: {
        USE_MAP: true,
        DEPTH_PACKING: 3201,
        bodyTextureResolution: 'vec2(' + world.bodyTextureSize.toFixed(1) + ',' + world.bodyTextureSize.toFixed(1) + ')',
        resolution: 'vec2(' + world.particleTextureSize.toFixed(1) + ',' + world.particleTextureSize.toFixed(1) + ')',
        atomTextureResolution: 'vec2(' + tsize.toFixed(1) + ',' + tsize.toFixed(1) + ')',
    }
		//transparent: true
	} );
  cv_Material.extensions.fragDepth = true;
	cv_Mesh = new THREE.Mesh( geometry, cv_Material );
  cv_Mesh.frustumCulled = false;
	scene.add( cv_Mesh );
  scene.remove(cv_Mesh);
}

function updateOneMesh(meshGeometry,anode,start,count) {
    var color = [1,0,0];
    if (("color" in anode.data)&&(anode.data.color!==null)) color = anode.data.color;
    else {
      color = [Math.random(), Math.random(), Math.random()];;//(anode.data.surface) ? [1,0,0]:[0,1,0];//Math.random(), Math.random(), Math.random()];
      anode.data.color = [color[0],color[1],color[2]];
    }
    console.log(meshGeometry);
    meshGeometry.maxInstancedCount =  count;
    var bodyIndices = new THREE.InstancedBufferAttribute( new Float32Array( count * 1 ), 1, true, 1 );
    var bodyColors = new THREE.InstancedBufferAttribute( new Float32Array( count * 3 ), 3, true, 1  );
    for ( var i = 0, ul = bodyIndices.count; i < ul; i++ ) {
        bodyIndices.setX( i, start + i ); // one index per instance
        //bodyColors.setXYZ(i, i/bodyIndices.count,0,0);// color[0],color[1],color[2]);//rgb of the current anode
        bodyColors.setXYZ(i, color[0],color[1],color[2]);// color[0],color[1],color[2]);//rgb of the current anode
    }
    meshGeometry.attributes.bodyIndex.copy(bodyIndices);
    meshGeometry.attributes.bodyColor.copy(bodyColors);
    meshGeometry.attributes.bodyIndex.needsUpdate = true;
    meshGeometry.attributes.bodyColor.needsUpdate = true;
    console.log("ok update mesh instances");
}

function createOneMesh(anode,start,count) {
  var color = [1,0,0];
  if (("color" in anode.data)&&(anode.data.color!==null)) color = anode.data.color;
  else {
    color = [Math.random(), Math.random(), Math.random()];;//(anode.data.surface) ? [1,0,0]:[0,1,0];//Math.random(), Math.random(), Math.random()];
    anode.data.color = [color[0],color[1],color[2]];
  }
  var bufferGeometry = new THREE.BufferGeometry();
  var positions = new Float32Array(anode.data.geom.verts);
  var normals = new Float32Array(anode.data.geom.normals);
  bufferGeometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
  bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3));
  //bufferGeometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
  bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(anode.data.geom.faces), 1));
  bufferGeometry.scale(ascale,ascale,ascale);
  var numBodies = numParticles ;
  var bodyInstances = count ;
  var meshGeometry = new THREE.InstancedBufferGeometry();
  meshGeometry.maxInstancedCount = bodyInstances;
  for(var attributeName in bufferGeometry.attributes){
      meshGeometry.addAttribute( attributeName, bufferGeometry.attributes[attributeName].clone() );
  }
  meshGeometry.setIndex( bufferGeometry.index.clone() );
  var bodyIndices = new THREE.InstancedBufferAttribute( new Float32Array( bodyInstances * 1 ), 1, true, 1 ).setDynamic( true );
  var bodyColors = new THREE.InstancedBufferAttribute( new Float32Array( bodyInstances * 3 ), 3, true, 1  ).setDynamic( true );
  for ( var i = 0, ul = bodyIndices.count; i < ul; i++ ) {
      bodyIndices.setX( i, start + i ); // one index per instance
      //bodyColors.setXYZ(i, i/bodyIndices.count,0,0);// color[0],color[1],color[2]);//rgb of the current anode
      bodyColors.setXYZ(i, color[0],color[1],color[2]);// color[0],color[1],color[2]);//rgb of the current anode
  }
  meshGeometry.addAttribute( 'bodyColor', bodyColors );
  meshGeometry.addAttribute( 'bodyIndex', bodyIndices );
  meshGeometry.boundingSphere = null;

  return meshGeometry;
}

function LoadAllProteins(o){
    //current node has been done
    if (o!==null) {
      //gather atoms
      count = addAtoms(nodes[current_node_id],current_node_id,current_atom_start,o);
      instance_infosData.needsUpdate = true;
      var data = instance_infosData.image.data;
      var w = instance_infosData.image.width;
      var h = instance_infosData.image.height;
      var p = Util_idToDataIndex(current_node_id, w, h);
      data[p + 0] = current_atom_start;
      data[p + 1] = count;
      data[p + 2] = 0;
      data[p + 3] = 1;
      atomData_mapping[current_node_id] = {"start":current_atom_start,"count":count};
      current_atom_start = current_atom_start + count;
    }
    current_node_id++;
    if (current_node_id >= nodes.length) {
      atomData_done=true;
      distributesMesh();
      animate();
      return;
    }
    LoadProteinAtoms(nodes[current_node_id],current_node_id,LoadAllProteins)
}

function LoadProteinAtoms(anode,pid,callback){
  if (anode.children) return callback(null);
  var pdbname = anode.data.source.pdb;
  if (pdbname.startsWith("EMD")
  || pdbname.startsWith("EMDB")
  || pdbname.slice(-4, pdbname.length) === ".map") {
    return callback(null);
  }
  var nameurl = NGL_getUrlStructure(anode,anode.data.source.pdb);
  console.log("found "+nameurl);
  var params = {
    defaultRepresentation: true,
    name: anode.data.source.pdb
  };
  return stage.loadFile( nameurl, params ).then(callback);
}

function addAtoms(anode,pid,start,o){
  var center = NGL_GetGeometricCenter(o, new NGL.Selection("polymer and /0")).center;
  atomData.needsUpdate = true;
  var data = atomData.image.data;
  var w = atomData.image.width;
  var h = atomData.image.height;
  var p = Util_idToDataIndex(start, w, h);
  //how many atoms
  if (o===null) o = stage.getComponentsByName(anode.data.source.name).list[0];
  console.log("found ",o);
  //var dataset=[];
  var asele = "polymer and /0";
  var count = 0;
  o.structure.eachAtom(function(ap) {
      //dataset.push([ap.x, ap.y, ap.z]);
      data[p +count+ 0] = (ap.x-center.x)*ascale;
      data[p +count+ 1] = (ap.y-center.y)*ascale;
      data[p +count+ 2] = (ap.z-center.z)*ascale;
      data[p +count+ 3] = 1.8*ascale;//or type normalized ?
      count+=4;
  }, new NGL.Selection(asele));
  return count;
}


function GP_getInertiaOneSphere(x,y,z){
  var r = radius;
  var density = 500000;
  var mass = density * 4 * Math.PI * r * r * r / 3;
  var inertia = 2 * mass * r * r / 5;
  var inertia_mass = new THREE.Vector4(( inertia + mass * x * x ) * 2,
                                       ( inertia + mass * y * y ) * 2,
                                       ( inertia + mass * z * z ) * 2,
                                       mass);
  return inertia_mass;
}

function GP_getInertiaMassBeads(anode) {
  var inertia = new THREE.Vector3();
  var mass = 0;
  var nbeads = 0;
  if (anode.data.radii) {
    if (anode.data.radii && "radii" in anode.data.radii[0]) {
      nbeads = anode.data.radii[0].radii.length;
      for (var i=0;i<anode.data.radii[0].radii.length;i++){
        var x=anode.data.pos[0].coords[i*3]*ascale,
            y=anode.data.pos[0].coords[i*3+1]*ascale,
            z=anode.data.pos[0].coords[i*3+2]*ascale;
        var b_intertia = GP_getInertiaOneSphere(x,y,z);
        inertia.add(new THREE.Vector3(b_intertia.x,b_intertia.y,b_intertia.z));
        mass+=b_intertia.w;
      }
    }
    else
    {
      nbeads = anode.data.pos[0].length;
      for (var i=0;i< anode.data.pos[0].length;i++){
        var p = anode.data.pos[0][i];
        var b_intertia = GP_getInertiaOneSphere(p[0],p[1],p[2]);
        inertia.add(new THREE.Vector3(b_intertia.x,b_intertia.y,b_intertia.z));
        mass+=b_intertia.w;
      }
    }
  }
  return {"inertia":inertia,"mass":mass,"nbeads":nbeads};
}

function createInstancesMesh(pid,anode,start,count) {
  var w = world.broadphase.resolution.x * world.radius * 2;
  var h = world.broadphase.resolution.y * world.radius * 2;
  var d = world.broadphase.resolution.z * world.radius * 2;
  var up = new THREE.Vector3();
  var offset = new THREE.Vector3();
  if (anode.data.surface && anode.parent.data.mesh){
    offset.set(anode.data.offset[0]*ascale,anode.data.offset[1]*ascale,anode.data.offset[2]*ascale);
    up.set(anode.data.pcpalAxis[0],anode.data.pcpalAxis[1],anode.data.pcpalAxis[2]);
  }
  var inertia = new THREE.Vector3();
  var mass = 0;
  var nbeads = 0;
  if (!(pid in type_meshs) ){
    //number of beads
    var results = GP_getInertiaMassBeads(anode);
    nbeads = results.nbeads;
    inertia = results.inertia;
    mass = results.mass;
    if (!(pid in type_meshs)) type_meshs[pid] = createOneMesh(anode,start,count);
    //add bodyType firstaddBodyType
    anode.data.bodyid = world.bodyTypeCount;
    var s = (!anode.data.surface)? -anode.parent.data.compId:anode.parent.data.compId;//this should be the compartment compId /numcomp
    console.log("addbodytype",s,anode.data.name,count,nbeads,inertia,mass);
    world.addBodyType(count,nbeads, s, anode.data.size*ascale,
                      up.x, up.y, up.z,
                      offset.x, offset.y, offset.z,
                      mass, inertia.x, inertia.y, inertia.z);
  }
  else {
    var results = GP_getInertiaMassBeads(anode);
    nbeads = results.nbeads;
    inertia = results.inertia;
    mass = results.mass;
    var bodyTypeId = anode.data.bodyid;
    //world.setBodyType(bodyTypeId,count,nbeads, s, anode.data.size*ascale,
    //                  up.x, up.y, up.z,
    //                  offset.x, offset.y, offset.z,
    //                  mass, inertia.x, inertia.y, inertia.z);
    updateOneMesh(type_meshs[pid],anode,start,count);//should flag if mesh has changed
  }
  //position should use the halton sequence and the grid size
  //should do it constrained inside the given compartments
  //var comp = anode.parent;
  for (var bodyId=start;bodyId<start+count;bodyId++) {
    //if (loading_bar) loading_bar.set(bodyId/start+count);
    var x = -boxSize.x + 2*boxSize.x*Math.random();
    var y = ySpread*Math.random();
    var z = -boxSize.z + 2*boxSize.z*Math.random();
    x = -boxSize.x + Util_halton(bodyId,2)*w;
    y =  Util_halton(bodyId,3)*h;
    z = -boxSize.z + Util_halton(bodyId,5)*d;
    var q = new THREE.Quaternion();
    var axis = new THREE.Vector3(
        Math.random()-0.5,
        Math.random()-0.5,
        Math.random()-0.5
    );
    axis.normalize();
    q.setFromAxisAngle(axis, Math.random() * Math.PI * 2);
    //per compartments?

    if (anode.data.surface && anode.parent.data.mesh){
      //should random in random triangle ?
      //q should align the object to the surface, and pos should put on a vertices/faces
      var v = anode.parent.data.mesh.geometry.attributes.position.array;
      var n = anode.parent.data.mesh.geometry.attributes.normal.array;
      //pick a random one.
      var mscale = nodes[1].data.mesh.scale;
      var vi = Math.round(Util_halton(bodyId,2)*v.length/3);
      var ni = new THREE.Vector3( -n[vi*3],-n[vi*3+1],-n[vi*3+2]);
      var rotation1 = Util_computeOrientation(ni,up);
      //compare with .setFromUnitVectors ( vFrom : Vector3, vTo : Vector3 )
      var rotation = new THREE.Quaternion().setFromUnitVectors (up,ni);
      var rand_rot = new THREE.Quaternion();
      rand_rot.setFromAxisAngle(up, Math.random() * Math.PI * 2);
      var pos = new THREE.Vector3(v[vi*3]*mscale.x,
                                  v[vi*3+1]*mscale.y,
                                  v[vi*3+2]*mscale.z);
      pos.add(anode.parent.data.mesh.position);
      var roff = new THREE.Vector3(offset.x,offset.y,offset.z);
      roff.applyQuaternion( rotation );
      pos.add(roff);// = pos + QuaternionTransform(rotation,off) ;
      //rotation.multiply(rand_rot); // or premultiply
      x=pos.x;y=pos.y;z=pos.z;
      q.copy(rotation);
    }
    else if (anode.parent.data.insides && anode.parent.data.insides.length !==0 )
    {
      //morton?fully random?
      var h = Math.random() * anode.parent.data.insides.length;//Util_halton(bodyId,2)*anode.parent.data.insides.length+1;
      var qi = anode.parent.data.insides[Math.round(h)];//bodyId-start];//Math.round(h)];//master_grid_id[
      //qi to XYZ
      var xyz = GP_uToWorldCoordinate(qi);
      //jitter
      var jitter = [Math.random()*ascale,Math.random()*ascale,Math.random()*ascale]
      //var xyz = anode.parent.data.mc.getXYZ(qi);
      //var r = Util_getXYZ(qi,world.broadphase.resolution.x,ascale);
      x = xyz[0]*ascale+jitter[0]; y = xyz[1]*ascale+jitter[1]; z = xyz[2]*ascale+jitter[2];
    }

    //calculateBoxInertia(inertia, mass, new THREE.Vector3(radius*4,radius*4,radius*2));
    //calculate inertia from the beads

    mass = 1;
    calculateBoxInertia(inertia, mass, new THREE.Vector3(radius*2,radius*2,radius*2));
    if ( bodyId >= world.bodyCount ) {
      world.addBody(x,y,z, q.x, q.y, q.z, q.w,
                    mass, inertia.x, inertia.y, inertia.z,
                    anode.data.bodyid);
    }
    else {
      world.setBody(bodyId, x,y,z, q.x, q.y, q.z, q.w,
                    mass, inertia.x, inertia.y, inertia.z,
                    anode.data.bodyid);
    }
    //add the beads information
    if (anode.data.radii) {
      if (anode.data.radii && "radii" in anode.data.radii[0]) {
        for (var i=0;i<anode.data.radii[0].radii.length;i++){
            //transform beads
            var x=anode.data.pos[0].coords[i*3]*ascale,
                y=anode.data.pos[0].coords[i*3+1]*ascale,
                z=anode.data.pos[0].coords[i*3+2]*ascale;
            if ( particle_id_Count >= world.particleCount )
            {    world.addParticle(bodyId, x,y,z);}
            else
            {    world.setParticle(particle_id_Count,bodyId,x,y,z);}
            particle_id_Count++;
        }
      }
      else
      {
        for (var i=0;i< anode.data.pos[0].length;i++){
          var p = anode.data.pos[0][i];
          if ( particle_id_Count >= world.particleCount )
          {    world.addParticle(bodyId, p[0],p[1],p[2]);}
          else
          {    world.setParticle(particle_id_Count,bodyId,p[0],p[1],p[2]);}
          particle_id_Count++;
        }
      }
    }
    if (instance_infos.indexOf(pid) === -1) instance_infos.push(pid);
    if (atomData_do) {
      atomData_mapping[pid]["instances_start"]=start;
      atomData_mapping[pid]["instances_count"]=count;
      for (var j=0;j < atomData_mapping[pid].count ; j++){
            atomData_mapping_instance.push(bodyId,atomData_mapping[pid].start+j);
      }
      num_beads_total = num_beads_total + atomData_mapping[pid].count;
    }
  }
}

function createShaderMaterial( id, light, ambientLight ) {
  var shader = THREE.ShaderToon[ id ];
  var u = THREE.UniformsUtils.clone( shader.uniforms );
  var phongShader = THREE.ShaderLib.phong;
  var u2 = THREE.UniformsUtils.clone(phongShader.uniforms);
  var unif = THREE.UniformsUtils.merge([u,u2]);
  unif.bodyQuatTex = { value: world.dataTextures.bodyQuaternions };
  unif.bodyPosTex = { value: world.dataTextures.bodyPositions };
  unif.bodyInfosTex = { value: world.dataTextures.bodyInfos };
  var vs = sharedShaderCode.innerText + renderBodiesVertex.innerText;//shader.vertexShader;
  var fs = shader.fragmentShader;
  var material = new THREE.ShaderMaterial( {
    uniforms: unif,
    vertexShader: vs,
    fragmentShader: fs,
    lights: true,
    vertexColors: true,
    defines: {
          bodyInfosTextureResolution: 'vec2( ' + world.textures.bodyInfos.width.toFixed( 1 ) + ', ' + world.textures.bodyInfos.width.toFixed( 1 ) + " )",
          bodyTextureResolution: 'vec2(' + world.bodyTextureSize.toFixed(1) + ',' + world.bodyTextureSize.toFixed(1) + ')',
          resolution: 'vec2(' + world.particleTextureSize.toFixed(1) + ',' + world.particleTextureSize.toFixed(1) + ')'
      }} );
  material.uniforms.uDirLightPos.value = light.position;
  material.uniforms.uDirLightColor.value = light.color;
  material.uniforms.uAmbientLightColor.value = ambientLight.color;
  return material;
}

//https://repository.asu.edu/attachments/186203/content/Li_asu_0010N_16699.pdf
//https://github.com/RadiumP/WebAO
function setupSSAOPass(){
  composer = new THREE.EffectComposer( renderer );
  renderPass = new THREE.RenderPass( scene, camera );
  composer.addPass( renderPass );
  saoPass1 = new THREE.SAOPass( scene, camera, true, true );
  saoPass1.renderToScreen = true;
  saoPass1.params.output= 0;//THREE.SAOPass.OUTPUT.Beauty;
  saoPass1.params.saoBias= 1;
  saoPass1.params.saoIntensity= 0.02;
  saoPass1.params.saoScale= 2.3;
  saoPass1.params.saoKernelRadius= 9;//first pass, second should be 40
  saoPass1.params.saoMinResolution= 0;
  saoPass1.params.saoBlur= true;
  saoPass1.params.saoBlurRadius= 15;
  saoPass1.params.saoBlurStdDev= 1;
  saoPass1.params.saoBlurDepthCutoff= 0.001;
  composer.addPass( saoPass1 );
  /*
  saoPass2 = new THREE.SAOPass( scene, camera, true, true );
  saoPass2.renderToScreen = true;
  saoPass2.params.output= 0;
  saoPass2.params.saoBias= 1;
  saoPass2.params.saoIntensity= 0.02;
  saoPass2.params.saoScale= 3.5;
  saoPass2.params.saoKernelRadius= 61;//first pass, second should be 40
  saoPass2.params.saoMinResolution= 0;
  saoPass2.params.saoBlur= true;
  saoPass2.params.saoBlurRadius= 1;
  saoPass2.params.saoBlurStdDev= 1;
  saoPass2.params.saoBlurDepthCutoff= 0.01;
  composer.addPass( saoPass2 );
  */
}

function setupSSAOGui(agui){
  var gui = agui.addFolder( "SSAO1" );
  gui.add( saoPass1.params, 'output', {
  'Beauty': THREE.SAOPass.OUTPUT.Beauty,
  'Beauty+SAO': THREE.SAOPass.OUTPUT.Default,
  'SAO': THREE.SAOPass.OUTPUT.SAO,
  'Depth': THREE.SAOPass.OUTPUT.Depth,
  'Normal': THREE.SAOPass.OUTPUT.Normal} ).onChange( function ( value ) { saoPass1.params.output = parseInt( value ); } );
  gui.add( saoPass1.params, 'saoBias', - 1, 1 );
  gui.add( saoPass1.params, 'saoIntensity', 0, 1 );
  gui.add( saoPass1.params, 'saoScale', 0, 10 );
  gui.add( saoPass1.params, 'saoKernelRadius', 1, 100 );
  gui.add( saoPass1.params, 'saoMinResolution', 0, 1 );
  gui.add( saoPass1.params, 'saoBlur' );
  gui.add( saoPass1.params, 'saoBlurRadius', 0, 200 );
  gui.add( saoPass1.params, 'saoBlurStdDev', 0.5, 150 );
  gui.add( saoPass1.params, 'saoBlurDepthCutoff', 0.0, 0.1 );
  /*
  gui = agui.addFolder( "SSAO2" );
  gui.add( saoPass2.params, 'output', {
  'Beauty': THREE.SAOPass.OUTPUT.Beauty,
  'Beauty+SAO': THREE.SAOPass.OUTPUT.Default,
  'SAO': THREE.SAOPass.OUTPUT.SAO,
  'Depth': THREE.SAOPass.OUTPUT.Depth,
  'Normal': THREE.SAOPass.OUTPUT.Normal} ).onChange( function ( value ) { saoPass2.params.output = parseInt( value ); } );
  gui.add( saoPass2.params, 'saoBias', - 1, 1 );
  gui.add( saoPass2.params, 'saoIntensity', 0, 1 );
  gui.add( saoPass2.params, 'saoScale', 0, 10 );
  gui.add( saoPass2.params, 'saoKernelRadius', 1, 100 );
  gui.add( saoPass2.params, 'saoMinResolution', 0, 1 );
  gui.add( saoPass2.params, 'saoBlur' );
  gui.add( saoPass2.params, 'saoBlurRadius', 0, 200 );
  gui.add( saoPass2.params, 'saoBlurStdDev', 0.5, 150 );
  gui.add( saoPass2.params, 'saoBlurDepthCutoff', 0.0, 0.1 );
  */
}

function GP_initRenderer(){
  if (!stage) {
    stage = new NGL.Stage("container");
  }
  if (renderer) return;
  var container = document.getElementById( 'container' );
  container.setAttribute("class", "show");
  var dm = container.getBoundingClientRect();
  if (!DEBUGGPU){
    dm = {"width":window.innerWidth,"height":window.innerHeight};
  }
  else {
    if (dm.width === 0){
      var x = container.parentElement.parentElement.parentElement.style.width.split("px")[0];
      var y = container.parentElement.parentElement.parentElement.style.height.split("px")[0];
      dm.width = parseInt(x);
      dm.height = parseInt(y);
    }
  }
  console.log("renderer",dm);
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio( 1 );
  renderer.setSize( dm.width, dm.height );
  renderer.shadowMap.enabled = true;
  //container.setAttribute("class", "show");
  container.appendChild( renderer.domElement );
  window.addEventListener( 'resize', GP_onWindowResize, false );

  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '90%';
  container.appendChild( stats.domElement );

  scene = window.mainScene = new THREE.Scene();
  scene.background = new THREE.Color( 0x050505 );
  scene.fog = new THREE.Fog( 0x050505, 2000, 3500 );
  //renderer.setClearColor(0x050505, 1.0);
  //renderer.setClearColor(0xffffff, 1.0);//ambientLight.color,

  light = new THREE.DirectionalLight();
  light.castShadow = true;
  light.shadow.mapSize.width = light.shadow.mapSize.height = 1024;
  var d = 0.5;
  light.shadow.camera.left = - d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = - d;
  light.shadow.camera.far = 100;
  light.position.set(1,1,1);
  scene.add(light);

  ambientLight = new THREE.AmbientLight( 0xa6a4a4 );
  scene.add( ambientLight );
  //white ?

  camera = new THREE.PerspectiveCamera( 30, dm.width / dm.height, 0.01, 100 );
  camera.position.set(0,0.6,1.4);

  var groundMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x000000 } );
  groundMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2000, 2000 ), groundMaterial );
  groundMesh.rotation.x = - Math.PI / 2;
  groundMesh.receiveShadow = true;
  groundMesh.position.set(0.0,-0.5,0.0);
  scene.add( groundMesh );

  // Add controls
  controls = new THREE.OrbitControls( camera, renderer.domElement );
  controls.enableZoom = true;
  controls.target.set(0.0, 0.1, 0.0);
  //controls.maxPolarAngle = Math.PI * 0.5;

  //add raycaster and mouse
  if (!raycaster) raycaster = new THREE.Raycaster();
  if (!gp_mouse) gp_mouse = new THREE.Vector2();
}

function GP_initWorld(){
    //numParticles = nparticles ? nparticles : 64;
    //copy_number = ncopy ? ncopy : 10;
    //atomData_do = doatom ? doatom : false;
    var r = 30.0 ;// (radius in angstrom)
    var gridResolution = new THREE.Vector3();
    gridResolution.set(numParticles/2, numParticles/2, numParticles/2);
    var numBodies = 1024;//numParticles / 2;
    //radius = (1/numParticles * 0.5)*4.0;
    radius = r/(numParticles*r);
    ascale = radius/r;
    boxSize = new THREE.Vector3(0.5, 2, 0.5);//0.5,2,0.5
    // Physics
    world = window.world = new gp.World({
        maxSubSteps: 1, // TODO: fix
        gravity: new THREE.Vector3(0,0,0),
        renderer: renderer,
        maxBodyTypes:32*32,
        maxBodies: numBodies * numBodies,
        maxParticles: 1024 *  1024,
        radius: radius,
        stiffness: 1700,
        damping: 0,//6,
        fixedTimeStep: 0.001,//1/120,
        friction: 0,//2,
        drag: 0.3,
        boxSize: boxSize,
        gridPosition: new THREE.Vector3(-boxSize.x,-0.5,-boxSize.z),//-boxSize.x,-boxSize.y,-boxSize.z),(-0.5,0.0,-0.5)
        gridResolution: gridResolution
    });

    // Interaction sphere
    world.setSphereRadius(0, 0.25);
    world.setSpherePosition(0,-boxSize.x,-0.5,-boxSize.z);
}

function GP_debugBeadsSpheres(){
    //what if already exists...
    //if (debugMesh!==null) return;//need to update
    var tri_mesh = BuildMeshTriangle(1.0);
    //create the triangle Geometry
    var bufferGeometry = new THREE.BufferGeometry();
    var positions = new Float32Array(tri_mesh.vertices);
    bufferGeometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( tri_mesh.uv ), 2 ) );
    bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(tri_mesh.triangles), 1));

    var debugGeometry = new THREE.InstancedBufferGeometry();
    debugGeometry.maxInstancedCount = (world.particleCount !==0)? world.particleCount:world.maxParticles;
    for(var attributeName in bufferGeometry.attributes){
        debugGeometry.addAttribute( attributeName, bufferGeometry.attributes[attributeName].clone() );
    }
    debugGeometry.setIndex( bufferGeometry.index.clone() );

    var instanceInfos = new THREE.InstancedBufferAttribute( new Float32Array( debugGeometry.maxInstancedCount * 1 ), 1, true, 1 );
    //var instancepositions = new THREE.InstancedBufferAttribute( new Float32Array( debugGeometry.maxInstancedCount * 1 ), 1, true, 1 );
    for ( var i = 0, ul = instanceInfos.count; i < ul; i++ ) {
        instanceInfos.setX( i, i );

    }
    debugGeometry.addAttribute( 'instanceInfos', instanceInfos );
    debugGeometry.boundingSphere = null;

    var phongShader = THREE.ShaderLib.phong;
    var uniforms = THREE.UniformsUtils.clone(phongShader.uniforms);
    uniforms.particleWorldPosTex = { value: world.dataTextures.particleLocalPositions };
    uniforms.quatTex = { value: world.dataTextures.bodyQuaternions };
    uniforms.cameraNear =   { value: camera.near };
    uniforms.cameraFar = { value: camera.far };
    uniforms.radius = { value: world.radius };
    var debugMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: sharedShaderCode.innerText + imposter_vertex,
    		fragmentShader: imposter_fragment,
        side: THREE.DoubleSide,
        lights: true,
        depthWrite: true,
        transparent: false,
        defines: {
          //USE_MAP: true,
          DEPTH_PACKING: 3201,
          bodyTextureResolution: 'vec2(' + world.bodyTextureSize.toFixed(1) + ',' + world.bodyTextureSize.toFixed(1) + ')',
          resolution: 'vec2(' + world.particleTextureSize.toFixed(1) + ',' + world.particleTextureSize.toFixed(1) + ')'
      }
    });
    debugMaterial.extensions.fragDepth = true;

    debugMesh = new THREE.Mesh( debugGeometry, debugMaterial );
    //cv_Mesh.material.uniforms.atomPositionsTex.value = atomData;
    debugMesh.frustumCulled = false;
    //scene.add( debugMesh );
}

function init(){
  var container = document.getElementById('container');
  container.onmousemove = GP_onDocumentMouseMove;
  container.onmousedown = GP_onDocumentMouseDown;
  container.onkeydown = GP_onDocumentKeyDown;
    /*numParticles = query.n ? parseInt(query.n,10) : 64;
    copy_number = query.c ? parseInt(query.c,10) : 10;
    atomData_do = query.atom ? query.atom === 'true' : false;
    var gridResolution = new THREE.Vector3();
    switch(numParticles){
        default:
        case 64:
            numParticles = 64;
            gridResolution.set(numParticles/2, numParticles/8, numParticles/2);
            break;
        case 128:
            gridResolution.set(numParticles/2, numParticles/16, numParticles/2);
            break;
        case 256:
            gridResolution.set(numParticles/2, numParticles/32, numParticles/2);
            ySpread = 0.05;
            break;
        case 512:
            gridResolution.set(numParticles/2, numParticles/64, numParticles/2);
            ySpread = 0.01;
            break;
        case 1024:
            gridResolution.set(numParticles/2, numParticles/64, numParticles/2);
            ySpread = 0.001;
            break;
    }
    gridResolution.set(numParticles/2, numParticles/2, numParticles/2);
    var numBodies = numParticles / 2;
    radius = (1/numParticles * 0.5)*2.0;
    ascale = radius/20;
    boxSize = new THREE.Vector3(0.5, 2, 0.5);
    */
    GP_initRenderer();
    GP_initWorld();


    // Add bodies
    console.log("ingredients nodes type",nodes.length);
    //gather all atoms data

    //createCellVIEW();
    //LoadAllProteins(o);
    //createInstancesMesh(11,nodes[11],2,10);
    //createInstancesMesh(11,nodes[11],2,10);

    // Create an instanced mesh for debug spheres, should use the imposter quad.
    /*var sphereGeometry = new THREE.SphereBufferGeometry(world.radius, 8, 8);
    var instances = world.maxParticles;
    var debugGeometry = new THREE.InstancedBufferGeometry();
    debugGeometry.maxInstancedCount = instances;
    for(var attributeName in sphereGeometry.attributes){
        debugGeometry.addAttribute( attributeName, sphereGeometry.attributes[attributeName].clone() );
    }
    debugGeometry.setIndex( sphereGeometry.index.clone() );
    var particleIndices = new THREE.InstancedBufferAttribute( new Float32Array( instances * 1 ), 1,true,  1 );
    for ( var i = 0, ul = particleIndices.count; i < ul; i++ ) {
        particleIndices.setX( i, i );
    }
    debugGeometry.addAttribute( 'particleIndex', particleIndices );
    debugGeometry.boundingSphere = null;
    */

    var phongShader = THREE.ShaderLib.phong;
    // Particle spheres material / debug material - extend the phong shader in three.js
    /*var phongShader = THREE.ShaderLib.phong;
    var uniforms = THREE.UniformsUtils.clone(phongShader.uniforms);
    uniforms.particleWorldPosTex = { value: null };
    uniforms.quatTex = { value: null };
    var debugMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: sharedShaderCode.innerText + renderParticlesVertex.innerText,
        fragmentShader: phongShader.fragmentShader,
        lights: true,
        defines: {
            USE_MAP: true,
            bodyTextureResolution: 'vec2(' + world.bodyTextureSize.toFixed(1) + ',' + world.bodyTextureSize.toFixed(1) + ')',
            resolution: 'vec2(' + world.particleTextureSize.toFixed(1) + ',' + world.particleTextureSize.toFixed(1) + ')'
        }
    });
    debugMesh = new THREE.Mesh( debugGeometry, debugMaterial );
    debugMesh.frustumCulled = false;
    var checkerTexture = new THREE.DataTexture(new Uint8Array([255,0,0,255, 255,255,255,255]), 2, 1, THREE.RGBAFormat, THREE.UnsignedByteType, THREE.UVMapping);
    checkerTexture.needsUpdate = true;
    debugMaterial.uniforms.map.value = checkerTexture;
    */
    //GP_debugBeadsSpheres();
    //create the mesh
    var toonMaterial2 = createShaderMaterial( "toon2", light, ambientLight ),
			hatchingMaterial = createShaderMaterial( "hatching", light, ambientLight ),
			hatchingMaterial2 = createShaderMaterial( "hatching", light, ambientLight ),
			dottedMaterial = createShaderMaterial( "dotted", light, ambientLight ),
			dottedMaterial2 = createShaderMaterial( "dotted", light, ambientLight );
			hatchingMaterial2.uniforms.uBaseColor.value.setRGB( 0, 0, 0 );
			hatchingMaterial2.uniforms.uLineColor1.value.setHSL( 0, 0.8, 0.5 );
			hatchingMaterial2.uniforms.uLineColor2.value.setHSL( 0, 0.8, 0.5 );
			hatchingMaterial2.uniforms.uLineColor3.value.setHSL( 0, 0.8, 0.5 );
			hatchingMaterial2.uniforms.uLineColor4.value.setHSL( 0.1, 0.8, 0.5 );
			dottedMaterial2.uniforms.uBaseColor.value.setRGB( 0, 0, 0 );
			dottedMaterial2.uniforms.uLineColor1.value.setHSL( 0.05, 1.0, 0.5 );

      all_materials = {
			"toon2" :
			{
				m: toonMaterial2,
				h: 0.4, s: 1, l: 0.75
			},
			"hatching" :
			{
				m: hatchingMaterial,
				h: 0.2, s: 1, l: 0.9
			},
			"hatching2" :
			{
				m: hatchingMaterial2,
				h: 0.0, s: 0.8, l: 0.5
			},
			"dotted" :
			{
				m: dottedMaterial,
				h: 0.2, s: 1, l: 0.9
			},
			"dotted2" :
			{
				m: dottedMaterial2,
				h: 0.1, s: 1, l: 0.5
			}
			};
    // Mesh material - extend the phong shader
    var meshUniforms = THREE.UniformsUtils.clone(phongShader.uniforms);//phongShader.uniforms);
    meshUniforms.bodyQuatTex = { value: world.dataTextures.bodyQuaternions };
    meshUniforms.bodyPosTex = { value: world.dataTextures.bodyPositions };
    meshUniforms.bodyInfosTex = { value: world.dataTextures.bodyInfos };
    meshMaterial = new THREE.ShaderMaterial({
        uniforms: meshUniforms,
        vertexShader: sharedShaderCode.innerText + renderBodiesVertex.innerText,
        fragmentShader:phongShader.fragmentShader,//all_materials["dotted"].m.fragmentShader,//phongShader.fragmentShader,// fragmentShader.innerText,//phongFragmentShaderCode.innerText,//phongShader.fragmentShader,
        lights: true,
        vertexColors: true,
        defines: {
            bodyInfosTextureResolution: 'vec2( ' + world.textures.bodyInfos.width.toFixed( 1 ) + ', ' + world.textures.bodyInfos.width.toFixed( 1 ) + " )",
            bodyTextureResolution: 'vec2(' + world.bodyTextureSize.toFixed(1) + ',' + world.bodyTextureSize.toFixed(1) + ')',
            resolution: 'vec2(' + world.particleTextureSize.toFixed(1) + ',' + world.particleTextureSize.toFixed(1) + ')'
        }
    });
    all_materials["default"] = {m:meshMaterial,h: 0.1, s: 1, l: 0.5};
    current_material = "default";//"toon2";

    customDepthMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
            THREE.ShaderLib.depth.uniforms,
            meshUniforms
        ]),
        vertexShader: sharedShaderCode.innerText + renderBodiesDepth.innerText,
        fragmentShader: THREE.ShaderLib.depth.fragmentShader,
        defines: {
            DEPTH_PACKING: 3201,
            bodyTextureResolution: 'vec2(' + world.bodyTextureSize.toFixed(1) + ',' + world.bodyTextureSize.toFixed(1) + ')',
            resolution: 'vec2(' + world.particleTextureSize.toFixed(1) + ',' + world.particleTextureSize.toFixed(1) + ')'
        }
    });


    /*
    meshMesh2 = new THREE.Mesh( boxMeshGeometry, meshMaterial );
    meshMesh2.customDepthMaterial = meshMesh.customDepthMaterial;
    meshMesh2.frustumCulled = false; // Instances can't be culled like normal meshes
    meshMesh2.castShadow = true;
    meshMesh2.receiveShadow = true;
    scene.add( meshMesh2 );
    */
    // interaction
    interactionSphereMesh = new THREE.Mesh(new THREE.SphereBufferGeometry(1,16,16), new THREE.MeshPhongMaterial({ color: 0xffffff }));
    interactionSphereMesh.position.set(-boxSize.x,-0.5,-boxSize.z);
    scene.add(interactionSphereMesh);
    gizmo = new THREE.TransformControls( camera, renderer.domElement );
    gizmo.addEventListener( 'change', function(){
        if(this.object === interactionSphereMesh){
            world.setSpherePosition(
                0,
                interactionSphereMesh.position.x,
                interactionSphereMesh.position.y,
                interactionSphereMesh.position.z
            );
            var a = Debug_trilinearInterpolation(interactionSphereMesh.position);
            //console.log(a,a*1175.0*0.000390625);
        } else if(this.object === debugGridMesh){
            world.broadphase.position.copy(debugGridMesh.position);
            console.log(world.broadphase.position);
        }
        else if (this.object.ismb) {
            //update the metaball and the grid
            var mb_id = this.object.mb_id;
            nodes[this.object.comp_id].data.pos[0].coords[mb_id*3]=this.object.position.x/ascale;
            nodes[this.object.comp_id].data.pos[0].coords[mb_id*3+1]=this.object.position.y/ascale;
            nodes[this.object.comp_id].data.pos[0].coords[mb_id*3+2]=this.object.position.z/ascale;
            //need world position coordinate
            GP_updateMBCompartment(nodes[this.object.comp_id]);
            GP_CombineGrid();
        }
    });
    scene.add(gizmo);
    gizmo.attach(interactionSphereMesh);
    interactionSphereMesh.castShadow = true;
    interactionSphereMesh.receiveShadow = true;

    setupSSAOPass();
    initGUI();
    //controller.paused  = true;

    if (atomData_do) {
      var txtSize = 1024;//max size ?
      atomData = new THREE.DataTexture(
                      new Float32Array(4*txtSize*txtSize),
                      txtSize,
                      txtSize,
                      THREE.RGBAFormat,
                      THREE.FloatType );
      instance_infosData = new THREE.DataTexture(
                      new Float32Array(4*txtSize*txtSize),
                      txtSize,
                      txtSize,
                      THREE.RGBAFormat,
                      THREE.FloatType );
      LoadAllProteins(null);
    }
    else {
      distributesMesh();
      animate();
    }
}

function GP_onWindowResize() {
  var container = document.getElementById( 'container' );
  var dm = container.getBoundingClientRect();
  if (!DEBUGGPU){
    dm = {"width":window.innerWidth,"height":window.innerHeight};
  }
  else {
    if (dm.width === 0){
      var x = container.parentElement.parentElement.parentElement.style.width.split("px")[0];
      var y = container.parentElement.parentElement.parentElement.style.height.split("px")[0];
      dm.width = parseInt(x);
      dm.height = parseInt(y);
    }
  }
  camera.aspect = dm.width/dm.height;
  camera.updateProjectionMatrix();
  renderer.setSize( dm.width, dm.height );
}

function animate( time ) {
    /*if (!(loading_bar)) {
      loading_bar = document.getElementById('loading_bar').ldBar;
      if (loading_bar) loading_bar.set(0);
    }*/
    requestAnimationFrame( animate );
    updatePhysics( time );
    render();
    stats.update();
}
/*
        // Dynamic spawning
        var x = 0.1*Math.sin(9 * world.fixedTime) + Math.random()*0.05;
        var z = 0.1*Math.cos(10 * world.fixedTime) + Math.random()*0.05;
        var y = 0.3 + 0.05*Math.cos(11 * world.fixedTime);
        world.setBodyPositions([(prevSpawnedBody++) % world.maxBodies], [new THREE.Vector3(x,y,z)]);
*/
var prevTime, prevSpawnedBody=0;
function updatePhysics(time){
    var deltaTime = prevTime === undefined ? 0 : (time - prevTime) / 1000;
    if(!controller.paused){
        if( controller.interaction === 'none') {
            // Animate sphere
            var introSweepPos = Math.max(0, 1 - world.fixedTime);
            var x = 0.12*Math.sin(2 * 1.9 * world.fixedTime);
            var y = 0.05*(Math.cos(2 * 2 * world.fixedTime)+0.5) + introSweepPos;
            var z = 0.12*Math.cos(2 * 2.1 * world.fixedTime) + introSweepPos;
            //interactionSphereMesh.position.set( x, y, z );
            //world.setSpherePosition( 0, x, y, z );
        }

        world.step( deltaTime );
    }
    else {
      if(!rb_init) {
        //warm up
        for (var i=0;i<10;i++)
            world.step(0.01);
        rb_init = true;
      }
    }
    prevTime = time;
}

function drawBB(w,h,d,minx,miny,minz){
  var boxGeom = new THREE.BoxGeometry( w, h, d );
  var wireframeMaterial = new THREE.MeshBasicMaterial({ wireframe: true });
  var boxmesh = new THREE.Object3D();
  var mesh = new THREE.Mesh(boxGeom,wireframeMaterial);
  boxmesh.add(mesh);
  boxmesh.position.set(minx,miny,minz);
  //mesh.position.set(w/2, h/2, d/2);
  scene.add(boxmesh);
  return boxmesh;
}

function drawBBmarch(marching){
  var w = marching.data_bound.maxsize*ascale;
  var h = w;
  var d = w;
  var minx = marching.data_bound.min.x*ascale -boxSize.x;
  var miny = marching.data_bound.min.y*ascale +0.5;// -boxSize.x;
  var minz = marching.data_bound.min.z*ascale -boxSize.z;
  var boxGeom = new THREE.BoxGeometry( w, h, d );
  var wireframeMaterial = new THREE.MeshBasicMaterial({ wireframe: true });
  var boxmesh = new THREE.Object3D();
  var mesh = new THREE.Mesh(boxGeom,wireframeMaterial);
  boxmesh.add(mesh);
  //current min position is -w/2,-h/2,-d/2 compare with min?-0.15,
  boxmesh.position.set(minx,miny,minz);
  //mesh.position.set(w/2, h/2, d/2);
  scene.add(boxmesh);
  return boxmesh;
}

function GP_points(nparticles){
  var particles = nparticles;
  var geometry = new THREE.BufferGeometry();
  var positions = [];
  var colors = [];
  var color = new THREE.Color();
  var n = 1.0, n2 = n / 2; // particles spread in the cube
  for ( var i = 0; i < particles; i ++ ) {
    // positions
    var wxyz = GP_uToWorldCoordinate(i);
    var x = wxyz[0]*ascale;//Math.random() * n - n2;
    var y = wxyz[1]*ascale;//Math.random() * n - n2;
    var z = wxyz[2]*ascale;//Math.random() * n - n2;
    positions.push( x, y, z );
    // colors
    var v = master_grid_field[i*4+3];
    //map value v ?
    var vx = ( x / n ) + 0.5;
    var vy = ( y / n ) + 0.5;
    var vz = ( z / n ) + 0.5;
    color.setRGB( vx, vy, vz );
    colors.push( color.r, color.g, color.b );
  }
  geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
  geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
  geometry.computeBoundingSphere();
  var material = new THREE.PointsMaterial( { size: world.radius*2, vertexColors: THREE.VertexColors } );
  points = new THREE.Points( geometry, material );
  return points;
}

function initDebugGrid(){
  var w = world.broadphase.resolution.x * world.radius * 2;
  var h = world.broadphase.resolution.y * world.radius * 2;
  var d = world.broadphase.resolution.z * world.radius * 2;
  var boxGeom = new THREE.BoxGeometry( w, h, d );
  var wireframeMaterial = new THREE.MeshBasicMaterial({ wireframe: true });
  if (debugGridMesh!=null) return;
  debugGridMesh = new THREE.Object3D();
  var mesh = new THREE.Mesh(boxGeom,wireframeMaterial);
  mesh.position.sub(world.broadphase.position);
  debugGridMesh.add(mesh);
  //debugGridMesh.position.copy(world.broadphase.position);
  //mesh.position.set(w/2, h/2, d/2);
  gridPoints = GP_points(world.broadphase.resolution.x*world.broadphase.resolution.x*world.broadphase.resolution.x);
  gridPoints.position.sub(world.broadphase.position);
  debugGridMesh.add(gridPoints);

  //scene.add(debugGridMesh);
  /*
  var n = world.broadphase.resolution.x;

  var phongShader = THREE.ShaderLib.phong;
  var uniforms = THREE.UniformsUtils.clone(phongShader.uniforms);
  uniforms.size = {value:n};
	var aMaterial = new THREE.ShaderMaterial( {
		uniforms: uniforms,
		vertexShader: document.getElementById( 'gvs' ).textContent,
		fragmentShader: document.getElementById( 'gfs' ).textContent,
    blending:       THREE.AdditiveBlending,
    depthTest:      false,
    transparent:    true,
    vertexColors:   true
	} );

  var bg = new THREE.BufferGeometry();
  var indices = [];
  var positions = new Float32Array(n*n*n*3);
  for ( var i = 0; i < n*n*n; i ++ ) {
    indices.push(i);
  }
  bg.addAttribute('position',new THREE.Float32BufferAttribute( positions, 3 ))
  bg.addAttribute( 'uindex', new THREE.Float32BufferAttribute( indices, 1 ) );
  gridPoints = new THREE.Points( bg, aMaterial );
	//grid.position.copy(world.broadphase.position);
  //geometry.position.set(w/2, h/2, d/2);
  scene.add(gridPoints);
  */
}

function updateDebugGrid(){
  debugGridMesh.position.copy(world.broadphase.position);
}

function render() {
    controls.update();

    // Render main scene
    updateDebugGrid();

    all_materials[ current_material ].m.uniforms.bodyPosTex.value = world.bodyPositionTexture;
    all_materials[ current_material ].m.uniforms.bodyQuatTex.value = world.bodyQuaternionTexture;
    all_materials[ current_material ].m.uniforms.bodyInfosTex.value = world.textures.bodyInfos.texture;

    customDepthMaterial.uniforms.bodyPosTex.value = world.bodyPositionTexture;
    customDepthMaterial.uniforms.bodyQuatTex.value = world.bodyQuaternionTexture;
    if (cv_Material && atomData_do) {
      cv_Material.uniforms.bodyPosTex.value = world.bodyPositionTexture;
      cv_Material.uniforms.bodyQuatTex.value = world.bodyQuaternionTexture;
      //cv_Material.uniforms.atomPositionsTex.value = atomData;
    }
    //use local particle and instance at
    if (debugMesh) debugMesh.material.uniforms.particleWorldPosTex.value = world.particlePositionTexture;
    if (debugMesh) debugMesh.material.uniforms.quatTex.value = world.bodyQuaternionTexture;

    composer.render();
    //renderer.render( scene, camera );

    //debugMesh.material.uniforms.particleWorldPosTex.value = null;
    //debugMesh.material.uniforms.quatTex.value = null;
}

function calculateBoxInertia(out, mass, extents){
  var c = 1 / 12 * mass;
  out.set(
    c * ( 2 * extents.y * 2 * extents.y + 2 * extents.z * 2 * extents.z ),
    c * ( 2 * extents.x * 2 * extents.x + 2 * extents.z * 2 * extents.z ),
    c * ( 2 * extents.y * 2 * extents.y + 2 * extents.x * 2 * extents.x )
  );
}

function GP_guiChanged_cb() {}

function initGUI(){
  controller  = {
    moreObjects: function(){ location.href = "?n=" + (numParticles*2); },
    lessObjects: function(){ location.href = "?n=" + Math.max(2,numParticles/2); },
    paused: true,
    renderAtoms: false,
    renderParticles: false,
    renderMeshs: true,
    renderShadows: true,
    renderSMB: false,
    renderIsoMB: true,
    gravity: world.gravity.y,
    interaction: 'none',
    sphereRadius: world.getSphereRadius(0),
    material: "shiny"
  };
  var createHandler = function( id ) {
    return function() {
      var mat_old = all_materials[ current_material ];
      current_material = id;
      var mat = all_materials[ id ];
      var keys = Object.keys(type_meshs);
      var nMeshs = keys.length;
      for (var i=0;i<nMeshs;i++) {
        meshMeshs[i].material = mat.m;
      }
    };
  };
  function guiChanged() {
    world.gravity.y = controller.gravity;
    if (atomData_do) {
      if (controller.renderAtoms) {
        scene.add(cv_Mesh);
      }else {
        scene.remove(cv_Mesh);
      }
    }
    if(controller.renderParticles){
      scene.add(debugMesh);
    }
    else {
      scene.remove(debugMesh);
    }
    if(controller.renderMeshs)  {
      var nMeshs = Object.keys(type_meshs).length;
      for (var i=0;i<nMeshs;i++) {
        scene.add(meshMeshs[i]);
      }
    }else {
      var nMeshs = Object.keys(type_meshs).length;
      for (var i=0;i<nMeshs;i++) {
        scene.remove(meshMeshs[i]);
      }
    }
    for (var i=0;i<nodes.length;i++){//nodes.length
      if (!nodes[i].parent)
        {
          continue;
        }
      if ((nodes[i].children !== null) && (nodes[i].data.nodetype === "compartment")) {
          //use NGL to load the object?
          if (controller.renderSMB) scene.add(nodes[i].data.comp_geom);
          else scene.remove(nodes[i].data.comp_geom);
          if (controller.renderIsoMB) scene.add(nodes[i].data.mesh);
          else scene.remove(nodes[i].data.mesh);
      };
    }
    // Shadow rendering
    renderer.shadowMap.autoUpdate = controller.renderShadows;
    if(!controller.renderShadows){
      renderer.clearTarget(light.shadow.map);
    }

    // Interaction
    gizmo.detach(gizmo.object);
    scene.remove(debugGridMesh);
    switch(controller.interaction){
      case 'sphere':
        gizmo.attach(interactionSphereMesh);
        break;
      case 'broadphase':
        scene.add(debugGridMesh);
        gizmo.attach(debugGridMesh);
        break;
    }
    var r = controller.sphereRadius;
    interactionSphereMesh.scale.set(r,r,r);
    world.setSphereRadius(0,r);
  }
  var customContainer = document.getElementById( 'gui-container' );
  GP_guiChanged_cb = guiChanged;
  gui = new dat.GUI({ autoPlace: (customContainer===null) });
  var gh = gui.addFolder( "GPhysics" );

  gh.add( world, "stiffness", 0, 5000, 0.1 );
  gh.add( world, "damping", 0, 100, 0.1 );
  gh.add( world, "drag", 0, 1, 0.01 );
  gh.add( world, "friction", 0, 10, 0.001 );
  gh.add( world, "fixedTimeStep", 0, 0.1, 0.001 );
  gh.add( controller, "paused" ).onChange( guiChanged );
  gh.add( controller, "gravity", -2, 2, 0.1 ).onChange( guiChanged );
  gh.add( controller, "moreObjects" );
  gh.add( controller, "lessObjects" );
  gh.add( controller, "renderParticles" ).onChange( guiChanged );
  gh.add( controller, "renderMeshs" ).onChange( guiChanged );
  if (atomData_do) gh.add( controller, "renderAtoms" ).onChange( guiChanged );
  gh.add( controller, "renderShadows" ).onChange( guiChanged );
  gh.add( controller, "renderSMB" ).onChange( guiChanged );
  gh.add( controller, "renderIsoMB" ).onChange( guiChanged );
  gh.add( controller, 'interaction', [ 'none', 'sphere', 'broadphase' ] ).onChange( guiChanged );
  gh.add( controller, 'sphereRadius', boxSize.x/100, boxSize.x/10 ).onChange( guiChanged );

  var h = gui.addFolder( "Materials" );
	for ( var m in all_materials ) {
		controller[ m ] = createHandler( m );
		h.add( controller, m ).name( m );
	}

  setupSSAOGui(gui);
  if (customContainer) customContainer.appendChild(gui.domElement);
  //.main { position: absolute; top: 100px; left: 100px; }
  guiChanged();

  //var raycaster = new THREE.Raycaster();
  //var mouse = new THREE.Vector2();
  /*document.addEventListener('click', function( event ) {
      mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
      mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
      raycaster.setFromCamera( mouse, camera );
      var intersects = raycaster.intersectObjects( [interactionSphereMesh] );
      if ( intersects.length > 0 ) {
          controller.interaction = 'sphere';
          gui.updateDisplay();
          guiChanged();
      }
  });*/
}

function parseParams(){
  return location.search
    .substr(1)
    .split("&")
    .map(function(pair){
      var a = pair.split("=");
      var o = {};
      o[a[0]] = a[1];
      return o;
    })
    .reduce(function(a,b){
      for(var key in b) a[key] = b[key];
      return a;
    });
}

function initialLoad(){
   query = parseParams();
   var scene = query.scene ? parseInt(query.scene,10) : 0;
   switch(scene){
       default:
          loadSimpleExample();
          break;
       case 0:
          loadSimpleExample();
          break;
       //case 1:
          //loadExampleHIVimmature();
      //    break;
       case 1:
          loadExampleBlood();
          break;
       case 2:
          loadExampleHIV();
          break;
       //case 3:
        //  LoadExampleMpn()
        //  break;
        }
}

function loadSerialized(url){
  if (stage)stage.removeAllComponents();
  console.log(url);
  d3v4.json(url, function (error,json) {
          var adata = parseCellPackRecipeSerialized(json)
          GP_initFromData(adata);
          })
}

function loadLegacy(url){
  if (stage)stage.removeAllComponents();
  console.log(url);
  d3v4.json(url, function (json) {
          var adata = parseCellPackRecipe(json)
          console.log(adata);
          GP_initFromData(adata);
          })
}

function GP_initFromData(data){
  query = parseParams();
  console.log(data);
  root = d3v4.hierarchy(data.nodes)
    .sum(function(d) { return d.size; })
    .sort(function(a, b) { return b.value - a.value; });
  nodes = pack(root).descendants();//flatten--error ?
  console.log(nodes);
  numParticles = query.n ? parseInt(query.n,10) : 64;
  copy_number = query.c ? parseInt(query.c,10) : 10;
  atomData_do = query.atom ? query.atom === 'true' : false;
  init();
}

function GP_initFromNodes(some_nodes,numpart,copy,doatom){
  if (inited) {
    rb_init = false;
    world.resetData();
    world.time = 0;//force the flush
    //reset the dataTexture

    //everything already initialize. just update.
    distributesMesh();
    animate();

    //world.bodyCount = num_instances;
    //world.particleCount = particle_id_Count;

    //need update instead.
    //or should the update automatic?
    //for now try to clean everything ?
    return;
  }
  nodes = some_nodes;//flatten--error ?
  console.log(nodes);
  numParticles = numpart;
  copy_number = copy;
  atomData_do = doatom;
  init();
  inited = true;
}

//(function(){
function LoadExampleMpn(){
    var url = "data/Mpn_1.0_2.json";
    loadLegacy(url);
	}

function loadExampleBlood(){
  var url = "data/BloodPlasmaHIV_serialized.json";//cellpack_repo+"recipes/BloodPlasmaHIV_serialized.json";//"https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/recipes/BloodPlasmaHIV_serialized.json";
  loadSerialized(url);
}

function loadExampleHIV(){
  var url = "data/hivfull_serialized.json";//cellpack_repo+"recipes/BloodPlasmaHIV_serialized.json";//"https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/recipes/BloodPlasmaHIV_serialized.json";
  loadSerialized(url);
}

function loadExampleHIVimmature(){
  var url = "data/HIVimmature.json";//cellpack_repo+"recipes/BloodPlasmaHIV_serialized.json";//"https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/recipes/BloodPlasmaHIV_serialized.json";
  loadLegacy(url);
}

function loadSimpleExample(){
  var url = "data/myrecipe_serialized.json";//cellpack_repo+"recipes/BloodPlasmaHIV_serialized.json";//"https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/recipes/BloodPlasmaHIV_serialized.json";
  loadSerialized(url);
}

function GP_selectFile(e){
    var e = document.getElementById("gjsfile_input");
		var theFiles = e.files;
    var thefile = theFiles[0];
    if (window.FileReader) {
      // FileReader is supported.
    } else {
      alert('FileReader is not supported in this browser.');
    }
    //check extension
    var ext = thefile.name.split('.').pop();
    //alert(thefile.name+" "+ext);
    var reader = new FileReader();
    if (ext === "json"){
    	  //alert("json");
    	  //console.log("json file");
    	  var comon = Util_findLongestCommonSubstring(thefile.name,"serialized");
    	  //console.log("serialzized ?",comon);
    	  if (comon.length >= 9) {//full string found
    	  	//console.log("serialized recipe type",thefile.name,comon);
    	  	//read and pasrse
    	  	reader.onload = function(event) {
  	        var data = reader.result;
  	        data = data.replace(/\\n\\r/gm,'newChar');
  	        	//alert(data);
  	        var ad = JSON.parse(data);
  	        //console.log(ad);
  	        //alert(JSON.stringify(ad));
  	        var adata = parseCellPackRecipeSerialized(ad);
            GP_initFromData(adata);
     	      }
    	  }
    	  else {
	    	  reader.onload = function(event) {
  	        var data = reader.result;
  	        data = data.replace(/\\n\\r/gm,'newChar');
  	        //alert(data);
  	        var ad = JSON.parse(data);
  	        //alert(JSON.stringify(ad));
  	        var adata = parseCellPackRecipe(ad)
  	        GP_initFromData(adata);
     	    }
  	    }
     }
     reader.readAsText(thefile, 'UTF-8');
	}

function GP_onDocumentKeyDown(event) {
    var keyCode = event.which;
    //p
    if (keyCode == 80){
      controller.paused=!controller.paused;
    }
};

function GP_onDocumentMouseMove( event ) {
    //mouse move
    if (!gp_mouse) gp_mouse = new THREE.Vector2();
    //event.preventDefault();
    gp_mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    gp_mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  }

function GP_onDocumentMouseDown( event ) {
    //event.preventDefault();
    var container = document.getElementById('container');
    var rect = container.getBoundingClientRect();
    if (!nodes || nodes.length === 0 ) return;
    console.log(event.clientX,rect.width,( (event.clientX - rect.left) / rect.width ),( (event.clientX - rect.left) / rect.width ) * 2 - 1);
    console.log(event.clientY,rect.height,( (event.clientY - rect.top) / rect.height ),(-(event.clientY - rect.top) / rect.height ) * 2 + 1);
    gp_mouse.x = ( (event.clientX - rect.left) / rect.width ) * 2 - 1;
    gp_mouse.y = ( -(event.clientY - rect.top) / rect.height ) * 2 + 1;
    //coords — 2D coordinates of the mouse, in normalized device coordinates (NDC)---X and Y components should be between -1 and 1.
    if (!raycaster) raycaster = new THREE.Raycaster();
    raycaster.setFromCamera( gp_mouse, camera );
    var intersects;// = ray.intersectObjects( objects );
    var found=-1;
    for (var i=0;i<nodes.length;i++){//nodes.length
      if (!nodes[i].parent)
        {
          continue;
        }
      if ((nodes[i].children !== null) && (nodes[i].data.nodetype === "compartment")) {
          //use NGL to load the object?
          if (controller && controller.renderSMB)
          {
            intersects = raycaster.intersectObjects( nodes[i].data.comp_geom.children[0].children );
            if ( intersects.length > 0 ) {
              found = i;
              break;
            }
          }
      }
    }
    console.log("found ",found,intersects);
    if (found !==-1) {
      var mb_id = parseInt(intersects[0].object.name.split("_")[1]);
      //attach gizmo to it
      intersects[0].object.ismb = true;//is metaball
      intersects[0].object.mb_id = mb_id;//ball id
      intersects[0].object.comp_id = found;//node id
      gizmo.attach(intersects[0].object);
    }
    else
    {
      if (interactionSphereMesh) {
        intersects = raycaster.intersectObjects( [interactionSphereMesh] );
        if ( intersects.length > 0 ) {
          controller.interaction = 'sphere';
          gui.updateDisplay();
          GP_guiChanged_cb();
        }
      }
    }
		//if ( intersects.length > 0 ) {
	//		intersects[ 0 ].object.material.color.setHex( Math.random() * 0xffffff );
	//		var particle = new THREE.Particle( particleMaterial );
	//		particle.position = intersects[ 0 ].point;
	//		particle.scale.x = particle.scale.y = 8;
	//		scene.add( particle );
	//	}
}
//document.addEventListener( 'mousedown', GP_onDocumentMouseDown, false );
//document.addEventListener( 'mousemove', GP_onDocumentMouseMove, false );
//document.addEventListener( "keydown", GP_onDocumentKeyDown, false);

//function(e) {
//    var x = e.pageX - this.offsetLeft;
//    var y = e.pageY - this.offsetTop;
//}

/*(function() {
   // your page initialization code here
   // the DOM will be available here
   initialLoad();
})();
*/
//init();
//animate();
