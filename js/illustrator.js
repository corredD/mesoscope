var i=0;
var _id = -1;//current id on server
var PDBID = "";//current PDB on server
var img_source = "";//current url on server
var structure=null;
var structure_txt=null;
var structure_file=null;
var custom_structure = false;
var inp_file=null;
var inp_txt=null;
var inp_txt_holder = document.getElementById("inp_txt");
var use_loaded_inp_txt = document.getElementById("use_loaded_inp_txt");
var loaded_pdb = false;
//get the different elements
var options_elem = document.getElementById("options");
var linkimg = document.getElementById("linkimg");
var current_query = document.getElementById("current_query");
var pdbinput = document.getElementById("pdbinput");
var nameinput= document.getElementById("nameinput");
var ao = document.getElementById("ao");
var advanced = document.getElementById("advanced");
var ao_params1 = document.getElementById("ao_params1");
var ao_params2 = document.getElementById("ao_params2");
var ao_params3 = document.getElementById("ao_params3");
var ao_params4 = document.getElementById("ao_params4");
var viewport = document.getElementById("viewport");
var ill_style= document.getElementById("ill_style");
var scale = document.getElementById("scale");
var current_selection=""
var current_model=0
var currentBU="AU"
var project_name="";
var pdbId="";

inp_txt_holder.addEventListener("input", function() {
    console.log("input event fired");
    //update the ino-text
    inp_txt = inp_txt_holder.innerHTML;
}, false);

function Util_forceSelect(e) {
	e.value = '';
}

/****DOM function******/
function addElement (el,parent=null) {
  Object.assign(el.style, {
    position: "absolute",
    zIndex: 10
  })
  if (parent == null) stage.viewer.container.appendChild(el)
  else if (parent == "none") {}
  else {
    parent.appendChild(el)
    }
  return el;
  }


function createElement (name, properties, style) {
  var el = document.createElement(name)
  Object.assign(el, properties)
  Object.assign(el.style, style)
  return el
}

function createSelect (options, properties, style) {
  var select = createElement("select", properties, style)
  options.forEach(function (d) {
    select.add(createElement("option", {
      value: d[ 0 ], text: d[ 1 ]
    }))
  })
  return select
}

function createFileButton (label, properties, style) {
  var input = createElement("input", Object.assign({
    type: "file"
  }, properties), { display: "none" })
  addElement(input)
  var button = createElement("input", {
    value: label,
    type: "button",
    onclick: function () { input.click() }
  }, style)
  return button
}

var topPosition = 12

function getTopPosition (increment) {
  if (increment) topPosition += increment
  return topPosition + "px"
}

function createOneElemNumber(id,value,parent,label=""){
  var elem = document.createElement("input");
  elem.type = "number";
  elem.step = 0.1; // set the CSS class
  elem.value = atomic_outlines_params[i];
  elem.id=id;
  parent.appendChild(elem);
  if (label!=""){
    var t = document.createTextNode(" "+label);
    parent.appendChild(t);
    var br = document.createElement("br");
    parent.appendChild(br);
  }
  return elem;
}


var params1_labels = ["l_low thresholds for gray to black",
                      "l_high thresholds for gray to black",
                      "kernel for derivative calculation (1,2,3,4 smoothest=4)",
                      "l_diff_max start range of z-difference used for derivative (Angstroms)",
                      "l_diff_max end range of z-difference used for derivative (Angstroms)"]

var atomic_outlines_paramsDiv = document.createElement("div");
atomic_outlines_paramsDiv.id = "atomic_outlines_params";
atomic_outlines_paramsDiv.style="display:none";
options_elem.appendChild(atomic_outlines_paramsDiv);
var atomic_outlines_params=[3.0,10.0,4,0.0,5.0]
var atomic_outlines_params_elem=[]
for (var i=0;i<atomic_outlines_params.length;i++){
  var elem = createOneElemNumber("atomic_outlines_params"+(i+1),
              atomic_outlines_params[i],atomic_outlines_paramsDiv,
              params1_labels[i]);
  atomic_outlines_params_elem.push(elem);
}

var params2_labels = ["l_low thresholds for gray to black (typically ~ 3.0-20.0)",
                      "l_high thresholds for gray to black (typically ~ 3.0-20.0)"]
subunit_outlines_paramsDiv = document.createElement("div");
subunit_outlines_paramsDiv.id = "subunit_outlines_params";
subunit_outlines_paramsDiv.style="display:none";
options_elem.appendChild(subunit_outlines_paramsDiv);
var subunit_outlines_params=[3.,10.]
var subunit_outlines_params_elem=[];
for (var i=0;i<subunit_outlines_params.length;i++){
  var elem = createOneElemNumber("subunit_outlines_params"+(i+1),
              subunit_outlines_params[i],subunit_outlines_paramsDiv,
            params2_labels[i]);
  subunit_outlines_params_elem.push(elem)
}

var params3_labels = ["l_low thresholds for gray to black (typically ~ 3.0-20.0)",
                      "l_high thresholds for gray to black (typically ~ 3.0-20.0",
                      "difference in residue numbers to draw outlines"];
chain_outlines_paramsDiv = document.createElement("div");
chain_outlines_paramsDiv.id = "chain_outlines_params";
chain_outlines_paramsDiv.style="display:none";
options_elem.appendChild(chain_outlines_paramsDiv);
var chain_outlines_params=[3.,8.,6.];
var chain_outlines_params_elem=[];
for (var i=0;i<chain_outlines_params.length;i++){
  var elem = createOneElemNumber("chain_outlines_params"+(i+1),
              chain_outlines_params[i],chain_outlines_paramsDiv,
              params3_labels[i]);
  chain_outlines_params_elem.push(elem)
}

var an_img = new Image();

// When it is loaded...
an_img.addEventListener("load", function() {
    // Set the on-screen image to the same source. This should be instant because
    // it is already loaded.
    document.getElementById("result").src = an_img.src;
    // Schedule loading the next frame.
    setTimeout(function() {
        an_img.src = img_source;
    }, 1000/15); // 15 FPS (more or less)
})

// Start the loading process.
an_img.src = img_source;
var img = document.getElementById("result");


var ligandSele = "( not polymer or not ( protein or nucleic ) ) and not ( water or ACE or NH2 )"


// Create NGL Stage object
var stage = new NGL.Stage( "viewport" );
stage.setParameters({cameraType: "orthographic"})

// Handle window resizing
window.addEventListener( "resize", function( event ){
    stage.handleResize();
}, false );

stage.setParameters({
  backgroundColor: "white"
})



function loadStructure(e){
  loaded_pdb = true;
  structure_file = e.target.files[ 0 ];
  viewport.style.display = "block";
  stage.removeAllComponents();
  PDBID = structure_file.name.split(".")[0];//no extension
  nameinput.value = PDBID;
  stage.loadFile(structure_file).then(function (o) {
      o.addRepresentation("spacefill", {
        sele: "polymer",
        name: "polymer",
        //assembly: "AU"
      });
      structure = o;
      o.autoView()
  });
  current_query.innerHTML="<h4>Current PDBid :"+PDBID+"</h4>";
}

function changeName(e){

}

function changePDB(e){
  loaded_pdb = false;
  viewport.style.display = "block";
  stage.removeAllComponents();
  PDBID = e.value;
  nameinput.value = PDBID;
  stage.loadFile('rcsb://'+PDBID).then(function (o) {
      o.addRepresentation("spacefill", {
        sele: "polymer",
        name: "polymer",
        //assembly: "AU"
      });
      structure = o;
      o.autoView()
  });
  current_query.innerHTML="<h4>Current PDBid :"+PDBID+"</h4>";
}

function changeBU_cb(bu){}
function changeModel_cb(model){}
function changeSelection_cb(selection){}

function changeBU(e){}
function changeModel(e){}
function changeSelection(e){}

function showOptions(e){
    var display = (e.checked)? "block" : "none";
    //document.getElementById("shadow_options").style.display = display;
    document.getElementById("ao_options").style.display = display;
    atomic_outlines_paramsDiv.style.display = display;
    subunit_outlines_paramsDiv.style.display = display;
    chain_outlines_paramsDiv.style.display = display;
}

function updateImage()
{
    var image = document.getElementById("result");
    if(image.complete) {
        var new_image = new Image();
        //set up the new image
        new_image.id = "result";
        new_image.src = image.src;
        // insert new image and remove old
        image.parentNode.insertBefore(new_image,image);
        image.parentNode.removeChild(image);
    }
    setTimeout(updateImage, 1000);
}

function resetToDefault(){
  ao.checked = true;
  ao_params1.value = 0.0023;
  ao_params2.value = 2.0;
  ao_params3.value = 1.0;
  ao_params4.value = 0.7;
  scale.value = 12;
  for (var i=0;i<atomic_outlines_params.length;i++){
    atomic_outlines_params_elem[i].value = atomic_outlines_params[i];
  }
  for (var i=0;i<subunit_outlines_params.length;i++){
    subunit_outlines_params_elem[i].value = subunit_outlines_params[i];
  }
  for (var i=0;i<chain_outlines_params.length;i++){
    chain_outlines_params_elem[i].value = chain_outlines_params[i];
  }
}

function loadInp(e){
  inp_file= e.target.files[ 0 ];
  //update the txt dom content
  var reader = new FileReader();
  // Closure to capture the file information.
  reader.onload = (function(theFile) {
        return function(e) {
           inp_txt = e.target.result;
           inp_txt_holder.innerHTML = "<pre>"+inp_txt+"</pre>";
           use_loaded_inp_txt.checked = true;
        };
      })(inp_file);
      // Read in the image file as a data URL.
  reader.readAsText(inp_file);
}

function getText(url){
    // read text from URL location
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.send(null);
    request.onreadystatechange = function () {
        if (request.readyState === 4 && request.status === 200) {
            var type = request.getResponseHeader('Content-Type');
            if (type.indexOf("text") !== 1) {
                return request.responseText;
            }
        }
    }
}

function readWildCard(filename){
    var url="https://mesoscope.scripps.edu/beta/data/"+filename;
    var outer_text = getText(url);
    return outer_text;
}

function prepareWildCard(style){
    //ignore hydrogen
    var astr=""
    if (style == 1)
    {
        astr+="HETATM-----HOH-- 0,9999,.5,.5,.5,1.6\n\
ATOM  -H-------- 0,9999,.5,.5,.5,1.6\n\
ATOM  H--------- 0,9999,.5,.5,.5,1.6\n\
";
        astr+="ATOM  -C-------- 5,9999,.9,.0,.0,1.6\n";
        astr+="END\n"
    }
    else if (style == 2)
    {
        //#open wildcard1
        astr+=readWildCard("wildcard1.inp");
    }
    else if (style==3)
    {         //open wildcard1
        astr+=readWildCard("wildcard2.inp");
    }
    return astr
}

function prepareInput(){
    var q = stage.animationControls.controls.rotation;
    var rotation = new NGL.Euler().setFromQuaternion( q);
    var position = new NGL.Vector3(0,0,0);
    var scontour_params1 = JSON.stringify(atomic_outlines_params_elem.map(i=>i.value));
    var scontour_params2 = JSON.stringify(subunit_outlines_params_elem.map(i=>i.value));
    var scontour_params3 = JSON.stringify(chain_outlines_params_elem.map(i=>i.value));
    //formData.append("shadow", shadow.checked);
    //formData.append("shadow_params",  JSON.stringify(new NGL.Vector2(shadow_params1.value,shadow_params2.value)));
    var sao = ao.checked;
    var sao_params = JSON.stringify(new NGL.Quaternion(ao_params1.value,ao_params2.value,ao_params3.value,ao_params4.value));
    var astyle = ill_style.value;
    params_ao = [0.0023,2.0,1.0,0.7]
    var astr="read\n"
    astr+=nameinput.value+".pdb\n"
    astr+=prepareWildCard(astyle);
    astr+="center\n"
    astr+="auto\n"
    astr+="trans\n"
    astr+=position.x.toString()+","+position.y.toString()+","+position.z.toString()+"\n"
    astr+="scale\n"
    astr+=scale.value+"\n"
    astr+="zrot\n"
    astr+="90.0\n"
    astr+="yrot\n"
    astr+="-180.0\n"
    astr+="xrot\n"
    astr+=rotation.x.toString()+"\n"
    astr+="yrot\n"
    astr+=rotation.y.toString()+"\n"
    astr+="zrot\n"
    astr+=rotation.z.toString()+"\n"
    astr+="wor\n"
    astr+="0.99607843137,0.99607843137,0.99607843137,1.,1.,1.,1.,1.\n"
    astr+=((sao)?"1":"0")+","+ ao_params1.value+","+ ao_params2.value+","+ ao_params3.value+","+ ao_params4.value+"\n"
    astr+="-30,-30                                                      # image size in pixels, negative numbers pad the molecule by that amount\n"
    astr+="illustrate\n"
    astr+=atomic_outlines_params_elem.map(i=>i.value).join()+"  # parameters for outlines, atomic\n"
    astr+=subunit_outlines_params_elem.map(i=>i.value).join()+"  # subunits\n"
    astr+=chain_outlines_params_elem.map(i=>i.value).join()+"  # outlines defining regions of the chain\n"
    astr+="calculate\n"
    astr+=nameinput.value+".pnm\n"
    return astr;
}

function BuildInput(){
  //given the option prepare the txt for input
  //depends on the style
  inp_txt="<pre>"
  inp_txt+=prepareInput();
  inp_txt+="</pre>\n"
}

function previewInput(){
  BuildInput();
  inp_txt_holder.innerHTML = inp_txt;
}

function clearInpTxt(){
  inp_txt_holder.innerHTML = "";
  use_loaded_inp_txt.checked = false;
}

function BuildInputPDB(){
  //if selection otherwise pass the BU/AU tothe server that will wget
  //does this take in account selection and assambly?
  //how to use the bu.selection et etcx..test?
  var pdbWriter = new NGL.PdbWriter(structure);
  structure_txt = pdbWriter.getData();
}

function onClick(){
    nameinput.value = nameinput.value.slice(0, 19)
    img.style.display = "none";
    document.getElementById("loader").style.display = "block";
    clearTimeout();
    var q = stage.animationControls.controls.rotation;
    var rotation = new NGL.Euler().setFromQuaternion( q);
    var formData = new FormData();
    //if (use_loaded_inp_txt.checked){
    formData.append("key", "query");//array of x,y,z
    if (use_loaded_inp_txt.checked) formData.append("input_txt", inp_txt.replace("<pre>","").replace("</pre>",""));
    else {
      var input = prepareInput();
      console.log(input);
      formData.append("input_txt", input);
    }
    if (loaded_pdb) {
      formData.append("PDBfile",structure_file);
    }
    else if (custom_structure) {
      BuildInputPDB();
      formData.append("PDBtxt",structure_txt);
    }
    else {
      formData.append("PDBID", PDBID);
    }
    formData.append("_id", _id);
    formData.append("name",nameinput.value);
    //}
    /*else {
      formData.append("key", "processpreview");//array of x,y,z
      formData.append("PDBID", PDBID);
      formData.append("position", JSON.stringify(new NGL.Vector3(0,0,0)));
      formData.append("rotation", JSON.stringify(rotation));
      formData.append("scale", parseFloat(scale.value));
      formData.append("_id", _id);
      formData.append("contour_params1",JSON.stringify(atomic_outlines_params_elem.map(i=>i.value)));
      formData.append("contour_params2",JSON.stringify(subunit_outlines_params_elem.map(i=>i.value)));
      formData.append("contour_params3",JSON.stringify(chain_outlines_params_elem.map(i=>i.value)));
      //formData.append("shadow", shadow.checked);
      //formData.append("shadow_params",  JSON.stringify(new NGL.Vector2(shadow_params1.value,shadow_params2.value)));
      formData.append("ao", ao.checked);
      formData.append("ao_params",  JSON.stringify(new NGL.Quaternion(ao_params1.value,ao_params2.value,ao_params3.value,ao_params4.value)));
      formData.append("style", ill_style.value);
    }*/
    console.log("submit to server");
    console.log(formData);
    //show progress bar
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://mesoscope.scripps.edu/beta/cgi-bin/illustrator.py');
    xhr.onload = function () {
      // do something to response
      console.log(this.responseText);
      var data = JSON.parse(this.responseText)
      an_img.src = data.image+"?"+i;
      _id = parseInt(data.id);
      //hide progress bar
      document.getElementById("loader").style.display = "none";
      img.style.display = "block";
      linkimg.href = data.image;
      current_query.innerHTML="<h4>Current PDB and working Id :"+PDBID+" <a href='https://mesoscope.scripps.edu/data/tmp/ILL/"+_id+"'> "+_id+"</a></h4>";
      i=i+1;
    };
    xhr.send(formData);
}
