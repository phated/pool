/*
 * 
Copyright 2011 Luis Montes

http://azprogrammer.com 

 */    



    dojo.require('mwe.box2d.Box');
    dojo.require('mwe.box2d.CircleEntity');    
    dojo.require('mwe.box2d.RectangleEntity');
    dojo.require('mwe.box2d.PolygonEntity');
    
    dojo.require('mwe.GameCore');
    dojo.require('mwe.ResourceManager');
    
	var debug = true;
	
	if(localStorage && localStorage.debug == 'n'){
		debug = false;
	}
	
    var crazyMode = false;
    
    var SCALE = 30.0;
    var NULL_CENTER = {x:null, y:null};
    
    var ballToHit = null;
    var ballToMove = null;
    var mouseDownPt = null;
    var maxImpulse = 25;
    var rm = null;
    
    var backImg = null;
    var shots = 0;
    
    
    var ballRadius = 0.4;
    var tableHeight = 385;
    var cueStart = {x:508/SCALE,y:192/SCALE};
    
    
    //first ball starting point
    var sp = {x:192/SCALE,y:192/SCALE};
    //first balls starting point in crazy mode x offset
    var spczx = (230 - 190)/SCALE;
    
    //ball exit
    var be = {x:70/SCALE,y:400/SCALE};
    
    var stats = new Stats();

    // Align top-left
    var stats = new Stats();

    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right    = '0px';
    stats.domElement.style.bottom   = '0px';

	var prefMode = 8;
	if(localStorage && localStorage.prefMode){
		prefMode = localStorage.prefMode;	
	}
    
        
    
    var goalPts = [{x:34,y:35},{x:350,y:25},{x:664,y:35},{x:664,y:350},{x:350,y:360},{x:35,y:350}];
    
    //hills for crazy mode
    var hills = [{angle:90,pts:[{x:114/SCALE,y:113/SCALE},{x:1/SCALE,y:1/SCALE},{x:699/SCALE,y:1/SCALE},{x:586/SCALE,y:113/SCALE}]},
                 {angle:180,pts:[{x:587/SCALE,y:113/SCALE},{x:700/SCALE,y:1/SCALE},{x:700/SCALE,y:384/SCALE},{x:587/SCALE,y:269/SCALE}]},
                 {angle:270,pts:[{x:586/SCALE,y:270/SCALE},{x:699/SCALE,y:384/SCALE},{x:1/SCALE,y:384/SCALE},{x:114/SCALE,y:270/SCALE}]},
                 {angle:0,pts:[{x:113/SCALE,y:270/SCALE},{x:1/SCALE,y:383/SCALE},{x:1/SCALE,y:2/SCALE},{x:113/SCALE,y:115/SCALE}]}];

    for(var i = 0; i < goalPts.length; i++){
    	goalPts[i].x = goalPts[i].x / SCALE;
    	goalPts[i].y = goalPts[i].y / SCALE;
    }
    var stickStartColor = {r:254,g:232,b:214};
    var stickEndColor = {r:255,g:0,b:0};
    var stickDistance = 0;
   
      dojo.declare("Ball", [mwe.box2d.CircleEntity], {
        constructor: function(/* Object */args){
            dojo.safeMixin(this, args);
        },
        draw: function(ctx){
          var radius = this.radius * SCALE;
          var sx = this.x * SCALE;
          var sy = this.y * SCALE;
          
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, Math.PI * 2, true);          
          ctx.closePath();
          ctx.fill();
         
          //ctx.strokeStyle = '#000000';
          
          
          if(this.id != 0){
        	  /*
        	  ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.arc(this.x * SCALE, this.y * SCALE, this.radius * SCALE * 0.4, 0, Math.PI * 2, true);          
              ctx.closePath();
              ctx.fill();
        	  */
	          ctx.save();
	          ctx.translate(sx, sy);
	          ctx.rotate(this.angle);
	          ctx.translate(-sx, -sy);
	         
			 ctx.fillStyle = '#FFFFFF';
			 ctx.font = "8pt Arial";
			 var textXOffset;
			 
			 if(this.id < 10){
				textXOffset = sx - radius/2 + 3;
			 }else{
				textXOffset = sx - radius/2;
			 }
			  
			  ctx.fillText(this.id,textXOffset,sy - radius /2 + 10);
			  
	          if(this.striped){
				  
		          ctx.beginPath();
	              ctx.arc(sx, sy, radius, Math.PI * 1.77, Math.PI * 1.22 , true);          
	              ctx.closePath();
	              ctx.fill();
	              
	              ctx.beginPath();
	              ctx.arc(sx, sy, radius, Math.PI * 0.77, Math.PI * 0.22 , true);          
	              ctx.closePath();
	              ctx.fill();
	          }	          
	          
			  
			  
	          ctx.restore();
	          
			  /*
	          ctx.strokeStyle = '#000000';
	          ctx.beginPath();
	          ctx.arc(this.x * SCALE, this.y * SCALE, this.radius * SCALE * 0.4, 0, Math.PI * 2 , true);          
	          ctx.closePath();
	          ctx.stroke();
	          */
	          
          }
          
          ctx.strokeStyle = '#000000';
          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, Math.PI * 2, true);          
          ctx.closePath();
          ctx.stroke();
          
        }
       });
    
      
    var world = {};
    var worker = null;
    var bodiesState = null;
    var box = null;
    


  var isPointInPoly = function(poly, pt){
		for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
			((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
			&& (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
			&& (c = !c);
		return c;
	};

    
    //get coordinates in box2d space
    var getGfxMouse = function(evt){
  	  var coordsM = dojo.coords(dojo.byId('canvas'));
  	  return {x: (evt.clientX - coordsM.x) / SCALE, y: (evt.clientY - coordsM.y) / SCALE};
    };
    
    var getColorFade = function(start,end,percent){
    	var r = Math.floor((end.r - start.r) * percent) + start.r;
    	var g = Math.floor((end.g - start.g) * percent) + start.g;
    	var b = Math.floor((end.b - start.b) * percent) + start.b;
    	return {r:r,g:g,b:b};
    };
    
    
    var intersect = function (s1, s2,radiiSquared) {

		var distance_squared = Math.pow(s1.x  - s2.x,2) + Math.pow(s1.y - s2.y,2);
		//var radii_squared = 1; //Math.pow(s1.collisionRadius + s2.collisionRadius,2);
		return distance_squared < radiiSquared;  // true if intersect
		
	};
	
	var getCollidedBall = function(mouse){
		for (var i = 0; i< initialState.length; i++) {
			if(intersect(mouse,world[i],0.5)){
				return world[i];
				
			}
	        
	     }
		return null;
	};
    
	var getDegrees = function(center, pt){
		
		//same point
		if((center.x == pt.x) && (center.y == pt.y)){
			return 0;
		}else if(center.x == pt.x){
			if(center.y < pt.y){
				return 180;
			}else{
				return 0;
			}
		}else if(center.y == pt.y){
			if(center.x > pt.x){
				return 270;
			}else{
				return 90;
			}
		}else if((center.x < pt.x) && (center.y > pt.y)){
			//quadrant 1
			console.log('quad1',center.x,center.y,pt.x,pt.y,'o',pt.x - center.x,'a',pt.y - center.y);
			return Math.atan((pt.x - center.x)/(center.y - pt.y)) * (180 / Math.PI);
		}
		else if((center.x < pt.x) && (center.y < pt.y)){
			//quadrant 2
			console.log('quad2',center.x,center.y,pt.x,pt.y);
			return 90 + Math.atan((pt.y - center.y)/(pt.x - center.x)) * (180 / Math.PI);
		}
		else if((center.x > pt.x) && (center.y < pt.y)){
			//quadrant 3
			console.log('quad3',center.x,center.y,pt.x,pt.y);
			return 180 + Math.atan((center.x - pt.x)/(pt.y - center.y)) * (180 / Math.PI);
		}
		else{
			//quadrant 4
			console.log('quad4',center.x,center.y,pt.x,pt.y);
			return 270 + Math.atan((center.y - pt.y)/(center.x - pt.x)) * (180 / Math.PI);
		}
		
	};
	
	var getDistance = function(a,b){
		return Math.sqrt((a.x - b.x)*(a.x - b.x) + (a.y - b.y)*(a.y - b.y));
		
	};
	
	var ptOnTable = function(pt){
		
		if((pt.x > (38 / SCALE)) && (pt.x < (661 / SCALE)) && (pt.y > (38 / SCALE)) && (pt.y < (347 / SCALE)) ){
			return true;
		}else{
			return false;
		}
	};
	
	var toggleCrazyMode = function(){
		console.log('crazy',crazyMode);
	    if(!crazyMode){
	        dojo.byId('crazyBtn').innerHTML = 'Normal Mode';	        
	    }else{
   	        dojo.byId('crazyBtn').innerHTML = 'CRAZY Mode!';
	    }
		
		crazyMode = !crazyMode;
		
		if(shots == 0){
			if(prefMode == 9){
				rack9Ball();
			}else{
				rack8Ball();
			}
			
		}
	    console.log('crazy',crazyMode);
	
	};
	
	var clearTable = function(){
		for(var i = 0; i < 16; i++){
			var entity = world[i];
			box.removeBody(i);
			entity.y = be.y;
			entity.x = be.x + (2 * i * ballRadius) + (2*ballRadius);
			entity.onTable = false;
			box.addBody(entity);        	
		}
		resetShots();
	};	
	var rack8Ball = function(){
		if(localStorage){
			localStorage.prefMode = 8;
		}
		prefMode = 8;
	
	
		for(var i = 0; i < 16; i++){
			var entity = world[i];
			box.removeBody(i);
			if(crazyMode){
				entity.x = eightBallLocs[i].x + spczx;
			}else{
				entity.x = eightBallLocs[i].x;
			}
			entity.y = eightBallLocs[i].y;
			entity.onTable = true;
			box.addBody(entity);        				
		}
		resetShots();
	};
	var rack9Ball = function(){
	
		if(localStorage){
			localStorage.prefMode = 9;
		}
		prefMode = 9;
	
		for(var i = 0; i < 10; i++){
			var entity = world[i];
			box.removeBody(i);
			if(crazyMode){
				entity.x = nineBallLocs[i].x + spczx;
			}else{
				entity.x = nineBallLocs[i].x;
			}			
			entity.y = nineBallLocs[i].y;
			entity.onTable = true;
			box.addBody(entity);        				
		}
		for(var i = 10; i < 16; i++){
			var entity = world[i];
			box.removeBody(i);
			entity.y = be.y;
			entity.x = be.x + (2 * i * ballRadius) + (2*ballRadius);
			entity.onTable = false;
			box.addBody(entity);       				
		}
		resetShots();
	};
	
	
	var incrementShots = function(){
		shots++;
		dojo.byId('shotsDisp').innerHTML = shots;
	};
	
	var resetShots = function(){
		shots = 0;
		dojo.byId('shotsDisp').innerHTML = shots;
	};
	
	var eightBallLocs = [
	                       {id:0,x:cueStart.x, y:cueStart.y},
	                       {id:1,x: sp.x , y: sp.y},
	                       {id:2,x: sp.x - (2 * ballRadius) , y:sp.y - ballRadius},
	                       {id:3,x: sp.x - (4 * ballRadius) , y:sp.y + (2 * ballRadius)},
	                       {id:4,x: sp.x - (6 * ballRadius) , y:sp.y - (3 * ballRadius)},
	                       {id:5,x: sp.x - (8 * ballRadius) , y:sp.y + (4 * ballRadius)},
	                       {id:6,x: sp.x - (8 * ballRadius) , y:sp.y - (2 * ballRadius)},
	                       {id:7,x: sp.x - (6 * ballRadius) , y:sp.y + ballRadius},
	                       {id:8,x: sp.x - (4 * ballRadius) , y:sp.y},
	                       {id:9,x: sp.x - (2 * ballRadius) , y:sp.y + ballRadius},
	                       {id:10,x: sp.x - (4 * ballRadius) , y:sp.y - (2 * ballRadius)},
	                       {id:11,x: sp.x - (6 * ballRadius) , y:sp.y + (3 * ballRadius)},
	                       {id:12,x: sp.x - (8 * ballRadius) , y:sp.y - (4 * ballRadius)},
	                       {id:13,x: sp.x - (8 * ballRadius) , y:sp.y + (2 * ballRadius)},
	                       {id:14,x: sp.x - (6 * ballRadius) , y:sp.y - ballRadius},
	                       {id:15,x: sp.x - (8 * ballRadius) , y:sp.y}
	                       ];
	
	var nineBallLocs = [
	                       {id:0,x:cueStart.x, y:cueStart.y},
	                       {id:1,x: sp.x , y: sp.y},
	                       {id:2,x: sp.x - (2 * ballRadius) , y:sp.y - ballRadius},
	                       {id:3,x: sp.x - (2 * ballRadius) , y:sp.y + ballRadius},
	                       {id:4,x: sp.x - (4 * ballRadius) , y:sp.y - (2 * ballRadius)},
	                       {id:5,x: sp.x - (4 * ballRadius) , y:sp.y + (2 * ballRadius)},
	                       {id:6,x: sp.x - (6 * ballRadius) , y:sp.y - ballRadius},
	                       {id:7,x: sp.x - (6 * ballRadius) , y:sp.y + ballRadius},
	                       {id:8,x: sp.x - (8 * ballRadius) , y:sp.y},
	                       {id:9,x: sp.x - (4 * ballRadius) , y:sp.y}
	                       ];
	
	

	
	var initialState= [
					  new Ball({id:0,color:"#FFFFFF",striped:false}),
					  new Ball({id:1,color:"#DDDD00",striped:false}),
					  new Ball({id:2,color:"#0000CC",striped:false}),
					  new Ball({id:3,color:"#FF0000",striped:false}),
					  new Ball({id:4,color:"#880088",striped:false}),
					  new Ball({id:5,color:"#FF6600",striped:false}),
	                  
					  new Ball({id:6,color:"#007700",striped:false}),
					  new Ball({id:7,color:"#770000",striped:false}),
					  new Ball({id:8,color:"#000000",striped:false}),
					  new Ball({id:9,color:"#DDDD00",striped:true}),
					  new Ball({id:10,color:"#0000CC",striped:true}),
	                  
					  new Ball({id:11,color:"#FF0000",striped:true}),
					  new Ball({id:12,color:"#880088",striped:true}),
					  new Ball({id:13,color:"#FF6600",striped:true}),
					  new Ball({id:14,color:"#007700",striped:true}),
					  new Ball({id:15,color:"#770000",striped:true}),
	                  
	                  
	                  new mwe.box2d.PolygonEntity({id: 16, x: 0, y: 0, points: [{x:60,y:35},{x:25,y:0},{x:338,y:0},{x:330,y:35}],staticBody: true, hidden: true}),
	                  new mwe.box2d.PolygonEntity({id: 17, x: 0, y: 0, points: [{x:369,y:35},{x:362,y:0},{x:675,y:0},{x:639,y:35}],staticBody: true, hidden: true}),
	                  
	                  new mwe.box2d.PolygonEntity({id: 18, x: 0, y: 0, points: [{x:664,y:60},{x:700,y:24},{x:700,y:362},{x:664,y:324}],staticBody: true, hidden: true}),
	                  
	                  new mwe.box2d.PolygonEntity({id: 19, x: 0, y: 0, points: [{x:370,y:349},{x:638,y:349},{x:675,y:385},{x:362,y:385}],staticBody: true, hidden: true}),
	                  new mwe.box2d.PolygonEntity({id: 20, x: 0, y: 0, points: [{x:60,y:349},{x:330,y:349},{x:338,y:385},{x:25,y:385}],staticBody: true, hidden: true}),
	                  
	                  new mwe.box2d.PolygonEntity({id: 21, x: 0, y: 0, points: [{x:0,y:35},{x:35,y:60},{x:35,y:324},{x:0,y:361}],staticBody: true, hidden: true}),
	                  
	                  new mwe.box2d.PolygonEntity({id: 22, x: 0, y: 0, points: [{x:9,y:9},{x:31,y:15},{x:11,y:32}],staticBody: true, hidden: true}),	                  
	                  new mwe.box2d.PolygonEntity({id: 23, x: 0, y: 0, points: [{x:350,y:1},{x:360,y:13},{x:339,y:13}],staticBody: true, hidden: true}),
	                  new mwe.box2d.PolygonEntity({id: 24, x: 0, y: 0, points: [{x:695,y:5},{x:684,y:30},{x:667,y:13}],staticBody: true, hidden: true}),
	                  
	                  new mwe.box2d.PolygonEntity({id: 25, x: 0, y: 0, points: [{x:696,y:381},{x:665,y:369},{x:685,y:355}],staticBody: true, hidden: true}),	                  
	                  new mwe.box2d.PolygonEntity({id: 26, x: 0, y: 0, points: [{x:349,y:382},{x:338,y:371},{x:361,y:371}],staticBody: true, hidden: true}),
	                  new mwe.box2d.PolygonEntity({id: 27, x: 0, y: 0, points: [{x:3,y:381},{x:15,y:355},{x:30,y:371}],staticBody: true, hidden: true}),
	                  
	                  new mwe.box2d.RectangleEntity({id: 28, x: 30/SCALE, y: 415/SCALE, halfHeight: 30/SCALE, halfWidth: 30/SCALE,staticBody: true, hidden: true}),
	                  new mwe.box2d.RectangleEntity({id: 29, x: 670/SCALE, y: 415/SCALE, halfHeight: 30/SCALE, halfWidth: 30/SCALE,staticBody: true, hidden: true}),
	                  new mwe.box2d.RectangleEntity({id: 30, x: 350/SCALE, y: 430/SCALE, halfHeight: 15/SCALE, halfWidth: 290/SCALE,staticBody: true, hidden: true})
	                  
	                  
	                  
	                  
	                  ];
	
	
	
	
	var doMouseUp = function(e){
  	  mouseDownPt = null;
  	  var pt = getGfxMouse(e);
  	  
  	  
  	  if(ballToHit){
  		  
  			var degrees =  getDegrees(ballToHit,pt); //theta * (180 / Math.PI);
  			console.log('degrees',degrees);
  			
				box.applyImpulse(ballToHit.id, degrees + 90, Math.min( getDistance(ballToHit,pt) * 3, maxImpulse )  );
				incrementShots();
				ballToHit = null;
			  
  	  }
  	      	  
  	  if(ballToMove){
  		  
  		  if(ptOnTable(pt)){
  			box.removeBody(ballToMove.id);
  			ballToMove.y = pt.y;
  			ballToMove.x = pt.x;
  			ballToMove.onTable = true;
				box.addBody(ballToMove);  
  		  }
  		  
  		  ballToMove = null;
  	  }
  	        
    };
    
    var doMouseMove = function(e){
  	  if(mouseDownPt){
  	  	mouseDownPt = getGfxMouse(e);
  	  }
    };
    
    var doMouseDown = function(e){
  	  
  	  
  	  for (var id in world) {
	        var entity = world[id];
	        entity.selected = false;
	  	  }
  	  
  	  var pt = getGfxMouse(e);
  	  mouseDownPt = pt;
  	  console.log('mouse',pt.x,pt.y);
  	  var selectedBall = getCollidedBall(pt);
  	  
  	  if(selectedBall){
  		  if(selectedBall.onTable){
  		  	ballToHit = selectedBall;
  		  	ballToHit.selected = true;
  		  }else{
  			ballToMove = selectedBall;
  			ballToMove.selected = true;
  		  }    		  
  	  }    	 
  	        
    };
    
    var doTouchStart = function(evt){
	 	//dojo.byId("evtOut").innerHTML = 'start touches:' + evt.changedTouches.length;// + '  targetTouches:' + dojo.toJson(evt.targetTouches);
	 	doMouseDown(evt.changedTouches[0]);
	 	
	  }; 
	  
	  var doTouchEnd = function(evt){
	  
	 	//dojo.byId("evtOut").innerHTML = 'end touches:' + dojo.toJson(evt.touches) + '  targetTouches:' + dojo.toJson(evt.targetTouches);
	 	doMouseUp(evt.changedTouches[0]);
	  }; 
	  
	  var doTouchMove = function(evt){
		  evt.preventDefault();
	 	//dojo.byId("evtOut").innerHTML = 'move touches:';// + dojo.toJson(evt.touches) + '  targetTouches:' + dojo.toJson(evt.targetTouches);
	 	doMouseMove(evt.changedTouches[0]);
	  }; 
	
	
    dojo.ready(function() {
        if(debug){
			dojo.place(stats.domElement,dojo.body(),'last');      
		}
      
    	rm = new mwe.ResourceManager();
    	backImg = rm.loadImage('pool_table_700x385.png');
    	backImgCrazy = rm.loadImage('pool_table_700x385_crazy.png');
    	
    	
    	
    	
    	for (var i = 0; i< initialState.length; i++) {
    	
    	  var iS = initialState[i];
    	  
    	  if(i < 16){
    		iS.radius = ballRadius;
    	  	iS.linearDamping = 0.6;
    	  	iS.angularDamping = 0.5;
    	  	iS.restitution = 0.9;
    	  }
    	  

    	  
    	  if(iS.points){
    		  for(var j = 0; j < iS.points.length; j++){
    			  iS.points[j].x = iS.points[j].x / SCALE;
    			  iS.points[j].y = iS.points[j].y / SCALE;
    		  }
    	  }
    	  
    	  if((i > 15) && (i < 28)){
    		  iS.x = 0;
    		  iS.y = 0;
    	  }
    	  
    	  
          world[i] = iS;
      }
    	
    	
     
      
      
      dojo.connect(dojo.byId('clearBtn'),'onclick',function(e){
    	  clearTable();
      });
      dojo.connect(dojo.byId('rack8Btn'),'onclick',function(e){
    	  rack8Ball();
      });
      dojo.connect(dojo.byId('rack9Btn'),'onclick',function(e){
    	  rack9Ball();
      });
      dojo.connect(dojo.byId('crazyBtn'),'onclick',function(e){
    	  toggleCrazyMode();
      });
      
      
     	  
        dojo.connect(document,'mousemove',function(e){
      	  doMouseMove(e);
        });
        
        dojo.connect(dojo.byId('canvas'),'mousedown',function(e){   	  
      	  doMouseDown(e);   	     	        
        });
        dojo.connect(document,'mouseup',function(e){
      	  doMouseUp(e);        
        });
        
        dojo.connect(document,'ontouchmove',function(e){
      	  doTouchMove(e);
        });
        
        dojo.connect(dojo.byId('canvas'),'ontouchstart',function(e){   	  
      	  doTouchStart(e);   	     	        
        });
        dojo.connect(document,'ontouchend',function(e){
      	  doTouchEnd(e);        
        });
      
   
      
      dojo.connect(document,'onselectstart',function(e){
    	  e.preventDefault();
    	  return false;
      });
      
       
      
      
      
      game = new mwe.GameCore({
          canvasId: 'canvas',
          resourceManager: rm,
          update : function(elapsedTime){
              box.update();
              bodiesState = box.getState();
              
              for (var id in bodiesState) {
                var entity = world[id];
                if (entity){
                	entity.update(bodiesState[id]);
                	for(var i = 0;  i < goalPts.length; i++){
                		if(intersect(entity,goalPts[i],0.2)){
                			entity.dead = true;
                			console.log('removed');
                			try{
                				box.removeBody(id);
                				entity.y = be.y;
                				entity.x = be.x;
                				entity.onTable = false;
                				box.addBody(entity);        				
                				box.applyImpulse(id, 0, 2);
                			}catch(e){
                				console.log(e);
                			}
                		}
                		
                		if(crazyMode){
                    		for(var j = 0;  j < hills.length; j++){
	                        	if(isPointInPoly(hills[j].pts,entity)){
	                          	  box.applyImpulse(entity.id, hills[j].angle, 0.1  );  
	                            }
                        	}
                    	}
                	}
                	
                }
              }
              if(debug){
				stats.update();
			  }
          },
          draw: function(ctx){
        	  ctx.lineWidth = 1;
              ctx.clearRect ( 0 , 0 , this.width, this.height);
              if(crazyMode){
                  ctx.drawImage(backImgCrazy,0, 0, this.width, tableHeight);                  
              }else{
                  ctx.drawImage(backImg,0, 0, this.width, tableHeight);
              }
              
              if(ballToHit && mouseDownPt){
            	  var impPerc = (Math.min(getDistance(ballToHit,mouseDownPt) * 3, maxImpulse) * 1.0) / maxImpulse;
            	  var colorFade  = getColorFade(stickStartColor,stickEndColor,impPerc);
            	  var lineWidth = ctx.lineWidth;
            	  ctx.lineWidth = 3;
            	  ctx.beginPath();
            	  ctx.moveTo(ballToHit.x * SCALE, ballToHit.y * SCALE);
            	  ctx.lineTo(mouseDownPt.x * SCALE, mouseDownPt.y * SCALE);
            	  ctx.strokeStyle = 'rgb('+ colorFade.r + ',' + colorFade.g + ','+ colorFade.b + ')'; 
            	  ctx.stroke();
            	  ctx.closePath();
            	  ctx.lineWidth = lineWidth;
              }
              
              for (var id in world) {
                  var entity = world[id];
                  if(!entity.hidden){
                  	entity.draw(ctx);
                  }
                }
              
              if(ballToMove && mouseDownPt){
            	  var lineWidth = ctx.lineWidth;
            	  ctx.lineWidth = 5;
            	  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                  ctx.beginPath();
                  ctx.arc(mouseDownPt.x * SCALE, mouseDownPt.y * SCALE, ballRadius * SCALE, 0, Math.PI * 2 , true);          
                  ctx.closePath();
                  ctx.stroke();
            	  ctx.lineWidth = lineWidth;
              } 
          }
          
      });
      
      box = new mwe.box2d.Box({intervalRate:60, adaptive:false, width:game.width, height:game.height, scale:SCALE,gravityY:0});
      box.setBodies(world);
      
	    if(prefMode == 9){
			rack9Ball();
		}else{
			rack8Ball();
		}
	  
      game.run();
      
    });
