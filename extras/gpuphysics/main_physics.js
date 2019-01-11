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
var gridcolor = 0;
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
var hemiLight;
var hemiLightHelper;
var dirLight;
var dirLightHeper;
var effect;
var amesh;
var clipPlane;
var clipPlanesHelper;
var clipPlanes;
var debugMesh, debugGridMesh, cv_Mesh;
var gridPoints;
var compartments_count = 0;

var controller;
var boxSize;
var numParticles;
var radius;
var triplanarMaterial;
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
var gridSprite;

var raycaster;
var gp_mouse = THREE.Vector2(0,0);
var gp_updateGrid = false;

var general_inertia_mass;

/*display shader*/
var imposter_vertex="precision highp float;\n\
  uniform sampler2D particleWorldPosTex;\n\
  uniform sampler2D bodyPosTex;\n\
  uniform sampler2D bodyInfosTex;\n\
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
    vec4 bodyPos = texture2D(bodyPosTex, bodyUV);\n\
    float bodyTypeIndex = bodyPos.w;\n\
    vec2 bodyType_uv = indexToUV( bodyTypeIndex, bodyInfosTextureResolution );\n\
    vec4 bodyType_infos1 = texture2D(bodyInfosTex, bodyType_uv);\n\
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
    if (bodyType_infos1.w > 0.0) vColor = vec4(0.0,1.0,0.0,1.0);\n\
    if (bodyType_infos1.w < 0.0) vColor = vec4(0.0,0.0,1.0,1.0);\n\
    if (bodyType_infos1.w == 0.0) vColor = vec4(1.0,0.0,0.0,1.0);\n\
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
  uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];\n\
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
    vec3 vViewPosition = -(modelView * vec4(cameraPos, 1.0)).xyz;\n\
    #include <clipping_planes_fragment>\n\
    //vec3 normal = normalize(vec3(vUv, sqrt(1.0 - lensqr)));\n\
    //vec3 cameraPos = (normal * vRadius) + vPosition;\n\
    vec4 clipPos = projectionMatrix * modelView * vec4(cameraPos, 1.0);\n\
    float ndcDepth = clipPos.z / clipPos.w;\n\
    float gldepth = ((gl_DepthRange.diff * ndcDepth) +\n\
          gl_DepthRange.near + gl_DepthRange.far) / 2.0;\n\
    gl_FragDepthEXT = gldepth;\n\
  	gl_FragColor = vec4(normal*vColor.rgb,1.0);//0.78,0.78,0.78,1.0);\n\
  }\n";


//render the trilinear interpolation instead ?
//and the normal ?
var points_vertex=" uniform float psize;\n\
 uniform sampler2D gridIdTex;\n\
 uniform vec3 cellSize;\n\
 uniform vec3 gridPos;\n\
 uniform int colorMode;\n\
 uniform float gridSize;\n\
 attribute float indices;\n\
 varying vec3 vColor;\n\
 varying vec3 vViewPosition;\n"+
 //THREE.densityShader +
 " vec3 getIJK(float index, float size){\n\
   float sliceNum = size*size;\n\
   float z = index / sliceNum;\n\
   float temp = mod(index,sliceNum);//index % (sliceNum);\n\
   float y = temp / size;\n\
   float x = mod(temp,size);//temp % size;\n\
   return vec3(floor(x), floor(y), floor(z));\n\
   }\n\
 vec2 indexToUV(float index, vec2 res){\n\
     vec2 uv = vec2(mod(index/res.x,1.0), floor( index/res.y ) / res.x);\n\
     return uv;\n\
 }\n\
 void main(){\n\
    vec3 transformed = vec3( position );\n\
    vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );\n\
    vec2 pointUV = indexToUV(indices, gridIdTextureSize);\n\
    vec4 grid_infos = texture2D( gridIdTex, pointUV );\n\
    vec3 ijk = getIJK(indices, gridSize);\n\
		//vec3 p = (point - gridPos)*gridResolution.x;\n\
		//world position \n\
		vec3 pos = ijk/gridSize + gridPos.xyz;//normalize between 0 and 1 ?\n\
    vec3 sfnormal = vec3(0.0,0.0,0.0);//normalize(CalculateSurfaceNormal(pos));\n\
    float distance = 0.0;//trilinearInterpolation(pos);\n\
    vColor = vec3(0.0,0.0,0.0);\n\
    float cid = grid_infos.x;\n\
    if (colorMode==0) {\n\
      if (cid > 1.0) vColor = vec3(0.0,1.0-grid_infos.y,0.0);\n\
      else if (cid > 0.0) vColor = vec3(1.0-grid_infos.y,0.0,0.0);\n\
      else if (cid == 0.0) vColor = vec3(0.0,0.0,1.0-grid_infos.y);\n\
      else if (cid < 0.0) vColor = vec3(1.0,1.0,0.0);\n\
      else vColor = vec3(1.0,0.0,1.0);\n\
    }\n\
    else if (colorMode ==1){\n\
      vColor = vec3(distance,0.0,0.0);\n\
    }\n\
    else if (colorMode ==3){\n\
      vColor = vec3(sfnormal.xyz);\n\
    }\n\
    //if (grid_infos.y <= -1.0) vColor = vec3(0.0,1.0-grid_infos.y,0.0);\n\
    //else if (grid_infos.y <= 0.0) vColor = vec3(1.0-grid_infos.y,0.0,0.0);\n\
    //else vColor = vec3(0.0,0.0,grid_infos.y);\n\
    gl_PointSize = 20.0;\n\
    vViewPosition = - mvPosition.xyz;\n\
    gl_Position = projectionMatrix * mvPosition;\n\
}";


var points_fragment="#include <common>\n\
 varying vec3 vColor;\n\
 varying vec3 vViewPosition;\n\
 uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];\n\
 void main(){\n\
   #include <clipping_planes_fragment>\n\
   gl_FragColor = vec4(vColor,1);//outgoingLight, diffuseColor.a );\n\
}";
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

function Debug_CalculateSurfaceNormal(p,H){
	//var H = world.radius/8.0; //1.0f/grid_unit;\n\
  var x = new THREE.Vector3( H, 0.0, 0.0 );
  var y = new THREE.Vector3( 0.0, H, 0.0 );
  var z = new THREE.Vector3( 0.0, 0.0, H );
	var dx = Debug_trilinearInterpolation(new THREE.Vector3( ).copy(p).add(x)) - Debug_trilinearInterpolation(new THREE.Vector3( ).copy(p).sub(x));
	var dy = Debug_trilinearInterpolation(new THREE.Vector3( ).copy(p).add(y)) - Debug_trilinearInterpolation(new THREE.Vector3( ).copy(p).sub(y));
	var dz = Debug_trilinearInterpolation(new THREE.Vector3( ).copy(p).add(z)) - Debug_trilinearInterpolation(new THREE.Vector3( ).copy(p).sub(z));
  var dxyz = new THREE.Vector3(dx, dy, dz);
  dxyz.normalize();
  return dxyz;
}

function GP_ComputeVolume(nvoxels){
  var gridStepSize = world.radius;//*2;
  var unit = gridStepSize * (1.0 / ascale);
  var volume_one_voxel = unit * unit * unit;
  return nvoxels * volume_one_voxel;
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
    var m = anode.data.geo;
    var inv_scale = anode.data.mc.data_bound.maxsize;//1.0/ascale;
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

function GP_fOpUnionRound( a,  b,  r) {
  var u = new THREE.Vector2(0);
  u.max(new THREE.Vector2(r - a,r - b));
  return Math.max(r, Math.min (a, b)) - u.length();
}
function GP_fOpIntersectionRound( a,  b,  r) {
  var u = new THREE.Vector2(0);
  u.max(new THREE.Vector2(r + a,r + b));
  return Math.min(-r, Math.max (a, b)) + u.length();
}
function GP_fOpDifferenceRound ( a,  b,  r) {
  return GP_fOpIntersectionRound(a, -b, r);
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
  var round_r = 0.3;//*ascale;
  var indices = [];
  for ( var i = 0; i < n*n*n; i ++ ) {
    indices.push(i);
    master_grid_id[i] = 0.0;//root
    master_grid_field[i*4+3] = 10.0;
  }
  nodes[0].data.insides = indices;
  for (var i=0;i<nodes.length;i++){//nodes.length
    if (!nodes[i].parent)
    {
        nodes[i].data.compId=counter;
        nodes[i].data.sign = 1;
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
        nodes[i].data.insides = [];
        nodes[i].data.compId=counter;
        nodes[i].data.sign = nodes[i].parent.data.sign * -1;
        counter+=1;
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
                    var e = nodes[i].data.mc.field[q]*nodes[i].data.mc.data_bound.maxsize*ascale;//does e need scaling ?
                    //if ( e  >= nodes[i].data.mc.isolation) {//-1 && e < nodes[i].data.mc.isolation+1){
                    //inside is negative
                    //current compId is
                    var compIdx = master_grid_id[u];
                    var compId = Math.floor(compIdx);
                    var lvl = (compIdx - compId)*10.0;
                    var ce = master_grid_field[u*4+3];
                    //var cee = (e < 0)?e - (nodes[i].data.compId-1):e + (nodes[i].data.compId-1);
                    //if (compId === 0) {
                    if (compId === 0 ) {
                      if (ce === 10.0) master_grid_field[u*4+3] = e;
                      else master_grid_field[u*4+3] = Math.min(e,ce);//GP_fOpUnionRound( ce,  e,  round_r);
                    }
                    else if (lvl === nodes[i].depth){
                      //Union
                      //console.log("Union",compIdx,compId,lvl,i,u,ce,e);
                      master_grid_field[u*4+3] = Math.min (ce, e);//GP_fOpUnionRound( ce,  e,  round_r);//Math.min (ce, e);//GP_fOpUnionRound( ce,  e,  round_r);
                    }
                    else {
                      //0.0004666440363507718 0.054253473839101694
                      //Diff 0 2 112347 0.1758081018924713 0.06645351337889831
                      // 1 1.000000238418579 2
                      //console.log("Diff",compIdx,compId,lvl,i,u,ce,e);
                      master_grid_field[u*4+3] = max(-e,ce);//GP_fOpDifferenceRound( ce,  e,  round_r);//Math.max (-e, ce);//
                    }
                    var test = (e < nodes[i].data.mc.isolation && Math.abs(e) < Math.abs(ce));
                    if ( e < nodes[i].data.mc.isolation && nodes[i].data.compId > compId) {//-1 && e < nodes[i].data.mc.isolation+1){
                      master_grid_id[u] = nodes[i].data.compId + nodes[i].depth/10.0;
                      //console.log("Inside",master_grid_id[u],nodes[i].data.compId,nodes[i].depth,
                      //            " compIdx ",compIdx,compId,lvl,u,ce,e,
                      //            master_grid_field[u*4+3]);
                      nodes[i].data.insides.push(u);
                      //console.log("inside");
                      //indices.splice(u,1);
                      nodes[i].parent.data.insides.splice(u,1);
                      //we are inside
                      //e = e * nodes[i].parent.data.sign;
                      //master_grid_field[u*4+3] = e;
                      //master_grid_field[u*4+2] = -1;
                    }
                    //else {
                      //e = e * nodes[i].parent.data.sign;
                      //min-max ? or R-function ?
                      //var me = Math.min(Math.abs(e),Math.abs(ce));
                      //var newd = ce + e - Math.sqrt(ce*ce+e*e)
                      //master_grid_field[u*4+3] = (Math.abs(e)<Math.abs(ce) && ce < 0.0 )? -me : me;
                      //master_grid_field[u*4+3] = e;
                      //master_grid_field[u*4+2] = nodes[i].parent.data.sign;
                    //}
                    /*}
                    else if (compId !== nodes[i].data.compId && compId!==0){
                      //check the parent compId ?
                      if ( e < nodes[i].data.mc.isolation && Math.abs(e) < Math.abs(master_grid_field[u*4+3])) {//-1 && e < nodes[i].data.mc.isolation+1){
                        master_grid_id[u] = nodes[i].data.compId;
                        nodes[i].data.insides.push(u);
                        //console.log("inside");
                        indices.splice(u,1);
                      }

                    }
                    if ( e < master_grid_field[u*4+3])
                    {
                      master_grid_field[u*4+3] = e;
                      master_grid_field[u*4] = nodes[i].data.mc.normal_cache[q * 3];
                      master_grid_field[u*4+1] = nodes[i].data.mc.normal_cache[q * 3+1];
                      master_grid_field[u*4+2] = nodes[i].data.mc.normal_cache[q * 3+2];
                    }
                    if ( e < nodes[i].data.mc.isolation ) {//-1 && e < nodes[i].data.mc.isolation+1){
                      master_grid_id[u] = nodes[i].data.compId;
                      nodes[i].data.insides.push(u);
                      //console.log("inside");
                      indices.splice(u,1);
                    }*/
                }
            }
        }
        //
        nodes[i].data.vol = GP_ComputeVolume(nodes[i].data.insides.length);
    }
    else continue;
  }
  nodes[0].data.vol = GP_ComputeVolume(indices.length);
  //make a texture out of it, do we include normal_cache, or should we recompute it ?
  //lets try both
  world.addCompGrid(master_grid_id,master_grid_field);
}
/*test using following code :
world.resetGridCompartmentMB();
var i = 1;
var listMetaballs = [];
for (var s=0;s<nodes[i].data.radii[0].radii.length;s++){
  //create one sphere per metaballs as well
  listMetaballs.push(new THREE.Vector4(nodes[i].data.pos[0].coords[s*3]*ascale,
                          nodes[i].data.pos[0].coords[s*3+1]*ascale,
                          nodes[i].data.pos[0].coords[s*3+2]*ascale));
}
var compId = nodes[i].data.compId;
world.updateGridCompartmentMB(compId,listMetaballs);
*/
function GP_gpuCombineGrid(){
  //reset grid
  //console.log("update Grid on GPU");
  for (var i=0;i<nodes.length;i++){//nodes.length
    if (!nodes[i].parent)
      {
        continue;
      }
    if ((nodes[i].children !== null) && (nodes[i].data.nodetype === "compartment")) {
        var listMetaballs = [];
        for (var s=0;s<nodes[i].data.radii[0].radii.length;s++){
          //create one sphere per metaballs as well
          //transform into grid coordinates ?
          listMetaballs.push(new THREE.Vector4(nodes[i].data.pos[0].coords[s*3]*ascale,
                                  nodes[i].data.pos[0].coords[s*3+1]*ascale,
                                  nodes[i].data.pos[0].coords[s*3+2]*ascale,
                                  nodes[i].data.radii[0].radii[s]*ascale));
        }
        var compId = nodes[i].data.compId;
        world.updateGridCompartmentMB(compId,listMetaballs,ascale);
    };
  }
}

function GP_updateMBCompartment(anode){
  //NGL_updateMetaBallsGeom(anode);
  if (controller.renderIsoMB){
    //scale the coords?
    anode.data.mc.update(anode.data.pos[0].coords,anode.data.radii[0].radii,0.2,0.0);
    anode.data.mc.isolation = 0.0;
    var geo = anode.data.mc.generateGeometry();
    anode.data.geo = geo;
    var positions = new Float32Array(geo.vertices);
    var normals = new Float32Array(geo.normals);
    anode.data.mesh.geometry.attributes.position = new THREE.BufferAttribute(positions, 3);
    anode.data.mesh.geometry.attributes.normal = new THREE.BufferAttribute(positions, 3);
    anode.data.mesh.geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(geo.faces), 1));
    anode.data.mesh.geometry.attributes.position.needsUpdate = true;
    anode.data.mesh.geometry.attributes.normal.needsUpdate = true;
    anode.data.mesh.geometry.index.needsUpdate = true;
    //update position and scale
    anode.data.mesh.scale.x = anode.data.mc.grid_scale * ascale;//halfsize?
    anode.data.mesh.scale.y = anode.data.mc.grid_scale * ascale;
    anode.data.mesh.scale.z = anode.data.mc.grid_scale * ascale;
    anode.data.mesh.position.x = anode.data.mc.data_bound.center.x * ascale;//(anode.data.mc.data_bound.min.x + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+w/2.0;//+w/2.0;//center of the box
    anode.data.mesh.position.y = anode.data.mc.data_bound.center.y * ascale;//(anode.data.mc.data_bound.min.y + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+h/2.0;//+h/2.0;
    anode.data.mesh.position.z = anode.data.mc.data_bound.center.z * ascale;//(anode.data.mc.data_bound.min.z + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+d/2.0;//+d/2.0;
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
                                   new THREE.MeshPhongMaterial({ color: 0xffffff, wireframe: true }));
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
  anode.data.mc.isolation = 0.0;//scaled distance to surface
  //NGL_updateMetaBallsGeom(anode);
  anode.data.mc.enableUvs = true;
  var geo = anode.data.mc.generateGeometry();
  anode.data.geo = geo;
  /* BUILD THE BOX */
  var w = anode.data.mc.data_bound.maxsize*ascale;
  var boxGeom = new THREE.BoxGeometry( 1, 1, 1 );
  var wireframeMaterial = new THREE.MeshBasicMaterial({ wireframe: true });
  var mesh = new THREE.Mesh(boxGeom,wireframeMaterial);
  mesh.scale.x = anode.data.mc.data_bound.maxsize * ascale;//halfsize?
  mesh.scale.y = anode.data.mc.data_bound.maxsize * ascale;
  mesh.scale.z = anode.data.mc.data_bound.maxsize * ascale;
  mesh.position.x = anode.data.mc.data_bound.center.x *ascale;//(anode.data.mc.data_bound.min.x + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+w/2.0;//+w/2.0;//center of the box
  mesh.position.y = anode.data.mc.data_bound.center.y *ascale;//(anode.data.mc.data_bound.min.y + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+h/2.0;//+h/2.0;
  mesh.position.z = anode.data.mc.data_bound.center.z *ascale;//(anode.data.mc.data_bound.min.z + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+d/2.0;//+d/2.0;
  //comp_geom.add(mesh);
  /* BUILD THE MESH */
  //anode.data.vol = anode.data.mc.computeVolumeInside();
  ///var texture = THREE.ImageUtils.loadTexture('images/Membrane.jpg');
  var texture = new THREE.TextureLoader().load( 'images/Membrane.jpg' );
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  var mat = new THREE.MeshPhongMaterial( { color: 0x17ff00, specular: 0x111111, shininess: 1, map: texture } );//color: 0x17ff00, specular: 0x111111, shininess: 1,

  var bufferGeometry = new THREE.BufferGeometry();
  bufferGeometry.dynamic = true;
  var positions = new Float32Array(geo.vertices);
  var normals = new Float32Array(geo.normals);
  bufferGeometry.addAttribute('position', new THREE.BufferAttribute(positions, 3).setDynamic( true ) );
  bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3).setDynamic( true ) );
  bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.uv), 2).setDynamic( true ) );
  bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(geo.faces), 1).setDynamic( true ) );

  var wireframeMaterial = new THREE.MeshBasicMaterial({map:texture, wireframe: false });
  if (!triplanarMaterial) GP_triplanarShaderMaterial(texture);
  var compMesh = new THREE.Mesh(bufferGeometry, triplanarMaterial);//mat);//new THREE.MeshPhongMaterial({ color: 0xffffff }));
  compMesh.scale.x = anode.data.mc.grid_scale * ascale;//halfsize?
  compMesh.scale.y = anode.data.mc.grid_scale * ascale;
  compMesh.scale.z = anode.data.mc.grid_scale * ascale;
  compMesh.position.x = anode.data.mc.data_bound.center.x * ascale;//(anode.data.mc.data_bound.min.x + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+w/2.0;//+w/2.0;//center of the box
  compMesh.position.y = anode.data.mc.data_bound.center.y * ascale;//(anode.data.mc.data_bound.min.y + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+h/2.0;//+h/2.0;
  compMesh.position.z = anode.data.mc.data_bound.center.z * ascale;//(anode.data.mc.data_bound.min.z + anode.data.mc.data_bound.maxsize/2.0)*ascale;//+d/2.0;//+d/2.0;
  compMesh.castShadow = true;
  compMesh.receiveShadow = true;
  scene.add(compMesh);
  //scene.add(comp_geom);
  return compMesh;
}

function GP_SetBodyType(anode, pid, start, count){
  var up = new THREE.Vector3();
  var offset = new THREE.Vector3();
  if (anode.data.surface && anode.parent.data.mesh){
    offset.set(anode.data.offset[0]*ascale,anode.data.offset[1]*ascale,anode.data.offset[2]*ascale);
    up.set(anode.data.pcpalAxis[0],anode.data.pcpalAxis[1],anode.data.pcpalAxis[2]);
  }
  var inertia = new THREE.Vector3();
  var mass = 0;
  var nbeads = 0;
  var s = (!anode.data.surface)? -anode.parent.data.compId:anode.parent.data.compId;//this should be the compartment compId /numcomp
  if (!(pid in type_meshs) ){
    //number of beads
    var results = GP_getInertiaMassBeads(anode);
    nbeads = results.nbeads;
    inertia = results.inertia;
    mass = results.mass;
    if (!(pid in type_meshs)) type_meshs[pid] = createOneMesh(anode,start,count);
    //add bodyType firstaddBodyType
    anode.data.bodyid = world.bodyTypeCount;
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
    console.log("updatebodytype",s,anode.data.name,count,nbeads,inertia,mass);
    //world.setBodyType(bodyTypeId,count,nbeads, s, anode.data.size*ascale,
    //                  up.x, up.y, up.z,
    //                  offset.x, offset.y, offset.z,
    //                  mass, inertia.x, inertia.y, inertia.z);
    anode.data.bodyid = world.bodyTypeCount;
    world.addBodyType(count,nbeads, s, anode.data.size*ascale,
                      up.x, up.y, up.z,
                      offset.x, offset.y, offset.z,
                      mass, inertia.x, inertia.y, inertia.z);
    if (type_meshs[pid].idmesh) {
      var mid = type_meshs[pid].idmesh;
      updateOneMesh(meshMeshs[mid].geometry,anode,start,count);//should flag if mesh has changed
    }
  }
}

function GP_GetCount(anode){
  var count = 0;
  if (anode.data.molarity && anode.data.molarity !== 0) {
    //compute volume..?
    var V = anode.parent.data.vol;// ComputeVolume(nodes[i].parent);
    count = Util_getCountFromMolarity(anode.data.molarity, V);
    /*if (anode.data.surface && anode.parent.data.mesh) {
      //%surface ?
      //surface of the protein? 30?
      var A = ComputeArea(anode.parent)/100.0;
      //var B = A/100.0;
      count = Math.round(anode.data.molarity*A);
    }
    else {
      var V = anode.parent.data.vol;// ComputeVolume(nodes[i].parent);
      count = Util_getCountFromMolarity(anode.data.molarity, V);
    }*/
  }
  else if (anode.data.count !== -1) count = anode.data.count;
  else {
    count = Util_getRandomInt( copy_number )+1;//remove root
  }
  return count;
}

function GP_GPUdistributes(){
  var n = nodes.length;
  var start = 0;
  var startp = 0;
  var total = 0;
  var totalp = 0;
  var count = 0;//total ?
  var countp = 0;//total ?
  particle_id_Count = 0;
  var body_to_instances={};//per compartments ?
  var particles_to_instances=[];//id,bodyInstanceId,bodyType
  //get the count
  //build master grid with everything? should align with gpu_grid
  for (var i=0;i<n;i++){//nodes.length
    if (!nodes[i].parent){
      //root
      body_to_instances[nodes[i].data.name]=[];
    }
    if ((nodes[i].children !== null) && (nodes[i].data.nodetype === "compartment")) {
        //use NGL to load the object?
        if (!("mc" in nodes[i].data)) nodes[i].data.mesh = GP_createOneCompartmentMesh(nodes[i]);
        else GP_updateMBCompartment(nodes[i]);
        body_to_instances[nodes[i].data.name]=[];
    }
  }
  GP_CombineGrid();
  if (!inited) {
    initDebugGrid();
  }
  for (var i=0;i<n;i++){//nodes.length
    console.log(i,nodes[i].data.name);
    if (nodes[i].data.ingtype == "fiber") continue;
    if (nodes[i].children!== null && nodes[i].parent === null) continue;
    if ((nodes[i].children !== null) && (nodes[i].data.nodetype === "compartment")) {
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
    count = GP_GetCount(nodes[i]);
    //count = Util_getRandomInt( copy_number )+1;//remove root
    console.log(i,nodes[i].data.name,nodes[i].parent.data.name,count);
    //count is how many body we are going to instanciate
    GP_SetBodyType(nodes[i], i, start, count)
    body_to_instances[nodes[i].data.name].push({"count":count,"btype":nodes[i].data.bodyid});
    for (var p=start;p<count;p++)
    {
      for (var pi=startp;pi<nodes[i].data.radii[0].radii.length;pi++){
        particles_to_instances.push([pi,p,nodes[i].data.bodyid]);
      }
    }
    startp= startp + nodes[i].data.radii[0].radii.length;
    totalp = totalp + nodes[i].data.radii[0].radii.length;
    start = start + count;
    total = total + count;
  }
}

function distributesMesh(){
  var n = nodes.length;
  num_beads_total = 0;
  var start = 0;
  var total = 0;
  var count = 0;//total ?
  particle_id_Count = 0;
  //build the compartments
  //general_inertia_mass = GP_getInertiaOneSphere();
  for (var i=0;i<n;i++){//nodes.length
    if (!nodes[i].parent)
      {
        //nodes[i].data.vol = ComputeVolume(nodes[i]);
        continue;
      }
    if ((nodes[i].children !== null) && (nodes[i].data.nodetype === "compartment")) {
        //use NGL to load the object?
        if (!("mc" in nodes[i].data)) nodes[i].data.mesh = GP_createOneCompartmentMesh(nodes[i]);
        else GP_updateMBCompartment(nodes[i]);
        compartments_count+=1;
        //remove volume from parent volume
        //nodes[i].parent.data.vol = nodes[i].parent.data.vol - nodes[i].data.vol;
        continue;
    };
  }

  //build master grid with everything? should align with gpu_grid
  GP_CombineGrid();
  if (!inited) initDebugGrid();
  for (var i=0;i<n;i++){//nodes.length
    console.log(i,nodes[i].data.name);
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
    if (pdbname && (pdbname.startsWith("EMD")
    || pdbname.startsWith("EMDB")
    || pdbname.slice(-4, pdbname.length) === ".map")) {
      continue;
    }
    if (nodes[i].data.geom_type !== "raw" && nodes[i].data.geom_type !== "sphere") continue;
    count = GP_GetCount(nodes[i]);
    console.log(i, nodes[i].data.name, count);
    //count = Util_getRandomInt( copy_number )+1;//remove root
    if (nodes[i].data.ingtype == "fiber") {
      //random walk in the grid ?
      //should do this for count number of fiber
      var nfiber = count;
      var totalc = 0;
      var tlength = parseFloat(nodes[i].data.tlength);//segment number not angstrom
      var angle = parseFloat(nodes[i].data.angle);//authorise angle
      var ulength = parseFloat(nodes[i].data.ulength)*ascale;//unit length
      //check the packing method random or file or supercell
      if (nodes[i].data.buildtype === "file")
      {
        //if not already loaded , load the file-> get positions
        nfiber = nodes[i].data.curves.length;
        for (var cp =0; cp < nfiber; cp++){
          totalc+=nodes[i].data.curves[cp].points.length;
        }
      }
      else {
        if (inited && nodes[i].data.curves)
        {
          for (var cp =0; cp < nodes[i].data.curves.length; cp++){
            if (nodes[i].data.curves[cp].line) scene.remove(nodes[i].data.curves[cp].line);
            nodes[i].data.curves[cp] = null;
          }
          nodes[i].data.curves = [];
        }
        if (nfiber !==0) {
          for (var cp =0; cp < nfiber; cp++){
            GP_walk_lattice(i,nodes[i],start,count,angle,ulength,tlength);
            //createInstancesMesh(i,nodes[i],start,tlength);
          }
        }
        totalc = tlength*nfiber;
      }
      start = createInstancesMeshCurves(i,nodes[i],start,totalc);
      //start = start + tlength*nfiber;
      total = total + totalc;
    }
    else {
      if (nodes[i].data.buildtype === "file") count = nodes[i].data.results.positions.length;
      createInstancesMesh(i,nodes[i],start,count);
      start = start + count;
      total = total + count;
    }
  }
  if (atomData_do) createCellVIEW();
  console.log ( "there is n instances ",total);
  console.log ( "there is n atoms ",num_beads_total);
  console.log ( "particle_id_Count ",particle_id_Count);
  num_instances = total;
  //world.particleCount = particle_id_Count;
  //world.bodyCount = num_instances;
  console.log(type_meshs[instance_infos[0]]);
  var keys = Object.keys(type_meshs);
  var nMeshs = keys.length;
  var amesh;
  for (var i=0;i<nMeshs;i++) {
      console.log("mesh check ",keys[i]);
      if (i >= meshMeshs.length) {
        //change the material uniform color ?
        amesh = new THREE.Mesh( type_meshs[keys[i]], all_materials[current_material].m );
        //amesh.material.uniform.uBaseColor = new THREE.Color(nodes[keys[i]].data.color[0],nodes[keys[i]].data.color[1],nodes[keys[i]].data.color[2]);
        amesh.frustumCulled = false; // Instances can't be culled like normal meshes
        // Create a depth material for rendering instances to shadow map
        amesh.customDepthMaterial = customDepthMaterial;
        amesh.castShadow = true;
        amesh.receiveShadow = true;
        type_meshs[keys[i]].idmesh = meshMeshs.length;
        meshMeshs.push(amesh);
        scene.add( amesh );
        console.log("mesh builded",keys[i]);
      }
      else {
        //already updated
      }
  }
  if (inited) GP_updateDebugBeadsSpheres();
  else GP_debugBeadsSpheres();
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
    clipping: true,
    clippingPlanes: clipPlanes,
    clipIntersection: true,
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

function GP_updateMeshGeometry(anode){
  if (!inited) return;
  var pid = nodes.indexOf(anode);
  if (!(pid in type_meshs)) return;
  var mid = type_meshs[pid].idmesh;
  var bufferGeometry = new THREE.BufferGeometry();
  var positions = new Float32Array(anode.data.geom.verts);
  bufferGeometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (anode.data.geom.normals!==null)
  {
      var normals = new Float32Array(anode.data.geom.normals);
      bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3));
  }
  bufferGeometry.scale(ascale,ascale,ascale);
  var meshGeometry = meshMeshs[mid].geometry;
  meshGeometry.attributes.position.copy(bufferGeometry.attributes.position);
  meshGeometry.attributes.normal.copy(bufferGeometry.attributes.normal);
  meshGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(anode.data.geom.faces), 1));
  meshGeometry.attributes.position.needsUpdate = true;
  meshGeometry.attributes.normal.needsUpdate = true;
  meshGeometry.index.needsUpdate = true;
  //meshGeometry.scale(ascale,ascale,ascale);
}

function GP_updateMeshColorGeometry(anode){
  if (!inited) return;
  var pid = nodes.indexOf(anode);
  var mid = type_meshs[pid].idmesh;
  var meshGeometry = meshMeshs[mid].geometry;
  var color = [1,0,0];
  if (("color" in anode.data)&&(anode.data.color!==null)) color = anode.data.color;
  else {
    color = [Math.random(), Math.random(), Math.random()];;//(anode.data.surface) ? [1,0,0]:[0,1,0];//Math.random(), Math.random(), Math.random()];
    anode.data.color = [color[0],color[1],color[2]];
  }
  var count = meshGeometry.maxInstancedCount;
  var bodyColors = new THREE.InstancedBufferAttribute( new Float32Array( count * 3 ), 3, true, 1  );
  for ( var i = 0, ul = count; i < ul; i++ ) {
      bodyColors.setXYZ(i, color[0],color[1],color[2]);// color[0],color[1],color[2]);//rgb of the current anode
  }
  meshGeometry.attributes.bodyColor.copy(bodyColors);
  meshGeometry.attributes.bodyColor.needsUpdate = true;
}

function updateOneMesh(meshGeometry,anode,start,count) {
    var color = [1,0,0];
    if (("color" in anode.data)&&(anode.data.color!==null)) color = anode.data.color;
    else {
      color = [Math.random(), Math.random(), Math.random()];;//(anode.data.surface) ? [1,0,0]:[0,1,0];//Math.random(), Math.random(), Math.random()];
      anode.data.color = [color[0],color[1],color[2]];
    }
    console.log("updateOneMesh",meshGeometry,count);
    meshGeometry.startInstancedCount = start;
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

//we should be able to setup preplaced objects as well.
function GP_setupCurve(){
  //https://github.com/mrdoob/three.js/blob/master/examples/webgl_geometry_extrude_splines.html
  //or instance instance buffer ? with https://github.com/mattdesl/parametric-curves/
  //start with Curve->Geometry and see how it goes. Could use instancebuffer system
}

function createOneMesh(anode,start,count) {
  //this assume the geom_type is raw
  var color = [1,0,0];
  if (("color" in anode.data)&&(anode.data.color!==null)) color = anode.data.color;
  else {
    color = [Math.random(), Math.random(), Math.random()];;//(anode.data.surface) ? [1,0,0]:[0,1,0];//Math.random(), Math.random(), Math.random()];
    anode.data.color = [color[0],color[1],color[2]];
  }
  var bufferGeometry;
  if (anode.data.geom_type === "sphere") {
     var R = anode.data.size;
     bufferGeometry = new THREE.SphereBufferGeometry(R, 8, 8);
  }
  else {//assume raw geo
    bufferGeometry = new THREE.BufferGeometry();
    var positions = new Float32Array(anode.data.geom.verts);
    bufferGeometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (anode.data.geom.normals!==null)
    {
      var normals = new Float32Array(anode.data.geom.normals);
      bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3));
    }
   //bufferGeometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
    bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(anode.data.geom.faces), 1));
  }
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

//scale ?
//need to add the beads as single beads ? attached beads
//thjis ispurely random no constraiunts!
//make a walk on a lattice
function GP_foundNextPoint(current_point, a_direction, angle, ulength){
    var next_point = new THRE.Vector3();
    var new_point = Util_coneSample_uniform(angle,direction,1);
    new_point.normalize();
    new_point.multiplyScalar(ulength);
    next_point.addVectors(current_point,new_point);
    return next_point;
}

//make a walk on lattice constraints
//GP_walk_lattice(1,nodes[1],0,1,500)
function GP_walk_lattice(pid,anode,start,count,angle,ulength,totalLength){
      //should we used set of rigid-body attached or uniq-beads
      //start with beads
      var array_points =[];
      var inside = false;
      var w = world.broadphase.resolution.x * world.radius * 2;
      var h = world.broadphase.resolution.y * world.radius * 2;
      var d = world.broadphase.resolution.z * world.radius * 2;
      var aradius = ulength/2.0*ascale;
      //var ulength = 34.0*ascale;
      //var angle = 25.0;
      //coneAngle = coneAngleDegree * pi/180;
      //var totalLength = 1000;//1000*uLength
      var x = -boxSize.x + Util_halton(start,2)*w;
      var y =  Util_halton(start,3)*h;
      var z = -boxSize.z + Util_halton(start,5)*d;
      var starting_point = new THREE.Vector3(x,y,z);
      if (anode.parent.data.insides && anode.parent.data.insides.length !==0 ){
          inside=true;
          var h = Math.random() * anode.parent.data.insides.length;//Util_halton(bodyId,2)*anode.parent.data.insides.length+1;
          var qi = anode.parent.data.insides[Math.round(h)];//bodyId-start];//Math.round(h)];//master_grid_id[
          //qi to XYZ
          var xyz = GP_uToWorldCoordinate(qi);
          //jitter
          var jitter = [Math.random()*ascale,Math.random()*ascale,Math.random()*ascale];
          x = xyz[0]*ascale+jitter[0];
          y = xyz[1]*ascale+jitter[1];
          z = xyz[2]*ascale+jitter[2];
          starting_point = new THREE.Vector3(x,y,z);
      }
      //safety ?
      var the_angle = angle;
      var next_point = new THREE.Vector3(0,0,0);
      var rnd = Util_sphereSample_uniform(Math.random(), Math.random());
      rnd.normalize()
      rnd.multiplyScalar(ulength);
      next_point.addVectors(starting_point, rnd);
      previous_point = next_point.clone();
      console.log("starting_point",starting_point);
      console.log("next_point",next_point);
      console.log(starting_point);
      var direction = rnd.clone();
      direction.normalize ();
      var found = false;
      var notfound = false;
      var safety = 150;
      var safety_count = 0;
      for (var i = 0;i < totalLength;i++) {
        //console.log("direction",direction);
        while (!found) {
          var new_point = Util_coneSample_uniform(angle,direction,1);
          //console.log("new_point",new_point);
          new_point.normalize();
          new_point.multiplyScalar(ulength);
          //console.log("new_point scaled",new_point);
          //console.log("previous_point",previous_point);
          next_point.addVectors(previous_point,new_point);
          //console.log("next_point",next_point);
          //test the points
          if (anode.parent === root) found = true;
          else {
            var q = anode.parent.data.mc.getUfromXYZ(next_point.x/ascale,next_point.y/ascale,next_point.z/ascale );
            //console.log("next_point",next_point,q,safety_count,anode.parent.data.mc.field[q]);//13965
            if (q<0) {
            safety_count++;
            angle  = angle +1.10;
            //increase angle or go back
            //previous_point = array_points[array_points.length-1];
            if (safety_count > 25) angle  = angle +1.0;
            if (safety_count > safety) {notfound=true;found=true;};
          }
            else {
            var e = anode.parent.data.mc.field[q];
            if (e < anode.parent.data.mc.isolation){//q in anode.parent.data.insides) {
              found = true;
              notfound = false;
            }
            else {
              safety_count ++;
              angle  = angle +1.10;
              //increase angle or go back
              //previous_point = array_points[array_points.length-5];
              if (safety_count > 25) angle  = angle +1.0;
              if (safety_count > safety) {notfound=true;found=true;}
              //console.log("outside ??");
            }
          }
            if (safety_count > safety) {
            //console.log(safety_count,safety,(safety_count > safety));
            notfound=true;
            found=true;
            }
          }
        }
        if (notfound) {console.log("not found ??",safety_count,safety,(safety_count > safety));break;}
        else {
            console.log("found!");
            angle = the_angle;
            safety_count = 0;
            found = false;
            previous_point = next_point.clone();
            array_points.push(next_point.clone());
            direction = new_point.clone();
            direction.normalize ();
        }
      }
      console.log(array_points);
      if (array_points.length < 1) return;
      //pass the array point to viewer
      //SplineCurve3
      var spline = new THREE.CatmullRomCurve3( array_points );
      if (!anode.data.curves) anode.data.curves = [];
      //var amaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
      //var tubeGeometry = new THREE.TubeBufferGeometry( spline, 100, aradius, 4, false );
      //var mesh = new THREE.Mesh( tubeGeometry, amaterial );
      //scene.add(mesh);
      //var points = curve.getPoints( 50 );
      var lgeometry = new THREE.BufferGeometry().setFromPoints( array_points );
      var lmaterial = new THREE.LineBasicMaterial( { color : 0xff0000 } );
      var curveObject = new THREE.Line( lgeometry, lmaterial );
      scene.add(curveObject);
      anode.data.curves.push({"points":array_points,"spline":spline,"mesh":null,"line":curveObject});
}

function GP_walk(pid,anode,start,count,angle,totalLength){
      //should we used set of rigid-body attached or uniq-beads
      //start with beads
      var array_points =[];
      var inside = false;
      var w = world.broadphase.resolution.x * world.radius * 2;
      var h = world.broadphase.resolution.y * world.radius * 2;
      var d = world.broadphase.resolution.z * world.radius * 2;
      var radius = 34.0/2.0*ascale;
      var ulength = 34.0*ascale;
      //var angle = 25.0;
      //coneAngle = coneAngleDegree * pi/180;
      //var totalLength = 1000;//1000*uLength
      var x = -boxSize.x + Util_halton(start,2)*w;
      var y =  Util_halton(start,3)*h;
      var z = -boxSize.z + Util_halton(start,5)*d;
      var starting_point = new THREE.Vector3(x,y,z);
      //var previous_point = new THREE.Vector3(x,y,z);//new THREE.Vector3(0,0,ulength);
      var next_point = new THREE.Vector3(0,0,0);
      var rnd = Util_sphereSample_uniform(Math.random(), Math.random());
      rnd.normalize()
      rnd.multiplyScalar(ulength);
      next_point.addVectors(starting_point, rnd);
      previous_point = next_point.clone();
      console.log("starting_point",starting_point);
      console.log("next_point",next_point);
      if (anode.parent.data.insides && anode.parent.data.insides.length !==0 ){
          inside=true;
          var h = Math.random() * anode.parent.data.insides.length;//Util_halton(bodyId,2)*anode.parent.data.insides.length+1;
          var qi = anode.parent.data.insides[Math.round(h)];//bodyId-start];//Math.round(h)];//master_grid_id[
          //qi to XYZ
          var xyz = GP_uToWorldCoordinate(qi);
          //jitter
          var jitter = [Math.random()*ascale,Math.random()*ascale,Math.random()*ascale];
          x = xyz[0]*ascale+jitter[0];
          y = xyz[1]*ascale+jitter[1];
          z = xyz[2]*ascale+jitter[2];
          starting_point = new THREE.Vector3(x,y,z);
      }
      console.log(starting_point);
      var direction = rnd.clone();
      direction.normalize ();
      for (var i = 0;i < totalLength;i++) {
        //console.log("direction",direction);
        var new_point = Util_coneSample_uniform(angle,direction,1);
        //console.log("new_point",new_point);
        new_point.normalize();
        new_point.multiplyScalar(ulength);
        //console.log("new_point scaled",new_point);
        next_point.addVectors(previous_point,new_point);
        //console.log("next_point",next_point);
        previous_point = next_point.clone();
        array_points.push(next_point.clone());
        direction = new_point.clone();
        direction.normalize ();
      }
      //pass the array point to viewer
      //SplineCurve3
      var spline = new THREE.CatmullRomCurve3( array_points );
      if (!anode.data.curves) anode.data.curves = [];
      var amaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
      var tubeGeometry = new THREE.TubeBufferGeometry( spline, 100, radius, 4, false );
      var mesh = new THREE.Mesh( tubeGeometry, amaterial );
      //scene.add(mesh);
      //var points = curve.getPoints( 50 );
      var lgeometry = new THREE.BufferGeometry().setFromPoints( array_points );
      var lmaterial = new THREE.LineBasicMaterial( { color : 0xff0000 } );
      var curveObject = new THREE.Line( lgeometry, lmaterial );
      scene.add(curveObject);
      anode.data.curves.push({"points":array_points,"spline":spline,"mesh":mesh,"line":curveObject});
      //use this curve for mesh instancing!
    /*  for(var i = 0; i < amountOfPoints; i += 0.5){
    var t = spline.getUtoTmapping(i / amountOfPoints);
    var position = spline.getPoint(t);
    var rotation = spline.getTangent(t);
  }*/

}//
//scene.remove(nodes[1].data.curves[0].line);scene.remove(nodes[1].data.curves[0].mesh);nodes[1].data.curves = [];GP_walk(1,nodes[1],0,1,5000)

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
    if (anode.data.radii && anode.data.radii.length && "radii" in anode.data.radii[0]) {
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

function createInstancesMeshCurves(pid,anode,start,count) {
  var w = world.broadphase.resolution.x * world.radius * 2;
  var h = world.broadphase.resolution.y * world.radius * 2;
  var d = world.broadphase.resolution.z * world.radius * 2;
  var up = new THREE.Vector3(0,0,1);
  var offset = new THREE.Vector3();
  if (anode.data.surface && anode.parent.data.mesh){
    offset.set(anode.data.offset[0]*ascale,anode.data.offset[1]*ascale,anode.data.offset[2]*ascale);
    up.set(anode.data.pcpalAxis[0],anode.data.pcpalAxis[1],anode.data.pcpalAxis[2]);
  }
  var inertia = new THREE.Vector3();
  var mass = 0;
  var nbeads = 0;
  var spring_r = world.radius;//world.radius;//anode.data.ulength/2.0*ascale;
  GP_SetBodyType(anode, pid, start, count);
  //position should use the halton sequence and the grid size
  //should do it constrained inside the given compartments
  //var comp = anode.parent;
  //check the buildtype? anode.data.buildtype
  var nfiber = anode.data.curves.length;
  console.log("setup x fiber",nfiber);
  for (var cp =0; cp < nfiber; cp++){
    var counter = 0;
    var curve = anode.data.curves[cp];
    var npoints = parseFloat(anode.data.tlength);//anode.data.tlength);//curve.points.length;//or nodes[i].data.tlength
    console.log("start x count",start,start+npoints);
    for (var bodyId=start;bodyId<start+npoints;bodyId++) {
      var pos = curve.spline.getPoint(parseFloat(counter)/parseFloat(npoints));
      //.getUtoTmapping ( u : Float, distance : Float )
      //.getSpacedPoints ( divisions : Integer )
      up.set(0.0,0.0,1.0);
      //var up = new THREE.Vector3( 0, 1, 0 );
      var axis = new THREE.Vector3( );
      var q = new THREE.Quaternion();
      var ni = curve.spline.getTangent(parseFloat(counter)/parseFloat(npoints)).normalize();//vector
      axis.crossVectors( up, ni ).normalize();
      var radians = Math.acos( up.dot( ni ) );
      q.setFromAxisAngle( axis, radians );
      //var r = new THREE.Quaternion().setFromUnitVectors (new THREE.Vector3(0.0,1.0,0.0),ni);
      //whats the up vector ?
      //multiply by going from
      var x = pos.x;
      var y = pos.y;
      var z = pos.z;
      //q = new THREE.Quaternion(r.x,r.y,r.z,r.w);
      mass = 1;
      calculateBoxInertia(inertia, mass, new THREE.Vector3(radius*2,radius*2,radius*2));
      world.addBody(x,y,z, q.x, q.y, q.z, q.w,
                    mass, inertia.x, inertia.y, inertia.z,
                    anode.data.bodyid);
      //attach two body or two particles
      if (anode.data.radii) {
        if (anode.data.radii && "radii" in anode.data.radii[0]) {
          var id1 = -1;//world.particleCount;
          var id2 = -1;
          //this assume only one, what if more ? should provide the beads that interact?
          for (var i=0;i<anode.data.radii[0].radii.length;i++){
              //transform beads
              id1 = world.particleCount;
              var x=anode.data.pos[0].coords[i*3]*ascale,
                  y=anode.data.pos[0].coords[i*3+1]*ascale,
                  z=anode.data.pos[0].coords[i*3+2]*ascale;
              world.addParticle(bodyId, x,y,z);
              id2 = world.particleCount;
              //create a i,i+1 constraints for starter with assuming one beads?
              //or enable only 4 possible interaction per beads
              //distance need to be scaled *ascale
              if (world.particleCount-1>=0 && counter-1 >= 0)
                  world.addParticlePairInteraction(id1-1,id1,2.0*spring_r);
              if (world.particleCount-2>=0 && counter-2 >= 0)
                  world.addParticlePairInteraction(id1-2,id1,4.0*spring_r);
              /*if ( particle_id_Count >= world.particleCount )
              {    world.addParticle(bodyId, x,y,z);}
              else
              {    world.setParticle(particle_id_Count,bodyId,x,y,z);}*/
              particle_id_Count++;
          }
        }
        else
        {
          for (var i=0;i< anode.data.pos[0].length;i++){
            var p = anode.data.pos[0][i];
            world.addParticle(bodyId, p[0],p[1],p[2]);
            /*if ( particle_id_Count >= world.particleCount )
            {    world.addParticle(bodyId, p[0],p[1],p[2]);}
            else
            {    world.setParticle(particle_id_Count,bodyId,p[0],p[1],p[2]);}*/
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
      counter+=1;
    }
    start = start + npoints;
    //total = total + npoints;
  }
  return start;
}

function createInstancesMesh(pid,anode,start,count) {
  var w = world.broadphase.resolution.x * world.radius * 2;
  var h = world.broadphase.resolution.y * world.radius * 2;
  var d = world.broadphase.resolution.z * world.radius * 2;
  var up = new THREE.Vector3(0,0,1);
  var offset = new THREE.Vector3();
  if (anode.data.surface && anode.parent.data.mesh){
    offset.set(anode.data.offset[0]*ascale,anode.data.offset[1]*ascale,anode.data.offset[2]*ascale);
    up.set(anode.data.pcpalAxis[0],anode.data.pcpalAxis[1],anode.data.pcpalAxis[2]);
  }
  var inertia = new THREE.Vector3();
  var mass = 0;
  var nbeads = 0;
  GP_SetBodyType(anode, pid, start, count);
  //position should use the halton sequence and the grid size
  //should do it constrained inside the given compartments
  //var comp = anode.parent;
  //check the buildtype? anode.data.buildtype
  if (anode.data.buildtype === "supercell") {
      //count out of the supercellbuilding?
      var pdburl = LM_getUrlStructure(anode, anode.data.source.pdb);
      var aradius = anode.data.size;
      var comp_offset = new THREE.Vector3(0);
      //node_selected = anode;

      if (anode.parent.data.geom_type === "mb"){
        if (anode.parent.data.geom.radii){
          aradius = anode.parent.data.geom.radii[0];

          comp_offset = new THREE.Vector3(anode.parent.data.geom.positions[0],
                                          anode.parent.data.geom.positions[1],
                                          anode.parent.data.geom.positions[2]);
        }
        else if (anode.parent.data.radii){
          aradius = anode.parent.data.radii[0].radii[0];

          comp_offset = new THREE.Vector3(anode.parent.data.pos[0].coords[0],
                                          anode.parent.data.pos[0].coords[1],
                                          anode.parent.data.pos[0].coords[2]);
        }
      }
      if (!(anode.data.hasOwnProperty("litemol"))) anode.data.litemol = null;
      NGL_BuildSUPERCELL(anode, pdburl, aradius);//this is async ?
      //this doesnt work..
      var safety = 20000;
      var s =0;
      while (!(anode.data.litemol)){
        //wait
        //console.log(s,anode.data.litemol);
        s++;
        if (s>=safety) break;
      }
  }
  else if (anode.data.buildtype === "file")
  {
    if (anode.data.results)
        count = anode.data.results.positions.length;
  }
  var counter = 0;
  for (var bodyId=start;bodyId<start+count;bodyId++) {
    //if (loading_bar) loading_bar.set(bodyId/start+count);
    //var x = -boxSize.x + 2*boxSize.x*Math.random();
    //var y = ySpread*Math.random();
    //var z = -boxSize.z + 2*boxSize.z*Math.random();
    var x = -boxSize.x + Util_halton(bodyId,2)*w;
    var y =  Util_halton(bodyId,3)*h;
    var z = -boxSize.z + Util_halton(bodyId,5)*d;
    var q = new THREE.Quaternion();
    var axis = new THREE.Vector3(
        Math.random()-0.5,
        Math.random()-0.5,
        Math.random()-0.5
    );
    axis.normalize();
    q.setFromAxisAngle(axis, Math.random() * Math.PI * 2);
    if (anode.data.buildtype === "supercell") {
      //need x,y,z qx,qy,qz,qw
      //offset to the center of the parent node ?
      if (counter >= anode.data.litemol.crystal_mat.operators.length) continue;
      var matrix = new THREE.Matrix4();
      matrix.elements = anode.data.litemol.crystal_mat.operators[counter].matrix
      var pos = new THREE.Vector3();
      var rotation = new THREE.Quaternion();
      var scale = new THREE.Vector3();
      matrix.decompose ( pos , rotation, scale )
      counter+=1;
      x=(pos.x+comp_offset.x)*ascale;
      y=(pos.y+comp_offset.y)*ascale;
      z=(pos.z+comp_offset.z)*ascale;
      q.copy(rotation);
    }
    else if (anode.data.buildtype === "file") {
      x = anode.data.results.positions[counter].x;
      y = anode.data.results.positions[counter].y;
      z = anode.data.results.positions[counter].z;
      q.copy(anode.data.results.rotations[counter]);
      counter+=1;
    }
    else if (anode.data.surface && anode.parent.data.mesh)
    {
      //should random in random triangle ?
      //q should align the object to the surface, and pos should put on a vertices/faces
      var v = anode.parent.data.mesh.geometry.attributes.position.array;
      var n = anode.parent.data.mesh.geometry.attributes.normal.array;
      //pick a random one.
      var mscale = anode.parent.data.mesh.scale;
      var vi = Math.round(Util_halton(bodyId,2)*v.length/3);
      var ni = new THREE.Vector3( -n[vi*3],-n[vi*3+1],-n[vi*3+2]);
      var rotation1 = Util_computeOrientation(ni,up);
      //compare with .setFromUnitVectors ( vFrom : Vector3, vTo : Vector3 )
      var rotation = new THREE.Quaternion().setFromUnitVectors (up,ni);
      var rand_rot = new THREE.Quaternion();
      rand_rot.setFromAxisAngle(up, Math.random() * Math.PI * 2);
      rotation.multiply(rand_rot);
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
      x = xyz[0]*ascale+jitter[0]; y = xyz[1]*ascale+jitter[1]; z = xyz[2]*ascale+jitter[2];
    }
    //calculateBoxInertia(inertia, mass, new THREE.Vector3(radius*4,radius*4,radius*2));
    //calculate inertia from the beads
    mass = 1;
    calculateBoxInertia(inertia, mass, new THREE.Vector3(radius*2,radius*2,radius*2));
    world.addBody(x,y,z, q.x, q.y, q.z, q.w,
                  mass, inertia.x, inertia.y, inertia.z,
                  anode.data.bodyid);
   /*if ( bodyId >= world.bodyCount ) {
      world.addBody(x,y,z, q.x, q.y, q.z, q.w,
                    mass, inertia.x, inertia.y, inertia.z,
                    anode.data.bodyid);
    }
    else {
      world.setBody(bodyId, x,y,z, q.x, q.y, q.z, q.w,
                    mass, inertia.x, inertia.y, inertia.z,
                    anode.data.bodyid);
    }
    */
    //add the beads information
    if (anode.data.radii) {
      if (anode.data.radii && "radii" in anode.data.radii[0]) {
        for (var i=0;i<anode.data.radii[0].radii.length;i++){
            //transform beads
            var x=anode.data.pos[0].coords[i*3]*ascale,
                y=anode.data.pos[0].coords[i*3+1]*ascale,
                z=anode.data.pos[0].coords[i*3+2]*ascale;
            world.addParticle(bodyId, x,y,z);
            /*if ( particle_id_Count >= world.particleCount )
            {    world.addParticle(bodyId, x,y,z);}
            else
            {    world.setParticle(particle_id_Count,bodyId,x,y,z);}*/
            particle_id_Count++;
        }
      }
      else
      {
        for (var i=0;i< anode.data.pos[0].length;i++){
          var p = anode.data.pos[0][i];
          world.addParticle(bodyId, p[0],p[1],p[2]);
          /*if ( particle_id_Count >= world.particleCount )
          {    world.addParticle(bodyId, p[0],p[1],p[2]);}
          else
          {    world.setParticle(particle_id_Count,bodyId,p[0],p[1],p[2]);}*/
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

function createMeshIngrMaterial(mat,light,ambientlight) {
  var u = THREE.UniformsUtils.clone( mat.uniforms );
  u.bodyQuatTex = { value: world.dataTextures.bodyQuaternions };
  u.bodyPosTex = { value: world.dataTextures.bodyPositions };
  u.bodyInfosTex = { value: world.dataTextures.bodyInfos };
  var matShader = mat.fragmentShader;
  var vs = sharedShaderCode.innerText + renderBodiesVertex.innerText;//shader.vertexShader;
  var fs = matShader;
  var material = new THREE.ShaderMaterial( {
    uniforms: u,
    vertexShader: vs,
    fragmentShader: fs,
    lights: true,
    vertexColors: true,
    clipping: true,
    clippingPlanes: clipPlanes,
    clipIntersection: true,
    defines: {
          bodyInfosTextureResolution: 'vec2( ' + world.textures.bodyInfos.width.toFixed( 1 ) + ', ' + world.textures.bodyInfos.width.toFixed( 1 ) + " )",
          bodyTextureResolution: 'vec2(' + world.bodyTextureSize.toFixed(1) + ',' + world.bodyTextureSize.toFixed(1) + ')',
          resolution: 'vec2(' + world.particleTextureSize.toFixed(1) + ',' + world.particleTextureSize.toFixed(1) + ')'
      }} );
  //material.uniforms.uDirLightPos.value = light.position;
  //material.uniforms.uDirLightColor.value = light.color;
  //material.uniforms.uAmbientLightColor.value = ambientLight.color;
  return material;
}

var texture = 0;

function GP_triplanarShaderMaterial(texture){
  //from https://www.clicktorelease.com/code/bumpy-metaballs/
  //var mat = new THREE.MeshPhongMaterial( { color: 0x17ff00, specular: 0x111111, shininess: 1, map: texture } );//color: 0x17ff00, specular: 0x111111, shininess: 1,
  //var phongShader = THREE.ShaderLib.phong;
  //var uniform = THREE.UniformsUtils.clone(phongShader.uniforms);
  //var vs = phongShader.vertexShader;//shader.vertexShader;
  //var fs = triplanarShader;
  triplanarMaterial = new THREE.ShaderMaterial( {
		uniforms: {
            textureMap: { type: 't', value: null },
            normalMap: { type: 't', value: null },
            normalScale: { type: 'f', value: 1 },
            texScale: { type: 'f', value: 5 },
            useSSS: { type: 'f', value: 1 },
            useScreen: { type: 'f', value: 0 },
            opacity:{type:'f',value: 0.5},
            color: { type: 'c', value: new THREE.Color( 0, 0, 0 ) }
        },
        clipping: true,
        clippingPlanes: clipPlanes,
        clipIntersection: true,
		    vertexShader: document.getElementById( 'tri_vertexShader' ).textContent,
		    fragmentShader: document.getElementById( 'tri_fragmentShader' ).textContent,
        side: THREE.DoubleSide
	} );
  GP_switchTexture();
}

function GP_switchTexture() {
	texture++;
	texture %= 4;
	switch( texture ) {
		case 0:
			triplanarMaterial.uniforms.normalScale.value = .5;
			triplanarMaterial.uniforms.texScale.value = 10;
			triplanarMaterial.uniforms.useSSS.value = .15;
			triplanarMaterial.uniforms.useScreen.value = 0;
			triplanarMaterial.uniforms.textureMap.value = new THREE.TextureLoader().load( 'images/matcap2.jpg' );
			triplanarMaterial.uniforms.normalMap.value = new THREE.TextureLoader().load( 'images/723-normal.jpg' );
			triplanarMaterial.uniforms.color.value.setRGB( 18. / 255., 72. / 255., 85. / 255. );
			//sphereMaterial.uniforms.color.value.setRGB( 18. / 255., 72. / 255., 85. / 255. );
			break;
		case 1:
			triplanarMaterial.uniforms.normalScale.value = 1;
			triplanarMaterial.uniforms.texScale.value = 5;
			triplanarMaterial.uniforms.useSSS.value = 1;
			triplanarMaterial.uniforms.useScreen.value = 0;
			triplanarMaterial.uniforms.textureMap.value = new THREE.TextureLoader().load( 'images/matcap.jpg' );
			triplanarMaterial.uniforms.normalMap.value = new THREE.TextureLoader().load( 'images/ice-snow.jpg' );
			triplanarMaterial.uniforms.color.value.setRGB( 181. / 255., 65. / 255., 52. / 255. );
			//sphereMaterial.uniforms.color.value.setRGB( 181. / 255., 65. / 255., 52. / 255. );
			break;
		case 2:
			triplanarMaterial.uniforms.normalScale.value = 1;
			triplanarMaterial.uniforms.texScale.value = 10;
			triplanarMaterial.uniforms.useSSS.value = 0;
			triplanarMaterial.uniforms.useScreen.value = 1;
			triplanarMaterial.uniforms.textureMap.value = new THREE.TextureLoader().load( 'images/944_large_remake2.jpg' );
			triplanarMaterial.uniforms.normalMap.value = new THREE.TextureLoader().load( 'images/carbon-fiber.jpg' );
			triplanarMaterial.uniforms.color.value.setRGB( 36. / 255., 70. / 255., 106. / 255. );
			//sphereMaterial.uniforms.color.value.setRGB( 36. / 255., 70. / 255., 106. / 255. );
			break;
    case 3:
			triplanarMaterial.uniforms.normalScale.value = 1;
			triplanarMaterial.uniforms.texScale.value = 10;
			triplanarMaterial.uniforms.useSSS.value = 0;
			triplanarMaterial.uniforms.useScreen.value = 1;
			triplanarMaterial.uniforms.textureMap.value = new THREE.TextureLoader().load( 'images/matcap2.jpg' );
			triplanarMaterial.uniforms.normalMap.value = new THREE.TextureLoader().load( 'images/Membrane.jpg' );
			triplanarMaterial.uniforms.color.value.setRGB( 0.0, 1.0, 0.0 );
			//sphereMaterial.uniforms.color.value.setRGB( 36. / 255., 70. / 255., 106. / 255. );
			break;
		break;
	}

	triplanarMaterial.uniforms.textureMap.value.wrapS = triplanarMaterial.uniforms.textureMap.value.wrapT =
	THREE.ClampToEdgeWrapping;

	triplanarMaterial.uniforms.normalMap.value.wrapS = triplanarMaterial.uniforms.normalMap.value.wrapT =
	THREE.RepeatWrapping;
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
  unif.uBaseColor= { value:new THREE.Color(0.2,0.2,0.2)};
  var vs = sharedShaderCode.innerText + renderBodiesVertex.innerText;//shader.vertexShader;
  var fs = shader.fragmentShader;
  var material = new THREE.ShaderMaterial( {
    uniforms: unif,
    vertexShader: vs,
    fragmentShader: fs,
    lights: true,
    vertexColors: true,
    clipping: true,
    clippingPlanes: clipPlanes,
    clipIntersection: true,
    defines: {
          bodyInfosTextureResolution: 'vec2( ' + world.textures.bodyInfos.width.toFixed( 1 ) + ', ' + world.textures.bodyInfos.width.toFixed( 1 ) + " )",
          bodyTextureResolution: 'vec2(' + world.bodyTextureSize.toFixed(1) + ',' + world.bodyTextureSize.toFixed(1) + ')',
          resolution: 'vec2(' + world.particleTextureSize.toFixed(1) + ',' + world.particleTextureSize.toFixed(1) + ')'
      }} );
  /*  material.userData.outlineParameters = {
     	thickness: 0.01,
     	color: [ 0, 0, 0 ],
     	alpha: 0.8,
     	visible: true,
     	keepAlive: true
     };
     */
  //base color ?uBaseColor
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
/*
  var outlinePass = new THREE.OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
  outlinePass.edgeStrength = Number( 10 );
  outlinePass.edgeGlow = Number( 0);
  outlinePass.edgeThickness = Number( 1 );
  outlinePass.pulsePeriod = Number( 0 );
  outlinePass.visibleEdgeColor.set( "#ffffff" );
  outlinePass.hiddenEdgeColor.set( "#000000" );
  outlinePass.selectedObjects = selectedObject;
  composer.addPass( outlinePass );
*/
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

function GP_defaultLight(){
  light = new THREE.DirectionalLight();
  light.castShadow = true;
  light.shadow.mapSize.width = light.shadow.mapSize.height = 1024;
  var d = 0.5;
  light.shadow.camera.left = - d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = - d;
  light.shadow.camera.far = 1000;
  light.position.set(1,1,1);
  scene.add(light);

  ambientLight = new THREE.AmbientLight( 0xa6a4a4 );
  //scene.add( ambientLight );
  //white ?
}

function GP_setupLight(){
  // LIGHTS
	hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.7 );
	hemiLight.color.setHSL( 0.6, 1, 0.6 );
	hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
	hemiLight.position.set( 0, 2, 0 );
	scene.add( hemiLight );
	//hemiLightHelper = new THREE.HemisphereLightHelper( hemiLight, 10 );
	//scene.add( hemiLightHelper );
	//
	//dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
	light.color.setHSL( 0.1, 1, 0.95 );
	light.position.set( - 1, 1.75, 1 );
	light.position.multiplyScalar( 30 );
	//scene.add( dirLight );
	light.castShadow = true;
	light.shadow.mapSize.width = 2048;
	light.shadow.mapSize.height = 2048;
	/*var d = 50;
	dirLight.shadow.camera.left = - d;
	dirLight.shadow.camera.right = d;
	dirLight.shadow.camera.top = d;
	dirLight.shadow.camera.bottom = - d;
	dirLight.shadow.camera.far = 3500;
	dirLight.shadow.bias = - 0.0001;
  */
	//dirLightHeper = new THREE.DirectionalLightHelper( light, 10 );
	//scene.add( dirLightHeper );
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
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.context.getExtension("EXT_frag_depth");
  renderer.setPixelRatio(window.devicePixelRatio || 1 );
  renderer.setSize( 2048, 2048 );//full size ?
  renderer.shadowMap.enabled = true;
  renderer.shadowMapEnabled = true;
  renderer.gammaInput = true;
  renderer.gammaOutput = true;
  renderer.physicallyBasedShading = false;
  renderer.localClippingEnabled = true;
  clipPlanes = [
    new THREE.Plane( new THREE.Vector3( 0, 0, 1 ), 0 )
    //new THREE.Plane( new THREE.Vector3( 0, - 1, 0 ), 0 ),
    //new THREE.Plane( new THREE.Vector3( 0, 0, - 1 ), 0 )
  ];
  clipPlanesHelper= [
    new THREE.Plane( new THREE.Vector3( 0, 0, 1 ), 0 )
    //new THREE.Plane( new THREE.Vector3( 0, - 1, 0 ), 0 ),
    //new THREE.Plane( new THREE.Vector3( 0, 0, - 1 ), 0 )
  ];
  //container.setAttribute("class", "show");
  container.appendChild( renderer.domElement );
  window.addEventListener( 'resize', GP_onWindowResize, false );

  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '90%';
  container.appendChild( stats.domElement );

  scene = window.mainScene = new THREE.Scene();
  scene.background = new THREE.Color("rgb(255, 255, 255)");//new THREE.Color( 0x050505 );
  scene.fog = new THREE.Fog( "rgb(255, 255, 255)", 2000, 3500 );
  //renderer.setClearColor(0x050505, 1.0);
  //renderer.setClearColor(0xffffff, 1.0);//ambientLight.color,

  //Lighting
  GP_defaultLight();
  GP_setupLight();

  camera = new THREE.PerspectiveCamera( 30, dm.width / dm.height, 0.01, 100 );
  camera.position.set(0,0.6,1.4);

  var groundMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x000000 } );
  groundMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2000, 2000 ), groundMaterial );
  groundMesh.rotation.x = - Math.PI / 2;
  groundMesh.receiveShadow = true;
  groundMesh.position.set(0.0,-0.5,0.0);
  scene.add( groundMesh );

  var clipMaterial = new THREE.MeshPhongMaterial( { color: 0xff0000, side: THREE.DoubleSide, wireframe:true } );
  clipPlane = new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.75, 0.75 ), clipMaterial );
  //clipPlane.rotation.x = - Math.PI / 2;
  groundMesh.receiveShadow = true;
  clipPlane.position.set(0.0,0.0,0.0);

  //clipPlane = new THREE.PlaneHelper( clipPlanesHelper[ 0 ], 0.5, 0xff0000 )
  scene.add( clipPlane );

  // Add controls
  controls = new THREE.OrbitControls( camera, renderer.domElement );
  controls.enableZoom = true;
  controls.target.set(0.0, 0.1, 0.0);
  //controls.maxPolarAngle = Math.PI * 0.5;

  //add raycaster and mouse
  if (!raycaster) raycaster = new THREE.Raycaster();
  if (!gp_mouse) gp_mouse = new THREE.Vector2();
  //THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });
  //effect = new THREE.OutlineEffect( renderer );
  GP_onWindowResize();
}

//1024,1024,128
function GP_initWorld(){
    //numParticles = nparticles ? nparticles : 64;
    //copy_number = ncopy ? ncopy : 10;
    //atomData_do = doatom ? doatom : false;
    var r = 30.0 ;// (radius in angstrom)
    var gridResolution = new THREE.Vector3();
    gridResolution.set(numParticles/2, numParticles/2, numParticles/2);
    var numBodies = 512;//numParticles / 2;
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
        maxParticles: 1024  *  1024 ,
        radius: radius,
        stiffness: 1700,
        damping: 30,//6,
        fixedTimeStep: 0.001,//1/120,
        friction: 3,//2,
        drag: 0.3,
        boxSize: boxSize,
        gridPosition: new THREE.Vector3(-boxSize.x,-0.5,-boxSize.z),//-boxSize.x,-boxSize.y,-boxSize.z),(-0.5,0.0,-0.5)
        gridResolution: gridResolution
    });
    world.callback.push(GP_gpuCombineGrid);
    world.callback_toggle.push(false);
    // Interaction sphere
    world.setSphereRadius(0, 0.25);
    world.setSpherePosition(0,-boxSize.x,-0.5,-boxSize.z);
}

function GP_updateDebugBeadsSpheres(){
  debugMesh.geometry.maxInstancedCount = (world.particleCount !==0)? world.particleCount : world.maxParticles;
  var instanceInfos = new THREE.InstancedBufferAttribute( new Float32Array( debugMesh.geometry.maxInstancedCount * 1 ), 1, true, 1 );
  //var instancepositions = new THREE.InstancedBufferAttribute( new Float32Array( debugGeometry.maxInstancedCount * 1 ), 1, true, 1 );
  for ( var i = 0, ul = instanceInfos.count; i < ul; i++ ) {
      instanceInfos.setX( i, i );
  }
  debugMesh.geometry.attributes.instanceInfos.copy(instanceInfos);//addAttribute( 'instanceInfos', instanceInfos );
  debugMesh.geometry.attributes.instanceInfos.needsUpdate = true;
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
    debugGeometry.maxInstancedCount = (world.particleCount !==0)? world.particleCount : world.maxParticles;
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
    uniforms.bodyPosTex = { value: world.dataTextures.bodyPositions };
    uniforms.bodyInfosTex = { value: world.dataTextures.bodyInfos };
    uniforms.cameraNear =   { value: camera.near };
    uniforms.cameraFar = { value: camera.far };
    uniforms.radius = { value: world.radius };
    var defines = world.getDefines();
    defines.DEPTH_PACKING=3201;
    var debugMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: sharedShaderCode.innerText + imposter_vertex,
    		fragmentShader: imposter_fragment,
        side: THREE.DoubleSide,
        lights: true,
        depthWrite: true,
        transparent: false,
        clipping: true,
        clippingPlanes: clipPlanes,
        clipIntersection: true,
        defines: defines
        //{
          //USE_MAP: true,
          //DEPTH_PACKING: 3201,
          //bodyTextureResolution: 'vec2(' + world.bodyTextureSize.toFixed(1) + ',' + world.bodyTextureSize.toFixed(1) + ')',
          //resolution: 'vec2(' + world.particleTextureSize.toFixed(1) + ',' + world.particleTextureSize.toFixed(1) + ')'
      //}
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
    var beta = 0.5;
    var gamma = 0.2;
    var alpha = 0.5;
    var specularShininess = Math.pow( 2, alpha * 10 );
    var amaterial = new THREE.MeshToonMaterial({
      specular:new THREE.Color( beta * 0.2, beta * 0.2, beta * 0.2 ),
      reflectivity: beta,
			shininess: specularShininess
    });
    //new THREE.MeshPhongMaterial({ color: 0xffffff })
    var toonMaterial1 = createShaderMaterial( "toon1", light, ambientLight ),
        toonMaterial2 = createShaderMaterial( "toon2", light, ambientLight ),
			hatchingMaterial = createShaderMaterial( "hatching", light, ambientLight ),
			hatchingMaterial2 = createShaderMaterial( "hatching", light, ambientLight ),
			dottedMaterial = createShaderMaterial( "dotted", light, ambientLight );
      //toonMaterial1 = createMeshIngrMaterial(amaterial, light, ambientLight),
			//dottedMaterial2 = createShaderMaterial( "dotted", light, ambientLight );
      toonMaterial1.uniforms.uBaseColor.value.setHSL( 0.4, 1, 0.75 );
			hatchingMaterial2.uniforms.uBaseColor.value.setRGB( 0, 0, 0 );
			hatchingMaterial2.uniforms.uLineColor1.value.setHSL( 0, 0.8, 0.5 );
			hatchingMaterial2.uniforms.uLineColor2.value.setHSL( 0, 0.8, 0.5 );
			hatchingMaterial2.uniforms.uLineColor3.value.setHSL( 0, 0.8, 0.5 );
			hatchingMaterial2.uniforms.uLineColor4.value.setHSL( 0.1, 0.8, 0.5 );
			//dottedMaterial2.uniforms.uBaseColor.value.setRGB( 0, 0, 0 );
			dottedMaterial.uniforms.uLineColor1.value.setHSL( 0.05, 1.0, 0.5 );

      all_materials = {
        "toon1" :{
  				m: toonMaterial1,
  				h: 0.4, s: 1, l: 0.75
  			},
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
		};
    // Mesh material - extend the phong shader
    var meshUniforms = THREE.UniformsUtils.clone(phongShader.uniforms);//phongShader.uniforms);
    meshUniforms.bodyQuatTex = { value: world.dataTextures.bodyQuaternions };
    meshUniforms.bodyPosTex = { value: world.dataTextures.bodyPositions };
    meshUniforms.bodyInfosTex = { value: world.dataTextures.bodyInfos };
    meshUniforms.uBaseColor= { value:new THREE.Color(0.2,0.2,0.2)};
    meshMaterial = new THREE.ShaderMaterial({
        uniforms: meshUniforms,
        vertexShader: sharedShaderCode.innerText + renderBodiesVertex.innerText,
        fragmentShader:phongShader.fragmentShader,//all_materials["dotted"].m.fragmentShader,//phongShader.fragmentShader,// fragmentShader.innerText,//phongFragmentShaderCode.innerText,//phongShader.fragmentShader,
        lights: true,
        vertexColors: true,
        clipping: true,
        clippingPlanes: clipPlanes,
        clipIntersection: true,
        defines: {
            bodyInfosTextureResolution: 'vec2( ' + world.textures.bodyInfos.width.toFixed( 1 ) + ', ' + world.textures.bodyInfos.width.toFixed( 1 ) + " )",
            bodyTextureResolution: 'vec2(' + world.bodyTextureSize.toFixed(1) + ',' + world.bodyTextureSize.toFixed(1) + ')',
            resolution: 'vec2(' + world.particleTextureSize.toFixed(1) + ',' + world.particleTextureSize.toFixed(1) + ')'
        }
    });
    //var toonMat = new THREE.MeshToonMaterial( {
								//map: imgTexture,
								//bumpMap: imgTexture,
								//bumpScale: bumpScale,
								//color: diffuseColor,
								//specular: specularColor,
								//reflectivity: beta,
								//shininess: specularShininess,
								//envMap: alphaIndex % 2 === 0 ? null : reflectionCube
		//					} );

    all_materials["default"] = {m:meshMaterial,h: 0.1, s: 1, l: 0.5};
    //all_materials["meshtoon"] = {m:amaterial,h: 0.1, s: 1, l: 0.5};
    current_material = "default";//"toon2";

    customDepthMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
            THREE.ShaderLib.depth.uniforms,
            meshUniforms
        ]),
        vertexShader: sharedShaderCode.innerText + renderBodiesDepth.innerText,
        fragmentShader: THREE.ShaderLib.depth.fragmentShader,
        clipping: true,
        clippingPlanes: clipPlanes,
        clipIntersection: true,
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
        else if (this.object === clipPlane){
          //update the uniform  describing the cliping plane
          clipPlanes[0].copy(clipPlanesHelper[0]);
          clipPlanes[0].normal.applyQuaternion(clipPlane.quaternion);
          clipPlanes[0].translate(clipPlane.position);
          //rotation ?
          //clipPlanes[0].copy(clipPlanesHelper[0]);
          //clipPlanes[0].applyMatrix4(clipPlane.matrix);
        }
        else if (this.object.ismb) {
            //update the metaball and the grid
            var mb_id = this.object.mb_id;
            nodes[this.object.comp_id].data.pos[0].coords[mb_id*3]=this.object.position.x/ascale;
            nodes[this.object.comp_id].data.pos[0].coords[mb_id*3+1]=this.object.position.y/ascale;
            nodes[this.object.comp_id].data.pos[0].coords[mb_id*3+2]=this.object.position.z/ascale;
            //need world position coordinate
            GP_updateMBCompartment(nodes[this.object.comp_id]);
            //GP_CombineGrid();
            //use gpu tell update needed
            //GP_gpuCombineGrid();
            gp_updateGrid = true;
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
      GP_WarmUp();
      animate();
    }
}

function GP_onWindowResize() {
  if (!renderer) return;
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
  renderer.setPixelRatio( window.devicePixelRatio );
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
function GP_WarmUp(){
  console.log("Warm Up");
  //update the metaball using gpu
  for (var i=0;i<1;i++)
  {
    console.log("Warm Up",i);
    world.step(0.01);
    //world.resetGridCompartmentMB();
    //world.flushGridData();
    //GP_gpuCombineGrid();
  }
}

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
        //do we need to redo the compartment grid
        world.step( deltaTime );
        if (gp_updateGrid) {
          //world.callback_toggle[0] = true;
          world.resetGridCompartmentMB();
          world.flushGridData();
          GP_gpuCombineGrid();
          gp_updateGrid = false;
        }
        else {
          world.callback_toggle[0] = false;
        }
    }
    else {
      if(!rb_init) {
        //warm up
        GP_WarmUp();
        rb_init = true;
      }
      if (gp_updateGrid) {
        //world.callback_toggle[0] = true;
        world.resetGridCompartmentMB();
        world.flushGridData();
        GP_gpuCombineGrid();
        gp_updateGrid = false;
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
  var indices = [];
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
    var v = master_grid_field[i*4+3];//-1,1
    //map value v ?
    var vx = ( x / n ) + 0.5;
    var vy = ( y / n ) + 0.5;
    var vz = ( z / n ) + 0.5;
    var c = v;
    if (v <= 0.0) color.setRGB( v, 0, 0 );
    else if (v > 0.0) color.setRGB( 0, 0, v );
    colors.push( color.r, color.g, color.b );
    indices.push(i);
  }
  geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
  geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
  geometry.addAttribute( 'indices', new THREE.Float32BufferAttribute( indices, 1 ) );
  geometry.computeBoundingSphere();
  //with clipping plane
  //pass the grid data texture
  //update with world.textures.gridIdsRead.texture
  var sh_material = new THREE.ShaderMaterial({
      uniforms: {
          psize:  { value: world.radius*8},
          gridIdTex: { value: world.dataTextures.gridIds},
          cellSize: { value: new THREE.Vector3(world.radius*2,world.radius*2,world.radius*2) },
          gridPos: { value: world.broadphase.position },
          colorMode: { value: gridcolor},
          gridSize: {value:world.broadphase.resolution.x}
          },
      clipping: true,
      clippingPlanes: clipPlanes,
      clipIntersection: true,
      vertexShader: points_vertex,
      fragmentShader: points_fragment,
      defines: {
        gridIdTextureSize: 'vec2(' + world.dataTextures.gridIds.image.width + ', ' + world.dataTextures.gridIds.image.height + ')',
        gridResolution: 'vec3( ' + world.broadphase.resolution.x.toFixed( 1 ) + ', ' + world.broadphase.resolution.y.toFixed( 1 ) + ', ' + world.broadphase.resolution.z.toFixed( 1 ) + " )"
      }
  });
  var material = new THREE.PointsMaterial( {
    size: world.radius*8,
    vertexColors: THREE.VertexColors,
    clippingPlanes: clipPlanes,
    clipIntersection: true } );
  points = new THREE.Points( geometry, sh_material );
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
  //create debug sprite
  //var textureLoader = new THREE.TextureLoader();
  //var mapB = textureLoader.load( "images/Pane.png" );
  var arenderTexture = new THREE.SpriteMaterial( { map: world.textures.gridIdsRead.texture} );//, alignment: THREE.SpriteAlignment.topLeft
  gridSprite = new THREE.Sprite( arenderTexture );
  gridSprite.position.set( -0.5, 0, 0 );
  gridSprite.scale.set(2024*ascale, 2024*ascale, 1.0 ); // imageWidth, imageHeight
  //scene.add( gridSprite );
}

function updateDebugGrid(){
  debugGridMesh.position.copy(world.broadphase.position);
}

function render() {
    controls.update();

    // Render main scene
    updateDebugGrid();
    if(controller.renderMeshs) {
      all_materials[ current_material ].m.uniforms.bodyPosTex.value = world.bodyPositionTexture;
      all_materials[ current_material ].m.uniforms.bodyQuatTex.value = world.bodyQuaternionTexture;
      all_materials[ current_material ].m.uniforms.bodyInfosTex.value = world.textures.bodyInfos.texture;
      customDepthMaterial.uniforms.bodyPosTex.value = world.bodyPositionTexture;
      customDepthMaterial.uniforms.bodyQuatTex.value = world.bodyQuaternionTexture;
        }
    if (cv_Material && atomData_do && controller.renderAtoms) {
      cv_Material.uniforms.bodyPosTex.value = world.bodyPositionTexture;
      cv_Material.uniforms.bodyQuatTex.value = world.bodyQuaternionTexture;
      //cv_Material.uniforms.atomPositionsTex.value = atomData;
    }
    //use local particle and instance at
    if (debugMesh && controller.renderParticles) {
      debugMesh.material.uniforms.particleWorldPosTex.value = world.particlePositionTexture;
      debugMesh.material.uniforms.quatTex.value = world.bodyQuaternionTexture;
      debugMesh.material.uniforms.bodyPosTex.value = world.bodyPositionTexture;
    }

    if (gridSprite) {
      gridSprite.material.map = world.textures.gridIdsRead.texture;
      gridSprite.material.needsUpdate = true;
    }
    if (gridPoints) {
        gridPoints.material.uniforms.gridIdTex.value = world.textures.gridIdsRead.texture;
        gridPoints.material.uniforms.colorMode.value = gridcolor;
        gridPoints.material.needsUpdate = true;
    }
    //gridSprite.material.uniforms.res.value.set(world.dataTextures.gridIds.image.width,world.dataTextures.gridIds.image.height);
    //gridSprite.material.uniforms.texture.value = world.textures.gridIdsRead.texture;
    gridSprite.material.needsUpdate = true;
    //GP_alignSprite();
    composer.render();//or scene ?
    //effect.render( scene, camera );
    //debugMesh.material.uniforms.particleWorldPosTex.value = null;
    //debugMesh.material.uniforms.quatTex.value = null;
}

function GP_alignSprite(){
  var vec = new THREE.Vector3(); // create once and reuse
  var pos = new THREE.Vector3(); // create once and reuse
  vec.set(
    0.1,
    0.8,
    0.0 );

  vec.unproject( camera );
  vec.sub( camera.position );//.normalize();
  var distance = - camera.position.z / vec.z;
  pos.copy( camera.position ).add( vec.multiplyScalar( distance ) );
  gridSprite.position.copy(vec);
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
    switchCompMatTexture: function(){GP_switchTexture();},
    CompMatSide: "DoubleSide",
    CompMatTransparent: false,
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
        /*if (!(meshMeshs[i].eHelper))
        {
          //THREE.EdgesGeometry
          meshMeshs[i].eHelper = new THREE.EdgesHelper( meshMeshs[i], 0xffffff );
          meshMeshs[i].eHelper.material.linewidth = 2;
          scene.add( meshMeshs[i].eHelper );
        }*/
        //meshMeshs[i].material.uniform.uBaseColor = new THREE.Color(nodes[keys[i]].data.color[0],nodes[keys[i]].data.color[1],nodes[keys[i]].data.color[2]);
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
          if (controller.renderSMB && nodes[i].data.comp_geom) scene.add(nodes[i].data.comp_geom);
          else scene.remove(nodes[i].data.comp_geom);
          if (controller.renderIsoMB && nodes[i].data.mesh) scene.add(nodes[i].data.mesh);
          else scene.remove(nodes[i].data.mesh);
      };
    }
    // Shadow rendering
    renderer.shadowMap.autoUpdate = controller.renderShadows;
    if(!controller.renderShadows){
      renderer.setRenderTarget(light.shadow.map);
      renderer.clear();
    //  renderer.clearTarget(light.shadow.map);
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
    if (!triplanarMaterial) return;
    switch(controller.CompMatSide){
      //THREE.FrontSide, THREE.BackSide, or THREE.DoubleSide. Default is null.
      //inverted for metaballs
      case 'DoubleSide':
        triplanarMaterial.side = THREE.DoubleSide;
        break;
      case 'FrontSide':
        triplanarMaterial.side = THREE.BackSide;
        break;
      case 'BackSide':
        triplanarMaterial.side = THREE.FrontSide;
        break;
    }
    //or use slider ?
    //triplanarMaterial.uniforms.opacity = controller.CompMatOpacity;
    triplanarMaterial.transparent = controller.CompMatTransparent;
    //triplanarMaterial.uniforms.opacity = (controller.CompMatTransparent)? 0.5 : 1.0;
  }
  var customContainer = document.getElementById( 'gui-container' );
  GP_guiChanged_cb = guiChanged;
  gui = new dat.GUI({ autoPlace: (customContainer===null) });
  var gh = gui.addFolder( "GPhysics" );

  gh.add( world, "stiffness", 0, 5000, 0.1 );
  gh.add( world, "damping", 0, 100, 0.1 );
  gh.add( world, "drag", 0, 1, 0.01 );
  gh.add( world, "friction", 0, 10, 0.001 );
  gh.add( world, "fixedTimeStep", 0, 0.1, 0.0001 );
  gh.add( controller, "paused" ).onChange( guiChanged );
  gh.add( controller, "gravity", -4, 4, 0.1 ).onChange( guiChanged );
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
  //add compartment material options
  h.add( controller, 'switchCompMatTexture');
  h.add( controller, 'CompMatSide', [ 'DoubleSide', 'FrontSide', 'BackSide' ] ).onChange( guiChanged );
  h.add( controller, 'CompMatTransparent').onChange( guiChanged );

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
  numParticles = query.n ? parseInt(query.n,10) : 128;
  copy_number = query.c ? parseInt(query.c,10) : 10;
  atomData_do = query.atom ? query.atom === 'true' : false;
  init();
}

function GP_initFromNodes(some_nodes,numpart,copy,doatom){
  nodes = some_nodes;//flatten--error ?
  console.log(nodes);
  numParticles = numpart;
  copy_number = copy;
  atomData_do = doatom;
  if (inited) {
    nodes = some_nodes;
    //rb_init = false;
    world.resetData();
    //reset the dataTexture
    //everything already initialize. just update.
    distributesMesh();
    world.updateMapParticleToBodyMesh();
    world.flushData();
    world.singleStep();
    animate();
    //world.bodyCount = num_instances;
    //world.particleCount = particle_id_Count;

    //need update instead.
    //or should the update automatic?
    //for now try to clean everything ?
    return;
  }
  else {
    init();
    inited = true;
    var pbutton = document.getElementById("preview_button");
    pbutton.innerHTML = "Update Preview"
  }
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
    //o
    if (keyCode == 80){
      controller.paused=!controller.paused;
      gui.updateDisplay();
    }
    //p
    if (keyCode == 79){
      saoPass1.params.output = (saoPass1.params.output===THREE.SAOPass.OUTPUT.Beauty)? THREE.SAOPass.OUTPUT.Default:THREE.SAOPass.OUTPUT.Beauty;
      gui.updateDisplay();
  }
/*"W" translate | "E" rotate | "R" scale | "+" increase size | "-" decrease size
"Q" toggle world/local space | Hold "Ctrl" down to snap to grid
"X" toggle X | "Y" toggle Y | "Z" toggle Z | "Spacebar" toggle enabled
*/
  if (!inited) return;
  switch ( keyCode ) {
      case 81: // Q
        control.setSpace( gizmo.space === "local" ? "world" : "local" );
        break;
      case 17: // Ctrl
        gizmo.setTranslationSnap( 100 );
        gizmo.setRotationSnap( THREE.Math.degToRad( 15 ) );
        break;
      case 87: // W
        gizmo.setMode( "translate" );
        break;
      case 69: // E
        gizmo.setMode( "rotate" );
        break;
      case 82: // R
        gizmo.setMode( "scale" );
        break;
      case 187:
      case 107: // +, =, num+
        gizmo.setSize( gizmo.size + 0.1 );
        break;
      case 189:
      case 109: // -, _, num-
        gizmo.setSize( Math.max( control.size - 0.1, 0.1 ) );
        break;
      case 88: // X
        gizmo.showX = !gizmo.showX;
        break;
      case 89: // Y
        gizmo.showY = !gizmo.showY;
        break;
      case 90: // Z
        gizmo.showZ = !gizmo.showZ;
        break;
      case 32: // Spacebar
        gizmo.enabled = !gizmo.enabled;
        break;
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
      intersects = raycaster.intersectObjects( [clipPlane] );
      if ( intersects.length > 0 ) {
        gizmo.attach(intersects[0].object);
      }
      else if (interactionSphereMesh) {
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
document.addEventListener( "keydown", GP_onDocumentKeyDown, false);

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
