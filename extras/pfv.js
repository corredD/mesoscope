$('.togglePFV').change(function() {
    var PFV_varArray = $(this).attr("name").split("-");
    var structureId = PFV_varArray[0];
    var uniProtAC = PFV_varArray[1];
    var sequenceLength = PFV_varArray[2];
    var entityContainer = "#entity" + uniProtAC+'-'+ sequenceLength;
    var entitySVGContainer = "#entity" + uniProtAC +'-'+ sequenceLength + " .hasSVG";

    if(this.checked) {
        // ONLY create PFV Object if it doesn't exist
        if (!($(entitySVGContainer).length > 0)) {
            loadPFV(uniProtAC, structureId, sequenceLength);
        }
        $(entityContainer).removeClass("hide");
    } else {
        $(entityContainer).addClass("hide");
    }
});

function setupPFV(){
	var proteinfeatureview;
    require(['viewer'], function (PFV) {
        proteinfeatureview = PFV;
	featureView = new proteinFeatureView.PFV();
	
	}

function loadPFV(uniProtAC, structureId, sequenceLength) {
    var proteinfeatureview;
    require(['viewer'], function (PFV) {
        proteinfeatureview = PFV;
        var entityView = {};
        try {
            entityView = new proteinfeatureview.PFV();
            entityView.setParentDiv('#entity'+uniProtAC+'-'+sequenceLength);

            // NOTE: First line was the initial setScale calculation, ported from Classic. Set it to just 0 to fit the PFV in the table. Zoom out.
            // entityView.setScale(400/sequenceLength);
            entityView.setScale(0);

            entityView.setShowSeqres(true);
            entityView.showPDB(structureId);
            entityView.loadUniprot(uniProtAC);
        } catch (err) {
            console.log(err);
            alert(err);
        }
    });
}

$(document).ready(function() {
    var macroMoleculeTables = $(".ProteinFeatureViewRow");

    // INITIALIZE PFV
    if (macroMoleculeTables.length > 0) {
        var togglePFVtarget = $(".ProteinFeatureViewRow:eq(0) .material-switch .togglePFV");
        var togglePFVname_firstTable = togglePFVtarget.attr("name");

        var PFV_varArray = togglePFVname_firstTable.split("-");

        var structureId = PFV_varArray[0];
        var uniProtAC = PFV_varArray[1];
        var sequenceLength = PFV_varArray[2];
        var entityContainer = "#entity" + uniProtAC+'-'+sequenceLength;

        $(togglePFVtarget).prop("checked", true);
        loadPFV(uniProtAC, structureId, sequenceLength);
        $(entityContainer).removeClass("hide");
    }
});