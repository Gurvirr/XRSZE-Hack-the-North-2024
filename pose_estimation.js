let detector;
let webcam;
let canvas;
let ctx;
let repCount = 0;
let insufficientRaiseCount = 0;
let feedbackText = "";
let isInStartPosition = true;
let lastKneePosition = 'down';
let kneeToHipDistance = 0;
let isHighKneeActive = false;
let cameraStream = null;

function startHighKneeDetection() {
    isHighKneeActive = true;
    detectPose();
}

async function detectPose() {
    if (!isHighKneeActive) return;
    requestAnimationFrame(detectPose);
}

function stopHighKneeDetection() {
    isHighKneeActive = false;
}

window.startHighKneeDetection = startHighKneeDetection;
window.stopHighKneeDetection = stopHighKneeDetection;

async function initializeDetector() {
    await tf.setBackend('webgl');
    const model = poseDetection.SupportedModels.BlazePose;
    const detectorConfig = {
        runtime: 'tfjs',
        modelType: 'full'
    };
    const detector = await poseDetection.createDetector(model, detectorConfig);
    console.log("Pose Detector Initialized: ", detector);
    return detector;
}

async function speakWithSpeechify(message) {
    const apiKey = 'your_speechify_api_key';

    const response = await fetch('https://api.speechify.com/synthesize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            text: message,
            voice: 'en-US',
            speed: 1.0,
            pitch: 1.0
        })
    });

    if (!response.ok) {
        console.error('Error generating speech with Speechify:', response.statusText);
        return;
    }

    const data = await response.json();
    const audioUrl = data.audioUrl;
    const audio = new Audio(audioUrl);
    audio.play();
}

async function provideFeedbackWithSpeechify(feedback) {
    await speakWithSpeechify(feedback);
}

let minKneeToHipDistance = Infinity;

function startHighKnee() {
    document.getElementById('highKneeButton').style.display = "none";
    document.getElementById('camera-section').style.display = "block";
    document.getElementById('errorBox').style.display = "block";

    if (!cameraStream) {
        const video = document.getElementById('webcam');
        navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
                video.srcObject = stream;
                cameraStream = stream;
                console.log("Camera stream started");
                startWorkout();
            })
            .catch((err) => {
                console.error("Error accessing the camera: ", err);
            });
    } else {
        console.log("Camera already accessed.");
        startWorkout();
    }
}

async function startWorkout() {
    document.getElementById('status').textContent = "Starting...";
    webcam = document.getElementById('webcam');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    try {
        document.getElementById('status').textContent = "Initializing pose detector...";
        detector = await initializeDetector();
        
        document.getElementById('status').textContent = "Running...";
        detectAndDraw();
    } catch (error) {
        console.error("Error in startWorkout:", error);
        document.getElementById('status').textContent = "Error: " + error.message;
        alert('Error starting the workout: ' + error.message);
    }
}

function analyzeHighKnee(pose) {
    const leftKnee = pose.keypoints3D?.find(kp => kp.name === 'left_knee') || pose.keypoints?.find(kp => kp.name === 'left_knee');
    const rightKnee = pose.keypoints3D?.find(kp => kp.name === 'right_knee') || pose.keypoints?.find(kp => kp.name === 'right_knee');
    const leftHip = pose.keypoints3D?.find(kp => kp.name === 'left_hip') || pose.keypoints?.find(kp => kp.name === 'left_hip');
    const rightHip = pose.keypoints3D?.find(kp => kp.name === 'right_hip') || pose.keypoints?.find(kp => kp.name === 'right_hip');

    if (leftKnee && rightKnee && leftHip && rightHip) {
        const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
        const avgHipY = (leftHip.y + rightHip.y) / 2;

        kneeToHipDistance = Math.abs(avgKneeY - avgHipY);

        let feedback = "";

        if (lastKneePosition === 'down' && kneeToHipDistance < 0.3) {
            minKneeToHipDistance = Math.min(minKneeToHipDistance, kneeToHipDistance);

            if (kneeToHipDistance < 0.2) {
                lastKneePosition = 'up';
            }
        }

        if (kneeToHipDistance >= 0.3 && lastKneePosition === 'up') {
            repCount++;
            lastKneePosition = 'down';
            isInStartPosition = true;

            if (minKneeToHipDistance < 0.23) {
                feedback = "Good job! Knee raised high enough.";
                provideFeedbackWithSpeechify(feedback);

                if (repCount % 5 === 0) {
                    feedback = "You're doing great! Keep up the good form!";
                    provideFeedbackWithSpeechify(feedback);
                }
            } else {
                insufficientRaiseCount++;
                feedback = "Raise your knee higher next time!";
                provideFeedbackWithSpeechify(feedback);
            }

            minKneeToHipDistance = Infinity;
        }

        return feedback || "Prepare for next rep";
    } else {
        console.log("Missing keypoints for knee or hip, cannot calculate knee-to-hip distance.");
        return "Unable to detect proper pose. Please adjust your position.";
    }
}

async function detectAndDraw() {
    try {
        const poses = await detector.estimatePoses(webcam);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        
        if (poses.length > 0) {
            const currentFeedback = analyzeHighKnee(poses[0]);
            document.getElementById('currentFeedback').textContent = currentFeedback;
            document.getElementById('repCount').textContent = `Reps: ${repCount}`;
            document.getElementById('kneeToHipDistance').textContent = `Knee-to-Hip Distance: ${kneeToHipDistance.toFixed(3)}`;
            document.getElementById('minKneeToHipDistance').textContent = `minKneeToHipDistance: ${minKneeToHipDistance}`;
            
            drawKeypoints(poses[0].keypoints, ctx);
            drawSkeleton(poses[0].keypoints, ctx);
        } else {
            console.log("No poses detected");
        }
    } catch (error) {
        console.error("Error in detectAndDraw:", error);
    }

    requestAnimationFrame(detectAndDraw);
}

function drawKeypoints(keypoints, ctx) {
    keypoints.forEach(keypoint => {
        if (keypoint.score > 0.3) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
        }
    });
}

function drawSkeleton(keypoints, ctx) {
    const connections = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.BlazePose);
    connections.forEach(([i, j]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];
        if (kp1.score > 0.3 && kp2.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(kp1.x, kp1.y);
            ctx.lineTo(kp2.x, kp2.y);
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

async function startWorkout() {
    document.getElementById('status').textContent = "Starting...";
    webcam = document.getElementById('webcam');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    try {
        if (!webcam.srcObject) {
            document.getElementById('status').textContent = "Requesting camera access...";
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            webcam.srcObject = stream;

            await new Promise(resolve => {
                webcam.onloadedmetadata = () => {
                    canvas.width = webcam.videoWidth;
                    canvas.height = webcam.videoHeight;
                    resolve();
                };
            });
        }

        document.getElementById('status').textContent = "Camera access granted";

        document.getElementById('status').textContent = "Initializing pose detector...";
        detector = await initializeDetector();

        document.getElementById('status').textContent = "Running...";
        detectAndDraw();

    } catch (error) {
        console.error("Error in startWorkout:", error);
        document.getElementById('status').textContent = "Error: " + error.message;
        alert('Error starting the workout: ' + error.message);
    }
}

async function initializeBackend() {
    try {
        await tf.setBackend('webgl');
        await tf.ready();
        console.log("WebGL backend is initialized and ready.");
    } catch (error) {
        console.warn("WebGL backend not supported, falling back to CPU.");
        await tf.setBackend('cpu');
        await tf.ready();
        alert("Using CPU backend as WebGL is not available.");
    }
}

initializeBackend();

function checkLibrariesLoaded() {
    if (typeof tf === 'undefined' || typeof poseDetection === 'undefined') {
        console.error("Required libraries are not loaded");
        return false;
    }
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof tf === 'undefined' || typeof poseDetection === 'undefined') {
        console.error("Required libraries are not loaded");
        document.getElementById('status').textContent = "Error: Required libraries not loaded";
        alert("There was an error loading the required libraries. Please check the console for more information.");
    } else {
        console.log("TensorFlow.js and Pose Detection libraries are loaded.");
        document.getElementById('startButton').addEventListener('click', startWorkout);
    }
});
