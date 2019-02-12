var loader, camera, scene, renderer, touchX, touchY,
	selectedObject = null,
	activeObject = null,
	MenuObjects,
	SceneObjects = {},
	Config = {
		MODELS_URL: 'resources/models/',
		MODELS_EXTENSION: 'stl',
		HEIGHT: window.innerHeight,
		WIDTH: 0,
		MOVEMENT_SOFTEN_FACTOR: 15,
		ROTATION_SOFTEN_FACTOR: 200
	};

/**
 * Function that runs upon window loading
 */
function init() {
	Config.WIDTH = window.innerWidth - document.querySelector('#availableObjects').clientWidth;

	camera = new THREE.PerspectiveCamera(70, Config.WIDTH/Config.HEIGHT, 1, 1000);
	loader = new THREE.STLLoader();
	scene = new THREE.Scene();

	camera.position.z = 1;

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(Config.WIDTH, Config.HEIGHT);

	document.body.appendChild(renderer.domElement);

	document.querySelector('#rotX').value = scene.rotation.x;
	document.querySelector('#rotY').value = scene.rotation.y;
	document.querySelector('#zoom').value = camera.position.z;

	bindCanvasActions(renderer.domElement);

	render();
}

/**
 * Loads an object from a file into the scene
 * 
 * @param {String} objPath Path to the file of the object
 */
function loadObjectToScene(objPath, objName) {
	loader.load(objPath,
		function(object) {
			var material = new THREE.MeshNormalMaterial(),
				mesh = new THREE.Mesh(object, material);

			mesh.name = objName;
			mesh.position.z = -40;

			scene.add(mesh);

			SceneObjects[objName] = mesh;

			drawSceneObjectsMenu();

			render();
		}, function (xhr) {
			console.log((xhr.loaded/xhr.total * 100) + '% loaded');
		}, function (error) {
			console.log('An error happened');
		}
	);
}

function drawSceneObjectsMenu() {
	var parentMenu = document.querySelector('#createdObjects > ul');

	//Clears menu before inserting childs
	while (parentMenu.firstChild) {
		parentMenu.removeChild(parentMenu.firstChild);
	}

	for (var objName in SceneObjects) {
		var menuItem = document.createElement('li');

		menuItem.textContent = objName;

		menuItem.addEventListener('click', function(ev) {
			ev.preventDefault();

			if (document.querySelector('.selected')) {
				document.querySelector('.selected').classList.remove('selected');
			}

			selectedObject = SceneObjects[objName];

			updateSelectedObjectMenu();

			this.classList.add('selected');
		});

		parentMenu.appendChild(menuItem);
	}
}

function updateSelectedObjectMenu() {
	document.querySelector('#objX').value = selectedObject.position.x;
	document.querySelector('#objY').value = selectedObject.position.y;
	document.querySelector('#objZ').value = selectedObject.position.z;
}

/**
 * Render scene
 */
function render() {
	renderer.render(scene, camera);
}

/**
 * Removes an entity from scene
 *
 * @param {String} name The name of the object to be removed
 */
function removeEntity(name) {
	var object = scene.getObjectByName(name);
	scene.remove(object);

	delete SceneObjects[name];

	render();
}

/**
 * Bind canvas actions
 */
function bindCanvasActions(canvasElement) {
	/**
	 * On mouse down, change control variable
	 */
	canvasElement.addEventListener('touchstart', function(ev) {
		ev.preventDefault();

		var mouse3D = new THREE.Vector3(
			(ev.changedTouches[0].clientX / Config.WIDTH) * 2 - 1,
			-(ev.changedTouches[0].clientY / Config.HEIGHT) * 2 + 1,
			0.5),
			raycaster = new THREE.Raycaster();                                        
		raycaster.setFromCamera(mouse3D, camera),
		intersects = raycaster.intersectObjects(getSceneObjectsArray());

		activeObject = null;

		if (intersects.length > 0) {
			activeObject = intersects[0].object;
		}

		touchX = ev.changedTouches[0].clientX;
		touchY = ev.changedTouches[0].clientY;
	});

	/**
	 * On mouse up, change control variable
	 */
	canvasElement.addEventListener('touchend', function(ev) {
		touchX = null;
		touchY = null;

		activeObject = null;
	});

	/**
	 * On mouse move, while mouse down, interact with 3D model X and Y
	 */
	canvasElement.addEventListener('touchmove', function(ev) {
		ev.preventDefault();
		ev.stopPropagation();

		var movementX = touchX - ev.changedTouches[0].clientX,
			movementY = touchY - ev.changedTouches[0].clientY;

		touchX = ev.changedTouches[0].clientX;
		touchY = ev.changedTouches[0].clientY;

		if (activeObject) {
			activeObject.rotation.x += movementY/Config.ROTATION_SOFTEN_FACTOR;
			activeObject.rotation.y += movementX/Config.ROTATION_SOFTEN_FACTOR;
		} else {
			camera.position.x += movementX/Config.MOVEMENT_SOFTEN_FACTOR;
			camera.position.y -= movementY/Config.MOVEMENT_SOFTEN_FACTOR;
		}

		render();
	});

	document.querySelector('#zoom').addEventListener('input', function() {
		camera.position.z = this.value;
		render();
	});

	document.querySelector('#objX').addEventListener('input', function(ev) {
		selectedObject.position.x = this.value;
		render();
	});

	document.querySelector('#objY').addEventListener('input', function(ev) {
		selectedObject.position.y = this.value;
		render();
	});

	document.querySelector('#objZ').addEventListener('input', function(ev) {
		console.log(selectedObject.position.z, this.value);
		selectedObject.position.z = parseFloat(this.value);
		render();
	});

	document.querySelector('#rotX').addEventListener('input', function(ev) {
		scene.rotation.x = this.value/Config.ROTATION_SOFTEN_FACTOR;
		render();
	});

	document.querySelector('#rotY').addEventListener('input', function(ev) {
		scene.rotation.y = this.value/Config.ROTATION_SOFTEN_FACTOR;
		render();
	});

	document.querySelector('#selectedObject').addEventListener('touchstart', function(ev) {
		ev.preventDefault();
		ev.stopPropagation();
	});

	document.querySelector('#cameraRotation').addEventListener('touchstart', function(ev) {
		ev.preventDefault();
		ev.stopPropagation();
	});
}

/**
 * Activate the accordeon #availableObjects
 */
function activateAccordeon() {
	var accordeon = document.querySelector('#availableObjects'),
		buttons = accordeon.querySelectorAll('button');

	buttons.forEach(function(button) {
		button.addEventListener("click", function() {
			var panel = this.nextElementSibling;

			this.classList.toggle("active");
			
			if (panel.style.maxHeight) {
				panel.style.maxHeight = null;
			} else {
				panel.style.maxHeight = panel.scrollHeight + "px";
			} 
		});
	});
}

/**
 * Load file names for the menu
 */
function loadMenuFiles() {
	return new Promise(function(resolve, reject) {
		var request = new XMLHttpRequest();

		request.onreadystatechange = function() {
			if(request.readyState === 4) {
				if(request.status === 200) { 
					resolve(request.responseText);
				} else {
					reject(request.status);
				} 
			}
		}

		request.open('GET', 'files.json');

		request.send(null);
	});
}

/**
 * Draws menu files into screen
 */
function drawMenuFiles(files) {
	for (var modelType in files) {
		var baseURL = Config.MODELS_URL + modelType,
			parentMenu = document.querySelector('#'+ modelType);

		//Clears menu before inserting childs
		while (parentMenu.firstChild) {
			parentMenu.removeChild(parentMenu.firstChild);
		}

		files[modelType].forEach(function(file) {
			drawMenuItem(file, parentMenu, baseURL);
		});

	}
}

/**
 * Draws and add an item on menu
 */
function drawMenuItem(file, parentMenu, baseURL) {
	var menuItem = document.createElement('a');

	menuItem.textContent = file;
	menuItem.setAttribute('href', '#');

	menuItem.addEventListener('click', function(ev) {
		ev.preventDefault();
		loadObjectToScene(baseURL +'/'+ file +'.'+ Config.MODELS_EXTENSION, file);
	});

	parentMenu.appendChild(menuItem);
}

/**
 * Get all SceneObjects as array
 */
function getSceneObjectsArray() {
	var objects = [];

	for (var key in SceneObjects) {
		objects.push(SceneObjects[key]);
	}	

	return objects;
}

/**
 * Upon loading window
 */
window.onload = function() {
	init();
	activateAccordeon();

	loadMenuFiles().then(
		function(result) {
			MenuObjects = JSON.parse(result);
			drawMenuFiles(MenuObjects);
		},
		function(error) {
			alert(error);
		}
	);
};