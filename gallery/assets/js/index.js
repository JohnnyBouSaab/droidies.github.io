import * as THREE from 'three';

import {PointerLockControls} from '../../libs/PointerLockControls.js';
import {RectAreaLightUniformsLib} from '../../libs/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper }  from "../../helpers/RectAreaLightHelper.js";
import {FontLoader} from '../../loaders/FontLoader.js';
import {TextGeometry} from '../../libs/TextGeometry.js';
import {VRButton} from '../../libs/VRButton.js'; var vrbutton;
import Stats from '../../libs/stats.module.js';
import {GLTFLoader} from '../../loaders/GLTFLoader.js';
import {FBXLoader} from '../../loaders/FBXLoader.js';

// Physijs.scripts.worker = '../../physijs/physijs_worker.js';
// Physijs.scripts.ammo = '../../physijs/ammo.js';

let camera, scene, renderer, controls, user;

const objects = [];

let raycaster;

let speed = 400.0;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let lockLeft = false, lockRight = false, lockForward = false, lockBackward = false;
let rotationMatrices = [];
var textMesh;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();

const MAX = 9, MAX_VIP = 8; // max arts that fit currently in the gallery
var loadManager; var loadedTextures = false; var loadedArt = [false,false,false,false,false,false,false,false,false];
var loadedVip = [false,false,false,false,false,false,false,false]; var VIP = false
var loadingScreen = $('#loading'); loadingScreen.on( 'transitionend', function() {loadingScreen.hide()} ); var nr = false; var invalid = false;

let stats;

init();

function init() {

  init_loader();
  prepareRotationMatrices();

  user = new THREE.Group();
  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
  // camera.position.set( 0, 10, 40 );
  user.add(camera);
  user.position.set(0,10,40);

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xffffff );
  // scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

  // const light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
  // light.position.set( 0.5, 1, 0.75 );
  // scene.add( light );

  controls = new PointerLockControls( user, document.body );

  const blocker = document.getElementById( 'blocker' );
  const instructions = document.getElementById( 'instructions' );

  instructions.addEventListener( 'click', function () {

    controls.lock();

  } );

  controls.addEventListener( 'lock', function () {

    instructions.style.display = 'none';
    blocker.style.display = 'none';
    let vrButton = document.getElementById('VRButton');
    if(vrButton) vrButton.style.display = 'none';

  } );

  controls.addEventListener( 'unlock', function () {

    blocker.style.display = 'block';
    instructions.style.display = '';
    let vrButton = document.getElementById('VRButton');
    if (vrButton) vrButton.style.display = '';

  } );

  // scene.add( controls.getObject() );
  scene.add(user);

  const onKeyDown = function ( event ) {
    switch ( event.code ) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward = true;
        break;

      case 'ArrowLeft':
      case 'KeyA':
        moveLeft = true;
        break;

      case 'ArrowDown':
      case 'KeyS':
        moveBackward = true;
        break;

      case 'ArrowRight':
      case 'KeyD':
        moveRight = true;
        break;

      // case 'Space':
      //   if ( canJump === true ) velocity.y += 350;
      //   canJump = false;
      //   break;
    }
  };

  const onKeyUp = function ( event ) {
    switch ( event.code ) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward = false;
        break;

      case 'ArrowLeft':
      case 'KeyA':
        moveLeft = false;
        break;

      case 'ArrowDown':
      case 'KeyS':
        moveBackward = false;
        break;

      case 'ArrowRight':
      case 'KeyD':
        moveRight = false;
        break;
    }
  };

  document.addEventListener( 'keydown', onKeyDown );
  document.addEventListener( 'keyup', onKeyUp );

  renderer = new THREE.WebGLRenderer( { antialias: true } );

  // arts
  loadArt();

  // lights
  addLights(); 

  // render info
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  renderer.xr.addEventListener('sessionend', function() {
    vrexit();
  });
  renderer.xr.addEventListener('sessionstart', function() {
    // console.log(renderer.xr.controls);
  });
  renderer.shadowMap.enabled = true;
  document.body.appendChild( renderer.domElement );
  document.body.appendChild( VRButton.createButton( renderer ) ); vrbutton = $('#VRButton'); vrbutton.hide();
  stats = new Stats();
  document.body.appendChild(stats.dom);
  window.addEventListener( 'resize', onWindowResize );

  renderer.setAnimationLoop(render);

}

function vrexit() {
  user.remove(camera);
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
  user.add(camera);
}

function prepareRotationMatrices() {
  var rotationMatrixF = new THREE.Matrix4();
  rotationMatrixF.makeRotationY(0);
  rotationMatrices.push(rotationMatrixF); // forward direction.

  var rotationMatrixB = new THREE.Matrix4();
  rotationMatrixB.makeRotationY(180 * Math.PI / 180);
  rotationMatrices.push(rotationMatrixB);

  var rotationMatrixL = new THREE.Matrix4();
  rotationMatrixL.makeRotationY(90 * Math.PI / 180);
  rotationMatrices.push(rotationMatrixL);

  var rotationMatrixR = new THREE.Matrix4();
  rotationMatrixR.makeRotationY((360 - 90) * Math.PI / 180);
  rotationMatrices.push(rotationMatrixR);
};

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

// LIGHTS
function addLights() {
  const light = new THREE.AmbientLight( 0x808080, 0.75 ); // soft white light
  scene.add( light );
  // const lightH = new THREE.HemisphereLight( 0x808080, 0x000000 ); // soft white light
  // scene.add( lightH );

  // const light2 = new THREE.DirectionalLight(0xffffff, 0.2);
  // light2.position.set(0,25,5); light2.target.position.set(0,0,10);
  // const helper2 = new THREE.DirectionalLightHelper( light2 );
  // scene.add(helper2);
  // scene.add(light2);

  RectAreaLightUniformsLib.init();
  const light1 = new THREE.RectAreaLight( 0x808080, 6, 30,50 );
  light1.position.set(0, 45, 0);  light1.lookAt(0,0,0);
  const helper = new RectAreaLightHelper( light1 );
  scene.add(helper);
  scene.add(light1);

}

function addWelcomeSign(msg, vip1=false) {
  let fontLoader = new FontLoader(loadManager);
  let welcome = fontLoader.load('./assets/resources/helvetiker_regular.typeface.json', function(font) {
    const welcomeGeo = new TextGeometry(msg, {
      font:font,
      size:4,
      height:0.5
    });
    welcomeGeo.center();
    let welcomeMesh = new THREE.Mesh(welcomeGeo, [
      new THREE.MeshStandardMaterial({color: 0xdedede}), // front
      new THREE.MeshStandardMaterial({color: 0x000000}) // side
    ]);
    welcomeMesh.position.set(0,vip1?35:30,-40); 
    scene.add(welcomeMesh);

    //welcome sign light
    const l = new THREE.RectAreaLight( 0x808080, 2, 50,4 );
    l.position.set(0, vip1?30:24, -40); l.lookAt(welcomeMesh.position);
    const lh = new RectAreaLightHelper( l );
    scene.add(lh);
    scene.add(l);
    const l1 = new THREE.RectAreaLight( 0x808080, 2, 50,4 );
    l1.position.set(l.position.x, l.position.y, l.position.z); l1.lookAt(welcomeMesh.position.x, -welcomeMesh.position.y, welcomeMesh.position.z); 
    const lh1 = new RectAreaLightHelper( l1 );
    scene.add(lh1);
    scene.add(l1);
  });
}

function createRoomElements() {
  // font loader
  let fontLoader = new FontLoader(loadManager);

  // logo
  let logo = fontLoader.load('./assets/resources/origin_tech.json', function(font) {
    const textGeo = new TextGeometry('Droidies', {
      font:font,
      size:1.5,
      height:0.5
    });
    textGeo.center();
    textMesh = new THREE.Mesh(textGeo, [
      new THREE.MeshStandardMaterial({color: 0xdedede}), // front
      new THREE.MeshStandardMaterial({color: 0x000000}) // side
    ]);
    textMesh.position.set(0,12,10);
    // textMesh.castShadow = true;
    scene.add(textMesh);
  });

  // logo box
  const box = new THREE.Mesh(new THREE.BoxGeometry(10, 18, 10), new THREE.MeshStandardMaterial({color: 0x636363, roughness: 0.1, metalness:0}));
  box.position.set(0,0,10);
  // box.receiveShadow = true; box.castShadow = true;
  scene.add(box);

  // soul box
  // let gl = new GLTFLoader(loadManager);
  // gl.load('./assets/resources/misc/test.glb', function(gltf) {
  //   let obj = gltf.scene;
  //   obj.scale.set(28,28,28); 
  //   let c=0;
  //   obj.traverse(function(child){
  //     if(child.isMesh) {
  //       c += 1;
  //       // if(c==3) child.material = new THREE.MeshStandardMaterial({color:0x000000,roughness:0,metalness:0});
  //       // else child.material = new THREE.MeshStandardMaterial({color:0x000000});
  //     }
  //   });
  //   obj.position.set(-24.5,13,-38); obj.rotateX(Math.PI/2);
  //   scene.add(obj);
  //   let sbox = new THREE.Mesh(new THREE.BoxGeometry(5,18,5), new THREE.MeshStandardMaterial({color:0x004875}));
  //   sbox.position.set(-23,3,-38);
  //   scene.add(sbox);
  // });

}

// ROOM
function createRoom(vip1 = false) {

  createRoomElements();

  // floor
  let floorGeo = new THREE.BoxGeometry(2000, 0.1, 2000);
  let floorTexture = new THREE.TextureLoader(loadManager).load( './assets/img/floor1.jpg', function(ft) {
    ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
    ft.repeat.set(300,300);
    let material = new THREE.MeshStandardMaterial( { map:ft, color: 0x808080} );
    let mesh = new THREE.Mesh( floorGeo, material );
    // mesh.receiveShadow = true; mesh.lightChannel = 1;
    scene.add( mesh ); objects.push(mesh);
  });

  // ROOM DIAMETER
  let DIAM = 100;
  // wall info
  let WIDTH = DIAM, HEIGHT = 100, DEPTH = 4.7, COLOR = 0x636363;  

  if(vip1) createVip1Room(WIDTH, DEPTH, HEIGHT, DIAM); 

  const rectShape = new THREE.Shape()
  .moveTo(0, 0)
  .lineTo(WIDTH, 0)
  .lineTo(WIDTH, WIDTH)
  .lineTo(0, WIDTH)
  .lineTo(0, 0)

  const geo = new THREE.ExtrudeBufferGeometry(rectShape, {dept: DEPTH});
  geo.center();

  const rectShapeWithHole = rectShape.clone();
  const hole = new THREE.Path()
  .absarc(WIDTH/2, 58, 15, 0, Math.PI * 2, true);
  rectShapeWithHole.holes.push(hole);
  const geoWithHole = new THREE.ExtrudeBufferGeometry(rectShapeWithHole, {depth: 4*DEPTH});
  geoWithHole.center();
  const geoNoHole =  new THREE.ExtrudeBufferGeometry(rectShape, {depth: 4*DEPTH});
  geoNoHole.center();

  let wallMat = new THREE.MeshStandardMaterial({color: COLOR}); let vipMat = new THREE.MeshStandardMaterial({color:0x030303});
  // let wallGeo = new THREE.BoxGeometry( WIDTH, HEIGHT, DEPTH );
  let wallGeo = geo;

  let box1 = new THREE.Mesh(wallGeo, wallMat);
  let box2 = new THREE.Mesh(vip1?geoWithHole:geoNoHole, [wallMat,vipMat]);
  // box1.castShadow = true; box2.castShadow = true; 
  let box3 = box1.clone();
  let box4 = box1.clone();

  // let m1 = new THREE.MeshPhysicalMaterial({color: 0x999999, roughness:0, transmission:1, thickness:0.5});
  let m2 = new THREE.MeshPhysicalMaterial({color: 0x999999, roughness:0});
  let ceiling = new THREE.Mesh(wallGeo, m2);
  // let c2 = new THREE.Mesh(wallGeo,m2);c2.rotateX(-Math.PI/2);c2.position.setY(HEIGHT/2 + 1); scene.add(c2);

  box1.rotateY(-Math.PI/2);
  box1.position.setX(-DIAM/2); 

  box2.rotateY(-Math.PI);
  box2.position.setZ(-DIAM/2);

  box3.position.setZ(DIAM/2);

  box4.rotateY(Math.PI/2);
  box4.position.setX(DIAM/2);

  // ceiling
  ceiling.rotateX(-Math.PI/2);
  ceiling.position.setY(HEIGHT/2 - 1);

  objects.push(box1,box2,box3,box4, ceiling);
  scene.add(box1, box2, box3, box4, ceiling);

  // outside
  // const loader = new THREE.TextureLoader();
  // loader.load(
  //   "./assets/img/outside.jpg",
  //   (texture) => {
  //     texture.mapping = THREE.CubeRefractionMapping;
  //     scene.background = texture;
  //     // var material = new THREE.MeshPhongMaterial({ 
  //     //   map: texture,
  //     // });
  //     // var sky = new THREE.Mesh(new THREE.SphereGeometry(1000,25,25), material);
  //     // sky.material.side = THREE.BackSide;
  //     // scene.add(sky);
  //   }
  // );
}

function createVip1Room(WIDTH, DEPTH, HEIGHT, DIAM) {

  const rectShape = new THREE.Shape()
  .moveTo(0, 0)
  .lineTo(WIDTH, 0)
  .lineTo(WIDTH, WIDTH)
  .lineTo(0, WIDTH)
  .lineTo(0, 0)

  const vipMat = new THREE.MeshStandardMaterial({color:0x030303});
  const wallGeo = new THREE.ExtrudeBufferGeometry(rectShape, {dept: DEPTH});
  wallGeo.center();

  let box1 = new THREE.Mesh(wallGeo, vipMat), box2 = box1.clone(), box3 = box1.clone();

  // let m1 = new THREE.MeshPhysicalMaterial({color: 0x999999, roughness:0, transmission:1, thickness:0.5});
  let m2 = new THREE.MeshPhysicalMaterial({color: 0x030303});
  let ceiling = new THREE.Mesh(wallGeo, m2);
  // let c2 = new THREE.Mesh(wallGeo,m2);c2.rotateX(-Math.PI/2);c2.position.setY(HEIGHT/2 + 1); scene.add(c2);

  const rectShapeWithHole = rectShape.clone();
  const hole = new THREE.Path()
  .absarc(WIDTH/2, 58, 15, 0, Math.PI * 2, true);
  rectShapeWithHole.holes.push(hole);
  const geoWithHole = new THREE.ExtrudeBufferGeometry(rectShapeWithHole, {depth: 0.1});
  geoWithHole.center();
  let boxBack = new THREE.Mesh(geoWithHole, vipMat);
  boxBack.position.setZ(-DIAM/2 -9.8); 

  box1.rotateY(-Math.PI/2);
  box1.position.setX(-DIAM/2); 
  box1.position.setZ(-DIAM);

  box2.rotateY(Math.PI/2); 
  box2.position.setX(DIAM/2);
  box2.position.setZ(-DIAM);

  box3.position.setZ(-1.5*DIAM);
  // box1.castShadow = true; box2.castShadow = true; box3.castShadow = true;

  // ceiling
  ceiling.rotateX(-Math.PI/2);
  ceiling.position.setY(HEIGHT/2 - 1); 
  ceiling.position.setZ(-DIAM);

  objects.push(box1, box2, box3, ceiling, boxBack);
  scene.add(box1, box2, box3, ceiling, boxBack);

  // lights
  // RectAreaLightUniformsLib.init();
  // const light1 = new THREE.RectAreaLight( 0x808080, 6, 30,50 ); light1.channel = 2;
  // light1.position.set(-20, 46, -DIAM);  light1.lookAt(0,0,-DIAM);
  // const helper = new RectAreaLightHelper( light1 );
  // scene.add(helper);
  // scene.add(light1);
  const light1 = new THREE.PointLight( 0x2b343d, 6, 100, 2 );
  light1.position.set(0, 40, -DIAM);  
  const helper = new THREE.PointLightHelper( light1 );
  // scene.add(helper);
  scene.add(light1);

  // lamp
  let lampMesh = new THREE.Mesh(new THREE.OctahedronGeometry(3), new THREE.MeshPhysicalMaterial({color: 0x16161f}));
  lampMesh.position.set(0, 48, -DIAM); 
  scene.add(lampMesh);

  // VIP welcome sign
  let fontLoader = new FontLoader(loadManager);
  let welcome = fontLoader.load('./assets/resources/helvetiker_regular.typeface.json', function(font) {
    const welcomeGeo = new TextGeometry('VIP Hodler', {
      font:font,
      size:6,
      height:0.6
    });
    welcomeGeo.center();
    let welcomeMesh = new THREE.Mesh(welcomeGeo, [
      new THREE.MeshStandardMaterial({color: 0x450000}), // front
      new THREE.MeshStandardMaterial({color: 0x000000}) // side
    ]);
    welcomeMesh.position.set(0,30,-149); 
    scene.add(welcomeMesh);
  });

  addVipElements();

}

function addVipElements() {

  const ld = new FBXLoader(loadManager); const tl = new THREE.TextureLoader();
  const gl = new GLTFLoader(loadManager);

  // desk
  ld.load('./assets/resources/desk/Computer Desk.FBX', function(obj) {
    let put = false, put1=false, put2=false;
    obj.traverse(function(child){
      // if(child.isMesh) {child.castShadow=true;child.receiveShadow=true}
      if(child.isMesh && !put) {
        put = true; child.material = new THREE.MeshStandardMaterial({color:0x000000});
      } else if(child.isMesh && !put1) {
        put1 = true; child.material = new THREE.MeshStandardMaterial({color:0x000000});
      } else if(child.isMesh && !put2) {
        put2 = true; child.material = new THREE.MeshStandardMaterial({color:0x0a0a0a});
      } else if(child.isMesh) { 
        child.material = new THREE.MeshStandardMaterial({color:0x000000});
      } 
    });
    obj.scale.set(0.24,0.24,0.24); obj.rotateY(Math.PI/2);
    obj.position.set(0,0.1,-135);
    scene.add(obj);
  });

  // chair
  ld.load('./assets/resources/chair/chair.fbx', function(obj) {
    obj.traverse(function(child) {
      if(child.isMesh) {
        // child.castShadow = true; child.receiveShadow = true;
        child.material = new THREE.MeshStandardMaterial({color:0x000000});
      } 
    });
    obj.scale.set(0.28,0.28,0.28); obj.rotateY(Math.PI);
    obj.position.set(0,0.1,-142); 
    scene.add(obj);
  });

  // table elements
  ld.load('./assets/resources/misc/cup.fbx', function(obj) {
    obj.traverse(function(child) {
      if(child.isMesh) {
        // child.castShadow=true;child.receiveShadow=true;
        child.material = new THREE.MeshStandardMaterial({color:0x000000});
      } 
    });
    obj.scale.set(0.005,0.005,0.005); obj.rotateY(Math.PI);
    obj.position.set(5,7.7,-135); 
    scene.add(obj);
  });
  ld.load('./assets/resources/misc/lavalamp.fbx', function(obj) {
    obj.scale.set(0.2,0.2,0.2); 
    obj.position.set(-7,8.2,-135); 
    scene.add(obj);
    const light1 = new THREE.PointLight( 0xffffff, 1, 50, 2 );
    light1.position.set(-7,9,-136);  
    const helper = new THREE.PointLightHelper( light1 );
    // scene.add(helper);
    scene.add(light1);
  });
  gl.load('./assets/resources/laptop/laptop.glb', function(gltf) {
    let obj = gltf.scene;
    obj.scale.set(9,9,9); 
    let c=0;
    obj.traverse(function(child){
      if(child.isMesh) {
        c += 1;
        if(c == 4) child.material = new THREE.MeshStandardMaterial({color:0x000000});
      }
    });
    obj.position.set(-1,7.7,-135.5); obj.rotateY(Math.PI - Math.PI/8);
    scene.add(obj);
  });
  gl.load('./assets/resources/misc/book.glb', function(gltf) {
    let tl = new THREE.TextureLoader(loadManager);
    tl.load('./assets/resources/misc/bd.png', function(img){
      let obj = gltf.scene;
      obj.scale.set(0.7,0.7,0.7); 
      let c=0;
      obj.traverse(function(child){
        if(child.isMesh) {
          c += 1;
          if(c==2) child.material.color.set(0xffffff);
          else {child.material.map = img; child.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();}
        }
      });
      obj.position.set(7,1,-136); obj.rotateX(-Math.PI/2); obj.rotateY(Math.PI);
      scene.add(obj);
      const light1 = new THREE.PointLight( 0xffffff, 1, 10, 1 );
      light1.position.set(7,3,-136);  
      const helper = new THREE.PointLightHelper( light1 );
      // scene.add(helper);
      scene.add(light1);
    });
  });

  gl.load('./assets/resources/misc/tv.gltf', function(gltf) {
    let obj = gltf.scene;
    obj.scale.set(14,14,14); 
    let c=0;
    obj.traverse(function(child){
      if(child.isMesh) {
        c += 1;
        if(c==3) child.material = new THREE.MeshStandardMaterial({color:0x000000,roughness:0,metalness:0});
        else child.material = new THREE.MeshStandardMaterial({color:0x000000});
      }
    });
    obj.position.set(0,24,-66); obj.rotateY(Math.PI);
    scene.add(obj);
  });

}

function loadVipArt(zz, side, img, name) {
  let frameGeo = new THREE.BoxGeometry(18,18,1.8);
  let b = new THREE.MeshStandardMaterial({color: 0x0a0a0a,metalness: 0,  
  roughness: 0}); // frame color

  let distance = 50;
  // position of frame
  let x; if(side == 'left') x = -distance; else if(side == 'right') x = distance; else if(side=='back') x = zz;
  let y = 18;
  let z; if(side == 'left' || side == 'right') z = zz; else z = -distance-9.5;
  let rot = (side == 'left') ? (Math.PI)/2 : (side == 'right') ? (-Math.PI)/2 : (side == 'back') ? Math.PI : -1;

  //art 
  let tl = new THREE.TextureLoader(loadManager);
  let frameMaterial = [b, b, b, b, new THREE.MeshStandardMaterial({map: img}), b];
  let frameMesh = new THREE.Mesh(frameGeo, frameMaterial);
  // frameMesh.castShadow = true;
  frameMesh.position.set(x,y,z);
  frameMesh.rotateY(rot);

  // outer frame
  let outerFrameGeo = new THREE.BoxGeometry(19,19,1.7);
  let outerFrameMesh = new THREE.Mesh(outerFrameGeo, b);
  outerFrameMesh.position.set(x,y,z); 
  outerFrameMesh.rotateY(rot); 
  scene.add(frameMesh, outerFrameMesh);
  // let gl = new GLTFLoader();
  // gl.load('./assets/resources/frame.glb', function(gltf) {
  //   let obj = gltf.scene;
  //   obj.scale.set(22,22,22);
  //   obj.position.set(x+0.2,y,z);
  //   obj.rotateY(rot);
  //   obj.traverse(function(child){
  //     if(child.isMesh) child.material = new THREE.MeshStandardMaterial({color:0x030303,roughness:0,metalness:0});
  //   });
  //   scene.add(obj);
  //   scene.add(frameMesh);
  // });

  // frame light
  const spotLight = new THREE.SpotLight(0x0a0a0a, 1, 200, Math.PI/8, 0.55, 5);
  spotLight.position.set(0,45,-120); 
  // spotLight.castShadow = true; spotLight.target = frameMesh;
  const helper = new THREE.SpotLightHelper( spotLight ); 
  // scene.add(helper);
  scene.add(spotLight);

  // name
  let fontLoader = new FontLoader(loadManager);
  let nameFrame = fontLoader.load('./assets/resources/helvetiker_regular.typeface.json', function(font) {
    const nameFrameGeo = new TextGeometry(name, {
      font:font,
      size:0.8,
      height:1.2
    });
    nameFrameGeo.center();
    let nameFrameMesh = new THREE.Mesh(nameFrameGeo, [
      new THREE.MeshStandardMaterial({color: 0x3b3b3b}), // front
      new THREE.MeshStandardMaterial({color: 0x3b3b3b}) // side
    ]); let offset = side=='left'?+0.2:side=='right'?-0.2:0;
    nameFrameMesh.position.set(x+offset,y-12,z);
    nameFrameMesh.rotateY(rot);
    scene.add(nameFrameMesh);
  });
  loading(false);
}

function loadArt() {  

  loading(true, 'Loading your Droidies...');

  let positionsZZ = [-20,5,30,-20,5,30,-30,0,30], positionsZZvip = [-134,-105,-76,-134,-105,-76,-32,32],
  sides = ['left','left','left','right','right','right','back','back','back'];

  let ADDRESS = getAddress(); 
  if(ADDRESS && ADDRESS != '') {
    // let URL = RPC_URL + 'api/getTokenBalance?account=' + ADDRESS + '&tokenSymbol=' + TOKEN_SYMBOL + '&chainInput=main';
    let URL = 'https://droidies-api.herokuapp.com/balance?chain=' + CHAIN + '&address='  + ADDRESS;
    fetch(URL).then(response => {
      if(response.ok) {
        response.json().then(data => {
          if(data && data['balance'] > 0) {

            let DROIDIES_NUM = data['balance']; // number of owned droidies
            let DROIDIES = data['droidies']; // IDs of owned droidies
            let num = DROIDIES_NUM < MAX+MAX_VIP ? DROIDIES_NUM : MAX+MAX_VIP;
            if(num < MAX) {
              for(var i = num; i < MAX; i++) {
                loadedArt[i] = true;
              }
            } 
            else {
              VIP = true;
              if(num < MAX_VIP) {
                for(var i = num-MAX; i < MAX_VIP; i++) {
                  loadedVip[i] = true;
                }
              }
            }

            // welcome sign
            addWelcomeSign('My Gallery', VIP);

            for(var i = 0; i < num; i++) {
              let posIdx = i;
              let droidID = DROIDIES[i]; 
              // URL = RPC_URL + 'api/getNFT?symbol=' + TOKEN_SYMBOL + '&IDtext=' + droidID;
              URL = 'https://droidies-api.herokuapp.com/getDroidy?chain=' + CHAIN + '&id='  + droidID;
              fetch(URL).then(response => {
                if(response.ok) {
                  response.json().then(data => {
                    // let rom = data['rom']; let dec = phantasmaJS.phantasmaJS.decodeVMObject(rom);
                    // let droid_idx = dec['idx'];
                    let droid_idx = data['idx'];
                    if(posIdx < MAX) { 
                      createArt(positionsZZ[posIdx], sides[posIdx], IMAGES_URL+droid_idx+'.png', posIdx, 'Droidy #'+droid_idx);
                    }
                    else { 
                      createArtVip(positionsZZvip[posIdx-MAX], sides[posIdx-MAX], IMAGES_URL+droid_idx+'.png', posIdx, 'Droidy #'+droid_idx);
                    }
                  });
                } else {
                  console.log(response);
                }
              }).catch(error => {
                console.log(error);
              });
            }
          } else if(data && data['error']) {  // INVALID ADDRESS GIVEN 
            loading(true, 'Invalid Phantasma address', true, true);
          } else if(data['balance'] == 0) {  // user has 0 droidies
            addWelcomeSign('Empty Gallery :(');
            for(var i = 0; i < MAX; i++) {
              loadedArt[i] = true;
            }
            loading(false);
          }
          // room
          createRoom(VIP); 
        });
      } else {
        console.log(response);
        loading(true, 'Could not reach Phantasma Chain', true);
      }
    }).catch(error => {
      console.log("Could not reach chain node: " + error);
      loading(true, 'Could not reach Phantasma Chain', true);
    });
  } else {
    loading(true, 'Invalid Phantasma Address', true, true);
    console.log("Empty address");
  }

  // createArt(-30, 'left');
  // createArt(0, 'left');
  // createArt(30, 'left');

  // createArt(-30, 'right');
  // createArt(0, 'right');
  // createArt(30, 'right');

  // createArt(-30, 'back');
  // createArt(0, 'back');
  // createArt(30, 'back');
}

function createArtVip(zz, side, url, idx, name) {
  loading(true, 'Loading your Droidies...');
  let tl = new THREE.TextureLoader(); 
  tl.load(url, function(img) { img.anisotropy = renderer.capabilities.getMaxAnisotropy(); 
                                                  loadedVip[idx]=true; loadVipArt(zz, side, img, name) }, 
                                  function() { loading(true, 'Loading your Droidies...'); }, 
                                  function(err) {
                                    loading(true, 'Loading your Droidies...');
                                    tl.load('./assets/img/404.png', 
                                                  function(img) {loadedVip[idx]=true; loadVipArt(zz,side,img, 'Not found :(')}, 
                                                  function(){ loading(true, 'Loading your Droidies...'); }, 
                                                  undefined);
                                  });
  // frameTexture.generateMipmaps = false;
}

function createArt(zz, side, url, idx, name) {
  loading(true, 'Loading your Droidies...');
  let tl = new THREE.TextureLoader(); 
  tl.load(url, function(img) { img.anisotropy = renderer.capabilities.getMaxAnisotropy();
                                                  loadedArt[idx]=true; loadImageIntoFrame(zz, side, img, name) }, 
                                  function() { loading(true, 'Loading your Droidies...'); }, 
                                  function(err) {
                                    loading(true, 'Loading your Droidies...');
                                    tl.load('./assets/img/404.png', 
                                                  function(img) {loadedArt[idx]=true; loadImageIntoFrame(zz,side,img, 'Not found :(')}, 
                                                  function(){ loading(true, 'Loading your Droidies...'); }, 
                                                  undefined);
                                  });
  // frameTexture.generateMipmaps = false;
}

function loadImageIntoFrame(zz, side, img, name) {

  let frameGeo = new THREE.BoxGeometry(18,18,1.8);
  let b = new THREE.MeshStandardMaterial({color: 0x000000,metalness: 0,  
  roughness: 0}); // frame color

  let distance = 50;
  // position of frame
  let x; if(side == 'left') x = -distance; else if(side == 'right') x = distance; else x = zz;
  let y = 18;
  let z; if(side == 'left' || side == 'right') z = zz; else z = distance;
  let rot = (side == 'left') ? (Math.PI)/2 : (side == 'right') ? (-Math.PI)/2 : (side == 'back') ? Math.PI : -1;

  //art 
  let frameMaterial = [b, b, b, b, new THREE.MeshStandardMaterial({map: img}), b];
  let frameMesh = new THREE.Mesh(frameGeo, frameMaterial);
  // frameMesh.castShadow = true;
  frameMesh.position.set(x,y,z);
  frameMesh.rotateY(rot);

  // outer frame
  let outerFrameGeo = new THREE.BoxGeometry(19,19,1.7);
  let outerFrameMesh = new THREE.Mesh(outerFrameGeo, b);
  outerFrameMesh.position.set(x,y,z); 
  outerFrameMesh.rotateY(rot); 
  scene.add(frameMesh, outerFrameMesh);

  // name
  let fontLoader = new FontLoader(loadManager);
  let nameFrame = fontLoader.load('./assets/resources/helvetiker_regular.typeface.json', function(font) {
    const nameFrameGeo = new TextGeometry(name, {
      font:font,
      size:0.8,
      height:1.2
    });
    nameFrameGeo.center();
    let nameFrameMesh = new THREE.Mesh(nameFrameGeo, [
      new THREE.MeshStandardMaterial({color: 0x000000}), // front
      new THREE.MeshStandardMaterial({color: 0x000000}) // side
    ]);
    let offset = side=='left'?+0.2:side=='right'?-0.2:0;
    nameFrameMesh.position.set(x+offset,y-12,z-0.2);
    nameFrameMesh.rotateY(rot);
    scene.add(nameFrameMesh);
  });

  // frame light
  const spotLight = new THREE.SpotLight(0x808080, 1, 200, Math.PI/8, 0.55, 5);
  spotLight.position.set(0,45,0); 
  // spotLight.castShadow = true; 
  spotLight.target = frameMesh;
  const helper = new THREE.SpotLightHelper( spotLight ); 
  // scene.add(helper);
  scene.add(spotLight);

  // const spotLight1 = new THREE.SpotLight(0x808080, 1, 200, Math.PI/8, 0.5, 5);
  // spotLight1.position.set(x+5,y+20,z); spotLight1.castShadow = true; spotLight1.target = frameMesh;
  // const helper1 = new THREE.SpotLightHelper( spotLight1 ); 
  // scene.add(helper1);
  // scene.add(spotLight1);
  loading(false);
}


function render() {

  const time = performance.now();

  if ( controls.isLocked === true ) {

    hitTest();

    const delta = ( time - prevTime ) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    if (moveForward && !lockForward) velocity.z -= speed * delta;
    if (moveBackward && !lockBackward) velocity.z += speed * delta;

    if (moveLeft && !lockLeft) velocity.x += speed * delta;
    if (moveRight && !lockRight) velocity.x -= speed * delta;

    // user.translateX( - velocity.x * delta );
    // user.translateZ( velocity.z * delta );
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

  }

  if(textMesh) {
    textMesh.rotation.y = time/1000;
  }

  prevTime = time;
  renderer.render( scene, camera );
  stats.update();

}

function unlockAllDirections() {
  lockForward = false;
  lockBackward = false;
  lockLeft = false;
  lockRight = false;
}
function lockDirectionByIndex(idx) {
  if(idx == 0) lockForward = true;
  else if(idx == 1) lockBackward = true;
  else if(idx == 2) lockLeft = true;
  else if(idx == 3) lockRight = true;
}

function hitTest() {

  unlockAllDirections();
  var cameraDirection = controls.getDirection(new THREE.Vector3(0, 0, 0)).clone();

  for (var i = 0; i < 4; i++) {

    var direction = cameraDirection.clone();
    direction.applyMatrix4(rotationMatrices[i]);
    var rayCaster = new THREE.Raycaster(controls.getObject().position, direction, 0, 10);
    var intersects = rayCaster.intersectObjects(objects, true);
    if (intersects.length > 0) {
      lockDirectionByIndex(i);
    }

  }
}

function init_loader() {
  loadManager = new THREE.LoadingManager(); let p;
  loadManager.onProgress = function ( item, loaded, total ) {
    loading(true, 'Loading Textures...');
  };
  loadManager.onLoad = function() {
    loadedTextures = true;
    loading(false);
  }
}

function loading(ld, msg='', nrg=false, inv=false) {
  if(nrg) nr=true; if(inv) invalid = true;
  if(nr) {
    loadingScreen.removeClass('fade-out');
    loadingScreen.show();
    if(vrbutton) vrbutton.hide();
    if(invalid) $('#msg').text('Invalid Phantasma Address');
    else $('#msg').text('Could not reach Phantasma Chain');
  } else {
    if(!ld && loadedTextures) {
      let loadedAll = true;
      loadedArt.forEach(loaded => {
        loadedAll = loaded;
      });
      if(VIP) {
        loadedVip.forEach(loaded => {
          loadedAll = loaded;
        });
      }
      if(loadedAll) {
        // console.log('YESSSSSSS');
        loadingScreen.addClass('fade-out'); 
        if(vrbutton) vrbutton.show();
      } 
    } else {
      loadingScreen.removeClass('fade-out');
      loadingScreen.show();
      if(vrbutton) vrbutton.hide();
    }
    if(msg != '')
      $('#msg').text(msg);
  }
}

function getAddress() {
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
  return params.address;
}