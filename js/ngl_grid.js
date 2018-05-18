//stage should be already on ?

	
//var stage, viewport, heading;
//var width = 150;
//this should adap to the number of pdb loaded by the list
var gheight = 200;
var gwidth = 200;
var done = false;
var hiddenImg, activeName;

//document.addEventListener( "DOMContentLoaded", function(){



function NGL_loadList( pdbList ){
	  //grid_viewport = viewport;
	  //if (!grid_viewport || grid_viewport===null) 
	  // 		document.getElementById("viewport");
	  ngl_grid_mode = true;
	  //change the style of the viewport
	  //"width:100%; height:95%;"
	  //check size of parent
	  var r = pcontainer.getBoundingClientRect();
	  console.log(r);
	  var n = Math.max(2,pdbList.length);
	  gwidth = r.width/(n/2);
	  gheight = r.height/(n/2);
	  console.log(gwidth,gheight);
	  grid_viewport.setAttribute("style","width: "+gwidth+"px; height:"+gheight+"px; display:inline-block");
	  stage.handleResize();
    var i = 0;
    pdbList.reduce( function( acc, name ){
        return acc.then( function(){
            i += 1;
            heading.innerText = "Grid loading entry " + i +" "+name+" of " + pdbList.length + " entries";
            var nameurl = NGL_GetPDBURL(name);
            if (name === "None") return;
            return stage.loadFile( nameurl )
                .then( addDiv )
                .then( prepareImage )
                .then( makeImage )
                .then( appendImage );
        } );
    }, Promise.resolve() ).then( function(){
        done = true;
        heading.innerText = "Grid showing " + pdbList.length + " entries";
        //grid_viewport.style.display = "inline-block";
        stage.mouseObserver.handleScroll = false;
    } );
}

function addDiv( o ){
    var div = document.createElement( "div" );
    //div.style.display = "flex";
    div.setAttribute("class", "nglgrid" );
    div.appendChild( grid_viewport );
    activeName = name;
    //document.body.appendChild( div );
    pcontainer.appendChild( div );
    return {
        div: div,
        comp: o
    };
}

function prepareImage( data ){
    var o = data.comp;
    stage.eachRepresentation( function( r ){
        r.dispose();
    } );
    stage.defaultFileRepresentation( o );
    o.autoView();
    stage.autoView();
    var pa = o.structure.getPrincipalAxes();
    stage.animationControls.rotate( pa.getRotationQuaternion(), 0 );
    return data;
}

function showEntry( name ){
    var o = stage.getComponentsByName( name ).list[ 0 ];
    title_annotation.innerHTML = (o.structure.title)?o.structure.title:o.name;
    prepareImage( { comp: o } );
}

function makeImage( data ){
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

function appendImage( data ){
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
        showEntry( name );
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
        NGL_loadList( list );
    };
    xhr.send();
}




  //viewport.style.width = width + "px";
  //viewport.style.height = height + "px";
  //document.body.appendChild( "viewport" );
  if (!stage) {
	   stage = new NGL.Stage( viewport, {
      backgroundColor: "white",
      tooltip: false
  } );
	}
  



/*  var archiveSample = NGL.getQuery( "archiveSample" );
  var idList = NGL.getQuery( "idList" );
  if( archiveSample ){
      loadArchive( archiveSample );
  }else if( idList ){
      NGL_loadList( idList.split( "," ) );
  }else{
      loadArchive( 30 );
  }
 */
//);