#!/usr/bin/env /usr/local/www/projects/mgltools2/bin/pythonsh
import os
import time
import cgi
import numpy as np
#print 'Content-type: text/html\n\n'
#print 'Hello!\n'
## try:
##     from mslib import msms
##     import PmvApp
##     from bhtree import bhtreelib
##     import numpy

## except:
##     cgi.print_exception()



## print "<br>"
## #print "Msms imported from %s" % msms.__file__
## print "imported PmvApp from %s \n\n" % PmvApp.__file__
## print "<br>"
## print "imported bhtree from %s \n\n" % bhtreelib.__file__
## print "<br>"
## print "imported numpy from %s \n\n" % numpy.__file__
## print "<br>"
## print '%s\n' % (time.asctime())
## print "<br>"


from PmvApp.Pmv import MolApp
def fetchMol(app, pdbId, model=None, pdbFolder=None):
    app.lazyLoad('fileCmds', commands=['readMolecules', 'fetch'], package='PmvApp')
    app.lazyLoad("coarseMolecularSurfaceCmds", commands=["computeCoarseMolecularSurface"], package="PmvApp")
    res = app.fetchFile(pdbId, "pdb", model=model, pdbFolder=pdbFolder, addToRecent=False)
    assert len(res)
    mol = res[0]
    return mol

def readMolStr(app, lines, filename, model=None, chain=None,subset=None, altloc='A', format="PDB", header=False, secondary=None):
    from prody.proteins.header import getHeaderDict
    from prody.proteins.pdbfile import _parsePDBLines
    from prody.atomic import AtomGroup
    from MolKit2.molecule import Molecule
    import os
    title_suffix = ''
    title, ext = os.path.splitext(os.path.split(filename)[1])
    ag = AtomGroup(title + title_suffix)
    n_csets = 0
    hd, split = getHeaderDict(lines)
    _parsePDBLines(ag, lines, split, model, chain, subset, altloc,
                       format=format)
    ##if ag is not None and isinstance(hd, dict):
        ## if secondary:
        ##     if auto_secondary:
        ##         try:
        ##             ag = assignSecstr(hd, ag)
        ##         except ValueError:
        ##             pass
        ##     else:
        ##         ag = assignSecstr(hd, ag)
        ## if biomol:
        ##     ag = buildBiomolecules(hd, ag)

        ##     if isinstance(ag, list):
        ##         LOGGER.info('Biomolecular transformations were applied, {0} '
        ##                     'biomolecule(s) are returned.'.format(len(ag)))
        ##     else:
        ##         LOGGER.info('Biomolecular transformations were applied to the '
        ##                     'coordinate data.')

    mol = Molecule(title, ag, filename=filename)
    mol.buildBondsByDistance()
    mol.defaultRadii()
    app.addMolecule(mol, group=None, filename=title)
    return mol

def getBiologicalUnit(app,mol,selstr,bu):
    #bioMolNames = mol.pdbHeader['biomoltrans'].keys()
    # molsel = mol.selectMolKit(selstr)
    #bioMolNames = if (str(bu) in bioMolNames) [str(bu)] else bioMolNames[0]
    biomt = []
    chCount = 65 # 'A' ascii code
    if not hasattr(mol, 'pdbHeader'):
        import prody
        mol.pdbHeader = prody.parsePDB(mol.filename, model=0, header=True)
    print ("bu header biomt")
    #print mol.pdbHeader['biomoltrans'].keys()
    biotrans = mol.pdbHeader['biomoltrans'][str(bu)][0]
    #print len(biotrans),biotrans
    selStr = "chain "+' '.join(biotrans[0])
    # select the atom set to which to apply the transformation
    nbTrans = (len(biotrans)-1)/3
    nmol = None
    print ("found ",nbTrans)
    for i in range(nbTrans):
        mat = np.identity(4)
        mat[:3,:] = [ [float(x) for x in biotrans[i*3+1].split()],
                      [float(x) for x in biotrans[i*3+2].split()],
                      [float(x) for x in biotrans[i*3+3].split()]]
        biomt.append(mat.tolist())
    return [biomt,selStr]

def getCoarseMolSurf(app, mol, selstr, bu="", surfName='coarseMolSurf', perMol=True,
             gridSize=32, padding=0., resolution=-0.3, isovalue='fast approximation'):

    if selstr is not None :
        molSel = mol.selectMolKit(selstr)
    else:
        selstr = ""
        molSel = mol.select()
    app.lazyLoad("coarseMolecularSurfaceCmds", commands=["computeCoarseMolecularSurface"], package="PmvApp")
    #before computing check ger the biomt
    biomt=[]
    if bu is not None and bu!="":
        biomt,selStr = getBiologicalUnit(app,mol,selstr,bu)
        molSel = mol.select(selStr)
    #print mol,biomt,molSel,surfName
    app.computeCoarseMolecularSurface(molSel, surfName= surfName, gridSize=gridSize, padding=padding, resolution=resolution, bind_surface_to_molecule=False, isovalue=isovalue)
    #mol = molSel.getAtomGroup().getMolecule()
    geom = mol.geomContainer.geoms[surfName]
    verts = geom.getVertices()
    faces = geom.getFaces()
    vnorms = geom.getVNormals()
    fnorms = geom.getFNormals()
    v=[]
    f=[]
    n=[]
    offset = len(verts)
    if bu is not None and bu!="":
        #transform the verts with biomt and accumulate faces and normal_src
        for i in range(len(biomt)) :
            #apply the transformation for all vertex
            vtmp = np.ones( (len(verts), 4), 'f')
            vtmp[:, :3] = verts
            mat = np.array(biomt[i])
            ncoords = np.dot(vtmp, np.transpose(mat))
            v.extend(ncoords[:, :3].flatten().tolist())
            f.extend( (faces + (offset*i) ).flatten().tolist() )
            n.extend(vnorms.flatten().tolist())
            #center ?
        if len(v):
            geomDict = {"verts": v, "faces":f, "normals": n}
        else:
            geomDict = {"verts":[], "faces":[], "normals":[]}
    else :
        import numpy
        coords = molSel.getCoords()
        ncoords = len(coords)
        center = numpy.sum(coords, axis=0)/ncoords
        verts = verts - center

        if len(verts):
            geomDict = {"verts": verts.flatten().tolist(), "faces":faces.flatten().tolist(), "normals": vnorms.flatten().tolist()}
        else:
            geomDict = {"verts":[], "faces":[], "normals":[]}
    return geomDict


def main():
    #can be used directly as http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py?pdbId=1crn&selection=A
    # or use formData POST query
    form = cgi.FieldStorage()
    print '{"log":"'
    print form
    # A nested FieldStorage instance holds the file
    app = MolApp()
    # get selection from the form
    selstr = None
    if form.has_key("selection"):
        selstr = form.getvalue("selection")
    # get selection from the form
    bu = None
    if form.has_key("bu"):
        bu = form.getvalue("bu")# get AU,BUi,SUPERCELL,UNITCELL
        if (bu[:2].lower() == "bu" or bu[:2].lower() == "ba") : bu = bu[2:]
        if (bu == "UNITCELL" or bu == "SUPERCELL"): bu = None
        if (bu == "AU"): bu=None
    #get model from the form
    model = None
    if form.has_key("model"):
        model = int(form.getvalue("model"))
    mol = None
    print selstr,bu,model
    if form.has_key('inputfile'):
        fileitem = form['inputfile']
        if fileitem.filename != "":
            # Test if the file was uploaded

            print fileitem.filename
            print "<br>"
            print "<br>"
            ## # print fileitem.file # the file objects
            molstr = fileitem.file.read()  # the content of the file
            lines = molstr.split('\n')
            print "number of lines in file", len(lines)
            print "<br>"
            mol = readMolStr(app, lines, fileitem.filename, model=model)
    elif form.has_key("pdbId"):
        pdbId = form.getvalue("pdbId")
        if pdbId and len(pdbId)==4:
            # check cache , and shold check https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/other/
            mol = fetchMol(app, pdbId, model=model)
        else :
            #download in cache ? read
            filename = "/usr/local/www/projects/autoPACK/data/cellPACK_data/cellPACK_database_1.1.0/other/"+pdbId
            if not os.path.exists(filename) :
                #download
                url = "https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/other/"+pdbId
                os.system('wget --no-check-certificate '+url+' -O '+filename)
            app.lazyLoad('fileCmds', commands=['readMolecules'], package='PmvApp')
            mol = app.readMolecule(filename,addToRecent=False)
    if mol:
        # resolution and isovalue need to be change in case of alpha-carbon structure only.
        default_iso = 'fast approximation'
        default_res = -0.3 #-0.1 for Calpah
        iso = 1.0
        res = -0.1
        gsize = 16
        if form.has_key("iso"):
            iso = float(form["iso"])
        if form.has_key("res"):
            res = float(form["res"])
        if form.has_key("gsize"):
            gsize = int(form["gsize"])
        # compute the surface and print the json string with faces and verts:
        geomDict = getCoarseMolSurf(app, mol, selstr, bu = bu, surfName="coarseSurf_1", gridSize=gsize,
        padding=0., resolution=res, isovalue=iso)
        import json
        jsonstr = json.dumps(geomDict)
        #print "<br> <br> <br>"
        print "SURFACE COMPUTED", "&nbsp; Num faces: %d"%len(geomDict['faces']), "&nbsp; Num verts: %d <br>" % len(geomDict['verts'])
        print '","results":'
        print jsonstr
        print ',"inputs":{'#<br> <br>"
    astr=''
    for k in form :
        if k == "inputfile": continue
        val = form.getvalue(k)
        if val == "":
            val = "not specified"
        astr += '"'+k+'":"'+ val+'",'
        #print astr
        #print "<br>"
    print astr[:-1]+'}}'

try:
    print "Access-Control-Allow-Origin: *"
    print 'Content-type: text/html\n'
    #print "Hello"
    main()
except:
    cgi.print_exception()
