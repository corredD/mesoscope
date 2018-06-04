var stage;
var pathList_ = {};
var folder_elem = document.getElementById("file_input");
var rep_elem = document.getElementById("rep_type");
var assambly_elem = document.getElementById("ass_type");
var sele_elem = document.getElementById("sel_str");
var model_elem = document.getElementById("mod_type");
var color_elem = document.getElementById("color_type");
var sym_elem = document.getElementById("sym_elem");
var label_elem = document.getElementById("label_elem");
var beads_elem = document.getElementById("beads_elem");
var heading = document.getElementById("heading");
var grid_viewport = document.getElementById("viewport"); //createElement( "div" );
var pdb_id_elem;
var ngl_current_pickingProxy;
var nlg_preview_isosurface = true;
var pcp_elem = [];
var offset_elem = [];

var use_mglserver_beads = true;

var nLod = 3;
var slidercluster_elem;
var slidercluster_label_elem;
var slidercluster_elem2;
var slidercluster_label_elem2;
var cluster_elem;
var nbBeads_elem;
var ngl_force_build_beads = false;

var current_annotation;
var title_annotation = document.getElementById("pdb_title");


//var beads_checkbox = document.getElementById("beads_check");
//var labels_checkbox = document.getElementById("label_check");

var ngl_load_params = {
  "dogeom": false,
  "geom": null,
  "dobeads": false,
  "beads": {
    "pos": null,
    "rad": null
  },
  "doaxis": false,
  "axis": null
};
var ngl_show_beads;
var ngl_show_beads_level_select;

var ngl_marching_cube;

var ngl_current_structure;
var ngl_current_node;
var ngl_current_item_id;
var ngl_grid_mode = false;
var pcontainer = document.getElementById("NGL") || document.getElementById("NGLpane"); //

var viewport = document.getElementById("viewport");
var ngl_grid_heading = document.getElementById("heading");
var ngl_available_color_schem = [
  "atomindex",
  "bfactor",
  "chainid",
  "chainindex",
  "chainname",
  "densityfit",
  "electrostatic",
  "element",
  "entityindex",
  "entitytype",
  "geoquality",
  "hydrophobicity",
  "modelindex",
  "moleculetype",
  "occupancy",
  "random",
  "residueindex",
  "resname",
  "sstruc",
  "uniform",
  "value",
  "volume"
];


var ngl_styles = ["cartoon","spacefill","licorice","surface"];

var geom_purl = cellpack_repo+"geometries/"

function NGL_GetPDBURL(aname) {
  console.log(aname);
  if (aname.length === 4)
    return "rcsb://" + aname + ".pdb";
  else {
    if (folder_elem && folder_elem.files.length != "") {
      return pathList_[aname]; //alert(pathList_[d.data.source]),
    } else {
      var purl = cellpack_repo+"other/" + aname;
      return purl;
    }
  }
}

function NGL_updatePcpElem() {
  for (var i = 0; i < 3; i++) {
    if (!ngl_load_params.axis) return;
    pcp_elem[i].value = ngl_load_params.axis.axis[i] * 100;
    $(pcp_elem[i]).siblings('.inputNumber').val(pcp_elem[i].value);
    offset_elem[i].value = ngl_load_params.axis.offset[i];
    $(offset_elem[i]).siblings('.inputNumber').val(offset_elem[i].value);
  }
}

function NGL_applyPcp() {
  var axis = [pcp_elem[0].value / 100.0, pcp_elem[1].value / 100.0, pcp_elem[2].value / 100.0];
  var offset = [offset_elem[0].value / 1.0, offset_elem[1].value / 1.0, offset_elem[2].value / 1.0];
  ngl_load_params.axis.axis = axis;
  ngl_load_params.axis.offset = offset;
  //update table and node
  if (ngl_current_item_id) {
    updateDataGridRowElem(0, ngl_current_item_id, "pcpalAxis", axis);
    updateDataGridRowElem(0, ngl_current_item_id, "offset", offset);
  }
  if (node_selected) {
    node_selected.data.pcpalAxis = axis;
    node_selected.data.offset = offset;
    console.log("update node", node_selected);
  } else {
    var arow = gridArray[0].dataView.getItemById(ngl_current_item_id);
    var anode_selected_indice = parseInt(arow.id.split("_")[1]);
    var anode_selected = graph.nodes[node_selected_indice];
    anode_selected.data.pcpalAxis = axis;
    anode_selected.data.offset = offset;
    console.log("update anode", anode_selected);
  }
}

//picking spheres and moving them ?>
//stage.signals.clicked.add(function (pickingProxy) {...});
//type,sphere,mesh,component
//then bind mouse to setPosition?


function updateCubes(object, time, numblobs) {

  object.reset();

  // fill the field with some metaballs
  var i, ballx, bally, ballz, subtract, strength;

  subtract = 12;
  strength = 1.2 / ((Math.sqrt(numblobs) - 1) / 4 + 1);

  for (i = 0; i < numblobs; i++) {

    ballx = Math.sin(i + 1.26 * time * (1.03 + 0.5 * Math.cos(0.21 * i))) * 0.27 + 0.5;
    bally = Math.cos(i + 1.12 * time * 0.21 * Math.sin((0.72 + 0.83 * i))) * 0.27 + 0.5;
    ballz = Math.cos(i + 1.32 * time * 0.1 * Math.sin((0.92 + 0.53 * i))) * 0.27 + 0.5;

    object.addBall(ballx, bally, ballz, strength, subtract);

  }

  object.addBall(0.5, 0.5, 0.5, 1.2, 12);
  object.addBall(0.5, 0.765, 0.5, 1.8, 12);
  return object;
};

function NGL_updateMetaBalls(anode) {
  if (!anode) anode = node_selected;
  if (!anode.data.nodetype === "compartment") return;
  if (!ngl_marching_cube) ngl_marching_cube = new NGL.MarchingCubes(30, null, true, false);
  ngl_marching_cube.reset();
  if (!("pos" in node_selected.data)||(node_selected.data.pos === null)||(node_selected.data.pos.length===0)) {
    anode.data.pos = [{"coords":[0.0,0.0,0.0]}];
    anode.data.radii=[{"radii":[500.0]}];
  }
  //console.log(anode.data);
  //NGL_LoadSpheres(anode.data.pos, anode.data.radii);
  var numblobs = anode.data.radii[0].radii.length;
  subtract = 12;
  strength = 1.2 / ((Math.sqrt(numblobs) - 1) / 4 + 1);
  var p=0;
  //firs scaleExtent
  //find min-max
  /*var points = [];
  var radii = [];
  console.log(typeof anode.data.pos[0].coords[p]);
  for (var i=0;i<numblobs;i++){
      var pos = new NGL.Vector3(anode.data.pos[0].coords[p],
                                anode.data.pos[0].coords[p+1],
                                anode.data.pos[0].coords[p+2]);
      var radius = parseFloat(anode.data.radii[0].radii[i]);
      points.push(pos);
      radii.push(radius);
      p+=3;
  }
  */
  var bounds = Util_ComputeBounds(anode.data.pos[0].coords,anode.data.radii[0].radii);//center,size,min,max
  //console.log(bounds);
  ngl_marching_cube.grid_scale = bounds.maxsize;
  ngl_marching_cube.data_bound = bounds;
  for (var i=0;i<numblobs;i++){
      var ap = new NGL.Vector3(anode.data.pos[0].coords[p],
                                anode.data.pos[0].coords[p+1],
                                anode.data.pos[0].coords[p+2]);
      var apos = ap.sub(bounds.min).divideScalar(bounds.maxsize);//.divide(bounds.size);//.divideScalar(bounds.maxsize);
      var arad = anode.data.radii[0].radii[i]/bounds.maxsize;
      //normalize
      // strength / (radius^2) = subtract
      // strength = subtract * radius^2
      // radius^2 = strength / subtract
      // radius = sqrt(strength / subtract)
      //scale Radius
      //scale Position
      //change isovalue?
      var subtract = 12;
      var strength =  subtract * arad  ;
      ngl_marching_cube.addBall(apos.x,apos.y,apos.z, strength, subtract);//strength, subtract
      p+=3;
  }
}

function NGL_updateMetaBallsGeom(anode)
{
  if (!anode.data.nodetype === "compartment") return;
  if (!("pos" in node_selected.data)||(node_selected.data.pos === null)||(node_selected.data.pos.length===0)) {
    anode.data.pos = [{"coords":[0.0,0.0,0.0]}];
    anode.data.radii=[{"radii":[500.0]}];
  }
  NGL_multiSpheresComp(anode.data.pos[0].coords,anode.data.radii[0].radii);//box around ?
  if (nlg_preview_isosurface){
    if (!ngl_marching_cube) ngl_marching_cube = new NGL.MarchingCubes(30, null, true, false);
    NGL_updateMetaBalls(anode);
    var geo = ngl_marching_cube.generateGeometry();
    console.log(geo);
    NGL_MetaBallsGeom(geo);
  }
}

function NGL_MetaBallsGeom(geo){
  var comp = stage.getComponentsByName("metab_surface");
  if (comp.list) {
    stage.removeComponent(comp.list[0]);
  }
  var shape = new NGL.Shape("metab_surface");
  var col = Array(geo.vertices.length).fill(1);
  shape.addMesh( //position, color, index, normal
    geo.vertices, // a plane
    col, // all green
    geo.faces//,
    //mesh.normals
  );

  var shapeComp = stage.addComponentFromObject(shape);
  shapeComp.setScale(ngl_marching_cube.data_bound.maxsize);//this is the scale,
  shapeComp.setPosition(ngl_marching_cube.data_bound.center);//this is the position,
  var r = shapeComp.addRepresentation("metab_surface", {
    opacity: 0.5,
    side: "double",
    //wireframe: true
  });
}

function NGL_ToggleMetaGeom(e)
{
  var comp = stage.getComponentsByName("metab_surface");
  if (comp.list.length !== 0){
    if (comp.list[0].reprList.length !== 0) {
      comp.list[0].reprList[0].setVisibility(e.checked);
    }
  }
  else
  {
    if (e.checked) {
      NGL_updateMetaBalls(anode);
      var geo = ngl_marching_cube.generateGeometry();
      console.log(geo);
      NGL_MetaBallsGeom(geo);
    }
  }
  nlg_preview_isosurface = e.checked;
}

function NGL_MetaBalls(){
    var resolution = 30;
    //NGL.THREE
    ngl_marching_cube = new NGL.MarchingCubes(resolution, null, true, false);
    //add the metaballs
    ngl_marching_cube = updateCubes(ngl_marching_cube, 0, 10);
    //generate the mesh
    var geo = ngl_marching_cube.generateGeometry();
    console.log(geo);
    console.log(geo.vertices.length + ', ' + geo.faces.length);
    //mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
    //  color: 0xff1234,
    //  wireframe: false
    //}));
    //mesh.scale.set(100, 100, 100);
    //console.log(scene.children.length);
    //scene.add(mesh);
    var comp = stage.getComponentsByName("metab_surface");
    if (comp.list) {
      stage.removeComponent(comp.list[0]);
    }
    var shape = new NGL.Shape("metab_surface");
    var col = Array(geo.vertices.length).fill(1);
    shape.addMesh( //position, color, index, normal
      geo.vertices, // a plane
      col, // all green
      geo.faces//,
      //mesh.normals
    );

    var shapeComp = stage.addComponentFromObject(shape);
    shapeComp.setScale(100);//this is the scale,
    var r = shapeComp.addRepresentation("metab_surface", {
      opacity: 0.5,
      side: "double"
    });
}

function NGL_buildMB() {
  var shapemb = new NGL.Shape("mb");
  //two cylinder one red up, one blue down, center is 0,0,0
  //Sign of Z coordinate is negative at the inner (IN) side and positive at the outer side.
  var radius = 50;
  var Z = 14;
  var thickness = 1.0;
  //axis = [0,0,1];
  shapemb.addCylinder([0, 0, Z - 1], [0, 0, Z + 1], [1, 0, 0], radius, "OUT");
  shapemb.addCylinder([0, 0, -(Z - 1)], [0, 0, -(Z + 1)], [0, 0, 1], radius, "IN");

  var shapembComp = stage.addComponentFromObject(shapemb);
  shapembComp.name = "mb";
  var r = shapembComp.addRepresentation("membrane");
}

function NGL_updateMBcompDrag(acomp) {
  //update ui elem while dragging
  if (!acomp) acomp = stage.getComponentsByName("mb").list[0];
  var pos = acomp.position; //global position
  var quat = acomp.quaternion; //local rotation
  var axis = new NGL.Vector3(0, 0, 1);//quat.multiplyVector3(new NGL.Vector3(0, 0, 1));
  axis.applyQuaternion(quat);
  var offset = pos;
  //offset.applyQuaternion() quat.inverse().multiplyVector3(pos);
  pcp_elem[0].value = axis.x*100;
  pcp_elem[1].value = axis.y*100;
  pcp_elem[2].value = axis.z*100;
  offset_elem[0].value = offset.x*-1;
  offset_elem[1].value = offset.y*-1;
  offset_elem[2].value = offset.z*-1;
  for (var i = 0; i < 3; i++) {
    $(pcp_elem[i]).siblings('.inputNumber').val(pcp_elem[i].value);
    $(offset_elem[i]).siblings('.inputNumber').val(offset_elem[i].value);
  }
}

function NGL_updateMBcomp() {
  //get the other two ?
  var axis = [pcp_elem[0].value / 100.0, pcp_elem[1].value / 100.0, pcp_elem[2].value / 100.0];
  var offset = [offset_elem[0].value / 1.0, offset_elem[1].value / 1.0, offset_elem[2].value / 1.0];
  var acomp = stage.getComponentsByName("mb").list[0];
  //
  var q = new NGL.Quaternion();
  axis = new NGL.Vector3(axis[0], axis[1], axis[2]);//normalize ?
  q.setFromUnitVectors(new NGL.Vector3(0, 0, 1), axis.normalize());
  //console.log(q,new NGL.Vector3(axis[0],axis[1],axis[2]));
  if (!acomp) NGL_buildMB();
  acomp.setRotation(q);
  acomp.setPosition([-offset[0], -offset[1], -offset[2]]);
  console.log("NGL_updateMBcomp axis ?", axis, offset);
  //change the grid ? or the data or both ?
}

function NGL_panShapeDrag (stage, deltaX, deltaY) {
    console.log("deltaX,deltaY");
    console.log(deltaX,deltaY);
    console.log(ngl_current_pickingProxy);
    console.log(ngl_current_pickingProxy.sphere.name);
    //get the sphere pdb_picked
    var mbi = parseInt(ngl_current_pickingProxy.sphere.name);
    var pi = mbi*3;
    const scaleFactor = stage.trackballControls.controls.getCanvasScaleFactor(0);
    var tmpPanVector = new NGL.Vector3()
    tmpPanVector.set(deltaX, deltaY, 0)
    tmpPanVector.multiplyScalar(stage.trackballControls.panSpeed * scaleFactor)
    /*var tmpPanMatrix = new NGL.Matrix4()
    tmpPanMatrix.extractRotation(this.component.transform)
    tmpPanMatrix.premultiply(this.viewer.rotationGroup.matrix)
    tmpPanMatrix.getInverse(tmpPanMatrix)
    tmpPanVector.applyMatrix4(tmpPanMatrix)
    */
    console.log("before",ngl_current_pickingProxy.sphere.position);
    console.log(tmpPanVector);
    var cpos = new NGL.Vector3();
    cpos.copy(ngl_current_pickingProxy.sphere.position);
    cpos.add(tmpPanVector);
    console.log("after",cpos);
    node_selected.data.pos[0].coords[pi] = cpos.x;
    node_selected.data.pos[0].coords[pi+1] = cpos.y;
    node_selected.data.pos[0].coords[pi+2] = cpos.z;
    console.log("position are",mbi,node_selected.data.pos[0].coords);
    ngl_current_pickingProxy.sphere.position = cpos;
    //stage.removeAllComponents();
    //NGL_updateMetaBallsGeom(node_selected);
    //only update the cubes in metaball and the geom, not the shape ?
    //how to move a shape-> should we use multiple component instead?
}

function NGL_Setup() {
  folder_elem = document.getElementById("file_input");
  rep_elem = document.getElementById("rep_type");
  assambly_elem = document.getElementById("ass_type");
  sele_elem = document.getElementById("sel_str");
  model_elem = document.getElementById("mod_type");
  color_elem = document.getElementById("color_type");
  sym_elem = document.getElementById("sym_elem");
  label_elem = document.getElementById("label_elem");
  beads_elem = document.getElementById("beads_elem");
  cluster_elem = document.getElementById("cluster_elem");
  nbBeads_elem = document.getElementById("nbBeads");
  pdb_id_elem = document.getElementById("pdb_id");

  pcp_elem.push(document.getElementById("pcpX"));
  pcp_elem.push(document.getElementById("pcpY"));
  pcp_elem.push(document.getElementById("pcpZ"));

  offset_elem.push(document.getElementById("offsetX"));
  offset_elem.push(document.getElementById("offsetY"));
  offset_elem.push(document.getElementById("offsetZ"));

  /* for (var i=0;i<3;i++){
  			pcp_elem[i].oninput = function(e) {
  					NGL_updateMBcomp();
  			}
  			offset_elem[i].oninput = function(e) {
  					NGL_updateMBcomp();
  			}
  }
  */

  $('.inputRange, .inputNumber').on('input', function() {
    $(this).siblings('.inputRange, .inputNumber').val(this.value);
    NGL_updateMBcomp();
  });

  slidercluster_elem = document.getElementById("slidercl_params1");
  slidercluster_label_elem = document.getElementById("cl_params1");
  slidercluster_elem.addEventListener('input', function(e) {
    slidercluster_label_elem.textContent = slidercluster_elem.value;
  });
  slidercluster_elem.addEventListener('mouseup', function(e) {
    NGL_updateCurrentBeadsLevel();
  });

  /* slidercluster_elem2 = document.getElementById("slidercl_params2");
   slidercluster_label_elem2 = document.getElementById("cl_params2");
   slidercluster_elem2.addEventListener('input', function(e) {
      slidercluster_label_elem2.textContent = slidercluster_elem2.value;
   });
   slidercluster_elem2.addEventListener('mouseup', function(e) {
      NGL_updateCurrentBeadsLevel();
   });
  */
  heading = document.getElementById("heading");
  grid_viewport = document.getElementById("viewport"); //createElement( "div" );

  nLod = 3;
  /*
  color_elem.options.length = 0;
  color_elem.options[color_elem.options.length] = new Option("Color by:", "Color by:");
  for (var i = 0; i < available_color_schem.length; i++) {
    color_elem.options[color_elem.options.length] = new Option(available_color_schem[i], available_color_schem[i]);
  }
  */
  //default color by atomindex
  $('#color_type').val("atomindex");

  ngl_force_build_beads = false;


  title_annotation = document.getElementById("pdb_title");
  pcontainer = document.getElementById("NGL") || document.getElementById("NGLpane"); //

  viewport = document.getElementById("viewport");
  ngl_grid_heading = document.getElementById("heading");
  //we could put all our file on MGL2 or another server...
  // Setup to load data from rawgit
  var acc = document.getElementsByClassName("accordion");
  var i;

  for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var panel = this.nextElementSibling;
      if (panel.style.maxHeight) {
        panel.style.maxHeight = null;
      } else {
        panel.style.maxHeight = "100%"; //pcontainer.scrollHeight + "px"; //parent heigh?
      }
    });
  }

  NGL.DatasourceRegistry.add(
    "data", new NGL.StaticDatasource("//cdn.cdn.rawgit.com/arose/ngl/v0.10.4/data/")
  );
  stage = new NGL.Stage("viewport", {
    backgroundColor: "white"
  });
  viewport.setAttribute("style", "width:100%; height:100%;");

  stage.mouseObserver.signals.dragged.add(function (deltaX,deltaY){
    //update
    //console.log(ngl_current_pickingProxy);
    //console.log(node_selected.data.nodetype);
    //console.log(node_selected);
    //console.log(ngl_current_pickingProxy.component.name);
    //console.log(ngl_current_pickingProxy.position);
    if (!ngl_current_pickingProxy) return;

    if(ngl_current_pickingProxy.component && ngl_current_pickingProxy.component.name==="mb") {
      //update pcpAxis and rotaiton
      NGL_updateMBcompDrag(ngl_current_pickingProxy.component)
    }
    else {
    var mbi = parseInt(ngl_current_pickingProxy.sphere.name);
    var pi = mbi*3;
    var cpos = new NGL.Vector3();
    console.log(mbi,pi);
    cpos.copy(ngl_current_pickingProxy.position);
    node_selected.data.pos[0].coords[pi] = cpos.x;
    node_selected.data.pos[0].coords[pi+1] = cpos.y;
    node_selected.data.pos[0].coords[pi+2] = cpos.z;
    if (nlg_preview_isosurface) {
      NGL_updateMetaBalls(node_selected);
      var geo = ngl_marching_cube.generateGeometry();
      //how to update the shape mesh instead of recreating it
      NGL_MetaBallsGeom(geo);
    }
  }
  });

  //if metaballs only ?
  stage.signals.clicked.add(function (pickingProxy){
    console.log("pickingProxy");
    console.log(pickingProxy);
    ngl_current_pickingProxy = pickingProxy;
  });

  stage.signals.hovered.add(function (pickingProxy){
    //console.log("pickingProxy");
    //console.log(pickingProxy);
   if (pickingProxy) ngl_current_pickingProxy = pickingProxy;
  });

  //stage.mouseControls.remove( "drag-ctrl-right" );
  stage.mouseControls.remove( "drag-ctrl-left" );
  //stage.mouseControls.add("drag-ctrl-right", NGL_panShapeDrag);
  //stage.mouseControls.add("drag-ctrl-left", NGL_panShapeDrag);

  //stage.mouseControls.add("drag-ctrl-right", NGL.MouseActions.panComponentDrag);
  stage.mouseControls.add("drag-ctrl-left", NGL.MouseActions.panComponentDrag);
  // panComponentDrag
  // remove actions triggered by a scroll event, including
  //   those requiring a key pressed or mouse button used
  //stage.mouseControls.remove( "scroll-*" );
  return stage;
}

//we could put all our file on MGL2 or another server...
// Setup to load data from rawgit
NGL.DatasourceRegistry.add(
  "data", new NGL.StaticDatasource("//cdn.cdn.rawgit.com/arose/ngl/v0.10.4/data/")
);

//change the picking!
//stage.signals.clicked.add(function (pickingProxy) {...});

function NGL_GetSelection(sel_str, model) {
  var ngl_sele = "";
  if (sel_str && sel_str !== "") {
    //convert to ngl selection string
    var ch_sel = "(";
    var sp = sel_str.split(",");
    for (var i = 0; i < sp.length; i++) {
      var el = sp[i].split("!");
      console.log(el);
      if (el[0] === "") {
        ch_sel += " not ";
        if (/^[a-zA-Z]/.test(el[1])) ch_sel += ":" + el[1] + " and ";
      } else if (/^[a-zA-Z]/.test(el[0])) ch_sel += ":" + el[0] + "  or ";
    }
    ngl_sele = ch_sel.slice(0, -5) + ")";
    console.log(ngl_sele);
  }
  if (model && model !== "") {
    ngl_sele += " and /" + model;
  }
  return ngl_sele;
}

function NGL_toggleBeadsVisibility(e) {
  stage.getRepresentationsByName("beads_0")
    .setVisibility(e.target.checked);
}

function NGL_toggleAxisVisibility(e) {
  stage.getRepresentationsByName("beads_0")
    .setVisibility(e.target.checked);
}

function NGL_toggleOriginVisibility(e) {
  stage.getRepresentationsByName("beads_0")
    .setVisibility(e.target.checked);
}

function NGL_updateCurrentBeadsLevelClient() {
  //center
  //async function updateCurrentBeadsLevel() {
  console.log("update beads", beads_elem.selectedOptions[0].value); //undefined?//lod level
  var ngl_sele = new NGL.Selection(sele_elem.value);
  var center = NGL_GetGeometricCenter(ngl_current_structure, ngl_sele).center;
  ngl_current_structure.ngl_sele = ngl_sele;
  var lod = beads_elem.selectedOptions[0].value;
  var comp = stage.getComponentsByName("beads_" + lod);
  var rep = stage.getRepresentationsByName("beads_" + lod);
  var assambly = assambly_elem.selectedOptions[0].value;
  if (!assambly || assambly === "") assambly = "AU";
  ngl_current_structure.assambly = assambly;
  //stage.removeComponent(rep);
  //rep.dispose();
  //console.log("found rep beads_"+lod);
  //console.log(rep);
  //console.log("found component beads_"+lod);
  //console.log(comp);
  if (comp.list) {
    //console.log(comp.list[0]);
    //console.log(comp.list[0].reprList);
    stage.removeComponent(comp.list[0]);
    //comp.list[0].reprList[0].dispose();
    //comp.list[0].dispose();
  }
  var res = NGL_buildBeads(lod, ngl_current_structure, center);
  console.log("finsihed building", res);
  var col = Array(ngl_load_params.beads.pos[lod].coords.length).fill(0).map(Util_makeARandomNumber);
  var labels = Array(ngl_load_params.beads.pos[lod].coords.length).fill("0").map(function(v, i) {
    return "bead_" + i.toString()
  });

  var sphereBuffer = new NGL.SphereBuffer({
    position: new Float32Array(ngl_load_params.beads.pos[lod].coords),
    color: new Float32Array(col),
    radius: new Float32Array(ngl_load_params.beads.rad[lod].radii)
    //labelType:"text",
    //labelText:labels
  })
  //update the component buffer ?
  var shape = new NGL.Shape("beads_" + lod);
  shape.addBuffer(sphereBuffer)
  var shapeComp = stage.addComponentFromObject(shape)
  var rep = shapeComp.addRepresentation("beads_" + lod, {
    opacity: 0.6,
    visibility: true
  });
  nbBeads_elem.textContent = '' + ngl_load_params.beads.pos[lod].coords.length / 3 + ' beads';
}

// server side function for computing beads
function NGL_updateCurrentBeadsLevelServer() {
  console.log("update beads", beads_elem.selectedOptions[0].value); //undefined?//lod level
  console.log("num clusters", slidercluster_elem.value);
  var d = node_selected; //or node_selected.data.bu
  var pdb = d.data.source.pdb; //document.getElementById("pdb_str");
  var bu = (d.data.source.bu) ? d.data.source.bu : ""; //document.getElementById("bu_str");
  //selection need to be pmv string
  var sele = (d.data.source.selection) ? d.data.source.selection : ""; //document.getElementById("sel_str");
  sele = sele.replace(":", "");
  //selection is in NGL format. Need to go in pmv format
  //every :C is a chainNameScheme
  var model = (d.data.source.model) ? d.data.source.model : ""; //model_elem.selectedOptions[0].value;
  if ((!model) || model.startsWith("S") || model.startsWith("a")) model = "";
  if (sele.startsWith("/")) sele = "";
  //depending on the pdb we will have a file or not
  var thefile = null;
  if (d.data.source.pdb.length !== 4) {
    pdb = "";
    if (folder_elem && folder_elem.files.length != "") {
      thefile = pathList_[d.data.source.pdb];
    } else {
      pdb = d.data.source.pdb;
      //its a blob we want ?
    }
  }
  var formData = new FormData();
  formData.append("beads", true);
  formData.append("nbeads", slidercluster_elem.value)
  //console.log(thefile)
  // add assoc key values, this will be posts values
  if (thefile !== null) {
    console.log("use input file", thefile);
    formData.append("inputfile", thefile, thefile.name);
    formData.append("upload_file", true);
  } else if (pdb && pdb !== "") formData.append("pdbId", pdb);
  if (bu && bu !== "") formData.append("bu", bu);
  if (sele && sele !== "") formData.append("selection", sele);
  if (model && model !== "") formData.append("modelId", model);
  //formData.append(name, value);
  console.log([pdb, bu, sele, model, thefile]);
  console.log(formData);
  var lod = beads_elem.selectedOptions[0].value;
  var comp = stage.getComponentsByName("beads_" + lod);
  var rep = stage.getRepresentationsByName("beads_" + lod);
  var assambly = assambly_elem.selectedOptions[0].value;
  if (!assambly || assambly === "") assambly = "AU";
  ngl_current_structure.assambly = assambly;

  document.getElementById('stopkmeans').setAttribute("class", "spinner");
  document.getElementById("stopkmeans_lbl").setAttribute("class", "show");

  $.ajax({
    type: "POST",
    //url: "http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py",
    url: pmv_server,
    success: function(data) {
      console.log("##BEADS###");
      console.log("DATA:", data);

      var data_parsed = JSON.parse(data.replace(/[\x00-\x1F\x7F-\x9F]/g, " "));
      var clusters = data_parsed.results; //verts, faces,normals
      console.log("CLUSTERS:", clusters);
      NGL_ShowBeadsCR(clusters,lod);//.center and .radii
      nbBeads_elem.textContent = '' + ngl_load_params.beads.pos[lod].coords.length / 3 + ' beads';
      document.getElementById('stopkmeans').setAttribute("class", "spinner hidden");
      document.getElementById("stopkmeans_lbl").setAttribute("class", "hidden");
    },
    error: function(error) {
      console.log(error);
    },
    async: true,
    data: formData,
    cache: false,
    contentType: false,
    processData: false,
    timeout: 60000
  });
}

function NGL_updateCurrentBeadsLevel() {
  //client, or server or server coords
  //NGL_updateCurrentBeadsLevelClient();
  //NGL_updateCurrentBeadsLevelServer();
  if (node_selected.data.nodetype === "compartment") {}
  else {
  if ((node_selected.data.source.pdb)&&(node_selected.data.source.pdb!==""))
  {
    var pdbname = node_selected.data.source.pdb;
    if (pdbname.startsWith("EMD") || pdbname.startsWith("EMDB") || pdbname.slice(-4, pdbname.length) === ".map"){
      //this is a Volume
      var comp = stage.getComponentsByName(pdbname);
      if (comp.list.length!==0) {
        comp = comp.list[0];
        var volume = comp.volume;
        var rep = stage.getRepresentationsByName("surface").list[0];
        var iso = rep.repr.__isolevel
        //var surf = rep.repr.surface;
        if (!iso) iso = comp.reprList[0].repr.__isoLevel;
        if (!iso) iso = 1.0;
        console.log("iso is :",iso);
        //var fv = new FilteredVolume(volume, volume._min, volume._max, false);
        //cluster fv.getDataPosition();
        var lod = parseInt(beads_elem.selectedOptions[0].value);
        var clusters = NGL_ClusterVolume(volume,iso,{"x":0,"y":0,"z":0});
        console.log("found cl",clusters);
        NGL_ShowBeadsCR(clusters,lod);
      }
    }
    else {
      if (use_mglserver_beads) buildFromServer(node_selected.data.source.pdb,false,true,ngl_current_structure);
      else NGL_updateCurrentBeadsLevelClient();
      }
  }
}
}

function NGL_changeClusterMethod(e) {
  //var i = e.value,cluster_elem.selectedOptions[0].value;
  //var rep = stage.getComponentsByName("beads_"+i);
  NGL_updateCurrentBeadsLevel();
}

function NGL_showBeadsLevel_cb(alevel) {
  if (!ngl_load_params.beads.pos) return;
  if (!ngl_load_params.beads.rad) return;
  if (alevel === "None") {
    for (var i = 0; i < nLod; i++) {
      var rep = stage.getComponentsByName("beads_" + i);
      console.log(rep, "beads_" + i);
      if (rep.list.length !== 0)
        if (rep.list[0].reprList.length !== 0) {
          rep.list[0].reprList[0].setVisibility(false);

        }
    }
    nbBeads_elem.textContent = "";
  } else if (alevel === "All") {
    for (var i = 0; i < nLod; i++) {
      var rep = stage.getComponentsByName("beads_" + i);
      console.log(rep, "beads_" + i);
      if (rep.list.length !== 0)
        if (rep.list[0].reprList.length !== 0) {
          rep.list[0].reprList[0].setVisibility(true);
          rep.list[0].reprList[0].setParameters({
            opacity: 0.6
          });
        }
    }
    nbBeads_elem.textContent = "";
  } else {
    var v = false;
    for (var i = 0; i < nLod; i++) {
      var rep = stage.getComponentsByName("beads_" + i);
      if (i === parseInt(alevel)) {
        v = true;
        if (ngl_load_params.beads.pos[i])
          nbBeads_elem.textContent = '' + ngl_load_params.beads.pos[i].coords.length / 3 + ' beads';
      } else v = false;
      console.log(rep, "beads_" + i, v);
      if (rep.list.length !== 0)
        if (rep.list[0].reprList.length !== 0) {
          rep.list[0].reprList[0].setVisibility(v);
          rep.list[0].reprList[0].setParameters({
            opacity: 0.6
          })
        }
    }
  }
}

function NGL_showBeadsLevel(e) {
  NGL_showBeadsLevel_cb(e.value);
}

function NGL_UpdateAssamblyList(ngl_ob) {
  assambly_elem.options.length = 0;
  assambly_elem.options[0] = new Option("Assambly:", "Assambly:");
  assambly_elem.options[1] = new Option("AU", "AU");
  Object.keys(ngl_ob.structure.biomolDict).forEach(function(k) {
    console.log(k);
    assambly_elem.options[assambly_elem.options.length] = new Option(k, k);
  });
}

function NGL_setModelOptions(ngl_ob) {
  model_elem.options.length = 0;
  const modelStore = ngl_ob.structure.modelStore;
  var model = "0";
  if (node_selected) {
    model = model_elem.value;
  }
  if (modelStore.count > 1) {
    model_elem.options[model_elem.options.length] = new Option('Show model:', 'Show model:');
    model_elem.options[model_elem.options.length] = new Option('all', 'all');
  }
  for (let i = 0; i < modelStore.count; ++i) {
    //addOption(options, i, 'Model ' + (i + 1))
    model_elem.options[model_elem.options.length] = new Option(i, i,false, (parseInt(model) === i));
  }
  //if (modelStore.count === 0) model_elem.options[model_elem.options.length] = new Option(0, 0);
}

function NGL_setChainSelectionOptions(ngl_ob)
{
  //update the selection div element
   const modelStore = ngl_ob.structure.modelStore;
   var model = "0";
   if (modelStore.count > 1) {
     if (node_selected) {
       model = node_selected.data.source.model;
     }
   }
   var aselection = (modelStore.count > 1) ? NGL_GetSelection("", model):"polymer";
   var chnames = []
   var nch = ngl_ob.structure.getChainnameCount();
   ngl_ob.structure.eachChain( chain => {
    chnames.push( chain.chainname)
  }, new NGL.Selection(aselection));
  console.log(aselection,chnames);
  layout_addOptionsForMultiSelect("selection_ch_checkboxes",chnames);
}

function NGL_setSymmetryOptions(ngl_ob) {
  //const options = []
  //addOption(options, '-1', 'None')
  sym_elem.options[sym_elem.options.length] = new Option('None', 'None');
  const assembly = ngl_ob.structure.assembly
  if (ngl_ob.symmetryData[assembly]) {
    const symmetries = ngl_ob.symmetryData[assembly].symmetries
    symmetries.forEach((symmetry, i) => {
      //addOption(options, i, symmetry.label)
      sym_elem.options[sym_elem.options.length] = new Option(symmetry.label, symmetry.label);
    })
  }
}

function NGL_ChangeSymmetry(select0) {}

function NGL_ChangeBiologicalAssambly(selected0) {
  console.log(rep_elem.selectedOptions[0].value);
  console.log(selected0.value);
  console.log(sele_elem.value);
  stage.getRepresentationsByName("polymer").dispose();
  stage.eachComponent(function(o) {
    o.addRepresentation(rep_elem.selectedOptions[0].value, {
      colorScheme: color_elem.selectedOptions[0].value,
      sele: sele_elem.value,
      name: "polymer",
      assembly: assambly_elem.selectedOptions[0].value
    })
  });
  /*
  var rep = stage.getRepresentationsByName("polymer");
  rep.setParameters({
    colorScheme: color_elem.selectedOptions[0].value,
    sele: sele_elem.value,
    name: "polymer",
    assembly: selected0.value
  });
  */
  //updatTheTable
  if (ngl_current_item_id) {
    updateDataGridRowElem(0, ngl_current_item_id, "bu", selected0.value);
    //update the grid according the multimeric state automatically ?
    //problem is to get the multimeric states...
  }
  if (node_selected) {
    node_selected.data.bu = selected0.value;
    node_selected.data.source.bu = selected0.value;
    console.log("node_selected.data.bu ", node_selected.data.bu);
  }
  //update the center
  //o.setPosition([-center.x, -center.y, -center.z]); //center molecule

  //recenter ?
  /*
	stage.getRepresentationsByName("polymer").dispose();
	stage.eachComponent(function (o) {
      o.addRepresentation(rep_elem.selectedOptions[0].value, {
      	colorScheme: color_elem.selectedOptions[0].value,
        sele: sele_elem.value,
        name: "polymer",
        assembly: selected0.value  // override default assembly
      })
    });*/
}

function NGL_Changelabel(select0) {
  //either none or chain
  console.log(ngl_current_structure);
  ngl_current_structure.annotationList.forEach(function(elem) {
    elem.setVisibility((select0.value !== "None"));
  });
  //console.log(title_annotation);
  //title_annotation.setVisibility(true);
}

function NGL_ChangeRepresentation(selectedO) {
  console.log(assambly_elem.selectedOptions[0].value);
  stage.getRepresentationsByName("polymer").dispose();
  stage.eachComponent(function(o) {
    o.addRepresentation(selectedO.value, {
      colorScheme: color_elem.selectedOptions[0].value,
      sele: sele_elem.value,
      name: "polymer",
      assembly: assambly_elem.selectedOptions[0].value
    })
  });
  //this overwrite the opacity of the beads
  NGL_showBeadsLevel_cb(beads_elem.selectedOptions[0].value);
}

//overwrite model ?
function NGL_ChangeSelection(astr_elem) {
  console.log(astr_elem.value);
  NGL_ChangeRepresentation(rep_elem.selectedOptions[0]);
  if (ngl_current_item_id) updateDataGridRowElem(0, ngl_current_item_id, "selection", (astr_elem.value === "polymer") ? "" : astr_elem.value);
  NGL_showBeadsLevel_cb(beads_elem.selectedOptions[0].value);
  stage.autoView(1000);
  if (node_selected) {
    node_selected.data.selection = astr_elem.value;
    node_selected.data.source.selection = astr_elem.value;
  }
  /*var rep = stage.getRepresentationsByName( "polymer" );
	rep.setParameters(
      	{
      	colorScheme: color_elem.selectedOptions[0].value,
        sele: astr_elem.value,
        name: "polymer",
        assembly:assambly_elem.selectedOptions[0].value
        });
      //0 or current grid ? mode /
  updateDataGridRowElem(0,ngl_current_item_id,"selection",(astr_elem.value === "polymer")?"":astr_elem.value);
	stage.autoView(1000);
      /*
	stage.getRepresentationsByName("polymer").dispose();
	stage.eachComponent(function (o) {
      o.addRepresentation(rep_elem.selectedOptions[0].value, {
      	colorScheme: color_elem.selectedOptions[0].value,
        sele: astr_elem.value,
        name: "polymer",
        assembly:assambly_elem.selectedOptions[0].value
      })
  });	*/
}

function NGL_ChangeChainsSelection(an_elem) {
  var aselection = "";
  var checkboxes = document.getElementById("selection_ch_checkboxes");
  console.log(checkboxes);
  console.log(sele_elem.value);
  var selection = "";
  console.log(an_elem);
  var allcheck = checkboxes.getElementsByTagName("input");
  var all = allcheck.length;
  var countchecked = 0;
  for (var i=0;i<all;i++)
  {
      if (allcheck[i].checked) countchecked++;
  }
  var diff = all-countchecked;
  console.log(diff,(diff<countchecked));
  if (diff<countchecked) {
    //aselection+="not :"+allcheck[0].id
    for (var i=0;i<all;i++)
    {
        if (!allcheck[i].checked) aselection+=" and not :"+allcheck[i].id;
    }
  }
  else {
    //aselection+=":"+allcheck[0].id
    for (var i=0;i<all;i++)
    {
        if (allcheck[i].checked) aselection+=" or :"+allcheck[i].id;
    }
  }
  sele_elem.value = aselection;
  NGL_ChangeSelection(sele_elem);
}

//overwrite model selection
function NGL_ChangeModel(model_elem) {
  console.log(model_elem.value);
  var curr_sel = sele_elem.value.split("/")[0];
  //split on /
  console.log(curr_sel + "/" + model_elem.value);
  sele_elem.value = curr_sel + "/" + model_elem.value;
  NGL_ChangeRepresentation(rep_elem.selectedOptions[0]);
  //var rep = stage.getRepresentationsByName( "polymer" );
  //rep.setParameters(
  //    	{colorScheme: color_elem.selectedOptions[0].value,
  //      sele: curr_sel + "/" + model_elem.value,
  //      name: "polymer",
  //      assembly:assambly_elem.selectedOptions[0].value});
  /*
	stage.getRepresentationsByName("polymer").dispose();
	stage.eachComponent(function (o) {
      o.addRepresentation(rep_elem.selectedOptions[0].value, {
      	colorScheme: color_elem.selectedOptions[0].value,
        sele: curr_sel + "/" + model_elem.value,
        name: "polymer",
        assembly:assambly_elem.selectedOptions[0].value
      })
    });	*/
  if (ngl_current_item_id) updateDataGridRowElem(0, ngl_current_item_id, "selection", curr_sel + "/" + model_elem.value);

  if (node_selected) {
    node_selected.data.source.selection = curr_sel + "/" + model_elem.value;
    node_selected.data.source.model = model_elem.value;
  }
  if (ngl_current_structure) NGL_setChainSelectionOptions(ngl_current_structure);
}

function NGL_ChangeColorScheme(col_e) {
  //ngl color scheme change...
  //get the represnetation
  var curr_sel = sele_elem.value.split("/")[0];
  var rep = stage.getRepresentationsByName("polymer");
  rep.setParameters({
    colorScheme: col_e.value,
    sele: sele_elem.value,
    name: "polymer",
    assembly: assambly_elem.selectedOptions[0].value
  });
}

//check the uniprot mapping for the given resiudes
function NGL_ChangeHighlight(pdbStart, pdbEnd, color, chainId)
{
	//query the mapping server using ngl_current_structure.structure.name
	if (!ngl_current_structure) return;
	if (!color) color = 'gold';
	var style = 'licorice';

	var sele = pdbStart + "-" + pdbEnd ;//+ ":" + chainId;
  if (chainId !== "") sele+=" and :"+chainId;
	if (pdbEnd - pdbStart < 2) {
		color = color;
		style = 'spacefill';
	}
  console.log("highlight ",sele);
	var comp = ngl_current_structure;
  stage.getRepresentationsByName('highlight').dispose();
  stage.getRepresentationsByName('hLabel').dispose();

    comp.addRepresentation(style, {
        sele: sele,
        color: color,
        radius: 1,
				name:"highlight"
      });

		comp.addRepresentation("label", {
														sele: sele+".CA",
														color: "grey",
														scale: 2.0,
														zOffset: 4.0,
														name:"hLabel"
												});
    //stage.centerView(false, sele);

  comp.autoView(200);
}


function NGL_CenterView() {
  stage.autoView(1000);
}

// Handle window resizing

// Load PDB entry 1CRN
//stage.loadFile( "rcsb://1crn", { defaultRepresentation: true } );
//stage.loadFile( "https://dl.dropboxusercontent.com.com/sh/lzoafabr3b99i2h/AABjLdOCwH4BlC9Gvy2SOdo_a?dl=0&preview=Synaptotagmin7.pdb",{"ext":"pdb"} );

//if beads define in a file
function NGL_LoadBeads(d) {
  //load sphere beads
  //when a sphereFile is given in the input
}

function NGL_ShowSpheres(pos,r){
  console.log(pos);
  var col = Array(pos.length).fill(0).map(Util_makeARandomNumber);
  var rad = Array(pos.length/3).fill(1.0);
  var sphereBuffer = new NGL.SphereBuffer({
    position: new Float32Array(pos),
    color: new Float32Array(col),
    radius: new Float32Array(rad)
  })

  var shape = new NGL.Shape("some_spheres");
  shape.addBuffer(sphereBuffer)
  var shapeComp = stage.addComponentFromObject(shape)
  var rep = shapeComp.addRepresentation("spheres", {
    opacity: 1,
    visibility: true
  });
  console.log(rep);
  stage.autoView(200);
}

function NGL_ShowBeadsCR(clusters,lod){
  var comp = stage.getComponentsByName("beads_" + lod);
  var _pos = {
    "coords": clusters.centers
  };
  var _rad = {
    "radii": clusters.radii
  };
  if (!ngl_load_params.beads.pos) ngl_load_params.beads.pos = [];
  if (!ngl_load_params.beads.rad) ngl_load_params.beads.rad = [];
  ngl_load_params.beads.pos[lod] = _pos; //{"pos":[lvl0_pos,lvl1_pos],"rad":[lvl0_rad,lvl1_rad]};
  ngl_load_params.beads.rad[lod] = _rad;
  console.log(ngl_load_params.beads);
  if (node_selected) {
    console.log("update node ", node_selected.data.name)
    node_selected.data.pos = JSON.parse(JSON.stringify(ngl_load_params.beads.pos));
    node_selected.data.radii = JSON.parse(JSON.stringify(ngl_load_params.beads.rad));
    console.log(node_selected);
  }
  if (comp.list) {
    for (var i = 0; i < comp.list.length; i++) {
      stage.removeComponent(comp.list[i]);
    }
  }
  console.log(ngl_load_params.beads.pos,lod);
  var col = Array(ngl_load_params.beads.pos[lod].coords.length).fill(0).map(Util_makeARandomNumber);

  var sphereBuffer = new NGL.SphereBuffer({
    position: new Float32Array(ngl_load_params.beads.pos[lod].coords),
    color: new Float32Array(col),
    radius: new Float32Array(ngl_load_params.beads.rad[lod].radii)
    //labelType:"text",
    //labelText:labels
  })

  var shape = new NGL.Shape("beads_" + lod, {
    disableImpostor: true,
    radialSegments: 10
  });
  shape.addBuffer(sphereBuffer)
  var shapeComp = stage.addComponentFromObject(shape)
  var rep = shapeComp.addRepresentation("beads_" + lod, {
    opacity: 0.6,
    visibility: true
  });
}

//rep or component
function NGL_getRawMesh(rep_name) {
    var rep = stage.getRepresentationsByName(rep_name).list[0];
    //rep.repr.__isolevel
    var surf = rep.repr.surface;
    var mesh = {"verts":(surf.position)?Array.from(surf.position):null,
                "faces":(surf.index)?Array.from(surf.index):null,
                "normals":(surf.normals)?Array.from(surf.normals):null }
    return mesh;
}

function NGL_ShowMeshVFN(mesh) {
  console.log("create shape with ");
  console.log(mesh);
  var comp = stage.getComponentsByName("geom_surface");
  if (comp.list) {
    stage.removeComponent(comp.list[0]);
  }
  var shape = new NGL.Shape("geom_surface");
  var col = Array(mesh.verts.length).fill(1);
  shape.addMesh( //position, color, index, normal
    mesh.verts, // a plane
    col, // all green
    mesh.faces,
    mesh.normals
  );

  var shapeComp = stage.addComponentFromObject(shape);
  var r = shapeComp.addRepresentation("geom_surface", {
    opacity: 0.5,
    side: "double"
  });
  NGL_showGeomNode_cb(document.getElementById("showgeom").checked);
}

function NGL_getCollada_cb(scene) {
  console.log("create shape with ");
  console.log(scene);
  var shape = new NGL.Shape("geom_surface");
  for (var i in scene.meshes) {
    var res = scene.meshes[i];
    var col = Array(res.vertices.length).fill(1);
    shape.addMesh( //position, color, index, normal
      ("vertex" in res) ? res.vertex : res.vertices, // a plane
      col, // all green
      res.triangles,
      ("vertex" in res) ? res.vertices : res.normals
    );
  }
  var shapeComp = stage.addComponentFromObject(shape);
  var r = shapeComp.addRepresentation("geom_surface", {
    opacity: 0.5,
    side: "double"
  });
  NGL_showGeomNode_cb(document.getElementById("showgeom").checked);
  stage.autoView(1000);
}

function NGL_showGeomNode_cb(toggle) {
  //toggle the visibility of the geom representation of the current node
  var rep = stage.getComponentsByName("geom_surface");
  if (rep.list.length !== 0) {
    if (rep.list[0].reprList.length !== 0) {
      rep.list[0].setVisibility(toggle);
    }
  }
}

function NGL_showGeomNode(e) {
  NGL_showGeomNode_cb(e.checked);
}

function NGL_LoadShapeFile(afile) {
  var thefile = afile;
  console.log(thefile);
  if (!afile) return;
  //update the slecected node with its name.
  if (window.FileReader) {
    // FileReader is supported.
  } else {
    alert('FileReader is not supported in this browser.');
  }
  //check extension
  var ext = thefile.name.split('.').pop();
  console.log("upload ", thefile.name, ext);
  //load in NGL ?
  if (ext === "obj" || ext === "ply") {
    //stage.removeAllComponents();
    stage.loadFile(thefile).then(function(o) {
      o.addRepresentation("geom_surface", {
        opacity: 1,
        side: "double"
      });
    });
    //stage.autoView();

  } else if (ext === "dae") {
    var file = thefile;
    var filename = thefile.name;
    console.log("upload with collada");
    var reader = new FileReader();
    reader.onload = function(event) {
      //console.log(event.target);
      var data = event.target.result;
      //  stage.removeAllComponents();
      NGL_getCollada_cb(Collada.parse(data, null, filename));
      //  stage.autoView();
    };
    //read data
    //var type = thefile.type.split("/")[0];
    reader.readAsText(file);
    //Collada.load( thefile, NGL_getCollada_cb );
  }
  else if ((ext === "mmtf")||(ext === "pdb")) {
    stage.loadFile(thefile, {
      defaultRepresentation: false
    }).then(function(o) {
      o.addRepresentation("spacefill", {
        colorScheme: "chainId",
        name: "polymer"
      });
      ngl_current_structure = o;
      NGL_UpdateAssamblyList(o);
      stage.autoView();
      buildFromServer("",true,false,o);//or build from file
      //buildFromServerPDB(thefile);
    });
    //build the geom ?
  }
}

function NGL_LoadShapeObj(d) {
  //load geometry mesh
  //extension need to be .obj
  console.log("NGL_LoadShapeObj " + d.data.geom);
  NGL_LoadAShapeObj(d.data.geom);
}

function NGL_LoadAShapeObj(gpath) {
  if (!node_selected) return;
  if (node_selected.data.geom_type === "raw") {
    NGL_ShowMeshVFN(gpath);
  } else if (node_selected.data.geom_type === "None" &&
    node_selected.data.nodetype !== "compartment") {
    //build it ?
    //buildCMS();
    //test from atomCoords directly
    console.log("NGL_LoadAShapeObj",node_selected);
    buildFromServer(gpath,true,false,null);
  } else if (node_selected.data.geom_type === "file") {
    //gpath may be different as we pass data.geom
    if (typeof gpath === 'string') {
      console.log("load shape " + gpath); //gpath is either a string or a file
      var ext = gpath.split('.').pop();
      //default is / , windows use \
      var gname = (gpath.includes('\\')) ? gpath.split('\\').pop() : gpath.split('/').pop(); // or use \

      console.log(gname, ext);
      //is the file in the repo
      //is the file in the datafolder
      var ftoload = "";
      var isurl = false;
      if (folder_elem && folder_elem.files.length != "") {
        //ftp://ftp.ebi.ac.uk/pub/databases/emdb/structures/EMD-5239/map/emd_5239.map.gz
        ftoload = pathList_[gname];
        node_selected.data.geom = ftoload;
      } else {
        ftoload = geom_purl + gname;
        isurl = true;
        node_selected.data.geom = gname;
      }
      console.log("try loading geom at " + ftoload);
      console.log(geom_purl);
      console.log(gname);
      if (!ftoload) return;
      if (ext === "obj" || ext === "ply") {
        //stage.removeAllComponents();
        stage.loadFile(ftoload).then(function(o) {
          o.addRepresentation("geom_surface", {
            opacity: 0.5,
            side: "double"
          });
          stage.autoView(1000);
        });
        NGL_showGeomNode_cb(document.getElementById("showgeom").checked);
      } else if (ext === "dae") {
        var file = ftoload;
        var filename = gname;
        console.log("upload with collada");
        if (!isurl) {
          var reader = new FileReader();
          reader.onload = function(event) {
            //console.log(event.target);
            var data = event.target.result;
            NGL_getCollada_cb(Collada.parse(data, null, filename));
          };
          //read data
          //var type = thefile.type.split("/")[0];
          reader.readAsText(file);
        } else {
          console.log("Collada.load( file, NGL_getCollada_cb )", file);
          Collada.load(file, NGL_getCollada_cb);
        }
        //Collada.load( thefile, NGL_getCollada_cb );
      } else if ((ext === "mmtf")||(ext === "pdb")) {
        stage.loadFile("rcsb://" + gname, {
          defaultRepresentation: false
        }).then(function(o) {
          o.addRepresentation("spacefill", {
            colorScheme: "chainId",
            name: "polymer"
          });
          NGL_ShowOrigin();
          stage.autoView(1000);
          ngl_current_structure = o;
          NGL_UpdateAssamblyList(o);
          buildFromServer(gname,true,false,o);//or build from file
          //buildFromServerPDB(gname);
        });
        //build the geom ?
      }
    } else { //should be a file
      NGL_LoadShapeFile(gpath);
      NGL_showGeomNode_cb(document.getElementById("showgeom").checked);
    }
  }
}

function NGL_ShowOrigin() //StructureView
{
  var shape = new NGL.Shape("ori");
  shape.addArrow([0, 0, 0], [10, 0, 0], [1, 0, 0], 1.0);
  shape.addArrow([0, 0, 0], [0, 10, 0], [0, 1, 0], 1.0);
  shape.addArrow([0, 0, 0], [0, 0, 10], [0, 0, 1], 1.0);
  //compare to the structure getPrincipalAxes?
  var shapeComp = stage.addComponentFromObject(shape)
  shapeComp.addRepresentation("Origin");
}

function NGL_ShowAxisOffset(axis, offset) //StructureView
{
  //arrow is start, end ,color, radius
  //axis should go from offset to given length
  console.log("load axis");
  console.log(-offset[0], -offset[1], -offset[2]);
  console.log(axis[0], axis[1], axis[2]);
  if (!axis || axis === "") return;
  offset = (offset.length === 3) ? offset : [0, 0, 0];
  var axislength = Math.max(Math.max.apply(null, offset) + 50, 50); //Math.max(offset.max()+30,30);
  axis = (axis.length === 3) ? axis : [0, 0, 1];
  console.log(axis);
  console.log(offset);
  /*
  var start = [0,0,0];
  var end = [axis[0]*axislength,axis[1]*axislength,axis[2]*axislength];
  var center = [0,0,0];//ngl_current_structure.structureView.center;//center of the view ?
  console.log(ngl_current_structure);//actual current representation center?
  console.log(start);
  console.log(end);
  console.log(center);
  var shape = new NGL.Shape("axis");
  shape.addArrow(start, end, [ 1, 0, 0 ], 2.0);
  shape.addSphere( offset, [ 1, 0, 0 ], 3.5 );
  //shape.addSphere( start, [ 1, 0, 0 ], 3.0 );
  var shapeComp = stage.addComponentFromObject(shape)
  shapeComp.addRepresentation("principalVector");
  */

  if (node_selected) {
    if (node_selected.data.surface) {
      console.log("build membrane along", axis);
      var shapemb = new NGL.Shape("mb");
      //two cylinder one red up, one blue down, center is 0,0,0
      //Sign of Z coordinate is negative at the inner (IN) side and positive at the outer side.
      var radius = 50;
      var Z = 14;
      var thickness = 1.0;
      //axis = [0,0,1];
      shapemb.addCylinder([0, 0, Z - 1], [0, 0, Z + 1], [1, 0, 0], radius, "OUT");
      shapemb.addCylinder([0, 0, -(Z - 1)], [0, 0, -(Z + 1)], [0, 0, 1], radius, "IN");

      var shapembComp = stage.addComponentFromObject(shapemb);
      shapembComp.name = "mb";
      var r = shapembComp.addRepresentation("principalVector");
      var q = new NGL.Quaternion();
      q.setFromUnitVectors(new NGL.Vector3(0, 0, 1), new NGL.Vector3(axis[0], axis[1], axis[2]));
      console.log(q, new NGL.Vector3(axis[0], axis[1], axis[2]));
      shapembComp.setRotation(q);
      shapembComp.setPosition([-offset[0], -offset[1], -offset[2]]);
      console.log("axis ?", axis);
    }
  }
}


function NGL_setupBeads(respone) {
  console.log("setup beads");
  console.log(response);
}

function NGL_LoadSpheres(pos, rad) {
  //start with level 0
  //add the beads representation to current stage
  console.log("load Beads");
  console.log(pos);
  console.log(rad);
  if (!pos || pos.length === 0) return;
  var nLod = rad.length;
  console.log(nLod);
  for (var i = 0; i < nLod; i++) {
    var lod = i;
    if (!pos[lod].coords) continue;
    var col = Array(pos[lod].coords.length).fill(0).map(Util_makeARandomNumber);

    var shape = new NGL.Shape("beads_" + lod, {
      disableImpostor: true,
      radialSegments: 10
    });
    //console.log(labels);
    var sphereBuffer = new NGL.SphereBuffer({
      position: new Float32Array(pos[lod].coords),
      color: new Float32Array(col),
      radius: new Float32Array(rad[lod].radii)
      //	labelType:"text",
      //	labelText:labels
    });
    shape.addBuffer(sphereBuffer)
    var shapeComp = stage.addComponentFromObject(shape)
    var rep = shapeComp.addRepresentation("beads_" + lod, {
      opacity: 1.0,
      visibility: true
    });
    console.log("rep", rep);
    stage.autoView();
  }
}

/*
use
ngl_current_structure = o;
ngl_current_structure.sele = sele;
ngl_current_structure.assambly = assambly;
*/
function NGL_GetAtomDataSet(pdb,struture_object){
  var dataset = [];
  var o = struture_object;
  if (!o) o = ngl_current_structure;
  if (pdb) {}//load ?
  var ats = o.structure.atomStore;
  var nAtom = ats.count;
  console.log("found ",nAtom);
  var asele = "polymer";
  if (o.ngl_sele && o.ngl_sele!=="") {
    if (o.ngl_sele.string !== null) asele = o.ngl_sele.string;
    else asele = o.ngl_sele;
  }
  else if (o.sele&& o.sele!=="") {
    asele = o.sele;
  }
  else if (sele_elem.value&& sele_elem.value!=="") {
    asele = sele_elem.value;
  }
  if (asele === "") asele = "polymer";
    var bu = false;
    if (o.assambly !== "AU" && o.object.biomolDict[o.assambly]) {
      //need to apply the matrix to the selection inside the BU selection ?
      //console.log(o.object.biomolDict[o.assambly].getSelection());
      //build using given selection AND biomolDic selection
      asele = "(" + o.object.biomolDict[o.assambly].getSelection().string + ") AND " + asele;
      bu = true;
    }
    console.log("selection is ",asele);
    o.structure.eachAtom(function(ap) {
      if (ap.atomname==="CA" || nAtom < 20000) dataset.push([ap.x, ap.y, ap.z]);
    }, new NGL.Selection(asele));
    console.log("dataset is ", dataset.length);
    return dataset;
  }

function NGL_processSymmetry(symmetry) {
  const symmetryData = {}
  if (symmetry && symmetry.length > 0) {
    symmetry.forEach(item => {
      const assemblyName = (item.biologicalAssemblyId === 0) ? '__AU' : 'BU' + item.biologicalAssemblyId
      const symmetries = []
      if (item.localSymmetry) {
        // note: for local symmetries, there may be multiple instances of the same symmetry, so label them 'C3 (local)(1)...(n)'
        const symmetryMap = {}
        item.localSymmetry.forEach(obj => {
          const symmetry = obj.symmetry // C2, C3 ...
          if (symmetry !== 'C1') {
            const o = {
              label: `${symmetry} (local)`,
              axes: obj.symmetryAxes
            }
            symmetries.push(o)
            if (!symmetryMap[symmetry]) {
              symmetryMap[symmetry] = []
            }
            symmetryMap[symmetry].push(o)
          }
        })
        // append numeric counter to label if there are multiple instances of the same symmetry
        for (let prop in symmetryMap) {
          const o = symmetryMap[prop]
          if (o.length > 1) {
            o.forEach((item, i) => {
              item.label += ` (${i + 1})`
            })
          }
        }
      }
      if (item.globalSymmetry && item.globalSymmetry.symmetry !== 'C1') {
        symmetries.push({
          label: item.globalSymmetry.symmetry + ' (global)',
          axes: item.globalSymmetry.symmetryAxes
        })
      }
      if (item.pseudoSymmetry && item.pseudoSymmetry.symmetry !== 'C1') {
        symmetries.push({
          label: item.pseudoSymmetry.symmetry + ' (pseudo)',
          axes: item.pseudoSymmetry.symmetryAxes
        })
      }
      if (symmetries.length > 0) {
        toJsonStr(symmetries)
        symmetryData[assemblyName] = {
          symmetries: symmetries
        }
      }
    })
  }
  console.log('symmetryData=' + JSON.stringify(symmetryData, null, 2))
  console.log(symmetry);
  return symmetryData
}

//center should be the center of the cluster not of the protein
function NGL_GetGeometricCenter(astructure, selection) {
  var center = new NGL.Vector3(0, 0, 0);
  var i = 0;
  var R = 0;
  astructure.structure.eachAtom(function(ap) {
    var atpos = new NGL.Vector3(ap.x, ap.y, ap.z);
    center.add(atpos);
    i += 1;
  }, selection);
  center.divideScalar(i);
  astructure.structure.eachAtom(function(ap) {
    var atpos = new NGL.Vector3(ap.x, ap.y, ap.z);
    var L = atpos.sub(center).length();
    if (L > R) R = L;
    //center.add(atpos);
    //i+=1;
  }, selection);
  return {
    "center": center,
    "radius": R
  };
}

function NGL_GetGeometricCenterArray(clusteri, some_data) {
  var center = new NGL.Vector3(0, 0, 0);
  //var i = 0;
  var R = 0;
  var npoints = clusteri.length;
  for (var i=0;i<npoints;i++){//} in clusteri) {
    var j = clusteri[i];
    var atpos = new NGL.Vector3(some_data[j][0], some_data[j][1], some_data[j][2]);
    center.add(atpos);
    //i += 1;
  }
  center.divideScalar(npoints);
  for (var i=0;i<npoints;i++){//} in clusteri) {
    var j = clusteri[i];
    var atpos = new NGL.Vector3(some_data[j][0], some_data[j][1], some_data[j][2]);
    var L = atpos.sub(center).length();
    if (L > R) R = L;
    //center.add(atpos);
    //i+=1;
  }
  return {
    "center": center,
    "radius": R
  };
}

function NGL_ClusterStructure(o, center) {
  return buildWithKmeans(o, center);
  //if (cluster_elem.selectedOptions[0].value==="Kmeans") return buildWithKmeans(o,center);
  //else if (cluster_elem.selectedOptions[0].value==="Optics") return buildWithOptics(o,center);
  //else if (cluster_elem.selectedOptions[0].value==="DBSCAN") return buildWithDBScan(o,center);
  //else return buildWithKmeans(o,center);
}

function NGL_ClusterVolume(v,iso,center) {
  var dataset = [];
  var pos = v.getDataPosition();
  var p=[];
  var j=0;
  for (var i=0;i<pos.length/3;i++) {
    var val = v.data[ i ];
    if (val > iso-0.1 && val < iso+0.1) {
      dataset.push([pos[j+0],pos[j+1],pos[j+2]]);
      p.push(pos[j+0]);p.push(pos[j+1]);p.push(pos[j+2]);
    }
    j+=3;
  }
  NGL_ShowSpheres(p,null);
  console.log("cluster!!", parseInt(slidercluster_elem.value), dataset.length);
  //should we use a worker ?
  // parameters: 3 - number of clusters
  //center the selection?.
  var kmeans = new KMEANS();
  var clusters = kmeans.run(dataset, parseInt(slidercluster_elem.value));
  console.log(clusters);
  return NGL_ClusterVolumeToBeads(clusters, dataset, center);
}

function buildWithOptics(o, center) {
  //slow ?
  var optics = new OPTICS();
  var ats = o.structure.atomStore;
  var nAtom = ats.count;
  var dataset = [];
  for (var i = 0; i < nAtom; i++) {
    dataset.push([ats.x[i], ats.y[i], ats.z[i]]);
  }
  // parameters: 6 - neighborhood radius, 2 - number of points in neighborhood to form a cluster
  var clusters = optics.run(dataset, parseInt(slidercluster_elem.value), 0); //parseInt(slidercluster_elem2.value));
  var plot = optics.getReachabilityPlot();
  console.log(clusters, plot); //cluster  is the list of cluster and indices. need a sphere for them
  return clusters;
}

function buildWithDBScan(o, center) {
  //slow ?
  var dbscan = new DBSCAN();
  var ats = o.structure.atomStore;
  var nAtom = ats.count;
  var dataset = [];
  for (var i = 0; i < nAtom; i++) {
    dataset.push([ats.x[i], ats.y[i], ats.z[i]]);
  }
  //// parameters: 5 - neighborhood radius, 2 - number of points in neighborhood to form a cluster
  var clusters = dbscan.run(dataset, parseInt(slidercluster_elem.value), 0); //, parseInt(slidercluster_elem2.value));
  console.log(clusters); //cluster  is the list of cluster and indices. need a sphere for them
  return clusters;
}
//https://github.com/EtixLabs/clustering
function buildWithKmeans(o, center) {
  //slow ?
  var kmeans = new KMEANS();
  var ats = o.structure.atomStore;
  var nAtom = ats.count;
  var asele = (o.ngl_sele) ? o.ngl_sele : "polymer";
  if (o.ngl_sele.string !== null) asele = o.ngl_sele.string;
  if (asele === "") asele = "polymer";
  console.log(asele); //current sele undefined
  var bu = false;
  console.log(o.assambly); //current assambly
  if (o.assambly !== "AU" && o.object.biomolDict[o.assambly]) {
    //need to apply the matrix to the selection inside the BU selection ?
    //console.log(o.object.biomolDict[o.assambly].getSelection());
    //build using given selection AND biomolDic selection
    asele = "(" + o.object.biomolDict[o.assambly].getSelection().string + ") AND " + asele;
    bu = true;
  }
  //console.log(asele);
  var dataset = [];
  o.structure.eachAtom(function(ap) {
    dataset.push([ap.x, ap.y, ap.z]);
  }, new NGL.Selection(asele));

  //center = NGL_GetGeometricCenter(o,asele);
  //for (var i=0;i<nAtom;i++) {
  //		 dataset.push([ats.x[i],ats.y[i],ats.z[i]]);
  //	}
  console.log("cluster!!", parseInt(slidercluster_elem.value), dataset.length);
  //should we use a worker ?
  // parameters: 3 - number of clusters
  //center the selection?
  var clusters = kmeans.run(dataset, parseInt(slidercluster_elem.value));
  console.log(bu, clusters);
  if (!bu) return NGL_ClusterToBeads(clusters, o, center);
  else {
    var pos = []; //flat array
    var rad = []; //flat array
    var nCluster = clusters.length;
    console.log("use center ", center);
    for (var i = 0; i < nCluster; i++) {
      var cl = clusters[i];
      //get center
      var sele = new NGL.Selection('@' + cl.join(','));
      //var sele = numbers.filter(CheckIfPrime);
      var sph = NGL_GetGeometricCenter(o, sele); //atom in cluster
      //var sph = NGL_GetGeometricCenterArray(cl,dataset);//atom in cluster
      //pos[pos.length] = sph.center.x-center.x;
      //pos[pos.length] = sph.center.y-center.y;
      //pos[pos.length] = sph.center.z-center.z;
      //rad[rad.length] = sph.radius;
      //add as many as matrixList.
      console.log(o.object.biomolDict[o.assambly].partList.length);
      console.log(o.object.biomolDict[o.assambly]);
      for (var j = 0; j < o.object.biomolDict[o.assambly].partList.length; j++) {
        console.log(o.object.biomolDict[o.assambly].partList[j].matrixList.length);
        for (var k = 0; k < o.object.biomolDict[o.assambly].partList[j].matrixList.length; k++) {
          var mat = o.object.biomolDict[o.assambly].partList[j].matrixList[k];
          var new_pos = new NGL.Vector3(sph.center.x, sph.center.y, sph.center.z);
          //console.log(new_pos);
          new_pos.applyMatrix4(mat);
          pos[pos.length] = new_pos.x - center.x;
          pos[pos.length] = new_pos.y - center.y;
          pos[pos.length] = new_pos.z - center.z;
          rad[rad.length] = sph.radius;
        }
      }
    }
    return {
      "pos": pos,
      "rad": rad
    };
    //return clusters;
  }
}

function NGL_ClusterVolumeToBeads(some_clusters, dataset, center) {
  var pos = []; //flat array
  var rad = []; //flat array
  var nCluster = some_clusters.length;
  console.log("use center ", center, nCluster);
  for (var i = 0; i < nCluster; i++) {
    var cl = some_clusters[i];
    console.log(cl.length,cl);
    var sph = NGL_GetGeometricCenterArray(cl, dataset);
    pos[pos.length] = sph.center.x - center.x;
    pos[pos.length] = sph.center.y - center.y;
    pos[pos.length] = sph.center.z - center.z;
    rad[rad.length] = sph.radius;
  }
  return {
    "centers": pos,
    "radii": rad
  };
}

function NGL_ClusterToBeads(some_clusters, astructure, center) {
  var pos = []; //flat array
  var rad = []; //flat array
  var nCluster = some_clusters.length;
  console.log("use center ", center);
  for (var i = 0; i < nCluster; i++) {
    var cl = some_clusters[i];
    var sele = new NGL.Selection('@' + cl.join(','));
    var sph = NGL_GetGeometricCenter(astructure, sele); //atom in cluster
    pos[pos.length] = sph.center.x - center.x;
    pos[pos.length] = sph.center.y - center.y;
    pos[pos.length] = sph.center.z - center.z;
    rad[rad.length] = sph.radius;
  }
  return {
    "pos": pos,
    "rad": rad
  };
}

function NGL_buildBeads(lod, o, center) {

  var _cluster_coords = NGL_ClusterStructure(o, center);
  console.log("cluster?");
  //var _cluster_coords = NGL_ClusterToBeads(_cluster,o,center);
  //console.log(_cluster_coords);
  var _pos = {
    "coords": _cluster_coords.pos
  };
  var _rad = {
    "radii": _cluster_coords.rad
  };
  if (!ngl_load_params.beads.pos) ngl_load_params.beads.pos = [];
  if (!ngl_load_params.beads.rad) ngl_load_params.beads.rad = [];
  ngl_load_params.beads.pos[lod] = _pos; //{"pos":[lvl0_pos,lvl1_pos],"rad":[lvl0_rad,lvl1_rad]};
  ngl_load_params.beads.rad[lod] = _rad;
  if (node_selected) {
    console.log("update node ", node_selected.data.name)
    node_selected.data.pos = JSON.parse(JSON.stringify(ngl_load_params.beads.pos));
    node_selected.data.radii = JSON.parse(JSON.stringify(ngl_load_params.beads.rad));
  }
}

function NGL_autoBuildBeads(o, center) {
  var beads0 = o.structure.boundingBox.getBoundingSphere();
  var bsize = o.structure.boundingBox.getSize();
  var biszea = bsize.toArray();
  //console.log("box size is",bsize,biszea);
  var R = Math.max.apply(null, biszea) / 2; //beads0.radius
  var lvl0_pos = {
    "coords": [beads0.center.x - center.x, beads0.center.y - center.y, beads0.center.z - center.z]
  };
  var lvl0_rad = {
    "radii": [R]
  };
  var lvl1_cluster_coords = NGL_ClusterStructure(o, center);
  //var lvl1_cluster_coords = NGL_ClusterToBeads(lvl1_cluster,o,center);
  var lvl1_pos = {
    "coords": lvl1_cluster_coords.pos
  };
  var lvl1_rad = {
    "radii": lvl1_cluster_coords.rad
  };
  console.log(lvl1_cluster_coords);

  //use getBoundingBox on subset of atom/per chain ? per
  //beads0.center.subVectors(center);
  console.log("radius is", R);
  ngl_load_params.beads = {
    "pos": [lvl0_pos, lvl1_pos],
    "rad": [lvl0_rad, lvl1_rad]
  };
  ngl_load_params.dobeads = true;
  console.log(beads0);
  console.log(o.structure.boundingBox);
  //update the node if current
  if (node_selected) {
    node_selected.data.pos = ngl_load_params.beads.pos;
    node_selected.data.radii = ngl_load_params.beads.radii;
  }
}

function NGL_LoadOneProtein(purl, aname, bu, sel_str) {

  if (ngl_current_node && ngl_current_node.data.surface) {
    document.getElementById('surface').setAttribute("class", "show");
    //update the elem
    NGL_updatePcpElem();
  } else {
    document.getElementById('surface').setAttribute("class", "hidden");
  }
  var isseq = document.getElementById("sequence_mapping").checked;
  if (isseq) querySequenceMapping(aname);
  console.log("load " + purl + " " + bu + " " + sel_str);
  //if its a surface protein show the modal for the pcpalAxis and the offset
  var params = {
    defaultRepresentation: false,
    name: aname
  };
  var assambly = "AU";
  if (bu !== -1 && bu !== null && bu !== "") {
    if (!bu.startsWith("BU") && bu !== "AU" && bu != "UNICELL" && bu !== "SUPERCELL") bu = "BU" + bu;
    params.assembly = bu;
    assambly = bu;
  }
  var sele = "";
  if (sel_str && sel_str != "") {
    sele = sel_str;
    //update html input string
  }
  sele_elem.value = sele;
  if (ngl_load_params.dogeom) {
    NGL_LoadAShapeObj(ngl_load_params.geom);
    ngl_load_params.dogeom = false;
  }
  //this is async!
  stage.loadFile(purl, params)
    .then(function(o) {
      ngl_current_structure = o;
      ngl_current_structure.sele = sele;
      ngl_current_structure.assambly = assambly;
      //const symmetryData = NGL_processSymmetry(o.symmetry)
      console.log("finished loading ");
      console.log(o.structure);
      //var sc = o.getView(new NGL.Selection(sele));
      //console.log("atomcenter",sc.atomCenter());
      //if (o.object.biomolDict.BU1) console.log(o.object.biomolDict.BU1);
      var center = NGL_GetGeometricCenter(o, new NGL.Selection(sele)).center;
      console.log("gcenter", center, ngl_force_build_beads);
      o.setPosition([-center.x, -center.y, -center.z]); //center molecule
      //ngl_force_build_beads
      if (ngl_force_build_beads) NGL_autoBuildBeads(o, center);
      if (ngl_load_params.doaxis) {
        //o.setPosition([ 0,0,0 ]);
        align_axis = true;
        var offset = ngl_load_params.axis.offset;
        console.log("offset?", offset);
        NGL_ShowAxisOffset(ngl_load_params.axis.axis, offset);
        //ngl_load_params.doaxis=false;
      }
      o.addRepresentation("axes", {
        sele: sele,
        showAxes: true,
        showBox: true,
        radius: 0.2
      })
      o.addRepresentation(rep_elem.selectedOptions[0].value, {
        colorScheme: color_elem.selectedOptions[0].value,
        sele: sele,
        name: "polymer",
        assembly: assambly
      });
    }).then(function() {
      var o = stage.getComponentsByName(aname).list[0];
      //console.log("finished with adding represnetation ");
      //console.log(o);
      //o.symmetryData=symmetryData;
      //console.log(symmetryData);
      NGL_UpdateAssamblyList(o);
      console.log("assambly is", assambly);
      NGL_setModelOptions(o); //redundant with selection ?
      NGL_setChainSelectionOptions(o);
      //setSymmetryOptions(o);
      //assambly_elem.selectedOptions[0].value = "BU"+bu;
      if (bu !== -1) $('#ass_type').val(assambly); //assambly_elem.selectedIndex = assambly;//$('#ass_type').val(assambly);//.change();
      else $('#ass_type').val("AU"); //assambly_elem.selectedIndex = "AU";//$('#ass_type').val("AU");//.change();

      var align_axis = false;

      if (ngl_load_params.dobeads) {
        NGL_LoadSpheres(ngl_load_params.beads.pos, ngl_load_params.beads.rad);
        ngl_load_params.dobeads = false;
        NGL_showBeadsLevel(beads_elem.selectedOptions[0]);
      }
      //label
      NGL_ShowOrigin();
      //if (label_elem.selectedOptions[0].value !=="None") {
      var ap = o.structure.getAtomProxy();
      o.structure.eachChain(function(cp) {
        var ign = false;
        cp.eachResidue(function(rp) {
          if (rp.resname == "DUM") ign = true
        });
        if (!ign) {
          ap.index = cp.atomOffset + Math.floor(cp.atomCount / 2)
          var e = o.addAnnotation(ap.positionToVector3(), cp.chainname)
          e.setVisibility(false);
        }
      }, new NGL.Selection("polymer"))
      //}
      //+o.structure.boundingBox.max.y
      //var p = {"x":o.structureView.center.x,"y":o.structureView.center.y+o.structure.boundingBox.max.y,"z":o.structureView.center.z};
      var p = {
        "x": 0,
        "y": o.structure.boundingBox.max.y,
        "z": 0
      };
      title_annotation.innerHTML = o.structure.title;
      pdb_id_elem.innerHTML = o.name;
      if (o.name.length === 4)
        pdb_id_elem.innerHTML = '<a href="https://www.rcsb.org/structure/' + o.name + '" target="_blank">' + o.name + '</a>';
      //title_annotation = o.addAnnotation(p,(o.structure.title)?o.structure.title:o.name);
      o.autoView();
      //console.log(p);
      //console.log(o);
      if (align_axis) {
        var a = ngl_load_params.axis.axis;
        var ax = new NGL.Vector3(a[0], a[1], a[2]);
        ax.cross(new NGL.Vector3(0, 1, 0));
        console.log(ax);
        var q = new NGL.Quaternion();
        q.setFromAxisAngle(ax, Math.PI / 2);
        stage.animationControls.rotate(q, 0);
      } //stage.animationControls.rotate(ngl_load_params.axis.axis.getRotationQuaternion(), 0);
      else stage.animationControls.rotate(o.structure.getPrincipalAxes().getRotationQuaternion(), 0);
    });
}

function NGL_compartmentSphere(name, radius) {
  stage.removeAllComponents();
  var shape = new NGL.Shape("geom_surface", {
    disableImpostor: true,
    radialSegments: 10
  });
  shape.addSphere([0, 0, 0], [1, 0, 0], radius);
  var shapeComp = stage.addComponentFromObject(shape);
  shapeComp.addRepresentation("geom_surface"); //wireframe ?
  //add a line to show the radius ?
  title_annotation.innerHTML = name;
  pdb_id_elem.innerHTML = name;
  stage.autoView();
  return {
    "name": name,
    "radius": radius
  };
}

function NGL_multiSpheres(pos, radii) {
  var shape = new NGL.Shape("multispheres", {
    disableImpostor: true,
    radialSegments: 10
  });
  var p=0;
  for (var i=0;i<radii.length;i++) {
    //position,color,radii,label
    shape.addSphere([pos[p],pos[p+1],pos[p+2]], [1, 0, 0], radii[i],i.toString());
    p+=3;
  }
  var shapeComp = stage.addComponentFromObject(shape);
  shapeComp.addRepresentation("multispheres_rep"); //wireframe ?
  //add a line to show the radius ?
  //stage.autoView();
}

function NGL_multiSpheresComp(pos, radii) {
  var p=0;
  for (var i=0;i<radii.length;i++) {
    //position,color,radii,label
    var shape = new NGL.Shape(i.toString(), {
      disableImpostor: true,
      radialSegments: 10
    });
    shape.addSphere([pos[p],pos[p+1],pos[p+2]], [1, 0, 0], radii[i],i.toString());
    p+=3;
    var shapeComp = stage.addComponentFromObject(shape);
    shapeComp.addRepresentation("multispheres_rep"+i.toString()); //wireframe ?
  }
}

function NGL_noPdbProxy(name, radius) {
  var align_axis = false;
  NGL_ShowOrigin();
  if (ngl_load_params.dogeom) {
    NGL_LoadAShapeObj(ngl_load_params.geom);
    ngl_load_params.dogeom = false;
  }
  if (ngl_load_params.dobeads) {
    NGL_LoadSpheres(ngl_load_params.beads.pos, ngl_load_params.beads.rad);
    ngl_load_params.dobeads = false;
    NGL_showBeadsLevel(beads_elem.selectedOptions[0]);
  }
  //label
  var shape = new NGL.Shape("proxy", {
    disableImpostor: true,
    radialSegments: 10
  });
  shape.addSphere([0, 0, 0], [1, 0, 0], radius);
  var shapeComp = stage.addComponentFromObject(shape);
  shapeComp.addRepresentation("proxy" + name, {
    wireframe: true
  }); //wireframe ?

  console.log(name, radius);
  title_annotation.innerHTML = name;
  pdb_id_elem.innerHTML = name;
  if (align_axis) {
    var a = ngl_load_params.axis.axis;
    var ax = new NGL.Vector3(a[0], a[1], a[2]);
    ax.cross(new NGL.Vector3(0, 1, 0));
    console.log(ax);
    var q = new NGL.Quaternion();
    q.setFromAxisAngle(ax, Math.PI / 2);
    stage.animationControls.rotate(q, 0);
  } //stage.animationControls.rotate(ngl_load_params.axis.axis.getRotationQuaternion(), 0);
  stage.autoView();
}

/*
//example for distances
stage.loadFile( "rcsb://1crn", { name: "myProtein" } ).then( function( o ){

    o.autoView();
    o.addRepresentation( "cartoon" );

} ).then( function(){

    stage.getComponentsByName( "myProtein" ).addRepresentation( "distance", {
        atomPair: [ [ "10.CA", "25.CA" ] ],
        color: "skyblue"
    } );

} );
*/

function NGL_UpdateWithNode(d) {
  //what is the id//
  //this is called from the canvas
  console.log("update with ", d);
  ngl_current_item_id = d.data.id;
  ngl_current_node = d;
  document.getElementById('ProteinId').innerHTML = d.data.name;
  stage.removeAllComponents();
  ngl_force_build_beads = false;
  if (d.data.geom) {
    if ("geom_type" in d.data) {
      ngl_load_params.geom = d.data.geom; //geom_purl + geom_name + ".obj"; //NGL_LoadAShapeObj(  );
      ngl_load_params.dogeom = true;
    } else ngl_load_params.dogeom = false;
  }
  if ("pos" in d.data && d.data.pos && d.data.pos.length !== 0) {
    console.log("found some position", JSON.stringify(d.data.pos));
    ngl_load_params.beads = {
      "pos": d.data.pos,
      "rad": d.data.radii
    };
    ngl_load_params.dobeads = true;
    //NGL_LoadSpheres( node_selected.data.pos,node_selected.data.radii );
  } else {
    console.log("no position?", console.log(d.data));
    //ngl_load_params.beads = {"pos":[],"rad":[]};
    //ngl_force_build_beads = true;
  }
  if ("offset" in d.data) {
    ngl_load_params.axis = {
      "axis": d.data.pcpalAxis,
      "offset": d.data.offset
    }
    ngl_load_params.doaxis = true;
    //NGL_ShowAxisOffset( d.data.pcpalAxis,d.data.offset );
    console.log("axis", ngl_load_params.axis)
  }

  if ("source" in d.data) {
    if (!d.data.source.pdb || d.data.source.pdb === "None") {
      //build a sphere of size radius
      NGL_noPdbProxy(d.data.name, d.data.size);
      return;
    }
    var bu = -1;
    var sel_str = ""
    if ("bu" in d.data.source) {
      bu = d.data.source.bu;
    }
    if ("selection" in d.data.source) {
      sel_str = d.data.source.selection;
    }

    if (d.data.source.pdb.length === 4)
      NGL_LoadOneProtein("rcsb://" + d.data.source.pdb + ".mmtf", d.data.source.pdb, bu, sel_str);
    else {
      var pdbname = d.data.source.pdb;
      var ext = pdbname.slice(-4, pdbname.length);
      if (pdbname.startsWith("EMD") || pdbname.startsWith("EMDB") || pdbname.slice(-4, pdbname.length) === ".map") {
        var params = {
          defaultRepresentation: true
        };
        //this is async!
        console.log("try to load ", pdbname, ext);
        if (ext !== ".map") pdbname = pdbname + ".map";
        if (folder_elem && folder_elem.files.length != "") {
          //ftp://ftp.ebi.ac.uk/pub/databases/emdb/structures/EMD-5239/map/emd_5239.map.gz
          stage.loadFile(pathList_[pdbname], params);
        } else {
          var purl = cellpack_repo+"other/" + pdbname;
          stage.loadFile(purl, params);
        }
        if (pdbname.startsWith("EMD-"))
        {
          pdb_id_elem.innerHTML = '<a href="https://www.ebi.ac.uk/pdbe/entry/emdb/' + pdbname.split(".")[0] + '" target="_blank">' + pdbname + '</a>';
        }
      } else {
        if (folder_elem && folder_elem.files.length != "") {
          //alert(pathList_[d.data.source]),
          NGL_LoadOneProtein(pathList_[d.data.source.pdb], d.data.source.pdb, bu, sel_str);
        } else {
          var purl = cellpack_repo+"other/" + d.data.source.pdb;
          NGL_LoadOneProtein(purl, d.data.source.pdb, bu, sel_str);
        }
      }
    }
  } else {
    NGL_noPdbProxy(d.data.name, d.data.size);
    //if (ngl_load_params.dogeom) {NGL_LoadAShapeObj(ngl_load_params.geom);ngl_load_params.dogeom=false;}
    //if (ngl_load_params.dobeads) {NGL_LoadSpheres(ngl_load_params.beads.pos,ngl_load_params.beads.rad);ngl_load_params.dobeads=false;}
    //if (ngl_load_params.doaxis) {NGL_ShowAxisOffset(ngl_load_params.axis.axis,ngl_load_params.axis.offset);ngl_load_params.doaxis=false;}
  }
}


function NGL_UpdateWithNodePair(d) {
  stage.removeAllComponents();
  document.getElementById('ProteinId').innerHTML = d.source.data.name + " " + d.target.data.name;
  var asele = ""
  var pdb;
  console.log(d);

  if (d.sel1) asele += d.sel1;
  if (d.sel2) asele += d.sel2;
  if (!d.pdb1 || d.pdb1 === "") {
    //use the pdb of the ingredient ?
    pdb = d.source.data.source.pdb;
    ngl_current_node = d.source;
    NGL_Load(pdb, "AU", ""); //transform ?
    //ngl_current_structure.setPosition([ -200,0,0 ])
    pdb = d.target.data.source.pdb;
    ngl_current_node = d.source;
    NGL_Load(pdb, "AU", ""); //transform ?
    //ngl_current_structure.setPosition([ 200,0,0 ])

  } else {
    NGL_Load(d.pdb1, "AU", NGL_GetSelection(asele, ""));
  }
  //colorByChain?
  //NGL_Load(d.pdb2,"AU",NGL_GetSelection(d.sel2,""));
}


function NGL_Load(pdbname, bu, sel_str) {
  if (ngl_grid_mode) {
    console.log("clean gridmode");
    //change back the style
    ngl_grid_mode = false;
    //remove the div
    viewport.parentNode.removeChild(viewport);
    pcontainer.appendChild(viewport);
    //"width:100%; height:95%;"
    viewport.setAttribute("style", "width:100%; height:95%;");
    stage.handleResize();
    $('.nglgrid').remove();
    ngl_grid_heading.innerText = "";
  }

  if (pdbname.length === 4) {
    NGL_LoadOneProtein("rcsb://" + pdbname + ".mmtf", pdbname, bu, sel_str);
  } else {
    var ext = pdbname.slice(-4, pdbname.length);
    if (pdbname.startsWith("EMD") || pdbname.startsWith("EMDB") || pdbname.slice(-4, pdbname.length) === ".map") {
      var params = {
        defaultRepresentation: true
      };
      //this is async!
      console.log("try to load ", pdbname, ext);
      if (ext !== ".map") pdbname = pdbname + ".map";
      if (folder_elem && folder_elem.files.length != "") {
        console.log("try to load ", folder_elem.files.length);
        //ftp://ftp.ebi.ac.uk/pub/databases/emdb/structures/EMD-5239/map/emd_5239.map.gz
        stage.loadFile(pathList_[pdbname], params);
      } else {
        var purl = cellpack_repo+"other/" + pdbname;
        stage.loadFile(purl, params);
      }
      if (pdbname.startsWith("EMD-"))
      {
        pdb_id_elem.innerHTML = '<a href="https://www.ebi.ac.uk/pdbe/entry/emdb/' + pdbname.split(".")[0] + '" target="_blank">' + pdbname + '</a>';
      }
    } else {
      //what about emdb
      if (folder_elem && folder_elem.files.length != "") {
        //alert(pathList_[d.data.source]),
        NGL_LoadOneProtein(pathList_[pdbname], pdbname, bu, sel_str);
      } else {
        var purl = cellpack_repo+"other/" + pdbname;
        NGL_LoadOneProtein(purl, pdbname, bu, sel_str);
      }
    }
  }
}

//either use a data provider or a asyncpostrender in slick grid
//https://github.com/6pac/SlickGrid/blob/master/examples/example10-async-post-render.html
//https://github.com/6pac/SlickGrid/blob/master/examples/example6-ajax-loading.html
//let the server do everything in one call that send elem by elem ?

function BuildAllBeads() {
  //show the stop button
  document.getElementById('stopbeads').setAttribute("class", "spinner");
  document.getElementById("stopbeads_lbl").setAttribute("class", "show");
}

function stopBeads() {
  document.getElementById('stopbeads').setAttribute("class", "spinner hidden");
  document.getElementById("stopbeads_lbl").setAttribute("class", "hidden");
  stop_current_compute = true;
}

function BuildAllGeoms() {
  //show the stop button
  document.getElementById('stopgeoms').setAttribute("class", "spinner");
  document.getElementById("stopgeoms_lbl").setAttribute("class", "show");
}

function stopGeoms() {
  document.getElementById('stopgeoms').setAttribute("class", "spinner hidden");
  document.getElementById("stopgeoms_lbl").setAttribute("class", "hidden");
}

function stopGeom() {
  document.getElementById('stopbuildgeom').setAttribute("class", "spinner hidden");
  document.getElementById("stopbuildgeom_lbl").setAttribute("class", "hidden");
  //stop waiting ?
}

function stopKmeans() {
  document.getElementById('stopkmeans').setAttribute("class", "spinner hidden");
  document.getElementById("stopkmeans_lbl").setAttribute("class", "hidden");
  //stop waiting ?
}
/*var colorMap = new Map()
var chainNameScheme = NGL.ColorMakerRegistry.getScheme( {scheme: 'chainname', structure: structure})

structure.eachChain( chain => {
  colorMap.set( chain.chainname,
    chainNameScheme.atomColor(structure.getAtomProxy(chain.atomOffset)).toString(16)
})

console.log(colorMap)*/
