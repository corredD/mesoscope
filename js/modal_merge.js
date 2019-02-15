var merge_field={
  		name_index:-1,
	    source_index:-1,
	    count_index:-1,
	    compartment_index:-1,
	    biological_unit_index:-1,
	    string_selection_index:-1,
	    location_index:-1,
	    model_index:-1,
	    molarity_index:-1,
	    uniprot_index:-1,
	    offset_index:-1,
	    pcpalvector_index:-1,
			molecularweight_index:-1,
			confidence_index:-1,
			include_index:-1,
			color_index:-1,
			comment_index:-1,
			label_index:-1,
	    compartments:-1//special case where one column per comnpartment
	    };
var merge_nodes;
var merge_links;
function merge_changeFieldInclude(e){
  merge_field[e.name] = e.value;
}

function merge_createOneColumnSelect(field1name, divparent) {
		//Create and append select list
    var elem =  grid_addToModalDiv( divparent, 'modal-content-elem', allfield_labels[field1name]);
    var checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.name = field1name;
    checkbox.checked = true;
    checkbox.id = field1name+"_include";
    elem.prepend(checkbox);
    merge_field[field1name] = checkbox;
}

function merge_getModal(newnodes,newlinks) {
	  var modal_cont = document.getElementById("mergemodal");
  	var item_cont = document.getElementById("mergemodalform");//"slickitems");
		item_cont.innerHTML = "";
		var span = document.getElementById("closemergemodal");
  	var btn1 = document.getElementById("mergemodal_save");
  	var btn2 = document.getElementById("mergemodal_cancel");
		//if its spreadsheet, need the regular modal ?
    //one checkbox selectAll
    var checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.name = "allfieldtoggle";
    checkbox.checked = true;
    checkbox.id = "allfieldtoggle_include";
    checkbox.onclick = function(cb){
      for(var k in allfield) {
  				if (k==="compartments") continue;
          merge_field[k].checked = !merge_field[k].checked;
      }
    }
    var celem =  grid_addToModalDiv( item_cont, 'modal-content-elem', "select all");
    celem.prepend(checkbox);

    for(var k in allfield) {
				if (k==="compartments") continue;
				merge_createOneColumnSelect(k, item_cont);
    }

    modal_cont.style.display = "block";

    span.onclick = function() {
      modal_cont.style.display = "none";
      //$modal.remove();
		}

  	btn1.onclick = function() {
      modal_cont.style.display = "none";
      merge_graph(newnodes,newlinks);
		}

		btn2.onclick = function() {
      modal_cont.style.display = "none";
		}
	}
