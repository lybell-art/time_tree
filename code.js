import * as THREE from './libs/three.module.js';
import { MTLLoader } from './libs/plugins/MTLLoader.js';
import { OBJLoader } from './libs/plugins/OBJLoader.js';
import { PointerLockControls } from './libs/plugins/PointerLockControls.js';
import { Sky } from './libs/plugins/Sky.js';
import { Water } from './libs/plugins/Water.js';
import { OrbitControls } from './libs/plugins/OrbitControls.js';
import Stats from './libs/plugins/stats.module.js';

const textureLoader=new THREE.TextureLoader();
const stats = new Stats();
document.body.appendChild( stats.dom );
stats.dom.style.display="none";

const scene1=new THREE.Scene();
const scene2=new THREE.Scene();
const fakeScene=new THREE.Scene();
const mainCamera=new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.2, 2000);
const fakeCamera=new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.2, 2000);
const renderer = new THREE.WebGLRenderer({antialias:true});
const wallRenderer = new THREE.WebGLRenderTarget(800,600);
const skyRenderer = new THREE.WebGLRenderTarget(10,30);

let tree, water, isle, buildings;
const sky=new Sky();
const sky2=new Sky();
const sun=new THREE.Vector3();
let sunLight;
const pmremGenerator = new THREE.PMREMGenerator( renderer );

const raycaster = new THREE.Raycaster();
const easeRotate=new THREE.Vector2(0,0);
const keyStates = {};
const crossHead = document.getElementById( 'crossHead' );
let isMousePressed = false;
let player;
const clock = new THREE.Clock();
const isActive=()=>document.pointerLockElement === document.body;
let isSoundLoaded=false;
const isCaptionShown=[false,false,false,false];


function initWater()
{
	const waterGeometry = new THREE.PlaneGeometry( 3000, 3000 );
	water=new Water(
	waterGeometry,
	{
		textureWidth: 512,
		textureHeight: 512,
		waterNormals: textureLoader.load( 'assets/waternormals.jpg', function ( texture ) {

			texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

		} ),
		sunDirection: new THREE.Vector3(0,-1,0),
		sunColor: 0xffffff,
		waterColor: 0x001e0f,
		distortionScale: 3.7,
		fog: false
	});
	water.rotation.x = -Math.PI/2;
	scene1.add(water);
}

function initWall()
{
	const width=800;
	const height=600;
	const group=new THREE.Group();
	scene1.add(group);
	const wallGeometry = new THREE.PlaneGeometry(width, height);
	const wallMaterial = new THREE.MeshLambertMaterial({
		color: 0xffffff,
		map: wallRenderer.texture,
		side: THREE.DoubleSide});
	const radius = width * (1 + Math.sqrt(2)) / 2;
	for(let i=0;i<8;i++)
	{
		let r = i * Math.PI/4;
		const wall=new THREE.Mesh(wallGeometry, wallMaterial);
		wall.position.x = Math.sin(r) * radius;
		wall.position.z = Math.cos(r) * radius;
		wall.position.y = 290;
		wall.rotation.y = r
		wall.castShadow=true;
		wall.receiveShadow=true;
		group.add(wall);
	}
}

function initIsland()
{
	new MTLLoader().load( 'assets/island.mtl', function ( materials ) {
		materials.preload();
		const objLoader = new OBJLoader();
		objLoader.setMaterials( materials );
		objLoader.load( 'assets/island.obj', function ( object ) {
				object.castShadow=true;
				object.receiveShadow=true;
				object.scale.set(20,20,20);
				isle=object.children[0];
				isle.name="island";
				scene1.add( object );

			});
	});
}

function initLotus()
{

	new MTLLoader().load( 'assets/lotus.mtl', function ( materials ) {
		materials.preload();
		const objLoader = new OBJLoader();
		objLoader.setMaterials( materials );

		objLoader.load( 'assets/lotus.obj', function ( object ) {
				object.castShadow=true;
				object.receiveShadow=true;
				console.log(object);
				object.scale.set(20,20,20);
				let dir=Math.random()*2*Math.PI;
				let rr=Math.random()*500+200;
				object.position.x=Math.sin(dir)*rr;
				object.position.z=Math.cos(dir)*rr;
				for(let i=0;i<5;i++)
				{
					let clone=object.clone();
					let dir=Math.random()*2*Math.PI;
					let rr=Math.random()*500+200;
					clone.position.x=Math.sin(dir)*rr;
					clone.position.z=Math.cos(dir)*rr;
					scene1.add(clone);
				}
				scene1.add( object );

			});
	});
}

function initSky()
{
	sky.scale.setScalar( 450000 );
	const uniforms = sky.material.uniforms;
	uniforms[ 'turbidity' ].value = 10;
	uniforms[ 'rayleigh' ].value = 3;
	uniforms[ 'mieCoefficient' ].value = 0.005;
	uniforms[ 'mieDirectionalG' ].value = 0.8;
	scene2.add(sky);

	sky2.scale.setScalar( 450000 );
	const uniforms2 = sky.material.uniforms;
	uniforms2[ 'turbidity' ].value = 10;
	uniforms2[ 'rayleigh' ].value = 3;
	uniforms2[ 'mieCoefficient' ].value = 0.005;
	uniforms2[ 'mieDirectionalG' ].value = 0.8;
	fakeScene.add(sky2);
	rotateSun();
}

function initSecondFloor()
{
	const groundTexture = textureLoader.load( 'assets/grasslight-big.jpg' );
	groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
	groundTexture.repeat.set( 25, 25 );
	groundTexture.anisotropy = 16;
	groundTexture.encoding = THREE.sRGBEncoding;

	const groundMaterial = new THREE.MeshLambertMaterial( {
		map: groundTexture
	} );

	let mesh = new THREE.Mesh( new THREE.PlaneGeometry( 8000, 8000 ), groundMaterial );
	mesh.rotation.x = - Math.PI / 2;
	mesh.receiveShadow = true;
	scene2.add( mesh );
}

function initLights()
{
	const d = 400;

	//scene 1 Light
	const light1 = new THREE.PointLight( 0xddefff, 0, 1500, 2 );
	light1.position.set(0,1000,100);
	light1.power=65;
	const lightInv = new THREE.PointLight( 0xddefff, 0, 1500, 2 );
	lightInv.position.set(0,-1000,-100);
	lightInv.power=65;
	const hemiLight1 = new THREE.HemisphereLight(0xddefff, 0x888888, 0.9);

	scene1.add(light1);
	scene1.add(lightInv);
	scene1.add(hemiLight1);

	//scene 2 Light
	const hemiLight2 = new THREE.HemisphereLight(0xddefff, 0x333333, 3);
	hemiLight2.intensity = 0.5;
	scene2.add(hemiLight2);

	sunLight=new THREE.DirectionalLight(0xffffff, 0.5);
	sunLight.power=300;
	sunLight.position.copy(sun);
	sunLight.position.multiplyScalar(1000);
	sunLight.castShadow=true;

	sunLight.shadow.mapSize.width = 1024;
	sunLight.shadow.mapSize.height = 1024;

	sunLight.shadow.camera.left = - d;
	sunLight.shadow.camera.right = d;
	sunLight.shadow.camera.top = d;
	sunLight.shadow.camera.bottom = - d;

	sunLight.shadow.camera.far = 1500;
	scene2.add(sunLight);
}

function initSounds()
{
	const audioLoader=new THREE.AudioLoader();
	const listener = new THREE.AudioListener();
	const bgm = new THREE.Audio( listener );

	audioLoader.load( 'assets/sounds/forest_bgm.mp3', function ( buffer ) {
		bgm.setBuffer( buffer );
		bgm.setLoop( true );
		bgm.setVolume( 0.5 );
		bgm.play();
	} );

	const sound1 = new THREE.Audio(listener);
	audioLoader.load( 'assets/sounds/water_pooring.wav', function ( buffer ) {
		sound1.setBuffer( buffer );
		sound1.setLoop( true );
		sound1.setVolume( 0.5 );
		tree.sfx=sound1;
	} );
	isSoundLoaded=true;

	const sound2 = new THREE.Audio(listener);
	audioLoader.load( 'assets/sounds/water_walking.wav', function ( buffer ) {
		sound2.setBuffer( buffer );
		sound2.setLoop( true );
		sound2.setVolume( 0.2 );
		sound2.detune=450;
		player.sfx=sound2;
	} );
	isSoundLoaded=true;
}

function rotateSun(time=null)
{
	let rad;
	if(typeof(time) === "number") rad = (time - 6)/12 * Math.PI;
	else rad=Math.PI/2 - performance.now() / (10000*Math.PI);
	sun.setFromSphericalCoords(1, 90-rad, Math.PI/6);
	sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
	sky2.material.uniforms[ 'sunPosition' ].value.copy( sun );
	sunLight.position.copy(sun);
	sunLight.intensity=sun.dot(new THREE.Vector3(0,1,0)) * 0.7 + 0.3;
	scene2.environment = pmremGenerator.fromScene( sky ).texture;
}

class TreeBranch
{
	static material=new THREE.MeshPhongMaterial({color:0xa16f4d, specular:0x333333, flatShading: true});
	constructor(position, length, radius, gene, age=0)
	{
		this.position=position.clone();
		this.growLimit=length;
		this.radius=radius;
		this.age=age;
		this.generation=gene;
		this.dir=new THREE.Vector3(0,1,0);
		this.mesh=null;
		this.birthChance=1/this.growLimit * 4;
		this.childCount=0;
		this.hadLeaf=false;
	}
	get growRate()
	{
		return 0.5;
	}
	get endPoint()
	{
		if(this.mesh == null) return new THREE.Vector3(0,0,0);
		else
		{
			let pospos=this.position.clone();
			let lenlen=this.dir.clone().multiplyScalar(this.age);
			return pospos.add(lenlen);
		}
	}
	get isGrown()
	{
		return this.growLimit <= this.age || this.generation >= 5;
	}
	birth(parent, dir, isZitter=true)
	{
		//get new direction
		this.dir.copy(dir);
		if(isZitter)
		{
			let upVector = new THREE.Vector3(0,1,0);
			let axis1 = new THREE.Vector3().crossVectors(upVector,dir).normalize();
			if(axis1.equals(new THREE.Vector3(0,0,0))) axis1.x=1;
			let axis2 = new THREE.Vector3().crossVectors(dir,axis1).normalize();
			let r=Math.random() * Math.PI*2;
			let zitter=axis1.clone().multiplyScalar(Math.sin(r)).add(axis2.clone().multiplyScalar(Math.cos(r)));
			zitter.multiplyScalar(Math.random()*0.5+0.5);
			this.dir.add(zitter);
		}
		this.dir.normalize();
		let magDir=this.dir.clone();
		let zRot=Math.atan2(-magDir.x, Math.sqrt(magDir.y*magDir.y + magDir.z*magDir.z));
		let xRot=Math.atan2(magDir.z, magDir.y);

		const geometry=new THREE.CylinderGeometry(this.radius*0.25, this.radius,this.growLimit,8);
		this.mesh=new THREE.Mesh(geometry, TreeBranch.material);
		this.mesh.position.copy(this.position);
		this.mesh.position.addScaledVector( magDir, this.age /2 );
		this.mesh.rotation.x=xRot;
		this.mesh.rotation.z=zRot;
		this.mesh.scale.setScalar(1/this.growLimit);
		parent.add(this.mesh);
	}
	grow()
	{
		if(this.isGrown) return false;
		this.age+=this.growRate;
		let scaleMag=this.age/this.growLimit;
		let adjustDir = this.dir.clone().multiplyScalar(0.5 * this.growRate);

		this.mesh.scale.setScalar(scaleMag);
		this.mesh.position.add(adjustDir);
		return true;
	}
	descent()
	{
		if(this.isGrown || this.childCount > 4 || this.generation == 4) return null;
		const mult=0.7;
		if(Math.random() < this.birthChance * this.growRate * this.growRate)
		{
			let _radius=this.radius*( ( (this.growLimit-this.age)*0.75+0.25)/this.growLimit ) * 1.2;
			if(_radius < 1) return null;
			this.childCount ++;
			this.birthChance=(1/this.growLimit) / (this.childCount+1);
			return {position:this.endPoint,
					length:this.growLimit*mult,
					radius:_radius,
					gene:this.generation+1,
					dir:this.dir
			};
		}
		else
		{
			this.birthChance += 1/this.growLimit * 0.25;
			return null;
		}
	}
	leafGrow()
	{
		if(!this.haveLeaf && this.isGrown && (this.childCount == 0 || this.generation == 4))
		{
			this.haveLeaf=true;
			return true;
		}
		else return false;
	}
}

class Leaf
{
	static geometry=new THREE.IcosahedronGeometry(30,1);
	static material=new THREE.MeshPhongMaterial({color:0x40a820, specular:0x111111, flatShading: true });
	constructor(pos, parent)
	{
		this.scale=Math.random() + 0.5;
		this.age=0;
		this.mesh=new THREE.Mesh(Leaf.geometry, Leaf.material);
		this.mesh.position.copy(pos);
		this.mesh.scale.setScalar(0.01);
		parent.add(this.mesh);
	}
	get growRate()
	{
		return 0.25;
	}
	grow()
	{
		if(this.age >=50) return true;
		this.mesh.scale.setScalar((this.age / 50) * this.scale);
		this.age+=this.growRate;
		return false;
	}
}

class Tree
{
	constructor()
	{
		this.age=100;
		this.objs=[];
		this.leaves=[];
		this.meshes=new THREE.Group();
		this.sfx=null;
		let firstBranch=new TreeBranch(new THREE.Vector3(0,43,0),200,30,0,100);
		this.objs.push(firstBranch);
		firstBranch.birth(this.meshes, new THREE.Vector3(0,1,0), false);
		scene1.add(this.meshes);
	}
	grow()
	{
		let nextAdd=[];
		for(let i=0;i<this.objs.length;i++)
		{
			let obj=this.objs[i];
			let grown=obj.grow();
			//add new branches
			let nextData = obj.descent();
			if(nextData !== null) nextAdd.push(nextData);

			//add new leaves
			if(obj.leafGrow())
			{
				this.leaves.push( new Leaf(obj.endPoint, this.meshes) );
			}
		}
		
		for(let i=0;i<nextAdd.length;i++)
		{
			let nextData=nextAdd[i];
			let branch=new TreeBranch(nextData.position,nextData.length,nextData.radius,nextData.gene);
			this.objs.push(branch);
			branch.birth(this.meshes, nextData.dir);
		}
		for(let i=0;i<this.leaves.length;i++)
		{
			this.leaves[i].grow();
		}
		this.age++;
	}
	playSFX()
	{
		if(this.sfx == null) return false;
		if(!this.sfx.isPlaying) this.sfx.play();
	}
	stopSFX()
	{
		if(this.sfx == null) return false;
		if(this.sfx.isPlaying) this.sfx.stop();
	}
}

class Buildings
{
	constructor()
	{
		this.meshes=new THREE.Group();
		const geometry=new THREE.BoxGeometry(80,1000,80);
		const material=new THREE.MeshLambertMaterial({color:0x7788aa});
		this.startID=0;
		const GRID=this.GRID;
		for(let i=0;i<GRID; i++)
		{
			for(let j=0;j<GRID;j++)
			{
				let building=new THREE.Mesh(geometry,material);
				building.position.x=(i-GRID/2)*this.PADDING;
				building.position.z=(j-GRID/2)*this.PADDING;
				building.position.y=-502;
				building.castShadow=true;
				building.receiveShadow=true;
				building.matrixAutoUpdate=false;
				building.updateMatrix();
				let maxYRand=Math.pow(Math.random(), 3);
				building.userData={velocity:Math.random()+0.5, maxY:-Math.floor(maxYRand*200)}
				if(i == 0 && j == 0) this.startID=building.id;
				this.meshes.add(building);
			}
		}
		this.meshes.castShadow=true;
		scene2.add(this.meshes);
	}
	get GRID()
	{
		return 40;
	}
	get PADDING()
	{
		return 160;
	}
	getPosID(x, z)
	{
		const GRID=this.GRID;
		const gridX=(x)=>Math.round(x/this.PADDING + GRID/2);
		const gridZ=(z)=>Math.round(z/this.PADDING + GRID/2);
		return gridX(x) * GRID + gridZ(z) + this.startID;
	}
	grow(x, z, r)
	{
		const GRID=this.GRID;
		const PADDING=this.PADDING;
		const between=(a,min,max)=>(min<=a && a<=max);
		const RADIUS=(GRID/2-1) * this.PADDING;

		for(let i=-r*PADDING; i<=r*PADDING; i+=PADDING)
		{
			if(!between(i+x, -RADIUS, RADIUS)) continue;
			for(let j=-r*PADDING; j<=r*PADDING; j+=PADDING)
			{
				if(!between(j+z, -RADIUS, RADIUS)) continue;
				let id=this.getPosID(i+x, j+z);
				let obj=this.meshes.getObjectById(id);
				if(obj.position.y < obj.userData.maxY)
				{
					obj.position.y+=obj.userData.velocity;
					obj.updateMatrix();
				}
			}
		}
	}
}

class Player
{
	constructor()
	{
		this.scene=1;
		this.direction=new THREE.Vector3(0,0,1);
		this.velocity=new THREE.Vector3(0,0,0);
		this.cam=mainCamera;
		this.sfx=null;
	}
	get forwardKey()
	{
		return keyStates['KeyW'] === true || keyStates['ArrowUp'] === true;
	}
	get backwardKey()
	{
		return keyStates['KeyS'] === true || keyStates['ArrowDown'] === true;
	}
	get leftKey()
	{
		return keyStates['KeyA'] === true || keyStates['ArrowLeft'] === true;
	}
	get rightKey()
	{
		return keyStates['KeyD'] === true || keyStates['ArrowRight'] === true;
	}
	get x()
	{
		return this.cam.position.x;
	}
	get y()
	{
		return this.cam.position.y;
	}
	get z()
	{
		return this.cam.position.z;
	}
	getForwardVector()
	{
		this.cam.getWorldDirection( this.direction );
		this.direction.y = 0;
		this.direction.normalize();
		return this.direction.clone();
	}
	getSideVector()
	{
		this.getForwardVector();
		this.direction.cross(this.cam.up);
		this.direction.y = 0;
		this.direction.normalize();
		return this.direction.clone();
	}
	movement(deltaTime)
	{
		let speed=4, maxSpeed=30;
		if(this.scene == 2){ speed=30, maxSpeed=200;}
		const decay= Math.exp( - 3 * deltaTime ) - 1;
		this.velocity.addScaledVector(this.velocity, decay);
		if(this.forwardKey){this.velocity.addScaledVector( this.getForwardVector(), speed*deltaTime );}
		if(this.backwardKey){this.velocity.addScaledVector( this.getForwardVector(),-speed*deltaTime );}
		if(this.leftKey){this.velocity.addScaledVector( this.getSideVector(),-speed*deltaTime) ;}
		if(this.rightKey){this.velocity.addScaledVector( this.getSideVector(),speed*deltaTime );}
		if(this.scene == 2)
		{
			if(keyStates['Space']){this.velocity.y+=speed*deltaTime;}
			if(keyStates['ShiftLeft']){this.velocity.y-=speed*deltaTime;}
		}
		this.velocity.clampLength(0,20);
		this.cam.position.add(this.velocity);
		if(this.scene == 2)
		{
			if(this.y < 100) this.cam.position.y = 100;
			if(this.x > 2000) this.cam.position.x -=4000;
			else if(this.x < -2000) this.cam.position.x +=4000;
			if(this.z > 2000) this.cam.position.z -=4000;
			else if(this.z < -2000) this.cam.position.z +=4000;
		}
	}
	tp(x,y,z)
	{
		if(x instanceof THREE.Vector3) this.cam.position.copy(x);
		else this.cam.position.set(x,y,z);
	}
	isInsideWall()
	{
		const width = 800;
		const radius = width * (1 + Math.sqrt(2)) / 2;
		const radius2 = radius * Math.sqrt(2);
		const between=(a,min,max)=>(min<=a && a<=max);
		let res=between(this.x, -radius, radius) && between(this.z, -radius, radius);
		let res2=between(this.z-this.x, -radius2, radius2) && between(this.z+this.x, -radius2, radius2);
		return res&&res2;
	}
	transitionScene()
	{
		if(this.scene == 1 && !this.isInsideWall())
		{
			this.scene = 2;
			this.tp(0,600,0);
			this.velocity.set(0,0,0);
		}
		if(this.scene == 2 && this.y > 2000)
		{
			this.scene = 1;
			this.tp(0,100,-799);
			this.velocity.set(0,0,0);
		}
	}
	playSFX()
	{
		if(this.sfx == null) return false;
		if(!this.sfx.isPlaying && this.scene==1) this.sfx.play();
	}
	stopSFX()
	{
		if(this.sfx == null) return false;
		if(this.sfx.isPlaying) this.sfx.stop();
	}
	showCaption()
	{
		if(this.scene == 1)
		{
			let dist=this.x*this.x + this.z*this.z;
			if(dist<300*300) showCaption(3);
			else if(dist<500*500) showCaption(2);
		}
	}
}

function showCaption(n, callback=()=>{})
{
	if(isCaptionShown[n-1]) return;
	const caption = document.getElementById( 'cap'+n );
	caption.classList.add('show');
	caption.addEventListener('transitionend', function() {
		if (!isCaptionShown[n-1]) {
			isCaptionShown[n-1] = true;
			callback();
		}
	});
}


function init()
{
	//init scene 1
	scene1.background = new THREE.Color(0x111111);

	initWall();

	initWater();
	initIsland();
	initLotus();
	tree=new Tree();

	mainCamera.position.set(0, 100, 700);
	mainCamera.rotation.order = 'YXZ';
	fakeCamera.position.set(0, 300, 0);

	//init scene 2
	scene2.fog = new THREE.Fog(0xffffff,600,1400);
	initLights();
	initSky();
	initSecondFloor();
	buildings=new Buildings();

	//renderer setting
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	document.body.appendChild( renderer.domElement );

	//controller setting
	player=new Player();

	//add EvnetListner
	const blocker = document.getElementById( 'blocker' );
	const instructions = document.getElementById( 'instructions' );
	instructions.addEventListener('click',()=>{
		document.body.requestPointerLock();
		if(!isSoundLoaded) initSounds();
		showCaption(1);
	}
		);
	document.addEventListener('pointerlockchange',(e)=>{
		if(isActive())
		{
			instructions.style.display = 'none';
			blocker.style.display = 'none';
			easeRotate.set(mainCamera.rotation.y, mainCamera.rotation.x);
		}
		else{
			blocker.style.display = 'block';
			instructions.style.display = '';
			easeRotate.set(mainCamera.rotation.y, mainCamera.rotation.x);
		}
	});

	window.addEventListener( 'resize', onWindowResize );
	document.addEventListener( 'mousedown', onMousePressed );
	document.body.addEventListener( 'mousemove', onMouseMoved , false);
	window.addEventListener( 'mouseup', onMouseReleased );
	document.addEventListener( 'keydown', ( e ) => {
		keyStates[ e.code ] = true;
		player.playSFX();
		if(e.code === 'KeyC')
		{
			stats.dom.style.display = (stats.dom.style.display=='none')? 'block' : 'none' ;
		}
	} );
	document.addEventListener( 'keyup', ( e ) => {
		keyStates[ e.code ] = false;
		player.stopSFX();
	} );

	
	tree.grow();
}

function animate()
{
	requestAnimationFrame( animate );
	const deltaTime = Math.min( 0.1, clock.getDelta() );
	if(isActive())
	{
		player.movement(deltaTime);
		player.transitionScene();
		player.showCaption();
		if(player.scene==1)
		{
			if(isMousePressed)
			{
				raycaster.setFromCamera( new THREE.Vector2( 0,0 ), mainCamera );
//				const checker = tree.meshes.children.concat([isle]);
				const intersects_tree = raycaster.intersectObjects( tree.meshes.children );
				const intersects_isle = raycaster.intersectObjects( [isle] );
				if(intersects_tree.length > 0 && intersects_isle.length == 0)
				{
					tree.grow();
					tree.playSFX();
					buildings.grow(0,0,6);
				}
				else tree.stopSFX();
			}
			else tree.stopSFX();
			if(tree.age > 400) showCaption(4);
		}
		else
		{
			buildings.grow(player.x,player.z,3);
		}
	}
	render();
	stats.update();
}

function render()
{
	if(player.scene == 1)
	{
		rotateSun(12);
		water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
	}
	else rotateSun();

	//extract sky fog color
	renderer.setRenderTarget( skyRenderer );
	renderer.clear();
	renderer.render(fakeScene,fakeCamera);
	const pixelBuffer = new Uint8Array( 4 );
	renderer.readRenderTargetPixels( skyRenderer, 6, 13, 1, 1, pixelBuffer );
	let fogCol=pixelBuffer[0] << 16 | pixelBuffer[1] << 8 | pixelBuffer[2];
	scene2.fog.color.set(fogCol);


	//real render
	if(player.scene == 1)
	{
		renderer.setRenderTarget( wallRenderer );
		renderer.clear();
		renderer.render(scene2,fakeCamera);
	}
	if(isActive())
	{
		mainCamera.rotation.y = mainCamera.rotation.y * 0.8 + easeRotate.x * 0.2;
		mainCamera.rotation.x = mainCamera.rotation.x * 0.8 + easeRotate.y * 0.2;
	}

	renderer.setRenderTarget(null);
	renderer.clear();
	renderer.render( (player.scene == 1 ? scene1 : scene2), mainCamera);
}

init();
animate();


function onWindowResize() {

	mainCamera.aspect = window.innerWidth / window.innerHeight;
	mainCamera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}

function onMousePressed(e) {
	
	isMousePressed=true;
	crossHead.style.display='block';
}
function onMouseMoved(e) {
	if ( isActive() ) {
		easeRotate.set(easeRotate.x-e.movementX/500, easeRotate.y-e.movementY/500);
		const clamp=(n,min,max)=> Math.min(Math.max(n, min), max);
		easeRotate.y = clamp(easeRotate.y, -Math.PI/2, Math.PI/2);
	}
}
function onMouseReleased(e) {
	isMousePressed=false;
	crossHead.style.display='none';
}
