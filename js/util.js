var util_expanded = false;
var Epsilon = 1e-10;
var  X_AXIS = new NGL.Vector3(1, 0, 0);
var  Y_AXIS = new NGL.Vector3(0, 1, 0);
var  Z_AXIS = new NGL.Vector3(0, 0, 1);
var FOLDER_UPDATED = false;

function Util_parseParams(){
  return location.search
    .substr(1)
    .split("&")
    .map(function(pair){
      var a = pair.split("=");
      var o = {};
      o[a[0]] = a[1];
      return o;
    })
    .reduce(function(a,b){
      for(var key in b) a[key] = b[key];
      return a;
    });
}

function Util_getRadiusFromMW(mw){
    var V = mw * 1.21;
    return Math.pow((3.0*V)/(4.0*Math.PI),1.0/3.0)
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function Util_getRGB(avalue){
  // #XXXXXX -> ["XX", "XX", "XX"]
  var value = avalue.match(/[A-Za-z0-9]{2}/g);

  // ["XX", "XX", "XX"] -> [n, n, n]
  value = value.map(function(v) { return parseInt(v, 16) });

  // [n, n, n] -> rgb(n,n,n)
  return {"rgb":"rgb(" + value.join(",") + ")","arr":value};
}

function Util_rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h, s, l ];
}

function Util_rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function Util_getVolumeCA(nca){
    var radiusca = 0.77;//angstrom
    var volume_one = 1.912;//angstrom3
    return volume_one*nca;
}

function Util_showCheckboxes() {
  var checkboxes = document.getElementById("selection_ch_checkboxes");
  if (!util_expanded) {
    checkboxes.style.display = "block";
    util_expanded = true;
  } else {
    checkboxes.style.display = "none";
    util_expanded = false;
  }
}

var Util_makeARandomNumber = function() {
   return Math.random();
 }

function Util_getRandomInt(max) {
   return Math.floor(Math.random() * Math.floor(max));
 }

function Util_ComputeBounds(points,radius,padding=0.0)
{
  //padding ?

  var bbMin = new NGL.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  var bbMax = new NGL.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  var rMax = Number.NEGATIVE_INFINITY;
  var p=0;
  var sumv = new NGL.Vector3(0,0,0);
  for (var i=0;i<radius.length;i++)// (var point in points)
  {
      var ap = new NGL.Vector3(points[p],points[p+1],points[p+2]);
      bbMin.min(ap);
      bbMax.max(ap);
      sumv.add(ap);
      rMax = Math.max(rMax,radius[i]);
      p+=3;
  }
  if ( padding === 0 ) padding = rMax/4;
  rMax = rMax + padding;
  sumv.divideScalar(radius.length);
  //rMax*=2;
  if (points.length === 1) {
    p=0;
    bbMin = new NGL.Vector3(points[p],points[p+1],points[p+2]);
    bbMax = new NGL.Vector3(points[p],points[p+1],points[p+2]);
  }
  bbMin.sub(new NGL.Vector3(rMax, rMax, rMax));
  bbMax.add(new NGL.Vector3(rMax, rMax, rMax));
  var bbSize = new NGL.Vector3();
  bbSize.subVectors(bbMax,bbMin);
  var maxsize = Math.max(Math.max(bbSize.x,bbSize.y),bbSize.z);
  var bbCenter = new NGL.Vector3();
  bbCenter.copy(sumv);
  bbSize.copy(new NGL.Vector3(maxsize,maxsize,maxsize));
  var bbSizeHalf = new NGL.Vector3(0,0,0);
  bbSizeHalf.addScaledVector(bbSize,0.5);
  bbMin.copy(sumv);
  bbMin.sub(bbSizeHalf);
  bbMax.copy(sumv);
  bbMax.add(bbSizeHalf);
  //bbMin.sub(new NGL.Vector3(rMax, rMax, rMax));
  bbCenter.addVectors(bbMin, bbSizeHalf);
  return {"center":bbCenter,"size":bbSize,"min":bbMin,"max":bbMax,"maxsize":maxsize};
}

function Util_ClientDetection(window) {
   /**
    * JavaScript Client Detection
    * (C) viazenetti GmbH (Christian Ludwig)
    */
   var unknown = '-';

   // screen
   var screenSize = '';
   if (screen.width) {
     width = (screen.width) ? screen.width : '';
     height = (screen.height) ? screen.height : '';
     screenSize += '' + width + " x " + height;
   }

   // browser
   var nVer = navigator.appVersion;
   var nAgt = navigator.userAgent;
   var browser = navigator.appName;
   var version = '' + parseFloat(navigator.appVersion);
   var majorVersion = parseInt(navigator.appVersion, 10);
   var nameOffset, verOffset, ix;

   // Opera
   if ((verOffset = nAgt.indexOf('Opera')) != -1) {
     browser = 'Opera';
     version = nAgt.substring(verOffset + 6);
     if ((verOffset = nAgt.indexOf('Version')) != -1) {
       version = nAgt.substring(verOffset + 8);
     }
   }
   // Opera Next
   if ((verOffset = nAgt.indexOf('OPR')) != -1) {
     browser = 'Opera';
     version = nAgt.substring(verOffset + 4);
   }
   // Edge
   else if ((verOffset = nAgt.indexOf('Edge')) != -1) {
     browser = 'Microsoft Edge';
     version = nAgt.substring(verOffset + 5);
   }
   // MSIE
   else if ((verOffset = nAgt.indexOf('MSIE')) != -1) {
     browser = 'Microsoft Internet Explorer';
     version = nAgt.substring(verOffset + 5);
   }
   // Chrome
   else if ((verOffset = nAgt.indexOf('Chrome')) != -1) {
     browser = 'Chrome';
     version = nAgt.substring(verOffset + 7);
   }
   // Safari
   else if ((verOffset = nAgt.indexOf('Safari')) != -1) {
     browser = 'Safari';
     version = nAgt.substring(verOffset + 7);
     if ((verOffset = nAgt.indexOf('Version')) != -1) {
       version = nAgt.substring(verOffset + 8);
     }
   }
   // Firefox
   else if ((verOffset = nAgt.indexOf('Firefox')) != -1) {
     browser = 'Firefox';
     version = nAgt.substring(verOffset + 8);
   }
   // MSIE 11+
   else if (nAgt.indexOf('Trident/') != -1) {
     browser = 'Microsoft Internet Explorer';
     version = nAgt.substring(nAgt.indexOf('rv:') + 3);
   }
   // Other browsers
   else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) < (verOffset = nAgt.lastIndexOf('/'))) {
     browser = nAgt.substring(nameOffset, verOffset);
     version = nAgt.substring(verOffset + 1);
     if (browser.toLowerCase() == browser.toUpperCase()) {
       browser = navigator.appName;
     }
   }
   // trim the version string
   if ((ix = version.indexOf(';')) != -1) version = version.substring(0, ix);
   if ((ix = version.indexOf(' ')) != -1) version = version.substring(0, ix);
   if ((ix = version.indexOf(')')) != -1) version = version.substring(0, ix);

   majorVersion = parseInt('' + version, 10);
   if (isNaN(majorVersion)) {
     version = '' + parseFloat(navigator.appVersion);
     majorVersion = parseInt(navigator.appVersion, 10);
   }

   // mobile version
   var mobile = /Mobile|mini|Fennec|Android|iP(ad|od|hone)/.test(nVer);

   // cookie
   var cookieEnabled = (navigator.cookieEnabled) ? true : false;

   if (typeof navigator.cookieEnabled == 'undefined' && !cookieEnabled) {
     document.cookie = 'testcookie';
     cookieEnabled = (document.cookie.indexOf('testcookie') != -1) ? true : false;
   }

   // system
   var os = unknown;
   var clientStrings = [{
       s: 'Windows 10',
       r: /(Windows 10.0|Windows NT 10.0)/
     },
     {
       s: 'Windows 8.1',
       r: /(Windows 8.1|Windows NT 6.3)/
     },
     {
       s: 'Windows 8',
       r: /(Windows 8|Windows NT 6.2)/
     },
     {
       s: 'Windows 7',
       r: /(Windows 7|Windows NT 6.1)/
     },
     {
       s: 'Windows Vista',
       r: /Windows NT 6.0/
     },
     {
       s: 'Windows Server 2003',
       r: /Windows NT 5.2/
     },
     {
       s: 'Windows XP',
       r: /(Windows NT 5.1|Windows XP)/
     },
     {
       s: 'Windows 2000',
       r: /(Windows NT 5.0|Windows 2000)/
     },
     {
       s: 'Windows ME',
       r: /(Win 9x 4.90|Windows ME)/
     },
     {
       s: 'Windows 98',
       r: /(Windows 98|Win98)/
     },
     {
       s: 'Windows 95',
       r: /(Windows 95|Win95|Windows_95)/
     },
     {
       s: 'Windows NT 4.0',
       r: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/
     },
     {
       s: 'Windows CE',
       r: /Windows CE/
     },
     {
       s: 'Windows 3.11',
       r: /Win16/
     },
     {
       s: 'Android',
       r: /Android/
     },
     {
       s: 'Open BSD',
       r: /OpenBSD/
     },
     {
       s: 'Sun OS',
       r: /SunOS/
     },
     {
       s: 'Linux',
       r: /(Linux|X11)/
     },
     {
       s: 'iOS',
       r: /(iPhone|iPad|iPod)/
     },
     {
       s: 'Mac OS X',
       r: /Mac OS X/
     },
     {
       s: 'Mac OS',
       r: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/
     },
     {
       s: 'QNX',
       r: /QNX/
     },
     {
       s: 'UNIX',
       r: /UNIX/
     },
     {
       s: 'BeOS',
       r: /BeOS/
     },
     {
       s: 'OS/2',
       r: /OS\/2/
     },
     {
       s: 'Search Bot',
       r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/
     }
   ];
   for (var id in clientStrings) {
     var cs = clientStrings[id];
     if (cs.r.test(nAgt)) {
       os = cs.s;
       break;
     }
   }

   var osVersion = unknown;

   if (/Windows/.test(os)) {
     osVersion = /Windows (.*)/.exec(os)[1];
     os = 'Windows';
   }

   switch (os) {
     case 'Mac OS X':
       osVersion = /Mac OS X (10[\.\_\d]+)/.exec(nAgt)[1];
       break;

     case 'Android':
       osVersion = /Android ([\.\_\d]+)/.exec(nAgt)[1];
       break;

     case 'iOS':
       osVersion = /OS (\d+)_(\d+)_?(\d+)?/.exec(nVer);
       osVersion = osVersion[1] + '.' + osVersion[2] + '.' + (osVersion[3] | 0);
       break;
   }

   // flash (you'll need to include swfobject)
   /* script src="//ajax.googleapis.com/ajax/libs/swfobject/2.2/swfobject.js" */
   var flashVersion = 'no check';
   if (typeof swfobject != 'undefined') {
     var fv = swfobject.getFlashPlayerVersion();
     if (fv.major > 0) {
       flashVersion = fv.major + '.' + fv.minor + ' r' + fv.release;
     } else {
       flashVersion = unknown;
     }
   }
   //}

   window.jscd = {
     screen: screenSize,
     browser: browser,
     browserVersion: version,
     browserMajorVersion: majorVersion,
     mobile: mobile,
     os: os,
     osVersion: osVersion,
     cookies: cookieEnabled,
     flashVersion: flashVersion
   };
   return window.jscd;
 }

function Util_selectFolder(e) {
   console.log(e);
   var theFiles = e.target.files;
   var relativePath = theFiles[0].webkitRelativePath;
   var folder = relativePath.split("/");
   alert(folder[0]);
   for (var i = 0, file; file = theFiles[i]; ++i) {
     var sp = file.webkitRelativePath.split("/");
     pathList_[sp[1]] = file;
   }
   gridArray[0].invalidate();
   gridArray[0].render();
   gridArray[0].dataView.refresh();
   FOLDER_UPDATED = true;
}

function Util_stringToArray(bufferString) {
 	let uint8Array = new TextEncoder("utf-8").encode(bufferString);
 	return uint8Array;
 }
 function Util_arrayToString(bufferValue) {
 	return new TextDecoder("utf-8").decode(bufferValue);
 }

function Util_gunzip(compressed_data){
  // compressed = Array.<number> or Uint8Array
  var gunzip = new Zlib.Gunzip(compressed_data);
  var plain = gunzip.decompress();
  return plain;
}

function Util_parseXML(plaintxt) {
  return $.parseXML( plaintxt );
}


// Compute upper closest power of 2 for a number
function Util_powerOfTwoCeil(x){
    var result = 1;
    while(result * result < x){
        result *= 2;
    }
    return result;
}

function Util_idToX(id,sx,sy){
    return id % sx;
}
function Util_idToY(id,sx,sy){
    return Math.floor(id / sy);
}
function Util_idToDataIndex(id, w, h){
    var px = Util_idToX(id, w, h);
    var py = Util_idToY(id, w, h);
    var p = 4 * (py * w + px);
    return p;
}

function Util_halton(index, base) {
	var result = 0;
    var f = 1 / base;
    var i = index;
    while(i > 0) {
       result = result + f * (i % base);
       i = Math.floor(i / base);
       f = f / base;
    }
    return result;
};
/*z = RNG.rand(1, N) * (1 - cos(coneAngle)) + cos(coneAngle);
phi = RNG.rand(1, N) * 2 * pi;
x = sqrt(1-z.^2).*cos(phi);
y = sqrt(1-z.^2).*sin(phi);
*/
function Util_coneSample_uniform(coneAngleDegree, coneDir, N){
  if (!coneDir) {
    coneDir = new THREE.Vector3(0,0,1);
  }
  if (!N) N = 1;
  //rng Math.random();
  var coneAngle = coneAngleDegree * Math.PI/180.0;
  var z = Math.random() * (1 - Math.cos(coneAngle)) + Math.cos(coneAngle);
  var phi = Math.random() * 2 * Math.PI; //theta
  var x = Math.sqrt(1.0-z*z)*Math.cos(phi);
  var y = Math.sqrt(1.0-z*z)*Math.sin(phi);
  var new_points = new NGL.Vector3(x,y,z);
  //get  the rotation from [0;0;1] to coneDir
  //var rotation = Util_computeOrientation(new THREE.Vector3(0,0,1),coneDir);
  var rotation = new THREE.Quaternion().setFromUnitVectors (new THREE.Vector3(0,0,1),coneDir);
  new_points.applyQuaternion( rotation );
  return new_points;
}

function Util_sphereSample_uniform(u, v) {
    var theta = 2 * Math.PI * u;
    var phi = Math.acos(1 - 2 * v);
    var x = Math.sin(phi) * Math.cos(theta);
    var y = Math.sin(phi) * Math.sin(theta);
    var z = Math.cos(phi);
    return new NGL.Vector3(x,y,z);
 }

//from http://stackoverflow.com/questions/1171849/finding-quaternion-representing-the-rotation-from-one-vector-to-another
function Util_orthogonal(v)
{
	var x = Math.abs(v.x);
	var y = Math.abs(v.y);
	var z = Math.abs(v.z);
	var other = x < y ? (x < z ? X_AXIS : Z_AXIS) : (y < z ? Y_AXIS : Z_AXIS);
  var across = new NGL.Vector3();
  across.crossVectors(v, other);
	return across;
}

function Util_get_rotation_between(u, v)
{
  //assume THREE.Vector3
	// It is important that the inputs are of equal length when
	// calculating the half-way vector.
  u.normalize();
  v.normalize();
  var uv = new NGL.Vector3();
  uv.addVectors(u,v);
	// Unfortunately, we have to check for when u == -v, as u + v
	// in this case will be (0, 0, 0), which cannot be normalized.
	if (uv.length()==0)
	{
		// 180 degree rotation around any orthogonal vector
		var no = Util_orthogonal(u);
    no.normalize();
		return new NGL.Quaternion(no.x,no.y,no.z,0);
	}
  uv.normalize();
	//var halfv = normalize(u + v);
	var w = u.dot(uv);
  var a = new NGL.Vector3();
	a.crossVectors(u, uv);
	return new NGL.Quaternion(a.x, a.y, a.z, w);
}

function Util_computeOrientation(norm, up)
{
	norm.normalize();
	up.normalize();
	var rot = Util_get_rotation_between(up, norm);
  rot.normalize();
	return rot;//float4(0,0,0,1);
}

function Util_getCountFromMolarity(molarity, volume) {
    /*
    M = moles/L
    6.022e23 ingredients / mole
    Work in Å by default(not ideal for mesoscale, but works with all molecular viewers that way), so given a volume in Å ^ 3
    1L = (10cm)^ 3
    1cm = 10 ^ (-2)m
    1Å = 10 ^ (-10)m
    1cm = 10 ^ (8)Å
    10cm = 10 ^ (9)Å
    1L = (10cm)^ 3 = (10 ^ (9)Å)^ 3 = 10 ^ (27)Å ^ 3
    M = 6.022x10^23/L = [6.022x10^23] / [10^(27)Å^3] = 6.022x10(-4)ing/Å^3
    numberIngredientsToPack = [0.0006022 ing / Å ^ 3] * [volume Å ^ 3]
    volume / ingredient in 1M = 1ing / 0.0006022 ing/Å^3 = 1660Å^3 * 1nm^3/1000Å^3 = 1.6nm^3
    Average distance between molecules is cubic root 3√(1.6nm ^ 3) = 11.8Å = 1.18nm
      Thus the nbr should simply be
      nbr = densityInMolarity *[0.0006022 ing / Å ^ 3] * [volume Å ^ 3]
    see http://molbiol.edu.ru/eng/scripts/01_04.html
    http://www.ncbi.nlm.nih.gov/pmc/articles/PMC3910158/
    http://book.bionumbers.org/
    */
    return Math.round(molarity * 0.0006022 * volume);
}

function Util_Wait(ms){
   var start = new Date().getTime();
   var end = start;
   while(end < start + ms) {
     end = new Date().getTime();
  }
}

function Util_getIJK(index,size){
  /*var i = u % size;
  var j = ( u / size ) % size;
  var k = u / ( size * size );*/
  var sliceNum = size*size;
  var z = index / (sliceNum);
  var temp = index % (sliceNum);
  var y = temp / size;
  var x = temp % size;
  //var x = Math.min(Math.max(0,(index % size)),size);
  //var y = Math.min(Math.max(0,( (index / size) % size) ),size);
  //var z = Math.min(Math.max(0, (index / size * size ) ),size);
  return [Math.round(x),Math.floor(y),Math.floor(z)];
}

function Util_getXYZ(u,size,grid_unit){
  var ijk = Util_getIJK(u,size);
  var x = (ijk[0]*grid_unit);
  var y = (ijk[1]*grid_unit);
  var z = (ijk[2]*grid_unit);
  return [x,y,z];
}

function Util_getXYZfromIJK(ijk,size){
  var x = (ijk[0]/size);
  var y = (ijk[1]/size);
  var z = (ijk[2]/size);
  return [x,y,z];
}

function Util_getUfromIJK(i,j,k,size){
   return (k * size * size) + (j * size) + i;
}

function Util_forceSelect(e) {
	e.value = '';
}


//http://www.technicaladvices.com/2015/04/25/javascript-quiz-finding-longest-common-substrings-of-strings/
function Util_findLongestCommonSubstring (string1, string2) {
	var comparsions = []; //2D array for the char comparsions ...
	var maxSubStrLength = 0;
	var lastMaxSubStrIndex = -1, i, j, char1, char2, startIndex;

	for (i = 0; i < string1.length; ++i) {
		comparsions[i] = new Array();

		for (j = 0; j < string2.length; ++j) {
			char1 = string1.charAt(i);
			char2 = string2.charAt(j);

			if (char1 === char2) {
				if (i > 0 && j > 0) {
					comparsions[i][j] = comparsions[i - 1][j - 1] + 1;
				} else {
					comparsions[i][j] = 1;
				}
			} else {
				comparsions[i][j] = 0;
			}

			if (comparsions[i][j] > maxSubStrLength) {
				maxSubStrLength = comparsions[i][j];
				lastMaxSubStrIndex = i;
			}
		}
	}

	if (maxSubStrLength > 0) {
		startIndex = lastMaxSubStrIndex - maxSubStrLength + 1;

		return string1.substr(startIndex, maxSubStrLength);
	}

	return null;
}
function Util_idToX(id,sx,sy){
    return id % sx;
}
function Util_idToY(id,sx,sy){
    return Math.floor(id / sy);
}
function Util_idToDataIndex(id, w, h){
    var px = Util_idToX(id, w, h);
    var py = Util_idToY(id, w, h);
    var p = 4 * (py * w + px);
    return p;
}
function Util_indexToUV(index, resx,resy){
    var uv = new THREE.Vector2((index/resx)%1.0, Math.floor( index/resy ) / resx);
    return uv;
}

function Util_FixBeadsFormat(p,r){
  var result = {"pos":[],"radii":[]};
  if (p && p.length!==0) {
    if (!("coords" in p[0])) {
      var pos = [];
      var rad = [];
      for (var lod=0; lod < p.length;lod++)
      {
        pos.push({"coords":[]});
        rad.push({"radii":[]});
        for (var i=0;i<p[lod].length;i++)
        {
            pos[lod].coords.push(p[lod][i][0]);
            pos[lod].coords.push(p[lod][i][1]);
            pos[lod].coords.push(p[lod][i][2]);
            rad[lod].radii.push(r[lod][i]);
        }
      }
      p = pos;
      r = rad;
    }
  }
  return {"pos":p,"radii":r};
}

function Util_download_png(the_image, name) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = the_image.width;
    canvas.height = the_image.height;
    var base_image = new Image();
    // Fix CORS error
    base_image.crossOrigin = 'anonymous';
    base_image.onload = function() {
        //context.fillStyle = "#FFF";
        //context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(base_image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob) {
            //Util_download_click_cb(blob, name + ".png");
            FSsaveAs(blob, name + ".png");
        });
    };
    base_image.src = the_image.src;
};

//download attribute is limited to Chrome, Firefox and Opera?
function Util_download_click_url_cb(url, name){
  var link = document.createElement("a");
  var url = url;
  link.setAttribute("href", url);
  link.setAttribute("download", name);
  link.setAttribute("target","_blank");
  link.setAttribute("type","application/octet-stream");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function Util_download_click_cb(blob, name){
  var url = URL.createObjectURL(blob);
  Util_download_click_url_cb(url,name);
}


//this is unsecure for firefox in local mode
function Util_download_src_png(the_src, name) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var base_image = new Image();
    base_image.onload = function() {
        canvas.width = this.width;
        canvas.height = this.height;
        //context.fillStyle = "#FFF";
        //context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(base_image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob) {
          //Util_download_click_cb(blob, name + ".png");
          FSsaveAs(blob, name + ".png");
        });
    };
    base_image.src = the_src;
};

//take care of all collapsible
function Util_SetupCollapsible(){
  var coll = document.getElementsByClassName("meso_collapsible");
  var i;
  for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
      this.classList.toggle("meso_active");
      var content = this.nextElementSibling;
      if (content.style.maxHeight){
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = "100%";//content.scrollHeight + "px";
      } 
    });
  }
}

function Util_isInt(n) {
  return n % 1 === 0;
}

const blobToBase64 = blob => {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  return new Promise(resolve => {
    reader.onloadend = () => {
      resolve(reader.result);
    };
  });
};