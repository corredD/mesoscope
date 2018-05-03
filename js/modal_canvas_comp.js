var modal_sim,
  modal_cont,
  modal_nodes,
  modal_canvas,
  modal_transform,
  modal_ctx,
  modal_comp_data,
  modal_pack,
  modal_root,
  modal_tree,
  modal_lisholder,
  modal_treelist,
  m_subject,
  modal_subject;

var m_start_drag = {"x":0,"y":0};
var comp_hover;
var comp_hover_surface;
var comp_link;


var updateCompLink = function(draggingNode,selectedNode) {
    var data = [];
    if (draggingNode !== null && selectedNode !== null) {
        // have to flip the source coordinates since we did this for the existing connectors on the original tree
        comp_link = {"source" : selectedNode,"target" : draggingNode};
        }
    else comp_link = null;
};

function childrenToList(parent) {
  var astr = '<ul>';
  for (var c in parent.children) {
    astr+='<li>'+parent.children[c].data.name;
    if (parent.children[c].children) astr+=childrenToList(parent.children[c]);
    else {
      if ("surface" in parent.children[c].data && parent.children[c].data.surface && parent.parent) astr+=' surface ';
    }
    astr+='</li>';
  }
  astr+='</ul>';
  return astr;
}

function drawHtmlTreeList(atree)
{
  console.log("atree",atree);
  var aStr=''
  aStr+='<ul class="d3ez htmlList">';
  //follow the graph. can use the first node that should be root
  var root = atree[0];
  aStr+='<li>'+root.data.name;
  if (root.children) aStr += childrenToList(root);
  aStr+='</li>';
  aStr+='</ul>';
  console.log("astr",aStr);
  modal_lisholder.innerHTML = aStr;
}

function SetupCompartmentModalCanvas(parentdiv, loc_comp) {
  modal_cont = document.getElementById("slickdetail");
  modal_lisholder = document.getElementById("listholder");
  var positionInfo = modal_cont.getBoundingClientRect();
  var height = positionInfo.height;
  var width = positionInfo.width;
  modal_canvas = parentdiv;
  modal_comp_data = loc_comp;
  modal_transform = d3v4.zoomIdentity;
  modal_transform.x = 0; //center of page->we want center of div?
  modal_transform.y = 0;
  modal_transform.k = 1;
  var pcontainer = $(parentdiv).parent();
  //loc_comp should be a compartmenthierarchy
  modal_ctx = parentdiv.getContext("2d");
  modal_ctx.width = width / 2; //max width
  modal_ctx.height = height; //max height
  //setup d3
  //setup simulation->ticked function
  setupModalD3();
  setupModalSimulation();

}

function resetAllModalNodePos(agraph) {
  var offx = modal_canvas.parentNode.offsetWidth;
  var offy = modal_canvas.parentNode.offsetHeight;
  var rect = modal_canvas.getBoundingClientRect();
  //console.log(rect);
  //console.log(canvas.parentNode.offsetHeight);//1278
  for (var i = 0; i < agraph.length; i++) {

    //console.log(agraph[i].x,agraph[i].y,width,height);
    agraph[i].x = agraph[i].x - offx / 2; // - rect.width/2;
    agraph[i].y = agraph[i].y - offy / 2; // - rect.height/2;
    //console.log(agraph[i].x,agraph[i].y);//+ rect.top
  }
  return agraph;
}

function centerAllModalNodePos(agraph){
  var rect = modal_canvas.getBoundingClientRect();
  //console.log(rect);
  //console.log(canvas.parentNode.offsetWidth);//1138
  //console.log(canvas.parentNode.offsetHeight);//1278
	for (var i=0;i<agraph.length;i++){

		//console.log(agraph[i].x,agraph[i].y,width,height);
		agraph[i].x = agraph[i].x  + rect.width/2;// - canvas.parentNode.offsetWidth/2;// - rect.width/2;
		agraph[i].y = agraph[i].y  + rect.height/2;// - canvas.parentNode.offsetHeight/2;// - rect.height/2;
		//console.log(agraph[i].x,agraph[i].y);//+ rect.top
		}
	return agraph;
}

function updateModalForce(){
			modal_sim.nodes(modal_nodes);
   		//modal_sim.force("link").links(graph.links);
			//simulation.force("link", d3v4.forceLink())//.iterations(1).id(function(d) { return d.id; }).strength(0.1))
		  modal_sim.force("d0", modal_isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 0; }))
		  modal_sim.force("d1", modal_isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 1; }))
		  modal_sim.force("d2", modal_isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 2; }))
		  modal_sim.force("d3", modal_isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 3; }))
		  modal_sim.force("d4", modal_isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 4; }))
		  //modal_sim.force("leaf", modal_isolate(d3v4.forceCollide().radius(function(d) {return d.r*1.15;}), function(d) { return !d.children; }));
      modal_sim.alpha(1).alphaTarget(0).restart();
	}

  function modal_isolate(force, filter) {
    var initialize = force.initialize;
    force.initialize = function() { initialize.call(force, modal_nodes.filter(filter)); };
    return force;
  }

function setupModalSimulation() {
  modal_sim = d3v4.forceSimulation()
    //.force("link", d3v4.forceLink()) //.iterations(1).id(function(d) { return d.id; }).strength(0.1))
    .force("d0", modal_isolate(d3v4.forceCollide().radius(function(d) {
      return d.r;
    }), function(d) {
      return d.depth === 0;
    }))
    .force("d1", modal_isolate(d3v4.forceCollide().radius(function(d) {
      return d.r;
    }), function(d) {
      return d.depth === 1;
    }))
    .force("d2", modal_isolate(d3v4.forceCollide().radius(function(d) {
      return d.r;
    }), function(d) {
      return d.depth === 2;
    }))
    .force("d3", modal_isolate(d3v4.forceCollide().radius(function(d) {
      return d.r;
    }), function(d) {
      return d.depth === 3;
    }))
    .force("d4", modal_isolate(d3v4.forceCollide().radius(function(d) {
      return d.r;
    }), function(d) {
      return d.depth === 4;
    }))
    //.force("leaf", modal_isolate(d3v4.forceCollide().radius(function(d) {
    //  return d.r * 1.15;
    //}), function(d) {
    //  return !d.children;
    //}))
    ;
  modal_sim
    .nodes(modal_nodes)
    .on("tick", modal_ticked);

  modal_sim.alpha(1).alphaTarget(0).restart();
}

function updateGraph(loc_comp)
{
    modal_comp_data = loc_comp;
    //before packing do the mapping on size ?
    modal_root = d3v4.hierarchy(modal_comp_data)
      .sum(function(d) {
        return d.size;
      })
      .sort(function(a, b) {
        return b.value - a.value;
      });
    console.log("root", modal_root);
    modal_nodes = modal_pack(modal_root).descendants();
    console.log("nodes", modal_nodes);
    modal_nodes = resetAllModalNodePos(modal_nodes);
    modal_nodes = centerAllModalNodePos(modal_nodes);
    drawHtmlTreeList(modal_root);
}

function setupModalD3() {
  //prepare the node using modal_comp_data
  modal_pack = d3v4.pack()
    .size([modal_ctx.width, modal_ctx.height])
    .padding(30);

  //before packing do the mapping on size ?
  modal_root = d3v4.hierarchy(modal_comp_data)
    .sum(function(d) {
      return d.size;
    })
    .sort(function(a, b) {
      return b.value - a.value;
    });
  console.log("root", modal_root);
  modal_nodes = modal_pack(modal_root).descendants();
  console.log("nodes", modal_nodes);
  modal_nodes = resetAllModalNodePos(modal_nodes);
  modal_nodes = centerAllModalNodePos(modal_nodes);
  modal_tree = d3v4.tree()
  .nodeSize([15, 75])
  .separation((a, b) => a.parent === b.parent ? 1 : 1)(modal_root)

  drawHtmlTreeList(modal_nodes);

  console.log(modal_tree.descendants());
  d3v4.select(modal_canvas)
    .on("mousemove", modal_mouseMoved) //or mouseover - mousemove
    .on("mouseout", modal_mouseLeave)
    .on("mouseover", modal_mouseEnter)
    //.on("onmousedown",isKeyPressed)
    //.on('keydown',isKeyPressed)
    .call(d3v4.drag()
      .container(modal_canvas)
      .subject(modal_subject)
      .on("start", modal_dragstarted)
      .on("drag", modal_dragged)
      .on("end", modal_dragended))
    .call(d3v4.zoom().scaleExtent([1 / 5, 20]).on("zoom", modal_zoomed).filter(function() {
      return (d3v4.event.button === 0 ||
        d3v4.event.button === 1);
    }));
}

function drawModalNode(d) {
  //if (!d.parent) return;
  modal_ctx.moveTo(d.x, d.y); //why +3?
  var ndx = d.x;
  var ndy = d.y;
  var surface = false;
  if (d.parent && !d.children && d.data.surface) {
    surface = true;
    //go to the circle parent contour
    var dx = d.x - d.parent.x,
      dy = d.y - d.parent.y,
      r = Math.sqrt(dx * dx + dy * dy),
      k = (d.parent.r - r) * 2 * 1 / r;
    d.vx += dx * k;
    d.vy += dy * k;
    //context.arc(d.x, d.y, d.r, 0, 10);//10
  } else if (!d.children && d.parent) {
    //this go to the center of the parent. could also try to collide with the inner circle of the par
    //d.vx += (d.parent.x - d.x) * 0.01 * 1;
    //d.vy += (d.parent.y - d.y) * 0.01 * 1;
    //context.arc(d.x, d.y, d.r, 0, 10);//10
  } else if (d.parent) {
    //d.vx += (d.parent.x - d.x) * 0.1 * 1;
    //d.vy += (d.parent.y - d.y) * 0.1 * 1;
    //context.arc(d.x, d.y, d.r, 0, 10);//10

  } else //context.arc(d.x, d.y, d.r, 0, 10);//0?
  {
    d.vx += (-d.x) * 0.1 * 1;
    d.vy += (-d.y) * 0.1 * 1;
    //d.fixed=true;
    //d.vx=0;
    //d.vy=0;
    //d.fx=null;
    //d.fy=null;
  }
  modal_ctx.beginPath();
  if (!d.parent) {
    //modal_ctx.rect(ndx,ndy,d.r*2.5,d.r*2.5);
    //modal_ctx.stroke();
  } else {
    //constraint inside his parent
    //var hyp2 = Math.pow(d.parent.r, 2),
    var dx = d.x - d.parent.x,
      dy = d.y - d.parent.y,
      r = Math.sqrt(dx * dx + dy * dy);
    if (r + d.r * 1.2 > d.parent.r && !surface && d.parent.parent) //outside parent
    {
      d.vx += (d.parent.x - d.x) * 0.15 * 1;
      d.vy += (d.parent.y - d.y) * 0.15 * 1;
    }
    modal_ctx.arc(ndx, ndy, d.r, 0, 10); //0?
  }
  //console.log(ndx,ndy);
}

var drawModalTreeNode = (anode) => {
  modal_ctx.beginPath()
  modal_ctx.moveTo(anode.x, anode.y)
  modal_ctx.arc(anode.x, anode.y, 4, 0, 2 * Math.PI)
  modal_ctx.fillStyle = color(anode.depth)
  modal_ctx.fill()

  modal_ctx.beginPath()
  modal_ctx.fillStyle = '#000'
  modal_ctx.fillText(anode.depth, anode.x - 4, anode.y + 20)
}

var linkGenerator = d3v4.linkVertical()
    .x(d => d.x)
    .y(d => d.y)
    .context(modal_ctx)

var drawModalTreeLink = (alink) => {
  modal_ctx.beginPath()
  linkGenerator(alink)
  modal_ctx.strokeStyle = color(alink.target.depth)
  modal_ctx.stroke()
}

function modal_draw() {
  var new_array = modal_nodes.slice(0);
  //var maping = graph.nodes.forEach(function(d,ind){ return {"ind":ind,"depth":d.depth};});
  new_array.sort(function(a,b){return a.depth-b.depth});
  new_array.forEach(function(d) {
    //for (var i = 0; i < graph.nodes.length; i++) {
    //user.values.forEach(drawNode);
    //var ind = i;//nodetodraw[i].index;
    //var d = graph.nodes[el.ind];
    //console.log("Draw ",i,d.data.name,d.depth);
    drawModalNode(d);
    if (d===comp_hover_surface) {
      modal_ctx.strokeStyle = "yellow";
      modal_ctx.lineWidth=8;
      modal_ctx.stroke();
      modal_ctx.fillStyle = colorNode(d);
      modal_ctx.fill();
      }
    else if (d===comp_hover) {
      modal_ctx.strokeStyle = "black";
      modal_ctx.lineWidth=8;
      modal_ctx.stroke();
      modal_ctx.fillStyle = "grey";//colorNode(d);
      modal_ctx.fill();
      }
    else {
      modal_ctx.fillStyle = (d.depth===6)? "rgba(55, 55, 255, 0.3)" : color(d.depth);
      modal_ctx.fill();
      modal_ctx.strokeStyle = color(d.depth+1);
      modal_ctx.stroke();
  }
  });
  //label
  var offset = 0;
  modal_nodes.forEach(function(d) {
    if (d.parent) {
      var fontSizeTitle = Math.round(d.r / 5);
      if (fontSizeTitle <= 4) fontSizeTitle = 10;
      if (fontSizeTitle > 4) {
        drawCircularText(modal_ctx, d.data.name,
          fontSizeTitle, titleFont, d.x, d.y, d.r, rotationText[offset], 0);
      }
      offset += 1;
    }
  });
  if (comp_link) {
     drawLink(modal_ctx,comp_link);
     modal_ctx.strokeStyle = "grey";
     modal_ctx.lineWidth=5;
     modal_ctx.stroke();
  }
  /*
  //draw Tree ?
  const mlinks = modal_tree.links()
  const mnodes = modal_tree.descendants()
  modal_ctx.beginPath()
  for(const link of mlinks) {
    drawModalTreeLink(link)
  }

  modal_ctx.beginPath()
  for(const anode of mnodes) {
    drawModalTreeNode(anode)
  }
  */
}

function modal_ticked() {
  // Store the current transformation matrix
  modal_ctx.save();

  // Use the identity matrix while clearing the canvas
  modal_ctx.setTransform(1, 0, 0, 1, 0, 0);
  modal_ctx.clearRect(0, 0, modal_canvas.width, modal_canvas.height);

  // Restore the transform
  modal_ctx.restore();

  modal_ctx.save();
  /*
  context.shadowColor = 'black';
  context.shadowOffsetX = 5;
  context.shadowOffsetY = 5;
  context.shadowBlur = 10;
  */
  //context.translate(width / 2, height / 2);
  modal_ctx.translate(modal_transform.x, modal_transform.y);
  //if scale 1 is 200x200, when resizing the windows we could increase the scale.
  //using the max between canvas.width,canvas.height
  modal_ctx.scale(modal_transform.k, modal_transform.k); //d3v4.dragzoombiased using the current width/height ?

  modal_draw();

  modal_ctx.restore();
}

function modal_zoomed() {
  modal_transform = d3v4.event.transform;
}

function modal_mouseEnter() {
  //console.log("d3 mouseenter");
  if (!d3v4.event.active) modal_sim.alphaTarget(0.3).restart();
}

function modal_mouseLeave() {

}

function modal_mouseMoved(event) {
  if ( simulation.alpha() < 0.01 ) simulation.alphaTarget(1).restart();
  /*var rect = canvas.getBoundingClientRect(), // abs. size of element
    scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
    scaleY = canvas.height / rect.height;
  var mx =  d3v4.event.layerX || d3v4.event.offsetX;//d3v4.event.clientX
  var my =  d3v4.event.layerY || d3v4.event.offsety;//d3v4.event.clientY
  var x = mx*scaleX;//(rect.left!=NaN)? (d3v4.event.clientX - rect.left)* scaleX: 0;//d3v4.event.clientX-width/2;
  var y = my*scaleY;//(rect.top!=NaN)? (d3v4.event.clientY - rect.top)* scaleY : 0;//d3v4.event.clientX-height/2;
  //console.log("x ",x," y ",y);
	//var x = d3v4.event.pageX - canvas.getBoundingClientRect().x;
  //var y = d3v4.event.pageY - canvas.getBoundingClientRect().y;
  //mousexy = {"x":x,"y":y};
	//console.log("d3 mousemove");
	//var mouseX = (d3v4.event.layerX || d3v4.event.offsetX) - canvas.getBoundingClientRect().x;
  //var mouseY = (d3v4.event.layerY || d3v4.event.offsetY) - canvas.getBoundingClientRect().y;
	//console.log(d3v4.event.x,d3v4.event.y);//udefined ?
	//if (d3v4.event.subject) console.log(d3v4.event.subject.data.name);
	//var m = d3v4.mouse();//or d3v4.event.x?
  //MouseMove(mouseX,mouseY);//m[0],m[1]);
  MouseMove(x,y);//nanan
  mousein = true;
 // isKeyPressed(event);
  //console.log(mousein);
  */
}

function modal_asubject(x,y) {
	var tolerance=5/2;
	m_subject = null;

	x = modal_transform.invertX(x);
	y = modal_transform.invertY(y);
  mousexy = {"x":x,"y":y};
	//mousexy = {"x":x,"y":y};
   //return subject;
	//console.log("mouse is at");
	//console.log(x,y);
  var n = modal_nodes.length,
      i,
      dx,
      dy,
      d2,
      r,
      d,
      subject;
  var miniD=9999;
  var depth_over=-10;
  //var minI = 9999;
  //is this hierarcica
  //sort by depth too ?
  for (i = 0; i < n; ++i) {
    d = modal_nodes[i];
    r = d.r;
    if (d.data.nodeType==="compartment") r = d.r*2;
    dx = x  - d.x;
    dy = y  - d.y;
    d2 = dx * dx + dy * dy;
    if (d2 < r*r) {
    	if (d.depth > depth_over) { //if (d2 < miniD) {
    		miniD = d2;
    	  subject = d;
    	  depth_over = d.depth;
    	}
    }
 }
  //how to find the link instead
  //graph.links
  //miniD=9999;
  miniD= Math.sqrt(miniD);
  return subject;
}

function modal_subject() {
    var rect = canvas.getBoundingClientRect(), // abs. size of element
      scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
      scaleY = canvas.height / rect.height;
  return modal_asubject(d3v4.event.x*scaleX, d3v4.event.y*scaleY);
}

function modal_dragstarted()
{
  console.log("modal_dragstarted");
  var rect = modal_canvas.getBoundingClientRect(), // abs. size of element
      scaleX = modal_canvas.width / rect.width,    // relationship bitmap vs. element for X
      scaleY = modal_canvas.height / rect.height;
	m_start_drag.x =  d3v4.event.x* scaleX;
	m_start_drag.y =  d3v4.event.y* scaleY;
  modal_sim.alphaTarget(2).restart();
  if (d3v4.event.subject.parent)
  {
    var depth = d3v4.event.subject.depth;
    d3v4.event.subject._depth = depth;
    d3v4.event.subject.depth = 6;
    updateModalForce();
  }
}

function modal_dragged() {
  console.log("modal_dragged");
  var rect = modal_canvas.getBoundingClientRect(), // abs. size of element
      scaleX = modal_canvas.width / rect.width,    // relationship bitmap vs. element for X
      scaleY = modal_canvas.height / rect.height;
  if (!d3v4.event.subject.parent) return;//root
  if (!d3v4.event.active) modal_sim.alphaTarget(1);
  //node_selected =  d3v4.event.subject;
  d3v4.event.subject.fx = m_start_drag.x  + ((d3v4.event.x - m_start_drag.x ) / modal_transform.k) * scaleX;//d3v4.event.x;
  d3v4.event.subject.fy = m_start_drag.y  + ((d3v4.event.y - m_start_drag.y ) / modal_transform.k) * scaleY;
  //console.log("modal_dragged", d3v4.event.subject.fx,d3v4.event.subject.fy,d3v4.event.subject.x,d3v4.event.subject.y);
  if (d3v4.event.subject.parent){
    var hovernodes = anotherSubject(d3v4.event.subject,d3v4.event.subject.x,d3v4.event.subject.y,modal_nodes);
    console.log("hovernodes ",hovernodes);
    if (hovernodes.node && hovernodes.node.data.nodetype === "compartment")
    {
      comp_hover = hovernodes.node;
      //highlghed surface
      //hovernodes.node.highlight = true;
      if ( Math.abs(hovernodes.node.r - hovernodes.distance) < d3v4.event.subject.r )
          comp_hover_surface = hovernodes.node;
      else
          comp_hover_surface = null;
      updateCompLink(d3v4.event.subject,hovernodes.node);
    }
    else {
      comp_link = null;
      comp_hover = null;
      comp_hover_surface = null;
    }
  }
}

function modal_dragended()
{
  console.log("modal_dragended");
  if (!d3v4.event.active) modal_sim.alphaTarget(0);
  d3v4.event.subject.fx = null;
  d3v4.event.subject.fy = null;
  //change relationship
  var hovernodes = anotherSubject(d3v4.event.subject,d3v4.event.subject.x,d3v4.event.subject.y,modal_nodes);
  console.log("hover ",hovernodes);
  //restore depth value
  d3v4.event.subject.depth = d3v4.event.subject._depth;
  //if subject is an ingredient and hover is compartment change graph
  if (hovernodes.node )
  {
    console.log (hovernodes.node.data.nodetype);
    if ( hovernodes.node.data.nodetype === "compartment") {
      var index = d3v4.event.subject.parent.children.indexOf(d3v4.event.subject);
      if (d3v4.event.subject.parent!=hovernodes.node) {
        if (d3v4.event.subject.children && d3v4.event.subject.children.indexOf(hovernodes.node)!==-1){}
        else {
          if (index > -1) {
            d3v4.event.subject.parent.children.splice(index, 1);
          }
          hovernodes.node.children.push(d3v4.event.subject);
          d3v4.event.subject.parent = hovernodes.node;
          d3v4.event.subject.depth = hovernodes.node.depth+1;
          hovernodes.node.r += d3v4.event.subject.r/2;
          var cname = d3v4.event.subject.ancestors().reverse().map(function(d) {return (d.children)?d.data.name:""; }).join('/').slice(0,-1);
          console.log("update ? ",d3v4.event.subject,cname);
          //if (d3v4.event.subject.nodetype !== "compartment")
          //  updateCellValue(gridArray[0],"compartment",d3v4.event.subject.data.id,cname);
          //else {
          //
          //}//need to change all child
        }
      }
      if ( Math.abs(hovernodes.node.r - hovernodes.distance) < d3v4.event.subject.r )
        d3v4.event.subject.data.surface = true;
      else
        d3v4.event.subject.data.surface = false;
      }
      drawHtmlTreeList(modal_nodes);
    }
  //update the table ?
  updateModalForce();
  comp_link = null;
  comp_hover = null;
  comp_hover_surface = null;
}
