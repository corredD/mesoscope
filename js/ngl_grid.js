//stage should be already on ?


//var stage, viewport, heading;
//var width = 150;
//this should adap to the number of pdb loaded by the list
var gheight = 200;
var gwidth = 200;
var done = false;
var hiddenImg, activeName;
var nlgg_current;
var NGLg_current_list;
//document.addEventListener( "DOMContentLoaded", function(){



function NGLg_loadList( pdbList ){
		//pdblist is {pdname, id}
	  //grid_viewport = viewport;
	  //if (!grid_viewport || grid_viewport===null)
	  // 		document.getElementById("viewport");
		NGLg_current_list = pdbList;
		var alist = []
		Object.keys(pdbList).forEach(function(key) {
    		alist.push(key);
		});
	  ngl_grid_mode = true;
	  //change the style of the viewport
	  //"width:100%; height:95%;"
	  //check size of parent
	  var r = pcontainer.getBoundingClientRect();
	  console.log(r);
	  var n = Math.max(2,alist.length);
	  gwidth = 150;// r.width/(n/2);
	  gheight = 150;//r.height/(n/2);
	  console.log(gwidth,gheight,r.width,r.height);
	  grid_viewport.setAttribute("style","width: "+gwidth+"px; height:"+gheight+"px; display:inline-block");
	  stage.handleResize();
    var i = 0;
    alist.reduce( function( acc, value ){
        return acc.then( function(){
            i += 1;
						var name = value;
						var nsi = NGLg_current_list[name];
						nlgg_current = nsi;
            //heading.innerText = "Grid loading entry " + i +" "+name+" of " + pdbList.length + " entries";
            if (name === "None") return;
						var nameurl = "";
						if ( nsi !== -1 )
								nameurl = NGL_getUrlStructure(graph.nodes[nsi],name);
            else
								nameurl = NGL_GetPDBURL(name);
						console.log("found "+nameurl);
						var params = {
							defaultRepresentation: true,
							name: name
						};
            return stage.loadFile( nameurl, params )
                .then( NGLg_addDiv )
                .then( NGLg_prepareImage )
                .then( NGLg_makeImage )
                .then( NGLg_appendImage );
        } );
    }, Promise.resolve() ).then( function(){
        done = true;
        heading.innerText = "Grid showing " + pdbList.length + " entries";
        //grid_viewport.style.display = "inline-block";
        stage.mouseObserver.handleScroll = false;
    } );
}

function NGLg_addDiv( o ){
    var div = document.createElement( "div" );
    //div.style.display = "flex";
    div.setAttribute("class", "nglgrid" );
    div.appendChild( grid_viewport );
		//var label = document.createElement('label');
    //label.innerHTML = graph.nodes[NGLg_current_list[o.name]].data.name +" "+o.name;
		//div.appendChild( label );
		activeName = o.name;
		//o.nodeid = nlgg_current;
		console.log("loaded ",o.name," with id ",NGLg_current_list[o.name]);
    //document.body.appendChild( div );
    pcontainer.appendChild( div );
    return {
        div: div,
        comp: o
    };
}


//use selection if node available
function NGLg_prepareImage( data ){
    var o = data.comp;
		console.log("node id ?",NGLg_current_list[o.name]);
		//use graph.nodes[nlgg_current]
    stage.eachRepresentation( function( r ){
        r.dispose();
    } );
		//selection+beads ?
		if (NGLg_current_list[o.name]!== -1 ){
			var anode = graph.nodes[NGLg_current_list[o.name]];
			//use selection, bu, model, current Representation
			//do axis/surface if surface
			//show beads if on
			//show geom if on
			console.log("NGL_ReprensentOne",o,anode);
			NGL_ReprensentOne(o,anode);
			console.log("NGL_ReprensentOnePost");
			NGL_ReprensentOnePost(o,anode);
		}
		else
    {
			stage.defaultFileRepresentation( o );
    }
		o.autoView();
		stage.autoView();
		var pa = o.structure.getPrincipalAxes();
		stage.animationControls.rotate( pa.getRotationQuaternion(), 0 );
		return data;
}

function NGLg_showEntry( name ){
		var gwidth = 250;
		var gheight = 250;
		grid_viewport.setAttribute("style","width: "+gwidth+"px; height:"+gheight+"px; display:inline-block");
		stage.handleResize();
	  var o = stage.getComponentsByName( name ).list[ 0 ];
		//update the ngl optinos with this ?
		console.log("show ",name,NGLg_current_list[o.name]);
		document.getElementById('ProteinId').innerHTML = graph.nodes[NGLg_current_list[o.name]].data.name;
		node_selected = graph.nodes[NGLg_current_list[o.name]];
		nodes_selections=[];
		//NGL_UpdateWithNode(d)
		SetObjectsOptionsDiv(node_selected);
		title_annotation.innerHTML = o.structure.title;
		pdb_id_elem.innerHTML = o.name;
		console.log("should have changed title and name with ",o.structure.title,o.name);
		if (o.name.length === 4){
			pdb_id_elem.innerHTML = '<a href="https://www.rcsb.org/structure/' + o.name + '" target="_blank"> pdb : ' + o.name + '</a>';
			if (node_selected.data.opm === 1)
				{
					pdb_id_elem.innerHTML = '<a href="http://opm.phar.umich.edu/protein.php?search=' + o.name + '" target="_blank"> opm : ' + o.name + '</a>';
				}
		}
    title_annotation.innerHTML = (o.structure.title)?o.structure.title:o.name;

    NGLg_prepareImage( { comp: o } );
}

function NGLg_makeImage( data ){
		var gwidth = 150;
		var gheight = 150;
		grid_viewport.setAttribute("style","width: "+gwidth+"px; height:"+gheight+"px; display:inline-block");
		stage.handleResize();
    return stage.makeImage().then( function( imgBlob ){
        data.imgBlob = imgBlob;
        return data;
    } );
}

function sample( array, n ){
    n = Math.max( Math.min( n, array.length ), 0 );
    var last = array.length - 1;
    for( var index = 0; index < n; ++index ){
        var rand = index + Math.floor( Math.random() * ( last - index + 1 ) );
        var temp = array[ index ];
        array[ index ] = array[ rand ];
        array[ rand ] = temp;
    }
    return array.slice( 0, n );
}

function NGLg_appendImage( data ){
    var div = data.div;
    var name = data.comp.name;
    var imgBlob = data.imgBlob;

    var objectURL = URL.createObjectURL( imgBlob );
    var img = document.createElement( "img" );
    img.src = objectURL;
    img.style.width = gwidth + "px";
    img.style.height = gheight + "px";
    img.title = name;
    img.style.display = "none";
    var activate = function( e ){
        if( !done || e.buttons !== 0 || activeName === name ) return;
        img.style.display = "none";
        div.appendChild( grid_viewport );
        activeName = name;
        if( hiddenImg ) hiddenImg.style.display = "inline-block";
        hiddenImg = img;
        NGLg_showEntry( name );
    };
    img.addEventListener( "mouseup", activate );
    img.addEventListener( "mousemove", activate );
    if( hiddenImg ) hiddenImg.style.display = "inline-block";
    hiddenImg = img;
    div.appendChild( img );
}

function loadArchive( count ){
    var xhr = new XMLHttpRequest();
    xhr.open( "GET", "//www3.rcsb.org/pdb/json/getCurrent" );
    xhr.responseType = "json";
    xhr.onload = function(){
        list = sample( this.response.idList, count );
        NGLg_loadList( list );
    };
    xhr.send();
}




  //viewport.style.width = width + "px";
  //viewport.style.height = height + "px";
  //document.body.appendChild( "viewport" );
  //if (!stage) {
	//   stage = new NGL.Stage( viewport, {
//      backgroundColor: "white",
//      tooltip: false
//  } );
//	}




/*  var archiveSample = NGL.getQuery( "archiveSample" );
  var idList = NGL.getQuery( "idList" );
  if( archiveSample ){
      loadArchive( archiveSample );
  }else if( idList ){
      NGLg_loadList( idList.split( "," ) );
  }else{
      loadArchive( 30 );
  }
 */
//);
