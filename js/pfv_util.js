var proteinFeatureView;
var featureView;// = new Object()

function setupPFV(){

	require(['viewer'], function (PFV) {
  proteinFeatureView = PFV;

  $(document).ready(function() {
    console.log('document ready - pfv');

    //P05067
    //P43379
    var uniprotID;// = "P01542";

    // if has not been initialized, initialize...

    featureView = new proteinFeatureView.PFV();

    featureView.addListener('viewerReady', function() {
      console.log("viewer ready")
      var data = featureView.getData();
      console.log(data.uniprotID + " " + data.desc);
      $("#dispUniprotID").html(data.uniprotID);
      $("#dispUniprotName").html(data.desc + "");

      var tracks = data.tracks;
      if (typeof tracks !== 'undefined' && data.tracks.length > 0) {
        var firstTrack = data.tracks[0];
        if ( typeof NGL !== 'undefined') {
          showPdb3d(firstTrack.pdbID, firstTrack.chainID);//first track appear last
        }
        featureView.set3dViewFlag(firstTrack.pdbID, firstTrack.chainID);

      }
    });

    featureView.addListener('dataReloaded', function(event) {
      console.log("Data got reloaded .. " + event.data.uniprotID);
      var tracks = event.data.tracks;
      if (typeof tracks !== 'undefined' && tracks.length > 0) {
        var firstTrack = tracks[0];
        if ( typeof NGL !== 'undefined') {
            showPdb3d(firstTrack.pdbID, firstTrack.chainID);

          featureView.set3dViewFlag(firstTrack.pdbID, firstTrack.chainID);
        }
      }
    });


    featureView.setParentDiv('#pfv-parent');
    featureView.setDialogDiv('#dialog');
    featureView.setScrollBarDiv('#svgScrollBar');

    featureView.setRcsbServer("http://www.rcsb.org/");

    //featureView.addPDB("2lp1");

    featureView.loadUniprot(uniprotID);

    $('#up-field').val(uniprotID);

    $('#up-field').change(function() {

      var val = $('#up-field').val();

      console.log("loading new uniprot " + val);

      // update the track URLs
      featureView.setUniprotId(val);
      featureView.setDefaultTracks();
      featureView.loadUniprot(val);

    });

    $("#zoomOut").click(function() {

      var val = featureView.getScrollBarValue();
      val -= 25;
      featureView.setScrollValue(val);

    });
    $("#zoomIn").click(function() {
      var val = featureView.getScrollBarValue();

      val += 25;

      featureView.setScrollValue(val);
    });


    $('#fullScreen').click(function() {
      featureView.requestFullscreen();
      return false;
    });

    $('#export').click(
      function() {
        var svg = featureView.getSVGWrapper();
        var xml = svg.toSVG();
        open("data:image/svg+xml," + encodeURIComponent(xml));

      });
      if ( typeof stage !== 'undefined'){
				stage.signals.clicked.add(function(info) {
				  console.log("info?",info);
				  if (!info) return;

				  if (info.atom !== undefined) {

				    $("#ngl_status").text(info.atom.chainname + " " + info.atom.resno + " " + info.atom.resname + " " + info.atom.atomname );
				  }
				  if (info.bond !== undefined) {

				    var atom1 = info.bond.atom1.chainname + " " + info.bond.atom1.resno + " " + info.bond.atom1.resname + " " + info.bond.atom1.atomname
				    var atom2 = info.bond.atom2.chainname + " " + info.bond.atom2.resno + " " + info.bond.atom2.resname + " " + info.bond.atom2.atomname

				    $("#ngl_status").text(atom1 + " - " + atom2);
				  }
				});

	}
  }); // document ready


  $("#colorselect").change(
    function() {
      var str = $(this).val();
      featureView.changeColorSelect(str);
    });

  $("#sortselect").change(function() {
    var text = $(this).val();
    featureView.sortTracks(text);
    featureView.repaint();
  });


  $('#findMotifDialogSubmit').click(function() {

    // $('mySequenceMotifDialog').modal({'show':false});

    $("#findSequenceMotif").submit();
  });


  var previousMotif = "";
  var myRegExp = new RegExp("$");

  $("#findSequenceMotif").submit(function(event) {

    var motif = $('#enterMotif').val();

    // to upper case
    motif = motif.toUpperCase();

    //replaceAll("X", "[A-Z]"
    motif = motif.replace(/X/g, '[A-Z]');

    console.log('looking for motif ' + motif);

    var seq = featureView.getSequence();


    if (previousMotif != motif) {
      previousMotif = motif;
      myRegExp = new RegExp(motif, "g");
    }

    var match = myRegExp.exec(seq);

    var pos = -1;



    //if ( match[0].length > 0)
    try {
      if (match != null)
        pos = match.index;
      console.log("found at at position " + pos);

      if (pos < 0) {
        alert('Motif not found!');
        event.preventDefault();
      } else {
        //console.log(pos + " " + match[0] + " lastIndex:" + myRegExp.lastIndex);
        var seqLength = match[0].length;

        featureView.highlight(pos, pos + seqLength - 1);

        if (myRegExp.lastIndex == 0)
          $('#mySequenceMotifDialog').modal('hide');

      }
    } catch (e) {
      console.log(e);
    }
    event.preventDefault();
  }); //
  featureView.addListener("pdbTrackNameClicked",function(event,data)
    {
    	//change NGL
    console.log("pdbTrackNameClicked");
  	console.log("event is",event);
    console.log("data is", data);
    var pdb = event.pdbID;
    var chain = GetNGLSelection(event.chainID);
    stage.removeAllComponents();
    document.getElementById('ProteinId').innerHTML = pdb+" "+chain;//arow.compartment+" "+arow.name+" : "+arow.pdb;
    LoadOneProtein("rcsb://"+pdb,-1,":"+chain);

  });
  <!-- NGL code part II-->
  featureView.addListener("showPositionIn3d", function(event, data, moredate) {



    //console.log("event:" + event);
    console.log(" showPositionIn3d data:" + JSON.stringify(event));

    var pdbId = event.pdbId;
    var chainId = event.chainId;
    showPdb3d(pdbId, chainId, event.pdbStart, event.pdbEnd);
    featureView.set3dViewFlag(pdbId, chainId);

  });


  featureView.addListener("selectionChanged", function(event, data, moredate) {

    //console.log("event:" + event);
    console.log("selection changed:" + JSON.stringify(data) + " " + JSON.stringify(moredate));

  });

  //define(["jquery"], function($) {
  //  $(function() {
  //  });
});
}


var currentPdbId = "";


function highlight3d(comp, chainId, pdbStart, pdbEnd) {
  console.log("highlight3d");
  comp.addRepresentation("licorice", {
    sele: 'not polymer and not water',
    color: "element",
    radius: .4
  });

  comp.addRepresentation("spacefill", {
    sele: 'not polymer and not water ',
    color: "element",
    radius: .6
  });

  comp.autoView(1000);//centerView();

  if (chainId !== undefined && pdbStart !== undefined && pdbEnd !== undefined) {

    var color = 'red';
    var style = 'licorice';

    var sele = pdbStart + "-" + pdbEnd + ":" + chainId;

    if (pdbEnd - pdbStart < 2) {
      color = 'yellow';
      style = 'spacefill';
    }

    if (pdbEnd - pdbStart < 2) {
      comp.addRepresentation(style, {
        sele: sele,
        color: "element"
      });
    }

    comp.centerView(false, sele);

    var schemeId = NGL.ColorMakerRegistry.addSelectionScheme( [
                            [ "red", sele ],
                            [ "grey", "*" ],
                        ], "my custom schema");


    comp.addRepresentation("cartoon", {
                           color: schemeId
                        });

    // draw labels
    comp.addRepresentation("label", {
                            sele: sele+".CA",
                            color: "gold",
                            scale: 2.0,
                            zOffset: 4.0
                        });

  } else if (chainId !== undefined && pdbStart !== undefined) {

    comp.addRepresentation("spacefill", {
      sele: pdbStart + ":" + chainId,
      color: "element"
    });
    comp.addRepresentation("cartoon", {
      color: "grey"
    });
  } else if (chainId !== undefined) {
    comp.addRepresentation("cartoon", {
      sele: ":" + chainId,
      color: "sstruc"
    });
    comp.addRepresentation("cartoon", {
      sele: "not :" + chainId,
      color: "grey"
    });
  } else {

    comp.addRepresentation("cartoon", {
      colorScheme: "sstruc"
    });

  }

}

function showPdb3d(pdbId, chainId, pdbStart, pdbEnd) {

  if ( typeof NGL === 'undefined') {
    return;
  }


  console.log("current PDB: " + currentPdbId + " old: " + pdbId);

  if (currentPdbId === pdbId) {
    stage.eachComponents(function(comp) {
      highlight3d(comp, chainId, pdbStart, pdbEnd);
    });

    return;
  }

  //try {
  //  stage.removeAllComponents();
  //} catch (e) {
  //  console.error(e);
  // }

  stage.removeAllComponents();
  console.log("Showing in NGL " + pdbId + "  " + chainId + " " + pdbStart + " " + pdbEnd);

  stage.loadFile("rcsb://" + pdbId + ".mmtf").then(function(comp) {

    //stage.centerView();

  highlight3d(comp, chainId, pdbStart, pdbEnd);

  });
}



function changeHighlight(sele) {
  licorice.setParameters({
    sele: sele
  });
}


/*protvista features*/
//the pvf features to protvista e.g. pdb,model,pfam...
function setupProVista(uniid,pdb){
	if (!protvista_instance) {
		if (!ProtVista ) ProtVista = require(['ProtVista']);
		protvista_instance = new ProtVista({
			el: document.getElementById("protvista"),
			uniprotacc: uniid,
			categoryOrder: ['DOMAINS_AND_SITES', 'VARIATION', 'PTM','SEQUENCE_INFORMATION',
		'STRUCTURAL','TOPOLOGY']

		});
	} else { //update
		document.getElementById("protvista").innerHtml ="";
		protvista_instance = new ProtVista({
			el: document.getElementById("protvista"),
			uniprotacc: uniid,
			categoryOrder: ['DOMAINS_AND_SITES', 'VARIATION', 'PTM','SEQUENCE_INFORMATION',
		'STRUCTURAL','TOPOLOGY']
		});
	}
}

//query mgl2 for sequence alignment between current ngl_object sequence (selection?) and current uniprot_access_number
//Your data sources are defined here
//       customDataSource: {
//         url: './data/externalFeatures_',
//         source: 'myLab',
//         useExtension: true
//       }
