const words = ["FITNESS", "HEALTH", "NUTRITION", "AI PLANNER"];
let currentWordIndex = 0;
let currentLetterIndex = 0;
let isDeleting = false;
const typingText = document.querySelector(".typing-text");
let delay = 200;

function type() {
  const currentWord = words[currentWordIndex];

  if (!isDeleting) {
    typingText.textContent = currentWord.substring(0, currentLetterIndex + 1);
    currentLetterIndex++;

    if (currentLetterIndex === currentWord.length) {
      isDeleting = true;
      delay = 1000;
    } else {
      delay = 200;
    }
  } else {
    typingText.textContent = currentWord.substring(0, currentLetterIndex - 1);
    currentLetterIndex--;

    if (currentLetterIndex === 0) {
      isDeleting = false;
      currentWordIndex = (currentWordIndex + 1) % words.length;
      delay = 500;
    } else {
      delay = 100;
    }
  }

  setTimeout(type, delay);
}

window.onload = () => {
  setTimeout(type, delay);
};
