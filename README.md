# XRSZE
<div align="center">
  <img src="https://github.com/user-attachments/assets/6a921717-f1a7-46ea-88ae-b824010a368c" alt="XRSZE - Frontend Demo">
</div>

## Inspiration 🌟
For beginners starting their fitness journey, staying consistent and knowing **what** workouts to do or **how** to do them properly is one of the biggest hurdles. That's where **XRSZE** *(pronounced "exercise")* comes in.

## What it does 📝
**XRSZE** addresses this problem by using a **computer vision algorithm** that leverages **posture detection** to accurately count reps and verify proper form. We also used the **Groq LLM API** to build an AI chatbot trained to tailor workout and nutrition plans based on user-specified fitness goals and parameters such as height, weight, age, and dietary restrictions.

## How we built it 🛠️
We built **XRSZE** using various web technologies and APIs. The front-end interface was designed with **HTML/CSS/JS**. We used **Node.js** for the backend and integrated it with **MediaPipe** and **TensorFlow** for computer vision and movement tracking. We also specifically calibrated the **MediaPipe** recognition model to detect accurate body movements that will recognize workouts and repetitions. 

## Challenges we ran into 😓
One of the biggest challenges was ensuring the accuracy of movement tracking with **MediaPipe** and **TensorFlow**. Fine-tuning the model to reliably count and recognize various exercises required extensive testing and adjustments. We also faced difficulties integrating the **Groq API** seamlessly with our backend, leading to several iterations before proper communication between the chatbot and the user. Optimizing the front-end performance to handle real-time data without lag was crucial for a smooth user experience.

## What we learned 📚
We learned a lot about integrating complex technologies, like **MediaPipe**, **TensorFlow**, **Node.js**, and **Groq** to work together in a unified system. The process taught us the importance of iterative testing and refinement, especially when fine-tuning AI models for specific applications. We also gained valuable insights into optimizing real-time data processing and enhancing user experience through thoughtful design and responsive feedback mechanisms.

## What's next for XRSZE 🚀
We’re excited to expand **XRSZE** into a mobile app, and we are already working on the **Flutter** code to make our platform more accessible and convenient for users on the go. We also plan to enhance our workout tracking capabilities by adding support for a wider variety of exercises and workouts, ensuring that users have a comprehensive tool to meet their fitness goals. 
