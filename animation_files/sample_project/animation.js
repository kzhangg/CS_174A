// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// very little in it - you will fill it in with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes are drawn, and to see where to fill in your own code.

"use strict"
var canvas, canvas_size, gl = null, g_addrs,
	movement = vec2(),	thrust = vec3(), 	looking = false, prev_time = 0, animate = false, animation_time = 0;
		var gouraud = false, color_normals = false, solid = false;
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( vec4( .8,.3,.8,1 ), .5, 1, 1, 40, "" ) ); }


// *******************************************************
// IMPORTANT -- In the line below, add the filenames of any new images you want to include for textures!

var texture_filenames_to_load = [ "stars.png", "text.png", "earth.gif", "tatami.png", "fur.png", "wallpaper.png", "cardboard.png", "wood.jpeg" ];

// *******************************************************	
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- which OpenGL is told to call upon every time a
// draw / keyboard / mouse event happens.

window.onload = function init() {	var anim = new Animation();	}
function Animation()
{
	( function init (self) 
	{
		self.context = new GL_Context( "gl-canvas" );
		self.context.register_display_object( self );
		
		gl.clearColor( 0, 0, 1, 0 );			// Background color
		
		for( var i = 0; i < texture_filenames_to_load.length; i++ )
			initTexture( texture_filenames_to_load[i], true );
		
		self.m_cube = new cube();
		self.m_obj = new shape_from_file( "teapot.obj" )
		self.m_axis = new axis();
		self.m_sphere = new sphere( mat4(), 4 );	
		self.m_fan = new triangle_fan_full( 10, mat4() );
		self.m_strip = new rectangular_strip( 1, mat4() );
		self.m_cylinder = new cylindrical_strip( 10, mat4() );
		self.m_windmill = new windmill(10);
		self.m_triangle = new triangle ();
		self.m_tetrahedron = new tetrahedron();
		self.m_sofa = new shape_from_file( "Canape.obj")
		self.m_trashcan = new trashcan(mat4());
		// 1st parameter is camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		self.graphicsState = new GraphicsState( translation(0, 0,-40), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );

		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);		gl.uniform1i( g_addrs.SOLID_loc, solid);
		
		self.context.render();	
	} ) ( this );	
	
	canvas.addEventListener('mousemove', function(e)	{		e = e || window.event;		movement = vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2, 0);	});
}

// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0,  1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;
	shortcut.add( ".",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0, -1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;

	shortcut.add( "r",     ( function(self) { return function() { self.graphicsState.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+s", function() { solid = !solid;					gl.uniform1i( g_addrs.SOLID_loc, solid);	
																		gl.uniform4fv( g_addrs.SOLID_COLOR_loc, vec4(Math.random(), Math.random(), Math.random(), 1) );	 } );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud;				gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);	} );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	
	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );	
}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70, border = 50;
		var degrees_per_frame = .0002 * animation_delta_time;
		var meters_per_frame  = .01 * animation_delta_time;
																					// Determine camera rotation movement first
		var movement_plus  = [ movement[0] + leeway, movement[1] + leeway ];		// movement[] is mouse position relative to canvas center; leeway is a tolerance from the center.
		var movement_minus = [ movement[0] - leeway, movement[1] - leeway ];
		var outside_border = false;
		
		for( var i = 0; i < 2; i++ )
			if ( Math.abs( movement[i] ) > canvas_size[i]/2 - border )	outside_border = true;		// Stop steering if we're on the outer edge of the canvas.

		for( var i = 0; looking && outside_border == false && i < 2; i++ )			// Steer according to "movement" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.graphicsState.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.graphicsState.camera_transform = mult( translation( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
	}

// *******************************************************	
// display(): called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time)
	{
		if(!time) time = 100000;
		this.animation_delta_time = time - prev_time;
		if(animate) this.graphicsState.animation_time += this.animation_delta_time;
		prev_time = time;
		
		update_camera( this, this.animation_delta_time );
			
		this.basis_id = 0;
		
		var model_transform = mat4();
		
		// Materials: Declare new ones as needed in every function.
		// 1st parameter:  Color (4 floats in RGBA format), 2nd: Ambient light, 3rd: Diffuse reflectivity, 4th: Specular reflectivity, 5th: Smoothness exponent, 6th: Texture image.
		var purplePlastic = new Material( vec4( .9,.5,.9,1 ), .2, .5, .8, 40 ), // Omit the final (string) parameter if you want no texture
			greyPlastic = new Material( vec4( .5,.5,.5,1 ), .2, .8, .5, 20 );

			
		/**********************************
		Start coding here!!!!
		**********************************/
		var stack = [];
	
		var xPos;
		var yPos;
		var zPos;

		var room = this.room(mult(model_transform, translation(0, -5, 0)));
		
		if(animate){
		 
			//360 around trash can
			if(this.graphicsState.animation_time <= 12575){
				this.graphicsState.camera_transform = lookAt(vec3(Math.sin(this.graphicsState.animation_time * .0005) * 25, 0, Math.cos(this.graphicsState.animation_time * .0005) * 25), vec3(0,0,0), vec3(0,1,0) ); 
			
			}

			//shaky
			if(this.graphicsState.animation_time <= 1500){
				model_transform = mult( model_transform, rotation( Math.sin(this.graphicsState.animation_time/80)*5, 0, 0, 1  ));
				var bucket = this.trashcan(model_transform);

			}

			if(this.graphicsState.animation_time > 1500 && this.graphicsState.animation_time <= 2500){
				model_transform = mult( model_transform, scale(1,1,1));
				var bucket = this.trashcan(model_transform);

			}
			if(this.graphicsState.animation_time  > 2500 && this.graphicsState.animation_time <= 4000){
				model_transform = mult( model_transform, rotation( Math.sin(this.graphicsState.animation_time/80)*5, 0, 0, 1  ));
				var bucket = this.trashcan(model_transform);

			}
			
			if(this.graphicsState.animation_time > 4000 && this.graphicsState.animation_time <= 5000){
				model_transform = mult( model_transform, scale(1,1,1));
				var bucket = this.trashcan(model_transform);
			}
			if(this.graphicsState.animation_time  > 5000 && this.graphicsState.animation_time <= 6500){
				model_transform = mult( model_transform, rotation( Math.sin(this.graphicsState.animation_time/80)*5, 0, 0, 1  ));
				var bucket = this.trashcan(model_transform);
			}

			if(this.graphicsState.animation_time > 6500 && this.graphicsState.animation_time <= 7500){
				model_transform = mult( model_transform, rotation( Math.sin(this.graphicsState.animation_time/80)*5, 0, 0, 1  ));
				var bucket = this.trashcan(model_transform);

			}

			if(this.graphicsState.animation_time > 7500 && this.graphicsState.animation_time <= 9000){
				model_transform = mult( model_transform, scale(1,1,1));
				var bucket = this.trashcan(model_transform);

			}
			if(this.graphicsState.animation_time  > 9000 && this.graphicsState.animation_time <= 10500){
				model_transform = mult( model_transform, rotation( Math.sin(this.graphicsState.animation_time/80)*5, 0, 0, 1  ));
				var bucket = this.trashcan(model_transform);

			}
			
			if(this.graphicsState.animation_time > 10500 && this.graphicsState.animation_time <= 11500){
				model_transform = mult( model_transform, scale(1,1,1));
				var bucket = this.trashcan(model_transform);
			}
			if(this.graphicsState.animation_time  > 11500 && this.graphicsState.animation_time <= 12575){
				model_transform = mult( model_transform, rotation( Math.sin(this.graphicsState.animation_time/80)*5, 0, 0, 1  ));
				var bucket = this.trashcan(model_transform);

			}
			if(this.graphicsState.animation_time > 12575 && this.graphicsState.animation_time <= 20000){
				model_transform = mult( model_transform, scale(1,1,1));
				var bucket = this.trashcan(model_transform);

			}
		
			//pan out
			if(this.graphicsState.animation_time > 13000 && this.graphicsState.animation_time <= 20000){
				 this.graphicsState.camera_transform = lookAt(vec3( 0, 0, 12 + this.graphicsState.animation_time * .001), vec3(0, 0, 0), vec3(0,1,0) );
				
			}
	
			var panEnd = 20000;
			//panEnd

			
			if(this.graphicsState.animation_time > panEnd ){
			//	model_transform = mult(model_transform, translation(0, this.graphicsState.animation_time/100, 0));
			this.graphicsState.camera_transform = lookAt(vec3( 0, 0, 32), vec3(0, 0, 0), vec3(0,1,0) ); // permanent placement		
		
			}
		
			
			//cat peaks out
	
			if(this.graphicsState.animation_time > 4000 && this.graphicsState.animation_time <= 5000){
			
				model_transform = mult(model_transform, translation(0,this.graphicsState.animation_time/500, 0));
				model_transform = mult(model_transform, translation(0, -9, 0));
				var kitty = this.cat(model_transform);
				

			}

			if(this.graphicsState.animation_time > 5000 && this.graphicsState.animation_time <= 6000 ){
				
				model_transform = mult(model_transform, translation(0, 1, 0));
				var kitty = this.cat(model_transform);
		
		
			}

			if(this.graphicsState.animation_time > 6000 && this.graphicsState.animation_time <= 7000){
				model_transform = mult(model_transform, translation(0, this.graphicsState.animation_time/-500, 0));
				model_transform = mult(model_transform, translation(0, 13, 0));
				var kitty = this.cat(model_transform);
				
			}
			
			
			
			stack.push(model_transform);
			//trash can topples over	
			if(this.graphicsState.animation_time < panEnd+1220 && this.graphicsState.animation_time > panEnd){
				model_transform = mult( model_transform, rotation( Math.sin(this.graphicsState.animation_time/800)*80, 0, 0, 1  ));
				var bucket = this.trashcan(model_transform);

			}
			
			if(this.graphicsState.animation_time > panEnd+1220 && this.graphicsState.animation_time <= panEnd+2500 ){
				model_transform = mult( model_transform, rotation( Math.cos(this.graphicsState.animation_time/800)*80, 1, 0, 0 ));
				model_transform = mult(model_transform, rotation(85, 0,0,1));
				var bucket = this.trashcan(model_transform);
			}
			
			if(this.graphicsState.animation_time > panEnd+2500){

				stack.push(model_transform);
				model_transform = mult(model_transform, rotation(-85, 1,0,0));
				model_transform = mult(model_transform, rotation(85, 0,0,1));
				var bucket = this.trashcan(model_transform);
				model_transform =stack.pop();
		
				
			}
		
			model_transform =stack.pop();
			//cat jumps out
			stack.push(model_transform); //4000
		
			//up
			if(this.graphicsState.animation_time > panEnd && this.graphicsState.animation_time < panEnd+2500 ){
				model_transform = mult(model_transform, translation(0, (this.graphicsState.animation_time/200) -100, 0));
			//	model_transform = mult(model_transform, scale( 0, (this.graphicsState.animation_time/500) -35, 0));
				model_transform = mult(model_transform, translation(0, 1, 0));
				var kitty = this.cat(model_transform);
				

			}
			
			if(this.graphicsState.animation_time > panEnd+2500 && this.graphicsState.animation_time <= panEnd+4000 ){
				model_transform = mult(model_transform, translation(0, -((this.graphicsState.animation_time/125) -180), ((this.graphicsState.animation_time/200) -112.5) ));
				model_transform = mult(model_transform, translation(0, 13, 0));
				var kitty = this.cat(model_transform);
			
			}
		
		
			//down	
			model_transform =stack.pop();
			if(this.graphicsState.animation_time > panEnd+4000 && this.graphicsState.animation_time <=30500){

				model_transform = mult(model_transform, translation (0,0,6.5));
				var kitty = this.cat(model_transform);
			}
			

			if(this.graphicsState.animation_time > 30500){

				
				model_transform = mult(model_transform, translation(-((this.graphicsState.animation_time/100) -305), 0 , 0));
				model_transform = mult(model_transform, translation(0, 0, 6.5));
				var kitty = this.cat(model_transform);
				

		
				

			}
		
			//	stack.push(model_transform); model_transform =stack.pop();
			
					
		}

		
	}	

Animation. prototype.trashcan = function(model_transform){
//	var wood = new Material ( vec4  (0.5, .5, .5, 1), .5, 1, .5 , 40, "wood.jpeg");
	var cardboard = new Material( vec4( .5,.5,.5,1 ), .5, 1, .5, 40, "cardboard.png" );
	
	model_transform = mult(model_transform, translation(0,0.75,0));
	model_transform = mult(model_transform, scale(2.75,3.75,3));
	this.m_trashcan.draw(this.graphicsState, model_transform, cardboard);

};

Animation. prototype.lear = function(model_transform){
	var stars = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .5 , 40, "stars.png");
	var fur = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .1 , 40, "fur.png");

	model_transform = mult(model_transform, rotation(45, 0, 0,1));
	model_transform = mult(model_transform, rotation(-75,1, 0, 0));
	model_transform = mult(model_transform, scale(.5,.35,.35));
	this.m_fan.draw(this.graphicsState, model_transform, fur);
};

Animation. prototype.rear = function(model_transform){
	var stars = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .5 , 40, "stars.png");
	var fur = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .1 , 40, "fur.png");

	model_transform = mult(model_transform, rotation(-45, 0, 0,1));
	model_transform = mult(model_transform, rotation(-75,1, 0, 0));
	model_transform = mult(model_transform, scale(.5,.35,.35));
	this.m_fan.draw(this.graphicsState, model_transform, fur);

};

Animation. prototype.rarm = function(model_transform){

	var stack = [];
	var fur = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .1 , 40, "fur.png");

//jump 20,000 -30,5000 this.graphicsState.animation_time >= 20000 && this.graphicsState.animation_time < 305000

	if(this.graphicsState.animation_time >= 20000 && this.graphicsState.animation_time < 24000){
		model_transform = mult(model_transform, rotation(2*Math.cos(this.graphicsState.animation_time/200)*15, 1, 0, 0  ));
	}

//walk 
	
	if(this.graphicsState.animation_time > 30500){
			model_transform = mult(model_transform, rotation(2*Math.cos(this.graphicsState.animation_time/200)*15, 1, 0, 0  ));
		}


		model_transform = mult(model_transform, rotation(-45, 0, 0, 1));

		model_transform = mult(model_transform, scale(0.2, 0.2, .2));
		this.m_sphere.draw(this.graphicsState, model_transform, fur);

		model_transform = mult(model_transform, translation(1.75,0, 0));
		model_transform = mult(model_transform, rotation(90, 0, 1, 0));
		model_transform = mult(model_transform, scale(1, 1, .75/.2));
		this.m_cylinder.draw(this.graphicsState, model_transform, fur);

		model_transform = mult(model_transform, translation(0,0, 0.5));
		model_transform = mult(model_transform, scale(0.99, 0.99, .2/0.75));
		this.m_sphere.draw(this.graphicsState, model_transform, fur);
};


Animation. prototype.larm = function(model_transform){
	var stack = [];
	var stars = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .5 , 40, "stars.png");
	var fur = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .1 , 40, "fur.png");

if(this.graphicsState.animation_time >= 20000 && this.graphicsState.animation_time < 24000){
		model_transform = mult(model_transform, rotation(2*Math.cos(this.graphicsState.animation_time/200)*15, -1, 0, 0  ));
	}

if(this.graphicsState.animation_time > 30500){
		model_transform = mult(model_transform, rotation(2*Math.cos(this.graphicsState.animation_time/200)*15, -1, 0, 0  ));
	}

	model_transform = mult(model_transform, rotation(45, 0, 0, 1));

	model_transform = mult(model_transform, scale(0.2, 0.2, .2));
	this.m_sphere.draw(this.graphicsState, model_transform, fur);

	model_transform = mult(model_transform, translation(-1.75,0, 0));
	model_transform = mult(model_transform, rotation(90, 0, 1, 0));
	model_transform = mult(model_transform, scale(1, 1, .75/.2));
	this.m_cylinder.draw(this.graphicsState, model_transform, fur);

	model_transform = mult(model_transform, translation(0,0, -0.5));
	model_transform = mult(model_transform, scale(0.99, 0.99, .2/0.75));
	this.m_sphere.draw(this.graphicsState, model_transform, fur);

};

Animation. prototype.rleg = function(model_transform){
	var stack = [];
	var stars = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .5 , 40, "stars.png");
	var fur = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .1 , 40, "fur.png");

	if(this.graphicsState.animation_time >= 20000 && this.graphicsState.animation_time < 24000){
		model_transform = mult(model_transform, rotation(2*Math.cos(this.graphicsState.animation_time/200)*15, -1, 0, 0  ));
	}


	//walk
	if(this.graphicsState.animation_time > 30500){
		model_transform = mult(model_transform, rotation(2*Math.cos(this.graphicsState.animation_time/200)*15, -1, 0, 0  ));
	}


	model_transform = mult(model_transform, rotation(-90, 0, 0, 1));

	model_transform = mult(model_transform, scale(0.2, 0.2, .2));
	this.m_sphere.draw(this.graphicsState, model_transform, fur);

	model_transform = mult(model_transform, translation(2.25,0, 0));
	model_transform = mult(model_transform, rotation(90, 0, 1, 0));
	model_transform = mult(model_transform, scale(1, 1, 1/.2));
	this.m_cylinder.draw(this.graphicsState, model_transform, fur);

	model_transform = mult(model_transform, translation(0,0, 0.5));
	model_transform = mult(model_transform, scale(0.99, 0.99, .2/1));
	this.m_sphere.draw(this.graphicsState, model_transform, fur);


};

Animation. prototype.lleg = function(model_transform){
	var stack = [];
	var stars = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .5 , 40, "stars.png");
	var fur = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .1 , 40, "fur.png");


	if(this.graphicsState.animation_time >= 20000 && this.graphicsState.animation_time < 24000){
		model_transform = mult(model_transform, rotation(2*Math.cos(this.graphicsState.animation_time/200)*15, 1, 0, 0  ));
	}

	if(this.graphicsState.animation_time > 30500){
		model_transform = mult(model_transform, rotation(2*Math.cos(this.graphicsState.animation_time/200)*15, 1, 0, 0  ));
	}

	model_transform = mult(model_transform, rotation(-90, 0, 0, 1));

	model_transform = mult(model_transform, scale(0.2, 0.2, .2));
	this.m_sphere.draw(this.graphicsState, model_transform, fur);

	model_transform = mult(model_transform, translation(2.25,0, 0));
	model_transform = mult(model_transform, rotation(90, 0, 1, 0));
	model_transform = mult(model_transform, scale(1, 1, 1/.2));
	this.m_cylinder.draw(this.graphicsState, model_transform, fur);

	model_transform = mult(model_transform, translation(0,0, 0.5));
	model_transform = mult(model_transform, scale(0.99, 0.99, .2/1));
	this.m_sphere.draw(this.graphicsState, model_transform, fur);
};

Animation. prototype.tailSegments = function(model_transform){
	var stars = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .5 , 40, "stars.png");
	var fur = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .1 , 40, "fur.png");
	model_transform = mult( model_transform, rotation( Math.sin(this.graphicsState.animation_time/1000)*2, 0, 0, 1  ));
    var center = model_transform = mult(model_transform, translation(0, -1, 0));
 //   model_transform = mult(model_transform, translation(0, -1/2, 0)); //height/2
    model_transform = mult(model_transform, scale(0.2, 0.5, 0.2)); //width, height, width
    this.m_cube.draw(this.graphicsState, model_transform, fur);

    return center;
};

Animation. prototype.tail = function(model_transform){

    for (var segmentNo = 0; segmentNo < 4; segmentNo++) {
        model_transform = mult( model_transform, translation(0,0.5,0));  
        
        model_transform = this.tailSegments(model_transform);
    }
   
};

Animation. prototype.eyes = function(model_transform){
	var stack = [];

	var black = new Material( vec4( 0, 0, 0, 1 ), .5, 1, .5, 40 );
	var white = new Material(vec4( 1, 1, 1, 1), 0.5, 1, 0.5, 40);

	model_transform = mult(model_transform, scale( 0.1, 0.1, 0.1));
	this.m_sphere.draw(this.graphicsState, model_transform, black);

	model_transform = mult(model_transform, translation( 8, 0, 0));
	this.m_sphere.draw(this.graphicsState, model_transform, black);

	
};

Animation. prototype. eyes2 = function(model_transform){
	var stack = [];

	var black = new Material( vec4( 0, 0, 0, 1 ), .5, 1, .5, 40 );

	model_transform = mult(model_transform, scale( 0.2, 0.1, 0.1));
	this.m_cube.draw(this.graphicsState, model_transform, black);

	model_transform = mult(model_transform, translation( 4, 0, 0));
	this.m_cube.draw(this.graphicsState, model_transform, black);
	
}

Animation. prototype.mouth = function(model_transform){
	var stack = [];
	var black = new Material( vec4( 0, 0, 0, 1 ), .5, 1, .5, 40 );

	//right
	stack.push(model_transform); 
	model_transform = mult(model_transform, translation(0.06, 0, 0));
	model_transform = mult(model_transform, rotation(45, 0,0, 1));
	model_transform = mult(model_transform, scale(0.1, .25, 0.1));
	this.m_cube.draw(this.graphicsState, model_transform, black);
	model_transform =stack.pop();

	//left
	stack.push(model_transform);
	model_transform = mult(model_transform, translation(-0.06, 0, 0));
	model_transform = mult(model_transform, rotation(-45, 0,0, 1));
	model_transform = mult(model_transform, scale(0.1, .25, 0.1));
	this.m_cube.draw(this.graphicsState, model_transform, black);
	model_transform =stack.pop();

}

Animation. prototype.cat = function(model_transform) {
	var stack = [];

	var fur = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .1 , 40, "fur.png");

	var stars = new Material ( vec4 (0.5, .5, .5, 1), .5, 1, .5 , 40, "stars.png");

	if(this.graphicsState.animation_time > 29000 && this.graphicsState.animation_time <= 30500){
		model_transform = mult(model_transform, rotation(2*Math.sin(this.graphicsState.animation_time/500)*10 -20, 0, 1, 0  ));
	}

	if(this.graphicsState.animation_time > 30500 ){	
		model_transform = mult(model_transform, rotation(-45, 0,1,0));
		
	}



	//body
	model_transform = mult(model_transform, scale( 2.5,2.5,2.5));
	this.m_sphere.draw(this.graphicsState, model_transform, fur);

	//head
	var tada = 20000 + 2500;


	stack.push(model_transform);

	if (this.graphicsState.animation_time > tada + 1500 && this.graphicsState.animation_time <= tada + 3800){
		 model_transform = mult( model_transform, rotation( 2*Math.cos(this.graphicsState.animation_time/800)*5 , 0, 1, 0  ));
		model_transform = mult(model_transform, translation(0,1.75,0));
	
		this.m_sphere.draw(this.graphicsState, model_transform, fur);
	}

	else{
	model_transform = mult(model_transform, translation(0,1.75,0));
	//model_transform = mult(model_transform, scale( 1,1,1));
	this.m_sphere.draw(this.graphicsState, model_transform, fur);
	}
		//face
		//eyes
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(-0.45,0, 0.9));
		
		if(this.graphicsState.animation_time > 27000 && this.graphicsState.animation_time <= 29000){
		this.eyes2(model_transform);
		}

		else{
			this.eyes(model_transform);
		}
		model_transform = stack.pop();
		
		//mouth
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, -0.35, 1));
		this.mouth(model_transform);
		model_transform =stack.pop();

		//ears
		//left
		stack.push(model_transform);
		if(this.graphicsState.animation_time > 26380 && this.graphicsState.animation_time <= 29000){
		 model_transform = mult( model_transform, rotation( 2*Math.cos(this.graphicsState.animation_time/800)*5, 1, 0, -1 ));
		}

		model_transform = mult(model_transform, translation(-0.9, 0.75, 0));
		this.lear(model_transform);
		model_transform = stack.pop();

		//right
		stack.push(model_transform);
		if(this.graphicsState.animation_time > 26380 && this.graphicsState.animation_time <= 29000){
		model_transform = mult( model_transform, rotation( 2*Math.cos(this.graphicsState.animation_time/800)*5, 1, 0, 1  ));
		}
		model_transform = mult(model_transform, translation(0.9,0.75, 0));
		this.rear(model_transform);
		model_transform = stack.pop();

	model_transform = stack.pop();


	//right arm ( x= 1)
	stack.push(model_transform);
	model_transform = mult(model_transform, translation( 0.75, 0.5, 0));
	this.rarm(model_transform);
	model_transform = stack.pop();

	//left arm (-1.25, 0,0)
	stack.push(model_transform);
	model_transform = mult(model_transform, translation( -0.75, 0.5, 0));
	this.larm(model_transform);
	model_transform = stack.pop();

	//left leg
	stack.push(model_transform);
	model_transform = mult(model_transform, translation( -.4, -0.75, 0));
	this.lleg(model_transform);
	model_transform = stack.pop();

	//right leg
	stack.push(model_transform);
	model_transform = mult(model_transform, translation( .4, -0.75, 0));
	this.rleg(model_transform);
	model_transform = stack.pop();

	//tail
	model_transform = mult(model_transform, translation(0, .5, -0.7));
	this.tail(model_transform);
};

Animation. prototype.room = function(model_transform) {
	var stack = [];

	var mat = new Material( vec4( .5,.5,.5,1 ), .5, 0.5, .5, 50, "tatami.png" );	
    var wallpaper = new Material( vec4( .5,.5,.5,1 ), .5, 0.5, .5, 50, "wallpaper.png" );	
	//ground
	stack.push(model_transform);
    model_transform = mult(model_transform, rotation(-90, 0, 0, 1));
    model_transform = mult(model_transform, scale(50, 50, 50));
    this.m_strip.draw(this.graphicsState, model_transform, mat);
    model_transform = stack.pop();

/*
    // ceiling
    stack.push(model_transform);
    model_transform = mult(model_transform, translation(0, 50, 0));
    model_transform = mult(model_transform, rotation(-90, 0, 0, 1));
    model_transform = mult(model_transform, scale(50, 50, 50));
    this.m_strip.draw(this.graphicsState, model_transform, mat);
    model_transform = stack.pop();
*/

    //left wall
 	stack.push(model_transform);
 	model_transform = mult(model_transform, translation(-25, 25, 0));
    model_transform = mult(model_transform, rotation(180, 0, 1, 0));
    model_transform = mult(model_transform, scale(50, 50, 50));
    this.m_strip.draw(this.graphicsState, model_transform, wallpaper);
    model_transform = stack.pop();


    //right wall
    stack.push(model_transform);
 	model_transform = mult(model_transform, translation(25, 25, 0));
    model_transform = mult(model_transform, rotation(180, 0, 1, 0));
    model_transform = mult(model_transform, scale(50, 50, 50));
    this.m_strip.draw(this.graphicsState, model_transform, wallpaper);
    model_transform = stack.pop();

    //back wall
 	stack.push(model_transform);
 	model_transform = mult(model_transform, translation(0, 25, -25));
    model_transform = mult(model_transform, rotation(90, 0, 1, 0));
    model_transform = mult(model_transform, scale(50, 50, 50));
    this.m_strip.draw(this.graphicsState, model_transform, wallpaper);
    model_transform = stack.pop();

if(this.graphicsState.animation_time <= 13000){
    // front wall
    stack.push(model_transform);
 	model_transform = mult(model_transform, translation(0, 25, 25));
    model_transform = mult(model_transform, rotation(90, 0, 1, 0));
    model_transform = mult(model_transform, scale(50, 50, 50));
    this.m_strip.draw(this.graphicsState, model_transform, wallpaper);
    model_transform = stack.pop();
}


};



Animation.prototype.update_strings = function( debug_screen_strings )		// Strings this particular class contributes to the UI
{
	debug_screen_strings.string_map["time"] = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
//	debug_screen_strings.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
//	debug_screen_strings.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
//	debug_screen_strings.string_map["thrust"] = "Thrust: " + thrust;
	debug_screen_strings.string_map["frame"] = "FPS: " + Math.round(1000/(this.animation_delta_time), 1);
//	debug_screen_strings.string_map["wya"] = "find: " + 
}