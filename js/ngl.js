var stage;
var pathList_ = {};
var folder_elem = document.getElementById("file_input");
var rep_elem = document.getElementById("rep_type");
var assembly_elem = document.getElementById("ass_type");
var sele_elem = document.getElementById("sel_str");
var model_elem = document.getElementById("mod_type");
var color_elem = document.getElementById("color_type");
var sym_elem = document.getElementById("sym_elem");
var label_elem = document.getElementById("label_elem");
var beads_elem = document.getElementById("beads_elem");
var beads_color_elem = document.getElementById("beads_color_elem");
var heading = document.getElementById("heading");
var grid_viewport = document.getElementById("viewport"); //createElement( "div" );
var pdb_id_elem;
var ngl_current_pickingProxy;
var nlg_preview_isosurface = true;
var pcp_elem = [];
var offset_elem = [];
var yoffset_2d_elem;
var ylength_2d_elem;
var ngl_geom_opacity = 1.0;
var use_mglserver_beads = false;
var ill_style = document.getElementById("ill_style");
var ngl_scene_control = document.getElementById("ngl_scene_control");
var ngl_interaction_view = false;
var nLod = 3;
var slidercluster_elem;
//var slidercluster_label_elem;
var slidercluster_elem2;
var slidercluster_label_elem2;
var cluster_elem;
var nbBeads_elem;
var ngl_force_build_beads = false;
var slidercl_params2;
var ngl_cluster_automatic = false;
var ngl_cluser_sequence = false;
var ngl_cluster_grid = false;
var toggle_cluster_edit;
var toggle_cluster_grid;
var toggle_cluster_grid_from_LOD0;
var force_do_cms = true;
var force_do_beads = true;
var resize_nodes = false;
var cluster_force_radius = -1.0;
var cluster_avg_radius = false;
var use_cluster_radius = false;
var current_annotation;
var title_annotation = document.getElementById("pdb_title");
var node_to_illustrate;
var repToChange;
var selToChange;
var buToChange;
var force_not_dobeads = true;
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
  "dobeads_pairs": false,
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

var litemol_current_model;

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

var cms_scale = 0.2;
var ngl_styles = ["cartoon","spacefill","licorice","surface","cms"];

var geom_purl = cellpack_repo+"geometries/"

function NGL_Clear(){
  stage.removeAllComponents();
  ngl_current_structure = null;
  ngl_current_node = null;
  ngl_current_item_id = null;
}

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

function NGL_resetPcp()
{
  var acomp = stage.getComponentsByName("mb").list[0];
  acomp.setRotation([0,0,0,1]);
  acomp.setPosition([0,0,0]);
  var acomp2 = stage.getComponentsByName("arrowfiber").list[0];
  acomp2.setRotation([0,0,0,1]);
  acomp2.setPosition([0,0,0]);
  var axis = new NGL.Vector3(0, 0, 1);//quat.multiplyVector3(new NGL.Vector3(0, 0, 1));
  var offset = new NGL.Vector3(0, 0, 0);
  if (node_selected){
    if (ngl_current_structure && node_selected.data.opm == 1)
    {
      var center = ngl_current_structure.gcenter;
      offset = [center.x,center.y,center.z];
      axis = [0,0,1];
    }
  }
  //offset.applyQuaternion() quat.inverse().multiplyVector3(pos);
  pcp_elem[0].value = axis.x*100;
  pcp_elem[1].value = axis.y*100;
  pcp_elem[2].value = axis.z*100;
  offset_elem[0].value = offset.x;
  offset_elem[1].value = offset.y;
  offset_elem[2].value = offset.z;
  for (var i = 0; i < 3; i++) {
    $(pcp_elem[i]).siblings('.inputNumber').val(pcp_elem[i].value);
    $(offset_elem[i]).siblings('.inputNumber').val(offset_elem[i].value);
  }
  NGL_applyPcp(axis,offset);
}

function NGL_applyOffsetY2D(value){
    node_selected.data.sprite.offsety = value;
}

function NGL_applyLengthY2D(value){
    node_selected.data.sprite.lengthy = value;
}

function NGL_applyPcp(axis,offset,asyncloop=false) {
  if (!axis) axis = [pcp_elem[0].value / 100.0, pcp_elem[1].value / 100.0, pcp_elem[2].value / 100.0];
  if (!offset) offset = [offset_elem[0].value / 1.0, offset_elem[1].value / 1.0, offset_elem[2].value / 1.0];
  ngl_load_params.axis.axis = axis;
  ngl_load_params.axis.offset = offset;
  //update table and node
  if (ngl_current_item_id) {
    //updateDataGridRowElem(0, ngl_current_item_id, "pcpalAxis", axis);
    //updateDataGridRowElem(0, ngl_current_item_id, "offset", offset);
  }
  if (node_selected) {
    node_selected.data.pcpalAxis = axis;
    node_selected.data.offset = offset;
    if (node_selected.data.sprite){
      if (node_selected.data.sprite.scale2d!==0) {
          var acomp = stage.getComponentsByName("mb").list[0];
          var o = new NGL.Vector3(offset[0], offset[1], offset[2]);
          var off = o.length();
          if (acomp)
          {
            var screen_pos = NGL_getScreenPosition(acomp.position);
            if (screen_pos.y < viewport.offsetHeight/2) {off = -off;}
          }          
          /*
          var q = new NGL.Quaternion();
          q.setFromUnitVectors(new NGL.Vector3(0, 0, 1), new NGL.Vector3(axis[0], axis[1], axis[2]));
          var o = new NGL.Vector3(offset[0], offset[1], offset[2]);
          var c = ngl_current_structure.gcenter;
          o.add(c);
          var d = NGL_getDistanceOnScreen(o,c);
          */
          node_selected.data.sprite.offsety = off;
      }
    }
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

function NGL_updateMetaBalls(anode){
  if (!anode) anode = node_selected;
  if (!anode.data.nodetype === "compartment") return;
  if (!ngl_marching_cube) ngl_marching_cube = new NGL.MarchingCubes(30, null, true, false);
  ngl_marching_cube.reset();
  if (!("pos" in anode.data)||(anode.data.pos === null)||(anode.data.pos.length===0)) {
    anode.data.pos = [{"coords":[0.0,0.0,0.0]}];
    anode.data.radii=[{"radii":[500.0]}];
    anode.data.types=[{"types":[1]}];
  }
  //iso,padding
  ngl_marching_cube.update(anode.data.pos[0].coords,anode.data.radii[0].radii,0.2,0.0);
  ngl_marching_cube.isolation = 0.0;
  //NGL_updateMetaBallsGeom(anode);
}

function NGL_updateMetaBalls1(anode) {
  if (!anode) anode = node_selected;
  if (!anode.data.nodetype === "compartment") return;
  if (!ngl_marching_cube) ngl_marching_cube = new NGL.MarchingCubes(30, null, true, false);
  ngl_marching_cube.reset();
  if (!("pos" in anode.data)||(anode.data.pos === null)||(anode.data.pos.length===0)) {
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
  if (!("pos" in anode.data)||(anode.data.pos === null)||(anode.data.pos.length===0)) {
    anode.data.pos = [{"coords":[0.0,0.0,0.0]}];
    anode.data.radii=[{"radii":[500.0]}];
    anode.data.types=[{"types":[0]}];
  }
  if (!anode.data.color) anode.data.color = [0,1,0];
  var colors = anode.data.radii[0].radii.map(x=>anode.data.color);
  NGL_multiSpheresComp(anode.data.name,anode.data.pos[0].coords,
                          anode.data.radii[0].radii.map(x=>x/2.0),
                          colors,
                          1.0);//box around ?
  if (nlg_preview_isosurface){
    if (!ngl_marching_cube) ngl_marching_cube = new NGL.MarchingCubes(30, null, true, false);
    NGL_updateMetaBalls(anode);
    var geo = ngl_marching_cube.generateGeometry();
    console.log(geo);
    geo.name = anode.data.name;
    NGL_MetaBallsGeom(geo);
  }
}

function NGL_MetaBallsGeom(geo){
  var comp = stage.getComponentsByName(geo.name+"_metab_surface");
  if (comp.list) {
    stage.removeComponent(comp.list[0]);
  }
  var shape = new NGL.Shape(geo.name+"_metab_surface");
  var col = Array(geo.vertices.length).fill(1);
  shape.addMesh( //position, color, index, normal
    geo.vertices, // a plane
    col, // all green
    geo.faces//,
    //mesh.normals
  );

  var shapeComp = stage.addComponentFromObject(shape);
  //shapeComp.setScale(ngl_marching_cube.data_bound.maxsize/2.0);
  //shapeComp.setPosition(ngl_marching_cube.data_bound.center);//this is the position,
  shapeComp.setScale(ngl_marching_cube.data_bound.maxsize/2.0);//this is the scale,
  var pos = new NGL.Vector3(0,0,0);
  pos.x = (ngl_marching_cube.data_bound.min.x + ngl_marching_cube.data_bound.maxsize/2.0);//+w/2.0;//+w/2.0;//center of the box
  pos.y = (ngl_marching_cube.data_bound.min.y + ngl_marching_cube.data_bound.maxsize/2.0);//+h/2.0;//+h/2.0;
  pos.z = (ngl_marching_cube.data_bound.min.z + ngl_marching_cube.data_bound.maxsize/2.0);//+d/2.0;//+d/2.0;
  //shapeComp.setPosition(pos);//this is the position,
  shapeComp.setPosition(ngl_marching_cube.data_bound.center);//this is the position,
  var r = shapeComp.addRepresentation(geo.name+"_metab_surface", {
    opacity: 0.5,
    side: "back",//"double",
    //wireframe: true
  });
}

function NGL_ToggleMetaGeom(e)
{
  var anode = node_selected;
  if (!anode.parent) //root
  {
    //for root need to go through all of them
  }
  else {
    var comp = stage.getComponentsByName(anode.data.name+"_metab_surface");
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
        geo.name = anode.data.name;
        NGL_MetaBallsGeom(geo);
      }
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

//example from some coords
//vFrom = new NGL.Vector3(0, 1, 0);
//a = new NGL.Vector3(c[0], c[1], c[2]);
//b = new NGL.Vector3(c[6], c[7], c[8]);
//c = new NGL.Vector3(c[3], c[4], c[5]);
//vTo = new NGL.Vector3()
//vTo.subVectors(a,b);// b - a;//.add .fromArray .multiplyScalar .negate .subVectors
//vTo.normalize()
//pTo = c;
//NGL_applyPcp(vTo,c)
function NGL_AlignPcpTo(vFrom,vTo,pTo) {
  var quat = new NGL.quaternion();
  quat.setFromUnitVectors ( vFrom, vTo );
  var axis = new NGL.Vector3(0, 0, 1);
  axis.applyQuaternion(quat);
  var offset = pTo;
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

function NGL_updateArrowDrag(acomp) {
    //update arrowfiber
    if (!acomp) acomp = stage.getComponentsByName("arrowfiber").list[0];
    var pos = acomp.position; //global position
    var quat = acomp.quaternion; //local rotation
    var axis = new NGL.Vector3(0, 0, 1);//quat.multiplyVector3(new NGL.Vector3(0, 0, 1));
    axis.applyQuaternion(quat);
    var offset = pos;
    //offset.applyQuaternion() quat.inverse().multiplyVector3(pos);
    pcp_elem[0].value = axis.x*100;
    pcp_elem[1].value = axis.y*100;
    pcp_elem[2].value = axis.z*100;
    offset_elem[0].value = offset.x;
    offset_elem[1].value = offset.y;
    offset_elem[2].value = offset.z;
    for (var i = 0; i < 3; i++) {
      $(pcp_elem[i]).siblings('.inputNumber').val(pcp_elem[i].value);
      $(offset_elem[i]).siblings('.inputNumber').val(offset_elem[i].value);
    }
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
  if (node_selected.data.ingtype=="fiber" || document.getElementById("showaxis").checked ) acomp = stage.getComponentsByName("arrowfiber").list[0];;
  if (!acomp) return;
  var q = new NGL.Quaternion();
  axis = new NGL.Vector3(axis[0], axis[1], axis[2]);//normalize ?
  q.setFromUnitVectors(new NGL.Vector3(0, 0, 1), axis.normalize());
  //console.log(q,new NGL.Vector3(axis[0],axis[1],axis[2]));
  acomp.setRotation(q);
  if (node_selected.data.ingtype!="fiber" && !document.getElementById("showaxis").checked ) acomp.setPosition([-offset[0], -offset[1], -offset[2]]);
  else acomp.setPosition([offset[0], offset[1], offset[2]]);
  console.log("NGL_update axis ?", axis, offset);
  //change the grid ? or the data or both ?
  pcp_elem[0].value = axis.x*100;
  pcp_elem[1].value = axis.y*100;
  pcp_elem[2].value = axis.z*100;
  for (var i = 0; i < 3; i++) {
    $(pcp_elem[i]).siblings('.inputNumber').val(pcp_elem[i].value);
  }
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

function NGL_panDrag(astage, dx, dy){
    if (ngl_current_pickingProxy === null || ngl_scene_control.checked) astage.trackballControls.pan(dx, dy)
    else {
      //only sphere and disck and arrow
      if (ngl_current_pickingProxy !== null) {
        if(ngl_current_pickingProxy.sphere || ( ngl_current_pickingProxy.component && ( ngl_current_pickingProxy.component.name==="mb" || ngl_current_pickingProxy.component.name==="arrowfiber" )))
        {
          astage.trackballControls.panComponent(dx, dy);
        }
      }
    }
}

function NGL_rotateDrag(astage, dx, dy){
  if (ngl_current_pickingProxy === null || ngl_scene_control.checked) astage.trackballControls.rotate(dx, dy);//there is also  .zRotate(dx, dy)
  else {
    //only sphere and disck and arrow
    if (ngl_current_pickingProxy !== null) {
      if(ngl_current_pickingProxy.sphere || ( ngl_current_pickingProxy.component && ( ngl_current_pickingProxy.component.name==="mb" || ngl_current_pickingProxy.component.name==="arrowfiber" )))
      {
          astage.trackballControls.rotateComponent(dx, dy)
        }
    }
  }
}


function NGL_Setup() {
  folder_elem = document.getElementById("file_input");
  rep_elem = document.getElementById("rep_type");
  assembly_elem = document.getElementById("ass_type");
  sele_elem = document.getElementById("sel_str");
  model_elem = document.getElementById("mod_type");
  color_elem = document.getElementById("color_type");
  sym_elem = document.getElementById("sym_elem");
  label_elem = document.getElementById("label_elem");
  beads_elem = document.getElementById("beads_elem");
  beads_color_elem = document.getElementById("beads_color_elem");
  cluster_elem = document.getElementById("cluster_elem");
  nbBeads_elem = document.getElementById("nbBeads");
  pdb_id_elem = document.getElementById("pdb_id");

  pcp_elem.push(document.getElementById("pcpX"));
  pcp_elem.push(document.getElementById("pcpY"));
  pcp_elem.push(document.getElementById("pcpZ"));

  offset_elem.push(document.getElementById("offsetX"));
  offset_elem.push(document.getElementById("offsetY"));
  offset_elem.push(document.getElementById("offsetZ"));

  yoffset_2d_elem = document.getElementById("2d_yoffset_range");
  ylength_2d_elem  = document.getElementById("2d_length_range");
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
    //console.log(this.id)
    //console.log(this)
    if (this.id.startsWith("2d_yoffset")) 
    {
      NGL_applyOffsetY2D(this.value)
    }
    else if (this.id.startsWith("2d_length")) 
    {
      NGL_applyLengthY2D(this.value)
    }
    else if (this.id.endsWith("Force")) 
    {
      var forcename = this.id.split("_")[1];
      //change forces value
      AllForces[forcename] = this.value;
      updateForce();
    }
    else if (this.id.startsWith("legends_")){
      var lename = this.id.split("_")[1];
      legends[lename] = this.value;
    }
    else if (this.id.startsWith("stroke_line")){
      stroke_line_width = parseFloat(this.value);
    }
    else if (this.id.startsWith("radius_scale")){
      radius_scale = parseFloat(this.value);
      mapRadiusToProperty_cb(document.getElementById("canvas_map_r").value);
    }
    else {
      NGL_updateMBcomp();
      NGL_applyPcp();
    }
  });
  

  slidercluster_elem = document.getElementById("slidercl_params1");
  slidercl_params2= document.getElementById("slidercl_params11");
  //slidercluster_label_elem = document.getElementById("cl_params1");

  slidercluster_elem.addEventListener('input', function(e) {
    //slidercluster_label_elem.textContent = slidercluster_elem.value;
    slidercl_params2.value = slidercluster_elem.value;
  });
  slidercluster_elem.addEventListener('mouseup', function(e) {
    NGL_updateCurrentBeadsLevel();
  });

  slidercl_params2.addEventListener('input', function(e) {
    //slidercluster_label_elem.textContent = slidercl_params2.value;
    slidercluster_elem.value = slidercl_params2.value;
    NGL_updateCurrentBeadsLevel();
  });

  slidercl_params2.addEventListener('onchange', function(e) {
    slidercluster_elem.value = slidercl_params2.value;
    NGL_updateCurrentBeadsLevel();
  });

  var cl_radius = document.getElementById("cl_radius");
  cl_radius.addEventListener('onchange', function(e) {
    NGL_updateCurrentBeadsLevel();
  });

  slidercluster_elem2 = document.getElementById("slidercl_params2");
  slidercluster_label_elem2 = document.getElementById("cl_params2");
  slidercluster_elem2.addEventListener('input', function(e) {
      slidercluster_label_elem2.textContent = slidercluster_elem2.value;
  });
  slidercluster_elem2.addEventListener('mouseup', function(e) {
      cms_scale = slidercluster_elem2.value;
      NGL_buildCMS();
  });

  toggle_cluster_edit= document.getElementById("toggle_cluster_edit");
  //toggle_cluster_grid= document.getElementById("toggle_cluster_grid");

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
  ngl_scene_control = document.getElementById("ngl_scene_control");

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
  //stage.setParameters({cameraType: "orthographic"});//perspective
  stage.mouseControls.add("scroll-ctrl", 
    function (stage,delta)
    {
      console.log("scrolled "+delta.toString());
      console.log(delta);
      if (!ngl_current_pickingProxy) return;
      if (ngl_current_pickingProxy.sphere) {
        var asplit = ngl_current_pickingProxy.sphere.name.split("_");
        var name = asplit[0];
        if (name === "lod" ){
          //resize beads
          var lod = parseInt(asplit[1]);
          var lodid=parseInt(asplit[3]);
          console.log("lod "+lod.toString()+" "+lodid.toString());
          //anode should be the current selected node
          var change = 1.0;
          var r = parseFloat(node_selected.data.radii[lod].radii[lodid]);
          var rr = ngl_current_pickingProxy.sphere.radius;
          if (delta < 0.0) {
            node_selected.data.radii[lod].radii[lodid] = r-change;       
          }
          else {
            node_selected.data.radii[lod].radii[lodid] = r+change;
          }
          if (node_selected.data.radii[lod].radii[lodid]<0) node_selected.data.radii[lod].radii[lodid] = 1.0;
          ngl_current_pickingProxy.component.setScale(node_selected.data.radii[lod].radii[lodid]/rr);
        }
        else {
          //resize metaballs
          var anode = getNodeByName(name);
          var mbi = parseInt( (asplit.length>1)? asplit[1]:"0");
          var change = 1.0;
          var r = parseFloat(node_selected.data.radii[0].radii[mbi]);
          var rr = ngl_current_pickingProxy.sphere.radius;
          if (delta < 0.0) {
            anode.data.radii[0].radii[mbi] = r-change;       
          }
          else {
            anode.data.radii[0].radii[mbi] = r+change;
          }
          if (node_selected.data.radii[0].radii[mbi]<0) node_selected.data.radii[0].radii[mbi] = 1.0;
          ngl_current_pickingProxy.component.setScale((node_selected.data.radii[0].radii[mbi]/2)/rr);
          //change the compslider value but no trigger ?
          comp_slider.value = node_selected.data.radii[0].radii[mbi];
          comp_slider_num.value = node_selected.data.radii[0].radii[mbi];
          if (nlg_preview_isosurface) {
            NGL_updateMetaBalls(anode);
            var geo = ngl_marching_cube.generateGeometry();
            //how to update the shape mesh instead of recreating it
            geo.name = name;
            NGL_MetaBallsGeom(geo);
          }
        }
      }
    });
  //and shift ?
  //stage.mouseControls.add("drag-ctrl", 
  stage.mouseObserver.signals.dragged.add(
    function (deltaX,deltaY){
      if (ngl_scene_control.checked) return;
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
      NGL_applyPcp();
    }
    else if(ngl_current_pickingProxy.component && ngl_current_pickingProxy.component.name==="arrowfiber") {
      //update pcpAxis and rotaiton
      NGL_updateArrowDrag(ngl_current_pickingProxy.component)
      NGL_applyPcp();
    }
    else if (ngl_current_pickingProxy.sphere) {
      var asplit = ngl_current_pickingProxy.sphere.name.split("_");
      var name = asplit[0];
      if (name === "lod" ){
        var cpos = new NGL.Vector3();
        cpos.copy(ngl_current_pickingProxy.position);
        var lod = parseInt(asplit[1]);
        var lodid=parseInt(asplit[3]);
        console.log("lod "+lod.toString()+" "+lodid.toString());
        var pi = lodid*3;
        //anode should be the current selected node
        node_selected.data.pos[lod].coords[pi] = cpos.x;
        node_selected.data.pos[lod].coords[pi+1] = cpos.y;
        node_selected.data.pos[lod].coords[pi+2] = cpos.z;
      }
      else 
      //retrieve the node with this name
      {
        var anode = getNodeByName(name);
        var mbi = parseInt( (asplit.length>1)? asplit[1]:"0");
        var pi = mbi*3;
        var cpos = new NGL.Vector3();
        console.log(name,mbi,pi,anode);
        console.log("update ",pi,anode.data.pos[0].coords);
        cpos.copy(ngl_current_pickingProxy.position);
        anode.data.pos[0].coords[pi] = cpos.x;
        anode.data.pos[0].coords[pi+1] = cpos.y;
        anode.data.pos[0].coords[pi+2] = cpos.z;
        //console.log("update ",pi,anode.data.pos[0].coords);
        if (nlg_preview_isosurface) {
          NGL_updateMetaBalls(anode);
          var geo = ngl_marching_cube.generateGeometry();
          //how to update the shape mesh instead of recreating it
          geo.name = name;
          NGL_MetaBallsGeom(geo);
        }
      }
  }
  });

  //if metaballs only ?
  stage.signals.clicked.add(function (pickingProxy){
    console.log("pickingProxy");
    console.log(pickingProxy);
    ngl_current_pickingProxy = pickingProxy;
  });

  var tooltip = document.createElement("div");
  Object.assign(tooltip.style, {
    display: "none",
    position: "absolute",
    zIndex: 10,
    pointerEvents: "none",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "lightgrey",
    padding: "0.5em",
    fontFamily: "sans-serif"
  });
  stage.viewer.container.appendChild(tooltip);

  stage.signals.hovered.add(function (pickingProxy){
    //console.log("pickingProxy");
    //console.log(pickingProxy);
   if (pickingProxy) {
     ngl_current_pickingProxy = pickingProxy;
     var rad = 0.0;
     if (ngl_current_pickingProxy.sphere)
     {
      var asplit = ngl_current_pickingProxy.sphere.name.split("_");
      var name = asplit[0];
      if (name === "lod" ){
        //resize beads
        var lod = parseInt(asplit[1]);
        var lodid=parseInt(asplit[3]);
        if (ngl_interaction_view) {
          rad =  ngl_load_params.beads.rad[lod].radii[lodid];
        }
        else rad = node_selected.data.radii[lod].radii[lodid];
      }
      else {
        var mbi = parseInt( (asplit.length>1)? asplit[1]:"0");
        if (node_selected.data.radii) rad = node_selected.data.radii[0].radii[mbi];
      }
      var cp = pickingProxy.canvasPosition;
      tooltip.innerText = "Radius: " + rad.toString();
      tooltip.style.bottom = cp.y + 3 + "px";
      tooltip.style.left = cp.x + 3 + "px";
      tooltip.style.display = "block";
    }
   }
   else tooltip.style.display = "none";
  });

  //Must contain an event type: "scroll", "drag", "click", "doubleClick", "hover", "clickPick" or "hoverPick". 
  //Optionally contain one or more (seperated by plus signs) keyboard modifiers: "alt", "ctrl", "meta" or "shift". 
  //Can contain the mouse button performing the event: "left", "middle" or "right". 
  //The type, key and button parts must be seperated by dashes.

  //rotateComponentDrag(stage: Stage, dx: Number, dy: Number): undefined
  //stage.mouseControls.remove( "drag-ctrl-right" );
  stage.mouseControls.remove( "drag-ctrl-left" );
  stage.mouseControls.remove( "drag-*" );
  

  stage.mouseControls.add("drag-right", NGL_panDrag);
  stage.mouseControls.add("drag-left", NGL_rotateDrag);

  //stage.mouseControls.add("drag-ctrl-right", NGL.MouseActions.panComponentDrag);
  stage.mouseControls.add("drag-ctrl-left", NGL.MouseActions.panComponentDrag);
  //component
  //panComponentDrag(stage: Stage, dx: Number, dy: Number): undefined
  //rotateComponentDrag(stage: Stage, dx: Number, dy: Number): undefined
  //scene
  //panDrag(stage: Stage, dx: Number, dy: Number): undefined
  //rotateDrag(stage: Stage, dx: Number, dy: Number): undefined
  //
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


function NGL_addBB(){
  var comp = stage.getComponentsByName("BoundingBox");
  if (comp.list) {
    for (var i = 0; i < comp.list.length; i++) {
      stage.removeComponent(comp.list[i]);
    }
  }
  //showBox
  var shape = new NGL.Shape('BoundingBox', { dashedCylinder: true });
  //position,color,size,heighAxis,depthAxis,name
  shape.addBox([ 23, 1, 2 ], [ 0, 1, 0 ], 2, [ 0, 1, 1 ], [ 1, 0, 1 ],'BoundingBox');
  var shapeComp = stage.addComponentFromObject(shape)
  shapeComp.addRepresentation('buffer', { wireframe: true,name:'BoundingBox' })
  //shapeComp.autoView()
  //stage.viewer.boundingBox.min
  //stage.viewer.boundingBox.max
}
//change the picking!
//stage.signals.clicked.add(function (pickingProxy) {...});
//assume it doesnt use the ngl system
function NGL_GetSelection(sel_str, model) {
  //doesnt work with model onmly?
  var ngl_sele = "";
  sel_str = sel_str.replace("(","").replace(")","")
  if ( sel_str.includes(":") || sel_str.includes("or") || sel_str.includes("and") || sel_str.includes("/")) {ngl_sele = sel_str;}
  else {
    if (sel_str && sel_str !== "") {
    //convert to ngl selection string.
      var ch_sel = "(";
      var sp = sel_str.split(",");
      for (var i = 0; i < sp.length; i++) {
        var el = sp[i].split("!");
        console.log("el ",el);
        if (el[0] === "") {
          ch_sel += " not ";
          if (/[0-9a-zA-Z]/.test(el[1])) ch_sel += ":" + el[1].replace(":","") + " and ";
        }
        else if (/[0-9a-zA-Z]/.test(el[0])) ch_sel += ":" + el[0].replace(":","") + "  or ";
      }
      ngl_sele = ch_sel.slice(0, -5) + ")";
      console.log("ngl_sele ",ngl_sele);
  }
    if (model && model !== "") {
      ngl_sele += " and /" + model;
    }
  }
  return ngl_sele;
}

function NGL_toggleBeadsVisibility(e) {
  stage.getRepresentationsByName("beads_0")
    .setVisibility(e.checked);
}

function NGL_toggleAxisVisibilityControl(e) {
  document.getElementById('surface').setAttribute("class", e.checked?"show":"hidden");
  NGL_updatePcpElem();
  NGL_applyPcp();
  if (node_selected)
  {
    NGL_ShowAxisOffset(node_selected.data.pcpalAxis, node_selected.data.offset, node_selected);
  }
}

function NGL_toggleOriginVisibility(e) {
  stage.getRepresentationsByName("beads_0")
    .setVisibility(e.checked);
}

function NGL_toggleOrigin(e) {
  var o = stage.getComponentsByName("ori");
  if (o.list && o.list.length !=0) o.list[0].setVisibility(e.checked);
}


function NGL_showBox(e) {
  stage.getRepresentationsByName("axes")
    .setVisibility(e.checked);
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
    var colors = rad[lod].radii.map(x=>ngl_current_node.data.color);
    //if we are showing a pairs, color differently the binding beads.
    if (ngl_load_params.dobeads_pairs) {
      colors = ngl_load_params.beads.colors[lod].colors
      //ngl_load_params.beads.colors[lod].colors.map(function(c){
      //    if (c===[1,1,0]){return "yellow";}
      //    else {return "red"}
      //});
      //NGL_multiSpheresComp("lod_"+lod.toString()+"_", ngl_load_params.beads.pos[lod].coords,
      //                               ngl_load_params.beads.rad[lod].radii, 
      //                               ngl_load_params.beads.colors[lod].colors, 1.0)
    }
    NGL_multiSpheresComp("lod_"+lod.toString()+"_",pos[lod].coords,
                    rad[lod].radii,
                    colors,
                    (toggle_cluster_edit.checked)?1.0:0.5);
    /*
    //check if exist
    var rep = stage.getComponentsByName("beads_"+i);
    if (rep.list.length){
      rep.list.forEach(function(elem){stage.removeComponent(elem);});
    }

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
    */
    stage.autoView();
  }
}


function NGL_updateCurrentBeadsLevelClient() {
  //center
  //async function updateCurrentBeadsLevel() {
  if (ngl_interaction_view) return;  
  console.log("update beads", beads_elem.selectedOptions[0].value); //undefined?//lod level
  var asele = "";
  var o = ngl_current_structure;
  if (o.ngl_sele && o.ngl_sele!=="") {
    if (o.ngl_sele.string !== null) asele = o.ngl_sele.string;
    else asele = o.ngl_sele;
  }
  else if (o.sele&& o.sele!=="") {
    asele = o.sele;
  }
  if (sele_elem.value&& sele_elem.value!=="") {
    if (asele !== sele_elem.value) asele = sele_elem.value;
  }
  if (asele === "") asele = "";
  var bu = false;
  if (o.assembly !== "AU" && o.object.biomolDict[o.assembly]) {
    //need to apply the matrix to the selection inside the BU selection ?
    //console.log(o.object.biomolDict[o.assembly].getSelection());
    //build using given selection AND biomolDic selection
    asele = "(" + o.object.biomolDict[o.assembly].getSelection().string + ") AND " + asele;
    bu = true;
  }
  //console.log("selection is ",asele);
  var ngl_sele = new NGL.Selection(asele);
  var center = NGL_GetGeometricCenter(ngl_current_structure, ngl_sele).center;
  ngl_current_structure.ngl_sele = ngl_sele;
  var lod = parseInt(beads_elem.selectedOptions[0].value);
  var comp = stage.getComponentsByName("beads_" + lod.toString());
  var rep = stage.getRepresentationsByName("beads_" + lod.toString());
  var assembly = assembly_elem.selectedOptions[0].value;
  if (!assembly || assembly === "") assembly = "AU";
  ngl_current_structure.assembly = assembly;
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
  if (ngl_load_params.beads.rad && ngl_load_params.beads.rad.length != 0 && ngl_load_params.beads.rad[lod]) 
  {
    NGL_RemoveMultiSpheresComp("lod_"+lod.toString()+"_",ngl_load_params.beads.rad[lod].radii.length);
  }
  var res = NGL_buildBeads(lod, ngl_current_structure, center);
  console.log("finsihed building", res);
  var col = Array(ngl_load_params.beads.rad[lod].radii.length).fill(0).map(d=>[Util_makeARandomNumber(),Util_makeARandomNumber(),Util_makeARandomNumber()]);
  var labels = Array(ngl_load_params.beads.pos[lod].coords.length).fill("0").map(function(v, i) {
    return "bead_" + i.toString()
  });
  //var p = new NGL.SpherePicker
  /*var sphereBuffer = new NGL.SphereBuffer({
    position: new Float32Array(ngl_load_params.beads.pos[lod].coords),
    color: new Float32Array(col),
    radius: new Float32Array(ngl_load_params.beads.rad[lod].radii)
    //labelType:"text",
    //labelText:labels
  }
  ,{ disableImpostor: true }
  )
  //update the component buffer ?
  var shape = new NGL.Shape("beads_" + lod,{
    disableImpostor: true,
    radialSegments: 10
  });
  
  //shape.addBuffer(sphereBuffer)
  var p=0;
  var pos = ngl_load_params.beads.pos[lod].coords;
  for (var i=0;i<ngl_load_params.beads.rad[lod].radii.length;i++) {  
    shape.addSphere([pos[p],pos[p+1],pos[p+2]], [1, 0, 0], ngl_load_params.beads.rad[lod].radii[i]/2.0,"lod_"+lod.toString()+"_"+i.toString());
    p+=3;
  }

  var shapeComp = stage.addComponentFromObject(shape)
  var rep = shapeComp.addRepresentation("beads_" + lod, {
    //opacity: 0.6,
    visibility: true
  });
  */
  //NGL_RemoveMultiSpheresComp("lod_"+lod.toString()+"_",ngl_load_params.beads.rad[lod].radii.length);
  //add some beads if its a fiber [-2,-1,0,1,2] and there is no structure ?
  if (beads_color_elem!==null) NGL_getColorBeads(beads_color_elem.selectedOptions[0].value);
  if (!ngl_load_params.beads.colors) {
    ngl_load_params.beads.colors = []
  }
  if (ngl_load_params.beads.colors.length <= lod) {
    ngl_load_params.beads.colors[lod] = {"colors":col};
  }
  if ( ngl_load_params.beads.colors[lod].colors.length !== ngl_load_params.beads.rad[lod].radii.length){
    ngl_load_params.beads.colors[lod].colors = col;
  }
  NGL_multiSpheresComp("lod_"+lod.toString()+"_",
        ngl_load_params.beads.pos[lod].coords,
        ngl_load_params.beads.rad[lod].radii,
        ngl_load_params.beads.colors[lod].colors, 
        (toggle_cluster_edit.checked)?1.0:0.5);

  nbBeads_elem.textContent = '' + ngl_load_params.beads.pos[lod].coords.length / 3 + ' beads';
  /*
  NGL_multiSpheresComp(anode.data.name,anode.data.pos[0].coords,anode.data.radii[0].radii);//box around ?
    var shape = new NGL.Shape("beads_" + lod, {
      disableImpostor: true,
      radialSegments: 10
    });
    var p=0;
    var pos = ngl_load_params.beads.pos[lod].coords;
    for (var i=0;i<ngl_load_params.beads.rad[lod].radii.length;i++) {  
      shape.addSphere([pos[p],pos[p+1],pos[p+2]], [1, 0, 0], ngl_load_params.beads.rad[lod].radii[i]/2.0,name+"_lod_"+lod.toString()+"_"+i.toString());
      p+=3;
    }
    var shapeComp = stage.addComponentFromObject(shape);
    shapeComp.addRepresentation("beads_" + lod); 
  */
}

// server side function for computing beads
function NGL_updateCurrentBeadsLevelServer() {
  //console.log("update beads", beads_elem.selectedOptions[0].value); //undefined?//lod level
  //console.log("num clusters", slidercluster_elem.value);
  if (beads_elem.selectedOptions[0].value === "None") return;
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
  var lod = parseInt(beads_elem.selectedOptions[0].value);
  var comp = stage.getComponentsByName("beads_" + lod.toString());
  var rep = stage.getRepresentationsByName("beads_" + lod.toString());
  var assembly = assembly_elem.selectedOptions[0].value;
  if (!assembly || assembly === "") assembly = "AU";
  ngl_current_structure.assembly = assembly;

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

function NGL_toggleUseCurrentBeadsRadius(e) {
  console.log(e)
  use_cluster_radius = e.checked;
  console.log(use_cluster_radius)
  if (use_cluster_radius === false) cluster_force_radius = -1;
  else cluster_force_radius = cl_radius.value;
  NGL_updateCurrentBeadsLevel();
}

function NGL_updateCurrentBeadsRadius(e) {
  var new_radius = e.value;
  //var lod = beads_elem.selectedOptions[0].value;
  //ngl_load_params.beads.rad[lod].radii
  if (use_cluster_radius) {
    cluster_force_radius = new_radius;
    NGL_updateCurrentBeadsLevel();
  }
}

function NGL_updateCurrentBeadsLevel() {
  //client, or server or server coords
  //NGL_updateCurrentBeadsLevelClient();
  //NGL_updateCurrentBeadsLevelServer();
  if (beads_elem.selectedOptions[0].value === "None") return;
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
      if (use_mglserver_beads) {
        buildFromServer(node_selected.data.source.pdb,false,true,ngl_current_structure);
      }
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

//NGL_RemoveMultiSpheresComp("lod_"+lod.toString()+"_",ngl_load_params.beads.rad[lod].radii.length);
//NGL_multiSpheresComp("lod_"+lod.toString()+"_",ngl_load_params.beads.pos[lod].coords,ngl_load_params.beads.rad[lod].radii);
function NGL_showBeadsLevel_cb(alevel) {
  if (!node_selected.data.pos) return;
  if (!ngl_load_params.beads.pos) return;
  if (!ngl_load_params.beads.rad) return;
  //console.log("NGL_showBeadsLevel_cb "+alevel.toString());
  if (alevel === "None") {
    for (var i = 0; i < nLod; i++) {
      /*var rep = stage.getComponentsByName("beads_" + i);
      console.log(rep, "beads_" + i);
      if (rep.list.length !== 0)
      {  
        if (rep.list[0].reprList.length !== 0) {
          rep.list[0].reprList[0].setVisibility(false);
        }
      }*/
      if ( i < ngl_load_params.beads.rad.length)// node_selected.data.radii.length) 
      {  
        NGL_ChangeVisibilityMultiSpheresComp("lod_"+i.toString()+"_",ngl_load_params.beads.rad[i].radii.length,false);
      }
    }
    nbBeads_elem.textContent = "";
  } else if (alevel === "All") {
    for (var i = 0; i < nLod; i++) {
      /*var rep = stage.getComponentsByName("beads_" + i);
      console.log(rep, "beads_" + i);
      if (rep.list.length !== 0)
      {  if (rep.list[0].reprList.length !== 0) {
          rep.list[0].reprList[0].setVisibility(true);
          rep.list[0].reprList[0].setParameters({
            opacity: 0.6
          });
        }
      }*/
      if ( i < ngl_load_params.beads.rad.length) 
      {
          NGL_ChangeVisibilityMultiSpheresComp("lod_"+i.toString()+"_",ngl_load_params.beads.rad[i].radii.length,true);
      }
    }
    nbBeads_elem.textContent = "";
  } else {
    var v = false;
    for (var i = 0; i < nLod; i++) {
      /*var rep = stage.getComponentsByName("beads_" + i);
      if (i === parseInt(alevel)) {
        v = true;
        if (ngl_load_params.beads.pos[i])
          nbBeads_elem.textContent = '' + ngl_load_params.beads.pos[i].coords.length / 3 + ' beads';
      } else v = false;
      console.log(rep, "beads_" + i, v);
      if (rep.list.length !== 0){
        if (rep.list[0].reprList.length !== 0) {
          rep.list[0].reprList[0].setVisibility(v);
          rep.list[0].reprList[0].setParameters({
            opacity: 0.6
          })
        }
      }*/
      if (i === parseInt(alevel)) {
        v = true;
        if (ngl_load_params.beads.pos[i])
          nbBeads_elem.textContent = '' + ngl_load_params.beads.pos[i].coords.length / 3 + ' beads';
      } else v = false;
      if ( i < ngl_load_params.beads.rad.length) 
      {
          NGL_ChangeVisibilityMultiSpheresComp("lod_"+i.toString()+"_",ngl_load_params.beads.rad[i].radii.length,v);
      }
    }
  }
}

function NGL_showBeadsLevel(e) {
  if (beads_color_elem!==null) NGL_colorBeadsLevel_cb(beads_color_elem.selectedOptions[0].value);
  NGL_showBeadsLevel_cb(e.value);
}

function NGL_showBeadsInteracting(alevel){
  //use current node ngl_current_node and current link line_selected
  if (!ngl_interaction_view) return;
  //the follow use node_selected  NGL_showBeadsLevel_cb
  //need the bead from target.
  //node_selected = line_selected.target;
  //NGL_showBeadsLevel_cb(alevel);
  //node_selected = line_selected.source;
  //draw cylinder for the pairs line_selected.beads1 <-> line_selected.beads2
  //if same number 1-1, else all-1
  //if source/target a fiber beads are id along the fiber.
}

function NGL_getColorBeads(color_schem){
  if (beads_elem.selectedOptions[0].value === "None" || beads_elem.selectedOptions[0].value === "All") return;
  var lod = parseInt(beads_elem.selectedOptions[0].value);
  if (!ngl_load_params.beads.pos) return;
  if (!ngl_load_params.beads.rad) return;
  if (lod >= ngl_load_params.beads.rad.length) return;
  var col = Array(ngl_load_params.beads.rad[lod].radii.length).fill(0).map(d=>[1,0,0]);
  var lod_colors = [[1,1,0],[0,1,0],[0,0,1]];//GenerateNColor(3);//
  if (!ngl_load_params.beads.colors) {
    ngl_load_params.beads.colors = []
  }
  if (ngl_load_params.beads.colors.length <= lod) {
    ngl_load_params.beads.colors[lod] = {"colors":[]};
  }  
  if (!ngl_load_params.beads.colors[lod]) {
    ngl_load_params.beads.colors[lod] = {"colors":[]};
  }
  if (color_schem === "red") {
    ngl_load_params.beads.colors[lod].colors = col;
  }
  else if (color_schem === "level") {
    //0,1,2 YBG
    ngl_load_params.beads.colors[lod].colors = Array(ngl_load_params.beads.rad[lod].radii.length).fill(0).map(d=>lod_colors[lod]);//Util_getRBG_float(lod_colors[lod].rgb()));
  }
  else if (color_schem === "radius") {
    //map radius to colors
    var vmax = Math.max.apply(null, ngl_load_params.beads.rad[lod].radii);
    var vmin = Math.min.apply(null, ngl_load_params.beads.rad[lod].radii);
    var v_colors = GenerateNColor(2);
    var color_mapping = d3v4.scaleLinear()//d3v4.scaleLinear()
				.domain([Math.min(0,vmin), vmax])
				.range([Util_getRBG_float(v_colors[0].rgb()), Util_getRBG_float(v_colors[1].rgb())]);
    ngl_load_params.beads.colors[lod].colors = ngl_load_params.beads.rad[lod].radii.map(d=>color_mapping(d));
  }
  else if (color_schem === "interacting") {
    //if beads id is in the interacting table highligh/colors
    //check if node_selected has interaction
    var pair = getPairInteracting(node_selected);
    var c = Array(ngl_load_params.beads.rad[lod].radii.length).fill(0).map(d=>lod_colors[lod]);//Util_getRBG_float(lod_colors[lod].rgb()));
    if (pair.found !== "notfound") {
      //check if beads in pairs
      if (pair.found === "source") {
        for (var j=0;j<ngl_load_params.beads.rad[lod].radii.length;j++){
          if (pair.link.beads1.indexOf(j)!==-1) {c[j] = [1,1,0];}
          else {c[j] = [1,0,0];}
        }        
      }
      else if (pair.found === "target") {
        for (var j=0;j<ngl_load_params.beads.rad[lod].radii.length;j++){
          if (pair.link.beads2.indexOf(j)!==-1) {c[j] = [1,1,0];}
          else {c[j] = [1,0,0];}
        }        
      } 
    }
    ngl_load_params.beads.colors[lod].colors = c;
  }
  else if (color_schem === "random") {
    ngl_load_params.beads.colors[lod].colors = Array(ngl_load_params.beads.rad[lod].radii.length).fill(0).map(d=>[Util_makeARandomNumber(),Util_makeARandomNumber(),Util_makeARandomNumber()]);
  }
}

function NGL_colorBeadsLevel_cb(color_schem) {
  if (beads_elem.selectedOptions[0].value === "None" || beads_elem.selectedOptions[0].value === "All") return;
  if (!ngl_load_params.beads.pos) return;
  if (!ngl_load_params.beads.rad) return;  
  var lod = parseInt(beads_elem.selectedOptions[0].value);
  if (lod >= ngl_load_params.beads.rad.length) return;
  if (beads_color_elem!==null) NGL_getColorBeads(color_schem);
  
  console.log("color beads",ngl_load_params.beads.colors[lod].colors);
  var comp = stage.getComponentsByName("beads_" + lod.toString());
  if (comp.list) {
    stage.removeComponent(comp.list[0]);
  }
  if (ngl_load_params.beads.rad && ngl_load_params.beads.rad.length != 0 && ngl_load_params.beads.rad[lod]) 
  {
    NGL_RemoveMultiSpheresComp("lod_"+lod.toString()+"_",ngl_load_params.beads.rad[lod].radii.length);
  }
  NGL_multiSpheresComp("lod_"+lod.toString()+"_",
          ngl_load_params.beads.pos[lod].coords,
          ngl_load_params.beads.rad[lod].radii,
          ngl_load_params.beads.colors[lod].colors, 
          (toggle_cluster_edit.checked)?1.0:0.5);
  //NGL_updateCurrentBeadsLevelClient();
}

function NGL_colorBeadsLevel(e) {
  NGL_colorBeadsLevel_cb(e.value);
}

function NGL_UpdateassemblyList(ngl_ob) {
  assembly_elem.options.length = 0;
  assembly_elem.options[0] = new Option("assembly:", "assembly:");
  assembly_elem.options[1] = new Option("AU", "AU");
  Object.keys(ngl_ob.structure.biomolDict).forEach(function(k) {
    console.log(k);
    assembly_elem.options[assembly_elem.options.length] = new Option(k, k);
  });
}

function NGL_setModelOptions(ngl_ob) {
  model_elem.options.length = 0;
  const modelStore = ngl_ob.structure.modelStore;
  var model = "0";
  if (node_selected) {
    model = (node_selected.data.source.model!=="")?node_selected.data.source.model:"0";//model_elem.value;
  }
  if (modelStore.count > 1) {
    model_elem.options[model_elem.options.length] = new Option('Show model:', 'Show model:');
    model_elem.options[model_elem.options.length] = new Option('all', 'all');
  }
  for (let i = 0; i < modelStore.count; ++i) {
    //addOption(options, i, 'Model ' + (i + 1))
    model_elem.options[model_elem.options.length] = new Option(i, i,(parseInt(model) === i), (parseInt(model) === i));
  }
  //if (modelStore.count === 0) model_elem.options[model_elem.options.length] = new Option(0, 0);
}

function NGL_testSelectedChainInEntity(EntityId){
  var chindexes = ngl_current_structure.structure.entityList[EntityId].chainIndexList;
  //what is the current chain selection
  var elem = sele_elem.value.split(":")
  var selected_chains = [];
  elem.forEach(
    function(el){
        if  ( el[0] !== " " && !(!(el[0]))) selected_chains.push(el[0]);
    }
  )
  var selected = false;
  console.log(ngl_current_structure.structure.chainStore,selected_chains);
  chindexes.forEach(function(elem){
     console.log(elem);
      if (ngl_current_structure.structure.chainStore) {
        var cname = ngl_current_structure.structure.chainStore.getChainname(elem);
        selected = ( ($.inArray(cname, selected_chains) !== -1) || selected);
        //console.log(cname, $.inArray(cname, selected_chains));
    }
  });
  console.log("selected",selected);
  if (selected_chains.length === 0) selected = true;
  return selected;
}

function NGL_testSelectedChain(chainName){
    var elem = sele_elem.value.split(":")
    var selected_chains = [];
    elem.forEach(
      function(el){
          if  ( el[0] !== " " && !(!(el[0]))) selected_chains.push(el[0]);
      }
    )
    if ( selected_chains.length === 0 ) return true;
    else return ($.inArray(chainName, selected_chains)!==-1);
}

function NGL_setChainSelectionOptions(ngl_ob)
{
  //update the selection div element
   const modelStore = ngl_ob.structure.modelStore;
   var model = "0";
   if (modelStore.count > 1) {
     if (node_selected) {
       model = (node_selected.data.source.model!=="")?node_selected.data.source.model:"0";//model_elem.value;
     }
   }
   var aselection = (modelStore.count > 1) ? NGL_GetSelection("", model):"polymer";
   var chnames = []
   var nch = ngl_ob.structure.getChainnameCount();
   ngl_ob.structure.eachChain( chain => {
     if ( $.inArray(chain.chainname, chnames) === -1 ) chnames.push( chain.chainname)
  }, new NGL.Selection(aselection));
  console.log("layout_addOptionsForMultiSelect",aselection,chnames,nch);
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

function NGL_ChangeBiologicalAssembly(selected0) {

  //also change the geometric center
  var center_bu= NGL_GetBUCenter(ngl_current_structure,selected0.value).center;
  ngl_current_structure.setPosition([-center_bu.x,-center_bu.y,-center_bu.z]);
  //updatTheTable
  console.log("NGL_ChangeBiologicalassembly",center_bu,assembly_elem.selectedOptions[0].value);
  if (ngl_current_item_id) {
    updateDataGridRowElem(0, ngl_current_item_id, "bu", selected0.value);
    //update the grid according the multimeric state automatically ?
    //problem is to get the multimeric states...
  }
  if (node_selected) {
    node_selected.data.bu = selected0.value;
    node_selected.data.source.bu = selected0.value;
    console.log("node_selected.data.bu ", node_selected.data.bu);
    //NGL_updateCurrentBeadsLevel();
  }
  NGL_ChangeRepresentation(rep_elem.selectedOptions[0]);
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
  //this overwrite the opacity of the beads
  console.log(assembly_elem.selectedOptions[0].value);
  stage.getRepresentationsByName("polymer").dispose();
  stage.getRepresentationsByName("axes").dispose();
  var comp = ngl_current_structure;
  //stage.eachComponent(function(o) {
  if (selectedO.value==="cms"){
    comp.addRepresentation("surface", {
      colorScheme: color_elem.selectedOptions[0].value,
      sele: sele_elem.value,
      name: "polymer",
      assembly: assembly_elem.selectedOptions[0].value,
      surfaceType: "edt",
      smooth: 2,//use some slider ?
      probeRadius: 1.0,
      scaleFactor: cms_scale,
      flatShaded: false,
      opacity: 1.0,
      lowResolution: true,
    });
  }
  else {
    comp.addRepresentation(selectedO.value, {
      colorScheme: color_elem.selectedOptions[0].value,
      sele: sele_elem.value,
      name: "polymer",
      assembly: assembly_elem.selectedOptions[0].value
    });
  }
  //doesnt work with biological assembly
  comp.addRepresentation("axes", {
    sele: sele_elem.value,
    showAxes: true,
    showBox: true,
    radius: 0.2,
    assembly: assembly_elem.selectedOptions[0].value
  });
  NGL_showBox(document.getElementById('showbox'));
//});
}

function NGL_ChangeRepresentation_cb() {
  var repstyle = repToChange, 
      selection = selToChange, 
      bu = buToChange;
  //this overwrite the opacity of the beads
  //console.log(assembly_elem.selectedOptions[0].value);
  stage.getRepresentationsByName("polymer").dispose();
  stage.getRepresentationsByName("axes").dispose();
  var comp = ngl_current_structure;
  //stage.eachComponent(function(o) {
  if (repstyle==="cms"){
      comp.addRepresentation("surface", {
        colorScheme: color_elem.selectedOptions[0].value,
        sele: selection,
        name: "polymer",
        assembly: bu,
        surfaceType: "edt",
        smooth: 2,//use some slider ?
        probeRadius: 1.0,
        scaleFactor: cms_scale,
        flatShaded: false,
        opacity: 1.0,
        lowResolution: true,
      });
  }
  else {
      comp.addRepresentation(repstyle, {
        colorScheme: color_elem.selectedOptions[0].value,
        sele: selection,
        name: "polymer",
        assembly: bu
      });
    }
    //doesnt work with biological assembly
    comp.addRepresentation("axes", {
      sele: selection,
      showAxes: true,
      showBox: true,
      radius: 0.2,
      assembly: bu
    });
    NGL_showBox(document.getElementById('showbox'));
  //});
}

//overwrite model ?
function NGL_ChangeSelection() {
  //use sele_elem.value
  NGL_ChangeRepresentation(rep_elem.selectedOptions[0]);
  if (ngl_current_item_id) updateDataGridRowElem(0, ngl_current_item_id, "selection", (sele_elem.value === "polymer") ? "" : sele_elem.value);
  stage.autoView(1000);
  if (node_selected) {
    node_selected.data.selection = sele_elem.value;
    node_selected.data.source.selection = sele_elem.value;
    NGL_updateCurrentBeadsLevel();
  }
  /*var rep = stage.getRepresentationsByName( "polymer" );
	rep.setParameters(
      	{
      	colorScheme: color_elem.selectedOptions[0].value,
        sele: astr_elem.value,
        name: "polymer",
        assembly:assembly_elem.selectedOptions[0].value
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
        assembly:assembly_elem.selectedOptions[0].value
      })
  });	*/
}

function NGL_ChangeChainsSelection(an_elem) {
  var aselection = "";
  //check the model
  var checkboxes = document.getElementById("selection_ch_checkboxes");
  //console.log(checkboxes);
  //console.log(sele_elem.value);
  var selection = "";
  //console.log(an_elem);
  var allcheck = checkboxes.getElementsByTagName("input");
  var all = allcheck.length;
  var countchecked = 0;
  for (var i=0;i<all;i++)
  {
      if (allcheck[i].checked) countchecked++;
  }
  var diff = all-countchecked;//1-1 or 1-0 when only one entry
  var test = false;//(diff<countchecked);
  //if (all === 1 ) test = countchecked === 0;
  if (test) {
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
  //add the model
  if (node_selected.data.source.model !== "")
    aselection += NGL_GetSelection("",node_selected.data.source.model);
  console.log(aselection);
  sele_elem.value = aselection;
  NGL_ChangeSelection();
}

//overwrite model selection
function NGL_ChangeModel(model_elem) {
  console.log(model_elem.value);
  var curr_sel = sele_elem.value.split("/")[0];
  //split on /
  console.log(curr_sel + "/" + model_elem.value);
  sele_elem.value = curr_sel + "/" + model_elem.value;
  var o = ngl_current_structure;
  var center = NGL_GetGeometricCenter(o, new NGL.Selection(sele_elem.value)).center;
  console.log("gcenter", center);
  o.setPosition([-center.x, -center.y, -center.z]); //center molecule
  //reset center
  //var rep = stage.getRepresentationsByName( "polymer" );
  //rep.setParameters(
  //    	{colorScheme: color_elem.selectedOptions[0].value,
  //      sele: curr_sel + "/" + model_elem.value,
  //      name: "polymer",
  //      assembly:assembly_elem.selectedOptions[0].value});
  /*
	stage.getRepresentationsByName("polymer").dispose();
	stage.eachComponent(function (o) {
      o.addRepresentation(rep_elem.selectedOptions[0].value, {
      	colorScheme: color_elem.selectedOptions[0].value,
        sele: curr_sel + "/" + model_elem.value,
        name: "polymer",
        assembly:assembly_elem.selectedOptions[0].value
      })
    });	*/
  if (ngl_current_item_id) updateDataGridRowElem(0, ngl_current_item_id, "selection", curr_sel + "/" + model_elem.value);

  if (node_selected) {
    node_selected.data.source.selection = curr_sel + "/" + model_elem.value;
    node_selected.data.source.model = model_elem.value;
    NGL_updateCurrentBeadsLevel();
  }
  if (ngl_current_structure) NGL_setChainSelectionOptions(ngl_current_structure);
  NGL_ChangeRepresentation(rep_elem.selectedOptions[0]);
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
    assembly: assembly_elem.selectedOptions[0].value
  });
  //on chrome we loose the current node selected ??
}

function NGL_ChangeHighlightResidue(resnum,chainId)
{
  if (!ngl_current_structure) return;
  var style = 'licorice';//'hyperball';
  var radius = 1;//'hyperball';
  var sele = resnum;
  if (chainId !== "") sele+=" and :"+chainId;
  if (node_selected && node_selected.data.source.model && node_selected.data.source.model!=="") sele+=" and /"+node_selected.data.source.model;
  var comp = ngl_current_structure;
  var color = 'gold';
  stage.getRepresentationsByName('highlightRes').dispose();
  stage.getRepresentationsByName('hLabelRes').dispose();

    comp.addRepresentation(style, {
        sele: sele,
        color: color,
        radius: radius,
        assembly: assembly_elem.selectedOptions[0].value,
				name:"highlightRes"
      });

		comp.addRepresentation("label", {
														sele: sele+".CA",
														color: "yellow",
														scale: 3.0,
														zOffset: 6.0,
														name:"hLabelRes",
                            assembly: assembly_elem.selectedOptions[0].value
												});
    //stage.centerView(false, sele);

    //comp.autoView(200);
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
  if (node_selected && node_selected.data.source.model && node_selected.data.source.model!=="") sele+=" and /"+node_selected.data.source.model;

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
				name:"highlight",
        assembly: assembly_elem.selectedOptions[0].value
      });

		comp.addRepresentation("label", {
														sele: sele+".CA",
														color: "grey",
														scale: 2.0,
														zOffset: 4.0,
														name:"hLabel",
                            assembly: assembly_elem.selectedOptions[0].value
												});
    //stage.centerView(false, sele);

  //comp.autoView(200);
}


function NGL_CenterView() {
  stage.autoView(1000);
  if (node_selected) {
    var a = node_selected.data.pcpalAxis;
    var ax = new NGL.Vector3(a[0], a[1], a[2]);
    var q = new NGL.Quaternion();
    if (node_selected.data.surface) 
    {
      q.setFromUnitVectors(ax,new NGL.Vector3(0,1,0));
    }
    else if (node_selected.data.ingtype == "fiber" )
    {
      q.setFromUnitVectors(ax,new NGL.Vector3(1,0,0))
    }
    else {
      q = ngl_current_structure.structure.getPrincipalAxes().getRotationQuaternion();
    }
    stage.animationControls.rotate(q, 0);
  }
  //if current is fiber align on pcp on X
  //if current is surface align on pcp on Y
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
    if (!surf) {
      surf = rep.repr.__infoList[0].surface;
    }
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
    for (var i = 0; i < comp.list.length; i++) {
      stage.removeComponent(comp.list[i]);
    }
  }
  var anode = node_selected;
  var shape = new NGL.Shape("geom_surface");
  var color = [1,0,0];
  if (("color" in anode.data)&&(anode.data.color!==null)) color = anode.data.color;
  else {
    //color = [Math.random(), Math.random(), Math.random()];;//(anode.data.surface) ? [1,0,0]:[0,1,0];//Math.random(), Math.random(), Math.random()];
    //anode.data.color = [color[0],color[1],color[2]];
    color = [1,1,1];
  }

  var col = Array(mesh.verts.length).fill(1);
  shape.addMesh( //position, color, index, normal
    mesh.verts, // a plane
    col, // all green
    mesh.faces,
    //mesh.normals
  );
  var tcolor = new THREE.Color( color[0], color[1], color[2] );
  var shapeComp = stage.addComponentFromObject(shape);
  var r = shapeComp.addRepresentation("geom_surface", {
    opacity: ngl_geom_opacity,
    diffuse: tcolor,
    side: "double"
  });
  NGL_showGeomNode_cb(document.getElementById("showgeom").checked);
}

function NGL_applyBUtoMesh(nglobj,meshobj){
  var ass=nglobj.assembly;
  //console.log(nglobj.object.biomolDict[ass].partList.length);
  //console.log(nglobj.object.biomolDict[ass]);
  if (!(ass in nglobj.object.biomolDict)) return meshobj;
  var newpos=[]
  var newindices=[]
  var newnormals=[]
  var startindice = 0;
  var count = (meshobj.verts)? meshobj.verts.length/3:0;
  //first loop to get the center
  var center_bu= NGL_GetBUCenter(nglobj,ass).center;
  console.log("NGL_applyBUtoMesh",center_bu);
  //nglobj.setPosition(-center_bu.x,-center_bu.y,-center_bu.z);
  for (var j = 0; j < nglobj.object.biomolDict[ass].partList.length; j++) {
    console.log(nglobj.object.biomolDict[ass].partList[j].matrixList.length);
    for (var k = 0; k < nglobj.object.biomolDict[ass].partList[j].matrixList.length; k++) {
      var mat = nglobj.object.biomolDict[ass].partList[j].matrixList[k];
      for (var v = 0;v<count;v++){
          if (meshobj.verts) {
            var new_pos = new NGL.Vector3(meshobj.verts[v*3],
                                          meshobj.verts[v*3+1],
                                          meshobj.verts[v*3+2]);
            new_pos.applyMatrix4(mat);
            newpos.push(new_pos.x-center_bu.x);
            newpos.push(new_pos.y-center_bu.y);
            newpos.push(new_pos.z-center_bu.z);
          }
          if (meshobj.normals) {
            newnormals.push(-meshobj.normals[v*3]);
            newnormals.push(-meshobj.normals[v*3+1]);
            newnormals.push(-meshobj.normals[v*3+2]);
          }
      }
      if (meshobj.faces) {
        for (var f=0;f<meshobj.faces.length;f++)
        {
          newindices.push(meshobj.faces[f]+count*k);
        }
      }
      //startindice += count;
    }
  }
  var mesh = {"verts":(newpos.length!==0)?Array.from(newpos):null,
              "faces":(newindices.length!==0)?Array.from(newindices):null,
              "normals":(newnormals.length!==0)?Array.from(newnormals):null }
  return mesh;
}

function NGL_buildCMS_cb(nglobject){
  stage.getRepresentationsByName("cms_surface").dispose();
  //return RepresentationComponent
  var rep = nglobject.addRepresentation("surface", {
      //colorScheme: color_elem.selectedOptions[0].value,
      sele: nglobject.sele_elem,
      name: "cms_surface",
      assembly: nglobject.assembly,
      surfaceType: "edt",
      smooth: 2,
      probeRadius: 1.0,
      scaleFactor: cms_scale,
      flatShaded: false,
      opacity: 1.0,
      useWorker: false,
      lowResolution: true,
    });
  var myVar = setInterval(myTimerToGetTHeBuffer, 1000);
  function myStopFunction() {
      clearInterval(myVar);
  }
}

function NGL_toScreenPosition(obj, camera)
{
    var matrix = new Matrix4()
    var modelViewProjectionMatrix = new Matrix4()
    var vector = new THREE.Vector3();

    var widthHalf = 0.5*renderer.context.canvas.width;
    var heightHalf = 0.5*renderer.context.canvas.height;

    obj.updateMatrixWorld();
    vector.setFromMatrixPosition(obj.matrixWorld);
    vector.project(camera);

    vector.x = ( vector.x * widthHalf ) + widthHalf;
    vector.y = - ( vector.y * heightHalf ) + heightHalf;

    return { 
        x: vector.x,
        y: vector.y
    };

};


function NGL_getScreenPosition(position) {
  var w = viewport.offsetWidth;
  var h = viewport.offsetHeight;
  var vector = new NGL.Vector3( position.x, position.y, position.z );
  // model to world
  var modelMat = stage.viewer.modelGroup.matrixWorld;
  vector.applyMatrix4(modelMat);
  //var vector = stage.viewer.camera.localToWorld(new NGL.Vector3( position.x, position.y, position.z ))
  // world to view and view to NDC
  vector.project(stage.viewer.camera);
  // NDC to pixel
  vector.x = Math.round( (   vector.x + 1 ) * w / 2 );
  vector.y = Math.round( ( - vector.y + 1 ) * h / 2 );
  return vector;
}


function NGL_getCurrentScaleOnScreen(){
  var width = viewport.offsetWidth;
  var height = viewport.offsetHeight;
  //var width = window.innerWidth, height = window.innerHeight;
  var widthHalf = width / 2, heightHalf = height / 2;
  var pos1 = new NGL.Vector3(0,0,0);
  var pos2 = new NGL.Vector3(1,0,0);
  pos1.project(stage.viewer.camera);
  pos2.project(stage.viewer.camera);
  pos1.x = ( pos1.x * widthHalf ) + widthHalf;
  pos1.y = - ( pos1.y * heightHalf ) + heightHalf;
  pos2.x = ( pos2.x * widthHalf ) + widthHalf;
  pos2.y = - ( pos2.y * heightHalf ) + heightHalf;
  var distance_screen = Math.sqrt((pos1.x-pos2.x)*(pos1.x-pos2.x)+(pos1.y-pos2.y)*(pos1.y-pos2.y));
  return distance_screen;
}


function NGL_getDistanceOnScreen(p1, p2){
  stage.viewer.camera.getWorldPosition();
  var width = viewport.offsetWidth;
  var height = viewport.offsetHeight;
  //var width = window.innerWidth, height = window.innerHeight;
  var widthHalf = width / 2, heightHalf = height / 2;
  var pos1 = new NGL.Vector3(p1[0],p1[1],p1[2]);
  var pos2 = new NGL.Vector3(p2[0],p2[1],p2[2]);  
  pos1.project(stage.viewer.camera);
  pos2.project(stage.viewer.camera);
  pos1.x = ( pos1.x * widthHalf ) + widthHalf;
  pos1.y = - ( pos1.y * heightHalf ) + heightHalf;
  pos2.x = ( pos2.x * widthHalf ) + widthHalf;
  pos2.y = - ( pos2.y * heightHalf ) + heightHalf;
  var distance_screen = Math.sqrt((pos1.x-pos2.x)*(pos1.x-pos2.x)+(pos1.y-pos2.y)*(pos1.y-pos2.y));
  return distance_screen;
}

function NGL_makeImage(  ){
		/*var gwidth = 256;
		var gheight = 256;
    var w = viewport.style.width;
    var h = viewport.style.height;
		viewport.setAttribute("style","width: "+gwidth+"px; height:"+gheight+"px; display:inline-block");
		stage.handleResize();*/
    //stage.autoView();
    return stage.makeImage({
    factor: 1,
    antialias: true,
    trim: false,
    transparent: true
} ).then( function( imgBlob ){
        node_selected.imgBlob = imgBlob;
        if (!node_selected.data.thumbnail){
          node_selected.data.thumbnail = new Image();
          node_selected.data.thumbnail.done = false;
          node_selected.data.thumbnail.onload = function() {
            var height = this.height;
            var width = this.width;
            this.oh = parseFloat(height);
            this.ow = parseFloat(width);
            this.done = true;
          }
          node_selected.data.thumbnail.onerror = function () {
            this.src = 'images/Warning_icon.png';
            this.done = false;
          };
        }
        node_selected.data.thumbnail.src = URL.createObjectURL( imgBlob );
        node_selected.data.sprite.scale2d = NGL_getCurrentScaleOnScreen();
        if (document.getElementById("savethumbnail").checked){
            node_selected.data.sprite.image = node_selected.data.name+".png";
            NGL.download( imgBlob, node_selected.data.name+".png" );
        }
    } );
}

function NGL_saveThumbnail(){
    if (node_selected) {
        node_selected.data.sprite.image = node_selected.data.name+".png";
        var blob = node_selected.imgBlob;
        if ( blob == null)
        {
          //download(node_selected.data.thumbnail.src, node_selected.data.name+".png");
          Util_download_src_png(node_selected.data.thumbnail.src, node_selected.data.name);
        }
        else {
          NGL.download( blob, node_selected.data.name+".png" );
        }
    }
}

function NGL_UpdateThumbnailCurrent(){
    var result = NGL_makeImage(  ).then(function(value) {
    console.log("success");
    // expected output: "Success!"
    });
}

function defaults(value, defaultValue) {
    return value !== undefined ? value : defaultValue;
}


var AtomFormat = 'ATOM  %5d %-4s %3s%2s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';//'ATOM  %5d %-4s %3s %1s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';
var HetatmFormat = 'HETATM%5d %-4s %3s %1s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';
function NGL_writeAtoms() {
    var style = (document.getElementById("ill_style").checked)?1:0;
    let writeBU = true;
    let ia = 1;
    let im = 1;
    let renumberSerial = false;
    let asele="";
    var o = ngl_current_structure;
    _records = [];
    if (sele_elem.value&& sele_elem.value!=="") {
      if (asele !== sele_elem.value) asele = sele_elem.value;
    }
    var bu = false;
    var au=assembly_elem.selectedOptions[0].value;
    if (au !== "AU" && o.object.biomolDict[au]) bu = true;
    if (asele === "" && bu) {
      //need to apply the matrix to the selection inside the BU selection ?
      //console.log(o.object.biomolDict[o.assembly].getSelection());
      //build using given selection AND biomolDic selection
      asele = "(" + o.object.biomolDict[au].getSelection().string + ") AND " + asele;
    }
    if (asele === "") asele = "not water";
    if (style === 1) {
      asele="("+asele+") and (.CA or .P or .C1')";
    }
    console.log(asele);
    var chnames = []
    structure.structure.eachChain( chain => {
      if ( $.inArray(chain.chainname, chnames) === -1 ) chnames.push( chain.chainname)
    }, new NGL.Selection(asele));

    if (bu && writeBU) {
      //first write the matrix
      for (var j = 0; j < o.object.biomolDict[au].partList.length; j++) {
        //REMARK 350 BIOMOLECULE: 1
        //REMARK 350 APPLY THE FOLLOWING TO CHAINS: 1, 2, 3, 4
        var s= structure.object.biomolDict[au].getSelection() //max in illustrator is 12
        var t = []
        $.each(s.selection.rules, function (i, e) {
          if (chnames.includes(e.chainname)){
              t.push(e.chainname);
          }
        });
        var nchain = t.length;
        //s.selection.rules.map(function(d) {
        //  if (chnames.includes(d.chainname)) {return d.chainname;}          
        //} )
        _records.push("REMARK 350 BIOMOLECULE: 1");
        var linemax = 68;// 41+27.0;
        var _chain_str = "REMARK 350 APPLY THE FOLLOWING TO CHAINS:";
        var counter = 41;
        for (var i=0;i<nchain;i++){
          var r = " "+t[i]+",";
          if (counter + r.length >= linemax){
            _chain_str+="\n";
            _chain_str+="REMARK 350                    AND CHAINS:";
            counter = 41;
          }
          if (i === nchain-1) {
            r = " "+t[i];
          } //#last chain
          _chain_str+=r;
          counter+=r.length;
        }
        _records.push(_chain_str)
        for (var k = 0; k < o.object.biomolDict[au].partList[j].matrixList.length; k++) {
          var mat = o.object.biomolDict[au].partList[j].matrixList[k];
          _records.push(sprintf(BiomtFormat, 1, k+1,mat.elements[0],mat.elements[1],mat.elements[2],mat.elements[12]));//+ - -
          _records.push(sprintf(BiomtFormat, 2, k+1,mat.elements[4],mat.elements[5],mat.elements[6],mat.elements[13]));//- + +
          _records.push(sprintf(BiomtFormat, 3, k+1,mat.elements[8],mat.elements[9],mat.elements[10],mat.elements[14]));//- + +
        }
        _records.push("REMARK 350END");
      }
      //then the atoms
      structure.structure.eachAtom((a) => {
            const formatString = a.hetero ? HetatmFormat : AtomFormat;
            const serial = this.renumberSerial ? ia : a.serial;
            if (serial > 99999) serial = 99999;
            // Alignment of one-letter atom name such as C starts at column 14,
            // while two-letter atom name such as FE starts at column 13.
            let atomname = a.atomname;
            if (atomname.length <= 3)
            {
                atomname = ' ' + atomname;
                _records.push(sprintf(formatString, serial, atomname, a.resname, defaults(a.chainname, ' '), a.resno, a.x, a.y, a.z, defaults(a.occupancy, 1.0), defaults(a.bfactor, 0.0), '', // segid
                        defaults(a.element, '')));
            }
            ia += 1;
        }, new NGL.Selection(asele));
  }
  else if(bu)
    {
      for (var j = 0; j < o.object.biomolDict[au].partList.length; j++) {
        for (var k = 0; k < o.object.biomolDict[au].partList[j].matrixList.length; k++) {
          var mat = o.object.biomolDict[au].partList[j].matrixList[k];
          //console.log("mat ",j,k);
          ngl_current_structure.structure.eachAtom((a) => {
                var new_pos = new NGL.Vector3(a.x, a.y, a.z);//should be uncentered
                new_pos.applyMatrix4(mat);
                const formatString = a.hetero ? HetatmFormat : AtomFormat;
                const serial = renumberSerial ? ia : a.serial;
                // Alignment of one-letter atom name such as C starts at column 14,
                // while two-letter atom name such as FE starts at column 13.
                let atomname = a.atomname;
                if (atomname.length === 1)
                    atomname = ' ' + atomname;
                _records.push(sprintf(formatString, serial, atomname, a.resname,
                                    defaults(a.chainname, ' '), a.resno, new_pos.x, new_pos.y, new_pos.z,
                                    defaults(a.occupancy, 1.0), defaults(a.bfactor, 0.0), '', // segid
                                    defaults(a.element, '')));
                ia += 1;
            }, new NGL.Selection(asele));
          //new_pos.applyMatrix4(mat);
          //pos[pos.length] = new_pos.x - center.x;
          //pos[pos.length] = new_pos.y - center.y;
          //pos[pos.length] = new_pos.z - center.z;
          //rad[rad.length] = radius;
        }
      }
    }
    else {
      ngl_current_structure.structure.eachAtom((a) => {
            const formatString = a.hetero ? HetatmFormat : AtomFormat;
            const serial = this.renumberSerial ? ia : a.serial;
            if (serial > 99999) serial = 99999;
            // Alignment of one-letter atom name such as C starts at column 14,
            // while two-letter atom name such as FE starts at column 13.
            let atomname = a.atomname;
            if (atomname.length === 1)
                atomname = ' ' + atomname;
            _records.push(sprintf(formatString, serial, atomname, a.resname, defaults(a.chainname, ' '), a.resno, a.x, a.y, a.z, defaults(a.occupancy, 1.0), defaults(a.bfactor, 0.0), '', // segid
            defaults(a.element, '')));
            ia += 1;
        }, new NGL.Selection(asele));
    }
    _records.push(sprintf('%-80s', 'END'));
    return _records.join('\n');
}


function NGL_Illustrate(){
    if(!node_selected) return;
    if (!ngl_current_structure) return;
    node_to_illustrate = node_selected;
    //camera position should be reset
    stage.autoView(1000);
    var nameinput = node_selected.data.name;
    var formData = new FormData();
    formData.append("key", "query");
    node_selected.data.sprite.scale2d = 6;
    var style = (document.getElementById("ill_style").checked)?1:0;
    ill_by_chain = (document.getElementById("ill_chain").checked)?1:0;
    var input = ill_prepareInput(style,nameinput,6);
    formData.append("input_txt", input);
    console.log(input);//problem with rotation?
    /*if (node_selected.data.source.pdb.length == 4){
      if (sele_elem.value!="" || assembly_elem.selectedOptions[0].value!="AU"){
          structure_txt=NGL_writeAtoms();
          formData.append("PDBtxt",structure_txt);
      }
      else formData.append("PDBID", node_selected.data.source.pdb);
    }
    else {
      if (sele_elem.value!="" || assembly_elem.selectedOptions[0].value!="AU"){
          structure_txt=NGL_writeAtoms();
          formData.append("PDBtxt",structure_txt);
      }
      else formData.append("PDBfile", pathList_[node_selected.data.source.pdb]);
    }
    */
    structure_txt=ill_writeAtoms(ngl_current_structure, style);
    var astructure_file = new Blob([structure_txt], {
      type: 'text/plain'
    });
    //compress to zip ?
    formData.append("PDBfile",astructure_file);
    formData.append("_id", ill_current_id);
    formData.append("name",nameinput);
    formData.append("force_pdb",true);
    var xhr = new XMLHttpRequest();
    var url = 'https://mesoscope.scripps.edu/beta/cgi-bin/illustrator.py'
    xhr.open('POST', url, !query_illustrate );
    if (!query_illustrate) xhr.timeout = 1000000000;
    xhr.ontimeout = function () {
      console.error("The request for " + url + " timed out.");
    };
    xhr.onload = function () {
      // do something to response
      if(this.status == 200) {
        console.log("onload ");
      }
      console.log(this.responseText);
      var data = JSON.parse(this.responseText)
      if (!node_to_illustrate.data.thumbnail){
        node_to_illustrate.data.thumbnail = new Image();
        node_to_illustrate.data.thumbnail.done = false;
        node_to_illustrate.data.thumbnail.onload = function() {
          var height = this.height;
          var width = this.width;
          this.oh = parseFloat(height);
          this.ow = parseFloat(width);
          this.done = true;
        }
        node_to_illustrate.data.thumbnail.onerror = function () {
          this.src = 'images/Warning_icon.png';
          this.done = false;
        };
      }
      node_to_illustrate.data.thumbnail.src = data.image+"?"+new Date();
      node_to_illustrate.data.sprite.image = node_to_illustrate.data.name+".png";
      ill_current_id = parseInt(data.id);
      //hide progress bar
      if (document.getElementById("savethumbnail").checked){
          //Util_download_click_url_cb(data.image,node_to_illustrate.data.name+".png");     
          Util_download_src_png(node_to_illustrate.data.thumbnail.src, node_to_illustrate.data.name);
      }
      //ad to the list of files
      /*fetch(data.image)
        .then(res => res.blob())
        .then(blobToBase64)
        .then(finalResult => { 
          pathList_[node_to_illustrate.data.sprite.image] = finalResult;
        });*/
      fetch(data.image)
        .then(res => pathList_[node_to_illustrate.data.sprite.image] = res.blob());
      toggleHide(document.getElementById("spinnerILL"));
    };
    toggleShow(document.getElementById("spinnerILL"));
    xhr.send(formData);
}

function NGL_Illustrate_new(){
  if(!node_selected) return;
  if (!ngl_current_structure) return;
  node_to_illustrate = node_selected;
  //camera position should be reset
  stage.autoView(1000);
  var nameinput = node_selected.data.name;
  var formData = new FormData();
  formData.append("key", "query");
  node_selected.data.sprite.scale2d = 6;
  var style = (document.getElementById("ill_style").checked)?1:0;
  ill_by_chain = (document.getElementById("ill_chain").checked)?1:0;
  var input = ill_prepareInput(style,nameinput,6);
  formData.append("input_txt", input);
  console.log(input);//problem with rotation?
  /*if (node_selected.data.source.pdb.length == 4){
    if (sele_elem.value!="" || assembly_elem.selectedOptions[0].value!="AU"){
        structure_txt=NGL_writeAtoms();
        formData.append("PDBtxt",structure_txt);
    }
    else formData.append("PDBID", node_selected.data.source.pdb);
  }
  else {
    if (sele_elem.value!="" || assembly_elem.selectedOptions[0].value!="AU"){
        structure_txt=NGL_writeAtoms();
        formData.append("PDBtxt",structure_txt);
    }
    else formData.append("PDBfile", pathList_[node_selected.data.source.pdb]);
  }
  */
  structure_txt=ill_writeAtoms(ngl_current_structure, style);
  var astructure_file = new Blob([structure_txt], {
    type: 'text/plain'
  });
  //compress to zip ?
  formData.append("PDBfile",astructure_file);
  formData.append("_id", ill_current_id);
  formData.append("name",nameinput);
  formData.append("force_pdb",true);
  var xhr = new XMLHttpRequest();
  var url = 'https://mesoscope.scripps.edu/beta/cgi-bin/illustrator.py'
  xhr.open('POST', url);
  xhr.timeout = 1000000000;
  xhr.ontimeout = function () {
    console.error("The request for " + url + " timed out.");
  };
  xhr.onload = function () {
    // do something to response
    if(this.status == 200) {
      console.log("onload ");
    }
    console.log(this.responseText);
    var data = JSON.parse(this.responseText)
    if (!node_to_illustrate.data.thumbnail){
      node_to_illustrate.data.thumbnail = new Image();
      node_to_illustrate.data.thumbnail.done = false;
      node_to_illustrate.data.thumbnail.onload = function() {
        var height = this.height;
        var width = this.width;
        this.oh = parseFloat(height);
        this.ow = parseFloat(width);
        this.done = true;
      }
      node_to_illustrate.data.thumbnail.onerror = function () {
        this.src = 'images/Warning_icon.png';
        this.done = false;
      };
    }
    node_to_illustrate.data.thumbnail.src = data.image+"?"+new Date();
    node_to_illustrate.data.sprite.image = node_to_illustrate.data.name+".png";
    ill_current_id = parseInt(data.id);
    //hide progress bar
    if (document.getElementById("savethumbnail").checked){
        //Util_download_click_url_cb(data.image,node_to_illustrate.data.name+".png");     
        Util_download_src_png(node_to_illustrate.data.thumbnail.src, node_to_illustrate.data.name);
    }
    //ad to the list of files
    /*fetch(data.image)
      .then(res => res.blob())
      .then(blobToBase64)
      .then(finalResult => { 
        pathList_[node_to_illustrate.data.sprite.image] = finalResult;
      });*/
    fetch(data.image)
      .then(res => pathList_[node_to_illustrate.data.sprite.image] = res.blob());
    toggleHide(document.getElementById("spinnerILL"));
  };
  toggleShow(document.getElementById("spinnerILL"));
  xhr.send(formData);
}

function myTimerToGetTHeBuffer(o,aStopFunction,clean) {
    console.log("cms_surface_"+o.name);
    var arep = stage.getRepresentationsByName("cms_surface_"+o.name).list[0];
    var surf;
    console.log(arep)
    var comp = stage.getComponentsByName("geom_surface");
    if (comp.list) {
      aStopFunction();
    }
    if (!arep) return;
    if (arep) surf = arep.repr.surface;
    if (!surf) {
      if (arep.repr.dataList.length)
        {
          surf = arep.repr.dataList[0].info.surface;
        }
    }
    if (surf) {
      //change the position according the bu ? append indexes
      var mesh = {"verts":(surf.position)?Array.from(surf.position):null,
                  "faces":(surf.index)?Array.from(surf.index):null,
                  "normals":(surf.normal)?Array.from(surf.normal):null }
      console.log("MESH:", mesh);
      if (o.assembly==="SUPERCELL" || o.node.data.buildtype === "supercell") {
          //do nothing
      }
      else if (o.assembly!=="AU") {
        mesh = NGL_applyBUtoMesh(o,mesh);
      }
      else {
        //recenter the verts
        //scale here ?
        var center = o.position;
        for (var v = 0;v<mesh.verts.length/3;v++){
              mesh.verts[v*3]=mesh.verts[v*3]+center.x;
              mesh.verts[v*3+1]=mesh.verts[v*3+1]+center.y;
              mesh.verts[v*3+2]=mesh.verts[v*3+2]+center.z;
              //mesh.normals[v*3]=-mesh.normals[v*3];
              //mesh.normals[v*3+1]=-mesh.normals[v*3+1];
              //mesh.normals[v*3+2]=-mesh.normals[v*3+2];
         }
      }
      console.log("MESH:", mesh);
      if (!clean) NGL_ShowMeshVFN(mesh);
      if (o.node) {
        o.node.data.geom = mesh; //v,f,n directly
        o.node.data.geom_type = "raw"; //mean that it provide the v,f,n directly
        GP_updateMeshGeometry(o.node,center);
      }
      //hide or destroy?
      stage.getRepresentationsByName("cms_surface_"+o.name).dispose();
      if (clean) stage.removeComponent(o);
      aStopFunction();
    }
}

function NGL_setCMSBufferGeom(o){
  var arep = stage.getRepresentationsByName("cms_surface_"+o.name).list[0];
  console.log("arep:", arep);
  console.log("surf:", arep.repr.surface);
  if (arep.repr.dataList.length) console.log("data surf:", arep.repr.dataList[0].info.surface);
  var surf;
  if (!arep) return;
  if (arep) surf = arep.repr.surface;
  if (!surf) {
    if (arep.repr.dataList.length)
      {
        surf = arep.repr.dataList[0].info.surface;
      }
  }
  console.log("surf:", surf);
  if (surf) {
    //change the position according the bu ? append indexes
    var mesh = {"verts":(surf.position)?Array.from(surf.position):null,
                "faces":(surf.index)?Array.from(surf.index):null,
                "normals":(surf.normal)?Array.from(surf.normal):null }
    console.log("MESH:", mesh);
    if (o.assembly ==="SUPERCELL" || o.node.data.buildtype === "supercell") {
        //do nothing
    }
    else if (o.assembly!=="AU") {
      mesh = NGL_applyBUtoMesh(o, mesh);
    }
    else {
      //recenter the verts
      var center = o.position;
      for (var v = 0;v<mesh.verts.length/3;v++){
            mesh.verts[v*3]=mesh.verts[v*3]+center.x;
            mesh.verts[v*3+1]=mesh.verts[v*3+1]+center.y;
            mesh.verts[v*3+2]=mesh.verts[v*3+2]+center.z;
      }
    }
    console.log("MESH:", mesh);
    //NGL_ShowMeshVFN(mesh);
    if (o.node) {
      o.node.data.geom = mesh; //v,f,n directly
      o.node.data.geom_type = "raw"; //mean that it provide the v,f,n directly
    }
    //hide or destroy?
    stage.getRepresentationsByName("cms_surface").dispose();
  }
}

function NGL_setCMSBufferGeomTimer(o)
{
  var myVar = null;
  function myStopFunction() {
      clearInterval(myVar);
  }
  myVar = setInterval( function() { myTimerToGetTHeBuffer(o,myStopFunction,true); }, 1000 );
}

function NGL_buildCMS(){
  stage.getRepresentationsByName("cms_surface_"+ngl_current_structure.name).dispose();
  //return RepresentationComponent
  var rep = ngl_current_structure.addRepresentation("surface", {
      //colorScheme: color_elem.selectedOptions[0].value,
      sele: sele_elem.value,
      name: "cms_surface_"+ngl_current_structure.name,
      assembly: assembly_elem.selectedOptions[0].value,
      surfaceType: "edt",
      smooth: 2,
      probeRadius: 1.0,
      scaleFactor: cms_scale,
      flatShaded: false,
      opacity: 1.0,
      useWorker: false,
      lowResolution: true,
    });
  ngl_current_structure.autoView();
  var myVar = null;
  function myStopFunction() {
      clearInterval(myVar);
  }
  myVar = setInterval( function() { myTimerToGetTHeBuffer(ngl_current_structure,myStopFunction,false); }, 1000 );
  //var myVar = setInterval(myTimerToGetTHeBuffer, 1000);
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
    opacity: 1,
    //wireframe: true,
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

function NGL_showGeomMembrane_cb(toggle) {
  if (node_selected.data.ingtype == "fiber" || document.getElementById("showaxis").checked) {
    var rep = stage.getComponentsByName("arrowfiber");
    if (rep.list.length !== 0) {
      if (rep.list[0].reprList.length !== 0) {
        rep.list[0].setVisibility(toggle);
      }
    }
  }
  else {
    //toggle the visibility of the geom representation of the current node
    var rep = stage.getComponentsByName("mb");
    if (rep.list.length !== 0) {
      if (rep.list[0].reprList.length !== 0) {
        rep.list[0].setVisibility(toggle);
      }
    }
  }
}

function NGL_showGeomMembrane(e) {
  NGL_showGeomMembrane_cb(e.checked);
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
      NGL_UpdateassemblyList(o);
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
  NGL_LoadAShapeObj(d,d.data.geom);
}

function NGL_LoadAShapeObj(d,gpath) {
  if (!d) d = node_selected;
  if (!d) return;
  var comp = stage.getComponentsByName("geom_surface");
  if (comp.list) {
    for (var i = 0; i < comp.list.length; i++) {
      stage.removeComponent(comp.list[i]);
    }
  }
  if (d.data.geom_type === "raw") {
    NGL_ShowMeshVFN(gpath);
  } else if (d.data.geom_type === "None" &&
    d.data.nodetype !== "compartment") {
    //build it ?
    //buildCMS();
    //test from atomCoords directly
    console.log("NGL_LoadAShapeObj",node_selected);
    buildFromServer(gpath,true,false,null);
  } else if (d.data.geom_type === "file") {
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
        d.data.geom = ftoload;
      } else {
        ftoload = geom_purl + gname;
        isurl = true;
        d.data.geom = gname;
      }
      console.log("try loading geom at " + ftoload);
      console.log(geom_purl);
      console.log(gname);
      if (!ftoload) return;
      if (ext === "obj" || ext === "ply") {
        //stage.removeAllComponents();
        stage.loadFile(ftoload).then(function(o) {
          o.addRepresentation("geom_surface", {
            opacity: 1,
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
          NGL_UpdateassemblyList(o);
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
  var rep = stage.getComponentsByName("ori");
  if (rep.list) {
    for (var i = 0; i < rep.list.length; i++) {
      stage.removeComponent(rep.list[i]);
    }
  }
    var shape = new NGL.Shape("ori");
    shape.addArrow([0, 0, 0], [10, 0, 0], [1, 0, 0], 1.0);
    shape.addArrow([0, 0, 0], [0, 10, 0], [0, 1, 0], 1.0);
    shape.addArrow([0, 0, 0], [0, 0, 10], [0, 0, 1], 1.0);
    //compare to the structure getPrincipalAxes?
    var shapeComp = stage.addComponentFromObject(shape)
    shapeComp.addRepresentation("ori");
    NGL_toggleOrigin(document.getElementById('showorigin'));
}

function NGL_ShowAxisOffset(axis, offset, anode) //StructureView
{
  //arrow is start, end ,color, radius
  if (!anode) anode = node_selected;
  //axis should go from offset to given length
  console.log("load axis",axis, offset);
  console.log(axis[0], axis[1], axis[2]);
  if (!axis || axis === "") return;
  offset = (offset.length === 3) ? offset : [0, 0, 0];
  var axislength = Math.max(Math.max.apply(null, offset) + 50, 50); //Math.max(offset.max()+30,30);
  axis = (axis.length === 3) ? axis : [0, 0, 1];
  console.log(axis);
  
  //check if the component exist otherwise build it
  if (anode) {
    if (anode.data.surface) {
      console.log("build membrane along", axis);
      var q = new NGL.Quaternion();
      axis = new NGL.Vector3(axis[0], axis[1], axis[2]);//normalize ?
      q.setFromUnitVectors(new NGL.Vector3(0, 0, 1), axis.normalize());
      console.log(q, new NGL.Vector3(axis[0], axis[1], axis[2]));
      var shapemb = new NGL.Shape("mb");
      //two cylinder one red up, one blue down, center is 0,0,0
      //Sign of Z coordinate is negative at the inner (IN) side and positive at the outer side.
      var radius = 50;
      var Z = 42.0/2.0;//angstrom14;//+/-14 shouldnt this be 20?
      var thickness = 1.0;
      //axis = [0,0,1];
      shapemb.addCylinder([0, 0, Z - 1], [0, 0, Z + 1], [1, 0, 0], radius, "OUT");
      shapemb.addCylinder([0, 0, -(Z - 1)], [0, 0, -(Z + 1)], [0, 0, 1], radius, "IN");

      var shapembComp = stage.addComponentFromObject(shapemb);
      shapembComp.name = "mb";
      var r = shapembComp.addRepresentation("principalVector");
      shapembComp.setRotation(q);
      shapembComp.setPosition([-offset[0], -offset[1], -offset[2]]);
      console.log("axis ?", axis);

    }
    else 
    {
      var rep = stage.getComponentsByName("arrowfiber");
      if (rep.list.length){
        rep.list.forEach(function(elem){stage.removeComponent(elem);});
      }
      if (anode.data.ingtype=="fiber" || document.getElementById("showaxis").checked ){
        //check if exists
        var shapemb = new NGL.Shape("arrowfiber");
        var q = new NGL.Quaternion();
        q.setFromUnitVectors(new NGL.Vector3(0, 0, 1), new NGL.Vector3(axis[0], axis[1], axis[2]));
        //position1: Vector3 | Array, position2: Vector3 | Array, color: Color | Array, radius: Float, name: String
        shapemb.addArrow([ 0, 0, -50 ], [ 0, 0, 50 ], [ 0, 1, 1 ], 4.0);
        var shapembComp = stage.addComponentFromObject(shapemb);
        shapembComp.name = "arrowfiber";
        var r = shapembComp.addRepresentation("principalVector");
        shapembComp.setRotation(q);
        shapembComp.setPosition([offset[0], offset[1], offset[2]]);
        console.log("NGL_ShowAxisOffset",offset);
      }

    }
  }
}


function NGL_setupBeads(respone) {
  console.log("setup beads");
  console.log(response);
}

/*
use
ngl_current_structure = o;
ngl_current_structure.sele = sele;
ngl_current_structure.assembly = assembly;
*/

function NGL_GetCurrentSelection(){
  var d=node_selected;
  if (!(node_selected)) return "";
  var bu = (d.data.source.bu) ? d.data.source.bu : ""; //document.getElementById("bu_str");
  //selection need to be pmv string
  var sele = (d.data.source.selection) ? d.data.source.selection : ""; //document.getElementById("sel_str");
  //sele = sele.replace(":", "");
  //selection is in NGL format. Need to go in pmv format
  //every :C is a chainNameScheme
  var model = (d.data.source.model) ? d.data.source.model : ""; //model_elem.selectedOptions[0].value;
  if ((!model) || model.startsWith("S") || model.startsWith("a")) model = "";
  if (sele.startsWith("/")) sele = "";

}
/*
console.log(o.object.biomolDict[o.assembly].partList.length);
console.log(o.object.biomolDict[o.assembly]);
for (var j = 0; j < o.object.biomolDict[o.assembly].partList.length; j++) {
  console.log(o.object.biomolDict[o.assembly].partList[j].matrixList.length);
  for (var k = 0; k < o.object.biomolDict[o.assembly].partList[j].matrixList.length; k++) {
    var mat = o.object.biomolDict[o.assembly].partList[j].matrixList[k];
    var new_pos = new NGL.Vector3(sph.center.x, sph.center.y, sph.center.z);
    //console.log(new_pos);
    new_pos.applyMatrix4(mat);
    pos[pos.length] = new_pos.x - center.x;
    pos[pos.length] = new_pos.y - center.y;
    pos[pos.length] = new_pos.z - center.z;
    rad[rad.length] = sph.radius;
  }
}*/

function LiteMolLoad_cb(data,anode) {
  var parsed = LiteMol.Core.Formats.CIF.Text.parse(data);
  if (parsed.isError) {
        console.log(parsed.toString());
        return;
    }
  anode.data.litemol = litemol_current_model = LiteMol.Core.Formats.Molecule.mmCIF.ofDataBlock(parsed.result.dataBlocks[0]).models[0];
  if (anode.data.crystal_radius) {
    litemol_current_model.crystal_mat =LiteMol.Core.Structure.buildSymmetryMatesIJK(litemol_current_model, anode.crystal_radius, 30);
  }
}

function LiteMolLoad(pdburl,anode){
  var url =pdburl
  //LiteMol.Core.Formats.CIF.Text.parse
  //let model = LiteMol.Core.Formats.Molecule.mmCIF.ofDataBlock(parsed.result.dataBlocks[0]).models[0];
  //LiteMol.Core.Structure.buildSymmetryMates(amodel, radius) :
  if (!anode.data.litemol) callAjax(url, LiteMolLoad_cb, anode);
}
// /LiteMol.Core.Structure.SymmetryHelpers
//supercell affect the uncentered assymetric unit ?
function NGL_BuildSUPERCELL(anode, pdburl, aradius){
  var url = pdburl;
  anode.data.crystal_radius = aradius;
  //LiteMol.Core.Formats.CIF.Text.parse
  //let model = LiteMol.Core.Formats.Molecule.mmCIF.ofDataBlock(parsed.result.dataBlocks[0]).models[0];
  //LiteMol.Core.Structure.buildSymmetryMates(amodel, radius) :
  if (!anode.data.litemol) callAjax(url, LiteMolLoad_cb, anode);
  else {
    litemol_current_model = anode.data.litemol;
    litemol_current_model.crystal_mat =LiteMol.Core.Structure.buildSymmetryMatesIJK(litemol_current_model, aradius, 30);
    //litemol_current_model.crystal_mat =LiteMol.Core.Structure.buildSymmetryMates(litemol_current_model, aradius);
  }
}

function NGL_GetAtomDataSet(pdb,struture_object){
  var dataset = [];
  var o = struture_object;
  if (!o) o = ngl_current_structure;
  if (pdb) {}//load ?
  var ats = o.structure.atomStore;
  var nAtom = ats.count;
  console.log("found ",nAtom);
  var asele = "";
  if (o.ngl_sele && o.ngl_sele!=="") {
    if (o.ngl_sele.string !== null) asele = o.ngl_sele.string;
    else asele = o.ngl_sele;
  }
  else if (o.sele&& o.sele!=="") {
    asele = o.sele;
  }
  if (sele_elem.value&& sele_elem.value!=="") {
    if (asele !== sele_elem.value) asele = sele_elem.value;
  }
  if (asele === "") asele = "";
  var bu = false;
  if (o.assembly !== "AU" && o.object.biomolDict[o.assembly]) {
    //need to apply the matrix to the selection inside the BU selection ?
    //console.log(o.object.biomolDict[o.assembly].getSelection());
    //build using given selection AND biomolDic selection
    asele = "(" + o.object.biomolDict[o.assembly].getSelection().string + ") AND " + asele;
    bu = true;
  }
  console.log("selection is ",asele);
  var amodel;
  /*if (o.structure.modelStore.count > 1) {
    asele = "polymer";
    //check if chain selected ?
    o.structure.eachModel(function(m){
      console.log("model",m.index,node_selected.data.source.model,(m.index === node_selected.data.source.model));
      if (m.index === parseInt(node_selected.data.source.model)){
        console.log(m);
        m.eachAtom(function(ap) {
          console.log(ap.modelIndex,ap.index);
          if (ap.atomname==="CA" || nAtom < 20000) dataset.push([
                        o.structure.atomStore.x[ap.index],
                        o.structure.atomStore.y[ap.index],
                        o.structure.atomStore.z[ap.index]]);
        });
      }
    });
  }*/
  o.structure.eachAtom(function(ap) {
    if (ap.atomname ==="CA" || ap.atomname==="C3'" || ap.atomname==="C4'" || ap.atomname==="C4*" || nAtom < 20000) {//problem with DNA no CA why || nAtom < 20000 ?
      dataset.push([ap.x, ap.y, ap.z]);
      //console.log(ap.modelIndex,ap.index);
    }
  }, new NGL.Selection(asele));
  //console.log("dataset is ", dataset.length, dataset);
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
    "radius": (cluster_force_radius!=-1.0)?cluster_force_radius:parseInt(R)
  };
}

function NGL_autoClusterUniqueSize(o,center){
  var proxy_radius=cluster_force_radius;
  var Vproxy = 4*Math.PI*(proxy_radius*proxy_radius*proxy_radius)/3.0;
  var nAtom = o.structure.atomStore.count;
  var V = nAtom * 10.0 * 1.21
  var beads0 = o.structure.boundingBox.getBoundingSphere();
  var bsize = o.structure.boundingBox.getSize();
  var biszea = bsize.toArray();
  //console.log("box size is",bsize,biszea);
  var R = Math.max.apply(null, biszea) / 4; //beads0.radius
  V = 4*Math.PI*(R*R*R)/3.0;
  var nProxy = parseInt(Math.round(V/Vproxy));
  if (nProxy < 3) nProxy = 3
  console.log("ncluster "+ nProxy.toString()+" "+nAtom.toString())
  //let pcluster_force_radius=cluster_force_radius;
  //cluster_force_radius = proxy_radius;
  var _cluster_coords = buildWithKmeans(o, center, nProxy);
  //cluster_force_radius = pcluster_force_radius; 
  return _cluster_coords;
}

//node_selected.data.radii[0].radii=node_selected.data.radii[0].radii.map(x=>3.0)
function NGL_ClusterStructure(o, center) {
  //if (ngl_cluster_automatic) return NGL_autoClusterUniqueSize(o,center);
  //else 
  return buildWithKmeans(o, center, parseInt(slidercluster_elem.value));
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

function NGL_ChangeClusterNb_cb(e){
    ngl_cluster_automatic = e.checked;
}

function NGL_ChangeClusterGrid_cb(e){
    ngl_cluster_grid = e.checked;
}

function NGL_ChangeClusterGridLOD_cb(e){
  toggle_cluster_grid_from_LOD0 = e.checked;
}


function NGL_pcpTest(){
  var sele = new NGL.Selection(ngl_current_structure.sele);
  var axedata = stage.getRepresentationsByName("axes").list[0].repr.getAxesData(ngl_current_structure.structureView) 
  var off = 6*3; 
  var c1 = new NGL.Vector3(axedata.vertex.position[off],axedata.vertex.position[off+1],axedata.vertex.position[off+2])
  off = 6*3 + 4*3
  var c2 = new NGL.Vector3(axedata.vertex.position[off],axedata.vertex.position[off+1],axedata.vertex.position[off+2])
  console.log(sele,sele.string);
  var pcpr = stage.getRepresentationsByName("axes").list[0].repr.getPrincipalAxes(sele);
  var pcp = ngl_current_structure.structureView.getPrincipalAxes(sele);
  const {d1a, d2a, d3a, d1b, d2b, d3b} = pcp.getProjectedScaleForAtoms(ngl_current_structure.structure)
  var bvol1 = pcp.vecA.length()*2.0*pcp.vecB.length()*2.0*pcp.vecC.length()*2.0;
  var bvol2 = pcpr.vecA.length()*2.0*pcpr.vecB.length()*2.0*pcpr.vecC.length()*2.0;  
  var bvol3 = (c1.x-c2.x)*(c1.y-c2.y)*(c1.z-c2.z);
  var bvol4 = (d1b-d1a)*(d2b-d2a)*(d3b-d3a);
  var proxy_radius=parseFloat(cluster_force_radius);
  var Vproxy = 4*Math.PI*(proxy_radius*proxy_radius*proxy_radius)/3.0;
  //var nAtom = dataset.length*2;
  //var V = nAtom * 10.0 * 1.21
  //var R = o.viewer.bRadius;//Math.max.apply(null, biszea) / 4; //beads0.radius
  //V = 4*Math.PI*(R*R*R)/3.0;
  var nProxy1 = parseInt(Math.ceil(bvol1/Vproxy));
  var nProxy2 = parseInt(Math.ceil(bvol2/Vproxy));
  var nProxy3 = parseInt(Math.ceil(bvol3/Vproxy));
  var nProxy4 = parseInt(Math.ceil(bvol4/Vproxy));
  //if (nProxy < 3) nProxy = 3
  //ncluster = nProxy;
  console.log("ncluster "+ nProxy1.toString()+" "+nProxy2.toString()+" "+nProxy3.toString()+" "+nProxy4.toString())
}
function getVoxelIJKfromU(index, sizex, sizey)
{ 
	var sliceNum = sizex*sizey;
	var z = index / (sliceNum);
	var temp = index % (sliceNum);
	var y = temp / sizex;
	var x = temp % sizex;
	return [Math.floor(x),Math.floor(y),Math.floor(z)];
}

function getVoxelIdFrom3D(pt3d, grid_unit, gridSizesx,gridSizesy,gridSizesz,bbmin)
{
	var x = pt3d.x;
	var y = pt3d.y;
	var z = pt3d.z;
	var spacing1 = 1.0 / grid_unit;//  # Grid spacing = diagonal of the voxel determined by smalled packing radius
									 //test first if point lie inside the grid
//	if (pt3d.x<bbmin.x || pt3d.y<bbmin.y || pt3d.z<bbmin.z || pt3d.x>bbmax.x || pt3d.y>bbmax.y || pt3d.z>bbmax.z) {
		//outside the cube
//		return -1;
//	}
	//else {
		var i = Math.min(gridSizesx, Math.max(0, Math.round((x - bbmin.x) * spacing1)));
		var j = Math.min(gridSizesy, Math.max(0, Math.round((y - bbmin.y) * spacing1)));
		var k = Math.min(gridSizesz, Math.max(0, Math.round((z - bbmin.z) * spacing1)));
		return k * gridSizesx * gridSizesy + j *gridSizesx + i;
	//}
}

function getVoxelIJKFrom3D(pt3d, grid_unit, gridSizesx,gridSizesy,gridSizesz,bbmin)
{
	var x = pt3d.x;
	var y = pt3d.y;
	var z = pt3d.z;
	var spacing1 = 1.0 / grid_unit;//  # Grid spacing = diagonal of the voxel determined by smalled packing radius
									 //test first if point lie inside the grid
//	if (pt3d.x<bbmin.x || pt3d.y<bbmin.y || pt3d.z<bbmin.z || pt3d.x>bbmax.x || pt3d.y>bbmax.y || pt3d.z>bbmax.z) {
		//outside the cube
//		return -1;
//	}
	//else {
		var i = Math.min(gridSizesx, Math.max(0, Math.round((x - bbmin.x) * spacing1)));
		var j = Math.min(gridSizesy, Math.max(0, Math.round((y - bbmin.y) * spacing1)));
		var k = Math.min(gridSizesz, Math.max(0, Math.round((z - bbmin.z) * spacing1)));
		return {i:i,j:j,k:k};
	//}
}

function ComputeBounds(spheres, padding)
{
    var bbMin = new NGL.Vector3(999999, 999999, 999999);
    var bbMax = new NGL.Vector3(-999999, -999999, -999999);
    for (var i=0;i<spheres.length;i++)
    {
        var sphere = new NGL.Vector3(spheres[i][0],spheres[i][1],spheres[i][2]);
        bbMin = bbMin.min(sphere);
        bbMax = bbMax.max(sphere);
    }
    // add 1.5f since it does not take the atom size into account
    bbMin.addScalar(-padding);
    bbMax.addScalar(padding);
    var bbSize = new NGL.Vector3(0,0,0);
    bbSize.subVectors (bbMax,bbMin);
    //var bbCenter = new NGL.Vector3(0,0,0);
    //bbCenter = bbMin + bbSize*0.5f;
    //if (spheres.Count == 1)
    //{
    //    bbSize = new Vector3(spheres[0].w - 0.5f, spheres[0].w - 0.5f, spheres[0].w - 0.5f);
    //    bbCenter = new Vector3(spheres[0].x, spheres[0].y, spheres[0].z);
    //}
    return {bbMin:bbMin,bbSize:bbSize};
}

function buildClusterGridSphere(o, dataset , center, asele, radius) {
  var nsele = new NGL.Selection(asele);
  //var pcp = stage.getRepresentationsByName("axes").list[0].repr.getPrincipalAxes();
  //var pcp = stage.getRepresentationsByName("axes").list[0].repr.getPrincipalAxes(sele);
  var bb = ComputeBounds(dataset, 1.5);
  var spacing = parseFloat(cluster_force_radius);
  var sizex= Math.ceil(bb.bbSize.x/spacing);
  var sizey= Math.ceil(bb.bbSize.y/spacing);
  var sizez= Math.ceil(bb.bbSize.z/spacing);
  var pos = [];
  var rad = [];
  
  var gridsize = sizex*sizey*sizez;
  //bbmin + float3(xyz.x*grid_unit, xyz.y*grid_unit, xyz.z*grid_unit) + grid_unit/2.0;
  for (var i=0;i<sizex;i++){
    for (var j=0;j<sizey;j++){
      for (var k=0;k<sizez;k++){
        var p = new NGL.Vector3(bb.bbMin.x+i*spacing+spacing/2.0-center.x,
                            bb.bbMin.y+j*spacing+spacing/2.0-center.y,  
                            bb.bbMin.z+k*spacing+spacing/2.0-center.z)
        if (p.length() > radius) continue;
        pos.push(p.x);
        pos.push(p.y);
        pos.push(p.z);
        rad.push(spacing);
      }
    }
  }
  return {
    "pos": pos,
    "rad": rad
  };
}

//buildClusterGridSpheresFromToLOD(node_selected, ngl_current_structure, "", 1, 0)
function buildClusterGridSpheresFromToLOD(anode, nglo, asele, fromLOD, toLOD) {
  var lod1p = anode.data.pos[fromLOD].coords;
  var lod1r = anode.data.radii[fromLOD].radii;
  var dataset = NGL_GetAtomDataSet(null,nglo);
  var newLOD = buildClusterGridSpheres(nglo, dataset, nglo.gcenter, asele, lod1p, lod1r);
  anode.data.pos[toLOD].coords = newLOD.pos;
  anode.data.radii[toLOD].radii = newLOD.rad;
}

//buildClusterGridSpheresFromDataset(node_selected, ngl_current_structure, "", 0)
function buildClusterGridSpheresFromDataset(anode, nglo, asele, toLOD) {
  var dataset = NGL_GetAtomDataSet(null,nglo);
  var newLOD = buildClusterGridSpheresFromAtoms(nglo,dataset,nglo.gcenter,asele);
  anode.data.pos[toLOD].coords = newLOD.pos;
  anode.data.radii[toLOD].radii = newLOD.rad;
}

//var dataset = NGL_GetAtomDataSet(null,ngl_current_structure);
//var R = buildClusterGridSpheresFromAtoms(ngl_current_structure,dataset,ngl_current_structure.gcenter,"")
function buildClusterGridSpheresFromAtoms(o, dataset , center, asele) {
  var nsele = new NGL.Selection(asele);
  //var pcp = stage.getRepresentationsByName("axes").list[0].repr.getPrincipalAxes();
  //var pcp = stage.getRepresentationsByName("axes").list[0].repr.getPrincipalAxes(sele);
  var bb = ComputeBounds(dataset, 1.5);
  var spacing = parseFloat(cluster_force_radius);
  var sizex= Math.ceil(bb.bbSize.x/spacing);
  var sizey= Math.ceil(bb.bbSize.y/spacing);
  var sizez= Math.ceil(bb.bbSize.z/spacing);
  var pos = [];
  var rad = [];
  var agrid=[]
  for (var l=0;l<dataset.length;l++){
    var ap = new NGL.Vector3(dataset[l][0],dataset[l][1],dataset[l][2]);
    //convertto3D
    var xyz = getVoxelIJKFrom3D(ap, spacing, sizex,sizey,sizez,bb.bbMin);
    var alocation = Math.ceil(xyz.k * sizex * sizey + xyz.j *sizex + xyz.i);
    //distacce ?
    //var xyz = getVoxelIJKfromU(location);
    var p = new NGL.Vector3(bb.bbMin.x+xyz.i*spacing,
      bb.bbMin.y+xyz.j*spacing,  
      bb.bbMin.z+xyz.k*spacing)
      var d = p.distanceTo(ap);
      //console.log(d);
      if (d < spacing) {
        agrid[alocation] = p;
      }
  }
  agrid.forEach(element => {
    rad.push(spacing);
    pos.push(element.x-center.x);
    pos.push(element.y-center.y);
    pos.push(element.z-center.z);
  });
  return {
    "pos": pos,
    "rad": rad
  };
}

function buildClusterGridSpheres(o, dataset , center, asele, positions,radii) {
  var nsele = new NGL.Selection(asele);
  //var pcp = stage.getRepresentationsByName("axes").list[0].repr.getPrincipalAxes();
  //var pcp = stage.getRepresentationsByName("axes").list[0].repr.getPrincipalAxes(sele);
  var bb = ComputeBounds(dataset, 1.5);
  var spacing = parseFloat(cluster_force_radius);
  var sizex= Math.ceil(bb.bbSize.x/spacing);
  var sizey= Math.ceil(bb.bbSize.y/spacing);
  var sizez= Math.ceil(bb.bbSize.z/spacing);
  var pos = [];
  var rad = [];
  
  var gridsize = sizex*sizey*sizez;
  //bbmin + float3(xyz.x*grid_unit, xyz.y*grid_unit, xyz.z*grid_unit) + grid_unit/2.0;
  for (var i=0;i<sizex;i++){
    for (var j=0;j<sizey;j++){
      for (var k=0;k<sizez;k++){
        var p = new NGL.Vector3(bb.bbMin.x+i*spacing+spacing/2.0-center.x,
                            bb.bbMin.y+j*spacing+spacing/2.0-center.y,  
                            bb.bbMin.z+k*spacing+spacing/2.0-center.z)
        for (var l=0;l<radii.length;l++){
          var d = p.distanceTo(new NGL.Vector3(positions[l*3],positions[l*3+1],positions[l*3+2]));
          if (d > radii[l]) continue;
          pos.push(p.x);
          pos.push(p.y);
          pos.push(p.z);
          rad.push(spacing);
        }
      }
    }
  }
  return {
    "pos": pos,
    "rad": rad
  };
}

//https://github.com/EtixLabs/clustering
function buildWithKmeans(o, center, ncluster) {
  //slow ?
  var kmeans = new KMEANS();
  var ats = o.structure.atomStore;
  var nAtom = ats.count;
  var asele = (o.ngl_sele) ? o.ngl_sele : "";
  if (o.ngl_sele.string !== null) asele = o.ngl_sele.string;
  if (asele === "") asele = "";
  //console.log("kmeans sele",asele); //current sele undefined
  var bu = false;
  console.log(o.assembly); //current assembly
  if (o.assembly !== "AU" && o.object.biomolDict[o.assembly]) {
    //need to apply the matrix to the selection inside the BU selection ?
    //console.log(o.object.biomolDict[o.assembly].getSelection());
    //build using given selection AND biomolDic selection
    asele = "(" + o.object.biomolDict[o.assembly].getSelection().string + ") AND " + asele;
    bu = true;
  }
  console.log("Kmeans selection", asele);
  var dataset = NGL_GetAtomDataSet(null,o);
  console.log("Kmeans selection length", dataset.length);
  if (dataset.length === 0 ) return null;
  
  if (ngl_cluster_automatic)
  {
    var nsele = new NGL.Selection(asele);
    //var pcp = stage.getRepresentationsByName("axes").list[0].repr.getPrincipalAxes();
    var pcp = stage.getRepresentationsByName("axes").list[0].repr.getPrincipalAxes(sele);
    //var pcp = ngl_current_structure.structureView.getPrincipalAxes(nsele);
    //const {d1a, d2a, d3a, d1b, d2b, d3b} = pcp.getProjectedScaleForAtoms(ngl_current_structure.structureView)
    var bvol = pcp.vecA.length()*2.0*pcp.vecB.length()*2.0*pcp.vecC.length()*2.0;
    //var bvol = (d1b-d1a)*(d2b-d2a)*(d3b-d3a);
    var proxy_radius=parseFloat(cluster_force_radius);
    var Vproxy = 4*Math.PI*(proxy_radius*proxy_radius*proxy_radius)/3.0;
    //var nAtom = dataset.length*2;
    //var V = nAtom * 10.0 * 1.21
    //var R = o.viewer.bRadius;//Math.max.apply(null, biszea) / 4; //beads0.radius
    //V = 4*Math.PI*(R*R*R)/3.0;
    var nProxy = parseInt(Math.ceil(bvol/Vproxy));
    if (nProxy <= 2) nProxy = 2
    else nProxy = nProxy + 2 // padding
    ncluster = nProxy;
    console.log("ncluster "+ nProxy.toString()+" "+nAtom.toString())
  }
  var clusters = [];
  if (ngl_cluser_sequence) {
    clusters = [[]];
    var clusters_xyz = [];
    var cl_tmp = [];
    //build custer along residues every cluster_force_radius
    var start = new NGL.Vector3(dataset[0][0], dataset[0][1], dataset[0][2]); 
    var cli = 0;
    for (var i=1;i<dataset.length;i++){
      clusters[cli].push(i);
      var current = new NGL.Vector3(dataset[i][0], dataset[i][1], dataset[i][2]); 
      const d = current.distanceTo( start );
      if (d >= parseFloat(cluster_force_radius)*1.75) {
        //add a cluster
        var cluster = new NGL.Vector3(0, 0, 0);
        cluster.subVectors(start,current)
        cluster.multiplyScalar(0.5);
        clusters_xyz.push([cluster.x,cluster.y,cluster.z]);
        start = current;
        clusters.push([]);
        cli++;
      }
    }
    ncluster = clusters.length;
  } else if (ngl_cluster_grid) {
    //special case, should we use multiple spheres x,y,z,r ?
    //buildClusterGridSpheresFromDataset(o.node, o, asele, 0)
    var dataset = NGL_GetAtomDataSet(null,o);
    return buildClusterGridSpheresFromAtoms(o, dataset, center,asele);
  }
  else if (toggle_cluster_grid_from_LOD0) {
    var lod1p = o.node.data.pos[0].coords;
    var lod1r = o.node.data.radii[0].radii;
    var dataset = NGL_GetAtomDataSet(null,o);
    return buildClusterGridSpheres(o, dataset, center, asele, lod1p, lod1r);
  }
  else {
    console.log("cluster!!", ncluster, dataset.length);
    clusters = kmeans.run(dataset, ncluster);
  }

  //center = o.position;//negatif?
  console.log(bu, clusters,o.assembly,o.node.data.buildtype);
  if (!bu) {
    return NGL_ClusterToBeads(clusters, o, center,dataset);
  }
  else {
    if (o.assembly==="SUPERCELL" || o.node.data.buildtype === "supercell") {
      //should we use litemol here?
      return NGL_ClusterToBeads(clusters, o, new NGL.Vector3(0),dataset);
    }
    else {
      center = NGL_GetBUCenter(o,o.assembly).center;
      return NGL_applybuToclusters(o,clusters,center,dataset);
    }
  }
}

function NGL_applyBUtoResultsBeads(o,beads,center){
  var pos = []; //flat array
  var rad = []; //flat array
  var nCluster = beads.length;
  console.log("use center ", center);
  var j=0;
  for (var i = 0; i < nCluster; i++) {
    //var cl = beads.centers[j];
    var radius = beads.radii[i];
    var sph = cl.centers; //atom in cluster

    for (var j = 0; j < o.object.biomolDict[o.assembly].partList.length; j++) {
      for (var k = 0; k < o.object.biomolDict[o.assembly].partList[j].matrixList.length; k++) {
        var mat = o.object.biomolDict[o.assembly].partList[j].matrixList[k];
        var new_pos = new NGL.Vector3(beads.centers[j], beads.centers[j+1], beads.centers[j+2]);
        //console.log(new_pos);
        new_pos.applyMatrix4(mat);
        pos[pos.length] = new_pos.x - center.x;
        pos[pos.length] = new_pos.y - center.y;
        pos[pos.length] = new_pos.z - center.z;
        rad[rad.length] = radius;
      }
    }
    j+=3;
  }
  beads.centers = pos;
  beads.radii = rad;
  return beads;
}

function NGL_applybuToclusters(o,clusters,center,dataset){
  var pos = []; //flat array
  var rad = []; //flat array
  var nCluster = clusters.length;
  console.log("use center ", center);
  for (var i = 0; i < nCluster; i++) {
    var cl = clusters[i];
    //get center
    //var sele = new NGL.Selection('@' + cl.join(','));
    //var sele = numbers.filter(CheckIfPrime);
    //var sph = NGL_GetGeometricCenter(o, sele); //atom in cluster
    var sph = NGL_GetGeometricCenterArray(cl,dataset);//atom in cluster
    //pos[pos.length] = sph.center.x-center.x;
    //pos[pos.length] = sph.center.y-center.y;
    //pos[pos.length] = sph.center.z-center.z;
    //rad[rad.length] = sph.radius;
    //add as many as matrixList.
    //console.log(o.object.biomolDict[o.assembly].partList.length);
    //console.log(o.object.biomolDict[o.assembly]);
    for (var j = 0; j < o.object.biomolDict[o.assembly].partList.length; j++) {
      //console.log(o.object.biomolDict[o.assembly].partList[j].matrixList.length);
      for (var k = 0; k < o.object.biomolDict[o.assembly].partList[j].matrixList.length; k++) {
        var mat = o.object.biomolDict[o.assembly].partList[j].matrixList[k];
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

function NGL_ClusterToBeads(some_clusters, astructure, center, dataset) {
  var pos = []; //flat array
  var rad = []; //flat array
  var nCluster = some_clusters.length;
  console.log("use center ", center);
  //var model = (node_selected.data.source.model)?"/"+node_selected.data.source.model:"";
  for (var i = 0; i < nCluster; i++) {
    var cl = some_clusters[i];
    //if model need to offset all the number ?
    //var asele = new NGL.Selection(model+'@' + cl.join(','));
    //console.log(asele,model);
    var sph = NGL_GetGeometricCenterArray(cl, dataset);
    //var sph = NGL_GetGeometricCenter(astructure, asele); //atom in cluster
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
  if (!(_cluster_coords)) return;
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
  if (!(lvl1_cluster_coords)) return;
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

function NGL_UpdatePDBComponent(){
  var ispdb = document.getElementById("pdb_component_enable")?document.getElementById("pdb_component_enable").checked : false;
  if (!ispdb) return;
  //use current selection
  if (node_selected) {
    NGL_pdbComponentPost(node_selected.data.source.pdb,node_selected.data.uniprot);
  }
  else NGL_cleanpdbComponentPost();
}

function NGL_cleanpdbComponentPost(){
  UpdatePDBcomponent("");
  UpdateUniPDBcomponent("");
  setupProVista("");
}

function NGL_pdbComponentPost(pdb,uniprot){
  UpdatePDBcomponent(pdb.toLowerCase()); //only work if 4letter
  if (uniprot === "") {
    //gather the first uniprot code ?
    var entry = CleanEntryPDB(pdb.toLowerCase());
    if (entry !=="") {
      current_list_pdb=[entry]
      custom_report_uniprot_only = true;
      customReport(entry);//should update the uniprot
    }
    else {
      UpdateUniPDBcomponent("");
      setupProVista("");
    }
  }
  else {
    UpdateUniPDBcomponent(uniprot);
    setupProVista(uniprot);
  }
}

function NGL_ReprensentOne(o,anode){
  var params = {
    defaultRepresentation: false,
    name: o.name
  };
  var assembly = "AU";
  var bu = anode.data.source.bu;
  if (bu !== -1 && bu !== null && bu !== "") {
    if (!bu.startsWith("BU") && bu !== "AU" && bu != "UNICELL" && bu !== "SUPERCELL") bu = "BU" + bu;
    params.assembly = bu;
    assembly = bu;
  }
  var sele = "";
  var sel_str = anode.data.source.selection;
  if (sel_str && sel_str != "") {
    sele = sel_str;
    //update html input string
  }
  sele_elem.value = sele;

  var xcenter = NGL_GetGeometricCenter(o, new NGL.Selection(sele));
  o.gcenter = xcenter.center;
  o.radius = xcenter.radius;
  var center = xcenter.center;
  if (assembly !== "AU") center = NGL_GetBUCenter(o,assembly).center;
  console.log("setPosition");
  o.setPosition([-center.x, -center.y, -center.z]); //center molecule
  if (anode.data.surface || anode.data.ingtype=="fiber"){
    align_axis = true;
    var offset = anode.data.offset;
    var axis = anode.data.pcpalAxis;
    /*if (anode.data.opm === 1) {
      offset = [center.x,center.y,center.z];
      axis = [0,0,1];
      NGL_updatePcpElem();
      //NGL_applyPcp();
    }*/
    console.log("offset?", offset,axis);
    NGL_ShowAxisOffset(axis, offset, anode);
  }
  else {
    var rep = stage.getComponentsByName("mb");
    if (rep.list.length){
      rep.list.forEach(function(elem){stage.removeComponent(elem);});
    }
    var rep = stage.getComponentsByName("arrowfiber");
    if (rep.list.length){
      rep.list.forEach(function(elem){stage.removeComponent(elem);});
    }
  }
  console.log("axes");
  o.addRepresentation("axes", {
    sele: sele,
    showAxes: true,
    showBox: true,
    radius: 0.2
  })
  NGL_showBox(document.getElementById('showbox'));
  if (rep_elem.selectedOptions[0].value==="cms"){
    o.addRepresentation("surface", {
      //colorScheme: color_elem.selectedOptions[0].value,
      sele: sele,
      name: "polymer",
      assembly: assembly,
      surfaceType: "edt",
      smooth: 2,
      probeRadius: 1.0,
      scaleFactor: cms_scale,
      flatShaded: false,
      opacity: 1.0,
      lowResolution: true,
    });
  }
  else {
      o.addRepresentation(rep_elem.selectedOptions[0].value, {
      //colorScheme: color_elem.selectedOptions[0].value,
      sele: sele,
      name: "polymer",
      assembly: assembly
    });
  }
  console.log("show geom");
  if (document.getElementById("showgeom").checked) {
    NGL_LoadAShapeObj(anode, anode.data.geom);
    NGL_showGeomNode_cb(true);
  }
  //return {"comp":o,"anode":anode};
}

function NGL_ReprensentOnePost(o,anode){
    NGL_UpdateassemblyList(o);
    NGL_setModelOptions(o);
    NGL_setChainSelectionOptions(o);
    var bu = anode.data.source.bu;
    var assembly = "AU";
    if (bu !== -1 && bu !== null && bu !== "") {
      if (!bu.startsWith("BU") && bu !== "AU" && bu != "UNICELL" && bu !== "SUPERCELL") bu = "BU" + bu;
      assembly = bu;
    }
    if (bu !== -1) $('#ass_type').val(assembly); //assembly_elem.selectedIndex = assembly;//$('#ass_type').val(assembly);//.change();
    else $('#ass_type').val("AU"); //assembly_elem.selectedIndex = "AU";//$('#ass_type').val("AU");//.change();
    NGL_LoadSpheres(anode.data.pos, anode.data.radii);
    ngl_load_params.beads.pos = anode.data.pos;
    ngl_load_params.beads.rad = anode.data.radii;
    NGL_showBeadsLevel(beads_elem.selectedOptions[0]);
    NGL_ShowOrigin();
}

function NGL_GetBUCenter(nglobj,ass){
  var chain_center = nglobj.gcenter;//use the geometric selection center not .position which can alreayd be the bu
  var center_bu=new NGL.Vector3();
  var center=new NGL.Vector3();
  var bucount=0;
  var R = 0;
  if (!(ass in nglobj.structure.biomolDict)) return {
    "center": chain_center,
    "radius": R
  };
  if (ass==="AU") return {
    "center": chain_center,
    "radius": R
  };
  for (var j = 0; j < nglobj.object.biomolDict[ass].partList.length; j++) {
    console.log(nglobj.object.biomolDict[ass].partList[j].matrixList.length);
    for (var k = 0; k < nglobj.object.biomolDict[ass].partList[j].matrixList.length; k++) {
      var mat = nglobj.object.biomolDict[ass].partList[j].matrixList[k];
      center.copy(chain_center).applyMatrix4(mat);
      center_bu.add(center);
      bucount++;
    }
  }
  center_bu.divideScalar(bucount);
  for (var j = 0; j < nglobj.object.biomolDict[ass].partList.length; j++) {
    for (var k = 0; k < nglobj.object.biomolDict[ass].partList[j].matrixList.length; k++) {
      var mat = nglobj.object.biomolDict[ass].partList[j].matrixList[k];
      center.copy(chain_center).applyMatrix4(mat);
      var L = center.sub(center_bu).length() + nglobj.radius;
      if (L > R) R = L;
    }
  }
  return {
    "center": center_bu,
    "radius": R
  };
}

function NGL_LoadOneProtein(purl, aname, bu, sel_str, onfinish_cb = null) {
  var setopm = false;
  if (ngl_current_node && ngl_current_node.data.surface) {
    document.getElementById('surface').setAttribute("class", "show");
    //replace the pdb if exist in opm ?
    if (aname.length === 4){
      aname  = aname.toLowerCase();
      if (ngl_current_node.data.opm === 1){
          //replace purl
          //purl = cellpack_repo+"opm/" + aname + ".mmtf";
          purl = opm_url+ aname +".pdb"
      }
      else if (ngl_current_node.data.opm === 0)
      {
          //check if exists
          var search_url = cellpack_repo+"opm/"+aname+ ".mmtf";
          var results = syncCall(search_url);
          if (results !=="")
          {
            purl = cellpack_repo+"opm/" + aname + ".mmtf";
            ngl_current_node.data.opm = 1;
            setopm = true;
          }
          else {
            ngl_current_node.data.opm = -1;
          }
          //check if exist in opm..doesnt work
          //var search_url = "https://opm.phar.umich.edu/proteins/2171"
          //var search_url = "http://opm.phar.umich.edu/protein.php?search="+aname//1l7v
          //var results = syncCall(search_url);
          //var parser = new DOMParser();
          //var hdoc = parser.parseFromString(results,"text/xml");
          //console.log(hdoc);
      }
    }
    //update the elem
    NGL_updatePcpElem();
  } else {
    document.getElementById('surface').setAttribute("class", "hidden");
  }
  if (ngl_current_node && (ngl_current_node.data.ingtype == "fiber" || document.getElementById("showaxis").checked )){
    //use the axis as principale axis for fiber
    document.getElementById('surface').setAttribute("class", "show");
    NGL_updatePcpElem();
  }
  if (!purl) return;
  var isseq = document.getElementById("sequence_mapping")?document.getElementById("sequence_mapping").checked : false;
  if (isseq) querySequenceMapping(aname);//async call
  if (!bu) bu="";//default bu will be BU1? if exist
  console.log("load url " + purl + " " + bu + " " + sel_str);

  //if its a surface protein show the modal for the pcpalAxis and the offset
  var params = {
    defaultRepresentation: false,
    name: aname
  };
  var sele = "";
  var model = "";
  if (sel_str && sel_str != "") {
    //if (node_selected.data.source.model !== "") model = node_selected.data.source.model;
    //sele = NGL_GetSelection(sel_str,model);
    sele = sel_str
    //update html input string
  }
  sele_elem.value = sele;
  var assembly = "AU";
  params.assembly = assembly;
  if (bu !== -1 && bu !== "-1" && bu !== null && bu !== "") {
    if (!bu.startsWith("BU") && bu !== "AU" && bu != "UNICELL" && bu !== "SUPERCELL") bu = "BU" + bu;
    params.assembly = bu;
    assembly = bu;
  }
  if (bu ==="SUPERCELL" || ngl_current_node.data.buildtype === "supercell") {
    var pdburl = LM_getUrlStructure(ngl_current_node, ngl_current_node.data.source.pdb);
    var aradius = ngl_current_node.data.size;
    //node_selected = anode;
    if (!(ngl_current_node.data.hasOwnProperty("litemol"))) ngl_current_node.data.litemol = null;
    if (ngl_current_node.parent.data.geom_type === "mb"){
      if (ngl_current_node.parent.data.geom.radii)
        aradius = ngl_current_node.parent.data.geom.radii[0]/2.0;
      else if (ngl_current_node.parent.data.radii)
        aradius = ngl_current_node.parent.data.radii[0].radii[0]/2.0;
    }
    NGL_BuildSUPERCELL(ngl_current_node, pdburl, aradius);//this is async ?
  }
  //this is async!
  stage.loadFile(purl, params)
    .then(function(o) {
      ngl_current_structure = o;
      console.log("loading "+sele+" "+bu+" "+assembly);
      if (!(assembly in ngl_current_structure.object.biomolDict)) {
        assembly = "AU";
        //change the node and the grid ?
        if (ngl_current_item_id) updateDataGridRowElem(0, ngl_current_item_id, "bu", "AU");
        if (node_selected) {
          node_selected.data.source.bu = "AU";
        }
      }
      if (sele === ""  && assembly !== "AU"){
        //take the chain selection from the bu

        sele = ngl_current_structure.object.biomolDict[assembly].getSelection().string;
      }
      ngl_current_structure.node = ngl_current_node;
      ngl_current_structure.sele = sele;
      ngl_current_structure.assembly = assembly;
      //const symmetryData = NGL_processSymmetry(o.symmetry)
      console.log("finished loading ",sele_elem.value);
      console.log(o.structure);
      //var sc = o.getView(new NGL.Selection(sele));
      //console.log("atomcenter",sc.atomCenter());
      //if (o.object.biomolDict.BU1) console.log(o.object.biomolDict.BU1);
      var xcenter = NGL_GetGeometricCenter(o, new NGL.Selection(sele));
      ngl_current_structure.gcenter = xcenter.center;
      ngl_current_structure.radius = xcenter.radius;
      var center = xcenter.center;
      if (assembly !== "AU") {
        center = NGL_GetBUCenter(ngl_current_structure,assembly).center;
      }
      console.log("gcenter", center, ngl_force_build_beads);
      o.setPosition([-center.x, -center.y, -center.z]); //center molecule
      //ngl_force_build_beads

      if (ngl_force_build_beads) NGL_autoBuildBeads(o, center);
      if (ngl_load_params.doaxis) {
        //o.setPosition([ 0,0,0 ]);
        align_axis = true;
        var offset = ngl_load_params.axis.offset;
        var axis = ngl_load_params.axis.axis;
        //this force the opm pcp and offset. it shouldnt
        if (setopm){//ngl_current_node.data.opm === 1) {
          offset = [center.x,center.y,center.z];
          axis = [0,0,1];
          ngl_load_params.axis.offset = offset;
          ngl_load_params.axis.axis = axis;
          NGL_updatePcpElem();
          NGL_applyPcp();
        }
        console.log("offset?", offset,axis);
        NGL_ShowAxisOffset(axis, offset, ngl_current_node);
        //ngl_load_params.doaxis=false;
      }
      o.addRepresentation("axes", {
        sele: sele,
        showAxes: true,
        showBox: true,
        radius: 0.2,
        assembly: assembly
      })
      NGL_showBox(document.getElementById('showbox'));

      if (rep_elem.selectedOptions[0].value==="cms"){
        o.addRepresentation("surface", {
          //colorScheme: color_elem.selectedOptions[0].value,
          sele: sele,
          name: "polymer",
          assembly: assembly,
          surfaceType: "edt",
          smooth: 2,
          probeRadius: 1.0,
          scaleFactor: cms_scale,
          flatShaded: false,
          opacity: 1.0,
          lowResolution: true,
        });
      }
      else {
        o.addRepresentation(rep_elem.selectedOptions[0].value, {
          //colorScheme: color_elem.selectedOptions[0].value,
          sele: sele,
          name: "polymer",
          assembly: assembly
        });
      }
      console.log("done ?");
    }).then(function() {
      var o = stage.getComponentsByName(aname).list[0];
      //console.log("finished with adding represnetation ");
      //console.log(o);
      //o.symmetryData=symmetryData;
      //console.log(symmetryData);
      NGL_UpdateassemblyList(o);
      console.log("assembly is", assembly);
      NGL_setModelOptions(o); //redundant with selection ?
      NGL_setChainSelectionOptions(o);
      //setSymmetryOptions(o);
      //assembly_elem.selectedOptions[0].value = "BU"+bu;
      if (bu !== -1) $('#ass_type').val(assembly); //assembly_elem.selectedIndex = assembly;//$('#ass_type').val(assembly);//.change();
      else $('#ass_type').val("AU"); //assembly_elem.selectedIndex = "AU";//$('#ass_type').val("AU");//.change();

      //
      var align_axis = false;
      var maxnbbeads = 0;
      var nLod = 0;
      if (ngl_load_params.beads.rad)  nLod = ngl_load_params.beads.rad.length;
      for (var i = 0; i < nLod; i++) {
         var nbeads = ngl_load_params.beads.rad[i].radii.length;
         maxnbbeads = Math.max(maxnbbeads,nbeads);
      }
      if (ngl_load_params.dobeads && force_not_dobeads && maxnbbeads < 5000) {
        NGL_LoadSpheres(ngl_load_params.beads.pos, ngl_load_params.beads.rad);
        ngl_load_params.dobeads = false;
        NGL_showBeadsLevel(beads_elem.selectedOptions[0]);//that is just a visibility toggle
        /* beads in partner if any + cylinder for links */
        NGL_showBeadsInteracting(beads_elem.selectedOptions[0].value);
      }
      if (ngl_load_params.dogeom) {
        NGL_LoadAShapeObj(null,ngl_load_params.geom);
        ngl_load_params.dogeom = false;
      }
      //label
      NGL_ShowOrigin();
      //if (label_elem.selectedOptions[0].value !=="None") {
      //do I need the following code ?

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
      console.log("should have changed title and name with ",o.structure.title,o.name);
      if (o.name.length === 4){
        pdb_id_elem.innerHTML = '<a href="https://www.rcsb.org/structure/' + o.name + '" target="_blank"> pdb : ' + o.name + '</a>';
        if (ngl_current_node.data.opm === 1)
          {
            pdb_id_elem.innerHTML = '<a href="http://opm.phar.umich.edu/protein.php?search=' + o.name + '" target="_blank"> opm : ' + o.name + '</a>';
            if (ngl_current_node.data.comments && !(ngl_current_node.data.comments.includes("opm"))) ngl_current_node.data.comments += " opm";
            updateDataGridRowElem(0, ngl_current_item_id, "comments", ngl_current_node.data.comments);
          }
      }
      //title_annotation = o.addAnnotation(p,(o.structure.title)?o.structure.title:o.name);
      //console.log(p);
      //console.log(o);
      NGL_CenterView();
      /*if (align_axis) {
        NGL_CenterView();
        var a = ngl_load_params.axis.axis;
        var ax = new NGL.Vector3(a[0], a[1], a[2]);
        ax.cross(new NGL.Vector3(0, 1, 0));
        console.log(ax);
        var q = new NGL.Quaternion();
        q.setFromAxisAngle(ax, Math.PI / 2);
        stage.animationControls.rotate(q, 0);
      } //stage.animationControls.rotate(ngl_load_params.axis.axis.getRotationQuaternion(), 0);
      else stage.animationControls.rotate(o.structure.getPrincipalAxes().getRotationQuaternion(), 0);
      */
      //update PDB components
      var ispdb = document.getElementById("pdb_component_enable")?document.getElementById("pdb_component_enable").checked : false;
      if ( ispdb)//sequence_mapping
          NGL_pdbComponentPost(aname,ngl_current_node.data.uniprot);
      else NGL_cleanpdbComponentPost();
      //done!
      if (onfinish_cb) onfinish_cb();
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

function NGL_RemoveMultiSpheresComp(name,count){
  console.log("remove "+count.toString()+" lod sphere "+name);
  for (var i=0;i<count;i++) {
    var r = stage.getComponentsByName(name+"_"+i.toString());
    if (r.list && r.list.length) {
      for (var j = 0; j < r.list.length; j++) {
        stage.removeComponent(r.list[j]);
      }
    }
  }
}

function NGL_ChangeVisibilityMultiSpheresComp(name,count,value){
  console.log("change "+count.toString()+" lod sphere "+name+" "+value.toString());
  for (var i=0;i<count;i++) {
    console.log(name+"_"+i.toString()+" "+value.toString());
    var rep = stage.getComponentsByName(name+"_"+i.toString());
    //console.log(rep);
    if (rep.list && rep.list.length !== 0) {
      for (var j = 0; j < rep.list.length; j++) {
        //rep.list[j].setVisibility(value);
        if (rep.list[j].reprList.length !== 0) {
          console.log(rep.list[j].reprList[0]);
          rep.list[j].reprList[0].setParameters({opacity:(toggle_cluster_edit.checked)?1.0:0.6});
          rep.list[j].reprList[0].setVisibility(value);
        }
      }
    }
    //console.log(rep);
  }
}

function NGL_ChangeOpacityMultiSpheresComp(name,count,value){
  console.log("change "+count.toString()+" lod sphere "+name+" "+value.toString());
  for (var i=0;i<count;i++) {
    //console.log(name+"_"+i.toString());
    var rep = stage.getComponentsByName(name+"_"+i.toString());
    //console.log(rep);
    if (rep.list && rep.list.length !== 0) {
      for (var j = 0; j < rep.list.length; j++) {
        if (rep.list[j].reprList.length !== 0) {
          //console.log(rep.list[j].reprList[0]);
          rep.list[j].reprList[0].setParameters({
            opacity: value
          });
        }
      }
    }
  }
}

function NGL_ChangeOpacityMultiSpheresComp_cb(e)
{
  var lod = parseInt(beads_elem.selectedOptions[0].value);
  var count = ngl_load_params.beads.rad[lod].radii.length
  if (e.checked) NGL_ChangeOpacityMultiSpheresComp("lod_"+lod.toString()+"_",count,1.0);
  else NGL_ChangeOpacityMultiSpheresComp("lod_"+lod.toString()+"_",count,0.6);
}

function NGL_multiSpheresComp(name,pos, radii, colors, opacity) {
  var p=0;
  if (colors.length !== radii.length ) {
    colors = radii.map(x=>ngl_current_node.data.color);
  }
  for (var i=0;i<radii.length;i++) {
    //position,color,radii,label
    var shape = new NGL.Shape(name+"_"+i.toString(), {
      disableImpostor: true,
      radialSegments: 10
    });
    shape.addSphere([pos[p],pos[p+1],pos[p+2]], colors[i], radii[i],name+"_"+i.toString());
    p+=3;
    var shapeComp = stage.addComponentFromObject(shape);
    shapeComp.addRepresentation(name+"_"+i.toString(),{opacity:opacity}); //wireframe ?
  }
}

function NGL_noPdbProxy(anode,name, radius) {
  var align_axis = false;
  ngl_load_params.dobeads = true;
  anode.data.pos = [];
  anode.data.pos.push({"coords":[0,0,0]});
  anode.data.radii =[];
  anode.data.radii.push({"radii":[radius]});
  NGL_ShowOrigin();
  //if (ngl_load_params.dogeom) {
    if (node_selected.data.geom_type && node_selected.data.geom_type !== "None" && node_selected.data.geom_type !== "sphere")
        NGL_LoadAShapeObj(null,ngl_load_params.geom);
    else {
      //build the sphere and assign it
      var comp = stage.getComponentsByName("geom_surface");
      if (comp.list) {
        for (var i = 0; i < comp.list.length; i++) {
          stage.removeComponent(comp.list[i]);
        }
      }
      var shape = new NGL.Shape("geom_surface", {
        disableImpostor: true,
        radialSegments: 10
      });
      var color = [1,0,0];
      if (("color" in node_selected.data)&&(node_selected.data.color!==null)) color = node_selected.data.color;
      else {
        color = [1,0,0];
      }
      var tcolor = new THREE.Color( color[0], color[1], color[2] );
      shape.addSphere([0, 0, 0], [1, 0, 0], radius);
      var shapeComp = stage.addComponentFromObject(shape);
      shapeComp.addRepresentation("geom_surface", {
        wireframe: true,
        diffuse: tcolor,
      }); //wireframe ?
      node_selected.data.geom_type = "sphere";
      node_selected.data.geom = "sphere";
    }
  //  ngl_load_params.dogeom = false;
  //}
  if (ngl_load_params.dobeads) {
    //fix pos and rad to new format in case
    var pr = Util_FixBeadsFormat(ngl_load_params.beads.pos,ngl_load_params.beads.rad)
    ngl_load_params.beads.pos = pr.pos;
    ngl_load_params.beads.rad = pr.radii;
    NGL_LoadSpheres(ngl_load_params.beads.pos, ngl_load_params.beads.rad);
    ngl_load_params.dobeads = false;
    NGL_showBeadsLevel(beads_elem.selectedOptions[0]);
  }
  //label
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
//opm search could augmented by memprotMD
//https://github.com/tomnewport/mpm_api/blob/master/MemProtMD%20API%20Documentation.ipynb
//also http://blanco.biomol.uci.edu/mpstruc/#id_2BRD_20_3
//can access from the PDB directly ?
function LM_getUrlStructure(anode,pdbname){
  pdbname = pdbname.toLowerCase();
  if (pdbname.length === 4) {
    if (anode.data.surface)
    {
      if (anode.data.opm === 1){
      //replace purl
          return opm_url+ pdbname +".pdb";//cellpack_repo+"opm/" + pdbname + ".mmtf";
      }
      else if (anode.data.opm === 0)
      {
          //check if exists
          var search_url = cellpack_repo+"opm/"+pdbname+ ".mmtf";
          var results = syncCall(search_url);
          if (results !=="")
          {
            purl = cellpack_repo+"opm/" + pdbname + ".mmtf";
            anode.data.opm = 1;
            return purl;
          }
          else {
            anode.data.opm = -1;
          }
          //check if exist in opm..doesnt work
          //var search_url = "http://opm.phar.umich.edu/protein.php?search="+aname//1l7v
          //var results = syncCall(search_url);
          //var parser = new DOMParser();
          //var hdoc = parser.parseFromString(results,"text/xml");
          //console.log(hdoc);
      }
    }
    return "https://files.rcsb.org/download/" + pdbname + ".cif";
    //return "https://www.ebi.ac.uk/pdbe/static/entry/" + pdbname + ".cif";
  }
  else
  {
    var ext = pdbname.slice(-4, pdbname.length);
    if (pdbname.startsWith("EMD") || pdbname.startsWith("EMDB") || pdbname.slice(-4, pdbname.length) === ".map") {
      var params = {
        defaultRepresentation: false
      };
      //this is async!
      console.log("try to load ", pdbname, ext);
      if (ext !== ".map") pdbname = pdbname + ".map";
      if (folder_elem && folder_elem.files.length != "")
      {
        return pathList_[pdbname];
      }
      else
      {
        return cellpack_repo+"other/" + pdbname;
      }
    }
    else
    {
      //what about emdb
      if (folder_elem && folder_elem.files.length != "") {
        //alert(pathList_[d.data.source]),
        return pathList_[pdbname];
      }
      else
      {
        return cellpack_repo+"other/" + pdbname;
      }
    }
  }
  return "";
}


function NGL_getUrlStructure(anode,pdbname){
  if (pdbname.length === 4) {
    if (anode.data.surface)
    {
      if (anode.data.opm === 1){
      //replace purl
          return opm_url + pdbname +".pdb"
          //return cellpack_repo+"opm/" + pdbname + ".mmtf";
      }
      else if (anode.data.opm === 0)
      {
          //check if exists
          var search_url = cellpack_repo+"opm/"+pdbname+ ".mmtf";
          var results = syncCall(search_url);
          if (results !=="")
          {
            purl = cellpack_repo+"opm/" + pdbname + ".mmtf";
            anode.data.opm = 1;
            return purl;
          }
          else {
            anode.data.opm = -1;
          }
          //check if exist in opm..doesnt work
          //var search_url = "http://opm.phar.umich.edu/protein.php?search="+aname//1l7v
          //var results = syncCall(search_url);
          //var parser = new DOMParser();
          //var hdoc = parser.parseFromString(results,"text/xml");
          //console.log(hdoc);
      }
    }
    return "rcsb://" + pdbname + ".cif";
  }
  else
  {
    var ext = pdbname.slice(-4, pdbname.length);
    if (pdbname.startsWith("EMD") || pdbname.startsWith("EMDB") || pdbname.slice(-4, pdbname.length) === ".map") {
      var params = {
        defaultRepresentation: false
      };
      //this is async!
      console.log("try to load ", pdbname, ext);
      if (ext !== ".map") pdbname = pdbname + ".map";
      if (folder_elem && folder_elem.files.length != "")
      {
        return pathList_[pdbname];
      }
      else
      {
        return cellpack_repo+"other/" + pdbname;
      }
    }
    else
    {
      //what about emdb
      if (folder_elem && folder_elem.files.length != "") {
        //alert(pathList_[d.data.source]),
        return pathList_[pdbname];
      }
      else
      {
        return cellpack_repo+"other/" + pdbname;
      }
    }
  }
  return "";
}

function NGL_LoadHeadless(purl, aname, bu, sel_str, anode){
    console.log("headless load ?",purl,aname,sel_str);
    stage.getRepresentationsByName("axes").dispose();
    if (anode.data.surface) {
      if (aname.length === 4){
        if (anode.data.opm === 1){
        //replace purl
            purl = opm_url + aname +".pdb"
            //purl = cellpack_repo+"opm/" + aname + ".mmtf";
        }
        else if (anode.data.opm === 0)
        {
            //check if exists
            var search_url = cellpack_repo+"opm/"+aname+ ".mmtf";
            var results = syncCall(search_url);
            if (results !=="")
            {
              purl = cellpack_repo+"opm/" + aname + ".mmtf";
              anode.data.opm = 1;
            }
            else {
              anode.data.opm = -1;
            }
        }
      }
    }
    var params = {
      defaultRepresentation: false,
      name: aname
    };
    var assembly = "AU";
    if (bu !== -1 && bu !== null && bu !== "") {
      if (!bu.startsWith("BU") && bu !== "AU" && bu != "UNICELL" && bu !== "SUPERCELL") bu = "BU" + bu;
      params.assembly = bu;
      assembly = bu;
    }
    var sele = "";
    if (sel_str && sel_str != "") {
      sele = NGL_GetSelection(sel_str,anode.data.source.model);
      //get NGL string selection
    }
    //selection and supercell?
    if (bu ==="SUPERCELL" || anode.data.buildtype === "supercell") {
      var pdburl = LM_getUrlStructure(anode, anode.data.source.pdb);
      var aradius = anode.data.size;
      //node_selected = anode;
      if (!(anode.data.hasOwnProperty("litemol"))) anode.data.litemol = null;
      if (anode.parent.data.geom_type === "mb"){
        if (anode.parent.data.geom.radii)
          aradius = anode.parent.data.geom.radii[0]/2.0;
        else if (anode.parent.data.radii)
          aradius = anode.parent.data.radii[0].radii[0]/2.0;
      }
      NGL_BuildSUPERCELL(anode, pdburl, aradius);//this is async ?
    }
    console.log("before stage load ?",sele, purl, params);
    stage.loadFile(purl, params).then(function(o) {
      console.log("then stage load ?",sele,assembly);
      if (!(assembly in o.structure.biomolDict)) assembly = "AU";
      if (sele === ""  && assembly !== "AU"){
        //take the chain selection from the bu
        sele = o.structure.biomolDict[assembly].getSelection().string;
      }
      o.node = anode;
      o.sele = sele;
      o.assembly = assembly;
      console.log("NGL_GetGeometricCenter",sele,assembly);
      var xcenter = NGL_GetGeometricCenter(o, new NGL.Selection(sele));
      o.gcenter = xcenter.center;
      o.radius = xcenter.radius;
      center = xcenter.center;
      if (assembly !== "AU") {
        center = NGL_GetBUCenter(o,assembly).center;
      }
      console.log("gcenter", center, ngl_force_build_beads);
      if (resize_nodes) {
        //apply radius to size
        o.node.data.size = o.radius;
        //update the table ?
        updateCellValue(gridArray[0],"size",o.node.data.id,parseFloat(o.radius));
      }
      else {
        o.setPosition([-center.x, -center.y, -center.z]);
        o.ngl_sele = new NGL.Selection(sele);
        o.addRepresentation("axes", {
        sele: sele,
        showAxes: true,
        showBox: true,
        radius: 0.2,
        assembly: assembly
        })
      }
      //build a surface and extract the mesh ?
      //build the kmeans
      //var ats = o.structure.atomStore;
      //var nAtom = ats.count;
      if (force_do_beads)
      {
        console.log("before kmeans ?");
        var _cluster_coords = buildWithKmeans(o, center, parseInt(slidercluster_elem.value));
        console.log("after kmeans ?",_cluster_coords);
        var _pos = {
          "coords": _cluster_coords.pos
        };
        var _rad = {
          "radii": _cluster_coords.rad
        };
        var lod = parseInt(beads_elem.selectedOptions[0].value);
        anode.data.pos[lod] = JSON.parse(JSON.stringify(_pos));
        anode.data.radii[lod] = JSON.parse(JSON.stringify(_rad));
      }
      //console.log("kmeans done with 10 cluster ",anode.data.pos);
      //build the CMS Representation
      if (force_do_cms) var rep = o.addRepresentation("surface", {
          //colorScheme: color_elem.selectedOptions[0].value,
          sele: sele,
          name: "cms_surface_"+aname,
          assembly: assembly,
          surfaceType: "edt",
          smooth: 2,
          probeRadius: 1.0,
          scaleFactor: cms_scale,
          flatShaded: false,
          opacity: 1.0,
          useWorker: false,
          lowResolution: true,
        });

    }).then(function(){
        console.log(aname);
        var o = stage.getComponentsByName(aname).list[0];
        console.log(o);
        if (force_do_cms) NGL_setCMSBufferGeomTimer(o);//wait ?
        //stage.removeComponent(o);
        //do next
        if (query_illustrate) NGL_Illustrate();//illustrate
        document.getElementById("stopbeads_lbl").innerHTML = "building " + current_compute_index + " / " + graph.nodes.length;
        if (NextComputeIgredient() && (!(stop_current_compute))) {
          //update label_elem
          NGL_buildLoopAsync();
        } else {
          document.getElementById("stopbeads_lbl").innerHTML = "finished " + current_compute_index + " / " + graph.nodes.length;
          stopBeads();
        }
    });
}

function NGL_buildLoopAsync() {
  var d = current_compute_node; //or node_selected.data.bu
  console.log("d is ", d);
  var pdb = d.data.source.pdb; //document.getElementById("pdb_str");
  var bu = (d.data.source.bu) ? d.data.source.bu : ""; //document.getElementById("bu_str");
  //selection need to be pmv string
  if (bu === -1) bu = "";
  var sele = (d.data.source.selection) ? d.data.source.selection : ""; //document.getElementById("sel_str");
  //sele = sele.replace(":", "");
  //selection is in NGL format. Need to go in pmv format
  //every :C is a chainNameScheme
  var model = (d.data.source.model) ? d.data.source.model : "";
  if (model.startsWith("S") || model.startsWith("a")) model = "";
  //if (sele.startsWith("/")) sele = "";
  //depending on the pdb we will have a file or not
  var thefile = null;
  if (pdb && d.data.source.pdb.length !== 4) {
    //pdb = "";
    if (folder_elem && folder_elem.files.length != "") {
      thefile = pathList_[d.data.source.pdb];
    } else {
      pdb = d.data.source.pdb;
      //its a blob we want ?
    }
  }
  if (!pdb || pdb === "") {
    if (NextComputeIgredient() && (!(stop_current_compute))) {
      //update label_elem
      NGL_buildLoopAsync();
    } else {
      document.getElementById("stopbeads_lbl").innerHTML = "finished " + current_compute_index + " / " + graph.nodes.length;
      stopBeads();
      if (query_illustrate) query_illustrate = false;
    }
    return;
  }
  var docms = false;
  var dobeads = false;
  var d = current_compute_node;
  if (!d.children && "data" in d &&
    (!d.data.geom || d.data.geom === "None" ||
      d.data.geom === "null" || d.data.geom === "")) {
    //formData.append("cms", true);
     if (force_do_cms) docms = true;
  }
  var lod = parseInt(beads_elem.selectedOptions[0].value);
  if (!d.children && "data" in d &&
    (!d.data.pos || d.data.pos === "None" ||
      d.data.pos === "null" || d.data.pos.length <= lod ||
      d.data.pos === "")) {
      if (force_do_beads) dobeads = true;
  }
  if ( dobeads || docms || query_illustrate || resize_nodes)
  {
    var purl = NGL_getUrlStructure(d,pdb);
    console.log("query with ", [pdb, bu, sele, model, thefile], purl);
    NGL_LoadHeadless(purl, pdb, bu, sele, d);
  }
  else {
    if (NextComputeIgredient() && (!(stop_current_compute))) {
      //update label_elem
      NGL_buildLoopAsync();
    } else {
      document.getElementById("stopbeads_lbl").innerHTML = "finished " + current_compute_index + " / " + graph.nodes.length;
      stopBeads();
      if (query_illustrate) query_illustrate = false;
    }
  }
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

function NGL_UpdateWithNode(d, force = false) {
  //what is the id//
  //this is called from the canvas
  ngl_interaction_view = false;
  console.log("update with ", d);
  SetObjectsOptionsDiv(d);

  if (ngl_grid_mode) {
    NGL_ClearGridMode();
  }

  ngl_current_node = d;
  document.getElementById('ProteinId').innerHTML = d.data.name;

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
    if ((ngl_current_item_id !== d.data.id)||(force)) {
      if (!d.data.source.pdb || d.data.source.pdb === "None") {
        //build a sphere of size radius
        NGL_noPdbProxy(d,d.data.name, d.data.size);
        return;
      }
      stage.removeAllComponents();
      NGL_Load(d.data.source.pdb, d.data.source.bu, d.data.source.selection);
    }else {
      var isseq = document.getElementById("sequence_mapping")?document.getElementById("sequence_mapping").checked : false;
      if ( isseq)
          NGL_pdbComponentPost(d.data.source.pdb,d.data.uniprot);
      else NGL_cleanpdbComponentPost();
    }
    ngl_current_item_id = d.data.id;
  }
    /*var bu = -1;
    var sel_str = ""
    if ("bu" in d.data.source) {
      bu = d.data.source.bu;
    }
    if ("selection" in d.data.source) {
      sel_str = d.data.source.selection;
    }

    if (d.data.source.pdb.length === 4){
      //is it a surface protein ? then get the opm
      NGL_LoadOneProtein("rcsb://" + d.data.source.pdb + ".mmtf", d.data.source.pdb, bu, sel_str);
    }
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
  }*/
}


function NGL_UpdateWithNodePair(d) {
  ngl_interaction_view = true;
  stage.removeAllComponents();
  document.getElementById('ProteinId').innerHTML = d.source.data.name + " interact with " + d.target.data.name;
  var asele = ""
  var pdb;
  console.log(d);
  ngl_current_node = d.source;
  var target_beads = [{"coords":[],"radii":[]},{"coords":[],"radii":[]},{"coords":[],"radii":[]}];
  var offset = [0,0,0];
  var pcp = [1,0,0];
  if ("offset" in ngl_current_node.data) {
    ngl_load_params.axis = {
      "axis": ngl_current_node.data.pcpalAxis,
      "offset": ngl_current_node.data.offset
    }
    ngl_load_params.doaxis = true;
    offset = ngl_current_node.data.offset;
    pcp = ngl_current_node.data.pcpalAxis;
    //NGL_ShowAxisOffset( d.data.pcpalAxis,d.data.offset );
    console.log("caxis", ngl_load_params.axis);
  }    
  ngl_load_params.dobeads = false;
  console.log("dobeads", ngl_load_params.dobeads);
  var p = JSON.parse(JSON.stringify(ngl_current_node.data.pos));
  var r = JSON.parse(JSON.stringify(ngl_current_node.data.radii));
  var c = []//rad[lod].radii.map(x=>ngl_current_node.data.colors);
  for (var i=0;i<ngl_current_node.data.radii.length;i++){
    c.push({"colors":[]});
    for (var j=0;j<ngl_current_node.data.radii[i].radii.length;j++){
      if (d.beads1.indexOf(j)!==-1) {c[i].colors.push([1,1,0]);}
      else {c[i].colors.push([1,0,0]);}
    }
  }
  //ngl_current_node.data.radii.forEach(r=>{
  //  var ac = r.radii.map(x=>ngl_current_node.data.color);
  //  c.push({"colors":ac});
  //})
  console.log("target_beads",ngl_current_node.data.radii.length);
  //use color and line for interaction ?
  //line_selected.beads1
  //line_selected.beads2
  /*for (var i=0;i<ngl_current_node.data.radii.length;i++){
    for (var j=0;j<d.target.data.radii[i].radii.length;j++){
      target_beads[i].coords.push(d.target.data.pos[i].coords[j*3]+offset[0]);//p[i]
      target_beads[i].coords.push(d.target.data.pos[i].coords[j*3+1]+offset[1]);
      target_beads[i].coords.push(d.target.data.pos[i].coords[j*3+2]+offset[2]);
      target_beads[i].radii.push(d.target.data.radii[i].radii[j]);
    }
  }*/
  console.log("target_beads", r);
  //if one or the other is a fiber repeat along the pcp using the level ?
  //fibers use control points, would need sub_beads id
  if (d.source.data.ingtype == "fiber" ){

  }
  if (d.target.data.ingtype == "fiber" ){
    //if selection 2 exist
    /*if (d.sel2){
      //duplicate along
      var radius = 0;
      for (var i=0;i<ngl_current_node.data.radii.length;i++){
        for (var j=0;j<d.target.data.radii[i].radii.length;j++){
          var p = new NGL.Vector3(target_beads[i].coords[j*3],target_beads[i].coords[j*3+1],target_beads[i].coords[j*3+2]);
          var r = target_beads[i].radii[j];
          radius = max(radius, p.length()+r);
        }
      }
      var dataset = [];
      o.structure.eachAtom(function(ap) {
        if (ap.atomname ==="CA" || ap.atomname==="C3'" || ap.atomname==="C4'" || ap.atomname==="C4*" || nAtom < 20000) {//problem with DNA no CA why || nAtom < 20000 ?
          dataset.push([ap.x, ap.y, ap.z]);
          //console.log(ap.modelIndex,ap.index);
        }
      }, new NGL.Selection(asele));

    }
    else {*/
      var o = [-1,0,1,2];
      for (var i=0;i<d.target.data.radii.length;i++){
        //add -1,1,2
        var rad = d.target.data.radii[i].radii[0]*2.0;
        o.forEach(v=>{
          p[i].coords.push(offset[0]+pcp[0]*rad*v);
          p[i].coords.push(offset[1]+pcp[1]*rad*v);
          p[i].coords.push(offset[2]+pcp[2]*rad*v);
          r[i].radii.push(rad/2.0); 
          if (d.beads2.indexOf(v)!==-1) {c[i].colors.push([1,1,0.2]);}
          else {c[i].colors.push([0,0,1]);}    
          //c[i].colors.push(d.target.data.color); 
        })      
      }
      console.log("target_beads2", r);
    //}    
  }
  console.log("d.target.data.ingtype", d.target.data.ingtype);
  //if fiber build line of beads.
  ngl_load_params.beads = {
    "pos": p,
    "rad": r,
    "colors" : c,
  };
  console.log("ngl_load_params.beads",ngl_load_params.beads);
  //add the target beads
  ngl_load_params.dobeads_pairs = false;

  if (d.sel1) asele += d.sel1;
  else {
    d.sel1 = d.source.data.source.selection;
    asele += d.source.data.source.selection;
  }
  if (d.sel2) asele += d.sel2;
  else {
    d.sel2 = d.target.data.source.selection;
    asele += d.target.data.source.selection;
  }
  console.log("check PDB for d ");
  console.log((!d.pdb1 || d.pdb1 === ""));
  var nLod = r.length;
  for (var i = 0; i < nLod; i++) {
    var lod = i;
    NGL_multiSpheresComp("lod_"+lod.toString()+"_", ngl_load_params.beads.pos[lod].coords,
                                   ngl_load_params.beads.rad[lod].radii, 
                                   ngl_load_params.beads.colors[lod].colors, 
                                   (toggle_cluster_edit.checked)?1.0:0.5)
  }
  //NGL_showBeadsLevel(beads_elem.selectedOptions[0]);
  NGL_showBeadsLevel_cb(beads_elem.selectedOptions[0].value);
  //then load proteins  
  if (!d.pdb1 || d.pdb1 === "") {
    //use the pdb of the ingredient ?
    console.log("no PDB for d use source");
    pdb = d.source.data.source.pdb;
    if (!pdb || pdb === "") 
    {
      console.log("no PDB for d "+pdb);
      return;
    }
    ngl_current_node = d.source;
    d.pdb1 = pdb;
    ngl_load_params.dobeads = false;
    NGL_Load(pdb, d.source.data.source.bu, d.sel1); //transform ?
    //ngl_current_structure.setPosition([ -200,0,0 ])
    var pdb2 = d.target.data.source.pdb;
    ngl_current_node = d.source;
    ngl_load_params.dobeads_pairs = false;
    //second one should be load and offset on pcp. Problem with multiple binder
    //var purl = "";
    //if (pdb2.length === 4) {purl = "rcsb://" + pdb2 + ".mmtf";}
    //else if ( pdb2 in pathList_ ) {purl = pathList_[pdb2];}
    //else {purl = cellpack_repo+"other/" + pdb2;}
    //NGL_Load(pdb2, "AU", ""); //transform ?
    //var axis = d.source.data.pcpalAxis;
    //ngl_current_structure.setPosition(d.source.data.offset);
    //var q = new NGL.Quaternion();
    //q.setFromUnitVectors(new NGL.Vector3(0, 0, 1), new NGL.Vector3(axis[0], axis[1], axis[2]));
    //ngl_current_structure.setRotation(q);

    
  } else {
    repToChange = rep_elem.selectedOptions[0].value;
    selToChange = asele;
    buToChange = d.source.data.source.bu;
    NGL_Load(d.pdb1, d.source.data.source.bu, NGL_GetSelection(d.sel1, ""),onfinish_cb=(d.sel2)?NGL_ChangeRepresentation_cb:null);//this async
    //load and wait function ?
    //update the selection with dsel2
    //NGL_ChangeRepresentation_cb(rep_elem.selectedOptions[0].value, asele, d.source.data.source.bu);
  }
  
}

function NGL_ClearGridMode(){
  NGL_Clear();
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

function NGL_Load(pdbname, bu, sel_str, onfinish_cb = null) {
  //MS_Select(query)
  MS_Select(pdbname);
  if (ngl_grid_mode) {
    NGL_ClearGridMode();
  }

  if (pdbname.length === 4) {
    NGL_LoadOneProtein("rcsb://" + pdbname + ".cif", pdbname, bu, sel_str, onfinish_cb = onfinish_cb);
  }
  else {
    var ext = pdbname.slice(-4, pdbname.length);
    if (pdbname.startsWith("EMD") || pdbname.startsWith("EMDB") || pdbname.slice(-4, pdbname.length) === ".map") {
      var params = {
        defaultRepresentation: true
      };
      //this is async!
      console.log("try to load ", pdbname, ext);
      if (ext !== ".map") pdbname = pdbname + ".map";
      if (folder_elem && folder_elem.files.length != "" && pdbname in pathList_ ) {
        console.log("try to load ", folder_elem.files.length);
        //ftp://ftp.ebi.ac.uk/pub/databases/emdb/structures/EMD-5239/map/emd_5239.map.gz
        stage.loadFile(pathList_[pdbname], params).then(function(o) {
          ngl_current_structure = o;});
      } else {
        var purl = cellpack_repo+"other/" + pdbname;
        stage.loadFile(purl, params).then(function(o) {
          ngl_current_structure = o;});
      }
      if (pdbname.startsWith("EMD-"))
      {
        pdb_id_elem.innerHTML = '<a href="https://www.ebi.ac.uk/pdbe/entry/emdb/' + pdbname.split(".")[0] + '" target="_blank">' + pdbname + '</a>';
      }
    }
    else {
      //what about emdb
      if ( pdbname in pathList_ ) {
        //alert(pathList_[d.data.source]),
        NGL_LoadOneProtein(pathList_[pdbname], pdbname, bu, sel_str);
      }
      else {
        var purl = cellpack_repo+"other/" + pdbname;
        console.log("load purl ",purl);
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
