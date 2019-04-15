var i=0;
var _id = -1;//current id on server
var PDBID = "";//current PDB on server
var img_source = "";//current url on server
//get the different elements
var options_elem = document.getElementById("options");
var linkimg = document.getElementById("linkimg");
var current_query = document.getElementById("current_query");
var pdbinput = document.getElementById("pdbinput");
var ao = document.getElementById("ao");
var advanced = document.getElementById("advanced");
var ao_params1 = document.getElementById("ao_params1");
var ao_params2 = document.getElementById("ao_params2");
var ao_params3 = document.getElementById("ao_params3");
var ao_params4 = document.getElementById("ao_params4");
var viewport = document.getElementById("viewport");
var ill_style= document.getElementById("ill_style");

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
var scale = document.getElementById("scale");
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


function changePDB(e){
  viewport.style.display = "block";
  stage.removeAllComponents();
  PDBID = e.value;
  stage.loadFile('rcsb://'+PDBID).then(function (o) {
      o.addRepresentation("spacefill", {
        sele: "polymer",
        name: "polymer",
        //assembly: "AU"
      });
      stage.autoView(100);
  });
  current_query.innerHTML="<h4>Current PDBid :"+PDBID+"</h4>";
}

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

function onClick(){
    img.style.display = "none";
    document.getElementById("loader").style.display = "block";
    clearTimeout();
    var q = stage.animationControls.controls.rotation;
    var rotation = new NGL.Euler().setFromQuaternion( q);
    var formData = new FormData();
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
