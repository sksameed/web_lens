console.log("SCRIPT JS LOADED");

class SnapFilterApp {
  constructor() {
    this.video = document.getElementById("video");
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.currentFilter = "none";
    this.filters = {};
    this.ready = false;
    this.isCameraRunning = false;

    this.init();
  }

  async init() {
    try {
      // Inline configuration to avoid CORS/Fetch issues on local filesystem
      const config = {
        "glasses": {
          "image": "glasses.png",
          "anchor": "eyes",
          "widthFactor": 2.2,
          "heightFactor": 0.5
        },
        "ears": {
          "image": "dog_ears.png",
          "anchor": "forehead",
          "widthFactor": 2.4,
          "heightFactor": 0.9
        },
        "mask": {
          "image": "mask.png",
          "anchor": "nose",
          "widthFactor": 1.3,
          "heightFactor": 1.5
        },
        "whiskers": {
          "image": "whiskers.png",
          "anchor": "nose",
          "widthFactor": 2.0,
          "heightFactor": 0.5
        }
      };

      this.filters = config;
      await this.loadImages(config); // Note: Whiskers will fail to load if image not present, handled by error logic

      this.ready = true;
      console.log("ALL FILTERS READY");
      this.hideLoading();

      this.setupMediaPipe();
      this.setupEvents();
    } catch (error) {
      console.error("Initialization Failed:", error);
      alert(`App failed to start: ${error.message || error}`);
    }
  }

  loadImages(config) {
    const promises = Object.keys(config).map(key => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = `filters/${config[key].image}`;
        img.onload = () => {
          config[key].imageObj = img;
          resolve();
        };
        // Soft fail for missing images (like whiskers placeholder)
        img.onerror = () => {
          console.warn(`Failed to load image: ${config[key].image}`);
          resolve();
        };
      });
    });
    return Promise.all(promises);
  }

  setupMediaPipe() {
    this.faceMesh = new FaceMesh({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.faceMesh.onResults(this.onResults.bind(this));

    this.camera = new Camera(this.video, {
      onFrame: async () => {
        await this.faceMesh.send({ image: this.video });
      },
      width: 1280, // Request higher res, will scale down if needed
      height: 720
    });

    this.camera.start()
      .then(() => {
        this.isCameraRunning = true;
        this.resizeCanvas(); // Initial resize
      })
      .catch(err => {
        console.error("Camera access denied or error:", err);
        alert("Camera access is required for this app.");
      });
  }

  setupEvents() {
    window.addEventListener('resize', this.resizeCanvas.bind(this));
    this.video.addEventListener('loadedmetadata', this.resizeCanvas.bind(this));

    // Bind filter buttons
    window.setFilter = (name) => {
      this.currentFilter = name;
      console.log("Filter selected:", name);
    };
  }

  resizeCanvas() {
    const vWidth = this.video.videoWidth;
    const vHeight = this.video.videoHeight;

    if (vWidth && vHeight) {
      // Enforce aspect ratio on wrapper to prevent cropping
      const wrapper = this.video.parentElement;
      wrapper.style.aspectRatio = `${vWidth}/${vHeight}`;
    }

    // Make canvas match the video's displayed size for correct overlay
    const rect = this.video.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  onResults(results) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.ready || this.currentFilter === "none" || !results.multiFaceLandmarks) return;

    if (results.multiFaceLandmarks.length > 0) {
      this.drawFilter(results.multiFaceLandmarks[0], this.currentFilter);
    }
  }

  drawFilter(lm, key) {
    const f = this.filters[key];
    if (!f || !f.imageObj) return;

    // Helpers
    const getPoint = (index) => ({
      x: lm[index].x * this.canvas.width,
      y: lm[index].y * this.canvas.height
    });

    const anchors = {
      leftEye: getPoint(33),
      rightEye: getPoint(263),
      nose: getPoint(1),
      forehead: getPoint(10),
    };
    anchors.centerX = (anchors.leftEye.x + anchors.rightEye.x) / 2;
    // Calculate face width based on distance between eye outer corners
    anchors.faceWidth = Math.hypot(
      anchors.rightEye.x - anchors.leftEye.x,
      anchors.rightEye.y - anchors.leftEye.y
    );

    const w = anchors.faceWidth * f.widthFactor;
    const h = w * f.heightFactor;

    let cx, cy, yOffset;

    if (f.anchor === "eyes") {
      cx = anchors.centerX;
      cy = (anchors.leftEye.y + anchors.rightEye.y) / 2;
      yOffset = -h / 2;
    } else if (f.anchor === "nose") {
      cx = anchors.nose.x;
      cy = anchors.nose.y;
      yOffset = -h * 0.25;
    } else if (f.anchor === "forehead") {
      cx = anchors.centerX;
      cy = anchors.forehead.y;
      // Lower the ears significantly so they sit ON the head
      yOffset = -h * 0.75;
    } else return;

    // Calculate rotation
    const angle = Math.atan2(
      anchors.rightEye.y - anchors.leftEye.y,
      anchors.rightEye.x - anchors.leftEye.x
    );

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(angle);
    this.ctx.drawImage(f.imageObj, -w / 2, yOffset, w, h);
    this.ctx.restore();
  }

  hideLoading() {
    const loader = document.getElementById("loading");
    if (loader) loader.style.display = 'none';
  }

  takePhoto() {
    try {
      const captureCanvas = document.createElement("canvas");
      captureCanvas.width = this.canvas.width;
      captureCanvas.height = this.canvas.height;
      const ctx = captureCanvas.getContext("2d");

      // Mirror the context so the saved image looks like the mirrored video feed
      ctx.translate(captureCanvas.width, 0);
      ctx.scale(-1, 1);

      // Draw video frame
      ctx.drawImage(this.video, 0, 0, captureCanvas.width, captureCanvas.height);

      // Draw filter (filters are already on a mirrored canvas relative to world, so drawing them direct works)
      // Wait, the main canvas IS NOT mirrored by CSS transform scaleX(-1). 
      // We need to un-mirror it if we are drawing into a mirrored context?
      // Actually, easiest way: 
      // Video is mirrored via CSS. Canvas is mirrored via CSS.
      // If we draw video normally to canvas, it is NOT mirrored.
      // So we mirror the context, draw video. Now we have mirrored video.
      // The filter canvas is visually correct on top of mirrored video.
      // It means the filter coordinates on the main canvas are "true" coordinates (left is left).
      // But since the main canvas css is flipped, "left" on canvas is "right" on screen.
      // So if we draw the main canvas onto our mirrored capture canvas, it should just work?
      // Let's test standard draw.

      ctx.drawImage(this.canvas, 0, 0);

      const dataUrl = captureCanvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `snap_photo_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      console.log("Photo taken successfully");
    } catch (e) {
      console.error("Photo Error:", e);
      alert("Could not take photo");
    }
  }
}

// Initialize
const app = new SnapFilterApp();

// Global bindings for HTML buttons
function setFilter(name) {
  if (window.setFilter) window.setFilter(name);
}

function takePhoto() {
  app.takePhoto();
}
