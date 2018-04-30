var Loader = document.getElementById("aloader");
var LoaderTxt = document.getElementById("loadertxt");
var all_xmlhttp=[];

// this is synchronous - result returns only when called script provides it
 // ------------------------------------------------------------------------
 function syncpyRequestJson(spdq_myData)
 {
 var remote = '__Unset__';
 var request = new XMLHttpRequest();
 var remote_url;

  alert(spdq_myData);
 	remote_url = 'http://mgldev.scripps.edu/cgi-bin/cellpack_db_dev.py?file=' +spdq_myData; //encodeURIComponent(spdq_myData);
 	alert(remote_url);
 	request.open('GET', remote_url, false);  // false makes the request synchronous
 	//request.setRequestHeader('Content-Type', 'multipart/form-data');
 	request.send(null);

 	if (request.status === 200)
 	{
 		remote = request.responseText;
 	}
 	return(remote);
 }

 function syncpyRequestSQL()
 {
 var remote = '__Unset__';
 var request = new XMLHttpRequest();
 var remote_url;

 	remote_url = 'http://mgldev.scripps.edu/cgi-bin/cellpack_db_dev.py?key="sqldb"';
 	request.open('GET', remote_url, false);  // false makes the request synchronous
 	request.send(null);

 	if (request.status === 200)
 	{
 		remote = request.responseText;
 	}
 	return(remote);
 }


 function toggle(elem) {

 	}

 function toggleShow(elem)
 {
 	    elem.setAttribute("class", "spinner show" );
 	    document.getElementById("LoaderTxt").setAttribute("class", "show");
 	}

  function toggleHide(elem){
			elem.setAttribute("class", "spinner hidden" );
			document.getElementById("LoaderTxt").setAttribute("class", "hidden");
 	}

function remove(array, element) {
    return array.filter(e => e !== element);
}

function stopAll(){
	all_xmlhttp.forEach(function(element) {
  	element.abort();
	});
  toggleHide(document.getElementById("spinner"));
	}
// this is asynchronous - result comes back to callback later, while this returns immediately
 // -----------------------------------------------------------------------=======------------
 function callAjax(url, callback,querytxt)
 {

 	// compatible with IE7+, Firefox, Chrome, Opera, Safari
 	var response_backup;
 	var xmlhttp = new XMLHttpRequest();
 	all_xmlhttp.push(xmlhttp);
 	toggleShow(document.getElementById("spinner"));
 	xmlhttp.onreadystatechange = function()
 	{
 		if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
 		{
 		  //console.log(xmlhttp.responseText);
 			callback(xmlhttp.responseText,querytxt);
 			toggleHide(document.getElementById("spinner"));
 			//progressbar.style.width = '0%';
 			all_xmlhttp=remove(all_xmlhttp,xmlhttp);
 		}
 	}
 	xmlhttp.onprogress = function (event) {
      console.log(event.loaded);
      console.log(event.total);
      response_backup = xmlhttp.responseText;
      var percentComplete = (event.loaded / event.total) * 100;
      //$('#progressbar').progressbar( "option", "value", percentComplete );
      //progressbar.style.width = width + '%';
      toggleShow(document.getElementById("spinner"));
 };
 xmlhttp.onabort= function (event) {
      console.log(event.loaded);
      console.log(event.total);
      callback(response_backup,querytxt);
    //console.log(xmlhttp.responseText);
    //console.log(response_backup);
    };
 	xmlhttp.open("GET", url, true);
 	xmlhttp.send();
 }
//datatype txt,json ...
 function pureAjax(url,callback,datatype) {
 	$.ajax({
          url: url,
          dataType: datatype,
          type: "GET",
          cache: true,
          //context: that,
          success: callback,
          //error: errorMethod,
          async: true
        });
 	}

 function cb_myCallback(theStuff)
 {
     // process theStuff here. If it's JSON data, you can unpack it trivially in Javascript,
     // as I will describe later. For this example, it's just text. You're going to get
     // back "hello, Ben"
     console.log(theStuff);
 }

 function pyRequestJson(upd_data,upd_callback)
 {
  var cd_url;
 	//cd_url = '/cgi-bin/myPython.py?myData=' + encodeURIComponent(upd_data);
 	cd_url = 'http://mgldev.scripps.edu/cgi-bin/cellpack_db_dev.py?file=' + encodeURIComponent(upd_data);
 	callAjax(cd_url,upd_callback);
 }

 function pyRequestSQL(upd_callback)
 {
  var cd_url;
 	//cd_url = '/cgi-bin/myPython.py?myData=' + encodeURIComponent(upd_data);
 	cd_url = 'http://mgldev.scripps.edu/cgi-bin/cellpack_db_dev.py';
 	callAjax(cd_url,upd_callback);
 }
 //pyRequest("Ben",cb_myCallback);


 function pyExportRecipe(acallback){}

 function pyExportRecipeSerialized(acallback){}

 function queryBeads(pdb,selection){
 			//given a pdb and selection get the sphereTree
 	}


// Dropdown Menu
//var dropdown = document.querySelectorAll('.dropdown');
//var dropdownArray = Array.prototype.slice.call(dropdown,0);
var dropdownArray = document.getElementsByClassName("dropdown");
for (var i=0;i< dropdownArray.length;i++){
	var el = dropdownArray[i];
	var button = el.childNodes[1];//getElementByClassName("datatoggle");
	console.log(button);
	//var button = el.querySelector('a[data-toggle="dropdown"]'),
	var  menu = el.childNodes[3];//el.querySelector('.dropdown-menu');
	//		arrow = button.querySelector('i.icon-arrow');
  console.log(menu);

	button.onclick = function(event) {
		if(!menu.classList.contains('show')) {
			menu.classList.add('show');
			menu.classList.remove('hide');
			//arrow.classList.add('open');
			//arrow.classList.remove('close');
			event.preventDefault();
		}
		else {
			menu.classList.remove('show');
			menu.classList.add('hide');
			//arrow.classList.remove('open');
			//arrow.classList.add('close');
			event.preventDefault();
		}
	};
	button.onmouseenter = function(event) {
		menu = event.target.nextElementSibling;
		console.log(menu);
		if(!menu.classList.contains('show')) {
			menu.classList.add('show');
			menu.classList.remove('hide');
			//arrow.classList.add('open');
			//arrow.classList.remove('close');
			event.preventDefault();
		}
	};
 
	menu.onmouseleave = function(event) {
		menu = event.target;//.nextElementSibling;
		console.log(menu);
		if(!menu.classList.contains('hide')) {
			menu.classList.remove('show');
			menu.classList.add('hide');
			//arrow.classList.remove('open');
			//arrow.classList.add('close');
			event.preventDefault();
		}
	};
}

Element.prototype.hasClass = function(className) {
    return this.className && new RegExp("(^|\\s)" + className + "(\\s|$)").test(this.className);
};

function hideMenu(submenu) {
	 //from submenu hide the parent
	 //click on <a> get the ul parent
	 var ulx = $(submenu).closest('ul')[0];
	 console.log(ulx);
	 //or use node.parentNode;
	 if(!ulx.classList.contains('hide')) {
			ulx.classList.remove('show');
			ulx.classList.add('hide');
		}
}
