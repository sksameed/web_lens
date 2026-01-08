const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
console.log("SCRIPT JS LOADED");

canvas.width = 640;
canvas.height = 480;

let currentFilter = "none";
let filters = {};
let ready = false;

// ================= LOAD JSON =================
fetch("filters/filters.json")
  .then(r => {
    console.log("JSON response:", r);
    return r.json();
  })
  .then(config => {
    console.log("JSON loaded:", config);
    loadImages(config);
  })
  .catch(err => console.error("JSON ERROR:", err));

function loadImages(config) {
  let loaded = 0;
  const total = Object.keys(config).length;

  Object.keys(config).forEach(key => {
    const img = new Image();
    img.src = `filters/${config[key].image}`;

    img.onload = () => {
      console.log("Loaded image:", img.src);
      loaded++;
      if (loaded === total) {
        ready = true;
        console.log("ALL FILTERS READY");
      }
    };

    config[key].imageObj = img;
  });

  filters = config;
}

// ================= FILTER SELECT =================
function setFilter(name) {
  console.log("Filter selected:", name);
  currentFilter = name;
}

// ================= MEDIAPIPE =================
const faceMesh = new FaceMesh({
  locateFile: f =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true
});

faceMesh.onResults(onResults);

const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({ image: video });
  },
  width: 640,
  height: 480
});
camera.start();

// ================= MAIN LOOP =================
function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!ready) return;
  if (currentFilter === "none") return;
  if (!results.multiFaceLandmarks) return;

  drawFilter(results.multiFaceLandmarks[0], currentFilter);
}

// ================= HELPERS =================
function p(lm, i) {
  return { x: lm[i].x * canvas.width, y: lm[i].y * canvas.height };
}

function anchors(lm) {
  const l = p(lm, 33);
  const r = p(lm, 263);
  return {
    leftEye: l,
    rightEye: r,
    nose: p(lm, 1),
    forehead: p(lm, 10),
    centerX: (l.x + r.x) / 2,
    faceWidth: Math.hypot(r.x - l.x, r.y - l.y)
  };
}

// ================= DRAW =================
function drawFilter(lm, key) {
  const f = filters[key];
  if (!f || !f.imageObj) return;

  const a = anchors(lm);
  const w = a.faceWidth * f.widthFactor;
  const h = w * f.heightFactor;

  let cx, cy, y;

  if (f.anchor === "eyes") {
    cx = a.centerX;
    cy = (a.leftEye.y + a.rightEye.y) / 2;
    y = -h / 2;
  } else if (f.anchor === "nose") {
    cx = a.nose.x;
    cy = a.nose.y;
    y = -h * 0.25;
  } else if (f.anchor === "forehead") {
    cx = a.centerX;
    cy = a.forehead.y;
    y = -h;
  } else return;

  const angle = Math.atan2(
    a.rightEye.y - a.leftEye.y,
    a.rightEye.x - a.leftEye.x
  );

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.drawImage(f.imageObj, -w / 2, y, w, h);
  ctx.restore();
}
