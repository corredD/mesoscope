#!python2.7
#!/bin/python
import sys,os
import json
#import MySQLdb
import urllib2
from StringIO import StringIO
import gzip
import cgi
import cgitb
cgitb.enable()

#form = cgi.FieldStorage()            # parse form data
#print "Content-type: text/plain\n"
#print "HELLO"

import sqlite3

database = "../data/cellPackDatabase.db"

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


try:
    import imp
    jsonRecipeDB = imp.load_source("jsonRecipeDB", "    jsonRecipeDB.py")
    from jsonRecipeDB import  create_connection , list_table_columns, list_table_names, sql_query, add_row, JsonRecipeParser
except:
    jsonRecipeDB = None
    create_connection = None
    list_table_columns = None
    list_table_names = None
    sql_query = None
    add_row = None
    JsonRecipeParser = None

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
    #first check the query type
    #cache it ?
    if form.has_key("mapping") :
        print("Content-type: text/xml\n")
        pdbId = form.getvalue("pdbId")
        url = "ftp://ftp.ebi.ac.uk/pub/databases/msd/sifts/xml/"+pdbId+".xml.gz"
        req = urllib2.Request(url);
        req.add_header('Accept-encoding', 'gzip')
        response = urllib2.urlopen(req);
        buf = StringIO(response.read())
        f = gzip.GzipFile(fileobj=buf)
        data = f.read()
        #the_page = response.read()
        #print '{"raw":"'
        print data
        #print '}'
        return
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
        print "Access-Control-Allow-Origin: *"
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
