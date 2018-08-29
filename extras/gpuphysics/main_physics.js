//http://mgldev.scripps.edu/projects/mesoscopebeta/template.html?n=256&c=10&atom=false
//http://mgldev.scripps.edu/projects/mesoscopebeta/template.html?scene=0&n=128&atom=true&c=10
// TODO:
// compartments
// compartments-forces
// fiber
// fiber-forces
//var loading_bar;
//http://iquilezles.org/www/articles/distfunctions/distfunctions.htm
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
                              (center.y*ascale-world.broadphase.position.y+0.5)*n,
                              (center.z*ascale-world.broadphase.position.z)*n,bsize*n,n);

        nodes[i].data.mc.bb= bb;
        var x, y, z, y_offset, z_offset, fx, fy, fz, fz2, fy2, val;
        for (x = bb.min_x; x < bb.max_x; x++) {
            for (y = bb.min_y; y < bb.max_y; y++) {
                for (z = bb.min_z; z < bb.max_z; z++) {
                    var u = Util_getUfromIJK(x,y,z,n);
                    //var u = x + off;//y_offset + x;//this.field[y_offset + x] += val;
                    //var q = nodes[i].data.mc.getUfromXYZ( ((x/n-boxSize.x)/ascale),
                    //                                      ((y/n-boxSize.y)/ascale),
                    //                                      ((z/n-boxSize.z)/ascale) );
                    var q = nodes[i].data.mc.getUfromXYZ( ((x*world.radius+world.broadphase.position.x)/ascale),
                                                          ((y*world.radius+world.broadphase.position.y)/ascale),
                                                          ((z*world.radius+world.broadphase.position.z)/ascale) );
                    var e = nodes[i].data.mc.field[q];
                    //if ( e  >= nodes[i].data.mc.isolation) {//-1 && e < nodes[i].data.mc.isolation+1){
                    if ( e  >= 0) {//-1 && e < nodes[i].data.mc.isolation+1){
                      //master_grid_field[u*4+3] = e;
                      //master_grid_field[u*4] = nodes[i].data.mc.normal_cache[q * 3];
                      //master_grid_field[u*4+1] = nodes[i].data.mc.normal_cache[q * 3+1];
                      //master_grid_field[u*4+2] = nodes[i].data.mc.normal_cache[q * 3+2];
                      master_grid_id[u] = counter;
                      nodes[i].data.compId=counter;
                      //console.log("inside");
                    }
                }
            }
        }
        //
    }
    else continue;
  }

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

function GP_createOneCompartmentMesh(anode) {
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
  /*for (var s=0;s<anode.data.radii[0].radii.length;s++){
    //create one sphere per metaballs as well
    var aSphereMesh = new THREE.Mesh(new THREE.SphereBufferGeometry(1,16,16),
                                   new THREE.MeshPhongMaterial({ color: 0xffffff }));
    aSphereMesh.position.set(anode.data.pos[0].coords[s*3]*ascale+world.broadphase.position.x,
                            anode.data.pos[0].coords[s*3+1]*ascale+world.broadphase.position.y,
                            anode.data.pos[0].coords[s*3+2]*ascale+world.broadphase.position.z);
    aSphereMesh.scale.set(anode.data.radii[0].radii[s]*ascale,anode.data.radii[0].radii[s]*ascale,anode.data.radii[0].radii[s]*ascale);
    scene.add(aSphereMesh);
  }*/
  anode.data.mc.update(anode.data.pos[0].coords,anode.data.radii[0].radii);
  //NGL_updateMetaBallsGeom(anode);
  var geo = anode.data.mc.generateGeometry();
  anode.data.geo = geo;
  anode.data.vol = anode.data.mc.computeVolumeInside();
  var bufferGeometry = new THREE.BufferGeometry();
  var positions = new Float32Array(geo.vertices);
  var normals = new Float32Array(geo.normals);
  bufferGeometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
  bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3));
  //bufferGeometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
  bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(geo.faces), 1));
  //bufferGeometry.scale(ascale,ascale,ascale);
  //bufferGeometry.scale(ngl_marching_cube.data_bound.maxsize,
  //                    ngl_marching_cube.data_bound.maxsize,
  //                    ngl_marching_cube.data_bound.maxsize);//this is the scale,
  //shapeComp.setPosition(ngl_marching_cube.data_bound.center);//this is the position,
  var wireframeMaterial = new THREE.MeshBasicMaterial({ wireframe: true });
  var compMesh = new THREE.Mesh(bufferGeometry, wireframeMaterial);//new THREE.MeshPhongMaterial({ color: 0xffffff }));
  compMesh.scale.x = anode.data.mc.data_bound.maxsize*ascale;
  compMesh.scale.y = anode.data.mc.data_bound.maxsize*ascale;
  compMesh.scale.z = anode.data.mc.data_bound.maxsize*ascale;
  compMesh.position.x = world.broadphase.position.x-anode.data.mc.data_bound.min.x*ascale+w/2.0;//+w/2.0;//center of the box
  compMesh.position.y = world.broadphase.position.y-anode.data.mc.data_bound.min.y*ascale+h/2.0;//+h/2.0;
  compMesh.position.z = world.broadphase.position.z-anode.data.mc.data_bound.min.z*ascale+d/2.0;//+d/2.0;
  scene.add(compMesh);
  return compMesh;
}

function distributesMesh(){
  var n = nodes.length;
  var start = 0;
  var total = 0;
  var count = 0;//total ?
  //build the compartments
  for (var i=0;i<n;i++){//nodes.length
    if (!nodes[i].parent)
      {
        nodes[i].data.vol = ComputeVolume(nodes[i]);
        continue;
      }
    if ((nodes[i].children !== null) && (nodes[i].data.nodetype === "compartment")) {
        //use NGL to load the object?
        nodes[i].data.mesh = GP_createOneCompartmentMesh(nodes[i]);
        //remove volume from parent volume
        nodes[i].parent.data.vol = nodes[i].parent.data.vol - nodes[i].data.vol;
        continue;
    };
  }

  //build master grid with everything? should align with gpu_grid
  GP_CombineGrid();

  for (var i=0;i<n;i++){//nodes.length
    console.log(i,nodes[i].data.name);
    if (nodes[i].data.ingtype == "fiber") continue;
    if (nodes[i].children!== null && nodes[i].parent === null) continue;
    if ((nodes[i].children !== null) && (nodes[i].data.nodetype === "compartment")) {
        //use NGL to load the object?
        //nodes[i].data.mesh = GP_createOneCompartmentMesh(nodes[i]);
        continue;
    };
    continue;
    if (nodes[i].data.surface) continue;
    if (!nodes[i].parent.parent) continue;
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
      if (nodes[i].data.surface && nodes[i].parent.data.mesh)
           count = (Util_getRandomInt( nodes[i].parent.data.geo.faces.length/3 )+1)/10;
      else count = Util_getRandomInt( copy_number )+1;//remove root
    }
    //count = Util_getRandomInt( copy_number )+1;//remove root
    console.log(nodes[i].data.name,count);
    createInstancesMesh(i,nodes[i],start,count);
    start = start + count;
    total = total + count;
  }
  if (atomData_do) createCellVIEW();
  console.log ( "there is instances ",total);
  console.log ( "there is atoms ",num_beads_total);
  num_instances = total;
  console.log(type_meshs[instance_infos[0]]);

  var keys = Object.keys(type_meshs);
  var nMeshs = keys.length;
  for (var i=0;i<nMeshs;i++) {
      var amesh = new THREE.Mesh( type_meshs[keys[i]], all_materials[current_material].m );
      amesh.frustumCulled = false; // Instances can't be culled like normal meshes
      // Create a depth material for rendering instances to shadow map
      amesh.customDepthMaterial = customDepthMaterial;
      amesh.castShadow = true;
      amesh.receiveShadow = true;
      meshMeshs.push(amesh);
      scene.add( amesh );
      console.log("mesh builded",keys[i]);
  }


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
	//geometry.addAttribute( 'offset', new THREE.InstancedBufferAttribute( new Float32Array( offsets ), 3 ) );
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(tri_mesh.indices), 1));
  geometry.addAttribute( 'uv', new THREE.Float32BufferAttribute( new Float32Array( tri_mesh.uv ), 2 ) );
	//geometry.addAttribute( 'color', new THREE.InstancedBufferAttribute( new Float32Array( colors ), 4 ) );
	//geometry.addAttribute( 'orientationStart', new THREE.InstancedBufferAttribute( new Float32Array( orientationsStart ), 4 ) );
	//geometry.addAttribute( 'orientationEnd', new THREE.InstancedBufferAttribute( new Float32Array( orientationsEnd ), 4 ) );
	// material
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(tri_mesh.triangles), 1));
  var instanceInfos = new THREE.InstancedBufferAttribute(
    new Float32Array( atomData_mapping_instance.slice(0,instances*2) ), 2, 1 );
  //aGeometry.addAttribute( 'bodyColor', bodyColors );
  geometry.addAttribute( 'instanceInfos', instanceInfos );
  /*
  var bodyIndices = new THREE.InstancedBufferAttribute( new Float32Array( instances * 1 ), 1, 1  );
  var partIndices = new THREE.InstancedBufferAttribute( new Float32Array( instances * 1 ), 1, 1  );
  var j = 0;
  for ( var i = 0, ul = bodyIndices.count; i < ul; i++ ) {//num_beads_total
      bodyIndices.setX( i, atomData_mapping_instance[j] ); // one index per instance
      partIndices.setX( i, atomData_mapping_instance[j+1] );//rgb of the current anode
      j+=2;
  }
  geometry.addAttribute( 'partIndex', partIndices );
  geometry.addAttribute( 'bodyIndex', bodyIndices );
  */
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
		fragmentShader: document.getElementById( 'xfragmentShader' ).textContent,
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
	//
	cv_Mesh = new THREE.Mesh( geometry, cv_Material );
  //cv_Mesh.material.uniforms.atomPositionsTex.value = atomData;
  cv_Mesh.frustumCulled = false;
  //cv_Mesh.customDepthMaterial = customDepthMaterial;
  //cv_Mesh.castShadow = true;
  //cv_Mesh.receiveShadow = true;

	scene.add( cv_Mesh );
  scene.remove(cv_Mesh);
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
  var bodyIndices = new THREE.InstancedBufferAttribute( new Float32Array( bodyInstances * 1 ), 1, 1 );
  var bodyColors = new THREE.InstancedBufferAttribute( new Float32Array( bodyInstances * 3 ), 3, 1  );
  for ( var i = 0, ul = bodyIndices.count; i < ul; i++ ) {
      bodyIndices.setX( i, start + i ); // one index per instance
      bodyColors.setXYZ(i,color[0],color[1],color[2]);//rgb of the current anode
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

  if (!(pid in type_meshs) ){
    type_meshs[pid] = createOneMesh(anode,start,count);
    //add bodyType firstaddBodyType
    anode.data.bodyid = world.bodyTypeCount;
    var s = (!anode.data.surface)? 0.0:1.0;
    console.log(s,anode);
    world.addBodyType(s, anode.data.size*ascale,
                      up.x, up.y, up.z,
                      offset.x, offset.y, offset.z);
  }
  if (!anode.parent.data.insides && anode.parent.parent)
  {
     anode.parent.data.insides = master_grid_id.reduce((a, e, i) => (e === anode.parent.data.compId) ? a.concat(i) : a, [])
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
      var ni = new THREE.Vector3( n[vi*3],n[vi*3+1],n[vi*3+2]);
      var rotation = Util_computeOrientation(ni,up);
      var rand_rot = new THREE.Quaternion();
      rand_rot.setFromAxisAngle(up, Math.random() * Math.PI * 2);
      var pos = new THREE.Vector3(v[vi*3]*mscale.x,
                                  v[vi*3+1]*mscale.y,
                                  v[vi*3+2]*mscale.z);
      pos.add(anode.parent.data.mesh.position);
      var roff = new THREE.Vector3(offset.x,offset.y,offset.z);
      roff.applyQuaternion( rotation );
      pos.add(roff);// = pos + QuaternionTransform(rotation,off) ;
      rotation.multiply(rand_rot); // or premultiply
      x=pos.x;y=pos.y;z=pos.z;
      q.copy(rotation);
    }
    else if (anode.parent.data.insides && anode.parent.data.insides.length !==0 )
    {
      var h = Util_halton(bodyId-start,3)*anode.parent.data.insides.length;
      var qi = anode.parent.data.insides[Math.round(h)];//master_grid_id[
      //qi to XYZ
      var ijk = Util_getIJK(qi,world.broadphase.resolution.x);
      //var r = Util_getXYZ(qi,world.broadphase.resolution.x,ascale);
      x = -boxSize.x +ijk[0]/world.broadphase.resolution.x;//r[0];//-boxSize.x +-boxSize.x +
      y = ijk[1]/world.broadphase.resolution.x;//;//-boxSize.y +-boxSize.y +-boxSize.y +
      z = -boxSize.z +ijk[2]/world.broadphase.resolution.x;//;//-boxSize.z +-boxSize.z +
      //console.log(qi,ijk,x,y,z,anode.parent.data.insides.length,h,count);//nan
    }

    var inertia = new THREE.Vector3();
    var mass = 1;

    calculateBoxInertia(inertia, mass, new THREE.Vector3(radius*4,radius*4,radius*2));
    //var pid = Util_getRandomInt(nodes.length-1)+1;//remove root
    //if (nodes[pid].children) {bodyId=bodyId-1;continue;}

    world.addBody(x,y,z, q.x, q.y, q.z, q.w,
                  mass, inertia.x, inertia.y, inertia.z,
                  anode.data.bodyid);
    if (anode.data.radii) {
      if (anode.data.radii && "radii" in anode.data.radii[0]) {
        for (var i=0;i<anode.data.radii[0].radii.length;i++){
            //transform beads
            var x=anode.data.pos[0].coords[i*3]*ascale,
                y=anode.data.pos[0].coords[i*3+1]*ascale,
                z=anode.data.pos[0].coords[i*3+2]*ascale;
            world.addParticle(bodyId, x,y,z);
        }
      }
      else
      {
        for (var i=0;i< anode.data.pos[0].length;i++){
          var p = anode.data.pos[0][i];
          world.addParticle(bodyId, p[0],p[1],p[2]);
        }
      }
    }
    //add the atomic information
    instance_infos.push(pid);
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
  saoPass1.params.saoBlur= false;
  saoPass1.params.saoBlurRadius= 0.5;
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
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio( 1 );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.shadowMap.enabled = true;
  var container = document.getElementById( 'container' );
  container.appendChild( renderer.domElement );
  window.addEventListener( 'resize', onWindowResize, false );

  if (!stage) stage = new NGL.Stage("container");

  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  container.appendChild( stats.domElement );

  scene = window.mainScene = new THREE.Scene();

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

  ambientLight = new THREE.AmbientLight( 0x222222 );
  scene.add( ambientLight );
  renderer.setClearColor(ambientLight.color, 1.0);

  camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 0.01, 100 );
  camera.position.set(0,0.6,1.4);

  /*
  var groundMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x000000 } );
  groundMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2000, 2000 ), groundMaterial );
  groundMesh.rotation.x = - Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add( groundMesh );
  */

  // Add controls
  controls = new THREE.OrbitControls( camera, renderer.domElement );
  controls.enableZoom = true;
  controls.target.set(0.0, 0.1, 0.0);
  controls.maxPolarAngle = Math.PI * 0.5;
}

function GP_initWorld(){
    //numParticles = nparticles ? nparticles : 64;
    //copy_number = ncopy ? ncopy : 10;
    //atomData_do = doatom ? doatom : false;
    var gridResolution = new THREE.Vector3();
    gridResolution.set(numParticles/2, numParticles/2, numParticles/2);
    var numBodies = 1024;//numParticles / 2;
    radius = (1/numParticles * 0.5)*2.0;
    ascale = radius/20;
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
        damping: 6,
        fixedTimeStep: 0.001,//1/120,
        friction: 2,
        drag: 0.3,
        boxSize: boxSize,
        gridPosition: new THREE.Vector3(-boxSize.x,0,-boxSize.z),//-boxSize.x,-boxSize.y,-boxSize.z),(-0.5,0.0,-0.5)
        gridResolution: gridResolution
    });

    // Interaction sphere
    world.setSphereRadius(0, 0.25);
    world.setSpherePosition(0, 0,0,0);
}

function init(){
    numParticles = query.n ? parseInt(query.n,10) : 64;
    copy_number = query.c ? parseInt(query.c,10) : 10;
    atomData_do = query.atom ? query.atom === 'true' : false;
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

    // Create an instanced mesh for debug spheres
    var sphereGeometry = new THREE.SphereBufferGeometry(world.radius, 8, 8);
    var instances = world.maxParticles;
    var debugGeometry = new THREE.InstancedBufferGeometry();
    debugGeometry.maxInstancedCount = instances;
    for(var attributeName in sphereGeometry.attributes){
        debugGeometry.addAttribute( attributeName, sphereGeometry.attributes[attributeName].clone() );
    }
    debugGeometry.setIndex( sphereGeometry.index.clone() );
    var particleIndices = new THREE.InstancedBufferAttribute( new Float32Array( instances * 1 ), 1, 1 );
    for ( var i = 0, ul = particleIndices.count; i < ul; i++ ) {
        particleIndices.setX( i, i );
    }
    debugGeometry.addAttribute( 'particleIndex', particleIndices );
    debugGeometry.boundingSphere = null;



    // Particle spheres material / debug material - extend the phong shader in three.js
    var phongShader = THREE.ShaderLib.phong;
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

    initDebugGrid();
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
        } else if(this.object === debugGridMesh){
            world.broadphase.position.copy(debugGridMesh.position);
            console.log(world.broadphase.position);
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

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate( time ) {
    if (!(loading_bar)) {
      loading_bar = document.getElementById('loading_bar').ldBar;
      if (loading_bar) loading_bar.set(0);
    }
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
            interactionSphereMesh.position.set( x, y, z );
            world.setSpherePosition( 0, x, y, z );
        }

        world.step( deltaTime );
    }
    else {
      if(!rb_init) {
        world.step(0.001);
        rb_init = true;
      }
    }
    prevTime = time;
}

function initDebugGrid(){
  var w = world.broadphase.resolution.x * world.radius * 2;
  var h = world.broadphase.resolution.y * world.radius * 2;
  var d = world.broadphase.resolution.z * world.radius * 2;
  var boxGeom = new THREE.BoxGeometry( w, h, d );
  var wireframeMaterial = new THREE.MeshBasicMaterial({ wireframe: true });
  debugGridMesh = new THREE.Object3D();
  var mesh = new THREE.Mesh(boxGeom,wireframeMaterial);
  debugGridMesh.add(mesh);
  debugGridMesh.position.copy(world.broadphase.position);
  mesh.position.set(w/2, h/2, d/2);
  scene.add(debugGridMesh);

  var n = world.broadphase.resolution.x;

  var phongShader = THREE.ShaderLib.phong;
  var uniforms = THREE.UniformsUtils.clone(phongShader.uniforms);
  uniforms.size = {value:n};
	var aMaterial = new THREE.ShaderMaterial( {
		uniforms: uniforms,
		vertexShader: document.getElementById( 'gvs' ).textContent,
		fragmentShader: document.getElementById( 'gfs' ).textContent,
    depthWrite: true,

	} );

  var geometry = new THREE.BufferGeometry();
  var indices = [];

  for ( var i = 0; i < n*n*n; i ++ ) {
    indices.push(i);
  }
  geometry.addAttribute( 'uindex', new THREE.Float32BufferAttribute( indices, 1 ) );
  var grid = new THREE.Points( geometry, aMaterial );
	//grid.position.copy(world.broadphase.position);
  //geometry.position.set(w/2, h/2, d/2);
  scene.add(grid);
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
    debugMesh.material.uniforms.particleWorldPosTex.value = world.particlePositionTexture;
    debugMesh.material.uniforms.quatTex.value = world.bodyQuaternionTexture;

    composer.render();
    //renderer.render( scene, camera );

    debugMesh.material.uniforms.particleWorldPosTex.value = null;
    debugMesh.material.uniforms.quatTex.value = null;
}

function calculateBoxInertia(out, mass, extents){
  var c = 1 / 12 * mass;
  out.set(
    c * ( 2 * extents.y * 2 * extents.y + 2 * extents.z * 2 * extents.z ),
    c * ( 2 * extents.x * 2 * extents.x + 2 * extents.z * 2 * extents.z ),
    c * ( 2 * extents.y * 2 * extents.y + 2 * extents.x * 2 * extents.x )
  );
}

function initGUI(){
  controller  = {
    moreObjects: function(){ location.href = "?n=" + (numParticles*2); },
    lessObjects: function(){ location.href = "?n=" + Math.max(2,numParticles/2); },
    paused: true,
    renderAtoms: false,
    renderParticles: false,
    renderMeshs: true,
    renderShadows: true,
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

  gui = new dat.GUI();
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
  gh.add( controller, 'interaction', [ 'none', 'sphere', 'broadphase' ] ).onChange( guiChanged );
  gh.add( controller, 'sphereRadius', boxSize.x/10, boxSize.x/2 ).onChange( guiChanged );

  var h = gui.addFolder( "Materials" );
	for ( var m in all_materials ) {
		controller[ m ] = createHandler( m );
		h.add( controller, m ).name( m );
	}

  setupSSAOGui(gui);

  guiChanged();

  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  document.addEventListener('click', function( event ) {
      mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
      mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
      raycaster.setFromCamera( mouse, camera );
      var intersects = raycaster.intersectObjects( [interactionSphereMesh] );
      if ( intersects.length > 0 ) {
          controller.interaction = 'sphere';
          gui.updateDisplay();
          guiChanged();
      }
  });
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
          console.log(adata);
          root = d3v4.hierarchy(adata.nodes)
            .sum(function(d) { return d.size; })
            .sort(function(a, b) { return b.value - a.value; });
          nodes = pack(root).descendants();//flatten--error ?
          console.log(nodes);
          init();
          })
}

function loadLegacy(url){
  if (stage)stage.removeAllComponents();
  console.log(url);
  d3v4.json(url, function (json) {
          var adata = parseCellPackRecipe(json)
          console.log(adata);
          root = d3v4.hierarchy(adata.nodes)
            .sum(function(d) { return d.size; })
            .sort(function(a, b) { return b.value - a.value; });
          nodes = pack(root).descendants();//flatten--error ?
          console.log(nodes);
          init();
          })
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

(function() {
   // your page initialization code here
   // the DOM will be available here
   initialLoad();
})();

//init();
//animate();
