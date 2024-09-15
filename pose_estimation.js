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

// At the top of the file
let isHighKneeActive = false;
let cameraStream = null; // Track if the camera has already been accessed

// Modify your existing start function or create a new one
function startHighKneeDetection() {
    isHighKneeActive = true;
    // Your existing setup code here
    detectPose();  // Start the detection loop
}

// In your detection loop
async function detectPose() {
    if (!isHighKneeActive) return;
    // Your existing pose detection code here
    requestAnimationFrame(detectPose);
}

// Add a stop function if needed
function stopHighKneeDetection() {
    isHighKneeActive = false;
}

// Make sure these are accessible globally
window.startHighKneeDetection = startHighKneeDetection;
window.stopHighKneeDetection = stopHighKneeDetection;

async function initializeDetector() {
    await tf.setBackend('webgl');
    const model = poseDetection.SupportedModels.BlazePose;
    const detectorConfig = {
        runtime: 'tfjs',
        modelType: 'full'  // Try using the 'full' model for better accuracy
    };
    const detector = await poseDetection.createDetector(model, detectorConfig);

    console.log("Pose Detector Initialized: ", detector);  // Log the detector creation
    return detector;
}


async function speakWithSpeechify(message) {
    const apiKey = 'your_speechify_api_key'; // Replace with your actual API key

    const response = await fetch('https://api.speechify.com/synthesize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            text: message,
            voice: 'en-US',  // Specify the voice or language you want
            speed: 1.0,      // Adjust the speech speed if needed
            pitch: 1.0       // Adjust the pitch if needed
        })
    });

    if (!response.ok) {
        console.error('Error generating speech with Speechify:', response.statusText);
        return;
    }

    const data = await response.json();
    const audioUrl = data.audioUrl; // Get the audio URL from the response

    // Play the audio using the audio URL
    const audio = new Audio(audioUrl);
    audio.play();
}

// Function to provide feedback with Speechify API
async function provideFeedbackWithSpeechify(feedback) {
    await speakWithSpeechify(feedback);
}

// Define a minimal threshold for evaluating the knee raise (to avoid too early checks)
let minKneeToHipDistance = Infinity;  // Track the minimum knee-to-hip distance for the full cycle

function startHighKnee() {
    document.getElementById('highKneeButton').style.display = "none";  // Hide the High Knee button
    document.getElementById('camera-section').style.display = "block";  // Show the camera section
    document.getElementById('errorBox').style.display = "block";  // Show the text box for feedback

    // Request camera access only when "High Knee" is clicked
    if (!cameraStream) {
        const video = document.getElementById('webcam');
        navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
                video.srcObject = stream;  // Show the webcam feed
                cameraStream = stream;  // Store the stream to avoid requesting it again
                console.log("Camera stream started");
                startWorkout();  // Start pose detection
            })
            .catch((err) => {
                console.error("Error accessing the camera: ", err);
            });
    } else {
        console.log("Camera already accessed.");
        startWorkout();  // Start workout if the camera is already running
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
        detectAndDraw();  // Start the detection loop
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

        kneeToHipDistance = Math.abs(avgKneeY - avgHipY);  // Current knee-to-hip distance

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

                // Provide additional feedback after every 5 reps
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

    // Make sure the loop continues
    requestAnimationFrame(detectAndDraw);
}




function drawKeypoints(keypoints, ctx) {
    keypoints.forEach(keypoint => {
        if (keypoint.score > 0.3) {  // Confidence threshold
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);  // Draw circle
            ctx.fillStyle = 'red';  // Color of keypoints
            ctx.fill();
        }
    });
}

function drawSkeleton(keypoints, ctx) {
    const connections = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.BlazePose);  // Define skeleton structure
    connections.forEach(([i, j]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];
        if (kp1.score > 0.3 && kp2.score > 0.3) {  // Draw lines for skeleton if both points have sufficient confidence
            ctx.beginPath();
            ctx.moveTo(kp1.x, kp1.y);
            ctx.lineTo(kp2.x, kp2.y);
            ctx.strokeStyle = 'blue';  // Color of skeleton lines
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

async function startWorkout() {
    document.getElementById('status').textContent = "Starting...";

    // Access the webcam element and canvas
    webcam = document.getElementById('webcam');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    try {
        // Only request camera access once
        if (!webcam.srcObject) {
            document.getElementById('status').textContent = "Requesting camera access...";
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            webcam.srcObject = stream;

            await new Promise(resolve => {
                webcam.onloadedmetadata = () => {
                    // Set the video dimensions to match the video stream
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
        detectAndDraw();  // Start the pose detection loop

    } catch (error) {
        console.error("Error in startWorkout:", error);
        document.getElementById('status').textContent = "Error: " + error.message;
        alert('Error starting the workout: ' + error.message);
    }
}

// In both pose_estimation.js and planks.js
async function initializeBackend() {
    try {
        await tf.setBackend('webgl'); // Try setting WebGL as the backend
        await tf.ready(); // Ensure TensorFlow.js is ready
        console.log("WebGL backend is initialized and ready.");
    } catch (error) {
        console.warn("WebGL backend not supported, falling back to CPU.");
        await tf.setBackend('cpu'); // Fall back to CPU if WebGL is not available
        await tf.ready();
        alert("Using CPU backend as WebGL is not available.");
    }
}

// Call this before loading the model in your initialization function
initializeBackend();


function checkLibrariesLoaded() {
    if (typeof tf === 'undefined' || typeof poseDetection === 'undefined') {
        console.error("Required libraries are not loaded");
        return false;
    }
    return true;
}

// All your previous functions and code here

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
