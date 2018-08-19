var ySpread = 0.1;
var nodes;
var root;
var pack = d3v4.pack()
      .size([600, 600])
      .padding(30);
var stage;
var ascale = 0.065/40;
var instance_infos=[];
var type_meshs={};
var meshMeshs=[];
var world;

var scene, ambientLight, light, camera, controls, renderer;

var debugMesh, debugGridMesh;
var controller;
var boxSize;
var numParticles;
var radius;

var meshMaterial;
var customDepthMaterial;

(function(){




setupRecipe();
//init();
//animate();

function setupRecipe(){
  var url = "data/BloodPlasmaHIV_serialized.json";//cellpack_repo+"recipes/BloodPlasmaHIV_serialized.json";//"https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/recipes/BloodPlasmaHIV_serialized.json";
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
          animate();
          })
}

function createOneMesh(anode,start,count) {
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
  for ( var i = 0, ul = bodyIndices.count; i < ul; i++ ) {
      bodyIndices.setX( i, start + i ); // one index per instance
  }

  meshGeometry.addAttribute( 'bodyIndex', bodyIndices );
  meshGeometry.boundingSphere = null;

  return meshGeometry;
}

function createInstancesMesh(pid,anode,start,count) {
  for (var bodyId=start;bodyId<start+count;bodyId++) {
    var x = -boxSize.x + 2*boxSize.x*Math.random();
    var y = ySpread*Math.random();
    var z = -boxSize.z + 2*boxSize.z*Math.random();

    var q = new THREE.Quaternion();
    var axis = new THREE.Vector3(
        Math.random()-0.5,
        Math.random()-0.5,
        Math.random()-0.5
    );
    axis.normalize();
    q.setFromAxisAngle(axis, Math.random() * Math.PI * 2);

    var inertia = new THREE.Vector3();
    var mass = 1;

    calculateBoxInertia(inertia, mass, new THREE.Vector3(radius*4,radius*4,radius*2));
    //var pid = Util_getRandomInt(nodes.length-1)+1;//remove root
    //if (nodes[pid].children) {bodyId=bodyId-1;continue;}

    world.addBody(x,y,z, q.x, q.y, q.z, q.w, mass, inertia.x, inertia.y, inertia.z);
    for (var i=0;i<anode.data.radii[0].radii.length;i++){
        //transform beads
        var x=anode.data.pos[0].coords[i*3]*ascale,
            y=anode.data.pos[0].coords[i*3+1]*ascale,
            z=anode.data.pos[0].coords[i*3+2]*ascale;
        world.addParticle(bodyId, x,y,z);
    }
    instance_infos.push(pid);
  }
  if (!(pid in type_meshs) ){
    type_meshs[pid] = createOneMesh(anode,start,count);
  }
}

function init(){
    var query = parseParams();
    numParticles = query.n ? parseInt(query.n,10) : 64;
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
    gridResolution.set(64, 64, 64);
    var numBodies = numParticles / 2;
    radius = (1/numParticles * 0.5)*2.0;
    ascale = radius/20;
    boxSize = new THREE.Vector3(0.25, 1, 0.25);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( 1 );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    var container = document.getElementById( 'container' );
    container.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );

    stage = new NGL.Stage("container");

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

    var groundMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x000000 } );
    groundMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2000, 2000 ), groundMaterial );
    groundMesh.rotation.x = - Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add( groundMesh );

    // Add controls
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.enableZoom = true;
    controls.target.set(0.0, 0.1, 0.0);
    controls.maxPolarAngle = Math.PI * 0.5;

    // Physics
    world = window.world = new gp.World({
        maxSubSteps: 1, // TODO: fix
        gravity: new THREE.Vector3(0,0,0),
        renderer: renderer,
        maxBodies: numBodies * numBodies,
        maxParticles: numParticles * numParticles,
        radius: radius,
        stiffness: 1700,
        damping: 6,
        fixedTimeStep: 0.001,//1/120,
        friction: 2,
        drag: 0.3,
        boxSize: boxSize,
        gridPosition: new THREE.Vector3(-boxSize.x,0,-boxSize.z),
        gridResolution: gridResolution
    });

    // Interaction sphere
    world.setSphereRadius(0, 0.05);
    world.setSpherePosition(0, 0,0,0);

    // Add bodies
    console.log("ingredients nodes type",nodes.length);
    //theses are instance ID
    /*var pid = 10;
    for(var bodyId=0; bodyId<20; bodyId++){//world.maxBodies
        var x = -boxSize.x + 2*boxSize.x*Math.random();
        var y = ySpread*Math.random();
        var z = -boxSize.z + 2*boxSize.z*Math.random();

        var q = new THREE.Quaternion();
        var axis = new THREE.Vector3(
            Math.random()-0.5,
            Math.random()-0.5,
            Math.random()-0.5
        );
        axis.normalize();
        q.setFromAxisAngle(axis, Math.random() * Math.PI * 2);

        var inertia = new THREE.Vector3();
        var mass = 1;
        //bounding box of object
        if(bodyId < world.maxBodies / 2){
            calculateBoxInertia(inertia, mass, new THREE.Vector3(radius*2*4,radius*2,radius*2));
        } else {
            calculateBoxInertia(inertia, mass, new THREE.Vector3(radius*4,radius*4,radius*2));
        }
        //var pid = Util_getRandomInt(nodes.length-1)+1;//remove root
        //if (nodes[pid].children) {bodyId=bodyId-1;continue;}

        world.addBody(x,y,z, q.x, q.y, q.z, q.w, mass, inertia.x, inertia.y, inertia.z);
        //world.addBody(0,0,0, q.x, q.y, q.z, q.w, mass, inertia.x, inertia.y, inertia.z);
        //add the beads here

        console.log(pid,nodes[pid].data);
        console.log("radius is ",radius);//radius is  0.0078125
        console.log("box is ",boxSize);//x: 0.25 y: 1 z: 0.25
        //nodes[pid].data.radii[0].radii
        //nodes[pid].data.pos[0].coords
        for (var i=0;i<nodes[pid].data.radii[0].radii.length;i++){
            //transform beads
            var x=nodes[pid].data.pos[0].coords[i*3]*ascale,
                y=nodes[pid].data.pos[0].coords[i*3+1]*ascale,
                z=nodes[pid].data.pos[0].coords[i*3+2]*ascale;
            world.addParticle(bodyId, x,y,z);
        }
        instance_infos.push(pid);
        if (! (pid in type_meshs) ){
          type_meshs[pid] = createOneMesh(nodes[pid],0,10);
        }
    }
    */
    // Add particles to bodies e.g. particles ID
    /*for(var particleId=0; particleId<world.maxParticles; ++particleId){
        var bodyId = Math.floor(particleId / 4);
        var x=0, y=0; z=0;

        if(bodyId < world.maxBodies / 2){
            x = (particleId % 4 - 1.5) * radius * 2.01;
        } else {
            var i = particleId - bodyId * 4;
            x = ((i % 2)-0.5) * radius * 2.01;
            y = (Math.floor(i / 2)-0.5) * radius * 2.01;
        }
        //are theses local?
        world.addParticle(bodyId, x,y,z);
    }
    */
    var n = nodes.length;
    var start = 0;
    var total = 0;
    var count = 500;//total ?
    for (var i=0;i<n;i++){//nodes.length
      if (nodes[i].children) continue;
      count = Util_getRandomInt(3000)+1;//remove root
      createInstancesMesh(i,nodes[i],start,count);
      start = start + count;
      total = total + count;
    }
    console.log ( "there is ",total);
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

    /*
    // Create an instanced mesh for cylinders
    var cylinderGeometry = new THREE.CylinderBufferGeometry(radius, radius, 2*4*radius, 8);
    cylinderGeometry.rotateZ(Math.PI / 2);// particles are spread along x, not y
    var bodyInstances = numBodies*numBodies / 2;
    var meshGeometry = new THREE.InstancedBufferGeometry();
    meshGeometry.maxInstancedCount = bodyInstances;
    for(var attributeName in cylinderGeometry.attributes){
        meshGeometry.addAttribute( attributeName, cylinderGeometry.attributes[attributeName].clone() );
    }
    meshGeometry.setIndex( cylinderGeometry.index.clone() );
    var bodyIndices = new THREE.InstancedBufferAttribute( new Float32Array( bodyInstances * 1 ), 1, 1 );
    for ( var i = 0, ul = bodyIndices.count; i < ul; i++ ) {
        bodyIndices.setX( i, i ); // one index per instance
    }
    meshGeometry.addAttribute( 'bodyIndex', bodyIndices );
    meshGeometry.boundingSphere = null;

    // Create an instanced mesh for boxes
    var boxGeometry = new THREE.BoxBufferGeometry(4*radius, 4*radius, 2*radius, 8);
    var bodyInstances = numBodies*numBodies / 2;
    var boxMeshGeometry = new THREE.InstancedBufferGeometry();
    boxMeshGeometry.maxInstancedCount = bodyInstances;
    for(var attributeName in boxGeometry.attributes){
        boxMeshGeometry.addAttribute( attributeName, boxGeometry.attributes[attributeName].clone() );
    }
    boxMeshGeometry.setIndex( boxGeometry.index.clone() );
    var bodyIndices2 = new THREE.InstancedBufferAttribute( new Float32Array( bodyInstances * 1 ), 1, 1 );
    for ( var i = 0, ul = bodyIndices2.count; i < ul; i++ ) {
        bodyIndices2.setX( i, i + numBodies*numBodies / 2 ); // one index per instance
    }
    boxMeshGeometry.addAttribute( 'bodyIndex', bodyIndices2 );
    boxMeshGeometry.boundingSphere = null;
    */
    // Mesh material - extend the phong shader
    var meshUniforms = THREE.UniformsUtils.clone(phongShader.uniforms);
    meshUniforms.bodyQuatTex = { value: null };
    meshUniforms.bodyPosTex = { value: null };

    meshMaterial = new THREE.ShaderMaterial({
        uniforms: meshUniforms,
        vertexShader: sharedShaderCode.innerText + renderBodiesVertex.innerText,
        fragmentShader: phongShader.fragmentShader,
        lights: true,
        defines: {
            bodyTextureResolution: 'vec2(' + world.bodyTextureSize.toFixed(1) + ',' + world.bodyTextureSize.toFixed(1) + ')',
            resolution: 'vec2(' + world.particleTextureSize.toFixed(1) + ',' + world.particleTextureSize.toFixed(1) + ')'
        }
    });

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
    console.log(type_meshs[instance_infos[0]]);
    var keys = Object.keys(type_meshs);
    var nMeshs = keys.length;
    for (var i=0;i<nMeshs;i++) {
        var amesh = new THREE.Mesh( type_meshs[keys[i]], meshMaterial );
        amesh.frustumCulled = false; // Instances can't be culled like normal meshes
        // Create a depth material for rendering instances to shadow map
        amesh.customDepthMaterial = customDepthMaterial;
        amesh.castShadow = true;
        amesh.receiveShadow = true;
        meshMeshs.push(amesh);
        scene.add( amesh );
    }

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

    initGUI();
    //controller.paused  = true;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate( time ) {
    requestAnimationFrame( animate );
    updatePhysics( time );
    render();
    stats.update();
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
            interactionSphereMesh.position.set( x, y, z );
            world.setSpherePosition( 0, x, y, z );
        }
/*
        // Dynamic spawning
        var x = 0.1*Math.sin(9 * world.fixedTime) + Math.random()*0.05;
        var z = 0.1*Math.cos(10 * world.fixedTime) + Math.random()*0.05;
        var y = 0.3 + 0.05*Math.cos(11 * world.fixedTime);
        world.setBodyPositions([(prevSpawnedBody++) % world.maxBodies], [new THREE.Vector3(x,y,z)]);
*/
        world.step( deltaTime );
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
}

function updateDebugGrid(){
  debugGridMesh.position.copy(world.broadphase.position);
}

function render() {
    controls.update();

    // Render main scene
    updateDebugGrid();

    meshMaterial.uniforms.bodyPosTex.value = world.bodyPositionTexture;
    meshMaterial.uniforms.bodyQuatTex.value = world.bodyQuaternionTexture;

    customDepthMaterial.uniforms.bodyPosTex.value = world.bodyPositionTexture;
    customDepthMaterial.uniforms.bodyQuatTex.value = world.bodyQuaternionTexture;

    debugMesh.material.uniforms.particleWorldPosTex.value = world.particlePositionTexture;
    debugMesh.material.uniforms.quatTex.value = world.bodyQuaternionTexture;

    renderer.render( scene, camera );

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
    paused: false,
    renderParticles: false,
    renderShadows: true,
    gravity: world.gravity.y,
    interaction: 'none',
    sphereRadius: world.getSphereRadius(0)
  };

  function guiChanged() {
    world.gravity.y = controller.gravity;
    if(controller.renderParticles){

      var nMeshs = Object.keys(type_meshs).length;
      for (var i=0;i<nMeshs;i++) {
        scene.remove(meshMeshs[i]);
      }
      scene.add(debugMesh);
    } else {
      scene.remove(debugMesh);
      var nMeshs = Object.keys(type_meshs).length;
      for (var i=0;i<nMeshs;i++) {
        scene.add(meshMeshs[i]);
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
  gui.add( world, "stiffness", 0, 5000, 0.1 );
  gui.add( world, "damping", 0, 100, 0.1 );
  gui.add( world, "drag", 0, 1, 0.01 );
  gui.add( world, "friction", 0, 10, 0.001 );
  gui.add( world, "fixedTimeStep", 0, 0.1, 0.001 );
  gui.add( controller, "paused" ).onChange( guiChanged );
  gui.add( controller, "gravity", -2, 2, 0.1 ).onChange( guiChanged );
  gui.add( controller, "moreObjects" );
  gui.add( controller, "lessObjects" );
  gui.add( controller, "renderParticles" ).onChange( guiChanged );
  gui.add( controller, "renderShadows" ).onChange( guiChanged );
  gui.add( controller, 'interaction', [ 'none', 'sphere', 'broadphase' ] ).onChange( guiChanged );
  gui.add( controller, 'sphereRadius', boxSize.x/10, boxSize.x/2 ).onChange( guiChanged );
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

})();
