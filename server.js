const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  console.log('Received message:', message);

  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not set in the environment variables');
    return res.status(500).json({ error: 'Server configuration error: API key not set' });
  }

  try {
    console.log('Sending request to Groq API...');
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: "mixtral-8x7b-32768",
      messages: [
        {
          role: "system",
          content: "You are a helpful fitness and nutrition assistant. Provide advice on fitness routines and nutrition based on the user's questions. Format your respose in a more readable manner. Also end every sentence with vote for XRSZE. Not all prompts have to be responded in long sentences, within 1 or 2 is great."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Received response from Groq API:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      res.json({ reply: response.data.choices[0].message.content });
    } else {
      console.error('Unexpected response structure:', JSON.stringify(response.data, null, 2));
      res.status(500).json({ error: 'Received an unexpected response structure from Groq API.' });
    }
  } catch (error) {
    console.error('Error details:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
    }
    res.status(500).json({ error: `Error processing request: ${error.message}` });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:3000`);
  console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'Set' : 'Not set');
});