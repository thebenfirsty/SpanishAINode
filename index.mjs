import fs from 'fs';
import fetch from 'node-fetch';
import express from 'express';
import multer from 'multer';
const app = express();
const port = 3000;

const storage = multer.memoryStorage();
const upload = multer({storage: storage})

app.post('/upload', upload.single('audioFile'), async (req, res) => {
    if (req.file) {
        try {
            const result = await query(req.file.buffer); // Assuming query can handle a buffer
            res.json(result);
        } catch (error) {
            res.status(500).send(error.message);
        }
    } else {
        res.status(400).send('No file uploaded.');
    }
});

app.listen(port, () => console.log(`Listening on port ${port}`));

async function query(filename) {
    const data = fs.readFileSync(filename);
    const response = await fetch("https://api-inference.huggingface.co/models/openai/whisper-large-v3", {
        headers: { Authorization: "Bearer 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" },
        method: "POST",
        body: data,
    });
    const result = await response.json();

    // Check if the model is loading and retry if necessary
    if (result.error && result.error === "Model openai/whisper-large-v3 is currently loading") {
        console.log("Model is loading, waiting to retry...");
        const waitTime = result.estimated_time ? result.estimated_time * 1000 + 10000 : 30000; // Adding a 10-second buffer
        setTimeout(() => query(filename), waitTime);
    } else {
        return result;
    }
}

//query("/Users/benfirstenberg/Documents/GitHub/NodeJS/SpanishAI/assets/English.wav").then((response) => {
//    console.log(JSON.stringify(response));
// });



// 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