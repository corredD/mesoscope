var options = {
  enableCellNavigation: true,
  enableColumnReorder: false,
  forceFitColumns: true //,
  //cellHighlightCssClass: "changed",
  //cellFlashingCssClass: "current-server"
};
// define some minimum height/width/padding before resizing
var DATAGRID_MIN_HEIGHT = 180;
var DATAGRID_MIN_WIDTH = 300;
var DATAGRID_BOTTOM_PADDING = 20;

var gridArray;
var gridIds = ["grid_recipe", "grid_interaction", "grid_uniprot", "grid_pdb"];
var sortcol = "name";
var current_grid = 0;
var current_grid_row;
var current_row;
var grid_column_elem;
var grid_column_elem;

var uni_picked;
var pdb_picked;
var group_picked;

var pager;

var compartmentList = [];

var countryList = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "American Samoa",
  "Andorra",
];

function setupSlickGrid() {
  grid_column_elem = document.getElementById("column_type");

}


function loadingTemplate() {
  return ''; //<div class="preload">Loading...</div>';
}

function loadView(itemDetail) {
  //iframe ? -> uniprot ?
  aHtml = [];
  aHtml.push('<div>');
  aHtml.push('<h4>' + itemDetail.title + '</h4>');
  var thekeys = Object.keys(itemDetail);
  for (var k in itemDetail) {
    aHtml.push('<div class="detail"><label>' + k + ':</label> <span>' + itemDetail[k] + '</span></div>');
  }
  aHtml.push('</div>');
  return aHtml.join('');
}

/* //not used ///
function loadView2(itemDetail) {
  //iframe ? -> uniprot ?
  aHtml = '<div><iframe src="http://www.uniprot.org/uniprot/' + itemDetail.Entry + '"></iframe></div>';
  return aHtml;
}
*/

function grid_readImgFile(thefile){
  if (window.FileReader) {
    // FileReader is supported.
  } else {
    alert('FileReader is not supported in this browser.');
  }
  var ext = thefile.name.split('.').pop();
  var reader = new FileReader();
  if (!(thefile.name in pathList_)) pathList_[thefile.name]=thefile;
  pathList_[thefile.name].block = true;
  reader.onload = function(event) {
    pathList_[thefile.name].data = reader.result;
    pathList_[thefile.name].block = false;
    var grid = gridArray[0];
    grid.invalidate();
    grid.render();
    grid.dataView.refresh();
  }
  reader.readAsDataURL(thefile);
}

function grid_selectImgFile(e){
  //use the current row
  var theFiles = e.target.files;
  //alert(theFiles.length);
  //alert(theFiles[0].size);
  var thefile = theFiles[0];
  if (node_selected) {
    node_selected.data.sprite.image = thefile.name;
    if (node_selected.data.thumbnail == null) {
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
    node_selected.data.thumbnail.src = URL.createObjectURL(thefile);
  }
  if (current_row) current_row.image = thefile.name;
  grid_readImgFile(thefile);
}

function simulateServerCall(item) {
  // let's add some property to our item for a better simulation
  var itemDetail = item;
  uniprot_detailView.onAsyncResponse.notify({
    "itemDetail": itemDetail
  }, undefined, this);
}

function getImageHtmlPDB(pdb) {
  pdb = pdb.toLowerCase();
  var twoletters = pdb[1] + pdb[2];
  //var html = "<img id='imagepdb' src='https://cdn.rcsb.org/images/rutgers/" + twoletters + "/" + pdb + "/" + pdb + ".pdb1-250.jpg' onmouseenter='showClone(this)' onmouseleave='hideClone(this)'/>"; //size
  var html = "<img id='imagepdb' src='https://www.ebi.ac.uk/pdbe/static/entry/"+pdb+"_deposited_chain_front_image-400x400.png' onmouseenter='showClone(this)' onmouseleave='hideClone(this)'/>";
  //console.log(html);
  return html;
}

function getImageHtmlPDB_src(pdb) {
  pdb = pdb.toLowerCase();
  var twoletters = pdb[1] + pdb[2];
  //var html = "<img id='imagepdb' src='https://cdn.rcsb.org/images/rutgers/" + twoletters + "/" + pdb + "/" + pdb + ".pdb1-250.jpg' onmouseenter='showClone(this)' onmouseleave='hideClone(this)'/>"; //size
  return "https://www.ebi.ac.uk/pdbe/static/entry/"+pdb+"_deposited_chain_front_image-400x400.png";
}

function renderImageCell(row, cell, value, columnDef, dataContext) {
  //first two letter
  return getImageHtmlPDB(dataContext.structureId);
}

function renderImageRecipeCell(row, cell, value, columnDef, dataContext) {
  //either image is defined or ise the PDB id
  var found = false;
  console.log(dataContext);
  console.log(dataContext.id);
  var anode_indice = parseInt(dataContext.id.split("_")[1]);
  console.log(anode_indice);
  var anode = graph.nodes[anode_indice];
  console.log(anode);
  var src=(anode && anode.data.thumbnail)?anode.data.thumbnail.src:"";
  if (src==""){
    if (value ){
      if (value in pathList_) {
        var data = pathList_[value];
        //test if file or dataspathList_["Capsid_2.png"].type
        //if (data && data.type) {
        //  grid_readImgFile(data);
        //}
        if (data && !("data" in data ))
        {
          if ("block" in  pathList_[value] )
          {
            if (!(pathList_[value].block))
            {
              grid_readImgFile(data);
            }
          }
          else grid_readImgFile(data);
        }
        else {
          data = pathList_[value].data;
        }
        src = URL.createObjectURL(data);
      }
      /*else {
        var searchsrc = cellpack_repo+"images/"+value;
        var results = syncCall(searchsrc);
        if (results!=="")
        {
          found = true;
          src = searchsrc;
        }
      }*/
  }
    if (!found)
    {
    var apdb = (dataContext.pdb)?dataContext.pdb.split("_")[0]:"";
    src = getImageHtmlPDB_src(apdb);
    }
  }
  return "<img id='imagepdb' src ='"+src+"' onmouseenter='showClone(this)' onmouseleave='hideClone(this)'/>"
}

// create the row detail plugin
var uniprot_detailView = new Slick.Plugins.RowDetailView({
  cssClass: "detailView-toggle",
  preTemplate: loadingTemplate,
  postTemplate: loadView,
  process: simulateServerCall,
  useRowClick: false,
  loadOnce: false,
  // how many grid rows do we want to use for the detail panel
  // also note that the detail view adds an extra 1 row for padding purposes
  // so if you choose 4 panelRows, the display will in fact use 5 rows
  panelRows: 10
});

var checkboxSelector = new Slick.CheckboxSelectColumn({
  cssClass: "slick-cell-checkboxsel"
});

/*
 * An example of a "Multi-Select Dropdown" editor.
 * The UI is added onto document BODY and .position(), .show() and .hide() are implemented.
 * KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
 */

var DropdownListData = ["Afghanistan", "Bangladesh", "Canada", "China", "England", "India", "Japan", "United Kingdom", "United States", "France"];

function getChkBoxDataList(args) {
  var countryLeadsData = [];
  // here 'country' is column id
  if (args.column.id == 'country') {
    var countryData = {
      "AllValues": DropdownListData,
      "SelectedValues": args.item.country
      /*
       * args.item.country is used to read the value of the field "country" of a particular row.
       * This "SelectedValues" array generates prepopulated data if you want to retrieve data from your data base.
       * Lets for emxample for row no 1 : you have 2 countries, this field captures the name of these countries(should be seprated by semicolon) and mark the checkboxes of those country as checked.
       */
    }
    return countryData;
  }

  /*
   * add else if conditions if you have another multi-select dropdown list as well.
   */

}


function MultiSelectDropdownEditor(args) {
  var $input, $wrapper, $checkBoxInput, selectedchkBoxArray = [];
  var defaultValue;
  var scope = this;
  // check scope get this value

  var chkBoxListData = getChkBoxDataList(args);
  var chkBoxAllValues = chkBoxListData.AllValues;
  chkBoxAllValues.sort();
  var selectedchkBox = chkBoxListData.SelectedValues;
  if (!(selectedchkBox == undefined || selectedchkBox == '')) {
    if (selectedchkBox.length > 0) selectedchkBoxArray = selectedchkBox.split(";");
  }
  this.init = function() {

    if (chkBoxAllValues.length != 0) {
      var $container = $("body");
      $wrapper = $("<DIV style='z-index:10000;position:absolute;background:white;padding:5px;border:3px solid gray; -moz-border-radius:10px; border-radius:10px;'/>")
        .appendTo($container);

      for (var i = 0; i < chkBoxAllValues.length; i++) {
        if (!(selectedchkBoxArray == undefined || selectedchkBoxArray == '')) {
          if (selectedchkBoxArray.length > 0 && selectedchkBoxArray.indexOf(chkBoxAllValues[i]) > -1) {
            $checkBoxInput = $("<input class='chkBox' type='checkbox' name='" + chkBoxAllValues[i] + "' id='chkBox_" + i + "' checked='checked'/>" + chkBoxAllValues[i] + "<br />");
          } else
            $checkBoxInput = $("<input class='chkBox' type='checkbox' name='" + chkBoxAllValues[i] + "' id='chkBox_" + i + "'/>" + chkBoxAllValues[i] + "<br />");
        } else
          $checkBoxInput = $("<input class='chkBox' type='checkbox' name='" + chkBoxAllValues[i] + "' id='chkBox_" + i + "'/>" + chkBoxAllValues[i] + "<br />");

        $wrapper.append($checkBoxInput);
      }

      $wrapper.append("<br/><br/>");

      $input = $("<TEXTAREA style='display:none;' hidefocus rows=25 style='background:white;width:150px;height:100px;border:1px solid;outline:0'>")
        .appendTo($wrapper);

      $("<DIV style='text-align:right'><BUTTON>Save</BUTTON><BUTTON>Cancel</BUTTON></DIV>")
        .appendTo($wrapper);

      $wrapper.find("button:first").on("click", this.save);
      $wrapper.find("button:last").on("click", this.cancel);
      $input.on("keydown", this.handleKeyDown);
    } else {

      alert("Dropdown list is empty. Kindly provide data for this dropdown list");
    }
    scope.position(args.position);
    $input.focus().select();

    $('input[type="checkbox"]').change(function() {
      var name = $(this).prop('name');
      var chkboxId = $(this).prop('id');
      var check = $(this).prop('checked');
      var currentValue = $input.val();
      if (check) {
        var allSelectedValues = '';
        $('input[type="checkbox"]').each(function() {
          var isChecked = $(this).prop('checked');
          var name = $(this).prop('name');
          var currentChekBoxId = $(this).prop('id');
          if (isChecked) {
            if (allSelectedValues.length == 0) allSelectedValues = name;
            else allSelectedValues = allSelectedValues + ";" + name;
          }
        });
        $input.val('');
        $input.val(allSelectedValues);
      } else {
        var allSelectedValues = '';
        $('input[type="checkbox"]').each(function() {
          var isChecked = $(this).prop('checked');

          var name = $(this).prop('name');
          var currentChekBoxId = $(this).prop('id');
          if (isChecked) {
            if (allSelectedValues.length == 0) allSelectedValues = name;
            else allSelectedValues = allSelectedValues + ";" + name;
          }
        });
        $input.val('');
        $input.val(allSelectedValues);
      }
    });
    var allSelValues = '';
    $('input[type="checkbox"]').each(function() {
      var isChecked = $(this).prop('checked');

      var name = $(this).prop('name');
      var currentChekBoxId = $(this).prop('id');
      if (isChecked) {
        if (allSelValues.length == 0) allSelValues = name;
        else allSelValues = allSelValues + ";" + name;
      }
    });
    $input.val('');
    $input.val(allSelValues);
  };

  this.handleKeyDown = function(e) {
    if (e.which == $.ui.keyCode.ENTER && e.ctrlKey) {
      scope.save();
    } else if (e.which == $.ui.keyCode.ESCAPE) {
      e.preventDefault();
      scope.cancel();
    } else if (e.which == $.ui.keyCode.TAB && e.shiftKey) {
      e.preventDefault();
      args.grid.navigatePrev();
    } else if (e.which == $.ui.keyCode.TAB) {
      e.preventDefault();
      args.grid.navigateNext();
    }
  };

  this.save = function() {
    args.commitChanges();
    $wrapper.hide();
  };

  this.cancel = function() {
    $input.val(defaultValue);
    args.cancelChanges();
  };

  this.hide = function() {
    $wrapper.hide();
  };

  this.show = function() {
    $wrapper.show();
  };

  this.position = function(position) {
    $wrapper
      .css("top", position.top - 5)
      .css("left", position.left - 5)
  };

  this.destroy = function() {
    $wrapper.remove();
  };

  this.focus = function() {
    $input.focus();
  };

  this.loadValue = function(item) {
    $input.val(defaultValue = item[args.column.field]);
  };

  this.serializeValue = function() {
    return $input.val();
  };

  this.applyValue = function(item, state) {
    item[args.column.field] = state;
  };

  this.isValueChanged = function() {
    return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
  };

  this.validate = function() {
    if (args.column.validator) {
      var validationResults = args.column.validator($input.val());
      if (!validationResults.valid) {
        return validationResults;
      }
    }

    return {
      valid: true,
      msg: null
    };
  };

  this.init();
}

var SelectCellEditor = function(args) {
    var $select;
    var defaultValue;
    var scope = this;

    this.init = function() {

        if(args.column.options){
          opt_values = args.column.options.split(',');
        }else{
          opt_values ="yes,no".split(',');
        }
        option_str = ""
        for( i in opt_values ){
          v = opt_values[i];
          option_str += "<OPTION value='"+v+"'>"+v+"</OPTION>";
        }
        $select = $("<SELECT tabIndex='0' class='editor-select'>"+ option_str +"</SELECT>");
        $select.appendTo(args.container);
        $select.focus();
    };

    this.destroy = function() {
        $select.remove();
    };

    this.focus = function() {
        $select.focus();
    };

    this.loadValue = function(item) {
        defaultValue = item[args.column.field];
        $select.val(defaultValue);
    };

    this.serializeValue = function() {
        if(args.column.options){
          return $select.val();
        }else{
          return ($select.val() == "yes");
        }
    };

    this.applyValue = function(item,state) {
        item[args.column.field] = state;
    };

    this.isValueChanged = function() {
        return ($select.val() != defaultValue);
    };

    this.validate = function() {
        return {
            valid: true,
            msg: null
        };
    };

    this.init();
}

function requiredFieldValidator(value) {
  if (value == null || value == undefined || !value.length) {
    return {
      valid: false,
      msg: "This is a required field"
    };
  } else {
    return {
      valid: true,
      msg: null
    };
  }
}


//per column ?
//function findInGrid() {//
//    grid.scrollRowIntoView(currentServer);
//    grid.flashCell(currentServer, grid.getColumnIndex("server"), 100);
//}


function AutoCompleteEditor(args) {
  var $input;
  var defaultValue;
  var scope = this;
  var calendarOpen = false;

  this.keyCaptureList = [Slick.keyCode.UP, Slick.keyCode.DOWN, Slick.keyCode.ENTER];

  this.init = function() {
    $input = $("<INPUT id='tags' class='editor-text' />");
    $input.appendTo(args.container);
    $input.focus().select();

    $input.autocomplete({
      source: args.column.dataSource
    });
  };

  this.destroy = function() {
    $input.autocomplete("destroy");
    $input.remove();
  };

  this.focus = function() {
    $input.focus();
  };

  this.loadValue = function(item) {
    defaultValue = item[args.column.field];
    $input.val(defaultValue);
    $input[0].defaultValue = defaultValue;
    $input.select();
  };

  this.serializeValue = function() {
    return $input.val();
  };

  this.applyValue = function(item, state) {
    item[args.column.field] = state;
  };

  this.isValueChanged = function() {
    return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
  };

  this.validate = function() {
    return {
      valid: true,
      msg: null
    };
  };

  this.init();
}


/** Attach an auto resize trigger on the datagrid, if that is enable then it will resize itself to the available space
 * Options: we could also provide a % factor to resize on each height/width independently
 */
function attachAutoResizeDataGrid(grid, gridId, gridContainerId) {
  var gridDomElm = $('#' + gridId);
  if (!gridDomElm || typeof gridDomElm.offset() === "undefined") {
    // if we can't find the grid to resize, return without attaching anything
    return null;
  }

  //-- 1st resize the datagrid size on first load (because the onResize is not triggered on first page load)

  resizeToFitBrowserWindow(grid, gridId, gridContainerId);



  //-- 2nd attach a trigger on the Window DOM element,
  //so that it happens also when resizing after first load
  window.addEventListener("resize", function(event) {
    resizeToFitBrowserWindow(grid, gridId, gridContainerId);
    //console.log("inbetween");
    resizeToFitBrowserWindow(grid, gridId, gridContainerId);
  }, false);

  /*		$(window).on("resize", function () {
  			// for some yet unknown reason,
  			//calling the resize twice removes any stuttering/flickering
  			//when changing the height and makes it much smoother
  			resizeToFitBrowserWindow(grid, gridId, gridContainerId);
  			resizeToFitBrowserWindow(grid, gridId, gridContainerId);
  		});
  */

  resizeToFitBrowserWindow(grid, gridId, gridContainerId);
  // in a SPA (Single Page App) environment you SHOULD also call the destroyAutoResize()

}

/* destroy the resizer when user leaves the page */
function destroyAutoResize() {
  $(window).trigger('resize').off('resize');
}

/**
 * Private function, calculate the datagrid new height/width from the available space, also consider that a % factor might be applied to calculation
 * object gridOptions
 */
function calculateGridNewDimensions(gridId, gridContainerId) {
  //var availableHeight = $(window).height() - $('#' + gridId).offset().top - DATAGRID_BOTTOM_PADDING;
  //var pheight = document.getElementById(gridContainerId).clientHeight;//	 - $('#tabs').offset().top - DATAGRID_BOTTOM_PADDING;//tabs
  //console.log("availableHeight "+ availableHeight);
  //availableHeight = Math.max(availableHeight,pheight)
  //var newHeight = availableHeight;
  var availableWidth = $('#' + gridContainerId).width() - 25; //$('#tabs').width()-15;//document.getElementById(gridContainerId).getBoundingClientRect().width;/$('#' + gridContainerId).width();//
  var aHeight = $('#' + gridContainerId).height() - DATAGRID_BOTTOM_PADDING - 125;
  //console.log("height "+ pheight);
  console.log("availableWidth " + availableWidth);
  //console.log("availableHeight "+ availableHeight,aHeight);
  var newHeight = aHeight; //Math.max(availableHeight,aHeight);
  var newWidth = availableWidth;
  // we want to keep a minimum datagrid size, apply these minimum if required
  if (newHeight < DATAGRID_MIN_HEIGHT) {
    newHeight = DATAGRID_MIN_HEIGHT;
  }
  if (newWidth < DATAGRID_MIN_WIDTH) {
    newWidth = DATAGRID_MIN_WIDTH;
  }
  return {
    height: newHeight,
    width: newWidth
  };
}

/** resize the datagrid to fit the browser height & width */
function resizeToFitBrowserWindow(grid, gridId, gridContainerId) {
  //console.log(current_grid,gridArray.length,gridArray[current_grid],gridIds[current_grid]);
  //console.log(grid, gridId, gridContainerId);//undefined undefined
  //console.log("calculate new size");
  // calculate new available sizes but with minimum height of 220px
  var newSizes = calculateGridNewDimensions(gridId, gridContainerId);
  //console.log(newSizes);
  if (newSizes) {
    console.log("new Size!");
    console.log(newSizes);
    // apply these new height/width to the datagrid
    $('#' + gridId).height(newSizes.height);
    $('#' + gridId).width(newSizes.width);
    //console.log("resize ?",newSizes.height,newSizes.width);
    grid.resizeCanvas();
    grid.autosizeColumns();
    //not sure why it doesnt resize!?
    // resize the slickgrid canvas on all browser except some IE versions
    // exclude all IE below IE11
    if (new RegExp('MSIE [6-8]').exec(navigator.userAgent) === null && grid) {
      grid.resizeCanvas();
    }
  }
}


var commandQueue = [];


function queueAndExecuteCommand(item, column, editCommand) {
  console.log("queue command system");
  commandQueue.push(editCommand);
  editCommand.execute();
}

function undo() {
  var command = commandQueue.pop();
  if (command && Slick.GlobalEditorLock.cancelCurrentEdit()) {
    command.undo();
    grid.gotoCell(command.row, command.cell, false);
  }
}

function CreateOptions() {
  var options = {
    editable: true,
    enableAddRow: true,
    enableCellNavigation: true,
    asyncEditorLoading: false,
    autoEdit: false,
    editCommandHandler: queueAndExecuteCommand,
    //enableColumnReorder: false,
    multiColumnSort: true //,
    //  cellHighlightCssClass: "changed",
    //  cellFlashingCssClass: "current-server"
  };
  return options;
}

/*
 * An example of a "Multi-Select Dropdown" editor.
 * "DropdownListData" is an array to store all the checkbox options required for the dropdowwn multi-select field.
 */


function CreateColumnsFromD3Nodes(agraph) {
  var thekeys;
  for (var i = 0; i < agraph.length; i++) {
    if (!agraph[i].children) {
      thekeys = Object.keys(agraph[i].data);
      break;
    }
  }
  var columns = [];
  for (var i = 0; i < thekeys.length; i++) {
    columns.push({
      id: thekeys[i],
      name: thekeys[i],
      field: thekeys[i],
      editor: Slick.Editors.Text
    })
  }
  return columns;
}

function CreateColumnsFromANodes(anode) {
  var thekeys = Object.keys(anode);
  var columns = [];
  for (var i = 0; i < thekeys.length; i++) {
    columns.push({
      id: thekeys[i],
      name: thekeys[i],
      field: thekeys[i],
      sortable: true,
      editor: Slick.Editors.Text
    }) //, editor: Slick.Editors.Text
  }
  return columns;
}
//

function CreateDataColumnFromPDBData(pdb_data) {
  var data = [];
  var columns = [];
  columns.push({
    id: "id",
    name: "id",
    field: "id"
  });
  columns.push({
    id: "pdb",
    name: "pdb",
    field: "pdb"
  });
  columns.push({
    id: "title",
    name: "title",
    field: "title"
  });
  columns.push({
    id: "polymer",
    name: "polymer",
    field: "polymer"
  });
  //columns.push({id: "taxonomy", name: "taxonomy", field: "taxonomy"});
  columns.push({
    id: "picked",
    name: "picked",
    field: "picked",
    formatter: Slick.Formatters.Checkmark,
    editor: Slick.Editors.Checkbox
  });

  return {
    "data": pdb_data,
    "column": columns
  };

}


function CreateDataColumnFromPDBList(aList) {
  var data = [];
  var columns = [];
  columns.push({
    id: "id",
    name: "id",
    field: "id"
  });
  columns.push({
    id: "pdb",
    name: "pdb",
    field: "pdb"
  });
  columns.push({
    id: "picked",
    name: "picked",
    field: "picked",
    formatter: Slick.Formatters.Checkmark,
    editor: Slick.Editors.Checkbox
  });
  console.log(aList.length);
  for (var i = 0; i < aList.length; i++) {
    var elem = {
      "pdb": aList[i]
    };
    elem.id = "id_" + i;
    //need more info, should be query synchrone ?
    data.push(elem);
  }
  return {
    "data": data,
    "column": columns
  };
}

function CreateDataColumnFromCVS(cvsdata) {
  //work only with leaf
  var data = [];
  var columns = [];
  console.log(cvsdata.length);
  for (var i = 0; i < cvsdata.length; i++) {
    var elem = JSON.parse(JSON.stringify(cvsdata[i]));
    elem.id = "id_" + i;
    //elem.picked = false;
    if (columns.length === 0) {
      columns = CreateColumnsFromANodes(elem);
    }
    data.push(elem);
  }
  //console.log(columns);
  return {
    "data": data,
    "column": columns
  };
}

function CreateDataColumnFromD3Links(alinks) {
  //work only with leaf
  var data = [];
  var columns = [];
  console.log(alinks.length);
  for (var i = 0; i < alinks.length; i++) {
    var jlink = JSON.stringify(alinks[i]);
    var elem = JSON.parse(JSON.stringify(alinks[i]));
    //elem.id = "id_"+i;
    if (columns.length === 0) {
      columns = CreateColumnsFromANodes(elem);
    }
    data.push(elem);
  }
  console.log(JSON.stringify(data));
  return {
    "data": data,
    "column": columns
  };
}

function CreateDataColumnFromD3Nodes(agraph) {
  //work only with leaf
  var data = [];
  var columns = [];
  console.log(agraph.length);
  for (var i = 0; i < agraph.length; i++) {
    if (!agraph[i].children && "source" in agraph[i].data && "nodetype" in agraph[i].data && agraph[i].data.nodetype === "ingredient") {
      var elem = JSON.parse(JSON.stringify(agraph[i].data));
      if ("source" in elem) {
        var model =""
        if ("model" in elem.source) model = (elem.source.model !=="")? elem.source.model : "";
        elem.bu = ("bu" in elem.source) ? elem.source.bu : "";
        elem.selection = ("selection" in elem.source) ? sele = elem.source.selection : "";//NGL_GetSelection(elem.source.selection,model) : "";
        elem.pdb = elem.source.pdb;
        delete elem.source;
      }
      //rename name to id
      if (!elem.id) elem.id = "id_" + i;
      agraph[i].data.id = elem.id; //"id_"+i;
      elem.compartment = agraph[i].ancestors().reverse().map(function(d) {
        return (d.children) ? d.data.name : "";
      }).join('/').slice(0, -1);
      if (compartmentList.indexOf(elem.compartment) === -1)
        compartmentList.push(elem.compartment);
      if (columns.length === 0) {
        columns = CreateColumnsFromANodes(elem);
      }
      data.push(elem);
    }
  }
  if (DEBUGLOG) console.log("build data for grid",agraph);
  //console.log(JSON.stringify(data));
  return {
    "data": data,
    "column": columns
  };
}

//CreateGridFromD3Nodes(nodes,"slickGrid","tabs-1");
function CreateGridFromD3Nodes(agraph, elementId, tabId, SheetName) {
  compartmentList = [];
  var parentId = "tabs-" + tabId;
  //var liElem = document.getElementById("lid_tab_"+tabId).innerHTML = SheetName;
  var cdata = CreateDataColumnFromD3Nodes(agraph);
  var options = CreateOptions();
  var columns = CreateNodeColumns();
  CreateGrid(elementId, parentId, cdata.data, columns, options, 0);
}

function CreateGridFromD3Links(alinks, elementId, tabId, SheetName) {
  var parentId = "tabs-" + tabId;
  //var liElem = document.getElementById("lid_tab_"+tabId).innerHTML = SheetName;
  var cdata = CreateDataColumnFromD3Links(alinks);
  var options = CreateOptions();
  CreateGrid(elementId, parentId, cdata.data, cdata.column, options);
}

function UpdateGridFromD3Nodes(agraph, grid_id) {
  var cdata = CreateDataColumnFromD3Nodes(agraph);
  cdata.column = CreateNodeColumns();
  UpdateGrid(cdata, grid_id);
}

function UpdateGridFromD3Links(agraph, grid_id) {
  var cdata = CreateDataColumnFromD3Links(agraph);
  //if grid doesnt exist creat it
  console.log(gridArray.length + " before");
  console.log(grid_id);
  //$('#tabs').tabs('load', 1);
  //$("div#tabs-2").show();
  if (gridArray.length < grid_id + 1) {
    console.log("createGrid ?");
    var parentId = "tabs-2";
    var options = CreateOptions();
    var grid = CreateGrid("grid_interaction", parentId, cdata.data, cdata.column, options);
    if (DEBUGLOG) {
      console.log("grid created ?");
      console.log(gridArray.length + " after");
      console.log(grid);
    }
  } else UpdateGrid(cdata, grid_id);
}

function UpdateGrid(cdata, grid_id) {
  if (DEBUGLOG) {
    console.log(gridArray.length + " before");
    console.log(cdata.column);
  }
  gridArray[grid_id].setColumns(cdata.column);
  gridArray[grid_id].dataView.beginUpdate();
  gridArray[grid_id].dataView.setItems(cdata.data);
  gridArray[grid_id].dataView.endUpdate();
  gridArray[grid_id].render();
  gridArray[grid_id].dataView.refresh();
  //this is not enought ?
  gridArray[grid_id].resizeCanvas();
  gridArray[grid_id].autosizeColumns();
  gridArray[grid_id].render();
  gridArray[grid_id].dataView.refresh();
  gridArray[grid_id].resizeCanvas();
  gridArray[grid_id].autosizeColumns();
}


function updateDataGridRowElem(grid_id, item_id, column_name, new_value) {
  //grid_id
  //row number
  //elem value
  //elem column
  //row[grid.getColumns()[args.cell].field] = a.msg;
  console.log(gridArray.length + " before");
  gridArray[grid_id].dataView.beginUpdate();
  gridArray[grid_id].invalidateRow(item_id);
  var arow = gridArray[grid_id].dataView.getItemById(item_id);
  arow[column_name] = new_value;
  gridArray[grid_id].dataView.updateItem(item_id, arow);
  gridArray[grid_id].dataView.endUpdate();
  gridArray[grid_id].render();
  gridArray[grid_id].dataView.refresh();
}

function CreateColumns() {
  var columns = [{
      id: "title",
      name: "Title",
      field: "title"
    },
    {
      id: "duration",
      name: "Duration",
      field: "duration"
    },
    {
      id: "%",
      name: "% Complete",
      field: "percentComplete"
    },
    {
      id: "start",
      name: "Start",
      field: "start"
    },
    {
      id: "finish",
      name: "Finish",
      field: "finish"
    },
    {
      id: "effort-driven",
      name: "Effort Driven",
      field: "effortDriven"
    },
    {
      id: "CountryOfOrigin",
      name: "Country Of Origin",
      field: "country",
      minWidth: 120,
      editor: AutoCompleteEditor,
      dataSource: countryList
    }
  ];
  return columns;
}

function CreateNodeColumns() {
  var columns = [{
      id: "id",
      name: "id",
      field: "id",
      sortable: true,
    },
    {
      id: "include",
      name: "include",
      field: "include",
      sortable: true,
      formatter: Slick.Formatters.Checkmark,
      editor: Slick.Editors.Checkbox
    }, //YesNoSelect
    {
      id: "uniprot",
      name: "uniprot",
      field: "uniprot",
      sortable: true,
      editor: Slick.Editors.Text
    }, //->uniprot search ?
    {
      id: "name",
      name: "name",
      field: "name",
      sortable: true,
      editor: Slick.Editors.Text
    }, //, validator: requiredFieldValidator
    {
      id: "size",
      name: "size",
      field: "size",
      sortable: true,
      editor: Slick.Editors.Integer
    },
    {
      id: "count",
      name: "count",
      field: "count",
      sortable: true,
      editor: Slick.Editors.Integer
    },
    {
      id: "molarity",
      name: "molarity",
      field: "molarity",
      sortable: true,
      editor: Slick.Editors.Float
    },
    {
      id: "molecularweight",
      name: "molecularweight",
      field: "molecularweight",
      sortable: true,
      editor: Slick.Editors.Float
    },
    {
      id: "surface",
      name: "surface",
      field: "surface",
      sortable: true,
      formatter: Slick.Formatters.Checkmark,
      editor: Slick.Editors.Checkbox
    }, //YesNoSelect
    {
      id: "label",
      name: "label",
      field: "label",
      sortable: true,
      editor: Slick.Editors.Text
    },
    /*{
      id: "geom",
      name: "geom",
      field: "geom",
      sortable: true,
      editor: Slick.Editors.Text
    },*/
    {
      id: "bu",
      name: "bu",
      field: "bu",
      sortable: true,
      editor: Slick.Editors.Text
    },
    {
      id: "selection",
      name: "selection",
      sortable: true,
      field: "selection",
      editor: Slick.Editors.Text
    },
    {
      id: "pdb",
      name: "pdb",
      field: "pdb",
      sortable: true,
      editor: Slick.Editors.Text
    },
/*    {
      id: "pcpalAxis",
      name: "pcpalAxis",
      field: "pcpalAxis",
      editor: Slick.Editors.Text
    }, //vector3
    {
      id: "offset",
      name: "offset",
      field: "offset",
      editor: Slick.Editors.Text
    }, //vector3
*/
    {
      id: "confidence",
      name: "confidence",
      field: "confidence",
      sortable: true,
      editor: Slick.Editors.Float
    },
    {
      id: "ingtype",
      name: "ingtype",
      field: "ingtype",
      sortable: true,
      options: "protein,ligand,fiber",
      editor: SelectCellEditor
    },
    {
      id: "buildtype",
      name: "buildtype",
      field: "buildtype",
      sortable: true,
      options: "random,file,supercell",
      editor: SelectCellEditor
    },

    {
      id: "compartment",
      name: "compartment",
      sortable: true,
      field: "compartment",
      minWidth: 120,
      editor: AutoCompleteEditor,
      dataSource: compartmentList
    },
    {
      id: "comments",
      name: "comments",
      sortable: true,
      field: "comments",
      minWidth: 120,
      editor: Slick.Editors.Text
    },
    {
      id: "image",
      name: "image",
      sortable: true,
      field: "image",
      minWidth: 120,
      formatter: renderImageRecipeCell,
      //editor: ImgCellEditor
    }
  ];
  return columns;
}


function CreateData() {
  var data = [];
  for (var i = 0; i < 500; i++) {
    data[i] = {
      title: 'United States;India',
      duration: "5 days",
      percentComplete: Math.round(Math.random() * 100),
      start: "01/01/2009",
      finish: "01/05/2009",
      effortDriven: (i % 5 == 0),
      country: countryList[Math.trunc(Math.random() * countryList.length)]
    };
  }
  return data;
}

function CreateDefaultGrid(elementId, parentId) {
  var data = CreateData();
  var column = CreateColumns();
  var options = CreateOptions();
  CreateGrid(elementId, parentId, data, column, options);
}

function grid_LoadMultiplePDBs(agrid, rowsids) {
  if (rowsids.length > 1) {
    //use the ngl grid
    var pdbs = {};
    for (var i = 0; i < rowsids.length; i++) {
      console.log(rowsids[i]);
      var row = agrid.dataView.getItem(rowsids[i]);

      var nsi = parseInt(row.id.split("_")[1]);

      if (row.pdb) pdbs[row.pdb] = nsi;
      else  pdbs[row.structureId] = -1;//.push((row.pdb) ? {row.pdb:nsi} : {row.structureId:-1} );
      //console.log((row.pdb) ? {row.pdb:nsi}: {row.structureId:-1} );
    }
    console.log(pdbs);
    NGLg_loadList(pdbs);
  }
}
//
function updateCellValue(agrid, acolumn, acellrowindex, avalue) {
  console.log("update using id ", acellrowindex); //undefined ?
  var row = agrid.dataView.getItemById(acellrowindex);
  if (row) {
    row[acolumn] = avalue;
    agrid.dataView.beginUpdate();
    //agrid.invalidateRow(row.id);
    agrid.dataView.updateItem(acellrowindex, row);
    agrid.dataView.endUpdate();
    agrid.render();
    agrid.dataView.refresh();
  }
}

function updateCellValues(agrid, acellrowindex, somecolumns, somevalues) {
  var row = agrid.dataView.getItemById(acellrowindex);
  for (var i = 0; i < somecolumns.length; i++) {
    row[somecolumns[i]] = somevalues[i];
  }
  agrid.dataView.beginUpdate();
  //agrid.invalidateRow(row.id);
  agrid.dataView.updateItem(acellrowindex, row);
  agrid.dataView.endUpdate();
  agrid.render();
  agrid.dataView.refresh();
}


function SyncTableGraphCell(rowid, column, property) {
  var row = gridArray[0].dataView.getItemById(rowid);
  var ni = parseInt(row.id.split("_")[1]);
  var n = graph.nodes[ni];
  if (property === "pdb") {
    if (!n.data.source) n.data.source = {};
    n.data.source.pdb = row[column];
  } else n.data[property] = row[column];
}

var checkboxSelector = new Slick.CheckboxSelectColumn({
  cssClass: "slick-cell-checkboxsel"
});


function CreateGrid(elementId, parentId, some_data, some_column, some_options, ind) {
  if (!gridArray) {
    gridArray = [];
  }
  //update the column list selec
  var length = gridArray.length;
  if (ind === 2) //uniprot grid
  {
    some_column.unshift(uniprot_detailView.getColumnDefinition());
    console.log(uniprot_detailView);
  }

  //grid_column_elem.options.length = 0;
  //for (var i = 0; i < some_column.length;i++) {
  // 	  grid_column_elem.options[grid_column_elem.options.length] = new Option(some_column[i].name, some_column[i].name);
  // }
  //grid_column_elem.options[grid_column_elem.options.length] = new Option("none","none");
  var groupOption = {}; //{ checkboxSelect: true, checkboxSelectPlugin: checkboxSelector };
  if (ind === 3) //pdbid.
  {
    groupOption = {
      checkboxSelect: true,
      checkboxSelectPlugin: checkboxSelector
    };
  }
  var groupItemMetadataProvider = new Slick.Data.GroupItemMetadataProvider(groupOption);
  dataView = new Slick.Data.DataView({
    groupItemMetadataProvider: groupItemMetadataProvider,
    inlineFilters: true
  });
  var grid = new Slick.Grid(elementId, dataView, some_column, some_options);
  grid.dataView = dataView;
  var gname = grid.getCanvasNode().parentNode.parentNode.id;
  console.log("should add a grid", gridArray.length, length);
  grid.gname = gridIds[ind];
  grid.ind = ind;
  gridArray[ind] = grid;
  console.log("should have add a grid", gridArray.length);
  //attachAutoResizeDataGrid(grid, elementId, "BottomPane");//parentId);
  grid.setOptions({
    autoEdit: false
  })
  grid.setOptions({
    editable: true
  });
  grid.setOptions({
    multiColumnSort: false
  });
  //grid.setOptions({autoHeight:true});
  if (ind === 3) grid.setOptions({
    rowHeight: 50
  });
  grid.setSelectionModel(new Slick.RowSelectionModel());
  grid.registerPlugin(groupItemMetadataProvider);
  grid.registerPlugin(new Slick.AutoTooltips({
    enableForHeaderCells: true
  }));
  if (ind === 3) grid.registerPlugin(checkboxSelector);
  if (ind === 2) {
    console.log("uniprot_detailView");
    grid.registerPlugin(uniprot_detailView);
    uniprot_detailView.onBeforeRowDetailToggle.subscribe(function(e, args) {
      console.log('before toggling row detail', args.item);
    });
    uniprot_detailView.onAfterRowDetailToggle.subscribe(function(e, args) {
      console.log('after toggling row detail', args.item);
    });
    uniprot_detailView.onAsyncEndUpdate.subscribe(function(e, args) {
      console.log('finished updating the post async template', args.itemDetail);
    });
  }

  grid.onAddNewRow.subscribe(function(e, args) {
    var item = args.item;
    grid.invalidateRow(some_data.length);
    some_data.push(item);
    grid.updateRowCount();
    grid.render();
  });
  //grid.setOptions({autoEdit:false})
  var columnpicker = new Slick.Controls.ColumnPicker(some_column, grid, some_options);

  var pager = new Slick.Controls.Pager(dataView, grid, $("#pager-" + ind));
  grid.pager = pager;
  console.log("#pager-" + ind);
  console.log(pager);

  grid.onSort.subscribe(function(e, args) {
    var col = args.sortCol;
    var sign = args.sortAsc ? 1 : -1;
    // We'll use a simple comparer function here.
    //var comparer =
    console.log("sort?", args);
    grid.dataView.sort(function(a, b) {
      var value1 = a[args.sortCol.field];
      var value2 = b[args.sortCol.field];
      if (args.sortCol.field === "id") {
        if (typeof value1 === 'string' || value1 instanceof String) value1 = parseInt(value1.split("_")[1]);
        if (typeof value2 === 'string' || value2 instanceof String) value2 = parseInt(value2.split("_")[1]);
      }
      return (value1 == value2 ? 0 : (value1 > value2 ? 1 : -1)) * sign;
      //return (a[args.sortCol.field] > b[args.sortCol.field]) ? 1 : -1;
    }); //, args.sortAsc
  });
  // wire up model events to drive the grid

  grid.onCellChange.subscribe(function(e, args) {
    recipe_changed = true;
    grid_tab_label[0].text ( "*" );
    console.log("Cell changed", e, args, grid.gname);
    var cell = args.cell; //grid.getCellFromEvent(e);
    console.log(cell)
    var arow = grid.dataView.getItem(args.row);
    var ni = parseInt(arow.id.split("_")[1]);
    console.log(ni);
    var cid = grid.getColumns()[cell].id;//"pdb"?
    console.log(cid);
    if (grid.gname === "grid_recipe") {
      console.log(ni); //11
      var n = graph.nodes[ni];
      console.log(n);
      //n.data.surface = arow.surface;
      //change parent
      var parentstring_ar = arow.compartment.split("/"); //split on /
      console.log(parentstring_ar, parentstring_ar.length);
      var depth = parentstring_ar.length;
      var parentstring = parentstring_ar[parentstring_ar.length - 1]; //.slice(-1,parentstring.length);
      var pnode = getNodeByName(parentstring);
      if (n.parent) {
        var index = n.parent.children.indexOf(n);
        n.parent.children.splice(index, 1);
        n.parent = pnode;
        n.depth = depth;
      }
      /*
      n.data.name = arow.name;
      n.data.size = arow.size;
      n.data.count = arow.count;
      n.data.molarity = arow.molarity;
      n.data.label = arow.label;
      //n.data.geom = arow.geom;
      n.data.bu = arow.bu;
      n.data.selection = arow.selection;
      n.data.uniprot = arow.uniprot;


      n.data.pcpalAxis = (Array.isArray(arow.pcpalAxis)) ? arow.pcpalAxis : arow.pcpalAxis.split(",").map(function(d) {
        return parseFloat(d);
      });
      n.data.offset = (Array.isArray(arow.offset)) ? arow.offset : arow.offset.split(",").map(function(d) {
        return parseFloat(d);
      });*/
      //update with only the changed data
      console.log("updateAttributesNode ",cid);
      n = updateAttributesNode(n,arow,cid);
      console.log(n);
      console.log("offset is ", n.data.offset, n.data.pcpalAxis);
      //n.data."pos":p,"radii":r};
      console.log("surface ", arow.surface, n.data.name)
      if (pnode) console.log(pnode.data.name);
      console.log("new depth is " + depth);
      //compare to other children depth
      if (pnode) {
        console.log(pnode);
        //console.log(pnode.children[0].depth);
      }

      simulation.alpha(1).alphaTarget(0).restart();
      //update ngl?
      //if (!n.data.source) n.data.source = {};
      //n.data.source.pdb = arow.pdb;
      if (cid==="pdb") NGL_UpdateWithNode(n,true);//arow.pdb)
      //NGL_Load(arow.pdb,arow.bu,arow.selection);	also update pcp and offset
    } else if (grid.gname === "grid_uniprot") {
      //is it the picked  checkbox
      if (cid === "picked") {
        if (uni_picked !== ni) {
          //uncheck
          //var oldrow = grid.dataView.getItem("id_"+uni_picked);
          //oldrow.picked = false;
          //grid.dataView.updateItem("id_"+uni_picked, oldrow);
          updateCellValue(grid, "picked", "id_" + uni_picked, false)
          uni_picked = ni;
          //update grid recipe
          var item = gridArray[0].dataView.getItem(gridArray[0].getActiveCell().row);
          console.log(arow["Entry"], arow["Protein names"].split("(")[0]);
          updateCellValues(gridArray[0], item.id, ["uniprot", "label"], [arow["Entry"], arow["Protein names"].split("(")[0]]);
        }
      }
    } else if (grid.gname === "grid_pdb") {
      //is it the picked  checkbox
      if (cid === "picked") {
        if (pdb_picked !== ni) {
          //uncheck
          updateCellValue(grid, "picked", "id_" + pdb_picked, false)
          pdb_picked = ni;
          //update grid recipe
          var item = gridArray[0].dataView.getItem(gridArray[0].getActiveCell().row);
          console.log(arow);
          updateCellValue(gridArray[0], "pdb", item.id, arow["structureId"]);
        }
      }
    }
  });
  grid.onSelectedRowsChanged.subscribe(function(e, args) {
    var rowsids = grid.getSelectedRows();
    //depends on which grid we are on
    if (grid.gname === "grid_recipe" || grid.gname === "grid_pdb")
      grid_LoadMultiplePDBs(grid, rowsids);
  });
  grid.onDblClick.subscribe(function(e, args) {
    console.log("doubleClick");
    console.log(e);
    console.log(args);
    var cell = grid.getCellFromEvent(e);
    var cid = grid.getColumns()[cell.cell].id;
    var arow = grid.dataView.getItem(args.row);
    console.log(grid.gname);
    current_row = arow;
    if (cid === "image" && grid.gname === "grid_recipe") {
      //set the current row current_grid_row and node_selected
      //browse
      $('#img_file_input').trigger('click');
    }
  });
  grid.onClick.subscribe(function(e, args) {
    //check if multiple row selected
    ngl_force_build_beads = false;
    console.log("event", e);
    console.log("args", args);
    if (e.target.className === "slick-group-select-checkbox checked" && grid.gname === "grid_pdb") {
      //click on a group
      console.log(e.target.nextElementSibling); //the collpasable button
      var elems = e.target.nextElementSibling.nextElementSibling.innerText.split(" ");
      var datapdb = elems[1];
      console.log(datapdb);
      //toggle off previous group or selected pdb
      //udpate the selected row in main grid
      var rowsids = gridArray[0].getSelectedRows();

      //current selected row
      if (!group_picked || group_picked !== e.target) {
        //uncheck
        if (pdb_picked) {
          updateCellValue(grid, "picked", "id_" + pdb_picked, false)
          pdb_picked = null;
        }
        if (group_picked) group_picked.setAttribute("class", "slick-group-select-checkbox unchecked");
        //update grid recipe
        var row = gridArray[0].dataView.getItem(rowsids[0]);
        console.log(row)
        if (row) {
          updateCellValue(gridArray[0], "pdb", row.id, elems[1]);
          //updateCellValue(gridArray[0],"pdb",row.id,elems[1]);
          //SyncTableGraphCell(row.id,"label","label");//update the graph
          SyncTableGraphCell(row.id, "pdb", "pdb"); //update the graph
        }
        group_picked = e.target;
      }
      return;
    }
    var cell = grid.getCellFromEvent(e);
    var cid = grid.getColumns()[cell.cell].id;
    var arow = grid.dataView.getItem(args.row);
    current_grid_row = arow.id;
    if (!arow) return;
    if (grid.gname === "grid_recipe") {
      //update pfv ?
      //console.log(arow);
      document.getElementById('ProteinId').innerHTML = arow.name; //arow.compartment+" "+arow.name+" : "+arow.pdb;
      //change the selected node accordingly
      clearHighLight();
      //or search by name ?
      node_selected_indice = parseInt(arow.id.split("_")[1]);
      node_selected = graph.nodes[node_selected_indice];
      nodes_selections=[];
      console.log("clicked on " + node_selected.data.name);
      SetObjectsOptionsDiv(node_selected);
      if ("uniprot" in arow && cid === "uniprot") {
        //node_selected = null;
        if (arow.uniprot && arow.uniprot !== "") {
          console.log("arow.uniprot " + arow.uniprot);
          //update the uniprot table with the stored session
          if (usesavedSession) {
            var rowsids = args.row; //gridArray[0].getSelectedRows();
            console.log("uni_" + rowsids);
            var savedData = sessionStorage.getItem("uni_" + rowsids); //,{"query":querytxt,"data":cdata}
            //if (savedData !== null) console.log("found ",savedData);
            if (savedData !== null) {
              var sdata = JSON.parse(savedData);
              console.log("update grid data 2", )
              //apply textedtiro on all ?
              sdata.data.column.forEach(function(c) {
                c.editor = Slick.Editors.Text;
              });
              sdata.data.column.push({
                id: "picked",
                name: "picked",
                field: "picked",
                formatter: Slick.Formatters.Checkmark,
                editor: Slick.Editors.Checkbox
              });
              sdata.data.column.unshift(uniprot_detailView.getColumnDefinition());
              UpdateGrid(sdata.data, 2);
              document.getElementById("LoaderTxt").innerHTML = "query uniprot : " + savedData.querytxt;
              document.getElementById("Query_3").value = savedData.querytxt;

            }
          }
          console.log("PFV for " + arow.uniprot)
          console.log(arow.uniprot)
          //update pfv
          //console.log(arow.uniprot + " " + featureView.uniprotId);
          if (arow.uniprot !== "") { //featureView.uniprotId) {
            if (arow.pdb && arow.pdb != "None" && arow.pdb != "") {
              var apdb = arow.pdb.split("_")[0];
              if (apdb.length === 4){
                if (featureView){
                  featureView.addPDB(apdb);
                }
              }
            }
            if (featureView) {
              document.getElementById("up-field").value = arow.uniprot;
              featureView.singlePDBmode = false;
              featureView.setUniprotId(arow.uniprot);
              featureView.setDefaultTracks();
              featureView.loadUniprot(arow.uniprot);
            }
            //the pvf features to protvista e.g. pdb,model,pfam...
            setupProVista(arow.uniprot);
            console.log(protvista_instance);
            UpdateUniPDBcomponent(arow.uniprot);
            //add the current PDb if any and split
            //this overwrite the current NGL
            //featureView.uniprotId = arow.uniprot;
          }

        }else {
          if (arow.pdb !=="") {
            var entry = CleanEntryPDB(arow.pdb.toLowerCase());
            current_list_pdb=[entry]
            customReport(entry);//should update the uniprot
          }
          else {
            //left or shift click ?
            console.log("fetch uniprot " + arow.uniprot)
            //place the query in the text input
            document.getElementById("Query_3").value = arow.name.split("_").join("+");
            queryUniportKBfromName(arow.name);
        }
        }
        //check if there is a pdb and update NGL and other widget
        if (arow.pdb !=="") {
          NGL_UpdateWithNode(node_selected);
          UpdatePDBcomponent(arow.pdb.toLowerCase());
        }
        else {UpdatePDBcomponent("");}
      } else {
        console.log("ngl_current_item_id", ngl_current_item_id);
        console.log("arow.id", arow.id);
        if (cid === "pdb") {
          //ngl_load_params = {"dogeom":false,"geom":null,
          //			"dobeads":false,"beads":null,
          //		"doaxis":false,"axis":null};
          node_selected.data.visited = true;
          if (node_selected.data.geom) { //arow.geom ||
            console.log(node_selected.data.geom)
            //var geom_name = node_selected.data.geom.split('.')[0];
            //var ext = geom_name.split('.').pop();
            if ("geom_type" in node_selected.data) {
              ngl_load_params.geom = node_selected.data.geom; //geom_purl + geom_name + ".obj"; //NGL_LoadAShapeObj(  );
              ngl_load_params.dogeom = true;
              //if (node_selected.data.geom_type==="raw"){
              //do the NGL_ShowMeshVFN
              //  ngl_load_params.geom = node_selected.data.geom;//geom_purl + geom_name + ".obj"; //NGL_LoadAShapeObj(  );
              //  ngl_load_params.dogeom = true;
              //}
            }
            //else if (geom_name.toLowerCase() !== "x") {
            //     ngl_load_params.geom = arow.geom;//geom_purl + geom_name + ".obj"; //NGL_LoadAShapeObj(  );
            //  ngl_load_params.dogeom = true;
            //}
          }
          console.log("position ?", node_selected.data);
          if ("pos" in node_selected.data && node_selected.data.pos && node_selected.data.pos.length !== 0) {
            console.log("found position ?", JSON.stringify(node_selected.data.pos), JSON.stringify(node_selected.data.radii));
            ngl_load_params.beads = {
              "pos": node_selected.data.pos,
              "rad": node_selected.data.radii
            };
            ngl_load_params.dobeads = true;
            //NGL_LoadSpheres( node_selected.data.pos,node_selected.data.radii );
          } else {
            console.log("no position?", console.log(node_selected.data));
            //ngl_force_build_beads = true;
            //console.log ("query the beads");
            //var remote_url = 'http://mgldev.scripps.edu/cgi-bin/cellpack_db_dev.py?beads={"url":"'+purl+'","bu":'+bu+',"sel":"'+sele+'"}';
            //console.log(remote_url);
            //callAjax(remote_url, NGL_setupBeads);
          }
          console.log("doaxis", "offset" in node_selected.data);
          if ("offset" in node_selected.data) {
            ngl_load_params.axis = {
              "axis": node_selected.data.pcpalAxis,
              "offset": node_selected.data.offset
            }
            ngl_load_params.doaxis = true;
            console.log("doaxis", ngl_load_params.axis);
            //NGL_ShowAxisOffset( d.data.pcpalAxis,d.data.offset );
          }

          //use NGL_UpdateWithNode instead?
          if (arow.pdb && arow.pdb.toLowerCase() != "none" && arow.pdb != "") {
            if (ngl_grid_mode) {
              NGL_ClearGridMode();
            }
            var aname = arow.pdb;
            if (aname.length === 4 ) aname = aname.toUpperCase();
            else aname = name.replace(".pdb","")
            //fiber use the ingredient name
            if (arow.ingtype === "fiber") aname = arow.name;
            MS_Highlight(aname)
            if (ngl_current_item_id !== arow.id || !ngl_current_structure ) {
              console.log("update NGL by removing all component");
              stage.removeAllComponents();
              ngl_current_node = node_selected;
              console.log(arow.pdb, arow.bu, arow.selection);
              NGL_Load(arow.pdb, arow.bu, arow.selection);
            }
            else {
                //not pdb_component_enable?
                if ( document.getElementById("pdb_component_enable").checked)//sequence_mapping
                    NGL_pdbComponentPost(arow.pdb,arow.uniprot);
                else NGL_cleanpdbComponentPost();
            }
          } else {
            //do nothing
            stage.removeAllComponents();
            ngl_current_node = node_selected;
            SetObjectsOptionsDiv(node_selected);
            NGL_noPdbProxy(node_selected,node_selected.data.name,node_selected.data.size);
          }
          ngl_current_item_id = arow.id;
        }
      }
    } else if (grid.gname === "grid_interaction") {
      node_selected = null;
      ngl_current_item_id = arow.id;
      stage.removeAllComponents();
      NGL_Load(arow.pdb1, "AU", GetNGLSelection(arow.sel1 + "," + arow.sel2, ""));
      document.getElementById('ProteinId').innerHTML = arow.name1 + " " + arow.name2;
    } else if (grid.gname === "grid_uniprot") {
      //send the selection to the main recipe
      //var rowsids = gridArray[0].getSelectedRows()[0];
      node_selected = null;
      if (cid == "Entry") {
        //the pvf features to protvista e.g. pdb,model,pfam...
        setupProVista(arow.Entry);
        if (featureView) {
          document.getElementById("up-field").value = arow.Entry;
          featureView.loadUniprot(arow.Entry);
        }
      }
      //if (arow.Entry !== featureView.uniprotId && cid === "Entry") {
      //  console.log(arow.Entry + " " + featureView.uniprotId);
      //  //featureView.loadUniprot(arow.Entry);
      //  //featureView.uniprotId = arow.Entry;
      //  console.log("after");
      //}
    } else if (grid.gname === "grid_pdb") {
      node_selected = null;
      console.log("pdbsearch click");
      console.log(e);
      console.log(args);
      //send the selection to the main recipe
      if ("uniprotAcc" in arow && cid === "uniprotAcc") {
        setupProVista(arow.uniprotAcc);
        if (featureView) {
          document.getElementById("up-field").value = arow.uniprotAcc;
          featureView.singlePDBmode = false;
          featureView.setUniprotId(arow.uniprotAcc);
          featureView.setDefaultTracks();
          featureView.loadUniprot(arow.uniprotAcc);
        }
      } else {
        if (ngl_current_item_id !== arow.structureId) {
          stage.removeAllComponents();
          ngl_current_item_id = arow.structureId;
          //selection is the chain Id
          ngl_current_node = null;
          NGL_Load(arow.structureId, "AU", ":" + arow.chainId);
        }
      }
    }
    e.stopPropagation();
  });

  grid.onContextMenu.subscribe(function (e) {
      e.preventDefault();
      var cell = grid.getCellFromEvent(e);
      $("#grid_contextMenu")
          .data("row", cell.row)
          .css("top", e.pageY)
          .css("left", e.pageX)
          .show();

      $("body").one("click", function () {
        $("#grid_contextMenu").hide();
      });
    });

    $("#grid_contextMenu").click(function (e) {
       if (!$(e.target).is("li")) {
         return;
       }
       if (!grid.getEditorLock().commitCurrentEdit()) {
         return;
       }
       var arow = grid.dataView.getItem($(this).data("row"));
       if (!(arow)) arow = node_selected.data;
       var query_ = $(e.target).attr("data");
       var query = arow[query_];
       console.log("query PDB for " + query_+" "+query);
       if (query !== "protein_name" && query !== "" && query !== null) {
         document.getElementById("Query_4").value = query.split("_").join(" ");
         queryPDBfromName(query);
         if (ngl_load_params.dogeom) {
           NGL_LoadAShapeObj(null,ngl_load_params.geom);
           ngl_load_params.dogeom = false;
         }
         if (ngl_load_params.dobeads) {
           NGL_LoadSpheres(ngl_load_params.beads.pos, ngl_load_params.beads.rad);
           ngl_load_params.dobeads = false;
         }
         if (ngl_load_params.doaxis) {
           NGL_ShowAxisOffset(ngl_load_params.axis.axis, ngl_load_params.axis.offset);
           ngl_load_params.doaxis = false;
         }
       }
       //data[row].priority = $(e.target).attr("data");
       //grid.updateRow(row);
     });

  dataView.onRowCountChanged.subscribe(function(e, args) {
    grid.updateRowCount();
    grid.render();
  });
  dataView.onRowsChanged.subscribe(function(e, args) {
    grid.invalidateRows(args.rows);
    grid.render();

  });

  dataView.beginUpdate();
  if (some_data && some_data.length) dataView.setItems(some_data);
  dataView.endUpdate();
  dataView.setGrouping([])
  grid.render();
  dataView.refresh();
  return grid;
}

function groupByCompartmentSurface() {
  gridArray[0].dataView.setGrouping([{
      getter: "compartment",
      formatter: function(g) {
        return "Compartment:  " + g.value + "  <span style='color:green'>(" + g.count + " items)</span>";
      },
      //aggregators: [
      //  new Slick.Data.Aggregators.Avg("molarity"),
      //  new Slick.Data.Aggregators.Sum("count")
      //],
      aggregateCollapsed: false,
      lazyTotalsCalculation: true
    },
    {
      getter: "surface",
      formatter: function(g) {
        return "Surface:  " + g.value + "  <span style='color:green'>(" + g.count + " items)</span>";
      },
      //aggregators: [
      //  new Slick.Data.Aggregators.Avg("molarity"),
      //  new Slick.Data.Aggregators.Sum("count")
      //],
      collapsed: true,
      lazyTotalsCalculation: true
    }
  ]);
}

function groupByElem_cb(gridid, selemvalue) {
  if (selemvalue === "none") {
    gridArray[gridid].dataView.setGrouping([]);
    return;
  }
  //formater row, cell, value, columnDef, dataContext
  var aformater = function(g) {
    return selemvalue + ":  " + g.value + "  <span style='color:green'>(" + g.count + " items)</span>";
  }
  if (gridid === 3 && selemvalue === "structureId") //pdb
  {
    //use the preview image
    aformater = function(g) {
      var html = getImageHtmlPDB(g.value);
      html += selemvalue + ":  " + g.value;
      html += " " + g.rows[0].structureTitle;
      html += " " + g.rows[0].uniprotRecommendedName;
      html += " " + g.rows[0].experimentalTechnique;
      //html+=" picked : "+g.rows[0].picked;
      html += " <span style='color:green'>(" + g.count + " items)</span>";
      return html;
    }
  }

  gridArray[gridid].dataView.setGrouping({
    getter: selemvalue,
    formatter: aformater,
    //aggregators: [
    //  new Slick.Data.Aggregators.Avg("molarity"),
    //  new Slick.Data.Aggregators.Sum("count")
    //],
    aggregateCollapsed: true,
    lazyTotalsCalculation: true
  });
  if (gridid === 3 && selemvalue === "structureId")
    gridArray[gridid].dataView.collapseAllGroups(); //collapse everything
}

function groupByElem(selem) {
  //second group by ?
  groupByElem_cb(current_grid, selem.value);
}

function grid_UpdateSelectionPdbFromId(node_id) {
  //dataView.expandAllGroups() so that it goes to itr
  //$('#tabs').tabs('load', 0);
  //$("div#tabs-1").show();
  gridArray[0].dataView.expandAllGroups();
  var test = gridArray[0].dataView.getRowById(node_selected.data.id);
  console.log("atest ", test);
  gridArray[0].setSelectedRows([test]);
  gridArray[0].setActiveCell(test, 7); //7 is currently pdb
  gridArray[0].gotoCell(test, 7, false);
  current_grid_row = test.id;
}

function SelectRowFromId(node_id) {
  var test = gridArray[0].dataView.getRowById(node_id);
  console.log("atest ", test);
  current_grid_row = test.id;
  gridArray[0].setSelectedRows([test]);
}

function UpdateSelectionInteractionFromId(node_id) {
  console.log(node_id + " update grid selection ?");
  //show table 2
  //$('#tabs').tabs('load', 1);
  // $("div#tabs-2").show();
  if (!gridArray[1]) return;
  gridArray[1].dataView.expandAllGroups();
  var test = gridArray[1].dataView.getRowById(node_id);
  console.log("atest ", test);
  gridArray[1].setSelectedRows([test]);
  //gridArray[0].setActiveCell(test,7);//7 is currently pdb
}
//var grid;
//var columns = CreateColumns();
//var data = CreateData();

//grid = new Slick.Grid("#slickGrid", data, columns, options);
function changeCurrentGrid(gid) {
  current_grid = gid;
  console.log("current_grid", gid, current_grid);
  //get the column of the current grid
  //and update the select
  if (!gridArray || gridArray.length < 2) return;
  var columns = gridArray[gid].getColumns();
  console.log(columns);
  if (!grid_column_elem)
    grid_column_elem = document.getElementById("column_type");
  grid_column_elem.options.length = 0;
  grid_column_elem.options[0] = new Option("none", "none");
  for (var i = 0; i < columns.length; i++) {
    if (columns[i].name && columns[i].name !== "") grid_column_elem.options[grid_column_elem.options.length] = new Option(columns[i].name, columns[i].name);
  }
  //force chamging the tab.
  //problem the css compatibility with pfv
}

function refineQuery(e) {
  console.log(e);
  console.log(e.id); //type of query e.g. uniprot or pdb,if PDb can be a text or a sequence!
  var isseq = document.getElementById("sequence_search").checked;
  var qtype = parseInt(e.id.split("_")[1]);
  var elem = document.getElementById("Query_"+qtype).value;
  if (qtype === 3) //uniprot
  {
    queryUniportKBfromName(elem);
  } else if (qtype === 4) {
    if (elem.slice(0, 2) === "S:" || isseq) {
      console.log("query PDB blast search");
      queryPDBfromSequence(elem);
    } else {
      console.log("query PDB for " + elem);
      //check if sequence search
      queryPDBfromName(elem);
    }
  }
}


function AddTab(tab_name, grid_name) {
  var toggle = "";
  if (grid_name === "grid_pdb") {
    toggle = '<label for="sequence_search"> Sequence </label><input type="checkbox" name="sequence_search" id="sequence_search">'
  }
  var num_tabs = $("div#tabs ul li").length + 1;
  $("div#tabs ul").append(
    "<li onclick='changeCurrentGrid(" + (num_tabs - 1) + ")'><a href='#tab-" + num_tabs + "'>" + tab_name + "</a></li>"
  );
  $("div#tabs").append(
    "<div id='tab-" + num_tabs + "'>" +
    "<input type='text' class='input-medium form-control' placeholder='Query' id='Query_" + num_tabs + "' onchange='refineQuery(this)'>" +
    toggle +
    '<div id="' + grid_name + '" style="width:600px;height:300px;" class="my-grid"></div>' +
    '<div id="pager-' + num_tabs + '" style="width:100%;height:20px;"></div>' +
    "</div>"
  );
  $("div#tabs").tabs("refresh");
  return num_tabs;
}



//or change PDB ?
function removeRow() {
  //take selected row
  var rowsids = gridArray[current_grid].getSelectedRows();
  console.log("delete rows", rowsids);
  for (var i = 0; i < rowsids.length; i++) {
    //delete the row, and the associated node
    var arow = gridArray[current_grid].dataView.getItem(rowsids[i]);
    console.log(arow);
    if (current_grid === 0) {
      var _indice = parseInt(arow.id.split("_")[1]);
      var _node = graph.nodes[_indice];
      var index = _node.parent.children.indexOf(node_over_to_use);
      if (index > -1) {
        _node.parent.children.splice(index, 1);
      }
      //remove from the graph
      index = graph.nodes.indexOf(_node);
      graph.nodes.splice(index, 1);
    }
    if (current_grid === 1) {
      var _indice = arow.id;
      var _node = graph.links[_indice];
      //remove from the graph
      index = graph.links.indexOf(_node);
      graph.nodes.splice(index, 1);
    }
    gridArray[current_grid].dataView.deleteItem(arow.id);
  }
  gridArray[current_grid].invalidate();
  gridArray[current_grid].render();
  gridArray[current_grid].dataView.refresh();
  gridArray[current_grid].setSelectedRows([]);
}

function addRow() {
  var grid = gridArray[current_grid];
  var row_to_edit;
  var columns = grid.getColumns();

  if (current_grid === 0) {
    item_id = 0;
    //add an empty row data
    var newId = graph.nodes.length; //grid.dataView.getLength();
    //var arow = grid.dataView.getItem(0);
    row_to_edit = {}; //JSON.parse(JSON.stringify(arow));
    row_to_edit.id = "id_" + newId;
    row_to_edit.name = "protein_name";
    row_to_edit.size = 40;
    row_to_edit.count = 0;
    row_to_edit.molarity = 0.0;
    row_to_edit.surface = false;
    row_to_edit.label = "protein_label";
    row_to_edit.geom = "x";
    row_to_edit.bu = "AU";
    row_to_edit.selection = "";
    row_to_edit.pdb = "";
    row_to_edit.offset = [0, 0, 0];
    row_to_edit.pcpalAxis = [0, 0, 1];
    row_to_edit.compartment = "compartmenthierarchy";
    grid.dataView.beginUpdate();
    grid.dataView.insertItem(0, row_to_edit);
    grid.dataView.endUpdate();
    grid.dataView.setGrouping([])
    grid.render();
    grid.dataView.refresh();
    grid.setSelectedRows([0]);
    grid.setActiveCell(0, 0);
    AddANode(JSON.parse(JSON.stringify(row_to_edit)));

    //add a node
  } //insert at begining
  else if (current_grid === 1) {
    var arow = grid.dataView.getItem(0);
    row_to_edit = JSON.parse(JSON.stringify(arow));
    grid.dataView.beginUpdate();
    grid.dataView.insertItem(0, row_to_edit);
    grid.dataView.endUpdate();
    grid.dataView.setGrouping([])
    grid.render();
    grid.dataView.refresh();
    grid.setSelectedRows([0]);
    grid.setActiveCell(0, 0);
    AddALink(JSON.parse(JSON.stringify(row_to_edit)));
  }
  //openDetails(1);
  //openDetails for empty row?
  //newId = gridArray[0].dataView.getLength();
  //add row on current visible grid
  //var arow = gridArray[0].dataView.getItem(newId-1);
  //var newRow = JSON.parse(JSON.stringify(arow));
  //newRow.id = "id_"+newId + 1;
  //gridArray[0].dataView.insertItem(0, newRow);//insert at the begining;
}

function editRow() {
  //openDetails(0);
  //openDetails for empty row?
  //newId = gridArray[0].dataView.getLength();
  //add row on current visible grid
  //var arow = gridArray[0].dataView.getItem(newId-1);
  //var newRow = JSON.parse(JSON.stringify(arow));
  //newRow.id = "id_"+newId + 1;
  //gridArray[0].dataView.insertItem(0, newRow);//insert at the begining;
}

function CreateInteractionFromSelection() {}

function MultipleRowSelection() {} //ngl_grid ?

//how to do it with the dataview ??
function openDetailsOld(newone) {

  var grid = gridArray[current_grid];
  var row_to_edit;
  var columns = grid.getColumns();
  if (newone === 1 && current_grid === 0) {
    item_id = 0;
    //add an empty row data
    var newId = graph.nodes.length; //grid.dataView.getLength();
    //var arow = grid.dataView.getItem(0);
    row_to_edit = {}; //JSON.parse(JSON.stringify(arow));
    row_to_edit.id = "id_" + newId;
    row_to_edit.name = "protein_name";
    row_to_edit.size = 10;
    row_to_edit.count = 0;
    row_to_edit.molarity = 0.0;
    row_to_edit.surface = false;
    row_to_edit.label = "protein_label";
    row_to_edit.geom = "x";
    row_to_edit.bu = "AU";
    row_to_edit.selection = "";
    row_to_edit.pdb = "pdbid";
    row_to_edit.compartment = "compartmenthierarchy";
    grid.dataView.beginUpdate();
    grid.dataView.insertItem(0, row_to_edit);
    grid.dataView.endUpdate();
    grid.dataView.setGrouping([])
    grid.render();
    grid.dataView.refresh();
    grid.setSelectedRows([0]);
    grid.setActiveCell(0, 0);
    AddANode(JSON.parse(JSON.stringify(row_to_edit)));

    //add a node
  } //insert at begining
  else if (newone === 1 && current_grid === 1) {
    var arow = grid.dataView.getItem(0);
    row_to_edit = JSON.parse(JSON.stringify(arow));
    grid.dataView.beginUpdate();
    grid.dataView.insertItem(0, row_to_edit);
    grid.dataView.endUpdate();
    grid.dataView.setGrouping([])
    grid.render();
    grid.dataView.refresh();
    grid.setSelectedRows([0]);
    grid.setActiveCell(0, 0);
    AddALink(JSON.parse(JSON.stringify(row_to_edit)));
  } else {
    var item_id = grid.getActiveCell().row;
    console.log(grid.getActiveCell().row);
    row_to_edit = grid.dataView.getItem(item_id);
  }
  var cont = document.getElementById("itemDetailsTemplate");
  if (grid.getEditorLock().isActive() && !grid.getEditorLock().commitCurrentEdit()) {
    return;
  }

  console.log(row_to_edit);
  var $modal = $("<div class='item-details-form modal'></div>");
  $modal = $("#itemDetailsTemplate")
    .tmpl({
      context: row_to_edit, //grid.getDataItem(grid.getActiveCell().row),
      columns: columns
    })
    .appendTo("body");

  var cssmodal = document.getElementById("slickdetail");
  var span = document.getElementById("closeslickdetail");

  cssmodal.style.display = "block";

  $modal.keydown(function(e) {
    if (e.which == $.ui.keyCode.ENTER) {
      grid.getEditController().commitCurrentEdit();
      e.stopPropagation();
      e.preventDefault();
    } else if (e.which == $.ui.keyCode.ESCAPE) {
      grid.getEditController().cancelCurrentEdit();
      e.stopPropagation();
      e.preventDefault();
    }
  });

  $modal.find("[data-action=save]").click(function() {
    //?
    grid.getEditController().commitCurrentEdit();
    //should actually use the dataView for all column
    //these are the IDs for the inputs on my dialog

    var item = row_to_edit; //gridArray[0].dataView.getItem(item_id);//dataView.getItemById(item_id);
    console.log(item_id);
    console.log(item);
    for (var k in item) {
      //find the input
      console.log(k);
      //if (k==="id") {item["id"] = row_to_edit.id};
      var dialog_parent = document.querySelectorAll('[data-editorid="' + k + '"]')[0]; //cont.find("[data-editorid=" + k + "]");
      if (dialog_parent) {
        var dialogv = dialog_parent.getElementsByTagName("input")[0].value;
        item[k] = dialogv;
      }
    }
    grid.dataView.beginUpdate();
    grid.dataView.updateItem(item["id"], item);
    grid.dataView.endUpdate();
    grid.dataView.setGrouping([])
    grid.render();
    grid.dataView.refresh();
  });

  $modal.find("[data-action=cancel]").click(function() {
    grid.getEditController().cancelCurrentEdit();
    cssmodal.style.display = "none";
    $modal.remove();
  });

  var containers = $.map(columns, function(c) {
    return $modal.find("[data-editorid=" + c.id + "]");
  });

  var compositeEditor = new Slick.CompositeEditor(
    columns,
    containers, {
      destroy: function() {
        $modal.remove();
      }
    }
  );

  // When the user clicks on <span> (x), close the modal
  span.onclick = function() {
    grid.getEditController().cancelCurrentEdit();
    cssmodal.style.display = "none";
    $modal.remove();
  }
  grid.editActiveCell(compositeEditor); //thats where the editor comes from
}

function grid_addToModalDiv(parentContainer, divclass, innerHtml) {
  var div = document.createElement("div");
  div.setAttribute("class", divclass);
  var label = document.createElement("label");
  label.innerHTML = innerHtml;
  div.appendChild(label);
  parentContainer.appendChild(div);
  return div;
}

function getEditorDetails() {
  //if (grid.getEditorLock().isActive() && !grid.getEditorLock().commitCurrentEdit()) {
  //  return;
  //}
  var container_ = document.getElementById("objectOptions");
  var grid = gridArray[0];
  var columns = grid.getColumns();
  var $modal = $("<div class='item-details-form'></div>");
  $modal = $("#itemDetailsTemplate")
      .tmpl({
        context: grid.getDataItem(grid.getActiveCell().row),
        columns: columns
      })
      .appendTo(container_);
  $modal.keydown(function (e) {
    if (e.which == $.ui.keyCode.ENTER) {
      grid.getEditController().commitCurrentEdit();
      e.stopPropagation();
      e.preventDefault();
    } else if (e.which == $.ui.keyCode.ESCAPE) {
      grid.getEditController().cancelCurrentEdit();
      e.stopPropagation();
      e.preventDefault();
    }
  });
  $modal.find("[data-action=save]").click(function () {
    grid.getEditController().commitCurrentEdit();
  });
  $modal.find("[data-action=cancel]").click(function () {
    grid.getEditController().cancelCurrentEdit();
  });
  var containers = $.map(columns, function (c) {
    return $modal.find("[data-editorid=" + c.id + "]");
  });
  var compositeEditor = new Slick.CompositeEditor(
      columns,
      containers,
      {
        destroy: function () {
          //$modal.remove();
        }
      }
  );
  grid.editActiveCell(compositeEditor);
}

function openDetails(newone) {

  var grid = gridArray[current_grid];
  var row_to_edit;
  var columns = grid.getColumns();
  if (newone === 1 && current_grid === 0) {
    item_id = 0;
    //add an empty row data
    var newId = graph.nodes.length; //grid.dataView.getLength();
    //var arow = grid.dataView.getItem(0);
    row_to_edit = {}; //JSON.parse(JSON.stringify(arow));
    row_to_edit.id = "id_" + newId;
    row_to_edit.name = "protein_name";
    row_to_edit.size = 10;
    row_to_edit.count = 0;
    row_to_edit.molarity = 0.0;
    row_to_edit.surface = false;
    row_to_edit.label = "protein_label";
    row_to_edit.geom = "x";
    row_to_edit.bu = "AU";
    row_to_edit.selection = "";
    row_to_edit.pdb = "pdbid";
    row_to_edit.compartment = "compartmenthierarchy";
    grid.dataView.beginUpdate();
    grid.dataView.insertItem(0, row_to_edit);
    grid.dataView.endUpdate();
    grid.dataView.setGrouping([])
    grid.render();
    grid.dataView.refresh();
    grid.setSelectedRows([0]);
    grid.setActiveCell(0, 0);
    AddANode(JSON.parse(JSON.stringify(row_to_edit)));

    //add a node
  } //insert at begining
  else if (newone === 1 && current_grid === 1) {
    var arow = grid.dataView.getItem(0);
    row_to_edit = JSON.parse(JSON.stringify(arow));
    grid.dataView.beginUpdate();
    grid.dataView.insertItem(0, row_to_edit);
    grid.dataView.endUpdate();
    grid.dataView.setGrouping([])
    grid.render();
    grid.dataView.refresh();
    grid.setSelectedRows([0]);
    grid.setActiveCell(0, 0);
    AddALink(JSON.parse(JSON.stringify(row_to_edit)));
  } else {
    var item_id = grid.getActiveCell().row;
    console.log(grid.getActiveCell().row);
    row_to_edit = grid.dataView.getItem(item_id);
  }

  var modal_cont = document.getElementById("slickdetail");
  var item_cont = document.getElementById("slickitems");
  var span = document.getElementById("closeslickdetail");

  if (grid.getEditorLock().isActive() && !grid.getEditorLock().commitCurrentEdit()) {
    return;
  }
  var containers = [];
  console.log(row_to_edit);
  for (var i = 0; i < columns.length; i++) {
    var elem = grid_addToModalDiv(item_cont, 'item-details-label', columns[i].name);
    var editor = grid_addToModalDiv(item_cont, 'item-details-editor-container', "");
    editor.setAttribute("data-editorid", columns[i].id);
    //class='item-details-editor-container' data-editorid='${id}'
    //console.log(i,columns[i].name,editor);
    containers.push(editor);
  }
  //build the div
  /*
  var $modal = $("<div class='item-details-form modal'></div>");
  $modal = $("#itemDetailsTemplate")
      .tmpl({
        context: row_to_edit,//grid.getDataItem(grid.getActiveCell().row),
        columns: columns
      })
      .appendTo("body");

  var cssmodal = document.getElementById("slickdetail");
  */


  modal_cont.style.display = "block";
  /*
    $modal.keydown(function (e) {
      if (e.which == $.ui.keyCode.ENTER) {
        grid.getEditController().commitCurrentEdit();
        e.stopPropagation();
        e.preventDefault();
      } else if (e.which == $.ui.keyCode.ESCAPE) {
        grid.getEditController().cancelCurrentEdit();
        e.stopPropagation();
        e.preventDefault();
      }
    });
   */
  /*
    $modal.find("[data-action=save]").click(function () {
    	//?
     grid.getEditController().commitCurrentEdit();
      //should actually use the dataView for all column
          //these are the IDs for the inputs on my dialog

    var item = row_to_edit;//gridArray[0].dataView.getItem(item_id);//dataView.getItemById(item_id);
    console.log(item_id);
    console.log(item);
    for (var k in item) {
    	//find the input
    	console.log(k);
    	//if (k==="id") {item["id"] = row_to_edit.id};
    	var dialog_parent = document.querySelectorAll('[data-editorid="' + k + '"]')[0];//cont.find("[data-editorid=" + k + "]");
    	if (dialog_parent) {
    		var dialogv = dialog_parent.getElementsByTagName("input")[0].value;
    	  item[k] = dialogv;
    	}
    }
    grid.dataView.beginUpdate();
    grid.dataView.updateItem(item["id"], item);
    grid.dataView.endUpdate();
    grid.dataView.setGrouping([])
    grid.render();
    grid.dataView.refresh();
   });
*/
  /*
      $modal.find("[data-action=cancel]").click(function () {
        grid.getEditController().cancelCurrentEdit();
        cssmodal.style.display = "none";
        $modal.remove();
      });

     */
  // var containers = $.map(columns, function (c) {
  //   return $modal.find("[data-editorid=" + c.id + "]");
  // });

  var compositeEditor = new Slick.CompositeEditor(
    columns,
    containers, {
      destroy: function() {
        $modal.remove();
      }
    }
  );

  compositeEditor.show();
  // When the user clicks on <span> (x), close the modal
  span.onclick = function() {
    grid.getEditController().cancelCurrentEdit();
    modal_cont.style.display = "none";
    //$modal.remove();
  }
  grid.editActiveCell(compositeEditor); //thats where the editor comes from
}
/*
$('.imagepdb').mouseenter(function() {
	  console.log("img over");
    var img = document.getEmlementById('imagepdbclone');
    img.setAttribute("class", "show");
    img.src = $(this).src;
},);

$('.imagepdb').mouseleave(function() {
	//pass the image srce to other div
	console.log("img leave");
    document.getEmlementById('imagepdbclone').setAttribute("class", "hidden");
},);

*/
function showClone(elem) {
  console.log("img over");
  var img = document.getElementById('imagepdbclone');
  img.setAttribute("class", "show");
  img.src = elem.src;
}

function hideClone(elem) {
  console.log("img levae");
  document.getElementById('imagepdbclone').setAttribute("class", "hidden");
}
//Slick.Editors.LongText
//CreateDefaultGrid("slickGrid","tabs-1");
