#!/usr/local/bin/python
# -*- coding: utf-8 -*-

import string
import re


#
# cleanup  the directory or file
# PATH MUST BE ABSOLUTE PATH!
# delay is any string accepted by at
#
def cleanup(PATH, delay = "1day"):
    import os
    cmd = "echo 'rm -fr " + PATH +"' | at now + "+delay+" > /dev/null"
    os.system(cmd)
    del os

#
# email validation
#
def validateEmail(email):

    if len(email) > 7:
        if re.match("^.+\\@(\\[?)[a-zA-Z0-9\\-\\.]+\\.([a-zA-Z]{2,3}|[0-9]{1,3})(\\]?)$", email) != None:
            return 1
    return 0


#
# Some html facilities
#
def htmlHeader(title = "", other = "", httpHead = 1, bgcolor = "white"):
    aStr = ""
    if httpHead:
        # aStr += "Connection: close\n"
        aStr += "Content-type: text/html\n\n"
    aStr += "<HTML>\n"
    if title != "" or other != "":
        aStr += "<HEAD><TITLE>"+title+"</TITLE>"+other+"</HEAD>\n"
    aStr += "<BODY bgcolor=%s>\n" % bgcolor
    return aStr

def htmlHeaderCSS(title = "", other = "", httpHead = 1):
    aStr = ""
    if httpHead:
        # aStr += "Connection: close\n"
        aStr += "Content-type: text/html\n\n"
    aStr += "<HTML>\n"
    if title != "" or other != "":
        aStr += "<HEAD><TITLE>"+title+"</TITLE>"+other+"</HEAD>\n"
    aStr += "<BODY>\n"
    return aStr


def htmlTailer():
    aStr = ""
    aStr += "</BODY>\n"
    aStr += "</HTML>\n"
    return aStr

def htmlMsg(msg):
    return msg+"\n"

def htmlH2Msg(msg):
    return "<h2>"+msg+"</h2>\n"

def htmlH3Msg(msg):
    return "<h3>"+msg+"</h3>\n"

def htmlH4Msg(msg):
    return "<h4>"+msg+"</h4>\n"

def htmlH5Msg(msg):
    return "<h5>"+msg+"</h5>\n"

def htmlBoldMsg(msg):
    return "<b>"+msg+"</b>\n"

def htmlAccessInfos():
    import os
    try:
        REMOTE_ADDR = os.environ['REMOTE_ADDR']
    except:
        REMOTE_ADDR = ""
    try:
        REMOTE_HOST = os.environ['REMOTE_HOST']
    except:
        REMOTE_HOST = ""
    try:
        REMOTE_IDENT = os.environ['REMOTE_IDENT']
    except:
        REMOTE_IDENT = ""
    try:
        REMOTE_USER = os.environ['REMOTE_USER']
    except:
        REMOTE_USER = ""
    try:
        USER_AGENT = os.environ['HTTP_USER_AGENT']
    except:
        USER_AGENT = ""
    try:
        HTTP_REFERER = os.environ['HTTP_REFERER']
    except:
        HTTP_REFERER = ""
    del os

    # print  REMOTE_ADDR,"<br>"
    import time
    aStr = time.strftime("%Y-%m-%d:%H.%M",time.gmtime(time.time()))
    del time
    if REMOTE_USER != "":
        aStr += " access from : %s " % REMOTE_USER
    elif REMOTE_HOST != "":
        aStr += " access from : %s " % REMOTE_HOST
    elif REMOTE_ADDR != "":
        aStr += " access from : %s " % REMOTE_ADDR
    elif REMOTE_IDENT != "":
        aStr += " access from : %s " % REMOTE_IDENT
#    if HTTP_REFERER != "":
#        aStr += " referer : %s" % HTTP_REFERER
    if USER_AGENT != "":
        aStr += " agent : \"%s\"" % USER_AGENT
    return aStr

def htmlRemoteInfos():
    import os
    try:
        REMOTE_ADDR = os.environ['REMOTE_ADDR']
    except:
        REMOTE_ADDR = ""
    try:
        REMOTE_HOST = os.environ['REMOTE_HOST']
    except:
        REMOTE_HOST = ""
    try:
        REMOTE_IDENT = os.environ['REMOTE_IDENT']
    except:
        REMOTE_IDENT = ""
    try:
        REMOTE_USER = os.environ['REMOTE_USER']
    except:
        REMOTE_USER = ""
    del os

    aStr = ""
    aStr += "<b>\n"
    if REMOTE_USER != "":
        aStr += "<br>Hello, "+REMOTE_USER+" !<p>\n"
    elif REMOTE_HOST != "":
       aStr += "<br>Hello, "+REMOTE_HOST+"user !<p>\n"
    elif REMOTE_ADDR != "":
        aStr += "<br>Hello, "+REMOTE_ADDR+"user !<p>\n"
    elif REMOTE_IDENT != "":
        aStr += "<br>Hello, "+REMOTE_IDENT+"user !<p>\n"
    aStr +=  "</b>\n"
    return aStr

def htmlStartPre():
    return "<PRE>\n"

def htmlStopPre():
    return "</PRE>\n"

def htmlStartBorderTable():
    return "<TABLE BORDER>\n"

def htmlStartTable():
    return "<TABLE>\n"

def htmlStopTable():
    return "</TABLE>\n"

def htmlTableNewLine():
    return "<TR>"

def htmlTableStopLine():
    return "</TR>\n"

def htmlTableRightItem(item):
    return "<TD align=right>"+item+"</TD>"

def htmlTableRightH5Item(item):
    return "<TD align=right><h5>"+item+"</h5></TD>"

def htmlTableH5Item(item):
    return "<TD><h5>"+item+"</h5></TD>"

def htmlTableLeftH5Item(item):
    return "<TD align=left><h5>"+item+"</h5></TD>"

def htmlTableItem(item, mag = "", align = "", valign = "", bold = 0):
    aStr = ""
    aStr += "<TD "
    if align != "":
        aStr += "align="+align
    if valign != "":
        aStr += " valign="+valign
    aStr += ">"
    if mag != "":
        aStr += "<H"+str(mag)+">"
    aStr += item
    if mag != "":
        aStr += "</H"+str(mag)+">"
    aStr += "</TD>"
    return aStr

def htmlTableBoldItem(item):
    return "<TD><b>"+item+"</b></TD>"

def htmlRule():
    return "\n<HR>\n"

#
# Display back information about problem
#
def displayFormError(msg):
    aStr = ""
    aStr += htmlHeader()
    aStr += htmlMsg("<h3><font color=Red>Sorry: </font>"+msg+"</b></h3><p>")
    aStr += htmlMsg("<b>Please check the form fields.</b>")
    aStr += htmlTailer()
    print(aStr)
    raise SystemExit


#
# Pass a list of colors (strings)
# Will return a part of selector corresponding to the colors
#
def htmlColorSelector(colorList, selected = None):
    aStr = ""
    for color in colorList:
        if color == selected:
            aStr += "<OPTION value=\""+color+"\" selected >"+color+" \n"
        else:
            aStr += "<OPTION value=\""+color+"\">"+color+" \n"
    return aStr

def htmlWaitPageHeader(Title, delay, bgcolor = "white"):
    aStr = ""
    aStr += htmlHeader(Title,"<META http-equiv=\"refresh\" content=\""+str(delay)+"\"></META>",httpHead = 0, bgcolor=bgcolor)
    return aStr

def htmlRedirectToPage(PATH, title=""):
    aStr = ""
    aStr += htmlHeader(title,"<META> <meta http-equiv=\"refresh\" content=\"0;url="+PATH+"\"></META>",httpHead = 1)
    aStr += htmlTailer()
    return aStr

def optionString(name, values, labels, selected = "", js=""):
    aStr = "<SELECT size=1 NAME=\"%s\" %s>" % (name , js)
    for i in range(0,len(values)):
        if values[i] == selected:
            aStr += "<OPTION value=\"%s\" selected > %s " % (values[i],labels[i])
        else:
            aStr += "<OPTION value=\"%s\"> %s " % (values[i],labels[i])
    aStr += "</SELECT>"
    return aStr
