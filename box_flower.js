// Kevin Shannon
var canvas;
var gl;

// shader with lighting
var u_lightPosition;
var u_ambientProduct;
var u_diffuseProduct;
var u_specularProduct;
var u_shininess;

// attributes
var modelView;
var projMatrix;
var a_vertexPosition;

// viewer properties
var viewer = {
  eye: vec3(0.0, 0.0, 5.0),
  at:  vec3(0.0, 0.0, 0.0),
  up:  vec3(0.0, 1.0, 0.0),
};

var perspProj = {
  fov: 60,
  aspect: 1,
  near: 0.001,
  far:  10
}

// modelview and project matrices
var mvMatrix;
var u_mvMatrix;

var projMatrix;
var u_projMatrix;

// Light properties
// You determine if light defined in world or eye coords
// Check vertex shader: apply modelview to light or not?
class Light {
  constructor(position, ambient, diffuse, specular) {
    this.position = position;
    this.ambient = ambient;
    this.diffuse = diffuse;
    this.specular = specular;
  }
}

var light = new Light(
  vec4(0.0, 0.0, 0.0, 1.0),
  vec4(0.2, 0.2, 0.2, 1.0),
  vec4(0.9, 0.9, 0.9, 1.0),
  vec4(0.5, 0.5, 0.5, 1.0)
);

var shininess = 30;
var time = 0.625;

class Material {
  constructor(ambient, diffuse, specular) {
    this.ambient = ambient;
    this.diffuse = diffuse;
    this.specular = specular;
  }
}

var materials = {
  cyan: new Material(
    vec4(0.0, 1.0, 1.0, 1.0),
    vec4(0.0, 1.0, 1.0, 1.0),
    vec4(1.0, 1.0, 1.0, 1.0)
  ),
  magenta: new Material(
    vec4(1.0, 0.0, 1.0, 1.0),
    vec4(1.0, 0.0, 1.0, 1.0),
    vec4(1.0, 1.0, 1.0, 1.0)
  ),
  yellow: new Material(
    vec4(1.0, 1.0, 0.0, 1.0),
    vec4(1.0, 1.0, 0.0, 1.0),
    vec4(1.0, 1.0, 1.0, 1.0)
  ),
  red: new Material(
    vec4(1.0, 0.0, 0.0, 1.0),
    vec4(1.0, 0.0, 0.0, 1.0),
    vec4(1.0, 1.0, 1.0, 1.0)
  ),
  green: new Material(
    vec4(0.0, 1.0, 0.0, 1.0),
    vec4(0.0, 1.0, 0.0, 1.0),
    vec4(1.0, 1.0, 1.0, 1.0)
  ),
  blue: new Material(
    vec4(0.0, 0.0, 1.0, 1.0),
    vec4(0.0, 0.0, 1.0, 1.0),
    vec4(1.0, 1.0, 1.0, 1.0)
  )
};

var faces = {
  front: {
    orientation: [0, 0],
    material: 'cyan'
  },
  left: {
    orientation: [0, 90],
    material: 'magenta'
  },
  back: {
    orientation: [0, 90],
    material: 'yellow'
  },
  right: {
    orientation: [0, 90],
    material: 'blue'
  },
  top: {
    orientation: [90, 0],
    material: 'red'
  },
  bottom: {
    orientation: [180, 0],
    material: 'green'
  }
}

// mouse interaction
var mouse = {
  prevX: 0,
  prevY: 0,
  leftDown: false,
  rightDown: false,
};

var shape;
var aspect_ratio;

var program;
var vBuffer;
var vPosition;
var nBuffer;
var vNormal;
var iBuffer;

// Graphics Initialization
window.onload = function init() {
  // set up canvas
  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL( canvas );
  const ext = gl.getExtension('OES_element_index_uint');
  if (!gl) { alert("WebGL isn't available"); }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  aspect_ratio = canvas.width / canvas.height;

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  // Create the geometry and load into GPU structures,
  generate_geometry(square, time);
  generate_indices(square);
  shape = square;

  program = initShaders(gl, "vertex-shader1", "fragment-shader");
  gl.useProgram(program);

  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT);

  // array element buffer
  iBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

  // vertex buffer
  vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

  vPosition = gl.getAttribLocation(program, "a_vertexPosition");
  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  // normal buffer
  nBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

  vNormal = gl.getAttribLocation( program, "a_vertexNormal" );
  gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray(vNormal);

  // uniform locations
  u_mvMatrix = gl.getUniformLocation(program, "u_mvMatrix");
  u_projMatrix = gl.getUniformLocation(program, "u_projMatrix");
  u_lightPosition = gl.getUniformLocation(program, "u_lightPosition");
  u_ambientProduct = gl.getUniformLocation(program, "u_ambientProduct");
  u_diffuseProduct = gl.getUniformLocation(program, "u_diffuseProduct");
  u_specularProduct = gl.getUniformLocation(program, "u_specularProduct");
  u_shininess = gl.getUniformLocation(program, "u_shininess");

  // Render
  render();
}

var render = function() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var sz = .6
  time += 0.0232
  generate_geometry(shape, time);

  // vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  // normal buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

  gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray(vNormal);

  pjMatrix = perspective(perspProj.fov, perspProj.aspect, perspProj.near, perspProj.far);
  gl.uniformMatrix4fv(u_projMatrix, false, flatten(pjMatrix));

  mvMatrix = lookAt(viewer.eye, viewer.at, viewer.up);
  mvMatrix = mult(mvMatrix, scalem(sz/aspect_ratio, sz, sz));
  mvMatrix = mult(mvMatrix, rotateY(50*time));
  mvMatrix = mult(mvMatrix, rotateZ(50*time));
  for (face in faces) {
    // Orientate Face
    mvMatrix = mult(mvMatrix, rotateX(faces[face].orientation[0]));
    mvMatrix = mult(mvMatrix, rotateY(faces[face].orientation[1]));
    gl.uniformMatrix4fv(u_mvMatrix, false, flatten(mvMatrix));
  
    // Lights
    ambientProduct = mult(light.ambient, materials[faces[face].material].ambient);
    diffuseProduct = mult(light.diffuse, materials[faces[face].material].diffuse);
    specularProduct = mult(light.specular, materials[faces[face].material].specular);
  
    gl.uniform4fv(u_lightPosition, flatten(light.position));
    gl.uniform4fv(u_ambientProduct, flatten(ambientProduct));
    gl.uniform4fv(u_diffuseProduct, flatten(diffuseProduct));
    gl.uniform4fv(u_specularProduct, flatten(specularProduct));
    gl.uniform1f(u_shininess, shininess);
  
    gl.drawElements(gl.TRIANGLES, shape.numIndices, gl.UNSIGNED_INT, 0);
  }
  requestAnimFrame(render);
}
