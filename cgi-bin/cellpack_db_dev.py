#!python2.7
#/usr/local/bin/python2.7
import sys,os
import json
#import MySQLdb
import cgi
import cgitb
cgitb.enable()

#form = cgi.FieldStorage()            # parse form data
#print "Content-type: text/plain\n"
#print "HELLO"

import sqlite3

database = "./data/cellPackDatabase.db"

def print_tree(conn, rootName="BloodHIVMycoRB.1.0"):
    #print "Content-type: text/plain\n"
    #print "HELLO"
    #rootName = "BloodHIVMycoRB.1.0" # recipe name - root compartment

    # get all compartments from the root

    sql =  """SELECT l1.name l1_name, l2.name l2_name,
              l3.name l3_name, l4.name l4_name,
              l5.name l5_name
               FROM compartments l1
              LEFT JOIN compartments l2
                ON l2.parent_id = l1.id
              LEFT JOIN compartments l3
                ON l3.parent_id = l2.id
              LEFT JOIN compartments l4
                ON l4.parent_id = l3.id
              LEFT JOIN compartments l5
                ON l5.parent_id = l4.id
              WHERE l1.name = ?;"""
    res = sql_query(conn, sql, (rootName,),)
    for record in res:
        #print "<br>"
        indent = ""
        parent = None
        for comp_name in record[1:]:
            if comp_name is None: break
            if parent:
                indent += "&nbsp;&nbsp;&nbsp;&nbsp;"
                #import pdb; pdb.set_trace()
            #print indent, "COMPARTMENT: ", comp_name
            print "<br>"
            msg = """{indent} COMPARTMENT: {comp_name}"""
            print msg.format(**locals())
            parent = comp_name
            # get compartment_id
            sql = "SELECT id FROM compartments WHERE name=?;"
            comp_id = sql_query(conn, sql, (comp_name,))[0][0]

            sql = "SELECT  a.id, a.name, a.source, a.protein_count, a.group_id, a.molarity FROM ingredients AS a INNER JOIN ingredient_list AS b ON a.id=b.ingredient_id WHERE b.compartment_id = ? and a.localisation_id = ?;"
            surf_ing = sql_query(conn, sql, (comp_id, 1),)
            if len(surf_ing):
                print "<br>"
                msg = "%sSURFACE ingredients [%d]:" %(indent, len(surf_ing))
                for ingred in surf_ing:
                    ingr_ind = ingred[0] # can be used to find binding partners
                    name = ingred[1]
                    msg = msg + str(ingred)+"<br>"#" %s" %(name)
                print msg

            inter_ing = sql_query(conn, sql, (comp_id, 2),)
            if len(inter_ing):
                print "<br>"
                msg = "%sINTERIOR ingredients [%d]:" %(indent, len(inter_ing))
                #print indent, "    INTERIOR ingredients [%d]:" %len(inter_ing),
                for ingred in inter_ing:
                    ingr_ind = ingred[0] # can be used to find binding partners
                    name = ingred[1]
                    #print name,
                    #msg = msg + " %s" %(name)
                    msg = msg + str(ingred)+"<br>"
                print msg
            print "<br>"
    print "<br><br>"



def add_record(ingredName, localisation, state, jsonParser):
    conn = jsonParser.conn
    html_template = """
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html><head>
<meta content="text/html; charset=ISO-8859-1" http-equiv="content-type"><title>cell pack db</title>

</head>

<body>
{msg}
<h3>Add an ingredient to cellpack database</h3>

<form action="cellpack_db_dev.py">Ingredient name <input value="{ingredName}" maxlength="40" size="40" name="ingredName"><br>
<br>
Select localisation: &nbsp;<br>

<input name="localisation" value="surface" type="radio">
                      Surface: &nbsp; <br>
<input name="localisation" value="interior" type="radio">
                      Interior: &nbsp; <br>
<br>
<input value="Submit" type="submit"> <input name="pastState" value="{state}" type="hidden"><br>
</form>
</body></html> """
    if ingredName:
        ingredName = ingredName.strip()
    if not state == 'submit':  # initial display of order form
        msg = ''
        state = 'submit'
    elif not ingredName or not localisation:  # must have a name and size entered
        msg = '<p><b>You must enter ingredient name and a localisation!</b></p>'
        invitation = 'Please fill out and submit the form.'
        state = 'submit'
    else:  # submit
        loc_id = 1
        if localisation != "surface": loc_id = 2
        res = jsonParser.find_ingredient(ingredName, fields=["id"])
        if not len(res):
            data = [["name", ingredName],["localisation_id", loc_id]]
            add_row("ingredients", data, conn)

        sql = "SELECT id, name, localisation_id FROM ingredients WHERE name=?"
        newRecord = sql_query(conn, sql, (ingredName,))
        msg = '''<p>Submitted: Ingedient name: {ingredName},  localisation {localisation}; <br>
        DB record : {newRecord}.<br>
        </p>
        '''.format(**locals())
        state='submit'
    return html_template.format(**locals())


def print_tree_text(conn, rootName="BloodHIVMycoRB.1.0"):
    #rootName = "BloodHIVMycoRB.1.0" # recipe name - root compartment

    # get all compartments from the root

    sql =  """SELECT l1.name l1_name, l2.name l2_name,
              l3.name l3_name, l4.name l4_name,
              l5.name l5_name
               FROM compartments l1
              LEFT JOIN compartments l2
                ON l2.parent_id = l1.id
              LEFT JOIN compartments l3
                ON l3.parent_id = l2.id
              LEFT JOIN compartments l4
                ON l4.parent_id = l3.id
              LEFT JOIN compartments l5
                ON l5.parent_id = l4.id
              WHERE l1.name = ?;"""
    res = sql_query(conn, sql, (rootName,),)
    for record in res:
        print ""
        indent = ""
        parent = None
        for comp_name in record[1:]:
            if comp_name is None: break
            if parent:
                indent += "    "
                #import pdb; pdb.set_trace()
            print indent, "COMPARTMENT: ", comp_name
            parent = comp_name
            # get compartment_id
            sql = "SELECT id FROM compartments WHERE name=?;"
            comp_id = sql_query(conn, sql, (comp_name,))[0][0]

            sql = "SELECT  a.id, a.name, a.protein_count, a.source, a.group_id, a.molarity FROM ingredients AS a INNER JOIN ingredient_list AS b ON a.id=b.ingredient_id WHERE b.compartment_id = ? and a.localisation_id = ?;"
            surf_ing = sql_query(conn, sql, (comp_id, 1),)
            if len(surf_ing):
                print indent, "    SURFACE ingredients [%d]:" %len(surf_ing),
                for ingred in surf_ing:
                    ingr_ind = ingred[0] # can be used to find binding partners
                    name = ingred[1]
                    print ingred
            inter_ing = sql_query(conn, sql, (comp_id, 2),)
            if len(inter_ing):
                print ""
                print indent, "    INTERIOR ingredients [%d]:" %len(inter_ing),
                for ingred in inter_ing:
                    ingr_ind = ingred[0] # can be used to find binding partners
                    name = ingred[1]
                    print ingred
            print ""


def getStringdictionarySQL(conn,rootName):
    sql =  """SELECT l1.name l1_name, l2.name l2_name,
              l3.name l3_name, l4.name l4_name,
              l5.name l5_name
               FROM compartments l1
              LEFT JOIN compartments l2
                ON l2.parent_id = l1.id
              LEFT JOIN compartments l3
                ON l3.parent_id = l2.id
              LEFT JOIN compartments l4
                ON l4.parent_id = l3.id
              LEFT JOIN compartments l5
                ON l5.parent_id = l4.id
              WHERE l1.name = ?;"""
    res = sql_query(conn, sql, (rootName,),)
    msg=""
    msg += '{"name":"%s",'%rootName
    msg += '"children":['
    acount = 0
    for record in res:
        indent = ""
        parent = None
        end = ""
        for comp_name in record[1:]:
           ## if comp_name != "HIV_immature" : continue
            if comp_name is None:
                  break
            if parent:
                indent += ""#&nbsp;&nbsp;&nbsp;&nbsp;"
                #import pdb; pdb.set_trace()
                end += "]"
                end += "},"
            msg += indent+'{"name":"%s",'% comp_name
            msg += '"children":['
            parent = comp_name
            # get compartment_id
            sql = "SELECT id FROM compartments WHERE name=?;"
            comp_id = sql_query(conn, sql, (comp_name,))[0][0]

            sql = "SELECT  a.id, a.name, a.source, a.protein_count, a.group_id, a.molarity FROM ingredients AS a INNER JOIN ingredient_list AS b ON a.id=b.ingredient_id WHERE b.compartment_id = ? and a.localisation_id = ?;"
            surf_ing = sql_query(conn, sql, (comp_id, 1),)
            if len(surf_ing):
                #msg += indent+'{"name":"surface",'
                #msg += '"children":['
                for ingred in surf_ing:
                    ingr_ind = ingred[0] # can be used to find binding partners
                    name = ingred[1]
                    source = ingred[2]
                    if source != None and len(source)!=4:
                    	if source[-4:] != ".pdb" : source = source+".pdb"
                    msg += indent+'{"name":"%s","size":10,"source":{"pdb":"%s"},"count":%d, "molarity":%f, "surface":true},' %(  name,   source,  ingred[3],  ingred[5])
                #msg = msg[:-1]
                #msg += "]"
                #msg += "},"
            inter_ing = sql_query(conn, sql, (comp_id, 2),)
            if len(inter_ing):
                #msg += indent+'{"name":"interior",'
                #msg += '"children":['
                for ingred in inter_ing:
                    ingr_ind = ingred[0] # can be used to find binding partners
                    name = ingred[1]
                    source = ingred[2]
                    if source != None and len(source)!=4:
                    	if source[-4:] != ".pdb" : source = source+".pdb"
                    msg += indent+'{"name":"%s","size":10,"source":{"pdb":"%s"},"count":%d, "molarity":%f, "surface":false},' %(  name,   source,  ingred[3],  ingred[5])
                #msg = msg[:-1]
                #msg += "]"
                #msg += "},"
            if (end !=""):
                msg=msg[:-1]
                msg+=end
        msg = msg[:-1]
        msg += "]"
        msg += "},"
        acount+=1
        #if acount == 2 :break
    msg = msg[:-1]
    msg +="]"
    msg +="}"
    #print "<h3>Add an  to cellpack database</h3>"
    #print "<br>"
    #print msg
    return msg

#use json dictionary. add the child field?
#convert our json format to theses format ?
#what about the serialized json?

def getStringdictionaryJSON(jsondic):
    rootName=""
    if "recipe" in jsondic:
        rootName = jsondic["recipe"]["name"]
    msg=""
    msg += '{"name":"%s",'%rootName
    msg += '"children":[\n'
    if "cytoplasme" in jsondic:
        rnode = jsondic["cytoplasme"]
        cname=jsondic["recipe"]["name"]+"cytoplasme"
        #msg += '{"name":"%s",'% cname
        #msg += '"children":[\n'
        ingrs_dic = jsondic["cytoplasme"]["ingredients"]
        if len(ingrs_dic):
            for ing_name in ingrs_dic:  # ingrs_dic:
                ing_dic = ingrs_dic[ing_name]
                name = ing_dic["name"]
                source = ing_dic["pdb"] if "pdb" in ing_dic else None
                if source != None and len(source)!=4:
                    if source[-4:] != ".pdb" : source = source+".pdb"
                acount = ing_dic["nbMol"] if "nbMol" in ing_dic else 0
                if acount == None : acount = 0
                molarity = ing_dic["molarity"] if "molarity" in ing_dic else 0.0
                if molarity == None : moalrity = 0.0
                msg += '{"name":"%s","size":10,"source":"%s","count":%d, "molarity":%f, "surface":false}\n,' %(  ing_dic["name"], str(source),  acount,  molarity)
        #msg = msg[:-1]
        #msg += "]"
        #msg += "},"
    if "compartments" in jsondic:
        if len(jsondic["compartments"]):
            for cname in jsondic["compartments"]:
                comp_dic = jsondic["compartments"][cname]
                msg += '{"name":"%s",'% cname
                msg += '"children":['
                if "surface" in comp_dic:
                    snode = comp_dic["surface"]
                    ingrs_dic = snode["ingredients"]
                    if len(ingrs_dic):
                       #msg += '{"name":"surface",'
                       #msg += '"children":['
                       for ing_name in ingrs_dic:
                           ing_dic = ingrs_dic[ing_name]
                           name = ing_dic["name"]
                           source = ing_dic["pdb"] if "pdb" in ing_dic else None
                           if source != None and len(source)!=4:
                               if source[-4:] != ".pdb" : source = source+".pdb"
                           acount = ing_dic["nbMol"] if "nbMol" in ing_dic else 0
                           if acount == None : acount = 0
                           molarity = ing_dic["molarity"] if "molarity" in ing_dic else 0.0
                           if molarity == None : moalrity = 0.0
                           msg += '{"name":"%s","size":10,"source":"%s","count":%d, "molarity":%f, "surface":true}\n,' %(  name,str(source),  acount,  molarity)
                       #msg = msg[:-1]
                       #msg += "]"
                       #msg += "}\n,"
                if "interior" in comp_dic:
                    snode = comp_dic["interior"]
                    ingrs_dic = snode["ingredients"]
                    if len(ingrs_dic):
                       #msg += '{"name":"interior",'
                       #msg += '"children":[\n'
                       for ing_name in ingrs_dic:
                           ing_dic = ingrs_dic[ing_name]
                           name = ing_dic["name"]
                           source = ing_dic["pdb"] if "pdb" in ing_dic else None
                           if source != None and len(source)!=4:
                               if source[-4:] != ".pdb" : source = source+".pdb"
                           acount = ing_dic["nbMol"] if "nbMol" in ing_dic else 0
                           if acount == None : acount = 0
                           molarity = ing_dic["molarity"] if "molarity" in ing_dic else 0.0
                           if molarity == None : moalrity = 0.0
                           msg += '{"name":"%s","size":10,"source":"%s","count":%d, "molarity":%f, "surface":false}\n,' %(  name,str(source),  acount,  molarity)
                       #msg = msg[:-1]
                       #msg += "]"
                       #msg += "}\n,"

                msg = msg[:-1]
                msg += "]"
                msg += "}\n,"
    #msg = msg[:-1]
    msg +="]"
    msg +="}\n"
    #print "<h3>Add an  to cellpack database</h3>"
    #print "<br>"
    #print msg
    return msg

def forceSimulation(conn, rootName):
    aStr="""<!DOCTYPE html>
<meta charset="utf-8">
<style>

.node {
  cursor: pointer;
}

.node:hover {
  stroke: #000;
  stroke-width: 1.5px;
}

.node--leaf {
  fill: white;
}

.node--leaferror {
  fill: red;
}

.label {
  font: 11px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-anchor: middle;
  text-shadow: 0 1px 0 #fff, 1px 0 0 #fff, -1px 0 0 #fff, 0 -1px 0 #fff;
}

.label,
.node--root,
.node--leaf {
  pointer-events: none;
}

</style>
<canvas width="960" height="960"></canvas>
<script src="https://d3js.org/d3.v4.min.js"></script>
<script src="https://d3js.org/d3-array.v1.min.js"></script>
<script src="https://d3js.org/d3-collection.v1.min.js"></script>
<script src="https://d3js.org/d3-dispatch.v1.min.js"></script>
<script src="https://d3js.org/d3-quadtree.v1.min.js"></script>
<script src="https://d3js.org/d3-selection.v1.min.js"></script>
<script src="https://d3js.org/d3-timer.v1.min.js"></script>
<script src="https://d3js.org/d3-force.v1.min.js"></script>
<script>
var canvas = document.querySelector("canvas"),
    context = canvas.getContext("2d"),
    width = canvas.width,
    height = canvas.height,
    tau = 2 * Math.PI;

var root = cpData();

var simulation = d3.forceSimulation(root)
    .velocityDecay(0.2)
    .force("x", d3.forceX().strength(0.002))
    .force("y", d3.forceY().strength(0.002))
    .force("collide", d3.forceCollide().radius(function(d)
    { return d.r + 0.5; }).iterations(2))
    .on("tick", ticked);

function ticked() {
  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2);

  context.beginPath();
  root.forEach(function(d) {
    context.moveTo(d.x + d.r, d.y);
    context.arc(d.x, d.y, d.r, 0, tau);
  });
  context.fillStyle = "#ddd";
  context.fill();
  context.strokeStyle = "#333";
  context.stroke();

  context.restore();
}


function cpData() {
"""
    aStr+="return "+getStringdictionary(conn,rootName)
    aStr+="}</script>"
    print aStr


def JSFolder():
    css_style = """
html, body {
  padding: 0;
  margin: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
.linear {
  background: -webkit-gradient(linear, left bottom, left top,
                               from(#eee), color-stop(0.25, #fff),
                               to(#eee), color-stop(0.75, #fff));
}
.shadow {
  -moz-box-shadow: 3px 3px 10px #666666;
  -webkit-box-shadow: 3px 3px 10px #666666;
  box-shadow: 3px 3px 10px #666666;
}
.center {
  display : -webkit-box;
  display : -moz-box;
  display : box;
  -webkit-box-orient : vertical;
  -webkit-box-pack : center;
  -webkit-box-align : center;
  -moz-box-orient : vertical;
  -moz-box-pack : center;
  -moz-box-align : center;
  box-orient: vertical;
  box-pack: center;
  box-align: center;
}
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
  background-color: #eee;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(0,0,0, 0.4);
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0,0,0, 0.6);
}

input[type='file'] {
  border: 2px solid #eee;
  border-radius: 10px;
  padding: 8px;
  width: 93%;
}
#container {
  display: -webkit-box;
  -webkit-box-orient: horizontal;
  height: 100%;
}
#container > div {
  padding: 10px;
}
#container > div:first-of-type {
  overflow-y: auto;
  overflow-x: hidden;
  width: 300px;
  border-right: 1px solid #ccc;
}
#container > div:last-of-type {
 overflow-y: auto;
 overflow-x: hidden;
 -webkit-box-flex: 1;
}
#thumbnails {
  background: -webkit-gradient(linear, left bottom, left top,
                               from(#ccc), color-stop(0.25, #eee),
                               to(#ccc), color-stop(0.75, #eee));
  -webkit-box-shadow: inset 0 0 15px #000;
}
.thumbnail {
  /*float:left;*/
  text-align: center;
  margin-left: 10px;
  width: 450px;
  -webkit-transition-property: opacity, -webkit-transform;
  -webkit-transition-duration: 0.6s, 0.2s;
  -webkit-transition-timing-function: ease-in-out;
  opacity: 0;
}
.thumbnail:hover {
  -webkit-transform: scale(1.5);
}
.thumbnail .image {
  border: 1px solid #ccc;
  padding: 10px;
  background-color: #fff;
}
.thumbnail .title {
  margin-bottom: 5px;
  font-family: Helvetica, sans-serif;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 300px;
  margin: 5px auto;
}
#thumbnails img {
  border: 1px solid #ccc;
  width: 100%;
}
.thumbnail .details {
  font-family: Helvetica, sans-serif;
  font-size: 10pt;
}
#progress_bar {
  display: none;
}
progress {
  background-color: black;
  margin: 10px 0;
  padding: 1px;
  border: 1px solid #000;
  font-size: 14px;
  width: auto;
}
progress::-webkit-progress-bar-value {
  background-color: #99ccff;
}
"""
    javascript="""
(function(){
    var cache = {};

    this.tmpl = function tmpl(str, data) {
      // Figure out if we're getting a template, or if we need to
      // load the template - and be sure to cache the result.
      var fn = !/\W/.test(str) ?
        cache[str] = cache[str] ||
          tmpl(document.getElementById(str).innerHTML) :

        // Generate a reusable function that will serve as a template
        // generator (and which will be cached).
        new Function("obj",
          "var p=[],print=function(){p.push.apply(p,arguments);};" +

          // Introduce the data as local variables using with(){}
          "with(obj){p.push('" +

          // Convert the template into pure JavaScript
          str
            .replace(/[\\r\\t\\n]/g, " ")
            .split("<%").join("\t")
            .replace(/((^|%>)[^\\t]*)'/g, "$1\\r")
            .replace(/\\t=(.*?)%>/g, "',$1,'")
            .split("\\t").join("');")
            .split("%>").join("p.push('")
            .split("\\r").join("\\\'")
        + "');}return p.join('');");

      // Provide some basic currying to the user
      return data ? fn( data ) : fn;
    };
  })();
  function Tree(selector) {
    this.$el = $(selector);
    this.fileList = [];
    var html_ = [];
    var tree_ = {};
    var pathList_ = [];
    var self = this;

    this.render = function(object) {
      if (object) {
        for (var folder in object) {
          if (!object[folder]) { // file's will have a null value
            html_.push('<li><a href="#" data-type="file">', folder, '</a></li>');
          } else {
            html_.push('<li><a href="#">', folder, '</a>');
            html_.push('<ul>');
            self.render(object[folder]);
            html_.push('</ul>');
          }
        }
      }
    };

  this.buildFromPathList = function(paths) {
      for (var i = 0, path; path = paths[i]; ++i) {
        var pathParts = path.split('/');
        var subObj = tree_;
        for (var j = 0, folderName; folderName = pathParts[j]; ++j) {
          if (!subObj[folderName]) {
            subObj[folderName] = j < pathParts.length - 1 ? {} : null;
          }
          subObj = subObj[folderName];
        }
      }
      return tree_;
    }

  this.init = function(e) {
      // Reset
      html_ = [];
      tree_ = {};
      pathList_ = [];
      self.fileList = e.target.files;

      // TODO: optimize this so we're not going through the file list twice
      // (here and in buildFromPathList).
      for (var i = 0, file; file = self.fileList[i]; ++i) {
        pathList_.push(file.webkitRelativePath);
      }

      self.render(self.buildFromPathList(pathList_));

      self.$el.html(html_.join('')).tree({
        expanded: 'li:first'
      });

      // Add full file path to each DOM element.
      var fileNodes = self.$el.get(0).querySelectorAll("[data-type='file']");
      for (var i = 0, fileNode; fileNode = fileNodes[i]; ++i) {
        fileNode.dataset['index'] = i;
      }
    }
  };
  var tree = new Tree('#dir-tree');

  $('#file_input').change(tree.init);

  // Initial resize to force scrollbar in when file loads
  $('#container div:first-of-type').css('height', (document.height - 20) + 'px');
  window.addEventListener('resize', function(e) {
    $('#container div:first-of-type').css('height', (e.target.innerHeight - 20) + 'px');
  });

  function revokeFileURL(e) {
    var thumb = document.querySelector('.thumbnail');
    if (thumb) {
      thumb.style.opacity = 1;
    }
    window.URL.revokeObjectURL(this.src);
  };

  tree.$el.click(function(e) {
    if (e.target.nodeName == 'A' && e.target.dataset['type'] == 'file') {
      var file = tree.fileList[e.target.dataset['index']];

      var thumbnails = document.querySelector('#thumbnails');

      //if (!file.type.match(/image.*/)) {
      //  thumbnails.innerHTML = '<h3>Please select an image!</h3>';
      //  return;
      //}

      thumbnails.innerHTML = '<h3>Loading...</h3>';

      var thumb = document.querySelector('.thumbnail');
      if (thumb) {
        thumb.style.opacity = 0;
      }

      var data = {
        'file': {
          'name': file.name,
          'src': window.URL.createObjectURL(file),
          'fileSize': file.fileSize,
          'type': file.type,
        }
      };

      // Render thumbnail template with the file info (data object).
      //thumbnails.insertAdjacentHTML('afterBegin', tmpl('thumbnail_template', data));
      //thumbnails.innerHTML = tmpl('thumbnail_template', data);
    }
  });
"""
    return css_style, javascript

#http://proteinformatics.charite.de/ngl/js/build/ngl.embedded.min.js
def circlePacking (conn, rootName=None, json_dic = None):
    css,js = "",""#JSFolder()
    aStr="""<!DOCTYPE html>
<meta charset="utf-8">

<style>
* { margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; overflow: auto; }

.node {
  cursor: pointer;
}

.node:hover {
  stroke: #000;
  stroke-width: 1.5px;
  cursor: pointer;
}

.node--leaf {
  fill: white;
  stroke: #999;
}

.node--leaferror{
  fill: red;
  stroke: #999;
  }

.label {
  font: 11px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-anchor: middle;
  text-shadow: 0 1px 0 #fff, 1px 0 0 #fff, -1px 0 0 #fff, 0 -1px 0 #fff;
}

.label{
  pointer-events: none;
},
.node--root,
.node--leaf,
.node--leaferror

.d3-tip {
  line-height: 1;
  font-weight: bold;
  padding: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  border-radius: 2px;
  -webkit-transition: opacity 0.3s; /* For Safari 3.1 to 6.0 */
  transition: opacity 0.3s;
}

/* Creates a small triangle extender for the tooltip */
.d3-tip:after {
  box-sizing: border-box;
  display: inline;
  font-size: 10px;
  width: 100%;
  line-height: 1;
  color: rgba(0, 0, 0, 0.8);
  content: "\25BC";
  position: absolute;
  text-align: center;
}

/* Style northward tooltips differently */
.d3-tip.n:after {
  margin: -1px 0 0 0;
  top: 100%;
  left: 0;
}
"""
    aStr+=css
    aStr+="""
</style>
<br>
<body>
<div id="container">
  <div>
  <br> Select a working folder for your PDB, other wise it will use the github cellpackdatabase<br>
    <input type="file" id="file_input" onchange="Util_selectFolder(event)" webkitdirectory mozdirectory msdirectory odirectory directory multiple />
    <ul id="dir-tree"></ul>
  </div>
</div>
<br>you can upload a cell pack json recipe
<br>or show the current state of the mysql recipe database

<form action="cellpack_db_dev.py" method="POST" enctype="multipart/form-data"><INPUT TYPE=HIDDEN NAME="key" VALUE="process">"
    File: <input name="file" type="file">
    <input type="submit" value="upload json"><br>
		<input type="submit" value="Load DataBase">
</form>

<table>
<tr>
<td>
<svg width="960" height="960"></svg>
</td>
<td>
<div id="viewport" style="float: right; width: 960; height:960;"></div>
</td>
</tr>
</table>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.2/jquery.min.js"></script>
<script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min.js"></script>
<script src="https://cdn.rawgit.com/scottjehl/jQuery-Tree-Control/master/js/jQuery.tree.js" type="text/javascript"></script>
<script src="https://cdn.rawgit.com/arose/ngl/v2.0.0-dev.25/dist/ngl.js"></script>
<script src="https://d3js.org/d3.v4.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3-tip/0.7.1/d3-tip.min.js"></script>
<script>
var pathList_={};
var folder_elem = document.getElementById("file_input");

function Util_selectFolder(e) {
    var theFiles = e.target.files;
    var relativePath = theFiles[0].webkitRelativePath;
    var folder = relativePath.split("/");
    alert(folder[0]);
     for (var i = 0, file; file = theFiles[i]; ++i) {
        var sp = file.webkitRelativePath.split("/");
        pathList_[sp[1]]=file;
      }
}
// Setup to load data from rawgit
NGL.DatasourceRegistry.add(
    "data", new NGL.StaticDatasource( "//cdn.rawgit.com/arose/ngl/v0.10.4/data/" )
);

// Create NGL Stage object
var stage = new NGL.Stage( "viewport" );

function addElement (el) {
  Object.assign(el.style, {
    position: "relative",
    zIndex: 10
  })
  stage.viewer.container.appendChild(el)
}

function createElement (name, properties, style) {
  var el = document.createElement(name)
  Object.assign(el, properties)
  Object.assign(el.style, style)
  return el
}

function createSelect (options, properties, style) {
  var select = createElement("select", properties, style)
  addElement(select)
  options.forEach(function (d) {
    select.add(createElement("option", {
      value: d[ 0 ], text: d[ 1 ]
    }))
  })
  return select
}

var polymerSelect = createSelect([
    [ "cartoon", "cartoon" ],
    [ "spacefill", "spacefill" ],
    [ "licorice", "licorice" ],
    [ "surface", "surface" ]
], {
  onchange: function (e) {
    stage.getRepresentationsByName("polymer").dispose()
    stage.eachComponent(function (o) {
      o.addRepresentation(e.target.value, {
        sele: "polymer",
        name: "polymer"
      })
    })
  }
}, { top: "-950px", left: "12px" })
addElement(polymerSelect)

var centerButton = createElement("input", {
  type: "button",
  value: "center",
  onclick: function () {
    stage.autoView(1000)
  }
}, { top: "-950", left: "12px" })
addElement(centerButton)


// Handle window resizing
window.addEventListener( "resize", function( event ){
    stage.handleResize();
}, false );


// Load PDB entry 1CRN
//stage.loadFile( "rcsb://1crn", { defaultRepresentation: true } );

var root;

function loadDataBase() {
	root = cpData();
}

loadDataBase();

var svg = d3.select("svg"),
    margin = 20,
    diameter = +svg.attr("width"),
    g = svg.append("g").attr("transform",
    		"translate(" + diameter / 2 + "," + diameter / 2 + ")");

var color = d3.scaleLinear()
    .domain([-1, 5])
    .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
    .interpolate(d3.interpolateHcl);

var pack = d3.pack()
    .size([diameter - margin, diameter - margin])
    .padding(2);

root = d3.hierarchy(root)
    .sum(function(d) { return d.size; })
    .sort(function(a, b) { return b.value - a.value; });

var focus = root,
    nodes = pack(root).descendants(),
    view;

// Init tooltip
var tipCirclePack = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {
        return "<strong>" + d.data.name + ": </strong> <span style='color:grey'>" + (d.data.size) + "</span>";
      })

svg
    .style("background", color(-1))
    .on("click", function() { zoom(root); });

svg.call(tipCirclePack);

var circle = g.selectAll("circle")
  .data(nodes)
  .attr("rInit", function(d, i) { return d.r })
  .enter().append("circle")
    .attr("class", function(d) {
        if (d.data.source === "None" &&  !d.children) return "node node--leaferror";
        else  return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root";
    })
    .style("fill", function(d) { return d.children ? color(d.depth) : null; })
    .on("click", function(d) {
      stage.removeAllComponents();
      if ( "source" in d.data ) {
      		if (d.data.source === "None" ) return;
      		if ( d.data.source.length === 4 ) stage.loadFile( "rcsb://"+d.data.source+".pdb", { defaultRepresentation: true } )
      		.then(function (o) {
      		    o.addRepresentation(polymerSelect.value, {
      sele: "polymer",
      name: "polymer"
    })
  o.autoView();
});
      		else {
      		   if (folder_elem.files.length !="") {
      		     alert(pathList_[d.data.source]),
      		     stage.loadFile( pathList_[d.data.source], { defaultRepresentation: true } ).then(function (o) {
      		         o.addRepresentation(polymerSelect.value, {
      sele: "polymer",
      name: "polymer"
    })
    o.autoView();});
      		   }
      		   else  stage.loadFile( "https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/other/"+d.data.source, { defaultRepresentation: true } )
      		   .then(function (o) {
      		       o.addRepresentation(polymerSelect.value, {
      sele: "polymer",
      name: "polymer"
    })
      		   o.autoView();});
          }
          //stage.centerView(),
          zoom(d.parent),
          d3.event.stopPropagation();
      }
    	else if (focus !== d) zoom(d), d3.event.stopPropagation();
    	})
      .on('mouseover', function (d) {
      // If node has no children, show tooltip and increase the radius of the circle
      if (!d.children) {
        tipCirclePack.show(d)
      //  //var selectedCircle = d3.select("#c" + i)
        //selectedCircle.transition().duration(250);
        //.attr("r", selectedCircle.attr("rInit") * 1.2);
      }
    })
    .on('mouseout', function (d) {
      tipCirclePack.hide(d)

      // Back to original circle radius
      //var selectedCircle = d3.select("#c" + i)
      //selectedCircle.transition();
      //.attr("r", selectedCircle.attr("rInit") );
    })
    //.call(force.drag);

var text = g.selectAll("text")
  .data(nodes)
  .enter().append("text")
    .attr("class", "label")
    .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
    .style("display", function(d) { return d.parent === root ? "inline" : "none"; })
    .text(function(d) { return d.data.name+" "+d.data.source; });


var node = g.selectAll("circle,text");



zoomTo([root.x, root.y, root.r * 2 + margin]);

function zoom(d) {
  var focus0 = focus; focus = d;

  var transition = d3.transition()
      .duration(d3.event.altKey ? 7500 : 750)
      .tween("zoom", function(d) {
        var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
        return function(t) { zoomTo(i(t)); };
      });

  transition.selectAll("text")
    .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
      .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
      .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
      .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
}

function zoomTo(v) {
  var k = diameter / v[2]; view = v;
  node.attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
  circle.attr("r", function(d) { return d.r * k; });
}

function cpData() {
"""
    if rootName != None : aStr+="return "+getStringdictionarySQL(conn,rootName)
    elif json_dic != None : aStr+="return "+getStringdictionaryJSON(json_dic)
    else : aStr+="return {\"name\":\"test\",\"children\":[]}"
    aStr+="}"
    aStr+=js
    aStr+="</script><br>"
    print aStr

import imp
jsonRecipeDB = imp.load_source("jsonRecipeDB", "./python/jsonRecipeDB.py")

from jsonRecipeDB import  create_connection , list_table_columns, list_table_names, sql_query, add_row, JsonRecipeParser

def main1():
    form = cgi.FieldStorage()            # parse form data
    jsonParser=JsonRecipeParser(database)
    conn = jsonParser.conn
    #getStringdictionary(conn,"BloodHIVMycoRB.1.0")
    statuskey = None
    try:
       statuskey = form["key"].value
    except:
       statuskey = None

    #ingredName = form.getfirst('ingredName', '')
    #localisation = form.getfirst('localisation', '')
    #pastState = form.getfirst('pastState', '')

    #print 'ingredName', ingredName, "state", "localisation", localisation,  pastState
    #print add_record(ingredName, localisation, pastState, jsonParser)
    if form.has_key("file") and form['file'] != None and form['file'].filename != "":
        print "<br>"
        print form['file'].filename+"<br>"
        aStr = form['file'].file.read()
        jsondic = json.loads(aStr)
        rootName=""
        if "recipe" in jsondic:
           rootName = jsondic["recipe"]["name"]
        #try :
        #   jsonParser.parseJson(jsondic)
        #   circlePacking (conn,rootName=rootName)
        #except :
        circlePacking (conn,json_dic=jsondic)
    else :
    		circlePacking (conn, rootName="BloodHIVMycoRB.1.0")
    print "<br>"
    print statuskey
    print "<br>"

    #forceSimulation (conn, "BloodHIVMycoRB.1.0")
    print_tree(conn)

def getSpheres(apdb,selection):
	sys.path.append("/usr/local/www/projects/ePMV/SOURCES/linux-mgl32/MGLToolsPckgs")
	sys.path.append("/usr/local/www/projects/ePMV/SOURCES/linux-mgl32/MGLToolsPckgs/PIL")
	import mslib
	import prody
	print prody
	#read the pdb
	#build the sphereTree
	#return the sphereTree
	return[]

def main():
    form = cgi.FieldStorage()            # parse form data
    jsonParser=JsonRecipeParser(database)
    conn = jsonParser.conn
    #getStringdictionary(conn,"BloodHIVMycoRB.1.0")
    statuskey = None
    #print form.has_key("key")
    try:
        statuskey = form["key"].value# thats the query
    except:
        statuskey = None
    if form.has_key("file") :#and form['file'] != None and form['file'].filename != "":
    	  #print "<br>"
        #print form['file'].filename+"<br>"
        print str(form['file'])
        aStr = form['file']
        jsondic = json.loads(aStr)
        rootName=""
        if "recipe" in jsondic:
           rootName = jsondic["recipe"]["name"]
        print("Content-type: application/json\n")
        print "<br>"
        print form['file'].filename+"<br>"
        aStr = form['file'].file.read()
        jsondic = json.loads(aStr)
        rootName=""
        if "recipe" in jsondic:
            rootName = jsondic["recipe"]["name"]
        print getStringdictionaryJSON(jsondic)
    elif statuskey!=None and str(statuskey) == "sqldb":
        #print "test"
        astr = getStringdictionarySQL(conn,rootName="BloodHIVMycoRB.1.0")
        jsondic = json.loads(astr)
        print("Content-type: application/json\n\n")
        print astr#json.dumps(jsondic)
    elif form.has_key("beads"):
        beads={"some beads"}
        print("Content-type: application/json\n\n")
        ins = json.loads(form["beads"].value)
        #getSpheres
        print '{"positions":[],"radii":[]}'
        #return '{"positions":[],"radii":[]}'
    else :
        #print ("help")
        astr = getStringdictionarySQL(conn,rootName="BloodHIVMycoRB.1.0")
        print("Content-type: application/json\n")
        jsondic = json.loads(astr)
        print astr#json.dumps(jsondic)

try:
    import getpass
    #print "RUNNING AS", getpass.getuser()
    main()
except:
    cgi.print_exception()
