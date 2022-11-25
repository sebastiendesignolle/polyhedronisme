// Polyhédronisme
//===================================================================================================
//
// A toy for constructing and manipulating polyhedra and other meshes
//
// Includes implementation of the conway polyhedral operators derived
// from code by mathematician and mathematical sculptor
// George W. Hart http://www.georgehart.com/
//
// Copyright 2019, Anselm Levskaya
// Released under the MIT License


// Math / Vector / Matrix Functions
//===================================================================================================

// import math functions to local namespace
const { random, round, floor, sqrt, 
        sin, cos, tan, asin, acos, atan, 
        abs, pow, log,
        PI, LN10
      } = Math;
const log10 = x=> log(x)/LN10;

//returns string w. nsigs digits ignoring magnitude
const sigfigs = function(N, nsigs){
  const mantissa = N / pow(10, floor(log10(N)));
  const truncated_mantissa = round(mantissa * pow(10, (nsigs-1)));
  return `${truncated_mantissa}`;
};

// general recursive deep-copy function
var clone = function(obj) {
  if ((obj == null) || (typeof obj !== 'object')) {
    return obj;
  }
  const newInstance = new obj.constructor();
  for (let key in obj) {
    newInstance[key] = clone(obj[key]);
  }
  return newInstance;
};

// often useful
const randomchoice = function(array){
  const n = floor(random()*array.length);
  return array[n];
};

// 3d scalar multiplication
const mult = (c, vec) => 
  [c*vec[0], c*vec[1], c*vec[2]];

// 3d element-wise multiply
const _mult = (vec1, vec2) => 
  [vec1[0]*vec2[0], vec1[1]*vec2[1], vec1[2]*vec2[2]];

// 3d vector addition
const add = (vec1, vec2) => 
  [vec1[0]+vec2[0], vec1[1]+vec2[1], vec1[2]+vec2[2]];

// 3d vector subtraction
const sub = (vec1, vec2) => 
  [vec1[0]-vec2[0], vec1[1]-vec2[1], vec1[2]-vec2[2]];

// 3d dot product
const dot = (vec1, vec2) => 
  (vec1[0]*vec2[0]) + (vec1[1]*vec2[1]) + (vec1[2]*vec2[2]);

// 3d cross product d1 x d2
const cross = (d1, d2) => 
  [(d1[1]*d2[2]) - (d1[2]*d2[1]), 
   (d1[2]*d2[0]) - (d1[0]*d2[2]),  
   (d1[0]*d2[1]) - (d1[1]*d2[0]) ];

// vector norm
const mag = vec => sqrt(dot(vec, vec));

// vector magnitude squared
const mag2 = vec => dot(vec, vec);

// makes vector unit length
const unit = vec => mult(1 / sqrt(mag2(vec)), vec);

// midpoint between vec1, vec2
const midpoint = (vec1, vec2) => mult(1/2.0, add(vec1, vec2));

// parametric segment between vec1, vec2 w. parameter t ranging from 0 to 1
const tween = (vec1, vec2, t) => 
  [((1-t)*vec1[0]) + (t*vec2[0]), 
   ((1-t)*vec1[1]) + (t*vec2[1]), 
   ((1-t)*vec1[2]) + (t*vec2[2])];

// uses above to go one-third of the way along vec1->vec2 line
const oneThird = (vec1, vec2) => tween(vec1, vec2, 1/3.0);

// reflect 3vec in unit sphere, spherical reciprocal
const reciprocal = vec => mult(1.0 / mag2(vec), vec);

// point where line v1...v2 tangent to an origin sphere
const tangentPoint= function(v1, v2) {
  const d = sub(v2, v1);
  return sub(v1, mult(dot(d, v1)/mag2(d), d));
};

// distance of line v1...v2 to origin
const edgeDist = (v1, v2) => sqrt(mag2(tangentPoint(v1, v2)));

// square of distance from point v3 to line segment v1...v2
// http://mathworld.wolfram.com/Point-LineDistance3-Dimensional.html
// calculates min distance from 
// point v3 to finite line segment between v1 and v2
const linePointDist2 = function(v1, v2, v3) {
  let result;
  const d21 = sub(v2, v1);
  const d13 = sub(v1, v3);
  const d23 = sub(v2, v3);
  const m2 = mag2(d21);
  const t = -dot(d13, d21)/m2;
  if (t <= 0) { 
    // closest to point beyond v1, clip to |v3-v1|^2
    result = mag2(d13);
  } else if (t >= 1) { 
    // closest to point beyond v2, clip to |v3-v2|^2
    result = mag2(d23);
  } else {
    // closest in-between v1, v2
    result = mag2(cross(d21, d13))/m2;
  }
  return result;
};
  
// find vector orthogonal to plane of 3 pts
// -- do the below algos assume this be normalized or not?
const orthogonal = function(v1,v2,v3) {
  // adjacent edge vectors
  const d1 = sub(v2, v1);
  const d2 = sub(v3, v2);
  // cross product
  return cross(d1, d2);
};

// find first element common to 3 sets by brute force search
const intersect = function(set1, set2, set3) {
  for (let s1 of set1) {
    for (let s2 of set2) {
      if (s1 === s2) {
        for (let s3 of set3) {
          if (s1 === s3) {
            return s1;
          }
        }
      }
    }
  }
  return null; // empty intersection
};

// calculate centroid of array of vertices
const calcCentroid = function(vertices) {
  // running sum of vertex coords
  let centroidV = [0,0,0];
  for (let v of vertices) {
    centroidV = add(centroidV, v);
  }
  return mult(1 / vertices.length, centroidV );
};

// calculate average normal vector for array of vertices
const normal = function(vertices) {
  // running sum of normal vectors
  let normalV = [0,0,0]; 
  let [v1, v2] = vertices.slice(-2);
  for (let v3 of vertices) {
    normalV = add(normalV, orthogonal(v1, v2, v3));
    [v1, v2] = [v2, v3];
  } // shift over one
  return unit(normalV);
};

// calculates area planar face by summing over subtriangle areas
// this assumes planarity.
const planararea = function(vertices) {
  let area = 0.0;
  let vsum = [0.,0.,0.];
  let [v1, v2] = vertices.slice(-2);
  for (let v3 of vertices) {
    vsum = add(vsum, cross(v1, v2));
    [v1, v2] = [v2, v3];
  }
  area = abs(dot(normal(vertices), vsum) / 2.0);
  return area;
};

// congruence signature for assigning same colors to congruent faces
const faceSignature = function(vertices, sensitivity) {
  let x;
  const cross_array = [];
  let [v1, v2] = vertices.slice(-2);
  for (let v3 of vertices) {
    // accumulate inner angles
    cross_array.push(mag( cross(sub(v1, v2), sub(v3, v2)) ));
    [v1, v2] = [v2, v3];
  }
  // sort angles to create unique sequence
  cross_array.sort((a,b)=>a-b);

  // render sorted angles as quantized digit strings
  // this is the congruence signature
  let sig = "";
  for (x of cross_array) { sig+=sigfigs(x, sensitivity); }
  // hack to make reflected faces share the same signature
  for (x of cross_array.reverse()) { sig+=sigfigs(x, sensitivity); }

  return sig;
};

// projects 3d polyhedral face to 2d polygon
// for triangulation and face display
const project2dface = function(verts){
  let tmpverts = clone(verts);
  const v0 = verts[0];
  tmpverts = _.map(tmpverts, x=>x-v0);

  const n = normal(verts);
  const c = unit(calcCentroid(verts)); //XXX: correct?
  const p = cross(n,c);

  return tmpverts.map((v) => [dot(n, v), dot(p, v)]);
};

// copies array of arrays by value (deep copy)
const copyVecArray = function(vecArray){
  const newVecArray = new Array(vecArray.length);
  for (let i = 0, end = vecArray.length; i < end; i++) {
    newVecArray[i] = vecArray[i].slice(0);
  }
  return newVecArray;
};

// 3d matrix vector multiply
const mv3 = (mat,vec) =>
  //Ghetto custom def of matrix-vector mult
  //example matrix: [[a,b,c],[d,e,f],[g,h,i]]
  [(mat[0][0]*vec[0])+(mat[0][1]*vec[1])+(mat[0][2]*vec[2]),
   (mat[1][0]*vec[0])+(mat[1][1]*vec[1])+(mat[1][2]*vec[2]),
   (mat[2][0]*vec[0])+(mat[2][1]*vec[1])+(mat[2][2]*vec[2])];

// 3d matrix matrix multiply
const mm3 = (A,B) =>
  [[(A[0][0]*B[0][0])+(A[0][1]*B[1][0])+(A[0][2]*B[2][0]),
   (A[0][0]*B[0][1])+(A[0][1]*B[1][1])+(A[0][2]*B[2][1]),
   (A[0][0]*B[0][2])+(A[0][1]*B[1][2])+(A[0][2]*B[2][2])],
  [(A[1][0]*B[0][0])+(A[1][1]*B[1][0])+(A[1][2]*B[2][0]),
   (A[1][0]*B[0][1])+(A[1][1]*B[1][1])+(A[1][2]*B[2][1]),
   (A[1][0]*B[0][2])+(A[1][1]*B[1][2])+(A[1][2]*B[2][2])],
  [(A[2][0]*B[0][0])+(A[2][1]*B[1][0])+(A[2][2]*B[2][0]),
   (A[2][0]*B[0][1])+(A[2][1]*B[1][1])+(A[2][2]*B[2][1]),
   (A[2][0]*B[0][2])+(A[2][1]*B[1][2])+(A[2][2]*B[2][2])]];

const eye3 = [[1,0,0], [0,1,0], [0,0,1]];

// Rotation Matrix
// Totally ghetto, not at all in agreement with euler angles!
// use quaternions instead
const rotm = function(phi,theta,psi){
  const xy_mat = [
    [cos(phi), -1.0*sin(phi),  0.0],
    [sin(phi),      cos(phi),  0.0],
    [0.0,                0.0,  1.0]];
  const yz_mat = [
    [cos(theta), 0, -1.0*sin(theta)],
    [         0, 1,               0],
    [sin(theta), 0,      cos(theta)]];
  const xz_mat = [
    [1.0,        0,             0],
    [  0, cos(psi), -1.0*sin(psi)],
    [  0, sin(psi),      cos(psi)]];
  return mm3(xz_mat, mm3(yz_mat,xy_mat));
};


// Rotation Matrix defined by rotation about (unit) axis [x,y,z] for angle radians
const vec_rotm = function(angle, x, y, z) {
  let m;
  angle /= 2;
  const sinA = sin(angle);
  const cosA = cos(angle);
  const sinA2 = sinA*sinA;
  const length = mag([x,y,z]);
  if (length === 0) {
    [x, y, z] = [0, 0, 1];
  }
  if (length !== 1) {
    [x, y, z] = unit([x, y, z]);
  }
  if ((x === 1) && (y === 0) && (z === 0)) {
      m = [[1,              0,           0],
          [0,    1-(2*sinA2), 2*sinA*cosA],
          [0,   -2*sinA*cosA, 1-(2*sinA2)]];
  } else if ((x === 0) && (y === 1) && (z === 0)) {
      m = [[1-(2*sinA2), 0,  -2*sinA*cosA],
          [          0, 1,             0],
          [2*sinA*cosA, 0,   1-(2*sinA2)]];
  } else if ((x === 0) && (y === 0) && (z === 1)) {
      m = [[   1-(2*sinA2),   2*sinA*cosA, 0],
          [  -2*sinA*cosA,   1-(2*sinA2), 0],
          [             0,             0, 1]];
  } else {
      const x2 = x*x;
      const y2 = y*y;
      const z2 = z*z;
      m = 
        [[1-(2*(y2+z2)*sinA2), 2*((x*y*sinA2)+(z*sinA*cosA)), 2*((x*z*sinA2)-(y*sinA*cosA))],
        [2*((y*x*sinA2)-(z*sinA*cosA)), 1-(2*(z2+x2)*sinA2), 2*((y*z*sinA2)+(x*sinA*cosA))],
        [2*((z*x*sinA2)+(y*sinA*cosA)), 2*((z*y*sinA2)-(x*sinA*cosA)), 1-(2*(x2+y2)*sinA2)]];
    }
  return m;
};

// Perspective Transform
// assumes world's been rotated appropriately such that Z is depth
// scales perspective such that inside depth regions min_real_depth <--> max_real_depth
// perspective lengths vary no more than:   desired_ratio
// with target dimension of roughly length: desired_length
const perspT = function(vec3, max_real_depth, min_real_depth, 
                        desired_ratio, desired_length) {
  const z0 = 
    ((max_real_depth * desired_ratio) - min_real_depth) / (1-desired_ratio);
  const scalefactor = 
    (desired_length * desired_ratio) / (1-desired_ratio);
  // projected [X, Y]
  return [(scalefactor*vec3[0])/(vec3[2]+z0), (scalefactor*vec3[1])/(vec3[2]+z0)];
};

// Inverses perspective transform by projecting plane onto a unit sphere at origin
const invperspT = 
  function(x, y, dx, dy, max_real_depth, min_real_depth, 
           desired_ratio, desired_length) {
  const z0 = 
    ((max_real_depth * desired_ratio) - min_real_depth)/(1-desired_ratio);
  const s = (desired_length * desired_ratio)/(1-desired_ratio);
  const xp = x-dx;
  const yp = y-dy;
  const s2 = s*s;
  const z02 = z0*z0;
  const xp2 = xp*xp;
  const yp2 = yp*yp;

  const xsphere = ((2*s*xp*z0) 
                    + sqrt((4*s2*xp2*z02) 
                    + (4*xp2*(s2+xp2+yp2)*(1-z02))))/(2.0*(s2+xp2+yp2));
  const ysphere = (((s*yp*z0)/(s2+xp2+yp2)) 
                   + ((yp*sqrt((4*s2*z02) 
                   + (4*(s2+xp2+yp2)*(1-z02))))/(2.0*(s2+xp2+yp2))));
  const zsphere = sqrt(1 - (xsphere*xsphere) - (ysphere*ysphere));

  return [xsphere, ysphere, zsphere];
};

// Returns rotation matrix that takes vec1 to vec2
const getVec2VecRotM = function(vec1, vec2){
  const axis  = cross(vec1, vec2);
  const angle = acos(dot(vec1, vec2));
  return vec_rotm(-1*angle, axis[0], axis[1], axis[2]);
};
// Polyhédronisme
//===================================================================================================
//
// A toy for constructing and manipulating polyhedra.
//
// Copyright 2019, Anselm Levskaya
// Released under the MIT License
//

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}

// Polyhedra Functions
//=================================================================================================
//
// Topology stored as set of faces.  Each face is list of n vertex indices
// corresponding to one oriented, n-sided face.  Vertices listed clockwise as seen from outside.

// Generate an array of edges [v1,v2] for the face.
const faceToEdges = function(face) {
  const edges = [];
  let [v1] = face.slice(-1);
  for (let v2 of face) {
    edges.push([v1, v2]);
    v1 = v2;
  }
  return edges;
};

const vertColors = function(poly) {
  const vertcolors=[];
  for (let i = 0; i < poly.faces.length; i++) {
    const face = poly.faces[i];
    for (let v of face) {
      vertcolors[v] = poly.face_classes[i];
    }
  }
  return vertcolors;
};

// Polyhedra Coloring Functions
//=================================================================================================
const rwb_palette = ["#ff7777", "#dddddd", "#889999", "#fff0e5",
                     "#aa3333", "#ff0000", "#ffffff", "#aaaaaa"];
let PALETTE = rwb_palette;  // GLOBAL
const palette = function(n) {
  const k = n % PALETTE.length;
  return hextofloats(PALETTE[k])
};

// converts [h,s,l] float args to [r,g,b] list
function hsl2rgb(h, s, l) {
  let r, g, b;
  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = function(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [r, g, b];
}

// converts #xxxxxx / #xxx format into list of [r,g,b] floats
const hextofloats = function(hexstr){
  let rgb;
  if (hexstr[0] === "#") {
    hexstr = hexstr.slice(1);
  }
  if (hexstr.length === 3) {
    rgb = hexstr.split('').map(c=> parseInt(c+c, 16)/255);
  } else {
    rgb = hexstr.match(/.{2}/g).map(c=> parseInt(c, 16)/255);
  }
  return rgb;
};

// converts [r,g,b] floats to #xxxxxx form
const floatstohex = function(rgb){
  let r_hex = Number(parseInt(255 * rgb[0], 10)).toString(16);
  let g_hex = Number(parseInt(255 * rgb[1], 10)).toString(16);
  let b_hex = Number(parseInt(255 * rgb[2], 10)).toString(16);
  return "#" + r_hex + g_hex + b_hex;
}

// randomize color palette
const rndcolors = function(){
  let newpalette=[];
  for(let i=0; i<100; i++){
    let h = random();
    let s = 0.5*random() + 0.3;
    let l = 0.5*random() + 0.45;
    let rgb = hsl2rgb(h, s, l);
    newpalette.push(floatstohex(rgb));
  }
  return newpalette;
}


// color the faces of the polyhedra for display
const paintPolyhedron = function(poly) {
  poly.face_classes = [];
  const colormemory={};

  // memorized color assignment to faces of similar areas
  const colorassign = function(hash, colormemory) {
    //const hash = ar;
    if (hash in colormemory) {
      return colormemory[hash];
    } else {
      const fclr = _.toArray(colormemory).length;
      colormemory[hash] = fclr;
      return fclr;
    }
  };

  for (var f of poly.faces) {
    var clr, face_verts;
    if (COLOR_METHOD === "area") {
      // color by face planar area assuming flatness
      face_verts = f.map(v=>poly.vertices[v])
      clr = colorassign(sigfigs(planararea(face_verts), COLOR_SENSITIVITY), colormemory);
    } else if (COLOR_METHOD === "signature") {
      // color by congruence signature
      face_verts = f.map(v=>poly.vertices[v])
      clr = colorassign(faceSignature(face_verts, COLOR_SENSITIVITY), colormemory);
    } else if (COLOR_METHOD === "inradius") {
      // color by inradius
      face_verts = f.map(v=>poly.vertices[v])
      clr = colorassign(sigfigs(dot(normal(face_verts), face_verts[0])/mag(normal(face_verts)), COLOR_SENSITIVITY), colormemory);
    } else {
      // color by face-sidedness
      clr = f.length - 3;
    }
    poly.face_classes.push(clr);
  }
  console.log(_.toArray(colormemory).length+" face classes");
  return poly;
};

// z sorts faces of poly
// -------------------------------------------------------------------------
const sortfaces = function(poly) {
  //smallestZ = (x) -> _.sortBy(x,(a,b)->a[2]-b[2])[0]
  //closests = (smallestZ(poly.vertices[v] for v in f) for f in poly.faces)
  let idx;
  const centroids  = poly.centers();
  const normals    = poly.normals();
  const ray_origin = [0,0, ((persp_z_max * persp_ratio) - persp_z_min)/(1-persp_ratio)];

  // sort by binary-space partition: are you on same side as view-origin or not?
  // !!! there is something wrong with this. even triangulated surfaces have artifacts.
  const planesort = (a,b) =>
    //console.log dot(sub(ray_origin,a[0]),a[1]), dot(sub(b[0],a[0]),a[1])
    -dot(sub(ray_origin,a[0]),a[1])*dot(sub(b[0],a[0]),a[1]);

  // sort by centroid z-depth: not correct but more stable heuristic w. weird non-planar "polygons"
  const zcentroidsort = (a, b) => a[0][2]-b[0][2];

  const zsortIndex = _.zip(centroids, normals, __range__(0, poly.faces.length, false))
    //.sort(planesort)
    .sort(zcentroidsort)
    .map(x=> x[2]);

  // sort all face-associated properties
  poly.faces = zsortIndex.map(idx=>poly.faces[idx]);
  poly.face_classes = zsortIndex.map(idx=>poly.face_classes[idx]);
};


class polyhedron {
  // constructor of initially null polyhedron
  constructor(verts, faces, name) {
    // array of faces.  faces.length = # faces
    this.faces = faces || new Array();
    // array of vertex coords.  vertices.length = # of vertices
    this.vertices  = verts || new Array();
    this.name = name  || "null polyhedron";
  }

  // return a non-redundant list of the polyhedron's edges
  edges() {
    let e, a, b;
    const uniqEdges = {};
    const faceEdges = this.faces.map(faceToEdges);
    for (let edgeSet of faceEdges) {
      for (e of edgeSet) {
        if (e[0] < e[1]) {
          [a, b] = e;
        } else {
          [b, a] = e;
        }
        uniqEdges[`${a}~${b}`] = e;
      }
    }
    return _.values(uniqEdges);
  }

  // get array of face centers
  centers() {
    const centersArray = [];
    for (let face of this.faces) {
      let fcenter = [0, 0, 0];
      // average vertex coords
      for (let vidx of face) {
        fcenter = add(fcenter, this.vertices[vidx]);
      }
      centersArray.push(mult(1.0 / face.length, fcenter));
    }
    // return face-ordered array of centroids
    return centersArray;
  }

  // get array of face normals
  normals() {
    const normalsArray = [];
    for (let face of this.faces) {
      normalsArray.push(normal(face.map(vidx => this.vertices[vidx])));
    }
    return normalsArray;
  }

  // informative string
  data() {
    const nEdges = (this.faces.length + this.vertices.length) - 2; // E = V + F - 2
    return `${this.faces.length} faces, ${nEdges} edges, ${this.vertices.length} vertices (${this.vertices.length/2})`;
  }

  moreData() {
    // return `min edge length ${this.minEdgeLength().toPrecision(4)}<br>` +
           // `min face radius ${this.minFaceRadius().toPrecision(4)}<br>` +
           // `polyhedron center ${this.magCenter().toPrecision(4)}<br>` +
    return `inradius ${this.inradius().toPrecision(6)} (${(cos(PI/(sqrt(2*this.vertices.length)))**2).toPrecision(6)})`;
  }

  minEdgeLength() {
    let min2 = Number.MAX_VALUE;
    // compute minimum edge length
    for (let e of this.edges()) {
      // square of edge length
      const d2 = mag2(sub(this.vertices[e[0]], this.vertices[e[1]]));
      if (d2 < min2) {
        min2 = d2;
      }
    }
    // this is normalized if rescaling has happened.
    return sqrt(min2);
  }

  minFaceRadius() {
    let min2 = Number.MAX_VALUE;
    const nFaces = this.faces.length;
    const centers = this.centers();
    for (let f = 0, end = nFaces; f < end; f++) {
      const c = centers[f];
      for (let e of faceToEdges(this.faces[f])) {
        // Check distance from center to each edge.
        const de2 = linePointDist2(this.vertices[e[0]], this.vertices[e[1]], c);
        if (de2 < min2) {
          min2 = de2;
        }
      }
    }
    return sqrt(min2);
  }

  magCenter() {
    let polycenter = [0, 0, 0];
    // sum centers to find center of gravity
    for (let v of this.vertices) {
      polycenter = add(polycenter, v);
    }
    return mag(polycenter);
  }

  inradius() {
    let shr = Number.MAX_VALUE;
    for (let f of this.faces) {
      const norm = normal(f.map(v=>this.vertices[v]))
      const s = dot(norm, this.vertices[f[0]])/mag(norm)
      if (s < shr) {
        shr = s;
      }
    }
    return shr;
  }

  // Export / Formatting Routines --------------------------------------------------

  // produces vanilla OBJ files for import into 3d apps
  toOBJ() {
    let f;
    let v;
    let objstr="#Produced by polyHédronisme http://levskaya.github.com/polyhedronisme\n";
    objstr+=`group ${this.name}\n`;
    objstr+="#vertices\n";
    for (v of this.vertices) {
      objstr += `v ${v[0]} ${v[1]} ${v[2]}\n`;
    }
    objstr += "#normal vector defs \n";
    for (f of this.faces) {
      const norm = normal(f.map(v=>this.vertices[v]))
      objstr += `vn ${norm[0]} ${norm[1]} ${norm[2]}\n`;
    }
    objstr += "#face defs \n";
    for (let i = 0; i < this.faces.length; i++) {
      f = this.faces[i];
      objstr += "f ";
      for (v of f) {
        objstr += `${v+1}//${i+1} `;
      }
      objstr += "\n";
    }
    return objstr;
  }

  toX3D() {
    let v;
    // ShapeWays uses 1unit = 1meter, so reduce to 3cm scale
    const SCALE_FACTOR = .03;
    // opening cruft
    let x3dstr=`\
<?xml version="1.0" encoding ="UTF-8"?>
<X3D profile="Interchange" version="3.0">
<head>
<component name="Rendering" level="3"/>
<meta name="generator" content="Polyhedronisme"/>
<meta name="version" content="0.1.0"/>
</head>
<Scene>
<Shape>
<IndexedFaceSet normalPerVertex="false" coordIndex="\
`;
    // face indices
    for (let f of this.faces) {
      for (v of f) {
        x3dstr+=`${v} `;
      }
      x3dstr+='-1\n';
    }
    x3dstr+='">\n';

    // per-face Color
    x3dstr+='<Color color="';
    for (let cl of vertColors(this)) {//@face_class
      const clr=palette(cl);
      x3dstr+=`${clr[0]} ${clr[1]} ${clr[2]} `;
    }
    x3dstr+='"/>';

    // re-scaled xyz coordinates
    x3dstr+='<Coordinate point="';
    for (v of this.vertices) {
      x3dstr+=`${v[0]*SCALE_FACTOR} ${v[1]*SCALE_FACTOR} ${v[2]*SCALE_FACTOR} `;
    }
    x3dstr+='"/>\n';

      // end cruft
    x3dstr+=`\
</IndexedFaceSet>
</Shape>
</Scene>
</X3D>`;

    return x3dstr;
  }

  toVRML() {
    let v;
    // ShapeWays uses 1unit = 1meter, so reduce to 3cm scale
    const SCALE_FACTOR = .03;
    // opening cruft
    let x3dstr=`\
#VRML V2.0 utf8
#Generated by Polyhedronisme
NavigationInfo {
	type [ "EXAMINE", "ANY" ]
}
Transform {
  scale 1 1 1
  translation 0 0 0
  children
  [
    Shape
    {
      geometry IndexedFaceSet
      {
        creaseAngle .5
        solid FALSE
        coord Coordinate
        {
          point
          [\
`;
    // re-scaled xyz coordinates
    for (v of this.vertices) {
      x3dstr+=`${v[0]*SCALE_FACTOR} ${v[1]*SCALE_FACTOR} ${v[2]*SCALE_FACTOR},`;
    }
    x3dstr=x3dstr.slice(0, +-2 + 1 || undefined);
    x3dstr+=`\
    ]
}
color Color
{
  color
  [\
`;
    // per-face Color
    for (let cl of this.face_classes) {
      const clr=palette(cl);
      x3dstr+=`${clr[0]} ${clr[1]} ${clr[2]} ,`;
    }
    x3dstr=x3dstr.slice(0, +-2 + 1 || undefined);
    x3dstr+=`\
  ]
}
colorPerVertex FALSE
coordIndex
[\
`;
    // face indices
    for (let f of this.faces) {
      for (v of f) {
        x3dstr+=`${v}, `;
      }
      x3dstr+='-1,';
    }
    x3dstr=x3dstr.slice(0, +-2 + 1 || undefined);
    x3dstr+=`\
          ]
      }
      appearance Appearance
      {
        material Material
        {
	       ambientIntensity 0.2
	       diffuseColor 0.9 0.9 0.9
	       specularColor .1 .1 .1
	       shininess .5
        }
      }
    }
  ]
}\
`;
    return x3dstr;
  }
}

//===================================================================================================
// Primitive Polyhedra Seeds
//===================================================================================================

const tetrahedron = function() {
  const poly = new polyhedron();
  poly.name = "T";
  poly.faces = [ [0,1,2], [0,2,3], [0,3,1], [1,3,2] ];
  poly.vertices  = [ [1.0,1.0,1.0], [1.0,-1.0,-1.0], [-1.0,1.0,-1.0], [-1.0,-1.0,1.0] ];
  return poly;
};

const octahedron = function() {
  const poly = new polyhedron();
  poly.name = "O";
  poly.faces = [ [0,1,2], [0,2,3], [0,3,4], [0,4,1], [1,4,5], [1,5,2], [2,5,3], [3,5,4] ];
  poly.vertices  = [ [0,0,1.4142135623730951], [1.4142135623730951,0,0], [0,1.4142135623730951,0], [-1.4142135623730951,0,0], [0,-1.4142135623730951,0], [0,0,-1.4142135623730951] ];
  return poly;
};

const cube = function() {
  const poly = new polyhedron();
  poly.name = "C";
  poly.faces = [ [3,0,1,2], [3,4,5,0], [0,5,6,1], [1,6,7,2], [2,7,4,3], [5,4,7,6] ];
  poly.vertices  = [ [0.7071067811865475,0.7071067811865475,0.7071067811865475], [-0.7071067811865475,0.7071067811865475,0.7071067811865475], [-0.7071067811865475,-0.7071067811865475,0.7071067811865475], [0.7071067811865475,-0.7071067811865475,0.7071067811865475],
                [0.7071067811865475,-0.7071067811865475,-0.7071067811865475], [0.7071067811865475,0.7071067811865475,-0.7071067811865475], [-0.7071067811865475,0.7071067811865475,-0.7071067811865475], [-0.7071067811865475,-0.7071067811865475,-0.7071067811865475] ];
  return poly;
};

const icosahedron = function() {
  const poly = new polyhedron();
  poly.name = "I";
  poly.faces = [ [0,1,2], [0,2,3], [0,3,4], [0,4,5],
    [0,5,1], [1,5,7], [1,7,6], [1,6,2],
    [2,6,8], [2,8,3], [3,8,9], [3,9,4],
    [4,9,10], [4,10,5], [5,10,7], [6,7,11],
    [6,11,8], [7,10,11], [8,11,9], [9,11,10] ];

  poly.vertices = [ [0,0,1.1755705045849463], [1.0514622242382672,0,0.5257311121191336],
    [0.32491969623290634,1.0,0.5257311121191336], [-0.85065080835204,0.6180339887498949,0.5257311121191336],
    [-0.85065080835204,-0.6180339887498949,0.5257311121191336], [0.32491969623290634,-1.0,0.5257311121191336],
    [0.85065080835204,0.6180339887498949,-0.5257311121191336], [0.85065080835204,-0.6180339887498949,-0.5257311121191336],
    [-0.32491969623290634,1.0,-0.5257311121191336], [-1.0514622242382672,0,-0.5257311121191336],
    [-0.32491969623290634,-1.0,-0.5257311121191336], [0,0,-1.1755705045849463] ];
  return poly;
};

const dodecahedron = function() {
   const poly = new polyhedron();
   poly.name = "D";
   poly.faces = [ [0,1,4,7,2], [0,2,6,9,3], [0,3,8,5,1],
      [1,5,11,10,4], [2,7,13,12,6], [3,9,15,14,8],
      [4,10,16,13,7], [5,8,14,17,11], [6,12,18,15,9],
      [10,11,17,19,16], [12,13,16,19,18], [14,15,18,19,17] ];
   poly.vertices = [ [0,0,1.0704662693192697], [0.7136441795461799,0,0.7978784486061616],
      [-0.35682208977308993,0.6180339887498949,0.7978784486061616], [-0.35682208977308993,-0.6180339887498949,0.7978784486061616],
      [0.7978784486061616,0.6180339887498949,0.35682208977308993], [0.7978784486061616,-0.6180339887498949,0.35682208977308993],
      [-0.9341723589627158,0.38196601125010515,0.35682208977308993], [0.1362939103565541,1.0,0.35682208977308993],
      [0.1362939103565541,-1.0,0.35682208977308993], [-0.9341723589627158,-0.38196601125010515,0.35682208977308993],
      [0.9341723589627158,0.38196601125010515,-0.35682208977308993], [0.9341723589627158,-0.38196601125010515,-0.35682208977308993],
      [-0.7978784486061616,0.6180339887498949,-0.35682208977308993], [-0.1362939103565541,1.0,-0.35682208977308993],
      [-0.1362939103565541,-1.0,-0.35682208977308993], [-0.7978784486061616,-0.6180339887498949,-0.35682208977308993],
      [0.35682208977308993,0.6180339887498949,-0.7978784486061616], [0.35682208977308993,-0.6180339887498949,-0.7978784486061616],
      [-0.7136441795461799,0,-0.7978784486061616], [0,0,-1.0704662693192697] ];
   return poly;
 };

const prism = function(n) {
  let i;
  const theta = (2*PI)/n; // pie angle
  const h = Math.sin(theta/2); // half-edge
  let poly = new polyhedron();
  poly.name = `P${n}`;

  for (i = 0; i < n; i++) { // vertex #'s 0 to n-1 around one face
    poly.vertices.push([-cos(i*theta), -sin(i*theta),  -h]);
  }
  for (i = 0; i < n; i++) { // vertex #'s n to 2n-1 around other
    poly.vertices.push([-cos(i*theta), -sin(i*theta), h]);
  }

  poly.faces.push(__range__(n-1, 0, true));  //top
  poly.faces.push(__range__(n, 2*n, false)); //bottom
  for (i = 0; i < n; i++) { //n square sides
    poly.faces.push([i, (i+1)%n, ((i+1)%n)+n, i+n]);
  }

  poly = adjustXYZ(poly,1);
  return poly;
};

const antiprism = function(n) {
  let i;
  const theta = (2*PI)/n; // pie angle
  let h = sqrt(1-(4/((4+(2*cos(theta/2)))-(2*cos(theta)))));
  let r = sqrt(1-(h*h));
  const f = sqrt((h*h) + pow(r*cos(theta/2),2));
  // correction so edge midpoints (not vertices) on unit sphere
  r = -r/f;
  h = -h/f;
  let poly = new polyhedron();
  poly.name = `A${n}`;

  for (i = 0; i < n; i++) { // vertex #'s 0...n-1 around one face
    poly.vertices.push([r * cos(i*theta), r * sin(i*theta), h]);
  }
  for (i = 0; i < n; i++) { // vertex #'s n...2n-1 around other
    poly.vertices.push([r * cos((i+0.5)*theta), r * sin((i+0.5)*theta), -h]);
  }

  poly.faces.push(__range__(n-1, 0, true));   //top
  poly.faces.push(__range__(n, (2*n)-1, true)); //bottom
  for (i = 0; i <= n-1; i++) { //2n triangular sides
    poly.faces.push([i, (i+1)%n, i+n]);
    poly.faces.push([i, i+n, ((((n+i)-1)%n)+n)]);
  }

  poly = adjustXYZ(poly,1);
  return poly;
};

const pyramid = function(n) {
  let i;
  const theta = (2*PI)/n; // pie angle
  const height = 1;
  let poly = new polyhedron();
  poly.name = `Y${n}`;

  for (i = 0; i < n; i++) { // vertex #'s 0...n-1 around one face
    poly.vertices.push([-cos(i*theta), -sin(i*theta), -0.2]);
  }
  poly.vertices.push([0,0, height]); // apex

  poly.faces.push(__range__(n-1, 0, true)); // base
  for (i = 0; i < n; i++) { // n triangular sides
    poly.faces.push([i, (i+1)%n, n]);
  }

  poly = canonicalXYZ(poly, 3);
  return poly;
};

const cupola = function(n, alpha, height) {
  let i;
  if (n===undefined) { n = 3; }
  if (alpha===undefined) { alpha = 0.0; }

  let poly = new polyhedron();
  poly.name = `U${n}`;

  if (n < 2) {
    return poly;
  }

  let s = 1.0;
  // alternative face/height scaling
  //let rb = s / 2 / sin(PI / 2 / n - alpha);
  let rb = s / 2 / sin(PI / 2 / n);
  let rt = s / 2 / sin(PI / n);
  if (height===undefined) {
    height = (rb - rt);
    // set correct height for regularity for n=3,4,5
    if (2 <= n && n <= 5) {
      height = s * sqrt(1 - 1 / 4 / sin(PI/n) / sin(PI/n));
    }
  }
  // init 3N vertices
  for (i = 0; i < 3*n; i++) {
    poly.vertices.push([0,0,0]);
  }
  // fill vertices
  for (i = 0; i < n; i++) {
    poly.vertices[2*i] = [rb * cos(PI*(2*i)/n + PI/2/n+alpha),
                          rb * sin(PI*(2*i)/n + PI/2/n+alpha),
                          0.0];
    poly.vertices[2*i+1] = [rb * cos(PI*(2*i+1)/n + PI/2/n-alpha),
                            rb * sin(PI*(2*i+1)/n + PI/2/n-alpha),
                            0.0];
    poly.vertices[2*n+i] = [rt * cos(2*PI*i/n),
                            rt * sin(2*PI*i/n),
                            height];
  }

  poly.faces.push(__range__(2*n-1, 0, true)); // base
  poly.faces.push(__range__(2*n, 3*n-1, true)); // top
  for (i = 0; i < n; i++) { // n triangular sides and n square sides
    poly.faces.push([(2*i+1)%(2*n), (2*i+2)%(2*n), 2*n+(i+1)%n]);
    poly.faces.push([2*i, (2*i+1)%(2*n), 2*n+(i+1)%n, 2*n+i]);
  }

  return poly;
}

const anticupola = function(n, alpha, height) {
  let i;
  if (n===undefined) { n = 3; }
  if (alpha===undefined) { alpha = 0.0; }

  let poly = new polyhedron();
  poly.name = `U${n}`;

  if (n < 3) {
    return poly;
  }

  let s = 1.0;
  // alternative face/height scaling
  //let rb = s / 2 / sin(PI / 2 / n - alpha);
  let rb = s / 2 / sin(PI / 2 / n);
  let rt = s / 2 / sin(PI / n);
  if (height===undefined) {
    height = (rb - rt);
  }
  // init 3N vertices
  for (i = 0; i < 3*n; i++) {
    poly.vertices.push([0,0,0]);
  }
  // fill vertices
  for (i = 0; i < n; i++) {
    poly.vertices[2*i] = [rb * cos(PI*(2*i)/n + alpha),
                          rb * sin(PI*(2*i)/n + alpha),
                          0.0];
    poly.vertices[2*i+1] = [rb * cos(PI*(2*i+1)/n - alpha),
                            rb * sin(PI*(2*i+1)/n - alpha),
                            0.0];
    poly.vertices[2*n+i] = [rt * cos(2*PI*i/n),
                            rt * sin(2*PI*i/n),
                            height];
  }

  poly.faces.push(__range__(2*n-1, 0, true)); // base
  poly.faces.push(__range__(2*n, 3*n-1, true)); // top
  for (i = 0; i < n; i++) { // n triangular sides and n square sides
    poly.faces.push([(2*i)%(2*n), (2*i+1)%(2*n), 2*n+(i)%n]);
    poly.faces.push([2*n+(i+1)%n, (2*i+1)%(2*n), (2*i+2)%(2*n)]);
    poly.faces.push([2*n+(i+1)%n, 2*n+(i)%n, (2*i+1)%(2*n)]);
  }

  return poly;
}
// Polyhédronisme
//===================================================================================================
//
// A toy for constructing and manipulating polyhedra and other meshes
//
// Copyright 2019, Anselm Levskaya
// Released under the MIT License
//

// Johnson Solids - geometry extracted from george hart's VRML models.

johnson_polyhedra =
{J1: function() {
   const poly = new polyhedron();
   poly.name = "J1";
   poly.faces = [[1, 4, 2],
                [0, 1, 2],
                [3, 0, 2],
                [4, 3, 2],
                [4, 1, 0, 3]];
   poly.vertices = [[-0.729665, 0.670121, 0.319155],
               [-0.655235, -0.29213, -0.754096],
               [-0.093922, -0.607123, 0.537818],
               [0.702196, 0.595691, 0.485187],
               [0.776626, -0.36656, -0.588064]];
   return poly;
 },
J2: function() {
   const poly = new polyhedron();
   poly.name = "J2";
   poly.faces = [[3, 0, 2],
                [5, 3, 2],
                [4, 5, 2],
                [1, 4, 2],
                [0, 1, 2],
                [0, 3, 5, 4, 1]];
   poly.vertices = [[-0.868849, -0.100041, 0.61257],
               [-0.329458, 0.976099, 0.28078],
               [-0.26629, -0.013796, -0.477654],
               [-0.13392, -1.034115, 0.229829],
               [0.738834, 0.707117, -0.307018],
               [0.859683, -0.535264, -0.338508]];
   return poly;
 },
J3: function() {
   const poly = new polyhedron();
   poly.name = "J3";
   poly.faces = [[2, 6, 4],
                [6, 5, 8],
                [4, 7, 3],
                [2, 0, 1],
                [6, 2, 1, 5],
                [4, 6, 8, 7],
                [2, 4, 3, 0],
                [0, 3, 7, 8, 5, 1]];
   poly.vertices = [[-0.909743, 0.523083, 0.242386],
               [-0.747863, 0.22787, -0.740794],
               [-0.678803, -0.467344, 0.028562],
               [-0.11453, 0.564337, 0.910169],
               [0.11641, -0.426091, 0.696344],
               [0.209231, -0.02609, -1.056192],
               [0.278291, -0.721304, -0.286836],
               [0.842564, 0.310377, 0.594771],
               [1.004444, 0.015163, -0.38841]];
   return poly;
 },
J4: function() {
   const poly = new polyhedron();
   poly.name = "J4";
   poly.faces = [[3, 1, 5],
                [7, 9, 11],
                [6, 10, 8],
                [2, 4, 0],
                [2, 3, 7, 6],
                [3, 2, 0, 1],
                [7, 3, 5, 9],
                [6, 7, 11, 10],
                [2, 6, 8, 4],
                [4, 8, 10, 11, 9, 5, 1, 0]];
   poly.vertices = [[-0.600135, 0.398265, -0.852158],
               [-0.585543, -0.441941, -0.840701],
               [-0.584691, 0.40999, -0.011971],
               [-0.570099, -0.430216, -0.000514],
               [-0.18266, 1.005432, -0.447988],
               [-0.147431, -1.023005, -0.420329],
               [0.0203, 0.428447, 0.571068],
               [0.034892, -0.411759, 0.582525],
               [0.422331, 1.023889, 0.135052],
               [0.457559, -1.004548, 0.162711],
               [0.860442, 0.442825, 0.555424],
               [0.875034, -0.397381, 0.566881]];
   return poly;
 },
J5: function() {
   const poly = new polyhedron();
   poly.name = "J5";
   poly.faces = [[4, 1, 5],
                [8, 9, 12],
                [10, 14, 13],
                [7, 11, 6],
                [3, 2, 0],
                [4, 3, 0, 1],
                [8, 4, 5, 9],
                [10, 8, 12, 14],
                [7, 10, 13, 11],
                [3, 7, 6, 2],
                [3, 4, 8, 10, 7],
                [2, 6, 11, 13, 14, 12, 9, 5, 1, 0]];
   poly.vertices = [[-0.973114, 0.120196, -0.57615],
               [-0.844191, -0.563656, -0.512814],
               [-0.711039, 0.75783, -0.46202],
               [-0.594483, 0.244733, -0.002202],
               [-0.46556, -0.439119, 0.061133],
               [-0.373515, -1.032518, -0.296206],
               [-0.15807, 1.105692, -0.21402],
               [-0.041514, 0.592595, 0.245798],
               [0.167087, -0.513901, 0.348277],
               [0.259132, -1.1073, -0.009062],
               [0.429162, 0.123733, 0.462406],
               [0.474577, 1.03091, 0.073124],
               [0.812101, -0.759438, 0.238938],
               [0.945253, 0.562048, 0.289732],
               [1.074175, -0.121804, 0.353067]];
   return poly;
 },
J6: function() {
   const poly = new polyhedron();
   poly.name = "J6";
   poly.faces = [[11, 16, 12],
                [16, 17, 19],
                [12, 15, 9],
                [15, 18, 14],
                [9, 5, 4],
                [5, 8, 3],
                [4, 1, 6],
                [1, 0, 2],
                [6, 10, 11],
                [10, 7, 13],
                [11, 12, 9, 4, 6],
                [11, 10, 13, 17, 16],
                [12, 16, 19, 18, 15],
                [9, 15, 14, 8, 5],
                [4, 5, 3, 0, 1],
                [6, 1, 2, 7, 10],
                [2, 0, 3, 8, 14, 18, 19, 17, 13, 7]];
   poly.vertices = [[-0.905691, -0.396105, -0.539844],
               [-0.883472, -0.258791, 0.103519],
               [-0.719735, -0.859265, -0.110695],
               [-0.703659, 0.13708, -0.868724],
               [-0.667708, 0.359259, 0.17226],
               [-0.556577, 0.60392, -0.428619],
               [-0.481752, -0.103901, 0.60141],
               [-0.21682, -1.075487, 0.254804],
               [-0.190808, 0.536633, -0.971712],
               [-0.154857, 0.758811, 0.069272],
               [-0.069738, -0.608646, 0.694909],
               [0.146026, 0.009404, 0.76365],
               [0.348059, 0.542589, 0.434771],
               [0.410958, -0.962182, 0.417045],
               [0.436971, 0.649937, -0.809472],
               [0.45919, 0.787251, -0.166109],
               [0.760072, 0.037844, 0.52827],
               [0.923809, -0.562629, 0.314056],
               [0.939886, 0.433715, -0.443973],
               [1.125842, -0.029444, -0.014823]];
   return poly;
 },
J7: function() {
   const poly = new polyhedron();
   poly.name = "J7";
   poly.faces = [[0, 2, 4],
                [5, 3, 1],
                [5, 1, 6],
                [5, 6, 3],
                [3, 2, 0, 1],
                [1, 0, 4, 6],
                [6, 4, 2, 3]];
   poly.vertices = [[-0.793941, -0.708614, 0.016702],
               [-0.451882, 0.284418, 0.56528],
               [-0.252303, -0.348111, -0.97361],
               [0.089756, 0.64492, -0.425033],
               [0.340161, -0.993103, -0.175472],
               [0.385988, 1.120562, 0.619029],
               [0.68222, -7.2e-05, 0.373105]];
   return poly;
 },
J8: function() {
   const poly = new polyhedron();
   poly.name = "J8";
   poly.faces = [[8, 7, 5],
                [8, 5, 4],
                [8, 4, 6],
                [8, 6, 7],
                [1, 3, 2, 0],
                [7, 3, 1, 5],
                [5, 1, 0, 4],
                [4, 0, 2, 6],
                [6, 2, 3, 7]];
   poly.vertices = [[-0.849167, -0.427323, 0.457421],
               [-0.849167, 0.619869, 0.087182],
               [-0.478929, -0.776386, -0.529881],
               [-0.478929, 0.270805, -0.900119],
               [0.198024, -0.30391, 0.806484],
               [0.198024, 0.743282, 0.436246],
               [0.568263, -0.652974, -0.180817],
               [0.568263, 0.394218, -0.551056],
               [1.12362, 0.13242, 0.37454]];
   return poly;
 },
J9: function() {
   const poly = new polyhedron();
   poly.name = "J9";
   poly.faces = [[6, 1, 5],
                [6, 5, 10],
                [6, 10, 9],
                [6, 9, 4],
                [6, 4, 1],
                [1, 0, 3, 5],
                [5, 3, 8, 10],
                [10, 8, 7, 9],
                [9, 7, 2, 4],
                [4, 2, 0, 1],
                [8, 3, 0, 2, 7]];
   poly.vertices = [[-0.980309, -0.33878, 0.175213],
               [-0.719686, 0.629425, 0.02221],
               [-0.520232, -0.599402, -0.690328],
               [-0.299303, -0.403757, 0.924054],
               [-0.25961, 0.368802, -0.84333],
               [-0.03868, 0.564448, 0.771051],
               [0.243026, 0.902834, -0.142672],
               [0.445117, -0.825453, -0.47642],
               [0.581659, -0.704537, 0.521323],
               [0.705739, 0.142752, -0.629422],
               [0.842281, 0.263667, 0.36832]];
   return poly;
 },
J10: function() {
   const poly = new polyhedron();
   poly.name = "J10";
   poly.faces = [[4, 7, 8],
                [8, 7, 6],
                [8, 6, 3],
                [3, 6, 1],
                [3, 1, 0],
                [0, 1, 2],
                [0, 2, 4],
                [4, 2, 7],
                [4, 8, 5],
                [8, 3, 5],
                [3, 0, 5],
                [0, 4, 5],
                [1, 6, 7, 2]];
   poly.vertices = [[-0.776892, 0.173498, 0.416855],
               [-0.68155, 0.270757, -0.747914],
               [-0.646922, -0.78715, -0.243069],
               [0.020463, 0.897066, -0.047806],
               [0.069435, -0.599041, 0.666153],
               [0.15263, 0.505992, 1.049841],
               [0.480709, 0.236129, -0.900199],
               [0.515337, -0.821778, -0.395353],
               [0.866791, 0.124527, 0.201492]];
   return poly;
 },
J11: function() {
   const poly = new polyhedron();
   poly.name = "J11";
   poly.faces = [[6, 2, 8],
                [8, 2, 4],
                [8, 4, 9],
                [9, 4, 3],
                [9, 3, 7],
                [7, 3, 1],
                [7, 1, 5],
                [5, 1, 0],
                [5, 0, 6],
                [6, 0, 2],
                [6, 8, 10],
                [8, 9, 10],
                [9, 7, 10],
                [7, 5, 10],
                [5, 6, 10],
                [1, 3, 4, 2, 0]];
   poly.vertices = [[-0.722759, -0.425905, 0.628394],
               [-0.669286, 0.622275, 0.513309],
               [-0.502035, -0.868253, -0.304556],
               [-0.415513, 0.827739, -0.490768],
               [-0.312146, -0.093458, -0.996236],
               [0.134982, 0.097675, 0.952322],
               [0.238349, -0.823522, 0.446854],
               [0.324871, 0.872469, 0.260642],
               [0.492123, -0.618058, -0.557222],
               [0.545596, 0.430122, -0.672308],
               [0.88582, -0.021082, 0.21957]];
   return poly;
 },
J12: function() {
   const poly = new polyhedron();
   poly.name = "J12";
   poly.faces = [[1, 3, 0],
                [3, 4, 0],
                [3, 1, 4],
                [0, 2, 1],
                [0, 4, 2],
                [2, 4, 1]];
   poly.vertices = [[-0.610389, 0.243975, 0.531213],
               [-0.187812, -0.48795, -0.664016],
               [-0.187812, 0.9759, -0.664016],
               [0.187812, -0.9759, 0.664016],
               [0.798201, 0.243975, 0.132803]];
   return poly;
 },
J13: function() {
   const poly = new polyhedron();
   poly.name = "J13";
   poly.faces = [[3, 2, 0],
                [2, 1, 0],
                [2, 5, 1],
                [0, 4, 3],
                [0, 1, 4],
                [4, 1, 5],
                [2, 3, 6],
                [3, 4, 6],
                [5, 2, 6],
                [4, 5, 6]];
   poly.vertices = [[-1.028778, 0.392027, -0.048786],
               [-0.640503, -0.646161, 0.621837],
               [-0.125162, -0.395663, -0.540059],
               [0.004683, 0.888447, -0.651988],
               [0.125161, 0.395663, 0.540059],
               [0.632925, -0.791376, 0.433102],
               [1.031672, 0.157063, -0.354165]];
   return poly;
 },
J14: function() {
   const poly = new polyhedron();
   poly.name = "J14";
   poly.faces = [[4, 7, 6],
                [5, 3, 1],
                [2, 4, 6],
                [3, 0, 1],
                [7, 2, 6],
                [0, 5, 1],
                [7, 4, 3, 5],
                [4, 2, 0, 3],
                [2, 7, 5, 0]];
   poly.vertices = [[-0.677756, 0.338878, 0.309352],
               [-0.446131, 1.338394, 0.0],
               [-0.338878, -0.677755, 0.309352],
               [-0.169439, 0.508317, -0.618703],
               [0.169439, -0.508317, -0.618703],
               [0.338878, 0.677756, 0.309352],
               [0.446131, -1.338394, 0.0],
               [0.677755, -0.338878, 0.309352]];
   return poly;
 },
J15: function() {
   const poly = new polyhedron();
   poly.name = "J15";
   poly.faces = [[8, 9, 7],
                [6, 5, 2],
                [3, 8, 7],
                [5, 0, 2],
                [4, 3, 7],
                [0, 1, 2],
                [9, 4, 7],
                [1, 6, 2],
                [9, 8, 5, 6],
                [8, 3, 0, 5],
                [3, 4, 1, 0],
                [4, 9, 6, 1]];
   poly.vertices = [[-0.669867, 0.334933, -0.529576],
               [-0.669867, 0.334933, 0.529577],
               [-0.4043, 1.212901, 0.0],
               [-0.334933, -0.669867, -0.529576],
               [-0.334933, -0.669867, 0.529577],
               [0.334933, 0.669867, -0.529576],
               [0.334933, 0.669867, 0.529577],
               [0.4043, -1.212901, 0.0],
               [0.669867, -0.334933, -0.529576],
               [0.669867, -0.334933, 0.529577]];
   return poly;
 },
J16: function() {
   const poly = new polyhedron();
   poly.name = "J16";
   poly.faces = [[11, 10, 8],
                [7, 9, 3],
                [6, 11, 8],
                [9, 5, 3],
                [2, 6, 8],
                [5, 0, 3],
                [4, 2, 8],
                [0, 1, 3],
                [10, 4, 8],
                [1, 7, 3],
                [10, 11, 9, 7],
                [11, 6, 5, 9],
                [6, 2, 0, 5],
                [2, 4, 1, 0],
                [4, 10, 7, 1]];
   poly.vertices = [[-0.931836, 0.219976, -0.264632],
               [-0.636706, 0.318353, 0.692816],
               [-0.613483, -0.735083, -0.264632],
               [-0.326545, 0.979634, 0.0],
               [-0.318353, -0.636706, 0.692816],
               [-0.159176, 0.477529, -0.856368],
               [0.159176, -0.477529, -0.856368],
               [0.318353, 0.636706, 0.692816],
               [0.326545, -0.979634, 0.0],
               [0.613482, 0.735082, -0.264632],
               [0.636706, -0.318353, 0.692816],
               [0.931835, -0.219977, -0.264632]];
   return poly;
 },
J17: function() {
   const poly = new polyhedron();
   poly.name = "J17";
   poly.faces = [[6, 8, 9],
                [9, 8, 7],
                [9, 7, 3],
                [3, 7, 1],
                [3, 1, 0],
                [0, 1, 2],
                [0, 2, 6],
                [6, 2, 8],
                [6, 9, 4],
                [9, 3, 4],
                [3, 0, 4],
                [0, 6, 4],
                [7, 8, 5],
                [1, 7, 5],
                [2, 1, 5],
                [8, 2, 5]];
   poly.vertices = [[-0.777261, 0.485581, 0.103065],
               [-0.675344, -0.565479, -0.273294],
               [-0.379795, -0.315718, 0.778861],
               [-0.221894, 0.282623, -0.849372],
               [-0.034619, 1.231562, -0.282624],
               [0.034619, -1.231562, 0.282624],
               [0.196076, 0.635838, 0.638599],
               [0.405612, -0.602744, -0.568088],
               [0.701162, -0.352983, 0.484067],
               [0.751443, 0.43288, -0.313837]];
   return poly;
 },
J18: function() {
   const poly = new polyhedron();
   poly.name = "J18";
   poly.faces = [[4, 9, 2],
                [9, 12, 11],
                [2, 6, 0],
                [4, 1, 8],
                [0, 3, 5, 1],
                [1, 5, 10, 8],
                [8, 10, 14, 12],
                [12, 14, 13, 11],
                [11, 13, 7, 6],
                [6, 7, 3, 0],
                [9, 4, 8, 12],
                [2, 9, 11, 6],
                [4, 2, 0, 1],
                [14, 10, 5, 3, 7, 13]];
   poly.vertices = [[-0.836652, 0.050764, 0.288421],
               [-0.686658, 0.016522, -0.560338],
               [-0.587106, -0.771319, 0.365687],
               [-0.571616, 0.871513, 0.302147],
               [-0.437112, -0.805561, -0.483073],
               [-0.421621, 0.837272, -0.546612],
               [-0.212729, -0.16003, 0.84551],
               [0.052308, 0.660719, 0.859236],
               [0.08726, -0.228514, -0.852008],
               [0.186811, -1.016355, 0.074016],
               [0.352296, 0.592236, -0.838282],
               [0.561189, -0.405066, 0.55384],
               [0.711183, -0.439308, -0.294919],
               [0.826226, 0.415684, 0.567566],
               [0.97622, 0.381442, -0.281193]];
   return poly;
 },
J19: function() {
   const poly = new polyhedron();
   poly.name = "J19";
   poly.faces = [[10, 15, 16],
                [7, 13, 8],
                [1, 2, 0],
                [5, 3, 12],
                [2, 6, 4, 0],
                [0, 4, 9, 3],
                [3, 9, 14, 12],
                [12, 14, 18, 15],
                [15, 18, 19, 16],
                [16, 19, 17, 13],
                [13, 17, 11, 8],
                [8, 11, 6, 2],
                [5, 10, 7, 1],
                [10, 5, 12, 15],
                [7, 10, 16, 13],
                [1, 7, 8, 2],
                [5, 1, 0, 3],
                [18, 14, 9, 4, 6, 11, 17, 19]];
   poly.vertices = [[-0.889715, 0.115789, -0.35951],
               [-0.792371, -0.231368, 0.270291],
               [-0.791598, 0.494102, 0.251959],
               [-0.522446, -0.406626, -0.70424],
               [-0.521352, 0.619343, -0.730164],
               [-0.425102, -0.753782, -0.074439],
               [-0.423235, 0.997655, -0.118694],
               [-0.286344, -0.218767, 0.790309],
               [-0.28557, 0.506702, 0.771978],
               [-0.154083, 0.096928, -1.074893],
               [0.080926, -0.741182, 0.44558],
               [0.082793, 1.010256, 0.401324],
               [0.095069, -0.767118, -0.580291],
               [0.331944, 0.146209, 0.895926],
               [0.463432, -0.263565, -0.950945],
               [0.601096, -0.754518, -0.060273],
               [0.699213, -0.376205, 0.551197],
               [0.700307, 0.649763, 0.525272],
               [0.969459, -0.250964, -0.430927],
               [1.067576, 0.127349, 0.180543]];
   return poly;
 },
J20: function() {
   const poly = new polyhedron();
   poly.name = "J20";
   poly.faces = [[15, 18, 21],
                [12, 20, 16],
                [6, 10, 2],
                [3, 0, 1],
                [9, 7, 13],
                [2, 8, 4, 0],
                [0, 4, 5, 1],
                [1, 5, 11, 7],
                [7, 11, 17, 13],
                [13, 17, 22, 18],
                [18, 22, 24, 21],
                [21, 24, 23, 20],
                [20, 23, 19, 16],
                [16, 19, 14, 10],
                [10, 14, 8, 2],
                [15, 9, 13, 18],
                [12, 15, 21, 20],
                [6, 12, 16, 10],
                [3, 6, 2, 0],
                [9, 3, 1, 7],
                [9, 15, 12, 6, 3],
                [22, 17, 11, 5, 4, 8, 14, 19, 23, 24]];
   poly.vertices = [[-0.93465, 0.300459, -0.271185],
               [-0.838689, -0.260219, -0.516017],
               [-0.711319, 0.717591, 0.128359],
               [-0.710334, -0.156922, 0.080946],
               [-0.599799, 0.556003, -0.725148],
               [-0.503838, -0.004675, -0.969981],
               [-0.487004, 0.26021, 0.48049],
               [-0.460089, -0.750282, -0.512622],
               [-0.376468, 0.973135, -0.325605],
               [-0.331735, -0.646985, 0.084342],
               [-0.254001, 0.831847, 0.530001],
               [-0.125239, -0.494738, -0.966586],
               [0.029622, 0.027949, 0.730817],
               [0.056536, -0.982543, -0.262295],
               [0.08085, 1.087391, 0.076037],
               [0.125583, -0.532729, 0.485984],
               [0.262625, 0.599586, 0.780328],
               [0.391387, -0.726999, -0.716259],
               [0.513854, -0.868287, 0.139347],
               [0.597475, 0.85513, 0.326364],
               [0.641224, 0.109523, 0.783723],
               [0.737185, -0.451155, 0.538891],
               [0.848705, -0.612742, -0.314616],
               [0.976075, 0.365067, 0.32976],
               [1.072036, -0.19561, 0.084927]];
   return poly;
 },
J21: function() {
   const poly = new polyhedron();
   poly.name = "J21";
   poly.faces = [[8, 19, 15],
                [19, 20, 25],
                [15, 21, 13],
                [21, 26, 23],
                [13, 10, 3],
                [10, 18, 11],
                [3, 0, 1],
                [0, 4, 2],
                [1, 5, 8],
                [5, 6, 14],
                [11, 16, 9, 4],
                [4, 9, 7, 2],
                [2, 7, 12, 6],
                [6, 12, 17, 14],
                [14, 17, 24, 20],
                [20, 24, 28, 25],
                [25, 28, 29, 26],
                [26, 29, 27, 23],
                [23, 27, 22, 18],
                [18, 22, 16, 11],
                [8, 15, 13, 3, 1],
                [8, 5, 14, 20, 19],
                [15, 19, 25, 26, 21],
                [13, 21, 23, 18, 10],
                [3, 10, 11, 4, 0],
                [1, 0, 2, 6, 5],
                [24, 17, 12, 7, 9, 16, 22, 27, 29, 28]];
   poly.vertices = [[-0.913903, 0.139054, -0.10769],
               [-0.801323, 0.048332, 0.456301],
               [-0.780136, -0.347362, -0.398372],
               [-0.694081, 0.568652, 0.218063],
               [-0.672895, 0.172957, -0.63661],
               [-0.597978, -0.494154, 0.514184],
               [-0.584884, -0.738707, -0.014032],
               [-0.468218, -0.603725, -0.817867],
               [-0.378156, -0.064556, 0.839937],
               [-0.360976, -0.083405, -1.056105],
               [-0.317215, 0.86806, -0.109531],
               [-0.304122, 0.623508, -0.637747],
               [-0.272966, -0.995069, -0.433527],
               [-0.204636, 0.777338, 0.45446],
               [-0.161718, -0.851595, 0.369604],
               [-0.009384, 0.385994, 0.8388],
               [0.007796, 0.367145, -1.057242],
               [0.1502, -1.107957, -0.049891],
               [0.185324, 0.832194, -0.40135],
               [0.193961, -0.156492, 0.896684],
               [0.327727, -0.642909, 0.606002],
               [0.367482, 0.685403, 0.511206],
               [0.497242, 0.575832, -0.820845],
               [0.60849, 0.719306, -0.017714],
               [0.639645, -0.899271, 0.186507],
               [0.6965, -0.192358, 0.604864],
               [0.803742, 0.327961, 0.366626],
               [0.920408, 0.462943, -0.437208],
               [1.008418, -0.44872, 0.185369],
               [1.11566, 0.071599, -0.052869]];
   return poly;
 },
J22: function() {
   const poly = new polyhedron();
   poly.name = "J22";
   poly.faces = [[0, 1, 2],
                [2, 1, 5],
                [2, 5, 8],
                [8, 5, 11],
                [8, 11, 13],
                [13, 11, 14],
                [3, 9, 7],
                [9, 8, 13],
                [7, 12, 6],
                [3, 0, 2],
                [13, 14, 12],
                [12, 14, 10],
                [12, 10, 6],
                [6, 10, 4],
                [6, 4, 0],
                [0, 4, 1],
                [9, 3, 2, 8],
                [7, 9, 13, 12],
                [3, 7, 6, 0],
                [11, 5, 1, 4, 10, 14]];
   poly.vertices = [[-0.846878, 0.066004, 0.311423],
               [-0.766106, 0.678635, -0.329908],
               [-0.708152, -0.186985, -0.531132],
               [-0.64897, -0.782761, 0.128183],
               [-0.452751, 0.845109, 0.48694],
               [-0.21247, 0.406919, -0.972407],
               [-0.165405, 0.101357, 0.883692],
               [0.032503, -0.747408, 0.700451],
               [0.112048, -0.404621, -0.801418],
               [0.17123, -1.000397, -0.142104],
               [0.41424, 0.739868, 0.66129],
               [0.654521, 0.301678, -0.798058],
               [0.654794, -0.116279, 0.613406],
               [0.793521, -0.369268, -0.229149],
               [0.967876, 0.468152, 0.018791]];
   return poly;
 },
J23: function() {
   const poly = new polyhedron();
   poly.name = "J23";
   poly.faces = [[1, 0, 2],
                [2, 0, 4],
                [2, 4, 8],
                [8, 4, 10],
                [8, 10, 14],
                [14, 10, 16],
                [14, 16, 18],
                [18, 16, 19],
                [13, 14, 18],
                [12, 17, 11],
                [6, 5, 1],
                [7, 2, 8],
                [18, 19, 17],
                [19, 15, 17],
                [17, 15, 11],
                [11, 15, 9],
                [11, 9, 5],
                [5, 9, 3],
                [5, 3, 1],
                [1, 3, 0],
                [7, 13, 12, 6],
                [13, 7, 8, 14],
                [12, 13, 18, 17],
                [6, 12, 11, 5],
                [7, 6, 1, 2],
                [10, 4, 0, 3, 9, 15, 19, 16]];
   poly.vertices = [[-0.96917, 0.321358, -0.364138],
               [-0.902194, 0.146986, 0.353054],
               [-0.885918, -0.386527, -0.161101],
               [-0.700663, 0.819184, 0.114745],
               [-0.670588, -0.166619, -0.835289],
               [-0.389781, 0.533335, 0.723761],
               [-0.377102, -0.207546, 0.737557],
               [-0.360826, -0.741059, 0.223402],
               [-0.350486, -0.754679, -0.51752],
               [-0.022354, 1.035239, 0.320838],
               [0.020179, -0.358897, -1.022714],
               [0.351157, 0.546203, 0.733864],
               [0.363836, -0.194678, 0.74766],
               [0.380112, -0.728191, 0.233505],
               [0.390452, -0.741811, -0.507416],
               [0.668412, 0.842961, 0.133414],
               [0.698487, -0.142842, -0.816621],
               [0.886588, 0.178052, 0.377446],
               [0.902865, -0.355461, -0.136709],
               [0.966994, 0.354984, -0.337737]];
   return poly;
 },
J24: function() {
   const poly = new polyhedron();
   poly.name = "J24";
   poly.faces = [[1, 3, 5],
                [5, 3, 8],
                [5, 8, 12],
                [12, 8, 14],
                [12, 14, 18],
                [18, 14, 20],
                [18, 20, 22],
                [22, 20, 24],
                [22, 24, 23],
                [23, 24, 21],
                [15, 18, 22],
                [17, 23, 19],
                [11, 13, 7],
                [6, 2, 1],
                [9, 5, 12],
                [23, 21, 19],
                [19, 21, 16],
                [19, 16, 13],
                [13, 16, 10],
                [13, 10, 7],
                [7, 10, 4],
                [7, 4, 2],
                [2, 4, 0],
                [2, 0, 1],
                [1, 0, 3],
                [15, 9, 12, 18],
                [17, 15, 22, 23],
                [11, 17, 19, 13],
                [6, 11, 7, 2],
                [9, 6, 1, 5],
                [9, 15, 17, 11, 6],
                [20, 14, 8, 3, 0, 4, 10, 16, 21, 24]];
   poly.vertices = [[-1.007937, 0.263193, -0.317378],
               [-0.995648, -0.249677, 0.04509],
               [-0.928425, 0.319026, 0.303212],
               [-0.878881, -0.297121, -0.570283],
               [-0.751014, 0.784617, -0.079308],
               [-0.682946, -0.746755, -0.177844],
               [-0.534412, -0.144902, 0.458433],
               [-0.506952, 0.74213, 0.497926],
               [-0.413141, -0.682306, -0.741423],
               [-0.221709, -0.64198, 0.235499],
               [-0.206248, 1.067984, 0.052991],
               [-0.112939, 0.278202, 0.653148],
               [-0.109759, -0.982341, -0.280438],
               [0.107781, 0.858022, 0.55486],
               [0.211385, -0.745233, -0.765428],
               [0.393024, -0.526088, 0.292433],
               [0.418278, 1.005057, 0.028986],
               [0.460247, 0.042616, 0.550554],
               [0.504974, -0.866449, -0.223504],
               [0.680968, 0.622436, 0.452266],
               [0.756151, -0.461866, -0.633128],
               [0.884017, 0.619872, -0.142153],
               [0.926446, -0.443346, -0.028789],
               [0.99367, 0.125358, 0.229332],
               [1.013073, 0.059558, -0.395059]];
   return poly;
 },
J25: function() {
   const poly = new polyhedron();
   poly.name = "J25";
   poly.faces = [[2, 9, 11],
                [11, 9, 16],
                [11, 16, 19],
                [19, 16, 23],
                [19, 23, 25],
                [25, 23, 28],
                [25, 28, 27],
                [27, 28, 29],
                [27, 29, 26],
                [26, 29, 24],
                [15, 22, 18],
                [22, 25, 27],
                [18, 21, 13],
                [21, 26, 20],
                [13, 7, 6],
                [7, 12, 3],
                [6, 1, 8],
                [1, 0, 2],
                [8, 14, 15],
                [14, 11, 19],
                [26, 24, 20],
                [20, 24, 17],
                [20, 17, 12],
                [12, 17, 10],
                [12, 10, 3],
                [3, 10, 5],
                [3, 5, 0],
                [0, 5, 4],
                [0, 4, 2],
                [2, 4, 9],
                [15, 18, 13, 6, 8],
                [15, 14, 19, 25, 22],
                [18, 22, 27, 26, 21],
                [13, 21, 20, 12, 7],
                [6, 7, 3, 0, 1],
                [8, 1, 2, 11, 14],
                [28, 23, 16, 9, 4, 5, 10, 17, 24, 29]];
   poly.vertices = [[-0.897802, -0.193467, -0.273331],
               [-0.877838, -0.070089, 0.304735],
               [-0.73072, -0.609618, 0.112262],
               [-0.716275, 0.285603, -0.568831],
               [-0.703732, -0.716856, -0.46873],
               [-0.696138, -0.246211, -0.826802],
               [-0.683973, 0.485232, 0.366499],
               [-0.584121, 0.705062, -0.173395],
               [-0.51689, 0.069081, 0.752092],
               [-0.378328, -1.037777, -0.09336],
               [-0.358446, 0.194389, -1.030805],
               [-0.278847, -0.803894, 0.440665],
               [-0.255475, 0.644603, -0.661367],
               [-0.223173, 0.844232, 0.273963],
               [-0.146694, -0.384435, 0.836102],
               [0.047172, 0.170886, 0.897866],
               [0.15578, -1.086392, 0.15593],
               [0.180355, 0.436649, -1.002815],
               [0.228699, 0.649956, 0.602366],
               [0.285215, -0.70209, 0.586439],
               [0.308587, 0.746408, -0.515593],
               [0.328551, 0.869786, 0.062473],
               [0.598896, 0.196439, 0.686376],
               [0.694582, -0.844133, 0.183918],
               [0.714463, 0.388033, -0.753526],
               [0.746014, -0.343089, 0.493903],
               [0.760459, 0.552132, -0.18719],
               [0.927542, 0.135981, 0.198403],
               [1.032273, -0.403533, -0.020084],
               [1.039867, 0.067112, -0.378156]];
   return poly;
 },
J26: function() {
  const poly = new polyhedron();
  poly.name = "J26";
  poly.faces = [[1, 0, 4],
               [3, 2, 5],
               [3, 0, 6],
               [1, 2, 7],
               [3, 5, 4, 0],
               [1, 4, 5, 2],
               [1, 7, 6, 0],
               [3, 6, 7, 2]];
  poly.vertices = [[-0.57735, 0.57735, 0.0],
              [0.57735, 0.57735, 0.0],
              [0.57735, -0.57735, 0.0],
              [-0.57735, -0.57735, 0.0],
              [0.0, 0.57735, 1.0],
              [0.0, -0.57735, 1.0],
              [-0.57735, 0.0, -1.0],
              [0.57735, 0.0, -1.0]];
  return poly;
 },
J27: function() {
   const poly = new polyhedron();
   poly.name = "J27";
   poly.faces = [[2, 5, 8],
                [5, 4, 10],
                [8, 11, 7],
                [2, 1, 0],
                [6, 3, 9],
                [3, 0, 1],
                [9, 7, 11],
                [6, 10, 4],
                [5, 2, 0, 4],
                [8, 5, 10, 11],
                [2, 8, 7, 1],
                [3, 6, 4, 0],
                [9, 3, 1, 7],
                [6, 9, 11, 10]];
   poly.vertices = [[-0.96936, 0.238651, 0.058198],
               [-0.683128, -0.715413, 0.146701],
               [-0.623092, -0.255511, -0.739236],
               [-0.478567, -0.06233, 0.875836],
               [-0.286232, 0.954064, -0.088503],
               [0.060036, 0.459902, -0.885938],
               [0.204561, 0.653083, 0.729135],
               [0.286232, -0.954064, 0.088503],
               [0.346268, -0.494162, -0.797435],
               [0.490793, -0.300981, 0.817638],
               [0.683128, 0.715413, -0.146701],
               [0.96936, -0.238651, -0.058198]];
   return poly;
 },
J28: function() {
   const poly = new polyhedron();
   poly.name = "J28";
   poly.faces = [[3, 0, 2],
                [9, 8, 14],
                [11, 15, 13],
                [5, 7, 1],
                [6, 1, 7],
                [12, 13, 15],
                [10, 14, 8],
                [4, 2, 0],
                [5, 3, 9, 11],
                [3, 5, 1, 0],
                [9, 3, 2, 8],
                [11, 9, 14, 15],
                [5, 11, 13, 7],
                [4, 6, 12, 10],
                [6, 4, 0, 1],
                [12, 6, 7, 13],
                [10, 12, 15, 14],
                [4, 10, 8, 2]];
   poly.vertices = [[-1.055402, 0.383836, -0.00011],
               [-1.017695, -0.474869, 0.000238],
               [-0.474869, 1.017695, -0.000394],
               [-0.448233, 0.410252, -0.607929],
               [-0.448179, 0.410746, 0.607634],
               [-0.410526, -0.448453, -0.607581],
               [-0.410472, -0.447959, 0.607981],
               [-0.383836, -1.055402, 0.000446],
               [0.383836, 1.055402, -0.000447],
               [0.410472, 0.447959, -0.607982],
               [0.410526, 0.448453, 0.60758],
               [0.448179, -0.410746, -0.607635],
               [0.448233, -0.410252, 0.607928],
               [0.474869, -1.017695, 0.000392],
               [1.017695, 0.474869, -0.000239],
               [1.055402, -0.383836, 0.000109]];
   return poly;
 },
J29: function() {
   const poly = new polyhedron();
   poly.name = "J29";
   poly.faces = [[4, 0, 1],
                [10, 6, 13],
                [12, 15, 14],
                [7, 8, 2],
                [3, 0, 2],
                [9, 8, 14],
                [11, 15, 13],
                [5, 6, 1],
                [7, 4, 10, 12],
                [4, 7, 2, 0],
                [10, 4, 1, 6],
                [12, 10, 13, 15],
                [7, 12, 14, 8],
                [5, 3, 9, 11],
                [3, 5, 1, 0],
                [9, 3, 2, 8],
                [11, 9, 14, 15],
                [5, 11, 13, 6]];
   poly.vertices = [[-1.105, -0.077473, -0.184867],
               [-0.863019, 0.717824, 0.033637],
               [-0.699688, -0.827387, -0.295079],
               [-0.617244, -0.39909, 0.445571],
               [-0.487757, 0.321617, -0.630438],
               [-0.375262, 0.396206, 0.664075],
               [-0.115492, 1.092629, 0.232437],
               [-0.082444, -0.428297, -0.740649],
               [0.115493, -1.092629, -0.232437],
               [0.197937, -0.664332, 0.508212],
               [0.25977, 0.696423, -0.431638],
               [0.439918, 0.130964, 0.726716],
               [0.665082, -0.053491, -0.541849],
               [0.699688, 0.827387, 0.295079],
               [0.863019, -0.717824, -0.033637],
               [1.105, 0.077473, 0.184867]];
   return poly;
 },
J30: function() {
   const poly = new polyhedron();
   poly.name = "J30";
   poly.faces = [[4, 0, 1],
                [10, 5, 11],
                [16, 17, 19],
                [13, 18, 14],
                [7, 8, 2],
                [6, 2, 8],
                [12, 14, 18],
                [15, 19, 17],
                [9, 11, 5],
                [3, 1, 0],
                [4, 7, 2, 0],
                [10, 4, 1, 5],
                [16, 10, 11, 17],
                [13, 16, 19, 18],
                [7, 13, 14, 8],
                [6, 3, 0, 2],
                [12, 6, 8, 14],
                [15, 12, 18, 19],
                [9, 15, 17, 11],
                [3, 9, 5, 1],
                [7, 4, 10, 16, 13],
                [3, 6, 12, 15, 9]];
   poly.vertices = [[-1.197125, -0.118752, -0.001762],
               [-1.038244, 0.607337, -0.020132],
               [-0.898745, -0.799482, 0.017282],
               [-0.619431, 0.145275, 0.38469],
               [-0.61625, 0.124807, -0.396793],
               [-0.482789, 1.101444, -0.030813],
               [-0.321051, -0.535454, 0.403734],
               [-0.317871, -0.555923, -0.37775],
               [-0.257075, -1.174837, 0.029724],
               [-0.063976, 0.639383, 0.37401],
               [-0.060795, 0.618915, -0.407474],
               [0.257076, 1.174837, -0.029725],
               [0.418813, -0.462061, 0.404823],
               [0.421993, -0.48253, -0.376661],
               [0.482789, -1.101444, 0.030813],
               [0.577694, 0.264028, 0.386452],
               [0.580875, 0.24356, -0.395032],
               [0.898745, 0.799482, -0.017282],
               [1.038244, -0.607337, 0.020132],
               [1.197125, 0.118752, 0.001761]];
   return poly;
 },
J31: function() {
   const poly = new polyhedron();
   poly.name = "J31";
   poly.faces = [[4, 0, 1],
                [8, 3, 10],
                [14, 17, 19],
                [13, 18, 16],
                [7, 9, 2],
                [5, 0, 2],
                [11, 9, 16],
                [15, 18, 19],
                [12, 17, 10],
                [6, 3, 1],
                [4, 7, 2, 0],
                [8, 4, 1, 3],
                [14, 8, 10, 17],
                [13, 14, 19, 18],
                [7, 13, 16, 9],
                [5, 6, 1, 0],
                [11, 5, 2, 9],
                [15, 11, 16, 18],
                [12, 15, 19, 17],
                [6, 12, 10, 3],
                [7, 4, 8, 14, 13],
                [6, 5, 11, 15, 12]];
   poly.vertices = [[-1.14213, -0.353364, -0.133745],
               [-1.138435, 0.385484, -0.050817],
               [-0.70957, -0.957238, -0.165587],
               [-0.699897, 0.97709, 0.051522],
               [-0.598391, 0.052172, -0.43817],
               [-0.543739, -0.405536, 0.304426],
               [-0.540044, 0.333311, 0.387353],
               [-0.165831, -0.551702, -0.470012],
               [-0.159853, 0.643778, -0.335832],
               [-0.005978, -1.19548, -0.13418],
               [0.005978, 1.195481, 0.134181],
               [0.159852, -0.643778, 0.335832],
               [0.165831, 0.551702, 0.470012],
               [0.540044, -0.333311, -0.387353],
               [0.543739, 0.405536, -0.304425],
               [0.598391, -0.052172, 0.43817],
               [0.699896, -0.97709, -0.051521],
               [0.70957, 0.957238, 0.165587],
               [1.138435, -0.385484, 0.050817],
               [1.142129, 0.353364, 0.133745]];
   return poly;
 },
J32: function() {
   const poly = new polyhedron();
   poly.name = "J32";
   poly.faces = [[3, 0, 2],
                [9, 7, 16],
                [15, 21, 23],
                [12, 19, 14],
                [5, 6, 1],
                [18, 24, 22],
                [24, 19, 23],
                [22, 20, 17],
                [20, 21, 16],
                [17, 8, 10],
                [8, 7, 2],
                [10, 4, 11],
                [4, 0, 1],
                [11, 13, 18],
                [13, 6, 14],
                [3, 5, 1, 0],
                [9, 3, 2, 7],
                [15, 9, 16, 21],
                [12, 15, 23, 19],
                [5, 12, 14, 6],
                [5, 3, 9, 15, 12],
                [18, 22, 17, 10, 11],
                [18, 13, 14, 19, 24],
                [22, 24, 23, 21, 20],
                [17, 20, 16, 7, 8],
                [10, 8, 2, 0, 4],
                [11, 4, 1, 6, 13]];
   poly.vertices = [[-1.086754, 0.270723, -0.02221],
               [-0.951485, 0.016307, 0.590957],
               [-0.844123, 0.345447, -0.65034],
               [-0.727726, -0.227595, -0.308179],
               [-0.678317, 0.606577, 0.401324],
               [-0.592457, -0.482012, 0.304989],
               [-0.489983, -0.320625, 0.954953],
               [-0.316268, 0.211936, -1.053507],
               [-0.285732, 0.727482, -0.61501],
               [-0.199871, -0.361106, -0.711346],
               [-0.183258, 0.888869, 0.034954],
               [-0.047989, 0.634452, 0.648121],
               [0.019, -0.772761, 0.28078],
               [0.068408, 0.06141, 0.990283],
               [0.121473, -0.611374, 0.930744],
               [0.261631, -0.698037, -0.34735],
               [0.295188, -0.078813, -1.077716],
               [0.344597, 0.755358, -0.368213],
               [0.563468, 0.343703, 0.623912],
               [0.649328, -0.744886, 0.527576],
               [0.703625, 0.25704, -0.654181],
               [0.75669, -0.415745, -0.71372],
               [0.806099, 0.418427, -0.004217],
               [0.891959, -0.670162, -0.100552],
               [0.922496, -0.154616, 0.337944]];
   return poly;
 },
J33: function() {
   const poly = new polyhedron();
   poly.name = "J33";
   poly.faces = [[5, 6, 11],
                [9, 15, 19],
                [8, 17, 13],
                [3, 7, 4],
                [0, 1, 2],
                [20, 21, 24],
                [21, 13, 17],
                [24, 23, 22],
                [23, 19, 15],
                [22, 14, 18],
                [14, 11, 6],
                [18, 10, 16],
                [10, 2, 1],
                [16, 12, 20],
                [12, 4, 7],
                [5, 0, 2, 6],
                [9, 5, 11, 15],
                [8, 9, 19, 17],
                [3, 8, 13, 7],
                [0, 3, 4, 1],
                [0, 5, 9, 8, 3],
                [20, 24, 22, 18, 16],
                [20, 12, 7, 13, 21],
                [24, 21, 17, 19, 23],
                [22, 23, 15, 11, 14],
                [18, 14, 6, 2, 10],
                [16, 10, 1, 4, 12]];
   poly.vertices = [[-0.799512, 0.192706, 0.001565],
               [-0.776446, 0.593934, 0.546986],
               [-0.713384, 0.860598, -0.072621],
               [-0.640335, -0.34095, 0.387405],
               [-0.617268, 0.060277, 0.932827],
               [-0.538299, 0.090521, -0.615141],
               [-0.452171, 0.758412, -0.689327],
               [-0.296652, -0.536533, 0.937522],
               [-0.280744, -0.772953, 0.009162],
               [-0.217683, -0.506289, -0.610445],
               [-0.200278, 0.902051, 0.367837],
               [-0.09258, 0.326409, -1.06757],
               [0.057277, 0.038576, 0.99214],
               [0.062939, -0.968537, 0.559279],
               [0.222374, 0.736712, -0.630014],
               [0.228036, -0.270402, -1.062874],
               [0.314991, 0.558821, 0.642957],
               [0.324152, -1.070722, -0.057426],
               [0.378052, 0.825485, 0.023349],
               [0.387214, -0.804058, -0.677033],
               [0.635607, -0.037989, 0.647653],
               [0.639107, -0.66042, 0.38013],
               [0.737643, 0.393482, -0.354893],
               [0.741142, -0.228948, -0.622416],
               [0.89682, -0.140175, 0.030947]];
   return poly;
 },
J34: function() {
   const poly = new polyhedron();
   poly.name = "J34";
   poly.faces = [[15, 7, 14],
                [7, 3, 1],
                [14, 12, 21],
                [12, 5, 11],
                [21, 25, 27],
                [25, 20, 26],
                [27, 29, 23],
                [29, 28, 24],
                [23, 17, 15],
                [17, 18, 8],
                [4, 10, 13],
                [10, 8, 18],
                [13, 22, 16],
                [22, 24, 28],
                [16, 19, 9],
                [19, 26, 20],
                [9, 6, 2],
                [6, 11, 5],
                [2, 0, 4],
                [0, 1, 3],
                [15, 14, 21, 27, 23],
                [15, 17, 8, 3, 7],
                [14, 7, 1, 5, 12],
                [21, 12, 11, 20, 25],
                [27, 25, 26, 28, 29],
                [23, 29, 24, 18, 17],
                [4, 13, 16, 9, 2],
                [4, 0, 3, 8, 10],
                [13, 10, 18, 24, 22],
                [16, 22, 28, 26, 19],
                [9, 19, 20, 11, 6],
                [2, 6, 5, 1, 0]];
   poly.vertices = [[-0.976027, 0.021192, 0.216616],
               [-0.8986, -0.336852, -0.281155],
               [-0.800821, 0.595002, 0.068255],
               [-0.778424, -0.560713, 0.282236],
               [-0.680644, 0.371141, 0.631647],
               [-0.675542, 0.015675, -0.737155],
               [-0.615111, 0.591592, -0.521207],
               [-0.523949, -0.823998, -0.215648],
               [-0.360916, -0.5704, 0.737823],
               [-0.319728, 0.941541, -0.106177],
               [-0.300485, 0.005517, 0.953771],
               [-0.19445, 0.362214, -0.911587],
               [-0.163033, -0.253598, -0.953472],
               [-0.125279, 0.579327, 0.80541],
               [-0.069344, -0.772544, -0.631163],
               [0.050833, -0.996405, -0.067772],
               [0.097779, 0.931854, 0.34941],
               [0.151593, -0.839673, 0.521506],
               [0.194449, -0.362214, 0.911587],
               [0.283489, 0.928444, -0.240052],
               [0.360916, 0.5704, -0.737823],
               [0.411749, -0.426005, -0.805595],
               [0.477939, 0.56623, 0.671534],
               [0.606198, -0.788219, 0.105992],
               [0.675542, -0.015675, 0.737155],
               [0.735567, 0.083254, -0.672317],
               [0.778423, 0.560713, -0.282236],
               [0.829257, -0.435692, -0.350008],
               [0.8986, 0.336852, 0.281155],
               [0.930017, -0.27896, 0.23927]];
   return poly;
 },
J35: function() {
   const poly = new polyhedron();
   poly.name = "J35";
   poly.faces = [[9, 16, 12],
                [16, 13, 17],
                [12, 15, 7],
                [9, 3, 6],
                [8, 1, 5],
                [1, 2, 0],
                [5, 4, 11],
                [8, 14, 10],
                [16, 9, 6, 13],
                [12, 16, 17, 15],
                [9, 12, 7, 3],
                [1, 8, 10, 2],
                [5, 1, 0, 4],
                [8, 5, 11, 14],
                [7, 4, 0, 3],
                [3, 0, 2, 6],
                [6, 2, 10, 13],
                [13, 10, 14, 17],
                [17, 14, 11, 15],
                [15, 11, 4, 7]];
   poly.vertices = [[-0.903332, -0.063468, 0.034076],
               [-0.833437, 0.28305, 0.763458],
               [-0.589483, 0.680853, 0.100738],
               [-0.561749, -0.142046, -0.696749],
               [-0.484641, -0.705032, 0.29875],
               [-0.414746, -0.358514, 1.028133],
               [-0.2479, 0.602275, -0.630087],
               [-0.143058, -0.78361, -0.432074],
               [-0.100897, 0.385807, 1.094795],
               [0.065949, 0.076155, -1.160799],
               [0.143058, 0.78361, 0.432075],
               [0.2479, -0.602274, 0.630087],
               [0.484641, -0.565409, -0.896124],
               [0.484641, 0.705032, -0.29875],
               [0.561749, 0.142046, 0.696749],
               [0.589483, -0.680852, -0.100737],
               [0.79849, 0.178912, -0.829462],
               [0.903332, 0.063468, -0.034075]];
   return poly;
 },
J36: function() {
   const poly = new polyhedron();
   poly.name = "J36";
   poly.faces = [[3, 11, 9],
                [11, 10, 16],
                [9, 13, 5],
                [3, 0, 2],
                [14, 8, 6],
                [8, 12, 4],
                [6, 1, 7],
                [14, 15, 17],
                [11, 3, 2, 10],
                [9, 11, 16, 13],
                [3, 9, 5, 0],
                [8, 14, 17, 12],
                [6, 8, 4, 1],
                [14, 6, 7, 15],
                [5, 7, 1, 0],
                [0, 1, 4, 2],
                [2, 4, 12, 10],
                [10, 12, 17, 16],
                [16, 17, 15, 13],
                [13, 15, 7, 5]];
   poly.vertices = [[-0.82124, -0.196132, -0.329082],
               [-0.725355, -0.267867, 0.472553],
               [-0.627806, 0.589563, -0.281911],
               [-0.577286, 0.20167, -0.991803],
               [-0.531921, 0.517828, 0.519724],
               [-0.241376, -0.749828, -0.447988],
               [-0.196012, -0.43367, 1.063538],
               [-0.145492, -0.821562, 0.353647],
               [-0.002578, 0.352025, 1.11071],
               [0.002578, -0.352025, -1.110709],
               [0.145492, 0.821563, -0.353646],
               [0.196012, 0.43367, -1.063538],
               [0.241376, 0.749828, 0.447989],
               [0.531921, -0.517828, -0.519723],
               [0.577285, -0.20167, 0.991804],
               [0.627806, -0.589563, 0.281912],
               [0.725355, 0.267867, -0.472551],
               [0.82124, 0.196133, 0.329083]];
   return poly;
 },
 J37: function() {
  const poly = new polyhedron();
  poly.name = "J37";
  poly.faces = [[2, 3, 0],
               [4, 5, 1],
               [10, 7, 6],
               [11, 9, 8],
               [15, 13, 12],
               [19, 17, 14],
               [18, 21, 16],
               [22, 23, 20],
               [3, 4, 1, 0],
               [6, 7, 3, 2],
               [7, 8, 4, 3],
               [8, 9, 5, 4],
               [10, 11, 8, 7],
               [14, 17, 15, 12],
               [15, 18, 16, 13],
               [17, 20, 18, 15],
               [19, 22, 20, 17],
               [20, 23, 21, 18],
               [22, 19, 2, 0],
               [19, 14, 6, 2],
               [14, 12, 10, 6],
               [12, 13, 11, 10],
               [11, 13, 16, 9],
               [9, 16, 21, 5],
               [5, 21, 23, 1],
               [1, 23, 22, 0]];
  poly.vertices = [[-0.862856, 0.357407, -0.357407],
              [-0.862856, -0.357407, -0.357407],
              [-0.357407, 0.862856, -0.357407],
              [-0.357407, 0.357407, -0.862856],
              [-0.357407, -0.357407, -0.862856],
              [-0.357407, -0.862856, -0.357407],
              [0.357407, 0.862856, -0.357407],
              [0.357407, 0.357407, -0.862856],
              [0.357407, -0.357407, -0.862856],
              [0.357407, -0.862856, -0.357407],
              [0.862856, 0.357407, -0.357407],
              [0.862856, -0.357407, -0.357407],
              [0.862856, 0.357407, 0.357407],
              [0.862856, -0.357407, 0.357407],
              [0.357407, 0.862856, 0.357407],
              [0.505449, 0.0, 0.862856],
              [0.357407, -0.862856, 0.357407],
              [-0.0, 0.505449, 0.862856],
              [-0.0, -0.505449, 0.862856],
              [-0.357407, 0.862856, 0.357407],
              [-0.505449, 0.0, 0.862856],
              [-0.357407, -0.862856, 0.357407],
              [-0.862856, 0.357407, 0.357407],
              [-0.862856, -0.357407, 0.357407]];
  return poly;
},
J38: function() {
   const poly = new polyhedron();
   poly.name = "J38";
   poly.faces = [[17, 10, 19],
                [24, 26, 29],
                [23, 28, 22],
                [15, 14, 7],
                [12, 2, 5],
                [4, 1, 0],
                [8, 3, 11],
                [16, 20, 25],
                [18, 27, 21],
                [9, 13, 6],
                [17, 12, 5, 10],
                [24, 17, 19, 26],
                [23, 24, 29, 28],
                [15, 23, 22, 14],
                [12, 15, 7, 2],
                [4, 9, 6, 1],
                [8, 4, 0, 3],
                [16, 8, 11, 20],
                [18, 16, 25, 27],
                [9, 18, 21, 13],
                [22, 20, 11, 14],
                [14, 11, 3, 7],
                [7, 3, 0, 2],
                [2, 0, 1, 5],
                [5, 1, 6, 10],
                [10, 6, 13, 19],
                [19, 13, 21, 26],
                [26, 21, 27, 29],
                [29, 27, 25, 28],
                [28, 25, 20, 22],
                [12, 17, 24, 23, 15],
                [9, 4, 8, 16, 18]];
   poly.vertices = [[-1.047541, -0.14473, -0.164687],
               [-0.97266, 0.443085, 0.054945],
               [-0.794156, 0.029302, -0.716846],
               [-0.77069, -0.7105, -0.215961],
               [-0.748241, -0.047945, 0.383423],
               [-0.719275, 0.617116, -0.497215],
               [-0.574648, 0.82842, 0.359043],
               [-0.517304, -0.536469, -0.76812],
               [-0.471389, -0.613715, 0.332149],
               [-0.350229, 0.33739, 0.687521],
               [-0.321263, 1.002451, -0.193117],
               [-0.247853, -1.03812, -0.079291],
               [-0.228431, 0.309073, -0.749313],
               [-0.005532, 0.864089, 0.631452],
               [0.005532, -0.864089, -0.631452],
               [0.048421, -0.256696, -0.800587],
               [0.097726, -0.578045, 0.604557],
               [0.169581, 0.694408, -0.445215],
               [0.172608, 0.009769, 0.824189],
               [0.247853, 1.03812, 0.079291],
               [0.321263, -1.002451, 0.193117],
               [0.517305, 0.536469, 0.76812],
               [0.574648, -0.82842, -0.359043],
               [0.617537, -0.221027, -0.528178],
               [0.692418, 0.366788, -0.308546],
               [0.719275, -0.617116, 0.497214],
               [0.77069, 0.7105, 0.215961],
               [0.794156, -0.029301, 0.716846],
               [0.97266, -0.443085, -0.054945],
               [1.047542, 0.14473, 0.164687]];
   return poly;
 },
J39: function() {
   const poly = new polyhedron();
   poly.name = "J39";
   poly.faces = [[11, 4, 13],
                [19, 21, 26],
                [20, 28, 24],
                [12, 15, 7],
                [6, 2, 0],
                [9, 5, 1],
                [10, 3, 8],
                [18, 16, 25],
                [23, 29, 27],
                [17, 22, 14],
                [11, 6, 0, 4],
                [19, 11, 13, 21],
                [20, 19, 26, 28],
                [12, 20, 24, 15],
                [6, 12, 7, 2],
                [9, 17, 14, 5],
                [10, 9, 1, 3],
                [18, 10, 8, 16],
                [23, 18, 25, 29],
                [17, 23, 27, 22],
                [24, 25, 16, 15],
                [15, 16, 8, 7],
                [7, 8, 3, 2],
                [2, 3, 1, 0],
                [0, 1, 5, 4],
                [4, 5, 14, 13],
                [13, 14, 22, 21],
                [21, 22, 27, 26],
                [26, 27, 29, 28],
                [28, 29, 25, 24],
                [6, 11, 19, 20, 12],
                [17, 9, 10, 18, 23]];
   poly.vertices = [[-1.006864, 0.217224, -0.290603],
               [-0.990318, 0.219795, 0.341133],
               [-0.944481, -0.411647, -0.289678],
               [-0.927935, -0.409077, 0.342059],
               [-0.687819, 0.762632, -0.301179],
               [-0.671273, 0.765203, 0.330558],
               [-0.551737, -0.055664, -0.63377],
               [-0.524499, -0.883775, -0.298756],
               [-0.507953, -0.881203, 0.33298],
               [-0.446854, 0.274173, 0.659035],
               [-0.384471, -0.354698, 0.65996],
               [-0.232692, 0.489744, -0.644346],
               [-0.131755, -0.527791, -0.642848],
               [-0.10921, 1.01625, -0.317365],
               [-0.092665, 1.018821, 0.314371],
               [0.092664, -1.018821, -0.314371],
               [0.10921, -1.01625, 0.317365],
               [0.131755, 0.527791, 0.642848],
               [0.232692, -0.489745, 0.644346],
               [0.384471, 0.354698, -0.65996],
               [0.446854, -0.274173, -0.659035],
               [0.507953, 0.881203, -0.33298],
               [0.524499, 0.883774, 0.298756],
               [0.551737, 0.055664, 0.63377],
               [0.671273, -0.765203, -0.330558],
               [0.687819, -0.762632, 0.301179],
               [0.927935, 0.409076, -0.342059],
               [0.944481, 0.411647, 0.289678],
               [0.990318, -0.219795, -0.341133],
               [1.006864, -0.217224, 0.290603]];
   return poly;
 },
J40: function() {
   const poly = new polyhedron();
   poly.name = "J40";
   poly.faces = [[6, 1, 8],
                [14, 16, 24],
                [18, 27, 26],
                [11, 19, 9],
                [4, 2, 0],
                [20, 10, 17],
                [10, 5, 3],
                [17, 15, 25],
                [15, 7, 13],
                [25, 30, 32],
                [30, 23, 31],
                [32, 34, 28],
                [34, 33, 29],
                [28, 21, 20],
                [21, 22, 12],
                [6, 4, 0, 1],
                [14, 6, 8, 16],
                [18, 14, 24, 27],
                [11, 18, 26, 19],
                [4, 11, 9, 2],
                [26, 31, 23, 19],
                [19, 23, 13, 9],
                [9, 13, 7, 2],
                [2, 7, 3, 0],
                [0, 3, 5, 1],
                [1, 5, 12, 8],
                [8, 12, 22, 16],
                [16, 22, 29, 24],
                [24, 29, 33, 27],
                [27, 33, 31, 26],
                [4, 6, 14, 18, 11],
                [20, 17, 25, 32, 28],
                [20, 21, 12, 5, 10],
                [17, 10, 3, 7, 15],
                [25, 15, 13, 23, 30],
                [32, 30, 31, 33, 34],
                [28, 34, 29, 22, 21]];
   poly.vertices = [[-1.05518, -0.061289, -0.047893],
               [-0.934164, 0.280612, 0.409939],
               [-0.859454, -0.241561, -0.56784],
               [-0.777777, -0.505581, 0.210572],
               [-0.776073, 0.311702, -0.400212],
               [-0.656761, -0.163679, 0.668404],
               [-0.655057, 0.653604, 0.05762],
               [-0.582051, -0.685853, -0.309375],
               [-0.542629, 0.653549, 0.63078],
               [-0.421745, -0.191346, -0.9513],
               [-0.400139, -0.685942, 0.618017],
               [-0.338365, 0.361918, -0.783672],
               [-0.265226, 0.209257, 0.889245],
               [-0.144342, -0.635637, -0.692835],
               [-0.142556, 0.915126, -0.042884],
               [-0.083446, -0.977628, -0.223275],
               [-0.030129, 0.915071, 0.530275],
               [0.028982, -0.977682, 0.349884],
               [0.05317, 0.734854, -0.562831],
               [0.090755, 0.070177, -1.051805],
               [0.149998, -0.635781, 0.807716],
               [0.233378, -0.082518, 0.975345],
               [0.247274, 0.47078, 0.788741],
               [0.368158, -0.374115, -0.793339],
               [0.40758, 0.965287, 0.146815],
               [0.46669, -0.927467, -0.033576],
               [0.48229, 0.443114, -0.830964],
               [0.603306, 0.785015, -0.373132],
               [0.662498, -0.374258, 0.707212],
               [0.684983, 0.520995, 0.405281],
               [0.745797, -0.554475, -0.385895],
               [0.759693, -0.001178, -0.572498],
               [0.858225, -0.55453, 0.187265],
               [0.880709, 0.340724, -0.114666],
               [0.941605, -0.001267, 0.354893]];
   return poly;
 },
J41: function() {
   const poly = new polyhedron();
   poly.name = "J41";
   poly.faces = [[9, 3, 10],
                [18, 21, 27],
                [20, 30, 25],
                [12, 17, 8],
                [5, 1, 0],
                [15, 7, 16],
                [7, 2, 4],
                [16, 19, 26],
                [19, 11, 22],
                [26, 33, 31],
                [33, 29, 34],
                [31, 28, 23],
                [28, 32, 24],
                [23, 13, 15],
                [13, 14, 6],
                [9, 5, 0, 3],
                [18, 9, 10, 21],
                [20, 18, 27, 30],
                [12, 20, 25, 17],
                [5, 12, 8, 1],
                [25, 29, 22, 17],
                [17, 22, 11, 8],
                [8, 11, 4, 1],
                [1, 4, 2, 0],
                [0, 2, 6, 3],
                [3, 6, 14, 10],
                [10, 14, 24, 21],
                [21, 24, 32, 27],
                [27, 32, 34, 30],
                [30, 34, 29, 25],
                [5, 9, 18, 20, 12],
                [15, 16, 26, 31, 23],
                [15, 13, 6, 2, 7],
                [16, 7, 4, 11, 19],
                [26, 19, 22, 29, 33],
                [31, 33, 34, 32, 28],
                [23, 28, 24, 14, 13]];
   poly.vertices = [[-1.045033, 0.161365, 0.036367],
               [-0.919366, 0.043922, -0.521815],
               [-0.855707, -0.369212, 0.190625],
               [-0.830432, 0.382234, 0.532668],
               [-0.73004, -0.486655, -0.367556],
               [-0.711442, 0.52894, -0.271461],
               [-0.641106, -0.148342, 0.686927],
               [-0.544409, -0.844483, 0.055116],
               [-0.501432, 0.074765, -0.928671],
               [-0.496841, 0.749809, 0.224841],
               [-0.357534, 0.622166, 0.777518],
               [-0.312106, -0.455811, -0.774412],
               [-0.293508, 0.559783, -0.678317],
               [-0.197177, -0.487108, 0.858148],
               [-0.168208, 0.09159, 0.931777],
               [-0.137415, -0.917347, 0.467667],
               [-0.011748, -1.03479, -0.090514],
               [0.049132, 0.242114, -1.028796],
               [0.053724, 0.917158, 0.124716],
               [0.131823, -0.794577, -0.603191],
               [0.17939, 0.799715, -0.433466],
               [0.193031, 0.789515, 0.677394],
               [0.238459, -0.288463, -0.874537],
               [0.335483, -0.677415, 0.712518],
               [0.382357, 0.258938, 0.831652],
               [0.522031, 0.482046, -0.783946],
               [0.538816, -0.867441, -0.190639],
               [0.610965, 0.820358, 0.270538],
               [0.693655, -0.216333, 0.696143],
               [0.711357, -0.048531, -0.629687],
               [0.736632, 0.702915, -0.287644],
               [0.753417, -0.646572, 0.305662],
               [0.800291, 0.289782, 0.424796],
               [0.896988, -0.406359, -0.207015],
               [0.925958, 0.172339, -0.133386]];
   return poly;
 },
J42: function() {
   const poly = new polyhedron();
   poly.name = "J42";
   poly.faces = [[0, 3, 4],
                [3, 7, 11],
                [4, 12, 8],
                [12, 18, 22],
                [8, 15, 6],
                [15, 25, 23],
                [6, 10, 2],
                [10, 19, 13],
                [2, 1, 0],
                [1, 9, 5],
                [30, 24, 34],
                [24, 14, 17],
                [34, 32, 38],
                [32, 21, 28],
                [38, 37, 39],
                [37, 31, 33],
                [39, 35, 36],
                [35, 29, 26],
                [36, 27, 30],
                [27, 20, 16],
                [23, 31, 28, 19],
                [19, 28, 21, 13],
                [13, 21, 17, 9],
                [9, 17, 14, 5],
                [5, 14, 16, 7],
                [7, 16, 20, 11],
                [11, 20, 26, 18],
                [18, 26, 29, 22],
                [22, 29, 33, 25],
                [25, 33, 31, 23],
                [0, 4, 8, 6, 2],
                [0, 1, 5, 7, 3],
                [4, 3, 11, 18, 12],
                [8, 12, 22, 25, 15],
                [6, 15, 23, 19, 10],
                [2, 10, 13, 9, 1],
                [30, 34, 38, 39, 36],
                [30, 27, 16, 14, 24],
                [34, 24, 17, 21, 32],
                [38, 32, 28, 31, 37],
                [39, 37, 33, 29, 35],
                [36, 35, 26, 20, 27]];
   poly.vertices = [[-1.094229, 0.091579, -0.183298],
               [-0.983491, -0.29488, 0.177777],
               [-0.97462, -0.408146, -0.350504],
               [-0.882171, 0.554599, -0.002654],
               [-0.873301, 0.441333, -0.530935],
               [-0.702994, -0.070704, 0.581578],
               [-0.679771, -0.367238, -0.801479],
               [-0.640375, 0.454303, 0.470066],
               [-0.617152, 0.157769, -0.912991],
               [-0.583386, -0.570429, 0.414373],
               [-0.569033, -0.753697, -0.440404],
               [-0.419447, 0.804058, 0.122429],
               [-0.405095, 0.620789, -0.732347],
               [-0.327237, -0.853993, 0.032316],
               [-0.251159, -0.061675, 0.877809],
               [-0.211565, -0.187782, -1.002892],
               [-0.18854, 0.463332, 0.766296],
               [-0.131551, -0.5614, 0.710603],
               [-0.124598, 0.844965, -0.328546],
               [-0.032387, -0.813085, -0.41866],
               [0.032387, 0.813086, 0.418659],
               [0.124598, -0.844964, 0.328546],
               [0.131551, 0.561401, -0.710603],
               [0.18854, -0.463331, -0.766296],
               [0.237051, -0.270491, 0.977985],
               [0.251159, 0.061676, -0.877809],
               [0.327237, 0.853994, -0.032316],
               [0.33837, 0.578988, 0.797554],
               [0.419448, -0.804057, -0.122429],
               [0.583386, 0.570429, -0.414373],
               [0.601401, 0.125461, 0.928384],
               [0.640375, -0.454302, -0.470066],
               [0.651509, -0.729308, 0.359803],
               [0.702994, 0.070705, -0.581579],
               [0.721009, -0.374264, 0.761179],
               [0.815447, 0.645178, 0.06786],
               [0.822328, 0.475215, 0.580748],
               [1.008977, -0.163393, -0.202684],
               [1.015858, -0.333356, 0.310203],
               [1.078477, 0.191651, 0.198691]];
   return poly;
 },
J43: function() {
   const poly = new polyhedron();
   poly.name = "J43";
   poly.faces = [[0, 2, 1],
                [2, 7, 10],
                [1, 8, 5],
                [8, 13, 19],
                [5, 14, 6],
                [14, 22, 24],
                [6, 11, 3],
                [11, 21, 16],
                [3, 4, 0],
                [4, 12, 9],
                [33, 25, 34],
                [25, 15, 17],
                [34, 31, 38],
                [31, 20, 26],
                [38, 37, 39],
                [37, 29, 32],
                [39, 35, 36],
                [35, 30, 27],
                [36, 28, 33],
                [28, 23, 18],
                [24, 32, 29, 21],
                [21, 29, 26, 16],
                [16, 26, 20, 12],
                [12, 20, 17, 9],
                [9, 17, 15, 7],
                [7, 15, 18, 10],
                [10, 18, 23, 13],
                [13, 23, 27, 19],
                [19, 27, 30, 22],
                [22, 30, 32, 24],
                [0, 1, 5, 6, 3],
                [0, 4, 9, 7, 2],
                [1, 2, 10, 13, 8],
                [5, 8, 19, 22, 14],
                [6, 14, 24, 21, 11],
                [3, 11, 16, 12, 4],
                [33, 34, 38, 39, 36],
                [33, 28, 18, 15, 25],
                [34, 25, 17, 20, 31],
                [38, 31, 26, 29, 37],
                [39, 37, 32, 30, 35],
                [36, 35, 27, 23, 28]];
   poly.vertices = [[-1.099924, -0.170755, -0.018241],
               [-1.015744, 0.184543, -0.41657],
               [-0.979069, 0.342745, 0.098809],
               [-0.891012, -0.645186, -0.17075],
               [-0.854337, -0.486985, 0.344629],
               [-0.754806, -0.070303, -0.81526],
               [-0.677717, -0.583103, -0.663335],
               [-0.65879, 0.343875, 0.53402],
               [-0.633951, 0.443197, -0.698209],
               [-0.581702, -0.168926, 0.685945],
               [-0.57461, 0.699173, 0.135692],
               [-0.43213, -0.899333, -0.300465],
               [-0.37279, -0.643357, 0.533436],
               [-0.361315, 0.761256, -0.356893],
               [-0.295924, -0.324449, -0.944974],
               [-0.185624, 0.480819, 0.756166],
               [-0.111851, -0.898203, 0.134746],
               [-0.108536, -0.031982, 0.908091],
               [-0.101444, 0.836117, 0.357838],
               [-0.100377, 0.50641, -0.755583],
               [0.100376, -0.506413, 0.755582],
               [0.101443, -0.83612, -0.357838],
               [0.108535, 0.031979, -0.908092],
               [0.111851, 0.8982, -0.134747],
               [0.185623, -0.480822, -0.756167],
               [0.295923, 0.324447, 0.944974],
               [0.361314, -0.761258, 0.356892],
               [0.372789, 0.643354, -0.533437],
               [0.43213, 0.899331, 0.300464],
               [0.574609, -0.699176, -0.135692],
               [0.581701, 0.168923, -0.685946],
               [0.63395, -0.443199, 0.698208],
               [0.658789, -0.343878, -0.534021],
               [0.677716, 0.583101, 0.663334],
               [0.754804, 0.0703, 0.815259],
               [0.854336, 0.486982, -0.344629],
               [0.891011, 0.645184, 0.17075],
               [0.979068, -0.342747, -0.09881],
               [1.015743, -0.184545, 0.416569],
               [1.099923, 0.170753, 0.018241]];
   return poly;
 },
J44: function() {
   const poly = new polyhedron();
   poly.name = "J44";
   poly.faces = [[11, 14, 6],
                [14, 17, 12],
                [6, 4, 0],
                [11, 5, 13],
                [9, 10, 3],
                [10, 16, 8],
                [3, 2, 1],
                [9, 7, 15],
                [4, 1, 0],
                [0, 1, 2],
                [0, 2, 5],
                [5, 2, 8],
                [5, 8, 13],
                [13, 8, 16],
                [13, 16, 17],
                [17, 16, 15],
                [17, 15, 12],
                [12, 15, 7],
                [12, 7, 4],
                [4, 7, 1],
                [14, 11, 13, 17],
                [6, 14, 12, 4],
                [11, 6, 0, 5],
                [10, 9, 15, 16],
                [3, 10, 8, 2],
                [9, 3, 1, 7]];
   poly.vertices = [[-0.789003, 0.385273, -0.254111],
               [-0.772339, -0.452189, -0.185879],
               [-0.761383, 0.026005, 0.505125],
               [-0.611639, -0.798949, 0.562592],
               [-0.381598, -0.074991, -0.82722],
               [-0.362623, 0.753266, 0.369634],
               [-0.289802, 0.760316, -0.816621],
               [-0.055737, -0.771195, -0.487529],
               [-0.033826, 0.185193, 0.894479],
               [0.104963, -1.117956, 0.260942],
               [0.115918, -0.639761, 0.951946],
               [0.136578, 1.128308, -0.192876],
               [0.452187, -0.167262, -0.776585],
               [0.471162, 0.660994, 0.420269],
               [0.543983, 0.668044, -0.765985],
               [0.67182, -0.612007, -0.098176],
               [0.682775, -0.133813, 0.592828],
               [0.878567, 0.200731, -0.15284]];
   return poly;
 },
J45: function() {
   const poly = new polyhedron();
   poly.name = "J45";
   poly.faces = [[13, 16, 20],
                [9, 18, 12],
                [2, 4, 0],
                [5, 1, 8],
                [14, 15, 7],
                [10, 3, 6],
                [17, 11, 19],
                [21, 23, 22],
                [12, 11, 4],
                [4, 11, 6],
                [4, 6, 0],
                [0, 6, 3],
                [0, 3, 1],
                [1, 3, 7],
                [1, 7, 8],
                [8, 7, 15],
                [8, 15, 16],
                [16, 15, 22],
                [16, 22, 20],
                [20, 22, 23],
                [20, 23, 18],
                [18, 23, 19],
                [18, 19, 12],
                [12, 19, 11],
                [5, 13, 9, 2],
                [13, 5, 8, 16],
                [9, 13, 20, 18],
                [2, 9, 12, 4],
                [5, 2, 0, 1],
                [21, 14, 10, 17],
                [14, 21, 22, 15],
                [10, 14, 7, 3],
                [17, 10, 6, 11],
                [21, 17, 19, 23]];
   poly.vertices = [[-0.984615, -0.215433, 0.042813],
               [-0.835086, 0.417027, 0.382665],
               [-0.776626, 0.078669, -0.596021],
               [-0.681291, -0.220722, 0.710519],
               [-0.642753, -0.628915, -0.457214],
               [-0.627097, 0.71113, -0.256169],
               [-0.577202, -0.786781, 0.255979],
               [-0.300907, 0.381853, 0.883943],
               [-0.281757, 0.897979, 0.36326],
               [-0.143631, 0.126378, -0.963315],
               [-0.068623, -0.621064, 0.757726],
               [-0.049613, -0.984736, -0.213412],
               [-0.009758, -0.581206, -0.824509],
               [0.005899, 0.758839, -0.623463],
               [0.311761, -0.018489, 0.931151],
               [0.341127, 0.667962, 0.674663],
               [0.351238, 0.945688, -0.004035],
               [0.458966, -0.819019, 0.288335],
               [0.54357, -0.100253, -0.843914],
               [0.592421, -0.698626, -0.422693],
               [0.6931, 0.532207, -0.504062],
               [0.83935, -0.216444, 0.461759],
               [0.868716, 0.470008, 0.205272],
               [0.972805, -0.096052, -0.249268]];
   return poly;
 },
J46: function() {
   const poly = new polyhedron();
   poly.name = "J46";
   poly.faces = [[9, 11, 18],
                [16, 23, 25],
                [10, 19, 12],
                [3, 6, 1],
                [2, 0, 4],
                [17, 13, 7],
                [15, 5, 8],
                [21, 14, 22],
                [26, 28, 29],
                [24, 27, 20],
                [19, 22, 12],
                [12, 22, 14],
                [12, 14, 6],
                [6, 14, 8],
                [6, 8, 1],
                [1, 8, 5],
                [1, 5, 0],
                [0, 5, 7],
                [0, 7, 4],
                [4, 7, 13],
                [4, 13, 11],
                [11, 13, 20],
                [11, 20, 18],
                [18, 20, 27],
                [18, 27, 23],
                [23, 27, 29],
                [23, 29, 25],
                [25, 29, 28],
                [25, 28, 19],
                [19, 28, 22],
                [9, 2, 4, 11],
                [16, 9, 18, 23],
                [10, 16, 25, 19],
                [3, 10, 12, 6],
                [2, 3, 1, 0],
                [17, 24, 20, 13],
                [15, 17, 7, 5],
                [21, 15, 8, 14],
                [26, 21, 22, 28],
                [24, 26, 29, 27],
                [2, 9, 16, 10, 3],
                [24, 17, 15, 21, 26]];
   poly.vertices = [[-0.962816, 0.187793, 0.445444],
               [-0.942301, -0.435696, 0.287991],
               [-0.736715, 0.34226, -0.136766],
               [-0.7162, -0.281228, -0.294218],
               [-0.680334, 0.758077, 0.35095],
               [-0.653736, -0.229833, 0.824928],
               [-0.626624, -0.874236, -0.061265],
               [-0.516012, 0.397771, 0.858028],
               [-0.47699, -0.788175, 0.558536],
               [-0.259134, 0.641512, -0.447112],
               [-0.22594, -0.367313, -0.701875],
               [-0.202753, 1.057329, 0.040605],
               [-0.136364, -0.960322, -0.468922],
               [-0.116423, 0.854913, 0.645191],
               [-0.053283, -1.063987, 0.160603],
               [-0.029965, -0.362198, 0.739264],
               [0.056543, 0.202971, -0.796368],
               [0.107759, 0.265405, 0.772363],
               [0.287508, 0.971244, -0.367052],
               [0.341218, -0.66107, -0.779268],
               [0.392401, 0.966981, 0.267715],
               [0.393741, -0.638011, 0.341331],
               [0.455541, -0.951919, -0.216873],
               [0.603185, 0.532703, -0.716309],
               [0.616584, 0.377473, 0.394887],
               [0.6237, -0.090786, -0.873761],
               [0.79333, -0.180868, 0.128495],
               [0.816108, 0.691169, -0.130218],
               [0.85513, -0.494777, -0.42971],
               [0.992854, 0.132827, -0.396611]];
   return poly;
 },
J47: function() {
   const poly = new polyhedron();
   poly.name = "J47";
   poly.faces = [[8, 12, 18],
                [13, 21, 20],
                [7, 16, 11],
                [2, 4, 0],
                [3, 1, 5],
                [30, 19, 24],
                [19, 15, 10],
                [24, 17, 27],
                [17, 6, 9],
                [27, 25, 32],
                [25, 14, 22],
                [32, 33, 34],
                [33, 26, 29],
                [34, 31, 30],
                [31, 28, 23],
                [16, 22, 11],
                [11, 22, 14],
                [11, 14, 4],
                [4, 14, 9],
                [4, 9, 0],
                [0, 9, 6],
                [0, 6, 1],
                [1, 6, 10],
                [1, 10, 5],
                [5, 10, 15],
                [5, 15, 12],
                [12, 15, 23],
                [12, 23, 18],
                [18, 23, 28],
                [18, 28, 21],
                [21, 28, 29],
                [21, 29, 20],
                [20, 29, 26],
                [20, 26, 16],
                [16, 26, 22],
                [8, 3, 5, 12],
                [13, 8, 18, 21],
                [7, 13, 20, 16],
                [2, 7, 11, 4],
                [3, 2, 0, 1],
                [3, 8, 13, 7, 2],
                [30, 24, 27, 32, 34],
                [30, 31, 23, 15, 19],
                [24, 19, 10, 6, 17],
                [27, 17, 9, 14, 25],
                [32, 25, 22, 26, 33],
                [34, 33, 29, 28, 31]];
   poly.vertices = [[-0.908535, -0.523787, -0.144699],
               [-0.894854, -0.367641, 0.429886],
               [-0.853258, 0.048135, -0.301436],
               [-0.839577, 0.20428, 0.273149],
               [-0.708763, -0.381742, -0.687498],
               [-0.672946, 0.027052, 0.816785],
               [-0.520247, -0.782937, 0.225153],
               [-0.51634, 0.434114, -0.605119],
               [-0.494204, 0.686763, 0.324579],
               [-0.422413, -0.79035, -0.362291],
               [-0.396391, -0.493344, 0.730635],
               [-0.371845, 0.004237, -0.991181],
               [-0.327573, 0.509534, 0.868216],
               [-0.294432, 0.828807, -0.218221],
               [-0.140258, -0.512752, -0.807313],
               [-0.098153, -0.032185, 0.961078],
               [-0.026471, 0.486719, -0.939751],
               [-0.010949, -1.005224, 0.010862],
               [0.009345, 0.895513, 0.564533],
               [0.189455, -0.536653, 0.828749],
               [0.195436, 0.881412, -0.552852],
               [0.209117, 1.037558, 0.021734],
               [0.218444, -0.056175, -0.93993],
               [0.260549, 0.424392, 0.828462],
               [0.427671, -0.853012, 0.383905],
               [0.445587, -0.556061, -0.709199],
               [0.516681, 0.404984, -0.709486],
               [0.525505, -0.860425, -0.203539],
               [0.542703, 0.70199, 0.38344],
               [0.640537, 0.694577, -0.204005],
               [0.725908, -0.391854, 0.614349],
               [0.769847, 0.202104, 0.614171],
               [0.884207, -0.403849, -0.336156],
               [0.928145, 0.190109, -0.336334],
               [1.008063, -0.114255, 0.169326]];
   return poly;
 },
J48: function() {
   const poly = new polyhedron();
   poly.name = "J48";
   poly.faces = [[0, 5, 1],
                [5, 10, 11],
                [1, 7, 3],
                [7, 13, 15],
                [3, 9, 4],
                [9, 17, 19],
                [4, 8, 2],
                [8, 18, 16],
                [2, 6, 0],
                [6, 14, 12],
                [35, 31, 37],
                [31, 21, 23],
                [37, 33, 39],
                [33, 25, 27],
                [39, 34, 38],
                [34, 29, 28],
                [38, 32, 36],
                [32, 26, 24],
                [36, 30, 35],
                [30, 22, 20],
                [17, 28, 19],
                [19, 28, 29],
                [19, 29, 18],
                [18, 29, 27],
                [18, 27, 16],
                [16, 27, 25],
                [16, 25, 14],
                [14, 25, 23],
                [14, 23, 12],
                [12, 23, 21],
                [12, 21, 10],
                [10, 21, 20],
                [10, 20, 11],
                [11, 20, 22],
                [11, 22, 13],
                [13, 22, 24],
                [13, 24, 15],
                [15, 24, 26],
                [15, 26, 17],
                [17, 26, 28],
                [0, 1, 3, 4, 2],
                [0, 6, 12, 10, 5],
                [1, 5, 11, 13, 7],
                [3, 7, 15, 17, 9],
                [4, 9, 19, 18, 8],
                [2, 8, 16, 14, 6],
                [35, 37, 39, 38, 36],
                [35, 30, 20, 21, 31],
                [37, 31, 23, 25, 33],
                [39, 33, 27, 29, 34],
                [38, 34, 28, 26, 32],
                [36, 32, 24, 22, 30]];
   poly.vertices = [[-1.023844, 0.34935, 0.211966],
               [-1.02284, 0.245289, -0.329944],
               [-0.984402, -0.132386, 0.478181],
               [-0.982778, -0.300762, -0.398647],
               [-0.959023, -0.534178, 0.100801],
               [-0.762835, 0.690856, -0.134076],
               [-0.724398, 0.313181, 0.674049],
               [-0.72177, 0.040743, -0.74469],
               [-0.659577, -0.570348, 0.562884],
               [-0.657953, -0.738723, -0.313945],
               [-0.302078, 0.865747, 0.11414],
               [-0.301074, 0.761686, -0.427769],
               [-0.278322, 0.632332, 0.613589],
               [-0.275694, 0.359894, -0.805149],
               [-0.238881, 0.150594, 0.879804],
               [-0.235633, -0.186157, -0.873853],
               [-0.198819, -0.395456, 0.8111],
               [-0.196192, -0.667893, -0.607638],
               [-0.173439, -0.797247, 0.43372],
               [-0.172436, -0.901309, -0.10819],
               [0.169627, 0.892069, -0.170988],
               [0.181588, 0.824063, 0.376487],
               [0.183498, 0.626126, -0.654287],
               [0.214813, 0.448086, 0.77902],
               [0.217902, 0.127816, -0.888807],
               [0.25661, -0.092255, 0.882858],
               [0.259699, -0.412524, -0.784969],
               [0.291015, -0.590564, 0.648338],
               [0.292924, -0.788502, -0.382436],
               [0.304885, -0.856507, 0.165038],
               [0.65102, 0.715912, -0.375257],
               [0.670374, 0.605876, 0.510575],
               [0.706688, -0.090371, -0.754719],
               [0.738003, -0.268411, 0.678589],
               [0.760446, -0.698716, -0.103406],
               [0.960498, 0.539035, 0.045972],
               [0.974369, 0.273093, -0.437327],
               [0.993723, 0.163058, 0.448505],
               [1.016166, -0.267247, -0.333489],
               [1.028128, -0.335253, 0.213985]];
   return poly;
 },
J49: function() {
   const poly = new polyhedron();
   poly.name = "J49";
   poly.faces = [[6, 3, 2],
                [3, 0, 2],
                [0, 3, 4],
                [2, 5, 6],
                [1, 0, 4],
                [6, 4, 3],
                [2, 0, 1, 5],
                [5, 1, 4, 6]];
   poly.vertices = [[-0.87547, -0.255205, -0.086794],
               [-0.276612, -0.313401, 1.029989],
               [-0.236035, 0.801921, -0.374595],
               [-0.051128, -0.255205, -1.050994],
               [0.218493, -0.889481, 0.014004],
               [0.362823, 0.743725, 0.742188],
               [0.857929, 0.167645, -0.273797]];
   return poly;
 },
J50: function() {
   const poly = new polyhedron();
   poly.name = "J50";
   poly.faces = [[3, 0, 1],
                [1, 0, 2],
                [1, 2, 5],
                [4, 0, 3],
                [2, 6, 5],
                [4, 3, 7],
                [4, 7, 6],
                [6, 7, 5],
                [7, 3, 5],
                [1, 5, 3],
                [0, 4, 6, 2]];
   poly.vertices = [[-0.878027, -0.44614, 0.176652],
               [-0.85656, 0.548188, -0.533],
               [-0.47761, 0.616903, 0.626496],
               [-0.069889, -0.364329, -0.736024],
               [0.239836, -0.921955, 0.306031],
               [0.330528, 0.698715, -0.286179],
               [0.640253, 0.141088, 0.755876],
               [1.071468, -0.272471, -0.309853]];
   return poly;
 },
J51: function() {
   const poly = new polyhedron();
   poly.name = "J51";
   poly.faces = [[1, 5, 0],
                [8, 4, 5],
                [4, 0, 5],
                [4, 3, 0],
                [8, 3, 4],
                [5, 6, 8],
                [8, 6, 7],
                [8, 7, 3],
                [3, 7, 2],
                [7, 6, 2],
                [3, 2, 0],
                [0, 2, 1],
                [2, 6, 1],
                [1, 6, 5]];
   poly.vertices = [[-0.837735, -0.140456, -0.298855],
               [-0.67808, 0.951266, 0.116678],
               [-0.424767, 0.019903, 0.793738],
               [-0.041529, -0.887587, 0.145967],
               [-0.017092, -0.613922, -1.000561],
               [0.031619, 0.531638, -0.726088],
               [0.444587, 0.691997, 0.366504],
               [0.695172, -0.337344, 0.883883],
               [0.827825, -0.215493, -0.281266]];
   return poly;
 },
J52: function() {
   const poly = new polyhedron();
   poly.name = "J52";
   poly.faces = [[3, 8, 4],
                [3, 9, 8],
                [4, 8, 10],
                [10, 8, 9],
                [1, 0, 5, 6],
                [3, 1, 6, 9],
                [2, 4, 10, 7],
                [0, 2, 7, 5],
                [0, 1, 3, 4, 2],
                [7, 10, 9, 6, 5]];
   poly.vertices = [[-0.81481, 0.221521, -0.662951],
               [-0.660297, -0.683519, -0.326712],
               [-0.53073, 0.852939, 0.027439],
               [-0.280723, -0.611446, 0.571485],
               [-0.200646, 0.338137, 0.790362],
               [0.085423, 0.233517, -1.044348],
               [0.239936, -0.671523, -0.708109],
               [0.369503, 0.864935, -0.353959],
               [0.473247, -0.295241, 1.107742],
               [0.619511, -0.59945, 0.190087],
               [0.699587, 0.350133, 0.408964]];
   return poly;
 },
J53: function() {
   const poly = new polyhedron();
   poly.name = "J53";
   poly.faces = [[2, 3, 0],
                [2, 9, 3],
                [0, 3, 7],
                [7, 3, 9],
                [1, 6, 4],
                [1, 8, 6],
                [4, 6, 10],
                [10, 6, 8],
                [5, 4, 10, 11],
                [2, 5, 11, 9],
                [1, 0, 7, 8],
                [4, 5, 2, 0, 1],
                [8, 7, 9, 11, 10]];
   poly.vertices = [[-0.736376, 0.261231, -0.409511],
               [-0.572247, -0.640818, -0.200191],
               [-0.430826, 0.786388, 0.30833],
               [-0.352398, 1.103933, -0.573408],
               [-0.16526, -0.673158, 0.647018],
               [-0.077857, 0.208904, 0.961301],
               [0.083202, -1.290119, -0.017868],
               [0.11049, 0.32145, -0.814035],
               [0.274618, -0.5806, -0.604714],
               [0.416039, 0.846607, -0.096194],
               [0.681606, -0.61294, 0.242494],
               [0.769009, 0.269122, 0.556777]];
   return poly;
 },
J54: function() {
   const poly = new polyhedron();
   poly.name = "J54";
   poly.faces = [[5, 10, 9],
                [5, 8, 10],
                [9, 10, 12],
                [12, 10, 8],
                [1, 0, 2, 4],
                [5, 1, 4, 8],
                [7, 9, 12, 11],
                [3, 7, 11, 6],
                [0, 3, 6, 2],
                [0, 1, 5, 9, 7, 3],
                [11, 12, 8, 4, 2, 6]];
   poly.vertices = [[-0.973522, 0.38842, -0.100967],
               [-0.837708, -0.464036, -0.18462],
               [-0.457167, 0.537479, -0.781617],
               [-0.449574, 0.863826, 0.400622],
               [-0.321353, -0.314977, -0.865269],
               [-0.177946, -0.841086, 0.233318],
               [0.066781, 1.012885, -0.280028],
               [0.210188, 0.486776, 0.818559],
               [0.338409, -0.692027, -0.447332],
               [0.346002, -0.365679, 0.734907],
               [0.666998, -1.030797, 0.280259],
               [0.726543, 0.635835, 0.13791],
               [0.862357, -0.216621, 0.054258]];
   return poly;
 },
J55: function() {
   const poly = new polyhedron();
   poly.name = "J55";
   poly.faces = [[12, 13, 11],
                [12, 10, 13],
                [11, 13, 8],
                [8, 13, 10],
                [3, 0, 5],
                [3, 1, 0],
                [5, 0, 2],
                [2, 0, 1],
                [9, 5, 2, 7],
                [12, 9, 7, 10],
                [6, 11, 8, 4],
                [3, 6, 4, 1],
                [5, 9, 12, 11, 6, 3],
                [4, 8, 10, 7, 2, 1]];
   poly.vertices = [[-1.129559, 0.266324, 0.624401],
               [-0.925111, 0.008507, -0.145991],
               [-0.655368, -0.416841, 0.523404],
               [-0.5883, 0.71007, 0.164074],
               [-0.438148, 0.074567, -0.824427],
               [-0.318557, 0.284721, 0.83347],
               [-0.101337, 0.77613, -0.514362],
               [0.101337, -0.77613, 0.514363],
               [0.318557, -0.284721, -0.833468],
               [0.438148, -0.074567, 0.824429],
               [0.5883, -0.710069, -0.164073],
               [0.655368, 0.416842, -0.523403],
               [0.925111, -0.008507, 0.145993],
               [1.129559, -0.266324, -0.624399]];
   return poly;
 },
J56: function() {
   const poly = new polyhedron();
   poly.name = "J56";
   poly.faces = [[3, 0, 1],
                [3, 4, 0],
                [1, 0, 2],
                [2, 0, 4],
                [5, 7, 10],
                [5, 6, 7],
                [10, 7, 11],
                [11, 7, 6],
                [8, 12, 13, 9],
                [3, 8, 9, 4],
                [5, 1, 2, 6],
                [12, 10, 11, 13],
                [12, 8, 3, 1, 5, 10],
                [6, 2, 4, 9, 13, 11]];
   poly.vertices = [[-1.111755, 0.435562, -0.458586],
               [-0.808867, 0.159752, 0.27642],
               [-0.700013, -0.297342, -0.421621],
               [-0.454926, 0.822531, -0.102389],
               [-0.346072, 0.365437, -0.80043],
               [-0.331474, -0.383478, 0.706586],
               [-0.22262, -0.840572, 0.008545],
               [0.189019, -1.044602, 0.713507],
               [0.376408, 0.942079, -0.051032],
               [0.485263, 0.484985, -0.749073],
               [0.49986, -0.26393, 0.757943],
               [0.608714, -0.721024, 0.059902],
               [0.853802, 0.398849, 0.379134],
               [0.962656, -0.058246, -0.318907]];
   return poly;
 },
J57: function() {
   const poly = new polyhedron();
   poly.name = "J57";
   poly.faces = [[9, 14, 11],
                [9, 12, 14],
                [11, 14, 13],
                [13, 14, 12],
                [8, 6, 2],
                [8, 10, 6],
                [2, 6, 5],
                [5, 6, 10],
                [0, 1, 4],
                [0, 3, 1],
                [4, 1, 7],
                [7, 1, 3],
                [9, 4, 7, 12],
                [8, 11, 13, 10],
                [0, 2, 5, 3],
                [0, 4, 9, 11, 8, 2],
                [10, 13, 12, 7, 3, 5]];
   poly.vertices = [[-0.902174, -0.044182, -0.142406],
               [-0.852256, -0.16038, -0.950443],
               [-0.65694, 0.352221, 0.529639],
               [-0.484062, 0.483825, -0.606421],
               [-0.454289, -0.660407, -0.440037],
               [-0.238829, 0.880229, 0.065624],
               [-0.184058, 0.919718, 0.880707],
               [-0.036177, -0.1324, -0.904053],
               [0.036178, 0.1324, 0.904052],
               [0.238829, -0.880229, -0.065625],
               [0.454289, 0.660407, 0.440037],
               [0.484063, -0.483825, 0.60642],
               [0.656941, -0.352221, -0.52964],
               [0.902174, 0.044182, 0.142405],
               [1.036314, -0.759338, 0.069736]];
   return poly;
 },
J58: function() {
   const poly = new polyhedron();
   poly.name = "J58";
   poly.faces = [[2, 0, 5],
                [2, 5, 8],
                [2, 1, 0],
                [2, 7, 1],
                [7, 2, 8],
                [18, 20, 16, 11, 12],
                [6, 4, 11, 16, 13],
                [1, 7, 12, 11, 4],
                [8, 15, 18, 12, 7],
                [17, 19, 20, 18, 15],
                [14, 13, 16, 20, 19],
                [19, 17, 10, 9, 14],
                [15, 8, 5, 10, 17],
                [4, 6, 3, 0, 1],
                [13, 14, 9, 3, 6],
                [3, 9, 10, 5, 0]];
   poly.vertices = [[-0.906673, 0.136106, 0.246909],
               [-0.827056, 0.097501, -0.456089],
               [-0.822039, 0.728118, -0.133084],
               [-0.682157, -0.474972, 0.526574],
               [-0.553334, -0.537436, -0.610901],
               [-0.48677, 0.654002, 0.486704],
               [-0.463781, -0.891244, -0.003583],
               [-0.357947, 0.591537, -0.650771],
               [-0.147639, 0.935474, -0.068093],
               [-0.123496, -0.334743, 0.939211],
               [-0.00274, 0.363001, 0.91457],
               [0.084945, -0.435813, -0.901263],
               [0.2057, 0.261931, -0.925903],
               [0.229843, -1.008285, 0.0814],
               [0.440151, -0.664349, 0.664079],
               [0.545986, 0.818432, 0.01689],
               [0.568974, -0.726814, -0.473396],
               [0.635538, 0.464625, 0.624209],
               [0.764361, 0.40216, -0.513266],
               [0.90926, -0.170313, 0.469397],
               [0.988877, -0.208918, -0.233601]];
   return poly;
 },
J59: function() {
   const poly = new polyhedron();
   poly.name = "J59";
   poly.faces = [[0, 7, 3],
                [0, 3, 1],
                [0, 5, 7],
                [0, 2, 5],
                [2, 0, 1],
                [21, 18, 14],
                [21, 14, 16],
                [21, 20, 18],
                [21, 19, 20],
                [19, 21, 16],
                [6, 8, 14, 18, 12],
                [17, 11, 12, 18, 20],
                [5, 2, 6, 12, 11],
                [1, 4, 8, 6, 2],
                [10, 16, 14, 8, 4],
                [4, 1, 3, 9, 10],
                [11, 17, 13, 7, 5],
                [20, 19, 15, 13, 17],
                [16, 10, 9, 15, 19],
                [15, 9, 3, 7, 13]];
   poly.vertices = [[-0.987924, -0.168105, -0.565605],
               [-0.950092, -0.216897, 0.133657],
               [-0.877263, 0.407337, -0.179083],
               [-0.637339, -0.699196, -0.269274],
               [-0.609869, -0.193139, 0.747222],
               [-0.519498, 0.310837, -0.775297],
               [-0.492028, 0.816894, 0.241199],
               [-0.371218, -0.373038, -0.831038],
               [-0.32677, 0.445779, 0.813687],
               [-0.103824, -0.973514, 0.095267],
               [-0.086847, -0.660753, 0.723496],
               [0.086847, 0.660753, -0.723496],
               [0.103824, 0.973513, -0.095267],
               [0.32677, -0.44578, -0.813687],
               [0.371218, 0.373038, 0.831038],
               [0.492028, -0.816894, -0.241199],
               [0.519498, -0.310837, 0.775297],
               [0.609869, 0.193139, -0.747222],
               [0.637339, 0.699195, 0.269274],
               [0.877262, -0.407338, 0.179083],
               [0.950092, 0.216897, -0.133657],
               [0.987924, 0.168105, 0.565605]];
   return poly;
 },
J60: function() {
   const poly = new polyhedron();
   poly.name = "J60";
   poly.faces = [[7, 13, 15],
                [7, 15, 9],
                [7, 4, 13],
                [7, 2, 4],
                [2, 7, 9],
                [5, 1, 8],
                [5, 8, 14],
                [5, 3, 1],
                [5, 11, 3],
                [11, 5, 14],
                [0, 6, 10, 8, 1],
                [19, 14, 8, 10, 17],
                [4, 2, 0, 1, 3],
                [9, 12, 6, 0, 2],
                [18, 17, 10, 6, 12],
                [12, 9, 15, 20, 18],
                [3, 11, 16, 13, 4],
                [14, 19, 21, 16, 11],
                [17, 18, 20, 21, 19],
                [21, 20, 15, 13, 16]];
   poly.vertices = [[-0.858966, -0.256781, -0.362035],
               [-0.807204, -0.391109, 0.326114],
               [-0.719263, 0.425042, -0.461407],
               [-0.63551, 0.207695, 0.652043],
               [-0.58116, 0.712103, 0.165328],
               [-0.46306, -0.410585, 0.938862],
               [-0.364654, -0.630479, -0.694119],
               [-0.311484, 0.996138, -0.418515],
               [-0.280902, -0.847826, 0.419331],
               [-0.13861, 0.472734, -0.854906],
               [-0.007391, -0.995764, -0.211209],
               [-0.003096, 0.121058, 0.946694],
               [0.08055, -0.179614, -0.99873],
               [0.084846, 0.937209, 0.159173],
               [0.216065, -0.531289, 0.80287],
               [0.358357, 0.789271, -0.471366],
               [0.442109, 0.571923, 0.642084],
               [0.658614, -0.770659, -0.217364],
               [0.712965, -0.26625, -0.704079],
               [0.796718, -0.483597, 0.409371],
               [0.884659, 0.332554, -0.37815],
               [0.936421, 0.198226, 0.31]];
   return poly;
 },
J61: function() {
   const poly = new polyhedron();
   poly.name = "J61";
   poly.faces = [[6, 3, 1],
                [6, 1, 8],
                [6, 11, 3],
                [6, 14, 11],
                [14, 6, 8],
                [19, 22, 21],
                [19, 21, 15],
                [19, 16, 22],
                [19, 13, 16],
                [13, 19, 15],
                [4, 0, 2],
                [4, 2, 9],
                [4, 7, 0],
                [4, 12, 7],
                [12, 4, 9],
                [20, 17, 18, 21, 22],
                [9, 15, 21, 18, 12],
                [11, 14, 20, 22, 16],
                [8, 10, 17, 20, 14],
                [7, 12, 18, 17, 10],
                [10, 8, 1, 0, 7],
                [16, 13, 5, 3, 11],
                [15, 9, 2, 5, 13],
                [2, 0, 1, 3, 5]];
   poly.vertices = [[-0.875027, -0.215344, -0.354115],
               [-0.822602, -0.401147, 0.315989],
               [-0.733096, 0.465836, -0.400606],
               [-0.648272, 0.1652, 0.683645],
               [-0.625957, 0.049095, -0.949385],
               [-0.592955, 0.701024, 0.240765],
               [-0.479753, -0.469083, 0.919437],
               [-0.387571, -0.561993, -0.712628],
               [-0.302747, -0.862629, 0.371622],
               [-0.157924, 0.540178, -0.787852],
               [-0.033883, -0.962037, -0.264098],
               [-0.020675, 0.053739, 0.966503],
               [0.055623, -0.095055, -0.980693],
               [0.068831, 0.920721, 0.249908],
               [0.192872, -0.581494, 0.773662],
               [0.337694, 0.821313, -0.385812],
               [0.422519, 0.520677, 0.698439],
               [0.627903, -0.74234, -0.254955],
               [0.683221, -0.206515, -0.697835],
               [0.756251, 0.83314, 0.171845],
               [0.768045, -0.507151, 0.386416],
               [0.85755, 0.359831, -0.330178],
               [0.909975, 0.174028, 0.339925]];
   return poly;
 },
J62: function() {
   const poly = new polyhedron();
   poly.name = "J62";
   poly.faces = [[6, 3, 0],
                [0, 3, 1],
                [1, 5, 2],
                [1, 2, 0],
                [2, 4, 0],
                [4, 8, 6],
                [4, 6, 0],
                [9, 7, 8],
                [7, 6, 8],
                [7, 3, 6],
                [1, 3, 7, 9, 5],
                [2, 5, 9, 8, 4]];
   poly.vertices = [[-0.821855, 0.223834, -0.340481],
               [-0.71039, -0.701977, 0.157898],
               [-0.692806, 0.20039, 0.708676],
               [-0.215696, -0.533443, -0.761235],
               [-0.187244, 0.926618, 0.129942],
               [-0.006891, -0.571377, 0.936336],
               [0.107626, 0.473083, -0.778513],
               [0.793541, -0.298683, -0.550854],
               [0.811125, 0.603684, -7.6e-05],
               [0.92259, -0.322128, 0.498303]];
   return poly;
 },
J63: function() {
   const poly = new polyhedron();
   poly.name = "J63";
   poly.faces = [[0, 4, 6],
                [4, 8, 6],
                [6, 2, 0],
                [0, 1, 4],
                [5, 7, 3],
                [6, 8, 7, 5, 2],
                [0, 2, 5, 3, 1],
                [7, 8, 4, 1, 3]];
   poly.vertices = [[-0.799898, 0.494585, -0.153719],
               [-0.680241, -0.086273, 0.717027],
               [-0.306176, 0.002547, -0.943688],
               [-0.112567, -0.9373, 0.465209],
               [-0.077419, 0.764103, 0.564122],
               [0.118618, -0.882406, -0.56117],
               [0.153766, 0.818996, -0.462256],
               [0.841097, -0.612888, 0.156672],
               [0.86282, 0.438637, 0.217804]];
   return poly;
 },
J64: function() {
   const poly = new polyhedron();
   poly.name = "J64";
   poly.faces = [[6, 5, 8],
                [5, 4, 8],
                [8, 7, 6],
                [6, 2, 5],
                [9, 1, 0],
                [9, 0, 3],
                [9, 3, 1],
                [8, 4, 1, 3, 7],
                [6, 7, 3, 0, 2],
                [1, 4, 5, 2, 0]];
   poly.vertices = [[-0.777985, -0.188235, -0.285228],
               [-0.489362, -0.260552, 0.643961],
               [-0.32442, 0.578558, -0.683014],
               [-0.099589, -0.843165, -0.034687],
               [0.142581, 0.461547, 0.820446],
               [0.24452, 0.980145, 0.00033],
               [0.634293, 0.397531, -0.678318],
               [0.773247, -0.481142, -0.27763],
               [0.922916, 0.325215, 0.250871],
               [-1.026197, -0.969903, 0.24327]];
   return poly;
 },
J65: function() {
   const poly = new polyhedron();
   poly.name = "J65";
   poly.faces = [[12, 7, 11],
                [10, 13, 11],
                [14, 13, 9],
                [9, 3, 6],
                [0, 1, 5],
                [4, 2, 7],
                [6, 4, 8],
                [14, 8, 12],
                [12, 8, 4, 7],
                [13, 14, 12, 11],
                [14, 9, 6, 8],
                [11, 7, 2, 0, 5, 10],
                [13, 10, 5, 1, 3, 9],
                [3, 1, 0, 2, 4, 6]];
   poly.vertices = [[-0.91403, 0.409064, -0.602734],
               [-0.830829, 0.815648, 0.102539],
               [-0.699591, -0.379344, -0.648261],
               [-0.533188, 0.433825, 0.762285],
               [-0.401951, -0.761167, 0.011485],
               [-0.338469, 0.986004, -0.528495],
               [-0.318749, -0.354582, 0.716757],
               [0.090409, -0.59081, -0.619549],
               [0.251663, -0.893891, 0.485632],
               [0.256812, 0.222359, 0.790997],
               [0.451531, 0.774538, -0.499782],
               [0.66597, -0.013869, -0.545309],
               [0.744023, -0.723534, -0.145401],
               [0.749172, 0.392715, 0.159963],
               [0.827225, -0.31695, 0.559871]];
   return poly;
 },
J66: function() {
   const poly = new polyhedron();
   poly.name = "J66";
   poly.faces = [[24, 16, 17],
                [26, 19, 21],
                [27, 23, 22],
                [25, 20, 18],
                [21, 15, 23],
                [5, 7, 11],
                [17, 13, 19],
                [1, 3, 9],
                [18, 12, 16],
                [2, 0, 8],
                [22, 14, 20],
                [6, 4, 10],
                [25, 24, 26, 27],
                [24, 25, 18, 16],
                [26, 24, 17, 19],
                [27, 26, 21, 23],
                [25, 27, 22, 20],
                [23, 15, 11, 7, 6, 10, 14, 22],
                [20, 14, 10, 4, 2, 8, 12, 18],
                [16, 12, 8, 0, 1, 9, 13, 17],
                [19, 13, 9, 3, 5, 11, 15, 21],
                [4, 6, 7, 5, 3, 1, 0, 2]];
   poly.vertices = [[-0.935384, 0.507278, -0.272116],
               [-0.915801, 0.536228, 0.283002],
               [-0.882043, 0.099694, -0.646826],
               [-0.834764, 0.169584, 0.693348],
               [-0.787023, -0.447768, -0.621628],
               [-0.739744, -0.377878, 0.718546],
               [-0.705986, -0.814411, -0.211282],
               [-0.686402, -0.785462, 0.343836],
               [-0.561956, 0.553237, -0.681771],
               [-0.514677, 0.623127, 0.658404],
               [-0.332557, -0.768453, -0.620937],
               [-0.285278, -0.698562, 0.719237],
               [-0.014265, 0.647182, -0.705992],
               [0.033015, 0.717073, 0.634183],
               [0.215134, -0.674508, -0.645158],
               [0.262413, -0.604617, 0.695016],
               [0.386859, 0.734081, -0.330591],
               [0.406443, 0.763031, 0.224528],
               [0.440201, 0.326497, -0.705301],
               [0.48748, 0.396388, 0.634874],
               [0.535221, -0.220964, -0.680103],
               [0.5825, -0.151074, 0.660072],
               [0.616258, -0.587608, -0.269757],
               [0.635842, -0.558659, 0.285361],
               [0.831438, 0.541255, -0.057559],
               [0.884779, 0.13367, -0.432269],
               [0.912475, 0.174611, 0.352787],
               [0.965816, -0.232973, -0.021924]];
   return poly;
 },
J67: function() {
   const poly = new polyhedron();
   poly.name = "J67";
   poly.faces = [[22, 25, 17],
                [15, 10, 7],
                [19, 13, 20],
                [28, 29, 31],
                [9, 14, 6],
                [3, 0, 2],
                [12, 11, 18],
                [16, 24, 21],
                [7, 4, 13],
                [0, 6, 1],
                [17, 8, 10],
                [11, 2, 5],
                [31, 30, 25],
                [24, 18, 27],
                [20, 26, 29],
                [14, 21, 23],
                [28, 22, 15, 19],
                [22, 28, 31, 25],
                [15, 22, 17, 10],
                [19, 15, 7, 13],
                [28, 19, 20, 29],
                [16, 9, 3, 12],
                [9, 16, 21, 14],
                [3, 9, 6, 0],
                [12, 3, 2, 11],
                [16, 12, 18, 24],
                [13, 4, 1, 6, 14, 23, 26, 20],
                [29, 26, 23, 21, 24, 27, 30, 31],
                [25, 30, 27, 18, 11, 5, 8, 17],
                [10, 8, 5, 2, 0, 1, 4, 7]];
   poly.vertices = [[-0.85468, -0.304544, 0.321795],
               [-0.813538, 0.214997, 0.467663],
               [-0.753988, -0.584165, -0.130495],
               [-0.662946, -0.809677, 0.352981],
               [-0.654663, 0.670118, 0.221662],
               [-0.570447, -0.460068, -0.624262],
               [-0.567052, -0.168344, 0.759532],
               [-0.471123, 0.794216, -0.272106],
               [-0.411573, -0.004947, -0.870263],
               [-0.375319, -0.673477, 0.790718],
               [-0.370431, 0.514594, -0.724396],
               [-0.323962, -0.84341, -0.332393],
               [-0.23292, -1.068921, 0.151083],
               [-0.183495, 0.930415, 0.165631],
               [-0.059594, -0.25535, 0.926295],
               [-0.054707, 0.932721, -0.588818],
               [0.054707, -0.932721, 0.588819],
               [0.059595, 0.25535, -0.926294],
               [0.183496, -0.930415, -0.16563],
               [0.23292, 1.068921, -0.151082],
               [0.323962, 0.84341, 0.332394],
               [0.370432, -0.514594, 0.724397],
               [0.37532, 0.673477, -0.790717],
               [0.411574, 0.004947, 0.870264],
               [0.471123, -0.794216, 0.272106],
               [0.567053, 0.168344, -0.759531],
               [0.570448, 0.460068, 0.624263],
               [0.654664, -0.670118, -0.221661],
               [0.662947, 0.809677, -0.35298],
               [0.753989, 0.584165, 0.130496],
               [0.813538, -0.214997, -0.467662],
               [0.85468, 0.304544, -0.321795]];
   return poly;
 },
J68: function() {
   const poly = new polyhedron();
   poly.name = "J68";
   poly.faces = [[34, 30, 24],
                [45, 51, 41],
                [36, 26, 31],
                [53, 49, 44],
                [16, 9, 19],
                [27, 20, 21],
                [1, 3, 5],
                [4, 2, 0],
                [11, 17, 7],
                [12, 22, 13],
                [62, 56, 58],
                [59, 57, 63],
                [43, 40, 50],
                [39, 32, 38],
                [23, 28, 33],
                [10, 6, 15],
                [25, 35, 29],
                [8, 14, 18],
                [48, 52, 42],
                [47, 46, 37],
                [54, 48, 46],
                [55, 47, 49],
                [61, 53, 59],
                [62, 64, 63],
                [60, 58, 52],
                [54, 60, 52, 48],
                [55, 54, 46, 47],
                [61, 55, 49, 53],
                [64, 61, 59, 63],
                [60, 64, 62, 58],
                [60, 54, 55, 61, 64],
                [31, 26, 19, 9, 5, 3, 7, 17, 24, 30],
                [59, 53, 44, 36, 31, 30, 34, 41, 51, 57],
                [37, 27, 21, 16, 19, 26, 36, 44, 49, 47],
                [8, 4, 0, 1, 5, 9, 16, 21, 20, 14],
                [10, 12, 13, 11, 7, 3, 1, 0, 2, 6],
                [39, 45, 41, 34, 24, 17, 11, 13, 22, 32],
                [50, 40, 33, 28, 29, 35, 42, 52, 58, 56],
                [45, 39, 38, 43, 50, 56, 62, 63, 57, 51],
                [12, 10, 15, 23, 33, 40, 43, 38, 32, 22],
                [4, 8, 18, 25, 29, 28, 23, 15, 6, 2],
                [27, 37, 46, 48, 42, 35, 25, 18, 14, 20]];
   poly.vertices = [[-1.053731, -0.062801, 0.140871],
               [-1.047729, -0.006643, -0.190675],
               [-0.967657, 0.064553, 0.440012],
               [-0.951944, 0.211579, -0.427988],
               [-0.942283, -0.266176, 0.38445],
               [-0.92657, -0.11915, -0.483549],
               [-0.822385, 0.326776, 0.592485],
               [-0.802963, 0.50851, -0.480421],
               [-0.755954, -0.539085, 0.447023],
               [-0.736532, -0.35735, -0.625883],
               [-0.673403, 0.623707, 0.540051],
               [-0.65769, 0.770733, -0.327948],
               [-0.577618, 0.841928, 0.302738],
               [-0.571617, 0.898087, -0.028808],
               [-0.565916, -0.777285, 0.304689],
               [-0.561955, 0.420332, 0.78363],
               [-0.550203, -0.630259, -0.56331],
               [-0.536531, 0.658225, -0.620822],
               [-0.479842, -0.64993, 0.603829],
               [-0.454419, -0.412037, -0.800623],
               [-0.444757, -0.889793, 0.011815],
               [-0.438755, -0.833633, -0.319731],
               [-0.311187, 0.991643, 0.162337],
               [-0.285843, 0.309485, 0.940436],
               [-0.254418, 0.603538, -0.795562],
               [-0.219412, -0.556374, 0.794974],
               [-0.187987, -0.262321, -0.941024],
               [-0.162643, -0.944479, -0.162925],
               [-0.099515, 0.036577, 1.003008],
               [-0.07414, -0.294152, 0.947447],
               [-0.06438, 0.365339, -0.937896],
               [-0.039006, 0.034609, -0.993458],
               [0.024123, 1.015665, 0.172476],
               [0.049467, 0.333508, 0.950575],
               [0.080892, 0.627561, -0.785423],
               [0.115898, -0.532352, 0.805113],
               [0.147323, -0.238299, -0.930885],
               [0.172667, -0.920457, -0.152786],
               [0.300235, 0.90482, 0.329282],
               [0.306237, 0.960979, -0.002264],
               [0.315898, 0.483223, 0.810173],
               [0.341322, 0.721117, -0.594278],
               [0.398011, -0.587039, 0.630373],
               [0.411683, 0.701445, 0.572861],
               [0.423435, -0.349145, -0.774079],
               [0.427396, 0.848471, -0.295138],
               [0.433096, -0.826901, 0.038358],
               [0.439098, -0.770742, -0.293188],
               [0.51917, -0.699547, 0.337499],
               [0.534883, -0.55252, -0.5305],
               [0.598012, 0.428536, 0.635433],
               [0.617434, 0.610271, -0.437472],
               [0.664443, -0.437324, 0.489972],
               [0.683864, -0.255589, -0.582934],
               [0.721659, -0.657508, 0.072275],
               [0.727661, -0.601349, -0.259271],
               [0.78805, 0.190336, 0.493099],
               [0.803762, 0.337363, -0.3749],
               [0.813424, -0.140393, 0.437538],
               [0.829136, 0.006634, -0.430461],
               [0.866931, -0.395285, 0.224748],
               [0.876642, -0.304418, -0.311705],
               [0.909209, 0.077829, 0.200225],
               [0.91521, 0.133987, -0.131321],
               [0.962716, -0.177064, -0.012565]];
   return poly;
 },
J69: function() {
   const poly = new polyhedron();
   poly.name = "J69";
   poly.faces = [[4, 8, 12],
                [3, 0, 1],
                [18, 28, 15],
                [9, 21, 16],
                [49, 45, 37],
                [52, 62, 55],
                [56, 43, 50],
                [64, 63, 67],
                [29, 23, 34],
                [36, 27, 31],
                [13, 19, 26],
                [5, 2, 6],
                [20, 32, 24],
                [7, 17, 14],
                [51, 54, 41],
                [60, 53, 48],
                [65, 57, 61],
                [69, 66, 68],
                [40, 35, 46],
                [33, 38, 42],
                [30, 40, 38],
                [22, 33, 21],
                [10, 9, 5],
                [13, 11, 6],
                [25, 26, 35],
                [58, 56, 63],
                [59, 64, 60],
                [47, 48, 36],
                [29, 39, 31],
                [44, 34, 43],
                [30, 25, 35, 40],
                [22, 30, 38, 33],
                [10, 22, 21, 9],
                [11, 10, 5, 6],
                [25, 11, 13, 26],
                [58, 44, 43, 56],
                [59, 58, 63, 64],
                [47, 59, 60, 48],
                [39, 47, 36, 31],
                [44, 39, 29, 34],
                [25, 30, 22, 10, 11],
                [44, 58, 59, 47, 39],
                [15, 28, 37, 45, 50, 43, 34, 23, 12, 8],
                [5, 9, 16, 18, 15, 8, 4, 1, 0, 2],
                [42, 52, 55, 49, 37, 28, 18, 16, 21, 33],
                [69, 67, 63, 56, 50, 45, 49, 55, 62, 66],
                [67, 69, 68, 65, 61, 54, 51, 53, 60, 64],
                [7, 3, 1, 4, 12, 23, 29, 31, 27, 17],
                [24, 32, 41, 54, 61, 57, 46, 35, 26, 19],
                [3, 7, 14, 20, 24, 19, 13, 6, 2, 0],
                [36, 48, 53, 51, 41, 32, 20, 14, 17, 27],
                [52, 42, 38, 40, 46, 57, 65, 68, 66, 62]];
   poly.vertices = [[-0.988041, 0.082361, -0.032394],
               [-0.940439, 0.10562, 0.297446],
               [-0.93903, -0.112232, -0.299475],
               [-0.911497, 0.377114, 0.10495],
               [-0.814408, -0.051339, 0.564056],
               [-0.812127, -0.403831, -0.401783],
               [-0.783185, -0.132338, -0.594279],
               [-0.738637, 0.65944, 0.060095],
               [-0.658086, -0.328563, 0.665601],
               [-0.655805, -0.681055, -0.300238],
               [-0.621075, -0.575598, -0.615315],
               [-0.592133, -0.304105, -0.807812],
               [-0.581542, -0.03381, 0.802944],
               [-0.580033, 0.029724, -0.8042],
               [-0.535485, 0.821501, -0.149826],
               [-0.531183, -0.620162, 0.563294],
               [-0.529773, -0.838014, -0.033627],
               [-0.487884, 0.844761, 0.180013],
               [-0.482172, -0.814755, 0.296212],
               [-0.407173, 0.31205, -0.849055],
               [-0.37964, 0.801396, -0.44463],
               [-0.373928, -0.858119, -0.328432],
               [-0.339198, -0.752663, -0.643508],
               [-0.33079, 0.15151, 0.922864],
               [-0.330629, 0.606803, -0.711711],
               [-0.292369, -0.313377, -0.954974],
               [-0.28027, 0.020452, -0.951362],
               [-0.255019, 0.862289, 0.418901],
               [-0.249306, -0.797226, 0.5351],
               [-0.157929, 0.433837, 0.878008],
               [-0.136047, -0.590601, -0.85343],
               [-0.128987, 0.70533, 0.685512],
               [-0.079877, 0.792123, -0.591793],
               [-0.074164, -0.867392, -0.475594],
               [-0.001607, 0.156613, 0.979553],
               [0.001607, -0.156613, -0.979556],
               [0.074164, 0.867391, 0.475591],
               [0.079877, -0.792124, 0.59179],
               [0.128987, -0.70533, -0.685515],
               [0.136047, 0.590601, 0.853427],
               [0.157929, -0.433837, -0.878011],
               [0.249306, 0.797226, -0.535103],
               [0.255019, -0.862289, -0.418905],
               [0.280269, -0.020452, 0.95136],
               [0.292369, 0.313377, 0.954971],
               [0.330629, -0.606803, 0.711709],
               [0.33079, -0.151511, -0.922866],
               [0.339198, 0.752662, 0.643506],
               [0.373928, 0.858119, 0.328428],
               [0.37964, -0.801396, 0.444627],
               [0.407172, -0.312051, 0.849052],
               [0.482172, 0.814754, -0.296215],
               [0.487884, -0.844761, -0.180016],
               [0.529773, 0.838013, 0.033625],
               [0.531183, 0.620161, -0.563297],
               [0.535485, -0.821502, 0.149823],
               [0.580033, -0.029724, 0.804197],
               [0.581542, 0.03381, -0.802948],
               [0.592133, 0.304105, 0.807809],
               [0.621074, 0.575598, 0.615313],
               [0.655804, 0.681055, 0.300235],
               [0.658086, 0.328562, -0.665604],
               [0.738637, -0.65944, -0.060097],
               [0.783184, 0.132337, 0.594276],
               [0.812126, 0.40383, 0.40178],
               [0.814408, 0.051338, -0.564059],
               [0.911497, -0.377114, -0.104953],
               [0.939029, 0.112232, 0.299472],
               [0.940439, -0.10562, -0.297449],
               [0.988041, -0.082361, 0.032391]];
   return poly;
 },
J70: function() {
   const poly = new polyhedron();
   poly.name = "J70";
   poly.faces = [[41, 46, 53],
                [26, 22, 34],
                [33, 44, 40],
                [14, 18, 21],
                [48, 58, 49],
                [31, 38, 43],
                [68, 69, 65],
                [59, 63, 66],
                [64, 62, 67],
                [57, 52, 61],
                [3, 9, 2],
                [11, 15, 7],
                [24, 23, 16],
                [32, 39, 28],
                [37, 30, 27],
                [60, 51, 56],
                [29, 19, 25],
                [50, 45, 36],
                [10, 6, 12],
                [17, 13, 20],
                [4, 10, 13],
                [8, 17, 18],
                [5, 14, 11],
                [3, 1, 7],
                [0, 2, 6],
                [47, 37, 51],
                [55, 60, 63],
                [54, 59, 50],
                [29, 42, 36],
                [35, 25, 30],
                [4, 0, 6, 10],
                [8, 4, 13, 17],
                [5, 8, 18, 14],
                [1, 5, 11, 7],
                [0, 1, 3, 2],
                [47, 35, 30, 37],
                [55, 47, 51, 60],
                [54, 55, 63, 59],
                [42, 54, 50, 36],
                [35, 42, 29, 25],
                [0, 4, 8, 5, 1],
                [35, 47, 55, 54, 42],
                [40, 44, 49, 58, 65, 69, 67, 62, 53, 46],
                [11, 14, 21, 33, 40, 46, 41, 34, 22, 15],
                [20, 31, 43, 48, 49, 44, 33, 21, 18, 17],
                [50, 59, 66, 68, 65, 58, 48, 43, 38, 45],
                [56, 57, 61, 64, 67, 69, 68, 66, 63, 60],
                [32, 26, 34, 41, 53, 62, 64, 61, 52, 39],
                [16, 23, 27, 30, 25, 19, 12, 6, 2, 9],
                [26, 32, 28, 24, 16, 9, 3, 7, 15, 22],
                [57, 56, 51, 37, 27, 23, 24, 28, 39, 52],
                [31, 20, 13, 10, 12, 19, 29, 36, 45, 38]];
   poly.vertices = [[-0.989194, -0.091477, -0.102373],
               [-0.986156, -0.109996, 0.232129],
               [-0.908902, 0.23333, -0.08512],
               [-0.905864, 0.214811, 0.249382],
               [-0.892465, -0.388533, -0.22339],
               [-0.887549, -0.418497, 0.317846],
               [-0.850998, 0.061184, -0.366646],
               [-0.843044, 0.012701, 0.509091],
               [-0.829645, -0.590642, 0.03632],
               [-0.810408, 0.497156, 0.096369],
               [-0.754269, -0.235871, -0.487662],
               [-0.744438, -0.2958, 0.594808],
               [-0.658813, 0.046474, -0.640675],
               [-0.655662, -0.544372, -0.401946],
               [-0.647709, -0.592856, 0.473792],
               [-0.645943, -0.031974, 0.776297],
               [-0.593136, 0.75189, 0.108498],
               [-0.592842, -0.746482, -0.142236],
               [-0.589804, -0.765001, 0.192266],
               [-0.405755, 0.194817, -0.802538],
               [-0.400657, -0.761193, -0.416265],
               [-0.392703, -0.809676, 0.459472],
               [-0.389847, 0.09785, 0.948936],
               [-0.340078, 0.900233, -0.053365],
               [-0.33704, 0.881715, 0.281137],
               [-0.188483, 0.449551, -0.790409],
               [-0.172576, 0.352585, 0.961066],
               [-0.147893, 0.885523, -0.327394],
               [-0.139939, 0.83704, 0.548343],
               [-0.091754, 0.152496, -0.911425],
               [-0.089989, 0.713378, -0.60892],
               [-0.086657, -0.803514, -0.525152],
               [-0.07712, 0.63493, 0.808053],
               [-0.076826, -0.863443, 0.557318],
               [-0.073969, 0.044084, 1.046782],
               [0.126005, 0.562254, -0.815685],
               [0.163251, -0.064325, -0.925745],
               [0.166107, 0.843202, -0.436281],
               [0.166401, -0.655171, -0.687015],
               [0.175938, 0.783273, 0.64619],
               [0.179271, -0.733618, 0.729957],
               [0.181036, -0.172737, 1.032463],
               [0.222734, 0.265199, -0.936702],
               [0.229221, -0.857281, -0.427306],
               [0.237175, -0.905764, 0.448431],
               [0.261857, -0.372826, -0.840028],
               [0.277765, -0.469792, 0.911446],
               [0.382101, 0.692078, -0.643046],
               [0.426322, -0.901955, -0.1601],
               [0.42936, -0.920474, 0.174402],
               [0.479129, -0.118091, -0.827899],
               [0.481985, 0.789435, -0.338434],
               [0.489939, 0.740952, 0.537303],
               [0.495036, -0.215058, 0.923576],
               [0.538612, 0.211432, -0.838855],
               [0.637106, 0.475258, -0.657366],
               [0.679086, 0.74476, -0.071228],
               [0.682124, 0.726241, 0.263273],
               [0.682418, -0.772131, 0.012539],
               [0.735225, 0.011733, -0.65526],
               [0.73699, 0.572615, -0.352754],
               [0.744944, 0.524132, 0.522983],
               [0.748094, -0.066715, 0.761713],
               [0.833719, 0.275559, -0.473771],
               [0.84355, 0.21563, 0.6087],
               [0.899689, -0.517397, 0.024669],
               [0.932326, -0.032942, -0.388054],
               [0.940279, -0.081425, 0.487683],
               [0.995146, -0.235051, -0.128344],
               [0.998184, -0.253571, 0.206158]];
   return poly;
 },
J71: function() {
   const poly = new polyhedron();
   poly.name = "J71";
   poly.faces = [[70, 73, 74],
                [54, 53, 63],
                [60, 64, 68],
                [43, 39, 51],
                [49, 56, 59],
                [28, 27, 37],
                [52, 62, 58],
                [30, 35, 41],
                [65, 71, 67],
                [50, 55, 46],
                [3, 0, 1],
                [20, 19, 10],
                [8, 6, 2],
                [25, 29, 17],
                [22, 15, 11],
                [45, 34, 40],
                [26, 14, 16],
                [48, 47, 38],
                [12, 4, 9],
                [32, 23, 36],
                [13, 12, 23],
                [21, 32, 35],
                [18, 30, 20],
                [3, 7, 10],
                [5, 1, 4],
                [31, 22, 34],
                [42, 45, 53],
                [44, 54, 48],
                [26, 33, 38],
                [24, 16, 15],
                [66, 39, 29],
                [57, 25, 28],
                [61, 37, 49],
                [69, 59, 64],
                [72, 60, 51],
                [13, 5, 4, 12],
                [21, 13, 23, 32],
                [18, 21, 35, 30],
                [7, 18, 20, 10],
                [5, 7, 3, 1],
                [31, 24, 15, 22],
                [42, 31, 34, 45],
                [44, 42, 53, 54],
                [33, 44, 48, 38],
                [24, 33, 26, 16],
                [66, 72, 51, 39],
                [66, 29, 25, 57],
                [57, 28, 37, 61],
                [61, 49, 59, 69],
                [69, 64, 60, 72],
                [5, 13, 21, 18, 7],
                [24, 31, 42, 44, 33],
                [72, 66, 57, 61, 69],
                [68, 64, 59, 56, 58, 62, 67, 71, 74, 73],
                [40, 43, 51, 60, 68, 73, 70, 63, 53, 45],
                [54, 63, 70, 74, 71, 65, 55, 50, 47, 48],
                [20, 30, 41, 52, 58, 56, 49, 37, 27, 19],
                [36, 46, 55, 65, 67, 62, 52, 41, 35, 32],
                [2, 6, 11, 15, 16, 14, 9, 4, 1, 0],
                [28, 25, 17, 8, 2, 0, 3, 10, 19, 27],
                [43, 40, 34, 22, 11, 6, 8, 17, 29, 39],
                [46, 36, 23, 12, 9, 14, 26, 38, 47, 50]];
   poly.vertices = [[-0.942902, 0.07027, -0.149675],
               [-0.907058, 0.322313, 0.065363],
               [-0.897048, -0.257164, -0.191336],
               [-0.851819, 0.371393, -0.259585],
               [-0.803207, 0.402693, 0.37164],
               [-0.802539, 0.632087, 0.129919],
               [-0.787011, -0.534922, -0.043707],
               [-0.7473, 0.681167, -0.195029],
               [-0.731772, -0.485841, -0.368655],
               [-0.671018, 0.280706, 0.65217],
               [-0.658589, 0.531186, -0.479085],
               [-0.654821, -0.656908, 0.236823],
               [-0.579935, 0.581829, 0.542259],
               [-0.579266, 0.811224, 0.300537],
               [-0.560981, 0.002949, 0.799799],
               [-0.550971, -0.576528, 0.5431],
               [-0.515127, -0.324486, 0.758138],
               [-0.510203, -0.528414, -0.613902],
               [-0.489887, 0.890637, -0.225239],
               [-0.437021, 0.488613, -0.724333],
               [-0.401177, 0.740656, -0.509295],
               [-0.386037, 0.971017, 0.081037],
               [-0.385694, -0.805205, 0.365781],
               [-0.322522, 0.791299, 0.512049],
               [-0.317618, -0.591958, 0.780503],
               [-0.316974, -0.368621, -0.833402],
               [-0.291854, -0.145349, 0.928756],
               [-0.271745, 0.259936, -0.901652],
               [-0.225891, -0.067498, -0.943313],
               [-0.206937, -0.646378, -0.685774],
               [-0.177904, 0.919793, -0.338677],
               [-0.152342, -0.820635, 0.603184],
               [-0.129293, 0.951092, 0.292549],
               [-0.094345, -0.412822, 0.951122],
               [-0.082428, -0.92317, 0.29391],
               [-0.074054, 1.000172, -0.032399],
               [0.002897, 0.829106, 0.573078],
               [0.031522, 0.141972, -0.973523],
               [0.033565, -0.107542, 0.989786],
               [0.06219, -0.794676, -0.556816],
               [0.13914, -0.965743, 0.048662],
               [0.147515, 0.9576, -0.277647],
               [0.173077, -0.782829, 0.664213],
               [0.19438, -0.916662, -0.276286],
               [0.208921, -0.530786, 0.87925],
               [0.242991, -0.885363, 0.354939],
               [0.272024, 0.680808, 0.702036],
               [0.290978, 0.101928, 0.959576],
               [0.336832, -0.225507, 0.917915],
               [0.356941, 0.179778, -0.912493],
               [0.382061, 0.403051, 0.849665],
               [0.387609, -0.75687, -0.495786],
               [0.450781, 0.839635, -0.349518],
               [0.466264, -0.706226, 0.525558],
               [0.502108, -0.454184, 0.740596],
               [0.57529, 0.562844, 0.630165],
               [0.580214, 0.358915, -0.741875],
               [-0.018946, -0.326587, -0.976456],
               [0.616058, 0.610958, -0.526838],
               [0.626068, 0.031481, -0.783536],
               [0.645022, -0.5474, -0.525996],
               [0.238466, -0.117117, -1.006666],
               [0.719908, 0.691337, -0.22056],
               [0.723676, -0.496756, 0.495348],
               [0.736105, -0.246276, -0.635907],
               [0.796859, 0.520271, 0.384917],
               [0.091091, -0.604344, -0.828827],
               [0.852098, 0.569351, 0.059969],
               [0.868294, -0.368263, -0.355377],
               [0.507593, -0.265415, -0.877708],
               [0.916906, -0.336964, 0.275848],
               [0.962135, 0.291594, 0.207599],
               [0.41651, -0.566538, -0.767798],
               [0.972145, -0.287883, -0.0491],
               [1.007989, -0.035841, 0.165937]];
   return poly;
 },
J72: function() {
   const poly = new polyhedron();
   poly.name = "J72";
   poly.faces = [[48, 45, 55],
                [35, 42, 47],
                [23, 18, 31],
                [20, 30, 34],
                [49, 57, 51],
                [59, 54, 53],
                [56, 50, 58],
                [46, 41, 52],
                [39, 40, 28],
                [37, 25, 22],
                [43, 44, 32],
                [38, 24, 26],
                [29, 19, 17],
                [9, 1, 7],
                [11, 13, 3],
                [14, 12, 4],
                [36, 21, 33],
                [15, 16, 27],
                [5, 0, 6],
                [2, 10, 8],
                [36, 33, 45, 48],
                [45, 47, 56, 55],
                [47, 42, 50, 56],
                [23, 31, 42, 35],
                [18, 20, 34, 31],
                [34, 30, 41, 46],
                [48, 55, 57, 49],
                [57, 59, 53, 51],
                [53, 54, 44, 43],
                [58, 52, 54, 59],
                [50, 46, 52, 58],
                [41, 30, 24, 38],
                [49, 51, 40, 39],
                [40, 37, 22, 28],
                [22, 25, 13, 11],
                [43, 32, 25, 37],
                [44, 38, 26, 32],
                [26, 24, 12, 14],
                [39, 28, 19, 29],
                [19, 9, 7, 17],
                [7, 1, 0, 5],
                [11, 3, 1, 9],
                [13, 14, 4, 3],
                [4, 12, 10, 2],
                [29, 17, 21, 36],
                [21, 15, 27, 33],
                [27, 16, 23, 35],
                [5, 6, 16, 15],
                [0, 2, 8, 6],
                [8, 10, 20, 18],
                [33, 27, 35, 47, 45],
                [31, 34, 46, 50, 42],
                [55, 56, 58, 59, 57],
                [52, 41, 38, 44, 54],
                [51, 53, 43, 37, 40],
                [32, 26, 14, 13, 25],
                [28, 22, 11, 9, 19],
                [3, 4, 2, 0, 1],
                [17, 7, 5, 15, 21],
                [6, 8, 18, 23, 16],
                [36, 48, 49, 39, 29],
                [10, 12, 24, 30, 20]];
   poly.vertices = [[-0.976612, 0.213547, -0.025026],
               [-0.942883, -0.134569, -0.304734],
               [-0.917763, 0.061996, 0.392261],
               [-0.863187, -0.501268, -0.060316],
               [-0.847662, -0.379783, 0.37045],
               [-0.806942, 0.483006, -0.339927],
               [-0.791417, 0.60449, 0.090839],
               [-0.773213, 0.13489, -0.619635],
               [-0.732567, 0.452939, 0.508126],
               [-0.703113, -0.306889, -0.641445],
               [-0.652871, 0.086241, 0.752543],
               [-0.623417, -0.673588, -0.397028],
               [-0.582771, -0.355538, 0.730732],
               [-0.564567, -0.825138, 0.020258],
               [-0.549042, -0.703654, 0.451025],
               [-0.47356, 0.76745, -0.432161],
               [-0.458035, 0.888934, -0.001394],
               [-0.418985, 0.204186, -0.884738],
               [-0.362814, 0.643719, 0.673789],
               [-0.348885, -0.237593, -0.906548],
               [-0.283118, 0.277021, 0.918206],
               [-0.23379, 0.595129, -0.768872],
               [-0.219935, -0.830923, -0.511073],
               [-0.193143, 0.913179, 0.358888],
               [-0.169693, -0.437793, 0.882916],
               [-0.161085, -0.982474, -0.093786],
               [-0.135964, -0.785909, 0.603208],
               [-0.103807, 0.95823, -0.266497],
               [-0.050264, -0.561464, -0.825973],
               [-0.015503, 0.04685, -0.998782],
               [0.015502, -0.04685, 0.998781],
               [0.075132, 0.737294, 0.671381],
               [0.103807, -0.958229, 0.266497],
               [0.135964, 0.78591, -0.603209],
               [0.154828, 0.370596, 0.915798],
               [0.161084, 0.982475, 0.093785],
               [0.169693, 0.437794, -0.882917],
               [0.193143, -0.913178, -0.358889],
               [0.233789, -0.595129, 0.768871],
               [0.283118, -0.277021, -0.918207],
               [0.362813, -0.643719, -0.67379],
               [0.418985, -0.204186, 0.884737],
               [0.42936, 0.80659, 0.406278],
               [0.458035, -0.888933, 0.001394],
               [0.47356, -0.767449, 0.43216],
               [0.549042, 0.703655, -0.451025],
               [0.558311, 0.21326, 0.801754],
               [0.564567, 0.825139, -0.020259],
               [0.582771, 0.355539, -0.730733],
               [0.652871, -0.08624, -0.752544],
               [0.727981, 0.48272, 0.486853],
               [0.732567, -0.452939, -0.508127],
               [0.773213, -0.13489, 0.619634],
               [0.791417, -0.60449, -0.09084],
               [0.806942, -0.483006, 0.339926],
               [0.847662, 0.379784, -0.370451],
               [0.863187, 0.501268, 0.060316],
               [0.917763, -0.061995, -0.392261],
               [0.942883, 0.13457, 0.304733],
               [0.976612, -0.213546, 0.025025]];
   return poly;
 },
J73: function() {
   const poly = new polyhedron();
   poly.name = "J73";
   poly.faces = [[36, 33, 44],
                [19, 28, 32],
                [9, 10, 22],
                [20, 34, 29],
                [47, 53, 55],
                [57, 58, 59],
                [43, 41, 51],
                [42, 45, 52],
                [49, 50, 37],
                [40, 27, 31],
                [56, 54, 48],
                [46, 35, 38],
                [39, 30, 25],
                [17, 7, 14],
                [18, 16, 8],
                [26, 23, 15],
                [24, 13, 21],
                [5, 3, 11],
                [1, 2, 0],
                [6, 12, 4],
                [24, 21, 33, 36],
                [33, 32, 43, 44],
                [32, 28, 41, 43],
                [9, 22, 28, 19],
                [10, 20, 29, 22],
                [29, 34, 45, 42],
                [36, 44, 53, 47],
                [53, 57, 59, 55],
                [59, 58, 54, 56],
                [51, 52, 58, 57],
                [41, 42, 52, 51],
                [45, 34, 35, 46],
                [47, 55, 49, 39],
                [50, 40, 31, 37],
                [31, 27, 16, 18],
                [56, 48, 40, 50],
                [54, 46, 38, 48],
                [38, 35, 23, 26],
                [49, 37, 30, 39],
                [30, 17, 14, 25],
                [7, 8, 2, 1],
                [18, 8, 7, 17],
                [27, 26, 15, 16],
                [15, 23, 12, 6],
                [25, 14, 13, 24],
                [13, 5, 11, 21],
                [11, 3, 9, 19],
                [1, 0, 3, 5],
                [2, 6, 4, 0],
                [4, 12, 20, 10],
                [21, 11, 19, 32, 33],
                [22, 29, 42, 41, 28],
                [44, 43, 51, 57, 53],
                [52, 45, 46, 54, 58],
                [55, 59, 56, 50, 49],
                [48, 38, 26, 27, 40],
                [37, 31, 18, 17, 30],
                [16, 15, 6, 2, 8],
                [14, 7, 1, 5, 13],
                [0, 4, 10, 9, 3],
                [24, 36, 47, 39, 25],
                [12, 23, 35, 34, 20]];
   poly.vertices = [[-0.984691, 0.125192, 0.121281],
               [-0.957572, -0.075612, -0.278094],
               [-0.942455, -0.319982, 0.096891],
               [-0.856557, 0.512005, -0.064506],
               [-0.832097, 0.116607, 0.542233],
               [-0.829438, 0.3112, -0.463882],
               [-0.789861, -0.328568, 0.517842],
               [-0.761099, -0.409107, -0.503346],
               [-0.745982, -0.653477, -0.128361],
               [-0.624772, 0.742482, 0.241623],
               [-0.609655, 0.498112, 0.616608],
               [-0.606996, 0.692705, -0.389506],
               [-0.558076, -0.098091, 0.823971],
               [-0.553774, 0.216768, -0.803956],
               [-0.511538, -0.228406, -0.828346],
               [-0.49908, -0.667369, 0.552753],
               [-0.471962, -0.868174, 0.153378],
               [-0.40552, -0.630422, -0.661906],
               [-0.390403, -0.874792, -0.286921],
               [-0.375211, 0.923183, -0.083378],
               [-0.335634, 0.283415, 0.898346],
               [-0.331332, 0.598273, -0.729581],
               [-0.287416, 0.79711, 0.531045],
               [-0.267295, -0.436892, 0.858882],
               [-0.134858, 0.264778, -0.954832],
               [-0.092623, -0.180396, -0.979223],
               [-0.070822, -0.770387, 0.63363],
               [-0.043703, -0.971192, 0.234255],
               [-0.037854, 0.977811, 0.206045],
               [-0.013394, 0.582413, 0.812784],
               [0.013396, -0.582411, -0.812783],
               [0.037856, -0.977809, -0.206044],
               [0.043705, 0.971193, -0.234254],
               [0.070824, 0.770388, -0.63363],
               [0.092624, 0.180397, 0.979223],
               [0.13486, -0.264777, 0.954833],
               [0.267297, 0.436893, -0.858881],
               [0.287417, -0.797109, -0.531044],
               [0.331333, -0.598272, 0.729581],
               [0.335635, -0.283414, -0.898346],
               [0.375212, -0.923181, 0.083378],
               [0.390404, 0.874793, 0.286922],
               [0.405521, 0.630423, 0.661907],
               [0.471963, 0.868175, -0.153377],
               [0.499082, 0.66737, -0.552753],
               [0.511539, 0.228408, 0.828347],
               [0.553775, -0.216766, 0.803957],
               [0.558078, 0.098092, -0.823971],
               [0.606997, -0.692704, 0.389507],
               [0.609656, -0.498111, -0.616607],
               [0.624773, -0.74248, -0.241622],
               [0.745984, 0.653478, 0.128361],
               [0.761101, 0.409108, 0.503346],
               [0.789863, 0.328569, -0.517842],
               [0.82944, -0.311199, 0.463882],
               [0.832099, -0.116605, -0.542232],
               [0.856558, -0.512003, 0.064507],
               [0.942457, 0.319983, -0.09689],
               [0.957574, 0.075614, 0.278095],
               [0.984692, -0.125191, -0.121281]];
   return poly;
 },
J74: function() {
   const poly = new polyhedron();
   poly.name = "J74";
   poly.faces = [[31, 25, 37],
                [13, 23, 24],
                [7, 10, 17],
                [20, 32, 29],
                [48, 54, 56],
                [58, 57, 59],
                [36, 35, 47],
                [41, 44, 52],
                [43, 50, 39],
                [49, 42, 38],
                [55, 53, 46],
                [51, 40, 45],
                [27, 26, 15],
                [18, 12, 8],
                [30, 34, 22],
                [33, 28, 21],
                [19, 9, 14],
                [3, 1, 5],
                [2, 4, 0],
                [11, 16, 6],
                [19, 14, 25, 31],
                [25, 24, 36, 37],
                [24, 23, 35, 36],
                [7, 17, 23, 13],
                [10, 20, 29, 17],
                [29, 32, 44, 41],
                [31, 37, 48, 43],
                [54, 58, 59, 56],
                [59, 57, 53, 55],
                [47, 52, 58, 54],
                [35, 41, 52, 47],
                [44, 32, 40, 51],
                [48, 56, 50, 43],
                [50, 49, 38, 39],
                [42, 46, 34, 30],
                [55, 46, 42, 49],
                [57, 51, 45, 53],
                [45, 40, 28, 33],
                [39, 38, 26, 27],
                [26, 18, 8, 15],
                [8, 12, 4, 2],
                [30, 22, 12, 18],
                [34, 33, 21, 22],
                [21, 28, 16, 11],
                [27, 15, 9, 19],
                [9, 3, 5, 14],
                [5, 1, 7, 13],
                [2, 0, 1, 3],
                [4, 11, 6, 0],
                [6, 16, 20, 10],
                [14, 5, 13, 24, 25],
                [17, 29, 41, 35, 23],
                [37, 36, 47, 54, 48],
                [52, 44, 51, 57, 58],
                [56, 59, 55, 49, 50],
                [53, 45, 33, 34, 46],
                [38, 42, 30, 18, 26],
                [22, 21, 11, 4, 12],
                [15, 8, 2, 3, 9],
                [0, 6, 10, 7, 1],
                [19, 31, 43, 39, 27],
                [16, 28, 40, 32, 20]];
   poly.vertices = [[-0.966046, -0.051368, 0.253213],
               [-0.95229, 0.30466, -0.018105],
               [-0.940892, -0.323, -0.101952],
               [-0.927135, 0.033028, -0.37327],
               [-0.826492, -0.473879, 0.30389],
               [-0.790478, 0.458215, -0.40643],
               [-0.767188, 0.060532, 0.63856],
               [-0.744929, 0.636598, 0.199559],
               [-0.701332, -0.650609, -0.291274],
               [-0.679074, -0.074543, -0.730275],
               [-0.63053, 0.485719, 0.6054],
               [-0.627634, -0.361979, 0.689237],
               [-0.586933, -0.801488, 0.114568],
               [-0.583117, 0.790154, -0.188766],
               [-0.542416, 0.350644, -0.763435],
               [-0.53952, -0.497054, -0.679599],
               [-0.420274, -0.03004, 0.9069],
               [-0.397364, 0.817911, 0.416083],
               [-0.338872, -0.909059, -0.242438],
               [-0.302857, 0.023036, -0.952757],
               [-0.283617, 0.395147, 0.87374],
               [-0.265174, -0.620429, 0.738072],
               [-0.240019, -0.892061, 0.382907],
               [-0.235552, 0.971466, 0.027758],
               [-0.206901, 0.887732, -0.411248],
               [-0.181746, 0.6161, -0.766413],
               [-0.17706, -0.755504, -0.630763],
               [-0.163303, -0.399475, -0.902081],
               [-0.057814, -0.288491, 0.955736],
               [-0.05045, 0.727338, 0.684423],
               [0.008042, -0.999632, 0.025902],
               [0.057813, 0.288491, -0.955736],
               [0.163303, 0.399477, 0.902082],
               [0.181745, -0.616099, 0.766414],
               [0.2069, -0.887731, 0.411249],
               [0.211368, 0.975796, 0.0561],
               [0.240019, 0.892062, -0.382907],
               [0.265173, 0.62043, -0.738072],
               [0.26986, -0.751174, -0.602422],
               [0.283616, -0.395146, -0.873739],
               [0.302857, -0.023034, 0.952758],
               [0.325767, 0.824917, 0.461941],
               [0.384259, -0.902053, -0.19658],
               [0.420273, 0.030041, -0.9069],
               [0.539519, 0.497055, 0.6796],
               [0.542416, -0.350643, 0.763436],
               [0.583117, -0.790152, 0.188767],
               [0.586933, 0.801489, -0.114567],
               [0.627634, 0.36198, -0.689236],
               [0.658347, -0.625824, -0.418238],
               [0.672103, -0.269795, -0.689555],
               [0.679073, 0.074544, 0.730276],
               [0.701332, 0.65061, 0.291275],
               [0.790477, -0.458214, 0.40643],
               [0.826492, 0.473881, -0.303889],
               [0.857205, -0.513923, -0.03289],
               [0.879463, 0.062143, -0.471892],
               [0.927134, -0.033027, 0.37327],
               [0.940891, 0.323002, 0.101953],
               [0.993863, -0.088736, -0.06605]];
   return poly;
 },
J75: function() {
   const poly = new polyhedron();
   poly.name = "J75";
   poly.faces = [[30, 24, 37],
                [14, 28, 26],
                [11, 13, 22],
                [25, 38, 31],
                [48, 56, 55],
                [59, 57, 58],
                [39, 41, 50],
                [43, 49, 54],
                [40, 46, 34],
                [45, 36, 32],
                [53, 52, 44],
                [51, 42, 47],
                [21, 19, 10],
                [27, 15, 16],
                [33, 35, 23],
                [29, 20, 17],
                [18, 8, 12],
                [1, 3, 7],
                [5, 4, 0],
                [6, 9, 2],
                [18, 12, 24, 30],
                [24, 26, 39, 37],
                [26, 28, 41, 39],
                [11, 22, 28, 14],
                [13, 25, 31, 22],
                [31, 38, 49, 43],
                [30, 37, 48, 40],
                [56, 59, 58, 55],
                [58, 57, 52, 53],
                [50, 54, 59, 56],
                [41, 43, 54, 50],
                [49, 38, 42, 51],
                [48, 55, 46, 40],
                [46, 45, 32, 34],
                [36, 44, 33, 27],
                [53, 44, 36, 45],
                [57, 51, 47, 52],
                [47, 42, 29, 35],
                [34, 32, 19, 21],
                [19, 16, 5, 10],
                [16, 15, 4, 5],
                [33, 23, 15, 27],
                [35, 29, 17, 23],
                [17, 20, 9, 6],
                [21, 10, 8, 18],
                [8, 1, 7, 12],
                [7, 3, 11, 14],
                [0, 2, 3, 1],
                [4, 6, 2, 0],
                [9, 20, 25, 13],
                [12, 7, 14, 26, 24],
                [22, 31, 43, 41, 28],
                [37, 39, 50, 56, 48],
                [54, 49, 51, 57, 59],
                [55, 58, 53, 45, 46],
                [52, 47, 35, 33, 44],
                [32, 36, 27, 16, 19],
                [23, 17, 6, 4, 15],
                [10, 5, 0, 1, 8],
                [2, 9, 13, 11, 3],
                [18, 30, 40, 34, 21],
                [20, 29, 42, 38, 25]];
   poly.vertices = [[-0.980376, -0.197048, -0.005857],
               [-0.946332, 0.150802, -0.285858],
               [-0.935804, 0.079716, 0.34339],
               [-0.901759, 0.427566, 0.063389],
               [-0.812124, -0.53251, 0.23851],
               [-0.8048, -0.555655, -0.20867],
               [-0.767552, -0.255746, 0.587757],
               [-0.759203, 0.553784, -0.341957],
               [-0.749715, 0.007177, -0.661721],
               [-0.688108, 0.168923, 0.705672],
               [-0.662244, -0.429437, -0.614016],
               [-0.633023, 0.731755, 0.252621],
               [-0.562586, 0.41016, -0.71782],
               [-0.500979, 0.571905, 0.649573],
               [-0.490467, 0.857973, -0.152725],
               [-0.483464, -0.835984, 0.259599],
               [-0.47614, -0.859129, -0.18758],
               [-0.411344, -0.388171, 0.824694],
               [-0.387011, 0.051553, -0.920632],
               [-0.333584, -0.732911, -0.592926],
               [-0.331901, 0.036498, 0.942608],
               [-0.299539, -0.385062, -0.872928],
               [-0.245677, 0.868112, 0.431306],
               [-0.235768, -0.746778, 0.621881],
               [-0.172335, 0.625585, -0.760884],
               [-0.144772, 0.43948, 0.88651],
               [-0.127762, 0.902348, -0.411637],
               [-0.119933, -0.991554, 0.049356],
               [-0.103121, 0.994331, 0.02596],
               [-0.003241, -0.266976, 0.963698],
               [0.003241, 0.266978, -0.963697],
               [0.11053, 0.735688, 0.668243],
               [0.110728, -0.787329, -0.606508],
               [0.127763, -0.902347, 0.411638],
               [0.144773, -0.439479, -0.886509],
               [0.172335, -0.625583, 0.760885],
               [0.242772, -0.947178, -0.209555],
               [0.271977, 0.571167, -0.774465],
               [0.29954, 0.385063, 0.872928],
               [0.31655, 0.847931, -0.425218],
               [0.331901, -0.036497, -0.942608],
               [0.341191, 0.939913, 0.012379],
               [0.387011, -0.051552, 0.920633],
               [0.473235, 0.780063, 0.409331],
               [0.490467, -0.857972, 0.152726],
               [0.528066, -0.712229, -0.462467],
               [0.562111, -0.364379, -0.742468],
               [0.562587, -0.410159, 0.717821],
               [0.600637, 0.267692, -0.753376],
               [0.662244, 0.429438, 0.614017],
               [0.672757, 0.715506, -0.188282],
               [0.749716, -0.007176, 0.661722],
               [0.759203, -0.553783, 0.341958],
               [0.775762, -0.623022, -0.100185],
               [0.804801, 0.555656, 0.208671],
               [0.830847, -0.06019, -0.553237],
               [0.848333, 0.356899, -0.391094],
               [0.946332, -0.1508, 0.285859],
               [0.96289, -0.22004, -0.156284],
               [0.980377, 0.197049, 0.005858]];
   return poly;
 },
J76: function() {
   const poly = new polyhedron();
   poly.name = "J76";
   poly.faces = [[26, 17, 18],
                [6, 1, 9],
                [3, 5, 0],
                [8, 10, 2],
                [35, 28, 37],
                [23, 24, 34],
                [11, 4, 15],
                [7, 13, 16],
                [44, 46, 52],
                [49, 51, 54],
                [40, 32, 42],
                [27, 25, 36],
                [53, 48, 45],
                [39, 30, 38],
                [29, 21, 19],
                [31, 20, 17, 26],
                [17, 6, 9, 18],
                [9, 1, 4, 11],
                [3, 0, 1, 6],
                [5, 8, 2, 0],
                [2, 10, 13, 7],
                [26, 18, 28, 35],
                [28, 23, 34, 37],
                [34, 24, 32, 40],
                [11, 15, 24, 23],
                [4, 7, 16, 15],
                [16, 13, 25, 27],
                [35, 37, 46, 44],
                [46, 49, 54, 52],
                [54, 51, 48, 53],
                [40, 42, 51, 49],
                [32, 27, 36, 42],
                [36, 25, 30, 39],
                [44, 52, 47, 41],
                [53, 45, 43, 50],
                [48, 39, 38, 45],
                [38, 30, 21, 29],
                [12, 14, 5, 3],
                [33, 29, 19, 22],
                [19, 21, 10, 8],
                [20, 12, 3, 6, 17],
                [0, 2, 7, 4, 1],
                [18, 9, 11, 23, 28],
                [15, 16, 27, 32, 24],
                [37, 34, 40, 49, 46],
                [42, 36, 39, 48, 51],
                [52, 54, 53, 50, 47],
                [45, 38, 29, 33, 43],
                [22, 19, 8, 5, 14],
                [31, 26, 35, 44, 41],
                [21, 30, 25, 13, 10],
                [41, 47, 50, 43, 33, 22, 14, 12, 20, 31]];
   poly.vertices = [[-0.975594, -0.152802, -0.163647],
               [-0.930864, 0.290583, -0.105382],
               [-0.885816, -0.354103, 0.228021],
               [-0.840234, -0.110417, -0.590106],
               [-0.813441, 0.363309, 0.322296],
               [-0.812393, -0.508854, -0.384052],
               [-0.795504, 0.332968, -0.531841],
               [-0.7856, -0.035128, 0.52835],
               [-0.722614, -0.710155, 0.007616],
               [-0.695288, 0.651943, -0.231511],
               [-0.605191, -0.637428, 0.435294],
               [-0.577865, 0.724669, 0.196167],
               [-0.531438, -0.243136, -0.888462],
               [-0.504975, -0.318454, 0.735624],
               [-0.503596, -0.641573, -0.682408],
               [-0.488086, 0.523369, 0.587835],
               [-0.460245, 0.124931, 0.79389],
               [-0.459063, 0.474276, -0.794187],
               [-0.358847, 0.793251, -0.493857],
               [-0.358332, -0.967284, -0.048676],
               [-0.295861, 0.118224, -1.014591],
               [-0.240909, -0.894558, 0.379002],
               [-0.222972, -0.924899, -0.475135],
               [-0.168853, 0.910925, 0.19814],
               [-0.079074, 0.709624, 0.589809],
               [-0.078756, -0.378446, 0.864946],
               [-0.050051, 0.660532, -0.792214],
               [-0.034026, 0.064939, 0.923211],
               [-0.033492, 0.95331, -0.228318],
               [0.067887, -1.027277, 0.080646],
               [0.084446, -0.734498, 0.644541],
               [0.113151, 0.30448, -1.012618],
               [0.201551, 0.426299, 0.797082],
               [0.203247, -0.984891, -0.345813],
               [0.257366, 0.850932, 0.327462],
               [0.275304, 0.820591, -0.526675],
               [0.330256, -0.192191, 0.866919],
               [0.392727, 0.893318, -0.098997],
               [0.393242, -0.867217, 0.346185],
               [0.493458, -0.548243, 0.646514],
               [0.537991, 0.567607, 0.534736],
               [0.53937, 0.244487, -0.883296],
               [0.565833, 0.169169, 0.74079],
               [0.61226, -0.798636, -0.34384],
               [0.639586, 0.563462, -0.582967],
               [0.729683, -0.725909, 0.083838],
               [0.757009, 0.636188, -0.155289],
               [0.819995, -0.038838, -0.676023],
               [0.829899, -0.406935, 0.384168],
               [0.846787, 0.434888, 0.236379],
               [0.847836, -0.437276, -0.469969],
               [0.874629, 0.03645, 0.442434],
               [0.920211, 0.280136, -0.375693],
               [0.965259, -0.364549, -0.042291],
               [1.009989, 0.078836, 0.015975]];
   return poly;
 },
J77: function() {
   const poly = new polyhedron();
   poly.name = "J77";
   poly.faces = [[27, 16, 19],
                [7, 1, 9],
                [5, 6, 0],
                [8, 10, 2],
                [36, 26, 38],
                [11, 18, 24],
                [3, 4, 12],
                [13, 25, 20],
                [44, 46, 52],
                [48, 49, 54],
                [34, 30, 40],
                [31, 35, 41],
                [53, 47, 45],
                [39, 28, 37],
                [29, 21, 17],
                [32, 22, 16, 27],
                [16, 7, 9, 19],
                [9, 1, 3, 11],
                [5, 0, 1, 7],
                [6, 8, 2, 0],
                [2, 10, 13, 4],
                [27, 19, 26, 36],
                [26, 24, 34, 38],
                [24, 18, 30, 34],
                [3, 12, 18, 11],
                [4, 13, 20, 12],
                [20, 25, 35, 31],
                [36, 38, 46, 44],
                [46, 48, 54, 52],
                [54, 49, 47, 53],
                [40, 41, 49, 48],
                [30, 31, 41, 40],
                [35, 25, 28, 39],
                [44, 52, 50, 42],
                [53, 45, 43, 51],
                [47, 39, 37, 45],
                [37, 28, 21, 29],
                [14, 15, 6, 5],
                [33, 29, 17, 23],
                [17, 21, 10, 8],
                [22, 14, 5, 7, 16],
                [0, 2, 4, 3, 1],
                [19, 9, 11, 24, 26],
                [12, 20, 31, 30, 18],
                [38, 34, 40, 48, 46],
                [41, 35, 39, 47, 49],
                [52, 54, 53, 51, 50],
                [45, 37, 29, 33, 43],
                [23, 17, 8, 6, 15],
                [32, 27, 36, 44, 42],
                [21, 28, 25, 13, 10],
                [42, 50, 51, 43, 33, 23, 15, 14, 22, 32]];
   poly.vertices = [[-0.965273, -0.178368, -0.195819],
               [-0.921193, 0.268836, -0.202934],
               [-0.899923, -0.317663, 0.226452],
               [-0.828599, 0.405929, 0.214939],
               [-0.815454, 0.043453, 0.480314],
               [-0.804857, -0.20085, -0.615041],
               [-0.791711, -0.563327, -0.349666],
               [-0.760776, 0.246354, -0.622156],
               [-0.726361, -0.702622, 0.072605],
               [-0.676307, 0.60747, -0.368293],
               [-0.633767, -0.565529, 0.490477],
               [-0.583713, 0.744563, 0.049579],
               [-0.582414, 0.411487, 0.590902],
               [-0.549298, -0.204413, 0.74434],
               [-0.479947, -0.376522, -0.871086],
               [-0.466801, -0.738998, -0.605711],
               [-0.408623, 0.347071, -0.882598],
               [-0.361062, -0.964382, 0.077537],
               [-0.337528, 0.750121, 0.425542],
               [-0.324153, 0.708187, -0.628736],
               [-0.316259, 0.163621, 0.854928],
               [-0.268468, -0.827289, 0.49541],
               [-0.235061, -0.037888, -1.036445],
               [-0.200645, -0.986864, -0.341685],
               [-0.174334, 0.930008, 0.047397],
               [-0.131794, -0.242991, 0.906168],
               [-0.013917, 0.907526, -0.371825],
               [0.000756, 0.532515, -0.88478],
               [0.041768, -0.62795, 0.752321],
               [0.056442, -1.00296, 0.239365],
               [0.079975, 0.711542, 0.58737],
               [0.093121, 0.349066, 0.852745],
               [0.174319, 0.147557, -1.038628],
               [0.216858, -1.025442, -0.179857],
               [0.24317, 0.89143, 0.209225],
               [0.277585, -0.057546, 0.903985],
               [0.310993, 0.731855, -0.62787],
               [0.366678, -0.803621, 0.496276],
               [0.403586, 0.868948, -0.209997],
               [0.451147, -0.442505, 0.750138],
               [0.509326, 0.643564, 0.473251],
               [0.522471, 0.281088, 0.738626],
               [0.591822, 0.108979, -0.8768],
               [0.626237, -0.839998, -0.182039],
               [0.676292, 0.470095, -0.622937],
               [0.718831, -0.702904, 0.235834],
               [0.768885, 0.607188, -0.205064],
               [0.8033, -0.341788, 0.489696],
               [0.834235, 0.467893, 0.217206],
               [0.847381, 0.105416, 0.482581],
               [0.857978, -0.138887, -0.612774],
               [0.871123, -0.501364, -0.347399],
               [0.942447, 0.222229, -0.358911],
               [0.963717, -0.36427, 0.070474],
               [1.007798, 0.082934, 0.063359]];
   return poly;
 },
J78: function() {
   const poly = new polyhedron();
   poly.name = "J78";
   poly.faces = [[29, 19, 26],
                [10, 6, 16],
                [4, 1, 0],
                [3, 5, 2],
                [40, 35, 44],
                [30, 32, 41],
                [20, 11, 22],
                [7, 13, 17],
                [49, 51, 52],
                [45, 48, 53],
                [36, 27, 37],
                [23, 25, 33],
                [54, 50, 47],
                [39, 28, 38],
                [18, 15, 9],
                [31, 21, 19, 29],
                [19, 10, 16, 26],
                [16, 6, 11, 20],
                [4, 0, 6, 10],
                [1, 3, 2, 0],
                [2, 5, 13, 7],
                [29, 26, 35, 40],
                [35, 30, 41, 44],
                [41, 32, 36, 45],
                [20, 22, 32, 30],
                [11, 7, 17, 22],
                [17, 13, 23, 27],
                [40, 44, 51, 49],
                [51, 53, 54, 52],
                [53, 48, 50, 54],
                [36, 37, 48, 45],
                [27, 23, 33, 37],
                [33, 25, 28, 39],
                [49, 52, 46, 42],
                [47, 38, 34, 43],
                [50, 39, 38, 47],
                [28, 25, 15, 18],
                [12, 8, 1, 4],
                [24, 18, 9, 14],
                [9, 15, 5, 3],
                [21, 12, 4, 10, 19],
                [0, 2, 7, 11, 6],
                [26, 16, 20, 30, 35],
                [22, 17, 27, 36, 32],
                [44, 41, 45, 53, 51],
                [37, 33, 39, 50, 48],
                [52, 54, 47, 43, 46],
                [38, 28, 18, 24, 34],
                [14, 9, 3, 1, 8],
                [31, 29, 40, 49, 42],
                [15, 25, 23, 13, 5],
                [42, 46, 43, 34, 24, 14, 8, 12, 21, 31]];
   poly.vertices = [[-0.969175, 0.215371, -0.127391],
               [-0.952173, -0.166819, -0.363246],
               [-0.946899, -0.019645, 0.255045],
               [-0.929897, -0.401835, 0.01919],
               [-0.840084, 0.222491, -0.557822],
               [-0.781766, -0.392789, 0.443408],
               [-0.765536, 0.610272, -0.059785],
               [-0.729493, 0.230008, 0.559009],
               [-0.721025, -0.390315, -0.677262],
               [-0.684982, -0.770578, -0.058468],
               [-0.636445, 0.617392, -0.490216],
               [-0.617404, 0.619318, 0.364433],
               [-0.608936, -0.001005, -0.871838],
               [-0.56436, -0.143136, 0.747372],
               [-0.555892, -0.763458, -0.488899],
               [-0.536851, -0.761533, 0.36575],
               [-0.419039, 0.867044, -0.186253],
               [-0.360721, 0.251764, 0.814977],
               [-0.305703, -0.985028, 0.051734],
               [-0.279442, 0.637958, -0.76245],
               [-0.270908, 0.87609, 0.237966],
               [-0.26244, 0.255768, -0.998305],
               [-0.248632, 0.641074, 0.620402],
               [-0.185081, -0.357586, 0.857574],
               [-0.176613, -0.977908, -0.378698],
               [-0.168079, -0.739776, 0.621718],
               [-0.062036, 0.887611, -0.458486],
               [0.018558, 0.037315, 0.925179],
               [0.063069, -0.963271, 0.307702],
               [0.169112, 0.664116, -0.772503],
               [0.177646, 0.902248, 0.227913],
               [0.186114, 0.281925, -1.008358],
               [0.199922, 0.667232, 0.610349],
               [0.211888, -0.546211, 0.763647],
               [0.271941, -0.951751, -0.38875],
               [0.306736, 0.909368, -0.202518],
               [0.365054, 0.294088, 0.798712],
               [0.415527, -0.151311, 0.831252],
               [0.420072, -0.942705, 0.035468],
               [0.443036, -0.769707, 0.44963],
               [0.537884, 0.685872, -0.516534],
               [0.556925, 0.687798, 0.338115],
               [0.565393, 0.067476, -0.898156],
               [0.618437, -0.694978, -0.515217],
               [0.686015, 0.694918, -0.092316],
               [0.722058, 0.314654, 0.526478],
               [0.730526, -0.305668, -0.709793],
               [0.766569, -0.685932, -0.090999],
               [0.77253, -0.130744, 0.559019],
               [0.782799, 0.317129, -0.594192],
               [0.789532, -0.512934, 0.323163],
               [0.93093, 0.326175, -0.169974],
               [0.947932, -0.056015, -0.405829],
               [0.953206, 0.091159, 0.212462],
               [0.970208, -0.291031, -0.023393]];
   return poly;
 },
J79: function() {
   const poly = new polyhedron();
   poly.name = "J79";
   poly.faces = [[7, 17, 16],
                [30, 41, 28],
                [18, 25, 31],
                [37, 47, 42],
                [4, 11, 6],
                [23, 27, 15],
                [34, 44, 40],
                [50, 53, 51],
                [5, 12, 8],
                [35, 36, 24],
                [45, 52, 46],
                [54, 48, 49],
                [19, 29, 20],
                [39, 38, 26],
                [33, 43, 32],
                [0, 2, 7, 4],
                [17, 30, 28, 16],
                [28, 41, 44, 34],
                [18, 31, 30, 17],
                [25, 37, 42, 31],
                [42, 47, 53, 50],
                [7, 16, 11, 4],
                [11, 23, 15, 6],
                [27, 40, 45, 35],
                [34, 40, 27, 23],
                [41, 50, 51, 44],
                [51, 53, 54, 52],
                [6, 15, 12, 5],
                [12, 24, 19, 8],
                [24, 36, 29, 19],
                [45, 46, 36, 35],
                [52, 54, 49, 46],
                [49, 48, 38, 39],
                [5, 8, 3, 1],
                [20, 26, 14, 10],
                [29, 39, 26, 20],
                [38, 48, 43, 33],
                [9, 13, 25, 18],
                [22, 33, 32, 21],
                [32, 43, 47, 37],
                [2, 9, 18, 17, 7],
                [31, 42, 50, 41, 30],
                [16, 28, 34, 23, 11],
                [44, 51, 52, 45, 40],
                [15, 27, 35, 24, 12],
                [46, 49, 39, 29, 36],
                [8, 19, 20, 10, 3],
                [26, 38, 33, 22, 14],
                [21, 32, 37, 25, 13],
                [0, 4, 6, 5, 1],
                [43, 48, 54, 53, 47],
                [1, 3, 10, 14, 22, 21, 13, 9, 2, 0]];
   poly.vertices = [[-1.035663, 0.17951, 0.161516],
               [-1.027893, 0.048482, -0.268318],
               [-0.891113, 0.078842, 0.574986],
               [-0.870771, -0.264193, -0.550334],
               [-0.833419, 0.579967, 0.188311],
               [-0.820848, 0.367959, -0.507174],
               [-0.700657, 0.696435, -0.224962],
               [-0.68887, 0.479299, 0.601781],
               [-0.663727, 0.055284, -0.78919],
               [-0.649458, -0.215069, 0.814161],
               [-0.624314, -0.639084, -0.576811],
               [-0.485083, 0.858791, 0.134418],
               [-0.461483, 0.455741, -0.762395],
               [-0.403, -0.58996, 0.787683],
               [-0.382659, -0.932996, -0.337637],
               [-0.341293, 0.784217, -0.480183],
               [-0.340534, 0.758124, 0.547888],
               [-0.322222, 0.432884, 0.857516],
               [-0.297863, 0.00374, 0.988774],
               [-0.289308, -0.122159, -0.96329],
               [-0.26495, -0.551303, -0.832032],
               [-0.245879, -0.902636, 0.505667],
               [-0.238109, -1.033664, 0.075833],
               [-0.125719, 0.946573, -0.120803],
               [-0.087065, 0.278298, -0.936494],
               [-0.051406, -0.371151, 0.962296],
               [-0.023294, -0.845214, -0.592857],
               [0.107408, 0.809782, -0.479865],
               [0.108167, 0.783689, 0.548206],
               [0.110226, -0.32589, -0.934099],
               [0.126479, 0.458449, 0.857834],
               [0.150837, 0.029306, 0.989092],
               [0.202822, -0.87707, 0.505985],
               [0.210592, -1.008098, 0.076151],
               [0.24093, 0.900157, 0.134932],
               [0.264529, 0.497107, -0.761881],
               [0.312469, 0.074567, -0.907304],
               [0.323013, -0.548594, 0.788197],
               [0.343354, -0.89163, -0.337123],
               [0.351882, -0.619801, -0.694925],
               [0.474057, 0.763367, -0.224131],
               [0.485843, 0.546231, 0.602613],
               [0.525256, -0.148138, 0.814992],
               [0.562186, -0.789288, 0.250764],
               [0.618606, 0.662699, 0.189339],
               [0.631178, 0.450691, -0.506147],
               [0.679118, 0.028151, -0.651569],
               [0.682377, -0.460813, 0.532976],
               [0.694949, -0.672821, -0.16251],
               [0.703476, -0.400992, -0.520312],
               [0.7323, 0.17134, 0.576135],
               [0.865063, 0.287808, 0.162862],
               [0.872833, 0.15678, -0.266972],
               [0.889422, -0.141336, 0.29412],
               [0.897192, -0.272364, -0.135714]];
   return poly;
 },
J80: function() {
   const poly = new polyhedron();
   poly.name = "J80";
   poly.faces = [[12, 10, 4],
                [8, 6, 2],
                [16, 26, 14],
                [31, 29, 17],
                [11, 3, 9],
                [20, 18, 32],
                [23, 33, 35],
                [43, 41, 47],
                [39, 37, 45],
                [46, 38, 40],
                [22, 19, 10, 12],
                [10, 8, 2, 4],
                [2, 6, 5, 0],
                [16, 14, 6, 8],
                [26, 31, 17, 14],
                [17, 29, 21, 13],
                [12, 4, 3, 11],
                [3, 1, 7, 9],
                [11, 9, 18, 20],
                [18, 23, 35, 32],
                [35, 33, 41, 43],
                [15, 24, 33, 23],
                [30, 27, 37, 39],
                [20, 32, 36, 28],
                [43, 47, 49, 44],
                [41, 39, 45, 47],
                [45, 37, 38, 46],
                [25, 34, 26, 16],
                [48, 46, 40, 42],
                [40, 38, 29, 31],
                [19, 25, 16, 8, 10],
                [14, 17, 13, 5, 6],
                [4, 2, 0, 1, 3],
                [9, 7, 15, 23, 18],
                [24, 30, 39, 41, 33],
                [32, 35, 43, 44, 36],
                [47, 45, 46, 48, 49],
                [42, 40, 31, 26, 34],
                [22, 12, 11, 20, 28],
                [38, 37, 27, 21, 29],
                [24, 15, 7, 1, 0, 5, 13, 21, 27, 30],
                [28, 36, 44, 49, 48, 42, 34, 25, 19, 22]];
   poly.vertices = [[-0.981435, -0.157408, -0.109585],
               [-0.942153, -0.069788, 0.327838],
               [-0.91551, 0.22466, -0.333721],
               [-0.85195, 0.366431, 0.374044],
               [-0.835484, 0.54841, -0.034822],
               [-0.80426, -0.38784, -0.450273],
               [-0.738335, -0.005772, -0.67441],
               [-0.701418, -0.15845, 0.694914],
               [-0.648132, 0.430447, -0.628204],
               [-0.611216, 0.27777, 0.74112],
               [-0.568107, 0.754197, -0.329305],
               [-0.545291, 0.659837, 0.516984],
               [-0.528825, 0.841816, 0.108118],
               [-0.478303, -0.673069, -0.564096],
               [-0.371634, -0.05487, -0.926756],
               [-0.351184, -0.389527, 0.851433],
               [-0.281432, 0.381349, -0.88055],
               [-0.210926, -0.467282, -0.858579],
               [-0.205234, 0.316291, 0.926196],
               [-0.151948, 0.905188, -0.396922],
               [-0.139309, 0.698359, 0.70206],
               [-0.128068, -0.904145, -0.407577],
               [-0.112666, 0.992807, 0.040501],
               [-0.044525, -0.09612, 0.994373],
               [-0.025227, -0.674755, 0.73761],
               [0.025227, 0.674755, -0.73761],
               [0.044525, 0.096121, -0.994373],
               [0.112666, -0.992807, -0.040501],
               [0.128068, 0.904146, 0.407577],
               [0.139309, -0.698358, -0.70206],
               [0.151948, -0.905188, 0.396922],
               [0.205234, -0.316291, -0.926196],
               [0.210926, 0.467282, 0.858579],
               [0.281432, -0.381349, 0.88055],
               [0.351184, 0.389527, -0.851433],
               [0.371634, 0.05487, 0.926756],
               [0.478303, 0.673069, 0.564096],
               [0.528825, -0.841816, -0.108118],
               [0.545291, -0.659837, -0.516984],
               [0.568107, -0.754197, 0.329305],
               [0.611216, -0.277769, -0.74112],
               [0.648133, -0.430447, 0.628204],
               [0.701419, 0.15845, -0.694914],
               [0.738335, 0.005773, 0.67441],
               [0.80426, 0.387841, 0.450273],
               [0.835484, -0.54841, 0.034822],
               [0.85195, -0.366431, -0.374044],
               [0.91551, -0.22466, 0.333721],
               [0.942153, 0.069789, -0.327838],
               [0.981435, 0.157408, 0.109585]];
   return poly;
 },
J81: function() {
   const poly = new polyhedron();
   poly.name = "J81";
   poly.faces = [[35, 29, 25],
                [21, 11, 15],
                [24, 22, 14],
                [17, 12, 8],
                [33, 23, 27],
                [13, 7, 16],
                [6, 3, 2],
                [1, 4, 0],
                [42, 36, 45],
                [30, 19, 26],
                [44, 39, 29, 35],
                [29, 21, 15, 25],
                [15, 11, 3, 6],
                [24, 14, 11, 21],
                [22, 17, 8, 14],
                [8, 12, 4, 1],
                [35, 25, 23, 33],
                [23, 13, 16, 27],
                [16, 7, 10, 20],
                [6, 2, 7, 13],
                [3, 1, 0, 2],
                [0, 4, 9, 5],
                [33, 27, 36, 42],
                [36, 31, 40, 45],
                [42, 45, 49, 47],
                [43, 38, 46, 48],
                [28, 18, 19, 30],
                [34, 32, 22, 24],
                [41, 30, 26, 37],
                [26, 19, 12, 17],
                [39, 34, 24, 21, 29],
                [14, 8, 1, 3, 11],
                [25, 15, 6, 13, 23],
                [2, 0, 5, 10, 7],
                [27, 16, 20, 31, 36],
                [45, 40, 43, 48, 49],
                [38, 28, 30, 41, 46],
                [37, 26, 17, 22, 32],
                [44, 35, 33, 42, 47],
                [19, 18, 9, 4, 12],
                [38, 43, 40, 31, 20, 10, 5, 9, 18, 28],
                [47, 49, 48, 46, 41, 37, 32, 34, 39, 44]];
   poly.vertices = [[-0.91554, -0.17156, 0.190699],
               [-0.874123, -0.21861, -0.254883],
               [-0.873513, 0.274357, 0.14752],
               [-0.832096, 0.227307, -0.298062],
               [-0.790984, -0.567471, 0.016881],
               [-0.738991, -0.290113, 0.587244],
               [-0.680957, 0.599954, -0.096163],
               [-0.670991, 0.431396, 0.517379],
               [-0.630562, -0.413291, -0.579305],
               [-0.614436, -0.686024, 0.413427],
               [-0.587852, 0.082534, 0.789144],
               [-0.562561, 0.308217, -0.64917],
               [-0.547423, -0.762153, -0.30754],
               [-0.478435, 0.756993, 0.273697],
               [-0.438006, -0.087694, -0.822987],
               [-0.411421, 0.680864, -0.44727],
               [-0.301886, 0.63844, 0.670242],
               [-0.277887, -0.681242, -0.658648],
               [-0.261761, -0.953976, 0.334084],
               [-0.220345, -1.001026, -0.111498],
               [-0.218747, 0.289578, 0.942007],
               [-0.16786, 0.486183, -0.771692],
               [-0.085331, -0.355646, -0.90233],
               [-0.083733, 0.934958, 0.151175],
               [-0.043304, 0.090271, -0.945509],
               [-0.042317, 0.887908, -0.294407],
               [0.049191, -0.920115, -0.462606],
               [0.092815, 0.816405, 0.54772],
               [0.184323, -0.991618, 0.379522],
               [0.201245, 0.693227, -0.618829],
               [0.225739, -1.038668, -0.06606],
               [0.227337, 0.251936, 0.987445],
               [0.360753, -0.393288, -0.856892],
               [0.362351, 0.897316, 0.196613],
               [0.40278, 0.052629, -0.900071],
               [0.403767, 0.850266, -0.24897],
               [0.419893, 0.577533, 0.743762],
               [0.443892, -0.74215, -0.585128],
               [0.553427, -0.784574, 0.532385],
               [0.553919, 0.425276, -0.698172],
               [0.580011, -0.016016, 0.908102],
               [0.62044, -0.860702, -0.188582],
               [0.689428, 0.658443, 0.392655],
               [0.704567, -0.411927, 0.734284],
               [0.756442, 0.582315, -0.328312],
               [0.772567, 0.309582, 0.664419],
               [0.822963, -0.703664, 0.181277],
               [0.93299, 0.463762, 0.068233],
               [0.974102, -0.331017, 0.383177],
               [1.016129, 0.1149, 0.339998]];
   return poly;
 },
J82: function() {
   const poly = new polyhedron();
   poly.name = "J82";
   poly.faces = [[25, 23, 15],
                [27, 16, 19],
                [30, 28, 20],
                [21, 13, 12],
                [22, 11, 17],
                [3, 2, 8],
                [9, 6, 1],
                [4, 5, 0],
                [32, 26, 37],
                [42, 31, 38],
                [36, 33, 23, 25],
                [23, 19, 9, 15],
                [19, 16, 6, 9],
                [30, 20, 16, 27],
                [28, 21, 12, 20],
                [12, 13, 5, 4],
                [25, 15, 11, 22],
                [11, 3, 8, 17],
                [8, 2, 7, 14],
                [1, 0, 2, 3],
                [6, 4, 0, 1],
                [5, 13, 18, 10],
                [22, 17, 26, 32],
                [26, 24, 34, 37],
                [32, 37, 46, 41],
                [43, 44, 49, 48],
                [39, 29, 31, 42],
                [35, 40, 30, 27],
                [47, 42, 38, 45],
                [38, 31, 21, 28],
                [33, 35, 27, 19, 23],
                [20, 12, 4, 6, 16],
                [15, 9, 1, 3, 11],
                [0, 5, 10, 7, 2],
                [17, 8, 14, 24, 26],
                [37, 34, 43, 48, 46],
                [44, 39, 42, 47, 49],
                [45, 38, 28, 30, 40],
                [36, 25, 22, 32, 41],
                [31, 29, 18, 13, 21],
                [44, 43, 34, 24, 14, 7, 10, 18, 29, 39],
                [41, 46, 48, 49, 47, 45, 40, 35, 33, 36]];
   poly.vertices = [[-0.915244, -0.149547, 0.004878],
               [-0.857812, 0.261033, -0.170045],
               [-0.853796, 0.017864, 0.418001],
               [-0.796364, 0.428444, 0.243078],
               [-0.772518, -0.333547, -0.380149],
               [-0.759676, -0.571754, 0.001381],
               [-0.715086, 0.077033, -0.555071],
               [-0.660252, -0.300878, 0.669827],
               [-0.638771, 0.334916, 0.65404],
               [-0.609317, 0.503159, -0.456572],
               [-0.602083, -0.665282, 0.412342],
               [-0.509893, 0.774035, 0.211875],
               [-0.463372, -0.606112, -0.56073],
               [-0.45053, -0.844319, -0.1792],
               [-0.445227, 0.016174, 0.905866],
               [-0.394292, 0.820211, -0.220533],
               [-0.370445, 0.05822, -0.84376],
               [-0.3523, 0.680507, 0.622836],
               [-0.292937, -0.937847, 0.231761],
               [-0.264676, 0.484346, -0.745261],
               [-0.214877, -0.363987, -0.847257],
               [-0.105889, -0.863132, -0.467889],
               [-0.103806, 0.922633, 0.336308],
               [-0.049651, 0.801399, -0.509222],
               [-0.039139, 0.164772, 1.0303],
               [0.011796, 0.968809, -0.096099],
               [0.018293, 0.575352, 0.855378],
               [0.04447, 0.211781, -0.925842],
               [0.142605, -0.621006, -0.754417],
               [0.149102, -1.014463, 0.197061],
               [0.200037, -0.210426, -0.929339],
               [0.264704, -0.968287, -0.235347],
               [0.266787, 0.817478, 0.56885],
               [0.392388, 0.724782, -0.543923],
               [0.4029, 0.088156, 0.9956],
               [0.450558, 0.360379, -0.801408],
               [0.453835, 0.892193, -0.1308],
               [0.460331, 0.498736, 0.820677],
               [0.513198, -0.726161, -0.521875],
               [0.55519, -0.865866, 0.321494],
               [0.606125, -0.061828, -0.804905],
               [0.611428, 0.798665, 0.280161],
               [0.670792, -0.819689, -0.110913],
               [0.712045, -0.18441, 0.815019],
               [0.770215, -0.548813, 0.557534],
               [0.799669, -0.38057, -0.553078],
               [0.804972, 0.479923, 0.531988],
               [0.957263, -0.474098, -0.142117],
               [0.96054, 0.057716, 0.528491],
               [1.01871, -0.306688, 0.271006]];
   return poly;
 },
J83: function() {
   const poly = new polyhedron();
   poly.name = "J83";
   poly.faces = [[25, 27, 17],
                [20, 11, 12],
                [5, 0, 6],
                [26, 18, 28],
                [34, 19, 33],
                [35, 37, 27, 25],
                [27, 21, 13, 17],
                [25, 17, 11, 20],
                [11, 5, 6, 12],
                [6, 0, 2, 8],
                [7, 1, 0, 5],
                [3, 9, 10, 4],
                [20, 12, 18, 26],
                [18, 14, 22, 28],
                [26, 28, 38, 36],
                [30, 32, 42, 40],
                [24, 16, 19, 34],
                [39, 41, 31, 29],
                [44, 34, 33, 43],
                [33, 19, 15, 23],
                [37, 39, 29, 21, 27],
                [17, 13, 7, 5, 11],
                [1, 3, 4, 2, 0],
                [12, 6, 8, 14, 18],
                [28, 22, 30, 40, 38],
                [32, 24, 34, 44, 42],
                [43, 33, 23, 31, 41],
                [35, 25, 20, 26, 36],
                [19, 16, 10, 9, 15],
                [1, 7, 13, 21, 29, 31, 23, 15, 9, 3],
                [32, 30, 22, 14, 8, 2, 4, 10, 16, 24],
                [36, 38, 40, 42, 44, 43, 41, 39, 37, 35]];
   poly.vertices = [[-0.932936, 0.189273, 0.192295],
               [-0.922398, 0.241407, -0.253129],
               [-0.911995, -0.249962, 0.280987],
               [-0.894943, -0.165606, -0.439724],
               [-0.888514, -0.469289, -0.109623],
               [-0.719187, 0.580372, 0.243128],
               [-0.712758, 0.27669, 0.57323],
               [-0.708649, 0.632507, -0.202295],
               [-0.691817, -0.162545, 0.661922],
               [-0.636773, -0.433068, -0.690809],
               [-0.630343, -0.736751, -0.360707],
               [-0.352393, 0.77395, 0.41407],
               [-0.345964, 0.470268, 0.744172],
               [-0.335341, 0.858306, -0.306641],
               [-0.31208, -0.240428, 0.887678],
               [-0.246498, -0.458817, -0.910477],
               [-0.236095, -0.950186, -0.376361],
               [-0.115163, 0.945723, 0.074294],
               [-0.098331, 0.150671, 0.938511],
               [0.001135, -0.778414, -0.716137],
               [0.027344, 0.696067, 0.639826],
               [0.054934, 0.832556, -0.526309],
               [0.082168, -0.453864, 0.872024],
               [0.12681, -0.233018, -1.014822],
               [0.143641, -1.02807, -0.150605],
               [0.264573, 0.867839, 0.30005],
               [0.274976, 0.37647, 0.834165],
               [0.275112, 0.919973, -0.145374],
               [0.295917, -0.062764, 0.922857],
               [0.313104, 0.565095, -0.777393],
               [0.340339, -0.721326, 0.620939],
               [0.340559, 0.158081, -0.963989],
               [0.36382, -0.940653, 0.23033],
               [0.374442, -0.552615, -0.820483],
               [0.380871, -0.856297, -0.490381],
               [0.658822, 0.654404, 0.284396],
               [0.665251, 0.350721, 0.614498],
               [0.66936, 0.706538, -0.161028],
               [0.686192, -0.088513, 0.703189],
               [0.692841, 0.487211, -0.551637],
               [0.713646, -0.495527, 0.516594],
               [0.720295, 0.080198, -0.738233],
               [0.737127, -0.714854, 0.125984],
               [0.741236, -0.359037, -0.649541],
               [0.747665, -0.662719, -0.31944]];
   return poly;
 },
J84: function() {
   const poly = new polyhedron();
   poly.name = "J84";
   poly.faces = [[6, 7, 3],
                [3, 7, 5],
                [3, 5, 1],
                [4, 7, 6],
                [7, 4, 5],
                [5, 4, 1],
                [4, 2, 1],
                [1, 2, 0],
                [1, 0, 3],
                [6, 2, 4],
                [2, 6, 0],
                [0, 6, 3]];
   poly.vertices = [[-0.768016, 0.559678, 0.635844],
               [-0.720709, -0.093633, -0.405339],
               [-0.6358, -0.662351, 0.681929],
               [0.09848, 0.800885, -0.202562],
               [0.269587, -0.77416, -0.143135],
               [0.285934, -0.010665, -1.107297],
               [0.352377, 0.066396, 0.750712],
               [1.118151, 0.11385, -0.210152]];
   return poly;
 },
J85: function() {
   const poly = new polyhedron();
   poly.name = "J85";
   poly.faces = [[13, 9, 14],
                [9, 13, 6],
                [9, 6, 3],
                [11, 15, 12],
                [15, 11, 13],
                [15, 13, 14],
                [4, 7, 1],
                [7, 4, 11],
                [7, 11, 12],
                [6, 0, 3],
                [0, 6, 4],
                [0, 4, 1],
                [2, 3, 0],
                [3, 2, 8],
                [3, 8, 9],
                [5, 1, 7],
                [1, 5, 2],
                [1, 2, 0],
                [10, 12, 15],
                [12, 10, 5],
                [12, 5, 7],
                [8, 14, 9],
                [14, 8, 10],
                [14, 10, 15],
                [13, 11, 4, 6],
                [2, 5, 10, 8]];
   poly.vertices = [[-0.984789, 0.388776, -0.318546],
               [-0.905986, -0.50645, -0.380955],
               [-0.774402, -0.096785, 0.410496],
               [-0.648503, 0.795226, 0.411689],
               [-0.32762, 0.028199, -0.818195],
               [-0.278924, -0.81528, 0.187334],
               [-0.177548, 0.78687, -0.356208],
               [-0.134682, -0.843968, -0.701432],
               [-0.06669, 0.257644, 0.840681],
               [0.229454, 0.996879, 0.419536],
               [0.428788, -0.460851, 0.617519],
               [0.523163, -0.229235, -0.671807],
               [0.55373, -0.948137, -0.129793],
               [0.673235, 0.529435, -0.20982],
               [0.811213, 0.353538, 0.662851],
               [1.079561, -0.235865, 0.03665]];
   return poly;
 },
J86: function() {
   const poly = new polyhedron();
   poly.name = "J86";
   poly.faces = [[7, 3, 2],
                [2, 1, 6],
                [2, 3, 0],
                [2, 0, 1],
                [1, 5, 6],
                [6, 5, 9],
                [3, 4, 0],
                [4, 3, 8],
                [9, 7, 6],
                [9, 8, 7],
                [7, 8, 3],
                [6, 7, 2],
                [1, 0, 4, 5],
                [5, 4, 8, 9]];
   poly.vertices = [[-1.10165, -0.110367, -0.010645],
               [-0.640942, 0.825699, 0.365159],
               [-0.414409, 0.468967, -0.660083],
               [-0.324965, -0.634882, -0.603383],
               [-0.317654, -0.702618, 0.503439],
               [0.143053, 0.233445, 0.879242],
               [0.402426, 0.84303, -0.010043],
               [0.585642, -0.008843, -0.69593],
               [0.603895, -0.925247, -0.07178],
               [1.064602, 0.010817, 0.304023]];
   return poly;
 },
J87: function() {
   const poly = new polyhedron();
   poly.name = "J87";
   poly.faces = [[5, 0, 1],
                [9, 3, 8],
                [8, 6, 10],
                [8, 3, 2],
                [8, 2, 6],
                [6, 5, 10],
                [10, 5, 7],
                [3, 1, 2],
                [1, 3, 4],
                [7, 9, 10],
                [7, 4, 9],
                [9, 4, 3],
                [10, 9, 8],
                [6, 0, 5],
                [6, 2, 0],
                [0, 2, 1],
                [5, 1, 4, 7]];
   poly.vertices = [[-0.858193, -0.792464, 0.432564],
               [-0.785643, 0.057917, -0.211154],
               [-0.533044, 0.147795, 0.823687],
               [-0.229952, 0.904287, 0.131849],
               [-0.212337, 0.637025, -0.903062],
               [-0.091064, -0.748583, -0.310653],
               [0.161537, -0.658707, 0.724189],
               [0.482242, -0.169476, -1.002562],
               [0.505859, 0.352206, 0.676436],
               [0.693906, 0.639069, -0.336051],
               [0.86669, -0.369064, -0.025245]];
   return poly;
 },
J88: function() {
   const poly = new polyhedron();
   poly.name = "J88";
   poly.faces = [[6, 7, 10],
                [3, 7, 1],
                [3, 5, 7],
                [10, 11, 8],
                [10, 9, 11],
                [1, 7, 6],
                [6, 10, 8],
                [2, 4, 0],
                [11, 4, 8],
                [11, 9, 4],
                [0, 3, 1],
                [0, 5, 3],
                [8, 2, 6],
                [8, 4, 2],
                [2, 1, 6],
                [2, 0, 1],
                [7, 5, 9, 10],
                [4, 9, 5, 0]];
   poly.vertices = [[-0.710639, -0.297668, -0.15267],
               [-0.651151, -0.105949, 0.829841],
               [-0.621335, 0.64788, 0.169179],
               [-0.614162, -1.052419, 0.500527],
               [-0.166396, 0.361269, -0.677289],
               [-0.002058, -0.993534, -0.291612],
               [0.165944, 0.471894, 0.764865],
               [0.225836, -0.507426, 0.555374],
               [0.279224, 1.020494, -0.066987],
               [0.542185, -0.334598, -0.816231],
               [0.770079, 0.151511, 0.030755],
               [0.782476, 0.638548, -0.845752]];
   return poly;
 },
J89: function() {
   const poly = new polyhedron();
   poly.name = "J89";
   poly.faces = [[9, 8, 13],
                [1, 8, 2],
                [1, 7, 8],
                [13, 11, 10],
                [13, 12, 11],
                [2, 8, 9],
                [9, 13, 10],
                [12, 6, 11],
                [3, 7, 1],
                [4, 5, 0],
                [11, 5, 10],
                [11, 6, 5],
                [0, 1, 2],
                [0, 3, 1],
                [10, 4, 9],
                [10, 5, 4],
                [4, 2, 9],
                [4, 0, 2],
                [8, 7, 12, 13],
                [3, 6, 12, 7],
                [5, 6, 3, 0]];
   poly.vertices = [[-0.83117, 0.133549, -0.011648],
               [-0.700039, -0.806136, -0.111242],
               [-0.631074, -0.403619, 0.750934],
               [-0.576095, -0.225432, -0.857931],
               [-0.446282, 0.532211, 0.764918],
               [-0.172487, 0.817558, -0.103263],
               [0.082589, 0.458576, -0.949546],
               [0.105206, -0.849768, -0.620949],
               [0.145599, -0.76155, 0.32811],
               [0.235014, -0.09212, 1.001899],
               [0.469795, 0.739577, 0.597817],
               [0.750772, 0.700456, -0.313032],
               [0.76389, -0.165759, -0.712564],
               [0.804283, -0.077541, 0.236495]];
   return poly;
 },
J90: function() {
   const poly = new polyhedron();
   poly.name = "J90";
   poly.faces = [[13, 6, 7],
                [9, 15, 11],
                [12, 13, 7],
                [15, 14, 11],
                [12, 10, 14],
                [12, 7, 5],
                [12, 5, 10],
                [10, 5, 3],
                [7, 6, 2],
                [5, 7, 2],
                [2, 6, 1],
                [2, 1, 0],
                [10, 3, 8],
                [10, 8, 14],
                [8, 11, 14],
                [8, 4, 11],
                [11, 4, 9],
                [9, 1, 6],
                [4, 1, 9],
                [0, 1, 4],
                [9, 6, 13, 15],
                [15, 13, 12, 14],
                [5, 2, 0, 3],
                [3, 0, 4, 8]];
   poly.vertices = [[-1.052782, 0.264006, 0.098264],
               [-0.753999, -0.411397, 0.610751],
               [-0.732127, -0.483215, -0.285043],
               [-0.599216, 0.763406, -0.495842],
               [-0.413906, 0.414477, 0.712494],
               [-0.278562, 0.016184, -0.879148],
               [-0.105415, -0.890983, 0.213994],
               [0.009423, -0.81027, -0.673913],
               [0.03966, 0.913876, 0.118388],
               [0.101994, -0.305887, 0.864167],
               [0.267869, 0.713733, -0.727747],
               [0.47671, 0.507934, 0.790906],
               [0.590474, -0.124774, -0.697516],
               [0.722293, -0.806255, -0.126296],
               [0.797883, 0.460322, -0.047343],
               [0.929701, -0.221158, 0.523878]];
   return poly;
 },
J91: function() {
   const poly = new polyhedron();
   poly.name = "J91";
   poly.faces = [[11, 13, 12],
                [7, 11, 4],
                [10, 7, 5],
                [13, 10, 9],
                [3, 8, 6],
                [4, 3, 0],
                [2, 1, 0],
                [9, 2, 6],
                [13, 11, 7, 10],
                [6, 2, 0, 3],
                [12, 13, 9, 6, 8],
                [11, 12, 8, 3, 4],
                [5, 7, 4, 0, 1],
                [10, 5, 1, 2, 9]];
   poly.vertices = [[-0.932446, -0.071511, 0.062428],
               [-0.890073, 0.716495, 0.434115],
               [-0.483326, 0.038238, 0.802122],
               [-0.479875, -0.798287, -0.104525],
               [-0.363346, -0.08879, -0.598427],
               [-0.294782, 1.186233, 0.002976],
               [-0.030753, -0.688537, 0.635167],
               [0.030753, 0.688538, -0.635171],
               [0.294779, -1.186232, -0.002974],
               [0.363347, 0.088791, 0.598425],
               [0.479874, 0.79829, 0.104525],
               [0.483327, -0.038241, -0.802125],
               [0.890072, -0.716499, -0.434115],
               [0.932449, 0.071511, -0.062429]];
   return poly;
 },
J92: function() {
   const poly = new polyhedron();
   poly.name = "J92";
   poly.faces = [[12, 11, 4],
                [11, 6, 4],
                [6, 11, 15],
                [13, 15, 17],
                [5, 13, 8],
                [2, 5, 8],
                [2, 8, 9],
                [7, 9, 14],
                [16, 14, 17],
                [3, 0, 7],
                [3, 1, 0],
                [1, 3, 10],
                [12, 10, 16],
                [6, 15, 13, 5],
                [2, 9, 7, 0],
                [12, 4, 1, 10],
                [11, 12, 16, 17, 15],
                [8, 13, 17, 14, 9],
                [16, 10, 3, 7, 14],
                [1, 4, 6, 5, 2, 0]];
   poly.vertices = [[-0.748928, 0.557858, -0.030371],
               [-0.638635, 0.125804, -0.670329],
               [-0.593696, 0.259282, 0.67329],
               [-0.427424, 0.876636, -0.665507],
               [-0.373109, -0.604827, -0.606627],
               [-0.32817, -0.471348, 0.736992],
               [-0.217876, -0.903403, 0.097033],
               [-0.141658, 1.042101, 0.041134],
               [-0.021021, 0.094954, 1.176701],
               [0.013575, 0.743525, 0.744795],
               [0.036802, 0.343022, -0.994341],
               [0.267732, -1.036179, -0.498733],
               [0.302328, -0.387609, -0.93064],
               [0.443205, -0.438661, 0.847867],
               [0.499183, 0.610749, 0.149029],
               [0.553499, -0.870715, 0.207908],
               [0.609478, 0.178694, -0.490931],
               [0.76471, -0.119883, 0.212731]];
   return poly;
 },
};

// Invoke appropriate base constructor
const johnson = function(n) {
  if(n > 0 && n <= 92) {
    return johnson_polyhedra[`J${n}`]()
  }
  else {
    return new polyhedron();
  }
};// Polyhédronisme
//===================================================================================================
//
// A toy for constructing and manipulating polyhedra and other meshes
//
// Includes implementation of the conway polyhedral operators derived
// from code by mathematician and mathematical sculptor
// George W. Hart http://www.georgehart.com/
//
// Copyright 2019, Anselm Levskaya
// Released under the MIT License

//===================================================================================================
// Polyhedron Flagset Construct
//
// A Flag is an associative triple of a face index and two adjacent vertex vertidxs,
// listed in geometric clockwise order (staring into the normal)
//
// Face_i -> V_i -> V_j
//
// They are a useful abstraction for defining topological transformations of the polyhedral mesh, as
// one can refer to vertices and faces that don't yet exist or haven't been traversed yet in the
// transformation code.
//
// A flag is similar in concept to a directed halfedge in halfedge data structures.
//
const MAX_FACE_SIDEDNESS = 1000; //GLOBAL

class polyflag {
  constructor() {
    this.flags = new Object(); // flags[face][vertex] = next vertex of flag; symbolic triples
    this.vertidxs = new Object(); // [symbolic names] holds vertex index
    this.vertices = new Object(); // XYZ coordinates
  }

  // Add a new vertex named "name" with coordinates "xyz".
  newV(vertName, coordinates) {
    if (this.vertidxs[vertName] === undefined) {
      this.vertidxs[vertName] = 0;
      this.vertices[vertName] = coordinates;
    }
  }

  newFlag(faceName, vertName1, vertName2) {
    if (this.flags[faceName] === undefined) {
      this.flags[faceName] = {};
    }
    this.flags[faceName][vertName1] = vertName2;
  }

  topoly() {
    let i, v;
    const poly = new polyhedron();

    let ctr = 0; // first number the vertices
    for (i in this.vertidxs) {
      v = this.vertidxs[i];
      poly.vertices[ctr]=this.vertices[i]; // store in array
      this.vertidxs[i] = ctr;
      ctr++;
    }

    ctr = 0;
    for (i in this.flags) {
      var v0;
      const face = this.flags[i];
      poly.faces[ctr] = []; // new face
      // grab _any_ vertex as starting point
      for (let j in face) {
        v0 = face[j];
        break;
      }
      // build face out of all the edge relations in the flag assoc array
      v = v0; // v moves around face
      poly.faces[ctr].push(this.vertidxs[v]); //record index
      v = this.flags[i][v]; // goto next vertex
      let faceCTR=0;
      while (v !== v0) { // loop until back to start
        poly.faces[ctr].push(this.vertidxs[v]);
        v = this.flags[i][v];
        faceCTR++;
        // necessary during development to prevent browser hangs on badly formed flagsets
        if (faceCTR > MAX_FACE_SIDEDNESS) {
          console.log("Bad flag spec, have a neverending face:", i, this.flags[i]);
          break;
        }
      }
      ctr++;
    }
    poly.name = "unknown polyhedron";
    return poly;
  }
}


//===================================================================================================
// Polyhedron Operators
//===================================================================================================
// for each vertex of new polyhedron:
//     call newV(Vname, xyz) with a symbolic name and coordinates
// for each flag of new polyhedron:
//     call newFlag(Fname, Vname1, Vname2) with a symbolic name for the new face
//     and the symbolic name for two vertices forming an oriented edge
// ORIENTATION -must- be dealt with properly to make a manifold (correct) mesh.
// Specifically, no edge v1->v2 can ever be crossed in the -same direction- by
// two different faces
// 
// call topoly() to assemble flags into polyhedron structure by following the orbits
// of the vertex mapping stored in the flagset for each new face
// 
// set name as appropriate

// helper func to insure unique names of midpoints
const midName = (v1, v2) => (v1<v2 ? v1+"_"+v2 : v2+"_"+v1)

// Kis(N)
// ------------------------------------------------------------------------------------------
// Kis (abbreviated from triakis) transforms an N-sided face into an N-pyramid rooted at the
// same base vertices.
// only kis n-sided faces, but n==0 means kis all.
//
const kisN = function(poly, n, apexdist){
  let i;
  if (!n) { n = 0; }
  if (apexdist===undefined) { apexdist = 0.1; }
  console.log(`Taking kis of ${n===0 ? "" : n}-sided faces of ${poly.name}...`);

  const flag = new polyflag();
  for (i = 0; i < poly.vertices.length; i++) {
    // each old vertex is a new vertex
    const p = poly.vertices[i];
    flag.newV(`v${i}`, p);
  }

  const normals = poly.normals();
  const centers = poly.centers();
  let foundAny = false;
  for (i = 0; i < poly.faces.length; i++) {
    const f = poly.faces[i];
    let v1 = `v${f[f.length-1]}`;
    for (let v of f) {
      const v2 = `v${v}`;
      if ((f.length === n) || (n === 0)) {
        foundAny = true;
        const apex = `apex${i}`;
        const fname = `${i}${v1}`;
        // new vertices in centers of n-sided face
        flag.newV(apex, add(centers[i], mult(apexdist, normals[i])));
        flag.newFlag(fname,   v1,   v2); // the old edge of original face
        flag.newFlag(fname,   v2, apex); // up to apex of pyramid
        flag.newFlag(fname, apex,   v1); // and back down again
      } else {
        flag.newFlag(`${i}`, v1, v2);  // same old flag, if non-n
      }
      // current becomes previous
      v1 = v2;
    }
  }

  if (!foundAny) {
    console.log(`No ${n}-fold components were found.`);
  }

  const newpoly = flag.topoly();
  newpoly.name = `k${n === 0 ? "" : n}${poly.name}`;
  return newpoly;
};


// Ambo
// ------------------------------------------------------------------------------------------
// The best way to think of the ambo operator is as a topological "tween" between a polyhedron
// and its dual polyhedron.  Thus the ambo of a dual polyhedron is the same as the ambo of the
// original. Also called "Rectify".
//
const ambo = function(poly){
  console.log(`Taking ambo of ${poly.name}...`);
  const flag = new polyflag();

  // For each face f in the original poly
  for (let i = 0; i < poly.faces.length; i++) {
    const f = poly.faces[i];
    let [v1, v2] = f.slice(-2);
    for (let v3 of f) {
      if (v1 < v2) { // vertices are the midpoints of all edges of original poly
        flag.newV(midName(v1,v2), midpoint(poly.vertices[v1], poly.vertices[v2]));
      }
      // two new flags:
      // One whose face corresponds to the original f:
      flag.newFlag(`orig${i}`,  midName(v1,v2), midName(v2,v3));
      // Another flag whose face  corresponds to (the truncated) v2:
      flag.newFlag(`dual${v2}`, midName(v2,v3), midName(v1,v2));
      // shift over one
      [v1, v2] = [v2, v3];
    }
  }

  const newpoly = flag.topoly();
  newpoly.name = `a${poly.name}`;
  return newpoly;
};


// Gyro
// ----------------------------------------------------------------------------------------------
// This is the dual operator to "snub", i.e dual*Gyro = Snub.  It is a bit easier to implement
// this way.
//
// Snub creates at each vertex a new face, expands and twists it, and adds two new triangles to
// replace each edge.
//
const gyro = function(poly){
  let f, i, v;
  console.log(`Taking gyro of ${poly.name}...`);

  const flag = new polyflag();

  for (i = 0; i < poly.vertices.length; i++) {
    v = poly.vertices[i];
    flag.newV(`v${i}`, unit(v));
  }  // each old vertex is a new vertex

  const centers = poly.centers(); // new vertices in center of each face
  for (i = 0; i < poly.faces.length; i++) {
    f = poly.faces[i];
    flag.newV(`center${i}`, unit(centers[i]));
  }

  for (i = 0; i < poly.faces.length; i++) {
    f = poly.faces[i];
    let [v1, v2] = f.slice(-2);
    for (let j = 0; j < f.length; j++) {
      v = f[j];
      const v3 = v;
      flag.newV(v1+"~"+v2, oneThird(poly.vertices[v1],poly.vertices[v2]));  // new v in face
      const fname = i+"f"+v1;
      flag.newFlag(fname, `center${i}`,      v1+"~"+v2); // five new flags
      flag.newFlag(fname, v1+"~"+v2,  v2+"~"+v1);
      flag.newFlag(fname, v2+"~"+v1,  `v${v2}`);
      flag.newFlag(fname, `v${v2}`,     v2+"~"+v3);
      flag.newFlag(fname, v2+"~"+v3,  `center${i}`);
      [v1, v2] = [v2, v3];
    }
  }                       // shift over one

  const newpoly = flag.topoly();
  newpoly.name = `g${poly.name}`;
  return newpoly;
};


// Propellor
// ------------------------------------------------------------------------------------------
// builds a new 'skew face' by making new points along edges, 1/3rd the distance from v1->v2,
// then connecting these into a new inset face.  This breaks rotational symmetry about the
// faces, whirling them into gyres
//
const propellor = function(poly) {
  let i, v;
  console.log(`Taking propellor of ${poly.name}...`);

  const flag = new polyflag();

  for (i = 0; i < poly.vertices.length; i++) {
    v = poly.vertices[i];
    flag.newV(`v${i}`, unit(v));
  }  // each old vertex is a new vertex

  for (i = 0; i < poly.faces.length; i++) {
    const f = poly.faces[i];
    let [v1, v2] = f.slice(-2);
    for (v of f) {
      const v3 = `${v}`;
      flag.newV(v1+"~"+v2, oneThird(poly.vertices[v1], poly.vertices[v2]));  // new v in face, 1/3rd along edge
      const fname = `${i}f${v2}`;
      flag.newFlag(`v${i}`, v1+"~"+v2,  v2+"~"+v3); // five new flags
      flag.newFlag(fname,   v1+"~"+v2,  v2+"~"+v1);
      flag.newFlag(fname,   v2+"~"+v1,     `v${v2}`);
      flag.newFlag(fname,      `v${v2}`,  v2+"~"+v3);
      flag.newFlag(fname,   v2+"~"+v3,  v1+"~"+v2);
      [v1, v2] = [v2, v3];
    }
  } // shift over one

  const newpoly = flag.topoly();
  newpoly.name = `p${poly.name}`;
  return newpoly;
};


// Reflection
// ------------------------------------------------------------------------------------------
// geometric reflection through origin
const reflect = function(poly) {
  let i;
  console.log(`Taking reflection of ${poly.name}...`);
  // reflect each point through origin
  for (i = 0; i <= poly.vertices.length-1; i++) {
     poly.vertices[i] = mult(-1, poly.vertices[i]);
  }
  // repair clockwise-ness of faces
  for (i = 0; i <= poly.faces.length-1; i++) {
     poly.faces[i] = poly.faces[i].reverse();
  }
  poly.name = `r${poly.name}`;
  return poly;
};


// Dual
// ------------------------------------------------------------------------------------------------
// The dual of a polyhedron is another mesh wherein:
// - every face in the original becomes a vertex in the dual
// - every vertex in the original becomes a face in the dual
//
// So N_faces, N_vertices = N_dualfaces, N_dualvertices
//
// The new vertex coordinates are convenient to set to the original face centroids.
//
const dual = function(poly) {
  let f, i, v1, v2;
  console.log(`Taking dual of ${poly.name}...`);

  const flag = new polyflag();

  const face = []; // make table of face as fn of edge
  for (i = 0; i <= poly.vertices.length-1; i++) {
    face[i] = {};
  } // create empty associative table

  for (i = 0; i < poly.faces.length; i++) {
    f = poly.faces[i];
    v1 = f[f.length-1]; //previous vertex
    for (v2 of f) {
      // THIS ASSUMES that no 2 faces that share an edge share it in the same orientation!
      // which of course never happens for proper manifold meshes, so get your meshes right.
      face[v1][`v${v2}`] = `${i}`;
      v1=v2;
    }
  } // current becomes previous

  const centers = poly.centers();
  for (i = 0; i <= poly.faces.length-1; i++) {
    flag.newV(`${i}`,centers[i]);
  }

  for (i = 0; i < poly.faces.length; i++) {
    f = poly.faces[i];
    v1 = f[f.length-1]; //previous vertex
    for (v2 of f) {
      flag.newFlag(v1, face[v2][`v${v1}`], `${i}`);
      v1=v2;
    }
  } // current becomes previous

  const dpoly = flag.topoly(); // build topological dual from flags

  // match F index ordering to V index ordering on dual
  const sortF = [];
  for (f of dpoly.faces) {
    const k = intersect(poly.faces[f[0]], poly.faces[f[1]], poly.faces[f[2]]);
    sortF[k] = f;
  }
  dpoly.faces = sortF;

  if (poly.name[0] !== "d") {
    dpoly.name = `d${poly.name}`;
  } else {
    dpoly.name = poly.name.slice(1);
  }

  return dpoly;
};


// Chamfer
// ----------------------------------------------------------------------------------------
// A truncation along a polyhedron's edges.
// Chamfering or edge-truncation is similar to expansion, moving faces apart and outward,
// but also maintains the original vertices. Adds a new hexagonal face in place of each
// original edge.
// A polyhedron with e edges will have a chamfered form containing 2e new vertices,
// 3e new edges, and e new hexagonal faces. -- Wikipedia
// See also http://dmccooey.com/polyhedra/Chamfer.html
//
// The dist parameter could control how deeply to chamfer.
// But I'm not sure about implementing that yet.
//
// Q: what is the dual operation of chamfering? I.e.
// if cX = dxdX, and xX = dcdX, what operation is x?

// We could "almost" do this in terms of already-implemented operations:
// cC = t4daC = t4jC, cO = t3daO, cD = t5daD, cI = t3daI
// But it doesn't work for cases like T.

const chamfer = function(poly, dist) {
  console.log(`Taking chamfer of ${poly.name}...`);

  if (!dist) { dist = 0.5; }

  const flag = new polyflag();

  const normals = poly.normals();

  // For each face f in the original poly
  for (let i = 0; i < poly.faces.length; i++) {
    const f = poly.faces[i];
    let v1 = f[f.length-1];
    let v1new = i + "_" + v1;

    for (let v2 of f) {
      // TODO: figure out what distances will give us a planar hex face.
      // Move each old vertex further from the origin.
      flag.newV(v2, mult(1.0 + dist, poly.vertices[v2]));
      // Add a new vertex, moved parallel to normal.
      const v2new = i + "_" + v2;
      flag.newV(v2new, add(poly.vertices[v2], mult(dist*1.5, normals[i])));
      // Four new flags:
      // One whose face corresponds to the original face:
      flag.newFlag(`orig${i}`, v1new, v2new);
      // And three for the edges of the new hexagon:
      const facename = (v1<v2 ? `hex${v1}_${v2}` : `hex${v2}_${v1}`);
      flag.newFlag(facename, v2, v2new);
      flag.newFlag(facename, v2new, v1new);
      flag.newFlag(facename, v1new, v1);
      v1 = v2;
      v1new = v2new;
    }
  }

  const newpoly = flag.topoly();
  newpoly.name = `c${poly.name}`;
  return newpoly;
};


// Whirl
// ----------------------------------------------------------------------------------------------
// Gyro followed by truncation of vertices centered on original faces.
// This create 2 new hexagons for every original edge.
// (https://en.wikipedia.org/wiki/Conway_polyhedron_notation#Operations_on_polyhedra)
//
// Possible extension: take a parameter n that means only whirl n-sided faces.
// If we do that, the flags marked #* below will need to have their other sides
// filled in one way or another, depending on whether the adjacent face is
// whirled or not.

const whirl = function(poly, n) {
  let i, v;
  console.log(`Taking whirl of ${poly.name}...`);
  if (!n) { n = 0; }
  
  const flag = new polyflag();

  // each old vertex is a new vertex
  for (i = 0; i < poly.vertices.length; i++) {
    v = poly.vertices[i];
    flag.newV(`v${i}`, unit(v));
  }

  // new vertices around center of each face
  const centers = poly.centers();
  //for f,i in poly.face
  //  # Whirl: use "center"+i+"~"+v1
  //  flag.newV "center"+i+"~"+v1, unit(centers[i])

  for (i = 0; i < poly.faces.length; i++) {
    const f = poly.faces[i];
    let [v1, v2] = f.slice(-2);
    for (let j = 0; j < f.length; j++) {
      v = f[j];
      const v3 = v;
      // New vertex along edge
      const v1_2 = oneThird(poly.vertices[v1],poly.vertices[v2]);
      flag.newV(v1+"~"+v2, v1_2);
      // New vertices near center of face
      const cv1name = `center${i}~${v1}`;
      const cv2name = `center${i}~${v2}`;
      flag.newV(cv1name, unit(oneThird(centers[i], v1_2))); 
      const fname = i+"f"+v1;
      // New hexagon for each original edge
      flag.newFlag(fname, cv1name,   v1+"~"+v2);
      flag.newFlag(fname, v1+"~"+v2, v2+"~"+v1); //*
      flag.newFlag(fname, v2+"~"+v1, `v${v2}`);  //*
      flag.newFlag(fname, `v${v2}`,  v2+"~"+v3); //*
      flag.newFlag(fname, v2+"~"+v3, cv2name);
      flag.newFlag(fname, cv2name,   cv1name);
      // New face in center of each old face      
      flag.newFlag(`c${i}`, cv1name, cv2name);
      
      [v1, v2] = [v2, v3];
    }
  } // shift over one

  const newpoly = flag.topoly();
  newpoly.name = `w${poly.name}`;
  return newpoly;
};


// Quinto
// ----------------------------------------------------------------------------------------------
// This creates a pentagon for every point in the original face, as well as one new inset face.
const quinto = function(poly){
  console.log(`Taking quinto of ${poly.name}...`);
  const flag = new polyflag();

  // For each face f in the original poly
  for (let i = 0; i < poly.faces.length; i++) {
    const f = poly.faces[i];
    centroid = calcCentroid(f.map(idx=>poly.vertices[idx]))
    // walk over face vertex-triplets
    let [v1, v2] = f.slice(-2);
    for (let v3 of f) {
      // for each face-corner, we make two new points:
      midpt = midpoint(poly.vertices[v1], poly.vertices[v2])
      innerpt = midpoint(midpt, centroid)
      flag.newV(midName(v1,v2), midpt);
      flag.newV(`inner_${i}_` + midName(v1,v2), innerpt);
      // and add the old corner-vertex
      flag.newV(`${v2}`, poly.vertices[v2]);
    
      // pentagon for each vertex in original face
      flag.newFlag(`f${i}_${v2}`, `inner_${i}_`+midName(v1, v2), midName(v1, v2));
      flag.newFlag(`f${i}_${v2}`, midName(v1, v2), `${v2}`);
      flag.newFlag(`f${i}_${v2}`, `${v2}`, midName(v2, v3));
      flag.newFlag(`f${i}_${v2}`, midName(v2, v3), `inner_${i}_`+midName(v2, v3));
      flag.newFlag(`f${i}_${v2}`, `inner_${i}_`+midName(v2, v3), `inner_${i}_`+midName(v1, v2));

      // inner rotated face of same vertex-number as original
      flag.newFlag(`f_in_${i}`, `inner_${i}_`+midName(v1, v2), `inner_${i}_`+midName(v2, v3));

      // shift over one
      [v1, v2] = [v2, v3];
    }
  }

  const newpoly = flag.topoly();
  newpoly.name = `q${poly.name}`;
  return newpoly;
};

// inset / extrude / "Loft" operator
// ------------------------------------------------------------------------------------------
const insetN = function(poly, n, inset_dist, popout_dist){
  let f, i, v;
  if (!n) { n = 0; }
  if (inset_dist===undefined) { inset_dist = 0.5; }
  if (popout_dist===undefined) { popout_dist = -0.2; }

  console.log(`Taking inset of ${n===0 ? "" : n}-sided faces of ${poly.name}...`);

  const flag = new polyflag();
  for (i = 0; i < poly.vertices.length; i++) {
    // each old vertex is a new vertex
    const p = poly.vertices[i];
    flag.newV(`v${i}`, p);
  }

  const normals = poly.normals();
  const centers = poly.centers();
  for (i = 0; i < poly.faces.length; i++) { //new inset vertex for every vert in face
    f = poly.faces[i];
    if ((f.length === n) || (n === 0)) {
      for (v of f) {
        flag.newV(`f${i}v${v}`, add(tween(poly.vertices[v],centers[i],inset_dist), 
                                    mult(popout_dist,normals[i])));
      }
    }
  }

  let foundAny = false;    // alert if don't find any
  for (i = 0; i < poly.faces.length; i++) {
    f = poly.faces[i];
    let v1 = `v${f[f.length-1]}`;
    for (v of f) {
      const v2 = `v${v}`;
      if ((f.length === n) || (n === 0)) {
        foundAny = true;
        const fname = i + v1;
        flag.newFlag(fname,      v1,       v2);
        flag.newFlag(fname,      v2,       `f${i}${v2}`);
        flag.newFlag(fname, `f${i}${v2}`,  `f${i}${v1}`);
        flag.newFlag(fname, `f${i}${v1}`,  v1);
        //new inset, extruded face
        flag.newFlag(`ex${i}`, `f${i}${v1}`,  `f${i}${v2}`);
      } else {
        flag.newFlag(i, v1, v2);  // same old flag, if non-n
      }
      v1=v2;
    }
  }  // current becomes previous

  if (!foundAny) {
    console.log(`No ${n}-fold components were found.`);
  }

  const newpoly = flag.topoly();
  newpoly.name = `n${n === 0 ? "" : n}${poly.name}`;
  return newpoly;
};

// extrudeN
// ------------------------------------------------------------------------------------------
// for compatibility with older operator spec
const extrudeN = function(poly, n){
  const newpoly = insetN(poly, n, 0.0, 0.3);
  newpoly.name = `x${n === 0 ? "" : n}${poly.name}`;
  return newpoly;
}

// loft
// ------------------------------------------------------------------------------------------
const loft = function(poly, n, alpha){
  const newpoly = insetN(poly, n, alpha, 0.0);
  newpoly.name = `l${n === 0 ? "" : n}${poly.name}`;
  return newpoly;
}


// Hollow (skeletonize)
// ------------------------------------------------------------------------------------------
const hollow = function(poly, inset_dist, thickness){
  let f, i, v;
  if (inset_dist === undefined) { inset_dist = 0.5; }
  if (thickness === undefined) { thickness = 0.2; }

  console.log(`Hollowing ${poly.name}...`);

  const dualnormals = dual(poly).normals();
  const normals = poly.normals();
  const centers = poly.centers();

  const flag = new polyflag();
  for (i = 0; i < poly.vertices.length; i++) {
    // each old vertex is a new vertex
    const p = poly.vertices[i];
    flag.newV(`v${i}`, p);
    flag.newV(`downv${i}`,  add(p,mult(-1*thickness,dualnormals[i])));
  }
  // new inset vertex for every vert in face
  for (i = 0; i < poly.faces.length; i++) {
    f = poly.faces[i];
    for (v of f) {
      flag.newV(`fin${i}v${v}`, tween(poly.vertices[v],centers[i],inset_dist));
      flag.newV(`findown${i}v${v}`, add(tween(poly.vertices[v],centers[i],inset_dist), 
                                        mult(-1*thickness,normals[i])));
    }
  }

  for (i = 0; i < poly.faces.length; i++) {
    f = poly.faces[i];
    let v1 = `v${f[f.length-1]}`;
    for (v of f) {
      const v2 = `v${v}`;
      let fname = i + v1;
      flag.newFlag(fname,      v1,       v2);
      flag.newFlag(fname,      v2,       `fin${i}${v2}`);
      flag.newFlag(fname, `fin${i}${v2}`,  `fin${i}${v1}`);
      flag.newFlag(fname, `fin${i}${v1}`,  v1);

      fname = `sides${i}${v1}`;
      flag.newFlag(fname, `fin${i}${v1}`,     `fin${i}${v2}`);
      flag.newFlag(fname, `fin${i}${v2}`,     `findown${i}${v2}`);
      flag.newFlag(fname, `findown${i}${v2}`, `findown${i}${v1}`);
      flag.newFlag(fname, `findown${i}${v1}`, `fin${i}${v1}`);

      fname = `bottom${i}${v1}`;
      flag.newFlag(fname,  `down${v2}`,      `down${v1}`);
      flag.newFlag(fname,  `down${v1}`,      `findown${i}${v1}`);
      flag.newFlag(fname,  `findown${i}${v1}`, `findown${i}${v2}`);
      flag.newFlag(fname,  `findown${i}${v2}`, `down${v2}`);

      v1 = v2; // current becomes previous
    }
  }

  const newpoly = flag.topoly();
  newpoly.name = `H${poly.name}`;
  return newpoly;
};


// Perspectiva 1
// ------------------------------------------------------------------------------------------
// an operation reverse-engineered from Perspectiva Corporum Regularium
const perspectiva1 = function(poly){
  let i;
  console.log(`Taking stella of ${poly.name}...`);

  const centers = poly.centers();  // calculate face centers

  const flag = new polyflag();
  for (i = 0; i < poly.vertices.length; i++) {
    const p = poly.vertices[i];
    // each old vertex is a new vertex
    flag.newV(`v${i}`, p);
  }

  // iterate over triplets of faces v1,v2,v3
  for (i = 0; i < poly.faces.length; i++) {
    const f = poly.faces[i];
    let v1 = `v${f[f.length-2]}`;
    let v2 = `v${f[f.length-1]}`;
    let vert1 = poly.vertices[f[f.length-2]];
    let vert2 = poly.vertices[f[f.length-1]];
    for (let v of f) {
      const v3 = `v${v}`;
      const vert3 = poly.vertices[v];
      const v12=v1+"~"+v2; // names for "oriented" midpoints
      const v21=v2+"~"+v1;
      const v23=v2+"~"+v3;

      // on each Nface, N new points inset from edge midpoints towards center = "stellated" points
      flag.newV(v12, midpoint( midpoint(vert1,vert2), centers[i] ));

      // inset Nface made of new, stellated points
      flag.newFlag(`in${i}`,      v12,       v23);

      // new tri face constituting the remainder of the stellated Nface
      flag.newFlag(`f${i}${v2}`,      v23,      v12);
      flag.newFlag(`f${i}${v2}`,       v12,      v2);
      flag.newFlag(`f${i}${v2}`,      v2,      v23);

      // one of the two new triangles replacing old edge between v1->v2
      flag.newFlag(`f${v12}`,     v1,        v21);
      flag.newFlag(`f${v12}`,     v21,       v12);
      flag.newFlag(`f${v12}`,      v12,       v1);

      [v1, v2] = [v2, v3];  // current becomes previous
      [vert1, vert2] = [vert2, vert3];
    }
  }

  const newpoly = flag.topoly();
  newpoly.name = `P${poly.name}`;
  return newpoly;
};


//===================================================================================================
// Goldberg-Coxeter Operators  (in progress...)
//===================================================================================================

// Triangular Subdivision Operator
// ----------------------------------------------------------------------------------------------
// limited version of the Goldberg-Coxeter u_n operator for triangular meshes
// We subdivide manually here, instead of using the usual flag machinery.
const trisub = function(poly, n) {
  console.log(`Taking trisub of ${poly.name}...`);
  if (!n) { n = 2; }
  
  // No-Op for non-triangular meshes.
  for (let fn = 0; fn < poly.faces.length; fn++) {
    if(poly.faces[fn].length != 3){
      return poly;
    }
  }

  // Calculate redundant set of new vertices for subdivided mesh.
  let newVs=[];
  let vmap={};
  let pos = 0;
  for (let fn = 0; fn < poly.faces.length; fn++) {
    const f = poly.faces[fn];
    let [i1, i2, i3] = f.slice(-3);
    v1 = poly.vertices[i1];
    v2 = poly.vertices[i2];
    v3 = poly.vertices[i3];
    v21 = sub(v2, v1);
    v31 = sub(v3, v1);
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j+i <= n; j++) {
        let v = add(add(v1, mult(i * 1.0 / n, v21)), mult(j * 1.0 / n, v31));
        vmap[`v${fn}-${i}-${j}`] = pos++;
        newVs.push(v);
      }
    }
  }

  // The above vertices are redundant along original edges, 
  // we need to build an index map into a uniqueified list of them.
  // We identify vertices that are closer than a certain epsilon distance.
  const EPSILON_CLOSE = 1.0e-8;
  let uniqVs = [];
  let newpos = 0;
  let uniqmap = {};
  for (const [i, v] of newVs.entries()) {
    if (i in uniqmap) { continue; } // already mapped
    uniqmap[i] = newpos;
    uniqVs.push(v);
    for(let j = i+1; j < newVs.length; j++) {
      w = newVs[j];
      if (mag(sub(v, w)) < EPSILON_CLOSE) {
        uniqmap[j] = newpos;
      }
    }
    newpos++;
  }

  let faces = [];
  for (fn = 0; fn < poly.faces.length; fn++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j+i < n; j++) {
        faces.push([uniqmap[vmap[`v${fn}-${i}-${j}`]], 
                    uniqmap[vmap[`v${fn}-${i+1}-${j}`]], 
                    uniqmap[vmap[`v${fn}-${i}-${j+1}`]]])
      }
    }
    for (let i = 1; i < n; i++) {
      for (let j = 0; j+i < n; j++) {
        faces.push([uniqmap[vmap[`v${fn}-${i}-${j}`]], 
                    uniqmap[vmap[`v${fn}-${i}-${j+1}`]], 
                    uniqmap[vmap[`v${fn}-${i-1}-${j+1}`]]])
      }
    }
  }

  // Create new polygon out of faces and unique vertices.
  const newpoly = new polyhedron();
  newpoly.name = `u${n}${poly.name}`;
  newpoly.faces = faces;
  newpoly.vertices = uniqVs; 

  return newpoly;
};
// Polyhédronisme
//===================================================================================================
//
// A toy for constructing and manipulating polyhedra and other meshes
//
// Includes implementation of the conway polyhedral operators derived
// from code by mathematician and mathematical sculptor
// George W. Hart http://www.georgehart.com/
//
// Copyright 2019, Anselm Levskaya
// Released under the MIT License


//===================================================================================================
// Canonicalization Algorithms
//===================================================================================================

// Slow Canonicalization Algorithm
// ----------------------------------------------------------------
//
// This algorithm has some convergence problems, what really needs to be done is to
// sum the three forcing factors together as a conherent force and to use a half-decent
// integrator to make sure that it converges well as opposed to the current hack of
// ad-hoc stability multipliers.  Ideally one would implement a conjugate gradient
// descent or similar pretty thing.
//
// Only try to use this on convex polyhedra that have a chance of being canonicalized,
// otherwise it will probably blow up the geometry.  A much trickier / smarter seed-symmetry
// based geometrical regularizer should be used for fancier/weirder polyhedra.

// adjusts vertices on edges such that each edge is tangent to an origin sphere
const tangentify = function(vertices, edges) {
  // hack to improve convergence
  const STABILITY_FACTOR = 0.1;
  // copy vertices
  const newVs = copyVecArray(vertices);
  for (let e of edges) {
    // the point closest to origin
    const t = tangentPoint( newVs[e[0]], newVs[e[1]] );
    // adjustment from sphere
    const c = mult(((STABILITY_FACTOR*1)/2)*(1-sqrt(dot(t,t))), t);
    newVs[e[0]] = add(newVs[e[0]], c);
    newVs[e[1]] = add(newVs[e[1]], c);
  }
  return newVs;
};

// recenters entire polyhedron such that center of mass is at origin
const recenter = function(vertices, edges) {
  //centers of edges
  const edgecenters = edges.map(([a, b])=>tangentPoint(vertices[a], vertices[b]));
  let polycenter = [0, 0, 0];
  // sum centers to find center of gravity
  for (let v of edgecenters) {
    polycenter = add(polycenter, v);
  }
  polycenter = mult(1/edges.length, polycenter);
  // subtract off any deviation from center
  return _.map(vertices, x=>sub(x, polycenter));
};

// rescales maximum radius of polyhedron to 1
const rescale = function(vertices) {
  const polycenter = [0, 0, 0];
  const maxExtent = _.max(_.map(vertices, x=>mag(x)));
  const s = 1 / maxExtent;
  return _.map(vertices, x=>[s*x[0], s*x[1], s*x[2]]);
};

// rescales all vertices of polyhedron to 1
const sphere = function(vertices) {
  const polycenter = [0, 0, 0];
  return _.map(vertices, x=>[x[0]/mag(x), x[1]/mag(x), x[2]/mag(x)]);
};

// adjusts vertices in each face to improve its planarity
const planarize = function(vertices, faces) {
  let v;
  const STABILITY_FACTOR = 0.1; // Hack to improve convergence
  const newVs = copyVecArray(vertices); // copy vertices
  for (var f of faces) {
    const coords = f.map(v=>vertices[v])
    let n = normal(coords); // find avg of normals for each vertex triplet
    const c = calcCentroid(coords); // find planar centroid
    if (dot(n, c) < 0) { // correct sign if needed
      n = mult(-1.0, n);
    }
    for (v of f) {  // project (vertex - centroid) onto normal, subtract off this component
      newVs[v] = add(newVs[v],
                     mult(dot(mult(STABILITY_FACTOR, n), sub(c, vertices[v])), n));
    }
  }
  return newVs;
};

// combines above three constraint adjustments in iterative cycle
const canonicalize = function(poly, Niter) {
  if (!Niter) {
    Niter = 1;
  }
  console.log(`Canonicalizing ${poly.name}...`);
  const faces = poly.faces;
  const edges = poly.edges();
  let newVs = poly.vertices;
  let maxChange = 1.0; // convergence tracker
  for (let i = 0; i <= Niter; i++) {
    const oldVs = copyVecArray(newVs); //copy vertices
    newVs = tangentify(newVs, edges);
    newVs = recenter(newVs, edges);
    newVs = planarize(newVs, faces);
    maxChange = _.max(_.map(_.zip(newVs, oldVs),
                            ([x, y])=>mag(sub(x, y))
                            ));
    if (maxChange < 1e-8) {
      break;
    }
  }
  // one should now rescale, but not rescaling here makes for very interesting numerical
  // instabilities that make interesting mutants on multiple applications...
  // more experience will tell what to do
  //newVs = rescale(newVs)
  console.log(`[canonicalization done, last |deltaV|=${maxChange}]`);
  const newpoly = new polyhedron(newVs, poly.faces, poly.name);
  console.log("canonicalize" , newpoly);
  return newpoly;
};

// Hacky Canonicalization Algorithm
// --------------------------------------------------------------------
// Using center of gravity of vertices for each face to planarize faces

// get the spherical reciprocals of face centers
const reciprocalC = function(poly) {
  const centers = poly.centers();
  for (let c of centers) {
    c = mult(1.0/dot(c,c), c);
  }
  return centers;
};

// make array of vertices reciprocal to given planes
const reciprocalN = function(poly) {
  const ans = [];
  for (let f of poly.faces) { //for each face
    let centroid    = [0,0,0]; // running sum of vertex coords
    let normalV     = [0,0,0]; // running sum of normal vectors
    let avgEdgeDist =    0.0;  // running sum for avg edge distance

    let [v1, v2] = f.slice(-2);
    for (let v3 of f) {
      centroid     = add(centroid, poly.vertices[v3]);
      normalV      = add(normalV, orthogonal(poly.vertices[v1], poly.vertices[v2], poly.vertices[v3]));
      avgEdgeDist += edgeDist(poly.vertices[v1], poly.vertices[v2]);
      [v1, v2] = [v2, v3];
    } // shift over one

    centroid    = mult(1.0/f.length, centroid);
    normalV     = unit(normalV);
    avgEdgeDist = avgEdgeDist / f.length;
    const tmp   = reciprocal(mult(dot(centroid, normalV), normalV)); // based on face
    ans.push(mult((1 + avgEdgeDist) / 2, tmp));
  } // edge correction

  return ans;
};

const canonicalXYZ = function(poly, nIterations) {
  if (!nIterations) { nIterations = 1; }
  const dpoly = dual(poly);
  console.log(`Pseudo-canonicalizing ${poly.name}...`);

  // iteratively reciprocate face normals
  for (let count = 0, end = nIterations; count < end; count++) {
    dpoly.vertices = reciprocalN(poly);
    poly.vertices  = reciprocalN(dpoly);
  }

  return new polyhedron(poly.vertices, poly.faces, poly.name);
};

// quick planarization
const adjustXYZ = function(poly, nIterations) {
  if (!nIterations) { nIterations = 1; }
  const dpoly = dual(poly); // v's of dual are in order of arg's f's
  console.log(`Planarizing ${poly.name}...`);

  for (let count = 0, end = nIterations; count < end; count++) {
    // reciprocate face centers
    dpoly.vertices = reciprocalC(poly);
    poly.vertices  = reciprocalC(dpoly);
  }

  return new polyhedron(poly.vertices, poly.faces, poly.name);
};

const spherize = function(poly) {
  console.log(`Spherizing ${poly.name}...`);
  poly.vertices = sphere(poly.vertices);
  return new polyhedron(poly.vertices, poly.faces, poly.name);
};

// Polyhédronisme
//===================================================================================================
//
// A toy for constructing and manipulating polyhedra and other meshes
//
// Copyright 2019, Anselm Levskaya
// Released under the MIT License
//

// Polyhedra Functions
//===================================================================================================
//
// Set of routines for transforming N-face meshes into triangular meshes, necessary for exporting
// STL or VRML for 3D Printing.
//

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}

// Ear-based triangulation of 2d faces, takes array of 2d coords in the face ordering
// Returns indices of the new diagonal lines to cut.
//
// assumes planarity of course, so this isn't the ideal algo for making aesthetically pleasing
// "flattening" choices in distorted polyhedral planes.
//
const getDiagonals = function(verts){
  let v0, v2;
  const limiter = 999;
  const diagonals = [];
  const ear = [];
  let facelen = verts.length;

  const XOR = (x, y) => (x || y) && !(x && y);
  const Area2 = (Va,Vb,Vc)  => ((Vb[0]-Va[0])*(Vc[1]-Va[1])) - ((Vc[0]-Va[0])*(Vb[1]-Va[1]));
  const Left = (Va, Vb, Vc) => Area2(Va, Vb, Vc) > 0;
  const LeftOn = (Va, Vb, Vc) => Area2(Va, Vb, Vc) >= 0;
  const Collinear = (Va, Vb, Vc) => Area2(Va, Vb, Vc) === 0;

  const Between = function(Va, Vb, Vc) {
    if (Collinear(Va, Vb, Vc)) { return false; }
    if (Va[0] !== Vb[0]) {
      return ((Va[0] <= Vc[0]) && (Vc[0] <= Vb[0])) || ((Va[0] >= Vc[0]) && (Vc[0] >= Vb[0]));
    } else {
      return ((Va[1] <= Vc[1]) && (Vc[1] <= Vb[1])) || ((Va[1] >= Vc[1]) && (Vc[1] >= Vb[1]));
    }
  };

  const IntersectProp = function(Va, Vb, Vc, Vd) {
    if (Collinear(Va, Vb, Vc) || Collinear(Va, Vb, Vd) || 
        Collinear(Vc, Vd, Va) || Collinear(Vc, Vd, Vb)) { 
      return false; 
    }
    return XOR(Left(Va, Vb, Vc), Left(Va, Vb, Vd)) && XOR(Left(Vc, Vd, Va), Left(Vc, Vd, Vb));
  };

  const Intersect = function(Va, Vb, Vc, Vd) {
    if (IntersectProp(Va, Vb, Vc, Vd)) {
      return true;
    } else {
      if (Between(Va, Vb, Vc) || Between(Va, Vb, Vd) || 
          Between(Vc, Vd, Va) || Between(Vc, Vd, Vb)) {
        return true;
      } else {
        return false;
      }
    }
  };

  const InCone = function(a, b) {
    const a1 = (a+1+facelen)%facelen;
    const a0 = ((a-1)+facelen)%facelen;
    if (LeftOn(verts[a], verts[a1], verts[a0])) {
      return (Left(verts[a], verts[b], verts[a0]) && Left(verts[b], verts[a], verts[a1]));
    }
    return !(LeftOn(verts[a], verts[b], verts[a1]) && LeftOn(verts[b], verts[a], verts[a0]));
  };

  const Diagonalie = function(a, b) {
    let c = 0;
    while (true) {
      const c1 = (c+1+facelen)%facelen;
      if ((c !== a) && (c1 !== a) && (c !== b) && (c1 !== b) && 
          IntersectProp(verts[a], verts[b], verts[c], verts[c1])) {
        return false;
      }
      c  = (c+1+facelen)%facelen;
      if (c === 0) { break; }
    }
    return true;
  };

  const Diagonal = (a, b) => InCone(a, b) && InCone(b, a) && Diagonalie(a, b);

  let v1 = 0;
  while (true) {
    v2 = (v1+1+facelen)%facelen;//v1.next
    v0 = ((v1-1)+facelen)%facelen;//v1.prev
    ear[v1] = Diagonal(v0, v2);
    v1 = (v1+1+facelen)%facelen;
    if (v1 === 0) { break; }
  }

  let origIdx = __range__(0, facelen-1, true);
  let n = facelen;//verts.length
  let z = limiter;
  let head = 0; //??
  while ((z > 0) && (n > 3)) {
    z -= 1;
    v2 = head;
    let y = limiter;
    while (true) {
      y -= 1;
      let broke = false;
      if (ear[v2]) {
        let v3 = (v2+1+facelen)%facelen;//v2.next
        let v4 = (v3+1+facelen)%facelen;//v3.next
        v1 = ((v2-1)+facelen)%facelen;//v2.prev
        v0 = ((v1-1)+facelen)%facelen;//v1.prev
        diagonals.push([ origIdx[v1], origIdx[v3] ]);
        ear[v1] = Diagonal(v0, v3);
        ear[v3] = Diagonal(v1, v4);
        //v1.next = v3
        //v3.prev = v1
        verts = verts.slice(0, +v2 + 1 || undefined).concat(verts.slice(v3));
        origIdx = origIdx.slice(0, +v2 + 1 || undefined).concat(origIdx.slice(v3));
        if (v0>v2) { v0 -= 1; }
        if (v1>v2) { v1 -= 1; }
        if (v3>v2) { v3 -= 1; }
        if (v4>v2) { v4 -= 1; }
        facelen--;
        head = v3;
        n--;
        broke = true;
      }
      v2 = (v2+1+facelen)%facelen;//v2.next
      if ((y <= 0) || !!broke || (v2 === head)) { break; }
    }
  }

  return diagonals;
};

// equates triplets of numbers if they can be rotated into identity
const triEq = function(tri1, tri2){
    if (((tri1[0] === tri2[0]) && (tri1[1] === tri2[1]) && (tri1[2] === tri2[2]))
    ||  ((tri1[0] === tri2[1]) && (tri1[1] === tri2[2]) && (tri1[2] === tri2[0]))
    ||  ((tri1[0] === tri2[2]) && (tri1[1] === tri2[0]) && (tri1[2] === tri2[1]))) {
      return true;
    } else {
      return false;
    }
  };

// god-awful but working hack to turn diagonals into triangles
// switch to an edge-matching algo, it would be 10x simpler
const diagsToTris = function(f,diags){
  let d;
  const edges = [];
  const redges = [];
  // get edges from faces as assoc arrays
  for (let [v1, v2] of 
       (__range__(0, f.length-1, true).map((i) => [i,(i+1)%f.length]))) {
    edges[v1]  = [v2];
    redges[v2] = [v1];
  }
  for (d of diags) { // push the diagonals into the assoc arrays in both directions!
    edges[d[0]].push(d[1]);
    edges[d[1]].push(d[0]);
    redges[d[0]].push(d[1]);
    redges[d[1]].push(d[0]);
  }
  const tris=[];
  for (d of diags) {  //orig N-face, N-2 triangles from the N-3 diagonals
    var e1, e2;
    for (e1 of edges[d[1]]) { // edge after diag
      for (e2 of redges[d[0]]) { // edge before diag
        if (e1 === e2) { // if they meet we have a triangle!
          tris.push([d[0],d[1],e1]);
        }
      }
    }
    for (e1 of edges[d[0]]) { // same as above for other dir along diagonal
      for (e2 of redges[d[1]]) {
        if (e1 === e2) {
          tris.push([d[1],d[0],e1]);
        }
      }
    }
  }
  // unfortunately the above duplicates triangles, so filter out repeats
  const uniques = [tris.pop()];
  for (let tri of tris) {
    let already_present = false;
    for (let extant_tri of uniques) {
      if (triEq(tri, extant_tri)) {
        already_present=true;
        break;
      }
    }
    if (!already_present) { uniques.push(tri); }
  }

  return uniques;
};

// driver routine, projects 3d face to 2d, get diagonals then triangles,
// then builds new polyhedron out of them, preserving original face colors
const triangulate = function(poly, colors){
  colors = colors || false;
  console.log(`Triangulating faces of ${poly.name}...`);

  const newpoly = new polyhedron();
  newpoly.vertices = clone(poly.vertices);
  newpoly.face_classes = [ ];
  // iterate over triplets of faces v1,v2,v3
  for (let i = 0; i < poly.faces.length; i++) {
    const f = poly.faces[i];
    if (f.length > 3) {
      const TwoDface = project2dface(f.map((v) => poly.vertices[v]));
      const diags = getDiagonals(TwoDface);
      const tris  = diagsToTris(f,diags);
      for (let j = 0; j < tris.length; j++) {
        const tri = tris[j];
        newpoly.faces.push([ f[tri[0]], f[tri[1]], f[tri[2]] ]);
        if (colors) { newpoly.face_classes.push(poly.face_classes[i]); }
      }
    } else {
      newpoly.faces.push([ f[0], f[1], f[2] ]);
      if (colors) { newpoly.face_classes.push(poly.face_classes[i]); }
    }
  }
  newpoly.name = poly.name; // don't change the name for export
  return newpoly;
};
// Polyhédronisme
//===================================================================================================
//
// A toy for constructing and manipulating polyhedra and other meshes
//
// Includes implementation of the conway polyhedral operators derived
// from code by mathematician and mathematical sculptor
// George W. Hart http://www.georgehart.com/
//
// Copyright 2019, Anselm Levskaya
// Released under the MIT License

// Testing Functions
//===================================================================================================

// report on face topology
const topolog = function(poly) {
  let str = "";
  for (let f of poly.faces) {
    str += `${f.length}: `
    for (let v of f) {
      str += `${v}->`;
    }
    str+="\n";
  }
  console.log(str);
};

// test basic cross of all ops against all seeds
const testrig = function() {
  const seeds=["T","O","C","I","D","P3","P4","A4","A5","Y3","Y4"];
  const ops = ["k","a","g","p","d","r","e","b","o","m","t","j",
               "s","p","c","w","l","n","x","Z","H"];
  console.log("===== Test Basic Ops =====");
  for (let op of ops) {
    console.log(`Operator ${op}`);
    for (let seed of seeds) {
      console.log(op + seed + ":", newgeneratePoly(op + seed));
    }
  }
  console.log("===== Done Testing Basic Ops =====");
};
// Polyhédronisme
//===================================================================================================
//
// A toy for constructing and manipulating polyhedra and other meshes
//
// Copyright 2019, Anselm Levskaya
// Released under the MIT License

// Parser Routines
//===================================================================================================

// fairly straightforward Parser Expression Grammar spec for simple
// operator-chain-on-base-polyhedra recipes
const PEG_parser_spec = `\
/* series of opspecs */
start  = opspec+

/* opspec one of:
 A  - single letter
 A3 - single letter and float
 B(5,4.3,3) - function call format w. float args
*/
opspec =
   let:opcode args:opargs {return {"op":let,"args":args};}
/ let:opcode float:float     {return {"op":let,"args":[float]};}
/ let:opcode                     {return {"op":let,"args":[]};}

/*
parentheses surrounding comma-delimited list of floats i.e.
( 1 , 3.2, 4 ) or (1) or (2,3)
*/
opargs = "("
           num:( float:float ","? {return float} )+
         ")" {return num;}

/* just a letter */
opcode = op:[a-zA-Z] {return op;}

/* standard numerical types */
int   = digits:[0-9-]+   { return parseInt(digits.join(""), 10);  }
float = digits:[0-9.-]+  { return parseFloat(digits.join(""), 10); }\
`;
const op_parser = PEG.buildParser(PEG_parser_spec);

//applies func fn to array args i.e. f, [1,2,3] -> f(1,2,3)
const dispatch = function(fn, args) { return fn.apply(this, args || []); };

const basemap = {
  "T": tetrahedron,
  "O": octahedron,
  "C": cube,
  "I": icosahedron,
  "D": dodecahedron,
  "P": prism,     //takes integer arg
  "A": antiprism, //takes integer arg
  "Y": pyramid,   //takes integer arg
  "J": johnson,   //takes integer arg
  "U": cupola,    //takes integer arg
  "V": anticupola,    //takes integer arg
};

const opmap = {
  "d": dual,
  "a": ambo,
  "k": kisN,
  "g": gyro,
  "p": propellor,
  "r": reflect,
  "c": chamfer,
  "w": whirl,
  "n": insetN, //-->needle
  "x": extrudeN,
  "l": loft,
  "P": perspectiva1,
  "q": quinto,
  "u": trisub,
  //z --> zip
  "H": hollow,
  "Z": triangulate,
  "C": canonicalize,
  "A": adjustXYZ,
  "S": spherize,
};
//unclaimed: yihfzv

// list of basic equivalences, easier to replace before parsing
const specreplacements = [
  [/e/g, "aa"],   // e --> aa   (abbr. for explode)
  [/b/g, "ta"],   // b --> ta   (abbr. for bevel)
  [/o/g, "jj"],   // o --> jj   (abbr. for ortho)
  [/m/g, "kj"],   // m --> kj   (abbr. for meta)
  [/t(\d*)/g, "dk$1d"],  // t(n) --> dk(n)d  (dual operations)
  [/j/g, "dad"],  // j --> dad  (dual operations) # Why not j --> da ?
  [/s/g, "dgd"],  // s --> dgd  (dual operations) # Why not s --> dg ?
  [/dd/g, ""],    // dd --> null  (order 2)
  [/ad/g, "a"],   // ad --> a   (a_ = ad_)
  [/gd/g, "g"],   // gd --> g   (g_ = gd_)
  [/aO/g, "aC"],  // aO --> aC  (for uniqueness)
  [/aI/g, "aD"],  // aI --> aD  (for uniqueness)
  [/gO/g, "gC"],  // gO --> gC  (for uniqueness)
  [/gI/g, "gD"]];  // gI --> gD  (for uniqueness)

const getOps = function(notation) {
  let expanded = notation;
  for (let [orig,equiv] of specreplacements) {
    expanded = expanded.replace(orig,equiv);
  }
  console.log(`${notation} executed as ${expanded}`);
  return expanded;
};

// create polyhedron from notation
const newgeneratePoly = function(notation) {
  //poly = new polyhedron()

  const ops_spec = getOps(notation);
  const oplist = op_parser.parse(ops_spec).reverse();

  let op = oplist.shift();
  const basefunc = basemap[op["op"]];
  const baseargs = op["args"];
  let poly = dispatch(basefunc, baseargs);

  for (op of oplist) {
    const opfunc = opmap[op["op"]];
    const opargs = [poly].concat(op["args"]);
    poly = dispatch(opfunc, opargs);
  }

  // Recenter polyhedra at origin (rarely needed)
  // poly.vertices = recenter(poly.vertices, poly.edges());
  // poly.vertices = rescale(poly.vertices);

  // Color the faces of the polyhedra for display
  poly = paintPolyhedron(poly);

  // return the poly object
  return poly;
};
// Polyhédronisme
//===================================================================================================
//
// A toy for constructing and manipulating polyhedra and other meshes
//
// Copyright 2019, Anselm Levskaya
// Released under the MIT License

// GLOBALS
//===================================================================================================
let ctx = {}; // for global access to canvas context
let globPolys = {}; // constructed polyhedras

const CANVAS_WIDTH  = 720; //canvas dims
const CANVAS_HEIGHT = 500; //canvas dims
let globRotM = clone(eye3);
let globLastRotM = clone(eye3);
let perspective_scale = 800;
const persp_z_max = 5;
const persp_z_min = 0;
const persp_ratio = 0.8;
const _2d_x_offset = CANVAS_WIDTH/2;
const _2d_y_offset = CANVAS_HEIGHT/2;

//let PALETTE;
const BG_CLEAR = true; // clear background or colored?
const BG_COLOR = "rgba(255,255,255,1.0)"; // background color
let COLOR_METHOD = "inradius"; // "area", "edges", "signature"
let COLOR_SENSITIVITY = 6; // color sensitivity to variation
                           // in congruence signature or planar area
const ctx_linewidth = 0.5; // for outline of faces
let PaintMode = "fillstroke";

// mouse event variables
let MOUSEDOWN = false;
let LastMouseX = 0;
let LastMouseY = 0;
// state variable for 3d trackball
let LastSphVec = [1, 0, 0];

// random grabbag of polyhedra
const DEFAULT_RECIPES = [
  "C2dakD", "oC20kkkT", "kn4C40A0dA4", "opD",
  "lT", "lK5oC", "knD", "dn6x4K5bT", "oox4P7",
  "qqJ37", "aobD", "qaxI", "SdStSuSkD", "SASuSASuI"];

// File-saving objects used to export txt/canvas-png
const saveText = function(text, filename) {
  const blb = new Blob([text],
    {type: `text/plain;charset=${document.characterSet}`});
  saveAs(blb, filename);
}

// parses URL string for polyhedron recipe, for bookmarking
// should use #! href format instead
const parseurl = function() {
  let e;
  const urlParams = {};
  const a = /\+/g;  // Regex for replacing addition symbol with a space
  const r = /([^&=]+)=?([^&]*)/g;
  const d = s => decodeURIComponent(s.replace(a, " "));
  const q = window.location.search.substring(1);

  while ((e=r.exec(q))) {
    urlParams[d(e[1])] = d(e[2]);
  }
  return urlParams;
};

// update the shareable link URL with the current recipe and palette
const setlink = function() {
  const specs = $("#spec").val().split(/\s+/g).slice(0, 2);
  // strip any existing parameters
  let link = location.protocol + '//' + location.host + location.pathname;
  link += `?recipe=${encodeURIComponent(specs[0])}`;
  if (PALETTE !== rwb_palette) {
    link += `&palette=${encodeURIComponent(PALETTE.reduce((x,y) => x+" "+y))}`;
  }
  $("#link").attr("href", link);
};


// Drawing Functions
//==================================================================================================

// init canvas element
// -------------------------------------------------------------------------------
const init = function() {
  const canvas = $('#poly');
  canvas.width(CANVAS_WIDTH);
  canvas.height(CANVAS_HEIGHT);

  ctx = canvas[0].getContext("2d");
  ctx.lineWidth = ctx_linewidth;

  if (BG_CLEAR) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  const exp = $('#expandcollapse');
  exp.click(function() {
    if (/minus/.test(exp.attr('src'))) {  // Contains 'minus'
      $('#morestats').hide();
      exp.attr('src', 'media/plus.png');
    } else {
      $('#morestats').show();
      exp.attr('src', 'media/minus.png');
    }
  });
};

// clear canvas
// -----------------------------------------------------------------------------------
const clear = function() {
  if (BG_CLEAR) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
};


// main drawing routine for polyhedra
//===================================================================================================
const drawpoly = function(poly, tvec) {
  let v;
  if (!tvec) { tvec = [3, 3, 3]; }


  // rotate poly in 3d
  const oldxyz = _.map(poly.vertices, x => x);
  poly.vertices = _.map(poly.vertices, x => mv3(globRotM,x));

  // z sort faces
  sortfaces(poly);

  for (let fno = 0; fno < poly.faces.length; fno++) {
    var face = poly.faces[fno];
    ctx.beginPath();
    // move to first vertex of face
    const v0 = face[face.length-1];
    let [x,y] = perspT(add(tvec,poly.vertices[v0]), persp_z_max,persp_z_min,persp_ratio,perspective_scale);
    ctx.moveTo(x+_2d_x_offset, y+_2d_y_offset);
    // loop around face, defining polygon
    for (v of face) {
      [x,y] = perspT(add(tvec,poly.vertices[v]),persp_z_max,persp_z_min,persp_ratio,perspective_scale);
      ctx.lineTo(x+_2d_x_offset, y+_2d_y_offset);
    }

    // use pre-computed colors
    let clr = palette(poly.face_classes[fno]);

    // shade based on simple cosine illumination factor
    const face_verts = face.map((v) => poly.vertices[v])
    //TODO: these magic illumination parameters should be global constants or parameters
    const illum = dot(normal(face_verts), unit([1, -1, 0]));
    clr = mult((((illum / 2.0) + 0.5) * 0.7) + 0.3, clr);

    if ((PaintMode === "fill") || (PaintMode === "fillstroke")) {
      ctx.fillStyle =
        `rgba(${round(clr[0]*255)}, ${round(clr[1]*255)}, ${round(clr[2]*255)}, ${1.0})`;
      ctx.fill();
      // make cartoon stroke (=black) / realistic stroke an option (=below)
      ctx.strokeStyle =
        `rgba(${round(clr[0]*255)}, ${round(clr[1]*255)}, ${round(clr[2]*255)}, ${1.0})`;
      ctx.stroke();
    }
    if (PaintMode === "fillstroke") {
      ctx.fillStyle =
        `rgba(${round(clr[0]*255)}, ${round(clr[1]*255)}, ${round(clr[2]*255)}, ${1.0})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";  // light lines, less cartoony, more render-y
      ctx.stroke();
    }
    if (PaintMode === "stroke") {
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.stroke();
    }
  }

  // reset coords, for setting absolute rotation, as poly is passed by ref
  poly.vertices = oldxyz;
};


// draw polyhedra just once
// -----------------------------------------------------------------------------------
const drawShape = function() {
  clear();
  globPolys.map((p, i) => drawpoly(p,[0+(3*i),0,3]));
};

// update V E F stats on page
// -----------------------------------------------------------------------------------
const updateStats = function() {
  for (let i = 0; i < globPolys.length; i++) {
    const p = globPolys[i];
    $("#basicstats").html(p.data());
    $("#morestats").html(p.moreData());
  }
}


// Initialization and Basic UI
//===================================================================================================

$( function() { //wait for page to load
  init(); //init canvas

  const urlParams = parseurl(); //see if recipe is spec'd in URL
  if ("recipe" in urlParams) {
    specs=[urlParams["recipe"]];
    $("#spec").val(specs);
  } else {
    specs=[randomchoice(DEFAULT_RECIPES)];
    $("#spec").val(specs);
    setlink();
  }

  // set initial palette spec
  if ("palette" in urlParams) {
    PALETTE = urlParams["palette"].split(/\s+/g);
    setlink();
  }
  $("#palette").val( PALETTE.reduce((x,y) => x+" "+y) );

  // construct the polyhedra from spec
  globPolys = _.map(specs, x => newgeneratePoly(x));
  updateStats();

  // draw it
  drawShape();


  // Event Handlers
  // ----------------------------------------------------

  // when spec changes in input, parse and draw new polyhedra
  $("#spec").change(function(e) {
    // only allow one recipe for now
    specs = $("#spec").val().split(/\s+/g).slice(0, 2);
    globPolys = _.map(specs, x => newgeneratePoly(x));
    updateStats();
    //animateShape()
    setlink();
    drawShape();
  });

  // when palette changes in input, redraw polyhedra
  $("#palette").change(function(e) {
    PALETTE = $(this).val().split(/\s+/g);
    setlink();
    drawShape();
  });

  // randomize palette
  $("#rndcolors").click(function(e) {
    let newpalette = rndcolors();
    PALETTE = newpalette;
    $('#palette').val(newpalette.join(" "));
    setlink();
    drawShape();
  });

  // Basic manipulation: rotation and scaling of geometry
  // ----------------------------------------------------

  // mousewheel changes scale of drawing
  $("#poly").mousewheel( function(e,delta, deltaX, deltaY){
    e.preventDefault();
    perspective_scale*=(10+delta)/10;
    drawShape();
  });

  // Implement standard trackball routines
  // ---------------------------------------
  $("#poly").mousedown( function(e){
    e.preventDefault();
    MOUSEDOWN = true;
    // relative mouse coords
    LastMouseX = e.clientX-$(this).offset().left;
    LastMouseY = e.clientY-($(this).offset().top-$(window).scrollTop());
    // calculate inverse projection of point to sphere
    const tmpvec = invperspT(LastMouseX, LastMouseY,
                             _2d_x_offset, _2d_y_offset,
                             persp_z_max, persp_z_min,
                             persp_ratio, perspective_scale);
    // quick NaN check
    if ((tmpvec[0]*tmpvec[1]*tmpvec[2]*0) === 0) {
      LastSphVec = tmpvec;
    }
    // copy last transform state
    globLastRotM = clone(globRotM);
  });
  $("#poly").mouseup(function(e){
    e.preventDefault();
    MOUSEDOWN=false;
  });
  $("#poly").mouseleave(function(e){
    e.preventDefault();
    MOUSEDOWN=false;
  });
  $("#poly").mousemove(function(e){
    e.preventDefault();
    if (MOUSEDOWN) {
      const MouseX=e.clientX-$(this).offset().left;
      const MouseY=e.clientY-($(this).offset().top-$(window).scrollTop());
      const SphVec=invperspT(MouseX, MouseY,
        _2d_x_offset,_2d_y_offset,
        persp_z_max,persp_z_min,
        persp_ratio,perspective_scale);

      // quick NaN check
      if (((SphVec[0]*SphVec[1]*SphVec[2]*0) === 0) &&
           ((LastSphVec[0]*LastSphVec[1]*LastSphVec[2]*0) === 0)) {
        globRotM = mm3(getVec2VecRotM(LastSphVec, SphVec), globLastRotM);
      }
      drawShape();
    }
  });

  // State control via some buttons
  // ---------------------------------------
  $("#strokeonly").click(function(e) {
    PaintMode = "stroke";
    drawShape();
  });

  $("#fillonly").click(function(e) {
    PaintMode = "fill";
    drawShape();
  });

  $("#fillandstroke").click(function(e) {
    PaintMode = "fillstroke";
    drawShape();
  });

  $("#siderot").click(function(e) {
    globRotM = vec_rotm(PI/2,0,1,0);
    drawShape();
  });

  $("#toprot").click(function(e) {
    globRotM = vec_rotm(PI/2,1,0,0);
    drawShape();
  });

  $("#frontrot").click(function(e) {
    globRotM = rotm(0,0,0);
    drawShape();
  });

  // Export Options
  // ---------------------------------------
  $("#pngsavebutton").click(function(e){
    const canvas=$("#poly")[0];
    const spec = $("#spec").val().split(/\s+/g)[0];
    const filename = `polyhedronisme-${spec.replace(/\([^\)]+\)/g, "")}.png`;
    canvas.toBlobHD(blob => saveAs(blob, filename));
  });

  $("#objsavebutton").click(function(e){
    const objtxt = globPolys[0].toOBJ();
    const spec = $("#spec").val().split(/\s+/g)[0];
    const filename = `polyhedronisme-${spec.replace(/\([^\)]+\)/g, "")}.obj`;
    saveText(objtxt,filename);
  });

  $("#x3dsavebutton").click(function(e){
    const triangulated = triangulate(globPolys[0],true); //triangulate to preserve face_colors for 3d printing
    const x3dtxt = triangulated.toVRML();
    const spec = $("#spec").val().split(/\s+/g)[0];
    const filename = `polyhedronisme-${spec.replace(/\([^\)]+\)/g, "")}.wrl`;
    saveText(x3dtxt,filename);
  });
});
