var scene, camera, renderer, canvas, controls, loader, floor, crosshair, light, raycaster, listener;
var geometry, material;
var bangSound;
var isFps;
var element = document.body;
var controlsEnabled;
var velocity = new THREE.Vector3();

var config = {
  zombieH: 12,
  spawnDist: 600
};

var prevTime = performance.now();
var moveForward,
    moveLeft,
    moveBackward,
    moveRight,
    moveRun;

var zombies = [];

init();
animate();

function init() {

  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );

  listener = new THREE.AudioListener();
  camera.add( listener );


	scene = new THREE.Scene();
	scene.fog = new THREE.Fog( '#639628', 0, 750 );


  // light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
	// light.position.set( 0.5, 1, 0.75 );
	// scene.add( light );

	controls = new THREE.PointerLockControls( camera );
	scene.add( controls.getObject() );

  renderer = new THREE.WebGLRenderer();
	renderer.setClearColor( 0x69B8F1 );
	renderer.setPixelRatio( window.devicePixelRatio );
  renderedSize();
  canvas = renderer.domElement;
  document.body.appendChild( canvas );

  loader = new THREE.TextureLoader();

  (function() { // CROSSHAIR

    var crosshairW = 0.02;
    var crosshairColor = 'green';

    crosshair = new THREE.Object3D();

    geometry = new THREE.CircleGeometry( crosshairW/1.5, 32 );
    material = new THREE.MeshBasicMaterial( { color: crosshairColor, transparent: true, opacity: .9 } );
    mesh = new THREE.Mesh( geometry, material );
    crosshair.add(mesh);

    for (var i = 0; i < 4; i++) {
      geometry = new THREE.PlaneGeometry( crosshairW, crosshairW*4, 1, 1 );
      mesh = new THREE.Mesh( geometry, material );
      var odd = i%2;
      if (odd) {
        mesh.position.x = (crosshairW*(i-2)*4);
      } else {
        mesh.position.y = (crosshairW*(i-1)*4);
      }
      mesh.rotation.z = ((- Math.PI / 2) * i);
      crosshair.add(mesh);
    }

    crosshair.position.z = -2;
    camera.add(crosshair);
    raycaster = new THREE.Raycaster();

  }());

  (function() { // FLOOR

    loader.crossOrigin = 'anonymous';
    loader.load(
    	// resource URL
    	'./images/grasslight-small.jpg',
    	// Function when resource is loaded
    	function ( texture ) {

        texture.wrapS	= THREE.RepeatWrapping;
      	texture.wrapT	= THREE.RepeatWrapping;
      	texture.repeat.x = 40;
      	texture.repeat.y = 40;
      	texture.anisotropy = renderer.getMaxAnisotropy();
    		// do something with the texture
    		material = new THREE.MeshBasicMaterial( {
          emissive: 'green',
    			map: texture
    		} );
        geometry = new THREE.PlaneGeometry( 2000, 2000 );
        geometry.rotateX(- Math.PI / 2);
        floor = new THREE.Mesh( geometry, material );
        scene.add( floor );
    	},
    	// Function called when download progresses
    	function ( xhr ) {
    		console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
    	},
    	// Function called when download errors
    	function ( xhr ) {
    		console.log( 'An error happened' );
    	}
    );

    var audioLoader = new THREE.AudioLoader();

    //Load a sound and set it as the Audio object's buffer
    audioLoader.load( 'sounds/distantshot.mp3', function( buffer ) {
      bangSound = buffer;
    });

    // material = new THREE.MeshBasicMaterial( {color: 0x3C620D} );

    // material = new THREE.MeshBasicMaterial( {color: 0x3FFFFFF, wireframe: true} );
    // floor = new THREE.Mesh( geometry, material );
    // floor.position.y = 1;
    // scene.add( floor );
  }());

  // POINTER LOCK

  function initPointerLock() {
    var havePointerLock = 'pointerLockElement' in document ||
      'mozPointerLockElement' in document ||
      'webkitPointerLockElement' in document;

    if (havePointerLock) {
      element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
  		element.requestPointerLock();

      document.addEventListener('pointerlockchange', lockingMouse, false);
      document.addEventListener('mozpointerlockchange', lockingMouse, false);
      document.addEventListener('webkitpointerlockchange', lockingMouse, false);

    }
  }

  document.body.addEventListener('mousedown', function(e) {
    if (!controlsEnabled) {
      initPointerLock();
    } else {
      if (e.button === 0) {
        gunShoot();
      }
    }
  });

  (function() {
    setInterval(spawnZombie, 2000);
  }());

  // WINDOW RESIZE
  window.addEventListener('resize', onWindowResize);
	document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );
}

function animate() {
  requestAnimationFrame( animate );

	if ( controlsEnabled ) {

		var time = performance.now();
		var delta = ( time - prevTime ) / 1000;

		velocity.x -= velocity.x * 10.0 * delta;
		velocity.z -= velocity.z * 10.0 * delta;

		velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

		if ( moveForward ) velocity.z -= 400.0 * delta * (moveRun ? 2 : 1);
		if ( moveBackward ) velocity.z += 400.0 * delta;

		if ( moveLeft ) velocity.x -= 400.0 * delta;
		if ( moveRight ) velocity.x += 400.0 * delta;

		controls.getObject().translateX( velocity.x * delta );
		controls.getObject().translateY( velocity.y * delta );
		controls.getObject().translateZ( velocity.z * delta );

		if ( controls.getObject().position.y < 10 ) {

			velocity.y = 0;
			controls.getObject().position.y = 10;

			canJump = true;

		}

		prevTime = time;

	}

  var camPos = camera.getWorldPosition();
  for (var i = 0; i < zombies.length; i++) {
    var zombie = zombies[i];
    var speed = zombie.speed;
    var angleTo = zombie.object.position.angleTo(camPos);
    var distanceTo = zombie.object.position.distanceTo(camPos);
    zombie.object.lookAt(new THREE.Vector3(camPos.x, zombie.object.position.y, camPos.z));
    zombie.object.translateZ(speed);
  }

  renderer.render( scene, camera );
};

function Zombie(scene) {

  var zombie = this;
  zombie.life = 100;
  zombie.speed = 0.5;

  zombie.height = config.zombieH;
  zombie.width = config.zombieH/2;

  zombie.spawn = function() {
    zombie.object = new THREE.Object3D();
    material = new THREE.MeshBasicMaterial( {color: 0x000000} );

    var mesure = zombie.height/11;

    geometry = new THREE.BoxGeometry( mesure*2, mesure*4, mesure*2);
    zombie.lleg = new THREE.Mesh( geometry, material );
    zombie.rleg = new THREE.Mesh( geometry, material );
    zombie.lleg.position.x = mesure;
    zombie.rleg.position.x = -mesure;
    zombie.lleg.position.y = zombie.lleg.geometry.parameters.height/2;
    zombie.rleg.position.y = zombie.rleg.geometry.parameters.height/2;
    zombie.lleg.dmgMtpl = zombie.rleg.dmgMtpl = 0.6;

    zombie.object.add(zombie.lleg);
    zombie.object.add(zombie.rleg);

    geometry = new THREE.BoxGeometry( mesure*4, mesure*4, mesure*2);
    zombie.torso = new THREE.Mesh( geometry, material );
    zombie.torso.position.y = zombie.lleg.geometry.parameters.height + zombie.torso.geometry.parameters.height/2;
    zombie.object.add(zombie.torso);
    zombie.torso.dmgMtpl = 1;

    geometry = new THREE.BoxGeometry( mesure*3, mesure*3, mesure*3);
    zombie.head = new THREE.Mesh( geometry, material );
    zombie.head.position.y = zombie.lleg.geometry.parameters.height + zombie.torso.geometry.parameters.height + zombie.head.geometry.parameters.height/2;
    zombie.object.add(zombie.head);
    zombie.head.dmgMtpl = 2;

    var spawnDist = config.spawnDist;
    var randomPos = Math.random();
    var camPos = camera.getWorldPosition();
    var spawnX = camPos.x + (spawnDist * randomPos * (Math.round(Math.random()) * 2 - 1));
    var spawnZ = camPos.z + (spawnDist * (1 - randomPos) * (Math.round(Math.random()) * 2 - 1));
    zombie.object.position.x = spawnX;
    zombie.object.position.z = spawnZ;
    zombie.object.target = zombie;
    scene.add(zombie.object);
  }

  zombie.shoot = function(gunStrength) {
    zombie.life -= gunStrength;
    for (var i = 0; i < zombie.object.children.length; i++) {
      var zombiePart = zombie.object.children[i];
      zombiePart.material.color.set(0x555555);
    }
    if (zombie.life <= 0) {
      zombie.die();
    }
  }

  zombie.die = function() {
    scene.remove(scene.getObjectById(zombie.object.id));
  }

  zombie.spawn();
}

function spawnZombie() {
  zombies.push(new Zombie(scene));
}

function gunShoot() {

  var newSound = new THREE.Audio( listener );
  newSound.setBuffer(bangSound);
  newSound.startTime = 0.5;
  newSound.play();

  raycaster.set( camera.getWorldPosition(), camera.getWorldDirection());

	// calculate objects intersecting the picking ray
	var intersects = raycaster.intersectObjects( scene.children, true );

	for ( var i = 0; i < intersects.length; i++ ) {

    var intersect = intersects[i];
    if (intersect.object.parent.target instanceof Zombie) {
      intersect.object.parent.target.shoot(45 * intersect.object.dmgMtpl);
      // break;
    }

	}
  controls.pitchObject.rotation.x += 0.1;
  controls.yawObject.rotation.y += 0.1 * (Math.random()-0.5);
}

function renderedSize() {
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function cameraSize() {
  camera.aspect = window.innerWidth / window.innerHeight;
}

function onWindowResize() {
  renderedSize();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
};

function onKeyDown(e) {

	switch ( e.keyCode ) {

		case 38: // up
		case 87: // w
			moveForward = true;
			break;

		case 37: // left
		case 65: // a
			moveLeft = true; break;

		case 40: // down
		case 83: // s
			moveBackward = true;
			break;

		case 39: // right
		case 68: // d
			moveRight = true;
			break;

		case 16: // ctrl
			moveRun = true;
			break;

		case 32: // space
			// if ( canJump === true ) velocity.y += 350;
			// canJump = false;
			break;

	}
}


function onKeyUp(e) {

	switch( e.keyCode ) {

		case 38: // up
		case 87: // w
			moveForward = false;
			break;

		case 37: // left
		case 65: // a
			moveLeft = false;
			break;

		case 40: // down
		case 83: // s
			moveBackward = false;
			break;

		case 39: // right
		case 68: // d
			moveRight = false;
			break;

		case 16: // ctrl
			moveRun = false;
			break;

	}

};

function lockingMouse(e) {
  controlsEnabled = controls.enabled = (document.pointerLockElement === element || document.mozPointerLockElement === element);
}
