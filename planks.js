const MODEL_PATH = 'https://tfhub.dev/mediapipe/tfjs-model/blazepose_3d/1/default/1';
const VIDEO_SIZE = { width: 640, height: 480 };
const MIN_CONFIDENCE = 0.5;
const PLANK_THRESHOLD_SLOPE = 0.1;

let model, webcam, ctx, feedbackTimer;
let isWorkoutStarted = false;
let startTime;
let elapsedTime = 0;
let isInPlank = false;
let plankStartTime = 0;
let plankElapsedTime = 0;

async function setupWebcam() {
    webcam = document.getElementById('webcam');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    webcam.srcObject = stream;
    return new Promise((resolve) => {
        webcam.onloadedmetadata = () => resolve(webcam);
    });
}

async function loadModel() {
    model = await poseDetection.createDetector(
        poseDetection.SupportedModels.BlazePose,
        { runtime: 'tfjs', modelType: 'full' }
    );
}

async function setupCanvas() {
    const canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    canvas.width = VIDEO_SIZE.width;
    canvas.height = VIDEO_SIZE.height;
}

function startWorkout() {
    if (!isWorkoutStarted) {
        isWorkoutStarted = true;
        plankStartTime = Date.now();
        detectPose();
    }
}

function stopWorkout() {
    isWorkoutStarted = false;
    clearInterval(feedbackTimer);
    document.getElementById('status').textContent = 'Workout stopped.';
}

function drawKeypoints(keypoints) {
    keypoints.forEach(keypoint => {
        if (keypoint.score >= MIN_CONFIDENCE) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
        }
    });
}

function calculateElapsedTime() {
    elapsedTime = Math.floor((Date.now() - plankStartTime) / 1000);
    return elapsedTime;
}

function analyzePlank(keypoints) {
    const nose = keypoints[0];
    const leftShoulder = keypoints[11];
    const rightShoulder = keypoints[12];
    const leftHip = keypoints[23];
    const rightHip = keypoints[24];
    const leftAnkle = keypoints[27];
    const rightAnkle = keypoints[28];

    let feedback = [];
    let hipAngle = calculateAngle(leftShoulder, leftHip, leftAnkle);
    let bodySlope = calculateSlope(nose, leftAnkle);

    if (Math.abs(bodySlope) > PLANK_THRESHOLD_SLOPE) {
        feedback.push("Keep your body straight from head to toe.");
        if (isInPlank) {
            isInPlank = false;
            plankElapsedTime += Date.now() - plankStartTime;
        }
    } else {
        if (!isInPlank) {
            isInPlank = true;
            plankStartTime = Date.now();
        }
    }

    if (hipAngle < 150 || hipAngle > 180) {
        feedback.push("Adjust your hip position to be between 150° and 180°.");
    }

    document.getElementById('currentFeedback').textContent = feedback.length === 0 ? 'Good form!' : feedback.join(" ");
    document.getElementById('hipAngle').textContent = `Hip Angle: ${hipAngle.toFixed(2)}°`;
    document.getElementById('bodySlope').textContent = `Body Slope: ${bodySlope.toFixed(3)}`;
    document.getElementById('Timer').textContent = `Plank Time: ${Math.floor(plankElapsedTime / 1000)} seconds`;
}

function allPointsVisible(points) {
    return points.every(point => point.score >= MIN_CONFIDENCE);
}

function calculateSlope(point1, point2) {
    return (point2.y - point1.y) / (point2.x - point1.x);
}

function calculateAngle(point1, point2, point3) {
    const a = calculateDistance(point2, point3);
    const b = calculateDistance(point1, point3);
    const c = calculateDistance(point1, point2);
    return Math.acos((a * a + c * c - b * b) / (2 * a * c)) * (180 / Math.PI);
}

function calculateDistance(point1, point2) {
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
}

async function initializeBackend() {
    try {
        await tf.setBackend('webgl');
        await tf.ready();
        console.log("WebGL backend is initialized.");
    } catch (error) {
        console.error("WebGL not supported, switching to CPU");
        await tf.setBackend('cpu');
        await tf.ready();
        alert("Using CPU backend as WebGL is not available.");
    }
}

async function detectPose() {
    if (!isWorkoutStarted) return;

    const pose = await model.estimatePoses(webcam);
    ctx.drawImage(webcam, 0, 0, VIDEO_SIZE.width, VIDEO_SIZE.height);

    if (pose.length > 0) {
        const keypoints = pose[0].keypoints;
        drawKeypoints(keypoints);
        analyzePlank(keypoints);
    }

    document.getElementById('repCount').textContent = `Total Time: ${calculateElapsedTime()} seconds`;
    requestAnimationFrame(detectPose);
}

async function startPlanks() {
    await initializeBackend();
    await setupWebcam();
    await loadModel();
    await setupCanvas();
    startWorkout();
}

startPlanks();
